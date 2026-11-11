# T-27 翻译来源许可修复回报

Session: 20261025T043239Z
Task: 022-translated-license-repair
Status: completed

## 聚焦交接

已按 015 两轴 P1 追踪实际链接的 SQLite 翻译输入，补齐 wasm2go/libc-gen 的 MIT 完整原文和精确版本附加声明。先用真实固定上游全文建立遗漏红灯，再补登记及来源/版本/许可/摘要约束，定向许可测试与完整工具测试均通过。Lead 收齐 Go016/TS017 冻结后的一次工程窗口已完成：生成/校验通知、五目标同源构建、严格 15 文件资产校验、Linux stdio smoke 及新 binary TLSF 符号回读全部通过。最后经 Lead 单独授权，仅将新测试期望文本的 CRLF 归一化后 trim，受影响测试再次通过；全部 writer/子进程已停止，本报告仅交候选，等待独立工程补审，T-27 仍未 done。

## 产物与验证

### 审查发现与固定来源复核

完整回读 015 REPORT、`upstream-notice-probe.log` 和原 013 REPORT，保留原 `request-changes` 与缺许可的失败事实，不改写历史证据。本 TASK 另行从官方固定提交下载并与本地 module cache 逐字节比较，原始记录在 [upstream-source-chain.log](upstream-source-chain.log)。

- 当前实际运行模块 `github.com/ncruces/go-sqlite3-wasm/v6 v6.3.35304` 对应提交 `d923b955a175c983578bd2196ce9ac0511f6159d`。固定 [README](https://github.com/ncruces/go-sqlite3-wasm/blob/d923b955a175c983578bd2196ce9ac0511f6159d/README.md)明确机器翻译保留原作者与原许可，其余部分才由 MIT-0 覆盖。
- 同提交 [go.mod](https://github.com/ncruces/go-sqlite3-wasm/blob/d923b955a175c983578bd2196ce9ac0511f6159d/go.mod)固定 `wasm2go v0.4.15`；[build/main.c](https://github.com/ncruces/go-sqlite3-wasm/blob/d923b955a175c983578bd2196ce9ac0511f6159d/build/main.c)引入 `libc.c` / `malloc_tlsf.c`，[build/build.sh](https://github.com/ncruces/go-sqlite3-wasm/blob/d923b955a175c983578bd2196ce9ac0511f6159d/build/build.sh)先生成 libc C 输入，再由 libc-gen/wasm2go 翻译进 `libc.go` / `sqlite3.go`。这四份文件的官方固定源与实际发行 cache 字节均一致。
- wasm2go v0.4.15 对应提交 `c0a4be49ed2521303a8b47a8ccbe974da0444762`。分别下载其 [libc.c](https://github.com/ncruces/wasm2go/blob/c0a4be49ed2521303a8b47a8ccbe974da0444762/libc-gen/c/libc.c)、[malloc_tlsf.c](https://github.com/ncruces/wasm2go/blob/c0a4be49ed2521303a8b47a8ccbe974da0444762/libc-gen/c/malloc_tlsf.c)与 [MIT LICENSE](https://github.com/ncruces/wasm2go/blob/c0a4be49ed2521303a8b47a8ccbe974da0444762/LICENSE)。C 输入 SHA-256 分别为 `c684f0ed0e66ab89d08cd600947b9109d17bd04fbc0dab0d5d9573d955716249` 与 `5a1ab9903c036389e783889ccf7d1b781a2f78308d8d30ece6795f9a5e4b4a45`。
- 完整 MIT 原文为 1068 字节，SHA-256 `13b7919ffbff20b54d133748a783ade8b3ecb1810144194aad70928070f2c0df`，版权为 2026 Nuno Cruces。保存为 `docs/third-party/licenses/go/wasm2go-v0.4.15-MIT.txt`，未改变原始字节；原 notices 的完整文本匹配为 false，新通知为 true。
- 实际发行 cache 的 `sqlite3.go` 含 `_tlsf_find_free_block` / `_tlsf_add_pool`。本次最终构建后的 Linux binary 再经 `go tool nm` 回读 `_malloc`、`_tlsf_add_pool`、`_tlsf_find_free_block` 三符号，见 [binary-notice-probe.log](binary-notice-probe.log)。不是将仅存在于构建图的工具误列为运行依赖。
- SQLite 本体仍按[官方公有领域说明](https://www.sqlite.org/copyright.html)描述；该版本 `build/download.sh` 从官方获取 SQLite 3.53.4 并校验 SHA3，具体翻译模块 glue 的 MIT-0 与译入 libc/TLSF 的 MIT 各保留自身边界，没有扩大到未消费工具或扩展。

### 具体修改

- 仅更新 `scripts/huhu-bot-notices.mjs`、其测试、`docs/third-party/huhu-bot.md`、新增固定 MIT 原文和获准窗口生成的 `THIRD-PARTY-NOTICES.md`；原有 JSON Schema/CLDR 固定全文未改。
- 新 MIT 附加记录精确绑定 `go-sqlite3-wasm/v6@v6.3.35304`，完整源与 commit/hash 可回读。生成条款为该模块根 MIT-0 加译入代码 MIT，保留原文，不把 wasm2go、x/tools 或全部构建工具添加成独立运行模块。
- 补充来源校验除固定提交外，核对已审阅来源、许可证与完整原文摘要的组合；缺文件、篡改、错误模块版本、未知 repo 或未知固定 commit、错误许可与错误登记摘要均有失败反例。
- 未修改 Go、TS、schema、package、lock、Skill、CI、预算、正式 Ticket/Map/Evidence，未提交/推送/发布。

### 红绿与窗口命令

| 命令/行为 | 实际结果与原始日志 |
|---|---|
| 修复前 `node --test --test-name-pattern='linked wasm libc/TLSF' scripts/huhu-bot-notices.test.mjs` | 非0（工具回执126），1/1断言失败，完整真实上游 MIT 文本遗漏；[red-missing-mit.log](red-missing-mit.log) |
| 修复后 `node --test scripts/huhu-bot-notices.test.mjs scripts/license-texts.test.mjs` | 0，12/12；[green-license-tests.log](green-license-tests.log) |
| `pnpm test:huhu-bot-tooling` | 0，19/19；[tooling-tests.log](tooling-tests.log) |
| `pnpm notices` | 0，100 npm / 62 crates / 7 Go runtime/modules；[notices-write.log](notices-write.log) |
| `pnpm check:notices` | 0，生成一致；[notices-check.log](notices-check.log) |
| `node scripts/build-huhu-bot.mjs --all` | 0，同一新 Go/native+contract 输入，五目标全部构建；[build-all.log](build-all.log) |
| 严格 `verifyBotAssets` 对照当前 `sourceTreeHash()` | 0，15文件、目标/版本/协议/schema/checksum与同源均通过；[asset-verification.json](asset-verification.json) |
| `node scripts/verify-huhu-bot.mjs native/huhubot/dist/huhu-bot-linux-x64` | 0，SQLite 重开、EOF 与保持父 stdin 开启的显式 shutdown；[native-smoke.log](native-smoke.log) |
| `go tool nm` / 完整 MIT 文本与错误运行模块标题检查 | 0；最终 binary 含 TLSF，notices 含完整 MIT，且没有把 wasm2go/x-tools 列作运行模块；[binary-notice-probe.log](binary-notice-probe.log) |
| 最后仅测试期望文本 CRLF 归一化后，重跑定向许可和完整 tooling | 均0，12/12 与19/19；[license-tests-final.log](license-tests-final.log)、[tooling-tests-final.log](tooling-tests-final.log) |
| `git diff --check`（本次脚本/测试/docs写集） | 0 |

最后一行测试修正由 Lead 在窗口结束后明确允许：只在新 MIT 期望文本读取后增加 `.replace(/\r\n/g, '\n').trim()`，与生产 helper 的 LF 归一化一致。没有改生产脚本或 native/contract 输入，故未重复构建已验证资产。Windows 实机/CI 未运行，此修正避免已知检出换行差异造成断言误报，不冒充实机通过。

最终统一 Go/native+contract sourceTreeHash 为 `d36867805d3182eda2cbb35691d51b6c08a7fb3c3f53e6cc7e3fc9296e61aa11`，版本0.0.1/HAP0.1/schema1；HEAD为未提交工作副本的 `33c21e098ef3188cbab5a09f3e0a01fadb787715`。旧013/015输入与 r2 资产只保留历史，本次新资产与实际冻结源码一致。ignored dist 保留，不提交二进制。

| 最终资产 | SHA-256 |
|---|---|
| `huhu-bot-linux-x64` | `19eaf561bb5a64a2b4d660379e220c747c9127893e8a451830265c1e6a26cff2` |
| `huhu-bot-linux-arm64` | `eb55e0375c5ebb82f6090b80a2bfe2e5af66784328eafcbcd70e566cb64ea71d` |
| `huhu-bot-darwin-x64` | `53f27f98bb38a3d14c3323273d776806446b2c29d595782ed2bdde378f980428` |
| `huhu-bot-darwin-arm64` | `252745452f4f88dd7607c510abe8d45a38cade4dd5b333cc4ed8b5fae776e9fd` |
| `huhu-bot-win32-x64.exe` | `93b43c92cd99239c888027dd5d3a9241db74be1c5115ad3af113ac8c7c4bccaf` |

### 冻结文件摘要

下表同时列只读 Go/package/lock 与原 JSON Schema/CLDR 文本作为输入证明，不表示本 TASK 写过它们。

| 路径 | SHA-256 |
|---|---|
| `scripts/huhu-bot-notices.mjs` | `f224dadcb89d86143c89c4a56e06eee849fd14725d6f1df4e48b845bbaa88b65` |
| `scripts/huhu-bot-notices.test.mjs` | `c2e3fcfd9ff96df10d44d0d3c35b75e8167a00d71d938379bffffc2abc77510e` |
| `docs/third-party/huhu-bot.md` | `6265268842ac8c5bc02f4bc00e3a17135b7690b58c7b372312cbc341e65d7625` |
| `docs/third-party/licenses/go/wasm2go-v0.4.15-MIT.txt` | `13b7919ffbff20b54d133748a783ade8b3ecb1810144194aad70928070f2c0df` |
| `docs/third-party/licenses/go/json-schema-spec-LICENSE.txt` | `909b25a80d4945b21d3adb2fb17f90bf592e0274bdf117c069c088a8e44dc7b6` |
| `docs/third-party/licenses/go/cldr-32-unicode-license.txt` | `6a6976a5da6ac21a6a001c685c057f4a6e619be11f5465371088ecd80c7fbe06` |
| `THIRD-PARTY-NOTICES.md` | `3f5492d74001d8380f844bd491a1242a5f88ffc46f1173cd1abf4ed7976e4bd9` |
| `native/huhubot/go.mod` | `25a59108c56bfdb488a13d32a7c23d20d5901ce83009cc527d24f58649e92895` |
| `native/huhubot/go.sum` | `6069deb819b9c19723efadac8b36e41de846adcd4e6064cd689960d844ecb7ce` |
| `package.json` | `25650222887420d856cba94e415b62b1d52dfdd0d9cf604c46b747ad8ab0e8b1` |
| `pnpm-lock.yaml` | `3a6f346a93c1666858d21f16ea87933c4fe07c3ed771fda00a43a949e5a1a934` |

## 问题与下一步

本次已按确定源码链修复 015 STD-01/SPEC-01 指向的遗漏，相关原失败仍保留；是否满足两轴 finding 由独立工程补审确认，不自审通过。全部生产与测试 writer、子进程已停止，等待 Lead 回收基础复审并安排工程补审及其 full build/lint/Lead E2E。T-27 仍为长生命周期集成票，不在此阶段标 done。

本 TASK 未运行其他四目标原生进程、真实 TLS/Provider/凭证服务、Obsidian/移动端或实际用户操作；交叉编译不代替这些结果，用户 LOG-051 的操作验收边界保持。main.js/styles.css 与全局 build/lint 不在本任务重复执行；本轮未触发远程 CI、提交、推送、升版本、发布或归档。
