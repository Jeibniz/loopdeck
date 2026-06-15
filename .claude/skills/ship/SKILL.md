---
name: ship
description: Take a finished branch from "code is done" to merged/PR — verify, commit, push, open PR. Use when implementation is complete and you want to integrate the work.
allowed-tools: Bash(git *), Bash(gh *)
---

Drive a completed change to integration. This is the closing move of the lifecycle in `PLAYBOOK.md` — run it only when the work is actually done.

## Workflow

1. **Verify before claiming done** — do not skip. Invoke `superpowers:verification-before-completion`. Concretely:
   - `/format` (or the format hook has already run)
   - lint, typecheck, build if the project has them (`pnpm lint`, `npx tsc --noEmit`, `pnpm build`)
   - `/test` — must be green
   Paste the evidence (the passing summary lines). If anything fails, **stop and fix** — don't ship red.

2. **Review** — run `/review` on the branch diff. Resolve `Must fix` items before proceeding.

3. **Commit** anything outstanding via `/commit` (no attribution trailers).

4. **Integrate** — ask the user (or follow their standing preference) which path:
   - **PR** (default for anything non-trivial): run `/pr`, return the URL.
   - **Direct merge** to `main` (fine for tiny solo changes): fast-forward or merge locally, then push.
   For the full decision tree (squash vs merge, branch cleanup), defer to `superpowers:finishing-a-development-branch`.

5. If the work was done in a worktree, offer to clean it up once merged.

## Rules
- Never ship with failing or unrun tests. "I believe it works" is not evidence.
- Never force-push to `main` / `master`.
- No attribution in commits or PRs.
