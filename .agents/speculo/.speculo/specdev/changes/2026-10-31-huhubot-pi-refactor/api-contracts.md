# 公共 API 与事件合同（拟议，不是现有 SDK API）

## 1. BotClient 外壳

沿用 Issue §9 的 command/query/subscribe。DTO 不导出 Pi 类型，也不跨进程传函数、App、DOM、React/Zustand store。内部方法名在 T-02/T-04 通过现有 service contract 精化；以下为必须保留的行为，不是本轮生成的生产代码。

| 操作族 | 关键前置与结果 |
|---|---|
| bot.create/update/archive、team.membership | 配置 revision；临时 Agent 不通过永久 CRUD 偷建；移除成员不撤回已发生效果 |
| conversation.new/rename/archive | 稳定 conversationId；会话归档不是删除 Pi 文件 |
| message.send/steer/followup | input snapshot + branch + 来源授权；返回受理回执，而非工具完成 |
| session.fork/select | 通过 SDK，串行；切换期间新请求排队/拒绝，不能混写兄弟分支 |
| run.cancelTree / retry | 取消意图幂等；retry 建新 attempt；先核对 unknown effects |
| approval.decide | expectedRevision、previewHash；审批主体来自连接；单次消费 |
| delegation.create / question.answer / result.review | 缩减的上下文/能力，Mailbox 与根审查明确分开 |
| memory.confirm/edit/forget | 事实 revision、来源、scope；forget 创建阻止重学的 tombstone |
| data.export/backup/inspect/rebuildIndex | 分开控制与派生数据；备份/导出走安全脱敏与用户选择 |

## 2. 身份与幂等

连接建立可信 principal、vault/device、clientId、generation 和允许 scope。请求体中的 principalId 仅可为目标引用，不是认证凭据。MCP 外部主体使用独立 grant；本机 loopback 不等于可信。

写命令携带 commandId、idempotencyKey、expectedRevision、generation；事务中按 principal+operation scope+idempotencyKey 去重并绑定规范化输入 hash。相同键相同输入返回原 receipt；同键不同输入返回 IDEMPOTENCY_CONFLICT，不重新执行。生成受理回执前必须落盘 command/run/outbox。

跨进程大整数以十进制字符串/明确安全整数域传输，禁止 SQLite 64-bit seq 到 JS number 发生静默精度损失。货币值注明 currency、最小单位与 priceVersion，不用浮点累加。

## 3. 查询与订阅

列表游标不混用事件游标。query 返回 snapshotRevision、headSeq 与限定 scope 的对象；订阅回放从同一个一致性边界继续，避免 snapshot 与 live event 间漏事件。

EventEnvelope 必须有 schemaVersion、eventId、seq、occurredAt、generation、entityId/revision、conversationId、runId/attemptId（适用时）、type 与 typed payload。owner generation 变化立即 reset/resync。消费者按 eventId 去重和实体 revision 拒绝倒退。

| 类别 | 落盘/背压 | 对 UI 的要求 |
|---|---|---|
| text delta | 可合并，允许被快照取代 | 更新单消息局部，不全树重建；中断后查快照 |
| accepted/approval/effect/error/terminal | state+outbox 持久化，禁止无声丢弃 | 有序应用；gap 必须可见并自动受控 resync |
| health/index progress | 可合并的最新状态 | 降级原因持续显示，不能污染 transcript |
| mailbox receipt | 幂等持久化、目标授权过滤 | 区分投递、消费与根验收 |

队列达到上限时停止无界累计并发送 gap/resyncRequired；关键事件仍能通过持久查询补齐。调用方关闭 view 只 unsubscribe，不 cancelRun；网络/IPC 断连也不能被推定为取消外部副作用。

## 4. 错误语义

稳定 code 至少覆盖 INVALID_ARGUMENT、CONFLICT、SESSION_BUSY、CAPABILITY_DENIED、APPROVAL_EXPIRED、SOURCE_CHANGED、UNSAVED_EDITOR_CHANGES、HOST_UNAVAILABLE、RESOURCE_LIMIT、UNKNOWN_EFFECT、RECOVERY_BLOCKED、INSTANCE_CONFLICT、PROTOCOL_INCOMPATIBLE、CURSOR_EXPIRED。名称最终归新 API owner，不要求兼容旧 HAP numeric codes。

retryable 必须依赖效果 owner 的证明，不以 timeout 一律 true；reason 为可本地化稳定含义，details 只含安全数据。返回 correlationId 供诊断；不得在错误栈中泄漏 authorization header、外部 token、vault 私密正文。

## 5. 最小垂直协议夹具

同一 session 并发 send 应产生两个串行 attempt 或可解释 busy；跨 session auth profile 不串。先收 terminal 再重复 command 应重放同一个持久 outcome。丢弃一段 delta 后用 snapshot 重建一致文本。旧 generation 的 tool receipt 被拒但保留脱敏诊断供对账；不能把未知效果误当没发生。恶意请求自报管理员 principal、任意 toolId/revision、越界 SourceRef 全部在执行前拒绝。
