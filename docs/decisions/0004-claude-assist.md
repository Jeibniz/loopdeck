# 0004. "Ask Claude" assist via the local claude CLI

- **Date:** 2026-06-15
- **Status:** accepted

## Context
Users want to create/manage loops, agents, and skills from the UI by describing what they want, using their existing Claude subscription (not a separate API key).

## Decision
- The server shells out to the **local `claude` CLI** in headless mode (`claude -p --output-format text`), prompt fed via stdin, with file-touching tools **disallowed** (`--disallowed-tools Bash Edit Write NotebookEdit WebFetch WebSearch`) so it can only return text. This uses the user's current Claude Code subscription — no API key, no separate billing.
- The CLI is asked to return the **complete new file content** for the target (an existing loops.yaml / agent / skill, or a brand-new agent/skill path derived from a name). `POST /api/assist` returns a **diff**; it never writes.
- The client shows the diff in the standard confirm modal; on confirm it applies via `PUT /api/file` (under-root, atomic, parent-dirs created). Nothing lands without a confirmed diff — same guarantee as every other write (ADR 0002).
- The `claude` runner is injectable (`buildApp({ runClaude })`) so tests stub it; `claude` missing → `503` with a clear message.

## Consequences
- One uniform "AI edits a file, you confirm the diff" flow covers loops, agents, skills, and new-file creation.
- Whole-file generation for loops.yaml bypasses the CST writer, so an AI edit *can* reflow more than a hand edit — mitigated by a strong "change minimally, preserve comments + the machine-owned `routine`" instruction and the mandatory human diff-confirm. Verified live: adding a producer touched only the new lines.
- Latency: a call can take ~30–60s; the UI shows a "thinking" state and disables confirm meanwhile.

## Alternatives considered
- **Anthropic API key:** rejected — the user explicitly wanted the existing subscription.
- **Auto-apply without confirm:** rejected — violates loopdeck's diff-confirm ethos.
- **Structured (JSON ops) for loops:** would preserve via CST, but a whole-file approach is uniform across loops/agents/skills/new files and the diff-confirm makes it safe enough for v1.

## Addendum (2026-06-15): sandbox the claude subprocess

A security review flagged that relying solely on `--disallowed-tools` is fragile —
a future CLI flag rename could silently re-enable Edit/Write/Bash, and claude was
running with `cwd` = the user's project, so it could have modified files directly,
bypassing the diff-confirm guarantee. Mitigations:
- claude now runs in a **throwaway temp dir** (`mkdtemp`, removed in `finally`), not
  the project — the prompt already embeds all needed content, so even with full tool
  access the subprocess cannot reach the real project files.
- The argv is built by `claudeArgs()` and a test asserts every file-touching/network
  tool stays in `--disallowed-tools` (a rename/drop fails CI).
