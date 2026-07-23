import fs from 'fs';
import path from 'path';
import { query } from './index';

export const initDB = async () => {
  try {
    // Schema uses CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS throughout,
    // so it is fully idempotent and safe to run on every container start.
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    await query(schema);
    console.log('Schema V1 applied successfully (idempotent).');

    // Apply V2 Migration (Health Scores, Risk Screenings, Learning Paths, Copilot, Gamification, IEPs, Stories)
    const migrationPath = path.join(__dirname, 'migration_v2.sql');
    if (fs.existsSync(migrationPath)) {
      const migration = fs.readFileSync(migrationPath, 'utf-8');
      await query(migration);
      console.log('Migration V2 applied successfully (idempotent).');
    }

    // Only seed when the users table is empty to avoid duplicate-key errors on restart.
    const usersCheck = await query('SELECT count(*) FROM users');
    if (parseInt(usersCheck.rows[0].count) === 0) {
      const seedPath = path.join(__dirname, 'seed.sql');
      const seed = fs.readFileSync(seedPath, 'utf-8');
      await query(seed);
      console.log('Database seeded successfully.');
    } else {
      console.log('Database already seeded, skipping.');
    }
  } catch (error) {
    console.error('Error during DB init:', error);
    throw error;
  }
};
