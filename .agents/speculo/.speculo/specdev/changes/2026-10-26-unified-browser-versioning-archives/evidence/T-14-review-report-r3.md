# T-14 repair-2 独立双轴复核

Reviewer: native:/root/review_code
Implementers: native:/root/implement_t01
Mode: native
Input: evidence/T-14-review-input-r3.json
Input-SHA256: 70e164cf4489d76adf5c494dafea4677d68c2e3d2cc35851d7bf86b07bf972a1
Observed: 本 reviewer 未参与实现或修复；只读审查，唯一新持久写入为本报告。r1/r2 原报告保留；未改源码、正式 Evidence、Ticket/Map 或生成物，未再次派遣。

## 固定范围与来源

完整输入对象经 JSON.parse → JSON.stringify 后计算 UTF-8 SHA256。开始与结束均核验 18 个 working_snapshot 文件的原文字节/模式、31 个 sources 原文字节，无漂移；HEAD/base 均为 `265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`，stage index 与固定 tracked_diff_command 摘要匹配。

相对 r2 只有 `services/history-retention.ts`、`platform/desktop/history-retention.test.ts` 两文件变化，已完整重新阅读，并回读 LocalHistoryStore.capture、pruneEntries 和 JsonStore 的实际去重/轮转行为。其余已审查保护、GC、恢复及 UI 代码字节未变；不以作者复测代替本轮判断。当前 Map revision 6 的变化属于 T-03 测试进程夹具归属，已回读，未改变 T-14 行为/写集。来源仍为 T-14、Spec AC-034、ADR-003、DESIGN PAGE-003、SRC-010、项目 dev/ui 和公共双轴/风险/失败恢复合同。

## standards-output

Reviewer: native:/root/review_code
Axis: standards
Result: pass
Input-SHA256: 70e164cf4489d76adf5c494dafea4677d68c2e3d2cc35851d7bf86b07bf972a1
Observed: 原 STD-02 修复满足条件，STD-01 的元数据过度淘汰没有回退；本固定修复范围未发现需要请求修改的新问题。

- `history-retention.ts:145`–`:153` 在共享 checkpoint lease 内重新读取有效两副本；需要缩小时通过原 `pruneEntries(empty, true)` **实际完成并核验两轮元数据提交**，随后重新 inventory。该操作不删除历史 entry，不调用对象删除，也不更改 restore journal/保护引用。
- `:158`–`:160` 继续只计正增长，减少的容量来自已经完成的真实压缩，不扣假想负值。因此后续 LocalHistoryStore.capture 即使 hash 去重直接返回 undefined，缩小也已经发生；压缩失败直接拒绝，不把未实现效果当作容量。
- 独立重放 r2 原 1 MiB / 1,809 行 / 1,048,779 B 的不等大副本输入。新内容 X 成功生成新快照，保留原 **1,809 条**，实际 **1,046,109 B**；同内容 A 返回 undefined，但先完成 **4 次元数据写入**，保留原 **1,809 条**，实际 **1,045,771 B**。两分支均低于 1,048,576 B，没有额外淘汰历史。
- 同一输入对 backup 压缩写入施加写前故障，生产准入拒绝为 `compaction blocked`；零写入，实际占用保持 **1,048,779 B**，原 **1,809 条**保留。没有新快照或虚假容量成功。
- 独立重放 r1 的 2,500 行元数据主导反例：collect 保留 **1,812 条**、实际 **1,048,134 B**；继续通过实际 admit/capture 新增 **80,000 B** 正文后，原历史仍保留 **1,670 条**、新增 1 条，实际 **1,046,412 B**。未退回清空全部历史的行为。

共享 lease → history 写队列的锁顺序保持；新增压缩不获取 Git/document gate，不反转 RestoreService 的 repository gate → checkpoint lease → document exclusive 顺序。primary/backup 仍由原 JsonStore 验证写入；取消/异常不会绕过最终实际 inventory 或开启正文准入。保护引用计数、released receipt、两阶段对象回收和强制 checkpoint 路径未修改，未见由本修复导致的回退。

Findings: []

## specification-output

Reviewer: native:/root/review_code
Axis: specification
Result: pass
Input-SHA256: 70e164cf4489d76adf5c494dafea4677d68c2e3d2cc35851d7bf86b07bf972a1
Observed: 原 SPEC-02 的足额误暂停已通过新内容、同内容和失败三个实际分支验证修复；原 SPEC-01 的过度删除保持修复。

AC-034 的准入现在以已经核验的恢复目录状态计入副本缩小：足额的新内容采样成功，去重不以不存在的后续轮转冒充空间，压缩失败仍拒绝。配额不足才暂停的判断与实际字节一致；1 MiB 反例保留全部原历史，未通过额外删除来绕开错误。元数据主导场景仍按修正后的成本回收足够的旧行，保留可容纳的较新版本。

T-14、ADR-003 的未闭合恢复/可撤销对象保护及强制检查点合同保持。此次新增分支仅压缩有效历史副本，不释放 protected hash 或 journal 引用，不为自动采集豁免 restore checkpoint；原恢复写失败拒绝覆盖及 released 回执消费者的已读代码和未变定向证据继续适用。

DESIGN PAGE-003 保持 revision 2 / digest `f04a5aabaa7a57dbdaa17cb89ae611d40a7c32fe948317ac641818bd38224b9c`；产品设置、状态和 UI 未新增变更。本结论只覆盖实际代码合同，不表示真实页面视觉/宿主验收通过。

Findings: []

## 实际独立验证与限制

执行两个不落盘的 Node + esbuild `write:false` 生产探针：第一段在各自独立的同一持久输入上运行新内容、去重、压缩失败三分支；第二段重放 2,500 条历史及后续 80 KB 分配。均调用实际 LocalHistoryStore、HistoryRetention、JsonStore，使用内存存储观测实际写入/字节/历史数量；未创建额外源码或测试文件。

另独立运行：

```text
pnpm exec vitest run --no-cache src/modules/versioning/platform/desktop/history-retention.test.ts
Test Files 1 passed (1)
Tests 12 passed (12)
Duration 3.82s
```

该套件包含真实临时目录的两向副本大小、Unicode 路径准入、原过度淘汰、压缩失败，以及共享 hash、保护引用、外部引用漂移、备份损坏、对象篡改、在途发布与中断重启。实际生产反例与代码追踪共同支持本结论，未以绿色测试数量代替审查。

作者的 5 文件/46 测试、测试类型、lint/diffcheck 为上游报告，本 reviewer 未宣称这些是本轮自己执行；未重复范围外全套检查。全局 architecture 中 T-03 fixture 归属由其 owner 处理，本报告不声明全局 architecture 通过。未构建或验证 main.js/styles.css 最终集成一致性。

真实 Obsidian 主窗/popout、平台实机、真实资料事件、性能和人工视觉/明暗/1440 与 390/键盘焦点按 SRC-010 保持 **user-owned / not-run**，不以自动临时目录或内存证据替代。

Summary-Counts: standards=pass / 0 findings；specification=pass / 0 findings；skipped_axes=none。
Disposition: T-14 r3 固定范围双轴代码审查通过，交 Lead 核验派遣、固定输入和正式集成状态；不等于整个 change 或真实验收完成。已完成本轮审查并停写。
