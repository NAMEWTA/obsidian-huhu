---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: true
design_ref: {"revision": 3, "digest": "49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66", "pages": ["automations"], "acceptance": ["UX-AUTO-1", "UX-AUTO-2", "UX-AUTO-3"]}
change: "2026-11-05-frontend-uiux-redesign"
id: "T-07"
title: "自动化：列表 + 右详情 + 滑动启停"
status: "done"
kind: "feature"
planning_depth: "standard"
planning_depth_reason: "按模块隔离写集的垂直替换切片"
ready: true
risk: "medium"
blocked_by: ["T-03", "T-04", "T-15"]
contract_ids: ["AC-023", "AC-061", "AC-062", "AC-063"]
owner: "native:/root/repair_native_focus"
expected_changes: ["<Path>src/modules/automations/ui/</Path>"]
writable_paths: ["<Path>src/modules/automations/automation.test.ts</Path>", "<Path>src/modules/automations/core/schedule/zoned-occurrences.ts</Path>", "<Path>src/modules/automations/core/schedule/zoned-occurrences.test.ts</Path>", "<Path>src/modules/automations/ui/**</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-07/**</Path>"]
read_only_paths: ["<Path>src/modules/automations/api.ts</Path>", "<Path>src/modules/automations/services/**</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/DESIGN.md</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/prototypes/UI-002/design-system.md</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/prototypes/UI-002/final/**</Path>"]
shared_paths: ["<Path>src/modules/automations/i18n.ts</Path>", "<Path>main.js</Path>", "<Path>styles.css</Path>", "<Path>src/app/contracts/workbench-host.ts</Path>", "<Path>src/shell/host/workbench-pages.ts</Path>", "<Path>src/shell/host/workbench-pages.dom.test.tsx</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-07/index.mjs</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-07/index.tsx</Path>"]
shared_path_owners: ["<Path>src/modules/automations/i18n.ts</Path> => Lead", "<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead", "<Path>src/app/contracts/workbench-host.ts</Path> => Lead", "<Path>src/shell/host/workbench-pages.ts</Path> => Lead", "<Path>src/shell/host/workbench-pages.dom.test.tsx</Path> => Lead", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-07/index.mjs</Path> => Lead", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-07/index.tsx</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "0c2a3309d1b00920539376a02c98485a98442c002945f0ee2e6ce8b816cfb744", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}, {"id": "ui", "path": "<Path>.agents/skills/ui/SKILL.md</Path>", "sha256": "12621917181e3a74f3a410a710752e8e856d9a84af739ef6c97c85f79bca1ad4", "phase": "implement", "operation": "apply-workbench-ui-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景", "change DESIGN 与 UI-002 原型"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-07: 自动化：列表 + 右详情 + 滑动启停

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **设计合同：** `<Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-07.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

自动化页按 DESIGN §6 automations：列表常驻、DetailPane 概览/运行记录/运行详情、编辑弹窗（DateTimeField/DateField）、新建与全部运行记录独立页面、Switch pending/失败回滚、深链缺失状态。

来源：Spec 对应章节与 AC；DESIGN §3–§7；交付包 `source/Frontend_Refactor_Plan.md.txt`（§5、§7、§9）。

## 行为与范围

IN：AutomationsPage、list/AutomationRow、detail、runs、editor/SchedulePicker、actions/create-task、settings-page；选择状态单一来源（WorkbenchTarget 或页面状态之一）；同票删除“详情替换列表”分支。

REUSE：`src/ui/components` 唯一实现、现有模块 `api.ts` 服务与命令、`src/ui/react/portal.ts`、`shared/feedback`。

OUT：调度、预检、投递语义（OOS-001）。

## 验收标准

- [x] `AC-061`：满足 Spec 验收合同 AC-061 的可观察结果。
- [x] `AC-062`：满足 Spec 验收合同 AC-062 的可观察结果。
- [x] `AC-063`：满足 Spec 验收合同 AC-063 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 列表保持与开关 | DOM | `pnpm exec vitest run --project dom src/modules/automations` | 通过（退出码 0） | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-07.md</Path>` |
| 安全回归 | 门禁 | `pnpm test:safety-regressions` | 通过（退出码 0） | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-07.md</Path>` |

- **E2E disposition：** required：automations 页全部状态 1440/390。
- **运行环境：** change README 选定的 change-workspace；所有执行者复用同一工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码与调用方。共同约束见 Map §1“总体实施背景”。同票删除被替换的旧实现、旧样式与旧测试选择器（ADR-001、DEC-001）；删除测试时说明原风险由哪个新测试承接。验证遵循 Map 的原子集成合同：本票检查必须通过，共享 API 切换导致尚未迁移消费者的已知整体编译错误逐条记账；T-13 前全部消除，T-14 全量 build/lint 必须通过。产物由 Lead 统一处理。

设计绑定：change DESIGN revision 3（designDigest `49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66`），页面 automations，验收 UX-AUTO-1, UX-AUTO-2, UX-AUTO-3。实现只读遵循 DESIGN 与 UI-002 final，不重选风格；完成时在 Evidence 写 Design Conformance（与原型的差异、视口、截图本地路径）。

## 未决事项与风险

复审风险与解除条件已写入本票补充合同与验证方法；不沿用初版无风险判断。

### 状态说明

复审问题已落实到 DESIGN revision 3、覆盖清单与本票补充合同；UI-002 与 DESIGN revision 3 已由用户确认（LOG-014，`prototypes/UI-002/approval.md`），DoR 已回读，规划 DoR 已满足；执行状态以 frontmatter 为准，按 Goal Plan 的既有授权、依赖与验收门推进。

### 未决问题

无。

## 实施补充合同（DESIGN revision 3）

包含模块设置、模板选择、编辑字段、运行详情与全部运行列表；保留列表 DOM、受控选择、服务回执版本与失败后重试。

本票 fixture 入口：`scripts/ui-review/fixtures/frontend-redesign/T-07/`（T-01 使用 shared）。T-01 完成 runner 后执行 `node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-07 --matrix redesign --out /tmp/huhu-frontend-redesign/T-07`。任何尚未实现的 CLI 参数不记为已通过。

### DateTime领域校验责任（018预检）

追加AC-023的真实DST集成验证。只最小扩展上述现有时间候选解析接缝及相邻测试，为新DateTimeField的caller-owned validateValue提供opt-in严格拒绝不存在/重复墙上时间的能力；不复制或重写时区算法，不改变内部调度默认策略、已有数据schema或既有调度测试。模块UI适配以本模块core接缝验证并转换，泛型ui不得反向导入模块。对应UI显示本模块en/zh错误并阻止非法提交，错误保留草稿。

覆盖America/New_York 2026-03-08 02:30缺失、2026-11-01 01:30重复均被新交互明确拒绝，以及UTC/Asia/Shanghai正常值；已有内部earlier策略回归保持。必须真实函数与生产表单/服务入口联合验证，不以共享控件的mock回调当领域证据。新增core写集仅为这项最小API接缝，不授权领域重构。

### 063 预检后的自动化日期能力边界

真实 `ScheduleSpec` 只有 manual、once `{at}`、recurring `{expression,start,timezone?}`；现有 RRULE 解析仅接受 `FREQ/BYDAY/BYHOUR/BYMINUTE`，拒绝 `UNTIL/COUNT`。依 Spec 页面范围与 DESIGN §7，首次运行映射现有时刻字段；DESIGN §6 提到的结束日期控件仅适用于领域确有该能力的情况，当前不提供可编辑结束日期，不创建无法保存的控件或增加调度 schema。按实际能力说明限制，在本票 Design Conformance 中保留与原型的这一差异，不能声称结束日期语义已实现。新增结束规则属于独立领域能力，不包含在本票 UI 与严格 DST 适配写集内。

事实依据：`src/shared/automation/types.ts` 的 `ScheduleSpec`、`src/modules/automations/core/schedule/automation-schedule-parsing.ts` 的 RRULE allowlist；063 源码预检与 061 独立核对均支持上述边界。视觉 DESIGN digest、DAG 与本票写集保持不变。

### 审查修复共享接缝（Map revision 23）

用户关闭前由Lead补可选WorkbenchPageBinding.canClose，WorkbenchPages仅用户close路径在销毁前await并复核entry身份；并发关闭共用一次决策。隐藏只保留草稿并释放浮层，dispose/模块不可用/原生不可取消的onClose强制清理不询问、不补丁宿主。编辑器内部导航复用同一个既有确认。
