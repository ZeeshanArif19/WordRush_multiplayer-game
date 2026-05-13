import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Initialize the PostgreSQL connection pool
// This relies on the DATABASE_URL environment variable being set
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
  getClient: () => pool.connect(),
  init: async (retries = 5, delay = 2000) => {
    while (retries > 0) {
      try {
        // In production (dist), schema.sql might be in a different relative path
        // We try to find it in src/db first, then fall back to the same dir
        let schemaPath = path.join(process.cwd(), 'src/db/schema.sql');
        if (!fs.existsSync(schemaPath)) {
          schemaPath = path.join(__dirname, 'schema.sql');
        }
        
        if (fs.existsSync(schemaPath)) {
          const schema = fs.readFileSync(schemaPath, 'utf-8');
          await pool.query(schema);
          console.log('[DB] Schema initialized/verified successfully');
        } else {
          console.warn('[DB] schema.sql not found, skipping auto-initialization');
        }
        return; // Success
      } catch (err: any) {
        // Error code 57P03: the database system is starting up
        // Error code ECONNREFUSED: database not reachable yet
        const isStartingUp = err.code === '57P03' || err.code === 'ECONNREFUSED';
        
        if (isStartingUp && retries > 1) {
          console.log(`[DB] Database is starting up or unreachable... retrying in ${delay}ms (${retries - 1} attempts left)`);
          await new Promise(res => setTimeout(res, delay));
          retries--;
        } else {
          console.error('[DB] Failed to initialize schema:', err);
          throw err;
        }
      }
    }
  }
};
