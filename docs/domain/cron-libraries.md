# Domain: cron handling — `cron-parser` (validate) + `cronstrue` (describe)

- **Last updated:** 2026-06-15   **Overall confidence:** high

## Summary
Use **`cron-parser` as the authoritative validator** (and for "next run" hints) and **`cronstrue` purely for the human-readable label**. They have independent parsers and can disagree on edge cases, so never treat cronstrue output as a validity signal. The scaffold uses standard **5-field** crons (`m h dom mon dow`), e.g. `0 2 * * 1`, `7 6 * * 1` ([[loops-schema]]).

## Key facts / rules
- **`cron-parser@5.5.0`** (2026-01-16), CommonJS, works in ESM+CJS. **v5 import changed:** `import { CronExpressionParser } from 'cron-parser'` then `CronExpressionParser.parse(expr, options?)`. The old v4 `parser.parseExpression(...)` API is **gone** in v5. _Source:_ https://github.com/harrisiirak/cron-parser, https://registry.npmjs.org/cron-parser/latest (2026-06-15). _Confidence:_ high.
- **Validation = it throws synchronously on invalid input.** Wrap in try/catch → `{valid:false, message: err.message}`. _Confidence:_ high.
- **Fields:** accepts standard **5-field** and **6-field** (leading seconds). Default (non-strict) parses the scaffold's 5-field crons fine. **Do NOT enable `strict: true`** — it's stricter about field count and rejects using dayOfMonth+dayOfWeek together. _Source:_ cron-parser README (2026-06-15). _Confidence:_ high.
- **Next run:** `const it = CronExpressionParser.parse('0 2 * * 1'); it.next().toString();` or `it.take(3)` for the next N — feeds a "next run" UI hint. _Confidence:_ high.
- **`cronstrue@3.14.0`** (2026-03-18). Import `import cronstrue from 'cronstrue'`. `cronstrue.toString("0 2 * * 1")` → `"At 2:00 AM, only on Monday"`. _Source:_ https://github.com/bradymholt/cRonstrue, https://registry.npmjs.org/cronstrue/latest (2026-06-15). _Confidence:_ high.
- **cronstrue options:** `throwExceptionOnParseError` (default **true** → throws on bad input; set **false** to return the error string instead — safe for never-crash display), `verbose`, `use24HourTimeFormat`, `locale` (`cronstrue/i18n`, 30+ locales). Handles 5/6/7-field cleanly. _Confidence:_ high.

## Design implications for loopdeck
- Validator: `cron-parser` `CronExpressionParser.parse` in try/catch, `strict` OFF. Block writes of invalid cron; surface `err.message`.
- Display: call `cronstrue.toString(expr, { throwExceptionOnParseError: false })` **only after** validation passes (belt-and-suspenders against disagreement). Show inline in the loops table.
- Pin: `"cron-parser": "^5.5"`, `"cronstrue": "^3.14"`.

## Open / needs confirmation
- (none — both are display/validation conveniences, not high-stakes; behavior verified against official docs.)

## Sources
- https://github.com/harrisiirak/cron-parser · https://registry.npmjs.org/cron-parser/latest — v5.5.0 (primary) · 2026-06-15
- https://github.com/bradymholt/cRonstrue · https://registry.npmjs.org/cronstrue/latest — v3.14.0 (primary) · 2026-06-15
