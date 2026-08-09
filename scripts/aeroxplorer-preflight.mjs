// Preflight-only AeroXplorer check. Not a product-facing adapter — used solely by
// scripts/integration-preflight.mjs and its tests. Every network call is injectable
// via fetchImpl so this module can be fully unit-tested without contacting AeroXplorer.

const DEFAULT_TIMEOUT_MS = 12_000;

export function statusClass(status) {
  return `${Math.floor(status / 100)}xx`;
}

function errorDetail(error) {
  return error instanceof Error && error.name === "AbortError" ? "timed out" : "request failed";
}

export async function requestToken({ apiKey, apiSecret, fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  let response;
  try {
    response = await fetchImpl("https://api.aeroxplorer.com/v1/token", {
      method: "POST",
      headers: { "X-User": `${apiKey}:${apiSecret}` },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    return { ok: false, detail: `token request ${errorDetail(error)}` };
  }

  if (!response.ok) {
    return { ok: false, detail: `token request HTTP ${statusClass(response.status)}` };
  }

  const body = await response.json().catch(() => null);
  const token = body && typeof body.bearer === "string" && body.bearer.length > 0 ? body.bearer : undefined;
  const expiration = body && typeof body.expiration === "number" && body.expiration > 0 ? body.expiration : undefined;
  if (!token || !expiration) {
    return { ok: false, detail: "token response schema unexpected" };
  }

  return { ok: true, token, expiration, tokenStatus: `HTTP ${statusClass(response.status)}, token schema ok` };
}

export async function requestAirport({ token, headerName, fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const url = new URL("https://api.aeroxplorer.com/v1/airports");
  url.search = new URLSearchParams({ iata: "JFK", results: "1" }).toString();
  return fetchImpl(url, {
    headers: { [headerName]: `Bearer ${token}` },
    signal: AbortSignal.timeout(timeoutMs),
  });
}

/**
 * Runs one token request and one JFK airport lookup. Retries the airport lookup at
 * most once, only on a 401/403, switching from the documented primary header
 * (X-Authorization) to the documented alternate (Authorization). Never retries for
 * rate-limit, server, schema, or invalid-credential failures.
 *
 * @param {{
 *   apiKey?: string,
 *   apiSecret?: string,
 *   fetchImpl?: typeof fetch,
 *   timeoutMs?: number,
 *   onToken?: (token: string) => void,
 * }} [options]
 */
export async function checkAeroXplorer({
  apiKey,
  apiSecret,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  onToken,
} = {}) {
  const tokenResult = await requestToken({ apiKey, apiSecret, fetchImpl, timeoutMs });
  if (!tokenResult.ok) {
    return { status: "failed", detail: tokenResult.detail, headerUsed: undefined };
  }

  onToken?.(tokenResult.token);

  let headerUsed = "X-Authorization";
  let response;
  try {
    response = await requestAirport({ token: tokenResult.token, headerName: headerUsed, fetchImpl, timeoutMs });
  } catch (error) {
    return { status: "failed", detail: `${tokenResult.tokenStatus}; airport lookup ${errorDetail(error)}`, headerUsed };
  }

  if (response.status === 401 || response.status === 403) {
    headerUsed = "Authorization (documented alternate)";
    try {
      response = await requestAirport({ token: tokenResult.token, headerName: "Authorization", fetchImpl, timeoutMs });
    } catch (error) {
      return { status: "failed", detail: `${tokenResult.tokenStatus}; airport lookup ${errorDetail(error)}`, headerUsed };
    }
  }

  if (!response.ok) {
    const category =
      response.status === 401 || response.status === 403
        ? "authentication-header mismatch"
        : `HTTP ${statusClass(response.status)}`;
    return { status: "failed", detail: `${tokenResult.tokenStatus}; airport lookup failed (${category})`, headerUsed };
  }

  const body = await response.json().catch(() => null);
  const first = body && Array.isArray(body.results) ? body.results[0] : undefined;
  const schemaOk = Boolean(first && typeof first.iata === "string" && first.iata.toUpperCase() === "JFK");
  return {
    status: schemaOk ? "ready" : "failed",
    detail: `${tokenResult.tokenStatus}; airport HTTP ${statusClass(response.status)}, schema ${schemaOk ? "ok" : "unexpected"}`,
    headerUsed,
  };
}
