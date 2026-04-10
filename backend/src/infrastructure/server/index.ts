import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db, testConnection } from '../db/connection';
import { PgRouteRepository } from '../../adapters/outbound/postgres/routeRepository';
import { PgComplianceRepository, PgBankRepository, PgPoolRepository } from '../../adapters/outbound/postgres/otherRepositories';
import { createRoutesRouter } from '../../adapters/inbound/http/routesHandler';
import { createComplianceRouter, createBankingRouter, createPoolRouter } from '../../adapters/inbound/http/otherHandlers';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Wire up repositories
const routeRepo = new PgRouteRepository(db);
const complianceRepo = new PgComplianceRepository(db);
const bankRepo = new PgBankRepository(db);
const poolRepo = new PgPoolRepository(db);

// Mount routers
app.use('/routes', createRoutesRouter(routeRepo));
app.use('/compliance', createComplianceRouter(complianceRepo, routeRepo));
app.use('/banking', createBankingRouter(bankRepo, complianceRepo));
app.use('/pools', createPoolRouter(poolRepo, complianceRepo));

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`🚀 FuelEU Backend running on http://localhost:${PORT}`);
  });
}

start();

export default app;
