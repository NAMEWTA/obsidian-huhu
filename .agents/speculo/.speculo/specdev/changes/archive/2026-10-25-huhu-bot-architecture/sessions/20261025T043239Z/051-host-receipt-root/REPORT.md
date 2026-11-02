# T27 宿主最小回执根候选

Session: 20261025T043239Z
Task: 051-host-receipt-root
Status: completed

## 聚焦交接

051精确五文件窗口已完成，产品writer停写，T07现在可以只读消费共享常量 `HUHUBOT_RUNTIME_ROOT = '.huhu/huhubot'`。现有HUHU Git排除覆盖整个运行根，根目录和嵌套库中的回执都不会被默认stage；普通笔记、看板、自动化定义和用户规则保持。中文数据说明明确最小回执与库外Profile业务权威、敏感元数据及外部同步边界。这里仅交回工程小切片，不实现有界回执存储或宣称T07/整个T27完成。

当前workspace `/home/wta/orca/workspaces/obsidian-huhu/bot`，branch `NAMEWTA/bot`，HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`，Map14/Goal13。按AGENTS发现、当前Map/原T27、dev适用架构/测试/许可和I执行合同实施，完整回读036 REPORT，核对Spec/ARCH的数据权威与最小保留边界。没有再委派、提交、推送、发布、用户Vault操作或正式状态写入。

## 产物与验证

### 五文件改动

- `src/shared/storage/vault-layout.ts`：新增唯一纯路径常量，不加Host/Node依赖，不在shared新增存储业务或安全键算法。设备身份、Profile/effect安全键、有界回执格式与读写仍归T07。
- `src/shared/storage/vault-layout.test.ts`：确认确切运行根及设备/Profile/effect样本不会被识别为可见用户内容或隐藏Markdown文档；测试JSON和Markdown后缀，保持内容索引边界。
- `src/modules/sync/core/excludes.ts`：从shared导入常量，生成 `**/.huhu/huhubot/` 整根managed pattern；沿用原managed block写入、旧规则保留和同步工作流，没有执行实际untrack/sync。
- `src/modules/sync/platform/desktop/excludes.test.ts`：在既有真实临时Git仓库fixture中加入根目录和嵌套库的两个不同设备/Profile/effect回执。原stagedPaths严格期望不变，因此同时证明新回执排除和正常笔记/看板/自动化定义继续暂存。原idempotent检查保留。
- `docs/data.md`：补最小回执根表项、effect/command指纹/必要locator/版本hash/核查证据的最小保留说明，不放正文、CP、凭证或第二份Approval/Run/event账本；Profile SQLite仍在OS非同步受管根并持有业务权威。Git整根排除不代表本项目配置或控制外部Obsidian Sync/iCloud/Syncthing。此根是预留接缝，不宣称Host写入功能已经装配。

相对本任务开始的实际五文件副本差异见 [change.patch](change.patch)，不是把本工作区既有dirty差异都认作本轮修改；原字节保存在 [before-files.json](before-files.json)，工作区前提见 [preflight.log](preflight.log)。

### 红→绿与实际检查

| 命令/检查 | 实际结果 | 原始日志 |
|---|---|---|
| `pnpm exec vitest run src/modules/sync/platform/desktop/excludes.test.ts --reporter verbose`，先只补回执fixture、未写生产排除 | exit1，真实Git stagedPaths多出根/嵌套两个回执，目标缺失导致红灯；不是编译或环境失败 | [red-managed-excludes.log](red-managed-excludes.log) |
| `pnpm exec vitest run src/shared/storage/vault-layout.test.ts src/modules/sync/platform/desktop/excludes.test.ts src/modules/sync/core/core.test.ts --reporter verbose` | exit0，3文件18测试；原用户规则/旧managed block/CRLF/idempotent、定义重包含及真实stage边界通过 | [green-directed-tests.log](green-directed-tests.log) |
| `pnpm exec eslint src/shared/storage/vault-layout.ts src/modules/sync/core/excludes.ts --max-warnings 0` | exit0，无警告 | [directed-lint.log](directed-lint.log) |
| `git diff --check --` 本TASK五路径；逐文件保护摘要比较 | exit0；全部15个既有平台资产、notices、main.js/styles.css、锁和dev规则均未改 | [final-freeze-check.log](final-freeze-check.log) |

首次定向lint还列入两个测试文件，仓库现行配置明确忽略它们，产生2个ignored warning，外层返回126，ESLint报告无代码错误。该记录保留 [lint-with-ignored-tests.log](lint-with-ignored-tests.log)；随后按同一现行规则只选择两个生产文件，无关闭规则或抑制告警参数。测试文件由上述实际Vitest覆盖，类型/全插件构建由Lead最终稳定窗口统一检查。

数据说明按当前源码、036和Spec/ARCH核对，没有新增链接或更改外部同步产品行为描述。遵从本TASK只跑定向检查，没有重跑全仓文档检查或处理原规范六处旧锚点，也没有把未执行的build写成通过。

### 最终摘要

| 文件 | SHA-256 |
|---|---|
| `src/shared/storage/vault-layout.ts` | `26b94019ddf6bd8b270ba5b0cf7c9445de60f300bc33d2e0ee734e50de7c2e8c` |
| `src/shared/storage/vault-layout.test.ts` | `71749d17e0bcf4d47e9e13d7a440b667571718a30b8d3134f9ed970286df3b05` |
| `src/modules/sync/core/excludes.ts` | `9a25f04d747956fa7b79d57a6bc0d458212bce314a6f457375de08851cf58b23` |
| `src/modules/sync/platform/desktop/excludes.test.ts` | `fdf1bca9fd480b3223391d74c8b32699f816eee6255763e90bffa7dd9560b522` |
| `docs/data.md` | `40b7d0ec872f915febb450fb50e8ff601d58efe92e866fa431fac36b1c04cb85` |

[final-inputs.json](final-inputs.json) 保存五文件起始/最终摘要、只读任务/规则/规范来源及保护产物摘要；manifest自身SHA `676e1dcb5f41e190440a9857a272879ff7490a06f37a1770762e5c99c80f270e`。保护范围包括所有15个既有dist文件、THIRD-PARTY-NOTICES.md、main.js/styles.css、package/pnpm锁、Go锁与dev Skill，逐项与本任务开始一致。

所有本任务shell/Vitest/lint命令均已结束。真实Git只运行在 `mkdtemp` 测试仓库，命令有await/同步等待，原fixture在finally执行runner.dispose、afterEach删除临时目录；没有后台Runner、Obsidian、同步服务或用户数据资源。本轮没有更新平台资产、通知、插件生成物或锁。

## 问题与下一步

无待修工程失败或缺失决定。T07可消费共享根，并在其写集中实现device/profile/effect安全键、有界收据、核查与生命周期；本任务不提前实现这些业务或宣称真实宿主写入通过。全插件build、独立审查及真实Obsidian/目标OS操作尚未在本小窗口执行，分别由Lead稳定窗口和用户后验负责。

产品writer与本报告完成后停写，交Lead接纳并释放后续writer；T-27继续in_progress。交回结构检查命令为 `node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs --repo /home/wta/orca/workspaces/obsidian-huhu/bot --scope-root .agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture --session 20261025T043239Z --task 051-host-receipt-root --stage return`，真实输出及exit保存 [return-check.log](return-check.log)。
