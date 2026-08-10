import { describe, expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");

// SVG/XML namespace declarations are identifier strings, not network
// references — xmlns="http://www.w3.org/2000/svg" never fetches anything.
// Strip only that exact declaration before scanning for real external URLs.
function stripXmlNamespaces(source: string): string {
  return source.replace(/xmlns(:\w+)?="https?:\/\/[^"]*"/g, "");
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

describe("brand and icon assets stay self-contained", () => {
  it("components/brand and components/icons never reference an external host", async () => {
    const dirs = ["components/brand", "components/icons"];
    for (const dir of dirs) {
      const files = await listFilesRecursive(path.join(repoRoot, dir));
      for (const file of files) {
        const contents = await readFile(file, "utf8");
        expect(stripXmlNamespaces(contents), `${file} must not reference http(s):// URLs`).not.toMatch(
          /https?:\/\//,
        );
      }
    }
  });

  it("app/icon.svg is inline markup with no external references", async () => {
    const contents = await readFile(path.join(repoRoot, "app/icon.svg"), "utf8");
    expect(stripXmlNamespaces(contents)).not.toMatch(/https?:\/\//);
    expect(contents).toMatch(/^<svg/);
  });

  it("brand primitives and icons carry no third-party dependency imports", async () => {
    const dirs = ["components/brand", "components/icons"];
    for (const dir of dirs) {
      const files = (await listFilesRecursive(path.join(repoRoot, dir))).filter((file) => file.endsWith(".tsx"));
      for (const file of files) {
        const contents = await readFile(file, "utf8");
        const importLines = contents.match(/^import .*/gm) ?? [];
        for (const line of importLines) {
          const isAllowed = /from "react"/.test(line) || /from "@\/components\//.test(line);
          expect(isAllowed, `${file} has an unexpected import: ${line}`).toBe(true);
        }
      }
    }
  });

  it("decorative SVGs default to aria-hidden and never both aria-hidden and an aria-label", async () => {
    const dirs = ["components/brand", "components/icons"];
    for (const dir of dirs) {
      const files = (await listFilesRecursive(path.join(repoRoot, dir))).filter((file) => file.endsWith(".tsx"));
      for (const file of files) {
        const contents = await readFile(file, "utf8");
        expect(contents, `${file} must not hardcode aria-hidden alongside an aria-label`).not.toMatch(
          /aria-hidden="true"[^>]*aria-label/,
        );
      }
    }
  });
});

describe("product icon family stays in sync", () => {
  it("exports exactly the thirteen documented icon names", async () => {
    const { ProductIcon } = await import("@/components/icons");
    expect(typeof ProductIcon).toBe("function");

    const contents = await readFile(path.join(repoRoot, "components/icons/index.tsx"), "utf8");
    const expectedNames = [
      "flight-disruption",
      "airport",
      "hotel",
      "ground-transport",
      "budget",
      "travelers",
      "room",
      "time-pressure",
      "advisor-handoff",
      "evidence-source",
      "user-confirmed",
      "historical-aviation-data",
      "recovery-completed",
    ];
    for (const name of expectedNames) {
      expect(contents, `missing icon definition for "${name}"`).toContain(`"${name}"`);
    }
  });
});
