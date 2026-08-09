import { checkAeroXplorer } from "./aeroxplorer-preflight.mjs";

const isLive = process.argv.includes("--live");
const providerFilter = (() => {
  const idx = process.argv.indexOf("--provider");
  return idx !== -1 ? process.argv[idx + 1]?.toLowerCase() : undefined;
})();
const inGitHubActions = process.env.GITHUB_ACTIONS === "true";
const timeoutMs = 12_000;

function statusClass(status) {
  return `${Math.floor(status / 100)}xx`;
}

async function check(name, configured, run) {
  const missingDetail = typeof configured === "string" ? configured : undefined;
  const isConfigured = configured === true;

  if (!isLive) {
    return {
      name,
      status: isConfigured ? "configured" : "not configured",
      detail: missingDetail ?? "offline mode — pass --live to test connectivity",
    };
  }
  if (!isConfigured) {
    return { name, status: "pending", detail: missingDetail ?? "credential not configured" };
  }

  const startedAt = Date.now();
  try {
    const outcome = await run();
    const elapsed = Date.now() - startedAt;
    if (outcome.status === "failed") {
      return { name, status: "failed", detail: `${outcome.detail} in ${elapsed} ms` };
    }
    return { name, status: "ready", detail: `${outcome.detail} in ${elapsed} ms` };
  } catch (error) {
    const detail = error instanceof Error ? error.name : "request failed";
    return { name, status: "failed", detail };
  }
}

function timedFetch(url, init = {}) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

async function checkStay22() {
  const base = process.env.STAY22_API_BASE_URL || "https://api.stay22.com";
  const url = new URL("/v2/accommodations", base);
  url.search = new URLSearchParams({
    address: "John F. Kennedy International Airport",
    checkin: "2026-08-09",
    checkout: "2026-08-10",
    adults: "2",
    rooms: "1",
    pageSize: "1",
  }).toString();
  const response = await timedFetch(url, {
    headers: process.env.STAY22_API_KEY ? { "X-API-KEY": process.env.STAY22_API_KEY } : undefined,
  });
  if (!response.ok) return { status: "failed", detail: `HTTP ${statusClass(response.status)}` };
  const body = await response.json().catch(() => null);
  const schemaOk = Boolean(body && typeof body === "object" && body.meta && Array.isArray(body.results));
  return { status: schemaOk ? "ready" : "failed", detail: `HTTP ${statusClass(response.status)}, schema ${schemaOk ? "ok" : "unexpected"}` };
}

async function checkElevenLabs() {
  const url = new URL("https://api.elevenlabs.io/v1/convai/conversation/get-signed-url");
  url.searchParams.set("agent_id", process.env.ELEVENLABS_AGENT_ID ?? "");
  const response = await timedFetch(url, { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "" } });
  if (!response.ok) return { status: "failed", detail: `HTTP ${statusClass(response.status)}` };
  const body = await response.json().catch(() => null);
  const schemaOk = Boolean(body && typeof body.signed_url === "string");
  return { status: schemaOk ? "ready" : "failed", detail: `HTTP ${statusClass(response.status)}, schema ${schemaOk ? "ok" : "unexpected"}` };
}

async function checkTavily() {
  const response = await timedFetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.TAVILY_API_KEY ?? ""}` },
    body: JSON.stringify({ query: "JFK Airport official website", search_depth: "basic", max_results: 1 }),
  });
  if (!response.ok) return { status: "failed", detail: `HTTP ${statusClass(response.status)}` };
  const body = await response.json().catch(() => null);
  const schemaOk = Boolean(body && Array.isArray(body.results));
  return { status: schemaOk ? "ready" : "failed", detail: `HTTP ${statusClass(response.status)}, schema ${schemaOk ? "ok" : "unexpected"}` };
}

async function checkOpenAI() {
  const response = await timedFetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}` },
  });
  if (!response.ok) return { status: "failed", detail: `HTTP ${statusClass(response.status)}` };
  const body = await response.json().catch(() => null);
  const schemaOk = Boolean(body && Array.isArray(body.data));
  return { status: schemaOk ? "ready" : "failed", detail: `HTTP ${statusClass(response.status)}, schema ${schemaOk ? "ok" : "unexpected"}` };
}

// AeroXplorer: POST /v1/token (header X-User: KEY:SECRET) -> { bearer, expiration }.
// The OpenAPI securityScheme documents "X-Authorization: Bearer <token>" for authenticated
// requests, but one example on the docs page shows a plain "Authorization" header. The
// shared checkAeroXplorer() helper tries X-Authorization first and falls back to
// Authorization exactly once, only on an authentication failure.
function maskInGitHubActions(secretValue) {
  if (inGitHubActions && secretValue) {
    process.stdout.write(`::add-mask::${secretValue}\n`);
  }
}

async function runAeroXplorerCheck() {
  const result = await checkAeroXplorer({
    apiKey: process.env.AEROXPLORER_API_KEY,
    apiSecret: process.env.AEROXPLORER_API_SECRET,
    timeoutMs,
    onToken: maskInGitHubActions,
  });
  const detail = result.headerUsed ? `${result.detail}; auth header used: ${result.headerUsed}` : result.detail;
  return { status: result.status, detail };
}

const providers = [
  { key: "stay22", name: "Stay22", configured: true, run: checkStay22 },
  {
    key: "elevenlabs",
    name: "ElevenLabs",
    configured: Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID),
    run: checkElevenLabs,
  },
  { key: "tavily", name: "Tavily", configured: Boolean(process.env.TAVILY_API_KEY), run: checkTavily },
  { key: "openai", name: "OpenAI", configured: Boolean(process.env.OPENAI_API_KEY), run: checkOpenAI },
  {
    key: "aeroxplorer",
    name: "AeroXplorer",
    configured: (() => {
      const missing = [];
      if (!process.env.AEROXPLORER_API_KEY) missing.push("AEROXPLORER_API_KEY");
      if (!process.env.AEROXPLORER_API_SECRET) missing.push("AEROXPLORER_API_SECRET");
      return missing.length === 0 ? true : `missing: ${missing.join(", ")}`;
    })(),
    run: runAeroXplorerCheck,
  },
];

const selected = providers.filter((provider) => !providerFilter || provider.key === providerFilter);

const results = await Promise.all(selected.map((provider) => check(provider.name, provider.configured, provider.run)));

console.table(results);

if (!isLive) {
  console.log("Offline mode: no provider was contacted. Run `node scripts/integration-preflight.mjs --live` to test connectivity.");
}

const failed = results.some((result) => result.status === "failed");
process.exitCode = failed ? 1 : 0;
