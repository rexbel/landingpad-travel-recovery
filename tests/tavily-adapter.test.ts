import { afterEach, describe, expect, it, vi } from "vitest";
import { searchLocalContext } from "@/lib/tavily";

const originalKey = process.env.TAVILY_API_KEY;
const originalProject = process.env.TAVILY_PROJECT;

afterEach(() => {
  if (originalKey === undefined) delete process.env.TAVILY_API_KEY;
  else process.env.TAVILY_API_KEY = originalKey;
  if (originalProject === undefined) delete process.env.TAVILY_PROJECT;
  else process.env.TAVILY_PROJECT = originalProject;
  vi.restoreAllMocks();
});

describe("Tavily adapter", () => {
  it("fails gracefully without a key and never calls fetch", async () => {
    delete process.env.TAVILY_API_KEY;
    const fetchImpl = vi.fn();

    const result = await searchLocalContext("late-night food near JFK", { fetchImpl });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "TAVILY_NOT_CONFIGURED",
        message: "Local context is unavailable because search is not configured.",
        retryable: false,
      },
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns cited local context and sends project attribution", async () => {
    process.env.TAVILY_API_KEY = "tvly-private";
    process.env.TAVILY_PROJECT = "landingpad";
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json({
        results: [
          {
            title: "JFK dining",
            url: "https://example.com/jfk-dining",
            content: "The listed kitchen is open after 10 PM.",
            score: 0.92,
          },
        ],
      }),
    );

    const result = await searchLocalContext("late-night food near JFK", { fetchImpl });

    expect(result).toEqual({
      ok: true,
      items: [
        {
          claim: "The listed kitchen is open after 10 PM.",
          url: "https://example.com/jfk-dining",
          sourceMode: "tavily-web",
        },
      ],
    });
    const request = fetchImpl.mock.calls[0][1];
    expect(request?.headers).toMatchObject({
      Authorization: "Bearer tvly-private",
      "X-Project-ID": "landingpad",
    });
    expect(request?.body).toContain('"max_results":3');
    expect(request?.body).toContain('"search_depth":"basic"');
  });

  it("redacts provider errors and reports malformed success bodies", async () => {
    process.env.TAVILY_API_KEY = "tvly-private";
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json({ private: "provider diagnostic" }));

    const result = await searchLocalContext("late-night food near JFK", { fetchImpl });

    expect(result).toMatchObject({ ok: false, error: { code: "TAVILY_MALFORMED_RESPONSE" } });
    expect(JSON.stringify(result)).not.toContain("provider diagnostic");
    expect(JSON.stringify(result)).not.toContain("tvly-private");
  });

  it("returns a typed timeout without leaking the thrown detail", async () => {
    process.env.TAVILY_API_KEY = "tvly-private";
    const fetchImpl = vi.fn((_url: URL | RequestInfo, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(Object.assign(new Error("private network detail"), { name: "AbortError" })),
        );
      }),
    ) as typeof fetch;

    const result = await searchLocalContext("late-night food near JFK", { fetchImpl, timeoutMs: 5 });

    expect(result).toEqual({
      ok: false,
      error: { code: "TAVILY_TIMEOUT", message: "Local context search timed out.", retryable: true },
    });
    expect(JSON.stringify(result)).not.toContain("private network detail");
  });
});
