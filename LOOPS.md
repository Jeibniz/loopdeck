# LOOPS.md — scheduled autonomy (producers + consumer around the queue)

Work runs as **loops around the ticket queue**: *producers* create work on their own cadence; a
*consumer* drains it. Cadences live in a structured, hand-editable file — **`loops.yaml`** — so they're
easy to adjust now and a centralized UI can manage them across projects later.

## The model
```
PRODUCERS  (each its own cron)                   QUEUE (GitHub Issues)        CONSUMER
  ux-sweep         /ux-review full      ┐
  tech-debt-sweep  code-review pass     ├─ file needs-triage ─→ YOU triage ─→ implement loop:
  dependency-check outdated deps        │        → ready         (phone)       /autopilot --once
  research-scan    /research <topics>   ┘                                      → PR (you merge)
```
Producers only *create* `needs-triage` issues; you triage to `ready`; the consumer drains `ready`,
PR-only. The queue decouples them, so loops on different intervals never collide. (No queue? producers
degrade to plan-driven work — see `TICKETS.md`.)

## Tools that actually run them
- **`/schedule`** — cloud cron agents (unattended, independent). This is where loops live.
- **`/loop`** — repeats a command in a *live* session; for attended draining (`/loop /autopilot`).
- **`/loops`** (this kit) — reads `loops.yaml` and reconciles it into `/schedule` routines.

## The config: `loops.yaml` (per project, committed, UI-ready)
Declarative; `/loops apply` makes the live `/schedule` routines match it. Edit the file, then `apply`.
```yaml
stage: early            # early | steady | maintenance — a hint; you set the cron
loops:
  - name: implement     # the CONSUMER — drains ready tickets, PR-only (you merge)
    kind: consumer
    command: "/autopilot --once"
    cron: "0 2 * * *"   # early: daily 02:00 · steady: weekly
    enabled: false      # turn on once the queue has ready tickets
  - name: tech-debt-sweep
    kind: producer
    command: "/review branch; file findings as needs-triage issues"
    cron: "0 2 * * 1"   # weekly, Mon 02:00
    enabled: false
  - name: dependency-check
    kind: producer
    command: "check outdated deps; file chore issues"
    cron: "0 3 * * 1"
    enabled: false
  - name: ux-sweep
    kind: producer
    command: "/ux-review full"        # needs a runnable UI
    cron: "0 2 * * 3"
    enabled: false
  - name: research-scan
    kind: producer
    command: "/research <watch topics>"   # domain/competitor drift
    cron: "0 4 1 * *"   # monthly
    enabled: false
```

## Tighter early, looser later
Defaults are tuned for **early** (frequent — you want momentum + fast feedback); loosen the crons as a
project matures and set `stage:` accordingly.
| stage | implement | reviews / sweeps | research |
|-------|-----------|------------------|----------|
| early | daily | every few days | monthly |
| steady | weekly | weekly | monthly |
| maintenance | on-demand | monthly | quarterly |

## During project setup
`init.sh` seeds a `loops.yaml` with everything `enabled: false`. In the setup phase — after `/spec`
locks a goal and the queue is enabled — review it, enable what fits (start tight), and run **`/loops
apply`** to create the routines. `/loops init` re-seeds with stage-appropriate cadences.

## Safety (unattended ⇒ conservative)
- The consumer is **PR-only / human-merge** (never `--auto-merge` — no one's watching) and **stops at
  every checkpoint** (which pings you). Sandbox-first always — the hooks still apply in cron runs.
- Producers are cheap, bounded passes that only **file issues**.
- Each cron run costs tokens — the crons *are* the throttle; enable deliberately.
- `ux-sweep` no-ops until there's a runnable app.
