import { TARGET_INTENSITY, Route, RouteComparison } from '../domain/types';

/**
 * Pure domain use-case: compute whether a route is compliant.
 * No framework dependencies — fully testable.
 */
export function isCompliant(ghgIntensity: number): boolean {
  return ghgIntensity <= TARGET_INTENSITY;
}

/**
 * Compute compliance balance for a route given energy scope.
 * CB = (Target − Actual) × EnergyInScope
 * Positive → Surplus, Negative → Deficit
 */
export function computeCB(ghgIntensity: number, fuelConsumption: number, energyPerTon = 41000): number {
  const energyInScope = fuelConsumption * energyPerTon;
  return (TARGET_INTENSITY - ghgIntensity) * energyInScope;
}

/**
 * Compute percent difference between comparison and baseline GHG.
 * percentDiff = ((comparison / baseline) - 1) * 100
 */
export function computePercentDiff(baseline: number, comparison: number): number {
  return Math.round(((comparison / baseline) - 1) * 100 * 100) / 100;
}

/**
 * Derive comparison objects from a set of routes + a baseline.
 */
export function deriveComparisons(routes: Route[], baseline: Route): RouteComparison[] {
  return routes
    .filter(r => !r.isBaseline)
    .map(r => ({
      routeId: r.routeId,
      vesselType: r.vesselType,
      fuelType: r.fuelType,
      year: r.year,
      baselineGhg: baseline.ghgIntensity,
      comparisonGhg: r.ghgIntensity,
      percentDiff: computePercentDiff(baseline.ghgIntensity, r.ghgIntensity),
      compliant: isCompliant(r.ghgIntensity),
    }));
}

/**
 * Validate pool: sum of adjusted CB must be >= 0.
 */
export function validatePoolSum(cbValues: number[]): boolean {
  return cbValues.reduce((a, b) => a + b, 0) >= 0;
}
