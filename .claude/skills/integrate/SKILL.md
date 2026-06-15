---
name: integrate
description: Wire an external service into the project safely — sandbox/test mode by default, secrets in .env, a thin typed client, and a smoke test. Use when a feature needs a brokerage/accounting/market-data/email/etc. API or an MCP server.
---

Add an integration without leaking secrets or touching anything live.

## Steps

1. **Pick the access path.**
   - Prefer a good **MCP server** if one exists — add it to the project's `.mcp.json` or
     `.claude/settings.local.json`, **never** the shared symlinked `settings.json`.
   - Otherwise a **thin typed client** in `src/integrations/<service>/`.
   - Use `context7` (MCP) for version-correct SDK docs; `superpowers:deep-research` / `WebSearch` to
     choose a provider.
2. **Secrets.** Put keys in `.env.example` (placeholders) and read them from `.env` (gitignored).
   Never hardcode, never commit, never log. The `scan-secrets` hook backstops commits.
3. **Sandbox-first.** Default the client to the provider's **paper / sandbox / test** endpoint and a
   **dry-run** flag that logs the intended call instead of performing it. Live mode requires `LIVE=1`
   (the `guard-sensitive` hook enforces it). Add the provider's live host(s) to
   `.claude/sensitive-deny.txt`.
4. **Smoke test.** One read-only/sandbox call that proves auth + connectivity (skip in CI when creds
   are absent). Add a unit test with the network **mocked**.
5. **Document.** `docs/integrations/<service>.md`: purpose, env vars, sandbox vs live, the human gate
   to go live, links. Append a `ws/journal.md` entry, and an ADR if it's a notable choice.

## Rules
- The default state of any new integration is **cannot move money / cannot mutate live data**.
- Going live is a human checkpoint — surface it, never flip it yourself.
- Mock the network in tests; never hit a live endpoint in CI.
