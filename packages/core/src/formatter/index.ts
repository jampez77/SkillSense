import os from "node:os";
import type { CapabilityMatch, OutputPathMode } from "../types.js";

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

function describe(match: CapabilityMatch, options: FormatOptions): string {
  const cap = match.capability;
  const path = options.includePathsInOutput ? displayPath(cap.path, options.outputPathMode) : undefined;
  return path ? `${cap.name} (${path})` : cap.name;
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
