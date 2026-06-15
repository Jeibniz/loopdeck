#!/usr/bin/env bash
# Re-vendor the shared agent-scaffold config into this repo. Run locally where the
# kit exists (set SCAFFOLD_DIR if it's not at ~/Projects/_agent-scaffold).
set -euo pipefail
KIT="${SCAFFOLD_DIR:-$HOME/Projects/_agent-scaffold}"
[ -d "$KIT" ] || { echo "kit not found at $KIT (set SCAFFOLD_DIR)"; exit 1; }
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
for d in skills agents hooks workflows; do
  rm -rf "$here/.claude/$d"; cp -R "$KIT/.claude/$d" "$here/.claude/$d"
done
cp "$KIT/.claude/settings.json" "$here/.claude/settings.json"
for f in AGENTS.md PLAYBOOK.md AUTONOMY.md ORCHESTRATION.md TICKETS.md LOOPS.md; do cp "$KIT/$f" "$here/$f"; done
# ensure domain-corpus + reports + loops scaffolding exists; never clobber real notes/config
mkdir -p "$here/docs/domain" "$here/ws/reports"
for f in MANIFEST.md _TOPIC_TEMPLATE.md; do
  [ -f "$here/docs/domain/$f" ] || cp "$KIT/templates/autonomy/docs/domain/$f" "$here/docs/domain/$f"
done
[ -f "$here/ws/reports/_TEMPLATE.md" ] || cp "$KIT/templates/autonomy/ws/reports/_TEMPLATE.md" "$here/ws/reports/_TEMPLATE.md"
[ -f "$here/loops.yaml" ] || cp "$KIT/templates/autonomy/loops.yaml" "$here/loops.yaml"
echo "Synced from $KIT. Review 'git diff' and commit. (Bootstrap ticket labels once: see TICKETS.md.)"
