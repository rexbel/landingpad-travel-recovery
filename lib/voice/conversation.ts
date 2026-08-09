export type MicPermission = "unknown" | "granted" | "denied";
export type SdkConversationStatus = "disconnected" | "connecting" | "connected" | "error";
export type VoiceUIState = "idle" | "requesting-mic" | "connecting" | "connected" | "mic-denied" | "failed";

export function deriveVoiceUIState(input: {
  isRequestingMic: boolean;
  micPermission: MicPermission;
  status: SdkConversationStatus;
}): VoiceUIState {
  if (input.status === "error") return "failed";
  if (input.status === "connected") return "connected";
  if (input.status === "connecting") return "connecting";
  if (input.isRequestingMic) return "requesting-mic";
  if (input.micPermission === "denied") return "mic-denied";
  return "idle";
}

export function voiceStatusNotice(state: VoiceUIState): string | null {
  switch (state) {
    case "mic-denied":
      return "Microphone access was denied. Your request is preserved—continue with text.";
    case "failed":
      return "Voice connection failed. Your request is preserved—continue with text.";
    case "requesting-mic":
      return "Requesting microphone access…";
    default:
      return null;
  }
}

export function appendUserTranscript(
  transcript: string,
  message: { role: "user" | "agent"; message: string },
): string {
  if (message.role !== "user" || !message.message.trim()) return transcript;
  return transcript ? `${transcript} ${message.message.trim()}` : message.message.trim();
}
