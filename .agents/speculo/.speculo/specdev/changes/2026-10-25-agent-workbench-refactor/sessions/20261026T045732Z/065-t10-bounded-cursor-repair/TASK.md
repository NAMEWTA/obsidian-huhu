---
schema_version: 2
session: "20261026T045732Z"
task: "065-t10-bounded-cursor-repair"
kind: implementation
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-10"
---

# T10 bounded Inbox cursor repair

## Goal
修复 064 r3 的 R3：SpaceService 分页 fence 只能是原 owner 进程内的短寿命、有界 cursor，不保存正文/引用快照，不形成永久 lineage 或 O(n²) 内存。保持 062 的 frozen high-water/generation 语义。

## Inputs
回读 064 REPORT（SHA `9283d05be7b3882fba4cdac65dcce2d5b3f4e47a6f1ff691e513855acfe1b26a`）、T-10 engineering packet §37、当前 `inboxFences/inboxLatestFences/inboxFingerprint/listInbox/dispose`。UI 继续消费同一 high-water/generation 字段，不改 UI/API 目标形态。

## Workspace and Scope
工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，branch `NAMEWTA/terminal`。只允许修改：

- `src/modules/agent/services/spaces/space-service.ts`
- `src/modules/agent/services/spaces/space-service-inbox.test.ts`
- 本任务 `REPORT.md`

其它 UI、control/native、生成物、正式 Evidence/Goal/Map/Ticket、依赖、Git index 只读；不提交/推送/发布。

## Acceptance
1. fence fingerprint 变为固定长度摘要/等价 bounded token，计算时可短暂读取当前消息但 Map 不保存正文、引用或完整 JSON；保持能发现 recipient/messageId/sequence/body/source/reference 的 in-fence 替换/删除/重排。
2. fence/cursor 资源最多 16 个、TTL 10 秒；每次 list 先清理过期/超限项，旧 generation/fence 缺失明确返回 stale；`dispose()` 清空 fence maps。latest-fence 索引同样有界，不形成第二个无限索引。
3. 补真实回归：连续新增/刷新超过 16 个 fence 后 map 仍有界且 fingerprint 不含正文；TTL/旧 cursor 失效；dispose 清理；062 的 append 外稳定、in-fence stale、summary/read/Space 隔离继续通过。不得创建第二 writer/queue。
4. 运行受影响 Vitest、architecture、ESLint、`tsc --skipLibCheck`、`git diff --check`，报告真实退出码、源停写和未验证项；不宣称 UI/真实 Obsidian/Provider/IME/五平台或独立复核已通过。

## Return
一次性写本目录 `REPORT.md`，使用协调回报模板的“聚焦交接”“产物与验证”“问题与下一步”三节，Status 只能为 completed/blocked/failed/cancelled；完成后运行 `validate-dispatch.mjs --stage return`，源停写后回报 `codex:/root`，不得递归派遣。
