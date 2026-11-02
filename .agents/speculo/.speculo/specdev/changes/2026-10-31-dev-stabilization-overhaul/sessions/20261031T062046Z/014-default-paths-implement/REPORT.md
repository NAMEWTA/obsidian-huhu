# 任务回报

Session: 20261031T062046Z
Task: 014-default-paths-implement
Status: completed

## 聚焦交接

T-16 候选按 D01–D04 / Map16 完成；默认可见目录与固定叶名使用单一名称表，现役调用方、设置预览和文档同步，四个 JSON 文件名保留原值。新档案预置使用受限标签元数据和独立 v2 预置修订，旧 v1 集合/用户标签不自动升级或改写；CSV 导出仅创建唯一目标，竞争占用后重试。本人依用户要求以 gpt-6-astra low 实现，已停止本票源码/测试/文档写入，交 Lead 固定高风险独立双轴审查输入。completed 表示候选交回，不表示 Lead 最终验收、完整插件预算门或真实 Obsidian 已完成。

## 产物与验证

### 实现与兼容边界

- `src/shared/storage/vault-layout.ts` 的 `VISIBLE_NAMES` 是默认路径单表：根目录、周期子目录与 w/q 标记、档案分类/入口/修订/备份叶名、四记录集合、RSS/导出、captures/new-note/untitled/imported/restored。用户中文/空格标题和自定义根继续使用原安全字符处理，不翻译用户内容；`.huhu/` 常量与 Browser 维持原值。
- 当前活跃 JSON 路径消费单表，`expense.json`、`habits.json`、`pomodoro.json`、`reading.json` 不改名。未清理未使用的 pomodoro/reading 旧 DATA_FILE 导出，也未把 JSON/Markdown 双实现纳入清理。
- 自动化 documents 和 backup transforms 显式保留隐藏 `未命名` fallback 与 `操作.md`。新笔记/收件箱的生成缺省名不再取 t()；InboxSection 空输入原样交 createMemoFile，由统一 helper 产生 untitled，输入提示仍翻译。周期设置的实际保存路径预览也引用小写 w/q，周期显示/模板日期格式保持原行为。
- `archives/core/schema/labels.ts` 的严格已知键列表限制 labelKey/forwardLabelKey/inverseLabelKey，所有新内置类型/字段/选项/组/关系及方向标签通过统一显示 helper 调 t()。没有元数据的原标签照原文显示；编辑标签时仅清除对应翻译键，稳定实体/字段/关系 ID、用户值不变。界面只改显示/编辑数据接缝，没有布局重排。
- 不复用不同字节的 `preset-*-v1` 身份：新预置 revisionId 为固定 `preset-*-v2`；其 contentHash/revision 不随语言变化。已初始化旧集合继续以磁盘 v1 为权威，不改当前指针。旧个人/企业虚拟投影没有磁盘 schema 引用，在已加载同类型 v1 预置时引用 v1；新库投影使用新预置。这个内存投影不扫描旧默认中文根，不移动/重写原记录，外层档案格式仍为 2。完整集合回归覆盖已有实体、用户改名和两条旧关系，重开+initialize 的 writes 为空且整个 Map 字节不变。
- `createLedgerExport` 经 uniqueVaultPath 后用 Vault.create；遇到并发占用重新选名，不调用 modify/write 覆盖旧内容。真实磁盘测试覆盖已有文件、同名目录、检查后另一 writer 抢占第三个名称，最终第四个新文件写入而前两份内容不变。
- `test/golden/temporary-vault.ts` 是真实临时磁盘与 exclusive create 的测试适配器；Obsidian 类型/索引/事件是替身边界，不是真宿主。真实生产 createHuhuNote/createMemoFile/BoardStore.capture、四种 MarkdownCollectionStorage 非空记录和 ArchivesApplication 创建/重开均在真实临时目录运行。en/zh、切语言、中文标题与空格根、空标题、文件与目录碰撞、旧中文文件逐字节不变均有断言；普通 Vault 索引允许枚举旧文件元数据，业务未针对旧树探测/读取/写入。四个现役 JSON Service 则由既有 record-storage DOM fixture 验证真实服务读写、外部更新、冲突与重建，明确其内存 Vault 边界。
- 更新 `docs/data.md` 及获批的 12 份现役文档。旧默认路径扫描只余 `docs/task-domain.md:217` 的“不扫描/导入旧…”历史对象说明，刻意保留。用户标题示例、显式自定义旧根、永久 ADR/context、历史归档和 Browser 文档没有批替换。

### 实际验证

环境 Linux，base/HEAD `86c500556db1d64865c4cc7f1aff1dd83de071fa`；在共享 dev 工作树执行，没有提交、推送、版本或发布动作。下列都是本人实际命令结果；Lead 中间构建另列，不冒充本人执行。

1. 有效红灯：新增固定英文默认断言在旧 `vault-layout` 上运行 `pnpm exec vitest run src/shared/storage/vault-layout.test.ts`，旧 6 项通过、新 1 项失败，expected huhu/inbox、received huhu/收件箱；工具进程返回 126。后续初轮相关测试因旧路径/快照失败（14、33 项等）保留观察，没有把重写预期当作原有兼容。新增旧 v1 虚拟投影回归曾实际暴露 v2/v1 映射错误，已修正后通过。
2. 基础最终定向：32 个文件、217 用例全部通过，退出 0（11.41s）。包含 shared 路径/图标、app new-note、全部 archives、Home vault/calendar/board/recent/RSS/CSV、Navigator core/ops、隐藏自动化/备份、版本恢复、golden。
3. D04 补充消费者原轮：12 文件全部出现失败，36 failed / 100 passed；修正精确默认创建/加载断言后最终 12 文件、138 用例全部通过，退出 0（6.50s）。没有改旧 Markdown 保护样本或显式自定义根；新增实际 InboxSection en/zh 空标题提交 2 例、实际 placeholder 翻译仍保留。
4. `pnpm exec tsc -skipLibCheck -p tsconfig.test.json` 最终退出 0；先前生产 tsc 同为 0。
5. `pnpm test:architecture` 退出 0：1482 modules，无分区/host/desktop/barrel/cycle 违规。`pnpm test:i18n` 退出 0：35 dictionaries、6390 keys、占位符及字面量引用匹配。
6. `pnpm test:docs` 在 12 文档更新后退出 0：1656 Markdown、2119 local links、1308 external links（未请求网络检查）。`git diff --check` 退出 0。
7. `pnpm run lint` 第一轮全量退出 0；第二轮全量工具返回 126（脚本报告 exit 1），仅并行 T06 的 managed-stop.ts timer/reject/throw 与 managed.ts unbound-method，共 3 error/2 warning，已通知 Lead，未越权修复。之后精确 T16 source eslint `--max-warnings 0 --no-warn-ignored` 退出 0；测试被仓库既有 ignore 排除，仍由 tsc/Vitest 检查。该命令最初未带 --no-warn-ignored 时因显式传入被忽略测试产生20 warning，随后仅消除 CLI ignored-file 提示，不改任何全局 eslint/ignore 配置。D04 最后两个生产文件再跑 `pnpm exec eslint src/modules/navigator/ui/settings-productivity.tsx src/modules/home/ui/inbox/InboxSection.tsx --max-warnings 0` 退出 0。
8. 按格式变更合同执行 `pnpm exec vitest run ... test/golden -u`，仅五个预期 snapshot 更新：四记录默认路径与 archive-migration-v2 新路径/新 preset revision；最终无 -u 测试通过。

基础定向完整命令：
```sh
pnpm exec vitest run src/shared/storage/vault-layout.test.ts src/shared/periodic-paths.test.ts src/shared/file-type-icons.test.ts src/app/content/new-note.test.ts src/modules/archives src/modules/home/platform/vault src/modules/home/platform/calendar src/modules/home/platform/board/widget-migration.test.ts src/modules/home/core/board/recent-doc-policy.test.ts src/modules/home/services/board-store.test.ts src/modules/home/platform/rss/rss-note.test.ts src/modules/home/ui/expense/ledger-csv.test.ts src/modules/navigator/core/periodic.test.ts src/modules/navigator/core/new-note.test.ts src/modules/navigator/ui/ops.test.ts src/modules/automations/core/documents.test.ts src/modules/agent/services/backup src/modules/versioning/core/local-history.test.ts test/golden
```

D04 最终完整命令：
```sh
pnpm exec vitest run src/host/obsidian/storage/document-collection.test.ts src/modules/navigator/platform/platform.test.ts src/modules/navigator/ui/settings-productivity.dom.test.tsx src/modules/navigator/ui/productivity.dom.test.tsx src/modules/home/platform/record-storage.dom.test.tsx src/modules/home/platform/rss/rss.dom.test.tsx src/modules/home/services/board-backups.test.ts src/modules/home/services/board-repairs.dom.test.tsx src/modules/home/services/board-conversion.dom.test.tsx src/modules/home/ui/reading/reading-confirm.dom.test.tsx src/modules/home/ui/reading/reading-body.dom.test.tsx src/modules/home/ui/inbox/inbox.dom.test.tsx
```

### Skill Execution Records

实际应用 dev（架构/默认持久化名称/用户配置边界/测试选择）及 ui（统一 i18n、只改标签显示与编辑接缝、DOM 用户操作验证）；复用已读且未变的参考。没有新外部代码或依赖引入。未创建新 workflow/change，不写永久知识。012 preflight、013/016 独立审查历史报告保持各自事实，没有混入本票生产结果。

### 本票精确成果路径

下列仅列本票文件；其他 worker 的 T06/T18、原 T14、UI来源与 Lead 共享产物不包含在本候选范围。新建 InboxSection.dom.test.tsx 已撤销且未创建，复用现存 inbox.dom.test.tsx。

```text
docs/agent-workbench.md
docs/architecture.md
docs/automation.md
docs/comments.md
docs/contacts.md
docs/dashboard.md
docs/data.md
docs/icons.md
docs/navigator.md
docs/privacy.md
docs/task-domain.md
docs/tasks.md
docs/workbench.md
src/app/content/new-note.test.ts
src/app/content/new-note.ts
src/host/obsidian/storage/document-collection.test.ts
src/modules/agent/core/backup/transforms.ts
src/modules/agent/platform/history/service.ts
src/modules/agent/services/backup/hidden-name.test.ts
src/modules/archives/archives.test.ts
src/modules/archives/core/application.ts
src/modules/archives/core/generic/index.ts
src/modules/archives/core/generic/legacy.ts
src/modules/archives/core/generic/markdown.test.ts
src/modules/archives/core/generic/paths.ts
src/modules/archives/core/resources.ts
src/modules/archives/core/schema/definitions.ts
src/modules/archives/core/schema/labels.test.ts
src/modules/archives/core/schema/labels.ts
src/modules/archives/core/schema/model.ts
src/modules/archives/core/schema/presets.ts
src/modules/archives/i18n.ts
src/modules/archives/platform/vault-files.ts
src/modules/archives/services/generic/application.test.ts
src/modules/archives/services/generic/entities.ts
src/modules/archives/services/generic/test-port.ts
src/modules/archives/services/generic/workbench.ts
src/modules/archives/ui/generic/ArchivePage.tsx
src/modules/archives/ui/generic/DefinitionStudio.tsx
src/modules/archives/ui/generic/FieldDesigner.tsx
src/modules/archives/ui/generic/FieldRenderer.tsx
src/modules/archives/ui/generic/QueryBuilder.tsx
src/modules/archives/ui/generic/RecordEditor.tsx
src/modules/archives/ui/generic/RelationPanel.tsx
src/modules/archives/ui/generic/archives-generic.dom.test.tsx
src/modules/archives/ui/generic/common.tsx
src/modules/automations/core/documents.test.ts
src/modules/automations/core/documents.ts
src/modules/comments/settings.ts
src/modules/home/core/board/recent-doc-policy.test.ts
src/modules/home/core/board/recent-doc-policy.ts
src/modules/home/core/expense/documents.ts
src/modules/home/core/expense/model.ts
src/modules/home/core/habit/documents.ts
src/modules/home/core/habit/model.ts
src/modules/home/core/pomodoro/documents.ts
src/modules/home/core/reading/documents.ts
src/modules/home/platform/board/widget-migration.test.ts
src/modules/home/platform/board/widget-migration.ts
src/modules/home/platform/calendar/daily-notes.test.ts
src/modules/home/platform/calendar/daily-notes.ts
src/modules/home/platform/expense/expense-service.ts
src/modules/home/platform/habit/habit-service.ts
src/modules/home/platform/pomodoro/pomodoro-service.ts
src/modules/home/platform/reading/reading-service.ts
src/modules/home/platform/record-storage.dom.test.tsx
src/modules/home/platform/rss/rss-note.ts
src/modules/home/platform/rss/rss.dom.test.tsx
src/modules/home/platform/vault/memo-files.ts
src/modules/home/platform/vault/vault-notes.ts
src/modules/home/services/board-backups.test.ts
src/modules/home/services/board-conversion.dom.test.tsx
src/modules/home/services/board-repairs.dom.test.tsx
src/modules/home/services/board-store.ts
src/modules/home/ui/expense/ledger-csv.test.ts
src/modules/home/ui/expense/ledger-csv.ts
src/modules/home/ui/inbox/InboxSection.tsx
src/modules/home/ui/inbox/inbox.dom.test.tsx
src/modules/home/ui/reading/reading-body.dom.test.tsx
src/modules/home/ui/reading/reading-confirm.dom.test.tsx
src/modules/navigator/core/periodic.test.ts
src/modules/navigator/platform/platform.test.ts
src/modules/navigator/ui/ops.test.ts
src/modules/navigator/ui/ops.ts
src/modules/navigator/ui/productivity.dom.test.tsx
src/modules/navigator/ui/runtime.ts
src/modules/navigator/ui/settings-productivity.dom.test.tsx
src/modules/navigator/ui/settings-productivity.tsx
src/modules/versioning/services/restore-service.ts
src/shared/file-type-icons.test.ts
src/shared/file-type-icons.ts
src/shared/periodic-paths.test.ts
src/shared/periodic-paths.ts
src/shared/storage/vault-layout.test.ts
src/shared/storage/vault-layout.ts
test/golden/__snapshots__/archive-migration-v2.md
test/golden/__snapshots__/expenses.md
test/golden/__snapshots__/habits.md
test/golden/__snapshots__/pomodoro.md
test/golden/__snapshots__/reading.md
test/golden/archive-migration.test.ts
test/golden/default-paths.test.ts
test/golden/temporary-vault.ts
```

### 读取输入摘要

- TASK: `bf881252791d856f5faa9744bc9f6f1dadf91db03155bef9526eed476a3ae084`
- Ticket16: `971d6531f320c5f23c9e9660366bc99a76eb17da11a15fa9339f1409ef617500`
- Spec: `7d23c0e07783a5b9188bf95a1b45af47b9acc8f12fb9aa1a0194f59860de1695`
- ADR: `0c19d166360b3be518aa615d0ca07ec949a0d7b45f83d773adf32b8390bc4c97`
- dev: `9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7`
- ui: `ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff`


## 问题与下一步

本票实现/定向验证没有未修复失败；当前共享全量 lint 的 T06 历史失败已报告，由对应 owner 与 Lead 复核最终状态。Lead 在中间固定输入上已执行生产/测试类型、样式及 esbuild 并报告退出 0；中间预算 main 超 19187B、eager 超1165B、agent 激活超3494B，阈值未修改，按既定 T37/T38 收口。这不是最终 T16 验收：后续补了 settings 路径预览与 D04 测试，Lead 需固定最终候选做高风险独立两轴审查及最终共享构建/预算验收。

本人未运行全量 pnpm test、未亲自执行最终插件构建、未操作真实 Obsidian 或 Windows/macOS；不以 happy-dom/真实临时磁盘替代宿主验收。没有修改 Browser、root shared config、main.js/styles.css 或预算阈值；工作树中的共享生成物由 Lead 中间构建拥有。交回后停止本票所有写入，等待 Lead 具名复审 finding 后再做窄修复。
