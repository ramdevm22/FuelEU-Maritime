import { TARGET_INTENSITY_2025, ENERGY_PER_TON_MJ } from '../domain/entities';
import { IComplianceRepository, IRouteRepository, IBankRepository, IPoolRepository } from '../ports/repositories';

// Use Case: Compute Compliance Balance
export class ComputeCB {
  constructor(
    private complianceRepo: IComplianceRepository,
    private routeRepo: IRouteRepository
  ) {}

  async execute(shipId: string, year: number) {
    const baseline = await this.routeRepo.findBaseline();
    if (!baseline) throw new Error('No baseline route set');

    const energyInScope = baseline.fuelConsumption * ENERGY_PER_TON_MJ;
    const target = TARGET_INTENSITY_2025;
    const actual = baseline.ghgIntensity;
    const cbGco2eq = (target - actual) * energyInScope;

    const cb = await this.complianceRepo.upsertCB({ shipId, year, cbGco2eq });
    return cb;
  }
}

// Use Case: Compute Route Comparison
export class ComputeComparison {
  constructor(private routeRepo: IRouteRepository) {}

  async execute() {
    return this.routeRepo.findAllWithComparison();
  }
}

// Use Case: Bank Surplus CB
export class BankSurplus {
  constructor(
    private bankRepo: IBankRepository,
    private complianceRepo: IComplianceRepository
  ) {}

  async execute(shipId: string, year: number, amount: number) {
    const cb = await this.complianceRepo.getCB(shipId, year);
    if (!cb || cb.cbGco2eq <= 0) throw new Error('No positive CB to bank');
    if (amount > cb.cbGco2eq) throw new Error('Amount exceeds available CB');

    return this.bankRepo.bankSurplus(shipId, year, amount);
  }
}

// Use Case: Apply Banked Surplus
export class ApplyBanked {
  constructor(
    private bankRepo: IBankRepository,
    private complianceRepo: IComplianceRepository
  ) {}

  async execute(shipId: string, year: number, amount: number) {
    const totalBanked = await this.bankRepo.totalBanked(shipId, year);
    if (amount > totalBanked) throw new Error('Amount exceeds banked surplus');

    await this.bankRepo.applyBanked(shipId, year, amount);
    const cb = await this.complianceRepo.getCB(shipId, year);
    const currentCB = cb?.cbGco2eq ?? 0;
    await this.complianceRepo.upsertCB({ shipId, year, cbGco2eq: currentCB + amount });
    return { applied: amount, remaining: totalBanked - amount };
  }
}

// Use Case: Create Pool
export class CreatePool {
  constructor(
    private poolRepo: IPoolRepository,
    private complianceRepo: IComplianceRepository
  ) {}

  async execute(year: number, shipIds: string[]) {
    const members: { shipId: string; cbBefore: number }[] = [];

    for (const shipId of shipIds) {
      const adjusted = await this.complianceRepo.getAdjustedCB(shipId, year);
      members.push({ shipId, cbBefore: adjusted });
    }

    const totalCB = members.reduce((sum, m) => sum + m.cbBefore, 0);
    if (totalCB < 0) throw new Error('Pool sum of adjusted CB must be >= 0');

    // Greedy allocation: sort desc by CB, transfer surplus to deficits
    const sorted = [...members].sort((a, b) => b.cbBefore - a.cbBefore);
    const withAfter: { shipId: string; cbBefore: number; cbAfter: number }[] = [];

    let surplus = sorted.filter(m => m.cbBefore > 0).reduce((s, m) => s + m.cbBefore, 0);
    for (const member of sorted) {
      if (member.cbBefore >= 0) {
        withAfter.push({ ...member, cbAfter: 0 }); // surplus ships exit at 0
      } else {
        const needed = Math.abs(member.cbBefore);
        if (surplus >= needed) {
          surplus -= needed;
          withAfter.push({ ...member, cbAfter: 0 });
        } else {
          withAfter.push({ ...member, cbAfter: member.cbBefore + surplus });
          surplus = 0;
        }
      }
    }

    // Validate: deficit ship cannot exit worse, surplus ship cannot go negative
    for (const m of withAfter) {
      const original = members.find(x => x.shipId === m.shipId)!;
      if (original.cbBefore < 0 && m.cbAfter < original.cbBefore)
        throw new Error(`Ship ${m.shipId} deficit would worsen`);
      if (original.cbBefore > 0 && m.cbAfter < 0)
        throw new Error(`Ship ${m.shipId} surplus would go negative`);
    }

    return this.poolRepo.createPool(year, withAfter);
  }
}
