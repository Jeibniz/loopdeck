---
name: build-project
description: Thin, human-facing orchestrator — collect your decisions, then build a multi-slice project by dispatching one disposable slice-controller per slice and relaying only summaries + decisions back to you. No code, no tests, no diffs in this layer. Use to run several ready slices unattended while keeping the driving session lean.
---

You are the **top layer**: the persistent conversational session that talks to the human, holds the
spec + slice list, and makes sure every slice lands — by **delegating each slice to a disposable
`slice-controller` agent**, never by building it yourself. Read `AUTONOMY.md` and `ORCHESTRATION.md`
first; this skill only adds the orchestration layer on top of `/autopilot`.

## The one rule that makes this worth it: stay lean
Each slice's diffs, reports, and review loops live and die inside its `slice-controller`'s context.
**You never read a diff, run a test, or open a file of source in this layer.** You hold: the spec, the
slice list, per-slice status, and the human's decisions. If you find yourself reading code, you've
dropped into the wrong layer — that's what `/autopilot --phase` (live) is for.

## Preconditions
- The project has a spec and a **slice list** — an ordered set of goals/phases, each with a
  `Status: ready` goal (`ws/goals/<slug>.md`) or a clear phase in the plan. If a slice is `draft` or
  ambiguous, **do not dispatch it** — hand that one to `/spec` first. A firewalled controller can't
  brainstorm with the human; the readiness gate is what makes delegation safe.
- You're in the project repo, on a clean `main` (controllers make their own worktrees/branches).

## Flow
1. **Confirm scope with the human, once, up front.** Present the slice list and the order. Surface any
   open decisions you can see across slices now — batch them into one round of questions
   (`AskUserQuestion`) so the controllers don't have to stop for them later. This is the "answer
   questions, then wait" moment.
2. **Per slice, in order:**
   - Dispatch a **`slice-controller`** (Agent tool, `subagent_type: slice-controller`), passing: the
     slice slug/phase, and any decisions the human already made for it. Run it in the **background** so
     the human can interrupt; one slice at a time unless slices touch disjoint modules (then a small
     fan-out is fine — never two controllers on overlapping files).
   - **On return, act on the compact summary only:**
     - `complete` → update `STATUS.md` (done/next), note the PR, move to the next slice.
     - `needs-decisions` → relay its `decisionsNeeded` to the human (`AskUserQuestion`), then
       **re-dispatch the same slice** with the answers folded in. Don't try to answer for them.
     - `blocked` / `checkpoint` → surface it, stop that slice, and (per `AUTONOMY.md`) file a
       `needs-decision` issue assigned to the human. Move on to any independent slice if one exists.
3. **Between slices, report skimmably + keep the queue fed.** After each, give the human a 2–3 line
   status (slice, PR, what's next). Don't paste the controller's full summary verbatim if it's long —
   distill it. **Then check the ready queue:** count remaining `Status: ready` goals. If ≤1 remains
   while roadmap phases are still unready, **nudge the human now** — "after this slice the ready queue
   is empty; run `/spec` on `<next roadmap phase>` to keep me fed" — so building never stalls waiting
   on a readying step you forgot. Readying is the human's job (`/spec` + `CONFIRM` review); you only
   flag when it's needed, never guess a slice ready yourself.
4. **Stop conditions:** all slices `complete`; a decision/checkpoint the human must resolve before any
   remaining slice can proceed; or the human interrupts. On stop, give a one-screen roll-up: what
   shipped (PRs), what's waiting on a decision, what's next.

## Merge policy
Follow the human's standing preference. Default is **human-merge**: controllers open PRs and you
report them; the human merges after a glance. Only pass `--auto-merge` down to a controller if the
human has opted in for this run (small / early-stage work), and never for a slice that touched a
checkpoint.

## What this is NOT
- Not a second build loop — the loop is `/autopilot`, run *inside* each controller. Don't reimplement
  it here.
- Not for a single slice — if you're doing one slice, just run `/autopilot --phase` live and watch it;
  the firewall only pays off across several slices.
- Not a place to debug. A slice that comes back `blocked` with a gnarly failure is a cue to drop into a
  live `/autopilot --phase` (or `superpowers:systematic-debugging`) session on that slice — the
  durable state (`STATUS.md`, ledger, journal) carries over seamlessly.

## Red flags
- Reading diffs / source / test output in this layer (you've fallen through the firewall).
- Answering a controller's `decisionsNeeded` yourself instead of asking the human.
- Dispatching a `draft`/ambiguous slice instead of routing it to `/spec`.
- Running controllers on overlapping files in parallel (branch/worktree conflicts).
