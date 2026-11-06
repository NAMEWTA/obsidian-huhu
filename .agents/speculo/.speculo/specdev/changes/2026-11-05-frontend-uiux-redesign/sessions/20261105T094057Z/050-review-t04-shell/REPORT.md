# 任务回报

Session: 20261105T094057Z
Task: 050-review-t04-shell
Status: completed

## 聚焦交接

独立 reviewer：native:/root/review_t04_startup（既有 gpt-6.1-sol high，未参与实现、未委派）。standards **request-changes**；specification **request-changes**：确认 Intro 内容加载失败关闭后仍记已读的 P2，以及 Rail 当前项未符合批准 UI-002 的 P2；另需将必需 owner 负向浏览器控制并入正式 fixture。Lead 已逐项接收，完整 66 首案因 579.9999389648438 与 580 的严格浮点相等断言失败，未把它误判为旧 1440 宽度缺陷复发。本次独立 unit43/DOM59、生产 lint31源、精确生产/测试/fixture 类型均通过，额外 Intro 反例准确失败；真实双 Document 层级负向配对已由本 reviewer 私有浏览器控制补验通过。53 路径及 2251 原输入结束 drift=[]；**明确释放 050 本次源码/fixture 冻结，允许 Lead 批量修复后重新冻结复审**，不宣布 T-04/Goal 完成。

## 产物与验证

### 固定输入、独立性和范围

Review mode: source-files；Risk: high；Independence: required；Strategy: independent；observed HEAD `37fcede4210a19bcc2a74809e7fdd301e5717957`。沿用当前未变化 AGENTS/dev/ui/SpecDev C/I、独立双轴/错误/可靠性合同，读取 050/041 TASK、041 最终报告、T-04/Map16/Spec AC031–033/114、批准 DESIGN3 及 UI-002 实际 rail/layout CSS。规范来源为显式 Ticket/Map/Spec/DESIGN/原型；source-files 不从 commit 推断外部来源。标准来源为项目指令、dev/ui 及真实 lint/TS/Vitest 配置；sources-manifest.json 留原字节摘要。已批准 DESIGN 的叶宽合同优先于 ui/reference 内仍待后续票更新的旧 280/500 等资料，没有用旧规则降低 272/480 验收。

53 路径清单：`/tmp/huhu-t04-implementation/frozen-sha256.json`，SHA256 **1ada99df4469eba18bfbf02319a17a52dbba86499aec365fa0b294dce5414ebe**；逐文件对当前及 frozen/ 原字节检查通过。包括完整 worker shell、content、intro/device、status/surfaces/focus-state 和 T-04 两 fixture 源/测试；具体路径及 SHA 可回读 source-scope.json。根共享 13 路径 manifest `09d07131573037f5832759fd9f1216b4d7713c81faf10b018a629d9957f6b241` 结束仍匹配，049 的停止后拒绝/Notice、真实 opener、state/metrics/DetailPane 既有结论未失效，不重跑无新风险的该批证明。

2251 native 输入清单 frozen-native-inputs.json 文件 SHA 为 `caddb6603e22f4bdec65cd27eb3e2ce3240679ecee225c8bf37f6c6e142c6ea6`；按 runner 的 JSON 紧凑序列重算 inputDigest，准确为 **a9e48a64c140f029bdd0664db4b3ced570457cc73d3c979bcfaa319ff8f99c24**。2250 实体文件逐项核对当前/frozen-inputs；虚拟 `/opt/Obsidian/resources/obsidian.asar:app.css` 按真实 ASAR header/offset 提取，再核对 frozen-inputs/host/app.css，SHA `f612f1e8f36486fa57f3b8bd45f0c848409d5b168002e757a13c6d286a7b4c41`。首次普通文件遍历把虚拟引用列 missing，并非源漂移；随后上述专门验证及最终完整重验均通过。CSS SHA `4628d577624f6b44e1204f7339e3c6dbf5873d98ab59eae5e9bcb717ad280c85`、实际单例 driver SHA `6678700e000c447a0f096e430b01daf4556c0fc616d17f155543f1888782b3b0` 均核对。

读实际调用链：WorkbenchShellSurface → ShellRoot/WorkbenchPages/ReactSurface，PanelContext/ContentPanel/真实 new-note helper，DeviceChoice → openReactDialog，IntroModal → lazy content/main onSeen，native status/usage/ribbon。新 scroll 逻辑及 fixture/runner/CDP/输入哈希均纳入；无全局冻结要求。写入仅本 REPORT 与 `/tmp/huhu-review-t04-shell`；无正式源码、资产、配置、依赖、索引、状态/Evidence 或 Git 写入，无安装/worktree/提交/推送/发布。

### standards 输出

Reviewer: native:/root/review_t04_startup
Result: request-changes

**S-01 · P2 · Intro 加载失败的关闭仍记作已读。**

定位 `src/app/intro-modal.ts:43` 的失败处理与 `:56` 的 onClose；真实消费者 `src/app/main.ts:543` 将 onSeen 接到 markIntroSeen，`:553` 持久设为 true。导入失败后只显示 alert/retry，opened 仍为 true；用户关闭错误态就调用 onSeen，即使欢迎内容一次也没有呈现。下次启动不再显示介绍，违反 050 的 failed-lazy/retry 不伪造 introSeen 边界。

私有 `intro-failure.dom.test.tsx` 保留实际 IntroModal，只让 intro-content 模块加载拒绝并隔离 native Modal 端口：确认真实失败 alert 已出现、关闭前 seen0；调用用户关闭后期望 seen0，实际 seen1。`intro-failure-actual.log` 精确失败在该断言。初次测试缺私有 node_modules 解析导致未收集，保留 intro-failure.log，不算产品红灯；补私有依赖链接后才获得上述真实红灯。原晚导入/取消测试通过不能覆盖此失败分支。

最小修复需区分“已展示可确认内容”与失败/取消，使失败关闭不确认，并保留失败重试、成功确认一次、取消/迟到内容不回写。该失败逻辑在 HEAD 已存在，但在本次显式 Intro 完整生命周期范围且 acceptance 点名，故不能略去。Lead 已明确接受修复，不要求改变其他 onboarding 产品行为。

其余标准检查未发现需再扩张的具体源码问题：

- 唯一新 schema 的 shell 薄重导出/focus-state 与 Root parser 一致，不读旧外层状态；domain WorkbenchTarget API 保留。导航使用实例内 latest-wins、取消和 stale generation，不新增持久宽度或第二导航引擎。
- layoutFor 只按真实叶宽 600/960；panel clamp 为 220/480/default272，拖动只写局部 CSS 预览，松开才保存，第二 pointer 被拒，cancel/lost capture 恢复；没有 panel 时不空占列，窄宽仍可 rail-only Sheet。F6 复用共享严格区域筛选，modal capture 先消耗区域键；generation/visible 阻止旧 Sheet/menu 回焦抢新叶。
- WorkbenchPages 保留隐藏/inert presentation，独立 root、draft、page/navigational DOM 继续由原 lifetime 管理；关闭/晚绑定/模块变化走已有取消和 dispose。Content 200→400 分页追加保留 UL 与前序 li，selectedFolder/new-note 仍由 vault API 和 huhu 当前布局负责；Promise/ownerWindow 接缝沿实际 helper，未用 permissive mock 代替。
- DeviceChoice 有必需 signal、pre-aborted 不建对话框、abort 拒绝并关闭，settled 阻迟到选择，构造失败也移除 listener；显式已有 id 或非空 trim label，无默认共享。实际原生状态栏池化、主窗口一次注册、usage token/订阅清理保持，无 shell footer；mobile 状态与窄桌面布局分开。focus chrome:none 原生 pane menu 保留当前窗口/state，成功后才 detach。
- 新 scroll capture 仅装在 view.contentEl，dispose 同对象/同 capture 参数移除；WeakMap 值仅数值/generation，不强留关闭 DOM 或窗口。scrollDocument 仅原生迁移边界推进，foreign reset 不覆盖旧值；generation/restorePending 限定恢复，隐藏项在已有 show/navigation/resize 边界补恢复，用户 0 被明确保存。无全局 handler、额外 timer 或持久化滚动库。独立重跑的 paired scroll 测试含中间 render、隐藏页、往返、用户归零及移除 capture，均通过。

### specification 输出

Reviewer: native:/root/review_t04_startup
Result: request-changes

S-01 同时违反启动介绍失败边界，不跨轴重复计数。

**P-01 · P2 · Rail 当前态仍为旧 soft 平面样式，未落实批准 UI-002。**

定位 `src/shell/rail/Rail.tsx:54`。DESIGN §4 要求当前项白色 raised 浮起和左侧 3px 强调条；UI-002 final/styles.css 的 `.rail-btn[aria-current="page"]` 明确 raised/阴影、`::before` width3。当前生产类仍为 `bg-sidebar-accent`、`after:w-0.5`，且无 raised 阴影。

本人用真实当前 T-04 production-component 图在 Chrome、main/second 两 Document、1200px 叶量测：按钮36、圆角8 正常，但 current 背景均 `rgb(227, 238, 236)`，raised 参考应为 `rgb(255,255,255)`，marker 均 2px、boxShadow=none。私有 rail-native/result.json 保存 computed，rail-main.png/rail-second.png 已目视；与原型及 token 映射相符，非仅根据类名猜测。最小修复仅当前项 raised/阴影/3px 标记，保留尺寸、命中及主题 token，不改布局。Lead 已接受。

**V-01 · 必需覆盖缺口 · 正式 fixture 缺 ownerless/lower-owner 浏览器控制。**

实际 index.mjs:306–314 只检查正向 menu>Sheet，接着做两级 Escape/真实 Scope 结束回焦；没有 ownerless31<Sheet40、lower-owner41<later50 正反配对。045 原独立报告把这些列为必须保留的浏览器门，050 也明确要求，不能凭 045 DOM/源码结果或 canonical 一例 errors[] 宣称正式 T-04 fixture 已覆盖。same-owner 菜单项自身的可信点击也未在该段执行；后面 adoption 的 ContextMenu 点击属于不同组合。

本人已增加**私有验证，不是生产修复**：actual T-04 page、独立 React root、真实 Dropdown/Dialog 与 CDP，双 Document 均验证 same-owner menu41/Sheet40 的 item elementFromPoint 可信命中、可信点击确实增加 selections；外部受控 popup31<Sheet40；物理低 owner popup41<后开无关 Dialog50。最终 negative-native-final/result.json passed、errors[]，两 Document 全部配对通过并清理。故未发现对应生产者的新层级缺陷，但正式 fixture 仍应加入这些持久控制；Lead 已接受该补测范围。

### 原浏览器证明及范围限制

已完整回读 canonical-final-exercise 的真实结果、2251 图和实际 driver/fixture协议。唯一通过样本为 390/zh/paper/coarse/mobile；双 Document 为主文档与同源 iframe。可信 mouse/key/touch/wheel 经 CDP 发出，click helper 检查实际 elementFromPoint 并等待有限动画/命中就绪；Scope 回焦等待真实 focusScope.autoFocusOnUnmount 和精确 custom-menu source，没有强制 focus 制造通过。有限 1440 viewport 里的真实叶阈值、52/272/36、32/44 separator、1324/main1000 与1323/main999、620/main568/360、580/full580，随后还原样本 viewport，报告未混为同一390屏内叶子。

保留页面/列表/详情编辑器节点、草稿、选区1–4、scroll40；dirty Keep editing/Discard、设备明确选择/新标签/cancel/mobile status 导航等有真实回执。adoption trail 明确真实可信 wheel/scrollend 后180 → DOM move0 → migration boundary180，往返同 page/list/mount，迁移后 ContextMenu 动作传实际目标 Window。最终 actual surface/intro dispose，各 doc mounts3/unmounts3/controller aborted，无 Portal/modal/pointer/scroll lock/errors。已目视 canonical390截图及本次 wide rail图；iframe/Chrome emulation 均不冒称 Obsidian popout/真实移动端。

Root `/tmp/huhu-t04-lead-final/result.json` 在 finished 后读取：failed，首个320/en/paper/fine用例停在 index.mjs:391，width 实际579.9999389648438而预期580，inputDigest 仍a9e48a…f99c24。该证据只说明静态相等检查遇到浮点/动画几何差异，不能据此宣称 production 回到1440宽或全矩阵通过。Lead 已接收，以 exact computed CSS580 加极小 rect tolerance/真实动画完成继续验证，并保留原1440 vs580反例；本 reviewer 未修改断言或执行其后续66。

### 实际命令、结果和证据

私有目录 `/tmp/huhu-review-t04-shell`；所有命令从项目根执行。路径集合在 dom/unit/lint-paths.json。

| 检查 | 实际结果 |
|---|---|
| 53源 current/frozen 与2251 native图/ASAR/输入digest，开始及结束核验 | 全部匹配，最终 drift=[]；before/final-verification.json。sources-manifest.json/公共 source-scope.json 保存输入 |
| source-files review-scope、限定53路径 git diff HEAD --check | 退出0；后者仅tracked格式检查 |
| `TMPDIR=/tmp/huhu-review-t04-shell pnpm exec vitest run --project unit <owned9files>` | 退出0，43/43；unit.log |
| 同命令 `--project dom <owned10files>` | 退出0，59/59；dom.log |
| `pnpm exec eslint <31ownedproductionfiles> --max-warnings 0` | 退出0，零警告；lint.log |
| `pnpm exec tsc -p /tmp/huhu-review-t04-shell/tsconfig.json --pretty false` | 退出0，生产/测试/fixture及实际传递依赖0诊断；types.log。不是全项目tsconfig/build通过 |
| 私有vitest.config.mts，实际 Intro failure control | 宿主退出126；1项失败，正是seen1≠0；intro-failure-actual.log |
| `node .../rail-probe.mjs --suite frontend-redesign --ticket T-04 --matrix redesign --out .../rail-native` | 退出0，1有界测量样本；双Doc computed/截图证明P-01，不称整个产品通过 |
| 私有 `negative-driver.mjs` 同参数，out negative-native-final | 退出0，双Doc3组配对；errors[]、surface roots各2/2清理；negative-native-final.log/result.json |
| 041原 lifecycle10、architecture1364、i18n33词典/5481keys；041 return validator | 回读原绿日志/精确源；未重复构建或写scripts/tmp；return结构验证退出0 |
| 050 dispatch validator | 退出0，errors=[]、warnings=[] |

实际私有 rail driver SHA `2e6f373b3bee6796cde04596986d9ffe277325539772db3069cb2ef22a7d1ec7`。额外 native entry SHA `3b43329f060a384f37c66cebcb751725a13d67e4905e0c08d9f226d252e3c9da`、driver SHA `27a72d3753dad152a4e191a025959819c21efb2a49cb45250398edacb3a24fe4`；它扩展真实 production 图为2252输入，digest `0ae066cb9f972b7f790058fe33cb62b41d134000edf42efc864d8394728316d5`，没有冒用canonical2251摘要认证私有控制代码。第一次额外 native helper过早点击动画中按钮，第二次过早读到过渡z38，均作为私有harness失败保留 negative-native/negative-native-settled，最后等待真实有限 WebAnimations完成及静态41条件才通过；不列为产品发现，不用sleep/强制焦点或扩大生产断言。新控制不替代正式fixture持久回归。

## 问题与下一步

Lead 已接受 S-01、P-01 及 V-01 的批量修复/补测，原041/045/049报告与历史红灯保留。**现释放050全部53源码/fixture冻结**；请完成最小修复、保留上述私有反例和正式新控制，重新冻结受影响源/样式/浏览器图后复审。

原完整66、真实Obsidian主窗/popout、原生status/vault/插件启动卸载、main.js/build/bundle/notices和全局旧consumer债务继续归Lead/T13–T14。本票局部0诊断不抹除全局已知错误；本报告不推进Ticket/Goal、不提交/推送/发布。
