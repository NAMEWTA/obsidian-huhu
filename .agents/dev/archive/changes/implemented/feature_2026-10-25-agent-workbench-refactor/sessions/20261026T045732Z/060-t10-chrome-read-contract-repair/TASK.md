---
schema_version: 2
session: "20261026T045732Z"
task: "060-t10-chrome-read-contract-repair"
kind: implementation
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-10"
---

# T10 production Chrome Inbox read contract repair

## Goal
更新生产 Chrome Inbox 验收夹具以匹配 057 的 summary/read 合同：明确打开 Inbox 后先确认列表不泄露正文，再点击目标行的 Read，最后验证 detail 正文可读。保持 arrival closed、显式收件人选择、状态/zoom/cleanup 断言不变。

## Inputs
回读 057 InboxPanel（summary-only list、Read detail）、当前脚本 `scripts/obsidian-acceptance/agent-workbench-panels.mjs` 的 inbox 场景及最近 Root Chrome 运行 `/tmp/huhu-t09-production-ui-t10-inbox-20261027g`：除 “inbox unread body is inspectable after explicit opening” 外 32 项通过，失败原因是夹具仍在列表渲染正文。

## Workspace and Scope
工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，branch `NAMEWTA/terminal`。只允许修改：

- `scripts/obsidian-acceptance/agent-workbench-panels.mjs`
- 本任务 `REPORT.md`

生产 UI、domain/control、其它测试、Root 产物、正式 Evidence/Goal/Map/Ticket、依赖、Git index 只读；不提交/推送/发布。

## Acceptance
1. Inbox scene 在选择真实 `coordinationProbe.created[0].session.sessionId` 后等待列表行，断言 `[data-inbox-detail]` 尚不存在且列表文本不含 `受控 Inbox 消息`；点击该行的 `读取`，等待 detail，再断言 detail 含完整正文。
2. `node --check`、`--prepare-only --inbox` 通过；Root 使用当前 `styles.css` hash 运行完整 `--inbox` Chrome，arrival/Read detail/所有既有尺寸状态/zoom/cleanup 均通过，失败保留原件，不放宽断言。
3. 不宣称真实 Obsidian/Provider/OS IME/五平台验收。

## Return
一次性写本目录 `REPORT.md`，使用协调回报模板的“聚焦交接”“产物与验证”“问题与下一步”三节，Status 只能为 completed/blocked/failed/cancelled；完成后运行 `validate-dispatch.mjs --stage return`，源停写后回报 `codex:/root`，不得递归派遣。
