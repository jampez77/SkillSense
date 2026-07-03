import os from "node:os";
import nodePath from "node:path";
import type { Capability, CapabilityMatch, OutputPathMode } from "../types.js";

export interface FormatOptions {
  includePathsInOutput: boolean;
  outputPathMode: OutputPathMode;
}

function displayPath(absPath: string, mode: OutputPathMode): string | undefined {
  if (mode === "hidden") return undefined;
  if (mode === "relative") {
    const home = os.homedir();
    return absPath.startsWith(home) ? `~${absPath.slice(home.length)}` : absPath;
  }
  return absPath;
}

/**
 * True when a reader could recover the capability's name just by looking at its path (a SKILL.md
 * whose parent directory is the name, or a flat file whose basename is the name) — in that case
 * showing both is pure duplication. False for MCP servers/hooks, whose path points at a shared
 * config file (.mcp.json, .codex/hooks.json) that says nothing about which entry it is, and for
 * any capability whose frontmatter `name` was deliberately set to something other than its
 * filename/directory.
 */
function isNameRedundantWithPath(cap: Capability): boolean {
  const base = nodePath.basename(cap.path);
  const stem = base.toLowerCase() === "skill.md" ? nodePath.basename(nodePath.dirname(cap.path)) : nodePath.basename(cap.path, nodePath.extname(cap.path));
  return stem.toLowerCase() === cap.name.toLowerCase();
}

function describe(match: CapabilityMatch, options: FormatOptions): string {
  const cap = match.capability;
  const path = options.includePathsInOutput ? displayPath(cap.path, options.outputPathMode) : undefined;
  if (!path) return cap.name;
  return isNameRedundantWithPath(cap) ? path : `${cap.name} (${path})`;
}

/**
 * Builds the shared, deliberately minimal recommendation body — a single line, no matter what.
 * Both the Claude plain-text hook and the Codex additionalContext JSON wrap this identical text.
 *
 * One match: a bare nudge naming it. More than one: explicitly defers the choice to the user
 * instead of letting the agent silently pick — ambiguity between installed capabilities is a
 * decision for a human, not something to paper over with a longer explanation.
 */
export function formatRecommendationBody(
  matches: CapabilityMatch[],
  options: FormatOptions,
): string {
  if (matches.length === 0) return "";

  if (matches.length === 1) {
    return `SkillSense: relevant installed capability — ${describe(matches[0]!, options)}`;
  }

  const items = matches.map((m) => describe(m, options)).join(", ");
  return `SkillSense: multiple relevant capabilities installed — ask the user which to use: ${items}`;
}

export function formatClaudeHookOutput(matches: CapabilityMatch[], options: FormatOptions): string {
  return formatRecommendationBody(matches, options);
}

export interface CodexHookOutput {
  hookSpecificOutput: {
    hookEventName: "UserPromptSubmit";
    additionalContext: string;
  };
}

export function formatCodexHookOutput(
  matches: CapabilityMatch[],
  options: FormatOptions,
): CodexHookOutput | null {
  const body = formatRecommendationBody(matches, options);
  if (!body) return null;
  return {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: body,
    },
  };
}
