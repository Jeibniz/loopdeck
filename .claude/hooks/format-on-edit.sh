#!/usr/bin/env bash
# format-on-edit.sh — Claude Code PostToolUse hook (Edit|Write|MultiEdit).
#
# Formats the file Claude just wrote with the project's Prettier, so editor
# output matches what `prettier --write` / the /format skill would produce.
#
# Best-effort and NON-BLOCKING: any failure (no Prettier, parse error, ignored
# file) is swallowed and the hook exits 0. It never blocks an edit.
#
# Stack focus: TypeScript/Node (Prettier). It also opportunistically runs
# `ruff`/`gofmt` if a file of that type is edited and the tool happens to be on
# PATH, but it never installs anything and never fails loudly.
#
# Compatible with macOS' system bash 3.2 — no associative arrays, no `${var^^}`.

command -v jq >/dev/null 2>&1 || exit 0

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)
[ -n "$file" ] || exit 0
[ -f "$file" ] || exit 0

ext="${file##*.}"

# Walk up from the file to find the nearest package.json (project root) and the
# repo root (nearest ancestor with a .git entry).
dir=$(cd "$(dirname "$file")" 2>/dev/null && pwd) || exit 0
proj_root=""
d="$dir"
while [ "$d" != "/" ] && [ -n "$d" ]; do
  if [ -f "$d/package.json" ]; then proj_root="$d"; break; fi
  d=$(dirname "$d")
done

run() { "$@" >/dev/null 2>&1 || true; }

# Find a ruff: nearest project .venv/venv, else PATH. Echoes the binary path.
find_ruff() {
  local d="$dir"
  while [ "$d" != "/" ] && [ -n "$d" ]; do
    [ -x "$d/.venv/bin/ruff" ] && { echo "$d/.venv/bin/ruff"; return 0; }
    [ -x "$d/venv/bin/ruff" ]  && { echo "$d/venv/bin/ruff";  return 0; }
    d=$(dirname "$d")
  done
  command -v ruff >/dev/null 2>&1 && { echo ruff; return 0; }
  return 1
}

format_prettier() {
  # Prefer a locally installed Prettier; fall back to a package-manager exec.
  if [ -n "$proj_root" ] && [ -x "$proj_root/node_modules/.bin/prettier" ]; then
    run "$proj_root/node_modules/.bin/prettier" --write --log-level=warn "$file"
  elif command -v pnpm >/dev/null 2>&1 && [ -n "$proj_root" ]; then
    ( cd "$proj_root" && run pnpm exec prettier --write --log-level=warn "$file" )
  elif command -v npx >/dev/null 2>&1; then
    run npx --no-install prettier --write --log-level=warn "$file"
  fi
}

case "$ext" in
  ts|tsx|js|jsx|mjs|cjs|json|jsonc|md|mdx|css|scss|less|html|yaml|yml|graphql|vue|svelte)
    format_prettier
    ;;
  py)
    rb=$(find_ruff) && { run "$rb" format "$file"; run "$rb" check --fix "$file"; }
    ;;
  go)
    command -v gofmt >/dev/null 2>&1 && run gofmt -w "$file"
    ;;
esac

exit 0
