# FuelEU Maritime Compliance Platform

> Built for **Varuna Marine Services BV** — Full-Stack Developer Assignment

A full-stack compliance dashboard implementing **Regulation (EU) 2023/1805** (FuelEU Maritime), covering route management, GHG compliance tracking, CB banking (Article 20), and ship pooling (Article 21).

---

## Architecture Overview

The project uses **Hexagonal Architecture (Ports & Adapters)** in both frontend and backend.

```
BACKEND
src/
  core/
    domain/          ← Pure types & constants (no deps)
    application/     ← Use cases: ComputeCB, BankSurplus, ApplyBanked, CreatePool
    ports/           ← Repository interfaces (IRouteRepository, etc.)
  adapters/
    inbound/http/    ← Express route handlers
    outbound/postgres/ ← PostgreSQL implementations of ports
  infrastructure/
    db/              ← Connection, migrations, seed
    server/          ← Express app + DI wiring

FRONTEND
src/
  core/
    domain/          ← TypeScript types
  adapters/
    ui/              ← React tab components
    infrastructure/  ← API fetch layer
  shared/            ← Reusable UI primitives
```

**Key principles:**
- `core/` has zero framework imports (no Express, no pg, no React)
- Dependency direction: `core → ports ← adapters`
- Frameworks are confined to `infrastructure/` and `adapters/`

---

## Tech Stack

| Layer      | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18, TypeScript, TailwindCSS, Recharts, Vite |
| Backend   | Node.js, TypeScript, Express        |
| Database  | PostgreSQL                          |
| Testing   | Vitest (frontend), Jest + Supertest (backend) |
| Tooling   | ESLint, ts-node-dev, dotenv         |

---

## Setup & Run

### Prerequisites
- Node.js 18+
- PostgreSQL running locally (or Docker)

### 1. Database Setup
```bash
# Create the database
createdb fueleu_db

# Or with psql:
psql -c "CREATE DATABASE fueleu_db;"
```

### 2. Backend
```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env: set DATABASE_URL=postgresql://user:password@localhost:5432/fueleu_db

# Run migrations
npm run migrate

# Seed demo data (5 routes from assignment spec)
npm run seed

# Start dev server
npm run dev
# → http://localhost:3001
```

### 3. Frontend
```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# → http://localhost:5173
```

---

## Execute Tests

### Backend
```bash
cd backend
npm run test
# Runs: ComputeComparison, BankSurplus, ApplyBanked, CreatePool, domain constants
```

### Frontend
```bash
cd frontend
npm run test
# Runs: domain formula tests, pool validation, percent diff
```

---

## API Endpoints

### Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/routes` | All routes with filters |
| POST | `/routes/:routeId/baseline` | Set baseline route |
| GET | `/routes/comparison` | Baseline vs all routes |

### Compliance
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/compliance/cb?shipId=&year=` | Compute & store CB snapshot |
| GET | `/compliance/adjusted-cb?shipId=&year=` | CB after bank applications |

### Banking
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/banking/records?shipId=&year=` | Bank entry history |
| POST | `/banking/bank` | Bank positive CB surplus |
| POST | `/banking/apply` | Apply banked surplus to deficit |

### Pools
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/pools` | All pools |
| POST | `/pools` | Create pool with greedy allocation |

---

## Core Formulas

```
Target Intensity (2025) = 89.3368 gCO₂e/MJ

Energy in scope (MJ) = fuelConsumption (t) × 41,000 MJ/t

Compliance Balance = (Target − Actual) × Energy in scope
  → Positive CB = Surplus (can bank)
  → Negative CB = Deficit (can apply banked)

Percent Diff = ((comparison / baseline) − 1) × 100
```

---

## Sample Requests

### Set Baseline
```bash
curl -X POST http://localhost:3001/routes/R001/baseline
```

### Get CB
```bash
curl "http://localhost:3001/compliance/cb?shipId=SHIP001&year=2025"
```

### Bank Surplus
```bash
curl -X POST http://localhost:3001/banking/bank \
  -H "Content-Type: application/json" \
  -d '{"shipId":"SHIP001","year":2025,"amount":50000}'
```

### Create Pool
```bash
curl -X POST http://localhost:3001/pools \
  -H "Content-Type: application/json" \
  -d '{"year":2025,"shipIds":["SHIP001","SHIP002","SHIP003"]}'
```

---

## Seed Data (KPI Dataset)

| routeId | vesselType  | fuelType | year | ghgIntensity | fuelConsumption | distance | totalEmissions | isBaseline |
|---------|-------------|----------|------|-------------|-----------------|----------|----------------|-----------|
| R001    | Container   | HFO      | 2024 | 91.0        | 5000            | 12000    | 4500           | ✓ |
| R002    | BulkCarrier | LNG      | 2024 | 88.0        | 4800            | 11500    | 4200           | |
| R003    | Tanker      | MGO      | 2024 | 93.5        | 5100            | 12500    | 4700           | |
| R004    | RoRo        | HFO      | 2025 | 89.2        | 4900            | 11800    | 4300           | |
| R005    | Container   | LNG      | 2025 | 90.5        | 4950            | 11900    | 4400           | |
