import { z } from "zod";
import { searchLocalContext } from "@/lib/tavily";
import type { ApiResult } from "@/schemas/api-result";
import type { LocalContextItem } from "@/schemas/recovery-plan";

const requestSchema = z.object({ query: z.string().trim().min(3).max(500) });

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    payload = undefined;
  }
  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    const body: ApiResult<LocalContextItem[]> = {
      ok: false,
      error: { code: "INVALID_CONTEXT_SEARCH", message: "Enter a focused local-context question.", retryable: false },
      fallbackAvailable: false,
    };
    return Response.json(body, { status: 400 });
  }

  const result = await searchLocalContext(parsed.data.query);
  if (!result.ok) {
    const body: ApiResult<LocalContextItem[]> = {
      ok: false,
      error: result.error,
      fallbackAvailable: false,
    };
    return Response.json(body, { status: result.error.code === "TAVILY_NOT_CONFIGURED" ? 503 : 502 });
  }

  const body: ApiResult<LocalContextItem[]> = { ok: true, data: result.items, mode: "tavily-web" };
  return Response.json(body);
}
