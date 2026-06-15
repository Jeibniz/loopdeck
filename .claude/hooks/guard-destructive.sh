#!/usr/bin/env bash
# guard-destructive.sh — Claude Code PreToolUse hook (Bash).
#
# Denies a small set of genuinely catastrophic, hard-to-undo shell commands.
# Everything else passes straight through. The goal is a safety net against
# fat-finger disasters, NOT a nanny that blocks normal work.
#
# Blocks:
#   1. Recursive force-delete of dangerous roots:
#        rm -rf /     rm -rf /*     rm -rf ~     rm -rf $HOME     rm -rf .* etc.
#   2. Force-push to a protected branch (main / master), and bare `git push -f`
#      (current branch might be main). `--force-with-lease` is allowed — it's the
#      safe variant.
#   3. `git reset --hard` with NO ref (silently nukes all uncommitted work).
#      `git reset --hard <ref>` is allowed.
#
# Compatible with macOS' system bash 3.2.

command -v jq >/dev/null 2>&1 || exit 0

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null || true)
[ -n "$cmd" ] || exit 0

lc=$(printf '%s' "$cmd" | tr '[:upper:]' '[:lower:]')

deny() {
  jq -n --arg r "$1" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
}

# 1. Catastrophic recursive deletes. Match `rm` with combined -rf/-fr (any order)
#    targeting filesystem root, home, or a bare wildcard.
if printf '%s' "$lc" | grep -qE '\brm[[:space:]]+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r|-r[[:space:]]+-f|-f[[:space:]]+-r)'; then
  if printf '%s' "$lc" | grep -qE '(rm[^|;&]*[[:space:]])(/|/\*|~|~/|\$home|\.|\.\*|\*)([[:space:]]|$)'; then
    deny "Refusing 'rm -rf' against a filesystem root / home / bare wildcard — this is almost always a mistake and is unrecoverable. Delete a specific, named path instead, or run it yourself if you really mean it."
  fi
fi

# 2. Dangerous force-push.
if printf '%s' "$lc" | grep -qE '\bgit[[:space:]]+push\b'; then
  # Allow the safe variant outright.
  if ! printf '%s' "$lc" | grep -qE '\-\-force-with-lease'; then
    if printf '%s' "$lc" | grep -qE '\-\-force|[[:space:]]\-f([[:space:]]|$)|[[:space:]]\-[a-z]*f[a-z]*([[:space:]]|$)'; then
      if printf '%s' "$lc" | grep -qE 'main|master'; then
        deny "Refusing a force-push that mentions main/master. Force-pushing a shared/default branch rewrites its history. Use '--force-with-lease' on a feature branch, or push without --force."
      else
        deny "Refusing a bare force-push — the current branch could be main/master. Use '--force-with-lease' (rejects if the remote moved), or push the branch normally."
      fi
    fi
  fi
fi

# 3. `git reset --hard` with no ref → discards all uncommitted work silently.
if printf '%s' "$lc" | grep -qE '\bgit[[:space:]]+reset[[:space:]]+\-\-hard([[:space:]]*$|[[:space:]]*(;|&|\|))'; then
  deny "Refusing 'git reset --hard' with no target ref — it silently discards ALL uncommitted changes. If that's the intent, run it yourself, or 'git stash' first so it's recoverable."
fi

exit 0
