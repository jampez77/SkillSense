import { Command } from "commander";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadConfig, dbExists, resolveDbPath, resolveConfigPath, openDb, countCapabilities, expandHome } from "@skillsense/core";

interface CheckResult {
  label: string;
  ok: boolean;
  detail: string;
}

function findHookReference(searchDirs: string[], needle: string): string | undefined {
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    const candidates: string[] = [];
    const stack = [dir];
    let depth = 0;
    while (stack.length > 0 && depth < 5000) {
      depth++;
      const current = stack.pop();
      if (!current) break;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(current, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith(".git")) {
          stack.push(full);
        } else if (entry.isFile() && (entry.name.endsWith(".json") || entry.name === "config.toml")) {
          candidates.push(full);
        }
      }
    }
    for (const file of candidates) {
      try {
        if (fs.readFileSync(file, "utf-8").includes(needle)) return file;
      } catch {
        continue;
      }
    }
  }
  return undefined;
}

function checkBinaryOnPath(): CheckResult {
  const result = spawnSync("skillsense", ["--version"], { encoding: "utf-8" });
  if (result.error || result.status !== 0) {
    return { label: "binary is on PATH", ok: false, detail: "`skillsense` not found on PATH — run `npm link` in packages/cli" };
  }
  return { label: "binary is on PATH", ok: true, detail: result.stdout.trim() };
}

function checkHookExecutes(platform: "claude" | "codex"): CheckResult {
  const payload = JSON.stringify({ hook_event_name: "UserPromptSubmit", prompt: "", prompt_text: "", cwd: process.cwd() });
  const result = spawnSync("skillsense", ["hook", platform], { input: payload, encoding: "utf-8" });
  const ok = !result.error && result.status === 0;
  return {
    label: `hook ${platform} can execute`,
    ok,
    detail: ok ? "exited 0" : `exit code ${result.status ?? "unknown"}: ${result.error?.message ?? ""}`,
  };
}

export function registerDoctorCommand(program: Command): void {
  program
    .command("doctor")
    .description("Validate the SkillSense install state")
    .action(() => {
      const checks: CheckResult[] = [];
      const config = loadConfig();
      const dbPath = resolveDbPath();

      const hasDb = dbExists(dbPath);
      checks.push({ label: "database exists", ok: hasDb, detail: dbPath });

      if (hasDb) {
        const db = openDb(dbPath);
        const count = countCapabilities(db);
        checks.push({
          label: "index is not empty",
          ok: count > 0,
          detail: `${count} capabilities indexed`,
        });
      } else {
        checks.push({ label: "index is not empty", ok: false, detail: "no database yet — run `skillsense scan`" });
      }

      const configFileExists = fs.existsSync(resolveConfigPath());
      checks.push({
        label: "config file",
        ok: true, // missing is a valid state — defaults apply — so this is informational, not a failure
        detail: configFileExists ? resolveConfigPath() : `${resolveConfigPath()} (not present — using defaults)`,
      });

      const home = os.homedir();
      const claudeSearchDirs = [
        path.join(home, ".claude", "plugins"),
        path.join(home, ".claude", "settings.json"),
        path.join(process.cwd(), ".claude"),
      ];
      const claudeHookFile = findHookReference(claudeSearchDirs, "skillsense hook claude");
      checks.push({
        label: "Claude hook installed",
        ok: Boolean(claudeHookFile),
        detail: claudeHookFile ?? "not detected — see plugins/claude/skillsense/README.md",
      });

      const codexSearchDirs = [
        path.join(home, ".codex", "plugins"),
        path.join(home, ".codex"),
        path.join(process.cwd(), ".codex"),
      ];
      const codexHookFile = findHookReference(codexSearchDirs, "skillsense hook codex");
      checks.push({
        label: "Codex hook installed",
        ok: Boolean(codexHookFile),
        detail: codexHookFile ?? "not detected — see plugins/codex/skillsense/README.md",
      });

      checks.push(checkBinaryOnPath());
      checks.push(checkHookExecutes("claude"));
      checks.push(checkHookExecutes("codex"));

      const missingScanPaths = config.scanPaths.map(expandHome).filter((p) => !fs.existsSync(p));
      checks.push({
        label: "configured scan paths exist",
        ok: missingScanPaths.length === 0,
        detail: missingScanPaths.length === 0 ? "all present" : `missing: ${missingScanPaths.join(", ")}`,
      });

      console.log("SkillSense doctor\n");
      for (const check of checks) {
        console.log(`[${check.ok ? "ok" : "!!"}] ${check.label} — ${check.detail}`);
      }

      const failed = checks.filter((c) => !c.ok);
      console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);
      if (failed.length > 0) process.exitCode = 1;
    });
}
