# Phase 3: Device Discovery + Platform Skeleton - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-24
**Phase:** 3-device-discovery-platform-skeleton
**Areas discussed:** Discovery breadth, Whitelist behavior, Removed devices

---

## Discovery Breadth

| Option | Description | Selected |
|--------|-------------|----------|
| Discover all | Fetch and log every device/category/status set, but only register HomeKit skeletons for categories intended for v1. | ✓ |
| Supported only | Ignore unsupported categories during discovery. | |
| Register all | Create placeholder accessories for every discovered device. | |

**User's choice:** Agreed with recommendation.
**Notes:** User clarified that first version should focus on switches and thermometers because those
are the devices they have.

---

## Whitelist Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Internal now | Support optional home/device whitelist fields in config JSON and tests, but leave friendly UI for Phase 7. | |
| Defer entirely | Do not implement whitelist until the configuration phase. | ✓ |
| Full config now | Add user-facing config schema/UI-facing fields now. | |

**User's choice:** Prefer to defer.
**Notes:** Phase 3 should not add whitelist config fields. Architecture may remain filter-friendly for
later phases.

---

## Removed Devices

| Option | Description | Selected |
|--------|-------------|----------|
| Prune automatically | Unregister accessories for missing devices on discovery, matching the roadmap requirement directly. | ✓ |
| Warn first | Log missing devices but keep HomeKit accessories. | |
| Config toggle | Make pruning configurable immediately. | |

**User's choice:** Agreed with recommendation.
**Notes:** Automatic prune should be deterministic and test-covered.

## Codex's Discretion

- Exact module names and file boundaries for discovery repository/platform composition.
- Exact logging wording, provided logs are useful and do not leak token material.

## Deferred Ideas

- Whitelist config/UI.
- Switch behavior and thermometer mapping.
- Homebridge-specific QR credential request for broad release hardening.
