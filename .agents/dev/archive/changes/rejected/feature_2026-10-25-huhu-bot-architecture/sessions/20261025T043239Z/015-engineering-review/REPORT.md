# T-27 当前工程切片独立双轴审查

Session: 20261025T043239Z
Task: 015-engineering-review
Status: completed

## 聚焦交接

本次是未参与实现的 `native:/root/engineering_review` 对 T-27 工程切片的独立审查。仅写本 REPORT 与本目录原始 probe 日志，未修复、提交、发布、再派遣或改变审查范围。两轴均为 `request-changes`；各有一项 P1，指向同一许可覆盖缺口，不能把检查命令绿色解释为完整许可通过。

输入为 `evidence/T-27.md#review-input-slice1`，Input-SHA256 为 `966f23bd32e06457d342aef13ef0ca431d22b92a7ed941c0a8794c5f7aadc1f9`。实际工作副本的 31 文件、字节/模式、HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`、index 摘要及 16 个规范/标准/指令来源均核验一致。范围外的 T-01 产品代码只用于追踪消费者与真实构建输入，不替代 014 的审查。Map revision 7、LOG-051 的代码验收边界已读取；未来生产切片未完成不构成本次工程切片 finding。

来源发现：未提交工作副本没有待审 commit log/Issue 引用；明确 Spec、ARCHITECTURE、ADR、T-27、Map 与 Goal 已找到。当前 docs/architecture、data、development、references 与第三方依赖说明均已核对。适用工程标准为根 AGENTS、dev 及 architecture/testing/build-and-release/licensing 参考、ESLint/package/锁文件/CI；没有额外 CONTRIBUTING 或 CODING_STANDARDS，现存 CLAUDE 仅转引 AGENTS。已应用 code-review 的来源发现、工作副本冻结、Fowler、风险、错误、测试可靠性及双轴证据合同。无 UI 实现变化，不以 UI Skill 或原型验收替代工程审查。

## 产物与验证

- `input-initial.log` / `input-final.log`：输入对象摘要、31 文件快照、16 来源、HEAD/index 重验；审查结束仍固定。
- `asset-probes.log`：真实 15 文件完整集合通过；在临时副本删除目标、损坏 binary checksum、混入源树摘要、改错平台字段均被拒绝。另用 `go version -m` 读取五个实际二进制，核对 Go 1.26.10、CGO=0、GOOS/GOARCH、trimpath 与真实模块版本，非仅信任 sidecar。
- `rebuild-pinned-offline.log`：从未改动源码向临时目录重新构建全部五目标，GOPROXY/GOSUMDB 关闭且 PATH 指向已安装固定 Go 工具链，五个 SHA-256 均与当前 dist 一致。原始 `rebuild-offline.log` 保留第一次仅关闭 GOSUMDB 后 bootstrap Go 拒绝校验工具链的环境失败；未将它计作产品失败，也未伪造该次通过。
- 当前资产源树仅对应 `d45b91db73e8940485e865480eed9d45976c1280f0f7ba02d4306cd8f2a79f39`。Lead 告知后续 Go 修复尚未开始；本报告不认证修复后产物，后续源码变化须重建。
- `native-smoke.log`：本机 Linux x64 真实 framed stdio、hello/status、SQLite 文件、元数据重开、EOF 关闭与父 stdin 保持开启的显式 shutdown 通过；临时数据与子进程已清理。
- `architecture-cli-probes.log`：实际 CLI 在外部临时 fixture 接纳合法内层 import，拒绝 SQL 和 SDK import。并人工核对脚本被 test:all 接入及当前生产路径匹配，不以辅助函数单测替代真实入口。
- `notices-check.log`：实际 esbuild/Go/cargo 闭包的 `third-party-notices --check` 返回 0，100 npm / 62 Rust / 7 Go runtime/modules。独立重读五目标 Go 非测试图、go.mod/go.sum、module cache 与 `go mod verify`；AJV 虽为精确根依赖，目前不在实际 main.js 闭包，未误报分发；regexp2 及未采用模型 SDK 未纳入。
- `upstream-notice-probe.log`：两份 metaschema/CLDR 文本与官方固定来源逐字节一致；JSON Schema 固定 README 的许可选择与 CLDR 32 编译表对应。另独立追踪已链接 SQLite 翻译物至 wasm2go/libc-gen，发现下述缺口。
- `tooling-tests.log`：现有工具测试 17/17 通过；其绿色不覆盖下面通过独立上游与 binary probe 发现的问题。
- CI 静态核对：release 同 SHA 依赖 checks/terminal/bot，分别收集五目标 PTY 与 Bot，不混淆旧 PTY 合同；Bot 目标为原生 runner 并执行 stdio smoke。普通插件 build 不装入 Bot 业务入口，manifest 移动端边界未改变。未运行远程 CI、macOS/Windows/Linux arm64 原生执行、TLS/凭证/模型或 Obsidian 操作；这些仅保留用户后续待验，不宣称支持矩阵已通过。root 的完整 build/lint 结果只作背景，未冒充本 reviewer 执行。

<a id="standards-output"></a>

## standards

Reviewer: native:/root/engineering_review
Axis: standards
Result: request-changes
Input-SHA256: 966f23bd32e06457d342aef13ef0ca431d22b92a7ed941c0a8794c5f7aadc1f9
Observed: 独立核对全部 31 文件工作副本、16 来源与真实构建/许可消费者；五目标重建和本机 smoke 通过，但真实已链接的翻译代码未得到完整原始许可覆盖。

**STD-01 — P1：补齐实际链接的 wasm2go/libc-gen TLSF 代码的 MIT 原始声明。**

位置：`scripts/huhu-bot-notices.mjs:12`、`:20`、`:38`；生成后果为 `THIRD-PARTY-NOTICES.md:15162`；错误覆盖描述为 `docs/third-party/huhu-bot.md:3`。

可达条件与证据：当前生产 SQLite 驱动实际导入 `go-sqlite3-wasm/v6 v6.3.35304`。其官方固定提交 [`d923b9…/README.md`](https://github.com/ncruces/go-sqlite3-wasm/blob/d923b955a175c983578bd2196ce9ac0511f6159d/README.md) 明确区分机器翻译代码保留原许可与其余 MIT-0；同提交 [`build/main.c`](https://github.com/ncruces/go-sqlite3-wasm/blob/d923b955a175c983578bd2196ce9ac0511f6159d/build/main.c) 引入 `libc.c` / `malloc_tlsf.c`，`build/build.sh` 先由 libc-gen 输出这些 C 文件再翻译，`go.mod` 固定 wasm2go v0.4.15。该版本固定提交 [`c0a4be…/libc-gen/c/malloc_tlsf.c`](https://github.com/ncruces/wasm2go/blob/c0a4be49ed2521303a8b47a8ccbe974da0444762/libc-gen/c/malloc_tlsf.c) 受该仓库 [MIT LICENSE](https://github.com/ncruces/wasm2go/blob/c0a4be49ed2521303a8b47a8ccbe974da0444762/LICENSE) 覆盖。实际 Linux binary 的 `go tool nm` 含 `_malloc`、`_tlsf_add_pool`、`_tlsf_find_free_block` 等符号，证明这是已分发代码而不只是未链接构建工具。

当前生成器仅按 Go module 根 LICENSE 将整个翻译模块记作 MIT-0，补充表只列 JSON Schema 与 CLDR；完整 wasm2go MIT 文本在 notices 中不存在，顶层 `check:notices` 却返回 0。故模块闭包一致性并未保证翻译输入的原始许可完整，发行会缺这一实际包含材料的完整声明。这里不要求把 x/tools 等所有构建工具当运行依赖添加。

依据：dev `references/licensing.md` 的实际分发第三方代码必须具备适用许可及完整声明、不能仅依据模块根许可推定覆盖。此为硬性来源/许可覆盖问题，不是 Fowler 风格建议。

满足条件：对该精确 wasm 模块版本追踪实际译入的 libc/TLSF 输入，为对应 MIT 原文保存固定提交与摘要并纳入生成通知；或提供覆盖这份精确生成代码的明确再许可证据。生成器需在该必需原文缺失/篡改时失败，重新生成 notices 和受影响产物；回读最终 binary 仍包含的译入代码与声明。若同时澄清 SQLite public-domain 本体与 MIT-0 glue 的界限，应以实际译入材料为准，不扩大到未消费扩展。

其余已检查构建固定版本、readonly/trimpath/CGO、目标清单/checksum/同源检查、原生 smoke 生命周期、CI 收集、默认插件边界、当前工程规则同步未发现另一可证实阻断项。该结论限于当前切片，不认证未来接入后的闭包。

<a id="specification-output"></a>

## specification

Reviewer: native:/root/engineering_review
Axis: specification
Result: request-changes
Input-SHA256: 966f23bd32e06457d342aef13ef0ca431d22b92a7ed941c0a8794c5f7aadc1f9
Observed: 按 T-27 当前工程切片、Spec S9/AC-043/044/055、ADR-016 与 LOG-051 分别检查；代码层构建/目标/兼容接缝有实证，许可合同仍有一项未满足，不将用户后续现场验收当作本轮代码审查失败。

**SPEC-01 — P1：T-27 对实际传递与翻译源码的完整许可合同未完成。**

位置：`scripts/huhu-bot-notices.mjs:12`、`:20`、`:38`；`THIRD-PARTY-NOTICES.md:15162`；`docs/third-party/huhu-bot.md:3`。

具体失效：T-27「有序实施步骤 2」要求按最终依赖/build tags 扫传递许可和源码改编，生成通知含完整许可；其失败验收要求缺必需 LICENSE 明确失败。当前以真实 production binary 为输入可观察到 TLSF allocator 已链接，而 notices 只给 go-sqlite3-wasm 根 MIT-0，缺其翻译来源 wasm2go/libc-gen 的 MIT 原文，实际 `third-party-notices --check` 仍成功。固定源码链为 go-sqlite3-wasm `d923b955a175c983578bd2196ce9ac0511f6159d` 的 README、build/main.c、build/build.sh、go.mod → wasm2go v0.4.15 / `c0a4be49ed2521303a8b47a8ccbe974da0444762` 的 libc-gen/c/malloc_tlsf.c 与 MIT LICENSE → 当前 binary 的 `_tlsf_*` 符号；完整字节与来源核验在 `upstream-notice-probe.log`。这使 Spec S9 的发布资产/许可与 ADR-016 的源码来源验证在当前切片仍不完整。

影响：后续发布流程会把这份不完整的生成通知作为绿色输入分发。现有工具测试、Go module checksum 和编译成功不能满足该合同，也不能因 wasm2go 不在 `go list` module graph 就忽略已经译入的实质代码。

满足条件：为该精确生成物补充适用原始许可，或取得明确覆盖的再许可证据；以固定来源/摘要保存并生成完整声明，补缺失/篡改失败反例，重算最终 notices/产物，独立复核实际翻译闭包。不要将未使用的构建工具或扩展误列为运行依赖。

已满足的局部接缝：五目标资产可从冻结源码重建、版本/目标/HAP/schema/source/hash 字段及完整集合能拒绝实际坏输入；release 实际接入全部 Bot 资产并保留 PTY；内层 SQL/SDK 约束 CLI 可失败；文档明确交叉编译与平台实测的区别。T-20 的安装器、未来 Engine 与最终生产装配不属本次已实施切片；T-27 不得凭本次局部结果提前 done。真实平台、TLS/凭证、模型与 Obsidian 操作保持用户后续待验。

## 问题与下一步

Lead 应将上述许可缺口交 T-27 owner 修复，冻结新输入后复审受影响闭包。当前源树与资产的正向证据在后续 Go 修复后只能作为历史记录，须重建和重验受影响项。没有发现需要改变用户产品决定的新增问题；无需请求用户重复授权。审查已结束，未保留运行中的 probe 或临时构建数据。
