# T15 只读预检回报

Session: 20261105T094057Z  
Task: 052-preflight-t15-ui-rules  
Status: completed  
结论：预检交付；没有实施 T15，没有宣布 T15 ready/start/done 或关闭 G-CONTRACT。

## 聚焦交接

已完整读取现有 UI 五文件、批准 DESIGN revision 3 / UI-002、T15/Map16/GoalPlan、复用决定与覆盖要求，并核对 T01–03 已验收生产源、T04 的 041 候选、050 评审和 051 修复任务。应用宿主 skill-creator 的维护方法，以及 dev/skill-maintenance 和 DocumentContract；仅写本报告和 /tmp/huhu-t15-preflight。没有改 Skill、源码、依赖、共享资产、正式状态或 Evidence，没有委派。

T04 仍在修复/验收中，因此本预检不能启动 T15。后续 T15 应以批准 DESIGN 为规范、已验收共享源码为可调用事实；对尚未迁移的消费者明确标注目标及责任票，不把候选或计划写成已实现 API。全部 16 票和全量替换范围保持；不新增兼容 UI 别名，也不删除业务 schema 字段。

### 现有五文件的替换边界

| 文件 | 应删除或改写的旧主张 | 应保留的独有约束及来源 |
|---|---|---|
| SKILL.md | 强制照抄 Orca/apex 布局、沿用宿主动效、旧自动化页内编辑器路线；旧主题和组件指引 | 精确触发/不触发条件；模块/ReactSurface 归属；真实语义控件、i18n 路由、每 Document 所有权；隐藏保留与卸载区分；按风险选验证，不能一律跑全部 UI 检查 |
| references/design-system.md | 宿主派生配色为唯一基础、body.huhu-themed / 旧 --nt-* 权威、旧 Button default/outline/link/destructive、旧圆角字号与层级值 | cn 合并和 className、data-slot、上游 MIT 署名；CSS 作用域、huhu-native/Markdown 排除；表单标签/帮助/错误和 IME；虚拟列表与树、溢出可达性。当前从 HU 语义值派生的 --background/--primary 等适配别名不能当旧兼容层一并删除 |
| references/shell.md | 旧 280/500 面板、44 header、旧 target/focus/panelOpen/panelWidth/lastTargets 存储；Orca 强制布局；旧首页/自动化组合 | 原生状态栏主窗口归属、窄宽不等于能力缺失；页面状态/取消/错误和会话不自动启动 CLI；专注入口回工作台；列表/选择菜单的领域行为和恢复；实际叶宽决定布局 |
| references/theme.md | 旧 UI preset/custom/SuliWorld、全局 body 接管 UI、旧 Forest 选中态、旧 UI 字体全局写法 | 笔记编辑器独立结构和 SuliWorld/GitHub、阅读/实时预览/源码范围；显式用户字体、编辑器对比度、预览安全和多文档清理。保留 docs/third-party 的原始许可/署名引用；editor scheme 的 follow/claude-code/eye-care/suliworld 仍有效，不能按关键词删掉 |
| references/motion-a11y.md | --anim-duration* 为 UI 权威、通用 3px 按钮焦点环等旧规则 | transform/opacity 动效、终端热路径不逐帧布局、busy 宽度与真实状态；ARIA/live region；composition/keyCode229；库键盘引擎及 Escape 所属层；逐文档监听清理、焦点回退和真实表面对比度 |

### 规则到真实生产者的映射

以下为后续写作路由，数值只以 DESIGN 与 tokens.css 一处为权威，不在每个参考重复整张表。

| 类别 / 批准依据 | 已核实生产路径、导出或令牌 | 验证接缝与边界 |
|---|---|---|
| 色板/来源，DESIGN §3.1、§7 | src/theme/settings.ts：system/paper/ink、六 accent、huhu/obsidian；runtime.ts：applyInterfaceTheme；src/ui/styles/tokens.css：--hu-* | T01 主题/对比度与 host 安全色对整体回退；system 只跟宿主明暗。HU 根属性不等于全局笔记主题 |
| 字体/类型/间距/尺寸/密度/图标，§3.2–3.4、§5 | tokens.css、ui/tailwind/index.css；fonts.generated.css 的嵌入 Geist/Geist Mono；theme/settings.ts 的 uiSize/density；Button/Badge 等真实 variants | T01/T02 样式、密度、CJK 最小字号、32/44 独立命中/无重叠接缝；图标尺寸/描边按批准令牌，不凭宿主默认值。theme/fonts/faces.json 与字体许可继续归原来源 |
| 基础组件与表单，§5 | ui/components/button.tsx：primary/secondary/ghost/danger/danger-ghost，sm/md/lg/icon-*，busy/asChild；badge.tsx：neutral/accent/success/warning/error；huhu/Notice、FormField、EmptyState、TaskContent、SettingsSection；SettingsSwitchRow/SegmentedControl | T02 原生 type、disabled、自定义 slotted button、busy 几何、表头 36/正文密度与 joined-target 回归；SegmentedControl 保留类型值和 Radix roving，不再造键盘引擎。文案仍由调用方 t() |
| 日期/时区，§5 日期族 | huhu/date/index.ts：Calendar/DateField/DateRangeField/DateTimeField、parseDate/validateDate/presetRange/todayDate 和类型；DateTime 必需 initialTimeZone、validateValue 领域端口及调用方翻译信息 | T03 已验收 strict parse/0–99 年、受控草稿/外部 reset、required/readOnly/disabled、IME、真实弹层命中/完整焦点及受限高度滚动。UI 不负责 epoch/DST 业务转换，不声称内置 DST 正确性；边界为显式 collisionBoundary > trigger 最近 data-huhu-leaf > ownerDocument viewport |
| 布局与容器，§4 | shell/layout.ts 依实际叶宽 600/960；ShellRoot；app/contracts/workbench-state.ts 的 huhu-workbench-ui/1；workbench-host.ts 的 PanelContext.ownerWindow | T04 仍待验收；新封套 navigation {width,open,lastRoutes}/route/mode/pageViews，不读写旧键；模块业务字段和 stateKeys 过滤不变。Header/Rail/Panel 数值指向规范及令牌 |
| 逻辑叶与详情，§4、§6 | ui/react/use-leaf-metrics.ts：useLeafMetrics(ownerElement?)→element/width/ref；huhu/DetailPane.tsx 必需 leafWidth、dirty/onDiscard；实际 main 可用宽决定 inline | 必须区分 viewport/leaf/main；Dialog portal 传逻辑 owner。DetailPane 同一编辑实例切 aside/Sheet 保留草稿、选择、scroll；叶宽 <600 的 full width 采用 leafWidth。当前契约已存在，最终 T04 接受后再固化验收事实 |
| 页面组合/字段/状态，§6 与 coverage | 实际模块 api/PageContribution、shell/content 与工作台调用方；TaskContent/FormField/Notice/EmptyState、Tree、DetailPane 作为组合 | 首页五类卡、全部内建/章节、三个收件箱及现有领域字段不能因原型未展示而删除；normal/empty/no-results/initial-loading/refresh-retain/error/unavailable/busy、失败保留与重试分别验证。未实现模块只写规范与责任票，不伪称迁移完成 |
| Tree/Panels，§5 | ui/components/tree.tsx：Tree/TreeNode/TreeProps，Headless Tree + TanStack Virtual；resizable.tsx：ResizablePanelGroup/Panel/Handle，panels v4 | T02 typed selection、branch 展开、virtualizeAfter/密度估算、键盘与焦点；Panels 数字 px/字符串百分比和 32/44 分隔目标。保留 Lukas Bach/shadcn 等实际源署名，库负责解析/键盘，不另造框架 |
| Portal/z/焦点/生命周期，§3.5–3.6、§4–5 | ui/react/portal.ts 每 Document PortalRoot/refcount；surface.tsx ReactSurface；ContainerProviders；modal-layer.tsx 所属栈/FloatingOwner；ime.ts | T02/T03 及 043/045 共享生产者回归；跨独立 React 根不能假定继承 context，按物理 owner 派生层级，不能所有 popup 压过全局 modal。Radix trap、真正关闭来源恢复、隐藏保留/卸载、ownerDocument 监听/Portal 释放、逐层 Escape 和 IME 均需真实窗口接缝 |
| 动效/焦点/粗指针，§3.5–3.6 | tokens.css 的 HU duration/easing/focus/hit；base.css 含伪元素 reduce；组件已有 outline/clip/分区 | T02 原始有效内点在自身/邻项焦点下、T03 真实 popup 边缘完整 2px+2px paint、reduced-motion 与受限 scroll。不能用矩形等于可见焦点、不能以精确边界触摸盘调整掩盖内部重叠 |
| 特殊表面，§3.7、§6 | 现有图表/终端 ANSI/编辑器 token 桥接；主题 runtime 的独立笔记结构；批准 --diffs-* 已在 tokens.css | 避免改原生 Markdown/终端领域数据和宿主树。T16 的 DiffView/CompareEndpoints 尚无真实导出，@pierre/diffs 尚未安装；只能写目标合同：封装库 parser/worker、shadow token 桥接、局部 lineno Enter/ShiftEnter/hunk 焦点，不能展示可用 import 或全局 j/k/n/p |

## 产物与验证

### 建议文件职责

继续保持现有五文件，不新增 README/CHANGELOG 或未请求的 agents metadata。SKILL 只放触发、权威、任务路由和最低动作；design-system 放共享令牌/组件与样式边界；shell 放布局、页面组合与生命周期；theme 分清 HU UI 与保留笔记编辑器结构；motion-a11y 放动效、焦点、输入、键盘和命中验证。工程边界/依赖/i18n/测试选择仍由 dev/AGENTS 各自唯一维护；不复制到五文件。按任务渐进读取，不要求递归通读。

现有五文件全为跟踪中的普通文件、非 symlink、模式 0664；无 agents/openai.yaml。完整备份及 metadata/hash 保存于 /tmp/huhu-t15-preflight/backup/.agents/skills/ui 和 baseline-files.json。保持 name: ui、原中文 description、license: LicenseRef-HUHU-1.0、metadata.short-description；保留独有许可/署名和仍成立的引用。全文合计 36,472 bytes / 20,641 字符（含引用文件）；这是后续重构前基线，不推导 token 或费用节省。

| 源文件 | 原 SHA256 |
|---|---|
| SKILL.md | 123781b61a8bd3b40af9ff6161b1dc981c446f13c2ef3b2f49995630cd2f2c44 |
| references/design-system.md | 3aed1cce7dccf6ebf7517158a9b6c509c5196c6301487bbf3533319c3ff33d3e |
| references/shell.md | 8b7cc1a96c9a0f11cb20067ce5152aadcca583503d7bb9a09a854221ec7ebda5 |
| references/theme.md | eb71531fd262b21bc0987c44812a32d65d78cbad226dd35f56999bc453501253 |
| references/motion-a11y.md | 61b9146269d713f15c7e1769c9f90bc3f73f423b90b12dbd4798c73b404ca512 |

只读检查 pnpm test:docs 退出 0；1745 Markdown / 1601 本地链接，日志 /tmp/huhu-t15-preflight/docs-baseline.log。1341 外链未抓取；该检查只证明文档结构/本地引用，不证明设计语义或宿主行为。no-source-drift.json：五文件 drift[]。return 阶段 validate-dispatch 退出 0，errors/warnings 均为空，日志 /tmp/huhu-t15-preflight/return-validator.log。未运行插件构建或 UI 全矩阵，纯预检不需要这些结果。

### 实施后的验证计划

1. 五个正常真实任务：任务详情表单、档案树+详情、自动化列表+检查器、设置表单/搜索、Git A/B diff。核对真实字段与 API/variants、叶边界、状态、数据归属和适用验证；Diff 若生产者未交付，应明确缺口，不能虚构 wrapper。
2. 邻近不触发：普通产品问答、只讨论配色、纯服务端/持久化缺陷。不得无故开启整套 UI 实施/验收流程。
3. 失败路径：缺组件或 DESIGN/源码冲突、未知外观格式、foreign Document Portal、320px 中文/200% 缩放溢出、IME Enter/Escape、宿主不可用。应保留字段/草稿、指向责任生产者并如实列未验项，不引入旧 UI 别名或伪造通过。
4. 恢复路径：实施前核实无外国漂移；有误仅从备份恢复本票五文件及必要 metadata，再核对 hash/本地链接，不 reset 他人工作或回滚生产源。T04 后续变动只刷新相关事实与验证，不冻结其实现。
5. 独立前向测试由 Lead 后续派发：评估者只收到真实请求、更新 Skill 和最低原始 schema/源码输入，自行给出私有组合产物、真实 imports 与验证方案；不给本报告结论、预设答案、怀疑缺陷或修复提示。作者另持验收清单比对，必要时编译真实 API 小样。测试报告保留原始失败和适用边界；不以作者自查替代独立评审。
6. 文档自身做实际宿主 SkillCreator quick_validate 的 metadata 检查、pnpm test:docs、逐个链接/API/命令核对、全文字符数前后比较。quick_validate 不等于行为验证；文档修订不无条件升级为全仓测试/构建。

## 问题与下一步

- **T04 依赖门仍未关闭。** 050 的 Intro 失败加载却标已读、Rail 视觉不符 UI-002、正式 fixture 缺少跨根负控制等由 051 修复；浮点 579.999938/580 应采用有限的 0.01 几何容差，不能撤销实际 leaf580 约束。最终固化前复核其 high 与 Lead 集成结果，以及最终 leaf/DetailPane、生命周期和导航 API。041 是候选报告，不是 T04 正式通过。
- **外观导入事实与目标有意区分。** appearance.ts 当前 EXPORT_VERSION=2，但 parseExport 尚接收 v1；T12 的明确范围已经包含删除 v1 分支及测试。T15 应写只接受源码当前 EXPORT_VERSION 的目标规则，并将现存 v1 标为待 T12 迁移消费者；不能谎称当前 parser 已拒绝 v1，也不能把 v1 保留为规范。Lead 已核实，无需新增 scope 或用户决定。
- 当前 docs/design-system.md、docs/workbench.md 仍含旧设计权威表述；T15 不可越界修改 docs。引用新批准 DESIGN/实际生产源，保留仍成立的架构链接；T13 负责文档迁移、T14 负责最终漂移检查。永久 ADR/context 不在本票改写。
- 实际 T15 只能写 .agents/skills/ui/**。待依赖接受并完成 T15 后，Lead 更新 **11 个尚未执行**的下游 ui bindings：T05–T14、T16；当前均指向旧 SKILL SHA 123781b6…，清单 /tmp/huhu-t15-preflight/downstream-bindings.json。不得改写 T01–T04 已完成历史执行记录；T15 自身旧 binding 的执行来源也保留，新交付记录新 SHA。由 Lead 执行票据/绑定/计划验证并决定 G-CONTRACT 关闭；本报告不代替这些动作。
- 未发现需要用户补充的文件权限或设计决定。可在 T04 正式接受后按上述职责实施 T15，再进行独立真实前向测试；本次只读预检到此释放。
