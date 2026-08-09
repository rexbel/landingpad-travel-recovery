import { describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";

const run = promisify(execFile);

// This suite intentionally never passes --live: doing so would perform a real
// network request to Stay22 (which supports keyless demo mode), and live
// provider calls require separate, explicit authorization.
describe("integration preflight script", () => {
  it("contacts no provider by default and reports configuration status only", async () => {
    const env = { ...process.env };
    delete env.STAY22_API_KEY;
    delete env.ELEVENLABS_API_KEY;
    delete env.ELEVENLABS_AGENT_ID;
    delete env.TAVILY_API_KEY;
    delete env.OPENAI_API_KEY;

    const { stdout } = await run("node", ["scripts/integration-preflight.mjs"], {
      cwd: process.cwd(),
      timeout: 5_000,
      env,
    });

    expect(stdout).toMatch(/offline mode/i);
    expect(stdout).not.toMatch(/'ready'|'failed'/);
    expect(stdout).toContain("'configured'");
    expect(stdout).toContain("'not configured'");
  }, 8_000);

  it("gates every connectivity check behind an explicit --live flag", async () => {
    const source = await readFile("scripts/integration-preflight.mjs", "utf8");
    expect(source).toContain('process.argv.includes("--live")');
    expect(source).toContain("offline mode — pass --live to test connectivity");
  });
});
