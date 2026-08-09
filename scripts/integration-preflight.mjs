const isLive = process.argv.includes("--live");
const timeoutMs = 12_000;

function statusClass(status) {
  return `${Math.floor(status / 100)}xx`;
}

async function check(name, configured, run) {
  if (!isLive) {
    return {
      name,
      status: configured ? "configured" : "not configured",
      detail: "offline mode — pass --live to test connectivity",
    };
  }
  if (!configured) {
    return { name, status: "pending", detail: "credential not configured" };
  }

  const startedAt = Date.now();
  try {
    const { response, schemaOk } = await run();
    const elapsed = Date.now() - startedAt;
    if (!response.ok) {
      return { name, status: "failed", detail: `HTTP ${statusClass(response.status)} in ${elapsed} ms` };
    }
    return {
      name,
      status: schemaOk ? "ready" : "failed",
      detail: `HTTP ${statusClass(response.status)} in ${elapsed} ms, schema ${schemaOk ? "ok" : "unexpected"}`,
    };
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
  let schemaOk = false;
  if (response.ok) {
    const body = await response.json().catch(() => null);
    schemaOk = Boolean(body && typeof body === "object" && body.meta && Array.isArray(body.results));
  }
  return { response, schemaOk };
}

async function checkElevenLabs() {
  const url = new URL("https://api.elevenlabs.io/v1/convai/conversation/get-signed-url");
  url.searchParams.set("agent_id", process.env.ELEVENLABS_AGENT_ID ?? "");
  const response = await timedFetch(url, { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "" } });
  let schemaOk = false;
  if (response.ok) {
    const body = await response.json().catch(() => null);
    schemaOk = Boolean(body && typeof body.signed_url === "string");
  }
  return { response, schemaOk };
}

async function checkTavily() {
  const response = await timedFetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.TAVILY_API_KEY ?? ""}` },
    body: JSON.stringify({ query: "JFK Airport official website", search_depth: "basic", max_results: 1 }),
  });
  let schemaOk = false;
  if (response.ok) {
    const body = await response.json().catch(() => null);
    schemaOk = Boolean(body && Array.isArray(body.results));
  }
  return { response, schemaOk };
}

async function checkOpenAI() {
  const response = await timedFetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}` },
  });
  let schemaOk = false;
  if (response.ok) {
    const body = await response.json().catch(() => null);
    schemaOk = Boolean(body && Array.isArray(body.data));
  }
  return { response, schemaOk };
}

const results = await Promise.all([
  check("Stay22", true, checkStay22),
  check(
    "ElevenLabs",
    Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID),
    checkElevenLabs,
  ),
  check("Tavily", Boolean(process.env.TAVILY_API_KEY), checkTavily),
  check("OpenAI", Boolean(process.env.OPENAI_API_KEY), checkOpenAI),
]);

console.table(results);

if (!isLive) {
  console.log("Offline mode: no provider was contacted. Run `node scripts/integration-preflight.mjs --live` to test connectivity.");
}

const failed = results.some((result) => result.status === "failed");
process.exitCode = failed ? 1 : 0;
