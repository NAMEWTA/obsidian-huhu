Session: 20261026T045732Z
Task: 055-t10-final-independent-review
Status: completed

# T10 最终独立双轴审查

Reviewer: codex:/root/review_t10_final
Input-SHA256: 5e0038ad9eea81a6f9198bd7116fc70a4e428ab2d3d9be6767563b6033b49202
Review mode: source-files
Frozen scope: `evidence/T-10-review-input.json` 的 A17/B19/U14/Root4，共 54 条路径。

## 聚焦交接

本次使用冻结 `review_input` 作为唯一代码输入，重新核对了 54 条路径的当前字节、长度和 SHA-256：`drift_count=0`。未读取或写入范围外源码，未修改代码、生成物、依赖、Git index、正式 Evidence/Goal/Map/Ticket，也未递归派遣。依据回读了 T10 `spec.md`、`implementation-contracts.md`、批准 `DESIGN.md`、`ticket/10-passive-inbox.md`、T10 engineering packet、044–054 实施报告及 AGENTS/dev/ui/testing/code-review 规则。

## 标准轴

Reviewer: codex:/root/review_t10_final  
Axis: standards  
Result: request-changes  
Input-SHA256: 5e0038ad9eea81a6f9198bd7116fc70a4e428ab2d3d9be6767563b6033b49202  
Observed: 当前 54 路径快照与冻结输入完全一致；以下问题均来自该快照。

### S1 — 高：Inbox 列表绕过分页上限，未读数和列表会静默少报

- 位置：`src/modules/agent/services/spaces/space-service.ts:754-767`；`src/modules/agent/ui/inbox/InboxPanel.tsx:132-166`；`src/modules/agent/ui/workspace/WorkspaceToolbar.tsx:25-27`。
- 证据：SpaceService 将调用方的 `limit` 强制截断到 100；UI 和 Toolbar 都请求 `limit: 4096`，随后只对一次返回的 `rows` 求未确认数或渲染列表。邮箱模型允许 4096 条（`src/modules/agent/core/inbox/model.ts:3-15`），但 UI 没有基于 `nextSequence` 的后续页，也没有溢出提示。
- 风险：超过 100 条消息时，列表不完整，铃铛未读数不准确；调用方无法知道还有被截断的历史。与 engineering packet 第 37 行的有界 stable pagination、以及第 91 行的未读数合同不符。
- 建议：让 UI 使用真实 ControlPaging/`afterSequence` 分页并在 high-water 内聚合，或增加明确的 bounded count API；不能把 4096 请求当成已取全量。

### S2 — 高：观察记录诊断按 JS 字符数截断，突破 UTF-8 4 KiB 预算

- 位置：`src/modules/agent/services/inbox/presentation.ts:69-80`；`src/modules/agent/services/inbox/service.ts:48-55`。
- 证据：`patch.diagnostic.slice(0, 4096)` 与 `error.message.slice(0, 4096)` 按 UTF-16 code unit 截断；同一模块以 UTF-8 字节为边界（`model.ts:2-15`），并在 reserve 时按 `presentationDiagnosticBytes: 4096` 预算。4096 个四字节字符可存入约 16 KiB，后续 `encoded(next)` 才会因全局 1 MiB 预算失败。
- 风险：多字节诊断会突破既定边界，令本应保留的 unknown/pending 结果在结算时变为容量异常，破坏有限状态池及错误可回读性。
- 建议：统一使用按 UTF-8 字节上限的截断/摘要函数，并在 reserve、update、complete 共用同一 normalizer。

### S3 — 中：ack 大小常量与 canonical/generated/native 不一致

- 位置：`src/modules/agent/core/inbox/model.ts:3-15,95-98`；`src/shared/native/control-schema.json:38-47`；`src/shared/native/control-wire.generated.ts` 的 descriptor；`native/pty-server/src/control/wire_generated.rs:38`。
- 证据：TypeScript inbox validator 使用 `INBOX_LIMITS.ackBytes = 1024`，canonical schema 与 TS/Rust 生成 descriptor 使用 `messageAckBytes = 256`。`node scripts/generate-control-protocol.mjs --check` 只证明生成文件彼此一致，不能消除业务 core 常量的漂移。
- 风险：宿主 validator 可以接受 native/canonical 认为超限的 ack，或在边界处出现跨层不一致；违反 engineering packet 第 33 行“实际常量/canonical/help/GUI统一”。
- 建议：以同一 canonical 生成值驱动 core validator，或把 ack 上限统一为一个经批准的值并重新生成 TS/Rust/fixtures/help。

### S4 — 中：取消信号没有进入 message.send 的 owner writer

- 位置：`src/modules/agent/services/control/inbox.ts:179-204`；`src/modules/agent/services/inbox/service.ts:60-84`。
- 证据：handler 只在调用 `this.inbox.send` 前检查 `execution.signal.aborted`，随后以无 `AbortSignal` 参数调用；`InboxService.send` 也没有 signal 参数。Router 取消只 dispose prepared command，无法中止或标记这次已经开始的 SpaceService 写入。
- 风险：排队/在途取消与晚到写入之间没有 owner 级别的收束合同，可能返回取消而物理写入仍在继续，难以保证 unknown、一次写入和后续核对的一致性。engineering packet 第 53、76、87 行要求排队取消、旧 epoch 晚到结果与真实 writer 结算可回读。
- 建议：明确 admitted writer 的取消边界；将 signal/epoch 传入唯一 owner 接缝，在取消后按 effect unknown/settled 规则收束，并补生产 owner 的取消/晚写测试。

## 规范轴

Reviewer: codex:/root/review_t10_final  
Axis: specification  
Result: request-changes  
Input-SHA256: 5e0038ad9eea81a6f9198bd7116fc70a4e428ab2d3d9be6767563b6033b49202  
Observed: 当前 54 路径快照与冻结输入完全一致；以下合同冲突未被当前测试消除。

### P1 — 高：缺失 primary 被报告为 authoritative fresh empty

- 位置：`src/modules/agent/services/spaces/space-service.ts:653-670`。
- 证据：`readPrimaryRecords()` 在 storage 不存在时直接返回 `emptyRecords(this.vault)`；`freshInboxPrimary()` 随后无条件返回 `{ freshness: 'fresh', records: ... }`。同一 packet 第 37 行明确规定 unknown write 后旧缓存缺失不能返回权威 not-found；第 62 行也要求 primary 可作为权威邮箱核对必须单独标注 freshness。
- 风险：primary 被删除、尚未回读或 unknown 写入后暂时缺失时，read/verify 会把“当前没有消息”当成新鲜事实，可能掩盖已保存消息并误导核对；这也让 handler `primary()` 在不应继续时继续。
- 建议：区分首次已知空库与曾经有 owner 状态/unknown 后的缺失；无法证明是首次空库时返回 `freshness: unknown`（或明确 unavailable），禁止用空记录回答权威 not-found。

### P2 — 高：InboxPanel 在显式 Read 前直接展示正文

- 位置：`src/modules/agent/services/spaces/space-service.ts:754-767`；`src/modules/agent/ui/inbox/InboxPanel.tsx:259-260`。
- 证据：`listInbox` 返回完整 `InboxMessage`，包括 `body` 与 `references`；UI 行模板在用户点击“读取”前渲染 `{message.body}`。现有 DOM 测试 `src/modules/agent/ui/inbox/InboxPanel.dom.test.tsx:79-84` 也把列表先显示正文作为断言。
- 风险：违反 engineering packet 第 37 行“list 只输出明确标注的有界摘要，read 才返回正文”和第 47、89 行“主动读取/显式核对分别可见”；列表响应/渲染泄露正文，Read 动作不再是正文获取边界。
- 建议：定义不含正文/引用的 summary 行类型；列表只返回 summary，点击 Read 后单独调用 `readMessage` 并在 detail 区展示正文，同时更新测试合同。

### P3 — 高：fresh-primary 核对只按 messageId，未验证完整身份和 payload

- 位置：`src/modules/agent/ui/inbox/InboxPanel.tsx:199-209`。
- 证据：`verify` 读取 fresh primary 后仅执行 `find((row) => row.messageId === observation.messageId)`，找到即 `setSelected(message)`；没有比较 observation 保存的 `recipient/body/source/references`，也没有对同 ID 不同 payload 生成 conflict。engineering packet 第 89 行要求使用完整 `{messageId,recipient,body,source,refs}` 比对；同 ID payload 不同必须是冲突，不能据 ID 存在宣布已保存。
- 风险：恶意或旧记录复用相同业务 ID 时，UI 可能把另一条消息误认为本次 unknown 已保存；目标/正文/引用不一致也被隐藏。
- 建议：按完整身份和 payload 比对，分别显示 verified、not-found、conflict；任何字段不一致都不能转为 saved。

### P4 — 中：显式核对不能收束 observation 生命周期

- 位置：`src/modules/agent/ui/inbox/InboxPanel.tsx:199-209,261`；`src/modules/agent/services/inbox/presentation.ts:69-90`。
- 证据：`verify` 只设置 selected 或错误文字，不调用 observation 的完成/确认/收起 API；pending/unknown 仍一直显示，而 `presentation.remove` 对 pending/unknown 拒绝。packet 第 78、89 行只允许已确认 saved 或明确 none 的观察显式收起，并要求新 leaf 可继续核对。
- 风险：每次未决操作都会永久占用 32 条观察槽；用户即使完成 fresh-primary 核对也无法把结果标成 confirmed/none，最终可阻塞新发送，并且 UI 没有把核对结论与原 attempt 绑定。
- 建议：提供显式 verify result（verified/conflict/not-found/unknown）并只允许在确认 saved 或明确 none 后收束；unknown 继续保留但不应被“已核对成功”的事实卡住。

## 产物与验证

已执行的只读检查：

- 冻结输入复核：`input_sha256` 字段与 `review_input` 的 JSON SHA-256 为 `5e0038ad9eea81a6f9198bd7116fc70a4e428ab2d3d9be6767563b6033b49202`；54/54 路径当前字节和 SHA-256 匹配，`drift_count=0`。
- `node scripts/generate-control-protocol.mjs --check`：退出码 0；这只证明 canonical TS/Rust 生成物彼此未漂移，不能覆盖 S3 的 core 常量漂移。
- `pnpm exec vitest run src/modules/agent/core/inbox/model.test.ts src/modules/agent/services/spaces/space-service-inbox.test.ts src/modules/agent/services/inbox/service.test.ts src/modules/agent/services/control/inbox.test.ts src/modules/agent/services/control/paging.test.ts --testTimeout=30000`：退出码 0，5 files / 17 tests。

未验证项必须保持未验证，不能写成 pass：本次未运行完整 `pnpm run build`、`pnpm run lint`、完整测试套件、Root main.js/styles.css/bundle-budget/THIRD-PARTY-NOTICES 的重新生成或预算校验；044–054 中没有真实 Obsidian host、Provider、OS IME 或五平台结果。053/054 仅为 Chrome fixture prepare-only，未形成真实 Chrome/Obsidian E2E 通过证据。`T-10-engineering-packet.md:53,97,99` 将这些列为最终闭包/待用户环境验证，因此两轴均不能因已有 focused tests 或 generator check 标记 pass。

## 问题与下一步

标准轴和规范轴均为 `request-changes`。在重新审查前，至少需要：

1. 修正 P1 的 missing-primary freshness 边界和 P2 的 list/read 正文边界。
2. 修正 P3 的完整 payload/recipient 核对与 P4 的 observation 结算路径。
3. 统一 S2 的 UTF-8 截断、S3 的 ack canonical 常量，并明确 S4 的取消与晚写 owner 合同。
4. 以真实分页或 count API 修正 S1，并新增对应边界测试。
5. Root 完成适用 build/lint/预算/许可回验；保存真实 Chrome 生产路径证据后，再由未参与实现的 reviewer 复核两轴。

本报告仅为独立审查输出，不推进 T10 状态，不写 formal Evidence/Goal/Map/Ticket。

## validate-dispatch return receipt

Command:
`node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs --repo /home/wta/orca/workspaces/obsidian-huhu/terminal --scope-root .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor --session 20261026T045732Z --task 055-t10-final-independent-review --stage return`

Exit: 0

```json
{
  "errors": [],
  "warnings": [],
  "caveat": "Read-only structure checks do not authenticate tool identity, transcript content, authorization or completion; external histories are never opened."
}
```
