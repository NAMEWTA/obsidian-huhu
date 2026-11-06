# 任务回报

Session: 20261105T094057Z
Task: 003-implement-adapters
Status: completed

## 聚焦交接
已交回 T-01 升级适配器候选，独占修改仅涉及获派五个脚本/清单。已先比较实际发布源文件，再更新源哈希；多 Document 转换锚点无需修改。生产守卫继续要求精确物理文件数和审核过的源哈希，另导出要求完整精确计数表的夹具工厂；没有省略源验证。当前 54 项定向正反检查通过，完整生产图仍因五个迁移中消费者导出错误失败，不能记为构建或宿主验收通过。

## 产物与验证
- 修改：scripts/ui-adapter-inputs.json、scripts/ui-adapter-guard.mjs、scripts/verify-ui-adapters.mjs、scripts/sonner-styles.mjs、scripts/radix-owner-document.mjs；均保留工作区，未写包清单、lock、node_modules、构建产物、正式 Evidence 或 Ticket 状态，未提交。
- API：createSonnerStyles(graphCounts)、createRadixOwnerDocument(graphCounts)；未传参数仍采用生产清单。传参数必须覆盖该适配器的所有 suffix，每项为非负安全整数；缺项、多项、负数和小数均拒绝。T-01 夹具 Sonner 计数为 1；modalTransforms 全部 suffix 计数为 1。已通知主 writer 对 runner 显式传入合同。
- 源比较：Sonner 2.0.7 → 2.0.8（MIT，https://github.com/emilkowalski/sonner），菜单 2.1.24 → 2.2.1、Select 2.3.7 → 2.4.1、RovingFocus 旧已审核发布源 → 1.2.1（MIT，https://github.com/radix-ui/primitives）。依据为本机对应 node_modules/.pnpm 发布包的 dist/index.mjs 与 package.json，而非仅接受版本名或哈希。
- Sonner 差异：装饰 SVG aria-hidden、visibilitychange 正确清理、消息历史上限/订阅重播/撤销 pending dismissal、默认 toast 类型、swipe 方向检查和可访问标签；CSS injector 函数/调用各仍一处，适配器仍只移除两者、不改 toast 逻辑。CSS 改动为 hover 背景与边框相关变量，继续由已有外置样式构建链读取新包 CSS。
- Menu 差异：新增 FocusScope branch 注册/Provider、scroll shards、枚举和导出整理，typeahead 函数输出形式变化；已有 owner document/window/event/timer 锚点全部仍匹配，新增 branch Node 来自当前 content ref，无新 ambient document 访问。
- Select 差异：用户选择和停止传播状态、首项定位回退、原生 select change 事件分支、枚举和 typeahead 输出整理；新增 Event 创建仍在已适配 SelectBubbleInput 内，因此继承所属窗口 Event。已有表单跨 realm 判断与所有锚点仍适用。
- RovingFocus 差异：方向/布局枚举与导出整理；focusFirst、CustomEvent、timeout 锚点未改变。
- 生产图只读观测：在生产构建插件链前加本地 onLoad observer，所有 14 个 suffix 各见一个物理源文件。FocusScope 1.3.1、FocusGuards 1.2.0、DismissableLayer 1.2.1 已去重，原 files=2 调整为精确 1；删除所有只存在于旧 pnpm cache 的旧 Sonner/Menu/Select/RovingFocus、FocusScope 与 DismissableLayer 哈希，没有保留多余 allowlist。该观测不等于完整构建成功。
- node scripts/verify-ui-adapters.mjs：最终退出 126。失败前明确输出 54 focused positive/negative checks passed，覆盖实际审核发布源转换/JS 解析、锚点丢失、CSS injector 额外调用、重命名/CJS 入口、未知源、额外副本、无效夹具计数、夹具缺失输入、expected-zero 输入的哈希和额外副本，以及真实 T-01 组件夹具打包。随后完整生产构建按原样执行并保持失败，不屏蔽消费者错误。
- git diff --check（五个修改文件）：退出 0。node --check 对守卫及验证脚本：退出 0。
- 过程材料（本地纯路径）：/tmp/huhu-adapter-upgrade/final-check.log、/tmp/huhu-adapter-upgrade/production-observed.json、/tmp/huhu-adapter-upgrade/sonner.diff、/tmp/huhu-adapter-upgrade/react-menu.diff、/tmp/huhu-adapter-upgrade/react-select.diff、/tmp/huhu-adapter-upgrade/@radix-ui_react-roving-focus_dist_index.mjs.diff。
- 未验证：生产完整构建成功后的最终图断言、真实 Obsidian popout、完整 UI E2E；由 Lead 在消费者完成后统一执行。

## 问题与下一步
完整图失败仅报告当前实际错误：AppearanceSettings.tsx 引用已移除 deriveCustomTokens；TerminalTabView.tsx 与 WorkspaceLayout.tsx 各引用 panels 4 不再导出的 PanelGroup、PanelResizeHandle，共五项。待相应 owner 完成 API 迁移后重新运行同一 adapter 命令；若图仍与单副本合同不同，必须复核实际路径/依赖再调整，不能放宽计数。completed 仅表示本候选交回，业务完成由 Lead 验收。
