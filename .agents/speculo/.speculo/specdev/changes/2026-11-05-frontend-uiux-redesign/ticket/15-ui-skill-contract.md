---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-11-05-frontend-uiux-redesign"
id: "T-15"
title: "按最终设计与共享合同重构 UI 技能，作为模块页面的统一实施规则"
status: "done"
kind: "refactor"
planning_depth: "deep"
planning_depth_reason: "模块页面开工前的唯一 UI 规则入口；涉及规则权威、全部 references、下游 11 张票的 ui 绑定刷新"
ready: true
risk: "high"
blocked_by: ["T-01", "T-02", "T-03", "T-04"]
contract_ids: ["AC-124"]
owner: "native:/root/cleanup_final"
expected_changes: ["<Path>.agents/skills/ui/SKILL.md</Path>", "<Path>.agents/skills/ui/references/</Path>"]
writable_paths: ["<Path>.agents/skills/ui/**</Path>"]
read_only_paths: ["<Path>AGENTS.md</Path>", "<Path>.agents/skills/dev/**</Path>", "<Path>docs/design-system.md</Path>", "<Path>docs/workbench.md</Path>", "<Path>docs/architecture.md</Path>", "<Path>src/**</Path>", "<Path>scripts/**</Path>", "<Path>package.json</Path>", "<Path>pnpm-lock.yaml</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/DESIGN.md</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/reuse-decision.md</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/frontend-coverage.md</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/prototypes/UI-002/final/**</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/evidence/report-design-audit.md</Path>"]
shared_paths: ["<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/ticket/05-tasks-calendar.md</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/ticket/06-archives-tree-pages.md</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/ticket/07-automations-inspector.md</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/ticket/08-home-dashboard.md</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/ticket/09-agent-workspace.md</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/ticket/10-diary-navigator-comments.md</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/ticket/11-notifications-safe-health.md</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/ticket/12-settings-appearance-icons.md</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/ticket/13-legacy-cleanup-docs.md</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/ticket/14-integration-acceptance.md</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/ticket/16-versioning-git-diffs.md</Path>"]
shared_path_owners: ["<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/ticket/05-tasks-calendar.md</Path> => Lead", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/ticket/06-archives-tree-pages.md</Path> => Lead", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/ticket/07-automations-inspector.md</Path> => Lead", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/ticket/08-home-dashboard.md</Path> => Lead", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/ticket/09-agent-workspace.md</Path> => Lead", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/ticket/10-diary-navigator-comments.md</Path> => Lead", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/ticket/11-notifications-safe-health.md</Path> => Lead", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/ticket/12-settings-appearance-icons.md</Path> => Lead", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/ticket/13-legacy-cleanup-docs.md</Path> => Lead", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/ticket/14-integration-acceptance.md</Path> => Lead", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/ticket/16-versioning-git-diffs.md</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "0c2a3309d1b00920539376a02c98485a98442c002945f0ee2e6ce8b816cfb744", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}, {"id": "ui", "path": "<Path>.agents/skills/ui/SKILL.md</Path>", "sha256": "ae158ca873e740b9f90a5247e53a92b994306d1b9d0efb628f7d18ff59bf7ebb", "phase": "implement", "operation": "apply-workbench-ui-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景", "change DESIGN 与 UI-002 原型"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-15: 按最终设计与共享合同重构 UI 技能，作为模块页面的统一实施规则

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`（AC-124）
- **设计合同：** `<Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path>`（revision 3）
- **审查输入：** `<Path>{roots.state}/specdev/changes/{change}/evidence/report-design-audit.md</Path>`（重点 F-08–F-13）
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-15.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；调用 dev/ui 的适用方法，尤其 `<Path>.agents/skills/dev/references/skill-maintenance.md</Path>`；执行时按宿主可用入口读取 skill-creator 的适用技能维护方法，不把宿主缓存路径写成项目维护源。

## 目标与来源

用户 2026-11-05 要求增加一张票，重构 `.agents/skills/ui`，使后续页面实现时的配色、组件、交互、布局、间距、字体、像素和页面结构保持一致。当前目录仍强制旧宿主主题、Orca/apex 布局、旧尺寸和自动化页内编辑，与本 change 冲突。

因此本票排在共享合同（T-01–T-04，G-CONTRACT）之后、全部模块页面票（T-05–T-12、T-16）之前。模块票绑定的是本票产出的新技能，而不是旧规则。

规则依据两类来源，按此优先级：
1. **已批准 DESIGN revision 3 与 UI-002**：视觉与交互的唯一权威。
2. **T-01–T-04 已验收的生产代码**：token、主题桥、组件导出与 variant、日期族、外壳与 DetailPane、runner suite/matrix 参数。

技能只能写已经存在的代码事实。尚未实现的模块页面写成“按 DESIGN §6 页面条目 + 下列组合模板实现”，不虚构 API。两类来源矛盾时，回到负责票修正。

本票不改产品 UI，所以 ui_change=false；但它实际消费设计来源，不绕开设计批准。

## 行为与范围

IN：
- **五份源**：完整读取并重构 SKILL.md、references/design-system.md、references/shell.md、references/theme.md、references/motion-a11y.md。只有确实存在独立职责时才增删 reference（例如差异视图），并闭合所有调用链接。保留 frontmatter、许可与仍然适用的来源。不新造 README、CHANGELOG 或第二套可写设计规范。
- **绑定刷新**：完成后由 Lead 审阅技能差异，刷新 T-05–T-14、T-16 尚未执行票的 ui skill binding sha256，再运行计划校验（frontmatter 中这些票为本票的 shared 路径）。

REUSE：现有 ReactSurface/Portal、组件目录、语义 token、Tailwind/CVA、Radix、Tree、日期族、feedback、布局与验证脚本，以及 `@pierre/diffs` 的 DiffView 包装合同（DESIGN §5，由 T-16 实现）。引用真实导出、实际路径和已通过的测试接缝；不复制第三方控件源码，不安装另一套样式或行为库。

OUT：产品实现修复、运行依赖升级、永久 DESIGN/ADR/context 提升、直接改 dev 技能、提交与发布。发现的缺口返还原 owner：T-13 拥有 docs；T-15 独占 ui 技能源；T-14 负责最终集成验收，并核对技能与最终代码是否漂移。

### 各文件的交付职责

| 文件 | 必须形成的规则 |
|---|---|
| SKILL.md | 精确触发；按任务读取；设计权威；最短必要的实施与检查流程。保留组件复用、窗口/生命周期、语义与作用域边界；移除照抄特定项目布局和旧路线的强制项 |
| design-system.md | token 与别名的用法；每类组件唯一入口及其 variant；允许的组合与薄适配边界。覆盖色彩语义、状态、字阶、密度、间距、圆角、阴影、图标、CSS px 与缩放、视觉尺寸与命中区、例外白名单；数值引用唯一权威，不在多处手抄 |
| shell.md | 实际的导航、页面、侧栏、右详情、全页工作区映射；叶子容器断点；无二级栏、专注与移动状态的入口；滚动保留、重开恢复与卸载；模块组合遵循领域 owner |
| theme.md | 自有主题与跟随宿主的解析；成对对比度回退；工作台、侧栏、Portal、终端、图表与差异（`--diffs-*`）的桥接；字体加载与 CJK；正文编辑器边界；外观导入只接受当前格式。删除已不存在的旧预设和别名 |
| motion-a11y.md | 已批准的时长与可动画属性；减少动效；复合控件键盘模型（树、分段、差异区域）；弹层栈与焦点返回；IME；快捷键与终端边界；虚拟化焦点；触控命中区；多窗口 |

### 防止后续页面漂移

1. 后续任务先定位实际组件与对应设计条目。有缺口时优先扩展共享组件；模块里不新增并行原语、颜色表或布局系统。
2. 给出最小的组合示例并引用实际 import 与 variant：页面骨架、表单、列表 + 右详情、设置行、状态页、差异视图。不虚构不存在的 API，也不把完整业务页面抄进技能。
3. 统一说明密度、字体、缩放对行高、虚拟器 estimateSize、截断与换行、图标光学对齐的影响。终端、代码和差异等特殊表面写明适配责任，不能为了“统一”改写引擎。
4. 说明新增页面需要覆盖的状态：正常、空、加载、失败、提交中、不可用，以及各模块独有的业务状态；并说明哪些已有证据可复用，哪些因 token、原语或布局变化而失效。
5. 验证一律引用 dev 的唯一选择表，给出现有可执行的 UI runner 示例与宿主边界；不在技能里复制第二份每次全跑的检查清单。

## 验收标准

- [x] `AC-124`：五份源都完成逐条对照；旧主题、旧尺寸、旧布局、动效与键盘冲突不再作为现行规则残留；不以删除仍成立的独有约束来换取简短。
- [x] 形成“规则类别 → 权威设计条目 → 生产组件/token/布局入口 → 验证接缝”的对照表，写入本票结论 Evidence。配色、字体、字号/行高、间距、尺寸、层级、交互与页面组合都有责任方。
- [x] 正常走查：只按新技能，能定位任务详情、档案树、自动化列表详情、设置表单和 Git 差异页的组件、组合方式与验证，无需重新做视觉决定。
- [x] 近邻不触发：普通产品问答或仅讨论主题时不要求走实现流程；纯服务变更遵循 dev，不扩大 UI 流程。
- [x] 失败走查：遇到组件缺失、设计与代码冲突、旧主题值、错误的 Portal window、中文溢出、IME 提交、宿主验收未通过时，规则能指向正确的修复或待验收责任，不会自动通过。
- [x] 链接、路径与命令有效，中文正文与原始许可完整。旧值只允许留在明确保留的来源说明里，不能用一刀切的关键词搜索删掉合法说明。
- [x] Lead 刷新 T-05–T-14、T-16 的 ui binding 后，计划校验无结构错误或摘要错误；本票记录执行时的旧 binding 与新源摘要。

## 验证方法

| 风险 | 方法与预期 | 证据 |
|---|---|---|
| 断链、错误路径/命令 | `pnpm test:docs` 退出 0；逐项核对技能中新出现的源码符号和实际命令（检查器不能证明这些事实正确） | T-15 结论 |
| 规则冲突或遗漏 | 回读 DESIGN revision 3、T-01–T-04 的有效 Evidence 与实际生产源，完成上述对照表和正常/近邻/失败走查 | T-15 结论 |
| 下游绑定失效 | 刷新绑定后运行 `node .agents/speculo/workflows/specdev/common/tools/validate-specdev.mjs --stage tickets --repo /home/wta/projects/obsidian-huhu .agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign` 与 `ticket-control.mjs --map .agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/tickets-map.md --repo /home/wta/projects/obsidian-huhu`，均无结构/摘要错误 | T-15 结论 |

- **E2E disposition：** not-required：本票只改技能文本。描述以 T-01–T-04 的有效生产 UI 证据为准；T-14 承担最终的实际浏览器集成和技能漂移核对。发现产品缺陷回到原票，不用本票的文档验收代替修复。
- **运行环境：** change README 选定的 change-workspace；纯文档改动不要求重新构建插件。

## 执行约束与恢复

写前核对未提交内容、软链接与 source owner；Git 可恢复源之外的未跟踪内容先备份。修改后回读五份文件、所有引用以及每条事实的唯一 owner。

以下情况视为技能漂移，回到本票修订（Map replan）后再继续，不能由模块票自行改技能：
- 本票完成后，共享 token、组件、布局或验证接口又发生变化；
- 模块票发现规则与 DESIGN 或代码冲突。

永久设计提升仍由 A 网关负责，技能不能自行发布新基线。

## 未决事项与风险

- **风险**：模块页面尚未实现时写下的组合模板，可能和最终代码有偏差。缓解：模板只引用 T-01–T-04 已存在的导出；T-14 做最终漂移核对。
- **风险**：11 张下游票的绑定刷新若遗漏，会导致票据阻塞。缓解：由 ticket-control 校验摘要，Lead 一次刷新。

### 状态说明

UI-002 与 DESIGN revision 3 已由用户确认（LOG-014），DoR 已回读，规划 DoR 已满足；执行状态以 frontmatter 为准，按 Goal Plan 的既有授权、依赖与验收门推进。

### 未决问题

无。

## 实施补充合同（DESIGN revision 3）

技能规则必须覆盖：
- 首页五类卡片模板与真实 settings 字段来源；
- 三种收件箱的区分；
- Git 差异与历史 A/B 比较（DiffView、CompareEndpoints、`--diffs-*` 桥接、差异键盘）；
- 日期值与 DST；作用域与主题别名；嵌套层焦点；
- 全宽度矩阵、能力不可用状态，以及本次源码覆盖清单的维护规则。

只描述生产代码与 DESIGN，不把离线原型模拟器写进生产规范。
