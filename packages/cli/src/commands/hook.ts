import { Command } from "commander";
import {
  loadConfig,
  openDb,
  dbExists,
  resolveDbPath,
  recommendForPrompt,
  recordUsageEvent,
  hashPrompt,
  formatClaudeHookOutput,
  formatCodexHookOutput,
  type SkillSenseConfig,
} from "@skillsense/core";
import { readStdin } from "../stdin.js";
import { log } from "../logger.js";

type Platform = "claude" | "codex";

function extractPrompt(platform: Platform, payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const record = payload as Record<string, unknown>;
  const field = platform === "claude" ? record.prompt_text : record.prompt;
  return typeof field === "string" ? field : undefined;
}

/**
 * The hook must never break the user's prompt flow (spec section 15/21): any failure at any
 * stage silently exits 0 with empty stdout. Debug detail (if enabled) goes only to the log file.
 */
async function runHook(platform: Platform): Promise<void> {
  let config: SkillSenseConfig;
  try {
    config = loadConfig();
  } catch {
    return;
  }

  try {
    if (!dbExists(resolveDbPath())) {
      log(config, "debug", `hook ${platform}: no index found, staying silent`);
      return;
    }

    const raw = await readStdin();
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch (err) {
      log(config, "debug", `hook ${platform}: failed to parse stdin JSON: ${String(err)}`);
      return;
    }

    const prompt = extractPrompt(platform, payload);
    if (!prompt || prompt.trim() === "") {
      log(config, "debug", `hook ${platform}: no prompt field found in payload`);
      return;
    }

    const db = openDb(resolveDbPath());
    const matches = recommendForPrompt(db, prompt, config);

    if (matches.length === 0) {
      log(config, "debug", `hook ${platform}: no matches above threshold`);
      return;
    }

    for (const match of matches) {
      recordUsageEvent(db, {
        capabilityId: match.capability.id,
        eventType: "recommended",
        promptHash: config.logging.logPromptText ? undefined : hashPrompt(prompt),
        score: match.score,
      });
    }

    const formatOptions = {
      includePathsInOutput: config.includePathsInOutput,
      includeReasonsInOutput: config.includeReasonsInOutput,
      outputPathMode: config.outputPathMode,
    };

    if (platform === "claude") {
      const text = formatClaudeHookOutput(matches, formatOptions);
      if (text) process.stdout.write(text + "\n");
    } else {
      const output = formatCodexHookOutput(matches, formatOptions);
      if (output) process.stdout.write(JSON.stringify(output) + "\n");
    }
  } catch (err) {
    try {
      log(config, "error", `hook ${platform}: unexpected error: ${String(err)}`);
    } catch {
      // never let logging failures surface either
    }
  }
}

export function registerHookCommand(program: Command): void {
  const hook = program.command("hook").description("Hook adapters for AI coding agent lifecycle events");

  hook
    .command("claude")
    .description("Read a Claude Code UserPromptSubmit payload from stdin, emit plain-text context")
    .action(async () => {
      await runHook("claude");
      process.exitCode = 0;
    });

  hook
    .command("codex")
    .description("Read a Codex UserPromptSubmit payload from stdin, emit hookSpecificOutput JSON")
    .action(async () => {
      await runHook("codex");
      process.exitCode = 0;
    });
}
