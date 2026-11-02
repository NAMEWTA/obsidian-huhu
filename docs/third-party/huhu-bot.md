# Bot Runner 第三方依赖

Bot Runner 位于 `native/huhubot/`，Go 依赖由该目录的 `go.mod` / `go.sum` 锁定。当前基础持久化使用 `github.com/ncruces/go-sqlite3 v0.35.6`（MIT），其实际编译闭包包含 `go-sqlite3-wasm/v6 v6.3.35304`（SQLite 本体为公有领域，其余 glue 为 MIT-0，译入 libc/TLSF 另保留 MIT）、`julianday v1.0.0`（MIT）与 `golang.org/x/sys v0.48.0`（BSD-3-Clause）。Go 工具链固定为 `go1.26.10`，运行时及标准库按 Go 的 BSD-3-Clause 许可保留全文。

`go-sqlite3-wasm/v6` 的[固定 README](https://github.com/ncruces/go-sqlite3-wasm/blob/d923b955a175c983578bd2196ce9ac0511f6159d/README.md)说明机器翻译保留原作者及原许可，其余部分使用 MIT-0。该版本的 [go.mod](https://github.com/ncruces/go-sqlite3-wasm/blob/d923b955a175c983578bd2196ce9ac0511f6159d/go.mod)固定 `wasm2go v0.4.15`；[build/main.c](https://github.com/ncruces/go-sqlite3-wasm/blob/d923b955a175c983578bd2196ce9ac0511f6159d/build/main.c)包含 `libc.c`、`malloc_tlsf.c`，[构建脚本](https://github.com/ncruces/go-sqlite3-wasm/blob/d923b955a175c983578bd2196ce9ac0511f6159d/build/build.sh)先调用 libc-gen 再翻译进 Go。已链接的 libc/TLSF 对应 wasm2go 提交 `c0a4be49ed2521303a8b47a8ccbe974da0444762` 中的 C 输入，其完整 [MIT 原文](licenses/go/wasm2go-v0.4.15-MIT.txt)按 SHA-256 `13b7919ffbff20b54d133748a783ade8b3ecb1810144194aad70928070f2c0df` 纳入该精确 wasm 模块版本的附加声明。登记对象是译入运行代码，不将 wasm2go、x/tools 或其他未链接构建工具计为 Go 运行模块。

HAP 运行时 schema 校验加入 `github.com/santhosh-tekuri/jsonschema/v6 v6.0.3`（Apache-2.0，固定提交 `b0fc661f4939578bc429f408c18202573dbafcc4`）与实际传递依赖 `golang.org/x/text v0.42.0`（BSD-3-Clause，固定提交 `fafe4a06967e06550e69ee42787d9902845d2a3f`）。`jsonschema/v6` 的上游测试依赖 `regexp2` 不在 Runner 编译闭包，不列分发。除模块根许可，生成器还保留下列实际内嵌数据的完整声明：

- `jsonschema/v6` 通过 `go:embed metaschemas` 带入 JSON Schema 官方 metaschema。官方[固定 README](https://github.com/json-schema-org/json-schema-spec/blob/ce9738c9064662ec791fcb13f56b5cab5b3bc450/README.md#license)明确提供 BSD-3-Clause 或 AFL-3.0，选择 BSD-3-Clause，完整[原 LICENSE](licenses/go/json-schema-spec-LICENSE.txt)连同另一选项保留，不把库根 Apache-2.0 作为这些数据的唯一许可。
- `x/text` 实际消费的语言、紧凑语言、复数和数字生成表标注 `CLDRVersion = "32"`；保留 CLDR 32 固定提交 `5dfac9269ed58eeaeddd6ca887bdc7eb43a481fd` 的 [Unicode 数据许可全文](licenses/go/cldr-32-unicode-license.txt)（Unicode-DFS-2016）。这份数据许可允许按所列条款使用和分发，不能替换成不对应历史数据的最新版标签，也不引入未消费 CLDR 工具的许可证。

上述补充原文在 `scripts/huhu-bot-notices.mjs` 按模块精确版本、上游固定提交和 SHA-256 登记，并核对来源、许可与摘要的已审阅组合。缺少、篡改、目录越界、未固定提交、未知来源或未经审阅的补充许可都会失败；生成和检查过程只读本地文件，不联网抓正文。

系统凭证适配器的编译输入按目标核对，采用的模块与根许可如下。固定发行包已包含完整 `LICENSE`，通知直接读取经 `go.sum` 校验的本地模块文件，不另造许可副本。

| 模块 | 实际消费目标 | 固定来源与许可原文 | 原文 SHA-256 |
|---|---|---|---|
| `github.com/zalando/go-keyring v0.2.8` | Windows | [MIT，Zalando SE](https://github.com/zalando/go-keyring/blob/a8cdfe320cc8bc0534c895a648dc9214715a9da5/LICENSE) | `14bc00f1a298eb6af250216b9e60027a4386c8a84fa2c7ddc2b5c10908e06d0d` |
| `github.com/godbus/dbus/v5 v5.2.2` | Linux | [BSD-2-Clause，Georg Reinke、Google](https://github.com/godbus/dbus/blob/a8ac15ba63645f02ffd57f4b443203279ab40b30/LICENSE) | `e4646a82a976369d7ae8f6ed5c11d35dc0af18433a8ccc24c85b459ad8b95128` |
| `github.com/danieljoos/wincred v1.2.3` | Windows | [MIT，Daniel Joos](https://github.com/danieljoos/wincred/blob/623325312d3224d48d131159187b93e906216563/LICENSE) | `1702a813fa31858c0d6c7788216fa3dd202472265716998024654c252fc7bb41` |

Linux 使用按官方 [Secret Service 协议](https://specifications.freedesktop.org/secret-service/latest/)自行编写的窄 client，直接调用 godbus，不再编译 go-keyring。Windows 编译 keyring 的 common/fallback/mock/windows 及 wincred；这些已选第三方源码未发现额外的文件级许可声明。macOS 使用本项目编写的有界 `/usr/bin/security` 适配器，不导入上述三个凭证模块。Linux 与 macOS 自有适配器没有复制或改编上游实现。上游 `keyring_darwin.go` 含另行声明的 Apache-2.0 文件头，但不在实际 Darwin `GoFiles` 中，也未被改编进自有适配器，因此不列为已分发源码。许可检查对该精确 keyring 版本另设文件边界，未来若实际编译上游 Darwin 文件会失败，要求重新审阅并补齐对应声明。

TS schema 校验的根运行依赖精确固定为 `ajv 8.20.0` 与 `ajv-formats 3.0.1`（两者 MIT），实际版本和传递树以 `pnpm-lock.yaml` 为准。当前 Bot 模块尚未注册进入 `main.js`，所以根 dependencies 不等同插件实际分发；npm notices 继续从真实 esbuild 闭包采集，后续模块集成后才自动纳入实际打包的 AJV 与传递依赖。

默认 CLI 的 Chat Completions 已实际调用固定的 Eino/EinoExt SDK，不再只是研究候选。生产桥位于 `native/huhubot/internal/adapters/outbound/eino/chat/driver.go`：生成调用 `NewChatModel`、`WithTools` 和 `Stream`，模型元数据探测调用底层 fork 的 `GetModel`；`common/` 使用 Eino schema 和已消费的 `eino-contrib/jsonschema v1.0.3`。有限工具循环、预算、取消、回执和恢复仍由 HUHU 自有实现承担，没有复制完整 Eino Runner 或 ACL 桥，也没有修改模块缓存。SDK 自身编译闭包中的 `compose` 等包仍按真实输入纳入许可，不能把“未调用完整 Runner”写成“整个模块未分发”。

| SDK 模块 | 精确版本与固定提交 | 根许可 |
|---|---|---|
| `github.com/cloudwego/eino` | `v0.9.22`，`0a5ca53b9d3bf7b661dccc863465ec568a421eea` | [Apache-2.0 原文](https://github.com/cloudwego/eino/blob/0a5ca53b9d3bf7b661dccc863465ec568a421eea/LICENSE-APACHE) |
| `github.com/cloudwego/eino-ext/components/model/openai` | `v0.1.13`，`0ebab92e14f26088411dbc440a1ebdc904ccd8a1` | 子模块发行包缺根许可，保留[该提交的完整 Apache-2.0](licenses/go/eino-ext-openai-v0.1.13-LICENSE-APACHE.txt)，SHA-256 `69849221bfb90053de2134ef5e6d540287b4b98062326492f1f96f5da685524b` |
| `github.com/cloudwego/eino-ext/libs/acl/openai` | `v0.1.18-0.20260924031408-10df7cac3f6d`，`10df7cac3f6dc2bdef878540391ba986928f53e0` | [发行模块内 Apache-2.0 原文](https://github.com/cloudwego/eino-ext/blob/10df7cac3f6dc2bdef878540391ba986928f53e0/libs/acl/openai/LICENSE) |
| `github.com/meguminnnnnnnnn/go-openai` | `v0.1.6`，`a92c8d868a5db59bb6e0e40a2230c417edb1bd04` | [Apache-2.0 原文](https://github.com/meguminnnnnnnnn/go-openai/blob/a92c8d868a5db59bb6e0e40a2230c417edb1bd04/LICENSE) |

默认 Responses 驱动位于 `native/huhubot/internal/adapters/outbound/eino/responses/`，直接调用官方 `openai-go/v3 v3.44.0` 的公开 `ResponseService.NewStreaming` 和 `ModelService.Get`，通过同一私有 Registry 装配。请求与原始 item 回放使用 SDK 的类型及公开扩点；生命周期、HTTP 边界和预算由 HUHU 自有 `httpcall` 辅助与 common 循环承担，没有复制完整官方 SDK 或另造 SDK fork。Chat 的既有 EinoExt/fork 依赖继续保留，不能用新增官方 SDK 替换它们的许可声明。

| Responses 新增锁定模块 | 固定提交 | 根许可原文 / SHA-256 |
|---|---|---|
| `github.com/openai/openai-go/v3 v3.44.0` | `83462dff240801783d9cd32dece645c86875abec` | [Apache-2.0，Copyright 2026 OpenAI](https://github.com/openai/openai-go/blob/83462dff240801783d9cd32dece645c86875abec/LICENSE) / `636eb7d79da9bb6d515a4b3fd417aa26679eb3cf16396ddab4bc55fa74e616e4` |
| `github.com/tidwall/gjson v1.18.0` | `133f42ce2d99d6adb6b5885af6d20939dc4b6fe9` | [MIT，Josh Baker](https://github.com/tidwall/gjson/blob/133f42ce2d99d6adb6b5885af6d20939dc4b6fe9/LICENSE) / `be83ad53208d03a9fe08c7fac231cabf79422989ef5706bff217bd35104ebf07` |
| `github.com/tidwall/sjson v1.2.5` | `b279807a1bad9fa155988667d97a3d2fff4061b5` | [MIT，Josh Baker](https://github.com/tidwall/sjson/blob/b279807a1bad9fa155988667d97a3d2fff4061b5/LICENSE) / `dbf5e2aa91aee5f19a1ce2cc7891e2ac37204b6461c0adc539426636e27b208e` |
| `github.com/tidwall/match v1.1.1` | `4c9fc61b493b7aa0a3d347e9190aa78c5bec09cf` | [MIT，Josh Baker](https://github.com/tidwall/match/blob/4c9fc61b493b7aa0a3d347e9190aa78c5bec09cf/LICENSE) / `be83ad53208d03a9fe08c7fac231cabf79422989ef5706bff217bd35104ebf07` |
| `github.com/tidwall/pretty v1.2.1` | `9090695766b652478676cc3e55bc3187056b1ff0` | [MIT，Josh Baker](https://github.com/tidwall/pretty/blob/9090695766b652478676cc3e55bc3187056b1ff0/LICENSE) / `0ca70311227fe097c662dece3f359e3317fa7f9d41f8d29eb45fc5135e216139` |

这些发行模块均自带完整根 LICENSE，通知从经 Go 锁摘要核验的模块内容读取，无需另造根许可副本。官方 SDK 的 `internal/apijson/encoder.go` 还调用其内置 `internal/encoding/json`：编码、解码等原文件保留 Go Authors 的 2010、2011、2013、2016 年 BSD 法律头，不能只用 SDK 根 Apache 许可覆盖。生成器在该精确 SDK 版本下另附[完整 Go BSD 原文](licenses/go/go-1.24rc1-BSD-3-Clause.txt)，SHA-256 `911f8f5782931320f5b8d1160a76365b83aea6447ee6c04fa6d5591467db9dad`，并保留各年份署名。SDK 只声明代码来自 Go 1.24 预发布版，没有给出精确 vendoring commit；本地全文来源是[固定 Go 1.24rc1 的 LICENSE](https://github.com/golang/go/blob/16afa6a740fac7442e94dcd2ec5ea4a4853e45dc/LICENSE)，仅固定法律原文，不虚构那批实现的精确来源提交。SDK 中其它 cloud 包、测试及研究依赖仍按真实编译输入排除或纳入，不把整个 SDK 仓库或模块 require 表当发行闭包。

Anthropic Messages 驱动位于 `native/huhubot/internal/adapters/outbound/eino/anthropic/`，直接使用固定 `github.com/anthropics/anthropic-sdk-go v1.56.0` 的公开 `Messages.NewStreaming` 和 `Models.Get`，复用同一 common/httpcall 与私有 Registry。它处理自己的有序 content blocks 与协议状态，没有复制 SDK/Runner，也没有新建另一套执行或账本循环。SDK 根 [MIT 原文](https://github.com/anthropics/anthropic-sdk-go/blob/b0e07bb34ffc0d018c89b5cec8f62a7b823927f3/LICENSE)为 Copyright 2023 Anthropic, PBC.，固定 origin `b0e07bb34ffc0d018c89b5cec8f62a7b823927f3`，全文 SHA-256 `8bf96984ff8bcfae7e48cae76a529e8a25317ba9e02abf7fd3cc64fdf95657a6`；发行包自带完整 LICENSE，通知直接读取经锁校验的版本内容。

Anthropic SDK 自身的 `internal/apijson/encoder.go` 同样导入它自己的 `internal/encoding/json`，encode/decode/indent/scanner/stream、tags、fold、tables 分别保留 Go Authors 的2010、2011、2013、2016年 BSD 头。该义务按 Anthropic 精确版本和自身固定源码单独登记，复用字节相同的 [Go BSD 法律全文](licenses/go/go-1.24rc1-BSD-3-Clause.txt)，不能以 OpenAI SDK 的声明替代。两者都只说明 Go1.24预发布代码，没有给出精确 vendoring commit；固定 Go LICENSE 来源仅证明法律原文，不虚构实现身份。生成器仍以最终五目标的真实编译选择判断 SDK 辅助模块、cloud 和测试分支，既不把整个 SDK require 表列为运行依赖，也不因某项高级 SDK 功能未调用就遗漏同包实际编译的辅助模块许可。

Anthropic SDK 根包的 schema、tool runner 和 webhook 文件还导入下列辅助模块。真实导入整理后锁定的版本及完整根许可如下；即使 HUHU 没有调用其中的高级方法，同包编译依赖仍按真实目标图覆盖，不能只列出 SDK 一个模块。

| 辅助模块 | 固定来源及许可 | 根原文 SHA-256 |
|---|---|---|
| `github.com/invopop/jsonschema v0.14.0` | [MIT，Alec Thomas](https://github.com/invopop/jsonschema/blob/2c57d6074bf9004aaaf1fc9c07ff0ea730b23de7/COPYING) | `ed76298aa9c218e9010aa186c1107ceb6c7618db50ae0222b9a1b4196101a411` |
| `github.com/pb33f/ordered-map/v2 v2.3.1` | [Apache-2.0](https://github.com/pb33f/ordered-map/blob/a94c5774d0a85efe4cea88ea45e67d0619919044/LICENSE) | `b40930bbcf80744c86c46a12bc9da056641d722716c378f5659b9e555ef833e1` |
| `github.com/standard-webhooks/standard-webhooks/libraries v0.0.1` | [MIT，Svix](https://github.com/standard-webhooks/standard-webhooks/blob/61f39ec18da9fdda7b1f3d64a68577ca46ab4800/libraries/LICENSE) | `5ec8c7b26b64d881a6706617bed25c049f97f2f35de034c756de8546fd6dbe27` |
| `go.yaml.in/yaml/v4 v4.0.0-rc.2` | [MIT AND Apache-2.0](https://github.com/yaml/go-yaml/blob/79a895ba05137f58781f9f6ff38a0f04c02816bc/LICENSE)，另保留 NOTICE | LICENSE `d18f6323b71b0b768bb5e9616e36da390fbd39369a81807cca352de4e4e6aa0b`；NOTICE `f6c2dd3a67b576eafb89b80200b8b1627230bf3821a0c14cb99a22ac19107d00` |
| `golang.org/x/sync v0.23.0` | [BSD-3-Clause，Go Authors](https://github.com/golang/sync/blob/f75267d8412fc1dfd12b343644a7ea46e4d9c85d/LICENSE) | `911f8f5782931320f5b8d1160a76365b83aea6447ee6c04fa6d5591467db9dad` |
| `github.com/buger/jsonparser v1.1.2` | [MIT，Leonid Bugaev](https://github.com/buger/jsonparser/blob/a69e7e01cd4ad67bdfd3ac2c080b9212af16f4b0/LICENSE) | `632b59709152e1b5bfd3e2794848bcd2f4c70e3e175646726dbf53439ea1dbe1` |

`pb33f/ordered-map` 的 YAML 实现实际导入 `go.yaml.in/yaml/v4`。该精确 v4 发行版的 LICENSE/NOTICE 与已有 yaml.v3 两文件字节相同，仍为不同源码部分分别适用的 MIT **及** Apache-2.0；在新模块版本下独立登记并复用[完整 Apache 条款](licenses/go/Apache-2.0-full.txt)，不因全文相同丢掉新模块的义务。MVS 将既有 jsonparser 从 v1.1.1 选到 v1.1.2，根 MIT 文本字节相同；旧版本审阅与历史通知保留，当前生成清单只列真实选中的版本。x/sync 的实际锁为 v0.23.0，不沿用 SDK 静态声明里较低的研究版本。

SDK 传递闭包还带入 JSON、模板、集合、日志与汇编辅助模块；是否分发按目标编译输入判断，不把整个 MVS 锁表、研究工作区或测试树计入。生成器逐一登记精确版本并核对 `go.sum`，保留每个模块根目录供应的全部 LICENSE/COPYING/NOTICE。附加义务另按固定来源和内容摘要登记：

- `bytedance/sonic v1.15.0` 的[固定源码](https://github.com/bytedance/sonic/tree/afa2fcee563e04e912786ebd77b53760181fa622)包含生成的 SIMD 运行代码。除 Apache-2.0 根许可，还保留它供应的六份 `licenses/` 原文：Go/golang-asm 的 BSD-3-Clause、yyjson 的 MIT、simdjson 的 Apache-2.0，以及 Drachennest 和 Eisel-Lemire 的 Boost Software License 1.0。浮点转换原代码保留 Alexander Bolz、Daniel Lemire 与 ByteDance 修改署名，UTF-8 代码保留 Yaoyuan 和 simdjson 作者署名。完整声明随对应模块分发，不表示完整 yyjson、simdjson 或 Drachennest 项目成为独立 Go 依赖；其测试数据许可未列为运行代码。
- `twitchyliquid64/golang-asm v0.15.1`（[固定提交](https://github.com/twitchyliquid64/golang-asm/tree/8d7f1f783b11f9a00f5bcdfcae17f5ac8f22512e)）的真实编译文件包含 Inferno 衍生的 MIT 法律头。保留 Lucent、C H Forsyth、Vita Nuova、Bruce Ellis 与 Go Authors 的完整署名/许可变体，不能只留下模块根 BSD 文本。保存的 `.txt` 仅是原法律注释，没有复制实现。
- `sirupsen/logrus v1.9.3` 的[固定 `alt_exit.go`](https://github.com/sirupsen/logrus/blob/d40e25cd45ed9c6b2b66e6b97573a0413e4c23bd/alt_exit.go)含 Miki Tebeka 的 atexit 改编。完整原 MIT 法律头随 Logrus 根 MIT 保留，不虚构额外链接的 atexit 模块。
- `gopkg.in/yaml.v3 v3.0.1` 按文件使用 MIT **及** Apache-2.0，不是任选其一。原 LICENSE 中的 libyaml/Kirill Simonov 署名和 NOTICE 中的 Canonical 署名均保留，另外附[完整 Apache-2.0 条款](licenses/go/Apache-2.0-full.txt)，补齐发行包只有简写 Apache 授权的边界。该全文副本来源是固定 EinoExt 提交的同一 Apache 法律原文，不是 YAML 实现来源。

Boost 1.0 允许无偿使用和分发，其原文另有纯机码副本例外；这里仍保留全文。生成器只对这些精确来源登记 BSL-1.0，不把它扩为未知模块的通行标签。Eino 未消费的 ADK 提示模板、gopkg 未消费的其他子包、easyjson 的未消费 parser 和其他上游测试内容，不因出现在仓库里就声明为已分发。新增协议、SDK 版本或目标输入变化时必须重新审阅与重算，不能沿用早期闭包当作最终清单。

`scripts/huhu-bot-notices.mjs` 在 Linux/macOS x64、arm64 和 Windows x64 五个拟发行目标执行 `go list -mod=readonly -deps -json ./cmd/huhubot`，按模块与版本合并实际闭包，核对 `go.sum` 并保存所有供应的许可与声明。`pnpm notices` 将结果并入根 `THIRD-PARTY-NOTICES.md`；`pnpm check:notices` 校验生成一致。缺全文、未审阅版本、替换模块、依赖解析错误及未知或限制性许可均失败。构建不会临时抓取许可全文。

依赖版本的实际来源为 Go module cache 中经过校验的发行内容；缺少许可全文时才允许 `docs/third-party/licenses/go/` 下的固定提交与 SHA-256 本地副本。源码参考与探针输入保留在对应 change 的研究材料，不将候选项目署名为已采用代码。交叉编译与许可覆盖不代表五个平台的 TLS、凭证、Obsidian 和用户操作已通过。
