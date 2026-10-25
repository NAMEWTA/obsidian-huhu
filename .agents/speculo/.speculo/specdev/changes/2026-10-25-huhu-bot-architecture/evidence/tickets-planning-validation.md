# 最终 Tickets 规划审查与文档对齐记录

日期：2026-10-25。范围：LOG-042 授权的 T 规划、开源核验与本 change 文档对齐；没有实现产品、运行真实模型或进行 Git 提交/发布。

## 交付与权威

- 28 张完整行为票，55 个现行 AC 全覆盖，每个 AC 有唯一汇总主责，复合 AC 另列必需验证接缝；没有 deferred 或以少量样例替代完整交付。
- 36 个真实 Skill 调用绑定（dev/ui），入口与引用 SHA 已核对；扫描 14 个项目 Skill，没有虚构 Go 专用技能。
- DAG 无环，T-28 的依赖闭包包含其余 27 票；所有票写集两两无交集，34 个共享表面有一致唯一 owner。语义资源另行声明，不从文件无冲突推断能并行。
- 本轮 20 张非 UI 票自身合同 ready，8 张涉及 UI/生成物/宿主验收的票保留 blocked；整体源 Spec 仍未 Ready，所有派单继续受源门禁约束。Map 的 ready 只表达计划结构完整。
- 开源参考 9 个，均核验两年活动窗口内提交和固定许可证；源码/依赖/已知限制逐项引用。没有安装上游或宣称其代码已在 HUHU 验证。

本文件记录一次实际规划审查快照，不成为新的票级状态权威。当前状态始终回读原 Ticket、Spec 与 P 包。

## Plan Quality Review

调用来源：<Path>{roots.workflows}/specdev/common/skills/plan-quality-review/SKILL.md</Path> 及其 checklist。由本轮 Lead 对全部 28 票逐项检查；这不是 I 的独立双轴代码审查，没有伪造 reviewer 或实施回执。

| 检查轴 | 结论 | 证据与处理 |
| --- | --- | --- |
| 背景/边界 | pass | Spec/ADR/用户决定完整；各票目标、IN/REUSE/OUT；保留完整首版与唯一 final |
| 技能调用 | pass | 实际 dev/ui、phase/operation/input/output/失败动作与摘要；<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/skill-scan.json</Path>；完成时才创建 Skill Execution Records |
| 执行计划 | pass | 每票有顺序、公共消费者、异常/恢复、正常/失败/回归、E2E 和固定 change-workspace；新接缝标为待建设，不冒称已存在测试 |
| DAG/所有权 | pass | 无环、最终闭包完整、无写集交集；共享 API/装配/构建分别归 T-01/20/27；预算/迁移/宿主资源串行协调 |
| AC 与数量 | pass | 55 AC 全覆盖、无用户指定票数缺失；表中 covered 仅表示纳入计划；三协议必须分别有证据 |
| 权限/范围 | pass | 本轮只规划；实现须后续授权并进入 I，未自动提交/发布/归档；未调用旧研究 Agent 或擅自切浏览器 |
| 恢复/失效 | pass | 同一 current workspace、原事务核查、配置/版本/Skill/DESIGN/输入变化失效闭包；旧证据保留 |
| UI 源技术就绪 | block（既有门禁） | DESIGN 已批准，缺浏览器观察；不将用户选择改写为技术通过，不重复索取同一批准 |
| 纯文档构建/真实 Provider/产品测试 | not-applicable（本轮） | 没有产品代码变更；Ticket 中明确未来实施的必需验收，本轮不伪造完成 |

### 审查中发现并修正

1. Spec 历史 HB-AC 序号被公共校验器误识别为未覆盖的现行 AC。改为明确的“原输入 HB 验收序号”映射，只改变现行解释；原输入字节保持不动。
2. 第一条真实模型接入需要预算与取消/恢复先可用。T-08 明确依赖 T-12/T-16；T-16 先用 fake Engine 验证树恢复，后续模型/记忆接入共同合同，消除隐藏收费/恢复旁路和概念依赖环。
3. T-05/T-07 在完整 UI 之前仍要真实 Host 证据。为它们分配独立宿主接缝探针写集；完整用户路径再由 T-21/23/28 覆盖，不能把探针冒作 UI 已交付。
4. T-20 先验证模块激活/服务工厂合同，T-21/22 提供真实页面/配置消费者；AC-001 的 S6 与 S8 分责，避免仅注册空页面就认定聊天可用。
5. 当前 dev/ui 文档描述的是已实现模块。Bot 库外 Profile/客户端投影是获准新增例外，T-27 在功能实际集成时更新规则并重绑 Skill 摘要；本轮不提前污染现行项目事实。
6. Eino #1119 当前网页为 Closed，修正为历史回归线索；keyring 的 macOS 源码用 stdin，与 README 手工 argv 示例区别记录。没有把上游已知限制误写成当前未修复漏洞或 HUHU 通过证据。
7. 原型 REVIEW 的接续已更新到最终 Tickets；批准 DESIGN、源码块、final、同源 A 地址、bindings 与确认快照均保持字节，避免对齐文档时使批准失效。

## 全 change 对齐范围

| 文件/范围 | 对齐结果 |
| --- | --- |
| README.md | 最新 T 授权/交付、工件入口、current 工作区选择、未开始 I、技术门禁 |
| spec.md | 55 AC 保持；授权范围含 Tickets；现行/旧编号区分；参考、实施责任与 Ready 边界 |
| ARCHITECTURE.md | 六领域/分层/单 Runner 保持；引用模型/SQLite/凭证/协作机制，补写入 owner 与受管凭证登记解释 |
| ADR.md | 保留 012/015 superseded；新增 accepted ADR-026 承接用户“先研究再实现”要求 |
| CONTEXT-MAP.md、CONTEXT.md、context/ 五文件 | 术语不变；领域→行为票→UI 消费者与相关 REF 对应，跨域协调不形成新权威库 |
| DESIGN.md | revision 2 的全部页面/交互不改；真实批准、正式基线与摘要校验通过 |
| design-tree.json | 28 个既有 answered 节点保持；T 的工程纪律来自 LOG-042/ADR-026，不造新产品选择 |
| source.md、inputs/ 两原始文件 | 原请求/历史捕获与 93844 字节原文保持，最新授权只追加 LOG |
| learning/01 | 历史学习原文保持；README/Spec/学习索引明确单助手/人工记忆取舍已被后续用户决定替代 |
| learning/02、learning/index | 当前说明改为 final 唯一界面；新参考审计和最终计划有入口，原源码证据保持 |
| prototypes/UI-001/design-system.md、bindings.json、confirmation-final.md | 未变；三源码块、唯一 candidate-a、approved 与 browser pending 各自含义一致 |
| prototypes/UI-001/final/、comparison/ | 未变；唯一产品界面、旧 A 同源投影，没有恢复候选 B/C |
| prototypes/UI-001/REVIEW.md | 增加最终票据接续；技术检查仍按用户自验安排，P 规则路径规范化 |
| prototypes/UI-001/evidence/ | 历史与固化证据保留；它们没有浏览器通过记录，本次不覆写成新观察 |
| ticket/01–28、tickets-map.md | 新完整计划；来源/步骤/AC/验证/Skill/路径/资源/停止和恢复全覆盖 |
| IMPLEMENTATION-REFERENCES.md、evidence/reference-audit.json | 新固定开源参考、依赖/限制/许可/活动和后续检索要求 |
| LOG.md | 追加 042–044，保留原问答/研究/确认时序 |
| evidence/ 本轮检查文件 | 仅记录真实规划检查、摘要与门禁，不创建虚假的 T-01–28 完成 Evidence |

逐文件摘要、是否改动与分类见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/document-alignment.json</Path>。历史材料保留当时事实，通过明确时序/替代关系消除与现行合同的歧义，不篡改用户原件来让检查变绿。

## 实际检查

| 检查 | 结果 | 可回读记录 |
| --- | --- | --- |
| 全票 plan/bindings、AC、DAG、owner、写集、批准设计与保护文件摘要 | pass，0 errors | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/tickets-structure-check.json</Path> |
| G 工件 stage | 0 errors / 0 warnings | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/tickets-checks.json</Path> |
| T 工件 stage | 2 个既有原型就绪错误 / 0 warnings；无 Ticket 结构错误 | 同上 |
| ticket-control | frontier 为空；28 票受源门禁/未执行依赖/未指派 owner 约束；无全局结构错误 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/ticket-control.json</Path> |
| pnpm test:docs | 未通过；仅原附件既有 6 处目录锚点错误，无新增文档链接错误 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/docs-check.json</Path> |
| git diff --check 与本轮新增行空白检查 | pass；Git 只涵盖跟踪差异，另比对本 change 新增/修改行；历史引文的两行 `> ` 保留 | 逐文件审计中的 whitespace_errors / pre_existing_whitespace |
| 产品 build/单测/模型/浏览器/OS smoke | 本轮未运行 | 纯规划；实施时按各 Ticket 验收 |

标准校验与控制器在本环境的失败进程回执为 126；输出明确列出上述问题，未把非零退出写成通过。ticket-control 将两个共同 P 门禁附到每张票，重复诊断不表示出现 56 个独立新问题。

原型门禁来自 <Path>{roots.workflows}/specdev/specdev-p-prototype/SKILL.md</Path> 第 6 步：“设计绑定、批准、浏览器证据与源码全门通过后才设置 ready”。用户 LOG-040 已满足设计批准；本轮没有新增浏览器观察，因此不能自动解除技术门禁。最终 Ticket 规划已完整交付，门禁限制的是后续实施派单。

原附件锚点为 9/12/14/15/17/19 节目录链接（完整错误见 docs-check.json）。原件 SHA-256 仍为 `a85a57648a00942a44c3df89c52804d13d129e7e31262a73feb91ccc7f1516cc`，与 temp 原件一致。

## 接续

先由 P 原 owner 依据真实浏览器反馈补证并检查 ready，再由 S 重验源 Spec；已有 final 选择无需重问。后续 LOG-045 已要求并生成 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/goal-plan.md</Path>；取得实施授权后由 I 按其 Gate 和 Map 进入同一工作区。Goal 规划还修正 T-27 的开始条件，最新 Map 为 revision 2；本报告其余结果保留 T 发布时的核验时点，最新结果见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/goal-planning-validation.md</Path>。未完成的是实际产品实现与未来验收，本轮没有把它们计作当前交付或已完成工作。
