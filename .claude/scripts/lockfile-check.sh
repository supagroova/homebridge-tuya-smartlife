#!/usr/bin/env bash
# Lockfile guard — fails when package-lock.json drifts from package.json.
#
# Runs `npm ci` (the npm equivalent of a frozen-lockfile install), which errors
# out when package.json and package-lock.json are out of sync — so drift is
# caught locally before it reaches CI.
#
# Fix on failure: run `npm install` and commit the regenerated package-lock.json.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if npm ci; then
  exit 0
fi

cat >&2 <<'EOF'

x package-lock.json is out of sync with package.json (npm ci failed).
  This would fail CI at the install step.
  Fix: run `npm install` and commit the updated package-lock.json in the same change.
EOF
exit 1
