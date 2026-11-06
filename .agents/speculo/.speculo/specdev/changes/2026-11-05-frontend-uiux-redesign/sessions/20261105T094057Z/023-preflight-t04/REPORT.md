# 任务回报

Session: 20261105T094057Z
Task: 023-preflight-t04
Status: completed

## 聚焦交接

完成 T-04 只读预检：Map revision10、T-04/goal-plan、AC-031–033/114、批准 DESIGN §4/7 与真实 shell/content/onboarding/contract/callers 已逐接缝核对。没有实施、运行构建/测试、修改源码/依赖/状态/Git，未委派；本报告是候选实施计划，T-02 仍 in_progress，T-04 未开工。现有 shell 生命周期、latest-wins 导航、模块能力、内容文件写入和设备选择可复用，主要替换布局/展示与唯一 UI 状态 schema。需在正式派单前补 workbench-host/i18n/旧宿主探针的共享写集归属，明确 SidePanel owner，并由 T-02 producer 完成 DetailPane 的 leaf/main 宽度接缝。没有发现需要重新询问用户视觉方案的决定；不能把 ticket ready 当作依赖已闭合。

## 产物与验证

### 实际入口、数据与调用关系

| 入口 | 真实调用/所有权 | T-04 最小作用 |
|---|---|---|
| src/app/main.ts | onUserEnable→openWorkbench(dashboard)→maybeShowIntro；introSeen 由 app settings 持久化；初始化 vaultIdentity 时动态 chooseVaultDevice | 只读保留启动/完成标志与设备域；普通欢迎改版不需改 main。 |
| src/app/workbench/workbench-leaf.ts | 唯一 ItemView huhu-workbench-view，onOpen 动态加载 shell/host/workbench-surface.tsx；保存 raw state；未加载时 focusMode 直接读 saved.focus | Lead shared 改新 schema 的早期 focus 检查/保存入口，保持 shell/React 懒加载。 |
| src/app/workbench/compose-workbench.ts | 提供 rail/panel/availability/stateKeys/create；modulePage 懒激活；mainLeafView 同窗口选已有 full leaf；openFocus→focusLeafState；openInWorkbench 复用现页状态 | Lead shared 配合新 leaf schema、PanelContext.ownerWindow、content primary Promise；保留模块服务与原生命令行为。 |
| src/shell/host/workbench-surface.tsx | normalizeWorkbenchState→ShellRoot；WorkbenchPages 挂 PageSlot；独立 navigationHost 移入 SidePanel；requestSaveLayout 由 change 和导航提交触发；visible/dispose/migration 管理 root/Portal | 主实现入口：新 schema、宽度传递、可见性/F6/导航抽屉、focus 返回与当前导航错误态。 |
| src/shell/host/workbench-pages.ts | 每功能保留独立 ReactSurface；贡献 stateKeys 经 cleanPageState 清洗；hidden+inert 保留页面/自定义导航；close/dispose AbortController/解绑 | 保留生命周期/业务根；不要为详情/断点重排重建页面。新 schema 只恢复新 pageViews，不再读 raw.pages。 |
| src/shell/ShellRoot.tsx、layout.ts、navigation-state.ts、rail-overlay.ts | ResizeObserver 已量叶子；当前 panel280/220–500、header44；phone 强制 narrow；宽面板拖动仅 pointerup 保存；Sheet 包 rail+panel | 改272/220–480、header52、按叶宽960/600分档，保留拖动预览/松手提交/8px/Home/End；无 panel 不创建空二级栏。 |
| src/shell/rail/Rail.tsx、panel/SidePanel.tsx、page/PageHeader.tsx | Rail roving、右键tab/split；SidePanel 本地/异步搜索→select Promise→target；PageHeader 标准 chrome；chrome none 由页面拥有菜单/导航入口 | 消费新 Button/Tree/Notice 等，共用令牌与真实 ARIA，保留搜索异步取消及原菜单；移除 xs/icon/outline 和 folderClick。 |
| src/app/content/content-tree.ts、ContentPanel.tsx、page.ts、new-note.ts | 只读 huhu/ 文件/目录；文件点击开原生笔记，目录开 overview；Markdown 搜索含正文；createHuhuNote 用 vault API 建目录/日期命名/重名编号；.huhu 不暴露 | 保留上述领域行为；overview 当前 limit200/total 无下一页，应补“已加载/总数+继续加载”而非静默200；树复用真实虚拟化。 |
| src/app/intro-modal.ts/intro-content.tsx | native owner 动态加载 React、generation 防晚到 import、关闭只记一次；DesignScope+HuhuProviders 所属 Document | 视觉改版保留 late import/重开/卸载与 introSeen。无需发明通用配置表或重做 app settings。 |
| src/app/device-choice.ts | SuggestModal 明确选择既有 device id 或新 label；取消 reject；native close 早于 choose 的 microtask 保证有测试 | 若换共享 Dialog/Command，保持 Promise 的 id或label契约、取消不默认共享、新设备显式命名；不改 vaultIdentity schema。 |
| src/app/workbench/surfaces/obsidian-status.ts、status-segments.ts/status-policy.ts、src/shell/status-bar/*、surfaces/ribbon.ts→src/app/ribbon.ts | 状态不依赖工作台叶子；原生主窗口状态栏池化条目+懒React用量；偏好 segments/usageMode/usageDisplay；stableRibbon 固定ID并随语言改标签 | 不新增 shell footer/popout 状态栏；只改 HUHU 项目作用域的令牌/字阶/动效与无目标语义，保留订阅、池化、模块停用/卸载；Ribbon仍唯一入口、稳定ID。 |

旧文档 ui/references/shell 的 280/500/44 与 phone 规则已落后，实施按批准 DESIGN revision3，不据此保留兼容布局。prototype UI-002/final/app.js:301–307 实际按 app 宽960/600、mainW扣 rail/实际panel、mainW-360≥640 决定详情；此源码只作设计来源，不当真实生产验收。

### 状态与布局交付建议

1. **唯一新叶子 schema。** 推荐明确 tagged envelope（例如 schema='huhu-workbench-ui/1'，route、navigation={width,open,lastRoutes}、mode='workbench'|'focus'、pageViews）。名字是局部实现选择，不需新产品批准；未知/缺失tag整份按新默认初始化，不从 target/focus/panelWidth/panelOpen/lastTargets/pages 旧字段兜底，不双写。保留 normalizeTarget 的有效路由清洗、safe 不保存资源/草稿，以及 cleanPageState 的 stateKeys/深度/数量/秘密字段限制；不借 UI schema 改业务格式或清空模块库。introSeen、device identity、领域数据和 agent 自身工作区布局不是这次 shell schema。
2. **覆盖全部读写端。** shell/navigation-state.ts 与 host/workbench-surface 的 constructor/getState/setState/savedPages、host/workbench-pages.restore 调用；app/workbench/focus-state.ts 发出同一tagged envelope；Lead 的 workbench-leaf.ts 在 surface 尚未加载时也只识别新tag；compose openFocus/mainLeafView 不得再让旧 focus 判定选错 full leaf。为避免启动 app 静态导入 shell，推荐由 Lead 在纯 app/contracts 接缝共享类型/最小parser（可放现有 workbench.ts；若分文件，精确新增 app/contracts/workbench-state.ts 及其测试写集），shell 与 leaf/focus 同用，不引入 React。活动 WorkbenchTarget API 保留；旧 icons 路由映射属于 T-13清理接缝，不能作为新persist schema的兼容reader。
3. **叶宽而非设备。** ShellRoot 的现有 ownerWindow ResizeObserver 是正确量测点；layoutFor 只按当前叶子width，去除 phone强制窄模式，设备仅用于能力/宿主状态栏差异。rail52，实际可见panel为272（220–480），header52。>=960 inline panel；600–959 左Sheet；<600 合并模块导航左Sheet。无panel/navigationContext的贡献不因navigation.children而生成空栏；抽屉无panel时也不留“关闭按钮+空白右列”。保持同一panel偏好，关闭抽屉不改wide open值，断点/取消pointer不误保存临时宽度。
4. **详情 producer 接缝。** 当前共享 ui/components/huhu/DetailPane.tsx 用 parent.clientWidth>=1000 判断inline，若parent确为可用main，等价main-360≥640；但 width<600 的全宽Sheet判断错误地也使用main，leaf620减rail52得到main568就会误作窄叶全宽。尚无 leafWidth prop。Lead已接受并交011/T-02 producer解决：明确 leafWidth 与可用main，inline还须leaf>=960，全宽只leaf<600。推荐 ShellRoot 暴露一个DOM叶边界marker，DetailPane下层从最近边界测leaf/从实际parent测main；或显式leafWidth prop。**仅ShellRoot React Context不够**：WorkbenchPages/ReactSurface/AgentSidebar各有独立HuhuProviders/root。DOM来源链是 ShellRoot→PageFrame/PageSlot→WorkbenchPages 创建的 context.contentEl→模块ReactSurface/DesignScope；ui可消费约定marker但不能import shell。若走显式prop，则 NativeSurfaceContext/UI独立root的订阅传递需另定精确写集，当前没有这种桥。T-04只提供真实指标与组合fixture；不能越权改DetailPane/其tests/或在shell重造它。现尚无共享DetailPane生产消费者，模块各自详情由T-05/T-06/T-07/T-11/T-16接入；AutomationDetail文件名命中不是共享组件调用。
5. **焦点/F6/Esc。** Shell无模态时只轮转当前可见、非hidden/inert区域（rail/panel/page/打开inline detail）；当前cycleRegion的querySelector可能找进保留的隐藏page，须在活页内找焦点。模态顶层F6/Esc/还焦复用T-02 ownerDocument栈；不要新trap或监听全局键位。保留interaction generation、visible切换与打开新leaf前flush卸载，避免迟到还焦抢新窗。详情关闭由共享DetailPane处理并回来源，列表/PageSlot DOM保持；导航Sheet到栈顶时优先关闭。标准header已有Open in workbench；chrome none页面已通过context.openPageMenu显示菜单，可在host.onPaneMenu的focus分支加同一返回动作，避免跨模块新按钮。现有home BoardCanvas、agent WorkspaceToolbar、automations automation-presentation都有菜单/导航回调；各页面自绘52px头部由其后续票迁移，不越T-04写集。

### 责任与精确权限缺口

- **folderClick**：全源仅三处：app/contracts/workbench.ts:120（Lead共享）、shell/panel/SidePanel.tsx:278（T-04消费端）、modules/archives/services/generic/workbench.ts:103（T-06已含该路径）。T-02 Tree已只用箭头展开、名称选择，T-04去掉透传、Lead去掉契约；T-06移除档案生产字段/依赖旧行为。不要在Tree加回兼容flag，也不要T-04越权改档案服务。
- **panels**：仅 agent/ui/workspace/WorkspaceLayout.tsx 与 agent/ui/terminal/TerminalTabView.tsx 仍直接导入v3 PanelGroup/PanelResizeHandle/ImperativePanelGroupHandle、direction/onLayout；T-09正文明确迁移panels4并同验xterm尺寸/隐藏/销毁。T-04 shell拖拽是独立简单separator，不需接管这两个文件；测试/类型债务继续记账。T-02现有resizable包装提供v4真实Group/Panel/Separator、id-keyed layout、数值px/字符串百分比。
- **必须补共享路径：src/app/contracts/workbench-host.ts。** PanelContext目前无ownerWindow；compose contentSidePanel.openFile与new-note调用openInNativeTab不传叶子Window，而ContentSurface正确从context.contentEl取owner。最小方案加PanelContext.ownerWindow，由shell/host/workbench-surface.panelModel传view.contentEl.win，Lead compose消费它并让primary.run返回真实Promise，使SidePanel能显示busy/阻止重复创建。既有target/pages/navigate与模块忽略额外属性的实现不变。此路径不在T-04 writable/shared清单，须Lead补明确owner。
- **必须补词典共享归属（若增加/更新本票文案）：src/shared/i18n/workbench.ts（外壳）、src/shared/i18n/main.ts（content/storage设备选择）、src/shared/i18n/huhu.ts（intro）。** 这些是当前真实en/zh来源、T-04未列；由Lead维护，不能硬编码或借ui通用词典掩盖责任。无需仅因device-choice当前导入lazy/common就把storage词条错放其中。
- **SidePanel owner歧义。** T-04 writable shell/**包含该文件，但Map总体背景仍把src/shell/panel/SidePanel.tsx列为Lead串行共享，T-04自身shared_paths未列；正式派单需给精确owner或明确Lead单写，不能由worker解释glob覆盖owner。
- **宿主验收脚本缺写权限。** scripts/obsidian-acceptance/p3-shell.mjs:122–123与status-bar.mjs:178/185直接读getState().target；新schema必使其失效。需Lead补这两个精确脚本共享归属并在相同变更同步选择器/新字段，不保留生产旧字段让旧探针变绿。workbench-probe.mjs/workbench-window-owner.mjs/overflow-audit.mjs需按DOM改动核对，只有实际需改时补相应路径。
- **可选新增路径，不能当成默认授权。** 若将device-choice的React界面从.ts拆出，需src/app/device-choice-content.tsx和device-choice.dom.test.tsx精确许可（现ticket仅device-choice.ts及.test.ts）；若改status-segments/status-policy语义，现status-segments.test.ts未在writable列表，需补。欢迎若新增模块开关等配置行为，须额外授权app/main.ts与真实settings schema接缝；目前满足重做欢迎视觉/明确能力并不要求此新增范围。
- T-04已列Lead共享的compose-workbench/manifests/workbench.ts/workbench-leaf/commands/ribbon保持单writer。MANIFESTS可复用真实平台声明；agent manifest mobile=true为便携技能目录，terminal贡献仍supported=Platform.isDesktopApp，safe/versioning desktop-only。不能把390px窄桌面等同mobile，也不能为只改导航擅自改平台清单。

### 实施顺序与验收计划（未执行）

建议一次T-04内按垂直风险切片：①补shared权限/producer指标合同；②新schema的normalize/leaf/focus恢复与旧字段拒绝；③ShellRoot断点/resize/rail/sidebar/PageHeader；④sharedDetailPane组合与F6/嵌套Esc/列表保留；⑤content/intro/device/status/ribbon视觉与能力；⑥fixture/真实宿主/独立审查。主要实现文件就是上表的现有src/shell/**与T-04明确app内容/intro/device/status/surfaces/focus-state文件，不新建平行路由或UI持久库。模块页面自绘chrome、领域字段/状态、列表与选择所有权不移进shell。

有意义的新增/更新测试：
- navigation-state/layout测试：未知/旧tag整份默认；旧focus/target/pages绝不生效，新focus正确；safe与stateKeys仍剔除秘密；边界599/600/959/960与main999/1000、panel220/480、复位272、8步进、两个同窗口/不同窗口叶子各自保存。
- ShellRoot DOM：pointermove不保存、pointerup一次提交、capture取消恢复；无panel宽屏无空栏/窄屏仍有模块Sheet入口；chrome none菜单与focus返回；隐藏页不成为F6候选；嵌套日期/菜单/对话框/导航Sheet/详情Esc不穿透且来源卸载有合理后备。保留现有ShellRoot/host pages/surface/nav-transition的latest-wins、重复目标去重、关闭进行中页面、隐藏保根、迟到import/还焦、模块停用恢复等原风险，不删测试换class断言。
- Content DOM/单元：文件原生打开、目录overview、huhu隔离、正文搜索/失败、200以上继续加载、计数真实、路径重名、来源Window；Intro保留关闭/重开/generation/Portal清理；Device保留取消reject与新命名显式确认（更换原生Modal时为原close-before-choose风险记新承接）。Status维持无leaf也可用、主窗口单注册、隐藏偏好、卸载/服务变更清理；移动最多3chips，无新全局footer。
- 命令计划：pnpm exec vitest run --project dom src/shell src/app/content src/app/intro-modal.dom.test.tsx src/app/workbench/surfaces；unit对应layout/navigation-state/content/new-note/device/status；pnpm test:workbench-lifecycle、test:architecture、test:i18n；生产/测试精确types+lint。TSX/CSS变动由Lead统一build/styles/main.js与样式检查，复用有效证据、不在并发writer期间宽泛跑build。
- 新真实fixture scripts/ui-review/fixtures/frontend-redesign/T-04/**：使用生产ShellRoot、WorkbenchSurface/page roots与共享DetailPane，所有宽度按叶子量；1440/1100/820/390为必需，补320、599/600、959/960和main999/1000；有/无panel、不同持久宽度、焦点模式、不同Document、纸/墨/字号/密度/粗指针/缩放/减少动效/长标题与路径。实际CSS断言rail52/header52、panel边界、detail360/最大440、无页面横溢出、inline/Sheet模式与列表DOM/scroll保留；真实键盘经CDP，不用构造事件冒充原生焦点验证。
- 宿主由Lead在固定构建上跑现有workbench-probe、p3-shell、workbench-window-owner、status-bar与风险相关overflow场景，覆盖真实新tab/split、popout、重启新schema恢复、首次启用、设备取消、原生文件/片段来源窗口、Ribbon/status关闭模块清理。组件fixture不冒充Obsidian宿主通过。

本轮只做只读源码/合同检索与交叉核对，没有运行上述测试/构建，没有制造通过结果；命令清单均为后续计划。dev/ui实际应用为边界/懒加载/i18n来源、真实模块平台与状态所有权、approvedDesign覆盖旧视觉、独立root/ownerDocument/焦点栈与适用测试范围检查。

## 问题与下一步

T-02依赖尚未关闭是当前真实调度门；本报告不启动T-04。正式实施前由Lead闭合DetailPane leaf/main指标producer并公布DOM marker或prop合同、补workbench-host/词典/必要宿主脚本的精确共享权限，明确SidePanel写者与新schema共用入口。schema具体tag/字段名、drawer无panel的紧凑呈现等属已批准设计下的局部选择，可由实施owner按上述边界确定，不需要额外用户审批。其余真实领域行为已有明确源与测试，无需预先改module数据、重建router或扩大到agent panels迁移；待依赖与派单完成后再实施。
