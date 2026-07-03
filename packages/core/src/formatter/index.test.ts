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

  it("is a single compact line naming the capability and its path for one match", () => {
    const body = formatRecommendationBody([makeMatch()], options);
    expect(body.split("\n")).toHaveLength(1);
    expect(body).toContain("flutter-performance-review");
    expect(body).toContain("/Users/x/.claude/skills/flutter-performance-review/SKILL.md");
  });

  it("never includes type, source, or reason text — the point is to be minimal", () => {
    const body = formatRecommendationBody([makeMatch()], options);
    expect(body).not.toContain("Type:");
    expect(body).not.toContain("Source:");
    expect(body).not.toContain("Reason:");
  });

  it("omits the path when outputPathMode is hidden", () => {
    const body = formatRecommendationBody([makeMatch()], { ...options, outputPathMode: "hidden" });
    expect(body).not.toContain(".claude/skills");
  });

  it("omits the path when includePathsInOutput is false", () => {
    const body = formatRecommendationBody([makeMatch()], { ...options, includePathsInOutput: false });
    expect(body).not.toContain(".claude/skills");
  });

  it("defers to the user instead of picking one when there is more than one match", () => {
    const other = makeMatch({ id: "cap-2", name: "android-profiler-checklist", path: "/Users/x/.claude/skills/android/SKILL.md" });
    const body = formatRecommendationBody([makeMatch(), other], options);
    expect(body.split("\n")).toHaveLength(1);
    expect(body).toContain("ask the user which to use");
    expect(body).toContain("flutter-performance-review");
    expect(body).toContain("android-profiler-checklist");
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
