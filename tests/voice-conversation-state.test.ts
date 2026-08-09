import { describe, expect, it } from "vitest";
import { appendUserTranscript, deriveVoiceUIState, voiceStatusNotice } from "@/lib/voice/conversation";

describe("voice UI state machine", () => {
  it("stays idle before any interaction", () => {
    expect(deriveVoiceUIState({ isRequestingMic: false, micPermission: "unknown", status: "disconnected" })).toBe(
      "idle",
    );
  });

  it("shows a requesting-mic state while permission is pending", () => {
    expect(deriveVoiceUIState({ isRequestingMic: true, micPermission: "unknown", status: "disconnected" })).toBe(
      "requesting-mic",
    );
  });

  it("reflects a denied microphone without claiming the session is ready", () => {
    const state = deriveVoiceUIState({ isRequestingMic: false, micPermission: "denied", status: "disconnected" });
    expect(state).toBe("mic-denied");
    expect(voiceStatusNotice(state)).toMatch(/denied/i);
    expect(voiceStatusNotice(state)).toMatch(/continue with text/i);
  });

  it("only reports connected once the SDK status is actually connected", () => {
    expect(deriveVoiceUIState({ isRequestingMic: false, micPermission: "granted", status: "connecting" })).toBe(
      "connecting",
    );
    expect(deriveVoiceUIState({ isRequestingMic: false, micPermission: "granted", status: "connected" })).toBe(
      "connected",
    );
  });

  it("surfaces a provider failure distinctly from a mic denial", () => {
    const state = deriveVoiceUIState({ isRequestingMic: false, micPermission: "granted", status: "error" });
    expect(state).toBe("failed");
    expect(voiceStatusNotice(state)).toMatch(/connection failed/i);
  });

  it("has no notice for idle or connected states", () => {
    expect(voiceStatusNotice("idle")).toBeNull();
    expect(voiceStatusNotice("connected")).toBeNull();
  });
});

describe("transcript accumulation", () => {
  it("appends only user turns, trimmed and joined", () => {
    let transcript = "";
    transcript = appendUserTranscript(transcript, { role: "agent", message: "How can I help?" });
    expect(transcript).toBe("");
    transcript = appendUserTranscript(transcript, { role: "user", message: "  Our flight was cancelled.  " });
    expect(transcript).toBe("Our flight was cancelled.");
    transcript = appendUserTranscript(transcript, { role: "user", message: "Two adults, one room." });
    expect(transcript).toBe("Our flight was cancelled. Two adults, one room.");
  });

  it("ignores empty or whitespace-only user turns", () => {
    expect(appendUserTranscript("existing", { role: "user", message: "   " })).toBe("existing");
  });
});
