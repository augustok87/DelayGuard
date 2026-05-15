/**
 * BullMQ customer-sync processor — Phase 2.1.a.
 *
 * Sibling test for the processor that dispatches CustomerSyncService for
 * every fulfilled-order webhook. Mock the service at the class level per
 * .claude/rules/tests.md — the processor's only responsibility is
 * job-data → service-call wiring + error propagation for BullMQ's
 * attempts:3 retry chain.
 */
import { Job } from "bullmq";
import { processCustomerSync } from "../../../queue/processors/customer-sync";
import { CustomerSyncService } from "../../../services/customer-sync-service";

jest.mock("../../../services/customer-sync-service");
jest.mock("../../../utils/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const MockCustomerSyncService =
  CustomerSyncService as jest.MockedClass<typeof CustomerSyncService>;

interface CustomerSyncJobData {
  shopDomain: string;
  shopifyOrderId: string;
}

function makeJob(
  overrides: Partial<CustomerSyncJobData> = {},
): Job<CustomerSyncJobData> {
  return {
    data: {
      shopDomain: "test-shop.myshopify.com",
      shopifyOrderId: "1001",
      ...overrides,
    },
    id: "customer-sync-1001",
  } as unknown as Job<CustomerSyncJobData>;
}

describe("processCustomerSync", () => {
  let mockSync: jest.Mock;

  beforeEach(() => {
    mockSync = jest.fn().mockResolvedValue(undefined);
    MockCustomerSyncService.mockClear();
    MockCustomerSyncService.mockImplementation(
      () =>
        ({
          syncCustomerForOrder: mockSync,
        }) as unknown as CustomerSyncService,
    );
  });

  it("dispatches CustomerSyncService.syncCustomerForOrder with shopDomain + shopifyOrderId from job.data", async() => {
    await processCustomerSync(makeJob());

    expect(MockCustomerSyncService).toHaveBeenCalledTimes(1);
    expect(mockSync).toHaveBeenCalledWith(
      "test-shop.myshopify.com",
      "1001",
    );
  });

  it("is idempotent — running the same job twice issues two service calls (UPSERT guarantees same end state)", async() => {
    const job = makeJob();
    await processCustomerSync(job);
    await processCustomerSync(job);

    expect(mockSync).toHaveBeenCalledTimes(2);
    expect(mockSync.mock.calls[0]).toEqual([
      "test-shop.myshopify.com",
      "1001",
    ]);
    expect(mockSync.mock.calls[1]).toEqual([
      "test-shop.myshopify.com",
      "1001",
    ]);
  });

  it("propagates service errors so BullMQ's attempts:3 retry chain runs", async() => {
    mockSync.mockRejectedValueOnce(new Error("transient db failure"));

    await expect(processCustomerSync(makeJob())).rejects.toThrow(
      "transient db failure",
    );
  });

  it("propagates Shopify 401/5xx wrappings (CustomerSyncService rethrows after logging)", async() => {
    mockSync.mockRejectedValueOnce(
      new Error("Unauthorized: Invalid access token for test-shop"),
    );

    await expect(processCustomerSync(makeJob())).rejects.toThrow(
      /Unauthorized/,
    );
  });

  it("does not throw on silent-skip outcomes (service returns void)", async() => {
    // Service returns void for missing-shop / missing-order / guest / customer-404
    mockSync.mockResolvedValueOnce(undefined);

    await expect(processCustomerSync(makeJob())).resolves.toBeUndefined();
  });
});
