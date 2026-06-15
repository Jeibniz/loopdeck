# Domain: `yaml` (eemeli) v2 Document API — comment-preserving edits

- **Last updated:** 2026-06-15 **Overall confidence:** high (medium on trailing-comment edge cases)

## Summary

The `yaml` package by Eemeli Aro (`yaml@^2.8.4`) is the only mainstream JS YAML lib that round-trips comments. **Golden rule:** `parseDocument(str)` → mutate the **same `Document`** in place → `doc.toString()`. Never round-trip through `toJS()` + `new Document()` — that discards comments, blank lines, anchors, and block styles. This is the heart of loopdeck's safe writes ([[loops-schema]]).

## Key facts / rules

- **Parse:** `const doc = YAML.parseDocument(str)` preserves comments/anchors/styles. For read-only display, `doc.toJS()` (rich: may yield Map/Set/Date) or `doc.toJSON()` (plain JSON values). Neither mutates. _Source:_ https://eemeli.org/yaml/#documents (2026-06-15). _Confidence:_ high.
- **Surgical mutation (path = array of keys/indices):** `doc.get(key, keepScalar?)`, `doc.set`, `doc.has`, `doc.delete`, `doc.getIn(path, keepScalar?)`, `doc.setIn(path, value)` (creates missing intermediates), `doc.hasIn`, `doc.deleteIn(path)` (**throws** if an intermediate is missing), `doc.addIn`. e.g. `doc.setIn(['loops', 2, 'enabled'], false)`. _Source:_ https://eemeli.org/yaml/#documents (2026-06-15). _Confidence:_ high.
- **Append to a sequence:** `const seq = doc.get('loops', true)` (the `true` = `keepScalar`, returns the `YAMLSeq` node not the unwrapped value) → `seq.add(doc.createNode({name:'x', kind:'producer', ...}))`. `createNode` recursively wraps the input in Node containers. _Source:_ https://eemeli.org/yaml/#documents (2026-06-15). _Confidence:_ high.
- **Comments live as node properties:** every Scalar/Map/Seq/Document has `commentBefore` (leading block, raw, no `#`), `comment` (trailing/inline), `spaceBefore` (blank-line). `setIn`/`set` on the parsed Document replaces only the target node's value and **leaves comments on all untouched siblings intact** — the whole reason to mutate the parsed Document. _Source:_ https://eemeli.org/yaml/#comments-and-blank-lines (2026-06-15). _Confidence:_ high.
- **Serialize:** `String(doc)` === `doc.toString()` (**throws if `doc.errors` is non-empty** → use this to detect unparseable files). For fidelity use `doc.toString({ lineWidth: 0 })` — `lineWidth:0` disables wrapping so plain/quoted scalars aren't re-folded. Other options: `singleQuote`, `nullStr`, `blockQuote` (default `true` keeps `>`/`|` styles). _Source:_ https://eemeli.org/yaml/#options (2026-06-15). _Confidence:_ high.
- **Block-scalar style is on the node `type`:** untouched folded scalars stay folded automatically. To _set_ a value that must stay folded/literal: get the Scalar node (`doc.getIn(path, true)`), set `node.value = '...'` and `node.type = Scalar.BLOCK_FOLDED` (`>`) / `Scalar.BLOCK_LITERAL` (`|`). Keep `blockQuote:true`. _Source:_ https://eemeli.org/yaml/#scalar-values (2026-06-15). _Confidence:_ high. **Relevant:** vakio's `command: >` ([[loops-schema]]).
- **Anchors/aliases:** `node.anchor` / `Alias` nodes survive round-trip when you edit unrelated keys; just don't delete an anchor-defining node an alias depends on. _Source:_ https://eemeli.org/yaml/#scalar-values (2026-06-15). _Confidence:_ high.
- **Version:** `yaml@2.8.4` (2026-05-02). Document API stable across all of 2.x. A `3.0.0-1` pre-release exists but is **not** GA — pin `^2.8`. v1 used a single `comment`; v2 split into `comment`/`commentBefore` — don't follow v1 examples. _Source:_ https://www.npmjs.com/package/yaml, https://github.com/eemeli/yaml/releases (2026-06-15). _Confidence:_ high.

## Open / needs confirmation

- **Documented soft spot:** "comment handling is not completely stable, in particular for **trailing comments**" — on add/remove of nodes adjacent to a trailing comment, it may re-associate. **Mitigation:** the round-trip test must assert against real scaffold + vakio fixtures (block scalar + inline comments + header), and the UI's diff-confirm is the human safety net. Listed in `CONFIRM.md`. _Source:_ https://eemeli.org/yaml/#comments-and-blank-lines (2026-06-15). _Confidence:_ medium.

## Sources

- https://eemeli.org/yaml/ · https://eemeli.org/yaml/#documents · #comments-and-blank-lines · #scalar-values · #options — official docs (primary) · accessed 2026-06-15
- https://www.npmjs.com/package/yaml · https://github.com/eemeli/yaml/releases — version 2.8.4 (primary) · 2026-06-15
