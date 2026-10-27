# 文档链接语义维护交回

Session: 20261025T043239Z
Task: 113-docs-link-semantics
Status: completed

## 聚焦交接

113 四文件维护候选已完成并冻结，两个原 Vitest 文件7/7通过，完整 `pnpm test:docs` 实际退出0，全部进程均已 Wait。修复仅包括链接扫描时排除合法反引号代码跨度，以及宿主明确支持的绝对本机文件路径加行号；没有按106/110路径或特殊文本豁免检查。缺文件、失效锚点、错误/未闭合代码分隔、非法行号、目录目标、仓库外文件和未知 native 文档的检查仍有效，真实含冒号文件名优先作为原文件识别。Root 已实际修正 T06 的两条过期锚点，本票没有改冻结106/110、原111失败、T06或其它生产文件；独立112审查和 T-27/Goal 完成仍由 Root 判断，本文不冒称审查通过。

## 产物与验证

冻结 TASK SHA 为 `b19019746ac99aa1741fb111705fffc420cdb5c497749558399bf0f298309385`，Map27/Goal26；复用既有 current 工作区、`NAMEWTA/bot` 分支和 HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`。沿已读 SpecDev I/dev/testing 和未变 workspace/catalog 执行，无 UI、依赖或许可规则变化，无委派、提交、推送、发布、归档或用户数据操作。

只写原 owner 的以下四个业务文件；before 原字节在 `logs/before/`，完整差异见 [04-owned-change.patch](logs/04-owned-change.patch)，产品与保护输入摘要见 [final-inputs.json](final-inputs.json)，本任务工件清单见 [artifact-manifest.json](artifact-manifest.json)。

| 文件 | before SHA-256 | after SHA-256 |
|---|---|---|
| `scripts/documentation-policy.mjs` | `672f28f21f3b6151eee52e5dc52842d2ecb29325ced8b2702bee0d9c291aa0b8` | `a3e17a356350d79e73c40fd6239def5d66c2dd86e6e22707d8737f005ac49803` |
| `scripts/verify-docs.mjs` | `a521e1ec0e1126671ee4b2d019659aab1b649297602cc87b491c3a3fba8bfc6f` | `9b941c1f13c1ab236e1445b21016beb280d2a2c7121e9571c5e452a44ff8de3c` |
| `test/release/documentation-checker.test.ts` | `1a2b2f8295769e9a33f1f634fdbccc0d806301c2fca74cc7f3a555d39cc293b5` | `817aaf9775e858255bc795ce1945442c242089bd17a961c6be2b97510ec4a648` |
| `test/release/documentation-policy.test.ts` | `e8afd03604d6592f2dd807567034e9964ee9094866c22e39e7f39720f069e41e` | `e750a6a1bf2eb6074fae79c86e294abf3ed5fea922d0ae3edeb258ace657dcf4` |

四文件树 SHA 为 `ded64e6bcfe66d7fca85c2489320ced6d9e7f886a1fbbd4aee1481f45a42146d`（按路径排序的 `path + NUL + fileSHA + LF`），final-inputs.json SHA 为 `b349c54b2ef810e23cd971197ec58b07a98cab950272d77d2e361705b4792b30`。其他原有 dirty 改动保留，未暂存他人文件。

代码跨度处理位于 policy 的 `withoutCodeSpans`，只用于链接提取和引用定义扫描；heading slug、secret-like token 检查、当前文档语言、分类和 strict 集合保持原行为。它按相同长度的连续反引号配对；开分隔符的奇数反斜线转义保留为普通 Markdown，代码内部的不同长度反引号不误关，未配对的分隔符不遮蔽后面的真实链接。匹配跨度替为空白且保留换行，支持段内多行跨度，以空行保持段落边界；围栏剔除仍有效，剔除位置补空行以免跨围栏拼接代码跨度。该维护没有增加 Markdown 解析依赖，也没有重构通用解析流程。

行号分支只处理宿主约定的**绝对路径**末尾 `:正整数`，不将相对 URI/普通外链改成新路径格式。先查询原完整文件名是否存在，真实含冒号文件名存在时不截断；仅当原目标不存在且行号是正的安全整数时，尝试底层文件。底层必须真实存在并且是文件，以 realpath 核对仍位于真实仓库根之内；缺失、目录、越界或不合法语法继续作为失败。普通本地 Markdown fragment 仍由原 heading 集合核验，外链仍只分类计数而不网络抓取。Windows 本机绝对盘符路径不会被当 URI scheme 自动放过，非本机绝对路径格式未被额外扩展。

实际红绿使用既有真实 checker 临时 Git 仓库设施，分别构造两条独立输入并在断言前都运行，避免只看到首个错误：合法代码跨度内的 Go 数组类型/链接外观，和临时仓库内真实 TS 文件的绝对路径加行号。修复前两次 checker 都返回 child1（不是语法/工具错误），原 policy 四条测试保持通过。修复后真实 checker 和 policy 的七条测试均通过，正负控包括：

- 合法单/双反引号、不同长度的内部反引号、相邻真实链接、引用定义、段内多行跨度及围栏；未闭合、错长度或被转义的开分隔符仍暴露真实坏链接，空行不把两个段落拼成代码。
- 既有六个中文顿号标题、非 ASCII 字符、下划线、连字符、重复 slug 与坏锚点继续实际执行；未新增分类豁免，未知 native 产品 README 仍被拒绝。
- 真实绝对文件加正行号、仅有真实冒号文件名且不存在截断基文件的控制通过；0、负数、小数、文本、双后缀和超安全整数行号，以及缺文件、目录、真实存在但在仓库外的文件均实际拒绝。
- 相邻真实坏链接、缺证据、归档缺来源、旧目录坏链接、Git 忽略 scratch 和已移除 records feature 的原控制继续执行；普通 https/mailto 外链保持原语义，不发网络请求。

| 命令 / 输入 | 实际结果与 Wait | 原始回执 |
|---|---|---|
| 111 根目录原红 | 原4项为 T06真实过期锚点2项 + 106代码跨度/110本机行号语义2项；原日志保持逐字节不变，不重复采同一基线 | 111/logs/11-docs.log，保护输入清单 |
| 两个原 Vitest 文件，修复前 | 1 fail / 4 pass；独立 codeSpan/sourceLine 两子命令各 child1，pnpm outer126，全部 Wait | [01-targeted-red.log](logs/01-targeted-red.log)、JSON |
| `pnpm exec vitest run test/release/documentation-checker.test.ts test/release/documentation-policy.test.ts` 修复后 | 两文件7/7，outer0 / Wait，无跳过 | [02-targeted-green.log](logs/02-targeted-green.log)、JSON |
| `pnpm test:docs` | Root已确认T06源修复后，实际 outer0 / Wait；789 Markdown、1754本地链接、745外链，未fetch | [03-docs.log](logs/03-docs.log)、JSON |
| `git diff --check --` 本票四路径 | 实际0 / Wait | [05-diff-check.log](logs/05-diff-check.log) |

执行完整 docs 前已原生通知 Root 前置就绪，并收到 T06 两历史锚点已实际维护的确认；全仓输出为实际观察时的789文件计数，不把后来新增报告或其它作者的新输入冒称同一校验快照。

以下原始失败涉及的保护输入本票前后逐字节相同；T06、NOTICE/通知、main/styles、Go及根依赖锁、dev 主规则等共13项在 manifest 中完整记录且均相同。本票没有写它们，也未修改历史材料消除失败。

| 关键只读输入 | SHA-256 |
|---|---|
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/sessions/20261025T043239Z/106-protocol-private-contract/logs/interface-contract.md` | `63a9f3bff30f9c2fb14f596a82e27f5216aab4c7951ff5240060686b584eaee2` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/sessions/20261025T043239Z/110-model-probe-expectation/REPORT.md` | `5ea26f3893dbd3f41456e37f930bc45fab04eb8fa29b5ab829e669f40cb80780` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/sessions/20261025T043239Z/111-responses-notices/logs/11-docs.log` | `444ff141e36e4efe33d4df85aad7123927f565f2a99e2d5d13c7df607cbc2896` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-06.md` | `95fa50d53dc4d756c9b893490d17a624111ebbc0efbdde692c87117feaaf2979` |

## 问题与下一步

本次局部检查无未关闭 finding；111 原四项失败材料保留，T06 的两项由 Root 实际源修复后通过，其余两项由通用链接语义修复后通过，归因不混用。Root 将四文件候选纳入112独立审查的最终固定输入；当前只完成实施交回，尚未冒称该独立审查通过或 T-27/G5 完成。

未运行 Go、通知生成、插件 build、全仓 lint、发行资产、远程 CI、真实 Provider/Obsidian 或目标 OS 操作。这里只有 checker/policy 与对应测试变更，不重建插件。所有测试/checker 子进程均已实际 Wait，两个受控临时目录由 finally 清理，无残留本任务进程；亲自 return 结构校验并核对末次摘要后全部停写，以原生 MESSAGE+FINAL 返回。
