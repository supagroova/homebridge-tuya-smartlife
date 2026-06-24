#!/usr/bin/env bash
# Stop hook - runs the coverage gate (85% line coverage via jest, configured in
# jest.config.js coverageThreshold). Blocks the assistant's turn from ending when
# coverage falls below the threshold OR tests fail.
#
# Cheap path: skips when no production src/**/*.ts files (excluding *.test.ts)
# have changed in the working tree.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# Cheap path: bail if no production src files are touched in the working tree.
relevant_changed=$(
  git status --porcelain 2>/dev/null \
    | awk '{print $NF}' \
    | grep -E '^src/.*\.ts$' \
    | grep -vE '\.test\.ts$' \
    | grep -vE '\.d\.ts$' || true
)
if [[ -z "$relevant_changed" ]]; then exit 0; fi

# Expensive path: run jest with coverage. jest's coverageThreshold config fails
# the run when below threshold, so we surface its non-zero exit.
if npx jest --coverage --silent > /tmp/cov-gate.log 2>&1; then
  exit 0
fi

# Coverage failed or tests failed - block the Stop.
reason="Coverage gate failed. See /tmp/cov-gate.log for full output. Tail: $(tail -40 /tmp/cov-gate.log | sed 's/"/\\"/g' | tr '\n' ' ')"

cat <<EOF >&2
{"decision":"block","reason":"$reason  Production files modified this session: $(echo "$relevant_changed" | tr '\n' ' '). Requires >=85% line coverage. Add tests to restore coverage before ending the turn."}
EOF
exit 2
