---
name: skillsense
description: Local, deterministic capability-recall engine for Claude Code and Codex. Before a prompt is processed, it scores your already-installed skills, commands, agents, MCP servers, and project rules against it, and silently nudges the agent toward a strong match — so installed capabilities actually get reused instead of reinvented.
tags:
  - claude-code
  - codex
  - agent-skills
  - hooks
  - developer-tools
---

# SkillSense

SkillSense hooks into Claude Code's and Codex's `UserPromptSubmit` lifecycle event. On every
prompt it scans your locally indexed skills, commands, agents, MCP servers, and rule files
(`CLAUDE.md`, `AGENTS.md`, `.cursor/rules`, etc.), scores them against the prompt with a fast
local matcher (lexical overlap + BM25 + example-prompt similarity — no LLM, no embeddings, no
network call), and injects a single-line nudge naming the best match when it scores highly enough.
Below threshold, it stays silent.

## When to use

Reach for SkillSense once you've accumulated enough skills, commands, and MCP servers that you
(or the agent) start forgetting what's already installed — the common failure mode being that a
relevant capability exists but never gets picked, so you get a weaker answer or the workflow gets
reinvented by hand. It's most useful as your capability count grows past what Claude Code's
built-in implicit-activation budget (~1% of context) can reliably hold without truncating.

SkillSense is a meta-tool: it doesn't perform tasks itself, it makes your *other* installed
capabilities more likely to be recalled at the right moment.

## Instructions

1. Confirm Node.js 22.5+ (24+ recommended) is available.
2. Clone and build:
   ```bash
   git clone https://github.com/jampez77/SkillSense.git
   cd SkillSense
   npm install && npm run build
   cd packages/cli && npm link   # puts `skillsense` on PATH
   ```
3. Index installed capabilities: `skillsense scan`
4. Install the plugin for your platform:
   - Claude Code: install `plugins/claude/skillsense` (see its README for local dev marketplace
     setup)
   - Codex: install `plugins/codex/skillsense`, then run `/hooks` in Codex to trust it
5. Confirm the install is healthy: `skillsense doctor`
6. Re-run `skillsense scan` whenever installed capabilities change — the hook itself never
   triggers a scan, to keep every prompt fast and predictable.

Useful commands while working with it: `skillsense list` (see what's indexed),
`skillsense search "<prompt>"` (manually test the matcher, ignoring thresholds), and
`skillsense explain <capability> "<prompt>"` (see why something did or didn't match). Full
reference: [README.md](README.md).
