---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: true
design_ref: {"revision": 2, "digest": "1e3b5ef5fb4c6ec033ff6a1d9f164a7f3692cc679b71e2d54771c1ea46082c00", "pages": ["SAFE-WORKSPACE"], "acceptance": ["AC-211", "AC-212", "AC-213", "AC-214"]}
change: "2026-11-04-bz-reference-capabilities"
id: "T-07"
title: "密码本三段式工作区与详情关系"
status: "done"
kind: "feature"
planning_depth: "standard"
planning_depth_reason: "UI 重排，安全语义不变"
ready: true
risk: "medium"
blocked_by: ["T-06"]
contract_ids: ["AC-211", "AC-212", "AC-213", "AC-214"]
owner: "herdr:impl2"
expected_changes: ["<Path>src/modules/safe/ui/SafePage.tsx</Path>", "<Path>src/modules/safe/ui/EntryList.tsx</Path>", "<Path>src/modules/safe/ui/AccountRelations.tsx</Path>"]
writable_paths: ["<Path>src/modules/safe/ui/**</Path>"]
read_only_paths: ["<Path>src/modules/safe/core/**</Path>", "<Path>src/modules/safe/services/**</Path>", "<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/DESIGN.md</Path>", "<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/prototypes/UI-001/design-system.md</Path>", "<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/prototypes/UI-001/final/**</Path>", "<Path>.agents/speculo/.speculo/specdev/design/revisions/DESIGN-0002.md</Path>"]
shared_paths: ["<Path>src/modules/safe/i18n.ts</Path>", "<Path>main.js</Path>", "<Path>styles.css</Path>"]
shared_path_owners: ["<Path>src/modules/safe/i18n.ts</Path> => Lead", "<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}, {"id": "ui", "path": "<Path>.agents/skills/ui/SKILL.md</Path>", "sha256": "123781b61a8bd3b40af9ff6161b1dc981c446f13c2ef3b2f49995630cd2f2c44", "phase": "implement", "operation": "apply-workbench-ui-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景", "change DESIGN 与对应 UI 原型"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-07: 密码本三段式工作区与详情关系

- **总体 Map：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/tickets-map.md</Path>`
- **Goal Plan：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/goal-plan.md</Path>`
- **上游 Spec：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/spec.md</Path>`
- **完成 Evidence：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-07.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

复刻 bz 密码本“平台→账号→详情”布局（https://github.com/yeshimei/bz/tree/d76a0870329403247917a00c43019e203a2560a4/src/password-vault 的 ui.ts、render.ts），收藏以标签表达（LOG-019，Spec 2 节）。

## 行为与范围

IN：宽容器三段式、窄容器列表→详情；详情完整字段、长备注、操作栏可达；关联与反向引用、稳定 ID 跳转、失效诊断；收藏标签的筛选入口。REUSE：EntryDialog 编辑逻辑、AutoTextarea、AccountRelations。OUT：条目 schema 变更。

## 验收标准

- [ ] `AC-211`：满足 Spec 验收合同 AC-211 的可观察结果。
- [ ] `AC-212`：满足 Spec 验收合同 AC-212 的可观察结果。
- [ ] `AC-213`：满足 Spec 验收合同 AC-213 的可观察结果。
- [ ] `AC-214`：满足 Spec 验收合同 AC-214 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 布局与详情 | DOM | `pnpm exec vitest run --project dom src/modules/safe` | 通过 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-07.md</Path>` |
| 格式不退化 | 单元 | `pnpm exec vitest run src/modules/safe && pnpm test:safety-regressions` | 通过 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-07.md</Path>` |
| UI runner | 组件 E2E | `node scripts/ui-review/run.mjs` | DESIGN 验收通过 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-07.md</Path>` |

- **E2E disposition：** required：宽/窄、长文本、亮暗、中英。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。共同约束见 Map §1“总体实施背景”。复制或改编 bz 内容时在文件头署名并在 `<Path>docs/third-party/bz.md</Path>` 追加条目（AC-001）。改动 TS/TSX 时运行 `pnpm run build` 与 `pnpm run lint`，重建的 `main.js`/`styles.css` 由 Lead 统一处理。

## 未决事项与风险

无额外风险。

G-DESIGN 已关闭（2026-11-04）：design_ref 绑定 change DESIGN revision 2（digest 1e3b5ef5fb4c…）、页面 SAFE-WORKSPACE；实现须只读遵循 `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/DESIGN.md</Path>` 与 UI-001 final，不重选风格；完成时在 Evidence 写 Design Conformance。

### 未决问题

无。
