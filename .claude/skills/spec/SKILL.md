---
name: spec
description: Frame a product goal, then (after /research) refine it into a sharp, domain-grounded solution spec with testable criteria, open questions, and required inputs. The re-entrant front door before /autopilot.
---

Turn a fuzzy idea into a sharp, durable, **grounded** spec — by asking, not assuming, and by building
on real domain knowledge, not improvisation. Front door before `/autopilot`. **Self-contained** (no
plugin required; uses `superpowers:brainstorming` for the interview if present).

It runs in **two passes around research**, because you can't write a good _solution_ spec before you
understand the domain:

```
/spec (frame) → /research (deep, + your review of CONFIRM) → /spec (refine + lock) → /autopilot
```

State which pass you're in based on the active goal: no goal / `draft` with no answered agenda → **frame**;
agenda researched and `docs/domain/CONFIRM.md` reviewed → **refine**.

## Pass 1 — FRAME (capture the product goal + figure out what to learn)

1. Read `CLAUDE.md`, `STATUS.md`, existing `ws/goals/*`, the code. Never ask what the repo answers.
2. **Interview — one question at a time** (AskUserQuestion), summarizing back so misunderstandings
   surface early. Settle: purpose & users; the one-sentence "done"; the smallest valuable slice (MVP)
   and what's explicitly out (YAGNI); hard constraints; external dependencies (which services → which
   accounts/keys); sensitive actions (→ checkpoints). Do **light inline grounding** for quick facts (a
   `WebSearch` to sanity-check an assumption) — but don't go deep here.
3. Write `ws/goals/<slug>.md` (`Status: draft`) from `_TEMPLATE.md`: product goal, scope, constraints,
   out-of-scope, checkpoints, required inputs — **and a `## Research agenda`**: the specific questions
   whose answers will shape the solution (domain rules, API specifics, compliance, data shapes, the
   correct way pros do this). Update `STATUS.md`; append `ws/journal.md`.
4. **Stop. Tell the user to run `/research` next.** Don't write detailed acceptance criteria, don't
   plan, don't lock — you don't know enough yet.

## Pass 2 — REFINE + LOCK (write the real, grounded solution spec)

1. Read `docs/domain/` (the corpus) and `docs/domain/CONFIRM.md`. If CONFIRM still has unconfirmed
   high-stakes facts, **stop** and ask the user to review them first.
2. Refine `ws/goals/<slug>.md`: concrete, **testable acceptance criteria grounded in the corpus**
   (cite `docs/domain/<topic>.md`), the technical approach, resolved open questions, required inputs.
   Write an ADR (`docs/decisions/`) for each notable decision, citing the domain facts behind it.
3. **Readiness gate** — set `Status: ready` only when: criteria are concrete/testable; **Open questions**
   empty; **Required inputs** provided-or-deferred; **and the high-stakes facts in `CONFIRM.md` are
   confirmed**. For a web UI, include a live-UX acceptance criterion (`/ux-cycle` passes).
4. **Plan, then queue it (queue is optional).** Plan the work (`superpowers:writing-plans` / `planner`
   agent), grounded on the corpus → `ws/<slug>/plan.md`. **This always works — it's the baseline.**
   Then **preflight the queue** (`/tickets status`: GitHub remote? `gh` authed? labels present?):
   - **Queue ready** → mirror the plan into the goal's **milestone** as issues (one `type:task
source:spec` per task, priority, `ready`; `depends on #N` + `blocked` for deps). Issues become the
     working queue; `plan.md` stays the human-readable overview.
   - **Queue not ready** (local-only / no `gh` / no labels) → fine: **`plan.md` IS the queue.** Say so,
     and note the user can `/tickets bootstrap` once a remote exists. **Never block on the queue.**
5. Tell the user it's `ready`, point at the work list (`/tickets queue`, or `plan.md`), and offer `/autopilot`.

## Rules

- **Align before building; ground before specifying.** A wrong assumption — or a missing domain fact —
  costs a whole autopilot run.
- Don't invent answers to product forks or domain facts: forks go to the user (Open questions); facts
  go to `/research`.
- Required inputs (keys/accounts) are the human's job — list precisely, never fabricate or commit them.
