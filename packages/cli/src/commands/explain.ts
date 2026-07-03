import { Command } from "commander";
import { explainMatch } from "@skillsense/core";
import { createContext } from "../context.js";

export function registerExplainCommand(program: Command): void {
  program
    .command("explain <capability> <prompt>")
    .description("Explain why (or why not) a specific capability matches a prompt")
    .option("--json", "print machine-readable JSON output", false)
    .action((capability: string, prompt: string, opts: { json: boolean }) => {
      const { config, db } = createContext();
      const match = explainMatch(db, capability, prompt, config);

      if (!match) {
        console.error(`No indexed capability matches "${capability}". Run \`skillsense list\` to see what's indexed.`);
        process.exitCode = 1;
        return;
      }

      if (opts.json) {
        console.log(JSON.stringify(match, null, 2));
        return;
      }

      console.log(`${match.capability.name} vs "${prompt}"`);
      console.log(`Score: ${match.score.toFixed(2)}`);
      console.log(`Would recommend at default thresholds: ${match.score >= config.minScore ? "yes" : "no"}`);
      if (match.reasons.length > 0) {
        console.log("Reasons:");
        for (const reason of match.reasons) console.log(`  - ${reason}`);
      } else {
        console.log("Reasons: no strong signals found.");
      }
    });
}
