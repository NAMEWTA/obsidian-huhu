Session: 20261026T045732Z
Task: 061-t10-final-independent-review-r2
Status: completed

Reviewer: codex:/root/review_t10_final
Input-SHA256: 12c1345793a0947f7ad91a345da490f006299a9c4c6928a2197f41b007c45df5
Review mode: source-files；冻结输入 `evidence/T-10-review-input-r2.json` 的 A17/B19/U14/Root4 共 54 路径。

## 聚焦交接

本次使用 r2 冻结输入作为唯一代码输入，回读 055 及 056–060 报告核对修复声明，再以当前 54 条源码快照逐项复查。未读取或写入范围外源码，未修改源、产物、正式状态、Evidence/Goal/Map/Ticket，也未派遣子 Agent。

## 标准轴

Axis: standards  
Result: request-changes  
Observed: r2 `review_input` SHA 与外层 input SHA 均为 `12c1345793a0947f7ad91a345da490f006299a9c4c6928a2197f41b007c45df5`；54/54 当前文件长度与 SHA-256 匹配，无 drift。

055 的四项标准问题闭合情况：

- **S1 分页/未读静默截断：原问题已修复，但仍有稳定快照缺口。** `SpaceService.listInbox` 现在以 `InboxMessageSummary[]`、`afterSequence`、`nextSequence` 返回有界页（`src/modules/agent/services/spaces/space-service.ts:766-787`）；InboxPanel 与 Toolbar 都通过 `collectInboxPages` 拉取最多 4096 页（`src/modules/agent/ui/inbox/InboxPanel.tsx:29-55`、`src/modules/agent/ui/workspace/WorkspaceToolbar.tsx:12-31`），所以超过 100 条不再静默少报。可是 helper 只携带 `afterSequence`，每次重新读取都重新计算 `highWaterSequence`，没有冻结第一页的 high-water/generation。新消息在两页之间追加时可能被并入本次结果，删除/重排也没有导致 generation 失效；这仍不满足 engineering packet 第 37 行的“第一页冻结 recipient 和 highWater，后续页只读至该 highWater”。这是本轮新增 R1。
- **S2 UTF-8 诊断边界：已闭合。** `truncateUtf8` 按码点和 UTF-8 字节截断（`src/modules/agent/core/inbox/model.ts:84-97`），presentation 与 facade 均使用它（`src/modules/agent/services/inbox/presentation.ts:69-88`、`src/modules/agent/services/inbox/service.ts:50-60`）；多字节回归测试通过。
- **S3 ack canonical 漂移：已闭合。** core `INBOX_LIMITS.ackBytes` 已为 256（`model.ts:3-15,130-133`），与 `control-schema.json:38-47` 和生成 TS/Rust descriptor 一致；生成器 check 通过。
- **S4 message.send 取消接缝：已闭合到 owner 边界。** handler 将 `execution.signal` 传给 InboxService（`src/modules/agent/services/control/inbox.ts:179-199`），facade/SpaceService 在入队、读 primary、容量计算和 commit 前检查 abort（`src/modules/agent/services/inbox/service.ts:62-85`、`src/modules/agent/services/spaces/space-service.ts:716-763`）。已 admitted 的 commit 没有被伪装成可回滚；其取消语义仍需真实 owner/晚写环境验证，但未再发现 055 所指的“signal 未传入 writer”缺口。

**R2 — 中：已完成 observation 没有显式移除，32 条池会泄漏。**

- 位置：`src/modules/agent/services/inbox/presentation.ts:47-65,87-101`；`src/modules/agent/ui/inbox/InboxPanel.tsx:234-257,314`。
- 证据：`reserve` 按 `entries.size >= 32` 拒绝；`complete` 只把 pending/unknown 改成 completed/none，仍保留 Map 项及预留 4 KiB；`remove` 只在服务层存在。InboxPanel 核对成功时调用 `presentation.complete`，但 UI 没有任何 `presentation.remove`/收起动作，且只渲染 pending/unknown。成功发送或 ack 32 次后，隐藏的 completed entries 仍占满 32 条，后续新副作用操作会被容量拒绝。
- 依据：engineering packet 第 76、78 行要求 completed/明确 none 可显式收起，同时 unknown 继续保留；当前“完成即隐藏”不等于“显式收起”，并破坏有限资源池的可持续使用。
- 建议：在 UI 提供已确认/none 的显式收起并调用 `remove`，或设计等价的 owner API；测试连续超过 32 次 completed/none 后仍可发新消息，同时保持 unknown 不被淘汰。

标准轴因此为 `request-changes`；S2/S3/S4 已闭合，R1/R2 仍需合同级处理。

## 规范轴

Axis: specification  
Result: request-changes  
Observed: 当前源码与 r2 冻结快照一致；以下逐项对照 T10 spec、implementation-contracts、DESIGN、ticket 与 engineering packet。

055 的四项规范问题闭合情况：

- **P1 missing primary freshness：已闭合。** `SpaceService` 维护 `primaryState`（`src/modules/agent/services/spaces/space-service.ts:130-186`）；只有首次确知无 primary/backup 才返回 empty fresh，已有 primary 消失时抛 `EFFECT_UNKNOWN` 并由 `freshInboxPrimary` 返回 `unknown`（`space-service.ts:660-681`）。回归覆盖初始空库与已存在 primary 后删除（`space-service-inbox.test.ts:83-93`）。
- **P2 list/read 正文边界：已闭合。** `listInbox` 只 map `inboxSummary`（`space-service.ts:779-785`），类型为 `InboxMessageSummary[]`；InboxPanel 列表只渲染 ID/source/sequence/ack，Read 后才调用 `readMessage` 并渲染 detail 正文（`InboxPanel.tsx:212-220,311-312`）；060 fixture 也断言列表无正文、Read 后 detail 有正文。
- **P3 完整 payload 核对：已闭合。** `verify` 先要求 fresh primary，再比较 recipient、body、source、references，并区分 `saved`、`verified`、`not-found`、`conflict`、`unknown`（`InboxPanel.tsx:234-258`）。同 ID 不同目标或 payload 不会被宣布 saved，符合 engineering packet 第 89 行。
- **P4 observation 核对结论：部分闭合。** 核对 fresh primary 时，saved/verified 会完成 pending/unknown observation，not-found/conflict/unknown 保留（`InboxPanel.tsx:252-258,314`），因此原先“只按 ID、不收束结论”的问题已修复；但 R2 所述 completed/none 永不从 presentation 池移除，仍违反第 78 行“确认已保存或明确 none 的观察可显式收起”，并最终阻塞新发送。

**R1 — 中高：UI summary 分页没有合同要求的 frozen high-water/generation。**

- 位置：`src/modules/agent/ui/inbox/InboxPanel.tsx:29-55`、`src/modules/agent/ui/workspace/WorkspaceToolbar.tsx:12-31`、`src/modules/agent/services/spaces/space-service.ts:766-787`。
- 证据：每次页请求仅发送 `afterSequence`；SpaceService 每次重新从当前 records 计算 `highWaterSequence`，UI 以 `Math.max` 更新 highWater。两页之间的 append 会扩大本次读取边界，删除/替换没有 generation token 使旧页失效。
- 风险：UI 本地汇总不是第一页冻结的 mailbox snapshot；读到的结果可能跨越变化，无法满足 T10 的 stable pagination、append 留给新刷新、变化使旧页失效合同。CLI ControlPaging 自身有 generation，但 InboxPanel/Toolbar 走的是没有该 fence 的直接 facade。
- 建议：复用 ControlPaging 风格的 owner 内页 token（recipient、highWater、generation）或让 facade 的 list 返回并验证稳定 fence；不能只靠循环 `afterSequence`。

规范轴因此为 `request-changes`；P1–P3 已闭合，P4 因 R2 未完全闭合，R1 是新增合同缺口。

## 产物与验证

已执行只读验证：

- 冻结输入复核：`12c1345793a0947f7ad91a345da490f006299a9c4c6928a2197f41b007c45df5`；54/54 路径无 drift。
- `pnpm exec vitest run src/modules/agent/core/inbox/model.test.ts src/modules/agent/services/spaces/space-service-inbox.test.ts src/modules/agent/services/spaces/space-service-recovery.test.ts src/modules/agent/services/inbox/service.test.ts src/modules/agent/services/inbox/presentation.test.ts src/modules/agent/services/control/inbox.test.ts src/modules/agent/services/control/paging.test.ts src/modules/agent/ui/inbox/InboxPanel.dom.test.tsx src/modules/agent/ui/workspace/WorkspaceToolbar.dom.test.tsx --testTimeout=30000`：exit 0，9 files / 66 tests。
- `pnpm exec tsc -p tsconfig.test.json --noEmit --skipLibCheck`：exit 0。
- 相关源 `eslint`：exit 0。
- `pnpm test:architecture`：exit 0，1253 modules，无 zone/host-package/desktop-only/barrel/cycle violations。
- `node scripts/generate-control-protocol.mjs --check`：exit 0，`control protocol generated bytes match`。
- `node --check scripts/obsidian-acceptance/agent-workbench-panels.mjs`：exit 0。
- 056–060 各自报告的 return validator 均为 exit 0；本报告仍只把它们作为历史修复/验证声明，未替代当前源码审查。

仍未验证且必须如实保留：完整 `pnpm run build`/全仓 lint/Root main.js、styles.css、bundle budget、第三方许可重新生成；真实 Chrome/Obsidian acceptance、Provider、OS IME、五平台 E2E。060 仅 `--prepare-only`，不构成真实宿主通过证据。

## 问题与下一步

当前两轴均为 `request-changes`：

1. 为 InboxPanel/Toolbar 提供真正冻结 high-water/generation 的分页接缝，修复 R1。
2. 为 completed/none observation 提供显式 UI 收起或等价受控移除，修复 R2；增加连续超过 32 次完成操作的容量回归。
3. 修复后重跑 source-files 独立双轴审查，并保留真实 Root build/Chrome/Obsidian 验证为未完成项，直到相应证据存在。

本报告仅为独立审查输出，不修改源、产物、正式状态或 Evidence/Goal/Map/Ticket。

## validate-dispatch return receipt

Command:
`node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs --repo /home/wta/orca/workspaces/obsidian-huhu/terminal --scope-root .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor --session 20261026T045732Z --task 061-t10-final-independent-review-r2 --stage return`

Exit: 0

```json
{
  "errors": [],
  "warnings": [],
  "caveat": "Read-only structure checks do not authenticate tool identity, transcript content, authorization or completion; external histories are never opened."
}
```
