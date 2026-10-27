# 文档检查器最小维护交回

Session: 20261025T043239Z
Task: 103-doc-checker-maintenance
Status: completed

## 聚焦交接

103 四文件修复候选已完成并停止产品 writer；Root 已明确接收当前停点，后续独立审查及正式接纳由 Root 完成，不宣布 T-27 或 Goal 完成。检查器只补 U+3001 中文顿号移除，分类只接纳 `native/huhubot/tests/contract/<包>/testdata/` 里的测试夹具文档，原用户输入及 native 产品资料不豁免。真实 checker 隔离仓库复现了两个问题，修复后两个定向 Vitest 文件 **5/5 通过、实际退出 0 / Wait**，合法非 ASCII、下划线、连字符、重复 slug 和坏链接/未知 native 文档负控均实际执行。全仓 docs 的原七项已消失，但 097 新报告中的两处代码展示触发另外两项误报；完整失败已交给 Root，由 097 原 owner 后续维护，不扩大本票解析器或写集。

## 产物与验证

执行范围来自 Map25/Goal24 和冻结 TASK，SHA-256 为 `cbd0ddfd727a6e3d50f49777244cfa134e87d01697072706ef2538790aa452bd`。工作区为既有 `NAMEWTA/bot` current 目录，HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`；沿用 SpecDev I、dev/testing/文档规则，原 owner /root/build_integration。Root 原生确认 100 继续持唯一 Go 窗、没有其它重检查，并明确批准本次两个轻量 Vitest 与 docs；本票没有调用 Go、全仓 build/lint 或插件重建，没有新依赖、原输入改写或正式状态维护。

自有写集和逐字节前后摘要如下；真实 before 内容在 `logs/before/`，完整差异在 [04-owned-change.patch](logs/04-owned-change.patch)，产品及只读输入清单见 [final-inputs.json](final-inputs.json)，所有本任务工件摘要见 [artifact-manifest.json](artifact-manifest.json)。

| 文件 | before SHA-256 | after SHA-256 |
|---|---|---|
| `scripts/documentation-policy.mjs` | `5f82d8558ae46bfee1d3386681946436e1177e5e8140df31162e80741d84a8ab` | `672f28f21f3b6151eee52e5dc52842d2ecb29325ced8b2702bee0d9c291aa0b8` |
| `scripts/verify-docs.mjs` | `ed11543edd9476c1bf8ebd84e199113dcfce04e323fa5bc35fe2d79aea79e5e8` | `a521e1ec0e1126671ee4b2d019659aab1b649297602cc87b491c3a3fba8bfc6f` |
| `test/release/documentation-checker.test.ts` | `0efd624d58ad05d8e57687418c9924949df710804cc7ec06ddf90839a64a959f` | `1a2b2f8295769e9a33f1f634fdbccc0d806301c2fca74cc7f3a555d39cc293b5` |
| `test/release/documentation-policy.test.ts` | `9c902d0da318dfb74db1f948d6d699d39c97f0603dc21611486cb4910115291e` | `e8afd03604d6592f2dd807567034e9964ee9094866c22e39e7f39720f069e41e` |

四文件最终树 SHA 为 `623806a7986f5fac750dd1b4f55169a1bc8fad8ce48cefffc5f3070a80b324f7`（按路径排序的 `path + NUL + afterSHA + LF`）；final-inputs.json SHA 为 `bae4d91e878b0850cb5a7e92f8300d63ac4a131a80375293fd13d17f83b4424f`。没有改其他产品文件，保留原工作区已有 dirty 状态，没有提交、推送、发布或归档。

`scripts/verify-docs.mjs` 仅在既有标点字符类增加 `\u3001`；没有改所有权 strict 集合、链接提取、围栏、大小写/空白、非 ASCII、hyphen/underscore 或重复编号逻辑。Root 已按 [GitHub 官方 section links](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#section-links) 核实根因，记录见冻结窗口说明；本轮复用，不重复做广泛研究。`scripts/documentation-policy.mjs` 仅新增带理由的 `^native/huhubot/tests/contract/[^/]+/testdata/` fixture 分类，沿用既有 test-fixture 合同，没有忽略整个 native 或移除原 strict 文档门。

真实 checker 回归通过原已有临时 Git 仓库执行 `spawnSync(process.execPath, [真实 scripts/verify-docs.mjs], { cwd: 临时仓库 })`；同步返回已经等待子进程退出。新增隔离输入复用六个原样标题与移除顿号的链接，存放于临时 SpecDev inputs 路径，仍受 strict 检查；加入真实 native fixture 路径的英文 README，模拟夹具原文所有权。保留中文、Å/ß、下划线和 key-value 连字符的成功锚点；带/不带顿号的同名标题合并后，第二项的 `-1` 链接正确。后续分别注入坏 heading anchor 与未知 native 产品 README，真实 checker 均非 0 且错误信息精确匹配。原用例继续覆盖缺证据链接、归档缺源链接、旧目录坏链接、被 Git 忽略的 scratch 和删除的 records feature；policy 负控另明确 native 根 README、internal/docs、contract 包 README、其它 native module 不会被新增范围接纳。

实际命令与回执：

| 检查 | 实际结果 | 原始证据 |
|---|---|---|
| 095 同输入七红 | 复用原日志，不重复跑全仓基线；原六锚点 + 新 fixture README 分类 | 095 的 logs/13-docs.log/json；本次已全文回读 |
| `pnpm exec vitest run test/release/documentation-checker.test.ts test/release/documentation-policy.test.ts` 修复前 | 3 pass / 2 fail；真实 checker child exit1，pnpm outer 实际126，Wait 完成。隔离输出含原六锚点/fixture 分类及新增重复 slug 缺失，policy 也拒绝 fixture 路径 | [01-targeted-red.log](logs/01-targeted-red.log)、JSON |
| 同一两个定向 Vitest 修复后 | 两文件、5/5 pass，outer 实际0 / Wait；所有正负控已执行 | [02-targeted-green.log](logs/02-targeted-green.log)、JSON |
| `pnpm test:docs` | 原七项消失，当前只余097两条代码展示误报；内部 ELIFECYCLE exit1、outer 实际126 / Wait | [03-docs-green.log](logs/03-docs-green.log)、JSON；文件名的 green 是计划名称，不能据此声称通过 |
| `git diff --check --` 本票四路径 | 实际0 / Wait | [05-diff-check.log](logs/05-diff-check.log) |

以下重要只读输入前后逐字节未变；其余 NOTICE/通知/main/styles/Go 锁/开发规则及 package/lock 共 11 项的 before/after 一致性在 manifest 中完整记录。本任务不把其他 owner 的 Go 生产窗口纳入自己的冻结声明。

| 只读输入 | SHA-256 |
|---|---|
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/inputs/HUHU-Bot_架构审核与工程设计规范_v1.1.md` | `a85a57648a00942a44c3df89c52804d13d129e7e31262a73feb91ccc7f1516cc` |
| `native/huhubot/tests/contract/chat/testdata/claim-fairness/README.md` | `782e2f77313c04449867ea64e56c3ccb022149e405b036271324c79c1b36b016` |

## 问题与下一步

当前全仓 docs 门 **尚未通过**，准确剩余两项如下，不沿用095原七项结论：

- `097-responses-preparation/REPORT.md:19` 的内联调用代码被现有 Markdown 链接正则识别，报 `missing local link json.RawMessage(...`。
- `097-responses-preparation/logs/exploration-notes.md:14` 的同一调用展示也命中该正则，报同样错误。

两项都发生在本次派发后已存在的他人报告展示里。本任务只读定位并保留原输出/输入摘要，没有修改 097 报告、没有扩大 Markdown 解析范围，也没有放宽断言。Root 已原生明确：四文件修复和 5/5 定向结果有效，先按此交回；Root 随后让 097 原 owner 以新维护指令保留此前字节并修正两处展示，再亲自重跑 docs。本票不重复同一失败命令，不把外部未关闭项说成通过。

本次未运行 Go、全仓 build/lint、根通知生成、发行资产、真实 Provider/Obsidian 或用户环境操作。这里只有检查脚本/测试改动，不需重建插件；T-27 最终工程门与 Goal 仍由 Root 收齐全部生产输入后判断。所有本任务进程已实际 Wait、临时仓库已由 finally 删除；最终 return 结构校验与工件摘要交回后全部停写。
