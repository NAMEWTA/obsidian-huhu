Session: 20261026T045732Z
Task: 067-t10-final-independent-review-r5
Status: completed

Reviewer: codex:/root/review_t10_final
Input-SHA256: 72c6f992e83193c5af8d40c8cf97b5b1be4a44e54e7247371d8f4c65cd8b8664
Review mode: working-tree explicit-files；冻结输入 `evidence/T-10-review-input-r5.md#review-input` 的 A17/B19/U14/Root4 共 54 路径。

## 聚焦交接

本次只读取 r5 working-tree explicit-files scope 的 54 条路径；excluded_paths 中的范围外 dirty 文件未作为代码输入。回读 r4 pass、065 bounded cursor 报告及其 return receipt，并复核当前 Space 绑定、旧入口先选 Space、R1/R2 与全 T10 合同。未修改源码、产物、Git index、依赖、正式 Evidence/Goal/Map/Ticket，也未派遣子 Agent。

## 标准轴

Axis: standards  
Result: request-changes  
Input-SHA256: 72c6f992e83193c5af8d40c8cf97b5b1be4a44e54e7247371d8f4c65cd8b8664  
Observed: r5 inner `review_input` SHA 与给定 working-tree input SHA 一致；54/54 当前文件 `after` bytes/SHA-256 匹配，drift=0。

### R3 bounded cursor、R1 fence、R2 observation remove：通过

- `InboxFence` Map 项只保存 recipient、高水位、generation、16 字符 fingerprint 与 expires；完整正文/引用仅在 fingerprint 计算期间临时参与，未存入 Map（`src/modules/agent/services/spaces/space-service.ts:96-106,733-754`）。
- 两个索引由 `cleanupInboxFences` 各自限制到 16 条、清理 10 秒 TTL；每次 list 前后清理，dispose 清空（`space-service.ts:755-770,821-854,1217-1231`）。
- UI 首页冻结 high-water/generation，后续页携带 fence，变化显示 stale（`src/modules/agent/ui/inbox/InboxPanel.tsx:29-62`、`src/modules/agent/ui/workspace/WorkspaceToolbar.tsx:12-36`）。
- settled observation 只有用户点击“收起”才 `presentation.remove`；pending/unknown 仍保留（`src/modules/agent/ui/inbox/InboxPanel.tsx:285-287,324-326`；`src/modules/agent/services/inbox/presentation.ts:87-101`）。

### R5 — 中高：agentTool 已列入 stateKeys，但生产页面 getState 没有保存它

- 位置：`src/app/workbench/compose-workbench.ts:84` 声明 `stateKeys: ['agentControl', 'agentHistory', 'agentHistoryWidth', 'agentTool']`；`src/modules/agent/ui/AgentWorkspacePage.tsx:494-511` 的 `createAgentPage` 返回值 `getState` 只返回 `agentControl`、`agentHistory`、`agentHistoryWidth`，遗漏 `agentTool`。
- 证据：UI 运行时确实在 `viewStore` 设置 `agentTool`（`AgentWorkspacePage.tsx:220,355-373`），`createWorkspaceView` 也能读取/校验 saved `agentTool`（`src/modules/agent/services/workspace-view.ts:6-14`）；但宿主保存页面时调用的是该 `getState`，因此 Inbox/Control 选择不会被写入页面 state。现有 contribution/view tests 只测试 `cleanPageState` 与 `createWorkspaceView`，没有断言 `createAgentPage().getState()` 包含 agentTool。
- 风险：用户选择 Inbox 后关闭/reopen 或工作台页面恢复时回退到 control，违反 T10 engineering packet 第 91 行“序列化只加 agentTool”、以及“AgentWorkspacePage getState 与 compose-workbench stateKeys 和真实 contribution 测试同步”的合同；这是生产持久化边界，不是测试类型问题。
- 建议：在 `getState` 返回 `agentTool: page.view.getState().agentTool`，补真实 `createAgentPage` state round-trip 测试，确认旧 saved 无枚举仍默认 control。

标准轴因此为 `request-changes`；R3/R1/R2、资源边界和代码质量已通过，R5 仍需修复。

## 规范轴

Axis: specification  
Result: request-changes  
Input-SHA256: 72c6f992e83193c5af8d40c8cf97b5b1be4a44e54e7247371d8f4c65cd8b8664  
Observed: 54 条 working-tree explicit-files 路径与冻结 input 完全一致；规范判断基于 T10 spec、implementation-contracts、DESIGN、ticket 与 engineering packet。

### R3/R1/R2 及 Space/旧入口合同复核

- bounded cursor 满足固定摘要、16 条索引、10 秒 TTL、每次 list 清理和 dispose 清空；旧页的高水位/代数 fence 稳定，in-fence 变化使其失效，ack 不错误改变成员/排序。
- list 只返回 bounded summary，Read 才返回正文；unknown 不自动重发；saved/verified 可显式收起，unknown/conflict/not-found 保留。
- Inbox 收件人来自持久 Space/Session，当前 Space/全部 Space 由 UI 显式选择；无 selected Space 时 UI 提示先选 Space，不推断 cwd/current UI。`SpaceService.requireSpace` 在缺少 spaceId 且非 interactive 时返回 `TARGET_REQUIRED`，interactive 才调用受控 Space picker（`src/modules/agent/services/spaces/space-service.ts:468-492`）。
- 四 operation availability 仍通过 controller-owned InboxService、真实 handler/CLI 与 UI 消费者闭合；业务 messageId 与 requestId 分离；唯一 SpaceService writer、canonical TS/Rust generator、UTF-8 bounds、read/ack 分离保持一致。

### R5 — 高：工作台工具选择持久化合同未闭合

- `compose-workbench` 明确把 `agentTool` 纳入宿主 state keys，但生产 `createAgentPage` 的 `getState` 漏掉该字段（`compose-workbench.ts:84`；`AgentWorkspacePage.tsx:494-511`）。
- 这会使页面状态恢复只能保留 control/history/width，`createWorkspaceView` 的 inbox 恢复分支无法从真实宿主保存 state 得到输入；直接调用 `createWorkspaceView({agentTool:'inbox'})` 的单元测试不能证明宿主页面 round-trip。
- 规范依据：engineering packet 第 91 行要求 `AgentWorkspacePage getState`、`compose-workbench stateKeys` 与真实 contribution 测试同步；旧 saved 缺枚举默认 control，合法 saved inbox 必须保留。当前实现只满足后半段的纯函数默认值，不满足生产贡献接缝。

规范轴因此为 `request-changes`；R5 是本轮唯一新增合同 finding。

## 产物与验证

已执行只读验证：

- r5 input SHA：`72c6f992e83193c5af8d40c8cf97b5b1be4a44e54e7247371d8f4c65cd8b8664`；54/54 `working_snapshot.after` bytes/SHA-256 匹配，drift=0。
- `pnpm exec vitest run src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx src/app/workbench/agent-contribution.test.ts src/modules/agent/services/workspace-view.test.ts --testTimeout=30000`：exit 0，3 files / 14 tests；这些测试未覆盖 `createAgentPage.getState` 的 agentTool round-trip。
- Inbox/domain/UI focused suite（model、SpaceService inbox/recovery、InboxService/presentation、control inbox/paging、InboxPanel/Toolbar DOM）：exit 0，9 files / 69 tests。
- 相关源 `eslint`：exit 0；`pnpm exec tsc -p tsconfig.test.json --noEmit --skipLibCheck`：exit 0。
- `pnpm test:architecture`：exit 0，1253 modules，无 zone/host-package/desktop-only/barrel/cycle violations。
- `node scripts/generate-control-protocol.mjs --check`：exit 0，`control protocol generated bytes match`。
- `node --check scripts/obsidian-acceptance/agent-workbench-panels.mjs`：exit 0。
- r4 report 与 065 bounded-cursor report 的 return validator 均为 exit 0；本轮 receipt 见文末。

仍未验证且必须如实保留：完整 `pnpm run build`/全仓 lint/Root main.js、styles.css、bundle budget、第三方许可重新生成；真实 Chrome/Obsidian acceptance、Provider、OS IME、五平台 E2E。working-tree scope 包含 Root 产物，但本审查未把已有字节快照冒充新 build 证据。

## 问题与下一步

当前标准轴和规范轴均为 `request-changes`，原因是 R5：

1. 在 `createAgentPage.getState` 返回 `agentTool`，并补宿主生产页面 state round-trip 测试；确认选 Inbox 后保存/恢复仍为 Inbox，旧 state 无该字段仍回退 control。
2. 修复后重新执行 working-tree explicit-files 独立双轴审查；Root build/预算/许可及真实宿主/平台验证仍按合同单独补齐。

本报告仅为独立审查输出，不修改源、产物、正式状态或 Evidence/Goal/Map/Ticket。

## validate-dispatch return receipt

Command:
`node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs --repo /home/wta/orca/workspaces/obsidian-huhu/terminal --scope-root .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor --session 20261026T045732Z --task 067-t10-final-independent-review-r5 --stage return`

Exit: 0

```json
{
  "errors": [],
  "warnings": [],
  "caveat": "Read-only structure checks do not authenticate tool identity, transcript content, authorization or completion; external histories are never opened."
}
```
