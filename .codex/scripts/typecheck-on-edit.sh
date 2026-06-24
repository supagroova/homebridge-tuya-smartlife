#!/usr/bin/env bash
# PostToolUse hook: when an Edit/Write touches a TypeScript file, auto-format it
# with prettier --write, then run eslint on it, then typecheck the whole project
# with tsc --noEmit. Reads the tool payload as JSON on stdin and inspects
# file_path. Lint/type errors are fed back to Codex (exit 2) with output
# truncated so the hook return value stays digestible.
set -uo pipefail

payload="$(cat)"
file_path="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)"

case "$file_path" in
  *.ts) ;;
  *) exit 0 ;;  # Not a TS edit - nothing to do.
esac

status=0
output=""

# 1. Auto-fix formatting on the edited file.
fmt=$(npx prettier --write "$file_path" 2>&1) || {
  status=1; output+="prettier --write:\n$fmt\n\n"
}

# 2. Lint the edited file.
lint=$(npx eslint "$file_path" 2>&1) || {
  status=1; output+="eslint:\n$lint\n\n"
}

# 3. Typecheck the project (tsc needs the whole program, not a single file).
types=$(npx tsc --noEmit 2>&1) || {
  status=1; output+="tsc --noEmit:\n$types\n\n"
}

if [[ "$status" -ne 0 ]]; then
  printf '%b' "$output" | head -60 >&2
  exit 2
fi
exit 0
