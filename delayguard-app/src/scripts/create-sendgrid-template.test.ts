/**
 * create-sendgrid-template — sibling tests (Launch WS-E, task E1b).
 *
 * The script creates the delay-notification dynamic template via the SendGrid
 * REST API. No live API calls here: the fetch surface is injected and mocked.
 * Covers HTML generation (every merge field), API payload shape, and the
 * two-call create-template → create-version flow including error paths.
 */

import {
  DELAY_TEMPLATE_NAME,
  buildDelayTemplateHtml,
  buildDelayTemplatePlainText,
  buildCreateTemplatePayload,
  buildVersionPayload,
  createSendGridDelayTemplate,
  type FetchLike,
} from "./create-sendgrid-template";

const MERGE_FIELDS = [
  "{{recipientName}}",
  "{{customerName}}",
  "{{orderNumber}}",
  "{{trackingNumber}}",
  "{{trackingUrl}}",
  "{{delayReason}}",
  "{{delayDays}}",
  "{{newDeliveryDate}}",
] as const;

describe("buildDelayTemplateHtml", () => {
  const html = buildDelayTemplateHtml();

  it.each(MERGE_FIELDS)("contains the %s merge field", (field) => {
    expect(html).toContain(field);
  });

  it("links the tracking CTA to {{trackingUrl}}", () => {
    expect(html).toMatch(/href="{{trackingUrl}}"/);
  });

  it("guards the tracking section so unfulfilled (no-tracking) alerts render cleanly", () => {
    expect(html).toContain("{{#if trackingUrl}}");
    expect(html).toContain("{{/if}}");
  });

  it("still tells the reader what happens next when there is no tracking (§6 R18 defect 3)", () => {
    // The first real delivered email was a warehouse delay on an unfulfilled
    // order: no tracking number and no tracking URL, so BOTH guarded blocks
    // collapsed and the message ended with no call to action at all.
    expect(html).toContain("{{else}}");
    expect(html).toMatch(/tracking details as soon as/i);
  });

  it("uses the Anchour brand palette (navy #1e3a5f, gold #f59e0b)", () => {
    expect(html).toContain("#1e3a5f");
    expect(html).toContain("#f59e0b");
  });

  it("is a self-contained responsive document (viewport meta, no external assets)", () => {
    expect(html).toContain('name="viewport"');
    // No externally hosted scripts/styles/images — email clients block or flag them.
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<link[^>]+href/i);
    expect(html).not.toMatch(/src="http/i);
  });
});

describe("buildDelayTemplatePlainText", () => {
  it("contains the core merge fields for text-only clients", () => {
    const text = buildDelayTemplatePlainText();
    for (const field of [
      "{{recipientName}}",
      "{{orderNumber}}",
      "{{newDeliveryDate}}",
      "{{trackingUrl}}",
    ]) {
      expect(text).toContain(field);
    }
  });
});

describe("API payload shapes", () => {
  it("buildCreateTemplatePayload requests a *dynamic* template with a stable name", () => {
    expect(buildCreateTemplatePayload()).toEqual({
      name: DELAY_TEMPLATE_NAME,
      generation: "dynamic",
    });
  });

  it("buildVersionPayload activates the version with subject, html and plain content", () => {
    const payload = buildVersionPayload();
    expect(payload.active).toBe(1);
    expect(payload.name).toBeTruthy();
    expect(payload.subject).toContain("{{orderNumber}}");
    expect(payload.html_content).toBe(buildDelayTemplateHtml());
    expect(payload.plain_content).toBe(buildDelayTemplatePlainText());
  });
});

describe("createSendGridDelayTemplate", () => {
  function makeResponse(status: number, body: unknown): {
    ok: boolean;
    status: number;
    statusText: string;
    json: () => Promise<unknown>;
    text: () => Promise<string>;
  } {
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: String(status),
      json: async() => body,
      text: async() => JSON.stringify(body),
    };
  }

  it("creates the template then an active version, returning the d-… id", async() => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(makeResponse(201, { id: "d-abc123def456" }))
      .mockResolvedValueOnce(makeResponse(201, { id: "version-1" }));

    const id = await createSendGridDelayTemplate(
      "SG.test-key",
      fetchMock as unknown as FetchLike,
    );

    expect(id).toBe("d-abc123def456");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [templateUrl, templateInit] = fetchMock.mock.calls[0];
    expect(templateUrl).toBe("https://api.sendgrid.com/v3/templates");
    expect(templateInit.method).toBe("POST");
    expect(templateInit.headers).toMatchObject({
      Authorization: "Bearer SG.test-key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(templateInit.body)).toEqual(buildCreateTemplatePayload());

    const [versionUrl, versionInit] = fetchMock.mock.calls[1];
    expect(versionUrl).toBe(
      "https://api.sendgrid.com/v3/templates/d-abc123def456/versions",
    );
    expect(versionInit.method).toBe("POST");
    expect(versionInit.headers).toMatchObject({
      Authorization: "Bearer SG.test-key",
    });
    expect(JSON.parse(versionInit.body)).toEqual(buildVersionPayload());
  });

  it("throws before any network call when the API key is missing", async() => {
    const fetchMock = jest.fn();

    await expect(
      createSendGridDelayTemplate("", fetchMock as unknown as FetchLike),
    ).rejects.toThrow(/SENDGRID_API_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws with the upstream status when template creation fails", async() => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        makeResponse(401, { errors: [{ message: "unauthorized" }] }),
      );

    await expect(
      createSendGridDelayTemplate("SG.bad", fetchMock as unknown as FetchLike),
    ).rejects.toThrow(/401/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws with the upstream status when version creation fails (template id included for cleanup)", async() => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(makeResponse(201, { id: "d-abc123def456" }))
      .mockResolvedValueOnce(makeResponse(400, { errors: [{ message: "bad html" }] }));

    await expect(
      createSendGridDelayTemplate("SG.test", fetchMock as unknown as FetchLike),
    ).rejects.toThrow(/400.*d-abc123def456|d-abc123def456.*400/);
  });

  it("throws when the API responds without a template id", async() => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(makeResponse(201, { nope: true }));

    await expect(
      createSendGridDelayTemplate("SG.test", fetchMock as unknown as FetchLike),
    ).rejects.toThrow(/template id/i);
  });
});
