# 高亮升级决策日志

## LOG-001 — 2026-10-26 — 来源约束与本次授权
- **设计树节点：** 不适用。
- **轮次与依赖：** 来源既定。
- **状态：** confirmed。
- **问题：** 本次交付和不可破坏的能力是什么？
- **事实与来源：** source.md；用户本轮明确 Triage → Grill → Spec → Prototype，并指定只给一个最佳设计。
- **结论：** 形成 change 本地文档与单一可交互离线原型；沿用既有批注模块、非侵入式 sidecar、行/选区锚点、旧讨论/作者/解决/重挂和恢复能力。生产源码暂不修改。
- **原因：** Issue 明确是现有能力升级，原始正文明确暂不改源码。
- **影响工件：** CONTEXT、ADR、Spec、DESIGN。
- **约束或不变量：** 不把颜色当状态，不把已有首消息改写或抹去；不引入竞争数据真源；P2 后续独立评估。
- **后续：** Grill 回答未定行为；最终原型与设计合同另作集中确认。

## LOG-002 — 2026-10-26 — 代码事实与可验证边界
- **设计树节点：** 不适用。
- **状态：** confirmed（代码事实）。
- **事实与来源：** HEAD 33c21e098ef3188cbab5a09f3e0a01fadb787715；独立探索者 /root/comments_facts 只读核验，root 回读 core/store.ts normalizeThread、services/comments.ts persistOnce、core/anchor.ts locateAnchor/selectionIsCommentable、editor/decorations.ts segments 与 ui/navigation.ts。
- **结论：** 旧归一化拒绝零消息；服务的去重回执也依赖消息。pending 串行恢复、renamePath、close drain 与 App 级 handoff 可复用。v1 当前只提示/不读取覆盖，隔离损坏文件不等于迁移备份。
- **锚点缺口：** 缓存同文本可直接命中；同分候选可按 lineHint 距离选一个。因此“复用锚点”必须补歧义拒绝，不能视为已有不误挂保证。
- **渲染与定位缺口：** 编辑分段逐段 filter 全范围；阅读逐线程重查与 DOM 包裹；navigation 强制 source、设置选区并 focus。没有多色统一规则或阅读模式创建映射合同。
- **调用方：** COMMENTS_PANEL 的实际外部消费者为 src/app/workbench/comments-leaf.ts；COMMENTS_INDEX 本次未查到外部消费，不因此删除 API。设置/命令/布局需保留 comments、huhu-comments-view 等稳定 ID。
- **验证：** pnpm exec vitest run src/modules/comments src/app/workbench/comments-leaf.dom.test.tsx src/app/settings/nav.test.ts，退出 0，8 files / 58 tests passed。pnpm 自动补齐缓存，受跟踪依赖清单/锁文件未变。
- **限制：** 以上是现有基线，不是目标功能验收；没有真实 Obsidian/移动端/弹出窗口运行证据。
- **影响工件：** triage.md 实施简报、Spec 验证接缝与风险。

## LOG-003 — 2026-10-26 — HiLighter 交互研究与适配
- **设计树节点：** D-002、D-003 的依据，不是回答。
- **状态：** confirmed（研究事实；设计采用仍待确认）。
- **研究身份：** caller=specdev/grill-with-docs；target=本 LOG；decision=如何借鉴现有高亮交互而保留 HUHU 的存储和模块边界。
- **范围与停止条件：** 查清划词工具条、卡片、颜色、定位、排序、维护/依赖/许可及截图；证据足以给出单一推荐，不执行外部代码。
- **版本：** PandoraReads/HiLighter 2.6.2，commit 8d4af89890e69d627d89c251022b8b787926cd83；2026-10-26 查证，最近提交为同日，满足近两年活跃要求。
- **R-001 / 工具条：** [selection-menu.ts](https://github.com/PandoraReads/HiLighter/blob/8d4af89890e69d627d89c251022b8b787926cd83/src/selection/selection-menu.ts) 以颜色操作直接创建，笔记为独立入口；自定义颜色不在划词浮层创建。借鉴入口层级；HUHU 使用语义按钮、键盘与 IME 合同，不照搬 div 触点。
- **R-002 / 卡片语义：** [models.ts](https://github.com/PandoraReads/HiLighter/blob/8d4af89890e69d627d89c251022b8b787926cd83/src/models.ts) 将摘录、color、note、sourcePath、tags 等组成卡片。[侧栏截图](https://github.com/PandoraReads/HiLighter/blob/8d4af89890e69d627d89c251022b8b787926cd83/screenshots/screenshot1.png) 已实际查看，采用原文与右侧卡片并排、颜色边线与笔记摘要的关系；[Studio 截图](https://github.com/PandoraReads/HiLighter/blob/8d4af89890e69d627d89c251022b8b787926cd83/screenshots/card-studio.png) 已查看，仅参考卡片内容层级，不据此新增 HUHU 工作台页面。
- **R-003 / 定位：** [locate.ts](https://github.com/PandoraReads/HiLighter/blob/8d4af89890e69d627d89c251022b8b787926cd83/src/locate.ts) 通过 scrollIntoView 避免主动改光标；该实现依赖原文 mark ID 且回退行号。采用低扰动滚动意图，HUHU 先校验 sidecar 锚点，不采用无证据的行号回退。
- **R-004 / 颜色：** [colors.ts](https://github.com/PandoraReads/HiLighter/blob/8d4af89890e69d627d89c251022b8b787926cd83/src/colors.ts) 四色使用稳定 ID，并分别定义深浅主题。采用语义 ID 与主题适配思想；不复制其 CSS !important 或 palette 数值，沿用 HUHU tokens。自定义色是否本次交付取决于 D-001。
- **R-005 / 排序风险：** [grouping.ts](https://github.com/PandoraReads/HiLighter/blob/8d4af89890e69d627d89c251022b8b787926cd83/src/studio/grouping.ts) 原文顺序首先按来源与行号，同一行回退创建时间；[Issue #3](https://github.com/PandoraReads/HiLighter/issues/3)、[Issue #2](https://github.com/PandoraReads/HiLighter/issues/2) 为用户报告的排序问题，不能视为已复现根因。HUHU 推荐按解析后的字符 start/end 排序，同位置再稳定 ID；不会复制行号粒度的排序限制。
- **R-006 / 存储差异：** [README Data Sync](https://github.com/PandoraReads/HiLighter/blob/8d4af89890e69d627d89c251022b8b787926cd83/README.md#-data-sync) 说明每设备 IndexedDB + vault sync 文件；[package.json](https://github.com/PandoraReads/HiLighter/blob/8d4af89890e69d627d89c251022b8b787926cd83/package.json) 包含 Dexie、epubjs、ts-fsrs、simple-mind-map 等。与 HUHU 已有唯一 sidecar 真源不同，本次不引入这些运行依赖。
- **R-007 / 许可不一致：** [LICENSE](https://github.com/PandoraReads/HiLighter/blob/8d4af89890e69d627d89c251022b8b787926cd83/LICENSE) 是 MIT、Copyright 2025 PandoraReads，但同 commit package.json 声明 0-BSD；仓库 API 识别 MIT。本次只借鉴交互与自行编写原型，不复制代码/截图素材进入交付。未来若复制源码，先澄清适用许可并保留完整署名，不把 package 声明当作无条件许可结论。
- **复用比较：** 保留 HUHU 可靠 sidecar/恢复与 React/Radix 集成，升级实体和交互；HiLighter 提供成熟的划词→卡片心智模型，但其 Markdown mark、IndexedDB、额外阅读器及 AI 依赖不适合当前边界。无需从零另造存储系统或并排新模块。
- **限制：** 上游截图和静态源码不证明 HUHU 运行表现；公开 Issue 仅作为风险线索。
- **影响工件：** ADR/Spec 的 REUSE、定位与排序约束；DESIGN 和设计包 sources 必须继承相关原始 URL。

## LOG-004 — 2026-10-26 — 第一轮完整 frontier
- **设计树节点：** D-001、D-002、D-003。
- **轮次与依赖：** round 1，无依赖。
- **状态：** deferred（等待用户回答，阻止对应合同 Ready）。
- **问题：** 首版范围、阅读模式创建与重叠语义。
- **推荐：** 见 design-tree.json recommendation；已通过异步问题工具向用户完整提出。
- **结论：** 暂无回答，不把推荐当用户决定。回答后每个节点分别追加 LOG。
- **后续：** 仅继续独立的来源、代码与现有设计证据整理；相关 Spec/UI 选择等待回答。

## LOG-005 — 2026-10-26 — 首版覆盖 P0 与 P1
- **设计树节点：** D-001；round 1。
- **状态：** confirmed。
- **问题：** 是否把 P1 留到后续？
- **来源：** 用户原话“1、无需后续，全部采用”，回答的是 P0 或 P0+P1 的范围问题。
- **结论：** 本次完整纳入 P0 与 P1，P2 仍按来源不作为当前 Markdown 交付范围。
- **影响工件：** Spec、模型短设计、DESIGN；必须补齐标签、批量、自定义色、导出、分组与检索，不仅画 P0。

## LOG-006 — 2026-10-26 — 不新增阅读模式创建
- **设计树节点：** D-002；round 1。
- **状态：** confirmed。
- **来源：** 用户原话“2、无需阅读模式”。
- **结论：** 本次不新增阅读模式划词入口，核心新建路径为源码/实时预览。根据 Issue 保留旧能力约束，已有阅读标记查看与管理继续兼容，不主动删除。
- **影响工件：** Spec 范围、AC 与设计状态；阅读模式不是新建验收目标。

## LOG-007 — 2026-10-26 — 同范围复用、交叠独立
- **设计树节点：** D-003；round 1。
- **状态：** confirmed。
- **来源：** 用户原话“3、确认采用”。
- **结论：** 完全同一解析选区复用原卡并换色；交叠/嵌套允许独立卡片。正文当前激活卡优先主色，否则最近创建优先，时间同值按稳定 ID；数量入口切换完整覆盖集合。
- **影响工件：** ADR、Spec、DESIGN、渲染接缝。
- **约束：** 原文顺序按字符位置；颜色优先级不改变卡片身份或内容。

## LOG-008 — 2026-10-26 — 第二轮 frontier 与具体推荐
- **设计树节点：** D-004、D-005；round 2，依赖 D-001。
- **状态：** deferred（等待确认，阻止 Spec Ready）。
- **事实与来源：** MODEL-DESIGN.md 已形成可回读的实体/迁移/管理短设计；LOG-002、LOG-003 为依据。
- **推荐：** 原生标记可选扫描后显式纳入，保持原文；自由笔记和旧讨论分开、取消笔记保留高亮、归档不清除高亮、校验备份与恢复日志、现有侧栏集中管理。
- **后续：** 用户确认后逐节点写 LOG，关闭 frontier 并确认本轮共识；再顺序执行 Spec 和 Prototype。
