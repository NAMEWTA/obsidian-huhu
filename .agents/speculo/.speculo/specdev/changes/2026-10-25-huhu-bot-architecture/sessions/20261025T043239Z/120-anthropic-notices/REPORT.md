# Anthropic 实际依赖许可维护交回

Session: 20261025T043239Z
Task: 120-anthropic-notices
Status: completed

## 聚焦交接

120 的当前 Anthropic 许可候选已完成并全部停写；真实五目标 cmd 非测试编译闭包为 **51 个第三方模块，加 Go runtime 共52项**，完整根通知生成/一致性检查及 docs 均实际退出0。已独立核验 Anthropic 根 MIT 与其自身内置 Go JSON BSD，按119真实锁登记必要辅助模块，并保留所有旧法律义务；当前 jsonparser 的版本标题由1.1.1改为真实1.1.2，MIT正文未变。三次有意义的轻量 Node 阶段分别验证固定SDK、真实锁/辅助许可及已发现的 CRLF expected 比较问题，末次普通27测试通过；未为形式重复已有效检查。所有 Go/生成/文档子进程已经实际 Wait，并先原生归还唯一窗口给 Root，之后才做本报告/manifest/return；Root的新CLI E2E与121独立审查不作为本票已经通过的证据，T-27全票/Goal/G5仍未完成。

## 产物与验证

冻结 TASK SHA 为 `8d94e74081b0164225e8dd312973d3a7d3b99dc315cba2c95bd082741401df1c`。Map29/Goal28和LOG114、Anthropic采用窗口 SHA `885623c70ac60d7465cddee7a013cd16381d7462ace073209b4182a3683c3505` 已回读/核验；复用111已接纳生成器、113检查器及未变 SpecDev I/dev许可、测试和构建规则。工作区为原 current `NAMEWTA/bot`，HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`，实际只读检查见 [13-preflight-source-check.json](logs/13-preflight-source-check.json)。无新委派、提交、推送、发布、归档或真实凭证请求。

本轮只修改五个产品文件，无新增法律文件。NOTICE和19份旧本地法律输入逐字节未变；Go源码/锁、checker、Skill/AGENTS、API/HAP/TS、main.js/styles.css、发行资产及正式状态没有由本任务写入。精确 before 原字节在 `logs/before/`，本轮完整差异见 [23-owned-change.patch](logs/23-owned-change.patch)，逐文件与只读来源清单见 [final-inputs.json](final-inputs.json)，所有本任务工件摘要见 [artifact-manifest.json](artifact-manifest.json)。

| 修改文件 | before SHA-256 | after SHA-256 |
|---|---|---|
| `THIRD-PARTY-NOTICES.md` | `fdaca047cd0a7b2c718c1a540a8c19271ef16208dcb80662620ffda2162ed500` | `cf3b0333a62ded90409d411902abff42764d9c9f5d0315d592f385839d60ac7b` |
| `docs/references.md` | `df0cbf3995778b84dadb6233991ca635c12ead3963007c9136c9cc9c313147fa` | `e86fd61c0b7107f4fc144a9631f58c867120c29d11da306612e7f3d078aa83dd` |
| `docs/third-party/huhu-bot.md` | `e25d6e6cdeca67af218ced2731632e7b22361cf691ba538602d6885cd26e759d` | `98d9dad577e395bb24bab0528b3551ac730865962876b5e656d7f68ae5cbecba` |
| `scripts/huhu-bot-notices.mjs` | `868e8dcf406c96e49704585c113db8baca4cd3ed766897fb76a097643f7f0685` | `e2e55e4e828e73481a376d3a82c55fb5b7eb102f227dcdc9c840a025fd17ef91` |
| `scripts/huhu-bot-notices.test.mjs` | `b75e0dd098cf75e319d16f1c70d269d642c6adfc8bce275e4590360693db95e8` | `a8c02df02f5982796f44be53740739e6621cf579d99cb56d4242723a6d4901c7` |

五文件树 SHA 为 `732cf3025f61093bd77a2f6143f625adcc072b8d3350bd9afe81a0f8556d67ee`（按排序后的 `path + NUL + fileSHA + LF`），final-inputs.json SHA 为 `1d4a4f63bc2a73bef17ce06873f93375acbf26ecb708e07bf9645ae62bc639fc`。这不是最终发行资产的 sourceTreeHash。SDK-only、119锁准备及两行 CRLF 维护前后的历史阶段均另存，没有回写111/113或任何既有失败。

实际119锁为 go.mod `943f91b31c7f9ea341c3779a4bd9bfd0a4a51f658e20a0d4f5def0a5f287a668` / go.sum `bbb9c65d33563690674169c8091f00a445a9e503d5bc639c9081945e7c6587e8`。与本TASK初始未锁Anthropic时的 f75b…/414a…相比，变更属于119真实 import/tidy，本票未 tidy、未改锁或新增依赖。SDK根包的 schema、tool runner、webhook 等源文件以及其内部路径作了只读核对，初期静态结果仅作准备，不冒称实际生产闭包；最终五目标确认新增6个模块路径和1个既有版本升级：

| 模块 | 实际版本 | zip checksum / go.mod checksum | 根原文 SHA-256 |
|---|---|---|---|
| `github.com/anthropics/anthropic-sdk-go` | `v1.56.0` | `h1:idVU14wOZ06D0GBNEvuhn927xXmBVEquo0469iDwLsc=` / `h1:3EfIfmFqxH6rbiLcIP4tPFyXL/IHakx2wDG4OU+TIEI=` | `LICENSE 8bf96984ff8bcfae7e48cae76a529e8a25317ba9e02abf7fd3cc64fdf95657a6` |
| `github.com/buger/jsonparser` | `v1.1.2` | `h1:frqHqw7otoVbk5M8LlE/L7HTnIq2v9RX6EJ48i9AxJk=` / `h1:6RYKKt7H4d4+iWqouImQ9R2FZql3VbhNgx27UK13J/0=` | `LICENSE 632b59709152e1b5bfd3e2794848bcd2f4c70e3e175646726dbf53439ea1dbe1` |
| `github.com/invopop/jsonschema` | `v0.14.0` | `h1:MHQqLhvpNUZfw+hM3AZDYK7jxO8FZoQeQM77g8iyZjg=` / `h1:ygm6C2EaVNMBDPpaPlnOA2pFAxBnxGjFlMZABxm9n2I=` | `COPYING ed76298aa9c218e9010aa186c1107ceb6c7618db50ae0222b9a1b4196101a411` |
| `github.com/pb33f/ordered-map/v2` | `v2.3.1` | `h1:5319HDO0aw4DA4gzi+zv4FXU9UlSs3xGZ40wcP1nBjY=` / `h1:qxFQgd0PkVUtOMCkTapqotNgzRhMPL7VvaHKbd1HnmQ=` | `LICENSE b40930bbcf80744c86c46a12bc9da056641d722716c378f5659b9e555ef833e1` |
| `github.com/standard-webhooks/standard-webhooks/libraries` | `v0.0.1` | `h1:uOfcYT+3QungH6tIGSVCR/Y3KJmgJiHcojJbMTPDZAI=` / `h1:L1MQhA6x4dn9r007T033lsaZMv9EmBAdXyU/+EF40fo=` | `LICENSE 5ec8c7b26b64d881a6706617bed25c049f97f2f35de034c756de8546fd6dbe27` |
| `go.yaml.in/yaml/v4` | `v4.0.0-rc.2` | `h1:/FrI8D64VSr4HtGIlUtlFMGsm7H7pWTbj6vOLVZcA6s=` / `h1:aZqd9kCMsGL7AuUv/m/PvWLdg5sjJsZ4oHDEnfPPfY0=` | `NOTICE f6c2dd3a67b576eafb89b80200b8b1627230bf3821a0c14cb99a22ac19107d00；LICENSE d18f6323b71b0b768bb5e9616e36da390fbd39369a81807cca352de4e4e6aa0b` |
| `golang.org/x/sync` | `v0.23.0` | `h1:KameEIfc1IkluZyXWLn39Wd4tURc6GbCiISGiZm2bQk=` / `h1:sUUOizhqBxiL6pEWpqNLUiaJn1ShEbZ6BBqskPbjZm0=` | `LICENSE 911f8f5782931320f5b8d1160a76365b83aea6447ee6c04fa6d5591467db9dad` |

完整原文、origin和校验和见 [08-actual-lock-license-inventory.json](logs/08-actual-lock-license-inventory.json)；最终全部51模块的根LICENSE/COPYING/NOTICE、selected terms、摘要与附加来源见 [22-final-runtime-license-sources.json](logs/22-final-runtime-license-sources.json)。五个目标均实际包含以上七项变动版本，旧直接/Eino/Ext/ACL/fork/Responses pin保持；x/sync实际为0.23.0，初期SDK声明/缓存准备中的0.16.0不是最终产品版本。旧buger/jsonparser1.1.1的审阅登记和历史材料保留，但当前通知只列实际1.1.2，没有为保旧通知而修改锁。

Anthropic v1.56.0 固定 origin `b0e07bb34ffc0d018c89b5cec8f62a7b823927f3`，根 MIT 全文为 Copyright 2023 Anthropic, PBC.，SHA `8bf96984ff8bcfae7e48cae76a529e8a25317ba9e02abf7fd3cc64fdf95657a6`。真实driver直接调用公开 SDK 的 `Messages.NewStreaming` / `Models.Get`，显式 WithoutEnvironmentDefaults/key/baseURL/client/retries0，复用 HUHU common/httpcall/Registry，没有复制SDK/Runner或另造执行/账本循环；没有引用未消费的 Eino claude/agenticclaude包装器冒充运行入口。

SDK自身的 `internal/apijson/encoder.go` 实际导入自己的 `internal/encoding/json`，该包在五目标各选中10个文件。encode/decode/indent/scanner/stream、tags、fold、tables分别保留 Go Authors 的2010、2011、2013、2016年 BSD 头，不能只列根 MIT，也不能以 OpenAI SDK 的声明替代。按 Anthropic 自身固定源独立登记并复用字节相同的 `go-1.24rc1-BSD-3-Clause.txt`，SHA `911f8f5782931320f5b8d1160a76365b83aea6447ee6c04fa6d5591467db9dad`；源文件/哈希记录在 [01-fixed-sdk-license-inventory.json](logs/01-fixed-sdk-license-inventory.json)。SDK仅声明 Go1.24预发布实现，未给精确vendoring commit；[固定Go LICENSE](https://github.com/golang/go/blob/16afa6a740fac7442e94dcd2ec5ea4a4853e45dc/LICENSE)仅固定完整法律原文，不虚构实现身份。

辅助模块的根全文齐全：invopop/jsonschema MIT、pb33f/ordered-map Apache-2.0、standard-webhooks/libraries MIT、x/sync BSD-3-Clause、buger/jsonparser MIT。standard-webhooks固定commit `61f39ec18da9fdda7b1f3d64a68577ca46ab4800` 的[子模块 libraries/LICENSE](https://github.com/standard-webhooks/standard-webhooks/blob/61f39ec18da9fdda7b1f3d64a68577ca46ab4800/libraries/LICENSE)实际HTTP200/正文SHA5ec8…dbe27，与Go发行模块完全一致；同一仓库根LICENSE是不同范围的Apache-2.0，不能覆盖或误报这个MIT子模块，原始验证见 [17b-fixed-license-path-check.json](logs/17b-fixed-license-path-check.json)。pb33f的实际yaml.go导入go.yaml.in/yaml/v4；v4.0.0-rc.2根LICENSE/NOTICE与已审阅yaml.v3两文件逐字节相同，仍独立按 MIT AND Apache 登记，并复用完整Apache条款（SHA698492…524b），保留Kirill Simonov/Canonical署名。全文来源的EinoExt固定URL仅是法律文本来源，不冒充YAML实现来源。GoBSD/Apache旧文件均未改动，生成时不联网抓浮动原文。AWS/Google/cloud以及SDK的研究或测试分支没有自动列入；实际选中包中也没有这些cloud包。

五目标窗口先执行 `go mod verify`，固定 `GOTOOLCHAIN=go1.26.10`、`GOWORK=off`、GOFLAGS/GOEXPERIMENT空、CGO0、GOAMD64=v1/GOARM64=v8.0；每目标核GOVERSION，再运行 `go list -mod=readonly -deps -json ./cmd/huhubot`。每条命令/目标/环境/退出0/实际Wait在 [18-commands.json](logs/18-commands.json)，完整原包清单在 `18-<target>-deps.log`，汇总在 [18-target-closures.json](logs/18-target-closures.json)。

| 目标 | 总包数（含std/主模块） | 第三方模块数 |
|---|---:|---:|
| `linux-x64` | 471 | 49 |
| `linux-arm64` | 437 | 45 |
| `darwin-x64` | 469 | 48 |
| `darwin-arm64` | 435 | 44 |
| `win32-x64` | 473 | 50 |

并集51，含Go runtime共52；不是沿用111旧45表，也不是把单机49表当最终union。实际非stdlib主模块/第三方选择清单共1218个目标包行、1648份唯一编译输入（GoFiles/汇编/内嵌文件等），见 [18-selected-compiled-files.json](logs/18-selected-compiled-files.json)，SHA `cd9eed9158f1218bf3d573594ca9564aed2ee0a4578cc0e92cf7df5540d7140f`。cmd/internal非测试生产/内嵌输入共173文件（排除tests/testdata/dist及 `_test.go`），窗口前后无漂移，树 SHA `69d632c786cf504765b50df11d8e9f8a548e5422e54bcdaf354294c3a33b45ee`，见 [18-production-before.json](logs/18-production-before.json)。117最终自有14源树与这个173文件生产范围不是同一摘要，不混用；源码和锁冻结后才采图。这里是实际构建标签选择的编译闭包，没有运行本切片五目标go build或目标OS二进制。

三次有意义的Node阶段及结果：

1. **固定SDK准备。** 当时119尚未给生产锁，01仅固定SDK来源/完整许可准备。真实 [02-node-red.log](logs/02-node-red.log) 有14tests/12pass/2fail及 Anthropic 未登记、缺独立BSD的具体断言；最小登记后 [03-node-green.log](logs/03-node-green.log) 普通工具27/27、观察命令返回0/Wait。该阶段不冒称实际闭包。
2. **实际锁与辅助义务。** 119交回943f…/bbb9…锁后，08保存7个实际版本完整原文/checksums。真实 [09-locked-helper-red.log](logs/09-locked-helper-red.log) 有14tests/12pass/2fail及 jsonparser1.1.2 未登记、YAML4缺附加全文的具体断言；补最小版本/独立义务后 [10-locked-helper-green.log](logs/10-locked-helper-green.log) 普通工具27/27、返回0/Wait，[11-local-locked-license-check.json](logs/11-local-locked-license-check.json) 也核了7个固定法律输入。最终是否进入生产只由18的五目标图确认。
3. **已发现的CRLF expected可移植性。** .gitattributes未固定法律.txt为LF，而生产读取会规范LF，既有两处expected读值未规范会产生假红。Root明确授权后，先用同一原测试的正常副本2/2、返回0，与只注入expected读值CRLF的副本对照，后者两条完整原文includes断言真实失败、观察返回126/Wait；[15-crlf-before-results.json](logs/15-crlf-before-results.json)、正常/失败全文日志均保留。只在本票测试文件两处expected读取后规范CRLF，不改生成器/原文/规则；[16-portability-green.json](logs/16-portability-green.json) 中受控CRLF副本2/2、返回0，普通全工具27/27、返回0，均Wait。它是受控文本读值表示的反例，未声称真实checkout、Windows现场或目标OS通过；副本/源测试SHA可回读，没有删除测试、放宽断言或跳过原检查。

**退出码层次按原始证据记录。** 02/09的JSON旧字段`outerExit=126`保存的是Python subprocess.run对所执行Node命令观察到的返回码；记录/打印结果的Python工具父层实际返回0。原始stdout/stderr合并全文及工具来源在 [14-red-command-provenance.json](logs/14-red-command-provenance.json)，两原日志SHA分别为 `4fb819e738dcbeafcd5fdc48bc161363b5171d5f9a11b275e5d3ae4ed8f87572`、`8e000b754f041f10051fa579c3b3da1b797835443caf6fcfe04c32c20fd991dd`。Root已回读并接受具体行为红，不能只凭126判定行为红；没有单独捕获的Node内部exit1不作推导。15受控反例同样保留观察层次和真实断言，所有子命令已Wait，未为补格式重跑原有效红灯。

| 最终检查 | 实际结果 / Wait | 原始回执 |
|---|---|---|
| 18模块verify/五目标图 | 所有显式命令实际0 / Wait，完整目标/包/选择文件已保存 | 18系列 |
| `pnpm run notices` | 返回0 / Wait，100 npm / 62 Rust crates / 52 Go runtime+modules | [19-notices-write.log](logs/19-notices-write.log)、JSON |
| `pnpm run check:notices` | 返回0 / Wait，同一候选生成一致 | [20-notices-check.log](logs/20-notices-check.log)、JSON |
| 受影响Node工具 | 复用未变化的16-all-tools 27/27、返回0/Wait；Root要求不再重复，最终源码/19法律输入一致 | [16-all-tools.log](logs/16-all-tools.log) |
| `pnpm test:docs` | 返回0 / Wait；813 Markdown、1884本地链接、753外链（未fetch） | [21-docs.log](logs/21-docs.log)、JSON |
| 自有脚本/说明diff检查 | 返回0 / Wait | [24-diff-check.log](logs/24-diff-check.log) |

最终根通知 SHA 为 `cf3b0333a62ded90409d411902abff42764d9c9f5d0315d592f385839d60ac7b`。自动对比确认npm/CSS/Rust部分逐字节相同；此前46个Go通知正文（含runtime和全部既有附加义务）全部保留，其中仅jsonparser版本标题按真实MVS改为1.1.2，正文和原文许可字节相同。19份旧本地法律文件逐个SHA相同；NOTICE逐字节未变，SHA `8062897bb205f16e5f553360a24583cfe9b85cf60051fa1558233cc37fcd1cee`，main.js/styles.css未写。本票没有新的main.js banner失效；以后若真实源码改编改变NOTICE，仍需Root协调实际重建，不能以Go-only跳过。

## 问题与下一步

本次局部许可/生成/文档候选没有未关闭的自身finding；Root已在所有资源实际退出后接回Go窗口并开始新CLI/生产TS HAP Host E2E，再安排121独立审查。这里仅交回固定五目标图与法律/生成证据，不冒称Root的新检查或独立审查通过，不关闭T-27、任何Goal或G5。

没有运行本切片的五目标资产重建/校验、本机stdio、根插件build/lint、远程CI、真实Provider/Obsidian或目标OS操作；真实现场仍由用户后验，不作为本轮代码交付阻塞。后续真正改变imports/build tags/运行依赖时，由Root失效对应图/通知并交原owner重验；不相关测试编辑或未变法律原文按证据规则复用，不把旧111快照当当前生产图。最终产品/保护摘要核对、亲自return0后全部停写，以原生MESSAGE+FINAL返回；未提交、推送、发布或归档。
