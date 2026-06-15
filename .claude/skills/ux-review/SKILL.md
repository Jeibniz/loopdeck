---
name: ux-review
description: Spin up the running web app, drive it across device viewports with real-ish data, and write an actionable UX report (bugs, inconsistencies, broken edge states). Use to UX-review a branch/PR, a named feature, or the whole app.
---

# UX Review

Run the app and have the `ux-reviewer` agent *look* at it across devices and edge cases. You own the
**environment** (dev server + browser); the agent owns the **judgment**.

## Argument → mode
`/ux-review [pr <n> | feature "<name>" | full | since "<when>"]` — default: files changed vs the base branch.

## Steps

1. **Resolve surfaces.** `git fetch`, then diff to the changed UI files (default) / `gh pr diff <n>` /
   `log --since`. For `feature` / `full`, map from the router (find it: `src/**/routes*`, Next `app/**`
   or `pages/**`). `full` → the core flows the app actually has (landing / auth / main list / detail /
   settings).
2. **Credentials (only if the app has a login).** Read a gitignored `.claude/.env.ux-review`
   (`UX_REVIEW_EMAIL` / `UX_REVIEW_PASSWORD`, optional `UX_REVIEW_BASE_URL`, optional empty-state user).
   If auth is required and the file is missing, stop and ask the user to create it. Never echo secrets.
   - **Safety:** if this app can perform real/irreversible actions (place an order, send, pay, delete),
     pass the **read-only constraint** to the reviewer — look, never click a control that writes/sends/spends.
3. **Pick a browser driver — REQUIRED, and never silently skip (try in order):**
   1. **Playwright MCP** (`playwright`) — self-installs Chromium, headless, works on cloud/headless. Preferred.
   2. **chrome-devtools-mcp** — if a system Chrome is present.
   3. **Self-launched headless Playwright** — `npx playwright install chromium`, then drive it.
   If **none** can run a browser, **STOP and report a loud failure** ("live UX review needs a browser;
   no driver available") — do **not** fall back to a static-only review and call it done. (Static
   `web-design-reviewer` is a separate, complementary check, not a substitute.)
4. **Launch the dev server** (isolate in a worktree for a branch/PR review):
   ```bash
   # detect pkg manager: pnpm-lock.yaml→pnpm, yarn.lock→yarn, else npm; install if node_modules missing
   PORT=$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1]);s.close()')
   <pm> run dev -- --port "$PORT"    # or the framework's dev command; run in background
   ```
   Wait until `curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/` returns 200.
5. **Dispatch `ux-reviewer`** (Agent tool) with: the chosen driver, base URL, the surfaces, the mode,
   the report path `ws/ux-review/<mode>-<date>.md` (screenshots in a sibling `screenshots/`), the
   credentials path if any, and the read-only constraint if applicable.
6. **Surface** the report path + a one-line severity summary (counts + top criticals).
7. **Tear down** (always, even on failure): stop the dev server; remove the worktree if you made one.

## Notes
- Read-only review tooling — never commits, deploys, or edits app code (that's `/ux-cycle`).
- Reports/screenshots stage under `ws/ux-review/` (gitignored), ready to hand to a coding agent.
- Drivers live in the shared `settings.json` (`playwright` + `chrome-devtools-mcp`). A run that can't
  reach any browser is a **failure to report**, not a quiet downgrade.
