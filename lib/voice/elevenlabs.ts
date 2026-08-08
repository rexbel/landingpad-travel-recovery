import { z } from "zod";

const elevenLabsResponseSchema = z.object({ signed_url: z.url() });

export type SignedVoiceUrl = { signedUrl: string; expiresInSeconds: 900 };

export async function getSignedVoiceUrl(options: {
  apiKey?: string;
  agentId?: string;
  fetchImpl?: typeof fetch;
} = {}): Promise<SignedVoiceUrl> {
  if (typeof window !== "undefined") throw new Error("SERVER_ONLY_ADAPTER");
  const apiKey = options.apiKey ?? process.env.ELEVENLABS_API_KEY;
  const agentId = options.agentId ?? process.env.ELEVENLABS_AGENT_ID;
  if (!apiKey || !agentId) throw new Error("ELEVENLABS_NOT_CONFIGURED");
  const url = new URL("https://api.elevenlabs.io/v1/convai/conversation/get-signed-url");
  url.searchParams.set("agent_id", agentId);
  const response = await (options.fetchImpl ?? fetch)(url, {
    headers: { "xi-api-key": apiKey },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`ELEVENLABS_HTTP_${response.status}`);
  const parsed = elevenLabsResponseSchema.parse(await response.json());
  return { signedUrl: parsed.signed_url, expiresInSeconds: 900 };
}
