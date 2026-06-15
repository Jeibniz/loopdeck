#!/usr/bin/env bash
# require-verification.sh — Claude Code PreToolUse hook (Bash).
#
# Blocks `gh pr create` when source has changed since the last green test run —
# the mechanical half of verification-before-completion at the ship boundary.
# The /test skill (and /autopilot) write ws/.verify/PASS on a fully green run.
#
# No-ops unless the command is `gh pr create`. Skips entirely if the project has
# no tests yet (nothing to verify). Override: VERIFY_SKIP=1.
#
# Compatible with macOS' system bash 3.2.

command -v jq >/dev/null 2>&1 || exit 0

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null || true)
[ -n "$cmd" ] || exit 0
printf '%s' "$cmd" | grep -qE '\bgh[[:space:]]+pr[[:space:]]+create\b' || exit 0
[ "${VERIFY_SKIP:-}" = "1" ] && exit 0

root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0

deny() {
  jq -n --arg r "$1" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
}

# If there are no tests at all, there's nothing to gate on — let it through.
has_tests=$(find "$root" \( -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -path '*/tests/*' \) \
  -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.venv/*' -print -quit 2>/dev/null)
[ -n "$has_tests" ] || exit 0

marker="$root/ws/.verify/PASS"
if [ ! -f "$marker" ]; then
  deny "No verification marker (ws/.verify/PASS). Run the tests green first (the /test skill writes the marker), then open the PR. Deliberate override: VERIFY_SKIP=1."
fi

# Any source file newer than the marker → tests are stale.
newer=$(find "$root" -type f \
  \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.py' \
     -o -name '*.go' -o -name '*.rs' -o -name '*.rb' -o -name '*.java' -o -name '*.vue' -o -name '*.svelte' \) \
  -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' -not -path '*/.venv/*' \
  -newer "$marker" -print -quit 2>/dev/null)
if [ -n "$newer" ]; then
  deny "Source changed since the last green test run (e.g. ${newer#"$root"/}). Re-run /test (green) before opening the PR, or override with VERIFY_SKIP=1."
fi

exit 0
