import { describe, it, expect } from 'vitest';
import { TARGET_INTENSITY } from '../core/domain/types';
import {
  isCompliant,
  computeCB,
  computePercentDiff,
  validatePoolSum,
  deriveComparisons,
} from '../core/application/useCases';
import { Route } from '../core/domain/types';

describe('FuelEU Domain Constants', () => {
  it('TARGET_INTENSITY is 89.3368 gCO2e/MJ', () => {
    expect(TARGET_INTENSITY).toBe(89.3368);
  });
});

describe('isCompliant', () => {
  it('returns true when ghgIntensity is below target', () => {
    expect(isCompliant(88.0)).toBe(true);
  });
  it('returns true when ghgIntensity equals target', () => {
    expect(isCompliant(TARGET_INTENSITY)).toBe(true);
  });
  it('returns false when ghgIntensity is above target', () => {
    expect(isCompliant(91.0)).toBe(false);
    expect(isCompliant(93.5)).toBe(false);
  });
});

describe('computeCB', () => {
  it('positive CB when actual < target (surplus)', () => {
    expect(computeCB(88.0, 5000)).toBeGreaterThan(0);
  });
  it('negative CB when actual > target (deficit)', () => {
    expect(computeCB(93.5, 5100)).toBeLessThan(0);
  });
  it('zero CB when actual = target', () => {
    expect(computeCB(TARGET_INTENSITY, 5000)).toBe(0);
  });
  it('correct formula: (target - actual) * (consumption * 41000)', () => {
    const cb = computeCB(88.0, 5000, 41000);
    const expected = (89.3368 - 88.0) * (5000 * 41000);
    expect(cb).toBeCloseTo(expected, 2);
  });
});

describe('computePercentDiff', () => {
  it('calculates negative diff when comparison < baseline', () => {
    expect(computePercentDiff(91.0, 88.0)).toBe(-3.3);
  });
  it('calculates positive diff when comparison > baseline', () => {
    expect(computePercentDiff(88.0, 93.5)).toBeGreaterThan(0);
  });
  it('returns 0 when equal', () => {
    expect(computePercentDiff(91.0, 91.0)).toBe(0);
  });
});

describe('validatePoolSum', () => {
  it('pool sum >= 0 is valid', () => {
    expect(validatePoolSum([500, -200, 100])).toBe(true);
    expect(validatePoolSum([0])).toBe(true);
  });
  it('pool sum < 0 is invalid', () => {
    expect(validatePoolSum([-500, 100, -200])).toBe(false);
  });
});

describe('deriveComparisons', () => {
  const baseline: Route = {
    id: '1', routeId: 'R001', vesselType: 'Container', fuelType: 'HFO',
    year: 2024, ghgIntensity: 91.0, fuelConsumption: 5000,
    distance: 12000, totalEmissions: 4500, isBaseline: true,
  };
  const routes: Route[] = [
    baseline,
    {
      id: '2', routeId: 'R002', vesselType: 'BulkCarrier', fuelType: 'LNG',
      year: 2024, ghgIntensity: 88.0, fuelConsumption: 4800,
      distance: 11500, totalEmissions: 4200, isBaseline: false,
    },
  ];

  it('excludes baseline route from comparisons', () => {
    const result = deriveComparisons(routes, baseline);
    expect(result).toHaveLength(1);
    expect(result[0].routeId).toBe('R002');
  });
  it('marks routes below target as compliant', () => {
    expect(deriveComparisons(routes, baseline)[0].compliant).toBe(true);
  });
  it('includes baselineGhg in each comparison', () => {
    expect(deriveComparisons(routes, baseline)[0].baselineGhg).toBe(91.0);
  });
});
