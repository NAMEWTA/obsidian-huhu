# Responses 实际依赖许可维护交回

Session: 20261025T043239Z
Task: 111-responses-notices
Status: completed

## 聚焦交接

111 的当前稳定 Responses 许可维护候选已完成，所有工程写入和检查进程均已停止；不宣布 T-27、T09、联合审查或 G5 完成。基于 Root 本次冻结的生产输入和锁，实际采集五目标 `cmd/huhubot` 非测试编译闭包，第三方模块并集 **45**，含 Go 运行时共 **46** 项；完整通知生成和一致性检查实际退出0，末次27条工具测试通过。新增官方 SDK 与四个 tidwall 模块的完整根许可保留，SDK 内置 Go JSON 的 BSD 义务另行补齐，095 的旧全文、来源和41项旧 Go 通知内容均保留。唯一 Go/通知窗口已在所有命令实际 Wait 后立即原生归还 Root；109 后续 CP/取消工作不是本票宣称的永久封盘，相关 import/build tag/依赖变化须由 Root 失效并重新验证受影响证据。

## 产物与验证

冻结 TASK SHA 为 `5c1b28579517dd0009aa2b8de673538132d42b2e2e4cdcfb9f6f59fd79be982f`，Map27/Goal26；沿095已验收实现与 `evidence/095-lead-return.json`、Responses联合窗口/私有合同和108消费请求执行。工作区为既有 `NAMEWTA/bot` current 目录，HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`。使用未变的 SpecDev I 与 dev 许可/测试/构建规则，不涉及 UI 或 Skill 维护；本票无委派、提交、推送、发布、归档或真实凭证请求。

实际只写六个产品文件。NOTICE 及所有旧本地法律文本未改；Go源码/锁、SDK缓存、API/HAP/TS、main.js/styles.css、发行资产及正式状态均未写。逐字节 before 与本轮 patch 分别在 `logs/before/`、13-owned-change.patch（历史日志已清理：`logs/13-owned-change.patch`）；产品清单见 [final-inputs.json](final-inputs.json)，本任务全部工件见 [artifact-manifest.json](artifact-manifest.json)。

| 文件 | before SHA-256 | after SHA-256 |
|---|---|---|
| `THIRD-PARTY-NOTICES.md` | `04dce87bb9fdb48553ca7e93cd6cf98c27bdb2dcaf73d0ff46da03c9291fa9df` | `fdaca047cd0a7b2c718c1a540a8c19271ef16208dcb80662620ffda2162ed500` |
| `docs/references.md` | `c21b67fc2cf54d152881f47f0f17da8bc6620acfced06614cf00b0581080e981` | `df0cbf3995778b84dadb6233991ca635c12ead3963007c9136c9cc9c313147fa` |
| `docs/third-party/huhu-bot.md` | `55f165f177cb850950421239febf39e499be49d54ae95a7e21bfba888123920a` | `e25d6e6cdeca67af218ced2731632e7b22361cf691ba538602d6885cd26e759d` |
| `docs/third-party/licenses/go/go-1.24rc1-BSD-3-Clause.txt` | `新增` | `911f8f5782931320f5b8d1160a76365b83aea6447ee6c04fa6d5591467db9dad` |
| `scripts/huhu-bot-notices.mjs` | `52f3d6c4b0ca020131d247ac80c524b5813c0e0b02659e37057112f754088ba9` | `868e8dcf406c96e49704585c113db8baca4cd3ed766897fb76a097643f7f0685` |
| `scripts/huhu-bot-notices.test.mjs` | `6317f6d88cc3738bfaacbceffbcea3f9c26c8b4c59879e22e3169e67f067da11` | `b75e0dd098cf75e319d16f1c70d269d642c6adfc8bce275e4590360693db95e8` |

六文件树 SHA 为 `4281905928440d5a9d39f6dc2cbfbdbb518df1d9081601ad2e4fbfcf7491c6b8`，按排序后的 `path + NUL + fileSHA + LF` 计算；final-inputs.json SHA 为 `923e0cde4051e0849f4b4252e1c7324167adfa1cdaa2daa67a81cf4b9debf665`。这是本票写集摘要，不是发行二进制 sourceTreeHash。前序本地 Go 法律输入实际为18文件，逐个哈希未变；初始原生消息里的18/19口头差异只在本轮按实际数量澄清，未改任何历史报告。

固定新增模块的下载/根文本/源头记录见 01-new-module-license-inventory.json（历史日志已清理：`logs/01-new-module-license-inventory.json`），最终45模块的精确 zip/go.mod checksums、根全文摘要及 supplemental 来源见 12-final-runtime-license-sources.json（历史日志已清理：`logs/12-final-runtime-license-sources.json`）。以下五项在每个实际目标都已进入非测试编译闭包：

| 模块 | 版本 | module checksum / go.mod checksum | 根法律原文 SHA-256 |
|---|---|---|---|
| `github.com/openai/openai-go/v3` | `v3.44.0` | `h1:kkGh+jb/sKfSh5P74Jk5mCRufaQ0q7oH+lq+pNlWjsk=` / `h1:cdufnVK14cWcT9qA1rRtrXx4FTRsgbDPW7Ia7SS5cZo=` | `636eb7d79da9bb6d515a4b3fd417aa26679eb3cf16396ddab4bc55fa74e616e4` |
| `github.com/tidwall/gjson` | `v1.18.0` | `h1:FIDeeyB800efLX89e5a8Y0BNH+LOngJyGrIWxG2FKQY=` / `h1:/wbyibRr2FHMks5tjHJ5F8dMZh3AcwJEMf5vlfC0lxk=` | `be83ad53208d03a9fe08c7fac231cabf79422989ef5706bff217bd35104ebf07` |
| `github.com/tidwall/sjson` | `v1.2.5` | `h1:kLy8mja+1c9jlljvWTlSazM7cKDRfJuR/bOJhcY5NcY=` / `h1:Fvgq9kS/6ociJEDnK0Fk1cpYF4FIW6ZF7LAe+6jwd28=` | `dbf5e2aa91aee5f19a1ce2cc7891e2ac37204b6461c0adc539426636e27b208e` |
| `github.com/tidwall/match` | `v1.1.1` | `h1:+Ho715JplO36QYgwN9PGYNhgZvoUSc9X2c80KVTi+GA=` / `h1:eRSPERbgtNPcGhD8UCthc6PmLEQXEWd3PRB5JTxsfmM=` | `be83ad53208d03a9fe08c7fac231cabf79422989ef5706bff217bd35104ebf07` |
| `github.com/tidwall/pretty` | `v1.2.1` | `h1:qjsOFOWWQl+N3RsoF5/ssm1pHmJJwhjlSbZ51I6wMl4=` / `h1:ITEVvHYasfjBbM0u2Pg8T2nJnzm8xPwvNhhsoaGGjNU=` | `0ca70311227fe097c662dece3f359e3317fa7f9d41f8d29eb45fc5135e216139` |

官方 SDK 固定 origin `83462dff240801783d9cd32dece645c86875abec`，根 LICENSE 是完整 Apache-2.0（Copyright 2026 OpenAI）。四个 tidwall 模块为完整 MIT（Josh Baker）；gjson/sjson/pretty 的固定 commit 来自下载元数据，match 的 tag 经实际只读 `git ls-remote` 固定为 `4c9fc61b493b7aa0a3d347e9190aa78c5bec09cf`，均已记录到当前中文说明与来源证据。发行包五项根全文齐备，生成器从经锁校验的发行内容读取，不另造根许可副本，也不联网浮动抓全文。

官方 SDK 的 `internal/apijson/encoder.go` 导入其内置 `internal/encoding/json`，其中 encode/decode/indent/scanner/stream 的 Copyright 2010、tags 的2011、fold 的2013、tables 的2016 Go Authors BSD 头不能由根 Apache 文本替代。五个目标均实际选中该包的10个文件，逐文件 SHA 在 07-selected-compiled-files.json（历史日志已清理：`logs/07-selected-compiled-files.json`） 和12清单中。新增 `docs/third-party/licenses/go/go-1.24rc1-BSD-3-Clause.txt` 中的完整 Go BSD 原文 来源于[固定 Go 1.24rc1 LICENSE](https://github.com/golang/go/blob/16afa6a740fac7442e94dcd2ec5ea4a4853e45dc/LICENSE)，原样 SHA `911f8f5782931320f5b8d1160a76365b83aea6447ee6c04fa6d5591467db9dad`，实际 HTTP200/下载元数据见 02-fixed-license-source.json（历史日志已清理：`logs/02-fixed-license-source.json`）。SDK 仅声明代码来自 Go1.24预发布版，未提供精确 vendoring commit；本票明确该 commit 只固定法律全文，不虚构 SDK 那批实现的精确来源。模块版本、补充来源/许可/摘要组合仍严格匹配，缺失、篡改、未知来源或版本全部失败；没有放宽095的允许集或 fail-closed 规则。

已只读回读真实生产 `responses/driver.go`、`request.go` 与装配消费：使用公开 ResponseService.NewStreaming / ModelService.Get、SDK 类型及公开 raw 参数扩点，同一私有 Registry 与 HUHU 自有 httpcall/common 辅助负责生命周期及预算。不是复制整个 SDK/Runner，也不是另造 SDK fork；Go SDK 内部自带的 BSD 代码属于依赖自身义务，与 HUHU 直接改编分别记录。两份中文当前说明已更新这些事实，Chat 的原 EinoExt/fork 义务继续保留。实际选中包没有 Azure/cloud SDK 包；SDK 仓库其它包、测试或整个 require 表没有直接当作发行依赖。

最终采集环境为 `GOTOOLCHAIN=go1.26.10`、`GOWORK=off`、空 GOFLAGS/GOEXPERIMENT、`CGO_ENABLED=0`、GOAMD64=v1/GOARM64=v8.0；每目标实际核对 GOVERSION，再执行 `go list -mod=readonly -deps -json ./cmd/huhubot`，先执行 `go mod verify`。锁为 go.mod `f75bb42bc7afa211ef83ccea510043658e9c624c56875b2e974b97da0c0387c7` / go.sum `414a2e043d0ae6c7635a410f99f637fef061270c92517c0a5c8ca9567da5cbad`，与 Root/108 放行值一致，本票未改锁。

| 目标 | 总编译包数（含std/主模块） | 第三方模块数 |
|---|---:|---:|
| `linux-x64` | 443 | 43 |
| `linux-arm64` | 409 | 39 |
| `darwin-x64` | 441 | 42 |
| `darwin-arm64` | 407 | 38 |
| `win32-x64` | 445 | 44 |

真实并集45，未把095旧40表或单机43表冒称当前 union。所有原始 JSON、目标/环境/退出状态分别在 `07-<target>-deps.log` 与 07-commands.json（历史日志已清理：`logs/07-commands.json`）。本次窗口 `cmd/internal` 排除 tests/testdata/dist 及 `_test.go` 后的生产/嵌入输入共 167 文件，窗口前后哈希相同，树 SHA `fc3010339f7560367301e4cc7100aa57b20eb5def205607df97e253359b1281e`，见 07-production-before.json（历史日志已清理：`logs/07-production-before.json`）；逐目标实际选中文件清单 SHA `3b933b325826aaa2a6a0e7742f9535d9bdd17bfafdefba04c89c26551e244658`。这些是该稳定采集窗口的生产快照，不把109其后工作或不相关测试编辑混入编译输入，也不承诺未来全部源码封盘。没有执行五目标 go build 或目标OS运行。

| 检查 | 实际结果 / Wait | 原始回执 |
|---|---|---|
| 许可红灯 | 12 pass / 2 fail；观察到 Node outer126 / Wait，缺精确官方SDK登记和BSD补充全文 | [03-node-red.log](logs/03-node-red.log)、JSON |
| 无Go本地原文检查 | 五个固定发行模块完整全文校验0；只检查法律输入，不冒称闭包 | 05-local-license-check.json（历史日志已清理：`logs/05-local-license-check.json`） |
| Node工具/许可 | 红→绿后与末次均27/27，outer0 / Wait；保留未知版本、摘要不匹配、缺文件/篡改/未知固定来源等负控 | [04-node-green.log](logs/04-node-green.log)、10-final-node-tools.json（历史日志已清理：`logs/10-final-node-tools.json`） |
| mod verify + 五目标 go list | 全部实际0 / Wait，生产和锁窗口内无漂移 | 07系列 |
| `pnpm run notices` | outer0 / Wait，100npm / 62crates / 46Go runtime/modules | 08-notices-write.json（历史日志已清理：`logs/08-notices-write.json`） |
| `pnpm run check:notices` | outer0 / Wait，同一固定输入生成一致 | 09-notices-check.json（历史日志已清理：`logs/09-notices-check.json`） |
| `pnpm test:docs` | 内部 ELIFECYCLE1 / outer126 / Wait，四项外部文档finding，详见下一节 | [11-docs.log](logs/11-docs.log)、JSON |
| 自有脚本/说明 diff检查 | `git diff --check` 实际0 / Wait | [14-diff-check.log](logs/14-diff-check.log) |

末次通知 SHA 为 `fdaca047cd0a7b2c718c1a540a8c19271ef16208dcb80662620ffda2162ed500`。自动对比确认：Go 节之前的 npm/CSS/Rust 通知逐字节未变，原41项 Go 通知（含runtime及旧模块全文/附加声明）内容逐字节保留，只增加五个新模块。所有18份旧本地法律输入 SHA 未变。NOTICE 逐字节未变，SHA `8062897bb205f16e5f553360a24583cfe9b85cf60051fa1558233cc37fcd1cee`；main.js/styles.css也与派发前相同。本票没有新增横幅输入失效；若后续改编源码导致 NOTICE 变化，仍须 Root 安排实际 main.js 重建，不能用 Go-only 跳过。

## 问题与下一步

本次 notices/许可维护候选已交回，独立审查与正式接纳仍属 Root，T-27 全票继续等待最终全部产品输入、资产与 G5。109其后CP/取消验证若真正改变 imports、build tags 或运行依赖闭包，由 Root 失效受影响证据并交原owner重验；未变化的法律全文及目标模块图按证据复用规则保留。本报告不把此次快照称为全部未来源码最终冻结。

全仓 docs 检查实际未通过，当前精确四项如下；它们不在本票写集，111两份当前说明没有 finding。原始完整输出保留，不修改他人 Evidence/历史报告或检查器，也不把该失败计成通过：

```text
T-06.md: missing heading anchor #acceptance-verification
T-06.md: missing heading anchor #independent-review
106-protocol-private-contract/logs/interface-contract.md: unresolved reference link [][2]
110-model-probe-expectation/REPORT.md: missing local link /home/wta/orca/workspaces/obsidian-huhu/bot/native/huhubot/tests/contract/assistant/model_test.go:98
```

Root 已收到实际结果与 Go 窗口归还消息；这些文档接缝由其协调原owner维护，再按输入变化执行相关检查。本票未运行根 build/lint、五平台资产重建/校验、本机 stdio、远程 CI 或真实 Provider/Obsidian/目标 OS 操作；任务未要求本切片重建资产，不将前序历史资产作为当前 Responses 的发行证明。全部子进程实际Wait，无残留本任务进程；最后亲自执行 return 结构校验、核对产品摘要后全部停写，通过原生 MESSAGE+FINAL 返回。
