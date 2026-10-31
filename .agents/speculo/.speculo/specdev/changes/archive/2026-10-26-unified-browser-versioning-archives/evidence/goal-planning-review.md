# Goal 规划审查与验证

本次 P/plan owner：native:root。按 common/skills/plan-quality-review 的九轴检查；本次不做生产代码审查，不启动实施 subagent。用户已明确未来实施工具/模型，安排见 <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/sources/SRC-009.md</Path> 与 <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/goal-plan.md</Path>。

## 输入与实际事实

- 32张票与36项AC；源Spec、DESIGN、32票与此前 ticket-validation-inputs.json 的字节摘要一致，复用已读合同，没有重新猜测来源。
- HEAD 为 265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa，分支 NAMEWTA/34；生产 src/native/main/styles/package 无本次改动。用户已有方法与规则修改保留，未写框架或全局配置。
- 永久 ADR/context 目录、specdev/config.json、coordination/project.json 不存在；不补建。当前 change 未见待处理事务/锁（名称匹配的 recovery 项只是历史原型截图）。原 source_gap_analysis agent 已 completed；本次没有派遣。
- Goal依据当前schema/template/validator采用v8；goal-lifecycle仍写v7的旧说明不覆盖实际当前schema。本次没有把旧Goal改版本号迁移。
- 用户要求的 gpt-6.1-sol-high 在真实工具中分别为 model=gpt-6.1-sol / reasoning_effort=high；覆盖模型要求 fork_turns=none，任务简报必须含完整上下文。工具接口支持这一参数形态，尚未实测调用，不冒充模型调用成功。

## 质量检查

| 轴 | 结果 | 证据/处理 |
|---|---|---|
| 背景与边界 | pass（规划） | 保留全部源范围、36项AC与已批准五页；没有把Goal当实施结果 |
| 变更影响 | pass（定位）；block（执行前置） | Goal/Map/README/LOG/SRC009/证据为本次写集；定位T-32共享构建时序缺口，G-00要求T处置，不让实现者越界 |
| 研究与复用 | pass | 原三Issue快照、source-gap-analysis、六ADR和源码；未新增库/方案；计划源引用保留 |
| Skill与模型调用 | pass（合同）；运行时待核验 | 真实I与dev/ui入口继续沿原票；强制原生subagent gpt-6.1-sol/high，不静默回退；plan不派遣 |
| 执行计划 | pass（规划）；block（run） | schema8、lead-directed、auto、3次缺省复盘上限、16拓扑层、G-00–08；真实run与前置未成立不设执行Ready |
| 控制图 | pass（现有DAG）；block（未来提升前检查） | 32节点无环，最长链16节点；T-16与T-24/27未来Ready须串行/缩写集；T-32构建维护归属不能以最后一票提前执行绕过 |
| 验收与数量 | pass | 原Map36/36覆盖、Gate映射、四平台与宿主/档案移动端完整要求；不按票数替代交付数量 |
| 权限 | pass | 当前plan明确、实施模型required；未发起run、commit/push/迁移/发布，无自授权限 |
| 恢复 | pass | 单一工作区、冻结输入/实际writer/原事务/停止与重派条件；无新证据不换Agent重试 |

## 验证结果

| 命令或核对 | 实际结果 | 解释 |
|---|---|---|
| validate-specdev --stage goal-plan --repo . 当前change | pass：0 errors / 0 warnings | draft Goal 合法；不证明run就绪 |
| ticket-control --map tickets-map.md --repo . | errors=[]、warnings=[]、frontier=[]，32票未派发 | source Spec not Ready、Goal gate false、owner未分配及依赖未闭合；原输出见 goal-ticket-control.json |
| 模型要求与派遣参数 | 已写入并回读 | model与effort真实字段，fork_turns:none；没有虚构agent ID |
| pnpm test:docs | pass：554 Markdown、449 local links、830 external links（未抓取外链） | 仅文档链接/锚点，不构建插件 |

首轮 Goal 校验曾因按指导删除 README Execution Context 的 ticket_execution 而失败（invalid Execution Context fields）；已恢复v1 schema要求的auto，Goal说明它是匹配的上下文记录，调度权威仍为Goal。失败不掩盖，修正后重新校验通过。

## 必须保留的边界

v8规划指南允许局部future draft不阻塞独立Ready生产者，但当前ticket-control仍全局要求SpecReady，validator也拒绝Ready Goal+draft Spec。已在G-00和恢复协议明确，不修改工具绕过，不报告独立frontier已可运行。4张扩展设计票保留原draft，真实批准应由P/S/T补齐。

共享构建的问题来自已读 dev/testing.md：生产TS/TSX修改必须pnpm build并保留main.js，而原票把main/styles唯一写入owner留给依赖全部票的T-32。G-00要求T调整可执行的所有权或拆分验证安排；本轮Goal不擅改上游票，也不建议实现者删产物或改构建命令来逃避要求。

本次交付是完整可审阅的Goal编排草案；执行门有明确owner与解除条件。没有运行插件build、生产测试、真实Obsidian或四平台验收；这些仍由原票/Gate实施时完成。
