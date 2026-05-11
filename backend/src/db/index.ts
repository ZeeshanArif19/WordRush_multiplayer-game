import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the PostgreSQL connection pool
// This relies on the DATABASE_URL environment variable being set
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
  getClient: () => pool.connect(),
};
