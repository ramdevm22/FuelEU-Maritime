import {
  Route, RouteComparison, ComplianceBalance,
  BankRecords, BankEntry, PoolResult, Pool,
} from '../domain/types';

/**
 * Outbound port for the Routes API.
 * Adapters (api.ts) implement this; core only depends on this interface.
 */
export interface IRoutesApi {
  getRoutes(): Promise<Route[]>;
  setBaseline(routeId: string): Promise<Route>;
  getComparison(): Promise<RouteComparison[]>;
}

/**
 * Outbound port for the Compliance API.
 */
export interface IComplianceApi {
  getCB(shipId: string, year: number): Promise<ComplianceBalance>;
  getAdjustedCB(shipId: string, year: number): Promise<{ shipId: string; year: number; adjustedCB: number }>;
}

/**
 * Outbound port for the Banking API.
 */
export interface IBankingApi {
  getBankRecords(shipId: string, year: number): Promise<BankRecords>;
  bankSurplus(shipId: string, year: number, amount: number): Promise<BankEntry>;
  applyBanked(shipId: string, year: number, amount: number): Promise<{ applied: number; remaining: number }>;
}

/**
 * Outbound port for the Pools API.
 */
export interface IPoolsApi {
  getPools(): Promise<Pool[]>;
  createPool(year: number, shipIds: string[]): Promise<PoolResult>;
}
