# LOG: 2026-11-05-frontend-uiux-redesign

round 1 收录用户本次激活指令（2026-11-05）与用户提供的交付包（`source/`，原位于本地 `.orca/drops/`），并以 AskUserQuestion 询问 D-006–D-008；round 2 用户确认共识。交付包里的重复副本已去重，去重依据见 README「来源」。

## LOG-001 — 2026-11-05T04:05Z — 重构范围与兼容策略
- **设计树节点：** D-001
- **轮次与依赖：** round 1 / 无
- **状态：** confirmed
- **问题：** 前端重构是否保留旧 UI、旧 UI 状态读取、旧样式或双轨切换？
- **事实与来源：** 用户指令“需要对当前的整个 UI/UX 的前端的组件、CSS、布局、排版、像素等进行全面的重构修改……无需和当前有任何的兼容性，是彻底的对前端的重构”；`source/Frontend_Refactor_Plan.md.txt` §9 无兼容重构与删除清单。
- **选项：** 彻底替换；分期双轨。
- **推荐：** 彻底替换；领域服务、文件事务、数据根、密文仓库不因视觉改版改写。
- **结论：** 前端组件、CSS、布局、UI 状态 schema 一次替换，不建旧 UI 适配层、旧 CSS 回退、旧 UI 状态读取回退或特性开关；领域服务按原 owner 保留。
- **原因：** 用户明确要求；双轨会让两套视觉长期共存。
- **影响工件：** ADR-001 / DESIGN / Spec
- **约束或不变量：** 不静默清空 `huhu/`、`.huhu/` 或保险箱；需要重置真实数据时另行授权。
- **后续：** S 把删除清单写成可验收条目。
- **替代/被替代：** 无

## LOG-002 — 2026-11-05T04:05Z — 工作台定位与骨架
- **设计树节点：** D-002
- **轮次与依赖：** round 1 / D-001
- **状态：** confirmed
- **问题：** 重构后的工作台采用什么信息架构骨架？
- **事实与来源：** 用户指令“以我当前的整体工作台的定位进行全面的重构优化”；`source/Frontend_Refactor_Plan.md.txt` §1、§4.1；永久 DESIGN-0002 DS-001；`src/shell/`（rail、panel、page、status-bar）。
- **选项：** 保持图标轨 + 二级栏 + 主区 + 右详情；改为单栏命令式。
- **推荐：** 保持四区骨架，详情按需出现，按所属叶子宽度重排。
- **结论：** 图标轨 + 按模块二级栏 + 主区 + 按需右详情；状态显示归 Obsidian 状态栏；笔记、导航器、批注沿用宿主叶子。
- **原因：** 与现有定位一致，交付包已论证。
- **影响工件：** DESIGN / Spec
- **约束或不变量：** 无二级导航的页面不留空白占位栏。
- **后续：** 无
- **替代/被替代：** 无

## LOG-003 — 2026-11-05T04:05Z — 技术栈与复用边界
- **设计树节点：** D-003
- **轮次与依赖：** round 1 / D-001
- **状态：** confirmed
- **问题：** 重构使用什么技术栈，允许引入哪些新依赖？
- **事实与来源：** `package.json`（react 19.2.8、radix-ui 1.6.7、@headless-tree 1.7.0、@tanstack/react-virtual 3.14.13、lucide-react 0.577.0、cmdk 1.1.1、sonner 2.0.7、react-grid-layout 2.2.4、react-resizable-panels 3.0.6、tailwind-merge 3.7.0、cva 0.7.1）；`src/ui/components/`；`source/Reuse_Research.md.txt` §2、§4；DayPicker v10 升级说明 https://daypicker.dev/upgrading 。
- **选项：** 沿用现有栈 + DayPicker；改用 React Aria；引入第二套 UI 库。
- **推荐：** 沿用现有栈，日期只新增 `@daypicker/react` 10.x。
- **结论：** 技术栈沿用；`src/ui` 是唯一组件来源；日期 DayPicker v10 + 现有 Popover；不引入第二套 UI 库、CSS-in-JS 或全局 reset。
- **原因：** 现有栈覆盖需求；交付包已比较替代方案。
- **影响工件：** ADR-002 / DESIGN
- **约束或不变量：** 原型里离线嵌入的 Air Datepicker 3.6.0 只用于原型，不进入生产。
- **后续：** 实施时锁定 DayPicker 补丁版本与许可证。
- **替代/被替代：** 无

## LOG-004 — 2026-11-05T04:05Z — 四项重点交互
- **设计树节点：** D-004
- **轮次与依赖：** round 1 / D-002, D-003
- **状态：** confirmed
- **问题：** 日期、自动化详情、档案目录、任务完成态采用什么交互合同？
- **事实与来源：** `source/Frontend_Refactor_Plan.md.txt` §5；`source/v12-verification.md.txt`；`src/modules/automations/ui/AutomationsPage.tsx`（详情替换列表）；`src/ui/components/huhu/calendar/TaskRow.tsx`（已有删除线）。
- **选项：** 按交付包合同；保留自动化独立详情页。
- **推荐：** 按交付包合同。
- **结论：** 统一 DateField/DateRangeField/DateTimeField；自动化列表保留、右侧详情、Switch 启停、失败回滚；档案类型→记录树、展开与选择分离；完成任务的标题与说明划删除线。
- **原因：** 用户提供的交付包已定义并验证。
- **影响工件：** ADR-003 / DESIGN
- **约束或不变量：** 现有 shell 规则里“自动化详情为独立页面”被本 change 取代。
- **后续：** 无
- **替代/被替代：** 无

## LOG-005 — 2026-11-05T04:05Z — 原型交付形式
- **设计树节点：** D-005
- **轮次与依赖：** round 1 / 无
- **状态：** confirmed
- **问题：** 原型给几个候选方向？
- **事实与来源：** 用户指令“关于原型这个 SKILL 的，你这次直接给终版就行，不需要再给我对比了”。
- **选项：** 1 个终版；默认 3 个候选。
- **推荐：** 1 个终版。
- **结论：** 原型包 `candidate_count_override.count = 1`。
- **原因：** 用户明确数量覆盖默认值。
- **影响工件：** prototypes/UI-001
- **约束或不变量：** 仍需集中确认终版 HTML 与 change DESIGN。
- **后续：** 无
- **替代/被替代：** 无

## LOG-006 — 2026-11-05T04:12Z — 主题与配色归属
- **设计树节点：** D-006
- **轮次与依赖：** round 1 / D-001
- **状态：** confirmed
- **问题：** 工作台颜色由 HUHU 自有主题决定，还是完全跟随 Obsidian 主题变量？
- **事实与来源：** DESIGN-0002 DS-002（颜色跟随 Obsidian 语义 token）；`src/ui/styles/tokens.css` 映射 `--background-primary` 等宿主变量；`src/theme/styles/presets.css` 已有 HUHU 预设。用户选择“HUHU 自有主题为主 (Recommended)”。
- **选项：** HUHU 为主 + 可选跟随；完全跟随；HUHU 独占。
- **推荐：** HUHU 为主 + 可选跟随。
- **结论：** HUHU 维护一套语义 token 和精调的浅/深主题，默认生效；外观设置提供“跟随 Obsidian”模式，此时语义 token 改为映射宿主变量。
- **原因：** 观感稳定、可控；同时照顾重度定制 Obsidian 主题的用户。
- **影响工件：** ADR-004 / DESIGN（取代 DS-002）
- **约束或不变量：** 两种模式下组件只消费语义 token；笔记正文编辑器的字体与配色偏好不被覆盖。
- **后续：** 归档时由 A 评估把新 token 体系发布为新永久基线。
- **替代/被替代：** 取代 DESIGN-0002 DS-002（待 A 网关处理）

## LOG-007 — 2026-11-05T04:12Z — 默认审美基调
- **设计树节点：** D-007
- **轮次与依赖：** round 1 / D-006
- **状态：** confirmed
- **问题：** 默认主题采用哪种视觉气质？
- **事实与来源：** 用户选择“暖中性·纸感 (Recommended)”。
- **选项：** 暖中性·纸感；冷静·专业工具感；柔和·温润。
- **推荐：** 暖中性·纸感。
- **结论：** 默认浅色“纸”与深色“墨”两套主题，暖中性层级、深墨文字、单一强调色（默认墨青）、细线分隔、低阴影；用户可切换强调色与深浅色。
- **原因：** 契合笔记与个人工作台的长时间使用。
- **影响工件：** DESIGN
- **约束或不变量：** 具体色值、强调色组、圆角、动效由原型确定，在终版一次性确认。
- **后续：** 无
- **替代/被替代：** 无

## LOG-008 — 2026-11-05T04:12Z — 原型覆盖深度
- **设计树节点：** D-008
- **轮次与依赖：** round 1 / D-002
- **状态：** confirmed
- **问题：** 终版原型覆盖哪些模块、做到多深？
- **事实与来源：** `src/modules/`（agent、archives、automations、comments、health、home、icons、navigator、notifications、safe、task、versioning）与 `src/app/settings/`。用户选择“全模块可操作 (Recommended)”。
- **选项：** 全模块可操作；核心页面高保真；全模块深度交互。
- **推荐：** 全模块可操作。
- **结论：** 12 个模块和设置都有完整页面与主要状态；首页、任务、档案、自动化、智能体、设置外观做深度交互。
- **原因：** 体量与价值平衡。
- **影响工件：** DESIGN / prototypes/UI-001
- **约束或不变量：** 原型使用演示数据，不证明真实服务与宿主行为。
- **后续：** 无
- **替代/被替代：** 无

## LOG-009 — 2026-11-05T04:14Z — 共识确认
- **设计树节点：** 不适用
- **轮次与依赖：** round 2 / D-001–D-008
- **状态：** confirmed
- **问题：** 设计树是否全部走完、达成共识？
- **事实与来源：** 用户以 AskUserQuestion 选择“达成共识，开始做原型”。
- **选项：** 达成共识；还有遗漏。
- **推荐：** 不适用
- **结论：** design-tree 标记 consensus，进入 P 原型。
- **原因：** frontier 为空，用户确认。
- **影响工件：** design-tree.json
- **约束或不变量：** 无
- **后续：** P 产出 UI-001 终版后集中确认。
- **替代/被替代：** 无

## LOG-010 — 2026-11-05T06:20Z — UI-001 集中确认
- **设计树节点：** 不适用
- **轮次与依赖：** 不适用 / D-001–D-008
- **状态：** confirmed
- **问题：** 是否批准 UI-001 终版与 change DESIGN revision 1？
- **事实与来源：** 用户以 AskUserQuestion 选择“确认批准，继续 (Recommended)”；批准快照 `prototypes/UI-001/approval.md`。
- **选项：** 确认批准；暂不批准先出草案。
- **推荐：** 确认批准。
- **结论：** DESIGN revision 1 approved（designDigest 488fd941e43883038913afbcc0fce5717cff8bfb57e1b514c62b3458fbb51193），UI-001 ready。
- **原因：** 用户确认。
- **影响工件：** DESIGN / prototypes/UI-001 / Spec / Ticket
- **约束或不变量：** 永久基线不在本次发布，归档时由 A 评估。
- **后续：** 进入 S、T、Goal Plan。
- **替代/被替代：** 无


## LOG-011：全面复审与 UI 技能票（2026-11-05）

用户要求进一步审查整个前端重构方案，并新增一张 `.agents/skills/ui` 重构票。检查全部原票、设计/规格、真实前端入口/领域合同、官方依赖资料与终版原型。结论见 `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/report-design-audit.md</Path>`：实施就绪审查不通过，15 项发现；原批准与源包不改写，Spec/Map/Goal/票据回退待修订。

新增 T-15，AC-124 专责 UI 技能及全部 references，接在 T-13 后、T-14 前。T-13 移除该目录写权限；T-14 使用新绑定。未实施产品和技能、未安装依赖、未提交/推送/发布。原 LOG-010 是其原字节批准的历史记录，不代表本次发现已解决。


## LOG-012 · 用户授权直接落实审查修订

- 日期：2026-11-05。
- 用户原话：“你直接帮我修改，按你最新的进行修改就好了”。
- 本次动作：直接修改当前 change 的 DESIGN、Spec、原型与 15 张票/编排；补齐全前端覆盖、实际领域边界、稳定技术栈、验证与 UI 技能票。
- 范围：设计/规划交付，不执行未来票据的生产重构；不提交/推送/发版。UI-001 原批准保持原字节，revision 1 快照保存于其包内；UI-002 是本轮修订，不复用旧摘要确认。
- 当前证据：evidence/report-design-revision.md；后续具体 UI-002 确认记录须绑定实际新摘要。


## LOG-013 — 2026-11-05T09:00Z — Git 差异采用 diffs.com 技术栈
- **设计树节点：** D-010
- **轮次与依赖：** round 4 / D-003、D-009
- **状态：** confirmed
- **问题：** 版本页的 Git 差异与历史比较用什么实现？
- **事实与来源：** 用户原话：“关于 git 部分的对比，请你学习使用 https://diffs.com/docs 这个 diff 技术栈，展现出更好的 git diff 的对比历史选择效果。”已核对 diffs.com 文档与 npm `@pierre/diffs` 1.6.4 发布包（Apache-2.0，React 19 peer，类型定义含 MultiFileDiff/FileDiff/PatchDiff/CodeView/UnresolvedFile/Virtualizer/WorkerPool、`diffAcceptRejectHunk`、`--diffs-*` 变量）。现状：`src/modules/versioning/ui/diff-editors.ts` 基于 `@codemirror/merge`，自写折叠、改动块标记与 Worker。
- **选项：** 沿用 CodeMirror merge；`@git-diff-view/react`；`react-diff-view`；`diff2html`；`react-diff-viewer-continued`；`@pierre/diffs`。
- **推荐：** `@pierre/diffs`。
- **结论：** 采用 `@pierre/diffs`（ADR-006）。版本/Git 从 T-10 拆为 T-16；UI-002 原型重做更改/提交历史/A⇄B 比较/笔记历史的差异视图。
- **原因：** 用户指定；能力完整，可替代自写实现；许可与维护活跃度满足复用合同。
- **影响工件：** DESIGN revision 3（§2、§3.7、§5、§6、§7、§8）/ UI-002 / ADR-006 / Spec AC-096–AC-099 / T-10、T-16 / reuse-decision / frontend-coverage
- **约束或不变量：** Git 语义、恢复回执与数据格式不变；Shiki 只打包语言白名单；启动闭包不含差异引擎。
- **后续：** 进入整体确认。
- **替代/被替代：** 部分替代 ADR-005 中“差异沿用 CodeMirror merge”。


## LOG-014 — 2026-11-05T09:10Z — 最终文档整体确认与 Ready
- **设计树节点：** 不适用
- **轮次与依赖：** 不适用 / D-001–D-010
- **状态：** confirmed
- **问题：** 最终文档与原型是否可以进入开发？
- **事实与来源：** 用户原话：“针对我给出的最终的文档里的所有内容，再次进行确认，整体无问题，可进行开发，如对文档有问题，请你直接修改 有问题直接修改调整，直到所有的都是ready状态。”同一条消息还要求：增加 UI 技能票（已有 T-15，本轮前移到模块页面前）、采用 diffs.com 差异技术栈（LOG-013）。
- **选项：** 保持 draft 等待再次逐项确认；按授权直接修订后定稿为 Ready。
- **推荐：** 按授权修订后定稿。
- **结论：** 本轮修订后的 DESIGN revision 3 与 UI-002 视为用户确认的最终版，批准快照见 `prototypes/UI-002/approval.md`；Spec、16 张票、Map 与 Goal Plan 设为 Ready。复审结论见 `evidence/report-final-review.md`。
- **原因：** 用户明确授权“有问题直接修改调整，直到所有的都是 ready 状态”。
- **影响工件：** DESIGN / UI-002 / Spec / Ticket / Map / Goal Plan / README
- **约束或不变量：** 不授权生产实现、依赖安装、提交、推送或发版；永久基线归档时由 A 评估。
- **后续：** 等待用户授权实施（执行方式、人数、是否建分支）。
- **替代/被替代：** UI-002 取代 UI-001 作为当前批准原型；UI-001 与其 approval.md 保留为历史。
