---
schema_version: 2
session: "20261026T045732Z"
task: "076-t13-owner-stage1"
kind: implementation
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-13"
---

# T13 shared browser carrier stage 1

## Goal

按 T-13、T-13-preflight、T09 final interfaces 与当前真实源码，实施共享标签承载与 Browser 独立运行的最小可验收增量：Browser 不因 Agent inactive/无 Space 而被错误卸载，保留既有 Browser/Cookie/page 生命周期和旧入口兼容。先证明实际 T09 接缝与写集；若共享 owner 或 app/module 注入仍需 ticket 未授权路径，停止写入并返回 exact blocker。

## Inputs

回读 `ticket/13-independent-browser.md`、`evidence/T-13-preflight.md`、T09 `evidence/T-09.md`、DESIGN revision1/PAGE-001/PAGE-004、implementation-contracts、dev/ui 绑定参考和当前真实 Browser/Agent/Shared workspace 源。不得把旧预检未来 API 当成现存接口。

## Workspace and Scope

工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，共享 dirty workspace；T11 writer 已停止。允许修改仅限 T13 ticket writable_paths：`src/shell/shared-workspace/**`、`src/app/contracts/workbench*.ts`、`src/app/workbench/compose-workbench.ts`、`src/modules/browser/api.ts`、`src/modules/browser/module.ts`、`src/modules/browser/services/host*.ts`、`src/modules/browser/ui/**`、`src/modules/browser/i18n.ts`、`src/modules/agent/ui/browser/**`、`src/modules/agent/ui/workspace/**`、`src/modules/agent/ui/workbench-page.ts`、`src/modules/agent/services/workspace-service*.ts`、`src/modules/agent/api.ts`、`src/modules/agent/module.ts`、`scripts/obsidian-acceptance/browser-cookie-import.mjs`、`docs/browser.md`、`docs/architecture.md`、`main.js`、`styles.css`。生成物由 Root 独占；不要修改 T11 history/control、schema、依赖、用户数据或 Git。

## Acceptance

1. 先列出现存 BROWSER_OPEN、AGENT_BROWSER_TABS、BrowserTabView、shared layout/lifetime 与 Cookie owner 的真实接缝；不能复制第二套 layout writer/cache。
2. 在写集内交付可运行的共享 carrier/renderer 注入或明确返回 blocked；不能用仅 `peek`/mock/available flag 冒充 Agent-off 解耦。
3. 保留旧 Browser 入口、pageId/profile/zoom/restore、Cookie owner、关闭/恢复/错误和 no-Space/Agent-off 行为边界；不启动 PTY/Provider/历史扫描作为网页恢复副作用。
4. 运行适用定向 Vitest、architecture、lint/tsc、脚本/格式检查；真实 Obsidian/Provider/OS IME/五平台由用户验收，不写成通过。

## Return

只写本任务 `REPORT.md`；报告必须记录 changed paths、真实命令/退出码、未运行项、SOURCE STOPPED/blocked 或 completed。完成后运行：
`node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs --repo /home/wta/orca/workspaces/obsidian-huhu/terminal --scope-root .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor --session 20261026T045732Z --task 076-t13-owner-stage1 --stage return`
