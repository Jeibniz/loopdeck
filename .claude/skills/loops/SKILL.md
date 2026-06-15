---
name: loops
description: Manage this project's scheduled-autonomy loops — read/edit loops.yaml and reconcile it into /schedule cloud routines (producers that file tickets + a consumer that drains them). See LOOPS.md.
---

Manage the project's loops, declared in **`loops.yaml`** (schema + model in `LOOPS.md`). `loops.yaml`
is the source of truth; the live `/schedule` routines are derived from it — **edit the file, then `apply`**.

`/loops [show | init | apply | pause | <free text>]`

- **show** *(default)* — read `loops.yaml`, list each loop (name · kind · cron · enabled), and compare
  to the existing `/schedule` routines, flagging drift.
- **init** — seed/refresh `loops.yaml` from the template with **stage-appropriate** cadences (tighter
  for `stage: early`). Part of project setup; everything starts `enabled: false`.
- **apply** — reconcile: for each `enabled: true` loop, create/update a matching `/schedule` routine
  (cron from `cron`, prompt from `command`); pause/remove routines whose loop is disabled or deleted.
  **Confirm before creating routines** — they recur and cost tokens.
- **pause** — disable all routines without touching `loops.yaml` (e.g. before a big refactor or while away).

Rules:
- **Unattended ⇒ conservative.** The consumer is **PR-only / human-merge** and stops at every checkpoint
  (which pings you); producers only file `needs-triage` issues. Sandbox-first — the hooks apply in cron runs too.
- **Start tight early, loosen as the project matures** (see the LOOPS.md cadence table); the crons are the throttle.
- Needs `/schedule` (cloud routines). The queue needs `gh` (`/tickets status`); no queue → producers
  fall back to plan-driven work, consumer drains `plan.md`.
- Keep it to what `loops.yaml` declares — don't hand-create one-off routines that drift from the file.
