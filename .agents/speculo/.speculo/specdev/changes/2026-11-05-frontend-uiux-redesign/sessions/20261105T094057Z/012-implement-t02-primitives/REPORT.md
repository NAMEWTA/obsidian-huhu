# 任务回报

Session: 20261105T094057Z
Task: 012-implement-t02-primitives
Status: completed

## 聚焦交接

按 Lead 最后指令冻结当前候选（candidate-delivered），37 个修改路径全部属于精确原语分区；这不是 T-02 完成声明。已落实按钮与字段视觉、真实 busy/disabled、Radix 单选组合、FormField/Notice/TaskContent，并保留原文字截断与路径选择风险测试。生产与测试的精确分区类型检查和生产 lint 通过；最终 DOM 为 25 passed / 1 failed。失败的原始 iframe 测试仍保留；生产适配器探针也有方向键选中断言失败，尚未确认是组件还是夹具问题，不能声称已完成覆盖转移。后续修复、测试转移、独立 high 审查及浏览器/宿主 Gate 交由 Lead 新派单，当前 writer 已停止源码写入。

## 固定输入与产物

工作区 /home/wta/projects/obsidian-huhu，复用 TASK 指定 change workspace 与 HEAD 基线；没有 Git/index、依赖、正式状态/Evidence、词典、main.js/styles.css 或 runner 写入。

完整授权文件快照：/tmp/huhu-012-implement-t02-primitives/frozen（56 个存在文件，包含未改动原文件）；SHA-256：/tmp/huhu-012-implement-t02-primitives/frozen-sha256.json。修改前内容在 before/；最终分区差异在 partition-final.diff；37 路径列表在 changed.json。冻结后逐文件回读哈希：no-drift.json，56 checked、drift=[]。原始日志与临时 tsconfig 全部只在该 /tmp 目录。

修改路径：
- src/ui/components/accordion.tsx
- src/ui/components/badge.tsx
- src/ui/components/button.dom.test.tsx
- src/ui/components/button.tsx
- src/ui/components/card.tsx
- src/ui/components/checkbox.tsx
- src/ui/components/collapsible.tsx
- src/ui/components/huhu/ActionButton.tsx
- src/ui/components/huhu/AgentWorkingSpinner.tsx
- src/ui/components/huhu/EmptyState.tsx
- src/ui/components/huhu/IconPicker.tsx
- src/ui/components/huhu/InlineRename.tsx
- src/ui/components/huhu/PathPicker.dom.test.tsx
- src/ui/components/huhu/PathPicker.tsx
- src/ui/components/huhu/SettingsFormControls.tsx
- src/ui/components/huhu/SettingsSection.tsx
- src/ui/components/huhu/ShortcutKeyCombo.tsx
- src/ui/components/huhu/StatusDot.tsx
- src/ui/components/huhu/WorkspaceUsage.tsx
- src/ui/components/input.tsx
- src/ui/components/label.tsx
- src/ui/components/progress.tsx
- src/ui/components/scroll-area.tsx
- src/ui/components/select.tsx
- src/ui/components/slider.tsx
- src/ui/components/switch.tsx
- src/ui/components/table.tsx
- src/ui/components/tabs.tsx
- src/ui/components/textarea.tsx
- src/ui/components/toggle-group.tsx
- src/ui/components/toggle.tsx
- src/ui/components/huhu/FormField.tsx
- src/ui/components/huhu/FormField.dom.test.tsx
- src/ui/components/huhu/Notice.tsx
- src/ui/components/huhu/Notice.dom.test.tsx
- src/ui/components/huhu/TaskContent.tsx
- src/ui/components/huhu/TaskContent.dom.test.tsx

## API 与消费者影响

- Button/buttonVariants 保留导出、ref、className、asChild 与原生 type 语义；variant=primary/secondary/ghost/danger/danger-ghost，size=sm/md/lg/icon-sm/icon-md/icon-lg，默认 primary/md。busy 暴露 aria-busy 并真实禁用，保留原内容宽度、覆盖 spinner；slotted anchor 阻止父子回调，slotted 原生 button 保持 disabled。删除旧视觉变体，不加兼容别名。
- Badge：neutral/accent/success/warning/error，默认 neutral；删除旧 hostContext/promptPill 等变体。SettingsBadge 复用 Badge。TabsList 只保留 line，默认 line。SelectTrigger size=sm/md，默认 md；SelectContent 消费集成 owner 的 useOverlayStyle(style,1)+FloatingLayer 与原 ownerDocument Portal。
- Toggle size=sm/md/lg，默认 md；ToggleGroup 复用同一变体。SegmentedControl 继续原泛型 API，组合 ToggleGroup single 的 radiogroup/radio 与 roving focus；只在库完成键盘焦点移动时发起选择，不自写方向键导航。内部标识区分空字符串、数字与字符串；指针点击只有一次 change。CollapsibleContent 的旧 height 动画名改为 fade（仅透明度）。
- Switch、Checkbox 新增 busy?:boolean，禁用真实控件且保留 checked/mixed。SettingsSwitch/SettingsSwitchRow 透传 busy；Row 显示词典中的启用/停用/正在保存，词典由 Lead 加 ui.saving。SettingsRow 保持原搜索索引接口，窄宽可换行。
- FormField 接收 label、description?、error?、一个 labelable ReactElement 子控件、id?、className?；保留子控件现有 id/describedby 并关联说明与错误。Notice 接收 tone=info/success/warning/error、title、children?、action?，错误 alert，其余 polite status。TaskContent 接收 title、description?、completed?、metadata?，仅标题/说明划线。三者不导入领域类型/服务。
- WorkspaceUsage 改为结构化展示数据类型，移除 app UsageSnapshot 类型导入；VaultPathField 既有宿主适配器与第三方品牌 SVG 保持。
- out-of-partition 消费者：app/settings、editor-panel、shell、各 modules、ui/components/huhu/calendar 仍使用旧 Button/Badge/Toggle/Select 变体；后续票负责迁移。全局生产 tsc 当时 576 条诊断/172 文件，test tsc 558 条/173 文件，均无本分区路径诊断。精确原始诊断：types.log、test-types.log；逐文件记录：types-consumers.json、test-types-consumers.json。全局并发源未冻结，因此这些是观察时账目，不是当前全仓最终结论。ui/react/gallery.tsx 的 CollapsibleContent animation=height 也需集成 owner 迁移。

## 实际验证

所有命令在仓库根执行；Vitest 使用真实 React/Radix/happy-dom 与仓库词典初始化，没有 mock 自有组件。

- 按行为依次红绿：Button busy（button-red.log / button-green.log）、FormField 标签/描述/错误（field-red.log / field-green.log）、分段键盘与 Switch busy（controls-red.log / controls-green.log）、Notice 警报（notice-red.log / notice-green.log）、TaskContent 完成态（task-red.log / task-green.log）、slotted anchor 事件阻止（slot-red.log / slot-green.log）、PathPicker 描述关联与真实展开（path-red.log / path-green.log）、mixed Checkbox busy（checkbox-red.log / checkbox-green.log）、slotted native button disabled（slot-native-red.log / slot-native-green.log）、分段单次点击（segment-click-red.log / segment-click-green.log）、分段空串/数字字符串（segment-values-red.log / segment-values-green.log）。对应定向 `pnpm exec vitest run --project dom <相邻测试路径>`，最后两条使用 `-t` 对应行为；red 的宿主实际退出 126，日志为目标断言失败；green 退出 0。没有删除原始 7 个 Button 与 5 个 PathPicker 风险测试。
- 最终 `pnpm exec vitest run --project dom src/ui/components/button.dom.test.tsx src/ui/components/huhu/FormField.dom.test.tsx src/ui/components/huhu/Notice.dom.test.tsx src/ui/components/huhu/TaskContent.dom.test.tsx src/ui/components/huhu/PathPicker.dom.test.tsx`：宿主退出 126，4 files passed / 1 failed，25 tests passed / 1 failed（regression-final.log）。唯一失败为另一个 document 中的分段焦点/选择；主 document 的普通 ArrowRight、禁用跳过、指针单次分发与值区分均通过。
- `pnpm exec tsc --noEmit --skipLibCheck -p /tmp/huhu-012-implement-t02-primitives/scoped-types.json`：退出 0；scoped-types-freeze.log 为空。配置 extends 仓库生产 tsconfig，精确 files 为授权生产文件，使用真实依赖。
- 同命令 `-p /tmp/huhu-012-implement-t02-primitives/scoped-test-types.json`：退出 0；scoped-test-types-freeze.log 为空，配置 extends 仓库测试 tsconfig，精确 files 含全部授权 TSX 与测试。
- `pnpm exec eslint <全部现存授权生产文件> --max-warnings 0`：退出 0，lint-freeze.log 为空。命令路径数组由 paths.json 过滤 `.test.` 生成。首次包含测试文件因仓库 ESLint 默认忽略测试产生 5 个 ignored-file warning，退出126（lint.log）；未声称测试已 lint，也没有关闭规则。
- 全局 `pnpm exec tsc --noEmit --skipLibCheck` 与 `pnpm exec tsc --noEmit --skipLibCheck -p tsconfig.test.json` 均退出126，尚未迁移消费者见前述账目；未运行 broad build、共享样式生成或全仓 E2E。

## 未解决问题与覆盖转移

原始 iframe 用例仍在 FormField.dom.test.tsx；Radix raw dependency 的 focusFirst 读取 ambient document.activeElement，焦点会在候选之间往返。生产已有 scripts/radix-owner-document.mjs 的 adaptRovingFocus（通过候选 ownerDocument 保持库算法），Vitest 未经过此构建适配器，故 Lead 指示将该风险转移到生产 fixture，禁止增加第二套键盘引擎或测试专用适配器。转移尚未成功，不删除/skip 原断言。

集成 owner 的 /tmp/huhu-t02-implementation/segmented-production-probe3/result.json 为 failed（main adapted ArrowRight 超时，焦点在 Second，state=list）。该探针 SettingsFormControls.tsx 输入 hash 与本冻结源一致；这是未通过的生产路径观察，根因尚未确认，夹具还有独立标签/焦点预期修订。这里不把其失败归因为已证实的源码缺陷，也不把已适配构建当作已经通过。Lead 要求先冻结交回，后续最小修复/覆盖转移需新 TASK，严格断言保留。

## Skill execution 与 Design Conformance

已读取并执行本票适用 dev/ui 与 SpecDev I：先核对 workspace/catalog、Ready Ticket、Map revision8、goal-plan、Spec AC-011–013、批准 DESIGN revision3 §3–7、源组件与直接调用方；按精确分区写入，继承既有 Radix/Slot/Tooltip/Input，使用真实 DOM 红绿接缝，未造 Change/Work 或改正式状态。dev 的分区/i18n/测试约束实际落实为展示组件无新增领域导入、复用 Lead 词典及真实定向检查；ui 实际落实为 --hu 令牌、密度高度、字号、焦点、native disabled/mixed 与 reduce-motion。

设计绑定：revision3，digest 49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66，pages tasks/automations/archives/settings，acceptance UX-TASK-1/UX-AUTO-2/UX-ARCH-1/UX-SET-2。没有重新选视觉方向或引入新依赖；保留源文件上游许可引用。主按钮按 Lead 指令，以纸的 hu-raised / 墨的 hu-fg 经 color-mix 表现 12% 内高光，再复用 hu-shadow-card 投影；未增加色值或主题 token。真正纸/墨、窄宽、粗指针、长文本、对比度、浮层嵌套和宿主截图由集成 owner/Lead 验收；本报告没有把 DOM 或原型当成视觉验收。styles.css/main.js 需要 Lead 统一重建。标准/规范两轴独立 high 审查尚待 Lead 安排。
