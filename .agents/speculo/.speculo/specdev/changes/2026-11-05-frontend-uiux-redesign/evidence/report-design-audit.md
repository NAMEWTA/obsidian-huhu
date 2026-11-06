# 前端重构设计与计划复审

日期：2026-11-05。结论：**不通过实施就绪审查；可以继续补全设计，不应直接按当前计划开始全量实现。**

审查对象是用户指定 change 的现有文档、全部 14 张票、终版原型，以及当前 HEAD `37fcede4210a19bcc2a74809e7fdd301e5717957` 的前端入口、领域接口和验证脚本。技术方向和纸/墨视觉方向具备复用基础；“无冲突、所有前端已覆盖、最新稳定栈已核验”三个结论目前均不成立。以下是本次核实的缺口，不表示既有业务必须删除。原型模拟不证明真实服务支持相同行为。

本报告只保存检查结论、依据与处置要求，不成为第二份可独立修改的 DESIGN。原始交付包、DESIGN revision 1、UI-001 源码和批准快照保持原字节；修订后的设计仍须按原设计合同绑定新摘要，不能沿用旧批准来证明新增内容已确认。

## 1. 关键发现

### F-01 · 高 · 任务设计引入了没有领域承接的新业务

- 定位：DESIGN §6 tasks；Spec §5、OOS-001/003；T-05；`src/modules/task/core/model.ts` 的 TaskFields/TaskCommand、`src/modules/task/api.ts`。
- 原型及 DESIGN 要求项目、标签、优先级和相应筛选；现有任务模型只有标题、说明、时区、截止/计划日、提醒、关联资源与重复系列，没有这些字段。T-05 又把服务设为只读，且禁止改领域模型。UI 自行保存这些信息会形成第二份任务数据。
- 处置：按本次“前端重构、复用现有领域”的范围，建议把清单/看板/日历作为同一任务查询的视图，按已有状态、日期、关联资源分组；删除无来源的字段控件。若要保留项目/标签/优先级，应另行明确领域 schema、命令、存储与验收，不可作为 UI 细节暗中实现。该取舍须进入修订的 DESIGN/Spec，T-05 不能自行选。

### F-02 · 高 · 版本管理被收缩为笔记时间线

- 定位：DESIGN §6 versioning、T-10；`docs/sync.md`；`src/modules/versioning/ui/`、`src/app/workbench/compose-workbench.ts` 的 versioning/revision-review。
- 生产包含更改、暂存/未暂存、提交、拉取/推送、初始化/克隆、远端与作者设置、分支历史、两版本比较、独立笔记恢复比较。原型只表现检查点时间线/diff/恢复，AC-092 只验恢复，不能承接完整 Git 工作区。
- 处置：保留“版本管理”内更改/历史/比较三个一级模式；笔记历史与恢复比较使用既有入口/服务。为首次接入、冲突、无 Git、无仓库、取消克隆、认证失败、同步暂停与恢复结果未知增加设计状态和验收。不把仓库级提交同步合入单篇笔记详情。

### F-03 · 高 · 三种收件箱被错误合并，智能体控制承诺过宽

- 定位：原型 `final/app.js` PAGES.agent.panel（约 1427 行，智能体收件箱跳 notifications）；`src/modules/agent/ui/inbox/InboxPanel.tsx`、`src/modules/home/ui/inbox/`、`src/modules/notifications/ui/`。
- 智能体收件箱包含按 space/session 选择接收方、发送/查看消息和投递状态；通知是事件结果；Home 收件箱是用户收集的内容。三者可互链但不是同一数据源。原型没有真正的 agent inbox 状态，账号入口也只跳设置默认外观。
- DESIGN 的“直接允许/拒绝”不能推断所有 CLI 都接受同样的按键；现有 `agent/api.ts` 提供打开对应终端的能力，并非通用权限决策 API。
- 处置：分别保留三个 owner/入口，增加准确目标的深链；等待提示默认定位并聚焦对应会话，只有已确认的协议能力才显示结构化回答。补足账号、技能、快捷命令、备份、工作区、用量、历史与收件箱页面状态；渲染不启动进程。

### F-04 · 高 · 首页和配置页只覆盖演示切片

- 定位：DESIGN §6 home/settings；T-08/T-12；`src/modules/home/contrib/widgets.ts`、`src/modules/home/ui/sections/registry.ts`；原型 `PAGES.settings.sec_generic`（约 1763 行）。
- 原型首页只有少数示例卡片；现有 section 类型包括 sticky/folder/library/projects/dataview/pm/pipeline/skills/calendar/rss/images/videos，另有记账、习惯、闪念、相册、倒数/纪念日等 widgets 和编辑弹窗。笼统写“全部小组件”没有定义这些组合的重构结果。
- 设置的多数模块页面回退成相同的“默认视图/在状态栏显示/发送通知”三行；这不对应真实设置。外观的笔记正文样式/字体、编辑器预览及看板局部外观，究竟保留入口还是移除也未说明。
- 处置：以真实 registry/settings 定义建立“入口—模板—状态—AC—票据”清单；相同模板可以复用，不必复制每页原型，但独有字段、业务动作、失败态必须明确。移除旧视觉不等于删除未设计的功能。

### F-05 · 高 · 票据写集遗漏真实前端消费者

- 定位：T-09/10/12 的 writable_paths；`src/modules/{agent,comments,versioning,icons}/styles/`；`src/app/content/ContentPanel.tsx`、`src/app/intro-content.tsx`、`src/app/device-choice.ts`、`src/app/editor-panel/panel-host.tsx`、`src/app/workbench/surfaces/obsidian-status.ts`。
- 模块票多数只允许 `ui/**`，上述 styles 均在其外；“内容与受管文件”实际上在 app/content，不在 T-12 的 app/settings。宿主编辑器面板、首次引导、设备选择、原生设置入口、状态栏和模块关闭占位没有明确验收。
- T-01 要改看板 token，却无 home/ui/theme 写权限，该范围属于 T-08。T-02 同时 writable components/** 和 read_only components/huhu/date/**，须明确排除而非依赖人猜。
- 处置：按 §2 的清单修订原票写集和共享 owner；仅将视觉/装配适配纳入，不借此重写领域服务。将样式、根作用域和多窗口释放纳入对应票的验证。

### F-06 · 高 · 当前版本不等于最新稳定版本，缺少升级计划

- 定位：DESIGN §2、Spec 共同约束、T-01–04；详见 §3 的官方查询快照。
- React/Tailwind/Radix 等现有版本已有较新稳定版；文档直接“沿用，不迁移”，没有对应用户最新要求的适配比较。“唯一新增依赖”可以限制新体系，不能变成不评估现有依赖升级的理由。
- 处置：保留成熟体系，先在共享合同票评估各稳定版、宿主支持与 breaking changes，锁定实际版本及许可，再更新调用方。跨主版本不能仅因日期更新就安装；不能未经试编译声称最新组合可用。明确 TypeScript/esbuild 升级与 Obsidian 插件 CJS 构建、懒加载、移动 WebView 的关系。

### F-07 · 高 · DateTimeField 的值合同不完整

- 定位：Spec §3、T-03 IN 的 `YYYY-MM-DD | null`；DESIGN §5 的“时间滑块”；`src/modules/task/core/model.ts`、`src/modules/automations/ui/editor/SchedulePicker.tsx`。
- 日历日、带时区的墙上时间、时间戳是不同值；单个日期字符串不能承载 DateTimeField。未定义 DST 不存在/重复时刻、时间精度、清空/部分输入、只读和 min/max 的比较语义。DayPicker 本身不提供时间选择器（§3 官方来源）。
- 处置：DateField 保持日历日；DateRangeField 明确起止及草稿；DateTimeField 明确日期+时分+IANA zone 的受控值或领域适配端口，转换复用现有任务/自动化时间工具。缺失或歧义时刻由领域规则处理且可见，不静默猜 UTC。时间输入复用既有 Input/Slider，不自行写日历算法。

### F-08 · 高 · token 替换与宿主/编辑器边界没有闭合

- 定位：DESIGN §3.4/3.5/§6 notes；Spec OOS-002；T-01；`src/theme/styles/fonts.css`、theme runtime、`src/ui/tailwind/index.css`。
- 一处规定正文由 Obsidian 决定，另一处把笔记阅读纳入衬线字体；旧主题 runtime/字体会写宿主 body 变量。仅声明“保留 editor-schemes.css 文件”无法保证其依赖、设置、resolver 和字体行为不变。
- 现有组件使用 background/card/muted 等 Tailwind 语义名；“只消费 --hu-*”需说明这些别名在共享 token 层映射，而不是要求逐模块发明新类。
- 处置：修订时明确 HUHU 自有工作台/侧栏/Portal 的作用域、宿主正文例外和现有正文设置入口归属；为跟随主题的前景/背景成对回退，覆盖次级文字、accent、焦点、状态色与控件，而非只测正文。补齐终端 ANSI/选择/光标、图表系列、链接/高亮/disabled、半透明背景 token。品牌 SVG、用户内容颜色和语义主题字面量需要集中白名单，不能一律作为旧 UI 删除。

### F-09 · 中 · 尺寸、字体、动效和像素合同互相打架

- 定位：DESIGN §3.5–§5；原型 styles.css 的 .btn-sm、.tree-group、.menu-label、.mcal-task、data-ui-size。
- 分组 11px 与中文至少 12px 冲突，原型计算样式也确有 11px 中文。sm 按钮视觉 28px、搜索 30px 与点击区 32/44px 的关系没写清；原型部分按钮有扩大命中区，不能仅凭视觉尺寸判它全部不可点。
- 声称同比例缩放，原型 13 档 sm=12.5/lg=15、15 档 sm=14/lg=17，未同比例缩放；Tree 一处固定 32、一处 32/36。4px 网格允许 2/6 微间距但未区分；首页 26px/日记17px与主字阶、10px图标轨圆角与圆角表需要声明语义变体。
- 旧 ui 技能只允许 transform/opacity，DESIGN 又允许 color；原型包含 background/border/box-shadow transition。处置：定义唯一尺寸矩阵（视觉大小和命中区分列）、中文最小字阶、虚拟行高随密度/触控/缩放同步、CSS px 与设备像素的验收口径；明确允许的动效属性。T-15 只沉淀最终确定的规则。

### F-10 · 中 · 键盘与弹层规则不能直接实现为全局拦截

- 定位：DESIGN §7（树每行 Tab、固定 Esc 顺序）、§3.6 z-index；原型 app.js 的 layers、Escape；现有 Tree/Portal。
- 树每行都进 Tab 顺序会破坏 Headless Tree 的复合控件焦点模型，尤其虚拟化后未挂载行不可 Tab。ARIA 不能强制所有状态都写 true/false：叶节点不应伪造 expanded，三态 Checkbox 可为 mixed，React 布尔属性由渲染器正确序列化即可。
- command=80 内打开 popover=65 可能落在父层后；固定按“控件类型”处理 Esc 不等于关闭当前最上层。全局 Cmd/Ctrl+K、Cmd/Shift+P 与 Obsidian 用户快捷键、终端输入有冲突风险。
- 处置：沿用 Radix/Headless Tree/cmdk 的键盘与焦点行为、层级上下文和所属窗口 Portal；树以单一 Tab 入口加方向键；Esc 由最内层已消费事件优先；modal 内 F6 不逃逸。全局命令经宿主注册，默认快捷键策略明确，输入/IME/终端不被工作台截获。依据：[Headless Tree](https://headless-tree.lukasbach.com/features/tree/)、[WAI 树模式](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/)。

### F-11 · 高 · UI runner 命令、矩阵和写权限不对应

- 定位：Spec AC-902、T-14；`scripts/ui-review/run.mjs:18`、`:40`、`:69`。
- 裸命令必然报 Usage；必须传 --ticket/--matrix/--out。现有矩阵是 420/600/1440，而计划要求 390/820/1100/1440；现有 T-xx fixture 属于以前的任务，编号相同不证明覆盖本次页面。T-14 只有 fixture 写权限，不能改 runner；模块票要求先通过 UI runner，却没有 fixture 写集，等到最后才建设会造成门禁倒置。
- 处置：共享合同阶段由 Lead 适配 runner/test 和明确 fixture ID/页面状态映射，模块票随实现提供各自 fixture，最终 T-14 汇总。使用可运行的完整命令，并记录实际容器宽度、en/zh、纸/墨、密度、字号、200%缩放、reduced motion、coarse pointer、所属 Document。真实触屏/Obsidian 不由 iframe 冒充。

### F-12 · 高 · “一次删除 + 每票全库 build 通过”顺序不可保证

- 定位：T-01/02 删除旧 token/变体与每票 build；Map G-CONTRACT；Spec DEC-001。
- 旧消费者尚未换完时删除共享 token、变体与设置 schema，会使类型/样式守卫和旧页面断裂。T-01 的 AC-001 却要求全仓模块都无旧颜色；其写集无法完成消费者替换。禁止兼容层是目标，不代表中间每票都天然全绿。
- 处置：明确共享票的局部验收与最终全仓验收归属；选定一次切换集成阶段，或让生产者和全部受影响调用方作为同一集成单元。不给临时断裂版本发布资格，不引入运行时双轨。T-13/T-14 才判定全仓旧引用清零。资源预算遇到 DayPicker 增长应测量并解释，不能把“已复用成熟库”当作预算必然通过。

### F-13 · 高 · 技能与设计优先级、签名刷新没有维护 owner

- 定位：ui/SKILL.md 的“照抄 Orca/apex”；ui/references 的宿主主题、280/500/44、旧页面路由；Map required bindings；T-13 修改技能后 T-14 仍绑定旧 sha256。
- 当前所有票都必读旧技能，旧规则与纸/墨、自有主题、272/480/52 和自动化右详情冲突；收尾改变技能入口后，下游摘要将失效。不能通过关掉 required 来解决。
- 处置：本次新增 T-15 专责完整 UI 技能重构，放在 T-13 后、T-14 前；T-13 不再写该目录。当前重构实施时，以用户已批准的本 change DESIGN 对列出的视觉差异覆盖旧规则，其他工程边界继续有效；存在本报告未决冲突时仍不 Ready。T-15 完成后，Lead 审阅差异并刷新未执行票的 required binding 和必要 reference hash，不改历史证据。

### F-14 · 中 · 跨模块与安全交互需要按真实服务补合同

- 自动化：列表+详情合理；“编辑弹窗”和“新建独立页”可共用现有 Composer 表单，但原型 new 缺周期/动作/预检细节。需说明行切换、切页、分屏/深链及脏数据确认，不能再做第二套 composer。
- Safe：服务确有 30 秒剪贴板定时清除，但只清除仍属于本次复制的内容；Spec AC-102 不应暗示无条件覆盖用户后来复制的文字。锁屏“剩余次数”没有在当前 safe 状态模型发现来源，不应展示虚假安全保证。初始化、损坏/未知格式、备份恢复与冲突状态不能只用“密码错误”替代。
- Health：实际修复经领域 owner 持久备份与受保护恢复，不统一依赖 Git 检查点；DESIGN 中“执行前创建检查点”需与 docs/health.md 对齐。增加过期计划、写入结果未知、部分提交、恢复中断状态。
- 移动端：safe/agent/versioning 存在桌面可用性限制，390px 是窄叶子，不等于移动支持；无原生状态栏时需有可见状态入口。模块关闭、启动失败、只读/不可用、专注模式、分屏恢复也是全前端范围。
- 任务完成：1.4 秒延迟仅为呈现窗口，写入/重复实例/撤销以领域回执为准；自动保存切记录和服务更新要防止把旧草稿写给新对象。

### F-15 · 中 · 审批数字与完成门表述过度

- DESIGN JSON pages 和实际 PAGES.states 均为 12 页 80 状态；批准说明和部分历史记录声称 81。本轮枚举逐项匹配成功。历史批准快照不覆盖改写，在修订批准包中纠正数量。
- Spec/Goal 把真实宿主列为验收，同时又称宿主“待用户验收”即可整体成功；需区分实现检查完成、必需宿主待验收、用户明确接受 deferred。没有真实证据的必需项不得自动通过。
- schema 校验通过仅证明结构，不证明覆盖、审美、接口可行性或运行正确。原计划“全部 ready/未覆盖无”的结论已由本次复审撤回；README/Spec/Map/Goal/Ticket 同步为待修订。

## 2. 全前端覆盖地图

以下按实际入口分组盘点；“部分”表示有顶层页面或票据路径，但独有行为/状态没有相应设计与 AC。并非把未设计部分排除出本次重构。

| 实际表面与源入口 | 当前设计覆盖 | 原责任票/补齐方向 |
|---|---|---|
| shell 图标轨、二级栏、页头、详情、专注/分屏、停用/失败状态；src/shell、app/workbench | 主骨架有；专注/失败/恢复不足 | T-04；补实际 feature/section/resource → 原型 route 映射 |
| app/workbench/surfaces 状态栏与用量弹层 | 原型模拟栏，非真实贡献完整设计 | T-04，agent 数据由 T-09 |
| 通用按钮/字段/树/列表/弹层/命令/路径与图标选择；src/ui/components、ui/react | 主要控件有；少数控件和所有状态不足 | T-02/03，建立组件状态目录，薄封装已有原语 |
| theme、ui/styles、ui/tailwind、字体资产与构建链 | 有纸/墨；宿主与正文边界未闭合 | T-01、T-12、T-13 |
| 首页网格、添加/配置/菜单/统计；home/ui/{canvas,board,widgets,dialogs,settings,appearance,theme} | 少量 widget 示例 | T-08，真实 widget catalog 逐类覆盖 |
| Home sections：sticky/folder/library/projects/dataview/pm/pipeline/skills/calendar/rss/images/videos | 日历和少量卡片有 | T-08；calendar 由 T-05 |
| Home 独有记录/习惯/番茄/记账/媒体/收件箱/阅读/快捷入口 | 多数没有独有状态 | T-08；清单覆盖 home/ui 全部目录 |
| 任务列表、编辑、重复/未来实例/取消/冲突、日历与首页任务 | 主视图有；新字段无来源，真实状态不全 | T-05，统一 TaskContent，不复制领域状态 |
| 档案 generic 类型/记录/字段/关系/查询/表单/模板/设计器/恢复 | 主编辑与 studio 部分；高级流程缺 | T-06 |
| 档案 belongings/person 年报/生命周期/纪事与编辑 | 少量阅读卡片 | T-06，补编辑、筛选、修复/恢复状态 |
| 自动化列表、详情、运行、全部历史、Composer、动作配置与 settings | 主路径有；表单与失败合同不足 | T-07 |
| 智能体会话、Space、终端、分屏、历史、inbox、用量 | 部分，inbox 错跳通知 | T-09；复用 xterm 和 workspace 服务 |
| 智能体账号/技能/快捷命令/备份/工具与终端设置 | 通用占位 | T-09，T-12 只拥有设置容器 |
| 日记与 navigator 搜索/树/周期笔记配置 | 日记主态有 | T-10；宿主 Markdown 不直接搬原型样式 |
| Git 更改/历史/比较、初始化/克隆/冲突/同步 | 重要遗漏 | T-10，见 F-02 |
| 笔记历史、revision-review、恢复/撤销 | 部分 | T-10；补 app/editor-panel 宿主写集 |
| comments 面板/浮层/锚点/设置及模块 styles | 部分 | T-10；正文不变 |
| notifications 收件箱/详情/来源/渠道与持久反馈边界 | 主态有 | T-11；渠道设置真实 owner 纳入验收 |
| safe 初始化/解锁/锁定/CRUD/快速取密/损坏/恢复/settings | 主态有 | T-11；密文格式/复制语义由原服务承接 |
| health 扫描/结果/计划/执行/恢复/部分或未知结果 | 部分 | T-11；修复不是通用 Git checkpoint |
| app/settings 容器/搜索/通用/外观/导入导出，所有 module settingsPage | 外观较完整，其余多为占位 | T-12 + 各模块票 |
| icons 选择/规则/自定义图标/宿主菜单及 styles/host-icons.css | 仅静态图标网格 | T-12；宿主原有图标能力保持 |
| app/content/ContentPanel 受管内容搜索/打开 | 模拟文件列表 | T-12；补写集和实际资源边界 |
| app/intro-content、intro-modal、device-choice、settings/runtime | 无专门映射 | T-12；复用通用 Dialog/Setting 宿主适配 |
| host/obsidian/feedback、原生菜单/Notice、icons/platform managers | 宿主边界描述不足 | 对应 owner 核对适配；保留必要宿主原生外观，不复制 DOM 引擎 |

每行完成条件：列出正常、加载、空/无结果、读取失败、写入 pending/失败、能力不可用；只对确实存在的行为列状态。映射真实源码入口、设计页面/模板、负责票和可运行 fixture；缺口不以“沿用统一样式”替代。

## 3. 技术与开源复用复核

研究调用方：specdev/tickets；接收位置：本报告。问题：现有体系是否需推倒重造、日期选择是否合理、版本是否最新、哪些复用会受宿主限制。截止条件：核实关键官方 API/包发布/维护许可事实，留下实际工程试编译与宿主验证，不安装依赖。

### 3.1 版本快照（2026-11-05）

来自 npm 官方 registry dist-tags.latest；这是发布事实，不是集成通过。实施时须复查并锁定可安装版本，不直接复制 main 分支版本。

| 包 | 仓库当前 | 官方 latest | 发布日期 |
|---|---|---|---|
| react | 19.2.8 | 19.3.1 | 2026-10-14 |
| tailwindcss | 4.1.13 | 4.3.4 | 2026-11-02 |
| radix-ui | 1.6.7 | 1.8.1 | 2026-10-12 |
| @daypicker/react | 未安装 | 10.0.2 | 2026-09-30 |
| @headless-tree/react | 1.7.0 | 1.8.0 | 2026-10-15 |
| react-resizable-panels | 3.0.6 | 4.18.1 | 2026-11-05 |
| typescript | ^5.8.3 | 7.0.2 | 2026-07-08 |
| esbuild | 0.25.5 | 0.28.2 | 2026-08-08 |

原始查询入口：[React](https://registry.npmjs.org/react)、[Tailwind](https://registry.npmjs.org/tailwindcss)、[Radix](https://registry.npmjs.org/radix-ui)、[DayPicker](https://registry.npmjs.org/@daypicker%2freact)、[Headless Tree](https://registry.npmjs.org/@headless-tree%2freact)、[Resizable Panels](https://registry.npmjs.org/react-resizable-panels)、[TypeScript](https://registry.npmjs.org/typescript)、[esbuild](https://registry.npmjs.org/esbuild)。本次未穷举全部传递依赖，不把该表称为完整升级锁文件。

### 3.2 选择与复用边界

| 能力 | 审查判断 | 适配要求与依据 |
|---|---|---|
| React + TypeScript + esbuild | 保留体系，版本需要评估 | 保留 Obsidian 插件交付；没有 SSR/独立站点需求，不引入 Next/Vue 或第二运行时 |
| Tailwind + shadcn/Radix | 合理，主题由 HUHU 语义 token 控制 | 共享适配层连到 --hu-*；审查上游源码变更，不重跑 CLI 覆盖定制；[Tailwind 平台要求](https://tailwindcss.com/docs/compatibility)需与实际 Electron/移动 WebView 核对 |
| 日期 | DayPicker + 现有 Popover 合理 | [v10 官方](https://daypicker.dev/upgrading)推荐 scoped 包；更新 classNames/API；[shadcn 日期组合](https://ui.shadcn.com/docs/components/radix/date-picker)为复用范式；[时间输入指南](https://daypicker.dev/guides/timepicker)明确不自带 time picker |
| React Aria DatePicker | 有成熟日期交互，当前不建议平行引入整套原语 | 已有 Radix/DayPicker 方向；只有验证发现硬缺口才比较替换而非双轨。[官方组件](https://react-aria.adobe.com/DatePicker) |
| Air Datepicker | 仅原型载体 | 不新增生产 DOM 运行时；生产复用行为，不搬 vendor |
| Tree + Virtual | 继续 Headless Tree/TanStack Virtual | 复用键盘与 ARIA；虚拟化不能替代数据分页；不写第二个树行为引擎 |
| Dashboard/拖放/分屏 | 继续 react-grid-layout、dnd-kit、resizable-panels | 版本迁移和键盘替代操作由对应票验证；不自制网格/拖放算法 |
| 终端/diff/统计 | 补入显式 REUSE | 现有 @xterm/*、@codemirror/merge、Chart.js/react-activity-calendar 应继续复用；HUHU 只做主题/布局/生命周期适配，不手写终端或 diff 引擎 |
| 反馈/命令/状态 | sonner/cmdk/Zustand 与现有 feedback | 不加第二条 toast 总线，不在组件重建持久数据仓库 |

维护核实：GitHub 官方 API 显示 shadcn-ui/ui（2026-11-05）、radix-ui/primitives（2026-10-14）、gpbl/react-day-picker（2026-10-21）、lukasbach/headless-tree（2026-10-25）均近两年有推送、未归档、MIT；adobe/react-spectrum（2026-11-05）为 Apache-2.0。元数据仅证明维护活动与仓库许可标识，具体采用包/源码仍核对原始许可和发行文件。查询分别为对应 [shadcn](https://api.github.com/repos/shadcn-ui/ui)、[Radix](https://api.github.com/repos/radix-ui/primitives)、[DayPicker](https://api.github.com/repos/gpbl/react-day-picker)、[Tree](https://api.github.com/repos/lukasbach/headless-tree)、[React Spectrum](https://api.github.com/repos/adobe/react-spectrum) API。

## 4. 页面组合与产品定位结论

HUHU 是 Obsidian 内的个人工作台：围绕用户笔记、任务、资料、自动化与智能体开展工作。纸/墨、自有色彩、统一字段、列表保留加详情、按叶子宽度折叠适合该定位；无需换成独立网页或仿制另一款完整应用。

建议在下一版合同锁定：

- 首页承载聚合与快捷动作，任务/档案/自动化拥有完整编辑与查询；小组件使用同一领域命令。
- 左侧只做模块/资源导航，右侧只做当前对象详情；没有资源导航不制造空侧栏。大型设计器、Git 比较、全量运行历史仍保留充足工作区。
- 智能体管理会话和消息，通知管理事件，Home 收件箱管理捕获内容；互链携带明确对象身份。
- 版本管理区别仓库操作与笔记历史；宿主笔记/侧栏不伪造成工作台独立路由或第四种 Obsidian 视图。
- 设置保留真实配置的 owner 和分组，搜索直达匹配字段；图标与受管内容可进入设置，但迁入后要保留所有现有能力与入口更新。

这些是审查建议；影响已批准布局/行为的部分必须进入新 DESIGN 和原型，不能由模块票各自发挥。

## 5. 票据逐项审查与新增票

| 票据 | 本次结论 | 必须解除的缺口 |
|---|---|---|
| T-01 | 待修订 | F-06/08/09/12：升级评估、完整 token/宿主边界、局部与全仓门禁分开 |
| T-02 | 待修订 | F-05/09/10/12：尺寸、ARIA、层级与写集、消费者切换 |
| T-03 | 待修订 | F-06/07/10：值合同、时间输入、时区、Portal 与依赖锁定 |
| T-04 | 待修订 | F-05/10/11/14：真实路由/状态栏/专注/移动与早期 fixture |
| T-05 | 待修订 | F-01/07/14：任务字段与领域边界、自动保存/撤销 |
| T-06 | 待修订 | F-04/05/10：设计器/恢复/高级字段状态、树与分页 |
| T-07 | 待修订 | F-07/11/14：Composer 单一实现、完整运行与失败状态 |
| T-08 | 待修订 | F-04/05：全 widget/section 设计覆盖、看板 token 归属 |
| T-09 | 待修订 | F-03/04/05/14：收件箱与账号、终端协议、styles |
| T-10 | 待修订 | F-02/05/08/14：Git 全面覆盖、编辑器宿主、正文边界 |
| T-11 | 待修订 | F-08/14：复制条件、无来源安全提示、health owner 与异常结果 |
| T-12 | 待修订 | F-04/05/08：真实设置、内容/引导/图标、正文设置去留 |
| T-13 | 待修订 | F-12/13：集成清理与全仓守卫；移交 UI 技能写权限到 T-15 |
| T-14 | 待修订 | F-11/15：完整命令、fixture/矩阵、必需宿主待验收不能算完成 |
| T-15（新增） | 规划草案 | 专责 UI Skill 与全部 references；依赖 T-13，阻塞 T-14；见新票 |

所有原票的视觉共享合同均依赖上述未闭合输入，本次回退为 draft/ready:false；保留原设计引用用于追溯，不伪造新批准。新增的 T-15 也不提前声称已经适配尚未实现的代码。

## 6. 验证记录与边界

- 修改前 `validate-specdev.mjs --stage tickets`：退出 0，0 error，1 条 conclusion-report 提示。`ticket-control`：退出 0，结构无错误，未分配实施 owner；这是计划语法结果。
- Chrome headless 实际打开本次 final/index.html，枚举 12 页 80 状态、1440/390 两档，共 160 个路由/状态检查；等待动效稳定后页面级横向溢出为 0（首轮短等待得到的瞬态溢出已复测排除），运行异常为 0，抽查 ARIA 值无非法字符串。中文 11px 的计算样式已复现。截图实际查看 home 桌面/窄宽等代表页；没有将路由可渲染说成每条任务链验收通过。
- 本轮未运行生产构建、插件测试或真实 Obsidian；未安装或升级依赖；没有生产实现变更。不验证 PTY/调度/密文/真实数据事务，不把静态原型模拟视为生产证据。
- 原型复测脚本、截图、JSON、修改前归档仅在本地：/tmp/huhu-frontend-audit/。未入库过程材料；恢复归档：/tmp/huhu-frontend-audit/change-before.tar.gz。
- 修改后的结构、链接和 DAG 检验结果见下方追加结论。无关历史批准原文保持不变。

### 修改后验证结论

- `pnpm test:docs`：退出 0，1632 份 Markdown、1601 条本地链接通过；外部链接未由该脚本抓取，本次采用的外部依据另已查询。
- `validate-specdev.mjs --stage spec / tickets / goal-plan --repo /home/wta/projects/obsidian-huhu <change>`：三项各退出 0、0 error；各有 1 条项目采用 conclusion-report 模式的预期提示。首次 Tickets 检查发现 requested_deliverables 需 name/count 对象，已修正后重验；一次误用 stage=goal 的 Usage 退出不作验收证据，已使用 goal-plan 完成检查。
- `ticket-control.mjs --map <change>/tickets-map.md --repo /home/wta/projects/obsidian-huhu`：退出 0，errors/validation_errors/diagnostics 均为空；15 张票；T-15 依赖 T-13，T-14 依赖 T-15。eligible 为空符合当前 draft 状态，不代表可以实施。
- `git diff --check`：退出 0。对照修改前本地归档的 DESIGN/原型/原始来源共 91 个文件，字节变化为 0；保留原批准和用户材料。
- 计划质量复核：请求数量（新增一票）、新增票边界/方法/依赖/验收与权限通过；整体行为与设计完整性仍不通过，F-01–F-15 待处置。**结构校验通过不改变本报告“不通过实施就绪审查”的结论。**
