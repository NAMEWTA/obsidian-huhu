---
schema_version: 2
session: "20261026T045732Z"
task: "062-t10-pagination-fence-repair"
kind: implementation
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-10"
---

# T10 Inbox stable pagination fence repair

## Goal
修复 061 r2 的 R1：为 Inbox facade/SpaceService 提供真正冻结的 recipient、high-water、generation 分页接缝。第一页建立 fence，后续页只读该 high-water；追加到 fence 之外不改变本次读取，fence 内删除/替换使旧 generation 失效并要求刷新。

## Inputs
回读 061 REPORT（SHA `32e3f7c55553548056a652414262f084236be39148ac73596a51ffdb2a65895c`）、056/058 domain 报告和当前 `InboxListInput/InboxListResult/listInbox`。UI 063 将消费本任务的字段；保持显式 Space/Session、summary-only、read 正文边界和唯一 writer。

## Workspace and Scope
工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，branch `NAMEWTA/terminal`。只允许修改：

- `src/modules/agent/services/spaces/space-service.ts`
- `src/modules/agent/services/spaces/space-service-inbox.test.ts`
- 本任务 `REPORT.md`

其它 UI、i18n、control/native、生成物、正式 Evidence/Goal/Map/Ticket、依赖、Git index 只读；不提交/推送/发布。

## Acceptance
1. `InboxListInput` 接受可选 `highWaterSequence` 与 `generation`；`InboxListResult` 返回稳定 generation。无 fence 的第一页捕获当前 recipient 高水位；带 fence 的后续页只过滤 `sendSequence <= highWaterSequence`，返回相同 high-water/generation。
2. fence fingerprint 只覆盖目标 mailbox 在 frozen high-water 内的 summary/顺序；高水位之后 append 不使旧 fence 失效；fence 内删除/替换或 scope 不一致使 generation 失效并返回可解释的 stale/source-unavailable 错误，不静默混页。
3. 用真实 SpaceService 测试覆盖多页、跨页 append、fence 内变化/重读，保持分页上限、summary-only、Space 隔离与旧目标规则。不得创建第二 writer/queue。
4. 运行受影响 Vitest、architecture、ESLint、`tsc --skipLibCheck`、`git diff --check`，报告真实退出码、源停写和未验证项；不宣称 UI/真实宿主/Provider/IME/五平台或独立复核已通过。

## Return
一次性写本目录 `REPORT.md`，使用协调回报模板的“聚焦交接”“产物与验证”“问题与下一步”三节，Status 只能为 completed/blocked/failed/cancelled；完成后运行 `validate-dispatch.mjs --stage return`，源停写后回报 `codex:/root`，不得递归派遣。
