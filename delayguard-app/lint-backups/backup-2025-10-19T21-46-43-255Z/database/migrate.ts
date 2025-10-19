import { setupDatabase } from './connection';
import { logInfo, logError } from '../utils/logger';

async function migrate() {
  try {
    logInfo('Running database migrations', { component: 'database' });
    await setupDatabase();
    logInfo('Database migrations completed successfully', { component: 'database' });
    process.exit(0);
  } catch (error) {
    logError(error instanceof Error ? error.message : String(error), error instanceof Error ? error : undefined, { component: 'database', action: 'migration' });
    process.exit(1);
  }
}

if (require.main === module) {
  migrate();
}
