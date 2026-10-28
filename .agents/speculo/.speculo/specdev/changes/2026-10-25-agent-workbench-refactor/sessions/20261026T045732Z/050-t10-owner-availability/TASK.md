---
schema_version: 2
session: "20261026T045732Z"
task: "050-t10-owner-availability"
kind: implementation
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-10"
---

# T10 A17 capability availability closure

## Goal
在 A17 的唯一 InboxService owner 已由真实 controller、handler/CLI 和生产 Inbox consumer 接通后，关闭此前仅用于分阶段保护的 capability unavailable 门。服务在未 dispose 时对既有 consumer 暴露 available/isAvailable=true，dispose 后变为 false；不创建第二个 writer、不改变 Space 绑定、持久化、错误或取消合同。

## Inputs
回读 T10 engineering packet、implementation-contracts §2/§4.1、044 A17 report、048 controller injection report、049 target resolution report、当前 InboxService/controller/inbox tests。用户决定保持旧入口必须先选 Space，不能从 cwd/current UI 猜测；本任务不改目标解析。仅在所有四项生产 handler 已闭合的当前候选上更新 owner availability。

## Workspace and Scope
工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，branch `NAMEWTA/terminal`，复用 T10 current change workspace。只允许修改：

- `src/modules/agent/services/inbox/service.ts`
- `src/modules/agent/services/inbox/service.test.ts`
- `src/modules/agent/services/controller-control.test.ts` (only the two staged availability expectations)
- 本任务 `REPORT.md`

其它 A/B/U/Root 路径、canonical schema/生成物、正式 Evidence、Goal/Map/Ticket、main.js/styles.css、依赖、Git index 只读；不提交/推送/发布。保持已有 `dispose()` 资源释放和业务结果语义。

## Acceptance
1. `InboxService.available()` 与 `isAvailable` 在 open service 上均为 true，dispose 后均为 false；不以 consumer 名称、cwd、当前 view 或运行时猜测 Space。
2. 既有 send/list/read/ack/freshPrimary、presentation capacity、unknown/none、停止对象和显式 recipient 测试继续通过；补充 open/closed 双态断言并同步 controller lazy-owner 回归中的两条 staged expectation，证明 capability 开关只反映 owner 生命周期。
3. 不添加第二 writer/queue，不改 controller 注入或 handler target 解析；运行 A17 与 T10 控制接缝定向 Vitest、architecture、ESLint、`tsc --skipLibCheck`，记录精确退出码和未验证项。

## Return
一次性写本目录 `REPORT.md`，使用协调回报模板的“聚焦交接”“产物与验证”“问题与下一步”三节，Status 只能为 completed/blocked/failed/cancelled；completed 只表示候选交回 Lead 接收，不推进 T10 状态。报告前运行 `validate-dispatch.mjs --stage return` 并保留真实回执；源停写后通过原生通道返回 `codex:/root`，不得递归派遣。
