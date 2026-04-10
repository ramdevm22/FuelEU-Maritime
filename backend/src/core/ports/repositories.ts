import {
  Route,
  ComplianceBalance,
  BankEntry,
  Pool,
  PoolMember,
  RouteComparison,
} from '../domain/entities';

// Outbound ports — implemented by adapters
export interface IRouteRepository {
  findAll(): Promise<Route[]>;
  findById(id: string): Promise<Route | null>;
  setBaseline(routeId: string): Promise<Route>;
  findBaseline(): Promise<Route | null>;
  findAllWithComparison(): Promise<RouteComparison[]>;
}

export interface IComplianceRepository {
  getCB(shipId: string, year: number): Promise<ComplianceBalance | null>;
  upsertCB(cb: ComplianceBalance): Promise<ComplianceBalance>;
  getAdjustedCB(shipId: string, year: number): Promise<number>;
}

export interface IBankRepository {
  findByShip(shipId: string, year: number): Promise<BankEntry[]>;
  bankSurplus(shipId: string, year: number, amount: number): Promise<BankEntry>;
  applyBanked(shipId: string, year: number, amount: number): Promise<void>;
  totalBanked(shipId: string, year: number): Promise<number>;
}

export interface IPoolRepository {
  createPool(year: number, members: { shipId: string; cbBefore: number }[]): Promise<{ pool: Pool; members: PoolMember[] }>;
  findAll(): Promise<Pool[]>;
}
