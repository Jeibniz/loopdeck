# 0002. Comment-preserving writes via the `yaml` Document API + diff-confirm

- **Date:** 2026-06-15
- **Status:** accepted

## Context

`loops.yaml` files open with a multi-line `#` explainer the team relies on, plus inline comments and (in vakio) a folded `command: >` block. Preserving all of this on write is the core requirement. `js-yaml` drops comments on dump and is disqualified. The `yaml` (eemeli) lib preserves comments **only** if you mutate the parsed `Document` in place rather than rebuilding from a plain object — and its docs warn that **trailing-comment** handling "is not completely stable" when adding/removing adjacent nodes. See [[yaml-document-api]].

## Decision

- Use **`yaml@^2.8`**. Read with `parseDocument`; mutate surgically (`setIn`/`set`/`deleteIn`; append via `doc.get('loops', true).add(doc.createNode(loop))`); serialize with `toString({ lineWidth: 0 })`. Never go through `toJS()` + new Document.
- **Preserve block-scalar style** when editing `command`: set the Scalar node `type` (`Scalar.BLOCK_FOLDED`/`BLOCK_LITERAL`).
- **Every write is diff-confirmed** by the human in the UI (preview → confirm → write). This is the safeguard against the trailing-comment instability; add/delete are allowed (not refused).
- **Atomic write** (tmp-in-same-dir + `rename`) and a **409 staleness** guard on `mtime`. See [[local-server-safety]].
- A round-trip unit test asserts comments + trailing newline preserved and untouched lines byte-identical, run against **real** scaffold + vakio fixtures.

## Consequences

- Comments, blank lines, field order, and block styles survive edits.
- The human diff-confirm both builds trust and catches the rare trailing-comment drift before it lands.
- Slightly more code than a naive dump, but it's the whole point of the tool.

## Alternatives considered

- **js-yaml / naive dump:** rejected — destroys comments.
- **Refuse add/delete to avoid trailing-comment risk:** rejected — too limiting; diff-confirm + fixtures cover it.
- **Text-surgery (regex line edits):** rejected — brittle vs. YAML structure (multi-line scalars, anchors).
