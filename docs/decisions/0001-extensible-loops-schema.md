# 0001. Treat loops.yaml as an extensible schema; preserve unknown fields

- **Date:** 2026-06-15
- **Status:** accepted

## Context
The scaffold template's `loops.yaml` has a minimal shape (`stage` + loops of `{name,kind,command,cron,enabled}`), but the real `vakio-mono/loops.yaml` carries more: root `repo:`, per-loop `reviewer:` and **`routine:`** (a `trig_...` cloud-routine id written back by `/loops apply`), with `command` as a folded block scalar and **no `kind: consumer`** (producer-only). See [[loops-schema]]. If loopdeck modeled a fixed field set and re-serialized from a plain object, it would silently delete `routine`/`reviewer`/`repo` and break the cloud wiring.

## Decision
- Model loops as a **core set** `{name, kind?, command, cron, enabled}` plus **passthrough** of every other key. `kind` is **optional** (vakio omits it).
- **Never edit or drop `routine:`** — it is machine-owned by `/loops apply`.
- Show `reviewer:` and `repo:` **read-only** in v1 (displayed, preserved, not editable).
- Achieve preservation structurally by mutating the parsed `yaml` `Document` surgically (never round-tripping through `toJS()`), per [[yaml-document-api]].

## Consequences
- Writes are safe against schema drift: any field loopdeck doesn't know about survives untouched.
- v1 UI is simpler (reviewer/repo are read-only); editing them is a clean future increment.
- Validation must only enforce `kind ∈ {consumer,producer}` *when present*, not require it.

## Alternatives considered
- **Fixed typed model + re-serialize:** rejected — drops unknown fields, the exact failure mode that breaks vakio.
- **Make reviewer/repo editable in v1:** deferred — more UI/validation for marginal v1 value (chosen "read-only").
- **Hide unknown fields entirely:** rejected — you couldn't see `routine`/`reviewer`/`repo` at all; less transparent.
