---
name: autopilot
description: Self-driving development loop — read the goal/plan, build the next task TDD-style, verify, review, ship a PR, update memory, repeat. Pauses at human checkpoints. Use to autonomously advance a project that already has a goal (/spec).
---

Drive a project toward its goal with minimal human input, safely. **Read `AUTONOMY.md` first** — it
defines the loop, the durable-memory files, the checkpoint policy, and the safety gates. This skill is
the driver.

## Modes
`/autopilot [--phase] [--once] [--auto-merge] [focus]`
- *(default)* — run the loop continuously until a stop condition.
- `--phase` — run the current phase to green, then STOP for human sign-off before the next.
- `--once` — exactly one iteration, then stop (good for a careful start).
- `--auto-merge` — merge own PRs once green + independently reviewed (opt-in; for small / early-stage
  work). **Default is human-merge: open the PR and stop.**
- a trailing `focus` narrows scope (e.g. "the auth flow").

## Preconditions — the readiness gate (do not skip)
- The active goal (`ws/goals/<slug>.md`) is marked **`Status: ready`**: testable acceptance criteria,
  an **empty Open questions** list, **Required inputs** provided-or-deferred, and a **work list** (the
  GitHub Issues queue if enabled — see `TICKETS.md` — else `ws/<slug>/plan.md`; the queue is an
  enhancement, never required). **If it's `draft` or missing, STOP and run `/spec`** — never start
  building on an unaligned spec (a wrong assumption here burns a whole run, especially on a phone).
- You're in the project repo. Non-trivial work goes in a worktree (`superpowers:using-git-worktrees`).

## One iteration
1. **Orient.** Read `STATUS.md`, the active goal, the plan, the tail of `ws/journal.md`, **and
   `docs/domain/`** (the building blocks — ground every decision on it and **cite** it in code/ADRs).
   Confirm the goal is `Status: ready` (if not → stop, hand to `/spec`). **Pick the next work item** —
   preflight with `/tickets status`: if the queue is **enabled**, pull `/tickets queue` (top `ready`,
   non-`blocked` issue); if **not enabled**, take the next unchecked task from `ws/<slug>/plan.md`.
   Distinguish three outcomes — never conflate them:
   - **work remaining** → take it;
   - **genuinely empty / all done** → Stop (goal review);
   - **queue backend errored** (a `gh` failure, not a real zero-count) → do **NOT** treat as done:
     surface the failure, fall back to `plan.md`, and continue. A tooling failure is never "complete".
2. **Isolate.** Ensure a worktree/branch (`feat/<slug>` or `fix/<slug>`).
3. **Build.** Dispatch the `implementer` agent (or inline for a small task): TDD — red test →
   implement → green → refactor. Use `tester` for tricky coverage; `debugger` +
   `superpowers:systematic-debugging` on failures. **Hit a domain unknown you'd otherwise guess?**
   STOP guessing — run a **targeted `/research`** to add the fact to `docs/domain/`, then continue.
4. **Verify.** `/format`, lint, typecheck, build, `/test`. Must be green — this writes the
   `ws/.verify/PASS` marker the ship gate checks. Red → back to step 3. Never proceed on red.
5. **Review panel** (parallel — one message): `code-reviewer`; `security-reviewer` if auth/input/data/
   network changed; for changed UI, `web-design-reviewer` (static). Adversarially `verifier` any
   high-impact finding. **Fix the `Must fix` items for the current ticket now; file every other
   finding as a `source:review needs-triage` issue** (right type + severity→priority) so it's queued,
   not lost or silently scope-crept. Re-verify (loop 4–5).
5b. **UX cycle (web UI — built in, not optional).** If this iteration changed UI, run a **mini UX
   cycle** on the changed surfaces: `/ux-review` → fix every `Must fix` UX finding → re-review, until
   clean (≤2 rounds); **file non-blocking UX findings as `type:ux source:review needs-triage` issues**.
   **Live UX is mandatory for UI work** — if no browser driver is reachable, do **not** silently pass:
   record a blocking `live-UX pending (no browser)` item in `STATUS.md` and flag it (see Live-UX driver
   below). A static-only review does not satisfy a UI acceptance criterion.
6. **Acceptance check.** Compare against the goal's criteria — met for this task?
7. **Independent review → PR → (human) merge.**
   - `/commit` (no attribution) → `/pr` with **`Closes #<ticket>`**. A **different agent than the
     implementer** runs `/code-review` (standard — not `ultra`) on the diff as the pre-merge gate;
     resolve its `Must fix`. The `require-verification` gate confirms tests ran.
   - **Merge:** default is **human-merge** — open the PR and **stop** (you merge after a glance). With
     `--auto-merge`, merge once green + review-clean (which closes the ticket). Never auto-merge a
     change that touched a checkpoint.
   - **Checkpoint hit** (money / deploy / external comms / deletion / paid dep / ambiguous trade-off /
     anything in the goal's checkpoints): **STOP**, file a `needs-decision` issue **assigned to you**
     (pings your phone) with options + a recommendation, and surface it. Don't guess.
8. **Record + reconcile the backlog.** Update `STATUS.md` (done / next / blockers); append
   `ws/journal.md`. The ticket closes on merge (`Closes #N`). **Never leave "what's left" stranded in
   `plan.md`:** when you ship a milestone and a remote now exists, `/tickets bootstrap` (if needed) and
   **file the plan's follow-ups + any `Roadmap / next phases` items as `needs-triage` issues**.
   Deferred or discovered something? File it — never drop it.
9. **Pace & loop.** Next ticket. For long runs, pace with `/loop` or `ScheduleWakeup`.

## New work always enters the queue (don't go off-plan)
A new need that surfaces mid-project — a next phase you (or the human) think of, a discovered bug, a
user request — **does not become an untracked manual branch.** It goes through the queue: **small →
`/tickets new`** (`needs-triage`) → triage → drain; **a substantial new chunk with unknowns → `/spec`**
(frame → research → refine), which files its own breakdown. The human picks up the next phase by
**triaging a `needs-triage` issue to `ready`**, not by re-explaining it. (`/spec` pre-files the
foreseeable roadmap as `needs-triage`, so it's usually already waiting.)

## Milestone UX cycle (before a web goal is "done")
A web goal is **not done until a full `/ux-cycle` passes** across its affected surfaces (review → fix →
re-review to convergence, one PR). Run it when the UI for a goal/phase is complete, before the
acceptance/Stop check declares done. If live UX never ran (no browser), the goal stays **not done**
with the `live-UX pending` blocker recorded — never quietly "done".

## Live-UX driver (so live review can't silently degrade)
The `ux-reviewer` drives a real browser. Use the first that works, in order:
1. **Playwright MCP** (`playwright`) — self-installs Chromium, headless, cloud-friendly. Preferred.
2. **chrome-devtools-mcp** — if a system Chrome is present.
3. **Self-launched headless Playwright** — `npx playwright install chromium` then drive it.
If **none** can run a browser, that's a **loud failure**, not a pass: record `live-UX pending (no
browser)` in `STATUS.md`/journal and surface it to the human. Static `web-design-reviewer` runs
regardless, but it does **not** substitute for live UX.

## Reports & checkpoint pings
- **Run report** — at each milestone (and at any stop), write a skimmable report from
  `ws/reports/_TEMPLATE.md` → `ws/reports/<date>.md` (built / assumed / deviated / unsure / rough cost
  / next, with ticket counts) and post a summary as a comment on the goal's milestone or tracking
  issue. Surface its path. This is how the work stays reviewable from a phone.
- **Pings (don't go silent at a stop)** — when you **pause for a decision**, **finish a goal**, or
  **block**, notify the human: a `needs-decision` (or done) issue **assigned to them** for the GitHub
  app push, plus a proactive `PushNotification` when running interactively.

## Stop conditions (then summarize)
- All acceptance criteria met (incl. the milestone `/ux-cycle` for web) → run report; suggest the next goal.
- Token budget exhausted, or a human checkpoint is needed.
- 2 iterations with no net progress → stop, write the blocker into `STATUS.md`, ask for help.

## Safety (non-negotiable)
Sandbox-first: paper / dry-run / test keys only. Never set `LIVE=1`. Never bypass the hooks
(`--no-verify`, editing the deny-list to self-authorize). Anything irreversible or money/people-facing
is a human checkpoint. See `AUTONOMY.md`.
