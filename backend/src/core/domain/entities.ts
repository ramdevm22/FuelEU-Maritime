// Core domain entities — no framework dependencies

export interface Route {
  id: string;
  routeId: string;
  vesselType: string;
  fuelType: string;
  year: number;
  ghgIntensity: number;
  fuelConsumption: number;
  distance: number;
  totalEmissions: number;
  isBaseline: boolean;
}

export interface ComplianceBalance {
  shipId: string;
  year: number;
  cbGco2eq: number;
}

export interface BankEntry {
  id: string;
  shipId: string;
  year: number;
  amountGco2eq: number;
}

export interface Pool {
  id: string;
  year: number;
  createdAt: Date;
}

export interface PoolMember {
  poolId: string;
  shipId: string;
  cbBefore: number;
  cbAfter: number;
}

export interface RouteComparison {
  routeId: string;
  vesselType: string;
  fuelType: string;
  year: number;
  baselineGhg: number;
  comparisonGhg: number;
  percentDiff: number;
  compliant: boolean;
}

export const TARGET_INTENSITY_2025 = 89.3368; // gCO2e/MJ
export const ENERGY_PER_TON_MJ = 41000; // MJ/t
