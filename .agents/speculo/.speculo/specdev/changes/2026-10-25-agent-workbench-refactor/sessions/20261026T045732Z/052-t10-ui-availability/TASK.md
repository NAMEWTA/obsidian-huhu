---
schema_version: 2
session: "20261026T045732Z"
task: "052-t10-ui-availability"
kind: implementation
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-10"
---

# T10 Inbox UI availability marker closure

## Goal
四项 inbox/message capability 已由真实 controller-owned owner、handler/CLI 和 canonical/native descriptor 闭合后，修正 InboxPanel 仍写死为 unavailable 的生产可访问性标记和对应 DOM 断言，使用户看到能力已可用。只更新 UI 的状态观察，不改 Space 绑定、工具路由、布局、焦点、键盘、pending/unknown 或文案合同。

## Inputs
回读 T10 approved DESIGN revision1 digest `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab` PAGE-003、047 U14 report、048/049 integration reports、当前 `InboxPanel.tsx` 与 `InboxPanel.dom.test.tsx`。用户决定旧入口没有 Space 必须先选择；本任务不碰 workspace context 或目标推断。

## Workspace and Scope
工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，branch `NAMEWTA/terminal`，复用 T10 current change workspace。只允许修改：

- `src/modules/agent/ui/inbox/InboxPanel.tsx`
- `src/modules/agent/ui/inbox/InboxPanel.dom.test.tsx`
- 如当前 U 文案/Chrome fixture 明确含有 staged unavailable 文案，才同步所属 U 路径；否则不要扩写范围
- 本任务 `REPORT.md`

明确禁止修改 `workspace-context.tsx`（Root 已恢复其意外候选改动），其它 A/B/Root 源、canonical/生成物、正式 Evidence/Goal/Map/Ticket、main.js/styles.css、依赖和 Git index 只读；不提交/推送/发布。

## Acceptance
1. InboxPanel 的生产 `data-inbox-availability` 或等价状态观察反映真实 capability available=true，保留 `onUnreadCount` 缺失时的安全渲染和现有 t() 文案、aria/键盘/尺寸状态。
2. DOM 测试覆盖 available marker=true，并继续证明 unread/pending/unknown、显式 read/ack/send 和无消费者时的渲染边界；不删除或放宽既有断言。
3. 运行 Inbox/AgentWorkspace/WorkspaceToolbar DOM 与贡献测试、U 路径 ESLint、脚本 node check（如改动），并记录精确退出码。不得宣称真实 Obsidian、Provider、OS IME 或五平台 E2E。
4. 不修改 `workspace-context.tsx`，不引入 cwd/current UI 猜 Space 或第二 writer。

## Return
一次性写本目录 `REPORT.md`，使用协调回报模板的“聚焦交接”“产物与验证”“问题与下一步”三节，Status 只能为 completed/blocked/failed/cancelled；completed 仅为候选交回 Lead，不推进正式 T10 状态。报告前运行 `validate-dispatch.mjs --stage return` 并保留原始回执；源停写后通过原生通道返回 `codex:/root`，不得递归派遣。
