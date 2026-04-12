import {
  Route, RouteComparison, ComplianceBalance,
  BankRecords, BankEntry, PoolResult, Pool,
} from '../../core/domain/types';

const BASE = 'https://fueleu-backend-6qlb.onrender.com';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json.data as T;
}

// Routes
export const getRoutes = () => apiFetch<Route[]>('/routes');
export const setBaseline = (routeId: string) =>
  apiFetch<Route>(`/routes/${routeId}/baseline`, { method: 'POST' });
export const getComparison = () => apiFetch<RouteComparison[]>('/routes/comparison');

// Compliance
export const getCB = (shipId: string, year: number) =>
  apiFetch<ComplianceBalance>(`/compliance/cb?shipId=${shipId}&year=${year}`);
export const getAdjustedCB = (shipId: string, year: number) =>
  apiFetch<{ shipId: string; year: number; adjustedCB: number }>(
    `/compliance/adjusted-cb?shipId=${shipId}&year=${year}`
  );

// Banking
export const getBankRecords = (shipId: string, year: number) =>
  apiFetch<BankRecords>(`/banking/records?shipId=${shipId}&year=${year}`);
export const bankSurplus = (shipId: string, year: number, amount: number) =>
  apiFetch<BankEntry>('/banking/bank', {
    method: 'POST',
    body: JSON.stringify({ shipId, year, amount }),
  });
export const applyBanked = (shipId: string, year: number, amount: number) =>
  apiFetch<{ applied: number; remaining: number }>('/banking/apply', {
    method: 'POST',
    body: JSON.stringify({ shipId, year, amount }),
  });

// Pools
export const getPools = () => apiFetch<Pool[]>('/pools');
export const createPool = (year: number, shipIds: string[]) =>
  apiFetch<PoolResult>('/pools', {
    method: 'POST',
    body: JSON.stringify({ year, shipIds }),
  });
