---
schema_version: 2
session: "20261026T045732Z"
task: "044-t10-owner-stage1"
kind: implementation
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-10"
---

# T10 A17 第一阶段实施任务

## Goal
Lead `codex:/root` 派遣本任务，执行者使用用户已授权的 `gpt-6.1-sol/xhigh` 实施 T-10 被动邮箱的 A17 原持久 owner 第一阶段。把获批 T10 工程合同落到真实 `SpaceService` 单 writer、邮箱记录/验证、Vault metadata 引用、Inbox facade/presentation 与 controller 唯一装配；形成可供后续 B/U 接线消费的真实、可观察、测试覆盖的 API。成功标准是分配的 A17 路径完成窄切片红绿与必要错误/取消/恢复边界，未冒称整票完成，也不提前打开四项 availability。

用户已明确：现有自动化/快捷按钮没有 Space 时必须先要求选择 Space；任何旧入口不按当前界面或 cwd 猜 Space。消息显式目标保留原 Space/Session 归属，停止/后台对象仍可收信，不能启动模型、PTY 或新 runtime。

## Inputs

- 当前唯一 change：`.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/`。
- 必读：`tickets-map.md`（Map36）、`goal-plan.md`（GP-035）、`ticket/10-passive-inbox.md`、`evidence/T-10-engineering-packet.md`、`evidence/T-10-write-allocation.json`、`evidence/T-10-plan-materialization.json`、`evidence/T-10-cli-message-identity-note.md`。
- 已通过依赖：`evidence/T-09.md`、`evidence/T-09-root-integration3-audit.json`、`evidence/G-02-root-audit.json`；T09 最终实际源码是当前工作副本的输入，不复制旧候选。
- 按票绑定调用项目 `dev` 与 `ui` Skill 的 implement 入口及其适用参考；外部行为以 `spec.md`、`implementation-contracts.md`、`ADR.md`、`CONTEXT.md` 和批准 `DESIGN.md` 为权威。先读当前 ticket/packet，再读命中代码入口；不从准备报告推断已实现行为。
- 只复用当前 SpaceService/records/JsonStore/guarded storage 的原 owner，不创建第二个 writer、Outbox、业务 DB、持久队列或跨 Space 推断。

## Workspace and Scope

工作区为 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，branch `NAMEWTA/terminal`，base `33c21e098ef3188cbab5a09f3e0a01fadb787715`。当前副本含已完成 T09 的真实未提交改动；先读 `git status` 与现有源，不覆盖无关改动。只允许写下列 A17 产品/测试/docs 路径及本任务 `REPORT.md`、临时测试证据：

- `src/modules/agent/core/inbox/model.ts`
- `src/modules/agent/core/inbox/model.test.ts`
- `src/modules/agent/services/spaces/records.ts`
- `src/modules/agent/services/spaces/records.test.ts`
- `src/modules/agent/services/spaces/space-service.ts`
- `src/modules/agent/services/spaces/space-service-inbox.test.ts`
- `src/modules/agent/services/spaces/space-service-recovery.test.ts`
- `src/modules/agent/services/inbox/service.ts`
- `src/modules/agent/services/inbox/service.test.ts`
- `src/modules/agent/platform/vault/inbox-sources.ts`
- `src/modules/agent/platform/vault/inbox-sources.test.ts`
- `src/modules/agent/services/controller.ts`
- `src/modules/agent/services/controller-inbox.test.ts`
- `src/modules/agent/services/controller-control.test.ts`
- `src/modules/agent/services/inbox/presentation.ts`
- `src/modules/agent/services/inbox/presentation.test.ts`
- `docs/data.md`

B-stage1 may write only its ten explicitly assigned protocol paths; U and Root are read-only. Do not modify T10 ticket/Goal/Map/formal Evidence, `main.js`, `styles.css`, `scripts/bundle-budget.json`, `THIRD-PARTY-NOTICES.md`, `src/modules/agent/services/control/*`, UI files, dependency files, Git index, or commit/push/release. Do not run full build or production Chrome; Root owns generated artifacts and full integration after all writers stop. Stop and report if the actual API, allocation, or dependency contract conflicts with the packet.

## Acceptance

1. Work TDD-first on the actual owner boundary. Preserve existing dirty drafts, remote reconcile, archive gates, recovery and commit/readback semantics. Query and cold duplicate-ack checks must be zero-write fresh-primary observations before write-capable recovery; unknown effects retain message identity/body/recipient/diagnostics and never blind-retry.
2. Implement bounded typed message/recipient/source/body/reference/ack records and exact validation/capacity accounting described by T10. Attachments are metadata-only canonical Vault refs; reject absolute/drive/`..`/backslash/NUL escapes and do not read/copy external content. Source is descriptive only; IPC scope and explicit Space/Session resolution remain authoritative.
3. Every send/read/ack path preserves explicit Space/Session identity and rejects missing/ambiguous Space rather than using cwd or active UI. Stopped/background/detached sessions can receive without spawn/attach/prompt/focus; archived targets reject new send while existing read/ack remain. Concurrent send/archive/cancel use the existing logical tail and recheck scope/epoch/capacity before commit.
4. Add the smallest real owner API needed by later B/U: one controller-created InboxService, no second instance; bounded activation presentation state that survives UI detach/reopen without persisting message body into workspace state. Keep availability false until real handler/CLI/consumer closure; do not invent a successful adapter result.
5. Add meaningful owner-level tests for model limits, same-cwd/different-Space isolation, stopped and archived targets, duplicate/concurrent ack and zero-write fresh-primary cases, cancellation before write-capable initialization, malformed/unknown records, Vault ref validation, and bounded pending/unknown presentation. Preserve existing tests and errors.
6. Run only applicable focused commands in this stage (for example the A-owned Vitest files and any type/lint check that does not regenerate Root artifacts), record exact argv/cwd/exit/raw result in the report, and stop source writes before returning. Do not claim B/native/GUI/full build, independent review, real Obsidian/Provider, OS IME or five-platform acceptance.

## Return

Write one non-overwriting report at `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/sessions/20261026T045732Z/044-t10-owner-stage1/REPORT.md` using the coordination report template. Status must be `completed`, `blocked`, `failed`, or `cancelled`; completed means candidate returned for Lead acceptance only. Include source-stop time, actual changed paths, tests/exit codes, unresolved contract gaps and unverified items. Do not modify TASK, formal Evidence, Goal/Map or Ticket status. Return through the native agent channel to `codex:/root`; no extra agent dispatch.
