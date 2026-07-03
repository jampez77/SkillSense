# SkillSense plugin for Claude Code

Adds a `UserPromptSubmit` hook that checks your locally indexed AI capabilities (skills,
commands, rules, instructions, MCP servers) against each prompt and — only when something looks
genuinely relevant — injects a short note before Claude processes it. Silent otherwise.

This plugin does **not** bundle the SkillSense engine or your capability index. It just calls the
`skillsense` binary that must already be installed and on your `PATH`.

## Install

1. Install the SkillSense CLI globally so the plugin's hook command can find it:

   ```bash
   cd packages/cli   # from the skillsense repo root
   npm link          # or: npm install -g .
   skillsense --version
   ```

2. Build your local capability index at least once:

   ```bash
   skillsense scan
   ```

3. Install this plugin directory (`plugins/claude/skillsense`) into Claude Code — either through
   a local plugin marketplace pointing at this repo, or by copying/symlinking this directory into
   your Claude Code plugins directory. See Claude Code's plugin docs for the exact install flow on
   your version, since plugin installation UX evolves independently of this project.

4. Verify the hook is wired up:

   ```bash
   skillsense doctor
   ```

## What it does on every prompt

`hooks/hooks.json` registers `skillsense hook claude` on `UserPromptSubmit`. The command:

- Reads the hook payload (`prompt_text`, `cwd`, …) from stdin.
- Scores your indexed capabilities against the prompt using a local, deterministic matcher (no
  network calls, no LLM).
- If nothing scores highly enough, it prints nothing and exits 0 — Claude sees no difference.
- If something matches well, it prints a short plain-text block naming the relevant
  capability/capabilities, why they matched, and their file paths, which Claude receives as
  additional context for that turn.

Any internal SkillSense failure (bad index, parse error, unexpected input) is swallowed — the
hook always exits 0 so it can never block or break your prompt.

## Re-indexing

Run `skillsense scan` again whenever you add/remove skills, commands, or rules. The hook itself
never scans automatically, to keep it fast and predictable — see the main README's
"Auto-scan" section.

## Privacy

Nothing here leaves your machine. See the root [README](../../../README.md#privacy) for details.
