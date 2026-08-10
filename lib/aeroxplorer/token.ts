import { aeroXplorerTokenResponseSchema } from "./schemas";

export type AeroXplorerErrorCode =
  | "AEROXPLORER_NOT_CONFIGURED"
  | "AEROXPLORER_TOKEN_REQUEST_FAILED"
  | "AEROXPLORER_TOKEN_SCHEMA_INVALID";

export type AeroXplorerTokenResult =
  | { ok: true; token: string }
  | { ok: false; error: { code: AeroXplorerErrorCode; message: string; retryable: boolean } };

type FetchLike = typeof fetch;
type TokenState = { token: string; expiresAtSeconds: number };

// Generating a new token can invalidate the previous one for the same API key
// (see docs/preflight-checklist.md). This module-level cache is appropriate for
// a single hackathon-MVP server instance but is NOT a multi-instance coordination
// strategy — horizontally scaled deployments need a centralized token broker
// (e.g. a shared cache service) so instances don't invalidate each other's tokens.
let cached: TokenState | null = null;
let inFlight: Promise<AeroXplorerTokenResult> | null = null;

const REFRESH_MARGIN_SECONDS = 5 * 60;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_BASE_URL = "https://api.aeroxplorer.com";

function isFresh(state: TokenState, nowSeconds: number): boolean {
  return state.expiresAtSeconds - REFRESH_MARGIN_SECONDS > nowSeconds;
}

async function requestToken(options: {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  fetchImpl: FetchLike;
  timeoutMs: number;
}): Promise<AeroXplorerTokenResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await options.fetchImpl(new URL("/v1/token", options.baseUrl), {
      method: "POST",
      headers: { "X-User": `${options.apiKey}:${options.apiSecret}` },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      return {
        ok: false,
        error: {
          code: "AEROXPLORER_TOKEN_REQUEST_FAILED",
          message: `AeroXplorer token request failed (HTTP ${Math.floor(response.status / 100)}xx).`,
          retryable: response.status >= 500 || response.status === 429,
        },
      };
    }
    const parsed = aeroXplorerTokenResponseSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "AEROXPLORER_TOKEN_SCHEMA_INVALID",
          message: "AeroXplorer token response was not in the expected shape.",
          retryable: false,
        },
      };
    }
    cached = { token: parsed.data.bearer, expiresAtSeconds: parsed.data.expiration };
    return { ok: true, token: parsed.data.bearer };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      error: {
        code: "AEROXPLORER_TOKEN_REQUEST_FAILED",
        message: timedOut ? "AeroXplorer token request timed out." : "AeroXplorer token request failed.",
        retryable: true,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Clears the cached token so the next call fetches a fresh one. Pass the
 * specific token that just failed (e.g. produced a 401) so a concurrent
 * request that already refreshed the cache to a newer token isn't clobbered —
 * generating a new AeroXplorer token can invalidate the previous one for the
 * same API key, so nulling out a token nobody actually knows is bad would
 * break whichever other in-flight request is relying on it. Omit the
 * argument to force an unconditional clear (e.g. in tests).
 */
export function invalidateAeroXplorerToken(staleToken?: string): void {
  if (staleToken === undefined || cached?.token === staleToken) {
    cached = null;
  }
}

export async function getAeroXplorerToken(
  options: {
    apiKey?: string;
    apiSecret?: string;
    baseUrl?: string;
    fetchImpl?: FetchLike;
    timeoutMs?: number;
    nowSeconds?: number;
  } = {},
): Promise<AeroXplorerTokenResult> {
  if (typeof window !== "undefined") throw new Error("SERVER_ONLY_ADAPTER");
  const apiKey = options.apiKey ?? process.env.AEROXPLORER_API_KEY;
  const apiSecret = options.apiSecret ?? process.env.AEROXPLORER_API_SECRET;
  if (!apiKey || !apiSecret) {
    return {
      ok: false,
      error: { code: "AEROXPLORER_NOT_CONFIGURED", message: "AeroXplorer credentials are not configured.", retryable: false },
    };
  }

  const now = options.nowSeconds ?? Date.now() / 1000;
  if (cached && isFresh(cached, now)) {
    return { ok: true, token: cached.token };
  }
  if (inFlight) {
    return inFlight;
  }

  const baseUrl = options.baseUrl ?? process.env.AEROXPLORER_API_BASE_URL ?? DEFAULT_BASE_URL;
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  inFlight = requestToken({ apiKey, apiSecret, baseUrl, fetchImpl, timeoutMs }).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Test-only: reset module-level state between test cases. */
export function __resetAeroXplorerTokenCacheForTests(): void {
  cached = null;
  inFlight = null;
}
