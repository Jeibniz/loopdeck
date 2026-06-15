---
name: tickets
description: Manage the GitHub-Issues work queue — show the queue, triage findings, file a ticket, or bootstrap labels. The agents' lightweight Jira. Schema + lifecycle live in TICKETS.md.
---

A thin helper over the ticket queue (GitHub Issues). The full schema + lifecycle are in `TICKETS.md` —
read it. Needs `gh` authenticated to the repo.

`/tickets [status | queue | triage | new | bootstrap | <free text>]`

- **status** — **preflight** the queue and report **ENABLED** or **NOT ENABLED**: is there a GitHub
  remote (`git remote get-url origin`), is `gh` authenticated (`gh auth status`), do the labels exist
  (`gh label list`)? `/spec` and `/autopilot` call this to choose **issues vs `plan.md`** and to tell a
  real "zero open tickets" (done) apart from a **`gh` error** (degrade to `plan.md`, never "done").
- **queue** _(default)_ — show the workable queue, grouped by priority:
  `gh issue list --state open --label ready --search "-label:blocked sort:created-asc"`. This is exactly
  what `/autopilot` drains next. (Queue NOT ENABLED? the work list is `ws/<slug>/plan.md`.)
- **triage** — list `needs-triage` issues (mostly reviewer findings); for each, recommend `ready`
  (+ a priority) or close (won't-fix), and apply what the user approves. This is the "which findings
  actually get built" checkpoint — generalizes `/ux-cycle`'s pick step.
- **new** — file an issue with the right `type`/`source`/priority labels and the goal **milestone**
  (see TICKETS.md). Use for a bug, idea, or follow-up.
- **bootstrap** — verify `gh` + a remote first, then create the label set (the `gh label` block in
  TICKETS.md) idempotently and, if asked, a milestone for the active goal. Safe to run **anytime** —
  including mid-project when you add a remote to a repo that started local. `init.sh --github` already
  does it for new repos.

Rules:

- **The queue is an enhancement, never a dependency.** A project always has `ws/<slug>/plan.md` as the
  baseline work list; Issues layer on when `status` is ENABLED. A missing/erroring queue degrades to
  `plan.md` — it must never block startup, and a `gh` failure is never read as "done".
- Labels are the schema (TICKETS.md) — don't invent new ones casually.
- Keep it issues + labels + milestones. No boards, automations, or custom workflow beyond this.
- A reviewer's findings belong in the queue, not buried in a report — file them.
