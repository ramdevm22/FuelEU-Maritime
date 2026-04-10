import { Pool as PgPool } from 'pg';
import { Route, RouteComparison, TARGET_INTENSITY_2025 } from '../../../core/domain/entities';
import { IRouteRepository } from '../../../core/ports/repositories';

export class PgRouteRepository implements IRouteRepository {
  constructor(private db: PgPool) {}

  async findAll(): Promise<Route[]> {
    const res = await this.db.query(`
      SELECT id, route_id, vessel_type, fuel_type, year, ghg_intensity,
             fuel_consumption, distance, total_emissions, is_baseline
      FROM routes ORDER BY year, route_id
    `);
    return res.rows.map(this.mapRow);
  }

  async findById(id: string): Promise<Route | null> {
    const res = await this.db.query('SELECT * FROM routes WHERE route_id = $1', [id]);
    return res.rows[0] ? this.mapRow(res.rows[0]) : null;
  }

  async setBaseline(routeId: string): Promise<Route> {
    await this.db.query('UPDATE routes SET is_baseline = false');
    const res = await this.db.query(
      'UPDATE routes SET is_baseline = true WHERE route_id = $1 RETURNING *',
      [routeId]
    );
    if (!res.rows[0]) throw new Error(`Route ${routeId} not found`);
    return this.mapRow(res.rows[0]);
  }

  async findBaseline(): Promise<Route | null> {
    const res = await this.db.query('SELECT * FROM routes WHERE is_baseline = true LIMIT 1');
    return res.rows[0] ? this.mapRow(res.rows[0]) : null;
  }

  async findAllWithComparison(): Promise<RouteComparison[]> {
    const baseline = await this.findBaseline();
    if (!baseline) throw new Error('No baseline set');
    const routes = await this.findAll();

    return routes
      .filter(r => !r.isBaseline)
      .map(r => {
        const percentDiff = ((r.ghgIntensity / baseline.ghgIntensity) - 1) * 100;
        return {
          routeId: r.routeId,
          vesselType: r.vesselType,
          fuelType: r.fuelType,
          year: r.year,
          baselineGhg: baseline.ghgIntensity,
          comparisonGhg: r.ghgIntensity,
          percentDiff: Math.round(percentDiff * 100) / 100,
          compliant: r.ghgIntensity <= TARGET_INTENSITY_2025,
        };
      });
  }

  private mapRow(row: Record<string, unknown>): Route {
    return {
      id: row.id as string,
      routeId: row.route_id as string,
      vesselType: row.vessel_type as string,
      fuelType: row.fuel_type as string,
      year: row.year as number,
      ghgIntensity: parseFloat(row.ghg_intensity as string),
      fuelConsumption: parseFloat(row.fuel_consumption as string),
      distance: parseFloat(row.distance as string),
      totalEmissions: parseFloat(row.total_emissions as string),
      isBaseline: row.is_baseline as boolean,
    };
  }
}