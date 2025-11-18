import * as dotenv from "dotenv";
import { setupDatabase, runMigrations } from "./connection";
import { logInfo, logError } from "../utils/logger";

// Load environment variables from .env file
dotenv.config();

async function migrate() {
  try {
    logInfo("Running database migrations", { component: "database" });

    // Set up database connection pool first
    await setupDatabase();

    // Run migrations explicitly (no longer automatic in setupDatabase)
    await runMigrations();

    logInfo("Database migrations completed successfully", {
      component: "database",
    });
    process.exit(0);
  } catch (error) {
    logError(
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? error : undefined,
      { component: "database", action: "migration" },
    );
    process.exit(1);
  }
}

if (require.main === module) {
  migrate();
}
