import { Router, Request, Response } from 'express';
import { IRouteRepository } from '../../../core/ports/repositories';
import { ComputeComparison } from '../../../core/application/useCases';

export function createRoutesRouter(routeRepo: IRouteRepository): Router {
  const router = Router();

  // GET /routes
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const routes = await routeRepo.findAll();
      res.json({ data: routes });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // GET /routes/comparison — MUST be registered before /:routeId to avoid param capture
  router.get('/comparison', async (_req: Request, res: Response) => {
    try {
      const uc = new ComputeComparison(routeRepo);
      const comparisons = await uc.execute();
      res.json({ data: comparisons });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // POST /routes/:routeId/baseline
  router.post('/:routeId/baseline', async (req: Request, res: Response) => {
    try {
      const route = await routeRepo.setBaseline(req.params.routeId);
      res.json({ data: route });
    } catch (err: unknown) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  return router;
}
