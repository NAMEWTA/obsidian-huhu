---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: true
design_ref: {"revision": 3, "digest": "49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66", "pages": ["notifications", "safe", "health"], "acceptance": ["UX-NOTIFY-1", "UX-SAFE-1", "UX-HEALTH-1"]}
change: "2026-11-05-frontend-uiux-redesign"
id: "T-11"
title: "通知、保险箱与体检"
status: "done"
kind: "feature"
planning_depth: "standard"
planning_depth_reason: "按模块隔离写集的垂直替换切片"
ready: true
risk: "high"
blocked_by: ["T-04", "T-15"]
contract_ids: ["AC-101", "AC-102", "AC-103", "AC-104"]
owner: "native:/root/cleanup_final"
expected_changes: ["<Path>src/modules/notifications/ui/</Path>", "<Path>src/modules/safe/ui/</Path>", "<Path>src/modules/health/ui/</Path>"]
writable_paths: ["<Path>src/modules/notifications/ui/**</Path>", "<Path>src/modules/safe/ui/**</Path>", "<Path>src/modules/health/ui/**</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-11/**</Path>"]
read_only_paths: ["<Path>src/modules/safe/services/**</Path>", "<Path>src/modules/safe/core/**</Path>", "<Path>src/modules/health/api.ts</Path>", "<Path>src/modules/notifications/api.ts</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/DESIGN.md</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/prototypes/UI-002/design-system.md</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/prototypes/UI-002/final/**</Path>"]
shared_paths: ["<Path>src/modules/notifications/i18n.ts</Path>", "<Path>src/modules/safe/i18n.ts</Path>", "<Path>src/modules/health/i18n.ts</Path>", "<Path>main.js</Path>", "<Path>styles.css</Path>", "<Path>src/modules/notifications/ui/i18n.ts</Path>", "<Path>src/modules/safe/ui/i18n.ts</Path>", "<Path>src/modules/health/ui/i18n.ts</Path>", "<Path>scripts/module-strings.ts</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-11/index.tsx</Path>", "<Path>src/modules/safe/ui/quick-pick.test-support.ts</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-11/index.mjs</Path>"]
shared_path_owners: ["<Path>src/modules/notifications/i18n.ts</Path> => Lead", "<Path>src/modules/safe/i18n.ts</Path> => Lead", "<Path>src/modules/health/i18n.ts</Path> => Lead", "<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead", "<Path>src/modules/notifications/ui/i18n.ts</Path> => Lead", "<Path>src/modules/safe/ui/i18n.ts</Path> => Lead", "<Path>src/modules/health/ui/i18n.ts</Path> => Lead", "<Path>scripts/module-strings.ts</Path> => Lead", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-11/index.tsx</Path> => Lead", "<Path>src/modules/safe/ui/quick-pick.test-support.ts</Path> => Lead", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-11/index.mjs</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "0c2a3309d1b00920539376a02c98485a98442c002945f0ee2e6ce8b816cfb744", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}, {"id": "ui", "path": "<Path>.agents/skills/ui/SKILL.md</Path>", "sha256": "ae158ca873e740b9f90a5247e53a92b994306d1b9d0efb628f7d18ff59bf7ebb", "phase": "implement", "operation": "apply-workbench-ui-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景", "change DESIGN 与 UI-002 原型"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-11: 通知、保险箱与体检

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **设计合同：** `<Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-11.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

按 DESIGN §6 notifications/safe/health：收件箱列表 + 详情；保险箱锁屏、分类、详情遮罩/显示/复制、快速取密；体检介绍、扫描进度、结果分组、修复计划、部分成功与取消。

来源：Spec 对应章节与 AC；DESIGN §3–§7；交付包 `source/Frontend_Refactor_Plan.md.txt`（§5、§7、§9）。

## 行为与范围

IN：notifications/ui、safe/ui（SafePage、EntryList、AccountDetail、EntryDialog、quick pick、settings）、health/ui；safe 锁定后清除明文的行为不回归。

REUSE：`src/ui/components` 唯一实现、现有模块 `api.ts` 服务与命令、`src/ui/react/portal.ts`、`shared/feedback`。

OUT：safe 密码学/格式、health 扫描与修复逻辑（OOS-001）。

## 验收标准

- [x] `AC-101`：满足 Spec 验收合同 AC-101 的可观察结果。
- [x] `AC-102`：满足 Spec 验收合同 AC-102 的可观察结果。
- [x] `AC-103`：满足 Spec 验收合同 AC-103 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 页面行为 | DOM | `pnpm exec vitest run --project dom src/modules/notifications src/modules/safe src/modules/health` | 通过（退出码 0） | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-11.md</Path>` |
| 安全回归 | 门禁 | `pnpm test:safety-regressions` | 通过（退出码 0） | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-11.md</Path>` |

- **E2E disposition：** required：notifications/safe/health 全部状态 1440/390。
- **运行环境：** change README 选定的 change-workspace；所有执行者复用同一工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码与调用方。共同约束见 Map §1“总体实施背景”。同票删除被替换的旧实现、旧样式与旧测试选择器（ADR-001、DEC-001）；删除测试时说明原风险由哪个新测试承接。验证遵循 Map 的原子集成合同：本票检查必须通过，共享 API 切换导致尚未迁移消费者的已知整体编译错误逐条记账；T-13 前全部消除，T-14 全量 build/lint 必须通过。产物由 Lead 统一处理。

设计绑定：change DESIGN revision 3（designDigest `49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66`），页面 notifications, safe, health，验收 UX-NOTIFY-1, UX-SAFE-1, UX-HEALTH-1。实现只读遵循 DESIGN 与 UI-002 final，不重选风格；完成时在 Evidence 写 Design Conformance（与原型的差异、视口、截图本地路径）。

## 未决事项与风险

复审风险与解除条件已写入本票补充合同与验证方法；不沿用初版无风险判断。

### 状态说明

复审问题已落实到 DESIGN revision 3、覆盖清单与本票补充合同；UI-002 与 DESIGN revision 3 已由用户确认（LOG-014，`prototypes/UI-002/approval.md`），DoR 已回读，规划 DoR 已满足；执行状态以 frontmatter 为准，按 Goal Plan 的既有授权、依赖与验收门推进。

### 未决问题

无。

## 实施补充合同（DESIGN revision 3）

safe 初始化/解锁失败/损坏/恢复/编辑/锁定/不可用均有模板；剩余次数只在领域提供时显示，剪贴板只清除自己仍拥有的内容。HealthScope 只按现有注册项，修复只 rebuild-index/belonging-projection；计划过期/部分成功/取消/恢复按回执，不提供通用 Git checkpoint 或任务再生修复。

本票 fixture 入口：`scripts/ui-review/fixtures/frontend-redesign/T-11/`（T-01 使用 shared）。T-01 完成 runner 后执行 `node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-11 --matrix redesign --out /tmp/huhu-frontend-redesign/T-11`。任何尚未实现的 CLI 参数不记为已通过。

- [x] `AC-104`：满足 Spec 中新增合同及本票的表面责任。
