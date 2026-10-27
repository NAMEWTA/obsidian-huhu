# 131 Memory 目录修订号范围修复

Session: 20261025T043239Z
Task: 131-memory-ts-catalog-revision
Status: completed

## 聚焦交接

已修复 Root 在 127 候选中实际发现的 namespaceRevision 漏校验。只在原 Memory positiveDecimals 集合加入该字段，并显式拒绝零；继续由唯一 schema 先拒绝非 canonical 字符串，由 Memory 语义层拒绝超过 SQLite MaxInt64 的值。两份 TS 源码/测试均已冻结，所有命令实际结束并 Wait，无活动进程。候选交回 Root，不改变 T-01/T-14 正式状态；127 原目录保持冻结。

## 产物与验证

- `src/modules/huhubot/core/protocol/method-validation.ts` SHA256 `ee7b25aa3cba3e6a7a968b84691fe0cb741d2b8a05f696a2db627bc119e952b5`。生产增量仅两处：positiveDecimals 增加 namespaceRevision；正 Decimal 范围判定增加 `value === '0'`。现 MemoryPage.namespaceRevision 精确接受 1..9223372036854775807，非 Memory 方法不进入该 hook；schema、API、原 Ajv 选项、72/144 懒编译上限均未改。
- `src/modules/huhubot/core/protocol/memory-validation.test.ts` SHA256 `93a5ac2293deb6feefbc0224e5ba561ef59e5d77ef96da638ffb0be99a7782af`。新增两个公共消费者测试：目录修订号正控与全负例、真实 HapConnection/BotClient + codec 受控 frame。上界正控先成功，随后收到目录修订号0时必须拒绝 INVALID_METHOD_RESULT 并关闭连接；不 mock validator。非 Memory service.status 的普通 Decimal=0 正控保持原有语义。
- [03-catalog-red.log](logs/03-catalog-red.log)：先在 127 原生产实现上执行新测试，actual exit126/Wait。两个测试真实失败，0、MaxInt64+1 和20位字符串均错误通过；frame 测试的 Promise 实际 resolve 了非法 page。空串、负号、小数、前导零、加号、前置空格由既有 schema 拒绝；没有放宽测试迁就实现。
- [05-catalog-green.log](logs/05-catalog-green.log)：`pnpm exec vitest run --project unit` 限定 memory-validation、method-validation、codec、connection 四个文件，**4 files / 75 tests 通过，exit0/Wait**，3.37s。含原73 tests、302共享形状样本及144 lazy cache断言；不是新增302个 tests。检查期间源输入漂移 `[]`。
- [06-test-types.json](logs/06-test-types.json)：`pnpm exec tsc --skipLibCheck -p tsconfig.test.json` exit0/Wait，20.67s，覆盖新测试及导入的生产 MethodValidation/HapConnection，输入漂移 `[]`。本次没有类型/签名变化，未重复运行生产 tsc；127 原双 tsc 仅作为历史事实保留。
- [source-manifest.json](source-manifest.json) 与 [04-final-check-inputs.json](logs/04-final-check-inputs.json) 固定2自有源和1645只读 TS/config/resource 输入，共1647项，tree `a80f3d256e15c9d98036bccd517149893d794aa52b89387b1ab01d840105c3b3`。API仍 `78948204281914149059429b3e0250143e41efa73642d985c2e31e544cfa0a17`，schema仍 `2fd592f7a503004b5b315f0becf1fc1ad9e8266aff46bfc12e2473fe73e3a615`。采用 Map34/35 的独立 TS/Node 输入，不将变化中的 Go 纳入或假称检查过。
- 127 原 artifact-manifest 所列29工件逐项核对，漂移 `[]`；manifest 本身仍 `64edaab2409db60f5e23230f17d37bf02dfff2471a685f9dfb7a1fca7e5cbf4f`。本任务增量 diff 与原生产/测试副本在自有 logs；原 REPORT、日志和 manifest 未改。
- 实际交回校验见 [07-return.json](logs/07-return.json)，仅结构校验，不替代产品测试或 Root 验收。

## 问题与下一步

本范围无遗留失败。未运行 Go、跨语言 harness、生成、全仓 lint/build 或真实宿主；Go同值范围由既有冻结纯合同及 Root 回读确立，本任务没有冒称运行新的 Go 检查。Root/T27后续负责组合门与全插件产物，用户负责真实操作。没有修改公共合同、依赖、UI或正式状态，没有提交、推送或发布；全部自有进程已 Wait，源码/测试继续停写。
