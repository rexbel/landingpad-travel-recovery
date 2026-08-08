const timeoutMs = 12_000;

async function check(name, configured, requestFactory) {
  if (!configured) {
    return { name, status: "pending", detail: "credential not configured" };
  }

  const startedAt = Date.now();
  try {
    const response = await requestFactory();
    return {
      name,
      status: response.ok ? "ready" : "failed",
      detail: `HTTP ${response.status} in ${Date.now() - startedAt} ms`,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.name : "request failed";
    return { name, status: "failed", detail };
  }
}

function timedFetch(url, init = {}) {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
}

const stay22Url = new URL("/v2/accommodations", process.env.STAY22_API_BASE_URL || "https://api.stay22.com");
stay22Url.search = new URLSearchParams({
  address: "John F. Kennedy International Airport",
  checkin: "2026-08-09",
  checkout: "2026-08-10",
  adults: "2",
  rooms: "1",
  pageSize: "1",
}).toString();

const results = await Promise.all([
  check("Stay22", true, () =>
    timedFetch(stay22Url, {
      headers: process.env.STAY22_API_KEY
        ? { "X-API-KEY": process.env.STAY22_API_KEY }
        : undefined,
    }),
  ),
  check("ElevenLabs", Boolean(process.env.ELEVENLABS_API_KEY), () =>
    timedFetch("https://api.elevenlabs.io/v1/user/subscription", {
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
    }),
  ),
  check("Tavily", Boolean(process.env.TAVILY_API_KEY), () =>
    timedFetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: "JFK Airport official website",
        max_results: 1,
      }),
    }),
  ),
  check("OpenAI", Boolean(process.env.OPENAI_API_KEY), () =>
    timedFetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    }),
  ),
]);

console.table(results);

const failed = results.some((result) => result.status === "failed");
process.exitCode = failed ? 1 : 0;
