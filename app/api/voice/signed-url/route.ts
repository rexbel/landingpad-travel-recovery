import type { ApiResult } from "@/schemas/api-result";
import { serverFailure } from "@/lib/ai/http";
import { getSignedVoiceUrl, type SignedVoiceUrl } from "@/lib/voice/elevenlabs";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const appMode = new URL(request.url).searchParams.get("appMode");
  if (appMode === "demo" || !process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_AGENT_ID) {
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
  } catch (error) {
    // Categorize the failure so the client can show something more useful
    // than a single generic message — never the raw error, key, or body.
    const message = error instanceof Error ? error.message : "";
    const timedOut = error instanceof Error && error.name === "AbortError";
    const httpMatch = message.match(/^ELEVENLABS_HTTP_(\d+)$/);

    if (httpMatch) {
      const statusClass = `${Math.floor(Number(httpMatch[1]) / 100)}xx`;
      return serverFailure(
        "VOICE_PROVIDER_HTTP_ERROR",
        `ElevenLabs returned an HTTP ${statusClass} error — check the configured API key and agent ID. Continue with text entry.`,
        true,
      );
    }
    if (timedOut) {
      return serverFailure("VOICE_TIMEOUT", "The voice request timed out. Continue with text entry.", true);
    }
    if (message === "ELEVENLABS_NOT_CONFIGURED") {
      return serverFailure("VOICE_NOT_CONFIGURED", "Voice is unavailable. Continue with text entry.", false);
    }
    return serverFailure(
      "VOICE_RESPONSE_INVALID",
      "ElevenLabs returned an unexpected response shape. Continue with text entry.",
      true,
    );
  }
}
