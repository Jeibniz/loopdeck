# CONFIRM — high-stakes facts for human review (gate before /spec locks)

**REVIEWED & CONFIRMED 2026-06-15** (see resolutions on each item). Locked into `ws/goals/loopdeck.md` + ADRs 0001–0003.

Review these before the spec locks to `ready`. They're not money/legal, but they shape the **data model and write safety** — the two things most expensive to get wrong in this tool. Correct or ✅ each.

## 1. loops.yaml schema is EXTENSIBLE — preserve unknown fields, don't clobber `routine:`

- **Fact:** Real `loops.yaml` files carry more than the scaffold template. `vakio-mono/loops.yaml` adds root `repo:`, and per-loop `reviewer:` + **`routine:` (a `trig_...` cloud id written by `/loops apply`)**, with `command` as a folded block scalar (`>`), and is **producer-only (no `kind: consumer`)**.
- **Why it matters:** If loopdeck assumes a fixed field set, it would **delete `routine`/`reviewer`/`repo` on save** and break the cloud wiring. Design treats `{name, kind?, command, cron, enabled}` as core and **passes through / preserves everything else**; `kind` is optional.
- **Confidence:** high (read directly from disk, 2026-06-15). _Source:_ `~/vakio-mono/loops.yaml`, scaffold template.
- **Confirm:** ✅ **RESOLVED:** preserve all unknown fields; `routine:` machine-owned (never edit/drop); `reviewer:`/`repo:` shown **read-only** in v1. → ADR 0001.

## 2. Editing `command` must preserve block-scalar style (`>` / `|`)

- **Fact:** vakio's `command:` is a multi-line folded scalar. The `yaml` lib preserves it automatically when you edit _other_ keys, but editing `command` itself requires setting the Scalar node `type` to keep `>`.
- **Why it matters:** A naive edit would flatten a readable folded command into one long quoted line (ugly diff, but not data loss).
- **Confidence:** high. _Source:_ [[yaml-document-api]] §6b.
- **Confirm:** ✅ **RESOLVED:** yes — preserve original block style on edit; round-trip test asserts it. → ADR 0002.

## 3. `yaml` trailing-comment handling is not 100% stable

- **Fact:** The official docs warn comment handling "is not completely stable, in particular for trailing comments" when adding/removing nodes near them.
- **Why it matters:** Add/delete-loop operations _could_ nudge a trailing comment to an adjacent node in rare cases.
- **Mitigation in design:** round-trip unit tests run against the **real** scaffold + vakio fixtures, and **every write is diff-confirmed by the human** in the UI before it lands.
- **Confidence:** medium. _Source:_ https://eemeli.org/yaml/#comments-and-blank-lines (2026-06-15).
- **Confirm:** ✅ **RESOLVED:** yes — diff-confirm-before-write is the safeguard; add/delete allowed; round-trip tests on real fixtures. → ADR 0002.

---

_When reviewed, run `/spec` (refine) to lock criteria → `ready`._
