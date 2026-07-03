import os from "node:os";
import type { CapabilityMatch, OutputPathMode } from "../types.js";

export interface FormatOptions {
  includePathsInOutput: boolean;
  includeReasonsInOutput: boolean;
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
 * Builds the shared recommendation body (spec section 18's preferred format). Both the Claude
 * plain-text hook and the Codex additionalContext JSON wrap this identical text.
 */
export function formatRecommendationBody(
  matches: CapabilityMatch[],
  options: FormatOptions,
): string {
  if (matches.length === 0) return "";

  const lines: string[] = [];
  lines.push("SkillSense capability recall:");
  lines.push("");
  lines.push("The following installed capabilities appear relevant to this prompt:");
  lines.push("");

  matches.forEach((match, index) => {
    const cap = match.capability;
    lines.push(`${index + 1}. ${cap.name}`);
    lines.push(`   Type: ${cap.type}`);
    lines.push(`   Source: ${cap.source}`);
    if (options.includeReasonsInOutput) {
      const reason = match.reasons.length > 0 ? match.reasons.join("; ") : "matched this prompt";
      lines.push(`   Reason: ${reason}`);
    }
    if (options.includePathsInOutput) {
      const p = displayPath(cap.path, options.outputPathMode);
      if (p) lines.push(`   Path: ${p}`);
    }
    lines.push("");
  });

  lines.push("Use these capabilities only if they are appropriate for the task.");
  return lines.join("\n");
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
