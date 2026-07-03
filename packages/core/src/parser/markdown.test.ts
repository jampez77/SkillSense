import { describe, it, expect } from "vitest";
import { parseMarkdownCapability } from "./markdown.js";

const SKILL_MD = `---
name: flutter-performance-review
description: Use this when debugging Flutter jank, slow scrolling, excessive rebuilds, animation frame drops, or rendering performance issues.
tags:
  - flutter
  - performance
  - mobile
---

# Flutter Performance Review

Review widget rebuilds, list rendering, repaint boundaries, animation controllers, image loading, and profiling traces.
`;

describe("parseMarkdownCapability", () => {
  it("extracts frontmatter name, description, and tags", () => {
    const parsed = parseMarkdownCapability("/x/SKILL.md", SKILL_MD, "skill", true);
    expect(parsed.name).toBe("flutter-performance-review");
    expect(parsed.description).toContain("Flutter jank");
    expect(parsed.tags).toEqual(["flutter", "performance", "mobile"]);
    expect(parsed.type).toBe("skill");
    expect(parsed.enabled).toBe(true);
  });

  it("includes description terms in extracted keywords, not just body/headings", () => {
    const parsed = parseMarkdownCapability("/x/SKILL.md", SKILL_MD, "skill", true);
    expect(parsed.keywords).toContain("jank");
    expect(parsed.keywords).toContain("scrolling");
    expect(parsed.keywords).toContain("flutter");
  });

  it("falls back to the parent directory name when frontmatter has no name and the file is SKILL.md", () => {
    const content = "# A Skill\n\nNo frontmatter name here.";
    const parsed = parseMarkdownCapability("/skills/my-cool-skill/SKILL.md", content, "skill", true);
    expect(parsed.name).toBe("my-cool-skill");
  });

  it("falls back to the filename (without extension) for a plain markdown file", () => {
    const content = "# A Command\n\nDoes a thing.";
    const parsed = parseMarkdownCapability("/commands/do-thing.md", content, "command", false);
    expect(parsed.name).toBe("do-thing");
    expect(parsed.type).toBe("command");
  });

  it("respects frontmatter enabled: false", () => {
    const content = "---\nname: disabled-skill\nenabled: false\n---\nbody";
    const parsed = parseMarkdownCapability("/x/SKILL.md", content, "skill", true);
    expect(parsed.enabled).toBe(false);
  });

  it("extracts bullet examples from a heading containing 'example'", () => {
    const content = `---
name: has-examples
---
# Has Examples

## Examples

- "debug this flaky test"
- fix the failing CI build
`;
    const parsed = parseMarkdownCapability("/x/SKILL.md", content, "skill", true);
    expect(parsed.examples).toContain("debug this flaky test");
    expect(parsed.examples).toContain("fix the failing CI build");
  });
});
