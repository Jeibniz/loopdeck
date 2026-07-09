#!/usr/bin/env bash
# scan-secrets.sh — Claude Code PreToolUse hook (Bash).
#
# Blocks `git commit` when the staged change adds an env file or content that
# looks like a secret (key / token / private key). A backstop, not a vault.
#
# No-ops unless the command is `git commit`. Override: SECRETS_SKIP=1.
# Compatible with macOS' system bash 3.2.

command -v jq >/dev/null 2>&1 || exit 0

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null || true)
[ -n "$cmd" ] || exit 0
printf '%s' "$cmd" | grep -qE '\bgit[[:space:]]+commit\b' || exit 0
[ "${SECRETS_SKIP:-}" = "1" ] && exit 0

root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" 2>/dev/null || exit 0

deny() {
  jq -n --arg r "$1" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
}

# 1. A real env file being committed (.env, .env.local, .env.production — but not .example/.sample).
staged=$(git diff --cached --name-only 2>/dev/null)
envfile=$(printf '%s\n' "$staged" | grep -E '(^|/)\.env' | grep -vE '\.example$|\.sample$|\.template$' | head -1)
if [ -n "$envfile" ]; then
  deny "Refusing to commit '$envfile' — env files hold secrets and must stay gitignored. Use .env.example for placeholders. Override: SECRETS_SKIP=1."
fi

# 2. Secret-looking content in the staged diff (added lines).
diff=$(git diff --cached -U0 2>/dev/null)
# Note: gh token run is {30,} — real GitHub tokens are 36+ chars; a looser {20,} false-positives on
# long camelCase identifiers (e.g. a test method name), which then denies the whole `git commit` cmd.
hit=$(printf '%s' "$diff" | grep -aE -- '-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|xox[baprs]-[0-9A-Za-z-]{10,}|gh[pousr]_[A-Za-z0-9]{30,}|AIza[0-9A-Za-z_-]{35}|sk_live_[0-9A-Za-z]{16,}' | head -1)
if [ -n "$hit" ]; then
  deny "The staged diff looks like it contains a secret (private key / API token). Remove it, move it to an env var or secret store, and recommit. False positive? SECRETS_SKIP=1."
fi

exit 0
