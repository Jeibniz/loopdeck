---
name: test
description: Run the project's test suite. Use when asked to run tests, verify a change, or check the build.
---

Detect and run the project's tests.

## Workflow

1. If the user named a specific test/file/suite, run just that.
2. Otherwise detect the runner from `package.json`:
   - Read the `scripts` block. Prefer `test` (and `test:e2e` / `test:integration` only when asked or when the change touches those areas).
   - Detect the package manager from the lockfile: `pnpm-lock.yaml` → `pnpm`, `yarn.lock` → `yarn`, `package-lock.json` → `npm`, `bun.lockb` → `bun`. Default `npm`.
3. Run it from the directory holding `package.json` (the nearest one to the changed files in a monorepo; use the workspace filter, e.g. `pnpm --filter <pkg> test`, when relevant).
4. If there's no `test` script but a runner is present (`vitest`, `jest`, `node --test`, `pytest`), invoke it directly via `npx`/`pnpm exec`/the venv.
5. Report pass/fail with the failing test names and the relevant error output. Don't bury failures.
6. **On a fully green run, record the marker:** `mkdir -p ws/.verify && touch ws/.verify/PASS`. This satisfies the `require-verification` ship gate (which blocks `gh pr create` when source changed since the last green run). Do **not** touch the marker if anything failed.

## Notes

- Run the **narrowest** suite that covers the change first; widen only if needed.
- A green run is the claim — paste the summary line (e.g. `Tests  12 passed`). If you can't run them, say so explicitly rather than assuming.
- For TDD, the red test comes first: see `superpowers:test-driven-development`.
