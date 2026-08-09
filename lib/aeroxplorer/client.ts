import { getAeroXplorerToken, invalidateAeroXplorerToken, type AeroXplorerErrorCode } from "./token";
import {
  aeroXplorerAirportResponseSchema,
  aeroXplorerOtpResponseSchema,
  type AeroXplorerAirportResponse,
  type AeroXplorerOtpResponse,
} from "./schemas";

type FetchLike = typeof fetch;

export type AeroXplorerRequestErrorCode =
  | AeroXplorerErrorCode
  | "AEROXPLORER_REQUEST_FAILED"
  | "AEROXPLORER_RESPONSE_SCHEMA_INVALID"
  | "AEROXPLORER_RATE_LIMITED";

export type AeroXplorerRequestResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: AeroXplorerRequestErrorCode; message: string; retryable: boolean } };

type RequestOptions = { baseUrl?: string; fetchImpl?: FetchLike; timeoutMs?: number };

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_BASE_URL = "https://api.aeroxplorer.com";
const USER_AGENT = "LandingPad-Hackathon/1.0 (+https://github.com/rexbel/landingpad-travel-recovery)";

async function fetchWithTimeout(
  url: URL,
  init: RequestInit,
  fetchImpl: FetchLike,
  timeoutMs: number,
): Promise<{ ok: true; response: Response } | { ok: false; timedOut: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { ...init, signal: controller.signal, cache: "no-store" });
    return { ok: true, response };
  } catch (error) {
    return { ok: false, timedOut: error instanceof Error && error.name === "AbortError" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GET with AeroXplorer bearer auth. Retries the request exactly once, and only
 * once, after a 401 — clearing the cached token and requesting a fresh one first.
 * No retry for 403/404/429/5xx: those are returned as typed failures instead.
 */
async function authenticatedGet(
  path: string,
  params: Record<string, string>,
  options: RequestOptions,
): Promise<AeroXplorerRequestResult<unknown>> {
  if (typeof window !== "undefined") throw new Error("SERVER_ONLY_ADAPTER");
  const baseUrl = options.baseUrl ?? process.env.AEROXPLORER_API_BASE_URL ?? DEFAULT_BASE_URL;
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const tokenResult = await getAeroXplorerToken({ baseUrl, fetchImpl, timeoutMs });
  if (!tokenResult.ok) return tokenResult;

  const buildUrl = () => {
    const url = new URL(path, baseUrl);
    url.search = new URLSearchParams(params).toString();
    return url;
  };

  const attempt = (token: string) =>
    fetchWithTimeout(
      buildUrl(),
      { headers: { "X-Authorization": `Bearer ${token}`, "User-Agent": USER_AGENT } },
      fetchImpl,
      timeoutMs,
    );

  let outcome = await attempt(tokenResult.token);
  if (!outcome.ok) {
    return {
      ok: false,
      error: {
        code: "AEROXPLORER_REQUEST_FAILED",
        message: outcome.timedOut ? "AeroXplorer request timed out." : "AeroXplorer request failed.",
        retryable: true,
      },
    };
  }

  if (outcome.response.status === 401) {
    invalidateAeroXplorerToken();
    const retryTokenResult = await getAeroXplorerToken({ baseUrl, fetchImpl, timeoutMs });
    if (!retryTokenResult.ok) return retryTokenResult;
    outcome = await attempt(retryTokenResult.token);
    if (!outcome.ok) {
      return {
        ok: false,
        error: {
          code: "AEROXPLORER_REQUEST_FAILED",
          message: outcome.timedOut ? "AeroXplorer request timed out." : "AeroXplorer request failed.",
          retryable: true,
        },
      };
    }
  }

  const response = outcome.response;
  if (!response.ok) {
    if (response.status === 429) {
      return {
        ok: false,
        error: { code: "AEROXPLORER_RATE_LIMITED", message: "AeroXplorer is rate limited.", retryable: false },
      };
    }
    return {
      ok: false,
      error: {
        code: "AEROXPLORER_REQUEST_FAILED",
        message: `AeroXplorer request failed (HTTP ${Math.floor(response.status / 100)}xx).`,
        retryable: response.status >= 500,
      },
    };
  }

  const body = await response.json().catch(() => null);
  return { ok: true, data: body };
}

export async function getAirportByIata(
  iata: string,
  options: RequestOptions = {},
): Promise<AeroXplorerRequestResult<AeroXplorerAirportResponse>> {
  const result = await authenticatedGet("/v1/airports", { iata, results: "1" }, options);
  if (!result.ok) return result;
  const parsed = aeroXplorerAirportResponseSchema.safeParse(result.data);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "AEROXPLORER_RESPONSE_SCHEMA_INVALID",
        message: "AeroXplorer airport response was not in the expected shape.",
        retryable: false,
      },
    };
  }
  return { ok: true, data: parsed.data };
}

export type ExactFlightHistoryQuery = {
  airlineCode: string;
  flightNumber: string;
  originIata: string;
  destinationIata?: string;
  scheduledDate: string;
};

export async function getExactFlightHistory(
  query: ExactFlightHistoryQuery,
  options: RequestOptions = {},
): Promise<AeroXplorerRequestResult<AeroXplorerOtpResponse>> {
  const [year, month] = query.scheduledDate.split("-");
  const params: Record<string, string> = {
    airline_code: query.airlineCode,
    flight_num: query.flightNumber,
    origin_code: query.originIata,
    date: query.scheduledDate,
    year,
    month: String(Number(month)),
    results: "100",
  };
  if (query.destinationIata) params.dest_code = query.destinationIata;

  const result = await authenticatedGet("/v1/travel/otp", params, options);
  if (!result.ok) return result;
  const parsed = aeroXplorerOtpResponseSchema.safeParse(result.data);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "AEROXPLORER_RESPONSE_SCHEMA_INVALID",
        message: "AeroXplorer historical response was not in the expected shape.",
        retryable: false,
      },
    };
  }
  return { ok: true, data: parsed.data };
}

export type RouteHistoryQuery = {
  originIata: string;
  destinationIata?: string;
  scheduledDate: string;
};

/**
 * Broader than getExactFlightHistory: no airline/flight number required, just
 * a route and date — used to give a traveler considering alternate flights a
 * sense of how that route has historically performed, not any one flight.
 */
export async function getRouteHistory(
  query: RouteHistoryQuery,
  options: RequestOptions = {},
): Promise<AeroXplorerRequestResult<AeroXplorerOtpResponse>> {
  const [year, month] = query.scheduledDate.split("-");
  const params: Record<string, string> = {
    origin_code: query.originIata,
    date: query.scheduledDate,
    year,
    month: String(Number(month)),
    results: "100",
  };
  if (query.destinationIata) params.dest_code = query.destinationIata;

  const result = await authenticatedGet("/v1/travel/otp", params, options);
  if (!result.ok) return result;
  const parsed = aeroXplorerOtpResponseSchema.safeParse(result.data);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "AEROXPLORER_RESPONSE_SCHEMA_INVALID",
        message: "AeroXplorer historical response was not in the expected shape.",
        retryable: false,
      },
    };
  }
  return { ok: true, data: parsed.data };
}
