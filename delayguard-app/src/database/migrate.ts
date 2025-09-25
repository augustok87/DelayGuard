import { setupDatabase } from './connection';

async function migrate() {
  try {
    console.log('🔄 Running database migrations...');
    await setupDatabase();
    console.log('✅ Database migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  migrate();
}
