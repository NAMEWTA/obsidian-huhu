# Change-local 领域语言

本文件属于本 change，不写入永久 context。来源为 Issue #39 §2、§8–§12。

| 术语 | 唯一语义与 owner |
|---|---|
| BotProfile | 持久角色与配置；不是进程，也不是某一次 Pi 会话 |
| TemporaryAgent | 某项委派的配置快照；不自动加入持久 Bot 列表 |
| Conversation | 用户看到的会话/群组；可映射多个独立执行 session |
| PiSession / SessionBranch | Pi JSONL 与 entry ancestry；由 SDK 唯一写入 |
| Run / Attempt | 用户工作与一次执行；重试开新 attempt，不改旧终态 |
| Delegation | 父工作给子工作的目标/验收/缩减授权；不是共享全部上下文 |
| MailboxEnvelope | 可持久化投递；投递、消费、执行结果、根验收是不同事实 |
| RunPlan | 工作解释与步骤；不是用户 Todo 的第二真相 |
| Artifact | 可回读交付物及来源；不能用任意回答文本冒充已提交效果 |
| EffectReceipt | 所属业务 owner 对外部效果的回执；超时缺回执不能推定没发生 |
| unknown_effect | 已可能执行但结果无法确定；隔离、核对，不自动重放 |
| Grant | 对 principal、接收方、来源、操作与期限的授权；模型文本不能创建 |
| Approval | 对规范化参数/版本/范围/接收方的单次用户批准；修改则失效 |
| BudgetReservation | 根预算账户内的原子预留；子任务不拥有一份复制的全额预算 |
| SourceRef | 来源身份/版本/哈希/范围；不是永远有效的裸路径 |
| CatalogSnapshot | attempt 使用的工具/Skill/MCP 版本集合；稳定说明不取消 live lease 重验 |
| Generation | runtime owner 代际；旧 writer/客户端迟到结果不能写新控制状态 |
| ComposerQueue | UI 待发送草稿与输入意图；与运行树分开 |
| state.sqlite | 权威控制与确认事实，不可因“重建索引”删除 |
| index.sqlite | 可丢弃派生检索；重建仍按权限过滤和 tombstone 排除 |

成功定义：可观察业务结果+回执+授权有效+必要根审查。Run 的 cancelled/failed 不撤销已确认外部效果；结果与效果账本分别展示。Future Web、自动化或 MCP 仅是入口，不拥有第二份执行真相。
