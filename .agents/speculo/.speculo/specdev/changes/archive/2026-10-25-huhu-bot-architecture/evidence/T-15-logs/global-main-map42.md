# Map42 / Goal41 全局提案与用户确认

163 foundation_api_repair接原160后继，T15主业务及T01当前入口，当前仅source-only；唯一起始例外为api+stdlib的metadata-only delete严格结果红/绿，实际闭包不变才可运行。161原Memory、162原Events/Grants在其受控独立写集；它们不做Go/DB。

163写集：application/memory/global/**、domain/memory/global/**（只实际所需纯规则）、adapters/outbound/sqlite/globalmemory/**、migrations/015-global-memory.sql、tests/contract/global-memory/**；原T01 api/memory.go与global_memory_test.go仅delete stub、inbound/hap/memory.go/router.go与新增global_memory_test.go、inbound/stdio/server.go与新增global_memory_test.go、cmd/huhubot/main.go、bootstrap/core.go、migrations/embed.go、新foundation/global_memory*.go及两个旧schema预期测试memory_runtime_test.go/groups_migration_test.go。公共generator/contracts及其原生成输出可必要维护，仅真实装配后的两个global implemented flags与正确新结果夹具；其余无关方法和shape保持。

014旧DDL、Memory事实、Events/Grants、Broker/common/三SDK、TS手写验证和锁文件/产物只读；跨owner缺口给Root，不能绕开writer。T06/T08及TS接线另派原owner。T01 Core可消费已准确约定的新port，但尚未存在的实现必须列为组合待验，不能以接口编译冒称运行闭环。

163先修已确认的pending delete metadata-only形状：只有delete可Body nil，仍要求scope/targetRevision/previewHash/expiry/id/revision；create/update与终态/混合负载严格性保持。该形状不赋予model权限；161只让可信owner沿实际目标元数据重提，tool须全源检查。

015使用schema11及原唯一receipt账本，proposal不写014事实/不增加global item catalog，确认在Memory-owned同Tx中Apply事实+CASproposal+receipt；Get/List/queued physical reader同Tx当前资格。普通和managedstdio明确owner能力，泛用Router/模型proposer无Resolve。完整目标/现场后验边界保持。
