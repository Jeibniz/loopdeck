# TICKETS.md — the agent work queue (GitHub Issues)

All open work lives as **GitHub Issues** — spec breakdown, reviewer findings, bugs, follow-ups — so
nothing is lost and the loop has **one** queue to drain. Labels are the schema; a **milestone is a
goal**. Agent-first and phone-skimmable: this is issues + labels + milestones, nothing more (no custom
states, epics, sprints, or boards).

> **The queue is an enhancement, never a dependency.** Every project always has `ws/<slug>/plan.md` as
> the baseline work list; Issues layer on **only when** a repo has a remote + `gh` + the labels
> (`/tickets status`). A project can start local on `plan.md` and **adopt the queue later** (add a
> remote → `/tickets bootstrap`). A missing or erroring queue **degrades to `plan.md`** — it never
> blocks startup, and a `gh` failure is **never** mistaken for "no work / done".

## Labels (the schema)
- **type:** `type:task` · `type:bug` · `type:ux` · `type:chore` · `type:spike`
- **priority:** `P0` · `P1` · `P2` · `P3`  (P0 = blocker)
- **source:** `source:spec` · `source:review` · `source:bug` · `source:human`
- **flow:** `needs-triage` (just filed) · `ready` (triaged, workable) · `blocked` (waiting on a dep/decision)
  · `needs-decision` (a human checkpoint)

The **queue** = open issues labelled `ready`, not `blocked`. **Closed = done.**

Bootstrap the labels once per repo (`init.sh --github` does this automatically for new repos):
```bash
for t in task:1D76DB bug:D73A4A ux:C5DEF5 chore:BFDADC spike:FBCA04; do gh label create "type:${t%%:*}" -c "${t##*:}" -f; done
for p in P0:B60205 P1:D93F0B P2:FBCA04 P3:0E8A16;            do gh label create "${p%%:*}" -c "${p##*:}" -f; done
for s in spec bug human review;                              do gh label create "source:$s" -c 5319E7 -f; done
gh label create needs-triage -c E4E669 -f; gh label create ready -c 0E8A16 -f
gh label create blocked -c D73A4A -f;      gh label create needs-decision -c B60205 -f
```

## Lifecycle
1. **Breakdown** — `/spec` (refine) creates one issue per plan task in the goal's **milestone**,
   `type:task source:spec` + a priority, labelled `ready`. **Issues replace `plan.md`.** Note deps in
   the body as `depends on #N` and apply `blocked` until the dep closes.
2. **Findings → issues** — every reviewer (`/code-review`, `ux-reviewer`, `web-design-reviewer`,
   `security-reviewer`) has its findings filed as issues: `type:{ux,bug,…} source:review` +
   severity→priority, `needs-triage`. Nothing gets fixed silently or lost.
3. **Triage (your checkpoint)** — you move `needs-triage` → `ready` (build it) or close (won't-fix).
   This is the single "what actually gets built" decision.
4. **Drain** — `/autopilot` pulls the highest-priority `ready` + unblocked open issue, builds it, opens
   a PR with `Closes #N`, and an **independent** reviewer (a different agent) verifies before merge.
5. **Follow-ups** — when autopilot defers something, it **files an issue** rather than dropping it.
6. **Decisions** — a `needs-decision` issue **assigned to you** pings your phone (GitHub app).

## Recipes
```bash
# the queue — what to work next
gh issue list --state open --label ready --search "-label:blocked sort:created-asc" --json number,title,labels
# file a finding
gh issue create -t "<title>" -b "<detail · file:line · suggested fix>" -l type:ux,source:review,needs-triage,P2 -m "<goal milestone>"
# triage
gh issue edit <N> --add-label ready --remove-label needs-triage
# a decision that needs the human (pings the phone)
gh issue create -t "Decision: <question>" -b "<options + recommendation>" -l needs-decision,P0 -a @me -m "<goal>"
```

> Needs `gh` authenticated to the repo. For a repo not on GitHub, fall back to `plan.md` + the journal
> (the queue is a convenience, not a hard dependency).
