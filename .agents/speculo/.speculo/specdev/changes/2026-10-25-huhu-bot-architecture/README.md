# HUHU Bot：唯一界面、完整规格、实施票与 Goal Plan

Outcome: active

用户在 LOG-040 明确确认 UI-001/final，并要求只保留这一套元素。现行设计已收敛为唯一 final，DESIGN revision 2 记录用户批准；Spec、ADR、架构和设计树同步此选择。用户无需重新选择方案。

Spec 的业务与接口合同已完整编写；P 的浏览器技术记录仍未提供，因此 UI-001 保留 blocked、Spec 保留 draft / ready_for_tickets:false。这里的技术状态不撤销已取得的设计确认，也不表示产品已经实现。

## 唯一界面入口

直接打开 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/final/index.html</Path>。复制整个 final 目录即可离线使用，字体、样式和脚本均在其中。顶部示例场景工具条仅用于原型检查，不进入正式产品。

左侧为 Bot 与群聊目录，主区以对话为中心，协作任务和审批内联展示，详细任务通过独立页面展开；保留 Bot 设置、记忆、资料权限与本机数据管理。其他候选及其专用脚本/样式已删除。

原 comparison 路径仅兼容此前链接：入口指向同一 final，原 A 地址是 final 的同源生成投影，不再拥有独立设计。它不用于继续比较或选择方案。

## 工件导航与权威

| 工件 | 当前用途 |
| --- | --- |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path> | 28 张完整实施票、DAG、55 AC 主责/接缝、共享写集与恢复入口；票级状态回读原票 |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/goal-plan.md</Path> | 完整单 change 执行图、Wave/Gate、Agent Team 与实现/独立 review 模型偏好；当前 plan，未启动实施 |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/goal-planning-validation.md</Path> | Goal 结构、依赖修正、授权/团队边界与实际门禁校验结果 |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path> | 9 个近两年活跃且许可明确的仓库，固定源码、依赖、限制和采用判断 |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/tickets-planning-validation.md</Path> | 本轮计划质量审查、全文件对齐、结构校验与技术缺口 |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path> | 55 条 AC、9 个验证接缝；外部行为、接口、状态与验收唯一合同 |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/DESIGN.md</Path> | 已确认的 revision 2；六页面、交互、状态与响应式合同 |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path> | 领域/应用/适配层、统一出口、Go Runner、数据与未来 Web |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ADR.md</Path> | 26 条决策；012/015 已替代，025 固定唯一界面，026 固定先研究再实现 |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/CONTEXT-MAP.md</Path> | assistant/conversation/execution/access/memory/collaboration 领域边界 |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/design-system.md</Path> | 项目来源、唯一方案、三个具名源码块与技术边界 |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/confirmation-final.md</Path> | 用户确认原文、授权清理范围及固化摘要；本次批准的不可变快照 |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/bindings.json</Path> | DESIGN/正式基线/原型/final/确认记录的机器可核对绑定 |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/REVIEW.md</Path> | 已确认事项、原型使用方式及后续技术检查范围 |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/evidence/finalization-validation.md</Path> | 本次固化的实际检查和剩余技术证据缺口 |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/learning/index.md</Path> | 原架构学习与 Hana/OpenBot/OpenClaw/DeepSeek-Bot 协作机制研究 |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/LOG.md</Path> | 原始问答、选择变更、研究和验证记录 |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/design-tree.json</Path> | 28 个已回答节点；D-012 对应唯一 final 确认，其他访谈回答保持来源 |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/source.md</Path> | 原始请求与附件捕获 |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/inputs/HUHU-Bot_架构审核与工程设计规范_v1.1.md</Path> | 保持原始字节的输入副本 |

## 现行合同

- P1 包含多 Bot、单聊/群聊、协调者、已有 Bot 发现/通信/派遣、临时 sub-agent 与受控再委派；同一个 Agent 引擎承载所有执行。
- 各 Bot 短期与长期记忆独立，私有长期记忆自动维护；全局新增/修改/删除由用户确认。
- 三种模型协议均为首版必验；默认只用明确附加资料，扩大范围另授；崩溃核查通过后由用户继续；未知效果允许删正文并暂留最小安全记录。
- UI 继承现有 HUHU，未来 Web 共用 Go 应用服务；P1 不启动 Web 网络入口。细则与例外以 Spec 为准。

## 基线与历史材料

本次核对后固定引用已发布的 <Path>{roots.state}/specdev/design/revisions/DESIGN-0001.md</Path>。此前本包未发布的同名候选已经移除，正式基线没有被覆盖或重新发布。Bot 页面特有规则只属于本 change。

LOG-029 的早期共识、LOG-031 的 UI 后置安排、旧单助手/人工记忆范围，以及 LOG-038/039 的多方案与确认前检查，均保留为历史；现行决定由 LOG-032–035、040 和最新 Spec/DESIGN 给出。历史 static-validation.md 的旧摘要不用于本版本校验。原输入与学习 01 保留来源，不篡改为现行实现事实。

## 当前状态与接续

本轮已完成 LOG-042 的 28 张最终实施票、55 AC 覆盖、9 个开源项目核验，以及 LOG-045 的完整 Goal Plan 和现行文档对齐，不再索取同一设计批准。尚未提供浏览器环境、视口、交互矩阵和截图等可复核技术材料，不能凭用户选择生成虚假 browser.json；补齐后运行 P/S 就绪检查。

用户后续提出具体调整时，只核对受影响部分。Tickets 与 Goal 计划已获用户明确授权并完成；产品代码实现、提交、推送、发布或归档仍未授权/执行。原件既有 6 处目录锚点错误仍单独记入检查报告，原文件保持不改。

当前代码基线为 66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93；规划中的 native/huhubot、src/modules/huhubot、contracts/hap 尚未实现。本轮仅写本 change，外部 .gitignore、AGENTS.md 和其他 change 的变更保持原状。

## 工作区选择与执行边界

规划选定 `workspace_policy: current`，复用当前项目 checkout `/home/wta/projects/obsidian-huhu`；所有后续票据共用，串并行不新建 worktree。当前仅做 T/P 规划，不伪造 I 的 Execution Context 或 Workspace Execution Record；真正开始实现时由 Lead 在本 README 的 `Execution Context` 保存真实 base/branch/owner 和快照。

Map 的 ready 表示规划合同结构完整；非 UI 票的合同 ready 不能绕过 Spec 尚未 Ready。UI 相关票保留浏览器证据阻塞，控制器当前不提供可派单 frontier。后续补技术证据后重验 P/S/T 并按实际实现授权推进；不再次要求用户选择 final。跨票总控已落到 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/goal-plan.md</Path>：允许 Agent Team，优先采用用户指定的实现/独立 review 模型；Gate、模型选择与恢复细则以该计划为准。当前未启动 runtime Goal、团队派遣或产品实现。
