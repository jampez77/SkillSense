import { describe, it, expect } from "vitest";
import { formatRecommendationBody, formatClaudeHookOutput, formatCodexHookOutput } from "./index.js";
import type { Capability, CapabilityMatch } from "../types.js";

const options = { includePathsInOutput: true, outputPathMode: "full" as const };

function makeMatch(overrides: Partial<Capability> = {}): CapabilityMatch {
  const capability: Capability = {
    id: "cap-1",
    name: "flutter-performance-review",
    type: "skill",
    source: "claude",
    path: "/Users/x/.claude/skills/flutter-performance-review/SKILL.md",
    tags: [],
    keywords: [],
    examples: [],
    contentHash: "abc",
    lastIndexedAt: new Date().toISOString(),
    enabled: true,
    ...overrides,
  };
  return { capability, score: 0.9, confidence: "high", reasons: ["prompt mentions Flutter, jank, scrolling"] };
}

describe("formatRecommendationBody", () => {
  it("returns an empty string for no matches", () => {
    expect(formatRecommendationBody([], options)).toBe("");
  });

  it("never includes type, source, or reason text — the point is to be minimal", () => {
    const body = formatRecommendationBody([makeMatch()], options);
    expect(body.split("\n")).toHaveLength(1);
    expect(body).not.toContain("Type:");
    expect(body).not.toContain("Source:");
    expect(body).not.toContain("Reason:");
  });

  it("drops the name entirely when it's recoverable from the SKILL.md path (parent dir == name)", () => {
    // path's parent dir *is* "flutter-performance-review" — showing the name too would be pure duplication
    const body = formatRecommendationBody([makeMatch()], options);
    expect(body).toBe("SkillSense: relevant installed capability — /Users/x/.claude/skills/flutter-performance-review/SKILL.md");
  });

  it("drops the name when it's recoverable from a flat file's basename", () => {
    const flat = makeMatch({ name: "do-thing", path: "/Users/x/.claude/commands/do-thing.md" });
    const body = formatRecommendationBody([flat], options);
    expect(body).toBe("SkillSense: relevant installed capability — /Users/x/.claude/commands/do-thing.md");
  });

  it("keeps the name when it genuinely differs from the path (e.g. an MCP server in a shared config file)", () => {
    const mcp = makeMatch({ name: "github", type: "mcp_server", path: "/Users/x/project/.mcp.json" });
    const body = formatRecommendationBody([mcp], options);
    expect(body).toBe("SkillSense: relevant installed capability — github (/Users/x/project/.mcp.json)");
  });

  it("keeps the name when a skill's frontmatter name doesn't match its directory", () => {
    // mirrors the real fixture: dir is home-assistant-debugging, frontmatter name differs
    const skill = makeMatch({
      name: "home-assistant-integration-debugging",
      path: "/Users/x/.codex/skills/home-assistant-debugging/SKILL.md",
    });
    const body = formatRecommendationBody([skill], options);
    expect(body).toBe(
      "SkillSense: relevant installed capability — home-assistant-integration-debugging (/Users/x/.codex/skills/home-assistant-debugging/SKILL.md)",
    );
  });

  it("falls back to name alone when the path is suppressed", () => {
    const body = formatRecommendationBody([makeMatch()], { ...options, outputPathMode: "hidden" });
    expect(body).toBe("SkillSense: relevant installed capability — flutter-performance-review");
  });

  it("falls back to name alone when includePathsInOutput is false", () => {
    const body = formatRecommendationBody([makeMatch()], { ...options, includePathsInOutput: false });
    expect(body).toBe("SkillSense: relevant installed capability — flutter-performance-review");
  });

  it("defers to the user instead of picking one when there is more than one match", () => {
    const other = makeMatch({ id: "cap-2", name: "android-profiler-checklist", path: "/Users/x/.claude/skills/android/SKILL.md" });
    const body = formatRecommendationBody([makeMatch(), other], options);
    expect(body.split("\n")).toHaveLength(1);
    expect(body).toBe(
      "SkillSense: multiple relevant capabilities installed — ask the user which to use: " +
        "/Users/x/.claude/skills/flutter-performance-review/SKILL.md, " +
        "android-profiler-checklist (/Users/x/.claude/skills/android/SKILL.md)",
    );
  });
});

describe("formatClaudeHookOutput / formatCodexHookOutput", () => {
  it("claude output is the plain text body", () => {
    expect(formatClaudeHookOutput([makeMatch()], options)).toContain("flutter-performance-review");
  });

  it("codex output wraps the same body in hookSpecificOutput.additionalContext", () => {
    const output = formatCodexHookOutput([makeMatch()], options);
    expect(output?.hookSpecificOutput.hookEventName).toBe("UserPromptSubmit");
    expect(output?.hookSpecificOutput.additionalContext).toContain("flutter-performance-review");
  });

  it("codex output is null for no matches", () => {
    expect(formatCodexHookOutput([], options)).toBeNull();
  });
});
