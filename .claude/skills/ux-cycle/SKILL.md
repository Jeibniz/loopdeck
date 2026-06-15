---
name: ux-cycle
description: End-to-end UX manager — review the running app, ask which findings to fix, then run an implement→re-review loop in one worktree and open a single PR. Use to go from "review this UI" to a merge-ready PR.
---

# UX Cycle (manager)

Manager of the UX loop: define scope, run `ux-reviewer`, get the user's pick of findings, then loop
`implementer` → `ux-reviewer` until converged, and open one PR. Runs in the main conversation.

## Argument

`/ux-cycle [mode] [target]` — same modes as `/ux-review`.

## Steps

1. **Scope + launch.** Resolve surfaces, **pick a browser driver** (Playwright MCP → chrome-devtools-mcp
   → self-launched headless Playwright; if none works, STOP loudly — never downgrade to static-only),
   and launch the dev server in **one persistent worktree** (keep it alive for the whole cycle) — see
   `/ux-review` steps 1–4. Read creds if the app logs in.
2. **Review.** Dispatch `ux-reviewer` → report at `ws/ux-review/cycle-<slug>-<date>.md`.
3. **Checkpoint (the one interaction).** Present findings by severity; ask via AskUserQuestion
   (multiSelect) **which to implement**. None → tear down and stop.
4. **Fix branch.** `git checkout -b fix/ux-<slug>` in the worktree.
5. **Implement → re-review loop** (autonomous — the scope is already chosen; up to 3 rounds):
   1. Dispatch `implementer` with the worktree/branch, the report path, the **still-open** findings,
      the base URL, and the read-only constraint. It verifies to green, commits, opens/updates the
      single PR.
   2. Dispatch `ux-reviewer` again on the **changed surfaces**: are the targeted findings resolved, and
      any new critical/warning regression at the 3 viewports / edge cases? (The app hot-reloads in place.)
   3. Resolved + no regression → done; else feed remaining + newly-found issues into the next round.
   - After round 3, note any still-open items in the PR body rather than churning further.
6. **Report & tear down.** Surface the PR URL, per-finding outcome, and round count. Stop the server;
   remove the worktree.

## Rules

- One batched PR per cycle. Frontend-only by default; allow backend source edits only if the user says so.
- Sandbox-first / read-only against anything that performs real actions (see `AUTONOMY.md`).
- Reports/screenshots under `ws/ux-review/` (gitignored); only code fixes are committed.
- Standalone review with no implementation? Use `/ux-review` instead.
