---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: true
design_ref: {"revision": 3, "digest": "49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66", "pages": ["settings"], "acceptance": ["UX-SET-1", "UX-SET-2"]}
change: "2026-11-05-frontend-uiux-redesign"
id: "T-12"
title: "设置、外观实时预览与图标"
status: "done"
kind: "feature"
planning_depth: "standard"
planning_depth_reason: "按模块隔离写集的垂直替换切片"
ready: true
risk: "medium"
blocked_by: ["T-01", "T-03", "T-04", "T-15"]
contract_ids: ["AC-111", "AC-112", "AC-113", "AC-114"]
owner: "native:/root/repair_t12"
expected_changes: ["<Path>src/app/settings/</Path>", "<Path>src/modules/icons/ui/</Path>"]
writable_paths: ["<Path>src/app/settings/**</Path>", "<Path>src/modules/icons/ui/**</Path>", "<Path>src/modules/icons/styles/**</Path>", "<Path>src/app/workbench/settings-categories.ts</Path>", "<Path>src/app/workbench/settings-page.tsx</Path>", "<Path>src/app/workbench/settings-page.dom.test.tsx</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-12/**</Path>"]
read_only_paths: ["<Path>src/theme/**</Path>", "<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/DESIGN.md</Path>", "<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/prototypes/UI-002/design-system.md</Path>", "<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/prototypes/UI-002/final/**</Path>"]
shared_paths: ["<Path>src/modules/icons/i18n.ts</Path>", "<Path>src/shared/i18n/appearance.ts</Path>", "<Path>main.js</Path>", "<Path>styles.css</Path>", "<Path>src/theme/custom.ts</Path>", "<Path>src/theme/custom.test.ts</Path>", "<Path>src/theme/settings.ts</Path>", "<Path>src/theme/settings.test.ts</Path>", "<Path>src/theme/runtime.dom.test.tsx</Path>", "<Path>src/theme/styles/editor-schemes.css</Path>", "<Path>src/shared/i18n/lazy/appearance.ts</Path>", "<Path>src/theme/editor-presets.test.ts</Path>", "<Path>scripts/ui-review/run.mjs</Path>", "<Path>scripts/ui-review/run.test.mjs</Path>", "<Path>scripts/obsidian-stub.ts</Path>", "<Path>src/ui/components/huhu/SettingsFormControls.tsx</Path>", "<Path>src/modules/icons/iconic-port.test.ts</Path>", "<Path>src/app/settings/react/CategoryContent.tsx</Path>", "<Path>src/modules/icons/platform/utils/compressed-resource.ts</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-12/index.tsx</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-12/index.mjs</Path>"]
shared_path_owners: ["<Path>src/modules/icons/i18n.ts</Path> => Lead", "<Path>src/shared/i18n/appearance.ts</Path> => Lead", "<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead", "<Path>src/theme/custom.ts</Path> => Lead", "<Path>src/theme/custom.test.ts</Path> => Lead", "<Path>src/theme/settings.ts</Path> => Lead", "<Path>src/theme/settings.test.ts</Path> => Lead", "<Path>src/theme/runtime.dom.test.tsx</Path> => Lead", "<Path>src/theme/styles/editor-schemes.css</Path> => Lead", "<Path>src/shared/i18n/lazy/appearance.ts</Path> => Lead", "<Path>src/theme/editor-presets.test.ts</Path> => Lead", "<Path>scripts/ui-review/run.mjs</Path> => Lead", "<Path>scripts/ui-review/run.test.mjs</Path> => Lead", "<Path>scripts/obsidian-stub.ts</Path> => Lead", "<Path>src/ui/components/huhu/SettingsFormControls.tsx</Path> => Lead", "<Path>src/modules/icons/iconic-port.test.ts</Path> => Lead", "<Path>src/app/settings/react/CategoryContent.tsx</Path> => Lead", "<Path>src/modules/icons/platform/utils/compressed-resource.ts</Path> => Lead", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-12/index.tsx</Path> => Lead", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-12/index.mjs</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "0c2a3309d1b00920539376a02c98485a98442c002945f0ee2e6ce8b816cfb744", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}, {"id": "ui", "path": "<Path>.agents/skills/ui/SKILL.md</Path>", "sha256": "12621917181e3a74f3a410a710752e8e856d9a84af739ef6c97c85f79bca1ad4", "phase": "implement", "operation": "apply-workbench-ui-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景", "change DESIGN 与 UI-002 原型"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-12: 设置、外观实时预览与图标

- **总体 Map：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/tickets-map.md</Path>`
- **Goal Plan：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/goal-plan.md</Path>`
- **上游 Spec：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/spec.md</Path>`
- **设计合同：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/DESIGN.md</Path>`
- **完成 Evidence：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-12.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

设置按 DESIGN §6 settings：设置搜索与分组、外观（配色来源、明暗、强调色、字号、字体、密度、减少动效、实时预览）、通用、图标选择、内容与受管文件；外观导入只接受当前格式。

来源：Spec 对应章节与 AC；DESIGN §3–§7；交付包 `source/Frontend_Refactor_Plan.md.txt`（§5、§7、§9）。

## 行为与范围

IN：SettingsPage、appearance/AppearanceSettings、Typography、CustomColors、appearance.ts（删除 v1 parseExport 分支与其测试）、icons/ui；设置行统一为 SettingsRow。

REUSE：`src/ui/components` 唯一实现、现有模块 `api.ts` 服务与命令、`src/ui/react/portal.ts`、`shared/feedback`。

OUT：各模块自身设置页（随所在模块票）。

## 验收标准

- [x] `AC-111`：满足 Spec 验收合同 AC-111 的可观察结果。
- [x] `AC-112`：满足 Spec 验收合同 AC-112 的可观察结果。
- [x] `AC-113`：满足 Spec 验收合同 AC-113 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 外观与设置行 | DOM | `pnpm exec vitest run --project dom src/app/settings src/modules/icons` | 通过（退出码 0） | `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-12.md</Path>` |
| 导入格式 | 单元 | `pnpm exec vitest run src/app/settings` | 通过（退出码 0） | `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-12.md</Path>` |

- **E2E disposition：** required：settings 页全部状态 1440/390。
- **运行环境：** change README 选定的 change-workspace；所有执行者复用同一工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码与调用方。共同约束见 Map §1“总体实施背景”。同票删除被替换的旧实现、旧样式与旧测试选择器（ADR-001、DEC-001）；删除测试时说明原风险由哪个新测试承接。验证遵循 Map 的原子集成合同：本票检查必须通过，共享 API 切换导致尚未迁移消费者的已知整体编译错误逐条记账；T-13 前全部消除，T-14 全量 build/lint 必须通过。产物由 Lead 统一处理。

设计绑定：change DESIGN revision 3（designDigest `49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66`），页面 settings，验收 UX-SET-1, UX-SET-2。实现只读遵循 DESIGN 与 UI-002 final，不重选风格；完成时在 Evidence 写 Design Conformance（与原型的差异、视口、截图本地路径）。

## 未决事项与风险

复审风险与解除条件已写入本票补充合同与验证方法；不沿用初版无风险判断。

### 状态说明

复审问题已落实到 DESIGN revision 3、覆盖清单与本票补充合同；UI-002 与 DESIGN revision 3 已由用户确认（LOG-014，`prototypes/UI-002/approval.md`），DoR 已回读，规划 DoR 已满足；执行状态以 frontmatter 为准，按 Goal Plan 的既有授权、依赖与验收门推进。

### 未决问题

无。

## 实施补充合同（DESIGN revision 3）

settings-categories/nav 能力过滤、实际模块字段搜索索引与精确定位；模块 settings-page 归对应模块票，T-12 不另写一份。保留正文主题/字体/自定义色能力的独立设置，重做通用/外观/图标及 host-icons.css。图标规则编辑、选择器与批量操作按现有功能重绘。

本票 fixture 入口：`scripts/ui-review/fixtures/frontend-redesign/T-12/`（T-01 使用 shared）。T-01 完成 runner 后执行 `node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-12 --matrix redesign --out /tmp/huhu-frontend-redesign/T-12`。任何尚未实现的 CLI 参数不记为已通过。

- [x] `AC-114`：满足 Spec 中新增合同及本票的表面责任。

### 正文自定义色与真实设置失败接缝（Map revision 24）

076核对实际源发现custom颜色仍保存、但editor枚举/正文应用缺失；按原DESIGN保留正文自定义色能力，Lead补editor=custom、仅--ne-*输出与Markdown内容局部映射、按Document明暗选择和完整清理。HUHU界面仍仅批准纸/墨及--hu-*，不恢复旧UI palette/deriveCustomTokens。该最小公开端口及测试与实际lazy/appearance词典列入Lead shared；不新增用户数据格式或设置存储事务。

SettingsHandle.update实际先publish再持久化，失败不能假称磁盘回滚。界面保留失败说明、未保存草稿及显式Retry，迟到结果不覆盖新编辑；不为视觉迁移改写Store或建立第二套设置事务。局部预览复用公开theme纯函数，真实设置修改按原合同即时作用工作台/浮层。

### 动态正文 palette 与真实 fixture 图（Map revision 25）

自定义正文通过runtime生成变量，不冒充静态CSS palette；Lead同步静态预设测试的集合定义并保留动态自定义完整token验证。T12 fixture消费真实appSchema/MANIFESTS会到达未执行的desktop electron与正文.md导入，runner沿生产构建配置提供electron external和.md text loader，不复制schema或调用真实desktop操作；中央run与相邻测试由Lead维护，实际图数量仍按guard显式校验，不降低门槛。

### 真实图宿主标记与颜色控件触控（Map revision 26）

真实MANIFESTS图需要未执行的公开Obsidian类标记与前置解析符号才能链接；Lead仅补测试stub中实际缺失export，不模拟原生宿主验收，未实现的解析路径被调用则显式失败。共享ColorField原生颜色input最小尺寸改用--hu-hit，细指针保留设计、粗指针至少44；由T12真实native几何验证，模块不复制颜色控件。
