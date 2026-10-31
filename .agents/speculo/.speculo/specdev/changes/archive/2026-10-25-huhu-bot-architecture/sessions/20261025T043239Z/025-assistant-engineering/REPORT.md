# T02 依赖与最新构建工程接纳候选

Session: 20261025T043239Z
Task: 025-assistant-engineering
Status: completed

## 聚焦交接

025 已完成最新 T01/T02 输入的工程接纳：精确许可登记与失败反例、完整通知、Linux CI 工具前提、五目标同源构建、严格15文件校验及本机 stdio smoke。全部工程源码与生成产物已停写，本任务启动的命令和 Runner 均已退出，smoke 临时 Profile 已清理。新候选交 Lead 和030独立核验，不将旧023通过套到新输入；T-27 整票仍未完成。真实 OS 凭证、模型及 Obsidian 操作继续由用户执行，不阻塞本次代码层交付。

唯一工作区 `/home/wta/orca/workspaces/obsidian-huhu/bot`，branch `NAMEWTA/bot`，HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`。沿 I/dev 及已读 architecture/testing/licensing/build-and-release 规则执行，Map8/Goal7与当前 Skill未改；无再委派、提交、推送、发布或远程 CI。本轮没有写 Go/TS 实现、公共 API/schema、Go/npm locks、package、正式 Ticket/Map/Goal/Evidence 或他人报告。

## 产物与验证

### 最终输入与工程变更

Lead 在032最终修复和隔离回归停写后正式放行最终工程窗口，联合 T01/T02 r2 为93文件/25来源，SHA `886b568a11a1cbe8209412e02b1ee00bcf09b68cdbc2dc5c50f0c8a75b21387b`。本任务完整回读019/020/021/029及018/023报告，并补读032最终报告；032 godbus标签笔误由原 owner 仅修报告，最终报告SHA `9c5dc278e36df39308fa99d91f13785a472ec927a913265b92bf96e825394985`。032的两个生产文件和Linux测试按其 `source.sha256` 末次核对一致，没有改变冻结输入。

本轮实际修改七个工程/通知文件：

- `scripts/huhu-bot-notices.mjs`：精确登记 wincred v1.2.3 / MIT、godbus v5.2.2 / BSD-2-Clause、go-keyring v0.2.8 / MIT。仍只采集五目标实际非测试编译闭包并核对版本、go.sum、go.mod sum和未替换来源。已知上游 keyring Darwin 文件具有另行 Apache 文件头；当前未采用，未来若该文件实际进入这个精确版本的 GoFiles，明确失败要求重新审阅，不能沿用根MIT。
- `scripts/huhu-bot-notices.test.mjs`：覆盖三模块精确版本、锁摘要、已审阅源范围，以及上游 Darwin 文件进入编译的失败反例。原 TLSF 完整MIT、metaschema、CLDR的完整文本及来源组合白名单/失败反例保留。
- `docs/third-party/huhu-bot.md`：按最终平台闭包记录新模块的固定提交、完整许可证和摘要；明确 Linux自写Secret Service client只用godbus、Windows keyring/wincred、Darwin自有有界security适配器。未将整个module树或未消费的Darwin Apache源码计为分发。
- `docs/development.md`：经Lead明确授权，将清单schemaVersion澄清为HAP schema，与SQLite PRAGMA user_version和迁移注册表独立；未改清单字段，也未把当前DB版本写成永久常量。补Linux合同测试的私有D-Bus及辅助工具要求。
- `.github/workflows/huhu-bot.yml`：仅Linux增pnpm/action-setup@v4和根frozen install；它与 `lint.yml` 在Linux合同前显式检查dbus-daemon、Python sqlite3及pnpm exec esbuild。缺工具失败；非Linux行为保持。release.bot/checks复用这两份工作流。
- `THIRD-PARTY-NOTICES.md`：实际重新生成，100 npm packages、62 Rust crates、10 Go runtime/modules。Bot模块仍未注册进main.js，未把根AJV dependencies伪列为已打包分发。

### 实际五目标闭包与来源

[最终编译闭包与逐GoFile摘要](runtime-build-closure-final.json) 来自固定工具链、CGO0下每个目标真实 `go list -mod=readonly -deps -json ./cmd/huhubot`；完整锁校验先运行。每个新二进制另以真实 `go version -m` 核对模块/版本、GOOS、GOARCH和CGO0，结果与go-list逐项相同，见 [asset-build-info.log](asset-build-info.log)。

| 目标 | 第三方Go模块数（不含Go运行时） | 凭证相关实际源码 |
|---|---|---|
| linux-x64、linux-arm64 | 各7 | godbus 30个GoFiles；自有 keyring_linux.go + secret_service_linux.go；无go-keyring根包/secret_service包 |
| darwin-x64、darwin-arm64 | 各6 | 自有 keyring_darwin.go + security.go；不导入godbus/keyring/wincred |
| win32-x64 | 8 | keyring common/fallback/mock/windows 4文件、wincred 4文件 |

全目标union精确为下列9个第三方模块，加Go运行时/标准库共10项：

| 模块 | 版本 | 条款 |
|---|---|---|
| Go运行时与标准库 | go1.26.10 | BSD-3-Clause |
| github.com/danieljoos/wincred | v1.2.3 | MIT |
| github.com/godbus/dbus/v5 | v5.2.2 | BSD-2-Clause |
| github.com/ncruces/go-sqlite3 | v0.35.6 | MIT |
| github.com/ncruces/go-sqlite3-wasm/v6 | v6.3.35304 | MIT-0；译入libc/TLSF另保留MIT |
| github.com/ncruces/julianday | v1.0.0 | MIT |
| github.com/santhosh-tekuri/jsonschema/v6 | v6.0.3 | Apache-2.0；metaschema选择BSD-3-Clause |
| github.com/zalando/go-keyring | v0.2.8 | MIT；当前仅Windows采用 |
| golang.org/x/sys | v0.48.0 | BSD-3-Clause |
| golang.org/x/text | v0.42.0 | BSD-3-Clause；CLDR32另保留Unicode-DFS-2016 |

三份新增完整LICENSE已在锁定模块发行包内，无需额外复制件。固定上游内容与经Go锁校验的本地模块缓存逐字节一致，见 [fixed-upstream-licenses.log](fixed-upstream-licenses.log)：

| 模块 | 固定来源与版权 | 原文SHA-256 |
|---|---|---|
| go-keyring v0.2.8 | [a8cdfe320cc8bc0534c895a648dc9214715a9da5/LICENSE](https://github.com/zalando/go-keyring/blob/a8cdfe320cc8bc0534c895a648dc9214715a9da5/LICENSE)，Zalando SE | `14bc00f1a298eb6af250216b9e60027a4386c8a84fa2c7ddc2b5c10908e06d0d` |
| godbus v5.2.2 | [a8ac15ba63645f02ffd57f4b443203279ab40b30/LICENSE](https://github.com/godbus/dbus/blob/a8ac15ba63645f02ffd57f4b443203279ab40b30/LICENSE)，Georg Reinke、Google | `e4646a82a976369d7ae8f6ed5c11d35dc0af18433a8ccc24c85b459ad8b95128` |
| wincred v1.2.3 | [623325312d3224d48d131159187b93e906216563/LICENSE](https://github.com/danieljoos/wincred/blob/623325312d3224d48d131159187b93e906216563/LICENSE)，Daniel Joos | `1702a813fa31858c0d6c7788216fa3dd202472265716998024654c252fc7bb41` |

[最终许可源审计](final-license-audit.log) 对38份最终选定新第三方Go源码做全文版权/许可/来源标记检查，并按逐文件摘要确认字节。godbus Linux UnixCredentials文件只是引用Go文档并调用标准API；真正复制Go实现的是未消费的FreeBSD/DragonFly文件，不按整个module树误加声明。Linux新client按官方 [Prompt.Completed](https://specifications.freedesktop.org/secret-service/latest/org.freedesktop.Secret.Prompt.html)、[Service](https://specifications.freedesktop.org/secret-service/latest/org.freedesktop.Secret.Service.html)、[Collection](https://specifications.freedesktop.org/secret-service/latest/org.freedesktop.Secret.Collection.html)、[Item](https://specifications.freedesktop.org/secret-service/latest/org.freedesktop.Secret.Item.html)、[Secret结构](https://specifications.freedesktop.org/secret-service/latest/types.html)自写；032明确无复制/改编，025已回读实际代码。Darwin同样为自有适配器；上游keyring_darwin.go的Google Apache头未被采用。未将Eino、模型SDK、regexp2、wasm2go/x-tools等未链接研究/构建工具写为运行依赖。

最终通知实际包含三份新根许可证及TLSF/metaschema/CLDR补充全文。补充原文SHA分别仍为 `13b7919ffbff20b54d133748a783ade8b3ecb1810144194aad70928070f2c0df`、`909b25a80d4945b21d3adb2fb17f90bf592e0274bdf117c069c088a8e44dc7b6`、`6a6976a5da6ac21a6a001c685c057f4a6e619be11f5465371088ecd80c7fbe06`。保留源版本/固定提交/摘要白名单；没有减弱unknown-source、缺全文、篡改、越界或限制性许可反例。

### 实际命令、结果与边界

环境为本机Linux/amd64、Node v26.11.1、pnpm11.1.3、Go1.26.10；下表为本任务实际执行，非远程CI。

| 命令/检查 | 结果 | 原始记录 |
|---|---|---|
| 修改前 `node scripts/huhu-bot-notices.mjs` | 实际返回126，stderr为 `Unreviewed runtime Go license: github.com/godbus/dbus/v5@v5.2.2`，真实failclosed红灯 | [red-unreviewed-runtime.log](red-unreviewed-runtime.log) |
| `node --test scripts/huhu-bot-build.test.mjs scripts/huhu-bot-notices.test.mjs scripts/license-texts.test.mjs` | exit0，23/23；脚本与测试之后未变，按Lead指示复用 | [tooling-tests.log](tooling-tests.log) |
| 固定LICENSE与校验模块缓存逐字节比对 | exit0，3/3相同 | [fixed-upstream-licenses.log](fixed-upstream-licenses.log) |
| 实际workflow YAML解析、前置步骤顺序、移除新增Linux条件steps后原对象相等 | exit0；非Linux行为保持 | [ci-prerequisite-validation.log](ci-prerequisite-validation.log) |
| 两份实际Linux前置脚本 | 均exit0；dbus-daemon可用，Python sqlite3可导入，esbuild0.25.5 | 同上 |
| 隔离空PATH运行上述实际脚本 | 均exit1，缺工具不会skip冒绿 | 同上 |
| `pnpm notices` | exit0，100npm/62crates/10Go | [notices-write.log](notices-write.log) |
| `pnpm check:notices` | exit0，生成一致 | [notices-check.log](notices-check.log) |
| `node scripts/build-huhu-bot.mjs --all` | exit0，五目标全部完成；每个目标构建前后输入hash相等 | [build-all.log](build-all.log) |
| `verifyBotAssets`，expected含当前sourceRevision/sourceTreeHash | exit0，严格15文件、所有字段/摘要/共同来源均通过 | [asset-verification.json](asset-verification.json) |
| 对5个实际binary执行 `go version -m` 并与真实go-list闭包比较 | exit0，模块/版本/目标/CGO0一致 | [asset-build-info.log](asset-build-info.log) |
| `node scripts/verify-huhu-bot.mjs native/huhubot/dist/huhu-bot-linux-x64` | exit0，真实framed stdio hello/status、SQLite文件、EOF退出、同一Profile重开和stdin保持开启的shutdown通过 | [native-smoke.log](native-smoke.log) |
| `pnpm test:docs`（额外全仓文档检查） | pnpm日志中校验进程exit1，外层工具/包装返回126；只有旧规范inputs的6个heading错误，无本次文件finding | [docs-check.log](docs-check.log) |
| `git diff --check -- docs/development.md .github/workflows/lint.yml THIRD-PARTY-NOTICES.md` | exit0 | 本次工具输出；末次核验日志另记录 |

文档六错为 #9/#12/#14/#15/#17/#19，与Lead既有 [T-02文档接缝检查](../../../evidence/T-02.md#文档接缝检查) 相同；不改冻结原规范/校验器，不将全仓文档检查写绿，Lead已明确无需扩大归因或阻塞此工程切片。首次Node测试调用曾误拼不存在的build测试文件名，Node只运行13项许可测试；[首次日志](license-tests-initial.log)保留，23项结论来自正确文件名的后续执行。附加全文取证首试因Python.strip保留CLDR开头BOM而误报；仅调整临时取证的BOM/CRLF/外部空白及既有空行渲染归一化后通过，法律文字未变、生产生成器未改，见 [license-audit-probe-red.log](license-audit-probe-red.log)。

CI工具盘点 [ci-prerequisite-inventory.log](ci-prerequisite-inventory.log) 记录当前GitHub官方 [Ubuntu22](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2204-Readme.md)、[Ubuntu24](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md)、[Ubuntu24 arm64](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Arm64-Readme.md) Python/dbus库存与来源摘要，随后由明确前置步骤关门。032最终fixture使用无service目录/自动激活的显式私有bus。025没有运行该Go合同或启动dbus-daemon，也不将032历史默认session bus的激活缺口倒推成安全；完整历史由032保留。本机smoke只运行隔离Profile基础HAP，不调用系统凭证或模型。

全插件build/lint、TS64及实际私有pipe/Go业务回归由Lead统一执行；本轮TS、package/lock等输入未变，按其明确授权复用，不并行重跑全插件构建。032最终12场景、race/vet/三包与3秒worker证据按其报告及Lead实际回告复用，本任务只认自己上表列明的工程检查。

### 新资产与冻结摘要

当前 `native/huhubot/dist/` 严格为5个binary及各自JSON/SHA文件，共15文件。所有清单为version0.0.1、go1.26.10、protocolVersion0.1、HAP schemaVersion1、sourceRevision `33c21e098ef3188cbab5a09f3e0a01fadb787715`，共同sourceTreeHash `7630adba7c27836b0d1cdaf322a92f0679f022902ed996873b977e0207385f4d`。该hash按构建脚本定义的native/contracts输入计算，与T02审查93文件快照不是同一摘要；清单schemaVersion不是SQLite user_version。

| 二进制 | SHA-256 |
|---|---|
| `huhu-bot-linux-x64` | `d4510b02adacfe69d3ec534c1a596ba35696ae813147a34321a9b03a0754216e` |
| `huhu-bot-linux-arm64` | `b90affeec6abaf2d14c3f0bdd29f697cddcad6f22778cd302824a21c36b2ea6e` |
| `huhu-bot-darwin-x64` | `2bd702f3a6018595f70235ea5ddb0075529ed38e75b233ab601f3b0ab10944fc` |
| `huhu-bot-darwin-arm64` | `508e32d61b2ac17bece6250ac198887e625295b24c149c25c3f6bb618efbc692` |
| `huhu-bot-win32-x64.exe` | `8e702107f64814268dfeb2f5643b213f8ad78822fe8d25e76185f48a016ca0a7` |

JSON与checksum文件的逐一SHA也全部记录在 [asset-files.sha256](asset-files.sha256)。覆盖前dist中的15文件已按原字节归档于 `/tmp/huhu-bot-pre-025-assets-r8ay2x_5`，逐文件历史见 [previous-assets-archive.json](previous-assets-archive.json)；它是本机历史备份，不是新发行目录。旧018/023报告及其通过结论保持历史原字节，首次032前闭包和许可扫描也保留原日志，最终结论只使用带final的新闭包/审计记录。

根通知SHA为 `15b56ca45a571e43bd5f3c4bbf530987bcb3a6b61808c970b2ffe3173e1e1e8c`。26项工程源码/许可/锁/Skill摘要见 [engineering-sources-final.json](engineering-sources-final.json)，该manifest本身SHA `9c2da9f6b9cc417c6a4ce964deb7835d6c7a94ec269fa3287f4d9165d17f442a`。其中notice脚本 `d0e9aa290d6e842164f287d206dae5e94878b56e104608b8884423bac7ffb154`，test `df6a693739dc6cb417e4711e0776fb1300b3e0d6003336430c50f6aeb05926e1`；Go锁与package/pnpmlock、现行Skill和构建/smoke脚本均与本轮初始摘要相同。末次逐文件、sourceTreeHash、032三文件、实际15资产核对与资源退出结果保存 [final-freeze-check.log](final-freeze-check.log)。

## 问题与下一步

本切片没有残留工程失败、后台命令、Runner或活动writer；额外全仓文档检查的既有六错明确保留，上述实际失败没有写成通过。远程CI、Linux真实用户Secret Service、macOS Keychain、Windows CredMan、现场TLS、Electron/libuv/Windows管道及模型/Obsidian操作为未实测/user-owned；五目标交叉编译与本机stdio不代表这些现场通过。

交Lead冻结本轮工程来源及15资产后由030独立核验；本completed仅表示候选交回，正式T01/T02/T27状态由Lead处理，T-27仍in_progress。没有待用户补充的工程决定。交回结构检查使用 `node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs --repo /home/wta/orca/workspaces/obsidian-huhu/bot --scope-root .agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture --session 20261025T043239Z --task 025-assistant-engineering --stage return`，真实输出与exit另存 [return-check.log](return-check.log)。
