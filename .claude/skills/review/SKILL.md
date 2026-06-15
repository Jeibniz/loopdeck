---
name: review
description: Review staged or branch changes and give structured feedback before a commit or PR. Use when the user asks to review changes, check code quality, or wants feedback before committing.
allowed-tools: Bash(git *), Read, Grep
---

Review staged or branch changes and give structured feedback before a commit or PR.

Steps:

1. Determine scope (run in parallel):
   - `git diff --cached` (staged — pre-commit review)
   - `git fetch` then `git diff <base>...HEAD` (branch — pre-PR review; default base `origin/main`)
   - `git log <base>...HEAD --oneline`
     If both diffs are empty, tell the user and stop.

2. Read the surrounding source where the diff alone is ambiguous.

3. Evaluate across these dimensions:

   **Correctness** — logic errors, off-by-one, unhandled edge cases, broken error paths, race conditions, missing null/undefined guards.

   **Security** — injection (SQL, shell, XSS), insecure deserialization, secrets in code, broken auth/authz, unsafe handling of user input.

   **Code quality** — readability, naming, unnecessary complexity, duplication worth extracting (only if genuinely repeated ≥3×), dead/commented-out code.

   **Tests** — are new behaviours covered? edge cases? will existing tests break?

   **Consistency** — does it follow the patterns already in this file/module?

4. Output:

---

## Code Review

### Summary

<1–3 sentences: what the change does + overall assessment>

### Issues

> Only list issues worth acting on. Skip empty sections.

#### Must fix

- `path/to/file.ts:42` — <issue and why it matters>

#### Should fix

- `path/to/file.ts:17` — <issue and suggestion>

#### Consider

- `path/to/file.ts:88` — <low-priority observation>

### Verdict

## `approve` | `approve with suggestions` | `request changes`

Rules:

- Be direct and specific — cite `file:line` for every issue.
- Don't restate what the code does unless it explains a problem.
- Don't flag style the linter doesn't enforce.
- If the change is clean, say so briefly — don't invent minor notes.
