/**
 * Create the DelayGuard delay-notification dynamic template via the SendGrid
 * REST API and print the resulting `d-…` template ID (Launch WS-E, task E1b).
 *
 * Run once per SendGrid account:
 *
 *   SENDGRID_API_KEY=SG.xxx npm run sendgrid:create-template
 *
 * Then set the printed ID as SENDGRID_DELAY_TEMPLATE_ID in the environment
 * (Vercel + env files). EmailService refuses to send with the placeholder
 * template in production (see src/services/email-service.ts).
 *
 * Merge fields (must stay in sync with EmailService.sendDelayEmail's
 * dynamicTemplateData): recipientName, customerName, orderNumber,
 * trackingNumber, trackingUrl, delayReason, delayDays, newDeliveryDate.
 *
 * Brand: navy + gold per UI_UX_REDESIGN_ANCHOUR_INSPIRED.md
 * (Primary Navy #1e3a5f, Hero Navy #0f172a, Accent Gold #f59e0b).
 *
 * CLI entry point: scripts/create-sendgrid-template.ts (thin wrapper).
 * Logic lives here so Jest (roots: src/, tests/) covers it — see the
 * sibling test create-sendgrid-template.test.ts.
 */

/** Minimal fetch surface so tests can inject a mock (no live API calls). */
export interface FetchLike {
  (
    url: string,
    init?: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    },
  ): Promise<{
    ok: boolean;
    status: number;
    statusText: string;
    json: () => Promise<unknown>;
    text: () => Promise<string>;
  }>;
}

const SENDGRID_API_BASE = "https://api.sendgrid.com/v3";

export const DELAY_TEMPLATE_NAME = "DelayGuard — Shipping Delay Notification";

export const DELAY_TEMPLATE_SUBJECT =
  "Update on order #{{orderNumber}} — new estimated delivery";

/**
 * Full HTML for the dynamic-template version. Self-contained (inline CSS,
 * no external assets — email clients block them), table-based layout for
 * client compatibility, responsive via max-width + fluid tables.
 */
export function buildDelayTemplateHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shipping delay update</title>
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:8px; overflow:hidden; border:1px solid #e2e8f0;">
          <!-- Header: navy band with gold accent -->
          <tr>
            <td style="background:#1e3a5f; background:linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); padding:28px 32px; border-bottom:4px solid #f59e0b;">
              <span style="color:#ffffff; font-size:20px; font-weight:700; letter-spacing:0.5px;">DelayGuard</span>
              <span style="display:block; color:#f59e0b; font-size:13px; font-weight:600; margin-top:6px; text-transform:uppercase; letter-spacing:1px;">Shipping delay update</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px; color:#0f172a; font-size:16px; line-height:1.5;">Hi {{recipientName}},</p>
              <p style="margin:0 0 24px; color:#334155; font-size:15px; line-height:1.6;">
                Order <strong style="color:#1e3a5f;">#{{orderNumber}}</strong> for {{customerName}} is running
                <strong style="color:#1e3a5f;">{{delayDays}} day(s)</strong> behind schedule.
                We wanted to let you know right away and share the updated delivery estimate below.
              </p>
              <!-- Details card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-left:4px solid #f59e0b; border-radius:6px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 10px; color:#64748b; font-size:12px; text-transform:uppercase; letter-spacing:1px; font-weight:600;">Delay details</p>
                    <p style="margin:0 0 6px; color:#0f172a; font-size:14px; line-height:1.7;"><strong>New estimated delivery:</strong> {{newDeliveryDate}}</p>
                    <p style="margin:0 0 6px; color:#0f172a; font-size:14px; line-height:1.7;"><strong>Reason:</strong> {{delayReason}}</p>
                    {{#if trackingNumber}}
                    <p style="margin:0; color:#0f172a; font-size:14px; line-height:1.7;"><strong>Tracking number:</strong> {{trackingNumber}}</p>
                    {{/if}}
                  </td>
                </tr>
              </table>
              {{#if trackingUrl}}
              <!-- CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td align="center">
                    <a href="{{trackingUrl}}" style="display:inline-block; background-color:#f59e0b; color:#0f172a; font-size:15px; font-weight:700; text-decoration:none; padding:14px 32px; border-radius:6px;">Track your package</a>
                  </td>
                </tr>
              </table>
              {{else}}
              <!-- No tracking yet (warehouse delay on an unfulfilled order):
                   the guarded CTA above collapses, so say what happens next
                   rather than ending on nothing (§6 R18 defect 3). -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td align="center" style="background-color:#f1f5f9; border-radius:6px; padding:16px 24px;">
                    <p style="margin:0; color:#0f172a; font-size:14px; line-height:1.6;">
                      This order hasn't shipped yet — we'll send tracking details as soon as it does.
                    </p>
                  </td>
                </tr>
              </table>
              {{/if}}
              <p style="margin:28px 0 0; color:#64748b; font-size:13px; line-height:1.6;">
                We're sorry for the inconvenience and are keeping an eye on this shipment.
                You'll hear from us again if anything changes.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#0f172a; padding:20px 32px;">
              <p style="margin:0; color:#94a3b8; font-size:12px; line-height:1.6;">
                Sent by DelayGuard on behalf of your store.<br>
                Proactive shipping-delay notifications for Shopify.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Plain-text fallback for text-only clients (and spam-score hygiene). */
export function buildDelayTemplatePlainText(): string {
  return [
    "Hi {{recipientName}},",
    "",
    "Order #{{orderNumber}} for {{customerName}} is running {{delayDays}} day(s) behind schedule.",
    "",
    "New estimated delivery: {{newDeliveryDate}}",
    "Reason: {{delayReason}}",
    "{{#if trackingNumber}}Tracking number: {{trackingNumber}}{{/if}}",
    "{{#if trackingUrl}}Track your package: {{trackingUrl}}{{else}}This order hasn't shipped yet — we'll send tracking details as soon as it does.{{/if}}",
    "",
    "We're sorry for the inconvenience and are keeping an eye on this shipment.",
    "",
    "— DelayGuard",
  ].join("\n");
}

/** POST /v3/templates payload — a *dynamic* (handlebars) template. */
export function buildCreateTemplatePayload(): {
  name: string;
  generation: "dynamic";
} {
  return { name: DELAY_TEMPLATE_NAME, generation: "dynamic" };
}

/** POST /v3/templates/{id}/versions payload — activated immediately. */
export function buildVersionPayload(): {
  name: string;
  subject: string;
  html_content: string;
  plain_content: string;
  active: 1;
} {
  return {
    name: "v1 — navy/gold launch version",
    subject: DELAY_TEMPLATE_SUBJECT,
    html_content: buildDelayTemplateHtml(),
    plain_content: buildDelayTemplatePlainText(),
    active: 1,
  };
}

/**
 * Create the dynamic template, then its active version.
 * Resolves with the SendGrid template ID (`d-…`).
 */
export async function createSendGridDelayTemplate(
  apiKey: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<string> {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      "SENDGRID_API_KEY is required. Export it and re-run: " +
        "SENDGRID_API_KEY=SG.xxx npm run sendgrid:create-template",
    );
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const templateResponse = await fetchImpl(`${SENDGRID_API_BASE}/templates`, {
    method: "POST",
    headers,
    body: JSON.stringify(buildCreateTemplatePayload()),
  });
  if (!templateResponse.ok) {
    throw new Error(
      `SendGrid template creation failed: HTTP ${templateResponse.status} — ${await templateResponse.text()}`,
    );
  }

  const template = (await templateResponse.json()) as { id?: unknown };
  if (typeof template.id !== "string" || template.id === "") {
    throw new Error(
      "SendGrid response did not include a template id — cannot continue.",
    );
  }
  const templateId = template.id;

  const versionResponse = await fetchImpl(
    `${SENDGRID_API_BASE}/templates/${templateId}/versions`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(buildVersionPayload()),
    },
  );
  if (!versionResponse.ok) {
    throw new Error(
      `SendGrid version creation failed for template ${templateId}: ` +
        `HTTP ${versionResponse.status} — ${await versionResponse.text()}. ` +
        "The empty template still exists in SendGrid; delete it or re-run version creation manually.",
    );
  }

  return templateId;
}

/** CLI entry (invoked by scripts/create-sendgrid-template.ts). */
export async function main(): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY ?? "";
  const templateId = await createSendGridDelayTemplate(apiKey);
  /* eslint-disable no-console -- CLI script: the printed ID is the deliverable */
  console.log("SendGrid delay-notification template created.");
  console.log("");
  console.log(`  SENDGRID_DELAY_TEMPLATE_ID=${templateId}`);
  console.log("");
  console.log(
    "Add this to Vercel env + your local .env, then redeploy. " +
      "Verify with the /api/test-alert endpoint.",
  );
  /* eslint-enable no-console */
}

if (require.main === module) {
  main().catch((error: unknown) => {
    // eslint-disable-next-line no-console -- CLI script error surface
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
