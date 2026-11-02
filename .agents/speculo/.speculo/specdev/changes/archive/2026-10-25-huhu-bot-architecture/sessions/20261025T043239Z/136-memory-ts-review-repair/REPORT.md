# 136 context 页预算与来源 epoch 修复

Session: 20261025T043239Z
Task: 136-memory-ts-review-repair
Status: completed

## 聚焦交接

已修复 F-133-02：移除 context entry 上误加的普通 MemoryObject 245760-byte 限制，保留 context.get 整个方法返回包裹 262144、文本片段4096和原有结构/来源/Unicode/分页门。并补 F-133-01 同族的 TS hostLeaseEpoch 遗漏，Memory 嵌套来源只接受 canonical 1..MaxInt64。只改原两个 TS 文件；公共合同、Go、131/133旧报告未动。源码与测试已停写，全部自有进程实际结束并 Wait，候选交回 Root 进行新输入独立复审；不自行改正式状态。

## 产物与验证

- `src/modules/huhubot/core/protocol/method-validation.ts` SHA256 `9c4f6354b825bee18a05f4d7f744b19a62d7aaa78d1aa76e442806dfceb16580`：生产增量只有 positiveDecimals 增加 hostLeaseEpoch，以及删除 memoryContext 内的单 entry 编码预算判定。普通 MemoryObject/params 245760、MemoryPage 整包262144且逐MemoryObject245760、context.get整包262144、text4096及 Go decoded json.Marshal 编码计数均不变；72方法/144懒编译上限不变。
- `src/modules/huhubot/core/protocol/memory-validation.test.ts` SHA256 `306a67568a77879178210421435ec8e2518eba6bd7cdba5ed00512f99fbd2706`：新增4个永久测试。3个完全重建133公开向量，固定3×32合法ScopeResourceIDs、Go HTML转义及精确字节；每个先以唯一schema证明结构合法，再调用生产MethodValidation及真实BotClient/HapConnection/codec受控帧，不mock validator。另1个循环覆盖SourceSnapshot/SourceScope/Context.SourceRefs的epoch正反控，保留合法零usage和非Memory schema语义。
- [03-review-repair-red.log](logs/03-review-repair-red.log)：在131冻结生产字节上先跑4个新测试，actual exit126/Wait，2 failed/2 passed，输入漂移`[]`。249642-byte合法页在MethodValidation被拒、真实BotClient遭INVALID_METHOD_RESULT/closed；0、MaxInt64+1和20位epoch在三个Memory位置均误放行。epoch1/Max、前导零拒绝、低预算和整体超限控制均按预期。
- [05-review-repair-green.log](logs/05-review-repair-green.log)：直接调用已安装Vitest，限定memory-validation/method-validation/codec/connection四文件，**4 files / 79 tests 全通过，actual exit0/Wait，3.75s，输入漂移`[]`**。这是原75+4 tests，包含原302共享shape样本及namespaceRevision、144 cache、普通object/page精确边界；没有修改原样本/断言以迁就实现。

| 永久真实帧控制 | entry bytes | 整个context.get bytes | 修复后观察 |
|---|---:|---:|---|
| 原低预算正控 | 243683 | 243882 | resolve，ready |
| F-133-02合法反例 | 249443 | 249642 | resolve，ready |
| 原整包超额反控 | 266723 | 266922 | INVALID_METHOD_RESULT，closed |

- 三控制的SourceID最大分别424/434/464 UTF8 bytes，均≤512；值前后深比较保持不变，每次finally close。此为生产TS客户端与受控wire对端的真实消费，不是实际SQL/Vault producer执行；没有超限值偷偷转成功或提高整页预算。
- hostLeaseEpoch正控1与9223372036854775807，反控0/01/9223372036854775808/20位数字；MemoryBody的SourceRefs、SourceScopes及context标签全部覆盖。非Memory host.read的原schema仍允许0形状，**这不是Host当前授权通过的证明**；MemoryJob的inputTokens/outputTokens=`"0"`继续合法。131目录修订号回归保持。
- 06-test-types.json（历史日志已清理：`logs/06-test-types.json`）：`node node_modules/typescript/bin/tsc --skipLibCheck -p tsconfig.test.json` actual exit0/Wait，24.55s，输入漂移`[]`，覆盖新增测试和导入的真实生产消费者。本次没有签名/类型变化，不重复运行不变生产tsc。测试和格式化直接使用已安装Node工具，没有安装、改锁或绕过TTY进行自动安装。
- [source-manifest.json](source-manifest.json)固定2自有源、1645只读TS/config/resource输入，共1647，tree `06b63507ff30514d1c89c3cc066bcf730bee6fdfad53eee5c199096bf7c8718b`；各检查与最终核对漂移`[]`。API仍`78948204281914149059429b3e0250143e41efa73642d985c2e31e544cfa0a17`，schema仍`2fd592f7a503004b5b315f0becf1fc1ad9e8266aff46bfc12e2473fe73e3a615`。独立Node闭包不读取/执行当前Go writer的输出。
- 133 REPORT、10探针与原预算结果仅只读，SHA记在01-baseline-inputs.json（历史日志已清理：`logs/01-baseline-inputs.json`），最终漂移`[]`；其三预算摘要另存01-review-budget-observations.json（历史日志已清理：`logs/01-review-budget-observations.json`）。127原29工件、131原18工件逐SHA核对均未变，各原artifact-manifest本身未变。原始136基线、最终增量diff与红绿日志仅写自有目录；没有改133审查结论。
- 实际return结构校验见07-return.json（历史日志已清理：`logs/07-return.json`），不代替行为验证或Root复审。

## 问题与下一步

本切片无未解决失败，全部进程已Wait，无活动进程，两个TS文件继续停写。Go nested typed UTF8/来源输出门由135负责，本任务仅修其明确TS同族遗漏，不冒称已修或验证整项Go F-133-01。未跑Go、生成、混合CLI、SQL/Vault端到端、全插件lint/build或真实Provider/Obsidian/目标OS；组合检查由Root/T27排窗，真实操作由用户后验。不索凭证，不提交、推送、发布、归档或改正式状态。
