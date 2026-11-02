# 任务回报

Session: 20261031T062046Z
Task: 020-default-paths-review
Status: completed

## 聚焦交接

独立双轴审查完成，两轴均为 request-changes；completed 仅表示审查交回。本人 native:/root/baseline 未参与 T16 实现，只参与其他票 T23/T18；本次产品、测试和规范均只读，仅写本 REPORT。固定 103 项 after hash、10 个规范来源/section hash、tracked diff SHA256 和总 Input-SHA256 全部匹配。发现显式自定义根下旧迁移备份误入正式档案索引的 P1 回归，以及重建 schema 保护断言实际比较两个 undefined 的 P2 测试缺口；交 Lead 窄修复并重新固定受影响输入。

## 产物与验证

### 固定输入与边界

Input-SHA256: `8e239f7f124f5685fd6e48179db31ca420680ebd5bee993e441dd6f84b86967f`

- 实际读取 Map16、完整 Ticket16 frontmatter/风险/写集/正文、Spec AC191/192/902、ADR006/008、DESIGN UI-GALLERY、execution-boundaries、dev/ui Skill、014 REPORT、Evidence D01–D04 名称表与 review-input。
- 通过 `readArtifactSectionSync` 核验三个显式 Ticket section，状态/checkbox 元数据不参与该 section hash；没有借此省略完整 Ticket 及完整规范来源读取。
- `JSON.stringify(input)` 的 SHA256 与上述 Input-SHA256 相同；103 个 `working_snapshot[].after.sha256` 均与真实文件一致，10 个 `sources[].sha256` 均匹配；实际执行冻结 `tracked_diff_command`，结果 SHA256 为 `aa193e6fced35b03aad27a6e366233ea7f20fa9586205f275afb506fb7e774d0`，与冻结对象一致。
- Lead 原生消息明确“无Git”为无 Git 写操作，允许只读 diff/show/status/ls-files。本次使用相对固定 base `86c500556db1d64865c4cc7f1aff1dd83de071fa` 的真实 git diff/show，不写 index/分支/提交。
- 审查覆盖路径单表及所有本票消费者差异、档案 schema/标签/编辑与索引、CSV 创建竞争、Inbox 空标题、周期预览、13 个文档（data + D03 的12个）、测试及黄金样本。没有把 T06/T18/T23 或共享产物纳入 T16 结论；没有将 T37 尚未关闭预算门称为全局通过。

### 自主验证

本人实际运行以下窄集合，exit0，4 文件、25 测试通过，3.29s；这是本次 reviewer 的结果，不是将实现者 355 例复制为自己运行：

```sh
pnpm exec vitest run src/modules/archives/core/schema/labels.test.ts src/modules/archives/services/generic/application.test.ts src/modules/home/ui/expense/ledger-csv.test.ts test/golden/default-paths.test.ts
```

另运行两组只读内存 esbuild 探针：`bundle:true, write:false, platform:'node', format:'cjs'`，通过 `new Function(require,module,exports,code)` 执行实际源码，均 exit0；exit0 表示探针成功观测，不表示被测行为正确。未创建探针文件、修改测试或操作真实 Obsidian。输出及输入在下面逐项保留。

### F1 — P1：旧迁移原文在显式自定义根下变成正式实体

定位：`src/shared/storage/vault-layout.ts:33` 的 `archive.migrations` 改为 `migrations`，使既有消费者 `src/modules/archives/core/generic/paths.ts:29` 的深层备份排除只认新目录。实际加载入口 `src/modules/archives/services/generic/runtime.ts:102` 用该判定过滤枚举文件；之后 ArchiveIndex 根据原文 frontmatter 建立实体。

触发：用户已有显式根 `Custom Archives`，其中有正式记录及旧迁移流程保存的 `迁移记录/<operation>/原文/<entity>.md` 原始字节副本。根本身不变，候选加载后备份不再被排除；原件和备份有相同 huhu-id，产生 duplicate-id，正常记录无法作为唯一实体解析。原件若不存在，备份也可能被错误展示为正式记录。这里没有声称实际文件已被覆盖；已证实的是备份被提升为业务权威、唯一性被破坏。

真实探针输入（导入实际源码，未模拟 ArchiveIndex/解析/guard）：

```ts
import { ArchiveIndex } from './src/modules/archives/core/generic/index';
import { presetRevisions } from './src/modules/archives/core/schema/presets';
import { newRecord } from './src/modules/archives/core/model';
import { createMarkdown } from './src/modules/archives/core/persist/markdown';
import { isDiscoveryPath } from './src/modules/archives/core/generic/paths';
const root = 'Custom Archives';
const index = new ArchiveIndex(root, await presetRevisions());
const record = newRecord('person');
record.id = 'person-existing';
record.fields.name = 'Original';
const raw = createMarkdown(record);
const live = root + '/个人档案/Original/基本信息.md';
const backup = root + '/迁移记录/op/原文/person-existing.md';
index.apply(await index.parse(live, raw));
index.apply(await index.parse(backup, raw));
console.log({
  backupDiscovered: isDiscoveryPath(root, backup),
  entities: index.entitiesById(record.id).map(x => x.path),
  diagnostics: index.diagnostics(),
});
```

实际当前输出：

```json
{"backupDiscovered":true,"entities":["Custom Archives/个人档案/Original/基本信息.md","Custom Archives/迁移记录/op/原文/person-existing.md"],"diagnostics":[{"code":"duplicate-id","path":"Custom Archives/个人档案/Original/基本信息.md","id":"person-existing"},{"code":"duplicate-id","path":"Custom Archives/迁移记录/op/原文/person-existing.md","id":"person-existing"}]}
```

基线对照：同一内存 bundle 的导出仅取 `isDiscoveryPath`，esbuild `onLoad` 对 `src/modules/archives/core/generic/paths.ts` 和 `src/shared/storage/vault-layout.ts` 使用 `git show 86c500556db1d64865c4cc7f1aff1dd83de071fa:<path>` 的真实旧内容，其他依赖保持只读；对完全相同 root/backup 输入返回：

```json
{"backupDiscovered":false}
```

最小修正要求：在 Ticket16 已授权的 `archives/core/**` 与对应现有回归范围内恢复“恢复原文不参与正式实体发现”的不变量，明确区分显式根内的旧备份保护与默认旧树发现。不得因此扫描/迁移 `huhu/档案`、改写旧文件、自动移动路径、引入 Browser 修改或放宽 duplicate-id。补带真实旧迁移原文路径的既有自定义根集合回归，断言原文不入 index、正式实体唯一、旧全部字节/当前指针不变；目前 application.test 的 v1 fixture 从新 v2 英文树反构造，未包含旧迁移原文，所以25例绿测不能消除本缺陷。Lead已在原生消息确认该触发属于兼容保护范围；具体修正方案仍由实施者/Lead 决定，本 reviewer 不改实现。

### F2 — P2：真实磁盘重建测试的 schema 比较恒等于 undefined

定位：`test/golden/default-paths.test.ts:194` 与 `:199` 都调用 `index.schema('type-person')`。`src/modules/archives/core/generic/index.ts:172` 的 schema 按 revisionId 查表；按 typeId 取当前定义的 API 是 `definition`（:176）。因此该回归没有证明重建前后 schema/revision/内容稳定，只比较两个 undefined。

独立实际源码探针：`new ArchiveIndex('Custom Archives', await presetRevisions())`，分别读取 `schema('type-person')`、`definition('type-person')?.revisionId`、`schema('preset-type-person-v2')?.revisionId`，输出（undefined 为便于 JSON 观察显式编码成 null）：

```json
{"schemaByType":null,"definitionRevision":"preset-type-person-v2","schemaByRevision":"preset-type-person-v2"}
```

影响：AC191 必需的切语言/重建稳定身份保护可能在 schema 丢失或切换后仍保持绿灯；现有标签单元测试证明静态预置与语言无关，不能替代真实磁盘重建的此断言。最小修正：仍在本票已有 `test/golden/default-paths.test.ts` 中按 typeId 调 definition，或用真实实体的 schemaRevisionId 调 schema，先断言非空再比较 revisionId/contentHash/definition，并验证重建后实际记录所引用的修订可解析。无需扩大生产写集。

### 其余核验观察

- VISIBLE_NAMES 固定片段集中，huhuName 的用户中文/空格安全化语义保留；新目录与 w/q 不依赖 t()。JSON 名称保持原值。Inbox 真空输入不先翻译，placeholder 仍翻译；周期预览使用同一 marker。
- labels 校验只接纳枚举的 preset keys，在允许相应 label 属性的位置接受元数据；display helper 对未知键回退原 label；编辑字段/选项/组/类型/关系方向会清除对应键。稳定机器 ID 与新 v2 revision 不从显示文案生成。旧完整集合不自动 initialize 覆写的既有测试通过，但需补 F1 的真实旧备份场景。
- CSV 路径先查唯一名、再 Vault.create；竞争占用后重选，不调用 modify/write。真实临时目录 fixture 使用 `writeFileSync(...,{flag:'wx'})`，有非空四记录与实际服务重建；不把该端口称为真实宿主索引。
- 隐藏 automation documents/backup 显式保留 `未命名` fallback 与 `操作.md`；Browser 常量及专用消费者不在本票改写内。残留扫描得到的 `new-note.ts:19`、`file-type-icons.ts:94`、`contacts-settings.ts:10` 是旧路径注释，不是运行时默认路径；不声称全 src 中文文本零命中。i18n、用户样本、显式路径、隐藏名与 Browser 冻结范围须继续按类别排除。
- 另有两处非阻塞测试精度观察：archives-generic DOM 快速表单的消失断言仍查旧中文“地区”（当前 en 应为 Region）；archives.test 的显式路径规范化样本把 `档案/个人档案` 换成 `档案/people`，不必为了默认名改动替换此用户输入样本。它们不构成本次 P1 原因，但建议同范围校正，避免弱化用户输入保护。

<a id="original-standards-output"></a>
## Original standards output
Reviewer: native:/root/baseline
Axis: standards
Result: request-changes
Input-SHA256: 8e239f7f124f5685fd6e48179db31ca420680ebd5bee993e441dd6f84b86967f
Observed: 核验103项真实文件、固定diff及10个规范来源后，确认F1违反备份与业务权威隔离/既有用户资料保护，F2使必需重建回归比较两个undefined。架构边界、受限翻译键、用户编辑去键、create-only CSV、隐藏自动化及Browser冻结分支未见额外阻塞发现；实际自主25测试通过不覆盖F1且不能替代F2缺失断言。详见本REPORT F1（P1，vault-layout.ts:33→generic/paths.ts:29）与F2（P2，default-paths.test.ts:194/199）。

<a id="original-specification-output"></a>
## Original specification output
Reviewer: native:/root/baseline
Axis: specification
Result: request-changes
Input-SHA256: 8e239f7f124f5685fd6e48179db31ca420680ebd5bee993e441dd6f84b86967f
Observed: 已对照完整Ticket风险/范围、AC191/192/902、ADR006/008、D01–D04及UI-GALLERY。新默认路径/标签与语言隔离大体满足范围，但F1使显式自定义根的既有备份形成duplicate-id，与“旧完整集合/稳定权威不变”验收不符；F2未有效证明真实磁盘切语言重建后的schema稳定。要求在精确T16写集窄修复并保留旧默认树不检测不迁移边界，重新固定受影响输入后复审；不批准当前候选为完成。

## 问题与下一步

两项 finding 交 Lead/原实施者处理，本 reviewer 没有修复产品或修改测试。修复后需保留本轮原始 request-changes 输出，更新固定输入摘要，重跑受影响窄集合并复审；Lead 正式 E2E、共享构建和预算验收仍由 Lead 拥有。未运行真实 Obsidian、未重跑355例或全仓测试、未执行构建/样式生成、未写其他报告或证据文件。
