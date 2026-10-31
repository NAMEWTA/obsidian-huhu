# T-14 repair-1 独立双轴复核

Reviewer: native:/root/review_code
Implementers: native:/root/implement_t01
Mode: native
Input: evidence/T-14-review-input-r2.json
Input-SHA256: 7e5f89d4902bf531922f0e7e08c23b4d75f5db0bf78552c4eba5dc8abb07612c
Observed: 本 reviewer 未参与实现或修复；只读审查，唯一新持久写入为本报告。原 r1 报告保留，未改源码、正式 Evidence、Ticket、Map 或产物，未再次派遣。

## 输入、范围与实际复核

完整输入对象 JSON.parse 后 JSON.stringify 的 UTF-8 SHA256 如上。开始与结束均核验 18 个源码文件的内容/模式、31 个来源字节，无漂移；HEAD/base 为 `265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`，stage index 摘要及固定 tracked_diff_command 摘要匹配。

相对 r1，只有 `services/history-retention.ts` 与 `platform/desktop/history-retention.test.ts` 字节变化；两份完整文件实际重新阅读，并回读其 LocalHistoryStore/JsonStore 成本与副本轮转消费者。其他已审查代码及规范/标准不变，复用已读来源知识，不把旧失败报告改为通过。适用合同仍为 T-14、Spec AC-034、ADR-003、DESIGN PAGE-003、SRC-010，以及项目 dev/ui 与公共风险/恢复审查规则。

原过度删除反例已独立重放：合法 1 MiB / 2,500 条近期同文档历史、A/B 两个共享对象，修后 collect 保留 **1,812 条**、实际 **1,048,134 B**；再通过真实 LocalHistoryStore.capture 准入 **80,000 B** 正文后，仍保留原历史 **1,670 条**、新记录 1 条，实际 **1,046,412 B ≤ 1,048,576 B**。原“metadataBytes 固定导致全部淘汰”已修复。

新规划按保留索引的真实 JSON 字节计算，history 行移除包含属性及逗号，path 映射保留，released journal 增量与紧凑 plan 两副本计入。原共享对象/保护规则、GC 租约、计划→双副本→引用复核→删除顺序未改；本轮没有发现这些不变量退化。但实际准入的最终成本还存在以下不一致。

## standards-output

Reviewer: native:/root/review_code
Axis: standards
Result: request-changes
Input-SHA256: 7e5f89d4902bf531922f0e7e08c23b4d75f5db0bf78552c4eba5dc8abb07612c
Observed: 原 STD-01 的过度淘汰已修复；发现 1 项修复范围内的准入成本问题。

### STD-02 — P2：最终准入只计副本增长，不计副本缩小，拒绝实际可以容纳的采样

- 位置：`src/modules/versioning/services/history-retention.ts:148`、`:150`；相关规划 `:92` 的 historyCost。
- 可达前提：history primary 小于 backup，例如一条较长可见路径被 rename/delete 后，primary 的 paths 映射缩小，而 backup 仍保存上一步映射；其他历史均未过期且没有要回收的孤立正文。新 capture 会像原先一样先将当前 primary 写入 backup，再写新 primary，因此该次准入本身可以缩小恢复目录。
- 具体风险：规划使用 `2 * historyBytes + allocationReserve`，认可即将轮转后的较小副本；最后检查却从旧实际 `used` 出发，将 `2 * currentPrimary - 当前两副本字节` 经 Math.max(0, ...) 截为零。原 backup 将减少的字节没有扣除，规划与最终准入出现矛盾，抛出 quota 并阻止本来可用的新快照。后续回收可能通过额外淘汰历史来迫使轮转；这仍是本不需要的拒绝/删除，不应被当作容量确实不足。
- 独立生产反例：有效 1 MiB 配额、1,809 行近期历史、一个已有正文对象。两份索引都合法；backup 比 primary 多一个约 3 KiB 的普通可见层级路径映射，模拟路径退役后副本大小不等。生产规划包含原有 allocationReserve 后只需 **1,048,032 B ≤ 1,048,576 B**；当前目录为 **1,048,779 B**。调用生产 `LocalHistoryStore.capture('new.md', 'X', ..., retention.admit)` 被拒绝为 `versioning.localHistory.quota`。在同一持久输入上调用相同 LocalHistoryStore.capture，仅移除准入 gate 作单变量对照，真实轮转和读回完成后实际只有 **1,046,109 B ≤ 1,048,576 B**。因此不是外部竞态、编码估算或所需正文过大。
- 依据：容量规划、最终准入与实际 JsonStore 写入必须采用一致成本模型；这是可以用生产写入结果证伪的正确性问题，不是对额外安全余量的风格偏好。
- 修复条件：最终检查对**确实将执行**的 history 两副本写入使用与规划一致的净占用/实际写后投影，并继续计入新正文、新行、新 path 映射和必要回执；不能只允许正增长，也不能为绕过检查先无条件写超配额数据。新增 primary 小于 backup 的反向大小测试，在合法 1 MiB 配置下证明新内容采样成功、无额外历史淘汰且最终实际占用不超配额；保留现有 primary 大于 backup、Unicode 路径和受保护数据回归。

另按 Lead 提醒核对了去重分支：`LocalHistoryStore.capture` 先调用 admit，后检查 latest hash，相同时仅 readObject 后返回 undefined，**不会执行索引轮转**。在同一个 1,048,779 B 副本输入上，对 same.md 的相同内容 A 调用采样，当前 gate 拒绝 quota；去掉 gate 的生产去重分支返回 undefined、零写入，占用仍为 1,048,779 B。该拒绝本身正确，不能把上述修复机械改成负 historyGrowth 后，对去重无写入也减掉根本不会发生的 backup 缩小。修复需让准入知道是否实际写新行/映射，或在其已持有的租约下明确完成可核验的元数据压缩；补充新内容与相同内容这两个相反断言。此项作为已确认 finding 的修复约束，不另列当前缺陷。

Findings: [STD-02]

## specification-output

Reviewer: native:/root/review_code
Axis: specification
Result: request-changes
Input-SHA256: 7e5f89d4902bf531922f0e7e08c23b4d75f5db0bf78552c4eba5dc8abb07612c
Observed: 原 SPEC-01 的全部近期历史清零问题已修复；剩余准入误拒绝违背配额不足才暂停的行为合同。

### SPEC-02 — P2：实际能容纳新快照时仍显示配额不足并暂停采样

- 位置：`src/modules/versioning/services/history-retention.ts:148`、`:150`。
- 行为与证据：合法 1 MiB 配额下，路径映射缩小使 primary/backup 不等大；实际新采样后只用 1,046,109 B，但本实现拒绝采样并产生 quota 错误。完整反例和单变量实际写入对照见 STD-02。此时用户收到的“保护恢复与撤销依据后，配额仍不足”并不成立；无需释放保护对象、提高配额或淘汰额外历史即可完成采样。
- 依据：T-14 的按实际字节配额准入、Spec AC-034 和 ADR-003 的“清理后仍不足才暂停新自动采集”，以及 PAGE-003 的持续暂停原因。修复必须与已确认的真实容量边界一致。
- 满足条件：统一规划与最终准入的副本净变化成本，增加 primary 缩小后 backup 轮转的真实 capture 回归；证明足够时采样成功，不足时仍保持受保护引用、持续错误与强制检查点失败拒绝覆盖合同。

Findings: [SPEC-02]

## 本轮独立执行与未验证项

实际执行：

```text
pnpm exec vitest run --no-cache src/modules/versioning/platform/desktop/history-retention.test.ts
Test Files 1 passed (1)
Tests 9 passed (9)
Duration 5.03s
```

该套件包含原保护/共享 hash、两阶段中断、外部引用漂移、损坏备份、正文篡改及新增元数据/副本增长场景；未重复边界外的全套测试。另独立执行三段 Node + esbuild write:false 内存生产探针，分别确认原 2,500 行反例修复、副本缩小误拒绝以及同内容去重不发生轮转的边界。使用生产 LocalHistoryStore/HistoryRetention/JsonStore，未写额外源码或测试文件。

作者报告的 5 文件/43 测试、测试类型、生产 lint/diffcheck 为上游记录，本 reviewer 未当作自己的执行。既有 checkpoint/restore/消费者代码字节未变，原强制检查点写失败拒绝覆盖检查仍适用；本轮不重跑不变全量类型、构建或跨模块集成，不声明 main/styles 产物一致。

真实 Obsidian 主窗/popout、实机平台、人工视觉/明暗/1440 与 390/键盘焦点、真实资料事件及性能测量，按 SRC-010 仍为 user-owned / not-run。内存和临时目录自动检查不替代这些验收。

Summary-Counts: standards=request-changes / 1 finding；specification=request-changes / 1 finding；unique defects=1；skipped_axes=none。
Disposition: 原过度删除已修复，副本缩小的准入误拒绝仍需原 owner 修正后再冻结补审。本轮已完成并停写；不更新正式状态。
