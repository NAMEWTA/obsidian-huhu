# 长历史祖先计算：143 作者交回

Session: 20261025T043239Z
Task: 143-memory-history-performance
Status: completed

## 聚焦交接

已修复本次真实单 Session 长历史消费者暴露的 Memory 祖先集合计算瓶颈。唯一生产改动为 `native/huhubot/internal/adapters/outbound/sqlite/memory/dependencies.go`；没有更改 events 消费者、50 Run 负载、3 秒等待、100 条 History、250ms 投递门或共享 owner 源码。原目标由构造阶段实际超时变为完整 History/HAP 成功；800 条真实来源消息与当前撤权正控也通过。此为 143 作者候选完成，T14 共同回归、独立审查及正式票状态仍由 Root 验收。

可证伪的诊断链如下：

1. Root 完整回归原始事实是 `history_test.go:298: sqlite3: interrupted`、该目标约 34.05 秒失败；当时还在构造 Run，不能据此声称 250ms 投递超时。原 417 输入与 `/tmp/huhu-lead-memory-regression-r1-cp7q1xak` 不改写。
2. 当前精确原目标首次单跑仍失败：同一构造调用处 `context deadline exceeded`，包 32.766 秒、整个命令 Wait 33.913926973 秒。没有依赖全仓负载才能复现，不能按夹具误差处置。第二次仅附 CPU profile，仍在同处失败，包 33.916 秒、Wait 35.645996389 秒。两次均保留完整输入、首次输出和退出 1。
3. CPU profile 的 47.65 秒采样中，`memory.loadGraph` 累计 20.82 秒（43.69%）、`mergeRefs` 21.22 秒（44.53%）、排序 11.52 秒；这些累计值相互包含，不能相加。实际调用栈位于 `PrepareAndMarkRunning` 的 Plan/Seal 事务。原 `loadGraph` 每读一条关系便重建、重校验、排序该 owner 的全部前缀，DFS 又在每节点重建并排序整个累计闭包；长历史持久的是共享、稠密的完整祖先关系，触发重复工作和分配。`base.Store` 同一连接上限为 1，GetRun 也经 WithinTx，故昂贵事务令 3 秒终态轮询预算耗尽。CPU 栈、只读连接/调用源码和单变量红绿支持这一根因；没有把错误字面等同于 SQLite 损坏，也没有改数据库错误处理。
4. 只替换祖先累加机制后，原目标完成 50 个实际 Facade Run、100 条来源消息、真实 HAP History writer；投递门 34.284885ms。该对照没有改公共 API、测试或负载，不是重跑至绿。

最小实现使用私有 `refSet` 在遍历中累加精确身份，只在每个 owner 的完整结果和最终闭包处排序一次。每条关系仍校验合法 Ref，同 Kind/ID 的不一致 Revision/hash/namespace/thread 仍拒绝；每个关系集合和消费闭包保留 128 条上限，DFS 三色循环拒绝与 `relation!='audit'` 查询保持。结果仍是稳定排序的非 nil 数组，错误不转空成功。权限、正文前置资格、Scope、当前 Grant、抑制、Pin、恢复水位、事务边界和 SQL 查询未改。

改动前 SHA 为 `694bdf035a0d43f391724916aea1c2045286cfe4c07205196cec3395ab92d526`，改动后为 `2fdae080990d702d2d8cc41ec3e2d5487985c1821d28fd87b06a1b0875c75d0e`。完整旧字节和逐行差异见 [原文件](logs/05-dependencies-before.go.txt) 与 [最小 patch](logs/05-dependencies.patch)。新代码没有 import、build tag、embed、模块或迁移变化；不新增或复制外部实现。

## 产物与验证

实际执行绝对路径 Go1.26.10，版本输出为 `go version go1.26.10 linux/amd64`。环境固定 `GOTOOLCHAIN=local`、`GOWORK=off`、`GOEXPERIMENT=`、`GOFLAGS=-mod=readonly`、`GOPROXY=off`、`CGO_ENABLED=0`。所有测试串行、count=1、p=1；没有扩展全模块 normal、race、vet 或 Node 产品检查。

先执行 `go list -deps -test -json ./tests/contract/events`，实际 484 包、199 个仓库编译/embed/锁输入，只有 events 六个测试文件；144/145 并行测试写集交集为空。后续 Memory 两消费者另查实际闭包：483 包、202 个仓库输入，只有 private-memory 测试；交集仍为空。记录的是编译器选中 Go/asm/embed 文件与 go.mod/sum，依赖包自身未编译的 TestGoFiles 不混入；完整 Go list 保留 module/toolchain 路径事实。未运行的 TS 消费者虽然在 events 测试包编译中，其外部 Node/TS 运行时未被本次精确目标触发。

| 实际命令目标/阶段 | exit / 整个命令 Wait | 包时间与实际结果 | 原始证据 |
| --- | --- | --- | --- |
| 原 `TestSingleSessionHundredSourceMessagesReachActualHistoryWriter` | 1 / 33.913926973s | 32.766s；构造阶段 deadline，未到 History | [03 result](logs/03-original-result.json)、[JSONL](logs/03-original.jsonl) |
| 同目标仅附 CPU profile | 1 / 35.645996389s | 33.916s；相同构造失败；采样覆盖原代码 | [04 result](logs/04-profile-result.json)、[CPU 原数据](logs/04-cpu.pprof)、[累计剖析](logs/04-pprof-cum.txt) |
| 最小修复后的原 50 Run 目标 | 0 / 25.312862995s | 23.320s；100 条 History 物理 HAP 投递，gate 34.284885ms < 250ms | [06 result](logs/06-set-accumulation-result.json)、[JSONL](logs/06-set-accumulation.jsonl) |
| `TestEightHundredActualSourceMessagesFitGateAndRecheckRevocation` | 0 / 18.077942915s | 16.862s；400 个独立 Session 的真实 Run/800 来源消息，gate 41.114962ms；下一事务撤权拒绝 | [07 result](logs/07-actual-800-source-result.json)、[JSONL](logs/07-actual-800-source.jsonl) |
| 两个既有完整祖先消费者 | 0 / 1.903757914s | 0.473s；2 top / 6 sub 全绿 | [09 result](logs/09-ancestry-contracts-result.json)、[JSONL](logs/09-ancestry-contracts.jsonl) |

最后两目标精确为 `TestPrivateMemoryRejectsBrokenCompleteAncestryWithoutReturningBody` 和 `TestPrivateMemoryCompleteConsumptionClosureHasAnExact128ReferenceBoundary`。覆盖坏 JSON/null、缺关系/祖先、循环、同身份矛盾、合法 128 与 129 拒绝，保留正文不返回和持久记录不被修补的断言。复用已有有意义的永久消费者，没有新增只镜像 refSet 实现的测试。

5 次测试的各次输入均无漂移；5 个不可变 ZIP 已逐文件重验，共含 199/199/199/199/202 个输入。前两轮树 `eccf7d88c2021a4931d9aab937aca24f7b7b29c5eb688dfc24ce28c2035b7779`；修复后 events 树 `7c0144eaff0718705203428753d87a4337e88103d253ab1e751d2fdac7135ebb`；Memory 对照树 `10d00861695b4a8d834bbd12ba56a270937fcbb3d24279b2352d7b89e6db083f`。实际模式、文件 SHA、ZIP SHA 与校验见各 `*-inputs.json` 和 [ZIP 复核](logs/11-archive-verification.json)，不可把前两轮红的字节冒称当前候选。

最终 [源码冻结](logs/10-final-source.json) 对原126全部30源复核，仅上述1文件改变，树为 `1840f4fbc3e3a8c13a4509147e43afd25f2e4033c72aa0830fcc9fd0b617b872`。events/history_test.go 的 `a4630d640d8630fde6a8c5e0ef055a317ddbbf2f9637b05d700edbcd20083c9a` 及模块锁与首次原目标一致；014与其余29源保持原126字节，旧126 REPORT/manifest/return不动。所有 Go/test/Core/HTTP 资源已实际结束，已向 Root 明确归窗；此后只写本任务报告材料。

## 问题与下一步

本窄反例与对应安全回归已闭合，没有待跨 owner 修复请求。Root 继续在共同稳定候选上做受影响完整回归与独立审查；本报告不替代其共同门，也不把 144/145 的并行测试维护算作本任务改动或输入漂移。

800 条正控使用真实 MemoryFactsReader 和真实来源/当前 Grant，测试的是跨多个 Session 收集的投递 subject 上界；它不声称单个跨 Session HAP History 请求，也未覆盖 800 个混合 run/message/context_entry/revision/candidate 且每项拥有最大128深度祖先的组合。本次 50 Run 消费者已经覆盖实际同会话稠密来源；如后续风险要求最大混合 subject，可用真实 Store 和持久记录另补窄消费者，不能拿138 fake Facts或本次800浅图冒充。未为这项未执行组合扩展当前检查。

性能数字仅代表本地固定输入和当前机器，未做普适 SLA 宣称，也没有为进一步压低整体23秒而扩大批处理/跨事务缓存机制。真实模型、Obsidian、目标 OS 和用户现场由用户后验，未访问凭证。最终 Return 只验证交接结构，实际行为证据来自上述原日志与快照。
