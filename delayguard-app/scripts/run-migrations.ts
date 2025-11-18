/**
 * Run Database Migrations
 *
 * This script runs all database migrations from src/database/connection.ts
 * Usage: ts-node scripts/run-migrations.ts
 *
 * Required environment variable: DATABASE_URL
 */

import { setupDatabase, runMigrations } from '../src/database/connection';
import { logInfo, logError } from '../src/utils/logger';

async function main() {
  try {
    logInfo('Starting database migration...', { component: 'migration' });

    // Initialize database connection
    await setupDatabase();
    logInfo('Database connection established', { component: 'migration' });

    // Run all migrations
    await runMigrations();
    logInfo('✅ All migrations completed successfully', { component: 'migration' });

    process.exit(0);
  } catch (error) {
    logError(
      'Migration failed',
      error instanceof Error ? error : new Error(String(error)),
      { component: 'migration' }
    );
    process.exit(1);
  }
}

main();
