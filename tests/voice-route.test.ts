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

  it("categorizes an ElevenLabs HTTP error instead of returning a generic message", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "key-present");
    vi.stubEnv("ELEVENLABS_AGENT_ID", "agent-present");
    getSignedVoiceUrl.mockRejectedValue(new Error("ELEVENLABS_HTTP_401"));
    const { GET } = await import("@/app/api/voice/signed-url/route");

    const response = await GET(new Request("http://localhost/api/voice/signed-url?appMode=active"));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "VOICE_PROVIDER_HTTP_ERROR", retryable: true },
    });
  });

  it("categorizes a timeout distinctly from a provider HTTP error", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "key-present");
    vi.stubEnv("ELEVENLABS_AGENT_ID", "agent-present");
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    getSignedVoiceUrl.mockRejectedValue(abortError);
    const { GET } = await import("@/app/api/voice/signed-url/route");

    const response = await GET(new Request("http://localhost/api/voice/signed-url?appMode=active"));

    await expect(response.json()).resolves.toMatchObject({ ok: false, error: { code: "VOICE_TIMEOUT" } });
  });

  it("categorizes a malformed provider response as a distinct, non-generic error", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "key-present");
    vi.stubEnv("ELEVENLABS_AGENT_ID", "agent-present");
    getSignedVoiceUrl.mockRejectedValue(new Error("Unexpected token in JSON"));
    const { GET } = await import("@/app/api/voice/signed-url/route");

    const response = await GET(new Request("http://localhost/api/voice/signed-url?appMode=active"));

    await expect(response.json()).resolves.toMatchObject({ ok: false, error: { code: "VOICE_RESPONSE_INVALID" } });
  });
});
