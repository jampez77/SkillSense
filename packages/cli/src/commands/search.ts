import { Command } from "commander";
import { scoreAllCapabilities } from "@skillsense/core";
import { createContext } from "../context.js";

export function registerSearchCommand(program: Command): void {
  program
    .command("search <prompt>")
    .description("Manually score installed capabilities against a prompt (debug tool, ignores thresholds)")
    .option("--limit <n>", "max results to show", "10")
    .option("--json", "print machine-readable JSON output", false)
    .action((prompt: string, opts: { limit: string; json: boolean }) => {
      const { config, db } = createContext();
      const matches = scoreAllCapabilities(db, prompt, config).slice(0, Number(opts.limit));

      if (opts.json) {
        console.log(JSON.stringify(matches, null, 2));
        return;
      }

      if (matches.length === 0) {
        console.log("No capabilities indexed. Run `skillsense scan` first.");
        return;
      }

      matches.forEach((match, index) => {
        const scoreStr = match.score.toFixed(2);
        console.log(`${index + 1}. ${match.capability.name}    ${scoreStr}`);
        const reason = match.reasons.length > 0 ? match.reasons.join("; ") : "no strong signals";
        console.log(`   Reason: ${reason}.`);
        console.log("");
      });
    });
}
