# 任务回报

Session: 20261105T094057Z
Task: 020-repair-t02-primitives
Status: completed

## 聚焦交接

016 已释放后，按 020 修复候选交回，仅改变四个授权路径；当前源码已冻结，writer 停止写入。Button 修复显式 type、转发子组件原生 disabled/busy 与 slotted spinner；TableRow 将 header 36 与 tbody/tfoot 的密度高度分开。经 Lead 授权，只删除已由真实 guarded Chrome 双 Document 严格断言承接的 raw-unadapted iframe 重复用例，生产分段源码未改。五个原语 DOM 文件 29/29、生产 lint、差异空白检查通过；精确分区类型检查目前被分区外冻结的 dialog JSX 重复属性阻断。实际 CSS 几何、减少动效和独立 high delta 尚待 011/Lead 与 021，不能接收为 T-02 done；原 012/016 报告保持不可变。

## 产物与验证

### 修改与冻结

基线复用当前 change workspace：/home/wta/projects/obsidian-huhu，main HEAD37fcede4210a19bcc2a74809e7fdd301e5717957。修改前核验 012 的 56 文件 SHA-256，drift=[]；未写 Git/index、正式状态/Evidence、模态/tree/lib/react、依赖、词典、runner、main.js 或 styles.css。

精确四路径：
- src/ui/components/button.tsx
- src/ui/components/button.dom.test.tsx
- src/ui/components/table.tsx
- src/ui/components/huhu/FormField.dom.test.tsx

本轮 before、frozen、baseline-sha256.json、frozen-sha256.json、changed.json、repair.diff、no-drift.json 均在 /tmp/huhu-t02-primitives-repair。完整冻结包含同一原语分区 56 个存在文件；冻结后回读 56 checked、drift=[]。同一来源的 scoped-types.json/scoped-test-types.json 与全部日志也仅在该 /tmp。原 012 的 immutable REPORT（返回结构校验失败历史）及 /tmp/huhu-012-implement-t02-primitives/frozen 未改写；本新 REPORT 使用要求的精确标题。

### 四项 findings 的处理和真实反例

| Finding | 原始失败与修改 | 回归与结果 |
|---|---|---|
| STD-01 显式 type | 016 真实 Chrome 中 wrapper type=button 被 asChild 丢弃、意外 submit；本轮 type-red.log 同样通过 form 入口触发非预期 submit。修复为 type 直接透传 Slot，子元素自己的明确 type 仍按 Slot 规则优先。 | type-green.log 退出0；Cancel 不 submit、wrapper submit 与显式 child submit 各正常提交一次。 |
| STD-02 转发组件原生 disabled | 016 custom forwarding button disabled=false/focusable；本轮 disabled-red.log 两个 disabled/busy 分支失败。向 Slot 保留 disabled，并在阻断态克隆同一个子组件强制 disabled/aria-disabled 与 click guard，覆盖 child disabled=false；不只检测 literal button。 | disabled-green.log 退出0；原生 disabled=true、ref 指向实际按钮、focus() 留在 Before、Tab 跳到 After、父/子点击不执行。已有 busy anchor 的父/子事件阻断仍通过。 |
| SPEC-01 表头 36 | 016 browser-result.json 的真实 CSS 反例：compact THEAD/TR/TH44、comfortable52。原始反例来自实际渲染，不用 happy-dom 高度或类名代替。TableRow 改为 h-9，只有 tbody/tfoot 祖先下使用 hu-list-row-h，保留表头 sticky/sunken/字体与正文密度。 | source 修复已冻结；Lead 已通知重建共享样式成功。物理 header36/body44或52 的最终 CSS 证明由 011 新 fixture 与 Lead/021 验收，当前未声称 green。 |
| SPEC-02 slotted busy spinner | 016 busy-slot spinnerCount0；本轮 spinner-red.log 在相同公共组合上缺少进度 SVG。direct/slot 共用 busyContent：opacity0 原内容保持名称与几何，absolute spinner；slot 仍只有原来的一个被克隆子元素，保留 type/ref/key 与事件协议。 | button-green.log/最终 DOM 退出0；有 aria-hidden spinner 与 motion-reduce 类、同一实际 ref/节点、忙碌期间不执行，解除后恢复原父子各一次事件。真实宽度与减少动效样式由最终 fixture 继续检查。 |

固定 API 没有增添兼容变体或第二套控件。spinner 的 DOM 接缝是 [data-slot=button-spinner]；direct/slot 相同，旋转类 animate-spin，减少动效类 motion-reduce:animate-none。给自定义 asChild 子组件的 children、disabled、type、ref 等须按现有 Slot 合同转发到真实节点；本轮用真实 forwardRef wrapper 覆盖该路径。

### DOM、静态与类型命令

环境沿仓库 Vitest dom/happy-dom，真实 React、Slot、Radix 与词典；没有 mock 自有组件。所有命令从仓库根运行。

- STD-01 red：pnpm exec vitest run --project dom src/ui/components/button.dom.test.tsx -t 'slotted buttons receive'，宿主退出126、目标 form 断言失败（type-red.log）；相同命令 green 退出0（type-green.log）。
- STD-02 red：同命令 -t 'slotted forwarding buttons'，退出126，两个原生 disabled 断言失败（disabled-red.log）；相同 green 退出0（disabled-green.log）。
- SPEC-02 red：同命令 -t 'slotted busy content'，退出126，目标 spinner 缺失断言失败（spinner-red.log）；实现后完整按钮文件退出0（button-green.log）。
- 最终 pnpm exec vitest run --project dom src/ui/components/button.dom.test.tsx src/ui/components/huhu/FormField.dom.test.tsx src/ui/components/huhu/Notice.dom.test.tsx src/ui/components/huhu/TaskContent.dom.test.tsx src/ui/components/huhu/PathPicker.dom.test.tsx：退出0，5 files / 29 tests passed（dom-green.log）。原始七个标签/截断/Slot 子内容风险、五个路径风险，以及主 Document 方向键/禁用跳过/单次点击/空串及数字字符串区别继续保留。
- pnpm exec eslint <paths.json 中51个授权生产文件> --max-warnings 0：退出0（lint.log 为空）。测试按仓库现有 ESLint 配置默认忽略，不把测试 lint 算作通过；未关闭任何规则。
- git diff --check HEAD -- <paths.json 的56个精确文件>：退出0（diff-check.log 为空），仅只读 Git。
- pnpm exec tsc --noEmit --skipLibCheck -p /tmp/huhu-t02-primitives-repair/scoped-types.json：退出126（types.log）；同命令 scoped-test-types.json：退出126（test-types.log）。两者唯一输出为 src/ui/components/dialog.tsx(88,5): TS17001，JSX 重复属性；该模态源不属本分区且据 Lead 为019冻结候选，不是020自行修改。不能把 parse 阻断或零 own-path diagnostics 写成完整 types 通过；同一原语 source bytes 可待模态修复后重验。两个配置 extends 仓库相应 tsconfig，files 精确为本56文件的生产子集或完整测试集与真实依赖，未隐藏 transitive 错误。
- 未运行 broad build/全仓 suite；旧调用方变体与主题 API 迁移账目继续见012 types-consumers.json/test-types-consumers.json，020未改这些接口，未声称已消除全仓消费者债务。

### iframe 覆盖转移（唯一测试删除）

删除的唯一行为测试名称是 segmented controls in another document keep their keyboard selection in that document，原文保存在 /tmp/huhu-t02-primitives-repair/transferred-raw-iframe-test.txt，原失败日志保存在 raw-iframe-original-failure.log。该 raw Vitest 依赖未经过生产 adaptRovingFocus；生产使用 scripts/radix-owner-document.mjs 已有的 guarded ownerDocument 适配。此次没有新增键盘实现、测试专用 transform、skip 或宽断言，也没有修改 SegmentedControl/ToggleGroup 源。

替代证明：/tmp/huhu-t02-implementation/segmented-trusted-probe/result.json，status=passed，66 cases，errors=[]，每例严格保留真实 CDP Input.dispatchKeyEvent ArrowRight/Left、两 Document 的受控选择值、aria-checked、实际 focus、局部译文和父文档不被夺焦点。source 输入与本轮冻结的未改文件一致：SettingsFormControls.tsx=2b5456c0bee2564687ec419bb6ba28c1d9ab670db5d45352276e6e68ac822c94；toggle-group.tsx=15f1f291d8d34f8a017adf7a84a30a8b022b6533b390350cd14a77d016d08b75。独立016的 /tmp/huhu-review-t02-primitives/browser-result.json 同样证明双 Document 真实键盘/禁用跳过与选择/ARIA/focus，016 REPORT 已释放且确认没有分段组件根因。原 probe3 历史失败保留，未伪造单变量根因。

最终维护入口 scripts/ui-review/fixtures/frontend-redesign/T-02/index.mjs 仍保留上述严格真实键盘断言；011 owner 已确认保留并接续完整 T-02 fixture。本轮开始删除前回读 trusted66/输入 hashes/016 final REPORT，依据020明确授权完成覆盖转移；Obsidian 原生 popout 与最终全票组合仍未验证。

### Skill execution / Design Conformance

继承并核验 AGENTS、dev/ui、SpecDev I 及repair/error/test-reliability规则、T-02、Map revision8、批准 DESIGN revision3 §3–7与016实际 findings；未重新选择设计或扩大领域/依赖范围。dev 实际执行为精确写集、原生form/disabled/ref/事件回归、真实依赖类型检查与不掩盖外部分区失败；ui 实际执行为复用共享 Slot/BusyContent、表头36与正文密度语义、现有 --hu 令牌及减少动效合同。设计 digest49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66 与012绑定不变；未增加外部色值、CSS引擎、词典或依赖。Lead 已在 style-ready 后重建styles.css（Lead回执退出0，1,275,468 bytes）；本 writer没有写共享资产，最终视觉与尺寸不能从DOM类名推定通过。

## 问题与下一步

020是 repaired candidate交回，尚未接收；必需精确类型检查被019冻结模态dialog.tsx的重复aria-label阻断，待拥有者新修复后在同一原语哈希上重验。实际CSS table36/body44或52、slotted spinner的direct/slot宽度与reduce-motion、最终多Document/窄宽/粗指针组合由011/Lead继续，不能写成已通过。独立021 high delta需核对四项findings与覆盖转移；本writer没有自称独立审查。后续所有源码/测试修复需由Lead新派单，012/016/020报告保持不可变；全票build/lint、宿主与最终产物门仍由Lead负责。
