---
schema_version: 2
session: "20261026T045732Z"
task: "053-t10-chrome-inbox-repair"
kind: implementation
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-10"
---

# T10 Chrome Inbox acceptance fixture repair

## Goal
修复 Lead Chrome 生产夹具暴露的两个测试接缝：恢复场景重建 SpaceService 后必须重建 controller-owned InboxService，避免旧 owner 的 lease-closed 观察污染页面；InboxPanel 打开后必须通过真实 Select UI 显式选中收件人，脚本才能核验未读正文。保留失败断言，不降低检查，也不改变生产 UI 或 Space 解析合同。

## Inputs
回读 052 report、当前 `scripts/obsidian-acceptance/agent-workbench-panels.mjs`、T10 UI/owner reports、生产 InboxPanel 的 recipient Select 交互和用户决定：旧入口必须先选 Space，不能用 cwd/current UI 猜测。已知本次 Chrome 结果：除 `state restored retains a usable viewport without unhandled errors` 与 `inbox unread body is inspectable after explicit opening` 外均通过；恢复状态错误为旧 InboxService 的 OWNER_CONFLICT lease-closed，正文检查缺少显式 recipient 选择。

## Workspace and Scope
工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，branch `NAMEWTA/terminal`，只允许修改：

- `scripts/obsidian-acceptance/agent-workbench-panels.mjs`
- 本任务 `REPORT.md`

仅在 fixture 中将 `const inbox` 改为可重建的局部 owner，在 restored 重建 SpaceService 后 dispose/重建 InboxService；inbox scene 打开工具后通过真实 recipient Select trigger/option 选择再检查正文。其它生产源、UI、A/B/Root、正式 Evidence/Goal/Map/Ticket、main.js/styles.css、依赖和 Git index 只读；不提交/推送/发布。

## Acceptance
1. Chrome `--inbox` 中 restored scene 的 `state.errors` 为空且没有 connected old runtime；不隐藏错误、不清空诊断、不改生产逻辑。
2. Chrome `--inbox` 在点击 Inbox 后先打开真实 recipient Select、点击第一项并等待 `[data-agent-inbox]` 正文，`受控 Inbox 消息` 检查通过；inbox arrival 仍先证明工具未自动打开。
3. `node --check scripts/obsidian-acceptance/agent-workbench-panels.mjs`、DOM/贡献定向测试通过；脚本运行后浏览器/server 清理闭合。不得宣称真实 Obsidian/Provider/OS IME/五平台 E2E。

## Return
一次性写本目录 `REPORT.md`，使用协调回报模板的“聚焦交接”“产物与验证”“问题与下一步”三节，Status 只能为 completed/blocked/failed/cancelled；completed 仅交回候选，不推进正式 T10。源停写后先运行 `validate-dispatch.mjs --stage return` 并保留回执，通过原生通道返回 `codex:/root`，不得递归派遣。
