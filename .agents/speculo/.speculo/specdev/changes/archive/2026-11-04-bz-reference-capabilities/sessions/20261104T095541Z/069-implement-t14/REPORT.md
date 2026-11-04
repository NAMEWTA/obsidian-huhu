# 任务回报

Session: 20261104T095541Z
Task: 069-implement-t14
Status: completed

## 聚焦交接

已实现人物纪事字段、显式预设发布及按 entityId／rowId 的增改删服务，供 T-15 复用。复用现有 ARCHIVES_COMMANDS 的发布、beginEdit／save 与升级恢复事务，没有修改范围外 api.ts 或另建人物存储。不可变 v2 预设保留，新纪事修订只显式发布；旧实体不被重新解释，须先准备带备份的升级计划、再由调用方确认执行，用户改过的预设／表单不自动覆盖。服务、格式及工程检查通过，候选交 Lead；另有一次 i18n 检查重写脚本临时字典的执行偏差，已如实列出，后续改用 /tmp 输出，未回滚共享文件。此 completed 表示源码候选交回，不宣称 T-14 done，正式验收／状态／Evidence 仍归 Lead。

## 产物与验证

### 本轮全部源码／测试修改

| 路径 | 修改内容 |
| --- | --- |
| src/modules/archives/core/person-journal/preset.ts | 新增 PERSON_WITH_JOURNAL、PERSON_JOURNAL_FIELD、固定新修订 ID；日期／标题／Markdown 内容／关联 entityId 列的 table 字段，独立于不可变 v2 定义 |
| src/modules/archives/core/person-journal/journal.ts | 新增纪事输入与行类型、行读取／复制、输入校验、按 rowId 增改删纯逻辑；更新保留扩展列及其他行，删除仅移除指定行 |
| src/modules/archives/core/schema/labels.ts | 登记五个字段／列标签键，保留既有标签 |
| src/modules/archives/services/generic/person-journal.ts | 新增显式安装、升级准备、CRUD 服务；只通过现有 ArchivesCatalog／ArchivesQuery／ArchivesCommands 接缝操作 |
| src/modules/archives/services/generic/person-journal.test.ts | 新增五项真实 application／文件端口回归，覆盖发布与兼容、同名隔离、字节保留、升级／备份、自定义保护、并发／无效输入及扩展列 |
| src/modules/archives/services/generic/application.ts | 装配 readonly personJournal，本模块后续 UI 可直接复用；既有 commands 公共接口不变 |
| src/modules/archives/i18n.ts | 五个标签的 en／zh 翻译 |
| test/golden/archives-v2.test.ts | 新增人物纪事格式用例 |
| test/golden/__snapshots__/archives-v2.test.ts.snap | 在既有归物样本后新增一项人物纪事快照；原文件在共享工作区本已未跟踪，本轮仅追加纪事样本 |

本 REPORT 是本任务新增的交接文档。未修改 frozen TASK、旧 REPORT、正式 Ticket／Map／Evidence、永久知识、api.ts、module.ts、UI、依赖、main.js、styles.css；无 Git 写操作、提交、推送或发版。其他执行者的 dirty 文件保持原样。

### 检查副作用的执行偏差

首次运行 pnpm test:i18n 时，原 scripts/verify-i18n.mjs 将临时词典 bundle 写入 scripts/tmp/i18n-dictionaries.cjs。该路径不在本轮写集，属于本轮误运行检查产生的额外过程产物，不能声称本轮所有文件写入均在写集内。没有修改检查脚本，也没有删除／还原这个共享临时产物；交 Lead 核对处置。

发现后改为读取原检查脚本，仅将输出改至 /tmp/huhu-069-i18n-dictionaries.cjs，并解析其 esbuild／TypeScript 导入到现有安装路径，保存 /tmp/huhu-069-verify-i18n.mjs 等价运行。后续 i18n 验证未再写仓库临时字典；本地过程材料没有放入 evidence。

### 关键决定与调用方式

- **不改变既有 v2 字节／身份。** 保留 core/schema/presets.ts 的 PERSON 与 preset-type-person-v2，不把同一不可变 revisionId 换成含纪事的新定义。新增 PERSON_WITH_JOURNAL 明确继承原字段，发布 preset-type-person-journal-v3，父修订为原 v2。表格 fieldId=journal，storageKey=person-journal；列为 date（day）、title、content（markdown）、relatedEntityIds（唯一 ID 列表）。
- **安装是显式写入，不是读取副作用。** application.personJournal.install() 经现有 initialize／publishDefinition 流程发布。仅原始 v2 定义且内容未改才自动发布新修订；用户修订／分支／异常预设保留。完整表单只在原始 v2 内容未改时发布新版本；自定义表单保留。重复安装无新增写入。首次显式安装可初始化空档案库，单纯构造／读取服务不会安装。
- **旧实体须显式升级。** 安装不修改旧实体的 schemaRevisionId 或文件。application.personJournal.prepareUpgrade({ operationId, entityId, expectedHash }) 只生成既有 owner 的 prepared 计划与原文件备份；调用方检查影响并经用户确认后，再调用 application.commands.resumeOperation({ operationId: plan.id })。原 schema 缺纪事时 CRUD 返回 person-journal-upgrade-required，不偷偷重解释或升级实体；原有恢复／回滚协议继续拥有事务。
- **既有 ARCHIVES_COMMANDS 足够，无需越界改 api.ts。** 新服务是 archives 内的 facade，由 application 装配；其所有发布／准备升级／保存均调用已经公开的 commands 方法，没有直接写文件或另造 service key／存储。其他模块继续只能经已有 api.ts 接缝；T-15 属同一模块，可复用 application.personJournal。
- **命令输入／输出。** add／update 接收 { operationId, entityId, rowId, expectedHash, values: { date, title, content, relatedEntityIds } }；remove 接收相同目标但无 values。返回真实保存 CommandReceipt。读取继续使用 application.query.entity(entityId).values.journal，可用 journalRows 校验／复制行。
- **CAS 与合并。** expectedHash 必须与开会话时的真实 baseHash 一致，目标必须是人物 ID，不能传路径或靠姓名选择。仅 journal 被标为 dirty；之后发生的无关字段改动由既有三方合并保留，同一 journal 字段并发改动返回 field-conflict。重复／不存在 rowId、无效日期／空标题／非法或重复关联 ID 拒绝且不写文件；更新保留用户扩展列，删除不影响其他行。
- **消费者交接。** T-15 不应在只读进入页面时隐式 install 或执行升级；可由明确的设置／纪事操作触发发布，并为旧实体展示确认升级／恢复入口。install 的 preserved 结果表示用户定义未被覆盖，不等于已强行具备纪事 schema。

### 实际验证命令与退出码

均在指定 current 工作区执行；没有运行禁止的构建／生成命令。

| 命令 | 退出码／观察 |
| --- | --- |
| pnpm exec vitest run src/modules/archives/services/generic/person-journal.test.ts | 最终 0；5 项真实服务回归通过 |
| pnpm exec vitest run src/modules/archives | 0；最终 16 文件、105 项通过 |
| pnpm exec vitest run src/modules/archives test/golden/archives-v2.test.ts test/archive-relation.test.ts | 0；17 文件、108 项通过，含 T-08／T-09 回归 |
| pnpm exec vitest run --project dom src/modules/archives | 0；5 文件、18 项通过；没有新增 UI |
| pnpm exec vitest run test/golden/archives-v2.test.ts -u | 0；3 项通过，1 项新快照写入，旧快照无更新 |
| pnpm exec vitest run test/golden/archives-v2.test.ts | 0；随后不更新快照重跑，3 项通过 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json | 0；最终通过 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json | 最终 0；曾因备份路径可选类型失败，增加实际备份存在性判空后通过 |
| pnpm run lint | 0；全仓零警告 |
| pnpm exec eslint src/modules/archives/core/person-journal src/modules/archives/core/schema/labels.ts src/modules/archives/services/generic/person-journal.ts src/modules/archives/services/generic/application.ts src/modules/archives/i18n.ts --max-warnings 0 --no-warn-ignored | 0；定向检查通过；测试另由类型与 Vitest 验证 |
| pnpm test:i18n | 0；33 词典、5416 键；发生上述 scripts/tmp 过程产物偏差 |
| node --input-type=module（读取原 verify-i18n、输出迁至 /tmp 并执行） | 0；33 词典、5416 键、占位与字面引用通过，结果同原门禁 |
| pnpm test:architecture | 0；1330 模块，无分区／宿主／桌面专属／barrel／循环违规 |
| git diff --check -- src/modules/archives/core/schema/labels.ts src/modules/archives/i18n.ts src/modules/archives/services/generic/application.ts test/golden/archives-v2.test.ts | 0；未跟踪的新文件另由 lint／类型／测试检查 |
| gh api 固定提交 src/people 目录及 src/people/types.ts | 0；只读定位并查看 ManualEvent 概念，本地原始材料 /tmp/huhu-t14-bz-people-types.ts |

红 → 绿事实：

1. 发布修订测试先退出 126，personJournal.install 不存在；实现显式新修订／表单发布后转绿，旧实体字节／schemaRevisionId、旧不可变定义保持，重复安装零新增写入。
2. 同名人物 CRUD 测试先退出 126，add 不存在；实现按 entityId／rowId 写入后转绿。两个同名人物可分别拥有同名 rowId，内容互不影响。增／改／删保留其他字段、YAML 引号／注释、原 notes 管理块及自由正文（含原始换行）字节。
3. 旧实体升级测试先退出 126，prepareUpgrade 不存在；复用 owner prepared／backup／resume 后转绿。准备阶段旧文件不变，备份等于原字节，执行后才绑定新修订；自定义人物预设／表单均保留。
4. 补充回归验证旧哈希、错误类型、重复／缺失行、无效输入零覆盖，同字段竞态拒绝；无关字段并发改动合并，扩展列／其他行保留。未通过删除断言、提高超时、阈值或吞错制造绿色。

### 黄金样本有意变化

新增 person journal table and preserved Markdown 一项：稳定 person-001／journal-row-001、日期／标题、带换行的 Markdown 内容、person-002／company-001 关联 ID 以 person-journal table 存在同一档案 YAML 中；原 notes 继续位于管理的 Markdown 字段块。解码后全部 values 与输入相等。既有税务 inline 样本和归物 table／精确金额样本未改，不改变 v2 文件封套、旧 PERSON 定义或其他类型格式。

### Skill 实际应用

- dev 模块／数据边界：先追踪 presets／DefinitionCommands／ArchiveRuntime／EntityCommands／RecoveryCommands 与 application 实际入口；新服务复用现有公开命令、query／catalog，无 api.ts 扩展、跨模块内部访问、UI 同步加载、独立人物库或直接文件写入。人物与行归属使用稳定 ID，数据仍为同一档案实体。
- dev 持久化／兼容：保留不可变 v2，新能力经带 expectedHeads 的新修订发布；用户改动不自动覆盖。旧实体不重解释，显式升级调用既有备份／恢复事务。纪事保存只修改 journal dirty 字段，实际字节与并发回归证明其他字段／正文保留；有意格式新增用黄金样本锁定。
- dev 文案／质量：字段标签使用所属 i18n 的 en／zh 与受验证 labelKey，不把本轮改为 UI 票；服务错误保持结构化 ArchiveError，不加入人物姓名／内容日志。运行适用服务／DOM 回归、格式、两套类型、零警告 lint、i18n 和架构检查；构建／产物按派遣归 Lead。i18n 检查脚本副作用未满足原范围约束，已单列偏差，没有隐瞒为全范围零越界。
- SpecDev I：复用未变 Work／范围／TDD／测试合同，重新读取当前 TASK、T-14 和命中 dev 规则，核对 Map revision 7、AC-502／503、DEC-002 以及 T-08／09 依赖证据。通过公共命令与真实 owner 接缝红绿，不 mock 自有命令；正式状态／Evidence 交 Lead，未作 Git 写操作。非 UI，ui Skill／Design Conformance／浏览器 E2E 不适用本数据票。

### 来源与署名

新 preset.ts 文件头已标上源仓库、完整 d76a087 提交、src/people/types.ts 的 ManualEvent、MIT、Copyright (c) 2026 叫我包仔 和 HUHU 修改说明。原始引用：https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/people/types.ts 。只借鉴人物手工事件概念；字段按 Spec 改为同档案 entityId／rowId table，增加标题／内容／关联 ID，使用现有档案修订与 CAS，不采用独立 people 存储、AI 或私密素材。

未引入新依赖或拷贝素材。docs/third-party/bz.md 不在写集，未修改；Lead 可据本记录登记新 preset 落点与存储／修订适配说明。

### 未执行／未验证

- pnpm run build、pnpm run build:css、pnpm notices、pnpm check:bundle、pnpm check:notices：未执行，owner Lead；未改生成产物或阈值。
- UI runner：未执行，owner Lead；本票 E2E disposition 为 not-required（无 UI）。T-15 的可见入口／确认交互与真实 Obsidian 集成尚未验证，不冒充本票服务测试已覆盖 UI。
- 独立双轴审查、正式 Evidence／Ticket 状态、最终构建产物及包体：未执行，owner Lead／reviewer。
- scripts/tmp/i18n-dictionaries.cjs 的范围外过程产物未删除或还原，需 Lead 核对；与源码候选分开验收。

## 问题与下一步

人物纪事源码无已知实现阻塞，正式验收待 Lead。Lead 应核对 i18n 检查过程产物偏差，完成来源登记、构建／包体及独立审查；之后由 T-15 使用 application.personJournal，并保留显式安装／升级确认及冲突提示。原 TASK、旧报告和正式状态不由本执行者改写。
