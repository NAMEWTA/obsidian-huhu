---
schema_version: 2
session: "20261031T062046Z"
task: "036-shell-implement"
kind: implementation
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-24
---

## Goal
native:/root/bundle（Astra low）完成T24已授权非Browser界面实施与自动化。T23/T16已done；基于031预检最小充分路径，设计引用为UI-GALLERY，保留既有DS001/004等合同。先等Lead明确wave4冻结解除才能写产品；期间可读和写本REPORT。

## Inputs
Map18、Ticket24完整含D01、DESIGN revision2及批准原型/永久DESIGN-0002、dev/ui及适用参考、031 REPORT、T23真实运行时/runner、execution-boundaries。已有未变化规则可复用，别重新通读全部链接。

## Workspace and Scope
current/dev/base86c500556db1d64865c4cc7f1aff1dd83de071fa；无Git写入/递归代理/真实Obsidian/远程CI。精确生产写集：src/app/settings/react/GeneralSettings.tsx（仅前两段）、BuiltInSettings.tsx、appearance/AppearanceSettings.tsx、appearance/CustomColors.tsx、appearance/Typography.tsx（后四路径相对src/app/settings/react），src/app/intro-modal.ts。测试写集：src/app/settings/react/GeneralSettings.dom.test.tsx、BuiltInSettings.dom.test.tsx、appearance/AppearanceSettings.dom.test.tsx（后两路径同相对规则），src/app/intro-modal.dom.test.tsx，src/shell/ShellRoot.dom.test.tsx，src/shell/host/workbench-surface.dom.test.tsx。新增scripts/ui-review/fixtures/T-24.tsx、T-24.mjs，docs/e2e/dev-overhaul/ui/T-24/**及本REPORT。需新词典键先报告精确位置/en/zh，复用已有优先。所有其他产品/源码/共享产物、T23九项、共享runner/stub只读；不默认获得Ticket宽目录改动许可。

## Acceptance
先沿031已查入口再确认影响，采用真实现有组件，禁止复制假Shell/原型HTML。保持Browser实际共享导航/外框/设置第三段等源字节和视觉效果，不包Shell/Settings父层DesignScope，不建old/new分支；冻结子项按D01记录，不影响独立leaf正常迁移。保持现有主题行为、资源标签和窗口布局。Intro保留ObsidianModal类/onSeen/close API，内容用React owner root且可靠卸载。
General/About/Appearance/Intro使用T23 DesignScope，新增通知只归本leaf；保存pending禁重复、失败保留草稿/有效数据且持久错误可重试，IME不误提交。需要异步控制请先看真实现有接口，不能把fixture改为直接setState绕过真实动作。
真实Shell行为DOM/Chrome覆盖F6与Rail键盘、布局/抽屉Esc及回焦、导航busy/失败/重试/availability、窄宽边界；真实createWorkbenchSurface集成使用限定fixture宿主端口，不改共享stub。48paired标准矩阵/双Document及长文案/主题/缩放/reduced motion按031完整计划；冻结legacy几何只能明确作为观察，不能降低新leaf要求或宣称全Shell新样式。
验证先定向DOM/类型/lint/i18n，停写后Lead串行生成styles/main，再运行本票Chrome矩阵。禁止pnpm build及Browser构建；不要重写现有UI runner通用语义。测试失败先定位产品或fixture，红灯历史保留，不削弱断言。没有对应真实接口的业务状态标不适用，禁止造全14态合格。

## Return
标准REPORT：精确SHA、设计映射、全部真实命令退出、截图/动作/输入、延期及未测边界；首次完成产品/DOM后先发停写消息请求Lead产物，然后继续独立Chrome。最终停写交Lead验收，不改正式Evidence/Ticket/Map/ledger。

### Lead审查返修 D03

Map22追加src/app/intro-content.tsx，Intro外壳保持启动轻量，打开时import内容并防关闭/重开晚到。真实SettingsStore先乐观发布再persist，Appearance同文件补实际store失败/重试接缝，准确区分preview与persisted数据；不得用仅mock reject宣称持久性语义。按周边风格整理新增段，不重排General第三段等冻结文本。此前停写候选重开，wave5未启动，修后重新报摘要/检查。

### Lead审查范围 D04：真实窄容器溢出

Chrome420/2x实际CSS210，Appearance叶宽89、scrollWidth240真实红灯。Lead核对SwatchGrid仅被Appearance消费，批准增加src/app/settings/react/appearance/swatches.tsx窄写集，仅两处grid最小宽改min(100%,原rem)；Appearance两个w-52 Choice补max-w-full，其他共享父框/Browser不动。该路径已在Ticket原writable app/settings/react/**中，不改变Map22路径合同/DAG。改完先停写并通知Lead只重建样式供迭代Chrome，最终全类型/esbuild待候选稳定再做，避免每次几何修正重复全量。原失败结果保留。
