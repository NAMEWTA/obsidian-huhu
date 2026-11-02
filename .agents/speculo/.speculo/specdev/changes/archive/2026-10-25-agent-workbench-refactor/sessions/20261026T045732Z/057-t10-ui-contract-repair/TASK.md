---
schema_version: 2
session: "20261026T045732Z"
task: "057-t10-ui-contract-repair"
kind: implementation
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-10"
---

# T10 Inbox UI contract repair after independent review

## Goal
在 056 domain 修复的稳定分页与 summary/read 接口上，修复 055 的 UI 合同问题：分页完整聚合并准确计算未读、列表只显示有界摘要、Read 才取正文、fresh-primary 核对比较完整身份和 payload，并让已确认的 observation 能显式结算而不误收束未知结果。

## Inputs
回读 055 `REPORT.md`（Input-SHA256 `5e0038ad9eea81a6f9198bd7116fc70a4e428ab2d3d9be6767563b6033b49202`）、056 完成后的 InboxListResult/InboxMessageSummary 与当前 InboxPanel/WorkspaceToolbar DOM 合同。用户决定旧入口必须先选择 Space；UI 不得按 cwd/current view 推断目标。

## Workspace and Scope
工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，branch `NAMEWTA/terminal`，复用 T10 current change workspace。只允许修改：

- `src/modules/agent/ui/inbox/InboxPanel.tsx`
- `src/modules/agent/ui/inbox/InboxPanel.dom.test.tsx`
- `src/modules/agent/ui/workspace/WorkspaceToolbar.tsx`
- `src/modules/agent/ui/workspace/WorkspaceToolbar.dom.test.tsx`
- 本任务 `REPORT.md`

056 已占用的 domain/control 文件、其它 A/B/U/Root 路径、canonical schema/生成物、正式 Evidence/Goal/Map/Ticket、依赖、Git index 只读；不提交/推送/发布。

## Acceptance
1. InboxPanel 与 WorkspaceToolbar 通过 `afterSequence`/`nextSequence` 在固定有界高水位内消费所有页面，不把 `limit:4096` 误当全量；同一消息不重复，列表与铃铛未读数准确，分页失败有可见错误。
2. 列表行只渲染不含正文/引用的 summary；点击 Read 后才调用 `readMessage` 并在 detail 区展示正文/引用状态。保持 ack 是独立显式操作，补 DOM 回归证明列表初始不出现正文。
3. verify fresh-primary 按 messageId、recipient、body、source、references（ack observation 至少按完整目标与存在/ack 状态）比较；结果区分 verified/saved、not-found、conflict、unknown。ID 相同但 payload/目标不同不能标 saved。
4. 仅在 fresh primary 明确证明 saved 或明确 none 时调用 presentation 的完成/收束路径；unknown/conflict/not-found 的保留符合 32 条 observation 容量，不把未决观察静默删除。补 pending/unknown DOM 与 presentation 调用回归。
5. 保持无 Space 时先要求用户选择，收件人/发送禁用和中文/英文文案现有合同；不添加新的 writer、自动化 Space 推断或视觉体系。
6. 运行受影响 DOM/Vitest、ESLint、`tsc --skipLibCheck` 和必要的 `git diff --check`，报告真实退出码与未验证项；不得宣称真实 Obsidian/Provider/OS IME/五平台 E2E 或独立复核已通过。

## Return
一次性写本目录 `REPORT.md`，使用协调回报模板的“聚焦交接”“产物与验证”“问题与下一步”三节，Status 只能为 completed/blocked/failed/cancelled；completed 只表示候选交回 Lead 接收，不推进 T10 状态。报告前运行 `validate-dispatch.mjs --stage return` 并保存真实回执；源停写后通过原生通道返回 `codex:/root`，不得递归派遣。
