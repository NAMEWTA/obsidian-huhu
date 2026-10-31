# HUHU Bot：唯一界面、完整规格、实施票与 Goal Plan

Outcome: active

2026-10-28 已按当前源码开展全量复审并修复实现缺口；现行核对、55 AC 映射与实际验证见[全量代码复审与修复](evidence/review-2026-10-28/report.md)。下文 Map/Goal 的执行时点属于 2026-10-25 历史，不代表当前源码已通过全部真实模型/宿主/平台验收。

用户在 LOG-040 明确确认 UI-001/final，并要求只保留这一套元素。现行设计已收敛为唯一 final，DESIGN revision 2 记录用户批准；Spec、ADR、架构和设计树同步此选择。用户无需重新选择方案。

Spec 的业务与接口合同已完整编写。真实浏览器已测出并修复交互问题，补测记录在 UI-001/evidence；新摘要的批准关系仍单独维护。按 LOG-051，完整产品进入代码实现；历史 P/Spec/Goal 的 draft/false 不冒充形式 Ready，也不阻塞已授权代码工作。

当前交付边界以 LOG-051 的最新 Goal 为准：完成全部 P1 代码、适用代码层检查和独立代码审查；真实模型、Obsidian 界面及用户环境的实际操作由用户后续验收。原产品行为/AC 不删减，未运行项如实记录且不阻塞本轮代码交付。

## 唯一界面入口

直接打开 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/final/index.html</Path>。复制整个 final 目录即可离线使用，字体、样式和脚本均在其中。顶部示例场景工具条仅用于原型检查，不进入正式产品。

左侧为 Bot 与群聊目录，主区以对话为中心，协作任务和审批内联展示，详细任务通过独立页面展开；保留 Bot 设置、记忆、资料权限与本机数据管理。其他候选及其专用脚本/样式已删除。

原 comparison 路径仅兼容此前链接：入口指向同一 final，原 A 地址是 final 的同源生成投影，不再拥有独立设计。它不用于继续比较或选择方案。

## 工件导航与权威

| 工件 | 当前用途 |
| --- | --- |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path> | 28 张完整实施票、DAG、55 AC 主责/接缝、共享写集与恢复入口；票级状态回读原票 |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/goal-plan.md</Path> | 完整单 change 执行图、Wave/Gate、Agent Team 与实现/独立 review 模型偏好；当前 run，按 LOG-051 开展代码实现 |
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

28 张票与 55 AC 已规划。原型真实技术复测 repair-2 已通过：70 场景、308 断言，无 JS 错误和水平溢出；旧失败记录保留。技术修复新摘要没有冒用原人类确认。按 LOG-051，现行工作是完整代码实现与自动化/独立审查，不再以真实操作验收阻塞开发。

用户后续提出具体调整时，只核对受影响部分。Tickets 与 Goal 计划已获用户明确授权并完成；本线程 LOG-047 已授权产品代码全面实现、必要验证与团队编排；提交、推送、发布或归档未请求。原件既有 6 处目录锚点错误仍单独记入检查报告，原文件保持不改。

Map22/Goal21：T16与底座代码门及G1已接纳；开启T08 Chat协议实现及原T01默认装配/依赖、T02元数据Probe、T12真实HTTP预算必要维护。T27稍后仅接实际许可闭包，全部发行资产仍最终重建。28票55AC与原DAG不变，真实模型/Obsidian/目标OS由用户后验。

## 工作区选择与执行边界

规划选定 `workspace_policy: current`，复用当前项目 checkout `/home/wta/orca/workspaces/obsidian-huhu/bot`；所有后续票据共用，串并行不新建 worktree。当前按 LOG-047/049 执行 I；本次真实工作区在下方 `Execution Context` 登记；所有执行者复用该上下文。

Map 的 ready 表示合同完整；实际开工按 LOG-051 的代码交付边界、原 DAG、唯一 owner 与写集控制。P 新摘要的形式批准仍单独待用户，不伪造 Ready，也不再阻断用户明确要求先完成的代码工作。Go foundation、TS client 与 build integration 已通过原生 Agent Team 派遣；真实身份和固定 TASK/REPORT 在 sessions/20261025T043239Z。


<a id="execution-context"></a>
## Execution Context

```json
{
  "schema_version": 1,
  "change": "2026-10-25-huhu-bot-architecture",
  "workspace_policy": "current",
  "workspace_ref": "current",
  "branch": "NAMEWTA/bot",
  "base_sha": "33c21e098ef3188cbab5a09f3e0a01fadb787715",
  "owner": "/root",
  "ticket_execution": "auto"
}
```

本线程 LOG-047 授权全面实施；初始 git status 干净。原型技术复测与依赖探针已完成；产品代码按真实检查与独立审查推进，未把现场操作验收标通过。

## 当前执行入口（LOG-051）

本线程继续全部28票55AC的代码交付；当前跨票调度与门见[Goal](goal-plan.md)，单票状态和实际验收以[tickets-map](tickets-map.md)指向的原Ticket/Evidence为准，避免在README复制过期任务进度。用户真实模型、Obsidian与目标OS操作由其后验；未授权提交、推送、发布或归档。
