---
name: pr
description: Create a pull request following this project's conventions
allowed-tools: Bash(git *), Bash(gh *)
---

Open a pull request.

Steps:

1. Understand the branch state (run in parallel):
   - `git status`
   - `git diff <base>...HEAD` (default base: `main`)
   - `git log <base>...HEAD --oneline`
   - Upstream check: `git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "no upstream"`
   - If a PR already exists, make sure it isn't merged: `gh pr view --json state,mergedAt`. If `MERGED` (squash-merge leaves the branch pushable but new commits go nowhere), **stop**: `git fetch origin`, cut a fresh branch from `origin/main`, carry the un-merged work over, and open a **new** PR.

2. Analyze **all** commits on the branch, not just the latest.

3. Draft the PR:
   - **Title**: short, imperative, ≤70 chars — describes the change.
   - **Body**: use the template below.

4. Push if needed: `git push -u origin HEAD`.

5. Create it:

```bash
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
- <bullet 1>
- <bullet 2>

## Test plan
- [ ] <step 1>
- [ ] <step 2>
EOF
)"
```

6. Return the PR URL.

Rules:

- **No attribution** in the PR body — no "Generated with" / tool signature.
- Never force-push to `main` / `master`.
- Default base is `main` unless the repo uses another convention.
- If there are no changes beyond the base, say so instead of opening an empty PR.
