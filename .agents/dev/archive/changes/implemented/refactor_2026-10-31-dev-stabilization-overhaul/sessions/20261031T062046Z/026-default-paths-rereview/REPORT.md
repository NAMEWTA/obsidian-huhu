# 任务回报

Session: 20261031T062046Z
Task: 026-default-paths-rereview
Status: completed

## 聚焦交接

独立复审两轴通过，020 的 F1/F2 已在当前固定候选中修复；保留 020 原始 request-changes。本人 native:/root/baseline 未参与 T16 实现或修复，本次只写此 REPORT。T12 已在安全检查点停写。completed 仅表示审查交回，不表示 Ticket done、共享构建或整体预算通过。

## 产物与验证

### 固定输入

Input-SHA256: `90e33ce899a07f125b1490e71cad2a264936ea9b247c679bfbad81342d888adb`

重新读取完整 Ticket16（含风险、范围、写集、验收和冻结约束）、026 TASK、023 REPORT、020 REPORT，复用 020 已读且摘要未变的工程与 UI 标准、Spec/ADR/设计结论。实际以 Node crypto 核对 Evidence `review-input-r2` JSON.stringify 摘要、103 项 after 文件 SHA、10 项 sources（有 anchor 的使用 readArtifactSectionSync），全部匹配，错误列表为空。sources 与 020 完全相同；工作文件只有以下五项摘要改变，其余 98 项未变。实际执行冻结 tracked_diff_command 并核验 SHA 为 `0d5d291709b9d7f096c2ba67c11c2907bc6f087b9fb1a2fad12622b8eecd6950`。使用只读 git diff/show 相对 base `86c500556db1d64865c4cc7f1aff1dd83de071fa` 检查真实差异；没有 Git 写操作。

| 改变文件 | 当前 SHA256 |
|---|---|
| src/modules/archives/core/generic/paths.ts | 0be5b7233f40c3de710bd026814a093b65a4c0f011730a6d772e7b897ca5fd9d |
| src/modules/archives/services/generic/application.test.ts | 13cdfe71f7c1673cee41103c05db03ae6b9e11e0f2112d20d1db7104800681bf |
| test/golden/default-paths.test.ts | f3e3002b4de4725c77f4f1685adfad7daa7e228d3be62f512fab9cf350921f6c |
| src/modules/archives/archives.test.ts | f91dea39e269a336644fafde0e3647a7e38f64db72ef71a61946d6c3c343879f |
| src/modules/archives/ui/generic/archives-generic.dom.test.tsx | 30b8ad87474ce87759c6f786ba448c1479880ab164c0d78438fbe14732ea8833 |

### F1：已修复

`generic/paths.ts:29` 新增精确四段 `迁移记录/<op>/原文/<file>.md` 排除，位于已选定 root 的 underRoot 检查之后。只过滤传入路径，没有发现旧默认根的查询或迁移。只读 git show 核对旧 backupPath 确实生成这一四段结构；原新 migrations 排除逻辑保留。重新读取实际 runtime 枚举过滤入口，确认生产发现使用同一 isDiscoveryPath。

application 回归包含显式 Custom Archives 根的完整旧定义、修订、当前指针、v1 schema、正式实体及旧恢复原文；实际执行证明原实体唯一、无 duplicate-id、backup-only 不提升为正式实体、新备份也被排除；三个名称相近的合法路径仍被发现。initialize 和 en/zh 重建均核验整个 Map 字节不变、当前指针及 schema 不变、写入列表为空。这些证明只适用于既有生成结构和本票已选根，不扩张为任意历史目录迁移支持。

另运行真实源码内存 esbuild 探针（bundle:true, write:false, platform:node, format:cjs），沿用 020 root/live/backup/原始记录输入，按实际 discovery guard 筛选后交真实 ArchiveIndex.parse/apply。探针输入为 root=`Custom Archives`，live=`个人档案/Original/基本信息.md`，backup=`迁移记录/op/原文/person-existing.md`，记录 id=`person-existing`、name=`Original`。实际输出：

```json
{"backupDiscovered":false,"entities":["Custom Archives/个人档案/Original/基本信息.md"],"diagnostics":[],"definitionRevision":"preset-type-person-v2","contentHash":"9db4c1b53139ccfadedcdd127bdab35c97232ef139140d281bebb8b78c5721cc","schemaByRevisionResolved":true}
```

与 020 当前输入的 backupDiscovered=true/双实体/duplicate-id 相比，修复恢复隔离；020 原 base 对照的 backupDiscovered=false 仍为稳定历史证据，未伪称本轮重复运行该旧输入。

### F2 与两项弱断言：已修复

黄金测试按 typeId 调 definition，先要求非空，再检查实际 revisionId/contentHash/完整定义；正式与草稿记录的 schemaRevisionId 均解析到真实修订。切换语言后重建重复非空、内容、修订及记录引用检查。只读回看 index API，schema/definition 都返回副本，内容相等是正确合同，引用身份不是合同。真实临时磁盘回归仍保留旧树不定向访问和旧全部文件字节不变断言。

显式路径规范化恢复 `档案/个人档案` 用户输入；DOM 在切换前 getByLabelText(t(region)) 确认实际控件存在，切换后再确认同一翻译控件消失，消除旧中文查询在英文环境恒假的弱断言。

### 本人实际检查与退出码

- 输入/来源/diff 核验 Node 脚本：exit 0，103 文件、10 来源、5 项变化，所有摘要匹配。
- `pnpm exec vitest run src/modules/archives/services/generic/application.test.ts test/golden/default-paths.test.ts src/modules/archives/archives.test.ts src/modules/archives/ui/generic/archives-generic.dom.test.tsx`：exit 0，4 文件 71 测试通过，无跳过，7.81s（16:16:32 开始）。这是本轮实际执行，不是引用实施者结果。
- 首次内存探针：工具返回 exit 126，原因是 reviewer 对 API 返回副本误用 assert.equal 引用比较；错误原文为 “Values have same structure but are not reference-equal”。此前备份/唯一性/diagnostics 断言已通过。未修改产品；把探针比较纠正为 assert.deepEqual 后重跑 exit 0，输出如上。该探针错误不列为产品缺陷，不隐去失败。
- `git diff --check --` 后接上表五文件：exit 0。只读 git show/diff 和源码读取均成功；初次读取误拼 `023-default-paths-fix/REPORT.md` 返回 1，随后读取实际 `023-default-paths-repair/REPORT.md` 成功。
- 未重复 355 例、全仓类型/构建、真实宿主或共享产物生成；这些由 Lead 负责。没有触及 Browser、T12 源码、依赖、正式 Evidence/Ticket/Map。

<a id="original-standards-output"></a>
## Original standards output
Reviewer: native:/root/baseline
Axis: standards
Result: pass
Input-SHA256: 90e33ce899a07f125b1490e71cad2a264936ea9b247c679bfbad81342d888adb
Observed: 103 项真实文件、10 项来源及固定 tracked diff 摘要匹配；仅五项较 020 改变。F1 的备份隔离精确恢复且不引入旧默认树探测/写入，F2 的 schema 检查改为真实非空修订内容和记录引用，两个弱断言同步校正。独立 71 例及实际源码探针通过；其余 98 项与全部规范来源稳定，复用 020 未变结论。未发现剩余 standards 阻塞项。

<a id="original-specification-output"></a>
## Original specification output
Reviewer: native:/root/baseline
Axis: specification
Result: pass
Input-SHA256: 90e33ce899a07f125b1490e71cad2a264936ea9b247c679bfbad81342d888adb
Observed: 对照完整 Ticket 风险/范围和未变 AC191/192/902、ADR006/008、UI-GALLERY，当前窄修复满足显式旧自定义根备份保护、完整 v1 集合重建字节/指针不变、旧默认树不扫描迁移和真实 schema 身份稳定要求。F1/F2 已实际复验消除；相近合法路径、用户中文输入及真实翻译 DOM 验证保留。该通过仅为固定候选双轴审查，不代替 Lead E2E/共享构建或全局预算收口。

## 问题与下一步

没有新增 finding，候选与报告停写交 Lead。020 原始失败保留；Lead 完成本票正式验收和状态更新。T12 仍暂停，等待 Lead 恢复测量授权窗口。
