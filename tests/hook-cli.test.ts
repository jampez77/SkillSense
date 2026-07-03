import { describe, it, expect, beforeAll } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const CLI_ENTRY = path.join(REPO_ROOT, "packages", "cli", "dist", "index.js");
const FIXTURES_DIR = path.join(__dirname, "fixtures");

function runCli(args: string[], env: NodeJS.ProcessEnv, input?: string) {
  return spawnSync("node", [CLI_ENTRY, ...args], {
    env: { ...process.env, ...env },
    input,
    encoding: "utf-8",
  });
}

describe("CLI hook adapters (spawned end-to-end, matches spec section 26 acceptance criteria)", () => {
  let fakeHome: string;

  beforeAll(() => {
    if (!fs.existsSync(CLI_ENTRY)) {
      throw new Error(`CLI not built at ${CLI_ENTRY} — run \`npm run build\` first`);
    }
    fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), "skillsense-hook-cli-test-"));
    const scanResult = runCli(["scan", "--path", FIXTURES_DIR], { HOME: fakeHome });
    expect(scanResult.status).toBe(0);
  });

  it("hook claude emits plain-text recommendations for a matching prompt, and exits 0", () => {
    const payload = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "claude-user-prompt-submit.json"), "utf-8"));
    const result = runCli(["hook", "claude"], { HOME: fakeHome }, JSON.stringify(payload));

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("SkillSense:");
    expect(result.stdout).toContain("flutter-performance-review");
    expect(result.stdout.trim().split("\n")).toHaveLength(1);
  });

  it("hook claude emits nothing for a non-matching prompt, and still exits 0", () => {
    const payload = JSON.parse(
      fs.readFileSync(path.join(FIXTURES_DIR, "claude-user-prompt-submit-no-match.json"), "utf-8"),
    );
    const result = runCli(["hook", "claude"], { HOME: fakeHome }, JSON.stringify(payload));

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("");
  });

  it("hook codex emits hookSpecificOutput.additionalContext JSON for a matching prompt", () => {
    const payload = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "codex-user-prompt-submit.json"), "utf-8"));
    const result = runCli(["hook", "codex"], { HOME: fakeHome }, JSON.stringify(payload));

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.hookSpecificOutput.hookEventName).toBe("UserPromptSubmit");
    expect(parsed.hookSpecificOutput.additionalContext).toContain("home-assistant-integration-debugging");
  });

  it("hook codex emits nothing for a non-matching prompt", () => {
    const result = runCli(
      ["hook", "codex"],
      { HOME: fakeHome },
      JSON.stringify({ hook_event_name: "UserPromptSubmit", prompt: "what's a good banana bread recipe?", cwd: FIXTURES_DIR }),
    );
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("");
  });

  it("fails open (exit 0, empty stdout) on malformed JSON input", () => {
    const result = runCli(["hook", "claude"], { HOME: fakeHome }, "{not valid json");
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("");
  });

  it("fails open when no index exists at all", () => {
    const emptyHome = fs.mkdtempSync(path.join(os.tmpdir(), "skillsense-hook-cli-empty-"));
    const payload = JSON.stringify({ hook_event_name: "UserPromptSubmit", prompt_text: "anything", cwd: FIXTURES_DIR });
    const result = runCli(["hook", "claude"], { HOME: emptyHome }, payload);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("");
    fs.rmSync(emptyHome, { recursive: true, force: true });
  });
});
