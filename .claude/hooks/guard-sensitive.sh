#!/usr/bin/env bash
# guard-sensitive.sh — Claude Code PreToolUse hook (Bash).
#
# Sandbox-first hard gate. Denies live / irreversible / externally-visible
# actions unless the human has explicitly authorized going live with LIVE=1
# (either in the environment or inline on the command).
#
# Generic patterns: production deploys, public publish/release. Per-project live
# endpoints/commands go in .claude/sensitive-deny.txt (one extended-regex per
# line; '#' comments allowed) so each project tightens the net for its own APIs.
#
# Compatible with macOS' system bash 3.2.

command -v jq >/dev/null 2>&1 || exit 0

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null || true)
[ -n "$cmd" ] || exit 0
lc=$(printf '%s' "$cmd" | tr '[:upper:]' '[:lower:]')

# Human go-live gate: explicit LIVE=1 in the env or inline on the command.
if [ "${LIVE:-}" = "1" ] || printf '%s' "$cmd" | grep -qE '(^|[[:space:]])LIVE=1([[:space:]]|$)'; then
  exit 0
fi

deny() {
  jq -n --arg r "$1" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
}

reason=""
if printf '%s' "$lc" | grep -qE 'vercel[^|;&]*--prod|netlify[^|;&]*deploy[^|;&]*--prod|wrangler[[:space:]]+deploy|fly(ctl)?[[:space:]]+deploy|gcloud[[:space:]]+(run|app|functions)[[:space:]]+deploy|(terraform|tofu)[[:space:]]+apply|serverless[[:space:]]+deploy|sst[[:space:]]+deploy|kubectl[[:space:]]+apply|git[[:space:]]+push[[:space:]]+heroku'; then
  reason="a production deploy"
elif printf '%s' "$lc" | grep -qE '(npm|pnpm|yarn)[[:space:]]+publish|twine[[:space:]]+upload|cargo[[:space:]]+publish|gh[[:space:]]+release[[:space:]]+create|docker[[:space:]]+push'; then
  reason="a publish to a public registry / release"
fi

# Per-project sensitive patterns (live endpoints, money endpoints, real comms).
if [ -z "$reason" ]; then
  denyfile="$(git rev-parse --show-toplevel 2>/dev/null)/.claude/sensitive-deny.txt"
  if [ -f "$denyfile" ]; then
    while IFS= read -r pat; do
      case "$pat" in '' | \#*) continue ;; esac
      if printf '%s' "$cmd" | grep -qiE "$pat"; then
        reason="a project-listed sensitive action (matched: $pat)"
        break
      fi
    done < "$denyfile"
  fi
fi

[ -n "$reason" ] || exit 0
deny "Blocked (sandbox-first): this looks like $reason — autonomous runs stay in sandbox/dry-run. To go live, confirm with the human and re-run with LIVE=1 set (e.g. 'LIVE=1 <cmd>'). See AUTONOMY.md."
exit 0
