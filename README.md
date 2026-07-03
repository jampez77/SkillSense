```text
███████╗██╗  ██╗██╗██╗     ██╗     ███████╗███████╗███╗   ██╗███████╗███████╗
██╔════╝██║ ██╔╝██║██║     ██║     ██╔════╝██╔════╝████╗  ██║██╔════╝██╔════╝
███████╗█████╔╝ ██║██║     ██║     ███████╗█████╗  ██╔██╗ ██║███████╗█████╗
╚════██║██╔═██╗ ██║██║     ██║     ╚════██║██╔══╝  ██║╚██╗██║╚════██║██╔══╝
███████║██║  ██╗██║███████╗███████╗███████║███████╗██║ ╚████║███████║███████╗
╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═══╝╚══════╝╚══════╝
```

<p align="center">
<strong>A local, deterministic capability-recall engine for AI coding agents.</strong>
<br><br>

![Node](https://img.shields.io/badge/node-%3E%3D22.5-339933?logo=node.js&logoColor=white)
![Local First](https://img.shields.io/badge/local--first-no%20network%20calls-2ea44f)
![No API Key](https://img.shields.io/badge/API%20key-not%20required-blue)
![Deterministic](https://img.shields.io/badge/matching-deterministic%2C%20no%20LLM-6f42c1)
![Status](https://img.shields.io/badge/status-MVP-orange)

</p>

---

SkillSense sits *beside* Claude Code and OpenAI Codex — it never replaces them — and quietly
reminds them what you've already installed, right before they process each prompt.

<br>

<details open>
<summary><strong>Contents</strong></summary>

- [What it does](#what-it-does)
- [At a glance](#at-a-glance)
- [Why it exists](#why-it-exists)
- [The built-in mechanism has limits too](#the-built-in-mechanism-has-limits-too)
- [How it works](#how-it-works)
- [Supported agents](#supported-agents)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Claude Code setup](#claude-code-setup)
- [Codex setup](#codex-setup)
- [Configuration](#configuration)
- [Commands](#commands)
- [Privacy](#privacy)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Roadmap](#roadmap)

</details>

<br>

## What it does

Before your prompt reaches Claude Code or Codex, SkillSense:

1. **Looks up** your locally indexed skills, commands, agents, MCP servers, project rules, and
   instruction files.
2. **Scores** them against your prompt with a fast, local, deterministic matcher — no LLM, no
   network call.
3. **Injects** a short, factual note naming the relevant capability, why it matched, and where it
   lives — but only when something scores highly enough.
4. **Stays silent** otherwise. No noise, no nagging.

<br>

## At a glance

The injected nudge is deliberately a single line — just enough for the agent to act on, nothing
more. It also skips the capability's name entirely when it's already obvious from the path (a
`SKILL.md` whose parent directory *is* the name), and only spells it out when it isn't — e.g. an
MCP server living in a shared `.mcp.json`, or a skill whose frontmatter name doesn't match its
directory. When exactly one capability matches:

```text
You ask:
  "Can you help fix this Home Assistant config flow? The login appears to have
   failed, probably transient, refreshing the integration fixes it."

SkillSense quietly adds:
  SkillSense: relevant installed capability — ~/.codex/skills/home-assistant-integration-debugging
```

When more than one capability matches, SkillSense doesn't guess on your behalf — it hands the
choice to you (name shown only where the path alone wouldn't be enough):

```text
SkillSense quietly adds:
  SkillSense: multiple relevant capabilities installed — ask the user which to use:
  ~/.claude/skills/flutter-performance-review,
  android-profiler-checklist (~/Development/shared-skills/android-profiler)
```

Either way it's one line, and it's silent when nothing matches well.

<br>

## Why it exists

As you install more skills, commands, agents, and MCP servers, you inevitably forget what's
already there. The common failure mode:

```
you ask the agent to do a task
  └─ a relevant installed skill already exists
       └─ the agent doesn't select it
            └─ you get a weaker answer, or reinvent the workflow by hand
```

The problem isn't skill *execution* — it's skill *recall*. Both Claude Code and Codex already
support **implicit activation**: a skill's name, description, and "when to use" text are always
loaded into context (the full body loads only on invocation), and the model can decide to use it
on its own, no `/skill-name` required. SkillSense doesn't invent that mechanism — it makes it more
reliable. The more skills, commands, and rules you accumulate, the more metadata the model has to
silently scan and pick correctly from on every single turn, with nothing external nudging it
toward the right one. SkillSense answers one question, automatically, on every prompt:

> **"Before this prompt is processed, are there any installed capabilities that appear materially
> relevant?"**

<br>

## The built-in mechanism has limits too

Claude Code's own implicit-activation isn't free or infinite — it's worth knowing the actual
constraints, since they're exactly why this gets less reliable as you install more:

- **It's budgeted, not unbounded.** Skill descriptions loaded into context are capped at roughly
  **1% of the model's context window**, measured in characters. Run `/context` in a session to
  see the actual "Skills" row size. Once you're past that budget, Claude Code starts truncating or
  dropping the least-used skills rather than sending everything.
- **You can tune or disable it yourself**, at several levels:

  | Scope | How |
  | --- | --- |
  | One skill, fully | `disable-model-invocation: true` in that skill's frontmatter — removes it from context; only invocable via explicit `/skill-name` afterward |
  | One skill, name-only | `skillOverrides` set to `"name-only"` — keeps the name in context, drops the description, to save budget |
  | One skill, hard off | `skillOverrides` set to `"off"` |
  | Claude Code's bundled skills | `disableBundledSkills` setting |
  | A whole plugin | `claude plugin disable <name>` |

There's no single "turn off all implicit skill scanning" switch — the character budget is the
built-in throttle instead. The practical takeaway: once you're past that budget and skills start
getting truncated, the model has *less* to go on for implicit recall, not more — which is exactly
the situation SkillSense's explicit, scored nudge is meant to help with.

<br>

## How it works

SkillSense hooks into each platform's `UserPromptSubmit` lifecycle event:

```text
prompt submitted
  → UserPromptSubmit hook fires
  → skillsense hook claude|codex reads the payload from stdin
  → scores your local capability index against the prompt (weighted lexical matching, see below)
  → above threshold: prints a short recommendation block
  → below threshold: prints nothing
  → exits 0 either way — a SkillSense failure can never block your prompt
```

Matching is entirely local and deterministic: name/tag/keyword overlap, BM25 over descriptions,
and example-prompt similarity, combined into a single 0–1 score. See
[`packages/core/src/matcher/score.ts`](packages/core/src/matcher/score.ts) for the exact formula.
No LLM, no embeddings, no API key, in this version.

<br>

## Supported agents

| Agent | Integration |
| --- | --- |
| **Claude Code** | Plugin hook — [`plugins/claude/skillsense`](plugins/claude/skillsense) |
| **OpenAI Codex** | Plugin hook — [`plugins/codex/skillsense`](plugins/codex/skillsense) |

---

## Installation

Requires **Node.js 22.5+** (24+ recommended). SkillSense uses Node's built-in `node:sqlite`
module for local storage — no native compilation, no extra runtime dependency.

```bash
git clone <this repo>
cd skillsense
npm install
npm run build
cd packages/cli
npm link          # puts `skillsense` on your PATH
skillsense --version
```

<br>

## Quick start

```bash
skillsense scan                          # index your installed capabilities
skillsense list                          # see what got indexed
skillsense search "debug flutter jank"   # manually test the matcher
skillsense doctor                        # check the install is healthy
```

<br>

## Claude Code setup

1. Make sure `skillsense` is on your `PATH` (see [Installation](#installation)) and you've run
   `skillsense scan` at least once.
2. Install the plugin at `plugins/claude/skillsense` into Claude Code. See
   [`plugins/claude/skillsense/README.md`](plugins/claude/skillsense/README.md) for details,
   including how to register it as a local dev marketplace for testing.
3. Run `skillsense doctor` to confirm the hook is wired up.

<br>

## Codex setup

1. Same PATH + `skillsense scan` prerequisite as above.
2. Install the plugin at `plugins/codex/skillsense`. Codex requires you to explicitly **trust**
   any hook (including plugin-bundled ones) before it runs — run `/hooks` in the Codex CLI after
   installing. Full details in
   [`plugins/codex/skillsense/README.md`](plugins/codex/skillsense/README.md).

---

## Configuration

Config lives at `~/.config/skillsense/config.yaml` (or `SKILLSENSE_CONFIG` to override the path).
Defaults:

```yaml
version: 1
scanPaths: []            # extra directories to scan, in addition to the built-in locations below
minScore: 0.75
maxRecommendations: 3    # hard cap is 5 regardless of this value
includePathsInOutput: true
outputPathMode: relative # full | relative | hidden
autoScan:
  enabled: true
  maxAgeMinutes: 60      # currently informational only — see "Auto-scan" below
matching:
  useEmbeddings: false   # not implemented in this version, reserved for future use
  useKeywordMatching: true
  useFuzzyMatching: true
privacy:
  allowCloudMetadataGeneration: false
  allowCloudEmbeddings: false
logging:
  level: warn
  logPromptText: false
```

Manage it via the CLI instead of hand-editing:

```bash
skillsense config get
skillsense config get minScore
skillsense config set maxRecommendations 3
skillsense config add-path ~/Development/shared-ai-skills
```

### Built-in scan locations

SkillSense always scans these, relative to both your home directory and the current project
(`scanPaths` in config adds *extra* locations on top of these):

| | Locations |
| --- | --- |
| **Claude** | `.claude/skills/**/SKILL.md`, `.claude/commands/**/*.md`, `.claude/rules/**/*.md`, `CLAUDE.md` |
| **Codex** | `.codex/skills/**/SKILL.md`, `.codex/plugins/**/SKILL.md`, `.codex/config.toml` (MCP servers), `.codex/hooks.json`, `AGENTS.md` |
| **Generic** | `.cursor/rules/**/*.md`, `.github/prompts/**/*.md`, `.ai/**/*.md`, `.llm/**/*.md`, `.llmpress/**/*.md`, `docs/ai/**/*.md`, `.mcp.json` |

### Auto-scan

The hook itself **never** triggers a scan — this keeps every hook invocation fast and predictable
(no risk of a slow filesystem walk blocking your prompt). Run `skillsense scan` whenever your
capabilities change; `skillsense doctor` reports how stale the index is.

---

## Commands

| Command | Purpose |
| --- | --- |
| `skillsense scan [--path <dir>] [--verbose] [--json]` | Build/update the index |
| `skillsense list [--source <s>] [--type <t>] [--json]` | List indexed capabilities |
| `skillsense search "<prompt>" [--json]` | Manually score capabilities against a prompt (debug tool, ignores thresholds) |
| `skillsense explain <capability> "<prompt>"` | Explain why a specific capability did/didn't match |
| `skillsense hook claude` / `skillsense hook codex` | Hook adapters — read a lifecycle payload from stdin, emit platform-appropriate context |
| `skillsense doctor` | Validate the install (index, hooks, PATH, config) |
| `skillsense config get\|set\|add-path` | View/update config |

---

## Privacy

- **Local-first, no network calls by default.** Scanning, indexing, and matching all run on your
  machine.
- **No prompts or capability contents are ever uploaded** unless you explicitly enable a cloud
  feature (none exist in this version — `privacy.allowCloudMetadataGeneration` and
  `privacy.allowCloudEmbeddings` are placeholders for future opt-in features and default to
  `false`).
- **Read-only scanning.** SkillSense never executes a discovered skill or script, and never
  parses `.env` files or other secret stores.
- **Minimal hook output, always.** Injected context is a single line — a capability's name and
  (optionally) its path, nothing else — never full file contents, and never a type/source/reason
  breakdown. Set `outputPathMode: hidden` or `includePathsInOutput: false` to drop the path too.
- **Prompts aren't logged by default.** `logging.logPromptText: false` is the default; only a
  short hash of the prompt is recorded against `usage_events` for future analytics.
- **Fail open, always.** Any internal error in a hook — bad input, missing index, a parser bug —
  results in silent exit 0. SkillSense can never be the reason your prompt didn't go through.

---

## Troubleshooting

Run `skillsense doctor` first — it checks the database, index size, config file, PATH, and
whether it can find hook references for Claude/Codex, then actually executes both hook
subcommands to confirm they exit cleanly.

<br>

**Hook produces no output, ever**
- Confirm `skillsense scan` has been run and `skillsense list` shows capabilities.
- Try `skillsense search "<your prompt>"` directly — if the score is well under 0.60, that's
  expected: SkillSense is intentionally conservative (high precision over recall, see
  `minScore`/`maxRecommendations` in config).
- Set `SKILLSENSE_DEBUG=1` and check the log file (`~/Library/Logs/skillsense/skillsense.log` on
  macOS, `~/.local/state/skillsense/skillsense.log` elsewhere) — hook internals never write to
  stdout, so this is the only place to see what happened.

**`skillsense: command not found` in the plugin hook**
- The plugin calls the global `skillsense` binary, not a bundled copy. Re-run `npm link` (or
  `npm install -g .`) from `packages/cli`, and confirm with `which skillsense`.

**Codex hook never fires**
- Codex requires explicit hook trust. Run `/hooks` in the Codex CLI and trust the
  `skillsense hook codex` entry.

**A capability isn't being picked up by `scan`**
- Check it's under one of the [built-in scan locations](#built-in-scan-locations), or add its
  directory via `skillsense config add-path`.
- Files over 512KB are skipped as a safety guard against indexing large binaries.

---

## Development

```bash
npm install
npm run build       # builds packages/core (tsc) and packages/cli (tsup)
npm run typecheck
npm run lint
npm test            # vitest: unit + integration + performance tests
```

Monorepo layout:

```text
packages/core   — pure library: scanner, parsers, indexer, matcher, ranker, formatter, storage, config
packages/cli    — the `skillsense` command-line tool
plugins/claude  — Claude Code plugin (hook + docs)
plugins/codex   — Codex plugin (hook + docs)
tests/          — fixtures + integration/performance tests
examples/       — sample UserPromptSubmit payloads for both platforms
```

---

## Roadmap

Deliberately out of scope for this version (see the project brief, section 28, for the full
rationale): semantic/embedding-based matching, learning from acceptance/dismissal signals, an
interactive "use this skill?" prompt mode, skill health checks (duplicates, staleness), exposing
SkillSense as an MCP server, and a VS Code extension. The architecture (in particular, the
`skillsense-core` package having zero Claude/Codex-specific logic) is intended to make these
additive later without a rewrite.

<br>

<p align="center"><sub>Built to make the agent you already have a little less forgetful.</sub></p>
