---
schema_version: 2
session: "20261026T045732Z"
task: "073-t11-owner-stage1"
kind: implementation
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-11"
---

# T11 route A source-admission stage 1

## Goal
按 T-11、T-11-preflight 与 037/041 safe-open 结论，先在当前公开实现边界核验并实施 route A 的安全 source admission / SQLite 生命周期门（F1 SHM 副作用与拒绝清理、F2 rejected-fd 同 inode 锁所有权、F3 SQLite close 与 OS close），再进入 Vault history 接线。若首阶段不能在冻结写集内有界实现，停止源写入，准确记录阻塞。

## Inputs
回读 T-11 ticket、T-11-preflight、037-t11-safe-open-design、041-t11-safe-open-review，当前 T09/T10 动态接口与 native agent_data/data 实际源。保持旧入口必须显式绑定 Space、唯一 writer、取消与只读 preview 语义；不改正式状态、Evidence、Goal/Map/Ticket、生成物、依赖、用户数据或 Git。

## Workspace and Scope
工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，共享 dirty 工作区只读核对。

允许修改仅为：
- `src/modules/agent/core/history/**`
- `src/modules/agent/platform/desktop/history/**`
- `src/modules/agent/platform/history/**`
- `src/modules/agent/platform/desktop/server/agent-data-client.ts`
- `src/modules/agent/services/history-store*.ts`
- `src/modules/agent/ui/history/**`
- `src/modules/agent/services/control/history*.ts`
- `src/modules/agent/i18n.ts`
- `native/pty-server/src/agent_data.rs`
- `native/pty-server/src/data.rs`
- `docs/agent-workbench.md`
- 本任务 `TASK.md` 与 `REPORT.md`

不得改 `main.js`、`styles.css`、其它 T11 后继路径、正式工件、依赖或 Git。

## Acceptance
1. 先证明 F1/F2/F3 在当前公开 SQLite/rusqlite/native 边界是否有界可实现，不把事后路径检查或旧 probe 观察冒充安全门。
2. 若可实现，补真实 source admission、SQLite 生命周期与 mixed-source fixture tests，再按 T-11 逐步接 Vault metadata-first/history list/preview；若不可实现，保持源 STOPPED 并给出 exact blocker、受影响边界与恢复所需写集/接口。
3. 不运行真实 Obsidian/Provider/IME/五平台；不启动 PTY 作为历史预览副作用；不猜 cwd/current UI 归属。
4. REPORT 使用固定三节，记录真实命令、退出码、未运行项和实际源停写状态；return validator 通过后回报 Lead。

## Return
原子写本目录 `REPORT.md`，Status 使用 `blocked`（若安全门无法在当前边界闭合）或 `completed`；完成后运行 `validate-dispatch.mjs --stage return`，不修改正式状态或后续状态。
