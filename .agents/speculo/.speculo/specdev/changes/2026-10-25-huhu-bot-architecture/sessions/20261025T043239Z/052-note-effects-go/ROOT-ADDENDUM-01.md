# 052 临时配置摘要公共消费者补充

Root 已通过原生消息通知 052/053/054；冻结 TASK 保持，Map14/Goal13 和原 T01 writable_paths 不变。

公开只读 collaboration.configurationHash(ProfileID, TaskConfigDraft) 返回 configurationHash，作为显式 Grant 创建的用户消费者。052 唯一维护 DTO/schema/API/路由，053 在已分配的 collaboration/delegate 应用范围内校验并返回 CanonicalTaskConfigHash；054 唯一写 src/modules/huhubot/core/protocol/task-config-hash.ts 及 task-config-hash.test.ts，独立纯 TS v1 编码/摘要与 Go/TS 黄金向量。两文件在原 T01 core/protocol/** 可写范围内，与 052 的 API 文件互不重叠。

查询不创建临时主体、不持久化、不访问秘密值或 Provider、不执行模型、不赋予权限。真正 Delegate 仍须从持久 TaskConfigSnapshot 建立受信证明。T23 使用公开 client 方法，不另建 hasher facade 或配置准备表。完整字段/字节顺序/默认值由 052 唯一冻结并交给消费者；最终报告回读实际摘要，当前尚未验收。

LOG076 补充实际预算用户消费者：052 唯一维护 collaboration.budget/configureBudget DTO/schema/路由，以及 hello/status/根快照的真实生效值；053 负责原 T12 policy 用例和持久化。CAS/用户门/重开保持，配置不重置已消费或预留额度，暂停阻新出站而不抹在途费用；明确未配置，不能填无限值补洞。054 已被通知总方法数尚未最终冻结。
