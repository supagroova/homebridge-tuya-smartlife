#!/usr/bin/env bash
# PreToolUse hook for Write. When a NEW production .ts file is being written
# under `src/`, require that a corresponding test already exists somewhere under
# `src/` - the test-first half of TDD.
#
# Reads the tool payload as JSON on stdin (Codex hook contract).
# Emits a blocking JSON response to stderr (permissionDecision "deny") + exit 2
# when the rule is violated.
#
# Exempt (always allowed through):
#   *.test.ts, *.d.ts, src/index.ts, src/platform.ts (Homebridge glue), and any
#   write whose content carries a `// tdd-audit: exempt` marker.
set -euo pipefail

payload="$(cat)"
tool_name="$(printf '%s' "$payload" | jq -r '.tool_name // empty' 2>/dev/null || true)"
file_path="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)"
content="$(printf '%s' "$payload" | jq -r '.tool_input.content // empty' 2>/dev/null || true)"

# Only police Write - Edits to existing files are usually refactors.
if [[ "$tool_name" != "Write" ]]; then exit 0; fi
if [[ -z "$file_path" ]]; then exit 0; fi

# If the file already exists, this is an overwrite of working code - let it through.
if [[ -f "$file_path" ]]; then exit 0; fi

# Only police production .ts under src/.
needs_test=false
case "$file_path" in
  */src/*.ts | src/*.ts)
    needs_test=true
    ;;
esac
if [[ "$needs_test" != true ]]; then exit 0; fi

# Exempt by path/suffix.
case "$file_path" in
  *.test.ts | *.d.ts | */src/index.ts | src/index.ts | */src/platform.ts | src/platform.ts)
    exit 0
    ;;
esac

# Exempt by content marker carried in the write itself.
if printf '%s' "$content" | grep -qE "// tdd-audit: exempt"; then
  exit 0
fi

# Look for any existing test file under src/ that references the target basename.
basename_no_ext="$(basename "$file_path" .ts)"
allow=false
if [[ -n "$basename_no_ext" ]]; then
  # (a) a test file path that contains the basename, OR
  if find src -type f -name '*.test.ts' -path "*${basename_no_ext}*" 2>/dev/null | grep -q .; then
    allow=true
  fi
  # (b) a test file that imports/references the basename (import string).
  if [[ "$allow" != true ]]; then
    if grep -rlqE "(from ['\"][^'\"]*${basename_no_ext}(\.js|\.ts)?['\"])|(import\(['\"][^'\"]*${basename_no_ext}(\.js|\.ts)?['\"]\))" \
        --include='*.test.ts' src 2>/dev/null; then
      allow=true
    fi
  fi
fi
if [[ "$allow" == true ]]; then exit 0; fi

# Emit the standard PreToolUse block response.
cat <<EOF >&2
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"TDD: '$file_path' is new production code. No *.test.ts under src/ references its basename '$basename_no_ext'. Write the failing test first, then re-attempt the Write. (If genuinely glue, add a top-of-file '// tdd-audit: exempt' marker.)"}}
EOF
exit 2
