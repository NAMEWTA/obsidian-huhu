# 053 原 T05 精确维护补充

2026-10-25，Root 已通过原生 send_message 向 053 和 052 通知。冻结 TASK 不变；当前 Map14/Goal13、LOG075，用户全实现和代码验证授权保持。

T05 原 writable_paths 已包含 native/huhubot/internal/domain/access/grants/**，本补充在该既有 owner 范围内开放唯一文件 native/huhubot/internal/domain/access/grants/policy.go，由 /root/credential_provider 独占写入。只给 Recipient 增加 SubjectKind、SponsorAgentID、ConfigurationHash 三个 string，既有 exact== 与授权规则、期限不变；自有 application/adapter 转换完整保留 typed 字段，防止模板与普通接收方混淆。052 只读此文件，公共 API/schema 仍由 052 独占。

该补充不是新产品范围、DAG、额外执行者或领域所有权转移。原 TASK 其余验收、停止/返回规则保持；产物及测试计入同一 053 REPORT/固定候选，尚未验收通过。

052 随后提出公开用户摘要入口，Root 实际消息同意 collaboration.configurationHash(ProfileID, TaskConfigDraft)→configurationHash。053 在既有 collaboration/delegate 应用范围做输入校验和纯摘要返回；052 维护唯一公共合同与路由，054 维护两个精确纯 TS 算法/黄金向量文件。该查询不建状态、不读取秘密、不调用模型、不授予权限；真正 Delegate 的 DB Snapshot proof 保持。具体分工见同 session 的 052 ROOT-ADDENDUM-01.md。

LOG076 记录 Root 实际确认的预算方案：在原 T12 路径实现 collaboration.budget/configureBudget 的纯应用/SQLite policy 消费者，model_budget_policy 由原 012 未发布迁移维护，052 唯一公共合同与路由。用户 CommandMeta+CAS 配置，模型 ToolExecution 不得配置；重开保持、未配置/暂停零新出站、已 charged/reserved 不因配置清零、下调与在途结算分别验证。T20/T23 后续消费同一公开接口，仍无新写集或 DAG。
