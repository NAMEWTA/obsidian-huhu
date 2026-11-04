# 旧数据兼容整体删除：派遣通用约束（Lead，2026-11-04）

用户 2026-11-04 指示："针对旧数据的问题，请你完成整体的重构删除，无需兼容任何旧数据。保证最新的代码和文档一定是最新的，符合当前代码情况的。不需要什么 V1 适配。因为我还没有最终发版。" 依据 ADR-011（发布前无历史兼容义务）。

仓库 `/home/wta/projects/obsidian-huhu`，分支 dev，当前 checkout 是唯一工作区，**其他执行者同时在改别的模块**。

## 判定标准

**删除**（连同其专用测试、夹具、golden 快照、词典键、设置项、文档段落）：
- 读取/检测/转换旧持久化格式、旧目录/旧路径、旧设置键、旧文件名的代码；
- schema/格式版本升级链（`migrateV1/V2…`、`fromV1`、`upgrade*`、`legacy*` 适配器、`version < N` 分支），只保留当前版本；
- 旧数据导入/迁移界面、迁移提示、迁移回执、迁移状态记录；
- 只为旧数据存在的常量、类型别名、回退字段（例如 `legacyDeviceId`、旧字段名兜底读取）。

**保留**：
- 当前格式的校验与损坏数据处理（遇到旧格式或未知版本时，走现有"无效/损坏/不可识别"路径：报告错误、不覆盖、不静默改写用户文件；不要新写兼容逻辑）；
- 当前在用的协议版本（例如 native control-wire `v1`、`resource-v1` 路径段是现行版本，不是旧数据）；
- 与旧数据无关的 "legacy" 用法（终端键盘 legacy 编码模式、第三方 CSS/Tailwind 术语等）——逐处判断，拿不准就在报告里列出不删；
- 当前有效数据的写入正确性、隐私、权限、凭据、外部动作安全。

删除后若当前数据结构里的版本号字段只剩一个取值，保留字段与校验即可，不要重新编号或改变当前文件格式。

## 工作规则

- 只写分配给你的模块路径与其测试；共享文件只由指定 owner 改。需要改别人的文件时，最小化并在报告里列出。
- **禁止 git 写操作**（add/commit/stash/checkout/reset/restore/clean/rm 等），用文件系统删除文件。不回滚他人改动。
- 不运行 `pnpm build`、`node esbuild.config.mjs`、`build-styles --write`（Lead 统一生成产物）。可以运行：两个 tsc（`pnpm exec tsc -noEmit -skipLibCheck`、`pnpm exec tsc -skipLibCheck -p tsconfig.test.json`）、定向 `pnpm exec vitest run <paths>`、`pnpm exec eslint --max-warnings 0 <files>`、`pnpm test:i18n`、`pnpm test:docs`、`pnpm test:architecture`。全仓错误若来自其他执行者在途目录，记录即可。
- 不删断言换绿：删除的测试必须是只验证旧数据兼容的测试；混合测试只删旧数据用例，当前行为断言保留。
- 面向用户文案用 `t()`，en/zh 同时维护；删除文案键时两种语言一起删，并确认无引用。
- 文档：同步更新本模块涉及的现行文档（docs/**、根 README 双语、.agents/skills/** 引用），删除旧数据迁移/兼容描述，使文档与当前代码一致。历史档案（docs 中明确标为历史/archive 的报告、specdev 归档）原文保留。
- 结果写入 `.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/sessions/20261103T110352Z/legacy-<area>-REPORT.md`（中文，精简）：删除/改写的文件清单、保留项及理由、行为变化（遇旧数据现在如何表现）、验证命令与退出码、未处理项。
- 最终回复 ≤ 300 字。
