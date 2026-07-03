import { describe, it, expect } from "vitest";
import { parseInstructionFile } from "./instructions.js";

describe("parseInstructionFile", () => {
  it("derives name from filename and description from the first heading", () => {
    const content = "# Project conventions\n\nUse pnpm for everything.\n\n## Testing\n\nRun vitest.";
    const parsed = parseInstructionFile("/repo/CLAUDE.md", content, "instruction_file");
    expect(parsed.name).toBe("CLAUDE");
    expect(parsed.description).toBe("Project conventions");
    expect(parsed.type).toBe("instruction_file");
  });

  it("falls back to the first paragraph when there is no heading", () => {
    const content = "Just some plain instructions with no heading at all.";
    const parsed = parseInstructionFile("/repo/AGENTS.md", content, "instruction_file");
    expect(parsed.description).toContain("plain instructions");
  });

  it("extracts keywords from headings and repeated terms", () => {
    const content = "# Home Assistant integration\n\nConfig flows and coordinators need tests. Config flows are async.";
    const parsed = parseInstructionFile("/repo/AGENTS.md", content, "instruction_file");
    expect(parsed.keywords).toContain("config");
    expect(parsed.keywords).toContain("flows");
  });
});
