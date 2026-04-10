import { TARGET_INTENSITY_2025, ENERGY_PER_TON_MJ } from '../domain/entities';
import { ComputeCB, ComputeComparison, BankSurplus, ApplyBanked, CreatePool } from './useCases';
import { IRouteRepository, IComplianceRepository, IBankRepository, IPoolRepository } from '../ports/repositories';
import { Route } from '../domain/entities';

// --- Mock implementations ---
const mockBaseline: Route = {
  id: '1', routeId: 'R001', vesselType: 'Container', fuelType: 'HFO',
  year: 2024, ghgIntensity: 91.0, fuelConsumption: 5000,
  distance: 12000, totalEmissions: 4500, isBaseline: true,
};

const mockRouteRepo: IRouteRepository = {
  findAll: jest.fn().mockResolvedValue([mockBaseline]),
  findById: jest.fn(),
  setBaseline: jest.fn(),
  findBaseline: jest.fn().mockResolvedValue(mockBaseline),
  findAllWithComparison: jest.fn().mockResolvedValue([]),
};

const mockComplianceRepo: IComplianceRepository = {
  getCB: jest.fn().mockResolvedValue({ shipId: 'SHIP001', year: 2025, cbGco2eq: 1000 }),
  upsertCB: jest.fn().mockImplementation(async (cb) => cb),
  getAdjustedCB: jest.fn().mockResolvedValue(500),
};

const mockBankRepo: IBankRepository = {
  findByShip: jest.fn().mockResolvedValue([]),
  bankSurplus: jest.fn().mockResolvedValue({ id: 'b1', shipId: 'SHIP001', year: 2025, amountGco2eq: 500 }),
  applyBanked: jest.fn().mockResolvedValue(undefined),
  totalBanked: jest.fn().mockResolvedValue(800),
};

const mockPoolRepo: IPoolRepository = {
  createPool: jest.fn().mockResolvedValue({ pool: { id: 'p1', year: 2025, createdAt: new Date() }, members: [] }),
  findAll: jest.fn().mockResolvedValue([]),
};

// --- Tests ---

describe('Core constants', () => {
  it('TARGET_INTENSITY_2025 is 89.3368', () => {
    expect(TARGET_INTENSITY_2025).toBe(89.3368);
  });
  it('ENERGY_PER_TON_MJ is 41000', () => {
    expect(ENERGY_PER_TON_MJ).toBe(41000);
  });
  it('CB formula: positive CB = surplus when actual < target', () => {
    const target = TARGET_INTENSITY_2025;
    const actual = 88.0;
    const energy = 5000 * ENERGY_PER_TON_MJ;
    const cb = (target - actual) * energy;
    expect(cb).toBeGreaterThan(0);
  });
  it('CB formula: negative CB = deficit when actual > target', () => {
    const cb = (TARGET_INTENSITY_2025 - 93.5) * (5100 * ENERGY_PER_TON_MJ);
    expect(cb).toBeLessThan(0);
  });
});

describe('ComputeCB', () => {
  it('computes and upserts CB for a ship', async () => {
    const uc = new ComputeCB(mockComplianceRepo, mockRouteRepo);
    const result = await uc.execute('SHIP001', 2025);
    expect(mockComplianceRepo.upsertCB).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('throws if no baseline is set', async () => {
    const noBaselineRepo = { ...mockRouteRepo, findBaseline: jest.fn().mockResolvedValue(null) };
    const uc = new ComputeCB(mockComplianceRepo, noBaselineRepo);
    await expect(uc.execute('SHIP001', 2025)).rejects.toThrow('No baseline route set');
  });
});

describe('ComputeComparison', () => {
  it('returns comparison data from route repo', async () => {
    const uc = new ComputeComparison(mockRouteRepo);
    const result = await uc.execute();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('BankSurplus', () => {
  it('banks positive CB successfully', async () => {
    const uc = new BankSurplus(mockBankRepo, mockComplianceRepo);
    const result = await uc.execute('SHIP001', 2025, 500);
    expect(result.amountGco2eq).toBe(500);
  });

  it('throws if amount exceeds CB', async () => {
    const uc = new BankSurplus(mockBankRepo, mockComplianceRepo);
    await expect(uc.execute('SHIP001', 2025, 9999)).rejects.toThrow('Amount exceeds available CB');
  });

  it('throws if CB is negative', async () => {
    const negRepo = { ...mockComplianceRepo, getCB: jest.fn().mockResolvedValue({ shipId: 'S1', year: 2025, cbGco2eq: -100 }) };
    const uc = new BankSurplus(mockBankRepo, negRepo);
    await expect(uc.execute('S1', 2025, 50)).rejects.toThrow('No positive CB to bank');
  });
});

describe('ApplyBanked', () => {
  it('applies banked surplus and returns remaining', async () => {
    const uc = new ApplyBanked(mockBankRepo, mockComplianceRepo);
    const result = await uc.execute('SHIP001', 2025, 300);
    expect(result.applied).toBe(300);
    expect(result.remaining).toBe(500);
  });

  it('throws if amount exceeds banked', async () => {
    const uc = new ApplyBanked(mockBankRepo, mockComplianceRepo);
    await expect(uc.execute('SHIP001', 2025, 9999)).rejects.toThrow('Amount exceeds banked surplus');
  });
});

describe('CreatePool', () => {
  it('creates pool with valid members', async () => {
    const uc = new CreatePool(mockPoolRepo, mockComplianceRepo);
    const result = await uc.execute(2025, ['SHIP001', 'SHIP002']);
    expect(result.pool).toBeDefined();
  });

  it('throws when pool sum < 0', async () => {
    const negRepo = { ...mockComplianceRepo, getAdjustedCB: jest.fn().mockResolvedValue(-500) };
    const uc = new CreatePool(mockPoolRepo, negRepo);
    await expect(uc.execute(2025, ['SHIP001', 'SHIP002'])).rejects.toThrow('Pool sum');
  });
});
