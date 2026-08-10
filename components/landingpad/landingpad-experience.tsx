"use client";

import { useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import type { ProductMode } from "@/lib/config/product-mode";
import {
  primaryPrompt,
  primaryTripRequest,
  seededPlans,
} from "@/lib/data/demo-cases";
import type { HandoffResult } from "@/lib/ai/contracts";
import type { AviationContext } from "@/schemas/aviation-context";
import type { FlightRecoveryContext, FlightRecoveryOption } from "@/schemas/flight-recovery";
import {
  appendUserTranscript,
  deriveVoiceUIState,
  voiceStatusNotice,
  type MicPermission,
} from "@/lib/voice/conversation";
import type { RecoveryPlan } from "@/schemas/recovery-plan";
import type { StayOption } from "@/schemas/stay-option";
import type { TripRequest } from "@/schemas/trip-request";
import { LandingPadMark } from "@/components/brand/LandingPadMark";
import { HeroLanding } from "@/components/brand/HeroLanding";
import { ProductIcon, type ProductIconName } from "@/components/icons";

type Step = "start" | "brief" | "search" | "compare" | "handoff";
type SearchState = "waiting" | "working" | "done" | "fallback";

const recoverySteps = ["Tell us", "Confirm", "Search", "Compare", "Handoff"];
const eventSteps = ["Event", "Confirm", "Search", "Compare", "Share"];

const eventPrompt =
  "I’m attending Checkout Travel Hack NYC on August 9. Find one room nearby for two adults, under $350 total, with an easy trip back after the event.";

// Requires the ElevenLabs agent's dashboard settings to allow first-message
// and prompt overrides — otherwise the agent falls back to its own configured
// behavior, and the app still degrades gracefully either way.
const VOICE_FIRST_MESSAGE =
  "Hi, I'm LandingPad's recovery assistant. What happened, and do you need help with a hotel, an alternate flight, or both?";
const VOICE_AGENT_PROMPT =
  "You are LandingPad's travel disruption recovery assistant. First ask what happened. Then ask, as its own question, whether the traveler needs hotel accommodations, an alternate flight, or both — wait for their answer before moving on. Ask one short question at a time. Once you have the disruption summary and which assistance they need, briefly confirm what you heard and let them know LandingPad will build a recovery brief from it. Never promise a specific price, availability, or booking — LandingPad only surfaces options for the traveler to review and approve themselves.";

function initialRequest(mode: ProductMode): TripRequest {
  if (mode === "recovery") return structuredClone(primaryTripRequest);
  const { disruption: _disruption, ...shared } = primaryTripRequest;
  void _disruption;
  return {
    ...shared,
    mode: "event",
    currentLocation: undefined,
    targetArea: "Checkout Travel Hack NYC, New York",
    hardBudgetTotal: 350,
    mustHaves: [],
    preferences: ["Easy return after the event"],
    uncertainties: ["Event venue and schedule should be confirmed"],
    event: {
      name: "Checkout Travel Hack NYC",
      startsAt: "2026-08-09T10:00:00Z",
      endsAt: "2026-08-09T18:00:00Z",
    },
  };
}

function isTripRequest(value: unknown): value is TripRequest {
  return Boolean(value && typeof value === "object" && "targetArea" in value && "checkin" in value);
}

function isPlanArray(value: unknown): value is RecoveryPlan[] {
  return Array.isArray(value) && value.every((item) => item && typeof item === "object" && "stay" in item);
}

function isStayArray(value: unknown): value is StayOption[] {
  return Array.isArray(value) && value.every((item) => item && typeof item === "object" && "bookingUrl" in item);
}

function apiData(value: unknown): unknown {
  if (!value || typeof value !== "object") return undefined;
  if ("ok" in value && value.ok === true && "data" in value) return value.data;
  return undefined;
}

function apiMode(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  return "mode" in value && typeof value.mode === "string" ? value.mode : undefined;
}

function apiErrorMessage(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || !("error" in value)) return undefined;
  const error = value.error;
  if (!error || typeof error !== "object" || !("message" in error)) return undefined;
  return typeof error.message === "string" ? error.message : undefined;
}

function isHandoffResult(value: unknown): value is HandoffResult {
  return Boolean(value && typeof value === "object" && "summary" in value && "requiresApproval" in value);
}

function isAviationContext(value: unknown): value is AviationContext {
  return Boolean(value && typeof value === "object" && "mode" in value && "evidence" in value);
}

function isFlightRecoveryContext(value: unknown): value is FlightRecoveryContext {
  return Boolean(value && typeof value === "object" && "mode" in value && "options" in value);
}

const fallbackSummary =
  "Advisor summary is temporarily unavailable. Verify the selected stay's price, availability, and terms directly with the supplier before booking.";

function sourceLabel(source: RecoveryPlan["stay"]["sourceMode"]) {
  return {
    "stay22-live": "Stay22 live",
    "tavily-web": "Tavily web",
    "aeroxplorer-historical": "AeroXplorer historical",
    inference: "Model inference",
    user: "Confirmed by you",
    demo: "Demo data",
  }[source];
}

function planTitle(label: RecoveryPlan["label"], mode: ProductMode) {
  if (mode === "event") {
    return { fastest: "Closest exit", "best-value": "Best value", "best-rest": "Make a weekend of it" }[label];
  }
  return { fastest: "Fastest recovery", "best-value": "Best value", "best-rest": "Best rest" }[label];
}

const PLAN_ICONS: Record<RecoveryPlan["label"], ProductIconName> = {
  fastest: "time-pressure",
  "best-value": "budget",
  "best-rest": "room",
};

function planIcon(label: RecoveryPlan["label"]): ProductIconName {
  return PLAN_ICONS[label];
}

function Icon({ name }: { name: "mic" | "arrow" | "check" | "copy" | "plane" | "spark" | "shield" }) {
  const paths = {
    mic: <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    copy: <><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
    plane: <><path d="M22 2 9.5 14.5M22 2l-8 20-4.5-7.5L2 10l20-8Z"/></>,
    spark: <><path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function LandingPadExperience({ mode }: { mode: ProductMode }) {
  return (
    <ConversationProvider>
      <LandingPadExperienceInner mode={mode} />
    </ConversationProvider>
  );
}

function LandingPadExperienceInner({ mode }: { mode: ProductMode }) {
  const isEvent = mode === "event";
  // Demo mode deliberately forces every server route to its seeded/fallback
  // path — no live provider is ever contacted, regardless of configured
  // credentials. Active mode is the default: attempt real calls wherever a
  // provider is configured, degrade gracefully otherwise (per-route fallback
  // behavior is unchanged either way — this only changes which path a
  // traveler lands on before touching the toggle).
  const [appMode, setAppMode] = useState<"demo" | "active">("active");
  const [step, setStep] = useState<Step>("start");
  const [prompt, setPrompt] = useState(isEvent ? eventPrompt : primaryPrompt);
  const [request, setRequest] = useState<TripRequest>(() => initialRequest(mode));
  const [plans, setPlans] = useState<RecoveryPlan[]>(seededPlans);
  const [selected, setSelected] = useState<RecoveryPlan | null>(null);
  const [micPermission, setMicPermission] = useState<MicPermission>("unknown");
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [searchState, setSearchState] = useState<Record<string, SearchState>>({ stays: "waiting", context: "waiting", ranking: "waiting", aviation: "waiting", flights: "waiting" });
  const [approval, setApproval] = useState<RecoveryPlan | null>(null);
  const [copied, setCopied] = useState(false);
  const [handoffResult, setHandoffResult] = useState<HandoffResult | null>(null);
  const [aviationContext, setAviationContext] = useState<AviationContext | null>(null);
  const [flightRecovery, setFlightRecovery] = useState<FlightRecoveryContext | null>(null);
  const [flightApproval, setFlightApproval] = useState<FlightRecoveryOption | null>(null);

  const conversation = useConversation({
    onMessage: (payload) => {
      setTranscript((current) => appendUserTranscript(current, { role: payload.role, message: payload.message }));
    },
    onError: () => setNotice(voiceStatusNotice("failed")),
    onDisconnect: (details) => {
      if (details.reason === "error") setNotice(voiceStatusNotice("failed"));
    },
  });

  const voiceUIState = deriveVoiceUIState({ isRequestingMic, micPermission, status: conversation.status });

  const activeIndex = ["start", "brief", "search", "compare", "handoff"].indexOf(step);
  const steps = isEvent ? eventSteps : recoverySteps;
  const summary = handoffResult?.summary ?? fallbackSummary;

  function reset() {
    conversation.endSession();
    setStep("start");
    setPrompt(isEvent ? eventPrompt : primaryPrompt);
    setRequest(initialRequest(mode));
    setPlans(seededPlans);
    setSelected(null);
    setMicPermission("unknown");
    setIsRequestingMic(false);
    setTranscript("");
    setNotice(null);
    setApproval(null);
    setCopied(false);
    setHandoffResult(null);
    setAviationContext(null);
    setFlightRecovery(null);
    setFlightApproval(null);
  }

  async function startVoice() {
    if (appMode === "demo") {
      setNotice("Voice calls the live ElevenLabs agent, so it's disabled in Demo mode. Switch to Active mode to use it.");
      return;
    }
    setNotice(null);
    setIsRequestingMic(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      setIsRequestingMic(false);
      setMicPermission("denied");
      setNotice(voiceStatusNotice("mic-denied"));
      return;
    }
    setMicPermission("granted");
    try {
      const response = await fetch("/api/voice/signed-url?appMode=active", { cache: "no-store" });
      const raw = await response.json();
      const payload = apiData(raw);
      const signedUrl =
        payload && typeof payload === "object" && "signedUrl" in payload && typeof payload.signedUrl === "string"
          ? payload.signedUrl
          : undefined;
      if (!response.ok || !signedUrl) throw new Error(apiErrorMessage(raw) ?? "Voice unavailable");
      setTranscript("");
      conversation.startSession({
        signedUrl,
        overrides: {
          agent: {
            firstMessage: VOICE_FIRST_MESSAGE,
            prompt: { prompt: VOICE_AGENT_PROMPT },
          },
        },
      });
    } catch (error) {
      const specific = error instanceof Error && error.message !== "Voice unavailable" ? error.message : undefined;
      setNotice(specific ?? "Voice is unavailable right now. Your request is preserved—continue with text.");
    } finally {
      setIsRequestingMic(false);
    }
  }

  function cancelVoice() {
    conversation.endSession();
  }

  function finishVoiceAndContinue() {
    const spoken = transcript.trim();
    conversation.endSession();
    if (spoken) {
      setPrompt(spoken);
      void createBrief(spoken);
    }
  }

  async function createBrief(text: string = prompt) {
    setNotice(null);
    try {
      const response = await fetch("/api/recovery/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, mode, appMode }),
      });
      const payload = apiData(await response.json());
      const extracted = payload && typeof payload === "object" && "tripRequest" in payload ? payload.tripRequest : payload;
      if (response.ok && isTripRequest(extracted)) setRequest(extracted);
      else setNotice("Using a prepared brief because structured extraction is unavailable.");
    } catch {
      setNotice("Using a prepared brief because structured extraction is unavailable.");
    }
    setStep("brief");
  }

  // Independent of the hotel/context/ranking chain below — AeroXplorer failure
  // must never block or delay Stay22, Tavily, ranking, or the approval gate.
  async function fetchAviationContext() {
    setSearchState((state) => ({ ...state, aviation: "working" }));
    try {
      const response = await fetch("/api/aviation/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentLocation: request.currentLocation,
          targetArea: request.targetArea,
          flight: request.flight,
          appMode,
        }),
      });
      const data = apiData(await response.json());
      if (!response.ok || !isAviationContext(data)) throw new Error("Aviation context unavailable");
      setAviationContext(data);
      setSearchState((state) => ({ ...state, aviation: data.mode === "unavailable" ? "fallback" : "done" }));
    } catch {
      setAviationContext(null);
      setSearchState((state) => ({ ...state, aviation: "fallback" }));
    }
  }

  // Independent of both the hotel chain and the AeroXplorer evidence fetch —
  // flight search never blocks or is blocked by hotel search, ranking, or
  // the approval gate. Assistance only, never a bookable flight.
  async function fetchFlightRecovery() {
    if (request.assistanceScope === "hotel") {
      // The traveler explicitly said hotel-only — don't search or show
      // flight options they didn't ask for.
      setSearchState((state) => ({ ...state, flights: "done" }));
      return;
    }
    setSearchState((state) => ({ ...state, flights: "working" }));
    try {
      const response = await fetch("/api/flight-recovery/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flight: request.flight ?? {}, appMode }),
      });
      const data = apiData(await response.json());
      if (!response.ok || !isFlightRecoveryContext(data)) throw new Error("Flight recovery unavailable");
      setFlightRecovery(data);
      setSearchState((state) => ({ ...state, flights: data.mode === "unavailable" ? "fallback" : "done" }));
    } catch {
      setFlightRecovery(null);
      setSearchState((state) => ({ ...state, flights: "fallback" }));
    }
  }

  async function search() {
    setStep("search");
    setNotice(null);
    setSearchState({ stays: "working", context: "waiting", ranking: "waiting", aviation: "waiting", flights: "waiting" });
    setAviationContext(null);
    setFlightRecovery(null);
    void fetchAviationContext();
    void fetchFlightRecovery();
    let liveStays: StayOption[] = [];
    let localContext: unknown[] = [];
    try {
      const params = new URLSearchParams({
        address: request.targetArea,
        checkin: request.checkin,
        checkout: request.checkout,
        adults: String(request.adults),
        rooms: String(request.rooms),
        currency: request.currency,
        appMode,
      });
      const response = await fetch(`/api/stays/search?${params}`);
      const payload = await response.json();
      const data = apiData(payload);
      if (!response.ok || !isStayArray(data) || data.length === 0) throw new Error("No stays");
      liveStays = data;
      const isLive = apiMode(payload) === "stay22-live";
      setSearchState((state) => ({ ...state, stays: isLive ? "done" : "fallback", context: "working" }));
    } catch {
      setSearchState((state) => ({ ...state, stays: "fallback", context: "working" }));
    }

    try {
      const response = await fetch("/api/context/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `${request.targetArea}: late-night food and ground transportation relevant to ${request.checkin}`,
          appMode,
        }),
      });
      const data = apiData(await response.json());
      if (!response.ok || !Array.isArray(data)) throw new Error("No context");
      localContext = data;
      setSearchState((state) => ({ ...state, context: "done", ranking: "working" }));
    } catch {
      setSearchState((state) => ({ ...state, context: "fallback", ranking: "working" }));
    }

    try {
      const response = await fetch("/api/recovery/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripRequest: request,
          candidates: liveStays.map((stay) => ({ stay })),
          localContext,
          stretchApproved: false,
        }),
      });
      const data = apiData(await response.json());
      const rankedPlans = data && typeof data === "object" && "plans" in data ? data.plans : data;
      if (!response.ok || !isPlanArray(rankedPlans)) throw new Error("No ranking");
      setPlans(rankedPlans.slice(0, 3));
      setSearchState((state) => ({ ...state, ranking: "done" }));
    } catch {
      setPlans(seededPlans.filter((plan) => request.hardBudgetTotal === undefined || plan.stay.totalPrice <= request.hardBudgetTotal));
      setSearchState((state) => ({ ...state, ranking: "fallback" }));
    }
    window.setTimeout(() => setStep("compare"), 650);
  }

  function update<K extends keyof TripRequest>(key: K, value: TripRequest[K]) {
    setRequest((current) => ({ ...current, [key]: value }));
  }

  function updateFlight<K extends keyof NonNullable<TripRequest["flight"]>>(
    key: K,
    value: NonNullable<TripRequest["flight"]>[K],
  ) {
    setRequest((current) => ({ ...current, flight: { ...current.flight, [key]: value } }));
  }

  function toggleAppMode() {
    setAppMode((current) => (current === "demo" ? "active" : "demo"));
  }

  async function proceedToHandoff(plan: RecoveryPlan) {
    setSelected(plan);
    setApproval(null);
    setStep("handoff");
    setHandoffResult(null);
    try {
      const response = await fetch("/api/recovery/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripRequest: request, selectedPlan: plan, openQuestions: [] }),
      });
      const data = apiData(await response.json());
      if (!response.ok || !isHandoffResult(data)) throw new Error("No handoff");
      setHandoffResult(data);
    } catch {
      setNotice("Advisor summary is temporarily unavailable. Core details are still shown below.");
    }
  }

  function openApprovedLink(plan: RecoveryPlan) {
    window.open(plan.stay.bookingUrl, "_blank", "noopener,noreferrer");
    void proceedToHandoff(plan);
  }

  function openApprovedFlightLink(option: FlightRecoveryOption) {
    window.open(option.url, "_blank", "noopener,noreferrer");
    setFlightApproval(null);
  }

  async function copySummary() {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="lp-shell">
      <header className="lp-header">
        <button className="lp-brand" onClick={reset} aria-label="Reset and return home">
          <span className="lp-brand-mark"><LandingPadMark size={18} /></span>
          <span>{isEvent ? "EventStay" : "LandingPad"}</span>
        </button>
        <div className="lp-mode-pill"><span /> {isEvent ? "Event planning" : "Recovery mode"}</div>
        <button
          className={`lp-app-mode-toggle is-${appMode}`}
          onClick={toggleAppMode}
          aria-pressed={appMode === "active"}
          title={appMode === "demo" ? "Seeded/fallback data only — no live provider calls" : "Attempts real provider calls where configured"}
        >
          <span />
          {appMode === "demo" ? "Demo mode" : "Active mode"}
        </button>
        {step !== "start" && <button className="lp-text-button" onClick={reset}>Start over</button>}
      </header>

      <nav className="lp-progress" aria-label="Progress">
        {steps.map((label, index) => (
          <div className={`lp-progress-step ${index <= activeIndex ? "is-active" : ""}`} key={label}>
            <span>{index < activeIndex ? <Icon name="check" /> : index + 1}</span>
            <small>{label}</small>
          </div>
        ))}
      </nav>

      <section className="lp-stage" aria-live="polite">
        {step === "start" && (
          <div className="lp-start">
            <HeroLanding className="lp-hero" />
            <div className="lp-eyebrow"><Icon name="spark" /> {isEvent ? "Stay smarter around the moment" : "Your calm after plans change"}</div>
            <h1>{isEvent ? "Stay near what matters." : "Tell us what changed."}</h1>
            <p className="lp-lede">{isEvent ? "Turn an event into three clear, bookable stay strategies." : "Speak naturally. We’ll turn the disruption into a clear, editable recovery brief."}</p>

            {voiceUIState === "connected" ? (
              <div className="lp-voice is-listening" role="group" aria-label="Voice conversation in progress">
                <span><Icon name="mic" /></span>
                <strong>Listening — say what happened</strong>
                <small>{transcript ? "Transcript captured · end when ready" : "Powered by ElevenLabs · speak naturally"}</small>
              </div>
            ) : (
              <button
                className={`lp-voice ${voiceUIState === "connecting" || voiceUIState === "requesting-mic" ? "is-listening" : ""}`}
                onClick={startVoice}
                disabled={voiceUIState === "connecting" || voiceUIState === "requesting-mic"}
              >
                <span><Icon name="mic" /></span>
                <strong>
                  {voiceUIState === "requesting-mic"
                    ? "Requesting microphone…"
                    : voiceUIState === "connecting"
                      ? "Connecting securely…"
                      : "Start with voice"}
                </strong>
                <small>Powered by ElevenLabs · text always available</small>
              </button>
            )}
            {voiceUIState === "connected" && (
              <div className="lp-actions">
                <button className="lp-secondary" onClick={cancelVoice}>End without using</button>
                <button className="lp-primary" onClick={finishVoiceAndContinue} disabled={!transcript.trim()}>
                  Use this &amp; continue <Icon name="arrow" />
                </button>
              </div>
            )}

            <div className="lp-divider"><span>or type your request</span></div>
            <label className="lp-prompt-card">
              <span>{isEvent ? "Event and stay details" : "What happened?"}</span>
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={5} />
              <button className="lp-primary" onClick={() => createBrief()} disabled={!prompt.trim()}>
                Build my brief <Icon name="arrow" />
              </button>
            </label>
            {notice && <div className={`lp-notice ${voiceUIState === "failed" || voiceUIState === "mic-denied" ? "is-error" : ""}`}>{notice}</div>}
            <p className="lp-approval-note"><Icon name="shield" /> Nothing is booked or purchased without your explicit approval.</p>
          </div>
        )}

        {step === "brief" && (
          <div className="lp-panel lp-brief">
            <div className="lp-section-heading">
              <div><span className="lp-kicker">Step 2 · editable</span><h1>Confirm what we heard</h1><p>Correct anything before we search. Hard limits stay hard.</p></div>
              <span className="lp-source-badge user"><ProductIcon name="user-confirmed" size={12} /> Confirmed by you</span>
            </div>
            {notice && <div className="lp-notice">{notice}</div>}
            <div className="lp-form-grid">
              <label className="wide">Target area<input value={request.targetArea} onChange={(e) => update("targetArea", e.target.value)} /></label>
              <label>Check-in<input type="date" value={request.checkin} onChange={(e) => update("checkin", e.target.value)} /></label>
              <label>Check-out<input type="date" value={request.checkout} onChange={(e) => update("checkout", e.target.value)} /></label>
              <label>Adults<input type="number" min="1" value={request.adults} onChange={(e) => update("adults", Number(e.target.value))} /></label>
              <label>Rooms<input type="number" min="1" value={request.rooms} onChange={(e) => update("rooms", Number(e.target.value))} /></label>
              <label className="currency">Total budget<div><span>{request.currency}</span><input type="number" min="1" value={request.hardBudgetTotal ?? ""} onChange={(e) => update("hardBudgetTotal", Number(e.target.value) || undefined)} /></div></label>
              <label className="wide">Must-haves<input value={request.mustHaves.join(", ")} placeholder="Late check-in, step-free access" onChange={(e) => update("mustHaves", e.target.value.split(",").map((v) => v.trim()).filter(Boolean))} /></label>
            </div>
            {request.assistanceScope !== "hotel" && (
              <div className="lp-flight-confirm">
                <div className="lp-form-subheading"><Icon name="plane" /> Flight details</div>
                <div className="lp-form-grid">
                  <label>Origin airport (IATA)<input value={request.flight?.originIata ?? ""} maxLength={3} placeholder="JFK" onChange={(e) => updateFlight("originIata", e.target.value.toUpperCase() || undefined)} /></label>
                  <label>Destination airport (IATA)<input value={request.flight?.destinationIata ?? ""} maxLength={3} placeholder="ORD" onChange={(e) => updateFlight("destinationIata", e.target.value.toUpperCase() || undefined)} /></label>
                  <label>Flight date<input type="date" value={request.flight?.scheduledDate ?? ""} onChange={(e) => updateFlight("scheduledDate", e.target.value || undefined)} /></label>
                  <label>Airline code<input value={request.flight?.airlineCode ?? ""} maxLength={4} placeholder="AA" onChange={(e) => updateFlight("airlineCode", e.target.value.toUpperCase() || undefined)} /></label>
                  <label className="wide">Flight number<input value={request.flight?.flightNumber ?? ""} maxLength={6} placeholder="1234" onChange={(e) => updateFlight("flightNumber", e.target.value || undefined)} /></label>
                </div>
                {!(request.flight?.originIata && request.flight?.scheduledDate) && (
                  <p className="lp-form-hint">Add an origin airport and date so we can search alternate flight options for you. Airline and flight number are optional but sharpen historical evidence.</p>
                )}
              </div>
            )}
            <div className="lp-uncertainties">
              <strong>Still needs verification</strong>
              <div>{request.uncertainties.map((item) => <span key={item}>{item}</span>)}</div>
            </div>
            <div className="lp-actions"><button className="lp-secondary" onClick={() => setStep("start")}>Back</button><button className="lp-primary" onClick={search}>Search live stays <Icon name="arrow" /></button></div>
          </div>
        )}

        {step === "search" && (
          <div className="lp-search-panel">
            <div className="lp-orbit"><span /><Icon name="spark" /></div>
            <span className="lp-kicker">Building your three options</span>
            <h1>{isEvent ? "Matching stays to the moment" : "Finding the clearest way forward"}</h1>
            <div className="lp-search-list">
              <SearchRow icon="hotel" label="Dated accommodation options" vendor="Stay22" state={searchState.stays} />
              <SearchRow icon="evidence-source" label="Nearby essentials and context" vendor="Tavily" state={searchState.context} />
              <SearchRow icon="user-confirmed" label="Eligibility and plan ranking" vendor="LandingPad" state={searchState.ranking} />
              <SearchRow icon="historical-aviation-data" label="Historical operating context" vendor="AeroXplorer" state={searchState.aviation} />
              <SearchRow icon="flight-disruption" label="Alternate flight options" vendor="Tavily" state={searchState.flights} />
            </div>
            <p>Each source can finish independently. Partial results stay useful.</p>
          </div>
        )}

        {step === "compare" && (
          <div className="lp-compare">
            <div className="lp-section-heading">
              <div><span className="lp-kicker">Three eligible strategies</span><h1>Choose your landing</h1><p>Prices are full-stay totals. Verify supplier terms before booking.</p></div>
              <button className="lp-secondary compact" onClick={() => setStep("brief")}>Edit constraints</button>
            </div>
            {aviationContext && aviationContext.mode !== "unavailable" && (
              <div className="lp-aviation-evidence">
                <div className="lp-aviation-heading">
                  <span className="lp-kicker">Historical operating context</span>
                  <span className="lp-source-badge aeroxplorer"><ProductIcon name="historical-aviation-data" size={12} /> AeroXplorer historical records</span>
                </div>
                {aviationContext.airport && (
                  <p className="lp-aviation-airport">
                    {aviationContext.airport.name} ({aviationContext.airport.iata})
                  </p>
                )}
                {aviationContext.historicalFlight ? (
                  <div className="lp-aviation-stats">
                    <span>
                      {aviationContext.historicalFlight.observations} observed flight
                      {aviationContext.historicalFlight.observations === 1 ? "" : "s"}
                      {aviationContext.historicalFlight.observationWindow ? ` · ${aviationContext.historicalFlight.observationWindow}` : ""}
                    </span>
                    {aviationContext.historicalFlight.cancellationRate !== undefined && (
                      <span>{Math.round(aviationContext.historicalFlight.cancellationRate * 100)}% historically cancelled</span>
                    )}
                    {aviationContext.historicalFlight.delayRate !== undefined && (
                      <span>{Math.round(aviationContext.historicalFlight.delayRate * 100)}% historically delayed 15+ min</span>
                    )}
                    {aviationContext.historicalFlight.diversionRate !== undefined && (
                      <span>{Math.round(aviationContext.historicalFlight.diversionRate * 100)}% historically diverted</span>
                    )}
                  </div>
                ) : (
                  <p className="lp-aviation-skip">
                    {aviationContext.warnings[0] ?? "Flight-specific history wasn't queried — only airport identity is shown."}
                  </p>
                )}
                <p className="lp-aviation-disclaimer">Historical performance does not confirm today’s flight status.</p>
              </div>
            )}
            {aviationContext?.mode === "unavailable" && (
              <p className="lp-aviation-skip">Historical aviation context is unavailable right now — hotel results are unaffected.</p>
            )}
            {request.assistanceScope === "flight" && flightRecovery && (
              <FlightRecoverySection flightRecovery={flightRecovery} onSelect={setFlightApproval} />
            )}
            {plans.length === 0 ? (
              <div className="lp-empty-state">
                <span className="lp-empty-icon">0</span>
                <span className="lp-kicker">Hard constraints preserved</span>
                <h2>No eligible stay matches this brief.</h2>
                <p>LandingPad did not widen the area or raise your budget silently. Choose a change to review it first.</p>
                <div className="lp-relaxations">
                  <button onClick={() => { update("hardBudgetTotal", (request.hardBudgetTotal ?? 0) + 75); setStep("brief"); }}>Review +{request.currency} 75 budget</button>
                  <button onClick={() => setStep("brief")}>Review a wider area</button>
                  <button onClick={() => setStep("brief")}>Choose an alternate area</button>
                </div>
              </div>
            ) : <div className="lp-plan-grid">
              {plans.map((plan, index) => (
                <article className={`lp-plan-card ${index === 0 ? "featured" : ""}`} key={`${plan.label}-${plan.stay.id}`}>
                  {index === 0 && <span className="lp-recommended">Recommended</span>}
                  <div className="lp-card-top"><span className="lp-plan-index">0{index + 1}</span><span className={`lp-source-badge ${plan.stay.sourceMode === "demo" ? "demo" : "live"}`}>{sourceLabel(plan.stay.sourceMode)}</span></div>
                  <p className={`lp-plan-type ${plan.label === "fastest" ? "is-urgent" : ""}`}><ProductIcon name={planIcon(plan.label)} size={13} /> {planTitle(plan.label, mode)}</p>
                  <h2>{plan.stay.name}</h2>
                  <div className="lp-price"><span>{new Intl.NumberFormat("en-US", { style: "currency", currency: plan.stay.currency, maximumFractionDigits: 0 }).format(plan.stay.totalPrice)}</span><small>full stay</small></div>
                  <ul className="lp-evidence">{plan.rationale.map((item) => <li key={item}><Icon name="check" />{item}</li>)}</ul>
                  <div className="lp-tradeoff"><strong>Tradeoff</strong><p>{plan.tradeoffs[0] ?? "No material tradeoff provided."}</p></div>
                  {plan.localContext.length > 0 ? <a className="lp-context-link" href={plan.localContext[0].url} target="_blank" rel="noreferrer">Local context · Tavily source ↗</a> : <span className="lp-context-empty">Local context unavailable</span>}
                  <button className="lp-primary" onClick={() => setApproval(plan)}>Review & approve <Icon name="arrow" /></button>
                </article>
              ))}
            </div>}
            <p className="lp-data-note">Demo-labeled options are validated fixtures, not live availability. Live results preserve Stay22 booking links exactly.</p>
            {request.assistanceScope !== "flight" && flightRecovery && (
              <FlightRecoverySection flightRecovery={flightRecovery} onSelect={setFlightApproval} />
            )}
          </div>
        )}

        {step === "handoff" && selected && (
          <div className="lp-panel lp-handoff">
            <div className="lp-success-mark"><ProductIcon name="recovery-completed" size={25} /></div>
            <span className="lp-kicker">Advisor-ready</span>
            <h1>Your next move is clear.</h1>
            <p>Share this summary with a travel advisor or keep it for the supplier checkout.</p>
            <div className="lp-handoff-grid">
              <div><span>Selected stay</span><strong>{selected.stay.name}</strong><small>{selected.stay.currency} {selected.stay.totalPrice} total · {sourceLabel(selected.stay.sourceMode)}</small></div>
              <div><span>Status</span><strong>Not booked</strong><small>Supplier verification and checkout remain with you.</small></div>
            </div>
            {handoffResult && handoffResult.confirmedFacts.length > 0 && (
              <div className="lp-uncertainties">
                <strong>Confirmed facts</strong>
                <div>{handoffResult.confirmedFacts.map((item) => <span key={item}>{item}</span>)}</div>
              </div>
            )}
            {handoffResult && handoffResult.openQuestions.length > 0 && (
              <div className="lp-uncertainties">
                <strong>Open questions</strong>
                <div>{handoffResult.openQuestions.map((item) => <span key={item}>{item}</span>)}</div>
              </div>
            )}
            <label className="lp-summary"><span>Copyable handoff summary</span><textarea readOnly value={summary} rows={8} /></label>
            <div className="lp-actions"><button className="lp-secondary" onClick={copySummary}><Icon name="copy" /> {copied ? "Copied" : "Copy summary"}</button><button className="lp-primary" onClick={() => setApproval(selected)}>Open supplier page <Icon name="arrow" /></button></div>
            <button className="lp-text-button centered" onClick={reset}>Plan another recovery</button>
          </div>
        )}
      </section>

      <footer className="lp-footer"><span>Live travel data by <strong>Stay22</strong></span><span>Voice by <strong>ElevenLabs</strong></span><span>Grounded context by <strong>Tavily</strong></span><span>Historical aviation data by <strong>AeroXplorer</strong></span><span className="lp-advisor">Built for advisor-ready recovery · Anecdote Travel prize alignment</span></footer>

      {approval && (
        <div className="lp-modal-backdrop" role="presentation" onMouseDown={() => setApproval(null)}>
          <div className="lp-modal" role="dialog" aria-modal="true" aria-labelledby="approval-title" onMouseDown={(event) => event.stopPropagation()}>
            <span className="lp-modal-icon"><Icon name="shield" /></span>
            <span className="lp-kicker">Approval gate</span>
            <h2 id="approval-title">Continue to the supplier?</h2>
            <p>You’re leaving LandingPad to review <strong>{approval.stay.name}</strong>. No reservation or payment has been made.</p>
            <div className="lp-modal-facts"><span>Total shown</span><strong>{approval.stay.currency} {approval.stay.totalPrice}</strong><small>{sourceLabel(approval.stay.sourceMode)} · Verify price, availability, late check-in, and cancellation terms on the supplier page.</small></div>
            <div className="lp-actions"><button className="lp-secondary" onClick={() => setApproval(null)}>Keep comparing</button><button className="lp-primary" onClick={() => openApprovedLink(approval)}>I approve, open link <Icon name="arrow" /></button></div>
          </div>
        </div>
      )}

      {flightApproval && (
        <div className="lp-modal-backdrop" role="presentation" onMouseDown={() => setFlightApproval(null)}>
          <div className="lp-modal" role="dialog" aria-modal="true" aria-labelledby="flight-approval-title" onMouseDown={(event) => event.stopPropagation()}>
            <span className="lp-modal-icon"><Icon name="shield" /></span>
            <span className="lp-kicker">Approval gate</span>
            <h2 id="flight-approval-title">Continue to search this flight?</h2>
            <p>You’re leaving LandingPad to search <strong>{flightApproval.label}</strong>. Nothing is booked here either.</p>
            <div className="lp-actions"><button className="lp-secondary" onClick={() => setFlightApproval(null)}>Keep comparing</button><button className="lp-primary" onClick={() => openApprovedFlightLink(flightApproval)}>I approve, open link <Icon name="arrow" /></button></div>
          </div>
        </div>
      )}
    </main>
  );
}

function SearchRow({
  icon,
  label,
  vendor,
  state,
}: {
  icon: ProductIconName;
  label: string;
  vendor: string;
  state: SearchState;
}) {
  const text = state === "working" ? "Searching" : state === "done" ? "Ready" : state === "fallback" ? "Fallback ready" : "Waiting";
  return (
    <div className={`lp-search-row is-${state}`}>
      <span className="lp-search-status">{state === "done" || state === "fallback" ? <Icon name="check" /> : <i />}</span>
      <span className="lp-search-vendor-icon"><ProductIcon name={icon} size={15} /></span>
      <div><strong>{label}</strong><small>{vendor}</small></div>
      <em>{text}</em>
    </div>
  );
}

function FlightRecoverySection({
  flightRecovery,
  onSelect,
}: {
  flightRecovery: FlightRecoveryContext;
  onSelect: (option: FlightRecoveryOption) => void;
}) {
  if (flightRecovery.mode === "unavailable") {
    return <p className="lp-aviation-skip">Flight recovery assistance is unavailable right now — hotel results are unaffected.</p>;
  }
  return (
    <div className="lp-flight-section">
      <div className="lp-section-heading compact">
        <div>
          <span className="lp-kicker">Alternate flight options</span>
          <h2>Ways back on track</h2>
        </div>
        <span className="lp-source-badge tavily">Tavily web search</span>
      </div>
      {flightRecovery.historicalContext && (
        <p className="lp-flight-route">
          <ProductIcon name="historical-aviation-data" size={13} />
          {flightRecovery.historicalContext.originIata}
          {flightRecovery.historicalContext.destinationIata ? ` → ${flightRecovery.historicalContext.destinationIata}` : ""}
          {flightRecovery.historicalContext.onTimeRate !== undefined && (
            <> · {Math.round(flightRecovery.historicalContext.onTimeRate * 100)}% historically on time</>
          )}
        </p>
      )}
      {flightRecovery.options.length > 0 ? (
        <div className="lp-flight-grid">
          {flightRecovery.options.map((option, index) => (
            <article className="lp-flight-card" key={option.url}>
              <span className="lp-plan-index">0{index + 1}</span>
              <p>{option.label}</p>
              <button className="lp-primary compact" onClick={() => onSelect(option)}>
                Review &amp; search <Icon name="arrow" />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="lp-aviation-skip">{flightRecovery.warnings[0] ?? "No flight search links are available right now."}</p>
      )}
      <p className="lp-data-note">
        LandingPad does not search or book flights directly — these are grounded search links, and historical performance does not confirm today’s flight status.
      </p>
    </div>
  );
}
