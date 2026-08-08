import { describe, expect, it, vi } from "vitest";
import { getSignedVoiceUrl } from "@/lib/voice/elevenlabs";

describe("ElevenLabs signed voice URL", () => {
  it("fails closed when private-agent configuration is absent", async () => {
    await expect(getSignedVoiceUrl({ apiKey: "", agentId: "" })).rejects.toThrow("ELEVENLABS_NOT_CONFIGURED");
  });

  it("requests and validates a short-lived signed URL server-side", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ signed_url: "wss://api.elevenlabs.io/v1/convai/conversation?token=short-lived" }),
    ) as unknown as typeof fetch;

    const result = await getSignedVoiceUrl({ apiKey: "private-key", agentId: "agent_123", fetchImpl });

    expect(result).toEqual({
      signedUrl: "wss://api.elevenlabs.io/v1/convai/conversation?token=short-lived",
      expiresInSeconds: 900,
    });
    const [url, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0] as [URL, RequestInit];
    expect(url.searchParams.get("agent_id")).toBe("agent_123");
    expect(new Headers(init.headers).get("xi-api-key")).toBe("private-key");
  });

  it("rejects malformed provider responses", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ signed_url: "not-a-url" })) as unknown as typeof fetch;
    await expect(
      getSignedVoiceUrl({ apiKey: "private-key", agentId: "agent_123", fetchImpl }),
    ).rejects.toThrow();
  });
});
