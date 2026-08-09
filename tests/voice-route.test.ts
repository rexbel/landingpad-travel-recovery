import { afterEach, describe, expect, it, vi } from "vitest";

const getSignedVoiceUrl = vi.fn();
vi.mock("@/lib/voice/elevenlabs", () => ({ getSignedVoiceUrl }));

afterEach(() => {
  getSignedVoiceUrl.mockReset();
  vi.unstubAllEnvs();
});

describe("GET /api/voice/signed-url", () => {
  it("skips the live attempt entirely when appMode=demo, even with credentials configured", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "key-present");
    vi.stubEnv("ELEVENLABS_AGENT_ID", "agent-present");
    const { GET } = await import("@/app/api/voice/signed-url/route");

    const response = await GET(new Request("http://localhost/api/voice/signed-url?appMode=demo"));

    expect(response.status).toBe(503);
    expect(getSignedVoiceUrl).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ ok: false, error: { code: "VOICE_NOT_CONFIGURED" } });
  });

  it("attempts the live signed-url request when appMode=active and credentials exist", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "key-present");
    vi.stubEnv("ELEVENLABS_AGENT_ID", "agent-present");
    getSignedVoiceUrl.mockResolvedValue({ signedUrl: "wss://example.com/session", expiresInSeconds: 900 });
    const { GET } = await import("@/app/api/voice/signed-url/route");

    const response = await GET(new Request("http://localhost/api/voice/signed-url?appMode=active"));

    expect(response.status).toBe(200);
    expect(getSignedVoiceUrl).toHaveBeenCalledOnce();
  });
});
