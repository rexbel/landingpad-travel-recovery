"use client";

import { useMemo, useState } from "react";
import type { ProductMode } from "@/lib/config/product-mode";
import {
  primaryPrompt,
  primaryTripRequest,
  seededPlans,
} from "@/lib/data/demo-cases";
import type { RecoveryPlan } from "@/schemas/recovery-plan";
import type { StayOption } from "@/schemas/stay-option";
import type { TripRequest } from "@/schemas/trip-request";

type Step = "start" | "brief" | "search" | "compare" | "handoff";
type SearchState = "waiting" | "working" | "done" | "fallback";

const recoverySteps = ["Tell us", "Confirm", "Search", "Compare", "Handoff"];
const eventSteps = ["Event", "Confirm", "Search", "Compare", "Share"];

const eventPrompt =
  "I’m attending Checkout Travel Hack NYC on August 9. Find one room nearby for two adults, under $350 total, with an easy trip back after the event.";

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

function sourceLabel(source: RecoveryPlan["stay"]["sourceMode"]) {
  return {
    "stay22-live": "Stay22 live",
    "tavily-web": "Tavily web",
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
  const isEvent = mode === "event";
  const [step, setStep] = useState<Step>("start");
  const [prompt, setPrompt] = useState(isEvent ? eventPrompt : primaryPrompt);
  const [request, setRequest] = useState<TripRequest>(() => initialRequest(mode));
  const [plans, setPlans] = useState<RecoveryPlan[]>(seededPlans);
  const [selected, setSelected] = useState<RecoveryPlan | null>(null);
  const [voiceState, setVoiceState] = useState<"idle" | "connecting" | "ready" | "failed">("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const [searchState, setSearchState] = useState<Record<string, SearchState>>({ stays: "waiting", context: "waiting", ranking: "waiting" });
  const [approval, setApproval] = useState<RecoveryPlan | null>(null);
  const [copied, setCopied] = useState(false);

  const activeIndex = ["start", "brief", "search", "compare", "handoff"].indexOf(step);
  const steps = isEvent ? eventSteps : recoverySteps;

  const summary = useMemo(() => {
    if (!selected) return "";
    return [
      `${isEvent ? "Event stay request" : "Travel recovery request"}: ${request.adults} adult${request.adults === 1 ? "" : "s"}, ${request.rooms} room${request.rooms === 1 ? "" : "s"}, ${request.checkin} to ${request.checkout}.`,
      `Confirmed budget: ${request.currency} ${request.hardBudgetTotal ?? "not set"} total. Target area: ${request.targetArea}.`,
      `Selected option: ${selected.stay.name} at ${selected.stay.currency} ${selected.stay.totalPrice} total (${sourceLabel(selected.stay.sourceMode)}).`,
      `Open questions: ${request.uncertainties.length ? request.uncertainties.join("; ") : "None recorded."}`,
      `Advisor note: Verify all unconfirmed amenities, travel times, and supplier terms before booking. No reservation has been made.`,
    ].join("\n");
  }, [isEvent, request, selected]);

  function reset() {
    setStep("start");
    setPrompt(isEvent ? eventPrompt : primaryPrompt);
    setRequest(initialRequest(mode));
    setPlans(seededPlans);
    setSelected(null);
    setVoiceState("idle");
    setNotice(null);
    setApproval(null);
    setCopied(false);
  }

  async function startVoice() {
    setVoiceState("connecting");
    setNotice(null);
    try {
      const response = await fetch("/api/voice/signed-url", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !apiData(payload)) throw new Error("Voice unavailable");
      setVoiceState("ready");
      setNotice("Secure voice session is ready. Text remains available if you prefer it.");
    } catch {
      setVoiceState("failed");
      setNotice("Voice is unavailable right now. Your request is preserved—continue with text.");
    }
  }

  async function createBrief() {
    setNotice(null);
    try {
      const response = await fetch("/api/recovery/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: prompt, mode }),
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

  async function search() {
    setStep("search");
    setNotice(null);
    setSearchState({ stays: "working", context: "waiting", ranking: "waiting" });
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
      });
      const response = await fetch(`/api/stays/search?${params}`);
      const data = apiData(await response.json());
      if (!response.ok || !isStayArray(data) || data.length === 0) throw new Error("No stays");
      liveStays = data;
      setSearchState((state) => ({ ...state, stays: "done", context: "working" }));
    } catch {
      setSearchState((state) => ({ ...state, stays: "fallback", context: "working" }));
    }

    try {
      const response = await fetch("/api/context/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: `${request.targetArea}: late-night food and ground transportation relevant to ${request.checkin}` }),
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

  function proceedToHandoff(plan: RecoveryPlan) {
    setSelected(plan);
    setApproval(null);
    setStep("handoff");
  }

  function openApprovedLink(plan: RecoveryPlan) {
    window.open(plan.stay.bookingUrl, "_blank", "noopener,noreferrer");
    proceedToHandoff(plan);
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
          <span className="lp-brand-mark"><Icon name={isEvent ? "spark" : "plane"} /></span>
          <span>{isEvent ? "EventStay" : "LandingPad"}</span>
        </button>
        <div className="lp-mode-pill"><span /> {isEvent ? "Event planning" : "Recovery mode"}</div>
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
            <div className="lp-eyebrow"><Icon name="spark" /> {isEvent ? "Stay smarter around the moment" : "Your calm after plans change"}</div>
            <h1>{isEvent ? "Stay near what matters." : "Tell us what changed."}</h1>
            <p className="lp-lede">{isEvent ? "Turn an event into three clear, bookable stay strategies." : "Speak naturally. We’ll turn the disruption into a clear, editable recovery brief."}</p>

            <button className={`lp-voice ${voiceState === "connecting" ? "is-listening" : ""}`} onClick={startVoice} disabled={voiceState === "connecting"}>
              <span><Icon name="mic" /></span>
              <strong>{voiceState === "connecting" ? "Connecting securely…" : voiceState === "ready" ? "Voice session ready" : "Start with voice"}</strong>
              <small>Powered by ElevenLabs · text always available</small>
            </button>

            <div className="lp-divider"><span>or type your request</span></div>
            <label className="lp-prompt-card">
              <span>{isEvent ? "Event and stay details" : "What happened?"}</span>
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={5} />
              <button className="lp-primary" onClick={createBrief} disabled={!prompt.trim()}>
                Build my brief <Icon name="arrow" />
              </button>
            </label>
            {notice && <div className={`lp-notice ${voiceState === "failed" ? "is-error" : ""}`}>{notice}</div>}
            <p className="lp-approval-note"><Icon name="shield" /> Nothing is booked or purchased without your explicit approval.</p>
          </div>
        )}

        {step === "brief" && (
          <div className="lp-panel lp-brief">
            <div className="lp-section-heading">
              <div><span className="lp-kicker">Step 2 · editable</span><h1>Confirm what we heard</h1><p>Correct anything before we search. Hard limits stay hard.</p></div>
              <span className="lp-source-badge user">Confirmed by you</span>
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
              <SearchRow label="Dated accommodation options" vendor="Stay22" state={searchState.stays} />
              <SearchRow label="Nearby essentials and context" vendor="Tavily" state={searchState.context} />
              <SearchRow label="Eligibility and plan ranking" vendor="LandingPad" state={searchState.ranking} />
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
                  <p className="lp-plan-type">{planTitle(plan.label, mode)}</p>
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
          </div>
        )}

        {step === "handoff" && selected && (
          <div className="lp-panel lp-handoff">
            <div className="lp-success-mark"><Icon name="check" /></div>
            <span className="lp-kicker">Advisor-ready</span>
            <h1>Your next move is clear.</h1>
            <p>Share this summary with a travel advisor or keep it for the supplier checkout.</p>
            <div className="lp-handoff-grid">
              <div><span>Selected stay</span><strong>{selected.stay.name}</strong><small>{selected.stay.currency} {selected.stay.totalPrice} total · {sourceLabel(selected.stay.sourceMode)}</small></div>
              <div><span>Status</span><strong>Not booked</strong><small>Supplier verification and checkout remain with you.</small></div>
            </div>
            <label className="lp-summary"><span>Copyable handoff summary</span><textarea readOnly value={summary} rows={8} /></label>
            <div className="lp-actions"><button className="lp-secondary" onClick={copySummary}><Icon name="copy" /> {copied ? "Copied" : "Copy summary"}</button><button className="lp-primary" onClick={() => setApproval(selected)}>Open supplier page <Icon name="arrow" /></button></div>
            <button className="lp-text-button centered" onClick={reset}>Plan another recovery</button>
          </div>
        )}
      </section>

      <footer className="lp-footer"><span>Live travel data by <strong>Stay22</strong></span><span>Voice by <strong>ElevenLabs</strong></span><span>Grounded context by <strong>Tavily</strong></span><span className="lp-advisor">Built for advisor-ready recovery · Anecdote Travel prize alignment</span></footer>

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
    </main>
  );
}

function SearchRow({ label, vendor, state }: { label: string; vendor: string; state: SearchState }) {
  const text = state === "working" ? "Searching" : state === "done" ? "Ready" : state === "fallback" ? "Fallback ready" : "Waiting";
  return <div className={`lp-search-row is-${state}`}><span className="lp-search-status">{state === "done" || state === "fallback" ? <Icon name="check" /> : <i />}</span><div><strong>{label}</strong><small>{vendor}</small></div><em>{text}</em></div>;
}
