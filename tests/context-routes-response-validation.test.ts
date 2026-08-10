import { afterEach, describe, expect, it, vi } from "vitest";

// Unlike tests/aeroxplorer-route.test.ts and tests/flight-recovery-route.test.ts,
// which exercise the real adapter chain against a mocked fetch boundary, this
// file mocks the adapter entry points directly so it can deliberately return a
// schema-violating shape — proving the routes now validate their response
// against the schema before it reaches the client, instead of shipping
// whatever the adapter layer happens to construct.
const getAviationContext = vi.fn();
vi.mock("@/lib/aeroxplorer", () => ({ getAviationContext }));

const getFlightRecoveryContext = vi.fn();
vi.mock("@/lib/flight-recovery", () => ({ getFlightRecoveryContext }));

afterEach(() => {
  getAviationContext.mockReset();
  getFlightRecoveryContext.mockReset();
  vi.unstubAllEnvs();
});

describe("POST /api/aviation/context response validation", () => {
  it("does not ship a schema-violating adapter result to the client", async () => {
    getAviationContext.mockResolvedValue({ mode: "not-a-real-mode", evidence: [] });
    const { POST } = await import("@/app/api/aviation/context/route");

    const response = await POST(
      new Request("http://localhost/api/aviation/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetArea: "JFK Airport, New York" }),
      }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ ok: false, error: { code: "AVIATION_CONTEXT_FAILED" } });
  });
});

describe("POST /api/flight-recovery/context response validation", () => {
  it("does not ship a schema-violating adapter result to the client", async () => {
    getFlightRecoveryContext.mockResolvedValue({ mode: "not-a-real-mode", options: [], evidence: [] });
    const { POST } = await import("@/app/api/flight-recovery/context/route");

    const response = await POST(
      new Request("http://localhost/api/flight-recovery/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flight: { originIata: "JFK", scheduledDate: "2026-08-10" } }),
      }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ ok: false, error: { code: "FLIGHT_RECOVERY_FAILED" } });
  });
});
