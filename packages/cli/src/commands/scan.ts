import { Command } from "commander";
import path from "node:path";
import { scan, countCapabilities } from "@skillsense/core";
import { createContext } from "../context.js";
import { sourceTypeLine } from "../labels.js";

export function registerScanCommand(program: Command): void {
  program
    .command("scan")
    .description("Scan configured locations and build/update the capability index")
    .option("--path <path>", "scan only this directory tree instead of the current project + home dir")
    .option("--verbose", "print each file as it is indexed", false)
    .option("--json", "print machine-readable JSON output", false)
    .action((opts: { path?: string; verbose: boolean; json: boolean }) => {
      const { config, db } = createContext();
      const scopedRoot = opts.path ? path.resolve(opts.path) : undefined;

      const result = scan(db, {
        cwd: scopedRoot ?? process.cwd(),
        homeDir: scopedRoot,
        extraScanPaths: config.scanPaths,
        onFile: opts.verbose ? (p) => console.log(`  indexed: ${p}`) : undefined,
      });

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log("SkillSense scan complete.\n");
      const entries = Object.entries(result.bySourceType).sort((a, b) => b[1] - a[1]);
      if (entries.length > 0) {
        console.log("Indexed:");
        for (const [key, count] of entries) {
          console.log(`- ${sourceTypeLine(key, count)}`);
        }
        console.log("");
      }
      console.log(`Total capabilities: ${countCapabilities(db)}`);
      if (result.durationMs > 0) {
        console.log(`(scanned ${result.scanned} files in ${result.durationMs}ms)`);
      }
    });
}
