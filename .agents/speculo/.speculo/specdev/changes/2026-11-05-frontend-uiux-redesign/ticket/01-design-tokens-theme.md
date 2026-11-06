---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: true
design_ref: {"revision": 3, "digest": "49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66", "pages": ["settings"], "acceptance": ["UX-SET-1"]}
change: "2026-11-05-frontend-uiux-redesign"
id: "T-01"
title: "设计 token、纸/墨主题与跟随 Obsidian"
status: "done"
kind: "feature"
planning_depth: "standard"
planning_depth_reason: "按模块隔离写集的垂直替换切片"
ready: true
risk: "high"
blocked_by: []
contract_ids: ["AC-001", "AC-002", "AC-003", "AC-004"]
owner: "native:/root/implement_t01"
expected_changes: ["<Path>src/ui/styles/</Path>", "<Path>src/theme/</Path>", "<Path>src/ui/tailwind/</Path>"]
writable_paths: ["<Path>src/ui/styles/**</Path>", "<Path>src/theme/**</Path>", "<Path>src/ui/tailwind/**</Path>", "<Path>src/ui/fonts/**</Path>", "<Path>scripts/lint-css.mjs</Path>", "<Path>scripts/build-styles.mjs</Path>", "<Path>scripts/ui-review/run.mjs</Path>", "<Path>scripts/ui-review/run.test.mjs</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/shared/**</Path>", "<Path>scripts/build-tailwind.mjs</Path>"]
read_only_paths: ["<Path>src/ui/components/**</Path>", "<Path>src/app/settings/**</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/DESIGN.md</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/prototypes/UI-002/design-system.md</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/prototypes/UI-002/final/**</Path>"]
shared_paths: ["<Path>main.js</Path>", "<Path>styles.css</Path>", "<Path>package.json</Path>", "<Path>pnpm-lock.yaml</Path>", "<Path>THIRD-PARTY-NOTICES.md</Path>", "<Path>tsconfig.json</Path>", "<Path>tsconfig.test.json</Path>", "<Path>esbuild.config.mjs</Path>", "<Path>eslint.config.mts</Path>", "<Path>pnpm-workspace.yaml</Path>", "<Path>scripts/ui-adapter-inputs.json</Path>", "<Path>scripts/ui-adapter-guard.mjs</Path>", "<Path>scripts/verify-ui-adapters.mjs</Path>", "<Path>scripts/sonner-styles.mjs</Path>", "<Path>scripts/radix-owner-document.mjs</Path>", "<Path>src/host/obsidian/datetime.ts</Path>", "<Path>src/host/obsidian/datetime.test.ts</Path>", "<Path>src/modules/navigator/ui/runtime.ts</Path>", "<Path>src/modules/versioning/services/sync-service.ts</Path>", "<Path>src/modules/versioning/ui/sync-presentation.tsx</Path>", "<Path>src/app/main.ts</Path>"]
shared_path_owners: ["<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead", "<Path>package.json</Path> => Lead", "<Path>pnpm-lock.yaml</Path> => Lead", "<Path>THIRD-PARTY-NOTICES.md</Path> => Lead", "<Path>tsconfig.json</Path> => Lead", "<Path>tsconfig.test.json</Path> => Lead", "<Path>esbuild.config.mjs</Path> => Lead", "<Path>eslint.config.mts</Path> => Lead", "<Path>pnpm-workspace.yaml</Path> => Lead", "<Path>scripts/ui-adapter-inputs.json</Path> => Lead", "<Path>scripts/ui-adapter-guard.mjs</Path> => Lead", "<Path>scripts/verify-ui-adapters.mjs</Path> => Lead", "<Path>scripts/sonner-styles.mjs</Path> => Lead", "<Path>scripts/radix-owner-document.mjs</Path> => Lead", "<Path>src/host/obsidian/datetime.ts</Path> => Lead", "<Path>src/host/obsidian/datetime.test.ts</Path> => Lead", "<Path>src/modules/navigator/ui/runtime.ts</Path> => Lead", "<Path>src/modules/versioning/services/sync-service.ts</Path> => Lead", "<Path>src/modules/versioning/ui/sync-presentation.tsx</Path> => Lead", "<Path>src/app/main.ts</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}, {"id": "ui", "path": "<Path>.agents/skills/ui/SKILL.md</Path>", "sha256": "123781b61a8bd3b40af9ff6161b1dc981c446f13c2ef3b2f49995630cd2f2c44", "phase": "implement", "operation": "apply-workbench-ui-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景", "change DESIGN 与 UI-002 原型"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-01: 设计 token、纸/墨主题与跟随 Obsidian

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **设计合同：** `<Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-01.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

DESIGN §3 的全部 token 落到 `src/ui/styles/tokens.css`：纸/墨、6 种强调色、跟随 Obsidian 映射与对比度回退、密度、界面字号、减少动效、z 层级与动效时长；`src/theme` 运行时按设置写 `data-theme/data-accent/data-source/data-density/data-ui-size/data-motion`。

来源：Spec 对应章节与 AC；DESIGN §3–§7；交付包 `source/Frontend_Refactor_Plan.md.txt`（§5、§7、§9）。

## 行为与范围

IN：tokens.css、base.css、theme runtime/settings/custom/presets（删除旧 `--nt-*` UI 预设与 suliworld/github 的 UI 部分，保留笔记编辑器配色方案文件不变）；定义供看板派生的语义 token，实际 --db-* 调用方由 T-08 修改；新增 token 守卫（只允许 DESIGN §3.4 白名单）与主题矩阵对比度测试。

REUSE：`src/ui/components` 唯一实现、现有模块 `api.ts` 服务与命令、`src/ui/react/portal.ts`、`shared/feedback`。

OUT：组件改造（T-02）；外观设置页面（T-12）；`src/theme/styles/editor-schemes.css` 的笔记编辑器配色（OOS-002）。

## 验收标准

- [x] `AC-001`：满足 Spec 验收合同 AC-001 的可观察结果。
- [x] `AC-002`：满足 Spec 验收合同 AC-002 的可观察结果。
- [x] `AC-003`：满足 Spec 验收合同 AC-003 的可观察结果。
- [x] `AC-004`：满足 Spec 验收合同 AC-004 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| token 与守卫 | 门禁 | `pnpm run lint:css` + `pnpm test:styles` | 通过（退出码 0） | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-01.md</Path>` |
| 对比度矩阵与 runtime | 单元/DOM | `pnpm exec vitest run src/theme` | 通过（退出码 0） | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-01.md</Path>` |

- **E2E disposition：** required：纸/墨 × 强调色截图对照 DESIGN §3（T-14 汇总）。
- **运行环境：** change README 选定的 change-workspace；所有执行者复用同一工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码与调用方。共同约束见 Map §1“总体实施背景”。同票删除被替换的旧实现、旧样式与旧测试选择器（ADR-001、DEC-001）；删除测试时说明原风险由哪个新测试承接。验证遵循 Map 的原子集成合同：本票检查必须通过，共享 API 切换导致尚未迁移消费者的已知整体编译错误逐条记账；T-13 前全部消除，T-14 全量 build/lint 必须通过。产物由 Lead 统一处理。

设计绑定：change DESIGN revision 3（designDigest `49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66`），页面 settings，验收 UX-SET-1。实现只读遵循 DESIGN 与 UI-002 final，不重选风格；完成时在 Evidence 写 Design Conformance（与原型的差异、视口、截图本地路径）。

## 未决事项与风险

主题与组件是全部页面的共享合同；合同变化须回到本票修订，消费者票不得自行扩展。

### 状态说明

复审问题已落实到 DESIGN revision 3、覆盖清单与本票补充合同；UI-002 与 DESIGN revision 3 已由用户确认（LOG-014，`prototypes/UI-002/approval.md`），DoR 已回读，规划 DoR 已满足；执行状态以 frontmatter 为准，按 Goal Plan 的既有授权、依赖与验收门推进。

### 未决问题

无。

## 实施补充合同（DESIGN revision 3）

核实 reuse-decision.md 稳定版本与 peer/engine；负责包清单/锁文件/构建/lint 工具链升级，T-02/T-03 各自实现 API 适配。新增 runner --suite frontend-redesign 与 --matrix redesign，fixtures 隔离旧 T-xx，CLI 默认行为保持现有用途。矩阵为 320/390/600/820/960/1100/1440，默认 desktop 窄叶子，另设移动能力；主题/密度/触控/减少动效组合按风险抽样。该 runner 合同必须先验证再交模块票使用。AC-001 本票只验新 token/桥接，仓库零旧配色由 T-13 最终验；首页 --db 桥由 T-08 实施。

本票 fixture 入口：`scripts/ui-review/fixtures/frontend-redesign/T-01/`（T-01 使用 shared）。T-01 完成 runner 后执行 `node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-01 --matrix redesign --out /tmp/huhu-frontend-redesign/T-01`。任何尚未实现的 CLI 参数不记为已通过。

### 实施接缝补充（2026-11-05）

升级真实依赖后，适配器摘要守卫拒绝 Sonner/Radix 新源码。新增上述 shared 构建适配路径及包管理器策略文件，由 Lead 协调唯一 writer；保持生产图精确计数、源码摘要与多 Document 行为，不降低门禁。独立适配任务见本轮 003-implement-adapters。

TS6 宿主类型接缝 S-01 由 Lead 分配 004-implement-host-types：复用 datetime 结构类型边界及三个调用方，修复新预设循环 fallback；仅类型/装配适配，不变更领域语义。
