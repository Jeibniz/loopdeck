# Domain knowledge — MANIFEST

Curated, cited **building blocks** this project is built on — the output of `/research`. The build
(`/spec`, `/autopilot`, and the agents) grounds decisions on these files and cites them. Each fact
carries a source + date + confidence.

> High-stakes facts awaiting your sign-off live in `CONFIRM.md`.

| Topic | File | Confidence | Last updated | Notes |
|-------|------|-----------|--------------|-------|
| loops.yaml + frontmatter schema | [loops-schema.md](loops-schema.md) | high | 2026-06-15 | Schema is **extensible**; vakio adds repo/reviewer/routine + folded `command`; preserve unknown fields |
| `yaml` (eemeli) Document API | [yaml-document-api.md](yaml-document-api.md) | high / medium | 2026-06-15 | Comment-preserving edits; trailing-comment instability caveat → test on real fixtures |
| cron libraries | [cron-libraries.md](cron-libraries.md) | high | 2026-06-15 | `cron-parser`@5 validates (v5 import changed); `cronstrue`@3 describes |
| local-server safety | [local-server-safety.md](local-server-safety.md) | high | 2026-06-15 | loopback bind · realpath under-root · atomic write · 409 staleness |
