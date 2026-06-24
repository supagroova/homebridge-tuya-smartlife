#!/usr/bin/env bash
# Audits production source files under src/ that have no corresponding test.
#
# Production code under src/ is required to be test-first. This script lists
# files violating that rule by searching for any *.test.ts under src/ that
# imports or names them.
#
# Skipped (not audited):
#   - *.test.ts, *.d.ts
#   - one-line barrels / re-exports
#   - constant-only modules (no function/class/arrow logic to test)
#   - files carrying a `// tdd-audit: exempt` marker in their first 3 lines
#
# A path listed in .codex/tdd-debt.txt is reported as non-fatal debt; any other
# untested non-exempt file is a hard failure.
#
# Exit codes:
#   0 - all production files referenced by a test (or in the debt allowlist)
#   1 - at least one NEW untested production file detected
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

candidates=()
while IFS= read -r f; do
  case "$f" in *.d.ts) continue ;; esac
  # Skip one-line barrels / trivial re-exports.
  if [[ $(wc -l < "$f") -le 1 ]]; then continue; fi
  # Skip constant-only modules: no function/class/method logic worth unit-testing.
  # (matches `function`, `class`, `=>`, or a method-like `name(` body).
  if ! grep -qE '(\bfunction\b|\bclass\b|=>|^\s*[A-Za-z0-9_]+\s*\([^)]*\)\s*[:{])' "$f"; then
    continue
  fi
  candidates+=("$f")
done < <(find src -type f -name '*.ts' ! -name '*.test.ts' 2>/dev/null | sort)

missing=()
for f in ${candidates[@]+"${candidates[@]}"}; do
  # Explicit per-file exemption: a top-of-file `// tdd-audit: exempt` marker
  # (used for thin glue files exercised via the live Homebridge API surface).
  if head -3 "$f" | grep -qE "// tdd-audit: exempt"; then
    continue
  fi

  basename_no_ext="$(basename "$f" .ts)"
  rel_no_ext="${f%.ts}"

  # Match static `from '...'` or dynamic `import('...')` against full relative
  # path or basename, in any *.test.ts under src/.
  if grep -rqE "(from ['\"][^'\"]*${rel_no_ext}([./].*)?(\.js|\.ts)?['\"])|(from ['\"][^'\"]*${basename_no_ext}(\.js|\.ts)?['\"])|(import\(['\"][^'\"]*${rel_no_ext}(\.js|\.ts)?['\"]\))|(import\(['\"][^'\"]*${basename_no_ext}(\.js|\.ts)?['\"]\))" \
      --include='*.test.ts' src 2>/dev/null; then
    continue
  fi
  missing+=("$f")
done

# Load the debt allowlist. Anything in it is reported as debt but does not fail.
debt_file=".codex/tdd-debt.txt"
new_failures=()
debt_remaining=()
is_debt() {
  [[ -f "$debt_file" ]] && grep -Fxq "$1" "$debt_file" 2>/dev/null
}
for f in ${missing[@]+"${missing[@]}"}; do
  if is_debt "$f"; then
    debt_remaining+=("$f")
  else
    new_failures+=("$f")
  fi
done

if [[ ${#new_failures[@]} -gt 0 ]]; then
  echo "TDD audit FAILED - ${#new_failures[@]} NEW production file(s) without a test:" >&2
  for f in "${new_failures[@]}"; do echo "  - $f" >&2; done
  echo "" >&2
  echo "TDD is mandatory for production code under src/." >&2
  echo "Write the failing test first. If a file is genuinely glue (exercised via the" >&2
  echo "live Homebridge API rather than a unit), add a top-of-file comment:" >&2
  echo "    // tdd-audit: exempt - <why>" >&2
  exit 1
fi

if [[ ${#debt_remaining[@]} -gt 0 ]]; then
  echo "TDD audit OK - but ${#debt_remaining[@]} production file(s) remain in .codex/tdd-debt.txt:" >&2
  for f in "${debt_remaining[@]}"; do echo "  ! $f" >&2; done
  echo "Address these over time; remove each line from .codex/tdd-debt.txt as its test ships." >&2
fi

echo "TDD audit: ${#candidates[@]} production file(s) audited; ${#debt_remaining[@]} legacy gap(s) in allowlist."
exit 0
