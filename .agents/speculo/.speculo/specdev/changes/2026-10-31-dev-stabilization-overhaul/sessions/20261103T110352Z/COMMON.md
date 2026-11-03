# 本轮派遣通用约束（Lead: host:claude-code/root，2026-11-03）

你是 #41 change `2026-10-31-dev-stabilization-overhaul` 的实现执行者。仓库 `/home/wta/projects/obsidian-huhu`，分支 `dev`，当前 checkout 是唯一工作区，**其他执行者可能同时在写别的路径**。

## 必读（按需，只读与本票相关部分）

1. 根 `AGENTS.md`；`.agents/skills/dev/SKILL.md`（UI 票再加 `.agents/skills/ui/SKILL.md`），验证选择表 `.agents/skills/dev/references/testing.md`。
2. 本票 `ticket/NN-*.md`（全文），以及其中引用的 Spec AC（`spec.md`）、`ADR.md`（重点 ADR-010、ADR-011）、`execution-boundaries.md`。
3. UI 票：`DESIGN.md`（revision 3）与 `prototypes/UI-001/design-system.md` 中与本票页面相关的部分；独立组件 runner 为 `scripts/ui-review/run.mjs`，参考已有 fixture `scripts/ui-review/fixtures/T-23.*`、`T-24.*`。
4. 依赖票已完成的 `evidence/T-xx.md`（仅在需要时）。

（以上相对路径均在 `.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/` 下，除非以 `src/`、`scripts/` 等仓库根路径开头。）

## 2026-11-03 用户最新指令（覆盖票据/计划中的旧表述）

- 用户已授权完成全部票据，**包括删除主线 T-39–T-46**；票据或 Goal Plan 中"未授权 / 只改文档 / 冻结待重构"等旧文字不再阻止删除票实施。
- **无需考虑任何兼容性**：不保留、不迁移、不回读任何发布前旧数据、旧路径、旧设置、旧布局、旧协议；可以直接删旧类型/旧字段/迁移代码及其专用测试。当前有效数据的写入正确性、隐私、权限与外部动作安全不能降级。
- `docs/e2e/` 已删除，**不要重建**。票据里写到 `docs/e2e/dev-overhaul/...` 的输出路径一律改到被 git 忽略的 `temp/dev-overhaul/<票号>/...`（例：`node scripts/ui-review/run.mjs --ticket T-25 --matrix standard --out temp/dev-overhaul/ui/T-25`）。原"统一账本"不再存在，结果只写本票 Evidence。
- 在 T-44 完成前不要运行 `pnpm build` / `pnpm build:browser`（会生成 Browser 资产）；也**不要**运行会写 `main.js`、`styles.css`、`build/**`、`src/ui/styles/fonts.generated.css` 的生成步骤（`node esbuild.config.mjs production`、`node scripts/build-styles.mjs --write`、`node scripts/build-tailwind.mjs`），这些由 Lead 统一生成。可以运行：`pnpm exec tsc -noEmit -skipLibCheck`、`pnpm exec tsc -skipLibCheck -p tsconfig.test.json`、定向 `pnpm exec vitest run <files>`、`pnpm exec eslint <files>`、`pnpm lint:css`、`pnpm check:styles`、`pnpm test:i18n`、`pnpm test:ui-styles`、`pnpm test:ui-runtime` 等只读检查。
- 不启动真实 Obsidian；真机验收由用户自行完成，不要为它准备清单。

## 写入边界

- 只写本票 frontmatter 的 `writable_paths`。如必须扩到相邻文件（真实调用方、测试），最小扩展并在 Evidence"偏差"一节写明路径和理由。Lead 独占路径（`main.js`、`styles.css`、`build/**`、`fonts.generated.css`、`docs/references.md`、`src/modules/home/i18n.ts`）如需改动：`src/modules/home/i18n.ts` 与 `docs/references.md` 可以由你直接改，但在报告中列出改动的键/条目；生成产物不要碰。
- **禁止任何 git 写操作**：不 add/commit/stash/checkout/reset/restore/clean，不推送。Lead 负责提交推送。不要回滚或改动不属于你的未提交改动。
- 不提高 `scripts/bundle-budget.json` 阈值；不删断言、不加无条件重试、不放宽时限来换绿灯。
- 面向用户的文案用 `t()`，en/zh 同时给出。遵守 TDD：先写/改能失败的测试，看到失败再改实现。

## 交付

1. 实现 + 适用验证（真实命令和退出码）。
2. 写本票 Evidence `evidence/T-xx.md`（中文、精简的检验结论报告，< 30 KB）：`# Evidence: T-xx — 标题`，然后依次：`## 结论`（Result: passed / partial / failed 及原因）、`## 修改范围`（文件清单）、`## 验收与合同映射`（逐条 AC → 证据）、`## 验证`（命令、退出码、关键观察；失败的也要如实写）、UI 票加 `## Design Conformance`（design_ref revision 3 / digest / 页面 / AC，实际截图位置写 `temp/...` 纯文本路径，视口/主题/状态，与原型差异）、`## 偏差与决策`、`## 残余风险与未验证项`。不要写链接，不要贴大段日志/JSON。
3. 不要改 Ticket frontmatter 的 status（Lead 改）。
4. 最终回复 ≤ 300 字：改动文件、命令与退出码、未验证项、阻塞点。
