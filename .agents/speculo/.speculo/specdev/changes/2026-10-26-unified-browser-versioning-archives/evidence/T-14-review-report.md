# T-14 独立双轴代码审查

Reviewer: native:/root/review_code
Implementers: native:/root/implement_t01
Mode: native
Input: evidence/T-14-review-input.json
Input-SHA256: 70df8705375738247acb34b9fdd414906396d2810052310303edba6b3db15d91
Observed: 本 reviewer 未参与 T-14 实现或修复；只读审查源码、规范及前序证据，唯一新持久写入为本报告。未再次派遣，未改写 T-13 原报告或任何正式状态。

## 固定输入与范围

对完整输入对象 JSON.parse 后 JSON.stringify 的 UTF-8 字节计算 SHA256。开始及结束均核验 18 个 working_snapshot 文件原文字节与模式、31 个 sources 原文字节，无漂移。HEAD/base 为 `265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`；`git ls-files --stage -z` 与固定 `tracked_diff_command` 的摘要均匹配。全部新增文件实际读取，未因其不在 tracked diff 而遗漏。

对照 T-13 r2 快照核对本票实际变化，18 个文件均有新字节；T-13 未变文件按依赖读取，不伪称整个 versioning 都是 T-14 新实现。已审查实际 module 装配 → AutomaticHistory → LocalHistoryStore → HistoryRetention → CheckpointStore/JsonStore → desktop inventory/remove，以及 RestoreService 的 checkpoint lease、恢复/撤销和 released 回执 UI 消费者。browser/archives 活动 writer、生成物和其他票不在本轮范围。

来源发现沿既有有效规则完成：working-tree 无新增 commit，commit message Issue/PR 发现不适用；显式 T-14、Spec AC-034、ADR-003、DESIGN PAGE-003、批准原型、Issue 原文、SRC-010 与 Map revision 5 均可回读。项目标准使用 AGENTS、dev/ui 及相应架构/持久化/API/测试参考，公共 review 的风险、错误/恢复与双轴合同继续适用。新输入含前序 T-13 r2 输入和报告；前序通过仅用于理解未变依赖，本票两轴独立判断。没有引入新的外部依赖或借鉴代码，无需重做不变来源的广泛调研。

## standards-output

Reviewer: native:/root/review_code
Axis: standards
Result: request-changes
Input-SHA256: 70df8705375738247acb34b9fdd414906396d2810052310303edba6b3db15d91
Observed: 完成实际入口、共享对象、两阶段回收、失败与消费者追踪；发现 1 项已执行反例确认的问题。

### STD-01 — P2：配额规划固定使用回收前元数据大小，导致不必要地清空全部近期历史

- 位置：`src/modules/versioning/services/history-retention.ts:72`（metadataBytes）、`:75`（needed）、`:86`（淘汰循环）、`:101`（实际精简索引）。
- 可达前提：历史条目较多、正文按散列高度去重，用户把配额调到小于当前索引大小但足以保存一部分近期历史。此时主要可回收的是索引行及其 backup，而非正文。该场景可以由正常反复编辑同一笔记产生，不需要损坏索引、外部并发或保护对象。
- 具体风险：淘汰循环每删一个 history entry 只减少对象引用计数；`metadataBytes` 始终是旧 primary+backup 的实测大小，不随计划中的行删除下降。如果旧元数据本身超过配额，`needed()` 即使已选择了足够的旧行仍永远不能满足条件，最终把全部可淘汰历史加入 entries。随后才把索引一次精简并删除对象。实际空间已经远低于配额，但本可以保留的大量近期历史已不可逆丢失。
- 独立生产反例：在内存 TextStorage 中先通过生产 LocalHistoryStore 建立合法同一文档的 A/B 两个内容对象，再构造 2,500 个合法 UUID、同一 documentId、近 2.5 秒内创建的持久历史行，primary/backup 均为有效索引。按 30 天、合法最小配置 **1 MiB** 运行生产 HistoryRetention.collect。开始实际占用 **1,445,186 B**；保留较新的 1,000 行连同两个正文和实现原有 4,096 B 预留仅需 **582,282 B**，充分小于 1,048,576 B。实际结果却是 **剩余 0 条历史**，目录仅 **798 B**。另以 50 条生产 capture 的较小反例得到同一结果：保留 20 条含预留仅需 16,104 B，配额 20,269 B，最终仍全删。
- 依据：这是容量规划与实际提交模型不一致的正确性问题；代码自身以 `needed() <= quota` 为停止条件，但使用了不会反映计划回收效果的成本。来源明确快照与 journal 不是可随意删除的缓存，项目最小充分变更/数据保护原则同样不支持错误估算造成的额外历史丢失。此处不是要求新的保护策略或禁止正常配额回收。
- 修复条件：规划时把计划后的 history primary/backup、保留的 path 映射、released receipt 与 collection 元数据的实际/有证明的大小变化纳入成本，按既有最旧优先策略在足以容纳新分配时停止；不能依赖全部删除后才进行最终 inventory。保留现有共享 hash、受保护引用、两副本与失败语义。补充元数据占主要容量的真实可配置配额反例，断言回收后配额满足且仍保留可容纳的较新历史；同时验证最后一次实际分配不越额。

Findings: [STD-01]

## specification-output

Reviewer: native:/root/review_code
Axis: specification
Result: request-changes
Input-SHA256: 70df8705375738247acb34b9fdd414906396d2810052310303edba6b3db15d91
Observed: 对照 T-14、AC-034、ADR-003、DESIGN PAGE-003 和原始来源，保护及失败主线已接入，但配额容量回收存在同一项外部行为缺陷。

### SPEC-01 — P2：降低配额会错误清空本可继续保留的近期版本

- 位置：`src/modules/versioning/services/history-retention.ts:72`、`:75`、`:86`、`:101`。
- 外部行为与风险：用户配置合法的 1 MiB 配额后，2,500 条均未过期的近期历史被全部淘汰；实际上按本实现的序列化格式保留最近 1,000 条、两个共享正文及预留只需约 569 KiB。正常配额压力不应因不更新计划后的索引成本而退化为“全部历史清零”。独立执行的输入、数值与输出见 STD-01。
- 依据：T-14 的可配置按字节配额、AC-034 的回收再尝试采样、ADR-003 的保留与保护政策，以及 Issue 第十四章“快照与 journal 不当作可随意删除的缓存”。本 finding 不改变已确认的配额/过期策略；要求现有最旧优先回收准确计算计划后的占用，而非用已经准备删除的索引字节继续驱动额外删除。
- 满足条件：修正元数据投影和停止条件，回归证明在合法 1 MiB 配置下保留可容纳的较新版本，同时继续满足共享对象计数、protected refs、primary+backup 与实际准入后的配额检查。未闭合和可撤销对象不得为修复此问题而被释放。

Findings: [SPEC-01]

## 已检查的其他合同

- **实际写入与 GC 共用租约：** module 复用同一 recoveryStorage/device/CheckpointStore；restore 在 repository gate 后取得 retention lease，再进入 document exclusive，收集器不反向获取 Git/document gate。LocalHistoryStore 的 capture/rename 同样先取得 lease。RestoreService 在一次 lease 内发布对象与 prepared/applying/applied/verified 回执，避免未发布对象被 GC 扫掉；单独 putObject/putReceipt 的生产调用者已追踪，正文发布主线使用 scoped port。
- **保护引用及重启：** `protectsRestoreObjects` 不将 acknowledged 的未知写入视为终态；verified 且仍承诺 undo 的记录继续保护，aborted 和已有 undoneBy 的终态才可释放。共享 hash 按引用计数保留；released 回执保留事实并用 objectsReleasedAt 明确正文失效。收集时读取并验证 primary+backup；未知/损坏备份拒绝回收，不按空引用处理。
- **两阶段与失败：** 先持久计划，再核对 history/journal 签名，索引与回执各轮转两份后逐对象校验正文/新引用，再通过受限 desktop 端口按观察 stamp 删除。中断后基于新 inventory 和引用重新计算，未盲重放旧 plan。存储失败保留可核对的部分效果；未发现以捕获异常伪称全面回滚的路径。
- **真实恢复与配额暂停：** 自动采集的 admit/maintain 在 module 生产装配中可达，配额拒绝走持续 error 文案；所有对象受保护而不足时不写入新的自动快照。强制 restore checkpoint 未受自动配额开关豁免，checkpoint 写失败在 documents.apply 前拒绝覆盖，恢复前对象与 journal 仍受相同保护 lease。
- **消费者与设计：** 历史侧栏过滤已释放正文回执，并订阅 automatic revision；比较页读取当前回执状态，已释放对象不再显示可用 undo。原 restore 服务也拒绝 released receipt 的 undo。保留期/配额设置与错误说明有 en/zh、t() 接线。沿用 revision 2 / digest `f04a5aabaa7a57dbdaa17cb89ae611d40a7c32fe948317ac641818bd38224b9c` / PAGE-003；未将未运行的实际渲染称为 Design Conformance 视觉通过。

## 独立执行与局限

本 reviewer 实际执行定向回归：

```text
pnpm exec vitest run --no-cache \
  src/modules/versioning/platform/desktop/history-retention.test.ts \
  src/modules/versioning/core/history-retention.test.ts \
  src/modules/versioning/services/restore-service.test.ts \
  src/modules/versioning/ui/history/NoteHistoryPanel.dom.test.tsx

Test Files 4 passed (4)
Tests 34 passed (34)
Duration 2.33s
```

该组包含真实临时目录与可控故障的共享 hash、受保护对象、外部引用漂移、在途发布、中断重启、备份损坏、对象篡改及 RestoreService 强制检查点失败路径。绿色结果未覆盖本报告的元数据容量反例，也不替代本次代码判断。另执行两段 Node + esbuild `write:false` 的内存生产反例，观察到上述不必要全量淘汰；未写额外源码、测试或用户资料。

作者报告的 24 文件/150 测试、测试类型、定向 lint、architecture/i18n/diffcheck 为上游证据，本 reviewer 未全量重复，也不把作者记录写作独立执行。未运行全局类型/构建，未维护 main.js/styles.css 或其他共享产物。

按 SRC-010，真实 Obsidian 主窗/popout、平台实机矩阵、人工视觉（1440/390、明暗、键盘/焦点/触屏）及性能测量均为 user-owned / not-run；自动测试与内存反例不证明这些项目通过。本报告只判断 T-14 固定交付及必要依赖，不宣称整个 change 已完成。

Summary-Counts: standards=request-changes / 1 finding；specification=request-changes / 1 finding；unique defects=1；skipped_axes=none。
Disposition: 请求原 owner 修复元数据容量投影后重新冻结输入补审；不修源码、不更新 Ticket/Map/正式 Evidence。已完成本轮审查并停写。
