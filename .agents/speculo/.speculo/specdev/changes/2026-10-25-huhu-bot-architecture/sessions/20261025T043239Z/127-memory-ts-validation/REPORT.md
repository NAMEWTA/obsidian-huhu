# 127 Memory TS 语义校验候选

Session: 20261025T043239Z
Task: 127-memory-ts-validation
Status: completed

## 聚焦交接

已在原 MethodValidation 的 Ajv 成功分支之后，为唯一合同的八个 Memory 方法增加纯 UTF8/合计/编码预算校验；只修改指定两个 TS 文件。消费 Root 接纳的 125 R3 合同，schema/API/既有共享测试均未改；72 方法、144 个懒编译方法校验器及原 Ajv 严格选项不变。本候选已停止生产与测试写入，全部检查进程真实结束并 Wait，无活动产品进程；下一步由 Root 安排组合输入审查、Go 联调和 T27 最终 build/lint。本任务 completed 仅表示该两文件候选交回，不表示 T14、真实 Memory 服务或未来工作台已完成。

## 产物与验证

- [method-validation.ts](../../../../../../../../../src/modules/huhubot/core/protocol/method-validation.ts)：SHA256 `3cde7ada5998348cfe388bd99effa4819b250a2ece632473e2c3e4dcd4226b5e`。先由唯一 schema 拒绝未知形状，再只遍历有限 Memory DTO 的字符串；拒绝未配对 UTF16，核 text 65536、query 1024、cursor 2048、opaque 512、command/key 128 UTF8 bytes，保留 Go TrimSpace 的 NEL/BOM 差别及 SQLite 有符号 64-bit 正 Decimal 上界。核 Body 来源与 Scope 合计≤32、creator/provenance 关系、context 分片≤4096 bytes、displaySlice 的 UTF8 字节差与 partIndex/partCount、context list 仅摘要等原合同语义。
- [memory-validation.test.ts](../../../../../../../../../src/modules/huhubot/core/protocol/memory-validation.test.ts)：SHA256 `2589db68fde2eaf0f957904ffc60d2716bc8f3939f0a8fb88a02afdf8baec787`，新增 13 个公共消费者测试。覆盖中文/组合 emoji/分解字符精确边界、一个 ASCII byte 越界、代理项、来源 32/33、Derived 128/129、单对象/页/context 包裹的精确编码边界、HTML/控制转义、omitempty、非 Memory 负控及数据不变。真实 HapConnection/BotClient 与生产 frame codec 的受控 transport 证明非法 params 不发送、非法 result 拒绝且关闭连接；仅替代 transport 对端，没有 mock validator，没有 Go 进程。
- 编码预算使用 R3 明确的 **decoded Go json.Marshal**：`<>&`、U+2028/U+2029 等价转义；只读计数时应用当前 DTO 的空串和 context entry 空 slice/partial=false/partIndex=0 等 omitempty，保留 required false/0/[] 与 pointer text。普通对象/params≤245760，整 MemoryPage 与 context get 包裹≤262144；page 每个对象仍≤245760。未按输入 JSON padding 或纯正文相加替代包裹预算，不改动原值。
- [02-memory-red.log](logs/02-memory-red.log)：旧生产实现真实红灯，12 tests 中 11 失败，actual exit126/Wait；超字节数据被放行，公共 BotClient 非法输入实际发送后走到 REQUEST_TIMEOUT。保留旧实现于 [baseline/method-validation.ts](logs/baseline/method-validation.ts)。
- [03-memory-first-green.log](logs/03-memory-first-green.log) 和 [05-memory-green.log](logs/05-memory-green.log)：两次作者测试夹具问题均保留。03 把全 U+2028/U+2029 空白正文误当合法正控，改为追加非空白字符；05 的 NUL 正控低估包裹开销，改为明确低于预算的正文。未放宽实现或失败断言。原目标边界测试持续保留。
- [11-final-protocol-green.log](logs/11-final-protocol-green.log)：`pnpm exec vitest run --project unit` 指定 memory-validation、method-validation、codec、connection 四个文件，**4 files / 73 tests 全过，exit0/Wait**；含既有唯一 schema 的 **302 共享 shape 样本**及 144 cache 上限断言。不是 302 个新增 tests。
- [08-production-types.json](logs/08-production-types.json)：`pnpm exec tsc --noEmit --skipLibCheck` exit0/Wait，14.01s。此后生产文件不变；唯一后改为测试 helper 的 erased return type。09 测试类型检查真实失败是 helper 返回了包含 redacted 的宽 union；改为实际 readable 分支的精确返回类型，不改公开 API。[12-final-test-types.json](logs/12-final-test-types.json)：`pnpm exec tsc --skipLibCheck -p tsconfig.test.json` exit0/Wait，18.04s；修正后同输入 73 tests 再跑通过。
- [source-manifest.json](source-manifest.json) 固定两自有文件和 1645 个只读 TS/config/resource 输入，共 1647 个输入，tree `ea15a732d627f908cf95a7d0eb71e3f4f53495b28d04e89ed6217ef2a2851ce9`，最终各检查输入漂移 `[]`。Node v26.11.1、pnpm11.1.3；package/lock、API、schema、302 样本、Node 配置与源依赖均为只读。原 method-validation.ts 在当前工作副本已是 untracked，实施前基线另存；本轮增量 diff 在自有 logs，不将 HEAD 当作此前完整 Bot 实现。
- 消费冻结 [125 R3 interface-contract.md](../125-memory-foundation-contract/logs/interface-contract.md)，SHA256 `5ad52ee409236337457f0b6ae215f1369b1af821ec671b83791d3f38d2f072d1`；API `78948204281914149059429b3e0250143e41efa73642d985c2e31e544cfa0a17`，schema `2fd592f7a503004b5b315f0becf1fc1ad9e8266aff46bfc12e2473fe73e3a615`。遵守 [Map34 窗口](../../../evidence/T-14-logs/independent-ts-go-window-map34.md)：未读取或运行变化中的 Go 作为测试输入，未运行 Go、跨语言 harness、全仓 lint/build、产物生成或真实宿主。

## 问题与下一步

本候选无未解决本地失败。当前公开 Memory wire 没有可由调用方提交的 GrantIDs/Group proof，额外字段仍由唯一 schema 拒绝；不制造平行 DTO。正文/hash 匹配、原对象 hash/SourceSpans 的真实 UTF8 边界、namespace/来源资格、Grant/Group 闭包和物理发送 fence 是 Go helper/真实 Store/reader 的责任；TS 不同步计算 SHA256，也不拿片段文字比较 Source.Hash 或将 caller hash 当授权。T15/global/proposal 是否装配仍以服务端实际能力为准，校验器不伪装服务成功。

Go/TS 组合链、完整插件 lint/build/产物以及真实 Obsidian/Provider 均未在本窗口运行；前两者按 Root/T27 窗口后验，真实宿主由用户后验。未提交、推送、发布、更新正式状态、改变 UI 或依赖。交回校验实际结果见自有 logs/13-return.json，后续保持两 TS 文件停写。
