.PHONY: help build lint typecheck test test-ui coverage tdd-audit lockfile-check fmt check

# Default target — list available commands.
help:
	@echo "homebridge-tuya-smartlife — dev commands"
	@echo ""
	@echo "  make build          tsc build to dist/"
	@echo "  make lint           ESLint"
	@echo "  make typecheck      tsc --noEmit"
	@echo "  make test           Jest"
	@echo "  make test-ui        Homebridge custom UI node tests"
	@echo "  make coverage       Jest with coverage (85% threshold)"
	@echo "  make tdd-audit      Audit untested production files under src/"
	@echo "  make lockfile-check Fail if package-lock.json drifts (npm ci)"
	@echo "  make fmt            Apply Prettier formatting"
	@echo "  make check          Full gate: lockfile-check + lint + typecheck + tdd-audit + test + test-ui"

build:
	npm run build

lint:
	npm run lint

typecheck:
	npx tsc --noEmit

test:
	npm test

test-ui:
	npm run test:ui

coverage:
	npm run coverage

# Lists production files under src/ with no corresponding test. Fails non-zero
# when any non-exempt, non-debt file is found.
tdd-audit:
	bash .codex/scripts/tdd-audit.sh

# Fails when package-lock.json drifts from package.json (runs npm ci).
lockfile-check:
	bash .codex/scripts/lockfile-check.sh

fmt:
	npx prettier --write .

# Full quality gate — the single entry point CI invokes.
check: lockfile-check lint typecheck tdd-audit test test-ui
