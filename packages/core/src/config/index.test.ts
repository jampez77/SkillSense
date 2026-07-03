import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig, saveConfig, defaultConfig, getConfigValue, setConfigValue, addScanPath } from "./index.js";

const tmpFiles: string[] = [];
function tmpConfigPath(): string {
  const p = path.join(os.tmpdir(), `skillsense-config-test-${Math.random().toString(36).slice(2)}.yaml`);
  tmpFiles.push(p);
  return p;
}

afterEach(() => {
  for (const f of tmpFiles.splice(0)) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
});

describe("config", () => {
  it("returns sensible defaults when no file exists", () => {
    const config = loadConfig(tmpConfigPath());
    expect(config.minScore).toBe(0.75);
    expect(config.maxRecommendations).toBe(3);
    expect(config.outputPathMode).toBe("relative");
  });

  it("round-trips through save/load", () => {
    const p = tmpConfigPath();
    const config = defaultConfig();
    saveConfig({ ...config, minScore: 0.6 }, p);
    const loaded = loadConfig(p);
    expect(loaded.minScore).toBe(0.6);
  });

  it("falls back to defaults if the config file is malformed", () => {
    const p = tmpConfigPath();
    fs.writeFileSync(p, "not: valid: yaml: [", "utf-8");
    const loaded = loadConfig(p);
    expect(loaded.minScore).toBe(0.75);
  });

  it("gets and sets dotted keys", () => {
    const config = defaultConfig();
    const updated = setConfigValue(config, "maxRecommendations", "4");
    expect(getConfigValue(updated, "maxRecommendations")).toBe(4);
    const nested = setConfigValue(config, "autoScan.enabled", "false");
    expect(getConfigValue(nested, "autoScan.enabled")).toBe(false);
  });

  it("adds a scan path without duplicating it", () => {
    const config = defaultConfig();
    const once = addScanPath(config, "~/shared-skills");
    const twice = addScanPath(once, "~/shared-skills");
    expect(twice.scanPaths).toEqual(["~/shared-skills"]);
  });
});
