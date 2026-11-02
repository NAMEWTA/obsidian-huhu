# T-27 validator 运行依赖与许可接纳回报

Session: 20261025T043239Z
Task: 013-validator-dependencies
Status: completed

## 聚焦交接

已安装并锁定精确 runtime 依赖 `ajv 8.20.0`、`ajv-formats 3.0.1`，完成后立即通知 TS owner 恢复依赖测试。Go 实际新增闭包的 `jsonschema/v6 v6.0.3` 与 `x/text v0.42.0` 已按精确版本接纳，除模块根许可，还保留内嵌 JSON Schema metaschema 和 CLDR 32 数据的完整附加声明。Lead 收齐 Go/TS 冻结确认后开放的一次工程窗口已完成：notices 生成/检查、同源五目标构建、严格资产校验和 Linux 本机 stdio smoke 全部退出 0。当前工程 writer 与子进程已停止；completed 仅表示本 TASK 候选交回，新增许可文本与来源仍需独立工程审查，T-27 仍未 done。

## 产物与验证

### 修改范围与依赖

- 只写 package/lock、Go notices 脚本及其既有测试、`docs/third-party/huhu-bot.md`、两份必要的固定许可原文，以及获准窗口中的根 notices；没有修改 Go go.mod/go.sum（由 foundation_go 唯一拥有）、TS、schema、生成器、eslint、dev/UI 规则或正式状态/Evidence。
- `pnpm add --save-exact ajv@8.20.0 ajv-formats@3.0.1` 退出 0（18.2s）；[install.log](install.log)。安装完成即时通知 `/root/foundation_client` 与 Lead，TS owner 随后继续验证。
- 回读根 package 的 dependencies 和 Node 实际解析版本，分别为 `8.20.0`、`3.0.1`，均无范围前缀。lock 只新增两个 importer、对应精确包及 snapshot，沿用已有 fast-deep-equal、fast-uri、json-schema-traverse 和 require-from-string 版本，没有升级旧传递依赖。
- AJV npm integrity：`sha512-Thbli+OlOj+iMPYFBVBfJ3OmCAnaSyNn4M1vz9T6Gka5Jt9ba/HIR56joy65tY6kx/FCF5VXNB819Y7/GUrBGA==`；formats：`sha512-8iUql50EUR+uUcdRQ3HDqa6EVyo3docL8g5WJ3FNcWmu62IbkGUue/pEyLBW8VGKKucTPgqeks4fIU1DA4yowQ==`。两者 MIT 原文见各自固定 [AJV LICENSE](https://github.com/ajv-validator/ajv/blob/v8.20.0/LICENSE)、[formats LICENSE](https://github.com/ajv-validator/ajv-formats/blob/v3.0.1/LICENSE)；[官方 AJV release](https://github.com/ajv-validator/ajv/releases/tag/v8.20.0) 为 2026-04-24。TS owner 提供来源后，本 TASK 核对实际安装内容和 lock integrity。
- Bot 模块尚未注册进入插件 bundle，故未将这些根 npm dependencies 伪列为 `main.js` 已分发内容；当前生成结果仍为 100 npm 包。后续真正进入 bundle 时须按实际 esbuild 闭包和内嵌 refs/metaschema 继续核对完整声明，不能拿本次未打包状态当作最终 npm 许可结论。

### Go 许可与完整来源

Go owner 回告依赖图稳定后，只读 `go.mod` / `go.sum` 并执行 `go mod verify`、五目标真实非测试 `go list -mod=readonly -deps -json ./cmd/huhubot`。实际闭包为 Go 运行时、四个原 SQLite/OS 模块和两个新增模块，共 7 项；[go-runtime-inventory.json](go-runtime-inventory.json) 保存实际版本、根许可、选定条款及补充来源。`regexp2` 仅在上游测试使用，不在产品 import graph，未列分发。

| 材料 | 精确来源与选择 |
|---|---|
| jsonschema/v6 v6.0.3 | Go 发行元数据指向提交 `b0fc661f4939578bc429f408c18202573dbafcc4`，2026-06-28；模块 hash `h1:1EYB5IzjZawrrnELUi78f9fPu57HuXjmddZPjrls/28=`。保留其完整 Apache-2.0 LICENSE；[官方固定源](https://github.com/santhosh-tekuri/jsonschema/blob/b0fc661f4939578bc429f408c18202573dbafcc4/LICENSE)。 |
| x/text v0.42.0 | 实际锁定版本为 v0.42.0，固定提交 `fafe4a06967e06550e69ee42787d9902845d2a3f`；完整 BSD-3-Clause LICENSE 来自实际发行缓存，[官方固定源](https://github.com/golang/text/blob/fafe4a06967e06550e69ee42787d9902845d2a3f/LICENSE)。 |
| jsonschema 内嵌 metaschemas | 实际 `loader.go` 通过 `go:embed metaschemas` 包含数据；JSON Schema 官方固定 [README](https://github.com/json-schema-org/json-schema-spec/blob/ce9738c9064662ec791fcb13f56b5cab5b3bc450/README.md#license)明确提供 BSD-3-Clause OR AFL-3.0。选择 BSD-3-Clause，完整 [LICENSE](https://github.com/json-schema-org/json-schema-spec/blob/ce9738c9064662ec791fcb13f56b5cab5b3bc450/LICENSE)连同另一选择原文保存到 `docs/third-party/licenses/go/json-schema-spec-LICENSE.txt`。 |
| x/text 内嵌 CLDR 32 表 | 实际编译路径包括 language、internal/language、internal/language/compact、feature/plural 和 internal/number，各生成表标注 CLDRVersion 32，见 [runtime-package-paths.log](runtime-package-paths.log)。保留匹配 release-32 提交 `5dfac9269ed58eeaeddd6ca887bdc7eb43a481fd` 的 [unicode-license.txt](https://github.com/unicode-org/cldr/blob/5dfac9269ed58eeaeddd6ca887bdc7eb43a481fd/unicode-license.txt)，即 Unicode-DFS-2016；标识另核对 [SPDX 官方条目](https://spdx.org/licenses/Unicode-DFS-2016.html)。未将旧数据替换为不同版本许可标签，未引入未消费的 CLDR 工具许可。 |

两份补充原文在 Go notices 中按精确模块版本、固定 40 位 commit 和 SHA-256 登记。根许可继续走现有严格 SPDX 策略；补充条款只接纳明确审阅的 BSD-3-Clause 与 Unicode-DFS-2016，并校验完整原文标记、固定 hash、路径边界和非空内容。没有放宽未知或限制性许可，没有联网生成通知；这部分及原文/来源必须交独立工程审查，而非由测试 0 替代独立结论。

### 实际命令与结果

| 命令/行为 | 结果与原始产物 |
|---|---|
| 安装命令及 Node 实际版本解析 | 0；见安装日志及上文固定版本 |
| `node --test scripts/huhu-bot-notices.test.mjs scripts/license-texts.test.mjs` | 0，10/10；新增精确 validator 版本、实际补充声明、缺失/篡改/未 pin/越界/限制性反例 |
| `pnpm test:huhu-bot-tooling` | 0，17/17；[tooling-tests.log](tooling-tests.log) |
| `node scripts/huhu-bot-notices.mjs` / 实际 Go inventory | 0；7 项 runtime/模块，五个编译目标；含 `go mod verify` 和完整文本校验 |
| `pnpm notices` | 0；[notices-write.log](notices-write.log)，100 npm、62 crates、7 Go runtime/modules |
| `pnpm check:notices` | 0；[notices-check.log](notices-check.log)，内容与生成结果完全一致 |
| `node scripts/build-huhu-bot.mjs --all` | 0；[build-all.log](build-all.log)，冻结输入上的五目标，固定 go1.26.10/CGO0/readonly/trimpath |
| 严格 `verifyBotAssets` 与当前 `sourceTreeHash()` 对照 | 0；[asset-verification.json](asset-verification.json)，15 文件、目标/版本/协议/schema/checksum、同源全部一致 |
| `node scripts/verify-huhu-bot.mjs native/huhubot/dist/huhu-bot-linux-x64` | 0；[native-smoke.log](native-smoke.log)，真实 SQLite 重开、EOF、保持父 stdin 开启的 shutdown |
| `git diff --check`（本次 package/lock/notices/script/docs 写集） | 0 |

最终 Go/native+contract 冻结树：`d45b91db73e8940485e865480eed9d45976c1280f0f7ba02d4306cd8f2a79f39`；版本 0.0.1，HAP 0.1、DB schema 1，HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715` 上的未提交工作副本。树 hash 记录真实输入，HEAD 不是这些新代码已经提交的证明。ignored dist 资产保留供回读：

| 资产 | SHA-256 |
|---|---|
| `huhu-bot-linux-x64` | `886f707a19eeaca9f4fc22844dfb25834802aef0df67c50cf4ac4744b995d1a7` |
| `huhu-bot-linux-arm64` | `3080fee8bae804a5ca759141d8b75218bb52ccc0d4bd1f9c70de9347ab557c37` |
| `huhu-bot-darwin-x64` | `24f5fb76818011d3cd250641166424e9ed708368987a7a396a2b55a96aab252e` |
| `huhu-bot-darwin-arm64` | `cb233e17ab84b4f71b2259317cf544572febd622b00a883ca2eb9d1f7e17fde7` |
| `huhu-bot-win32-x64.exe` | `40739969b6553569e960ab19454aa0b3f19cc74032e87a1009a9bf9e1074cc10` |

### 当前冻结摘要

| 输入/产物 | SHA-256 |
|---|---|
| `package.json` | `25650222887420d856cba94e415b62b1d52dfdd0d9cf604c46b747ad8ab0e8b1` |
| `pnpm-lock.yaml` | `3a6f346a93c1666858d21f16ea87933c4fe07c3ed771fda00a43a949e5a1a934` |
| `scripts/huhu-bot-notices.mjs` | `050dd08fd7c77db9a3e3b3d43997c6548a3da3803daecaad289b6332cb4b989d` |
| `scripts/huhu-bot-notices.test.mjs` | `924e25f08b3ffd3e9bcbead0392aa706a86c82e7c5ee5f76aea259bb45b85271` |
| `docs/third-party/huhu-bot.md` | `6dcc6c2fa6de16ac21105f85b10258466edfd01c8d46e7ee6f61709f91180a72` |
| `docs/third-party/licenses/go/cldr-32-unicode-license.txt` | `6a6976a5da6ac21a6a001c685c057f4a6e619be11f5465371088ecd80c7fbe06` |
| `docs/third-party/licenses/go/json-schema-spec-LICENSE.txt` | `909b25a80d4945b21d3adb2fb17f90bf592e0274bdf117c069c088a8e44dc7b6` |
| `THIRD-PARTY-NOTICES.md` | `4caced6b073b81d2bc311943185359b77e19535b9cff1b1226262fd6f72abbcf` |
| `native/huhubot/go.mod` | `25a59108c56bfdb488a13d32a7c23d20d5901ce83009cc527d24f58649e92895` |
| `native/huhubot/go.sum` | `6069deb819b9c19723efadac8b36e41de846adcd4e6064cd689960d844ecb7ce` |

## 问题与下一步

本次安装、许可准备与获准工程窗口无未解决失败；生产 writer 和子进程已停止。接下来由 Lead 对本 TASK 的脚本、锁文件、完整许可来源与生成通知组织独立工程审查，并运行 full build/lint；本 TASK 没有重写规则、源合同或代替这些待审结论。后续有实际生产/依赖变化才重算失效闭包，T-27 仍等待最终全部生产切片集成。

未运行其他四目标的原生进程、真实 TLS/模型/凭证服务、Obsidian/移动设备及用户操作；交叉编译不代表这些已通过，LOG-051 的真实操作由用户验收。未提交、推送、升版本、发布或触发远程 CI。main.js/styles.css 未在本 TASK 修改，root 的后续受控全局构建另由 Lead 留证。
