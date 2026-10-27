# T-27 当前工程集成切片报告

Session: 20261025T043239Z
Task: 007-build-integration
Status: completed

## 聚焦交接

本轮交回 T-27 当前完整可实施的工程集成切片，构建、许可、CI 和当前规则已落地。五目标交叉构建、严格资产校验与 Linux 真实 stdio/SQLite 生命周期验证通过，未运行的平台与实际操作继续如实保留。构建与通知窗口已经结束，源码 writer 和子进程均已停止。completed 仅表示本次候选交回，T-27 仍需后续生产输入的最终集成，由 Lead 验收并协调下一次总构建。

- 任务：`20261025T043239Z/007-build-integration`；实施者：`/root/build_integration`。
- 工作区：`/home/wta/orca/workspaces/obsidian-huhu/bot`；分支 `NAMEWTA/bot`；HEAD/基线 `33c21e098ef3188cbab5a09f3e0a01fadb787715`，未提交工作副本。
- 记录时间：2026-10-25T05:09:08.565686+00:00。
- 结论：当前可实施工程切片已交付。T-27 仍是长生命周期集成票，本报告不推进 Ticket、Goal 或正式 Evidence，不将未装配功能写成已完成。

## 产物与验证

### 实现

1. `build-huhu-bot.mjs` 固定 `GOTOOLCHAIN=go1.26.10`、CGO 关闭、GOWORK 关闭、GOFLAGS/GOEXPERIMENT 清空和最低目标 CPU；使用 `go build -mod=readonly -trimpath -buildvcs=false`，注入真实 `hap.BuildVersion`。显式五目标、命令参数拒绝无效值；输出仅在已忽略的 `native/huhubot/dist/`，二进制及相邻 SHA-256/JSON 不加入 Git。
2. 每个清单包含目标、版本、工具链、HAP 0.1、DB schema 1、二进制 SHA-256、源码提交和 native/contract 输入树 SHA-256。输入树规范化文本 CRLF、按确定顺序处理并排除 dist，构建前后检查输入未漂移。严格 union 校验拒绝缺/多目标、目标/版本/协议/schema/工具链不符、坏 checksum 与不同源输入。
3. `verify-huhu-bot.mjs` 校验资产后真实启动本机 Runner，使用一次性 HOME、XDG、LOCALAPPDATA 等 OS 数据根和环境 allowlist，经 framed stdio 验证 hello/status、SQLite 文件头、EOF 正常退出、重开同一元数据、保持父 stdin 开启的 shutdown 退出。请求、整个进程和关闭都有期限；输出受界、异常杀进程并清理临时数据。
4. `verify-huhu-bot-architecture.mjs` 解析真实 Go import（含别名、raw string、块和注释），Domain/Application 只允许内层与标准库，禁 SQL/Provider SDK/HAP/Obsidian/runtime/adapter；入站不能直接导入 outbound/SQLite。空扫描失败；fixture 实际创建禁导生产文件。
5. Go notices 在 `go mod verify` 后对五目标逐一运行真实 `go list -mod=readonly -deps -json ./cmd/huhubot`，合并非 test 编译闭包，核对实际模块版本、go.sum 与发行完整文本，拒绝不完整依赖图、替换、未知/限制性许可和缺失全文。完整 LICENSE/COPYING/NOTICE 通过现有生成器保留；需要本地补全文时支持固定 commit+sha sources。未消费研究模块不列分发。
6. 根 package 新增四个脚本；无 npm 依赖变化，pnpm-lock 未变。`check:native` 保持原有 Rust 含义。五目标 Bot CI 与既有 PTY 分开；lint 配置 Go 准备/测试/编译/本机 smoke；Release 依赖三个成功 job，严格收齐两个资产族、Bot 清单与校验和，运行打包 Linux Bot，再写总校验。只修改 workflow，未触发远程 CI。
7. AGENTS、当前架构/数据/开发/来源文档与 dev 规则同步真实底座、OS Profile 例外及工程入口。未增加 Bot UI 或模块注册的当前事实，ui 规则未改；没有修改永久 ADR/context。没有全局插件 build，没有修改 main.js/styles.css。

### 验证与实际结果

| 命令/验证 | 结果 |
|---|---|
| `pnpm test:huhu-bot-tooling` | 0；14/14，包含错误目标、缺参数、checksum/schema/协议、不同源、Windows CRLF、真实禁导、许可与锁错误 |
| `pnpm test:huhu-bot-architecture` | 0；检查4个真实生产 Application/inbound 文件 |
| `pnpm check:huhu-bot` | 0；真实 Go package/contract suite，最后一次 foundation 1.530s；Windows 两行最终修正另由真实交叉编译覆盖 |
| `node scripts/build-huhu-bot.mjs --all` | 0；最终 Windows mutex 修正后重建五目标；每次构建前后源码树一致 |
| `verifyBotAssets(dist, '0.0.1', {sourceTreeHash: sourceTreeHash()})` | 0；五目标、15个文件、同源/兼容/checksum 全部通过 |
| `node scripts/verify-huhu-bot.mjs native/huhubot/dist/huhu-bot-linux-x64` | 0；最终源码构建的真实 SQLite/stdio、EOF、重开、显式 shutdown |
| `node scripts/huhu-bot-notices.mjs` | 0；含 `go mod verify` 与五目标实际编译闭包；5项 runtime/模块完整文本 |
| `pnpm notices` / `pnpm check:notices` | 均0；Lead 授权 TS/Go 静默窗口内，100 npm、62 Rust crates、5 Go runtime/modules；随后仅 Windows mutex 源码两行改变，许可图无变化 |
| `pnpm test:license-texts` | 0；3/3，完整声明、限制性表达式、固定版本/commit/hash 本地文本 |
| `pnpm exec vitest run test/release/release-artifacts.test.ts` | 0；7/7，既有 PTY/插件发行合同保留 |
| yaml parse：lint / huhu-bot / release workflow | 0；三个文件都解析为 jobs 配置 |
| `git diff --check -- AGENTS.md docs .agents/skills package.json scripts .github THIRD-PARTY-NOTICES.md` | 0 |
| `git check-ignore native/huhubot/dist/huhu-bot-linux-x64` | 0；确认产物忽略 |
| `pnpm test:docs` | 非0；仅原始 inputs 的6个既有 heading anchor 错误，新增当前文档/规则引用未报错，见下文 |

首次真实 smoke 暴露 Runner `service.shutdown` 返回 accepted 后在父 stdin 保持开启时不退出；向 Go owner 返回确定故障。Go owner 改为独立 reader+生命周期 select 并增加 CLI 回归，随后本脚本多次通过。冻结结束时 Go owner 又修正 Windows mutex 的 owned-thread 风险，本工程切片已重建全部五目标，保留旧树 hash `c656533c5e84c1b869aecab1367173dd6c0baf3b8e9f69ae8ee1596916d1d081` 仅作历史输入。

最终统一输入树：`472e28f3822fc426e289319ef31cb725d850edfbc8b83c20c044ee960e0fd51d`。源码提交为未提交工作副本所在 HEAD，清单同时记录树 hash，不将 HEAD 单独当作这些新源码的提交证明。

| 最终忽略资产 | SHA-256 |
|---|---|
| `huhu-bot-darwin-arm64` | `7aeaa87b3ae33beffb1edefe19155fa1a84a14d2ffa1676e25bc7e64086c6b28` |
| `huhu-bot-darwin-x64` | `6ea8cb5e9851c1247b9470080dbb68e2cbe373890a41c7d4e714208e8429193b` |
| `huhu-bot-linux-arm64` | `5f882c2328b8314f8bb0433ce9b7906a726c9eb11884e8249b90a0189fe48a3e` |
| `huhu-bot-linux-x64` | `c2b186aa268b40c0e1c558d2efcb9a846f024b38a3257e6f86b28a2192bac309` |
| `huhu-bot-win32-x64.exe` | `d971e9eb67f577ba044934e292b933d3b801eb590baba97ae4f31a8ade1812ac` |

`pnpm test:docs` 的原始输入路径为 `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/inputs/HUHU-Bot_架构审核与工程设计规范_v1.1.md`，缺失锚点为 `#9-工具审批与效果日志`、`#12-数据路径与迁移`、`#14-记忆知识与可扩展能力`、`#15-权限凭证与运行治理`、`#17-验证性能与发布门禁`、`#19-决议未决验证与完成定义`。该历史输入不在本任务写集，未修改、未屏蔽检查；已报告 Lead。

### 当前依赖与许可输入

只分发 Go runtime/stdlib（go1.26.10，BSD-3-Clause）、ncruces/go-sqlite3 v0.35.6（MIT）、go-sqlite3-wasm/v6 v6.3.35304（MIT-0）、julianday v1.0.0（MIT）与 x/sys v0.48.0（BSD-3-Clause）。全文来自本地校验过的发行缓存，未必要补副本；未添加候选 Eino/模型 SDK/keyring 声明。最终生产依赖扩张后必须重算，不复用本次闭包宣称最终全部许可覆盖。

[Go build 官方文档](https://pkg.go.dev/cmd/go#hdr-Compile_packages_and_dependencies)核对 `-mod=readonly`/`-trimpath` 等合同；[actions/setup-go 官方 README](https://github.com/actions/setup-go)核对固定版本和子目录 `cache-dependency-path`，使用 v6，不顺手升级其余 Actions。CI 机制复用现有 PTY 五目标架构，未复制第三方工程实现。

### 最终生产/规则与关键输入摘要

| 路径 | SHA-256 |
|---|---|
| `AGENTS.md` | `50db128fbe7d1807a8147291fb25ae4d8cab3866bc3d772bf4857af5a36311ef` |
| `.agents/skills/dev/SKILL.md` | `5df9ccddd677ad4cea397a31e7e668d97b125e8ae26b3c72c38d791be9066293` |
| `.agents/skills/dev/references/architecture.md` | `6f64334012acc1cb213bfa72fdc7bf214e96e07d0c2c9738b26c9ffebc420ce0` |
| `.agents/skills/dev/references/build-and-release.md` | `988f020ccd84625c6da05c455a28ba05c704c6084191156f61c446d582e98871` |
| `.agents/skills/dev/references/licensing.md` | `09d2969a169b9abe7392acc94d0d7be8050bbb56cd22e6560fce75d8d8a60e14` |
| `.agents/skills/dev/references/testing.md` | `1f7c35977291cb15b9e4e0841ca2c7f7b1406daa564b6ef0814e6945131ff65b` |
| `docs/architecture.md` | `d8fdedc826b17e0b4ef7deaaf4d3efcc4ffdb8b8b85ad9ed75bb6644a9370e0b` |
| `docs/data.md` | `08dfc229b2e73755a589e95e313d4dce8b6c1da4be756b455b88cfe5adab2d8e` |
| `docs/development.md` | `482f28313b1f1262b3c553b43f78249158e5f26b5e2cc764107bd0f0deafbd7d` |
| `docs/references.md` | `ed94067977c57e173dfa77ea99d6adba139f20758e487572311a100529ce0d7e` |
| `docs/third-party/huhu-bot.md` | `34c2070083d0477751866230c0f8514a869e10d675e746498247f4cf0f7ad7ae` |
| `package.json` | `90ff5ecf0177657372619ae3c86cbf5ce9f5db246483b9d617854d67750793c4` |
| `.github/workflows/lint.yml` | `2793335ba5041a4173b638999895dd727244b7272f966c0fee2acc47332b52e0` |
| `.github/workflows/huhu-bot.yml` | `b81d11884407641a376830eba1203654aee1195c0eb50fa3b049f000c99e8400` |
| `.github/workflows/release.yml` | `116377e8a633818c79657f8f4870109cd063cd4061a3918f5caf73dab1505a07` |
| `scripts/build-huhu-bot.mjs` | `7ec2e49cbdef9c1015dfdbdf95e69312e01396f918ce1f2655cb39770a176cdd` |
| `scripts/verify-huhu-bot.mjs` | `c251cd0fca6539e812569bae69191e48764b324260dc43973c25616e34366c5c` |
| `scripts/verify-huhu-bot-architecture.mjs` | `732a4669e7ed9bf5bb14cd21d8195761114aad4c937ea035e364ffe7d69c8215` |
| `scripts/huhu-bot-notices.mjs` | `92ed5e0af404f284843e9c5e83c4e3002e3271df2670a4afee08bf16fb472ee6` |
| `scripts/huhu-bot-build.test.mjs` | `beb5f9769831e0c99cab7c5ded8f56f6400610fc9b5b705e00406c3cf75229e8` |
| `scripts/huhu-bot-notices.test.mjs` | `6896387b3177ea36a68cf99427eb2620b5c83ccb8bcc66e05132377d6c71e36c` |
| `scripts/third-party-notices.mjs` | `087064974dbc7a736e2cc214c8c315382483a5d92c18ab007ea6fe6c6bba7eac` |
| `scripts/verify-release-artifacts.mjs` | `610c03fd820ba2eec732c06b84d4208f8423a3bac138975b699c6ccec58ca17f` |
| `THIRD-PARTY-NOTICES.md` | `0c8b5f5ba6d58c07192624482ae37fd006f3ac55c4af4da0103dabf2c3020d0f` |
| `native/huhubot/go.mod` | `3ba43da9ce2f2128c2012d274d2d63392fbeafc25d13bd3258e3365d9103933b` |
| `native/huhubot/go.sum` | `1c56a6c76cc5865731da3d5ae0aa6efc9ce69a7c2998fa1e55b7c73c88ec0df6` |
| `contracts/hap/v0.1/schema.json` | `af806e4eadef208b717552a95edb0d62a10db5f4a12a987e3088c4368fb2683b` |
| `contracts/hap/v0.1/methods.json` | `150bccfd07f3eb70ec18a57090bfbe307a3f584ca4e1f3d31d55dc1da26d21cc` |

## 问题与下一步

- 等待后续生产切片/模块/依赖最终输入冻结，再重算依赖许可与总 build、包体、i18n、styles、最终代码审查。T-27 不能在此阶段标 done。
- 未运行 macOS、Windows、Linux arm64 原生进程，未运行真实 TLS/Provider、OS 凭证服务、Obsidian/移动设备或真实用户操作；交叉编译不是这些结果。用户 LOG-051 自验真实操作，本轮代码自动验收不因它们阻塞。
- 未触发远程 CI、未提交、推送、升版本、发布或归档。
- main.js/styles.css 未重建；Lead 后续协调完整插件构建窗口。当前 Bot TS 尚未通过模块注册进入插件bundle，未改预算或样式输入。
- dev SKILL 与4份参考新摘要见下表，已发 Lead；Lead 负责重绑受影响 Ticket，实施者未写状态/Evidence/票据。
- 本轮所有子进程均已终止，smoke 数据已清理。ignored dist 保留可回读构建产物。报告落盘后停止 writer。
