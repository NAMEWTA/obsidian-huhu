# T-06 独立审查 round1 的同范围修复

Lead `codex:/root`；GP-021 / Map22 / T-06 in_progress；workspace `/home/wta/orca/workspaces/obsidian-huhu/terminal`，HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`。本包只修复 `T-06-review-round1.md` 的 STD/SPEC-01、02。原 Spec、DESIGN revision1、T06 外部验收和47路径总集不变；无新用户决定。实际写入仍以 Root 后续原生派遣为起点。

沿 LOG-027 的完整18票与Agent Team授权，实现仍由原 gpt-6.1-sol/xhigh A/C承担，独立审查仍由未参与实现的 gpt-6-astra/high承担。调用 I、dev 及本票适用 ui；沿原dev测试、许可、生命周期与错误处理规则。真实 Obsidian/Provider/五平台E2E由用户执行，不操作真实Vault/账号，不提交、推送、PR、发布或归档。现有邻接机制足够，不引入依赖或外部代码。

## 实际输入与状态

审查输入摘要 `0c6a73b7c544dd6eb53222c63e3a13f8a1d02608d4a8abb7feb38eff04b0a40f`；完整原报告SHA `71719e999f659e52b672c294a38c21e8f03b55ce9084bfefe02fc383c0852105`，双轴request-changes。原probe、bundle、输出与scope、42路径无漂移回读保存在 `T-06-review-round1-return-root-audit.json`。probe退出0证明反例执行，不是合同通过。

只读设计输入：A `/tmp/huhu-t06-a-sequence-gap-design-final.md`（SHA `159cbe8bc07a4af20df9c24d47ee7931ab71937949465cac1299282136362c4c`，取代先前候选）；C `/tmp/huhu-t06-c-review-r1-preanalysis.md`（SHA `9e0d5c8fe1f406180d869f1c351df993b07888ae126c7dfde0c3dd7c2cc6f949`）。Root已回读实际Session/consumer与两个原probe。派遣前另行保存这两份输入的最终字节/摘要和当前产品快照。

原周期attempts=3及恢复周期1的attempts=1全部保留。本包不创建恢复周期2，不清零；只有Root在所有相关writer停源后运行下一个正式候选整合才将恢复周期1推进至attempt2，上限仍3。

## 本轮唯一写集

本窗口取代旧 recovery1 Packet 的 A6/B5 活动窗口；总分配仍沿原47路径，不扩路径。除下列精确路径，其余产品源全部STOP。正式状态、Evidence、产物仍由Root独占。

| Owner | 精确可写路径 |
| --- | --- |
| A `codex:/root/prepare_t03` | `src/modules/agent/core/workspace/managed-runtime.ts`；`src/modules/agent/services/terminal/session.ts`；`src/modules/agent/services/terminal/session.test.ts`；`src/modules/agent/services/terminal/sessions-activity.test.ts` |
| C `codex:/root/implement_t01` | `src/modules/agent/platform/desktop/hooks/automation-hooks.ts`；`src/modules/agent/platform/desktop/hooks/automation-hooks.test.ts`；`src/modules/agent/platform/desktop/hooks/native-extensions.test.ts` |
| B | 无。允许的T07预备仅只读，不解锁后继生产票。 |
| Root | `main.js`、`styles.css`、`scripts/bundle-budget.json`；正式记录与`/tmp`验收工具。 |

A先交真实API与最小红绿，Root核读后C才消费新接口；C可先独立实现root fence及其回归。跨owner字段/语义变化先交Root，不能自行增路径。各owner只格式化自己的路径，禁止全局build/lint/guards、Chrome/helper rebuild。定向检查保存实际前输入、工具/配置、原输出、退出码和后漂移；未停的依赖不得冒称稳定最终输入。

## 冻结的最小内部合同

在现有ActivitySourceBinding增加 `observeOrdered(values: readonly ActivityObservation[], gapPending: boolean): ActivityAdoption`；旧observe/invalidate/close保留。`ACTIVITY_LIMITS.reorder=8`作为同一有界窗口常量，A/C共同使用，不另建配置表。

- 合法形状仅 `([], true)` 或 `(1..8个从source.sequence+1开始严格连续的事实, false)`。前者立即将该source及aggregate降unknown/sequence-gap；同gap重复不推进序号、不刷新TTL。空false、非空true、超额、非registration与非法摘要/序列不能清gap。
- A只有一个source临时gap位；C仍独占原high-water和最多8项Map。只要Map整体不是high+1..max连续区间，全部pending留在原Map，包括连续prefix，不提前消耗Stop。补齐后一次交完整连续批。仍限定high+8；窗口溢出保持原hard sequence-gap。没有第二重排队列、完成暂存或新序号。
- A在状态改变前验证长度、摘要字节和完整连续性。合法批在同一同步事务内沿原转换逐事实推进activitySequence，completion记录真实Stop自己的N；批末只通知最终snapshot，不能先发布旧current，也不发布中间clear/current。seen不改变。直接observe不能绕过已声明gap去恢复可信状态。
- 结构/预算/序列非法整批拒绝，不能先采纳前项再发现后项非法。实际HookError或registration终止事件按序撤销，后项不得应用；先前合法完成只作为原N的历史提示保留，不当当前输入证明。A在自己的同步事务和最终通知前处理 `session_shutdown` / `adapter_closed`，C同receive幂等关闭并停止后续事实，不能等A已通知current后才撤销。
- gap保留lastFact/blockId/旧completion/seen，但聚合state、可信blocking/capability和source health立即unknown。gap不取消或延期原freshness timer。expired仅可由真实新连续事实按原规则恢复；空清gap或重复不能恢复。hard invalidate、close、stop/exit/transport、capacity与runtime sticky hook-error/source-mismatch始终优先，补洞不换主、不重开旧epoch。
- 返回accepted表示原捕获binding接纳该批，at取该批自己的最后事实标记；重入listener的markSeen/stop不可让旧批覆盖新终态，也不能让返回值冒用后来序号。最多一个已有有限通知槽，不增加全局异步队列。

## OpenCode root 归属

C在现registration内有界保存首个有效native root ID；先完成8192B整摘要与身份校验再存，registration无root时不猜。后续另一个root在A采纳摘要前触发现有runtime sticky source-mismatch，使current、completion、title/resume均不能被竞争root提升。root ID不是registration UUID，不拆出另一条伪独立sequence。Stop/idle不能清root fence，也不能证明旧root消失；晚到A/B、新UUID或关闭其他source不能洗白runtime冲突。

此fence仅作用活动摘要；完整原生答案仍走既有raw通道与原身份匹配，不丢弃root-B答案来隐藏问题。生产extension已有session_id，本修复不改其wire或生成代码。

## 必须验证的反例与验收

先保留真实红灯，再最小修复。A覆盖单Session中间unknown、批末原子通知、原序号/Stop完成、block配对、非法批、TTL、重入和生命周期优先；C覆盖真实generated OpenCode extension→真实物理spool→consumer→Session的busy A、child idle、无先前busy的idle B，确认child过滤、B不制造完成/不改恢复身份、raw答案仍一次送达，另有同root正常完成和关闭/冲突后晚到事件负例。

consumer组合必须观察1,2,4时立即unknown/历史working，补3后合法3/4恰好接纳一次；多洞`{3Stop,4,6}`不提前消耗prefix，补5后Stop不丢；重复/更大序号/空false不清gap；完整8格与第9格溢出；stop、close、HookError、失联后补洞不能复活。收集实际每次snapshot，不能只断言最终mock调用顺序。明确失效不被旧completion误当当前能力。

Root在所有writer停止且交接回读后，重冻候选并执行受影响测试、生产build/lint、相关guards/bundle/相似度和端到端受控代码组合。原Chrome交互/样式、i18n等仅在实际输入与风险未变时复用；若本次状态转换影响原场景则重跑对应生产场景。预算按实际增长归因，不能预先放大cap。独立review须重冻当前完整交付并复核两轴；绿色定向测试不能替代原反例关闭。

本包不是通过或完成证据。T07–18生产依赖仍锁定，18票Goal继续active。
