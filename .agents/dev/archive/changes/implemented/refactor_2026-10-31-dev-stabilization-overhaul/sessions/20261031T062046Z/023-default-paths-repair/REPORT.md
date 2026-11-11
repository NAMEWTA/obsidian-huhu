# 任务回报

Session: 20261031T062046Z
Task: 023-default-paths-repair
Status: completed

## 聚焦交接

T16 独立审查 F1/F2 已完成窄修复，五项代码/测试现在全部停写。唯一生产改动保护显式选定集合根内旧迁移恢复原文，不扫描或迁移旧默认根。黄金测试现在核验真实非空 schema，并修正另外两处弱断言。completed 表示候选交回；Lead 验收并由 baseline 独立复审，不沿用旧103项 review-input 的匹配声明。

## 产物与验证

### 范围与实现

current/dev，base HEAD `86c500556db1d64865c4cc7f1aff1dd83de071fa`。实施前读取 TASK、020 REPORT、dev/ui 与相关入口、调用方和依赖；索引解析和运行时发现共用 `isDiscoveryPath`。既有本地实现足够解释缺陷，无新增依赖或外部代码。只改以下五文件及本 REPORT；未修改其他 T16 候选、冻结 T06/T04、正式状态或生成物，没有 Git 写入、依赖安装、递归派遣或 Go 工作。

- `src/modules/archives/core/generic/paths.ts`：精确排除相对选定根四段 `迁移记录/<op>/原文/<文件>.md` 恢复原文，保留现有新 `migrations` 排除规则。
- `src/modules/archives/services/generic/application.test.ts`：真实旧自定义根集合含旧定义/类型/表单/修订/当前指针、v1 schema、正式实体及原字节备份。断言旧备份不入 index、正式 ID 唯一、仅备份存在的 ID 也不发现；新备份仍排除，三个名字相近的合法路径仍发现。初始化和 en/zh 重建后全部旧字节、指针、schema 不变且无写入。
- `test/golden/default-paths.test.ts`：使用 `definition(typeId)`，先断言非空，再检查 revisionId/contentHash 和完整内容；正式及草稿记录实际 schemaRevisionId 均可解析回真实定义。保留旧默认树不定向访问/不写入和原字节断言。
- `src/modules/archives/archives.test.ts`：显式用户输入样本恢复 `档案/个人档案`，不对自定义输入施加默认路径重命名。
- `src/modules/archives/ui/generic/archives-generic.dom.test.tsx`：快速表单切换前先确认当前 `t('archives.preset.region')` 输入真实存在，切换后同一实际翻译不存在。

### 实际红绿与检查

Linux，Node/pnpm 沿用当前工作区。下表保留所有失败；包管理入口的126不改写成内部工具退出码。第一次定向红灯使用 `-t` 有18例未选中，最终四文件完整运行没有跳过。

| 命令 | 结果与原始日志 |
|---|---|
| `pnpm exec vitest run src/modules/archives/services/generic/application.test.ts test/golden/default-paths.test.ts -t 'initialized v1\|real temporary'` | 126，内部 Vitest 失败；3例真红灯：旧备份产生重复实体，en/zh 错误 schema 查询均为 undefined；`/tmp/huhu-t16-repair-red.log` |
| `pnpm exec vitest run test/golden/default-paths.test.ts`，临时恢复旧错误查询及双 undefined 相等断言 | 0，2例通过；证明原弱断言会假绿；随后恢复非空和真实定义检查；`/tmp/huhu-t16-schema-old-green.log` |
| 下述四文件命令首次修后运行 | 126，69通过/2失败；新增 fixture 误从 CommandReceipt 读取 schemaRevisionId，并非生产行为红灯；`/tmp/huhu-t16-repair-tests.log` |
| `pnpm exec tsc -skipLibCheck -p tsconfig.test.json` 首次 | 126；TS2339 同上 fixture 错误，已改从实际 index record 读取；`/tmp/huhu-t16-repair-types.log` |
| `pnpm exec vitest run src/modules/archives/services/generic/application.test.ts test/golden/default-paths.test.ts src/modules/archives/archives.test.ts src/modules/archives/ui/generic/archives-generic.dom.test.tsx` 最终 | 0，4文件71例全过，7.29s；`/tmp/huhu-t16-repair-green.log` |
| `pnpm exec tsc -skipLibCheck -p tsconfig.test.json` 修正后 | 0；`/tmp/huhu-t16-repair-types-retry.log` |
| `pnpm exec eslint src/modules/archives/core/generic/paths.ts --max-warnings 0` | 0；`/tmp/huhu-t16-repair-lint.log` |
| `git diff --check` | 0 |

唯一生产文件完成后已先告知 Lead 冻结，可供共享 wave3 构建；后续仅修改测试及本报告。未重复355例、全量 Go 或插件构建，产物由 Lead 负责；没有把其他票或中间共享构建当成本票验收。

### 停写候选 SHA256

```text
0be5b7233f40c3de710bd026814a093b65a4c0f011730a6d772e7b897ca5fd9d  src/modules/archives/core/generic/paths.ts
13cdfe71f7c1673cee41103c05db03ae6b9e11e0f2112d20d1db7104800681bf  src/modules/archives/services/generic/application.test.ts
f3e3002b4de4725c77f4f1685adfad7daa7e228d3be62f512fab9cf350921f6c  test/golden/default-paths.test.ts
f91dea39e269a336644fafde0e3647a7e38f64db72ef71a61946d6c3c343879f  src/modules/archives/archives.test.ts
30b8ad87474ce87759c6f786ba448c1479880ab164c0d78438fbe14732ea8833  src/modules/archives/ui/generic/archives-generic.dom.test.tsx
```

## 问题与下一步

无已知残余阻塞。五项停写，交 Lead 固定新候选和 baseline 独立复审；不修改历史备份、不声称已支持任意旧路径或自动迁移。T06 另有独立审查问题等待新任务，未混入本票。
