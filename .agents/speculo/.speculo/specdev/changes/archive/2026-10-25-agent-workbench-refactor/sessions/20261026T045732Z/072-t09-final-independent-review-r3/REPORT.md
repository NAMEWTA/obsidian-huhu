# T09 r3 current working-tree independent review

Session: 20261026T045732Z  
Task: 072-t09-final-independent-review-r3  
Status: completed

Reviewer: codex:/root/review_t10_final  
Input-SHA256: d192083f7143136ed3863af6ad0cf4b55daca20a2ab2153656b73c4988020f8d  
Review mode: working-tree explicit-files; frozen `evidence/T-09-review-input-r3.md#review-input`, 57 scope paths.

## 聚焦交接

本轮只消费 r3 review input 的 57 条 T09 scope_paths 与其 working-tree snapshots；excluded_paths 范围外 dirty 文件未作为代码输入。r2 报告只用于历史修复链核对。当前 57/57 `working_snapshot.after` 的 bytes/SHA-256 与工作树匹配，drift=0。Root paths（`main.js`、`styles.css`、bundle budget、notices、vitest config）随同一 scope 检查。未修改源、产物、Git index、依赖或正式 Evidence/Goal/Map/Ticket，未派遣子 Agent。

## 标准轴

Reviewer: codex:/root/review_t10_final  
Axis: standards  
Result: pass  
Input-SHA256: d192083f7143136ed3863af6ad0cf4b55daca20a2ab2153656b73c4988020f8d  
Observed: r3 review-input canonical SHA 与任务值一致；57/57 scope snapshot bytes/SHA-256 匹配；T09 当前源码、生成物和 Root 产物路径无 snapshot drift。

### AC-009/AC-061 与实现标准复核：通过

- **Pane/Workspace owner 与容量：** `WorkspaceStore` 是布局唯一写入者，`WorkspacePanes` 只经 `readLayoutNow/editLayout` 捕获和发布；candidate publish 前通过全 Space（含 shared、未归档 Space）计数。全局 `MAX_INDEXED_PANES=4096`、Space 扫描上限 1000、terminal leaves 只在新增叶时准入；close/reduction 及旧超限图恢复不被错误拦截。证据：`src/modules/agent/core/workspace/pane-identity.ts:20-38`、`src/modules/agent/services/workspace-store.ts:143-163,275-357`、`src/modules/agent/services/workspace-service-panes.ts:94-113,253-275`。
- **身份与跨 Space：** Pane identity 是完整 scoped tuple 或显式 opaque ID；projection 只读，不为 legacy/raw/damaged data 偷写别名；显式 mutation 才 materialize，新 reopen 重新分配 ID。capture 会检查 duplicate、scope、runtime generation；split 要求 source/inserted Session 同 Space，close 只 detach。证据：`pane-identity.ts:39-142`、`workspace-service-panes.ts:117-170,253-315`、对应 pane tests。
- **GUI 容量和 owner 接缝：** direct attach、split、reopen 在真实 WorkspaceStore owner 上做全局准入，并在 queued edit 的 `validate`/candidate 阶段重核；非活动 group 不回退 active group，missing explicit group 返回 target error。对应测试覆盖并发 attach、4096 split candidate、full/last-slot、跨 Space、old-overlimit recovery、queued group removal。
- **焦点、取消和可见性：** `ForegroundIntent` 在 capture 时取得并以 owner/deadline/consumed receipt 贯穿 layout、Space selection、runtime checks 和 DOM focus；晚到、hidden、blurred、disposed 或新 generation 不消费旧能力。Workspace/Terminal DOM tests 覆盖 pointer/keyboard focus、narrow/wide projection、resize handle、host focus subscription cleanup 和 stale receipts。
- **CLI/native seam：** canonical descriptor、TS wire、Rust generated wire/CLI、fixture 与 protocol tests保持同步；Pane target 解析区分 source Pane、inserted Session、Space hint，opaque Pane ID UTF-8/4096-byte bounds、ratio 0.15..0.85、messageId/requestId 分离均由 scope paths 中的 schema/generated/test/CLI 实现覆盖。T09 scope 中未发现新 writer、第二 runtime/persistence manager 或跨层复制 DTO。
- **UI/页面与容量：** WorkspaceLayout 使用真实 `react-resizable-panels`，窄布局只改变 presentation direction，不重写原 group/pane model；PAGE tab 是 singleton，board/usage 以 tab 形式 deep-link，旧 automations page sections 不再创建重复页。WorkspaceToolbar/AgentSidebar 维持显式 Space identity（同名同目录仍显示 exact ID）和 keyboard navigation；PAGE-001/PAGE-003 相关 DOM checks在 scope 中保留。
- **边界与文案：** T09 scope 关注 Workspace/Pane/Space/Session/Control/CLI/native seam；T10 Inbox 行为不被带入 T09 产品判断。当前 T10 共用工作台 wiring（例如 `agentTool` state）不改变 T09 的 Pane/Workspace owner、Page tab 或旧入口合同。现有 en/zh 文案和 architecture boundary 未见新增偏差。

标准轴未发现 material finding，结果为 `pass`。

## 规范轴

Reviewer: codex:/root/review_t10_final  
Axis: specification  
Result: pass  
Input-SHA256: d192083f7143136ed3863af6ad0cf4b55daca20a2ab2153656b73c4988020f8d  
Observed: 57/57 working-tree snapshots match；规范判断仅针对 T09 AC-009/AC-061、PAGE-001/PAGE-003、Pane/Workspace owner、容量、身份、CLI/native、focus 与 T09/T10 boundary。

### T09 合同闭合

- **AC-009：** GUI、local control 与 native control 共享 `WorkspaceService.panes`/原布局 owner；`ControlCommands` 是薄适配，`ControlRouter` 只负责捕获、观察、转发和 bounded receipt。Pane list 是零效果查询；attach/split/resize/focus/close 返回 bounded identity tuples、publication/persistence/effect/focus receipt。Pane close 仅移除显示，不结束 Session/runtime。
- **AC-061：** page/toolbar/sidebar/terminal 面板保持真实工作台行为：board/usage 是 singleton tabs，session/history/tools 不复制工作区 tabs；deep-link 不隐式创建旧 automations 页。确认框、Dialog owner document、Escape/focus return、hidden/offscreen cleanup 及 200%/narrow/reduced-motion 相关实现与测试仍在 scope 内。
- **容量与身份合同：** 4096 是全局 indexed leaves 的硬边界，准入对 candidate 全局重核；legacy identity 使用 lossless scoped tuple，显式 opaque IDs 只在 mutation 分配；旧超限图可通过 close/reduction 恢复，reopen 不复活旧 Pane ID。source Pane 与 inserted Session identity 始终分开。
- **Space 与 target 合同：** 持久 `spaceId/sessionId/runtimeId/paneId` 是目标来源；CLI 仅为允许的 `pane.list`/session-list 类入口采用 Space hint，其他 Pane mutation 要求明确 target；cwd、UI focus、同名 Space 或 caller runtime 不成为隐式路由。Space ownership 在 capture、edit validation、presentation/focus 阶段保持一致。
- **CLI/native 与 bounded protocol：** schema 与生成 TS/Rust bytes 通过 generator check；request/response、target required、error exits、UTF-8 and byte limits、opaque IDs、pane ratio 与 message/request identity 分离均由 canonical tests/fixtures覆盖。ControlPaging 仅保留 bounded cursor position/revision，T10 Inbox fence 不改变 T09 Pane contract。
- **真实环境 disposition：** 本轮和任务输入不将真实 Obsidian、Provider、OS IME 或五平台 live acceptance宣称为通过；受控 DOM/Chrome 与固定历史 receipts只能支持代码/受控环境合同。

规范轴未发现需要 request-changes 的 finding，结果为 `pass`。

## 产物与验证

已执行只读验证：

- 输入 canonical SHA：`d192083f7143136ed3863af6ad0cf4b55daca20a2ab2153656b73c4988020f8d`；57 scope paths、57 snapshots、drift=0；excluded_paths 均为明确字符串。
- 聚焦 Vitest（T09 scope tests，排除需要外部 native binaries 的单测）：exit 0，21 files / 402 tests passed。
- 同一聚焦 Vitest 全集：21 files / 402 tests passed；`control-panels-native.test.ts` 1 test因环境未设置绝对 `HUHU_TEST_PTY_BINARY` 与 `HUHU_TEST_CONTROL_BINARY` 而无法启动，未把该环境阻断冒称产品失败。
- `pnpm exec tsc -p tsconfig.test.json --noEmit --skipLibCheck`：exit 0。
- T09 scope 源文件 focused `pnpm exec eslint`：exit 0，无 warning。
- `pnpm test:architecture`：exit 0，1253 modules，无 zone/host-package/desktop-only/barrel/cycle violations。
- `node scripts/generate-control-protocol.mjs --check`：exit 0，control protocol generated bytes match。
- `node --check scripts/obsidian-acceptance/agent-workbench-panels.mjs`：exit 0。
- r2 固定交接历史报告的 final Root/native/DOM receipts 只作历史链核对；本轮未运行真实 Obsidian、Provider、OS IME、五平台 E2E，也未运行 native helper binary。

## 问题与下一步

本次标准轴与规范轴均为 `pass`，未发现新增源码或规范 finding。当前环境唯一未执行项是 native panel integration test 所需的两个绝对 helper binary；该限制已在产物与验证中明确记录，不能作为本轮新的代码 finding。真实宿主/Provider/OS IME/五平台验收按 T09 合同仍由用户侧执行；本报告不推进正式 T09 状态。

本报告为独立只读审查输出，不修改源、产物、正式状态或 Evidence/Goal/Map/Ticket。

## validate-dispatch return receipt

Command:
`node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs --repo /home/wta/orca/workspaces/obsidian-huhu/terminal --scope-root .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor --session 20261026T045732Z --task 072-t09-final-independent-review-r3 --stage return`

Exit: 0
```json
{
  "errors": [],
  "warnings": [],
  "caveat": "Read-only structure checks do not authenticate tool identity, transcript content, authorization or completion; external histories are never opened."
}
```

