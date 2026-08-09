import { z } from "zod";
import { searchStays } from "@/lib/stay22";
import type { ApiResult } from "@/schemas/api-result";
import type { StayOption } from "@/schemas/stay-option";

const querySchema = z.object({
  address: z.string().trim().min(1).optional(),
  targetArea: z.string().trim().min(1).optional(),
  checkin: z.iso.date(),
  checkout: z.iso.date(),
  adults: z.coerce.number().int().positive().default(2),
  children: z.coerce.number().int().nonnegative().default(0),
  rooms: z.coerce.number().int().positive().default(1),
  currency: z.string().trim().length(3).default("USD"),
  appMode: z.enum(["demo", "active"]).optional(),
}).refine((value) => value.address || value.targetArea, {
  message: "A search location is required.",
  path: ["address"],
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success || parsed.data.checkout <= parsed.data.checkin) {
    const body: ApiResult<StayOption[]> = {
      ok: false,
      error: { code: "INVALID_STAY_SEARCH", message: "Enter a location and a valid future stay window.", retryable: false },
      fallbackAvailable: false,
    };
    return Response.json(body, { status: 400 });
  }

  const { appMode, targetArea, ...searchInput } = parsed.data;
  const result = await searchStays(
    { ...searchInput, address: searchInput.address ?? targetArea! },
    { forceDemo: appMode === "demo" },
  );
  if (!result.ok) {
    const body: ApiResult<StayOption[]> = {
      ok: false,
      error: result.error,
      fallbackAvailable: result.fallbackAvailable,
    };
    return Response.json(body, { status: 503 });
  }

  const body: ApiResult<StayOption[]> & { warning?: typeof result.warning } = {
    ok: true,
    data: result.options,
    mode: result.mode,
    ...(result.warning ? { warning: result.warning } : {}),
  };
  return Response.json(body);
}
