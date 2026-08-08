import { z } from "zod";
import { localContextItemSchema, type LocalContextItem } from "@/schemas/recovery-plan";

const tavilyResponseSchema = z.object({
  results: z.array(
    z.object({
      title: z.string().optional(),
      url: z.url(),
      content: z.string().min(1),
      score: z.number().optional(),
    }),
  ),
});

export type TavilyErrorCode =
  | "TAVILY_NOT_CONFIGURED"
  | "TAVILY_TIMEOUT"
  | "TAVILY_RATE_LIMITED"
  | "TAVILY_UPSTREAM_ERROR"
  | "TAVILY_MALFORMED_RESPONSE";

export type TavilySearchResult =
  | { ok: true; items: LocalContextItem[] }
  | { ok: false; error: { code: TavilyErrorCode; message: string; retryable: boolean } };

export async function searchLocalContext(
  query: string,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<TavilySearchResult> {
  const cleanQuery = z.string().trim().min(3).max(500).parse(query);
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      error: {
        code: "TAVILY_NOT_CONFIGURED",
        message: "Local context is unavailable because search is not configured.",
        retryable: false,
      },
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 5_000);
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    const project = process.env.TAVILY_PROJECT?.trim();
    if (project) headers["X-Project-ID"] = project;

    const response = await (options.fetchImpl ?? fetch)("https://api.tavily.com/search", {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: cleanQuery,
        search_depth: "basic",
        chunks_per_source: 1,
        max_results: 3,
        topic: "general",
        include_answer: false,
        include_raw_content: false,
        include_images: false,
        auto_parameters: false,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false,
        error: {
          code: response.status === 429 || response.status === 432 ? "TAVILY_RATE_LIMITED" : "TAVILY_UPSTREAM_ERROR",
          message: "Local context is temporarily unavailable.",
          retryable: response.status !== 401,
        },
      };
    }

    const parsed = tavilyResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "TAVILY_MALFORMED_RESPONSE",
          message: "Local context returned an unexpected response.",
          retryable: true,
        },
      };
    }

    const items = parsed.data.results.flatMap((result) => {
      const item = localContextItemSchema.safeParse({
        claim: result.content,
        url: result.url,
        sourceMode: "tavily-web",
      });
      return item.success ? [item.data] : [];
    });
    return { ok: true, items };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      error: {
        code: timedOut ? "TAVILY_TIMEOUT" : "TAVILY_UPSTREAM_ERROR",
        message: timedOut ? "Local context search timed out." : "Local context is temporarily unavailable.",
        retryable: true,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}
