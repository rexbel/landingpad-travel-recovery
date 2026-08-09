import { describe, expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");

async function read(relativePath: string) {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

async function listFilesRecursive(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return listFilesRecursive(full);
      return [full];
    }),
  );
  return files.flat();
}

describe("provider-preflight workflow stays manual and credential-scoped", () => {
  it("keeps workflow_dispatch as the only trigger", async () => {
    const source = await read(".github/workflows/provider-preflight.yml");
    expect(source).toMatch(/^on:\s*\n\s*workflow_dispatch:/m);
    expect(source).not.toMatch(/\bpush:\s*\n/);
    expect(source).not.toMatch(/\bpull_request:\s*\n/);
  });

  it("scopes permissions to contents: read", async () => {
    const source = await read(".github/workflows/provider-preflight.yml");
    expect(source).toMatch(/permissions:\s*\n\s*contents:\s*read/);
  });

  it("maps AeroXplorer secrets only in the aeroxplorer job, never in a run: string", async () => {
    const source = await read(".github/workflows/provider-preflight.yml");
    expect(source).toContain("AEROXPLORER_API_KEY: ${{ secrets.AEROXPLORER_API_KEY }}");
    expect(source).toContain("AEROXPLORER_API_SECRET: ${{ secrets.AEROXPLORER_API_SECRET }}");
    // No echo/printf of the secret expressions anywhere in the file.
    expect(source).not.toMatch(/echo.*secrets\.AEROXPLORER/);
    expect(source).not.toMatch(/printf.*secrets\.AEROXPLORER/);
  });

  it("declares a concurrency group to prevent simultaneous AeroXplorer token generation", async () => {
    const source = await read(".github/workflows/provider-preflight.yml");
    expect(source).toContain("concurrency:");
    expect(source).toContain("aeroxplorer-preflight-token");
  });

  it("gives the AeroXplorer job a job timeout and no artifact upload", async () => {
    const source = await read(".github/workflows/provider-preflight.yml");
    expect(source).toMatch(/verify-aeroxplorer:[\s\S]*?timeout-minutes:\s*\d+/);
    expect(source).not.toContain("actions/upload-artifact");
  });
});

describe("normal CI stays entirely credential-free", () => {
  it("ci.yml never references a repository secret", async () => {
    const source = await read(".github/workflows/ci.yml");
    expect(source).not.toContain("secrets.");
    expect(source).toMatch(/^on:\s*\n\s*pull_request:/m);
  });
});

describe("no AeroXplorer credential names leak into browser-facing code", () => {
  it("app/ and components/ never reference AEROXPLORER_API_KEY or AEROXPLORER_API_SECRET", async () => {
    const dirs = ["app", "components"];
    for (const dir of dirs) {
      const files = await listFilesRecursive(path.join(repoRoot, dir));
      for (const file of files) {
        const contents = await readFile(file, "utf8");
        expect(contents, `${file} must not reference AeroXplorer credentials`).not.toMatch(
          /AEROXPLORER_API_(KEY|SECRET)/,
        );
      }
    }
  });

  it("no NEXT_PUBLIC_ variable carries an AeroXplorer credential", async () => {
    const envExample = await read(".env.example");
    expect(envExample).not.toMatch(/NEXT_PUBLIC_.*AEROXPLORER/i);
  });
});

describe("AeroXplorer stays outside hotel eligibility logic", () => {
  it("the client component never imports the server-only AeroXplorer adapter directly", async () => {
    const source = await read("components/landingpad/landingpad-experience.tsx");
    expect(source).not.toMatch(/from ["']@\/lib\/aeroxplorer/);
    // It reaches AeroXplorer only through the API route, same as every other provider.
    expect(source).toContain("/api/aviation/context");
  });

  it("deterministic ranking and its request/response contracts never reference AeroXplorer or aviation data", async () => {
    const rankingSource = await read("lib/ai/ranking.ts");
    const contractsSource = await read("lib/ai/contracts.ts");
    for (const source of [rankingSource, contractsSource]) {
      expect(source.toLowerCase()).not.toContain("aeroxplorer");
      expect(source.toLowerCase()).not.toContain("aviation");
    }
  });

  it("AeroXplorer adapter modules guard against client-side execution", async () => {
    // Matches the repository's existing convention (lib/voice/elevenlabs.ts,
    // lib/ai/openai.ts) rather than the `server-only` package, which throws
    // unconditionally outside Next.js's server compiler — including in Vitest.
    for (const file of ["lib/aeroxplorer/token.ts", "lib/aeroxplorer/client.ts", "lib/aeroxplorer/normalize.ts"]) {
      const source = await read(file);
      expect(source).toContain('throw new Error("SERVER_ONLY_ADAPTER")');
    }
  });
});
