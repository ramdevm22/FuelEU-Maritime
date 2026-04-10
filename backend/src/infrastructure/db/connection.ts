import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/fueleu_db',
});

export async function testConnection() {
  try {
    const res = await db.query('SELECT NOW()');
    console.log('✅ Database connected:', res.rows[0].now);
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }
}
