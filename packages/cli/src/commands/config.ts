import { Command } from "commander";
import { loadConfig, saveConfig, getConfigValue, setConfigValue, addScanPath, resolveConfigPath } from "@skillsense/core";

export function registerConfigCommand(program: Command): void {
  const configCmd = program.command("config").description("View and update SkillSense configuration");

  configCmd
    .command("get [key]")
    .description("Print the full config, or a single dotted key (e.g. minScore)")
    .action((key?: string) => {
      const config = loadConfig();
      if (!key) {
        console.log(JSON.stringify(config, null, 2));
        return;
      }
      const value = getConfigValue(config, key);
      if (value === undefined) {
        console.error(`Unknown config key: ${key}`);
        process.exitCode = 1;
        return;
      }
      console.log(typeof value === "string" ? value : JSON.stringify(value));
    });

  configCmd
    .command("set <key> <value>")
    .description("Set a dotted config key (e.g. `skillsense config set maxRecommendations 3`)")
    .action((key: string, value: string) => {
      const config = loadConfig();
      const updated = setConfigValue(config, key, value);
      saveConfig(updated);
      console.log(`Set ${key} = ${JSON.stringify(getConfigValue(updated, key))}`);
      console.log(`(saved to ${resolveConfigPath()})`);
    });

  configCmd
    .command("add-path <path>")
    .description("Add an extra directory to scanPaths")
    .action((newPath: string) => {
      const config = loadConfig();
      const updated = addScanPath(config, newPath);
      saveConfig(updated);
      console.log(`Added scan path: ${newPath}`);
      console.log(`(saved to ${resolveConfigPath()})`);
    });
}
