---
name: research
description: Gather and curate the domain knowledge a project needs to be built correctly — from authoritative sources — into a cited, confidence-flagged docs/domain/ corpus, with a CONFIRM list for human review. Run between framing a goal (/spec) and locking it.
---

Build the **building blocks** a knowledge-heavy project stands on, so the build isn't improvised. You
answer a **research agenda** (produced by `/spec` framing) with authoritative facts, persist them
durably, and flag what a human must confirm.

**Self-contained:** uses the core `WebSearch` + `WebFetch` tools (present on cloud/phone); _upgrades_
to `superpowers:deep-research` and `context7` (MCP) when those are available.

## Steps

1. **Get the agenda.** Read the active goal's `## Research agenda` plus `CLAUDE.md` / `STATUS.md`. If
   there's no agenda yet, run `/spec` (frame) first — research without a product goal is unfocused.
2. **Research each question.** Prefer **primary / authoritative** sources (official API docs, a
   government/standards body, the vendor) over blogs/SEO content. For each question: search → fetch →
   read the primary source → distill the facts that actually change the build. Use `context7` for
   library/SDK/API specifics; dispatch `researcher` agents (in parallel for independent topics), or
   `superpowers:deep-research` when present, for deep multi-source topics.
3. **Verify high-stakes facts adversarially.** For anything money / legal / correctness-critical (tax
   rates, account numbers, API field names, compliance rules): cross-check ≥2 sources and dispatch the
   `verifier` agent to try to refute it. If it can't be confirmed, mark it low-confidence.
4. **Curate into `docs/domain/`** — distilled, never raw dumps:
   - one topic file per area (`docs/domain/<topic>.md`, from `_TOPIC_TEMPLATE.md`): summary, the key
     facts/rules, **sources (URL + date)**, **confidence** (high/medium/low), `needs-confirmation`
     flags, last-updated.
   - update `docs/domain/MANIFEST.md` (the index).
5. **Write `docs/domain/CONFIRM.md`** — the short list of **high-stakes facts the human should confirm**
   (the review gate): each fact, its source, your confidence, and why it matters. Then **STOP and ask
   the user to review/correct `docs/domain/`** before the spec locks.
6. **Feed the spec.** Note which agenda questions are now answered, and which became open-questions /
   required-inputs. Tell the user to run `/spec` (refine) once they've reviewed CONFIRM.

## Rules

- **Cite every fact** (source + date). Undated, unsourced "facts" are not building blocks.
- **Distill, don't dump.** The corpus is what the builder reads — keep it tight and decision-relevant.
- **Flag staleness:** rates / laws / APIs drift; date everything and mark what may change.
- **Don't decide product forks** here — surface them; `/spec` decides. Research informs, it doesn't commit.
- **A confidently-wrong fact is worse than a known gap.** When unsure, mark low-confidence and add it to CONFIRM.
