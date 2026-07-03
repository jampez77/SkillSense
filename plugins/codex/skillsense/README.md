# SkillSense plugin for OpenAI Codex

Adds a `UserPromptSubmit` hook that checks your locally indexed AI capabilities against each
prompt and, only when something looks genuinely relevant, adds a short block of
`additionalContext` before Codex continues. Silent otherwise.

Like the Claude Code plugin, this does **not** bundle the SkillSense engine or your capability
index — it calls the `skillsense` binary on your `PATH`.

## Install

1. Install the SkillSense CLI globally:

   ```bash
   cd packages/cli   # from the skillsense repo root
   npm link          # or: npm install -g .
   skillsense --version
   ```

2. Build your local capability index at least once:

   ```bash
   skillsense scan
   ```

3. Install this plugin directory (`plugins/codex/skillsense`) per Codex's plugin install docs
   (pointing Codex at this directory, or a marketplace built from this repo).

4. **Trust the hook.** Codex requires you to explicitly review and trust any non-managed hook
   before it runs — including hooks bundled in a plugin. After installing the plugin, run:

   ```
   /hooks
   ```

   inside the Codex CLI, find the `skillsense hook codex` entry, review the exact command, and
   trust it. Codex re-flags the hook for review if its content ever changes. Until you trust it,
   Codex will skip it — SkillSense will simply have no effect (fail-open, never a hard error).

5. Verify with:

   ```bash
   skillsense doctor
   ```

## What it does on every prompt

`hooks/hooks.json` registers `skillsense hook codex` on `UserPromptSubmit`. The command reads the
hook payload (`prompt`, `cwd`, …) from stdin, scores your indexed capabilities locally (no network
calls, no LLM), and — only above a confidence threshold — prints:

```json
{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"..."}}
```

If nothing matches well, it prints nothing and exits 0. Any internal failure is swallowed the
same way — the hook always exits 0 so it can never block your prompt.

## Re-indexing

Run `skillsense scan` again whenever your skills/commands/rules change; the hook itself never
scans automatically (see the main README's "Auto-scan" section) to keep it fast.

## Privacy

Nothing here leaves your machine. See the root [README](../../../README.md#privacy) for details.
