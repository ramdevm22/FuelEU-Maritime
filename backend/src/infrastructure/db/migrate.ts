import { db } from './connection';

async function migrate() {
  console.log('🔄 Running migrations...');

  await db.query(`
    CREATE TABLE IF NOT EXISTS routes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      route_id VARCHAR(50) UNIQUE NOT NULL,
      vessel_type VARCHAR(100) NOT NULL,
      fuel_type VARCHAR(50) NOT NULL,
      year INT NOT NULL,
      ghg_intensity DECIMAL(10,4) NOT NULL,
      fuel_consumption DECIMAL(12,2) NOT NULL,
      distance DECIMAL(12,2) NOT NULL,
      total_emissions DECIMAL(12,2) NOT NULL,
      is_baseline BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ship_compliance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ship_id VARCHAR(100) NOT NULL,
      year INT NOT NULL,
      cb_gco2eq DECIMAL(20,6) NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(ship_id, year)
    );

    CREATE TABLE IF NOT EXISTS bank_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ship_id VARCHAR(100) NOT NULL,
      year INT NOT NULL,
      amount_gco2eq DECIMAL(20,6) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pools (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      year INT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pool_members (
      pool_id UUID REFERENCES pools(id) ON DELETE CASCADE,
      ship_id VARCHAR(100) NOT NULL,
      cb_before DECIMAL(20,6) NOT NULL,
      cb_after DECIMAL(20,6) NOT NULL,
      PRIMARY KEY (pool_id, ship_id)
    );
  `);

  console.log('✅ Migrations complete');
  await db.end();
}

migrate().catch(console.error);
