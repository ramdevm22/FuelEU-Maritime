/**
 * Integration tests for HTTP endpoints via Supertest.
 * These run against in-memory mocks — no real DB needed.
 */
import request from 'supertest';
import express from 'express';
import { createRoutesRouter } from '../adapters/inbound/http/routesHandler';
import { createComplianceRouter, createBankingRouter, createPoolRouter } from '../adapters/inbound/http/otherHandlers';
import { IRouteRepository, IComplianceRepository, IBankRepository, IPoolRepository } from '../core/ports/repositories';
import { Route } from '../core/domain/entities';

// Baseline route with ghgIntensity=91.0 (above target 89.3368 → deficit CB)
const mockRoute: Route = {
  id: 'uuid-1', routeId: 'R001', vesselType: 'Container', fuelType: 'HFO',
  year: 2024, ghgIntensity: 91.0, fuelConsumption: 5000,
  distance: 12000, totalEmissions: 4500, isBaseline: true,
};

// Surplus route: ghgIntensity=88.0 (below target → positive CB)
const surplusRoute: Route = {
  ...mockRoute,
  routeId: 'R002', ghgIntensity: 88.0, fuelConsumption: 5000, isBaseline: true,
};

// CB formula: (89.3368 - 91.0) * (5000 * 41000) = -340,956,000 (deficit)
const EXPECTED_DEFICIT_CB = (89.3368 - 91.0) * (5000 * 41000);
// CB formula: (89.3368 - 88.0) * (5000 * 41000) = +274,244,000 (surplus)
const EXPECTED_SURPLUS_CB = (89.3368 - 88.0) * (5000 * 41000);

const routeRepo: IRouteRepository = {
  findAll: jest.fn().mockResolvedValue([mockRoute]),
  findById: jest.fn().mockResolvedValue(mockRoute),
  setBaseline: jest.fn().mockResolvedValue(mockRoute),
  findBaseline: jest.fn().mockResolvedValue(mockRoute),
  findAllWithComparison: jest.fn().mockResolvedValue([
    {
      routeId: 'R002', vesselType: 'BulkCarrier', fuelType: 'LNG',
      year: 2024, baselineGhg: 91.0, comparisonGhg: 88.0,
      percentDiff: -3.3, compliant: true,
    },
  ]),
};

// complianceRepo with upsertCB returning whatever is passed in (realistic mock)
const complianceRepo: IComplianceRepository = {
  getCB: jest.fn().mockResolvedValue({ shipId: 'SHIP001', year: 2025, cbGco2eq: EXPECTED_DEFICIT_CB }),
  upsertCB: jest.fn().mockImplementation(async (cb) => cb),
  getAdjustedCB: jest.fn().mockResolvedValue(500),
};

// surplusComplianceRepo — for banking tests (needs positive CB)
const surplusComplianceRepo: IComplianceRepository = {
  getCB: jest.fn().mockResolvedValue({ shipId: 'SHIP001', year: 2025, cbGco2eq: EXPECTED_SURPLUS_CB }),
  upsertCB: jest.fn().mockImplementation(async (cb) => cb),
  getAdjustedCB: jest.fn().mockResolvedValue(EXPECTED_SURPLUS_CB),
};

// surplusRouteRepo — returns baseline with low ghgIntensity (surplus)
const surplusRouteRepo: IRouteRepository = {
  ...routeRepo,
  findBaseline: jest.fn().mockResolvedValue(surplusRoute),
};

const bankRepo: IBankRepository = {
  findByShip: jest.fn().mockResolvedValue([]),
  bankSurplus: jest.fn().mockResolvedValue({ id: 'b1', shipId: 'SHIP001', year: 2025, amountGco2eq: 500 }),
  applyBanked: jest.fn().mockResolvedValue(undefined),
  totalBanked: jest.fn().mockResolvedValue(800),
};

const poolRepo: IPoolRepository = {
  createPool: jest.fn().mockResolvedValue({
    pool: { id: 'p1', year: 2025, createdAt: new Date() },
    members: [{ poolId: 'p1', shipId: 'SHIP001', cbBefore: 500, cbAfter: 0 }],
  }),
  findAll: jest.fn().mockResolvedValue([]),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/routes', createRoutesRouter(routeRepo));
  app.use('/compliance', createComplianceRouter(complianceRepo, routeRepo));
  app.use('/banking', createBankingRouter(bankRepo, surplusComplianceRepo));
  app.use('/pools', createPoolRouter(poolRepo, complianceRepo));
  return app;
}

// ─── Routes ───────────────────────────────────────────────

describe('GET /routes', () => {
  it('returns 200 with routes array', async () => {
    const res = await request(buildApp()).get('/routes');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].routeId).toBe('R001');
  });
});

describe('GET /routes/comparison', () => {
  it('returns 200 with comparison data', async () => {
    const res = await request(buildApp()).get('/routes/comparison');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].percentDiff).toBeDefined();
  });
});

describe('POST /routes/:routeId/baseline', () => {
  it('returns 200 and updated route', async () => {
    const res = await request(buildApp()).post('/routes/R001/baseline');
    expect(res.status).toBe(200);
    expect(res.body.data.isBaseline).toBe(true);
  });
});

// ─── Compliance ───────────────────────────────────────────

describe('GET /compliance/cb', () => {
  it('returns 200 and correct CB from formula (deficit route)', async () => {
    const res = await request(buildApp()).get('/compliance/cb?shipId=SHIP001&year=2025');
    expect(res.status).toBe(200);
    // CB = (89.3368 - 91.0) * (5000 * 41000) = -340,956,000 (deficit)
    expect(res.body.data.cbGco2eq).toBeCloseTo(EXPECTED_DEFICIT_CB, 0);
    expect(res.body.data.shipId).toBe('SHIP001');
    expect(res.body.data.year).toBe(2025);
  });

  it('returns 200 and positive CB for surplus route', async () => {
    const app = express();
    app.use(express.json());
    app.use('/compliance', createComplianceRouter(surplusComplianceRepo, surplusRouteRepo));
    const res = await request(app).get('/compliance/cb?shipId=SHIP001&year=2025');
    expect(res.status).toBe(200);
    // CB = (89.3368 - 88.0) * (5000 * 41000) = +274,244,000 (surplus)
    expect(res.body.data.cbGco2eq).toBeCloseTo(EXPECTED_SURPLUS_CB, 0);
  });

  it('returns 400 if shipId missing', async () => {
    const res = await request(buildApp()).get('/compliance/cb?year=2025');
    expect(res.status).toBe(400);
  });

  it('returns 400 if year missing', async () => {
    const res = await request(buildApp()).get('/compliance/cb?shipId=SHIP001');
    expect(res.status).toBe(400);
  });
});

// ─── Banking ──────────────────────────────────────────────

describe('POST /banking/bank', () => {
  it('returns 200 with bank entry when CB is positive', async () => {
    const res = await request(buildApp())
      .post('/banking/bank')
      .send({ shipId: 'SHIP001', year: 2025, amount: 500 });
    expect(res.status).toBe(200);
    expect(res.body.data.amountGco2eq).toBe(500);
  });
});

describe('POST /banking/apply', () => {
  it('returns 200 when applying banked surplus', async () => {
    const res = await request(buildApp())
      .post('/banking/apply')
      .send({ shipId: 'SHIP001', year: 2025, amount: 300 });
    expect(res.status).toBe(200);
    expect(res.body.data.applied).toBe(300);
  });
});

// ─── Pools ────────────────────────────────────────────────

describe('POST /pools', () => {
  it('returns 200 with created pool', async () => {
    const res = await request(buildApp())
      .post('/pools')
      .send({ year: 2025, shipIds: ['SHIP001', 'SHIP002'] });
    expect(res.status).toBe(200);
    expect(res.body.data.pool.id).toBe('p1');
    expect(res.body.data.members).toHaveLength(1);
  });
});

describe('GET /pools', () => {
  it('returns 200 with pools list', async () => {
    const res = await request(buildApp()).get('/pools');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ─── Edge Cases ───────────────────────────────────────────

describe('Edge cases', () => {
  it('negative CB cannot be banked — returns 400', async () => {
    const negRepo: IComplianceRepository = {
      ...complianceRepo,
      getCB: jest.fn().mockResolvedValue({ shipId: 'S1', year: 2025, cbGco2eq: -100 }),
    };
    const app = express();
    app.use(express.json());
    app.use('/banking', createBankingRouter(bankRepo, negRepo));
    const res = await request(app).post('/banking/bank').send({ shipId: 'S1', year: 2025, amount: 50 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('over-apply bank returns 400', async () => {
    const lowBankRepo: IBankRepository = { ...bankRepo, totalBanked: jest.fn().mockResolvedValue(100) };
    const app = express();
    app.use(express.json());
    app.use('/banking', createBankingRouter(lowBankRepo, surplusComplianceRepo));
    const res = await request(app).post('/banking/apply').send({ shipId: 'S1', year: 2025, amount: 9999 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('missing baseline returns 500 for compliance/cb', async () => {
    const noBaselineRepo: IRouteRepository = {
      ...routeRepo,
      findBaseline: jest.fn().mockResolvedValue(null),
    };
    const app = express();
    app.use(express.json());
    app.use('/compliance', createComplianceRouter(complianceRepo, noBaselineRepo));
    const res = await request(app).get('/compliance/cb?shipId=SHIP001&year=2025');
    expect(res.status).toBe(500);
  });
});