---
schema_version: 2
session: "20261026T045732Z"
task: "063-t10-ui-fence-and-observation-repair"
kind: implementation
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-10"
---

# T10 Inbox UI fence and observation pool repair

## Goal
消费 062 的 frozen high-water/generation 分页字段，并修复 061 r2 的 R2：已完成/明确 none 的 observation 必须在用户显式收起后调用 presentation.remove 释放 32 条池；unknown/pending/conflict/not-found 继续保留。

## Inputs
回读 061 REPORT（SHA `32e3f7c55553548056a652414262f084236be39148ac73596a51ffdb2a65895c`）、062 完成后的 `InboxListInput/Result`、当前 InboxPanel/Toolbar。用户仍要求旧入口先选 Space；不按 cwd/current view 猜测目标。

## Workspace and Scope
工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，branch `NAMEWTA/terminal`。只允许修改：

- `src/modules/agent/ui/inbox/InboxPanel.tsx`
- `src/modules/agent/ui/inbox/InboxPanel.dom.test.tsx`
- `src/modules/agent/ui/workspace/WorkspaceToolbar.tsx`
- `src/modules/agent/ui/workspace/WorkspaceToolbar.dom.test.tsx`
- `src/modules/agent/i18n.ts`
- 本任务 `REPORT.md`

其它 domain/control/native、Acceptance 脚本、Root 产物、正式 Evidence/Goal/Map/Ticket、依赖、Git index 只读；不提交/推送/发布。

## Acceptance
1. Panel/Toolbar 的 page helper 在第一页捕获 `highWaterSequence` 与 `generation`，后续请求携带二者；只聚合 frozen high-water 内的 summary。追加越过 fence 的消息不混入当前结果，owner stale generation 错误可见并要求刷新；去重与未读计数保持。
2. InboxPanel 为 completed/none observations 渲染可见的 settled 区域和明确“收起”按钮；点击按钮才调用 `presentation.remove(attemptId)`。成功/verified 后 observation 仍可收起，unknown/pending/conflict/not-found 不提供移除路径。补 DOM 回归覆盖 fence 参数与 remove。
3. 新增 `agent.inbox.settledTitle` 与 `agent.inbox.dismiss` 的 en/zh 文案，保持现有设计系统、ARIA、显式 Read/ack/Space 规则。
4. 运行受影响 DOM/Vitest、ESLint、`tsc --skipLibCheck`、`git diff --check`，报告真实退出码与未验证项；不宣称 build、真实 Obsidian/Provider/IME/五平台或独立 review 已通过。

## Return
一次性写本目录 `REPORT.md`，使用协调回报模板的“聚焦交接”“产物与验证”“问题与下一步”三节，Status 只能为 completed/blocked/failed/cancelled；完成后运行 `validate-dispatch.mjs --stage return`，源停写后回报 `codex:/root`，不得递归派遣。
