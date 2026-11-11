# 054 T07 Host 写入客户端候选交回

Session: 20261025T043239Z
Task: 054-note-effects-client
Status: completed

## 聚焦交接

已实现生产 `registerObsidianNoteHost → HostWriteService → ObsidianNoteEffects → Vault.process/create`、HMAC 认证的最小回执与只读核查，并完成原 T01 单请求取消和原 T05 可信写目标窄 Port。生产、测试和用户后验脚本的 26 文件输入已停写，冻结树 SHA 为 `effad7b7993201d68cbdb20014fe9f4c8207cff51e3973d2db94cb87a011ce5c`；最终定向 119 tests、旧消费者 32 tests、两套 tsc、定向 lint 与架构检查全部 exit 0。已把实际冻结 SHA 交给 052；真实 TS↔Go effect-reconcile 联调与 Root 稳定 E2E 由其接续，本报告不把未执行的联调算作已通过。真实 Obsidian/用户 Vault/真实模型/目标 OS 均为 user-owned / not-run，脚本只执行了 `--check`。`completed` 表示候选交回，T07 与复合 AC 的正式验收由 Root 维护。

## 产物与验证

### 来源、授权与范围

使用本次唯一 current checkout：`/home/wta/orca/workspaces/obsidian-huhu/bot`，branch `NAMEWTA/bot`，HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`。起始已有的共享 dirty tree 保留，见 00-start-input.json（历史日志已清理：`logs/00-start-input.json`）；无提交、推送、发布或 worktree。TASK、Root 原生消息、ROOT-ADDENDUM-01（仅纯 TaskConfig hash 两文件）、Map15/Goal14/LOG072–077 的原 owner 窗口是本次边界；没有写 api.ts/schema/Go/package/lock/正式状态/他人报告。

实际使用 `dev` 和 `specdev-i-implement`，读取 AGENTS、workspace/catalog/runtime、Map/本票和实现/预检/协调/错误与并发测试规则，按实际持久化、异步生命周期、公开协议风险实施并验证。项目 Skill 及 architecture/testing/licensing/obsidian-api 的起始 SHA 已在 00 保存。完整读取 036-note-effect-preflight、045-group-recovery-preflight 与 051 回执根来源，复用固定官方 Obsidian API 规则：`obsidian-api` commit `9abd9605ce081383674aae1ed111c456edde0688`（MIT，固定活动来源 2026-10-05）、本地 types 1.13.1、支持 minAppVersion 1.13.0；`loadLocalStorage/saveLocalStorage` 标注 since 1.8.7。借鉴设计而未复制外部代码，无新增依赖。宿主生命周期、Vault.process 同步回调、明确 leaf 与所有相关编辑器检查按 dev/references/obsidian-api.md 落实；真实宿主行为不由受控对象证明。

### 实际行为

- 唯一 Sources registry 为 update 提供原 opaque resource/revision、原 TFile、捕获时路径、完整全文 UTF-8 hash；保留未保存来源快照、UTF-16 range、1 MiB 来源捕获和原读取权限。新 `HostWriteSources` Port 不把普通路径变成可信目标。create 从明确 TFolder 与 leaf 捕获目录身份及审批前规范候选名，实际调用只 `Vault.create` 此确切路径，不补目录、不执行时改名、不覆盖。
- 准备/检查/执行核对 Profile/commandEpoch/device/workspace/origin、Host lease/connection/epoch、完整 baseline 和 note.write 各版本 `1`。prepare 读及 hash 的异步边界重复检查原对象/路径/mtime/size；rename 即使立即反转仍失效。update 通过 `Vault.process` 同步 callback 做最终全文 CAS、当前 lease/取消/过期和所有相关 Markdown editor 的检查；包括浮窗、同文件其他 leaf 和无法安全加载的 deferred view。`UNSAVED_EDITOR_CHANGES` 的公开 kind 与 reason 均为既有同名值，非通用 CONFLICT。
- 回执根复用 `HUHUBOT_RUNTIME_ROOT`、deviceId 与 privateVaultStorage/TextStorage：`.huhu/huhubot/<SHA256-device>/host-receipts/<SHA256-profile>/<SHA256-effect>.json`。received 先于 mutation；completed 后于 Vault promise 成功且回执写/read-back 成功。只有真实签名、全部归属及 fingerprint 匹配的原 completed 返回 committed。received/损坏或缺键证据只能用可信定位的真实后置 hash 判 reconciled，不能判 committed；不可核查为 unknown_outcome。原文未变、API 拒绝/超时/丢包都不推断“肯定没写”，未知效果不自动重派。
- Root LOG074 授权的 32-byte 随机 HMAC-SHA256 键只在 App 的 vault-local storage，按 device/Profile hash 隔离；签名域 `huhu-host-receipt-v1`，全部 receipt/index data 用递归排序对象键、保持数组与字符串值的 UTF-8 JSON 规范序列化。key 不进入 Vault/HAP/日志/CP/portable。初始化由 App 共享队列串行化，保存后读回，不覆盖坏已有键；query 不生成/轮换 key、不写回执、不执行 mutation。封印用于识别伪造 Vault JSON，不能隔离控制本机或其他宿主插件的攻击者。
- effect 的重复同 fingerprint 不重写，异 fingerprint 拒绝。已保留 authenticated index 的 received 写失败也留下禁止重执行的 reservation；缺失原 index 但已有 key 亦 fail closed。query 可用新 lease 核查旧 binding；旧 binding 不能在新 lease 重新 invoke。真实 Vault 后完成仍可持久 completed，连接/服务阻止其作为旧标准回复复活。
- quota 按 App 共享，最多 8 个真实操作、合计请求 JSON 2 MiB；dispose/reopen 不删除未 settle 占位。目标 path 的 SHA256 串行队列复用 storageWriteQueue(App)，跨 adapter 重开仍等实际 promise；settle 后释放 queue/quota/listener。准备缓存最多 128，baseline+content 总 8 MiB，每 preview JSON 最多 262144 bytes；全文 baseline 最大 1 MiB，写正文最大 UTF-8 65536 bytes。回执单份最多 16384 bytes，index 最多 131072 bytes/1024 effects，读取先 size 检查。
- 严格控制通知字面量是 `{"jsonrpc":"2.0","method":"$/cancelRequest","params":{"requestId":"s:42"}}`，无 id，requestId 的值含 `s:` 前缀。仅取消对应 reverse 请求；普通完成→随后 cancel 的 30s 已结算关联为 no-op。TS reverse 实际任务 quota 最多 8、active+settled 关联总上限 64；真实 Vault 未 settle 即使超过 30s 仍占 quota，永不补第二个标准 reply。forward cancel/timeout 只保留最多 32 个 30s 已知迟到响应关联，合法迟到仅消费一次；未知/重复/过期关联仍 fail closed。真正 EOF/连接关闭仍统一 abort/释放连接资源，未把任意未知响应静默吞掉。
- 纯 core `canonicalTaskConfigHash` 使用 052 冻结 v1 u32BE UTF-8 length-prefix 字段顺序，不依赖 Node/宿主、不排序工具/目标、不归一 endpoint；同 consume 8 个共享黄金向量。note effect fingerprint 同 consume 4 个共享向量，规范 30 字段中末项为外层 request.content，query 的新 lease 不改变原 fingerprint。
- BotClient 接纳 effects.get/reconcile 与 collaboration.configurationHash/confirmProposal/budget/configureBudget。新增首次 budget 的三项 limit 为 decimal `"0"` 的真实 typed/framed client 样本，随后 CAS 配置；没有把空串当数字或放宽 Ajv。每方法依旧唯一 schema 懒编译、固定最多 142 方法 params/result validators；strict 选项、ErrorData/cancel canonical def 和原 frame/UTF-8 byte 限制未放宽。

### 合同输入

最终作者观察的共享合同为 71 methods / 142 方法 params+result shapes / 252 shared method cases（cancel 与 ErrorData 的独立 validators 不计方法数）。052 消息确认本批 TS API/schema 无计划新字段；Go 内部装配仍由其独占，不将观察值冒充整个联合 Go 最终快照。精确输入记录见 35-source-freeze.json（历史日志已清理：`logs/35-source-freeze.json`）、37-final-checks.json（历史日志已清理：`logs/37-final-checks.json`），最终复读共享与自有输入漂移均 `[]`。

| 只读合同/根 | SHA256 |
| --- | --- |
| `src/modules/huhubot/api.ts` | `e2dff7805dad722597cb2ca50a280f7485451941f4fbf852ede694c0e507786d` |
| `contracts/hap/v0.1/schema.json` | `7273190ea6fc7206d7d854e92b170b2d75007f04e85396edb516b51a3d217d2f` |
| `contracts/hap/v0.1/fixtures/methods.json` | `94dabe8f3099024ad410a3ba66971fab8ac3cb5c9bd4e675b51f58a761891df6` |
| `contracts/hap/v0.1/fixtures/effect-fingerprint.json` | `e1d447316b94ecf943a9a7d259692aab32f0e7d7c31300e725ed0d8d928df81b` |
| `contracts/hap/v0.1/fixtures/task-config-hash.json` | `5553dcaf3f76f3b1a6e4ff9169224057e538293b1d06bb67fbc4968654a9a7f7` |
| `src/shared/storage/vault-layout.ts` | `26b94019ddf6bd8b270ba5b0cf7c9445de60f300bc33d2e0ee734e50de7c2e8c` |

### 验证及真实红灯

最终命令、exitCode、观察与原日志逐项记录在 37-final-checks.json（历史日志已清理：`logs/37-final-checks.json`）。日志是原始命令输出，空 tsc/lint 文件对应工具实际退出 0，非跳过检查。

| 检查 | 结果与证据 |
| --- | --- |
| 12 个 protocol/sources/note-effects/host-write/host-read 定向文件 | 119 tests passed，exit 0；[30-final-targeted-suite.log](logs/30-final-targeted-suite.log)。其中唯一 schema 的 252 方法样本、4 effect fingerprint vectors、8 TaskConfig vectors 实际消费；不把样本数冒充 tests 数。 |
| 测试类型检查 `pnpm exec tsc -skipLibCheck -p tsconfig.test.json` | exit 0；[31](logs/31-final-tests-tsc.log)。 |
| 定向 production TS + probe ESLint，零警告 | exit 0；[32](logs/32-final-lint.log)。glob 中 repo 默认忽略 test 文件，使用 `--no-warn-ignored`，未关闭任何生产规则。 |
| 生产类型检查 `pnpm exec tsc -noEmit -skipLibCheck` | 实际 Wait 后 exit 0；[33](logs/33-final-production-tsc.log)。 |
| `node scripts/verify-architecture.mjs` | 1215 modules，无 zone/host-package/desktop/barrel/cycle violations；exit 0；[27](logs/27-architecture.log)。后续仅同文件局部行为/测试/独立 probe，未引入新架构 import。 |
| 用户后验入口 `node scripts/obsidian-acceptance/huhu-bot-note-effects.mjs --check` | exit 0；742034 bytes、bundle SHA `017c75b3dd0188b36f0e4115b3abab23a9d515f77c5517116aecf0ae7c3070e4`；hostRun=false / runnerRun=false；[34](logs/34-final-probe-bundle.log)。这是测试入口 bundle，不是插件 bundle 性能数据。 |
| 旧 EventClient/reducer/assistant 消费者 | 3 files / 32 tests passed，exit 0；[36](logs/36-existing-consumers.log)。没有删除原事件、日期、Unicode、退出或权限覆盖。 |

有意义的故障覆盖落在实际消费者/受控边界：生产 Sources→HostRead 保留原行为；生产 factory→HapConnection strict frame→HostWriteService→实际 adapter 类→受控 Obsidian App/Vault API 对象，对真实 WebCrypto、收到/完成回执、重复、未保存公开错误形状进行断言。单请求取消用实际 HapConnection 编解码帧与兄弟请求证明；最末异步 Vault promise 用真实 Promise barrier、App 共享 quota/target queue 验证，不把 fake effects 的 quota 专项当作业务成功证明。尚不是 Go 进程或真实 Obsidian 现场。

保留以下红灯及修复，不用后来的绿灯覆盖原始记录：

- [01](logs/01-source-target-red.log) 原 Sources 14 tests 绿、3 个新增可信目标测试因 Port 缺失红（Vitest exit 126）；实现后 [02](logs/02-source-target-green.log) 17 tests 绿。
- 05（历史日志已清理：`logs/05-production-tsc-first.json`）、[07](logs/07-production-tsc-protocol.log)、[19](logs/19-tests-tsc.log) 是首轮自身类型问题（HostReceipt 状态推断、泛型 preview/result 收窄、测试 required description/协议枚举/对象推断）；均已修复并由最终双 tsc 覆盖。[20](logs/20-own-lint.log) 首轮自身 lint 错误已修，误选默认忽略 tests 的 warnings [22](logs/22-own-lint.log) 改精确定向运行参数后最终 [32] 0。
- [09](logs/09-protocol-first.log) 老测试 mock receipt 缺少 committed receiptId，被新增严格生产检查拒绝；补准确 fixture，未放宽生产要求。[12](logs/12-host-service-first.log) query 误 spread invoke 多余字段被唯一 schema 正确拒绝；修正测试 query 字段，生产严格性保留。
- [15](logs/15-effect-fingerprint.log) 实际共享 content-changed 黄金向量红，定位末字段误用 preview.content；按冻结字节合同改为外层 request.content，[16](logs/16-effect-fingerprint-green.log) 同 4 向量绿。
- [29](logs/29-prepare-version-red.log) 使用相同真实 WebCrypto + 受控 mtime 竞争：replacement hash await 期间原 TFile 版本改变，prepare 原实现错误返回预览；补准备全过程 stat 复核后 [30] 同输入转绿，0 mutation/0 receipt。rename/同路径替换/多编辑器未保存/CAS 竞争原测试一并保持。

中间 08（历史日志已清理：`logs/08-host-contract-input.json`） 是 69 methods/138 shapes/248 cases 的协作点，非最终输入；最后新增预算公开消费者由唯一 owner 生成到 71/142/252。中间“59 protocol tests / 31 Host 切片”是当时真实结果，最终总数以 119 tests 为准，不累加重复执行。

### 用户后验入口及未跑边界

交付 `scripts/obsidian-acceptance/huhu-bot-note-effects.mjs`。无参数不会访问任何现有 Vault，真实模式要求全新绝对 fixture root、明确绝对 HUHU_OBSIDIAN_EXECUTABLE 和 HUHU_NOTE_EFFECT_TEST_BINARY。按脚本顶部命令构建 052 `TestNoteEffectChild`，只替代模型 Engine，stdout 纯 HAP，生产 bootstrap/stdio/Broker/Host bridge 及公开审批/effects API 均保留；脚本不新增生产 probe RPC。它准备批准 update/拒绝/dirty editor/create/已 completed 回包被丢后 EOF→Runner Wait→同 Profile 重开 effects.reconcile 的真实宿主流程，检查确切目标与未触及其他笔记；Node test transport 的帧/字节、等候和拥有子进程 kill→Wait 均有界，失败时也 drain、解绑和恢复 Vault observation hooks。只有已打包可生成的证据，未宣称运行模式已经通过。

054 自有所有 tsc/lint/Vitest/esbuild/architecture 工具进程均已等待完成，没有自有未结 Node/Go/Obsidian 产品/fixture 子进程；本轮未启动这类产品进程。没有运行 Go compile/race、真实 TS↔Go、新 Obsidian、真实模型、目标 OS 或其他用户库。052 已接受本输入并负责唯一 `tests/contract/effect-reconcile` 的实际跨进程永久 suite，Root 明确“不必互等”；其结果后续由原 owner/Root补入联合 Evidence，不把尚未产生的结果写在此处。

Root 稳定窗口还需全插件 build/lint 与联合 E2E。共享 fresh-vault.mjs stop 强杀后未 Wait 已由我按真实源码报告，Root 回读确认并在 Map15/Goal14/LOG077 登记 T27 精确修复；054 保持该 helper 只读。HMAC 本机 key 的数据边界说明也由 Root/T27收尾。本报告不把未跑宿主脚本或尚待共享 helper 修复当作现场通过。

### 26 文件冻结 SHA

35-source-freeze.json（历史日志已清理：`logs/35-source-freeze.json`） 是可机器复核的完整自有输入清单；仅下列源/测试/脚本，另有本 TASK logs/REPORT。treeSHA 是该 files map 以 sorted JSON keys、紧凑 UTF-8 JSON 编码后的 SHA256。

| 文件 | SHA256 |
| --- | --- |
| `scripts/obsidian-acceptance/huhu-bot-note-effects.mjs` | `6416b71a0262a155d4b9275fce10f6e48ceb9142ccf77dfe94d891a2e097641f` |
| `src/modules/huhubot/core/protocol/codec.test.ts` | `7a89fa9b33c3bf1c29588600464cc7c60410f139e50c647ce1261431d428ff86` |
| `src/modules/huhubot/core/protocol/codec.ts` | `2891c56da79be31194204ede79108b48e63e3dcda016543ae40b8aba7118afa9` |
| `src/modules/huhubot/core/protocol/connection.test.ts` | `076061553362706c5e95c8d84746cd2bfba9fb49562c173c560685987a27bd41` |
| `src/modules/huhubot/core/protocol/connection.ts` | `c515e32ec0a632fe5259ee65b2d82c930859a7ed13ad15aa93f1240823c6e655` |
| `src/modules/huhubot/core/protocol/method-validation.test.ts` | `c8577f564da75e8d66571e9b82246bd68c7ac448b3d4664c9a7f3960dfcf90e4` |
| `src/modules/huhubot/core/protocol/method-validation.ts` | `db90d2096e7c1f65b78d10500b380d84934ee4b1cec2dd0b8a124d275feba9f8` |
| `src/modules/huhubot/core/protocol/task-config-hash.test.ts` | `dc6bffcb101094adfd75a018ef93fb37c28f7b91b0b9ed1bcf657d251a92a6c7` |
| `src/modules/huhubot/core/protocol/task-config-hash.ts` | `f3421d9fd974e7a390567ebb616727aa42a3d0debf15ac9bbf4957feb44d97c3` |
| `src/modules/huhubot/platform/obsidian/note-effects/fingerprint.test.ts` | `d47f60af77d6aae340f98eedb2c6a8a46080651a8c8e8337e7ae24178f18d469` |
| `src/modules/huhubot/platform/obsidian/note-effects/fingerprint.ts` | `fb70c58f4d87e7b1858a62bfa22421438393fd43883a13aaa423e4271435c746` |
| `src/modules/huhubot/platform/obsidian/note-effects/note-effects.test.ts` | `5792a716b6ddb19293a4bba0237507f8610a3a2621d61bb6eaba94171e173025` |
| `src/modules/huhubot/platform/obsidian/note-effects/note-effects.ts` | `a5fb43cc7bf19c8edc836c2c62f5e74ee1cc385d512f45d215862ed970001819` |
| `src/modules/huhubot/platform/obsidian/note-effects/port.ts` | `a6afda6e6d02cc03d3dbf96b8881d67ead1ff306bc628caf7e7c2ad3f1cf6095` |
| `src/modules/huhubot/platform/obsidian/note-effects/primitives.ts` | `0f534258434894bfdd5f1c87e140b26a9b51a5f32301a28335560aa25cd3fab4` |
| `src/modules/huhubot/platform/obsidian/note-effects/receipt-authority.test.ts` | `376bde75a955a8fb7173baed9b6bd2c1be3a6fc5742c53250edc5cdded8cab10` |
| `src/modules/huhubot/platform/obsidian/note-effects/receipt-authority.ts` | `c0e64459f242293caa78b74ba20e2060f79a9fe341ad7f1c2f9c5fdcdd0c5a0f` |
| `src/modules/huhubot/platform/obsidian/note-effects/receipt-store.test.ts` | `d6d84d5d8c73492914149d5c74e4740dde58f8c11159394e0fb31f571e40e8f0` |
| `src/modules/huhubot/platform/obsidian/note-effects/receipt-store.ts` | `6077ddab8e43838a054a9a538366d09533c366a396c83deef70ae5317fbcebf7` |
| `src/modules/huhubot/platform/obsidian/sources/port.ts` | `09ec5c96e25426d2a9fa2b956cf4bcc610a27e6f2f064cf4dc5f9ddffdd66008` |
| `src/modules/huhubot/platform/obsidian/sources/sources.test.ts` | `358142ff79a94137868363dcdda201944ee9ab3d12d8ab46ee24eab31d1a82c7` |
| `src/modules/huhubot/platform/obsidian/sources/sources.ts` | `9cae96207519d2c37f7db435586731dcf8bb5a0be5a5a351f5bde998e57551bd` |
| `src/modules/huhubot/services/host-write/host-write.test.ts` | `de316cdc0f8b4959375dfef0d7dbe0019c606be8752ba490d382a89021e1f2b2` |
| `src/modules/huhubot/services/host-write/host-write.ts` | `bfc778925cf44ddd6cf8bc5224c807d7aa13dfa6b96abe0ff83ebdeedde36a51` |
| `src/modules/huhubot/services/host-write/obsidian-host.test.ts` | `077cff44a54aa5b1142c57133efd96eba6c9e258baf055bc399c7ebc57d3a145` |
| `src/modules/huhubot/services/host-write/obsidian-host.ts` | `dc7c3283e57c3c6636690b7fb46e579ed5038618a5049b8715e03ae81039bbad` |

## 问题与下一步

054 源码实现与作者适用检查无遗留失败，生产/测试/脚本全部停止写入。仍待 052 使用上述同输入完成真实跨进程写入链，以及 Root 统一 build/lint/E2E、T27 的 fresh-vault Wait/本机 key 文档维护和独立双轴审查；它们是明确的联合收口，不在此虚报已过。用户后验真实 Obsidian/真实模型/目标 OS 保持 not-run，不减少原安全、恢复、故障合同；unknown 仍不得自动重写。

本报告及原日志交回后运行实际 `validate-dispatch --stage return` 并保存回执。Root 复核 report/manifest/hash 后推进正式状态；054 不自行修改 Ticket/Map/Goal/Evidence，不提交或发布。
