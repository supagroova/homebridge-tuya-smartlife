// jest.config.js — ts-jest preset with an 85% line-coverage threshold.
// Homebridge registration glue (src/index.ts) is coverage-excluded; the rest of
// src/ (auth client, signing, Tuya HTTP client, DP->HomeKit mapping) is held to
// the threshold. See .planning/research/STACK.md "Coverage gate (85% lines)".
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Collect from production src/, but exclude declaration files, tests, and the
  // Homebridge glue that carries `// tdd-audit: exempt` (registration + the thin
  // dynamic-platform adapter + the constant-only settings module). These are
  // exercised against the live Homebridge API, not unit-tested — see STACK.md
  // "Coverage gate". Keeping them out of collection is what keeps this gate GREEN
  // on a clean checkout instead of self-blocking.
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/index.ts',
    '!src/platform.ts',
    '!src/settings.ts',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    'src/index.ts' /* HB registration */,
    'src/platform.ts' /* HB dynamic-platform glue */,
    'src/settings.ts' /* constant-only module */,
  ],
  coverageThreshold: { global: { lines: 85, statements: 85, branches: 75, functions: 80 } },
};
