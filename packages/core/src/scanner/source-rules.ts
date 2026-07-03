import path from "node:path";
import type { CapabilitySource, CapabilityType } from "../types.js";

export type ParseKind = "skill-markdown" | "markdown" | "instruction" | "mcp-json" | "mcp-toml" | "hooks-json";

export interface SourceRule {
  id: string;
  globs: string[];
  source: CapabilitySource;
  defaultType: CapabilityType;
  kind: ParseKind;
}

/** Built-in capability sources per SkillSense spec section 10. cwd is the project root being scanned. */
export function builtinSourceRules(homeDir: string, cwd: string): SourceRule[] {
  const roots = [
    { root: homeDir, label: "global" },
    { root: cwd, label: "project" },
  ];

  const rules: SourceRule[] = [];

  for (const { root, label } of roots) {
    rules.push({
      id: `claude-skills-${label}`,
      globs: [
        path.join(root, ".claude/skills/**/SKILL.md"),
        path.join(root, ".claude/skills/*.md"),
      ],
      source: "claude",
      defaultType: "skill",
      kind: "skill-markdown",
    });
    rules.push({
      id: `claude-commands-${label}`,
      globs: [path.join(root, ".claude/commands/**/*.md")],
      source: "claude",
      defaultType: "command",
      kind: "markdown",
    });
    rules.push({
      id: `codex-skills-${label}`,
      globs: [
        path.join(root, ".codex/skills/**/SKILL.md"),
        path.join(root, ".codex/skills/*.md"),
      ],
      source: "codex",
      defaultType: "skill",
      kind: "skill-markdown",
    });
    rules.push({
      id: `codex-plugins-${label}`,
      globs: [path.join(root, ".codex/plugins/**/SKILL.md")],
      source: "codex",
      defaultType: "skill",
      kind: "skill-markdown",
    });
  }

  rules.push({
    id: "claude-md",
    globs: [path.join(cwd, "CLAUDE.md")],
    source: "claude",
    defaultType: "instruction_file",
    kind: "instruction",
  });
  rules.push({
    id: "claude-rules",
    globs: [path.join(cwd, ".claude/rules/**/*.md")],
    source: "claude",
    defaultType: "rule",
    kind: "markdown",
  });
  rules.push({
    id: "agents-md",
    globs: [path.join(cwd, "AGENTS.md")],
    source: "codex",
    defaultType: "instruction_file",
    kind: "instruction",
  });
  rules.push({
    id: "codex-config-toml",
    globs: [path.join(cwd, ".codex/config.toml")],
    source: "codex",
    defaultType: "mcp_server",
    kind: "mcp-toml",
  });
  rules.push({
    id: "codex-hooks-json",
    globs: [path.join(cwd, ".codex/hooks.json")],
    source: "codex",
    defaultType: "hook",
    kind: "hooks-json",
  });

  rules.push({
    id: "cursor-rules",
    globs: [path.join(cwd, ".cursor/rules/**/*.md")],
    source: "cursor",
    defaultType: "rule",
    kind: "markdown",
  });
  rules.push({
    id: "github-prompts",
    globs: [path.join(cwd, ".github/prompts/**/*.md")],
    source: "github",
    defaultType: "prompt_template",
    kind: "markdown",
  });
  rules.push({
    id: "generic-ai",
    globs: [path.join(cwd, ".ai/**/*.md")],
    source: "generic",
    defaultType: "unknown",
    kind: "markdown",
  });
  rules.push({
    id: "generic-llm",
    globs: [path.join(cwd, ".llm/**/*.md")],
    source: "generic",
    defaultType: "unknown",
    kind: "markdown",
  });
  rules.push({
    id: "generic-llmpress",
    globs: [path.join(cwd, ".llmpress/**/*.md")],
    source: "generic",
    defaultType: "unknown",
    kind: "markdown",
  });
  rules.push({
    id: "generic-docs-ai",
    globs: [path.join(cwd, "docs/ai/**/*.md")],
    source: "generic",
    defaultType: "unknown",
    kind: "markdown",
  });
  rules.push({
    id: "mcp-json",
    globs: [path.join(cwd, ".mcp.json")],
    source: "generic",
    defaultType: "mcp_server",
    kind: "mcp-json",
  });

  return rules;
}

/** A user-configured extra scanPath is treated generically: skill-style if it contains SKILL.md, else markdown. */
export function customPathRules(customPaths: string[]): SourceRule[] {
  return customPaths.map((root, i) => ({
    id: `custom-${i}`,
    globs: [path.join(root, "**/SKILL.md"), path.join(root, "**/*.md")],
    source: "custom" as CapabilitySource,
    defaultType: "unknown" as CapabilityType,
    kind: "skill-markdown" as ParseKind,
  }));
}
