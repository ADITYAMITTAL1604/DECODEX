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
    const migrationV2Path = path.join(__dirname, 'migration_v2.sql');
    if (fs.existsSync(migrationV2Path)) {
      const migration = fs.readFileSync(migrationV2Path, 'utf-8');
      await query(migration);
      console.log('Migration V2 applied successfully (idempotent).');
    }

    // Apply V3 Migration (Multi-Language Support: preferred_language on users)
    const migrationV3Path = path.join(__dirname, 'migration_v3.sql');
    if (fs.existsSync(migrationV3Path)) {
      const migration = fs.readFileSync(migrationV3Path, 'utf-8');
      await query(migration);
      console.log('Migration V3 applied successfully (idempotent).');
    }

    // Apply V4 Migration (Streak Freeze Mechanism)
    const migrationV4Path = path.join(__dirname, 'migration_v4.sql');
    if (fs.existsSync(migrationV4Path)) {
      const migration = fs.readFileSync(migrationV4Path, 'utf-8');
      await query(migration);
      console.log('Migration V4 applied successfully (idempotent).');
    }

    // Apply V5 Migration (Audio Object Storage)
    const migrationV5Path = path.join(__dirname, 'migration_v5.sql');
    if (fs.existsSync(migrationV5Path)) {
      const migration = fs.readFileSync(migrationV5Path, 'utf-8');
      await query(migration);
      console.log('Migration V5 applied successfully (idempotent).');
    }

    // Apply V6 Migration (Drop deprecated audio_base64 and audio_file_path columns)
    const migrationV6Path = path.join(__dirname, 'migration_v6.sql');
    if (fs.existsSync(migrationV6Path)) {
      const migration = fs.readFileSync(migrationV6Path, 'utf-8');
      await query(migration);
      console.log('Migration V6 applied successfully (idempotent).');
    }

    // Apply V7 Migration (Harden DOB Knowledge-Based Verification)
    const migrationV7Path = path.join(__dirname, 'migration_v7.sql');
    if (fs.existsSync(migrationV7Path)) {
      const migration = fs.readFileSync(migrationV7Path, 'utf-8');
      await query(migration);
      console.log('Migration V7 applied successfully (idempotent).');
    }

    // Apply V8 Migration (Dead-letter table for failed audio processing jobs)
    const migrationV8Path = path.join(__dirname, 'migration_v8.sql');
    if (fs.existsSync(migrationV8Path)) {
      const migration = fs.readFileSync(migrationV8Path, 'utf-8');
      await query(migration);
      console.log('Migration V8 applied successfully (idempotent).');
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
