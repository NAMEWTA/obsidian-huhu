# Map32：记忆授权、传播、物理投递与维护账户族

Map31的125/126/127写集与检查窗保持。126实际指出MemoryFacts/当前授权与维护预算签名是其本域实现的直接依赖；Root回读grants/access.go、delivery.go、usage/store.go、usage/messages.go、events/store.go及collaboration/groups消费者后，为原credential_provider打开T04/T05/T11/T12/T13的115/123最小接缝。原代码门/历史失败均保留，新增维护共同验收，不改变DAG或28票55AC。

128先声明grants adapter唯一MemorySubject/Witness/Requirement/Facts/Reader（含context_entry）及同门CheckMemoryInTx，usage唯一AttemptBinding/Eligibility/ReadAttemptBinding签名。稳定后与126共享，不复制T14持久事实和SQL表writer。实际消费依014/126及T03装配，未装配不能假通过。

后续仅128 TASK列明原路径：T05 current事实在无Source快返前、真实读取/接收方/原Grant与group范围；T04新subject显式分类与原800/250ms fence；T11/T13真实返回/投递正文继承memory revision及完整祖先，保普通用户原文和合法已公开历史；T12 job→Run可信绑定maintenance账户族，summary/retry不能借root，Reserve/Dispatch每次当前校验而已发Settle必须完成。没有新模型工具、worker、权限或Sponsor默认继承。

原foundation_go后续负责Core/014注册/T03同UoW/配置pin/Inspector/恢复水位，原engine_adapter负责共同模型块；本窗口不转移其路径。125独占Go/产品检查中，128初始只读，不与冻结检查并写；后续写/检查须Root实际消息，固定Go1.26.10只读锁。全部阶段不索凭证，不提交推送发布归档，真实现场用户后验。
