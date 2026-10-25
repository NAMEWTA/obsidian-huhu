# Goal Plan 规划核验

日期：2026-10-25。范围：本 change 的 Goal revision 1、Map revision 2、28 张 Ticket 与现行导航对齐。仅规划；未实施产品、调用模型、派遣团队、启动浏览器、运行产品测试或提交发布。

## 结论

Goal Plan 已完整落盘，保留全部 28 票/55 AC，具有 W1–W7、贯穿各切片的 T-27 集成安排和 G0–G6。用户 LOG-045 的 Agent Team 偏好已写入：实现优先 `gpt-6.1-sol / xhigh`，未参与对应实现的独立 reviewer 优先 `gpt-6-astra / high`，Lead 拥有正式状态与验收。没有固定团队人数或预建派遣。

规划结构没有新增错误；整体 `--stage goal-plan` **未通过**，仅报告原有 UI-001 未 Ready/缺浏览器证据两项。源 Spec 继续 draft，Goal 继续 draft / ready_for_execution:false，控制器 frontier 为空。文档检查仍有原附件六处既有锚点错误；原文件保持原字节。这些结果没有改写成产品 Ready 或全绿。

## 真实输入与权威

- 用户请求与偏好：<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/LOG.md</Path> LOG-045；原产品决定与 final 选择继续有效。
- 输入文件与 SHA-256：<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/goal-inputs.json</Path>；代码 HEAD `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`、分支 main。
- 已执行计划审查方法：<Path>{roots.workflows}/specdev/common/skills/plan-quality-review/SKILL.md</Path> 与 checklist；真实 dev/ui 调用绑定仍归各票。
- Goal 采用当前 schema v8、模板和 execution-policy。goal-lifecycle 的兼容段仍有 v7 旧称，本轮依据当前 v8 schema/校验器/单 change 参考处理，未修改工作流文件或伪造兼容转换。
- 本次未创建实现 Execution Context、Workspace Execution Record 或实施 Evidence；Evidence 表里的 T-xx 路径只是未来目标。

## 计划质量审查

| 检查轴 | 规划结论 | 回读依据与处置 |
| --- | --- | --- |
| 背景与边界 | pass | Goal §1 对应完整 P1、55 AC、三协议、现有 HUHU 基底和唯一 final；研发 Agent Team 与产品 Bot 限额区分 |
| Skill 调用可执行性 | pass；执行期仍需真实记录 | 28 票共 36 个 dev/ui 绑定及摘要有效，14 项扫描来源可回读；I 入口、失败动作和重新绑定规则完整 |
| 实施与共享集成 | pass（已修正） | T-27 现有工程准备解除 T-01 完成前置；Go 资产步骤等待 T-01 产物验收，最终 G5 等全部生产输入；T-20 保持词典/模块注册 owner |
| 控制图与资源 | pass | DAG 无环，T-28 依赖闭包覆盖其余 27 票；34 个共享表面 owner 唯一，精确可写集合无交集；相同语义资源默认串行 |
| 验收与数量 | pass（计划覆盖） | 28 票/55 AC 不删减；每票真实验证接缝不变；三协议、宿主与平台 required E2E 及最终组合审查写入 G2/G5/G6 |
| Agent Team 与模型 | pass（安排已保存） | 原生团队可用，两个模型/effort 按用户偏好；派单时核对可用性与真实身份；实现者不得自审，无合格 reviewer 阻塞相应验收 |
| 权限与工作区 | pass（边界明确）；执行 blocked | 仅 plan 授权；current 复用，不增建 worktree，不默认 commit/merge/push/deploy；G0 未闭合 |
| 恢复 | pass | 固定输入、依赖 Evidence、原事务网关、owner/writer 核查；无新证据不重复派单，默认三次复盘上限有规则来源 |
| 发行协调模式 | not-applicable | 本次没有发布窗口、远程交付或部署要求；资产准备/平台验收仍由 T-27 承接 |

### 已修正的问题

1. 原 T-27 在 T-01 done 后才能开始，而 T-01 的生产 TS 验证又需要共享构建 owner，形成实际执行互等。将 T-27 开始条件改为无前置票，只允许基于现有工程准备及提供构建窗口；Go 子步骤与最终验收分别有真实输入门。Map revision 升至 2，Goal 引用同步，不删除 T-01 的任何验证。
2. T-27 的步骤曾提及根词典注册，与实际共享写集中的 T-20 owner 不一致；已明确词典/模块注册仍交 T-20，T-27 只写其拥有的根产物与样式注册。
3. Map 原来预留“需要时再建立 Goal”，已改为现有 Goal 导航；跨票 Gate/Wave/模型偏好只由 Goal 维护，Ticket 继续拥有依赖/状态/写集。
4. 全文件空白审计原来把历史用户引文两行 `> ` 计为本轮问题；改为对新增/修改行检查，历史引文不篡改，单列 pre_existing_whitespace。

## 实际检查

原始命令、退出码、stdout/stderr 与控制器结果保存于 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/goal-checks.json</Path>、<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/goal-ticket-control.json</Path>。

| 检查 | 实际结果 | 说明 |
| --- | --- | --- |
| 28 票绑定/AC/共享 owner/DAG/设计保护文件审计 | 0 errors | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/goal-ticket-structure-check.json</Path>；20 个非 UI 合同 ready、8 个 UI blocked，不等于可派单 |
| Goal Plan 阶段校验 | 2 errors / 0 warnings；实际退出码 126 | 仅 UI-001 必须 Ready、必须有 browser evidence；无 Goal schema/执行策略/Map/Ticket 新错误 |
| ticket-control | frontier=[]；全局 errors=[]；28 票未可派单 | UI 校验、源 Spec 状态、未分配 owner 和依赖等由控制器逐票说明；没有绕过入口派单 |
| pnpm test:docs | 未通过；实际退出码 126 | 仅原附件六个既有目录锚点；没有本次引入的文档链接错误 |
| git diff --check | exit 0 | Git 只覆盖已跟踪差异；change 内新增行另作完整审计 |
| 全文件清单/新增行空白/保护文件 | 无本轮新增空白问题；无源文件删除 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/document-alignment.json</Path>；保留两行历史引文空白 |

退出码按本机命令真实返回记录，不将包装层返回的 126 归一化成 1 或 0。工具报告的两项 UI 失败与六项附件锚点均保留原文；未改检查器/忽略列表。

## 文档对齐与不变项

新增 Goal、输入摘要与当前检查证据；更新 README、Map、T-27、Spec 的规划导航、ARCHITECTURE 的编排职责导航、T 规划报告的接续说明和 LOG。Goal 不改产品 ADR，也不把研发模型选择塞进 Bot 的产品模型合同。

对整个 change 逐文件登记摘要及变更类别，细节见 document-alignment.json。DESIGN revision 2、final、源码块、bindings、confirmation、source、原附件与历史静态证据保持。19 个保护文件与 T 前快照逐字一致；原附件 SHA-256 仍为 `a85a57648a00942a44c3df89c52804d13d129e7e31262a73feb91ccc7f1516cc`。历史 LOG 只追加，不重写用户回答；其他 change 与永久 ADR/context/design 未更新。

## 接续

本次请求的 Goal Plan 已交付，无新的产品问题需要用户抉择。未来执行首先补真实 P 浏览器技术材料并重验 S Ready，再依据实际实施指示、当前工作区与逐票 DoR 进入 I。模型偏好、Agent Team、current 选择和 final 批准均沿用，不重复询问。此次没有启动产品实现、团队 dispatch 或 runtime Goal。
