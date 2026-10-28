# T11 stage1 independent final review

Session: 20261026T045732Z  
Task: 075-t11-stage1-independent-review-final  
Status: completed  
Reviewer: codex:/root/review_t10_final  
Review mode: working-tree explicit-files  
Input-SHA256: 248b0333c583b9eae68c4e03aa96e97826f9155d0f3d9ef1bc2ad68cc6a0e386

## 聚焦交接

本轮只读取 TASK 指定的 16 条 scope_paths；未读取 excluded_paths 范围外 dirty 文件，未修改产品源、生成物、Evidence/Goal/Map/Ticket、依赖或用户数据，未派遣子 Agent。`validate-specdev --review-scope --mode source-files` 重新返回 16/16 路径，当前快照与报告中的 observed hashes 一致，scope drift=0。标准来源为仓库 AGENTS.md、SpecDev code-review/common rules、项目 TypeScript/Rust/lint/test/architecture 约束；规范来源为 TASK、`docs/agent-workbench.md` 及 16 条路径内的接口/测试合同。

## 标准轴

Reviewer: codex:/root/review_t10_final  
Axis: standards  
Result: request-changes  
Input-SHA256: 248b0333c583b9eae68c4e03aa96e97826f9155d0f3d9ef1bc2ad68cc6a0e386  
Observed: 16/16 scope paths revalidated; no scope drift.

通过项：

- native `query` 只读取 `history.key,summary` 做过滤/分页，明确没有把 `history_text` 载入 list；`native/pty-server/src/agent_data.rs:638-748`。`parse_metadata` 关闭 `load_body`，文本格式只在 64 KiB metadata admission 内读取身份；`native/pty-server/src/agent_data.rs:1301-1419`。
- `HistoryStore.refresh` 以 `transcriptDetails('')` 组装摘要，只有展开行才调用 `preview`/`read`; `src/modules/agent/services/history-store.ts:29-67,81-120`。UI 在展开时触发预览，en/zh source-status 文案成对存在；`src/modules/agent/ui/history/SessionHistoryPanel.tsx:83-140`, `src/modules/agent/i18n.ts:409-413,1166-1170`。
- revision fence 从 `NativeHistory.query` 传至 native `expected_revision`，CLI adapter 的 cursor 校验为 digit-only，并在 preview 遍历分页时复用 fence；`src/modules/agent/platform/history/service.ts:336-393`, `src/modules/agent/services/control/history.ts:41-118`。
- Grok admission 受 64 KiB 上限和 cwd admission 约束；OpenCode scan/read/query 均有明确拒绝路径，未把 SQLite source 当作安全可用来源；`native/pty-server/src/agent_data.rs:192-200,316-329,804-816,1269-1288`。

Finding S-075-1 (high, 新发现)：旧索引的无 provenance 行仍可能通过 vault scope 准入。`session_allowed` 对 `scope != account` 采用 `!managed_source(vault, transcript_path)` 放行分支，且 `read` 只检查 `sources.iter().any(...)`；空 `sources` 会通过该检查；`native/pty-server/src/agent_data.rs:331-339,804-831`。因此一个旧 v1 row（`sources=[]`, `system_base=None`, cwd 在 Vault 内、transcript_path 非 managed）可以在 workspace/vault query 中出现并被 lazy read，绕过当前 source admission。修复条件：vault scope 也必须要求可验证的 provider/source provenance（或拒绝/重扫所有缺失 provenance rows），并用 legacy row 的 query/read 回归证明拒绝。

Finding S-075-2 (medium, 新发现)：状态枚举定义与 native producer 不一致。TS/UI 暴露 `missing|changed|unsupported|permission-denied|unknown`，但 native parser 仅写入 `source_status: "available"`，source failure 以 skip/warning/error 返回，没有可持久、可展示的非 available row；`src/modules/agent/core/history/types.ts:5-16`, `src/modules/agent/platform/desktop/server/agent-data-client.ts:12-16`, `native/pty-server/src/agent_data.rs:1320-1330,1470-1482`。修复条件：为不可用来源保留 bounded summary/status（或明确将该阶段合同缩减为 reject-only，并同步类型、UI、文档和 adapter）。

已知 blocker（不误报为本轮关闭）：F1 SHM side-effect/cleanup owner、F2 rejected-fd same-inode lock ownership、F3 SQLite Connection close/error telemetry 仍未实现；OpenCode safe gate 继续在 `agent_data.rs:192-200,316-318` 明确拒绝，23 个 native tests 通过不改变三项 blocker 状态。

## 规范轴

Reviewer: codex:/root/review_t10_final  
Axis: specification  
Result: request-changes  
Input-SHA256: 248b0333c583b9eae68c4e03aa96e97826f9155d0f3d9ef1bc2ad68cc6a0e386  
Observed: 16/16 scope paths revalidated; no scope drift.

Finding P-075-1 (high, 新发现)：CLI history adapter 只实现为孤立类，未接入真实 control/CLI 路由。`HistoryCommands` 虽要求 explicit `spaceId`、owner filter、fenced cursor/preview (`src/modules/agent/services/control/history.ts:9-118`)，但 `ControlCommands.CONTROL_HANDLERS` 没有 `history.list`/`history.preview`，且 `commands.ts` 未导入或 dispatch `HistoryCommands`; `src/modules/agent/services/control/commands.ts:40-74,141-154`。`AgentController` 只装配 `HistoryStore`/`NativeHistory`，没有 Space owner adapter 或 control handler wiring；`src/modules/agent/services/controller.ts:350-367,459-470`。canonical schema 和 generated wire 仍将两项标为 `available:false`，target 为空且 params 没有 required `spaceId`; `src/shared/native/control-schema.json:2333-2386`, `src/shared/native/control-wire.generated.ts` 的对应 descriptor。修复条件：以真实 SpaceService/ControlCommands/CLI consumer 接线，更新 canonical schema/generated artifacts，并以旧入口无 Space 时 `TARGET_REQUIRED`、同名同 cwd Space 不猜测、跨页 fence/preview round-trip 的生产链测试证明闭合。

Finding P-075-2 (medium, 新发现)：Space/来源归属在生产 DTO 中没有真实绑定。Native `Session` 只产出 `source_ref`，没有 `space_id`；`HistoryCommands` 测试用 row.spaceId 注入 owner，但当前 controller 没有等价 `HistorySpaceOwner` 实例。`native/pty-server/src/agent_data.rs:41-60,1176-1183`; `src/modules/agent/services/control/history.test.ts:7-35`; `src/modules/agent/services/controller.ts:350-367`。因此即使把 handler 打开，真实 CLI list/preview 仍缺少 durable Space owner，可能按空 owner 丢行或错误拒绝。修复条件：由持久 Space owner 以 sourceRef/session identity 建立唯一映射，并在 production adapter test 中覆盖 unbound row、same-cwd different-Space、sourceRef mismatch。

规范通过项：metadata-only list/lazy preview、revision fence、OpenCode explicit reject、Grok bounded admission、UI/i18n 状态接缝和 T11 scope 未见越界；但上述未接线与 provenance 缺口，加上仍开放的 F1/F2/F3，使 stage1 不能声明规范闭合。

## 产物与验证

- 16/16 scope snapshot：`validate-specdev.mjs --review-scope --repo /home/wta/orca/workspaces/obsidian-huhu/terminal --mode source-files ...`，exit 0；当前显式路径 SHA 与 snapshot 输出一致，drift=0。
- `pnpm exec vitest run src/modules/agent/services/history-store.test.ts src/modules/agent/services/control/history.test.ts src/modules/agent/platform/desktop/server/native-history.test.ts`，exit 0，3 files / 11 tests passed。
- `cargo test --locked agent_data::tests`（cwd `native/pty-server`），exit 0，23 agent_data tests passed。
- `cargo check --locked`（cwd `native/pty-server`），exit 0。
- `pnpm exec tsc --noEmit --skipLibCheck`，exit 0。
- `pnpm test:architecture`，exit 0，1254 modules，无架构违规。
- `pnpm exec eslint --no-warn-ignored` 针对 scope 内 TS/TSX，exit 0；普通 focused eslint 对被 ignore 的测试文件产生 2 个 ignored warnings，故采用 `--no-warn-ignored` 记录无诊断结果。
- `git diff --check -- <16 scope paths>`，exit 0。
- 未运行真实 Obsidian/Vault/Provider/CLI host；未把 fixture/native unit tests 当作 F1/F2/F3 或真实 OpenCode Route A 关闭证据。

## 问题与下一步

1. 保持 F1/F2/F3 SQLite blockers 开放；不要因 native unit tests 通过而推进 T11 完成状态。
2. 先修复 vault-scope legacy rows 的 provenance admission，再补非 available source-status 的持久/展示合同，或由正式规范明确 reject-only 语义。
3. 将 `HistoryCommands` 接入 ControlCommands/schema/generated/真实 CLI consumer，并由持久 Space owner 提供 sourceRef→Space 归属；补生产 chain tests 后重新冻结输入并复审。
4. 本报告未修改任何产品或正式工件；T11 状态保持由 Root 处理。

## validate-dispatch return receipt

Command:
`node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs --repo /home/wta/orca/workspaces/obsidian-huhu/terminal --scope-root .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor --session 20261026T045732Z --task 075-t11-stage1-independent-review-final --stage return`

Receipt: Root corrected the task's administrative section headings without changing the frozen path list or review findings.

Validator result (actual): exit 0
```json
{"errors":[],"warnings":[],"caveat":"Read-only structure checks do not authenticate tool identity, transcript content, authorization or completion; external histories are never opened."}
```
