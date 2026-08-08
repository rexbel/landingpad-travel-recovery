import type { ApiResult } from "@/schemas/api-result";
import { serverFailure } from "@/lib/ai/http";
import { getSignedVoiceUrl, type SignedVoiceUrl } from "@/lib/voice/elevenlabs";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_AGENT_ID) {
    const result: ApiResult<never> = {
      ok: false,
      error: {
        code: "VOICE_NOT_CONFIGURED",
        message: "Voice is unavailable. Continue with text entry.",
        retryable: false,
      },
      fallbackAvailable: true,
    };
    return Response.json(result, { status: 503 });
  }
  try {
    const data = await getSignedVoiceUrl();
    const result: ApiResult<SignedVoiceUrl> = { ok: true, data };
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return serverFailure("VOICE_PROVIDER_UNAVAILABLE", "Voice is unavailable. Continue with text entry.", true);
  }
}
