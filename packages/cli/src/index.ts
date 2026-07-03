#!/usr/bin/env node
import { Command } from "commander";
import { VERSION } from "@skillsense/core";
import { registerScanCommand } from "./commands/scan.js";
import { registerListCommand } from "./commands/list.js";
import { registerSearchCommand } from "./commands/search.js";
import { registerExplainCommand } from "./commands/explain.js";
import { registerHookCommand } from "./commands/hook.js";
import { registerDoctorCommand } from "./commands/doctor.js";
import { registerConfigCommand } from "./commands/config.js";

const program = new Command();

program
  .name("skillsense")
  .description("Local capability-recall engine for AI coding agents")
  .version(VERSION);

registerScanCommand(program);
registerListCommand(program);
registerSearchCommand(program);
registerExplainCommand(program);
registerHookCommand(program);
registerDoctorCommand(program);
registerConfigCommand(program);

program.parseAsync(process.argv);
