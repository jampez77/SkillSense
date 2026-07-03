import { describe, it, expect, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openDb, scan, scoreAllCapabilities, defaultConfig } from "@skillsense/core";

const SKILL_COUNT = 1000;

function makeSyntheticProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skillsense-perf-test-"));
  const skillsDir = path.join(dir, ".claude", "skills");
  const topics = ["flutter", "react", "python", "rust", "kubernetes", "terraform", "graphql", "postgres"];

  for (let i = 0; i < SKILL_COUNT; i++) {
    const topic = topics[i % topics.length];
    const skillDir = path.join(skillsDir, `synthetic-skill-${i}`);
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(
      path.join(skillDir, "SKILL.md"),
      `---\nname: synthetic-skill-${i}\ndescription: Helps with ${topic} task number ${i}, covering debugging and performance tuning.\ntags:\n  - ${topic}\n  - generated\n---\n\n# Synthetic Skill ${i}\n\nBody text about ${topic} covering common issues and fixes.\n`,
    );
  }
  return dir;
}

describe("performance (spec section 22 targets)", () => {
  const dir = makeSyntheticProject();

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it(`scans ${SKILL_COUNT} small markdown files in under 5 seconds`, () => {
    const db = openDb(":memory:");
    const start = Date.now();
    const result = scan(db, { cwd: dir, homeDir: dir });
    const durationMs = Date.now() - start;

    expect(result.indexed).toBe(SKILL_COUNT);
    expect(durationMs).toBeLessThan(5000);
  });

  it("searches in well under the 250ms p95 hook budget with 1000 capabilities", () => {
    const db = openDb(":memory:");
    scan(db, { cwd: dir, homeDir: dir });
    const config = defaultConfig();

    const durations: number[] = [];
    for (let i = 0; i < 20; i++) {
      const start = Date.now();
      scoreAllCapabilities(db, "help me debug a flutter performance issue", config);
      durations.push(Date.now() - start);
    }
    durations.sort((a, b) => a - b);
    const p95 = durations[Math.floor(durations.length * 0.95)] ?? durations[durations.length - 1];
    expect(p95).toBeLessThan(250);
  });
});
