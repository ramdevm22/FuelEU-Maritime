import { Pool as PgPool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { ComplianceBalance, BankEntry, Pool, PoolMember } from '../../../core/domain/entities';
import { IComplianceRepository, IBankRepository, IPoolRepository } from '../../../core/ports/repositories';

export class PgComplianceRepository implements IComplianceRepository {
  constructor(private db: PgPool) {}

  async getCB(shipId: string, year: number): Promise<ComplianceBalance | null> {
    const res = await this.db.query(
      'SELECT * FROM ship_compliance WHERE ship_id = $1 AND year = $2',
      [shipId, year]
    );
    if (!res.rows[0]) return null;
    return { shipId: res.rows[0].ship_id, year: res.rows[0].year, cbGco2eq: parseFloat(res.rows[0].cb_gco2eq) };
  }

  async upsertCB(cb: ComplianceBalance): Promise<ComplianceBalance> {
    const res = await this.db.query(
      `INSERT INTO ship_compliance (id, ship_id, year, cb_gco2eq)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (ship_id, year)
       DO UPDATE SET cb_gco2eq = EXCLUDED.cb_gco2eq
       RETURNING *`,
      [uuidv4(), cb.shipId, cb.year, cb.cbGco2eq]
    );
    return { shipId: res.rows[0].ship_id, year: res.rows[0].year, cbGco2eq: parseFloat(res.rows[0].cb_gco2eq) };
  }

  async getAdjustedCB(shipId: string, year: number): Promise<number> {
    const cb = await this.getCB(shipId, year);
    if (!cb) return 0;
    const banked = await new PgBankRepository(this.db).totalBanked(shipId, year);
    return cb.cbGco2eq + banked;
  }
}

export class PgBankRepository implements IBankRepository {
  constructor(private db: PgPool) {}

  async findByShip(shipId: string, year: number): Promise<BankEntry[]> {
    const res = await this.db.query(
      'SELECT * FROM bank_entries WHERE ship_id = $1 AND year = $2',
      [shipId, year]
    );
    return res.rows.map(r => ({ id: r.id, shipId: r.ship_id, year: r.year, amountGco2eq: parseFloat(r.amount_gco2eq) }));
  }

  async bankSurplus(shipId: string, year: number, amount: number): Promise<BankEntry> {
    const res = await this.db.query(
      `INSERT INTO bank_entries (id, ship_id, year, amount_gco2eq) VALUES ($1, $2, $3, $4) RETURNING *`,
      [uuidv4(), shipId, year, amount]
    );
    return { id: res.rows[0].id, shipId: res.rows[0].ship_id, year: res.rows[0].year, amountGco2eq: parseFloat(res.rows[0].amount_gco2eq) };
  }

  async applyBanked(shipId: string, year: number, amount: number): Promise<void> {
    // Delete oldest entries to cover amount
    const entries = await this.findByShip(shipId, year);
    let remaining = amount;
    for (const entry of entries) {
      if (remaining <= 0) break;
      if (entry.amountGco2eq <= remaining) {
        await this.db.query('DELETE FROM bank_entries WHERE id = $1', [entry.id]);
        remaining -= entry.amountGco2eq;
      } else {
        await this.db.query('UPDATE bank_entries SET amount_gco2eq = amount_gco2eq - $1 WHERE id = $2', [remaining, entry.id]);
        remaining = 0;
      }
    }
  }

  async totalBanked(shipId: string, year: number): Promise<number> {
    const res = await this.db.query(
      'SELECT COALESCE(SUM(amount_gco2eq), 0) as total FROM bank_entries WHERE ship_id = $1 AND year = $2',
      [shipId, year]
    );
    return parseFloat(res.rows[0].total);
  }
}

export class PgPoolRepository implements IPoolRepository {
  constructor(private db: PgPool) {}

  async createPool(year: number, members: { shipId: string; cbBefore: number; cbAfter?: number }[]): Promise<{ pool: Pool; members: PoolMember[] }> {
    const poolId = uuidv4();
    const res = await this.db.query(
      'INSERT INTO pools (id, year, created_at) VALUES ($1, $2, NOW()) RETURNING *',
      [poolId, year]
    );
    const pool: Pool = { id: res.rows[0].id, year: res.rows[0].year, createdAt: res.rows[0].created_at };

    const poolMembers: PoolMember[] = [];
    for (const m of members) {
      await this.db.query(
        'INSERT INTO pool_members (pool_id, ship_id, cb_before, cb_after) VALUES ($1, $2, $3, $4)',
        [poolId, m.shipId, m.cbBefore, m.cbAfter ?? m.cbBefore]
      );
      poolMembers.push({ poolId, shipId: m.shipId, cbBefore: m.cbBefore, cbAfter: m.cbAfter ?? m.cbBefore });
    }

    return { pool, members: poolMembers };
  }

  async findAll(): Promise<Pool[]> {
    const res = await this.db.query('SELECT * FROM pools ORDER BY created_at DESC');
    return res.rows.map(r => ({ id: r.id, year: r.year, createdAt: r.created_at }));
  }
}