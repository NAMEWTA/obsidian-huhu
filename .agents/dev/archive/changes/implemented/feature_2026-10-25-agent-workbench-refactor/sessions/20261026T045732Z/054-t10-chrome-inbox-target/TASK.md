---
schema_version: 2
session: "20261026T045732Z"
task: "054-t10-chrome-inbox-target"
kind: implementation
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-10"
---

# T10 Chrome Inbox target selection repair

## Goal
修正 053 Chrome 夹具的收件人选择：排序后的第一项可能是 Shell，消息实际写给 `created[0]` agent Session；脚本必须按真实 fixture Session ID 选择对应 option，保留“打开前工具关闭”和“打开后正文可读”两个检查。

## Inputs
回读 053 TASK/REPORT 与最新 Chrome 失败结果。失败发生在 `wait('!!document.querySelector("[data-agent-inbox] [data-message-id]")')`；命令回读显示脚本选择了 Shell option，而 Inbox 消息 recipient 是 `coordinationProbe.created[0].session.sessionId`。生产 InboxPanel 和 Space 解析保持不变。

## Workspace and Scope
工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，branch `NAMEWTA/terminal`。只允许修改：

- `scripts/obsidian-acceptance/agent-workbench-panels.mjs`
- 本任务 `REPORT.md`

修改 inbox scene 真实 Select option 查询，使其 textContent 包含 `coordinationProbe.created[0].session.sessionId` 后再 click；不改变 production source、UI、A/B/Root、正式 Evidence/Goal/Map/Ticket、依赖或 Git index；不提交/推送/发布。

## Acceptance
1. `node --check` 与 `--prepare-only --inbox` 通过，脚本仍保留严格 arrival-closed、目标选择和正文等待/断言。
2. Lead 运行完整 Chrome `--inbox` 后，inbox arrival、目标 agent 正文、恢复无错误、其它尺寸/状态/zoom/cleanup checks 全部通过；若其它失败，保留原始证据，不放宽断言。
3. 不宣称真实 Obsidian/Provider/OS IME/五平台验收。

## Return
一次性写本目录 `REPORT.md`，使用协调回报模板三节，Status 只能为 completed/blocked/failed/cancelled；completed 仅候选交回。报告前运行 `validate-dispatch.mjs --stage return` 保存回执，源停写后返回 `codex:/root`，不得递归派遣。
