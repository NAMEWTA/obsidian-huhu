---
schema_version: 2
session: "20261026T045732Z"
task: "045-t10-protocol-stage1"
kind: implementation
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-10"
---

# T10 B10 第一阶段协议实施任务

## Goal
Lead `codex:/root` 派遣本任务，执行者使用用户已授权的 `gpt-6.1-sol/xhigh` 实施 T-10 B-owner 的第一阶段十条协议路径：canonical inbox/message CLI/native schema、同步生成物、fixtures、Rust/TypeScript wire tests 与 CLI/help docs。第一阶段只冻结外部协议和 message identity/size/error semantics，`availability=false`；不要接入真实 InboxService、Router、Paging、Controller 或生产 UI。成功标准是协议和 `T-10-cli-message-identity-note.md` 的实际 `run()` 约束一致，能供 A API 稳定后接线。

用户已明确：现有自动化/快捷按钮没有 Space 时必须先要求选择 Space；协议不能从当前界面或 cwd 猜 Space。明确目标缺失/歧义必须要求选择或返回稳定错误；messageId 在本地 IPC 前生成，普通 stderr 与 JSON 失败均可取得它；requestId 不得冒充业务 messageId。

## Inputs

- 当前唯一 change：`.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/`。
- 必读：`tickets-map.md`（Map36）、`goal-plan.md`（GP-035）、`ticket/10-passive-inbox.md`、`evidence/T-10-engineering-packet.md`、`evidence/T-10-write-allocation.json`、`evidence/T-10-plan-materialization.json`、`evidence/T-10-cli-message-identity-note.md`。
- 已通过依赖：`evidence/T-09.md`、`evidence/T-09-root-integration3-audit.json`、`evidence/G-02-root-audit.json`。外部行为以 `spec.md`、`implementation-contracts.md`、`ADR.md`、`CONTEXT.md` 为权威；只在分配协议路径内工作。
- 按票绑定调用项目 `dev` Skill 的 implement 入口及其适用 testing/licensing/build 参考；UI 不是本阶段写集，不调用 UI 实现。先读已有 schema/generator/wire/CLI入口与协议消费者，勿从待实现 handler 猜字段。

## Workspace and Scope

工作区为 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，branch `NAMEWTA/terminal`，base `33c21e098ef3188cbab5a09f3e0a01fadb787715`。当前副本含已完成 T09 的真实未提交改动；先读 `git status` 与现有源，不覆盖无关改动。只允许写下列 B-stage1 路径及本任务 `REPORT.md`、临时测试证据：

- `src/shared/native/control-schema.json`
- `src/shared/native/control-wire.generated.ts`
- `src/shared/native/control-wire.test.ts`
- `native/pty-server/src/control/wire_generated.rs`
- `native/pty-server/src/control/cli.rs`
- `native/pty-server/tests/control.rs`
- `native/pty-server/tests/control_protocol.rs`
- `test/fixtures/native/control-v1.json`
- `test/native/control-protocol.test.ts`
- `docs/agent-workbench-cli.md`

A17, B's later handler/commands/paging/router tests, U14, Root4, T10 formal state/Evidence and all other files are read-only. Do not modify dependencies/lockfiles, `main.js`, `styles.css`, budget/notices, Controller, InboxService, or UI. Do not run full build or production Chrome; Root owns generated artifacts and full integration. Stop and report any contract/path conflict.

## Acceptance

1. Derive the v1 message send/list/read/ack protocol from existing canonical schema and implementation contract. Keep explicit `to-session`/Space resolution distinct from caller runtime/cwd; reject `--session` plus explicit target conflicts and missing/ambiguous Space without fallback. Preserve opaque IDs and UTF-8 byte limits, typed Vault metadata refs and bounded body/reference/envelope/cursor budgets.
2. Add CLI local messageId generation before input/IPC action, with optional client message ID and stable duplicate/error/cancel/unknown semantics. Every post-generation local, wire, timeout or cancellation failure exposes the business messageId in human stderr and `--json`; requestId remains correlation only. `--file` is CLI-local bounded input and never a host file attachment permission.
3. Keep ack/read separate; duplicate ack is idempotent zero-write `already-acked/none`; list pagination carries bounded explicit target/high-water/generation semantics. Preserve existing native control parse/print exit/phase conventions and the availability flag remains false until runtime/UI evidence exists.
4. Generate or update TypeScript/Rust wire artifacts only by the existing project generator/contract; keep schema, generated TS/Rust, fixtures and protocol tests byte/field consistent. Do not add a second schema, hidden defaults, a durable cursor store, Outbox or new persistence writer.
5. Run focused protocol/native/CLI tests and any generator consistency check available without touching Root artifacts. Record exact argv/cwd/exit/raw output and stop source writes before returning. Do not claim A owner, production handlers/UI, full build, independent review, real Obsidian/Provider, OS IME or five-platform acceptance.

## Return

Write one non-overwriting report at `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/sessions/20261026T045732Z/045-t10-protocol-stage1/REPORT.md` using the coordination report template. Status must be `completed`, `blocked`, `failed`, or `cancelled`; completed means candidate returned for Lead acceptance only. Include source-stop time, actual changed paths, tests/exit codes, unresolved contract gaps and unverified items. Do not modify TASK, formal Evidence, Goal/Map or Ticket status. Return through the native agent channel to `codex:/root`; no extra agent dispatch.
