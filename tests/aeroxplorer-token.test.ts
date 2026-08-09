import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetAeroXplorerTokenCacheForTests,
  getAeroXplorerToken,
  invalidateAeroXplorerToken,
} from "@/lib/aeroxplorer/token";

const originalKey = process.env.AEROXPLORER_API_KEY;
const originalSecret = process.env.AEROXPLORER_API_SECRET;

afterEach(() => {
  if (originalKey === undefined) delete process.env.AEROXPLORER_API_KEY;
  else process.env.AEROXPLORER_API_KEY = originalKey;
  if (originalSecret === undefined) delete process.env.AEROXPLORER_API_SECRET;
  else process.env.AEROXPLORER_API_SECRET = originalSecret;
  __resetAeroXplorerTokenCacheForTests();
  vi.restoreAllMocks();
});

function tokenResponse(overrides: Record<string, unknown> = {}) {
  return Response.json({ bearer: "opaque-test-token", expiration: 9_999_999_999, ...overrides });
}

describe("AeroXplorer token manager", () => {
  it("reports missing credentials without attempting a request", async () => {
    delete process.env.AEROXPLORER_API_KEY;
    delete process.env.AEROXPLORER_API_SECRET;
    const fetchImpl = vi.fn<typeof fetch>(async () => tokenResponse());

    const result = await getAeroXplorerToken({ fetchImpl });

    expect(result).toEqual({
      ok: false,
      error: { code: "AEROXPLORER_NOT_CONFIGURED", message: "AeroXplorer credentials are not configured.", retryable: false },
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("generates a token using only the X-User header, never as query data", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => tokenResponse());

    const result = await getAeroXplorerToken({ apiKey: "key-value", apiSecret: "secret-value", fetchImpl });

    expect(result).toEqual({ ok: true, token: "opaque-test-token" });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).not.toContain("key-value");
    expect(String(url)).not.toContain("secret-value");
    expect(new Headers(init?.headers).get("X-User")).toBe("key-value:secret-value");
  });

  it("reuses a cached, fresh token without a second request", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => tokenResponse());

    const first = await getAeroXplorerToken({ apiKey: "k", apiSecret: "s", fetchImpl });
    const second = await getAeroXplorerToken({ apiKey: "k", apiSecret: "s", fetchImpl });

    expect(first).toEqual(second);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("refreshes early, before actual expiration, within the refresh margin", async () => {
    // Token expires at 1_000_000; the 5-minute (300s) margin means the fresh
    // cutoff is 999_700 — this side stays cached, that side must refetch.
    const fetchImpl = vi.fn<typeof fetch>(async () => tokenResponse({ expiration: 1_000_000 }));

    await getAeroXplorerToken({ apiKey: "k", apiSecret: "s", fetchImpl, nowSeconds: 900_000 });
    await getAeroXplorerToken({ apiKey: "k", apiSecret: "s", fetchImpl, nowSeconds: 999_600 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    await getAeroXplorerToken({ apiKey: "k", apiSecret: "s", fetchImpl, nowSeconds: 999_800 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("shares a single in-flight token request across concurrent callers", async () => {
    let resolveResponse!: (response: Response) => void;
    const fetchImpl = vi.fn<typeof fetch>(
      () => new Promise<Response>((resolve) => { resolveResponse = resolve; }),
    );

    const calls = Promise.all([
      getAeroXplorerToken({ apiKey: "k", apiSecret: "s", fetchImpl }),
      getAeroXplorerToken({ apiKey: "k", apiSecret: "s", fetchImpl }),
      getAeroXplorerToken({ apiKey: "k", apiSecret: "s", fetchImpl }),
    ]);
    resolveResponse(tokenResponse());
    const [a, b, c] = await calls;

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  it("clears the cache on invalidation, forcing a fresh request next time", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => tokenResponse());
    await getAeroXplorerToken({ apiKey: "k", apiSecret: "s", fetchImpl });
    invalidateAeroXplorerToken();
    await getAeroXplorerToken({ apiKey: "k", apiSecret: "s", fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("fails safely and sanitized on a non-2xx token response", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json({ error: "invalid credentials", detail: "sensitive upstream diagnostic" }, { status: 401 }),
    );

    const result = await getAeroXplorerToken({ apiKey: "k", apiSecret: "s", fetchImpl });

    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("sensitive upstream diagnostic");
    if (!result.ok) expect(result.error.code).toBe("AEROXPLORER_TOKEN_REQUEST_FAILED");
  });

  it("fails safely on a malformed token response instead of caching garbage", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json({ unexpected: true }));

    const result = await getAeroXplorerToken({ apiKey: "k", apiSecret: "s", fetchImpl });

    expect(result).toEqual({
      ok: false,
      error: { code: "AEROXPLORER_TOKEN_SCHEMA_INVALID", message: "AeroXplorer token response was not in the expected shape.", retryable: false },
    });
  });

  it("never includes the credential or the generated token in a thrown message or result payload", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => tokenResponse());
    const result = await getAeroXplorerToken({ apiKey: "super-secret-key", apiSecret: "super-secret-secret", fetchImpl });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("super-secret-key");
    expect(serialized).not.toContain("super-secret-secret");
  });
});
