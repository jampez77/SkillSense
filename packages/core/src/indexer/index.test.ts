import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openDb } from "../storage/db.js";
import { listCapabilities } from "../storage/capabilities.js";
import { scan } from "./index.js";

const tmpDirs: string[] = [];
function makeTmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skillsense-indexer-test-"));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, ".claude", "skills", "my-skill"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, ".claude", "skills", "my-skill", "SKILL.md"),
    "---\nname: my-skill\ndescription: Does a thing.\ntags:\n  - foo\n---\n\n# My Skill\n\nBody text.\n",
  );
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("scan (indexer)", () => {
  it("discovers and indexes a SKILL.md fixture", () => {
    const dir = makeTmpProject();
    const db = openDb(":memory:");
    const result = scan(db, { cwd: dir, homeDir: dir });

    expect(result.indexed).toBe(1);
    const [capability] = listCapabilities(db);
    expect(capability?.name).toBe("my-skill");
    expect(capability?.contentHash).toHaveLength(64);
    expect(capability?.id).toHaveLength(16);
  });

  it("produces a stable id across rescans of the same file", () => {
    const dir = makeTmpProject();
    const db = openDb(":memory:");
    scan(db, { cwd: dir, homeDir: dir });
    const [first] = listCapabilities(db);
    scan(db, { cwd: dir, homeDir: dir });
    const [second] = listCapabilities(db);
    expect(second?.id).toBe(first?.id);
  });

  it("removes capabilities whose file was deleted from a rescanned root", () => {
    const dir = makeTmpProject();
    const db = openDb(":memory:");
    scan(db, { cwd: dir, homeDir: dir });
    expect(listCapabilities(db)).toHaveLength(1);

    fs.rmSync(path.join(dir, ".claude", "skills", "my-skill"), { recursive: true, force: true });
    scan(db, { cwd: dir, homeDir: dir });
    expect(listCapabilities(db)).toHaveLength(0);
  });

  it("changes the content hash when the file content changes", () => {
    const dir = makeTmpProject();
    const db = openDb(":memory:");
    scan(db, { cwd: dir, homeDir: dir });
    const [before] = listCapabilities(db);

    fs.writeFileSync(
      path.join(dir, ".claude", "skills", "my-skill", "SKILL.md"),
      "---\nname: my-skill\ndescription: Does a different thing now.\n---\n\nNew body.\n",
    );
    scan(db, { cwd: dir, homeDir: dir });
    const [after] = listCapabilities(db);
    expect(after?.contentHash).not.toBe(before?.contentHash);
  });
});
