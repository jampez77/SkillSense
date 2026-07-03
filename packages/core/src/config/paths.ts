import os from "node:os";
import path from "node:path";
import fs from "node:fs";

function macAppSupportDir(appName: string): string {
  return path.join(os.homedir(), "Library", "Application Support", appName);
}

function macLogDir(appName: string): string {
  return path.join(os.homedir(), "Library", "Logs", appName);
}

export function resolveConfigPath(): string {
  const envPath = process.env.SKILLSENSE_CONFIG;
  if (envPath) return envPath;

  const xdgPath = path.join(os.homedir(), ".config", "skillsense", "config.yaml");
  if (fs.existsSync(xdgPath)) return xdgPath;

  if (process.platform === "darwin") {
    const macPath = path.join(macAppSupportDir("skillsense"), "config.yaml");
    if (fs.existsSync(macPath)) return macPath;
  }

  return xdgPath;
}

export function resolveStateDir(): string {
  if (process.platform === "darwin") {
    return macAppSupportDir("skillsense");
  }
  return path.join(os.homedir(), ".local", "state", "skillsense");
}

export function resolveDbPath(): string {
  return path.join(resolveStateDir(), "skillsense.db");
}

export function resolveLogPath(): string {
  if (process.platform === "darwin") {
    return path.join(macLogDir("skillsense"), "skillsense.log");
  }
  return path.join(resolveStateDir(), "skillsense.log");
}

export function expandHome(p: string): string {
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

export function ensureDirFor(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}
