# Phase 2: Auth Protocol Port + Credential Feasibility - Context

**Gathered:** 2026-06-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 resolves the authentication path before any device discovery or accessory work begins. It ports the Tuya device-sharing auth protocol to TypeScript, proves Smart Life User Code + QR login can produce and persist a usable token, and decides whether the project can continue with its own legitimate Tuya `client_id`/`schema` or must pivot the auth layer to the developer-project API fallback.

In scope: auth protocol, crypto/signing, QR login proof, token persistence/refresh, and credential feasibility. Out of scope: device discovery, HomeKit services, polling/offline behavior, config UI, MQTT push, and any shipped use of Home Assistant's credentials.

</domain>

<decisions>
## Implementation Decisions

### Auth Spike Boundary

- **D-01:** Phase 2 may use Home Assistant's `client_id`/`schema` only as a disposable local proof that the TypeScript port matches the device-sharing protocol.
- **D-02:** Home Assistant's credential must never be shipped, documented as a user path, baked into package runtime behavior, or treated as this plugin's production credential strategy.
- **D-03:** The production implementation must remain credential-neutral until the legitimate credential path is resolved. If any temporary HA credential probe is needed, it should be isolated from normal runtime/package behavior.

### Credential Go/No-Go

- **D-04:** Phase 2 should time-box the legitimate Tuya credential path rather than blocking indefinitely.
- **D-05:** Before Phase 3 starts, the project must have one of two documented outcomes:
  - A legitimate path to this plugin's own Tuya `client_id`/`schema`; or
  - A documented auth-only pivot to the developer-project API fallback.
- **D-06:** The fallback decision is limited to auth. Phase 1 scaffolding/TDD and downstream device mapping architecture remain valid and should not be replanned wholesale unless Phase 2 discovers a concrete incompatibility.

### Manual QR Login UX For Phase 2

- **D-07:** Before Phase 7's config UI exists, Phase 2 should expose manual QR testing through a dev-only CLI/script that exercises the same auth modules planned for runtime use.
- **D-08:** The dev script may print/render the QR for manual Smart Life scanning and persist tokens through the same token-store abstraction. It is not the final user onboarding UX.
- **D-09:** Do not pull the custom Homebridge config UI forward into Phase 2. Phase 7 still owns the friendly config-UI QR screen.

### Token Storage And Refresh

- **D-10:** Persist tokens using Homebridge storage/local JSON semantics so a Homebridge restart does not require another QR scan.
- **D-11:** Scrub access tokens, refresh tokens, and signed payload material from logs and error messages.
- **D-12:** Implement proactive token refresh before expiry with a single in-flight refresh guard. If refresh fails, surface a clear re-auth-required state.

### Golden-Vector Testing

- **D-13:** Port crypto/signing first. Golden-vector unit tests over known Python SDK inputs/outputs are the primary proof that HMAC + AES-GCM `encdata` signing is byte-correct.
- **D-14:** Live QR/login work comes after deterministic crypto tests. Network/live probes must not substitute for golden-vector coverage.

### Codex Migration Context

- **D-15:** Phase 2 planning and execution happen in Codex. The local quality gate now uses `.codex/scripts` via `make check`; `.claude/` remains for Claude Code compatibility.

### Codex's Discretion

Downstream agents may choose exact module names, file layout, and CLI flag names, provided they stay within the architecture already researched: TypeScript, `node:crypto`, global `fetch`, Jest + nock tests, no axios/crypto-js, and no bundled Home Assistant production credential.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope

- `.planning/ROADMAP.md` - Phase 2 goal, success criteria, risk note, and dependency ordering.
- `.planning/REQUIREMENTS.md` - AUTH-01 through AUTH-05 and explicit out-of-scope rule against shipping Home Assistant's `client_id`/`schema`.
- `.planning/PROJECT.md` - Core value, cloud-only constraint, top risks, and Phase 2 credential-gating rationale.
- `.planning/STATE.md` - Current phase state and carry-forward Phase 1 decisions.

### Research

- `.planning/research/SUMMARY.md` - Project-level synthesis, including the recommended Phase 2 mitigation sequence.
- `.planning/research/PITFALLS.md` - Partner-gating verdict and the approved vs unsafe credential paths.
- `.planning/research/ARCHITECTURE.md` - Auth/client module boundaries and protocol flow.
- `.planning/research/STACK.md` - Locked stack decisions, including `node:crypto`, global `fetch`, Jest/ts-jest, nock, and no `@tuya/tuya-connector-nodejs` for the primary path.

### Existing Scaffold And Gates

- `src/index.ts` - Homebridge entry point; glue is exempt from unit coverage.
- `src/platform.ts` - Dynamic platform composition point; auth modules will eventually connect here, but device discovery is Phase 3.
- `src/settings.ts` - Plugin/platform constants.
- `jest.config.js` - Coverage collection rules and 85% threshold.
- `Makefile` - `make check` gate, now backed by `.codex/scripts`.
- `.codex/hooks.json` - Codex hook wiring.
- `.codex/scripts/tdd-guard-on-write.sh` - Test-first guard for new production code.
- `.codex/scripts/tdd-audit.sh` - Audit and `.codex/tdd-debt.txt` behavior.
- `.agents/skills/ship/SKILL.md` - Codex-visible ship workflow.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `src/settings.ts`: `PLATFORM_NAME` and `PLUGIN_NAME` are the shared constants auth/config code should reuse where needed.
- `src/util/example.ts` and `src/util/example.test.ts`: bootstrap smoke-test pair only. They demonstrate Jest/ts-jest wiring but are not plugin behavior and can be replaced by real auth/crypto modules when useful.
- `.codex/scripts/*`: Codex-local quality gates are the active local workflow. New production files under `src/` should have tests first unless they are genuine Homebridge glue with `// tdd-audit: exempt`.

### Established Patterns

- Build is plain `tsc` to CommonJS `dist/`; do not introduce bundlers.
- Homebridge glue accesses HAP via `api.hap`; do not depend on `hap-nodejs` directly.
- Coverage excludes thin Homebridge glue (`src/index.ts`, `src/platform.ts`, `src/settings.ts`) and holds testable core modules to the Jest thresholds.
- `make check` is the single local/CI quality gate: lockfile-check, lint, typecheck, tdd-audit, and tests.

### Integration Points

- Auth modules should be pure/testable under `src/` and later compose into `TuyaSmartLifePlatform` in `src/platform.ts`.
- Token persistence should use a clear abstraction so Phase 2 can test it independently and Phase 3+ can reuse it without reworking auth.
- The dev-only QR script should exercise the same auth modules as runtime code, but not become the final config-UI onboarding flow.

</code_context>

<specifics>
## Specific Ideas

- Use a dev-only QR/login script for Phase 2 manual testing rather than pulling Phase 7's config UI forward.
- Treat Tuya partner credential acquisition as a time-boxed go/no-go, not an indefinite blocker.
- Keep any Home Assistant credential probe disposable and non-shipping.

</specifics>

<deferred>
## Deferred Ideas

- Friendly Homebridge config-UI QR onboarding remains Phase 7.
- Device discovery remains Phase 3.
- Developer-project API implementation is not a Phase 2 default; it becomes the selected auth fallback only if the legitimate QR credential path dead-ends.

</deferred>

---

*Phase: 2-Auth Protocol Port + Credential Feasibility*
*Context gathered: 2026-06-24*
