# 任务回报

Session: 20261105T094057Z
Task: 016-review-t02-primitives
Status: completed

## 聚焦交接

独立 reviewer 为 native:/root/review_host_types；未参与 012 原语实现或 Lead 词典修改，未委派。双轴结论为 standards **request-changes**（两项 P2）、specification **request-changes**（一项 P2、一项 P3）；candidate 已完成本次审查交回，尚不能接收为完成分区。原始 iframe DOM 失败保留；独立 guarded Chrome 探针确认两 Document 的真实方向键、受控值、ARIA 与焦点正常，因此没有将 probe3 的历史失败定为生产控件根因。下一步由 Lead 另派最小修复及测试覆盖转移；本报告写入后保持不可变。

## Goal

审查冻结 012 原语/表单分区和 Lead 的 shared UI 词典；标准轴核对公共 API、可访问性、测试与边界，规范轴核对 DESIGN revision 3 与 AC-011–013 中适用部分。范围不含同时修复的 modal/tree/resizable，也不代表完整 T-02、T-14 或生产构建验收。

Strategy: independent；Risk: high；Independence: required；Mode: native。实现者为 012-implement-t02-primitives 的 writer 与修改 shared UI 词典的 Lead；reviewer 没有实施/修复这些输入。Lead 应从实际派遣/返回工具事实核验身份与独立性；本报告不自证该父级核验。

## 产物与验证

### 固定输入与影响范围

基线与 observed HEAD 均为 `37fcede4210a19bcc2a74809e7fdd301e5717957`。012 原快照 56 个存在文件的 SHA256 均匹配 /tmp/huhu-012-implement-t02-primitives/frozen-sha256.json；测试前与最终交回前独立核验，drift=[]。本次增加冻结 Lead 字典，共 57 个读取文件；实际审查交付为 37 个 012 修改文件与一个词典，共 38 个路径。初始/最终哈希清单保存在 /tmp/huhu-review-t02-primitives/input-sha256.json，其文件摘要为 `6aa217a60a1199752ae0ab9d51f4060978e84107c3a029693d793b85dccc9ada`。

采用只读 working-tree scope 工具对上述 38 路径显式 `--file`，含新增测试/组件，完整结果为 /tmp/huhu-review-t02-primitives/scope.json。tracked diff SHA256 为 `7e1ace4c7f7af0b8387098fda428c5aa122c9c31cde9679a9cd327ccbd530087`，scope input SHA256 为 `0ac2e8922f990a9f35b6c6f2a9bb82539b632c36bbd736126b4236b91bf3dfbe`；index SHA256 为 `97e75c6acc512339db7d69b84c17bc9a21b20b21dcd93912ae51b4010ca24495`。原始 HEAD diff 与 012 before/final diff 结合核对；新增文件单独阅读，未把 HEAD 或 tracked diff 冒充整个工作副本。

| 审查文件 | SHA256 |
|---|---|
| src/ui/components/accordion.tsx | 8c4c9c1e80eeb5e522a039267855b0619bfb31eb6437dbf09724ec8e74a2a184 |
| src/ui/components/badge.tsx | 8273a2ab88ec2ca7618c99e86d4691216fc65eca32cdd76577c2d0d4f5aa6070 |
| src/ui/components/button.dom.test.tsx | 0e92196437438674d2db580e7b7ed8204f2ee82fe0ca3bfd61c4d342c72c868a |
| src/ui/components/button.tsx | 222bf0baa96db5e7881bdd4079dba7e05ef410a36e55da7229b7ce2891ea79f6 |
| src/ui/components/card.tsx | 3b26311d93257ba5915191629cc88172ebe8461e5947af5679ac91c04e96a825 |
| src/ui/components/checkbox.tsx | 85709058d9c07b4ac371aef955fcd93c1b3fd59aa6f1268203045f4cbaa37de8 |
| src/ui/components/collapsible.tsx | 5930fa10f7f73917bbcbca34cac348079b92fc6f0d15fc0313984303e08c6ea4 |
| src/ui/components/huhu/ActionButton.tsx | 1fc84b645dce12f30e67b9c8b5791b207c6caac23812c830730ee18628d4600b |
| src/ui/components/huhu/AgentWorkingSpinner.tsx | 132e38022b53c1c031a0349a547b06b82c2ea71aa1f2bfff5ae39e92dffa3543 |
| src/ui/components/huhu/EmptyState.tsx | ffa82185a8a1f6c247a8868b719b7dfbd236821056d737d8b9d7676bcfeaa1a4 |
| src/ui/components/huhu/IconPicker.tsx | bfebfb6efbc88b3c58c94561b162002dcbd62700212e5aa43a5d88672b4677f2 |
| src/ui/components/huhu/InlineRename.tsx | 9915ac180910c81e5e2633ef28eac724566e2308462e1cea4a5c2001ff459b8f |
| src/ui/components/huhu/PathPicker.dom.test.tsx | 37504a24bcf6b4e0c8f37e215429cf387ddb9e9fa5aafffd9fc829aa46268e76 |
| src/ui/components/huhu/PathPicker.tsx | fe6c2329ff665779d6b901dae676ca6be6031f3fa7cf129bd6142d91b6d3f977 |
| src/ui/components/huhu/SettingsFormControls.tsx | 2b5456c0bee2564687ec419bb6ba28c1d9ab670db5d45352276e6e68ac822c94 |
| src/ui/components/huhu/SettingsSection.tsx | ab5766b707eb97a2c15606fd6a388bd459220ddca5f64aa306d1cf68038e8c87 |
| src/ui/components/huhu/ShortcutKeyCombo.tsx | 6381edd85752555702e9d2938d932297931b507a2e21e19b1e4482d34100fefd |
| src/ui/components/huhu/StatusDot.tsx | 90a1715cc435e62fd81d367b8f8edee0c2f75c29cbe94c8c56149b7194e074c8 |
| src/ui/components/huhu/WorkspaceUsage.tsx | 03eed794709e61c0b70a32455eb5e1784255ac2c6fb030bf3413ecbe1599da1c |
| src/ui/components/input.tsx | ee163b52d1f3ad79af8c17165264c3d8200aadb427c7fd82396fdd33e31f2711 |
| src/ui/components/label.tsx | c95927811417e0f4edac0559a48847b51b4f28f9f927a3de0c14cba324c439fc |
| src/ui/components/progress.tsx | a90f55bc36df234c6688ac231a021f6d3ce0dc39093d6f80ba380601d4445e54 |
| src/ui/components/scroll-area.tsx | 615a8e283d201dc86da06c75d27ee9d7c55cf28e2fed49c010789c1fbcc9b75c |
| src/ui/components/select.tsx | 378b4b4fdf46f283c5fcfed48c425ddc3d4eeeb9b5ff8931cca703dc846c4545 |
| src/ui/components/slider.tsx | 31d39822e63cee04b4d99df0906e5e5d06a12e61dcd0ae7073bc3990b3ea95fc |
| src/ui/components/switch.tsx | 470bc0b4e1b5be5a74cc10908e67701d454f8578b7d4f9bd5a2439162683dd75 |
| src/ui/components/table.tsx | 382cb1c0bf45b8b77b4f3aff57c9e9f9d338acebf369eb0dd33a8f009c4664f0 |
| src/ui/components/tabs.tsx | e0ae0320f40086f874e6018b833319de2d594583b6b70580db6b22e96f6882c8 |
| src/ui/components/textarea.tsx | e751239077949020aa25049b8c1de053043252a4678b06291a10c4c4bf7c73c9 |
| src/ui/components/toggle-group.tsx | 15f1f291d8d34f8a017adf7a84a30a8b022b6533b390350cd14a77d016d08b75 |
| src/ui/components/toggle.tsx | 72646e6eb54c8cdb4d6a57810efda106c460cc3cda9947275a8ae22f4721af1d |
| src/ui/components/huhu/FormField.tsx | c1965c7e73a5ae02699a1c391517ba8284028b08fdca81d735ac1cb99019791f |
| src/ui/components/huhu/FormField.dom.test.tsx | cf20686040c853f9bc7451cada48c24de619dbed05cd770a96c79c7144af8e5d |
| src/ui/components/huhu/Notice.tsx | d965b27ef18e4bf4f9ab7b51f017986d9eac8827da92a67abbedc4ca258f9769 |
| src/ui/components/huhu/Notice.dom.test.tsx | 9b89ab3a5c02c8199a30df2a95d45a95c0f5c88b38c06b8f328e4393ba92421d |
| src/ui/components/huhu/TaskContent.tsx | 5f6e715bc4c6d889dda1ff362be7b73d5011755a9f6299bff9be9c776ceb9c6a |
| src/ui/components/huhu/TaskContent.dom.test.tsx | 516541718a732b54c7d7ba477fcd0bbf934dfaf0ac4d22a300edadf44f6bd35d |
| src/shared/i18n/lazy/ui.ts | 352563445a45aef89b5732e511a2067b6c19a544ed96374679b4b9316754ef03 |

未改的 19 个授权文件按 012 的 56 文件原快照核验；没有将其算为新增改动。scope 的其他 dirty/excluded 路径属于主题、工具链、适配器、modal/tree/resizable、fixture、共享资产与 SpecDev 工件，并不属于本次分区；只读必要上下文，不冻结/接收其活跃候选。独立浏览器探针的依赖输入另在 /tmp/huhu-review-t02-primitives/browser-inputs.json；这些 transitive 上下文不变成被审修改范围。

影响追踪：Button 的 Slot 与原生 form/type/disabled、直接调用方与已有七个标签/截断风险测试；SettingsFormControls 的 ToggleGroup/Radix、Switch/Checkbox 的受控值和 busy；FormField/InlineRename/PathPicker 的 label/help/error 关联；Tabs/Select 转发与 ownerDocument 适配；Card/Table 等 token/密度；Notice/TaskContent 的纯展示边界。没有修改源码、测试、词典、依赖、Git/index、main.js/styles.css 或正式状态/Evidence。仅写本 REPORT 和授权 /tmp 过程材料。

### 规范与标准来源

规范发现：未提交分区没有来源 commit/PR，commit 引用分支不适用；已回读 016 TASK、012 TASK/REPORT/快照、T-02、tickets-map revision 8 的原子集成/写集合同、spec 的 AC-011–013、批准 DESIGN revision 3 §3–7 及 UI-002 的来源/基线绑定。DESIGN digest 仍为票据绑定的 `49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66`。既有 docs/design-system 与 ui 参考中的旧视觉规则按 Map 的优先级由获批 DESIGN 覆盖；作用域、生命周期、许可与键盘规则继续适用。

标准发现：AGENTS.md、dev/ui Skill、architecture/obsidian-api/testing、design-system/motion-a11y 参考、实际 tsconfig/tsconfig.test/eslint/vitest 配置；未发现额外 CONTRIBUTING/CODING_STANDARDS。应用已读 code-review 的 reviewer/source-discovery/Fowler/risk/working-tree/review-evidence 与 test-reliability 合同。现有上游 Orca/shadcn 署名与源定位保留；新增三个展示组件没有领域服务或模块类型导入，没有新增依赖或第二套控件引擎。

### 实际执行

环境：Linux、Node v26.11.1、pnpm 11.1.3、Google Chrome 153.0.8010.47。

| 检查 | 退出码与真实观察 |
|---|---|
| 56 原快照 + Lead 字典的前后 SHA256 核验 | 0；57 checked，drift=[] |
| `pnpm exec vitest run --project dom src/ui/components/button.dom.test.tsx src/ui/components/huhu/FormField.dom.test.tsx src/ui/components/huhu/Notice.dom.test.tsx src/ui/components/huhu/TaskContent.dom.test.tsx src/ui/components/huhu/PathPicker.dom.test.tsx` | 126；25 passed / 1 failed，5 文件中仅 FormField 的 raw iframe 用例失败；dom.log 原样保留 |
| `pnpm exec tsc --noEmit --skipLibCheck -p /tmp/huhu-012-implement-t02-primitives/scoped-test-types.json` | 0；精确 56 文件与真实传递依赖类型检查，types.log 为空 |
| `pnpm exec eslint <51 个现存授权生产文件> src/shared/i18n/lazy/ui.ts --max-warnings 0` | 0；52 个生产文件无错误/警告，eslint.log 为空；没有把被忽略的测试算为 lint 通过 |
| 范围差异 `git diff --check HEAD -- <相关原语路径与字典>` | 0 |
| `node /tmp/huhu-review-t02-primitives/browser.mjs`（最终输出 browser-form.log） | 0；真实 React/安装包 Radix + 精确 guarded ownerDocument adapter，无运行时错误；按下面观察复现 API/尺寸反例，不把命令退出 0 当作这些反例通过 |

独立浏览器探针只将授权 /tmp 的最小 fixture 打包，直接导入冻结生产 SegmentedControl、Table、Button、SettingsSwitchRow；没有构建插件或覆盖共享资产。先用 esbuild metafile 发现这条最小图的准确包入口计数，再由原 createRadixOwnerDocument/guardedAdapter 校验摘要及每入口精确计数并执行真实适配；未修改 node_modules、生产适配器或加入测试专用键盘引擎。探针使用生成 styles.css 的固定副本（SHA256 `64c1c0c2d3ca0286a50a96b9571f5e81703fdba91e2fe33c1ccc0c617fb8858d`），输出与依赖摘要仅留在 /tmp/huhu-review-t02-primitives。

两 Document 中，真实 CDP keyDown/keyUp 的 ArrowRight 从 First 跳过 Disabled 到 Second，同时 value=b、Second aria-checked=true、tabIndex=0、activeElement=Second；ArrowLeft 反向恢复 First/value=a。最小探针的 synthetic keydown 也能更新到 Second，不能从历史 probe3 的不同 fixture 输入推定组件根因。真实两 Document 是 same-origin iframe，仍不是 Obsidian popout。

额外回读的历史证据：/tmp/huhu-t02-implementation/segmented-production-probe3/result.json 保留 main ArrowRight 超时、焦点 Second/value=list；随后 /tmp/huhu-t02-implementation/segmented-trusted-probe/result.json 为 passed、66 cases、errors=[]。后者 SettingsFormControls/ToggleGroup 输入匹配本冻结源；Lead 保留的 /tmp/huhu-t02-trusted-segment-fixture/index.tsx（`666184bb6c63ad9ab9c562880c3b63980203384518524248175594fafebd9570`）与 index.mjs（`56677094d544a0f98fa57aa33780a106e27b25c8f6afa8c60a98842f2bf7ffab`）也匹配其 inputs，副本在本 review /tmp。两个历史 run 的 fixture、styles、活跃 tree/resizable 输入有差别，未冒充单变量根因实验。

## standards

Reviewer: native:/root/review_host_types
Result: request-changes
Findings: 2（P2）

### STD-01 · P2 · asChild 丢弃显式 button type，导致原本禁止的表单提交

路径：src/ui/components/button.tsx:114。

反例：在 form 内渲染 `<Button asChild type="button"><button>Cancel</button></Button>`。当前代码对所有 asChild 强制 `type=undefined`，Slot 子按钮没有自己的 type 时恢复浏览器默认 submit；原 Button 直接透传 props，不会丢掉调用方 type。独立真实 Chrome 观察到 type=submit，点击后 form onSubmit 被调用 1 次（browser-result.json 的 form）。这会使取消/普通操作意外触发表单提交，而声明的公共 Button API 仍接受 type。

依据：012 TASK 的 asChild/原生语义保留与 016 的 Button 公共契约审查要求。最小满足条件：保证显式 type 能到达实际 slotted button/可透传组件，并保留子元素自己明确指定的语义；增加真实 form 回归，确认显式 type=button 不提交、显式 submit 正常且不会破坏链接场景。不要仅通过给某个测试子节点补 type 掩盖父级参数丢失。

### STD-02 · P2 · asChild 自定义 button 子组件失去原生 disabled

路径：src/ui/components/button.tsx:96、src/ui/components/button.tsx:115。

反例：`Wrapped(props) => <button {...props}/>`，再渲染 `<Button asChild disabled><Wrapped>Save</Wrapped></Button>`。实现只给 children.type 严格等于字符串 button 的元素添加 disabled，同时停止从 Slot 下传 disabled；正常转发所有原生 props 的自定义组件因此得到 disabled=false，仍是可聚焦按钮。独立 Chrome 观察到 native disabled=false、aria-disabled=true。点击防护仍能拦住 onClick，所以不误称点击回调已执行；问题是原生禁用与键盘焦点语义回退，其他键盘处理/表单行为不能再由 native disabled 保证。

依据：012 的 asChild 兼容和真实 disabled/busy 合同、dev/ui 原生控件语义。最小满足条件：向可组合子组件保留原生禁用 prop，并继续阻断 slotted anchor 的父/子点击；用转发 props/ref 的自定义 button 验证 disabled/busy、真实 Tab 跳过与恢复，不只测试 literal button。

其余标准检查：受控 Switch/Checkbox busy 保留真实 checked/mixed 并禁用；Switch 点击阻止冒泡；FormField 关联 label/description/error，保留既有描述和 ID，InlineRename/PathPicker 新增错误关联；Notice 错误 alert/其余 polite，TaskContent 只划标题/说明；旧 Button/Badge 视觉变体已移除，未造兼容别名。七项原 Button 与五项 PathPicker 风险测试保持；Fowler 最低启发式未发现需另报的证实缺陷。未把残余迁移消费者的预期类型债务列成本分区新缺陷。

## specification

Reviewer: native:/root/review_host_types
Result: request-changes
Findings: 1（P2）+ 1（P3）

### SPEC-01 · P2 · TableHeader 的行被通用列表行高顶成 44/52px

路径：src/ui/components/table.tsx:39，关联 table.tsx:51。

DESIGN §5 明确表头 36px；TableHead 虽使用 h-9，但 TableHeader 内按正常组合使用的 TableRow 同时被设置 h-[var(--hu-list-row-h)]。表格布局用更高的 TR 高度撑大 TH，实际并不是 36。真实组件配生成 CSS 的最小表格观察：compact 的 THEAD/TR/TH 都为 44px，comfortable 都为 52px（browser-result.json）；内容仅普通单行文本，未使用调用方覆盖。这使所有默认共享表格的表头偏离批准规格。

最小满足条件：让 header row 保持 36px，并将 body/list 的密度高度限定在对应区域；用真实布局验证 compact/comfortable 两种 header 高度，不以 class 包含 h-9 作为通过证据。此 finding 不要求修改模块页面，也不擅自裁决 DESIGN 对 body 舒适密度的其他组合细节。

### SPEC-02 · P3 · busy 的 slotted Button 没有设计规定的忙碌图标

路径：src/ui/components/button.tsx:127。

DESIGN §5 Button 要求忙碌时显示旋转图标并禁止重复操作；asChild 分支在 busy 分支之前直接返回原子节点，故 `<Button asChild busy><button>Save</button></Button>` 有 aria-busy 与 disabled，却完全没有进度图形。独立 Chrome 对照：busy-slot 的 spinnerCount=0，普通 busy-direct=1。现有新增 asChild busy 测试只验证禁用，没有承接视觉进度风险。

最小满足条件：在不破坏 Slot 单子元素/ref/事件组合与可访问名称的情况下，给支持的 slotted busy Button 提供同等忙碌反馈，并验证布局宽度与 reduce-motion；如果决定限制该公共组合，需要返回合同 owner 明确决定，不能保持类型允许却静默略过设计行为。

其余规范对照：Button 五变体与六尺寸、默认 primary/md；Select/Input/Textarea 的 control-line/raised 与错误态；分段 sunken 轨道、浮起选中与单选语义；Tabs line；Badge 五状态；展示组件无领域所有权。批准 DESIGN 覆盖旧技能视觉差异。主按钮内高光采用 hu-raised/hu-fg 的 12% color-mix 加 card shadow，其最终纸/墨合成外观、色对与截图仍需 Lead 在最终 CSS/fixture 验收，不能从源码类名猜测视觉通过。

## 问题与下一步

候选本次审查已释放给 Lead；四项 findings 交新 repair TASK，reviewer 没有实施修复。修复后的输入需重新冻结并按受影响范围复审，不改写 012/016 历史 REPORT。012 REPORT 缺少精确“产物与验证”标题导致的返回校验问题由 Lead 已声明的新不可变回执处理；这不等于源码通过，本报告也没有替它修改旧回执。

raw iframe 用例本次仍失败，不删除、不 skip。其底层 ambient document.activeElement 与未经过生产 adaptRovingFocus 的 Vitest 图不匹配；实际 guarded 两 Document 证据已出现，但正式覆盖转移仍须由新任务完成：保留主 Document DOM 回归，保留严格 ArrowRight/Left、受控值/ARIA/focus、父文档不被夺焦点的生产 fixture，并在完整 T-02 fixture 中运行，再决定移除重复 raw 用例。不要为满足 raw 依赖失败新增第二套方向键实现。

剩余集成门：完整 T-02 DOM/fixture 与 1440/390、两 Document、长文本/粗指针/减少动效与 overlay 组合；主按钮最终生成 CSS 外观、输入错误色对；原生 Obsidian popout/宿主集成；全部旧 Button/Badge/Toggle/Select/Collapsible 调用方迁移与账目清零；全局 build/lint/types、最终 main.js/styles.css 与包体。012 已记录 app/settings/editor/shell/modules/calendar/gallery 的消费者债务；本次其他分区活跃，未重跑宽泛 suite/build 来制造会漂移的全局结论。52 文件 lint 和分区 types 通过不能豁免自己的 DOM 失败、上述 findings 或这些最终门。
