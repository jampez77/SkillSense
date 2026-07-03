import { Command } from "commander";
import { listCapabilities } from "@skillsense/core";
import { createContext } from "../context.js";
import { sourceLabel, typeLabel } from "../labels.js";

export function registerListCommand(program: Command): void {
  program
    .command("list")
    .description("List indexed capabilities")
    .option("--source <source>", "filter by source (claude, codex, cursor, github, generic, custom)")
    .option("--type <type>", "filter by capability type")
    .option("--json", "print machine-readable JSON output", false)
    .action((opts: { source?: string; type?: string; json: boolean }) => {
      const { db } = createContext();
      const capabilities = listCapabilities(db, { source: opts.source, type: opts.type });

      if (opts.json) {
        console.log(JSON.stringify(capabilities, null, 2));
        return;
      }

      if (capabilities.length === 0) {
        console.log("No capabilities indexed. Run `skillsense scan` first.");
        return;
      }

      for (const cap of capabilities) {
        const flags = [!cap.enabled && "disabled", cap.priority === "high" && "pinned"]
          .filter(Boolean)
          .join(", ");
        const suffix = flags ? ` [${flags}]` : "";
        console.log(`- ${cap.name} (${typeLabel(cap.type)}, ${sourceLabel(cap.source)})${suffix}`);
        if (cap.description) console.log(`    ${cap.description}`);
        console.log(`    ${cap.path}`);
      }
      console.log(`\nTotal: ${capabilities.length}`);
    });
}
