import { z } from "zod";
import { stayOptionSchema, type StayOption } from "@/schemas/stay-option";
import { createStay22DemoFixture } from "./fixtures";
import { stay22ResponseSchema, type Stay22Response } from "./schemas";

const searchInputSchema = z.object({
  address: z.string().trim().min(1),
  checkin: z.iso.date(),
  checkout: z.iso.date(),
  adults: z.number().int().positive().default(2),
  children: z.number().int().nonnegative().default(0),
  rooms: z.number().int().positive().default(1),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default("USD"),
  pageSize: z.number().int().min(1).max(20).default(10),
});

export type Stay22SearchInput = z.input<typeof searchInputSchema>;

export type Stay22ErrorCode =
  | "STAY22_TIMEOUT"
  | "STAY22_RATE_LIMITED"
  | "STAY22_REJECTED"
  | "STAY22_UPSTREAM_ERROR"
  | "STAY22_MALFORMED_RESPONSE";

export type Stay22SearchResult =
  | {
      ok: true;
      options: StayOption[];
      mode: "stay22-live" | "demo";
      warning?: { code: Stay22ErrorCode; message: string; retryable: boolean };
    }
  | {
      ok: false;
      error: { code: Stay22ErrorCode; message: string; retryable: boolean };
      fallbackAvailable: true;
    };

type FetchLike = typeof fetch;

const pendingSearches = new Map<string, { expiresAt: number; promise: Promise<Stay22SearchResult> }>();
const DEDUPE_MS = 5_000;

function normalize(response: Stay22Response, sourceMode: "stay22-live" | "demo"): StayOption[] {
  const options = response.results.flatMap((stay) =>
    Object.entries(stay.suppliers).flatMap(([supplier, quote]) => {
      if (!quote.price) return [];

      const option = stayOptionSchema.safeParse({
        id: `${stay.id}:${supplier}`,
        name: stay.name,
        type: stay.type,
        supplier: sourceMode === "demo" ? "Stay22 demo fixture" : supplier,
        totalPrice: quote.price.total,
        currency: response.meta.currency,
        bookingUrl: quote.link,
        coordinates: stay.location?.coordinates,
        sourceMode,
      });

      return option.success ? [option.data] : [];
    }),
  );

  return options.sort((a, b) => a.totalPrice - b.totalPrice);
}

function providerError(status: number): Stay22SearchResult & { ok: false } {
  if (status === 429) {
    return {
      ok: false,
      error: { code: "STAY22_RATE_LIMITED", message: "Stay search is temporarily rate limited.", retryable: true },
      fallbackAvailable: true,
    };
  }
  if (status >= 400 && status < 500) {
    return {
      ok: false,
      error: { code: "STAY22_REJECTED", message: "Stay search rejected the request.", retryable: false },
      fallbackAvailable: true,
    };
  }
  return {
    ok: false,
    error: { code: "STAY22_UPSTREAM_ERROR", message: "Live stay search is temporarily unavailable.", retryable: true },
    fallbackAvailable: true,
  };
}

function withDemoFallback(failure: Stay22SearchResult & { ok: false }, currency: string): Stay22SearchResult {
  const fixture = stay22ResponseSchema.parse(createStay22DemoFixture(currency));
  return {
    ok: true,
    options: normalize(fixture, "demo"),
    mode: "demo",
    warning: failure.error,
  };
}

/** Deliberately chosen demo data (Demo mode), not a fallback from a failure — no warning attached. */
function demoOnlyResult(currency: string): Stay22SearchResult {
  const fixture = stay22ResponseSchema.parse(createStay22DemoFixture(currency));
  return { ok: true, options: normalize(fixture, "demo"), mode: "demo" };
}

async function performSearch(
  input: z.output<typeof searchInputSchema>,
  options: { fetchImpl: FetchLike; timeoutMs: number; fallbackToDemo: boolean },
): Promise<Stay22SearchResult> {
  const baseUrl = process.env.STAY22_API_BASE_URL ?? "https://api.stay22.com";
  const url = new URL("/v2/accommodations", baseUrl);
  url.search = new URLSearchParams({
    address: input.address,
    checkin: input.checkin,
    checkout: input.checkout,
    adults: String(input.adults),
    children: String(input.children),
    rooms: String(input.rooms),
    currency: input.currency,
    pageSize: String(input.pageSize),
  }).toString();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  let failure: Stay22SearchResult & { ok: false };

  try {
    const apiKey = process.env.STAY22_API_KEY?.trim();
    const response = await options.fetchImpl(url, {
      method: "GET",
      headers: apiKey ? { "X-API-KEY": apiKey } : undefined,
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      failure = providerError(response.status);
    } else {
      const parsed = stay22ResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        failure = {
          ok: false,
          error: {
            code: "STAY22_MALFORMED_RESPONSE",
            message: "Live stay search returned an unexpected response.",
            retryable: true,
          },
          fallbackAvailable: true,
        };
      } else {
        return { ok: true, options: normalize(parsed.data, "stay22-live"), mode: "stay22-live" };
      }
    }
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    failure = {
      ok: false,
      error: {
        code: timedOut ? "STAY22_TIMEOUT" : "STAY22_UPSTREAM_ERROR",
        message: timedOut ? "Live stay search timed out." : "Live stay search is temporarily unavailable.",
        retryable: true,
      },
      fallbackAvailable: true,
    };
  } finally {
    clearTimeout(timer);
  }

  return options.fallbackToDemo ? withDemoFallback(failure, input.currency) : failure;
}

export function searchStays(
  rawInput: Stay22SearchInput,
  options: { fetchImpl?: FetchLike; timeoutMs?: number; fallbackToDemo?: boolean; forceDemo?: boolean } = {},
): Promise<Stay22SearchResult> {
  if (typeof window !== "undefined") throw new Error("SERVER_ONLY_ADAPTER");
  const input = searchInputSchema.parse(rawInput);
  if (options.forceDemo) return Promise.resolve(demoOnlyResult(input.currency));

  const cacheKey = JSON.stringify(input);
  const now = Date.now();
  const existing = pendingSearches.get(cacheKey);
  if (existing && existing.expiresAt > now) return existing.promise;

  const promise = performSearch(input, {
    fetchImpl: options.fetchImpl ?? fetch,
    timeoutMs: options.timeoutMs ?? 6_000,
    fallbackToDemo: options.fallbackToDemo ?? true,
  });
  pendingSearches.set(cacheKey, { expiresAt: now + DEDUPE_MS, promise });
  setTimeout(() => {
    if (pendingSearches.get(cacheKey)?.promise === promise) pendingSearches.delete(cacheKey);
  }, DEDUPE_MS).unref?.();
  return promise;
}
