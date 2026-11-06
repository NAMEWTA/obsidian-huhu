---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: true
design_ref: {"revision": 3, "digest": "49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66", "pages": ["versioning"], "acceptance": ["UX-VER-1", "UX-VER-2", "UX-VER-3"]}
change: "2026-11-05-frontend-uiux-redesign"
id: "T-16"
title: "版本：Git 工作区、差异阅读与历史 A/B 比较（@pierre/diffs）"
status: "done"
kind: "feature"
planning_depth: "deep"
planning_depth_reason: "替换差异引擎并新增依赖、Worker 与打包约束；Git 写操作与恢复回执不能回归"
ready: true
risk: "high"
blocked_by: ["T-03", "T-04", "T-15"]
contract_ids: ["AC-092", "AC-094", "AC-095", "AC-096", "AC-097", "AC-098", "AC-099"]
owner: "native:/root/cleanup_final"
expected_changes: ["<Path>src/modules/versioning/ui/</Path>", "<Path>src/modules/versioning/styles/</Path>", "<Path>scripts/versioning-worker.mjs</Path>", "<Path>scripts/diffs-languages.mjs</Path>"]
writable_paths: ["<Path>src/modules/versioning/ui/**</Path>", "<Path>src/modules/versioning/styles/**</Path>", "<Path>src/types/versioning-worker.d.ts</Path>", "<Path>scripts/versioning-worker.mjs</Path>", "<Path>scripts/diffs-languages.mjs</Path>", "<Path>scripts/diffs-languages.test.mjs</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-16/**</Path>", "<Path>src/modules/versioning/core/history.ts</Path>", "<Path>src/modules/versioning/core/repo.ts</Path>", "<Path>src/modules/versioning/core/restore.ts</Path>", "<Path>src/modules/versioning/core/hunk-restore.test.ts</Path>", "<Path>src/modules/versioning/services/history-query.ts</Path>", "<Path>src/modules/versioning/services/history-query.test.ts</Path>", "<Path>src/modules/versioning/services/sync-service.ts</Path>", "<Path>src/modules/versioning/services/restore-service.ts</Path>", "<Path>src/modules/versioning/services/restore-service.test.ts</Path>", "<Path>src/modules/versioning/services/automatics.test.ts</Path>", "<Path>src/modules/versioning/platform/desktop/revision-reader.ts</Path>", "<Path>src/modules/versioning/module.ts</Path>", "<Path>test/sync/git-history.test.ts</Path>", "<Path>test/sync/git-hunks.test.ts</Path>", "<Path>test/sync/git-boundary.test.ts</Path>", "<Path>test/sync/git-flow.test.ts</Path>", "<Path>test/sync/git-restore-ack.test.ts</Path>", "<Path>src/modules/versioning/platform/desktop/system-files.ts</Path>", "<Path>src/modules/versioning/platform/desktop/system-files.test.ts</Path>"]
read_only_paths: ["<Path>src/modules/versioning/api.ts</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/DESIGN.md</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/prototypes/UI-002/design-system.md</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/prototypes/UI-002/final/**</Path>"]
shared_paths: ["<Path>src/modules/versioning/i18n.ts</Path>", "<Path>package.json</Path>", "<Path>pnpm-lock.yaml</Path>", "<Path>THIRD-PARTY-NOTICES.md</Path>", "<Path>scripts/esbuild-options.mjs</Path>", "<Path>scripts/bundle-budget.json</Path>", "<Path>main.js</Path>", "<Path>styles.css</Path>", "<Path>scripts/diffs-owner-document.mjs</Path>", "<Path>scripts/diffs-owner-document.test.mjs</Path>", "<Path>scripts/ui-adapter-inputs.json</Path>", "<Path>scripts/ui-adapter-guard.mjs</Path>", "<Path>scripts/verify-ui-adapters.mjs</Path>", "<Path>scripts/ui-review/run.mjs</Path>", "<Path>scripts/ui-review/run.test.mjs</Path>", "<Path>scripts/verify-architecture.mjs</Path>", "<Path>vitest.config.ts</Path>", "<Path>scripts/third-party-notices.mjs</Path>", "<Path>scripts/third-party-notices.test.mjs</Path>", "<Path>scripts/iconic-resources.mjs</Path>", "<Path>scripts/iconic-resources.test.mjs</Path>", "<Path>scripts/module-strings.ts</Path>", "<Path>scripts/verify-i18n.mjs</Path>", "<Path>src/shared/i18n/huhu.ts</Path>", "<Path>src/shared/i18n/lazy/huhu-ui.ts</Path>", "<Path>src/modules/versioning/ui/i18n.ts</Path>", "<Path>src/modules/versioning/ui/settings-page.tsx</Path>", "<Path>src/modules/versioning/ui/workbench-page.ts</Path>", "<Path>src/modules/versioning/ui/history/history-panel-page.tsx</Path>", "<Path>src/modules/versioning/ui/history/review-page.tsx</Path>", "<Path>.agents/skills/dev/SKILL.md</Path>", "<Path>.agents/skills/dev/references/settings-and-i18n.md</Path>", "<Path>.agents/skills/dev/references/module-authoring.md</Path>", "<Path>docs/third-party/licenses/sources.json</Path>", "<Path>docs/third-party/licenses/lru-map-MIT.txt</Path>", "<Path>scripts/license-texts.mjs</Path>", "<Path>scripts/license-texts.test.mjs</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-16/index.mjs</Path>", "<Path>src/app/workbench/safe-contribution.test.ts</Path>", "<Path>src/modules/home/ui/expense/records.dom.test.tsx</Path>", "<Path>src/ui/react/foundation.dom.test.tsx</Path>", "<Path>test/sync/git-hunk-newlines.test.ts</Path>", "<Path>test/golden/user-formats.test.ts</Path>", "<Path>test/golden/__snapshots__/appearance-settings.json</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-16/index.tsx</Path>", "<Path>src/modules/versioning/ui/diff/keyboard.ts</Path>", "<Path>src/modules/versioning/ui/DiffSurface.tsx</Path>", "<Path>src/modules/versioning/ui/diff/MultiDiffView.tsx</Path>", "<Path>src/modules/versioning/core/hunk-restore.ts</Path>", "<Path>src/modules/versioning/ui/diff/theme.ts</Path>"]
shared_path_owners: ["<Path>src/modules/versioning/i18n.ts</Path> => Lead", "<Path>package.json</Path> => Lead", "<Path>pnpm-lock.yaml</Path> => Lead", "<Path>THIRD-PARTY-NOTICES.md</Path> => Lead", "<Path>scripts/esbuild-options.mjs</Path> => Lead", "<Path>scripts/bundle-budget.json</Path> => Lead", "<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead", "<Path>scripts/diffs-owner-document.mjs</Path> => Lead", "<Path>scripts/diffs-owner-document.test.mjs</Path> => Lead", "<Path>scripts/ui-adapter-inputs.json</Path> => Lead", "<Path>scripts/ui-adapter-guard.mjs</Path> => Lead", "<Path>scripts/verify-ui-adapters.mjs</Path> => Lead", "<Path>scripts/ui-review/run.mjs</Path> => Lead", "<Path>scripts/ui-review/run.test.mjs</Path> => Lead", "<Path>scripts/verify-architecture.mjs</Path> => Lead", "<Path>vitest.config.ts</Path> => Lead", "<Path>scripts/third-party-notices.mjs</Path> => Lead", "<Path>scripts/third-party-notices.test.mjs</Path> => Lead", "<Path>scripts/iconic-resources.mjs</Path> => Lead", "<Path>scripts/iconic-resources.test.mjs</Path> => Lead", "<Path>scripts/module-strings.ts</Path> => Lead", "<Path>scripts/verify-i18n.mjs</Path> => Lead", "<Path>src/shared/i18n/huhu.ts</Path> => Lead", "<Path>src/shared/i18n/lazy/huhu-ui.ts</Path> => Lead", "<Path>src/modules/versioning/ui/i18n.ts</Path> => Lead", "<Path>src/modules/versioning/ui/settings-page.tsx</Path> => Lead", "<Path>src/modules/versioning/ui/workbench-page.ts</Path> => Lead", "<Path>src/modules/versioning/ui/history/history-panel-page.tsx</Path> => Lead", "<Path>src/modules/versioning/ui/history/review-page.tsx</Path> => Lead", "<Path>.agents/skills/dev/SKILL.md</Path> => Lead", "<Path>.agents/skills/dev/references/settings-and-i18n.md</Path> => Lead", "<Path>.agents/skills/dev/references/module-authoring.md</Path> => Lead", "<Path>docs/third-party/licenses/sources.json</Path> => Lead", "<Path>docs/third-party/licenses/lru-map-MIT.txt</Path> => Lead", "<Path>scripts/license-texts.mjs</Path> => Lead", "<Path>scripts/license-texts.test.mjs</Path> => Lead", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-16/index.mjs</Path> => Lead", "<Path>src/app/workbench/safe-contribution.test.ts</Path> => Lead", "<Path>src/modules/home/ui/expense/records.dom.test.tsx</Path> => Lead", "<Path>src/ui/react/foundation.dom.test.tsx</Path> => Lead", "<Path>test/sync/git-hunk-newlines.test.ts</Path> => Lead", "<Path>test/golden/user-formats.test.ts</Path> => Lead", "<Path>test/golden/__snapshots__/appearance-settings.json</Path> => Lead", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-16/index.tsx</Path> => Lead", "<Path>src/modules/versioning/ui/diff/keyboard.ts</Path> => Lead", "<Path>src/modules/versioning/ui/DiffSurface.tsx</Path> => Lead", "<Path>src/modules/versioning/ui/diff/MultiDiffView.tsx</Path> => Lead", "<Path>src/modules/versioning/core/hunk-restore.ts</Path> => Lead", "<Path>src/modules/versioning/ui/diff/theme.ts</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "0c2a3309d1b00920539376a02c98485a98442c002945f0ee2e6ce8b816cfb744", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}, {"id": "ui", "path": "<Path>.agents/skills/ui/SKILL.md</Path>", "sha256": "ae158ca873e740b9f90a5247e53a92b994306d1b9d0efb628f7d18ff59bf7ebb", "phase": "implement", "operation": "apply-workbench-ui-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景", "change DESIGN 与 UI-002 原型"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-16: 版本：Git 工作区、差异阅读与历史 A/B 比较（@pierre/diffs）

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **设计合同：** `<Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path>`（§2、§3.7、§5 DiffView/CompareEndpoints、§6 versioning、§7 差异键盘）
- **决策：** `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`（ADR-006）
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-16.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

按 DESIGN §6 versioning 重做 Git 工作区（更改 / 提交历史 / 比较 A⇄B / 笔记历史 / 接入与同步 / revision-review），并把全部差异阅读换成 `@pierre/diffs`（ADR-006），让 Git 对比与历史选择达到 UI-002 原型的效果。

来源：用户 2026-11-05 指令（LOG-013）；Spec AC-092、AC-094–AC-099；DESIGN revision 3；UI-002 `final/index.html#versioning/changes`、`#versioning/compare`、`#versioning/diff` 等状态；官方文档 https://diffs.com/docs 与 npm `@pierre/diffs` 1.6.4 发布包的类型定义。

## 行为与范围

IN：
- **依赖**：新增 `@pierre/diffs`（锁定实施日的 1.6.x 补丁，Apache-2.0），同票移除 `@codemirror/merge`。依赖、锁文件、NOTICE 和打包配置的改动交 Lead 按 shared 规则合入。
- **DiffView / CompareEndpoints**：在 `src/modules/versioning/ui/diff/` 下包装 `MultiFileDiff`/`FileDiff`/`CodeView`/`UnresolvedFile`，只暴露 HUHU 需要的 props。主题按 DESIGN §3.7 映射；`registerCustomCSSVariableTheme` 的必需 defaults 按固定发布类型提供，名称为 huhu，值来自 `--diffs-*` 与批准 token；`unsafeCSS` 只能引用 token。
- **更改页**：冲突 / 未暂存 / 已暂存分组；三种端点（index → 工作树、HEAD → index、当前 ⇄ 传入）；改动块暂存、取消暂存、还原（还原需确认）。改动块目标内容由 `diffAcceptRejectHunk` 计算，转换成 `core/hunk-restore.ts` 现有的 `HunkDiff` 输入，经 versioning 服务写入；UI 不直接写文件。冲突三种选择由 `UnresolvedFile` 交领域写回。
- **提交历史**：分支/引用筛选、提交图、合并提交切换父提交。每行 A/B 按钮可把任意两个版本设为端点，并可交换、可设 B 为工作树。比较页的多文件 `CodeView` 支持逐文件折叠，A=B 时显示空态。
- **笔记历史**：本地采样、手动检查点、当前快照分别标注，A/B 任选两点，“恢复为 A”走 UX-VER-1。
- **差异状态**：二进制、超过渲染上限（只显示统计，可强制渲染并取消）、缺失端点、加载、取消、失败。
- **打包**：新增 `scripts/diffs-languages.mjs`，提供 esbuild 插件，把 `shiki/langs` 解析为语言白名单（markdown、yaml、json、css、javascript、typescript、html、shellscript），固定 `shiki-js` 后端，并屏蔽 wasm 与 highlights 后端。官方高亮 Worker 继续由 `scripts/versioning-worker.mjs` 以 `@pierre/diffs/worker/worker.js` 构建成 blob；需要异步全文解析时，另建只调用库 parser 的薄计算 Worker，复用同一构建脚本，不保留旧 CM 引擎。插件接入 `scripts/esbuild-options.mjs` 由 Lead 执行；两类 Worker 的图、许可与字节都计入门禁。
- **同票删除**：`diff-editors.ts`、基于 CM `Chunk` 的 `diff-model.ts`、旧 `diff-worker*.ts`、`HunkRestoreControls`/`DiffSurface` 的 CodeMirror 实现、`.huhu-versioning-fold` 等旧样式，以及对应的旧测试与选择器。删除测试时说明原风险由哪个新测试承接。
- **其余页面**：versioning 的设置页、接入、克隆、远端、作者、同步工具栏，按 DESIGN 模板重绘；日期字段改为 DateField。

REUSE：`@pierre/diffs` 自带的布局、虚拟化、Worker 池、选行、改动块工具函数和冲突界面；`src/ui/components` 的唯一实现（Button、SegmentedControl、Tabs、Badge、Dialog、Notice、Empty）；`src/ui/react/portal.ts`；versioning `api.ts` 与现有服务、队列和取消逻辑；`shared/feedback`。

OUT：
- Git 语义、恢复队列、本地历史采样与 `core/**`、`services/**` 的重写（OOS-001）。只有在现有 API 确实不足时，才按 OOS-001 补最小 API，并在 Evidence 写明原因。
- 宿主编辑器里的冲突标记扩展（`ui/conflict-extension.ts` 依赖宿主 CodeMirror，只改样式 token，不换引擎）。
- 内嵌 `worker-portable.js`、启用 wasm 或 highlights 后端、打包完整 Shiki 语言目录。

## 官方接口复核补充（2026-11-05）

按 https://diffs.com/docs 的 FileContents、React API 与 Partial Diff Hydration 合同落实以下回归；实施以最终锁定版本的发布类型和行为为准：
- 新增文件的 oldFile 为 null，删除文件的 newFile 为 null；空文件是 contents 为空字符串的真实对象。提供任一端时同时明确另一端，不能混用缺省、缺失与空内容。
- cacheKey 随内容、文件名、语言或 revision 改变；解析后的 partial metadata 保持稳定对象身份，避免重渲染丢失已加载全文。测试切换历史 A/B、重命名与快速连续选择时无旧结果覆盖。
- UnresolvedFile 在官方文档中仍为 beta/experimental，且 React 输入非受控；切换冲突文件或源版本时显式重建实例。锁定版本后验证三种选择及领域写回，不能仅凭原型或库示例认定可靠。

### 036 发布包预检后的实施合同（Map revision 12）

来源：本轮036只读报告，以及 [1.6.4 发布元数据](https://registry.npmjs.org/@pierre/diffs/1.6.4)、[官方文档](https://diffs.com/docs) 与现有 Git/历史/恢复调用链。以下补齐既有 AC-097–099 的接缝，不增加产品功能、持久 schema 或第二套差异引擎。

- **最小领域 API**：SyncService 当前只有整文件 stage/unstage/discard/markResolved，不能把改动块按钮接到它们后声称只改一块。已开放 core/history.ts、core/repo.ts、history-query、sync-service、必要的 restore 输入/服务与 module.ts 精确路径，完成有类型的端点列表/统计、受验证 index 改动及既有 RestoreService 装配；其余领域源仍只读。请求绑定 repository/path、操作方向、HEAD/index OID 与 worktree/raw snapshot proof，复用原串行队列、Git 边界与回执。过期 proof、锁与来源变化拒写；其他已暂存路径和未选块保持。UI 不调用裸 Git、写文件或自行持有恢复事务。
- **恢复与冲突分开准入**：普通 restoreGate 当前拒绝冲突/merge，继续保留。仅为已核对的冲突文件增加窄准入，三选一先生成候选、确认后走领域写回；复用现有 checkpoint/receipt/undo 与源指纹检查。不得全局放宽普通恢复、静默 markResolved、继续 merge 或覆盖新编辑。core/hunk-restore.ts 原实现只读复用，既有 BOM/CRLF/混合 EOL/emoji/EOF 与未选区字节反例全部保留。
- **端点列表**：现有 changedFiles 只接受两个 commit。比较页 B=工作树、index 端点与 +/− 汇总由领域查询最小扩展完成，包含 rename 与初始/空端；浏览查询不更新 index，不切分支。笔记历史继续复用本地快照和固定当前快照服务。
- **两类上限与取消**：保留 reader 每端 2MiB 的现有硬上限；超过该上限显示领域原因，不把“仍然渲染”变成无限读取。渲染阈值只控制已安全取得内容，用户可明确强制渲染并取消。库的高亮池不承担原始双文本 diff 解析；大输入不得在 React render/useMemo 中同步计算。优先复用可取消的领域 patch + FileDiff，全文解析需要时使用上述库 parser 薄 Worker，取消时停止对应计算并拒绝迟到结果。platform reader 精确权限只用于必要的端点/取消接缝，不抬高硬上限；新数据格式或限额策略仍须返回 Lead。
- **冲突组件 API**：固定 React UnresolvedFile 没有 vanilla 的同名 resolve 回调入口。用其公开 utility/instance API 生成三种候选，接领域确认与回执；成功按新 hash 重建，失败保留源状态并可重试，不靠默认按钮改内部预览冒充落盘。
- **先验真实双 Document**：固定发布包含 ambient document/window、自定义元素和 constructed stylesheet，不能仅换 Worker factory 便视为支持浮窗。依赖就绪后先在 main/iframe 同时验证 FileDiff/CodeView/UnresolvedFile 的首次创建、adopt、shadow 样式、resize/scroll、选行、卸载和真实监听，再进入 Obsidian 浮窗门。实际失败后才采用最小 owner 适配；如需构建转换，由 Lead 在新增 diffs-owner-document 与中央 guard 接缝实施，完整源 hash、锚数量、真实图数量和正反控制缺一不可。未通过保持待验收，不改批准 UI 或降成静默主窗口路径。
- **池与键盘所有权**：不用模块全局 singleton 的便利 WorkerPoolContextProvider；复用公开 Context/Manager 按 ownerWindow 管理 initialize/terminate、Worker/blob/URL 与关窗清理。行号 gutter 的发布 HAST 并非键盘按钮，使用有界 onPostRender 生命周期和库 selection/scroll API 补实际语义与 Enter/Shift 操作，覆盖虚拟行回收；不另造 Tab trap 或虚拟器。
- **语言与后端**：白名单表供主包、所有 Worker 和 UI filename/lang 归一共同使用；`.sh/.bash` 映射 shellscript，其他不支持的语言明确 text。主包与 Worker 的普通/hashed 后端、主题目录和实际 grammar 传递图都要核对，仅设置 preferredHighlighter 不证明未打入 wasm/highlights。未知依赖源或入口构建失败；不外置未提供模块或更改 node_modules。现有 NOTICE 生成器沿用，统计所有实际分发 Worker；预算只新增禁止提前加载的包标识，不提高现有阈值。

新增路径是为上述既有行为提供精确权限，只有实际需要才改，不要求创建所有候选测试文件。test/sync 的真实 Git 回归只用临时仓库；现有工作区 index、分支和远程保持原授权边界。前序 T-03/T-04/T-15 未完成前不启动本票实现。

## 验收标准

- [x] `AC-092`：满足 Spec 验收合同 AC-092 的可观察结果。
- [x] `AC-094`：满足 Spec 验收合同 AC-094 的可观察结果。
- [x] `AC-095`：满足 Spec 验收合同 AC-095 的可观察结果。
- [x] `AC-096`：满足 Spec 验收合同 AC-096 的可观察结果。
- [x] `AC-097`：满足 Spec 验收合同 AC-097 的可观察结果。
- [x] `AC-098`：满足 Spec 验收合同 AC-098 的可观察结果。
- [x] `AC-099`：满足 Spec 验收合同 AC-099 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 差异与历史交互 | DOM | `pnpm exec vitest run --project dom src/modules/versioning` | 通过（退出码 0） | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-16.md</Path>` |
| 改动块、恢复与 Git 语义不回归 | 单元/服务 | `pnpm exec vitest run src/modules/versioning/core src/modules/versioning/services` | 通过；hunk-restore 与 restore-service 原有用例保留 | 同上 |
| 语言白名单与 Worker 构建 | 脚本单测 | `node --test scripts/diffs-languages.test.mjs` | 白名单外语言解析为纯文本；不含 wasm/highlights | 同上 |
| 启动闭包与包体 | 门禁 | `pnpm run check:bundle` | 启动闭包不含 `npm:@pierre/diffs`、`npm:shiki`；versioning 激活预算的变化有实测与理由 | 同上 |
| 许可 | 门禁 | `pnpm run check:notices` | `@pierre/diffs` 与 shiki、diff 等依赖已登记 | 同上 |
| 原型一致性 | UI runner | `node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-16 --matrix redesign --out /tmp/huhu-frontend-redesign/T-16`（T-01 交付参数后） | versioning 全部状态 1440/390，另含 320/600/960 | 同上（截图留本地） |

- **E2E disposition：** required：versioning 全部状态 1440/390；纸/墨各一组。
- **运行环境：** change README 选定的 change-workspace；所有执行者复用同一工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 只作导航，实现前要核对实际代码与调用方：GitWorkbench、NoteReviewPage、review-page、workbench-page、hunk-mapping、restore-service。共同约束见 Map §1“总体实施背景”。

同票删除被替换的旧实现、旧样式与旧测试选择器（ADR-001、DEC-001）。验证遵循 Map 的原子集成合同。`package.json`、锁文件、NOTICE、`scripts/esbuild-options.mjs`、`scripts/bundle-budget.json` 与产物由 Lead 统一处理；本票提交候选改动与实测数据。

设计绑定：change DESIGN revision 3（designDigest `49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66`），页面 versioning，验收 UX-VER-1、UX-VER-2、UX-VER-3。实现只读遵循 DESIGN 与 UI-002 final，不重选风格；完成时在 Evidence 写 Design Conformance（与原型的差异、视口、截图本地路径）。

## 未决事项与风险

- **高风险**：Shiki 在单个 CommonJS 产物中会把按需语言整体打包。白名单插件必须先做；用 metafile 证明产物里没有全量语言后，才接入页面。
- **高风险**：Obsidian 弹出窗口中的 shadow DOM、Worker 与选区要在所属 Document 下验证。Worker 由 `ownerWindow` 创建，卸载时终止。
- **中风险**：Pierre 的 hunk 结构与 `core/hunk-restore.ts` 现有输入之间的映射，要用现有 `hunk-mapping`、`hunk-restore` 用例逐项证明等价，不能弱化断言。

### 状态说明

依赖版本在实施日重新查询并锁定补丁版本；若 1.6.x 出现破坏性问题，记录复现后选择最近的可用版本，并更新 reuse-decision 与本票。

### 未决问题

无。

### 新增真实 Git 测试的项目隔离（Map revision 21）

新增 git-hunks.test.ts 使用真实临时仓库、子进程与 index 锁，Lead 在 vitest.config.ts 的既有 nativeIntegrationTests 中登记该单一路径，沿用串行 native-integration 项目。其余测试配置、worker数量和时限不变；只补新增用例的真实调度归属，不放宽断言。

### 二进制当前工作树的系统打开端口（Map revision 22）

DESIGN §6已有二进制“在系统中打开”动作，当前versioning无对应宿主端口。允许上述独立desktop/system-files及相邻测试，以最小Electron shell.openPath适配承接；沿现有版本路径/仓库绑定检查、普通文件与symlink/realpath边界，service/module仅转接经过核对的当前工作树路径。历史blob、缺失/非本库/符号链接端点不伪造系统路径，不在reader中夹带宿主打开行为，不跨模块私有实现或使用未公开Obsidian API。测试只用真实临时路径与注入shell spy，不真正打开系统程序。无新增业务字段/引擎、DAG或设计变化。

### 审查修复共享接缝（Map revision 23）

NOTICE生成器由Lead移入shared单写，明确纳入默认高亮及parse:true两图；相邻测试验证真实parser入口被统计。当前包集合重合不作为省略分发图的理由，最终NOTICE资产仍待全局迁移构建通过后统一生成。

### 内嵌静态资产字节预算（Map revision 28）

真实诊断main.js为9555624，超过既有8252416，versioning activation为204512，超过195584。不得提高预算。优先保留公开Pierre/Shiki引擎与8语言，把内嵌静态grammar和Worker代码用成熟fflate 0.8.3（MIT）按函数解包：仅构建传输无损压缩，非新diff/压缩引擎。Root安装锁定依赖/NOTICE；原始及压缩字节都报告，实际main.js含真实传输/解包代码，NOTICE继续枚举主/两Worker原图，guard源hash/锚/物理图数不省略。WorkerFactory仍同步且由实际ownerWindow创建Blob/Worker/URL，不为加载协议加自制消息缓冲。数据/代码逐字回环、8语法真实高亮、取消/关窗/双Document实测后才验收。

activation不足先实测具体闭包，必要的最小领域逻辑按操作入口懒加载需先交Lead精确新路径/测试，不重写queue/proof/恢复事务，不把领域逻辑挪到UI或隐藏功能。其它模块预算分别归责任票，T13/T14最终统一门禁。

### Root 事实注释收口（Map50）

Root仅将hunk-restore.ts内已卸载CM包的EOF注释改为当前通用块边界事实，生产JS须逐字节等价；不改边界算法、写入/回执/undo或公开接口。T13继续modules/**只读，不借本例外写领域。
