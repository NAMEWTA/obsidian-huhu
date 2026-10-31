---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: true
design_ref: {"revision":2,"digest":"566034f112192e7d062540a1ce9051674b061d0475e61bf2a794825aad46f77b","pages":["UI-HOME"],"acceptance":["AC-211","AC-221","AC-351"]}
change: 2026-10-31-dev-stabilization-overhaul
id: T-26
title: "home 外框、配置与天气呈现"
status: ready
kind: refactor
planning_depth: standard
planning_depth_reason: "UI 迁移切片，依赖 change DESIGN"
ready: true
risk: medium
blocked_by: ["T-24", "T-15"]
contract_ids: ["AC-211", "AC-221", "AC-351"]
owner: unassigned
expected_changes: ["<Path>src/modules/home/ui/</Path>"]
writable_paths: ["<Path>src/modules/home/ui/DashboardPage.tsx</Path>","<Path>src/modules/home/ui/workbench-page.tsx</Path>","<Path>src/modules/home/ui/board/**</Path>","<Path>src/modules/home/ui/renderer/**</Path>","<Path>src/modules/home/ui/sections/**</Path>","<Path>src/modules/home/ui/cards/**</Path>","<Path>src/modules/home/ui/dialogs/**</Path>","<Path>src/modules/home/ui/appearance/**</Path>","<Path>src/modules/home/ui/settings/**</Path>","<Path>src/modules/home/ui/theme/**</Path>","<Path>src/modules/home/ui/ui/**</Path>","<Path>src/modules/home/ui/canvas/ClockWidget.tsx</Path>","<Path>src/modules/home/ui/settings-page.tsx</Path>","<Path>src/modules/home/ui/settings-access.ts</Path>","<Path>src/modules/home/ui/render-contract.ts</Path>","<Path>docs/e2e/dev-overhaul/ui/T-26/**</Path>"]
read_only_paths: ["<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/DESIGN.md</Path>","<Path>.agents/speculo/.speculo/specdev/design/revisions/DESIGN-0002.md</Path>","<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/prototypes/UI-001/design-system.md</Path>","<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>","<Path>src/modules/browser/**</Path>","<Path>native/browser-runtime/**</Path>"]
shared_paths: ["<Path>main.js</Path>","<Path>styles.css</Path>","<Path>build/**</Path>","<Path>src/ui/styles/fonts.generated.css</Path>","<Path>docs/references.md</Path>","<Path>src/modules/home/i18n.ts</Path>"]
shared_path_owners: ["<Path>main.js</Path> => Lead","<Path>styles.css</Path> => Lead","<Path>build/**</Path> => Lead","<Path>src/ui/styles/fonts.generated.css</Path> => Lead","<Path>docs/references.md</Path> => Lead","<Path>src/modules/home/i18n.ts</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}, {"id": "ui", "path": "<Path>.agents/skills/ui/SKILL.md</Path>", "sha256": "ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff", "phase": "implement", "operation": "apply-workbench-ui-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---

# Ticket T-26: home 外框、配置与天气呈现

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-26.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

home 外框与配置统一；Home 区域不再整块触发 tooltip；天气呈现 T-15 的全部状态。来源：#37 W5.3（home 部分）、W6.11、W4.6/4.10 呈现；Spec AC-211、AC-221、AC-351。

## 行为与范围

IN：区域经可见或隐藏标题 `aria-labelledby` 命名，id 实例内唯一；图标按钮保留名称；天气错误类别与重试/配置入口。 按已批准 change DESIGN 的页面与状态迁移，覆盖初次加载、刷新、空数据、筛选无结果、保存中、成功、失败、离线、未配置、权限不足、只读、取消中、取消已确认、状态不确定；亮暗/用户主题、中英文、长文本、宽窄、多窗口、IME、键盘、200% 缩放、reduced-motion。

## 验收标准

- [ ] `AC-211`：Home 空白处无整块 tooltip，区域名称正确。
- [ ] `AC-221`：天气各状态可见。
- [ ] `AC-351`：home 外框全状态通过。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 样式与运行时 | pnpm | `pnpm lint:css && pnpm check:styles && pnpm test:ui-styles && pnpm test:ui-runtime` | 通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-26.md</Path>` |
| 独立浏览器中的真实组件 | T-23 的 UI runner + 本票 fixture | `node scripts/ui-review/run.mjs --ticket T-26 --matrix standard --out docs/e2e/dev-overhaul/ui/T-26` | 正常/失败/回归、几何和截图通过；不启动 Obsidian | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-26.md</Path>` |
| 词典 | i18n | `pnpm test:i18n` | 通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-26.md</Path>` |

- **E2E disposition：** required：agent 在固定输入上执行独立浏览器中的真实生产组件场景、DOM 行为与样式检查；宿主内表现由用户自行验收，agent 不执行、不跟踪。入口与矩阵见 execution-boundaries。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

只用 `src/ui/components` 与 `src/ui/components/huhu`；不引入第二套 UI 运行时；实际复制/改编的外部材料由本票提供来源、许可与采用位置，Lead 在本票验收前串行写入 shared_paths 的 `docs/references.md`，Browser 记录保持不变。

**证据失效：** base/head 变化触及本票写集、上游 ADR/Spec 对应条目修订、或绑定 Skill 摘要变化时，本票已有验证需重跑。

## 未决事项与风险

与包体预算冲突时先报告差异，不提高阈值。

### 未决问题

无。

### 设计门回执

G-DESIGN 已关闭（LOG-016）：change DESIGN revision 2 / UI-001 与 DESIGN-0002 均已批准、发布并校验。本票 DoR 的设计缺口已消除；开工仍须满足 frontmatter 的 blocked_by 和 Goal 实施授权门。

## 已消费的设计合同

只读来源为 frontmatter 的 design_ref 与 read_only_paths。适用页面：UI-HOME；验收：AC-211、AC-221、AC-351。使用 DESIGN-0002 的共享规则 DS-002、DS-003、DS-005–DS-013，Shell 另遵循 DS-001/DS-004。A 为整体方向，C 的等宽 ID 与 B 的低密度分组只按批准职责组合；执行者不重新选风格。

复用现有 shadcn/Radix 基础控件及至少两个真实使用场景支持的产品组合；颜色来自 Obsidian 语义变量。Evidence 的 `## Design Conformance` 须固定 design_ref.digest、页面和 AC，保留真实实现截图、视口、主题、状态、任务动作及原型差异。未单独渲染的模块沿用共享组件/布局合同，仍须按本票实际入口验收，不能把原型截图当作生产结果。

正常/失败/回归验证：主操作及名称可达；失败保留输入和已有数据、可重试，持续异常不只用 toast；420/600/宽容器、中英文长文案、亮暗主题、键盘可见焦点、200% 缩放与减少动效。窄容器 toast 顶部占位并检查与主操作无交集。依赖未完成时不运行；设计/摘要漂移返回 P，行为冲突返回 S。

## 本轮范围与共享执行约束（LOG-017、LOG-018）

必读 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`：Browser 及其集成面冻结，优先于本票宽目录写集；shared_paths 仅由声明的 Lead owner 串行写入。构建、全量验证及共享组件变更遵守该文件，不通过修复浏览器解除其他票的阻塞。本轮只更新计划，生产实现和 Git/远程动作尚未授权。

迁移时同步清理本票所属文件内的旧样式/组件/token 引用；不得等待 T-36 越过本票写集删除模块文件。需要新增文案时同步所属 en/zh；Home 共用词典由 Lead 写入。
