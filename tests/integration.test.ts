import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openDb, scan, scoreAllCapabilities, recommendForPrompt, defaultConfig, listCapabilities } from "@skillsense/core";
import type { Db, SkillSenseConfig } from "@skillsense/core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "fixtures");

describe("integration: scan + search over the fixture tree", () => {
  let db: Db;
  let config: SkillSenseConfig;

  beforeAll(() => {
    db = openDb(":memory:");
    config = defaultConfig();
    // --path semantics: scope both the "project" and "global" scan roots to the fixture tree so
    // the test never touches the real developer machine's ~/.claude or ~/.codex directories.
    scan(db, { cwd: FIXTURES_DIR, homeDir: FIXTURES_DIR });
  });

  it("indexes skills, instruction files, and rules from the fixture tree", () => {
    const all = listCapabilities(db);
    const names = all.map((c) => c.name);
    expect(names).toContain("flutter-performance-review");
    expect(names).toContain("github-pr-review");
    expect(names).toContain("home-assistant-integration-debugging");
    expect(all.some((c) => c.type === "instruction_file")).toBe(true);
    expect(all.some((c) => c.type === "rule" && c.source === "cursor")).toBe(true);
  });

  it("ranks the Flutter skill first for a Flutter-jank prompt", () => {
    const matches = scoreAllCapabilities(
      db,
      "Can you review this Flutter widget for performance issues, jank, and slow scrolling during rebuilds?",
      config,
    );
    expect(matches[0]?.capability.name).toBe("flutter-performance-review");
    expect(matches[0]?.reasons.length).toBeGreaterThan(0);
  });

  it("ranks the Home Assistant skill first for the section-30 example prompt", () => {
    const matches = scoreAllCapabilities(
      db,
      "Can you help fix this Home Assistant config flow? The login appears to have failed, error is probably transient because refreshing the integration fixes it.",
      config,
    );
    expect(matches[0]?.capability.name).toBe("home-assistant-integration-debugging");
  });

  it("recommends the Flutter skill above threshold for a clearly matching prompt", () => {
    const recommended = recommendForPrompt(
      db,
      "Can you review this Flutter widget for performance issues, jank, and slow scrolling during rebuilds?",
      config,
    );
    expect(recommended.length).toBeGreaterThan(0);
    expect(recommended[0]?.capability.name).toBe("flutter-performance-review");
  });

  it("recommends nothing for an unrelated prompt", () => {
    const recommended = recommendForPrompt(db, "What's a good recipe for banana bread?", config);
    expect(recommended).toEqual([]);
  });
});
