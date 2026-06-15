---
name: format
description: Format changed files with the project's formatter (Prettier by default).
---

Format the code with the project's configured formatter.

## Workflow

1. If the user named files/dirs, format those. Otherwise target what changed:
   `git diff --name-only` + `git status --porcelain` → the touched, formattable files.
2. Detect the formatter:
   - **Prettier** (default for TS/JS/JSON/MD/CSS/YAML/HTML): use `node_modules/.bin/prettier` if present, else `pnpm exec prettier` / `npx prettier`.
     - If the repo defines a `format` script in `package.json`, prefer that (`pnpm format` / `npm run format`).
   - Respect `.prettierignore` / `.prettierrc`. Don't reformat files the project ignores.
3. Run `prettier --write` on the targets (or the project's `format` script).
4. Report which files changed.

## Notes

- This mirrors the `format-on-edit` hook, which already formats single files as Claude writes them. Use this skill for a batch pass (e.g. before a commit) or when the hook was bypassed.
- If no formatter is configured at all, say so — don't impose one without asking.
