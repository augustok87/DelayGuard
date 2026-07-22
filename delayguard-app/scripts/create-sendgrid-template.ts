/**
 * CLI entry: create the DelayGuard delay-notification dynamic template in
 * SendGrid and print the resulting d-… template ID.
 *
 *   SENDGRID_API_KEY=SG.xxx npm run sendgrid:create-template
 *
 * Logic + tests live in src/scripts/create-sendgrid-template.ts
 * (Jest only discovers tests under src/ and tests/).
 */

import { main } from "../src/scripts/create-sendgrid-template";

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
