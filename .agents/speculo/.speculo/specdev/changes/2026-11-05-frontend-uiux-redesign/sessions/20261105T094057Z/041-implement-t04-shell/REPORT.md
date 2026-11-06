# 任务回报

Session: 20261105T094057Z
Task: 041-implement-t04-shell
Status: completed

## 聚焦交接

T-04 worker 候选已交付并冻结，未宣布 Ticket/Goal 完成。遵循 TASK041、当前 T-04/Map 补充、批准 DESIGN revision 3、dev/ui 与既有 I 合同。没有委派、提交、正式状态/Evidence 修改或共享文件写入。

**冻结全部 53 个 worker 可写源码、测试和 fixture 路径**；此后只执行只读验证并写本报告：
- /tmp/huhu-t04-implementation/frozen
- /tmp/huhu-t04-implementation/frozen-sha256.json
- 清单文件 SHA256：1ada99df4469eba18bfbf02319a17a52dbba86499aec365fa0b294dce5414ebe
- /tmp/huhu-t04-implementation/freeze-receipt.json

实现接口及结果：
- 只使用新持久化封套 huhu-workbench-ui/1：schema、route、navigation { width, open, lastRoutes }、mode、pageViews。纯解析器在 Lead 的 app/contracts/workbench-state.ts；shell/navigation-state.ts 只重导出，focus-state 输出同一格式。未知/旧 tag 整体默认，不读或双写旧 target/focus/panelWidth/panelOpen/lastTargets/pages。模块 stateKeys/机密过滤继续有效。
- Rail 52、视觉按钮 36、Header 52、Panel 272/220–480；按实际叶宽 599/600/959/960 重排。没有二级内容就不产生空列；窄宽仍可打开 52px 模块导航。Rail 为 44px 粗指针目标留出间距，避免裁切与邻焦点争夺。
- 复用现有 pointer-capture 调整逻辑：预览不保存、释放提交、取消恢复、拒绝第二指针干扰；键盘 8px、Home/End 和双击复位。Separator 独占面板末端的 32/44px 命中带，不覆盖页面/行操作。
- SidePanel primary 使用真实 Promise 的 busy/重复保护及失败报告；行选择 latest-wins，菜单同步异常也能捕获并保留方法接收者；移除 folderClick 消费。F6 使用共享严格区域焦点方法，导航 Sheet 内不越界；关闭/切换代际防止旧恢复抢焦点。
- WorkbenchSurface 保留独立页面根、隐藏页及列表 DOM。新增仅 view.contentEl 范围的原生 scroll 捕获，WeakMap 保存位置/迁移代次；独立 scrollDocument 仅在原生迁移边界推进，避免提前 render 或外国 Document 的零重置污染位置。迁移后恢复可见所属滚动区，隐藏区在已有导航/可见性/resize 边界补恢复；无待恢复项不再遍历，无全局监听或持久化。
- ContentOverview 显示已加载数量及继续加载，ContentSurface 按 200 递增并在更换文件夹时重置；列表节点保留，文件行 44/52。原生文件打开返回真实 Promise，并传实际窗口；数据路径/格式、索引、重复文件与 vault API 边界保持原职责。
- DeviceChoice 使用共享 Dialog/Command，明确选已有 id 或填写非空新名称，取消拒绝、不猜默认共享；必需 AbortSignal 关闭并拒绝卸载中的选择，阻止迟到回调，构造失败也释放监听。Intro 更新视觉并保留懒加载/代次/重试；cancel 关闭但不标记已读。
- 原生 Obsidian 状态栏/池化/主窗口所有权保持，未增加 shell footer；usage 内文最小字号和刷新目标改用令牌。专注 chrome:none 仍有原生 pane menu「在工作台中打开」，成功后才 detach，传当前实际窗口和页面状态。

Lead 按共享边界集成了中央 schema、PanelContext.ownerWindow/移除 folderClick、compose 的真实 Promise/窗口、main 卸载取消、共享词典、focusAvailableInRegion、useLeafMetrics 和跨根 FloatingOwner。worker 未修改这些共享路径。fixture 使用实际 useLeafMetrics callbackref，向 DetailPane 传逻辑叶宽；不依赖跨独立 React 根继承 context。

## 产物与验证

### 冻结后的聚焦检查

| 检查 | 实际结果 |
|---|---|
| 定向 unit：content、device-choice、status-segments、shell | 9 文件 43 测试，退出 0 |
| DOM：shell、ContentPanel、device-choice、intro-modal、workbench/surfaces | 冻结后 10 文件 59 测试，退出 0 |
| scoped tsc：本票全部源码、测试、fixture，skipLibCheck、实际 node types/global declarations | 退出 0，无本票诊断 |
| 生产作用域 ESLint，max-warnings 0 | 退出 0 |
| test:workbench-lifecycle | 10/10，退出 0 |
| test:architecture | 1364 modules，退出 0 |
| test:i18n | 33 词典、5481 keys，退出 0 |
| 已修改 29 个 TS/TSX/MJS 的 Prettier check | 退出 0 |

日志与定向配置均在 /tmp/huhu-t04-implementation：
unit-final.log；dom-frozen-final.log；types-frozen-final.log；tsconfig-tests.json；
lint-frozen-final.log；lifecycle-scroll-final.log；architecture-frozen-final.log；
i18n-frozen-final.log；format-freeze-final.log。

有意义的红绿证据保留：
- SidePanel primary 重复/失败、迟到行导航、隐藏页面 F6、无 panel 窄导航、content 201 条加载、device 显式选择及卸载取消等定向红绿，分别见 primary-*、panel-late-*、f6-*、content-more-*、device-*、unload-*。
- Separator 第二指针可以改动/提交第一指针预览：resize-red.log → resize-green.log。
- 独立导航根菜单 31 低于 Sheet 40：cross-root-menu-red.log。Lead 的 043/045 共享生产者修复集成后，最终 DOM 和实际浏览器层级/命中/Escape/精确来源焦点通过。
- 原生 adoption 在迁移回调前把 180 归零：adoption-attribution-red/result.json。页面/所属文档/挂载数保留，失败只有滚动。新增回归覆盖可见/隐藏、外国零重置、用户复位 0、双向迁移及 dispose；restore-disabled 负控制退出 126，恢复候选通过。提前 render 的配对反例红绿见 scroll-intermediate-render-red.log/green.log。
- leaf580 在 1440 viewport 中错误产生 1440 宽 DetailPane：native-focus-settle/result.json。Lead 确认所属叶宽合同并修复共享生产者；最终严格宽度 580 通过，没有降低断言。

### 实际 Chrome 生产图证明

最终通过结果：
/tmp/huhu-t04-implementation/native-canonical-final-exercise/result.json

- Google Chrome 153.0.8010.47，**一个批准的标准矩阵样本**：390 / zh / paper / coarse / mobile；显式 normal（CDP no-preference + system）和 UI reduce 都执行。worker 没有跑完整 66。
- 两个真实 Document：主文档与同源 iframe。生产 WorkbenchSurface/WorkbenchPages/ReactSurface、ShellRoot、共享组件、ContentOverview、设备选择与 Intro 内容；原生 App/leaf/Component/DOM 扩展仅作为宿主能力边界。fixture 页面贡献使用测试数据，没有伪造控件、启动业务模块或操作 vault。
- 实际 viewport 与 leaf 分别量测。599/600/959/960、Panel/Separator、1324/main1000 →1323/main999、620/main568/360、580/full580 有界探针运行在真实 1440 CSS-pixel viewport，随后恢复样本 viewport；不冒称 1324px 叶子位于 390px 屏幕内。
- 真 CDP mouse/touch/key：Rail 粗目标 ±21.5 上下内点在自身/邻项焦点下保持目标；F6、32/44 Separator、拖拽预览不持久化/提交/复位；无 panel 窄 Drawer；retained-root Dropdown/ContextMenu 的所属文档、层级、命中、内外 Escape 与精确焦点；Dirty DetailPane 两种动效下的同一输入节点/草稿/选区/scroll、继续编辑、放弃和实际关闭来源。
- 设备搜索、已有 id、新名称必填/trim/Enter、取消；实际 mobile Platform/body 标记及 Header status 导航、无 shell footer。host safe/unsafe palette 配置也包含在最终图，完整变体留给 Lead 66。
- 实际 CDP wheel、可信 scroll 和 scrollend 后捕获 180；adoption trail：180 → DOM move 0 → native boundary 180；双向保留同一页/列表及挂载数，迁移后菜单精确一次 focus-open 使用当前目标窗口。
- 完成实际 Scope unmount 后，外部原生输入的点击/输入/重新显示保持焦点和值；最终 exercise 真正 dispose 两个 Surface 与 Intro：各 mounts 3 / unmounts 3、controller 全部 aborted、Portal/modal/pointer/scroll locks 释放、errors[]。
- 目视检查 t04-final-main.png、t04-final-second.png：52px header、可读文本/按钮/列表及 Intro、窄宽无横向溢出。中英及全部色板/密度仍由 Lead 66 汇总。

固定证明：
- native inputDigest：a9e48a64c140f029bdd0664db4b3ced570457cc73d3c979bcfaa319ff8f99c24
- 2251 输入已在冻结时逐个对当前字节校验，drift[]；保存于 frozen-inputs / frozen-native-inputs.json。
- CSS：4628d577624f6b44e1204f7339e3c6dbf5873d98ab59eae5e9bcb717ad280c85（1283693 bytes）。
- DetailPane：830288ba2de1a98a3b62c966d872a78159be20eb1f5df9034bf89d7b935c0075。
- 实际单样本 driver：/tmp/huhu-t04-implementation/probe-driver.mjs，SHA 6678700e000c447a0f096e430b01daf4556c0fc616d17f155543f1888782b3b0；冻结副本 frozen-probe-driver.mjs。
- driver 是 Lead 批准的原 runner 私有副本，仅绝对路径和一个原计划样本过滤不同；生产构建图、守卫与矩阵样本保持。没有把原 runner hash 当作实际 driver hash。

失败输出全部保留。menu 第二次 Escape 早于实际 FocusScope close-focus 完成、动画/被动层尚未可点击、旧中文 Discard/implicit heading 选择器、visibility 人为 500px 叶子超出 390 mobile 导致 autoscaling、缺 runner exercise hook，均作为 harness 失败修正并保留：等待真实生命周期/有限 WebAnimations/实际命中就绪，不用任意 sleep、强制焦点或放宽生产断言。临时 diagnostic-width-pending/diagnostic-driver 明示 NON-ACCEPTANCE，仅为排查后续门而记录已知 580 失败；最终通过使用 canonical fixture，严格 580 断言一直保留。

## 问题与下一步

- 等待独立 high 两轴审查及 Lead 对冻结图的完整 66/集成验收；Lead 已获显式 source freeze，可并行执行。未经新失败/协调不再修改源码、测试或 fixture。
- 同源 iframe 是第二 Document 的真实能力证明，**不是 Obsidian popout 或真实移动端 Obsidian**。原生状态栏、实际 vault/文件创建、窗口/插件启动卸载及完整业务模块仍属于 Lead 的宿主/集成门；没有以组件、DOM 或 Chrome emulation 替代这些结果。
- 未重建 main.js，未声称全仓类型、预算、所有迁移消费者或生产打包通过；保留在 Lead 原子集成/T13–T14 账本。没有安装依赖、改包/资产、提交、推送、发布或更新正式 Ticket/Goal 状态。
