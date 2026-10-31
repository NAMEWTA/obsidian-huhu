Session: 20261025T043239Z
Task: 158-global-memory-contract
Status: completed

## 聚焦交接

本次交付 [全局记忆内部接缝合同](global-memory-contract.md)。T-15 仍为 `ready`、`blocked_by: [T-14]`、`owner: unassigned`；158 仅是下一票实施前的只读准备，不代表 T-14 共同门已关闭或 T-15 已激活。产品、正式状态、Ticket/Map/Spec、Go/TS/schema/生成物均未修改。

选择分离对象能力：可信本机 stdio owner 命令入口持有现有 `api.GlobalMemoryAPI`，模型 Broker 只持窄 `GlobalToolProposer`。比较了单服务加不可序列化 action token 的方案；后者需跨层携带另一项权限事实，更易错接。`RequestIdentity.ManagedOwner`、相同 principal、JSON role 或 prompt 都不构成用户确认。现有 `hap.Router` 通过 `stdio.New` 构造，`GlobalMemory` 仍 nil，两个 HAP 方法是 `METHOD_NOT_AVAILABLE`；合同给出 owner 构造器、Core/Broker/common 的明确接线位置与 Go 签名建议。

工具准入链也已逐层核实：当前 `domain/assistant.ValidateDraft` 未枚举受支持工具，common registry 对未知 AllowedTools 静默忽略；temporary snapshot 的 AllowedTools 已由 `CanonicalTaskConfigHash` 固定且 SQLite 会核 Sponsor 子集。合同要求补严格目录、AgentDraft/旧配置/Bind 检查、Broker definition digest、common registry/schema/CP digest、三 SDK 实际调用与结果投影，并证明 resolve 在模型路由不可达。

数据方案是复用 014 的 global namespace/items/revisions/bodies/index/dependencies，015 只存 proposal 固定预览、expiry、CAS、终态和回执关联，由 T-01 注册实际 schema version 11。globalmemory 不复制 Memory 事实写入/来源资格 SQL：Memory Store 暴露 `WithGlobalTx` 加三个窄事实 Tx 方法；propose/resolve/receipt 共用该一次事务和原 Grant 读门。proposal 物理正文须单独 `memory_proposal` delivery subject 及 T-04 同 Tx reader，不能误标已确认 `memory_revision`。global/private 联合召回共 20 条/131072 bytes，保留真实每条 namespace 和恢复重新资格。

## 产物与验证

- 合同：`global-memory-contract.md`；逐段覆盖可信入口比较、严格工具草案、模型真实 claim/来源绑定、三事务路径、Get/List/physical delivery、联合召回、精确 owner 写集和差异验收矩阵。
- 源码依据：`sources.json` 记录实际读取的资料/源码及 SHA-256；交接工件由 `manifest.json` 固定。关键当前定位：`application/api/memory.go` 的两个 DTO/GlobalMemoryAPI 和未装配结果验证；`hap/memory.go` 的两方法硬拒；`bootstrap/core.go` 的 `GlobalMemory` 空位；`tooling/broker/service.go` 的 pinned allowed 门；`sqlite/memory/store.go` 的事务/读门；`memory/context_plan.go` 的私有单库召回；`sqlite/events/store.go` 的现有物理 subjects；`migrations/embed.go` 的 CurrentVersion 10。
- 只读准备不运行 Go、DB、CLI、generator、产品 Node 或构建；未做 T-15 功能验证。唯一执行的是 158 交接结构校验 `validate-dispatch --stage return`，实际回执见 `logs/return.json`。

## 问题与下一步

当前无需新增用户决定。Root 待 T-14 共同门后按合同协调 T-15/T-14/T-01/T-05/T-04/Engine 的共享写集与唯一检查窗口。实施时必须用真实 Memory checker 验证 global scope、proposal cursor/大小及来源撤销后 delete 的安全 stub；这些是可证伪的实现接缝，不能用本报告替代测试或把局部结果记为 AC-020/022 完成。
