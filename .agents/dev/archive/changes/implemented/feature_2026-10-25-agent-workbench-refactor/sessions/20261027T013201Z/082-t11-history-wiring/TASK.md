---
schema_version: 1
ticket: T-11
status: in_progress
owner: codex:/root/implement_t11_recovery
---

# T11 recovery: provenance and history control wiring

Implement only the current recovery slice after T11-075: reject legacy rows without verifiable provenance, expose HistoryCommands through the production ControlCommands/Controller path, and regenerate the canonical control schema/wire. Preserve the explicit Space requirement and do not claim the OpenCode SQLite safe-source F1/F2/F3 gate is complete. Run focused TypeScript tests and report remaining native gate blockers.
