---
name: commit
description: Create a git commit following this project's conventions
allowed-tools: Bash(git *)
---

Create a clean, well-scoped git commit.

Steps:

1. Run `git status` and `git diff` (staged + unstaged) to understand all changes.
2. Run `git log --oneline -10` to match the repo's existing commit-message style.
3. Stage relevant files **by name** — avoid `git add -A` / `git add .` so you never sweep in secrets, build output, or unrelated edits.
4. Draft the message:
   - Subject: imperative mood, ≤72 chars (e.g. "Add user auth endpoint").
   - Use Conventional-Commit prefixes (`feat:` / `fix:` / `chore:` / `refactor:` / `test:` / `docs:`) when the repo already uses them.
   - Body (optional): explain _why_, not _what_ — the diff shows the what.
5. Commit with a HEREDOC to preserve formatting:

```bash
git commit -m "$(cat <<'EOF'
<subject line>

<optional body>
EOF
)"
```

6. Run `git status` to confirm.

Rules:

- **No attribution / co-author trailers.** Do not add `Co-Authored-By`, "Generated with", or any tool signature.
- Never use `--no-verify` or skip hooks unless the user explicitly asks.
- Never amend a commit that has already been pushed.
- If a pre-commit hook fails, fix the issue and create a **new** commit.
- Never commit files that likely hold secrets (`.env`, key files, tokens).
