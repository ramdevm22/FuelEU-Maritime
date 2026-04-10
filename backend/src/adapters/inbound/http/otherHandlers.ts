import { Router, Request, Response } from 'express';
import { IComplianceRepository, IBankRepository, IPoolRepository, IRouteRepository } from '../../../core/ports/repositories';
import { ComputeCB, BankSurplus, ApplyBanked, CreatePool } from '../../../core/application/useCases';

export function createComplianceRouter(
  complianceRepo: IComplianceRepository,
  routeRepo: IRouteRepository
): Router {
  const router = Router();

  // GET /compliance/cb?shipId=&year=
  router.get('/cb', async (req: Request, res: Response) => {
    try {
      const { shipId, year } = req.query as { shipId: string; year: string };
      if (!shipId || !year) return res.status(400).json({ error: 'shipId and year required' });

      const uc = new ComputeCB(complianceRepo, routeRepo);
      const cb = await uc.execute(shipId, parseInt(year));
      res.json({ data: cb });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // GET /compliance/adjusted-cb?shipId=&year=
  router.get('/adjusted-cb', async (req: Request, res: Response) => {
    try {
      const { shipId, year } = req.query as { shipId: string; year: string };
      if (!shipId || !year) return res.status(400).json({ error: 'shipId and year required' });

      const adjusted = await complianceRepo.getAdjustedCB(shipId, parseInt(year));
      res.json({ data: { shipId, year: parseInt(year), adjustedCB: adjusted } });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}

export function createBankingRouter(
  bankRepo: IBankRepository,
  complianceRepo: IComplianceRepository
): Router {
  const router = Router();

  // GET /banking/records?shipId=&year=
  router.get('/records', async (req: Request, res: Response) => {
    try {
      const { shipId, year } = req.query as { shipId: string; year: string };
      const records = await bankRepo.findByShip(shipId, parseInt(year));
      const total = await bankRepo.totalBanked(shipId, parseInt(year));
      res.json({ data: { records, totalBanked: total } });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // POST /banking/bank
  router.post('/bank', async (req: Request, res: Response) => {
    try {
      const { shipId, year, amount } = req.body;
      const uc = new BankSurplus(bankRepo, complianceRepo);
      const entry = await uc.execute(shipId, year, amount);
      res.json({ data: entry });
    } catch (err: unknown) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // POST /banking/apply
  router.post('/apply', async (req: Request, res: Response) => {
    try {
      const { shipId, year, amount } = req.body;
      const uc = new ApplyBanked(bankRepo, complianceRepo);
      const result = await uc.execute(shipId, year, amount);
      res.json({ data: result });
    } catch (err: unknown) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  return router;
}

export function createPoolRouter(
  poolRepo: IPoolRepository,
  complianceRepo: IComplianceRepository
): Router {
  const router = Router();

  // POST /pools
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { year, shipIds } = req.body;
      const uc = new CreatePool(poolRepo, complianceRepo);
      const result = await uc.execute(year, shipIds);
      res.json({ data: result });
    } catch (err: unknown) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // GET /pools
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const pools = await poolRepo.findAll();
      res.json({ data: pools });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
