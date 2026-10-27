# Chat 实际运行依赖许可维护交回

Session: 20261025T043239Z
Task: 095-engine-notices
Status: completed

## 聚焦交接

095 的许可维护候选已完成，工程 writer 停止；仅本任务报告和回执收尾，不代表 T-27 或 T08 整票完成。已按最终真实五目标 `cmd/huhubot` 非测试编译闭包登记 **40 个第三方模块**，另加 Go 运行时共 **41 项**，生成并核对完整根通知，26 条受影响工具测试通过。默认 Chat 桥直接调用固定 Ext SDK，没有复制完整 Eino Runner/ACL 桥；新增声明属于实际依赖及它们的内嵌/改编代码义务，没有为未消费研究依赖造分发声明。唯一 Go 窗口内所有命令已实际 Wait、退出 0，随后立即原生通知 Root 并交还 092；没有残留本任务进程，也没有运行真实 Provider、Obsidian 或目标 OS 操作。

## 产物与验证

冻结 TASK SHA-256 为 `9ea95aef1e5f326587ff1bf5fc8221c07a9929252ff3c0ffa1b8a586583b013e`。复用 README/Map22/Goal21 的 current 工作区与原 T27 owner；HEAD/base 为 `33c21e098ef3188cbab5a09f3e0a01fadb787715`。现有其他 dirty 文件均保留，不暂存、提交、推送、发布或写正式 Evidence/Map/Goal。实际应用 SpecDev I 与 dev 的许可、测试、构建规则；本轮不涉及 UI/Skill 改动。

本轮自有产品写集共 20 文件：两个许可脚本、两份中文当前说明、14 份原始法律文本、Go 来源清单及生成的根通知。逐文件修改前/后 SHA 和新增标记见 [final-inputs.json](final-inputs.json)，真实前后差异见 [20-owned-change.patch](logs/20-owned-change.patch)；四个原有手工维护文件的 before 字节快照已按派发前 SHA 精确核验保存于 `logs/before/`，没有回滚产品。自有文件摘要如下：

| 文件 | 最终 SHA-256 |
|---|---|
| `THIRD-PARTY-NOTICES.md` | `04dce87bb9fdb48553ca7e93cd6cf98c27bdb2dcaf73d0ff46da03c9291fa9df` |
| `docs/references.md` | `c21b67fc2cf54d152881f47f0f17da8bc6620acfced06614cf00b0581080e981` |
| `docs/third-party/huhu-bot.md` | `55f165f177cb850950421239febf39e499be49d54ae95a7e21bfba888123920a` |
| `docs/third-party/licenses/go/Apache-2.0-full.txt` | `69849221bfb90053de2134ef5e6d540287b4b98062326492f1f96f5da685524b` |
| `docs/third-party/licenses/go/eino-ext-openai-v0.1.13-LICENSE-APACHE.txt` | `69849221bfb90053de2134ef5e6d540287b4b98062326492f1f96f5da685524b` |
| `docs/third-party/licenses/go/golang-asm-v0.15.1-inferno-1-MIT.txt` | `27d3a94ff600a1f100136f7743777284c8dccf707606ab07a2e20d032996cb15` |
| `docs/third-party/licenses/go/golang-asm-v0.15.1-inferno-2-MIT.txt` | `bb1458854751422ecfac21563c365bf09d8e3a0838db75ba815c14395cbadb57` |
| `docs/third-party/licenses/go/golang-asm-v0.15.1-inferno-3-MIT.txt` | `7c886985b97808b0ddcda7bcb747fb39b3026dd2d50cd4b3d557c37b629722d2` |
| `docs/third-party/licenses/go/golang-asm-v0.15.1-inferno-4-MIT.txt` | `c00b4b59c25a4054fe88a51dd32fc1e4f223f93cf77855ecdb74ebad574b2215` |
| `docs/third-party/licenses/go/golang-asm-v0.15.1-inferno-5-MIT.txt` | `eeecad0dc7d079ac0151c13c7b3cba4f56732c33471f36969f9298ac2e81cbee` |
| `docs/third-party/licenses/go/logrus-v1.9.3-atexit-MIT.txt` | `017f4e6ccc2a628990502e0394691722427f258cd9264246e328c74fb82d7931` |
| `docs/third-party/licenses/go/sonic-v1.15.0-LICENSE-Drachennest.txt` | `8d8291caf1cee26d23acf3eb67c9f9a2d58f1c681b16a4fbe8cbfb9e3c0b5a9b` |
| `docs/third-party/licenses/go/sonic-v1.15.0-LICENSE-eisel_lemire.txt` | `cc3a949197f7f066770ae05ced2a2e1dfebb850f5a7587f085dd314bdbbce5c0` |
| `docs/third-party/licenses/go/sonic-v1.15.0-LICENSE-golang-asm.txt` | `4214d8afcc3620b7fb7aa9c7695e8f659a90011a830caf0e0c72a385d7d3b2a5` |
| `docs/third-party/licenses/go/sonic-v1.15.0-LICENSE-golang.txt` | `4214d8afcc3620b7fb7aa9c7695e8f659a90011a830caf0e0c72a385d7d3b2a5` |
| `docs/third-party/licenses/go/sonic-v1.15.0-LICENSE-simdjson.txt` | `1c351ddfc2b959867290106301ba287d0525071630896709f74b3c3a621b0586` |
| `docs/third-party/licenses/go/sonic-v1.15.0-LICENSE-yyjson.txt` | `45e384d3d52c73cba3a64d6e6c25d47cd738cd8a55c30629e3201046eda62947` |
| `docs/third-party/licenses/go/sources.json` | `46f03a5717956c944bf32e08193b22a6ee24e11f260b79c995348728baf0e5f9` |
| `scripts/huhu-bot-notices.mjs` | `52f3d6c4b0ca020131d247ac80c524b5813c0e0b02659e37057112f754088ba9` |
| `scripts/huhu-bot-notices.test.mjs` | `6317f6d88cc3738bfaacbceffbcea3f9c26c8b4c59879e22e3169e67f067da11` |

自有 20 文件树摘要为 `2778f80de2833aa7f89a048f19c1e7f2691e6673e0c3574c6c789763721041fc`；final-inputs.json 文件 SHA 为 `754dbff88bd34ff434ed4781f6304bc8d47a108b953f1116fa121564c1435d66`。摘要算法是按路径排序的 `path + NUL + fileSHA + LF`；它是本票写集快照，不冒充发行资产的 sourceTreeHash。

生成器新增 31 个精确模块版本的根许可登记（原有 9 个保持），继续拒绝未知版本、限制性许可、缺模块摘要、go.sum 不符、replacement、解析错误/不完整闭包；未放宽通用 `license-texts.mjs`。EinoExt 缺失的发行根文本通过固定提交、完整原文和摘要登记，额外核对整个根来源记录，伪造 commit/摘要会失败。附加原文按固定来源/许可/摘要组合校验，保留路径越界、缺失、篡改、未知来源/许可等失败；BSL-1.0 只对精确审阅的 Sonic 附加原文开放。法律原文中的换行/注释保持；仅校验标记时剥除法律注释前缀并规范空白，未改写供应文本。

固定 SDK 与生产调用事实：Eino v0.9.22 / `0a5ca53b9d3bf7b661dccc863465ec568a421eea`，Ext model/openai v0.1.13 / `0ebab92e14f26088411dbc440a1ebdc904ccd8a1`，ACL v0.1.18-0.20260924031408-10df7cac3f6d / `10df7cac3f6dc2bdef878540391ba986928f53e0`，底层 fork v0.1.6 / `a92c8d868a5db59bb6e0e40a2230c417edb1bd04`。已回读 `chat/driver.go` 的 `NewChatModel`/`WithTools`/`Stream` 及元数据 `GetModel`、自有 common 循环与装配；Eino 的 compose 等传递包实际进入编译输入，不能因不使用完整 Runner 就删去许可。common/tools 直接消费的 eino-contrib/jsonschema v1.0.3 也已登记。未修改引擎、依赖、模块缓存或合同。

完整根 LICENSE/COPYING/NOTICE、精确 module zip/go.mod checksums、来源和摘要保存在 [21-final-runtime-license-sources.json](logs/21-final-runtime-license-sources.json)；实际目标包/模块列表及所读根全文摘要在 [16-target-closures.json](logs/16-target-closures.json)。缺 root LICENSE 的 Ext 固定 `/LICENSE` 请求真实 404、`/LICENSE-APACHE` 真实 200，完整下载 SHA 为 `69849221bfb90053de2134ef5e6d540287b4b98062326492f1f96f5da685524b`，见 [02-fixed-source-fetch.json](logs/02-fixed-source-fetch.json)。golang-asm tag 经官方 commit 查询固定为 `8d7f1f783b11f9a00f5bcdfcae17f5ac8f22512e`；另一次 YAML tag 查询真实 403 rate limit，未使用浮动回退，也不影响已校验发行内容的读取。生成/检查只读本地原文，不联网抓许可。

新增原文与来源逐项如下（root override 与 supplemental 共 14 文件）：

| 文件 | 许可 / SHA-256 | 固定原始来源 |
|---|---|---|
| `sonic-v1.15.0-LICENSE-Drachennest.txt` | BSL-1.0 / `8d8291caf1cee26d23acf3eb67c9f9a2d58f1c681b16a4fbe8cbfb9e3c0b5a9b` | [固定源](https://github.com/bytedance/sonic/blob/afa2fcee563e04e912786ebd77b53760181fa622/licenses/LICENSE-Drachennest) |
| `sonic-v1.15.0-LICENSE-eisel_lemire.txt` | BSL-1.0 / `cc3a949197f7f066770ae05ced2a2e1dfebb850f5a7587f085dd314bdbbce5c0` | [固定源](https://github.com/bytedance/sonic/blob/afa2fcee563e04e912786ebd77b53760181fa622/licenses/LICENSE-eisel_lemire) |
| `sonic-v1.15.0-LICENSE-golang.txt` | BSD-3-Clause / `4214d8afcc3620b7fb7aa9c7695e8f659a90011a830caf0e0c72a385d7d3b2a5` | [固定源](https://github.com/bytedance/sonic/blob/afa2fcee563e04e912786ebd77b53760181fa622/licenses/LICENSE-golang) |
| `sonic-v1.15.0-LICENSE-golang-asm.txt` | BSD-3-Clause / `4214d8afcc3620b7fb7aa9c7695e8f659a90011a830caf0e0c72a385d7d3b2a5` | [固定源](https://github.com/bytedance/sonic/blob/afa2fcee563e04e912786ebd77b53760181fa622/licenses/LICENSE-golang-asm) |
| `sonic-v1.15.0-LICENSE-yyjson.txt` | MIT / `45e384d3d52c73cba3a64d6e6c25d47cd738cd8a55c30629e3201046eda62947` | [固定源](https://github.com/bytedance/sonic/blob/afa2fcee563e04e912786ebd77b53760181fa622/licenses/LICENSE-yyjson) |
| `sonic-v1.15.0-LICENSE-simdjson.txt` | Apache-2.0 / `1c351ddfc2b959867290106301ba287d0525071630896709f74b3c3a621b0586` | [固定源](https://github.com/bytedance/sonic/blob/afa2fcee563e04e912786ebd77b53760181fa622/licenses/LICENSE-simdjson) |
| `golang-asm-v0.15.1-inferno-1-MIT.txt` | MIT / `27d3a94ff600a1f100136f7743777284c8dccf707606ab07a2e20d032996cb15` | [固定源](https://github.com/twitchyliquid64/golang-asm/blob/8d7f1f783b11f9a00f5bcdfcae17f5ac8f22512e/objabi/autotype.go) |
| `golang-asm-v0.15.1-inferno-2-MIT.txt` | MIT / `bb1458854751422ecfac21563c365bf09d8e3a0838db75ba815c14395cbadb57` | [固定源](https://github.com/twitchyliquid64/golang-asm/blob/8d7f1f783b11f9a00f5bcdfcae17f5ac8f22512e/obj/arm64/a.out.go) |
| `golang-asm-v0.15.1-inferno-3-MIT.txt` | MIT / `7c886985b97808b0ddcda7bcb747fb39b3026dd2d50cd4b3d557c37b629722d2` | [固定源](https://github.com/twitchyliquid64/golang-asm/blob/8d7f1f783b11f9a00f5bcdfcae17f5ac8f22512e/obj/mips/a.out.go) |
| `golang-asm-v0.15.1-inferno-4-MIT.txt` | MIT / `c00b4b59c25a4054fe88a51dd32fc1e4f223f93cf77855ecdb74ebad574b2215` | [固定源](https://github.com/twitchyliquid64/golang-asm/blob/8d7f1f783b11f9a00f5bcdfcae17f5ac8f22512e/obj/riscv/cpu.go) |
| `golang-asm-v0.15.1-inferno-5-MIT.txt` | MIT / `eeecad0dc7d079ac0151c13c7b3cba4f56732c33471f36969f9298ac2e81cbee` | [固定源](https://github.com/twitchyliquid64/golang-asm/blob/8d7f1f783b11f9a00f5bcdfcae17f5ac8f22512e/obj/s390x/asmz.go) |
| `logrus-v1.9.3-atexit-MIT.txt` | MIT / `017f4e6ccc2a628990502e0394691722427f258cd9264246e328c74fb82d7931` | [固定源](https://github.com/sirupsen/logrus/blob/d40e25cd45ed9c6b2b66e6b97573a0413e4c23bd/alt_exit.go) |
| `Apache-2.0-full.txt` | Apache-2.0 / `69849221bfb90053de2134ef5e6d540287b4b98062326492f1f96f5da685524b` | [固定源](https://github.com/cloudwego/eino-ext/blob/0ebab92e14f26088411dbc440a1ebdc904ccd8a1/LICENSE-APACHE) |
| `eino-ext-openai-v0.1.13-LICENSE-APACHE.txt` | Apache-2.0 / `69849221bfb90053de2134ef5e6d540287b4b98062326492f1f96f5da685524b` | [固定源](https://github.com/cloudwego/eino-ext/blob/0ebab92e14f26088411dbc440a1ebdc904ccd8a1/LICENSE-APACHE) |

Sonic 的六份供应声明覆盖 Go/golang-asm BSD、yyjson MIT、simdjson Apache、Drachennest/Eisel-Lemire Boost 原文，并保留 Bolz、Lemire、Yaoyuan、simdjson 作者与 ByteDance 修改署名；并非将完整上游仓库列为独立模块。golang-asm 的真实编译文件含五份原样保留的 Inferno MIT 法律头变体（含格式/年份区别），补齐 Lucent/Forsyth/Vita Nuova/Bruce Ellis/Go Authors；Logrus `alt_exit.go` 补 Miki Tebeka 的完整 MIT 头。YAML 是按文件 **MIT AND Apache-2.0**，保留 LICENSE 和 NOTICE，另附完整 Apache 条款；该通用法律全文来自固定 Ext 提交，不虚称 YAML 实现来源。Eino 未消费的 ADK 模板、gopkg 其他子包、easyjson/parser 和上游测试数据不因位于模块仓库而声明进入产物。两份当前说明已从模型 SDK“仅研究”更新为这些实际采用事实。

唯一 Go 窗口使用固定 `GOTOOLCHAIN=go1.26.10`、`CGO_ENABLED=0`、`GOWORK=off`、空 GOFLAGS/GOEXPERIMENT，以及现有 GOAMD64/GOARM64 合同。最终锁：go.mod `75386c4e53aa851394ed6fa7ae167c0822c530690e4e240b83ace65c97154814`，go.sum `a5547b752487c8ab3e116b95f30d95f460ca58e3a7a0c6487a2a1272f89b3937`。相较 TASK 的旧 mod SHA，仅 093 的既有 jsonschema indirect→direct 分类更新；本票未写锁，版本/sum 未变。先运行 `go mod verify`，然后每目标核 GOVERSION 并执行 `go list -mod=readonly -deps -json ./cmd/huhubot`，实际结果：

| 目标 | 总编译包数（含 std/主模块） | 第三方模块数 |
|---|---:|---:|
| `linux-x64` | 413 | 38 |
| `linux-arm64` | 379 | 34 |
| `darwin-x64` | 411 | 37 |
| `darwin-arm64` | 377 | 33 |
| `win32-x64` | 415 | 39 |

五目标并集 40，不把单机 38、MVS 全表或测试图当最终 union。逐目标命令、环境、exit/Wait 在 [16-commands.json](logs/16-commands.json)；原始 pretty JSON 分别在 `16-<target>-deps.log`。实际 GoFiles/汇编及 embed 文件逐文件 SHA 在 [16-selected-compiled-files.json](logs/16-selected-compiled-files.json)，该清单 SHA 为 `4dc0d39cdecb599ee2ac093bd91f2489ce88aa506817b997a0498ddf59ca4bd2`。`cmd/internal` 非测试生产输入共 156 文件（含内嵌数据）的前后内容相同，树 SHA `c96a0342e32eb83520cbdc48c6a565eefc1df615f428670f11160617f30b96a2`，见 [16-production-before.json](logs/16-production-before.json)；测试/testdata/dist 明确排除，所以未把 092 仍修改的测试误当冻结生产输入。engine.go SHA 为 `40bc23f7c0a719a9d51d2b71a3bd97df9ba62b3bf2e7ec949fc5033e3b398d7f`，与 Root 放行值一致。这里证明目标构建标签选择的真实编译闭包，没有运行五目标 go build 或目标 OS 二进制。

实际验证与失败历史：

| 检查 | 实际结果与原日志 |
|---|---|
| 新三条许可测试，修复前 | 10 pass / 3 fail，真实 Node 进程观察 exit126 / Wait；失败分别是未审阅 Eino、缺 Ext 全文、缺附加声明，[06-node-red.log](logs/06-node-red.log)、JSON 回执保留 |
| 首次实现后 | 12 pass / 1 fail，法律原文的 `included in` 与 `all` 跨行触发过窄标记；[09-node-green-attempt.log](logs/09-node-green-attempt.log) 保留，没有伪造该次 exit 元数据 |
| 局部修正后 | 13/13，实际 exit0 / Wait，[10-node-green.json](logs/10-node-green.json)；只规范校验用空白，原文和 SHA 不改 |
| 无 Go 阶段历史输入复读 | 仅用 093 已捕获 06 日志核 38 模块全文，exit0，无 Go 调用；[11-historical-linux-license-check.json](logs/11-historical-linux-license-check.json)，明确不是最终闭包 |
| 许可/构建工具 | `node --test scripts/license-texts.test.mjs scripts/huhu-bot-build.test.mjs scripts/huhu-bot-notices.test.mjs`，26/26，12/19 两次均 exit0 / Wait；末次 [19-final-node-tools.json](logs/19-final-node-tools.json) |
| 最终五目标闭包/模块校验 | 全部命令 exit0 / Wait，见16系列 |
| `pnpm run notices` | 实际 exit0 / Wait，100 npm / 62 crates / 41 Go runtime/modules，[17-notices-write.json](logs/17-notices-write.json) |
| `pnpm run check:notices` | 实际 exit0 / Wait，同一完整输入生成一致，[18-notices-check.json](logs/18-notices-check.json) |
| `pnpm test:docs` | 内部 ELIFECYCLE exit1，外层实际 exit126 / Wait，精确7项见下一节；[13-docs.log](logs/13-docs.log) 与 JSON 保留 |

末次通知 SHA 为 `04dce87bb9fdb48553ca7e93cd6cf98c27bdb2dcaf73d0ff46da03c9291fa9df`；与 before 相比，Go 节之前的 npm/CSS/Rust 通知逐字节相同。Go runtime 许可的生成正文摘要为 `22975ebe413674bc619428a26e53412013dccffa69e2f27100dbd8d946fde287`。NOTICE 逐字节未变，SHA `8062897bb205f16e5f553360a24583cfe9b85cf60051fa1558233cc37fcd1cee`；main.js/styles.css 也与派发前一致。本票没有新增 NOTICE 横幅输入失效，未运行或声称插件重建；若后续真实源码改编改变 NOTICE，Root 必须安排 main.js 串行重建，不能以 Go-only 豁免。

## 问题与下一步

本票局部许可维护候选已完成，独立审查和正式接纳仍由 Root 负责；T-27 全票继续等待最终全部生产输入与 G5。根 build/lint、五目标资产重建/校验、本机 stdio、远程 CI、真实 Provider/Obsidian/目标 OS 本轮均未运行，不用目标闭包解析替代它们，也不把前轮历史资产当本次新 SDK 的发行证明。

文档门仍有 **原6项 + 新1项**，不能合称原有六锚点：

- 原6项：`inputs/HUHU-Bot_架构审核与工程设计规范_v1.1.md` 的 `#9-工具审批与效果日志`、`#12-数据路径与迁移`、`#14-记忆知识与可扩展能力`、`#15-权限凭证与运行治理`、`#17-验证性能与发布门禁`、`#19-决议未决验证与完成定义` 缺 heading anchor，原日志与归因保留。
- 新1项：`native/huhubot/tests/contract/chat/testdata/claim-fairness/README.md` 是前轮新增测试说明，当前 docs 检查报 `unclassified markdown`。Root 已明确接纳为待维护工程接缝；本任务不扩写集改校验器或夹具。095 两份改动 docs 没有新增 finding。

未来协议/SDK/生产 import 或锁变化会使当前通知闭包需要重新采集；不能复用旧 093 单机图或本次摘要伪造最终全部功能许可门。所有工程产品文件保持停写，Go 窗口已经实际交还；最终交接结构由亲自执行的 return 校验确认，实际命令/exit/Wait 保存在 return-check.log。未提交、推送、发布、归档或操作用户数据。
