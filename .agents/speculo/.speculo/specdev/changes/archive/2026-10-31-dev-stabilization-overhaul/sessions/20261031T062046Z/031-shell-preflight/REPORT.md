# 任务回报

Session: 20261031T062046Z
Task: 031-shell-preflight
Status: completed

## 聚焦交接

只读预检完成，仅写本 REPORT；T06 十项、T16 五项以及全部产品源码继续冻结。当前 Shell 已有容器断点、独立页面根、抽屉焦点恢复和异步导航 owner，不需要重建 Shell。可实施部分应落在非 Browser 内容叶层及真实 Shell 验证；共享导航/页头/抽屉外观若无法保持 Browser 效果不变，准确延期，不加入 Browser 新旧分支。以下写集是供 Lead 派发的最小建议，不代表本任务已获得生产写入授权。

## 产物与验证

### 实际检查与设计映射

已读031 TASK、Ticket24、execution-boundaries、DESIGN revision2、DESIGN-0002、UI-001批准范围回执与 final HTML/CSS/JS相关控件、dev/ui及shell/design-system/motion-a11y参考、T23 Evidence与 DesignScope/portal/providers/base CSS/runner实际实现。实际检查 ShellRoot、workbench-surface/pages接缝、PageHeader/Frame/Slot/ResourceTabs、Rail/SidePanel、layout/state/interaction、SettingsPage/CategoryContent/GeneralSettings/About/Appearance/Typography/CustomColors、settings-page/settings-categories、intro-modal，以及 compose-workbench/Browser contribution只读消费者。没有运行浏览器、测试、构建或真实宿主；预检结论是代码与合同分析，不是验收通过。

Lead已明确纠正 TASK 的“DESIGN UI-SHELL”为误称，接受实际UI-GALLERY+DS-001/004，不新增设计页。当前 DESIGN 中没有UI-SHELL对应页面：Ticket24 的实际 design_ref.pages 为 UI-GALLERY，digest 为 `566034f112192e7d062540a1ce9051674b061d0475e61bf2a794825aad46f77b`，AC-351/352。应使用 UI-GALLERY 组件合同及 DESIGN-0002 DS-001/004 Shell布局，不编造一个已批准 UI-SHELL 截图。原型 A 方向、B低密度分组、C等宽标识符已选定，无需重新选型；原型预览导航不是生产Shell模板。

- DS-001/004：现有 `layout.ts` 为600/960容器断点；52px轨、220–500侧栏、默认280、44页头、focus模式、无全局页脚继续保留。
- DS-002/003/005–010/013：接入T23现有叶层令牌、32/36/40与触控44、8/12/14圆角、语义颜色、焦点、120ms及减少动效。旧skill只允许transform/opacity的说明由批准DS-006明确替代，不改永久规则。
- DS-011/012：审批/终端真实阶段归T33/T25，不给Shell造假的批准、取消或停止状态。

### 入口与真实边界

1. `createWorkbenchSurface` → `HuhuProviders` → `ShellRoot` → Rail/SidePanel/PageHeader/ResourceTabs/PageSlot。`WorkbenchPages`在PageSlot下面维护独立 NativeSurface/ReactSurface 根，隐藏保活、关闭卸载；现有导航revision/AbortController、错误重试、availability、保存布局及窗口迁移不能为外观迁移重写。
2. Browser contribution 在 `compose-workbench.ts:170` 使用 `chrome: 'standard'`、同一Rail、PageHeader、Sheet、原生菜单和布局导航。Browser主页面本身没有panel贡献；SidePanel的实际冻结消费者是Browser设置分类的共用设置导航。它没有resourcePages；Shell方法名browserTabs实际是通用resourcePages投影，不能凭名字删除/改路由。当前 huhubot resourcePages又显式关闭resourceTabs，故不为没有当前实际消费需求的通用tabs另造生产迁移场景。
3. SettingsPage外框和CategoryContent/ModuleSettings包含Browser设置；settings-categories包含Browser导航与搜索；GeneralSettings模块开关map也含Browser。上述父层全包DesignScope会改变冻结控件。不能改成`browser ? old : new`、不能给Browser加新的排除兼容壳，不能迁移它的loader失败行为。
4. T23 DesignScope是内容叶层，会建立独占 `.huhu-ui.huhu-design.huhu-portal-root` 与notice outlet；其CSS在嵌套非design `.huhu-ui`停止。它不是允许全Shell包裹的理由；根包裹会先改变共享页头/轨道，叶边界之外也未必每个模块都有嵌套根。现有共享HuhuProviders/portal/sonner保留。
5. AppearanceSettings、CustomColors、Typography当前直接使用全局sonner，失败仅toast；可迁到该设置叶层拥有的notice，持久保存错误另用页内alert并保留输入/当前有效设置。GeneralSettings已有pending/error及保存失败数据路径，可以只在前两个非模块section接入，不触碰第三段模块开关。
6. IntroModal目前为Obsidian原生Modal、原生DOM按钮。可保留Modal调用方/close/onSeen合同，仅在其contentEl挂真实React内容与ownerDocument providers/DesignScope；原生modal框架不冒称已由Radix迁移。避免把内容包进已有openReactDialog后误认为外层Dialog也获得DesignScope上下文。

### 建议最小正式写集

第一批生产建议只六项（不改共享Shell生产路径）：

| 路径 | 最小改动 |
|---|---|
| `src/app/settings/react/GeneralSettings.tsx` | 前两个非模块设置section分别作为内容叶层接入；模块开关section含Browser保持原样。保持原保存/错误/语言与状态栏接口。 |
| `src/app/settings/react/BuiltInSettings.tsx` | About内容使用既有布局/叶层尺寸与焦点；FEATURES的Browser说明、外链及所有文案保持，不新增路由。 |
| `src/app/settings/react/appearance/AppearanceSettings.tsx` | 自有叶层scope、owned notice，保存错误页内持续显示，真实pending防重复；外观选择、导入导出与主题写入合同不变。 |
| `src/app/settings/react/appearance/CustomColors.tsx` | 接入父叶层通知/错误汇报，保留颜色草稿，失败可原操作重试。 |
| `src/app/settings/react/appearance/Typography.tsx` | 同上；保留Enter IME保护与blur提交语义。 |
| `src/app/intro-modal.ts` | 保留现有类API，使用React createElement挂内容（不为扩展名重命名扩大范围），关闭卸载root与原onSeen一次。 |

测试/fixture建议精确路径：

- 现有 `src/app/settings/react/GeneralSettings.dom.test.tsx`、`src/app/settings/react/BuiltInSettings.dom.test.tsx`、`src/app/settings/react/appearance/AppearanceSettings.dom.test.tsx`：叶层与排除区、owned notice、持久错误/草稿、重试、pending、防重复、IME。
- 新 `src/app/intro-modal.dom.test.tsx`：content挂载/关闭卸载/ownerDocument/onSeen一次；此路径不在现Ticket逐项写集，需要正式TASK/Map明确加入。
- 现有 `src/shell/ShellRoot.dom.test.tsx`、`src/shell/host/workbench-surface.dom.test.tsx`：真实生产Shell及其生命周期增补验证，不修改共享生产逻辑；既有PageTabs/SidePanel/WorkBenchPages测试先复用，不为覆盖数新增重复断言。
- 新 `scripts/ui-review/fixtures/T-24.tsx`、`scripts/ui-review/fixtures/T-24.mjs`：真实Shell与实际设置叶层fixture和CDP断言；当前Ticket未列该目录，正式实施前需精确授权。
- `docs/e2e/dev-overhaul/ui/T-24/**`：由正式runner生成真实result和截图；最终共享styles/main由Lead串行构建。

词典优先复用已有settings.writeFailed/workbench.retry等键；确有新持久错误/重试文案再向Lead列出具体启动词典键及en/zh，不先改整组词典。`SettingsPage.tsx`、`CategoryContent.tsx`、`settings-page.tsx`、`settings-categories.ts`、`app/settings/appearance.ts`当前无需生产修改。Home词典归Lead。T23原9项（run.mjs/run.test.mjs、T23两fixture、design-scope及测试、gallery、base.css、tokens.css）均不需修改；如果后续发现通用runner能力缺口，先报精确缺口再申请，不自行扩写。

### Browser冻结导致的准确延期

Rail整体按钮/尺寸/菜单、PageHeader/Frame、ShellRoot外框/Sheet、通用panel搜索/几何、SettingsPage外层padding及ModuleSettings加载失败重试，都会影响Browser现有入口或界面。当前不能在保证效果不变的前提下做共享视觉迁移，因此这些子项延期；保持源码、样式、导入、路由、恢复、tabs/分屏和旧API。GeneralSettings第三段模块开关同理保留。不能声称本票完成后全Shell已统一或全仓旧token零引用。

共享外观主题设置仍按既有用户操作更新主题；本票不改主题引擎、主题导入协议或Browser样式。fixture只证明新增叶层不主动覆盖邻接普通`.huhu-ui`，不为Browser建立专项诊断或运行其专用构建。若Lead要求Shell共享视觉本轮也改变，需先解决冻结合同冲突，不能仅凭宽目录写集推进。

### 共用冻结面的精确定位（按实际调用，不按“可能消费”推断）

| 实际生产连接 | 延期的不可分改动 / 可独立继续部分 |
|---|---|
| `compose-workbench.ts:170–186` Browser standard contribution → `ShellRoot.tsx:275` PageHeader；`:165` Rail；`:329` Sheet | 页头尺寸/共享Rail按钮规则/抽屉外框样式直接作用于真实Browser路由；保留这些共享几何。其他leaf不因此延期。 |
| `compose-workbench.ts:410–418` settings contribution → `settingsPanel(plugin,target.section)` → `settings-categories.ts:10` Browser分类 → `ShellRoot.tsx:175` SidePanel | 设置导航与搜索本来就有Browser行，整体scope/行样式改变该行；延期整体侧栏样式。Browser主页面无panel，不能错误声称其主页面直接消费SidePanel。 |
| `settings-page.tsx:52` → SettingsPage全分类共用外框 → `CategoryContent.tsx:84–92` SettingsSection/ModuleSettings | 外框padding与通用loader改变Browser设置入口，延期这些父层；General/About/Appearance独立内容可分别接入，不必改父层。 |
| `GeneralSettings.tsx:151–176` moduleManifests map | Browser开关是该段实际行，延期此整段共同外观，不过滤Browser、不增加old/new分支；`:71`基础段及`:105`状态栏段独立可迁。 |
| `ShellRoot.tsx:296` ResourceTabs；当前Browser无resourcePages，huhubot在compose`:190–191`明确false | **不是Browser冻结延期项**。当前未发现实际生产显示消费者，先保留现有行为/测试，不为了视觉迁移制造假业务页；后续真实消费者如有独立需求可在T24授权内迁移。 |
| About FEATURES含Browser文字介绍，无Browser操作/服务调用 | 保持条目文字/外链，不把它升级为整个About不得改的理由；About内容叶可迁。 |

上述延期仅限确实共用的外框/控件效果；不将“某模块可能使用基础Button”当成其所有非Browser独立leaf必须延期。范围限定通过既有内容owner实现，不新造Browser兼容分支。

### 真实fixture宿主端口与矩阵

主fixture直接挂生产 `ShellRoot`，以受控ShellProps提供PanelModel、rail条目、navigation actions、state、busy/error/unavailable；contentRef下挂生产SettingsPage/GeneralSettings/AppearanceSettings，不能复制Shell JSX或把原型HTML当fixture。真实异步导航/保存布局/保活由既有createWorkbenchSurface DOM测试验证；Chrome再加一组直接createWorkbenchSurface集成，以受控贡献create Promise制造忙碌→失败→重试，实际NativeSurface page仅作为服务内容占位，不重写Shell。

所需宿主边界明确为：

- ownerDocument/defaultView与真实ResizeObserver、requestAnimationFrame、matchMedia；两个Document用runner既有same-origin iframe，两个独立root与portal。
- Obsidian DOM方法createDiv/createEl/empty/addClass/removeClass、win/doc与onWindowMigrated；在fixture按每个Document的HTMLElement原型补足，不污染产品代码。
- Component register/addChild/removeChild/load/unload生命周期、view.contentEl/leaf、workspace.requestSaveLayout/revealLeaf、Menu动作记录与Platform。现有 scripts/obsidian-stub.ts 的 Component 是空类，不能直接假定完整workbenchSurface能跑；可在T24 fixture对stub Component原型提供受控生命周期端口，不改共享stub。主ShellRoot挂载不依赖该补充。
- plugin.appSettings/theme的get/subscribe/update受控store、模块清单与enabled/state、可控失败/延迟promise，外观导入File/剪贴板等只mock系统边界；所有UI必须是实际生产组件。不得由fixture直接setState绕过实际按钮动作后声称完成交互。

standard runner原样执行420/600/1440 × en/zh × light/dark/user-light/user-dark × 1x/2x，共48组，2x同时coarse与reduced motion；准确记录CSS宽度是viewport/zoom（不是假称2x仍是420 CSS px）。增加599/600/959/960窄宽切换交互检查，按容器实际宽度断言布局。截图、输入SHA、状态/动作/异常及样式几何来自当前真实生产bundle和Lead固定styles。

关键动作与断言：

1. Rail方向/Home/End/Enter，F6/Shift+F6区域循环，侧栏resize键盘与鼠标，窄Sheet打开/Esc/焦点约束及回原触发器；隐藏时旧弹层关闭、保留page根，分屏激活旧延迟回焦不抢新焦点。
2. 实际导航create held promise显示busy，reject保留原有效page/输入且显示alert，点Retry再次调用成功；availability分别未配置/不支持/禁用不伪造可用。panel search空/无结果/失败由实际PanelModel驱动。
3. Appearance实际保存pending禁重、reject保留草稿与有效设置、持久alert，原动作retry成功；IME Enter不提交，正常Enter/blur按现合同；通知只进入本leaf顶部且不遮主操作。Shell本身无保存/离线/取消/审批接口的状态标明不适用，不能造齐14态截图冒充业务验收。
4. 双Document分别开真实Select/Menu/Sheet/notice，检查ownerDocument、Focus、计时器清理与unmount残留；iframe只证明DOM所有权，不冒称真实Obsidian popout。
5. 正文/控件对比度、键盘focus可见、至少32/触控44命中区、200%长文本主操作、横向溢出、toast无交集、reduced motion动画/过渡停止、hover不改变几何。只读普通未迁移根的computed style作为T23隔离回归。

### 验证顺序与下游交界

正式授权后：先最小DOM红绿→本票Shell/app/settings受影响测试→类型/定向lint→Ticket指定 `pnpm lint:css`、`pnpm check:styles`、`pnpm test:ui-styles`、`pnpm test:ui-runtime`、适用 `pnpm test:i18n`。停写后Lead生成非Browser共享styles/main，再跑 `node scripts/ui-review/run.mjs --ticket T-24 --matrix standard --out docs/e2e/dev-overhaul/ui/T-24`，修正后重固定摘要，不用happy-dom代替像素证据。不运行默认pnpm build、Browser专项或真实Obsidian。

T25负责Agent/终端内容与内部tabs（排除Browser）；T26–30负责Home各自内容与导航实体；T31–35负责各模块页面、工具/状态与操作。T24仅提供现有Shell槽位、导航/错误/布局合同与本票app叶层，不提前包裹ModuleSettings或修改模块内容；T33消费真实T06 failed/recovery-required，与Shell busy/failed不混为同一个状态。T18既有分屏反馈及T23共享原语不重写，T16新路径/CSV消费者只作为稳定输入依赖。

## 问题与下一步

预检无产品写入。请Lead在T16依赖关闭后发正式TASK，明确接受上述Browser共享子项延期并授权两个T24 fixture及intro DOM测试的新路径（Lead已确认正式派遣前补fixture写集）；设计引用已按Lead纠正使用实际UI-GALLERY。若希望超出该最小叶层方案，需要先界定不会改变Browser的具体接缝。当前未进行任何生产UI验收，未把T23或原型截图当T24通过。
