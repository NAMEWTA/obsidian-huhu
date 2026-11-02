# T-05 明确来源捕获与 Host read/search

Session: 20261025T043239Z
Task: 028-host-sources
Status: completed

## 聚焦交接

已实现真实 Obsidian Vault/editor/leaf adapter、平台无关 HostReadService，以及原 T01 连接中的严格 read/search 反向路由和 lease 生命周期取消。来源正文、origin view 和修订/hash 在明确捕获时固定；显式 folder/vault 用可信 opaque scope handle 登记成员，不以 payload 路径授予权限。完整 huhubot 回归 11 文件、78 tests 通过，双类型检查、定向 lint、架构检查和 probe 静态/打包检查通过。生产与测试源码已冻结，本任务所有测试子进程已等待退出；这是 TS 切片候选，Root 接收后统一固定 026/027/028 输入并做业务联合 E2E、全局 build/lint 和独立审查。

## 产物与验证

- 实际作者 `/root/foundation_client`；没有再派遣、提交、推送、发布或修改正式 Ticket/Map/Goal/Evidence/其他任务报告。
- Workspace `/home/wta/orca/workspaces/obsidian-huhu/bot`，branch `NAMEWTA/bot`，HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`；采用工作副本摘要，未把 HEAD 当作新源码交付。
- 10 文件快照见 [files-sha256.json](files-sha256.json)：`platform/obsidian/sources/{port,sources}.ts` 与 sources.test.ts；`services/host-read/host-read.ts` 与测试；原 `core/protocol/{connection,method-validation}.ts` 与测试；`scripts/obsidian-acceptance/huhu-bot-sources.mjs`。本轮没有修改 runner.test.ts、其他 transport 或 credential client。
- [inputs-sha256.json](inputs-sha256.json) 记录 24 项 TASK/Map10/Goal9/T05/031/Spec/ADR/研究、唯一 API/schema、原 Runner 测试与适用 Skill 参考；[go-inputs-sha256.json](go-inputs-sha256.json) 为完整 TS suite 后观察到的 67 项 Go 生产/SQL/嵌入 schema/module 输入。其他 owner 仍可维护其测试或必要内部修复，最终整批快照归 Root，不能把此观察冒充他们已经最终停写。

### 方案与冻结合同

沿用 SpecDev I 和 dev；完整回读 031 与 `evidence/chat-access-preflight.md`，复用 IMPLEMENTATION-REFERENCES 已固定的维护活动、许可和来源比较。比较了“从全局 activeView/旧 references.ts fallback 重新定位”与“明确 host 对象捕获并存入 opaque registry”，采用后者，前者会在异步期间换来源。Host 读取使用同一 HAP 连接新增具体 read/search 回执；没有把正文装进效果 HostReceipt、另起通道或引入依赖。参考 PathGuard 的访问前过滤思想，没有采用路径前缀等于外发授权，也没有复制外部实现。

026 唯一维护 API/schema/Go DTO，本片提出精确请求后才消费。当前实际为 **63 methods、126 params/result 形状、174 shared cases（127 正向、47 负向）**。MAX_METHOD_VALIDATORS 从 122 同步为固定 126，保留原 lazy compilation、有限缓存、Ajv 严格选项和不变换输入；没有手写第二份方法 DTO 表。空 sources/scopes 搜索的真实红例由 026 在唯一 generator 增加 anyOf，并新增 search-no-explicit-scope fixture；本片同时在业务入口拒绝空范围。

SourceSnapshot 固定 resourceId/kind/revision/hash/workspace/originClient/originView/hostConnection/hostLease/hostLeaseEpoch/scopeResourceIds；SourceScope 为独立 folder/vault handle，不可当作正文 read。HostLease 的 hostConnectionId/leaseEpoch 由服务器给出。**所有 range 是原文 UTF-16 code units 的绝对 offset；hash 为捕获 text 的 UTF-8 SHA-256，字节输出上限另计。** selection 的 hash 对应选区正文，range 仍对应原文；搜索选区摘录回传 range 时加上捕获 range.start。代码 port 注释和测试记录同一约定，拒绝切开 emoji surrogate pair 的选择。

### 实现与真实消费接缝

`ObsidianSources` 只接明确 TFile/TFolder/MarkdownView/WorkspaceLeaf。editor.getValue、listSelections、posToOffset 和 origin view ID 在首个 await 前固定；背景笔记通过 Vault.read 固定的 TFile 读取并复核路径/对象/修订，绝不查 activeView。App/Vault 对象身份检查拒绝另一工作区文件，普通 payload 中的绝对路径/URL/父目录不会进入 Vault 解析。当前 Vault configDir、`.huhu`、`.git` 不作为普通资料范围，排除规则不是 Grant 授权规则。规则依据包括本票适用的 `dev/references/obsidian-api.md` 和已安装的 API 声明，另核对了 [Obsidian 官方 API 源码](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts)；声明对照不等于实际宿主验收。

folder/vault 捕获只读取 metadata，冻结有限成员对象与当时路径；实际 search 先验证完整 registry handle，再逐个读取其成员，读取后再复核，移动/替换竞争返回 SOURCE_CHANGED。每页最多检查 32 项，limit≤20、text 总 UTF-8 字节≤maxBytes≤65536，cursor 绑定 scope/完整请求/lease；零结果也能以 cursor 表达尚未检查完的范围。仅搜索 sources 时只用已捕获正文，没有第三份笔记的隐含访问。快照/范围合计最多 128 项、正文缓存最多 8MiB、单来源和范围 metadata 最多 1MiB、单 scope 最多 10000 个 Markdown 文件，超限明确拒绝，不伪报完整搜索。

HostReadService 只运行 host-free Port/helper 和 core 校验器，不导入 Obsidian 或 Node 运行时。构造为 `new HostReadService(sources, timers)`；组合 BotHost 时使用 `read: service.read`、`search: service.search`、`leaseChanged: service.setLease`。026 接纳了本地可选 leaseChanged hook，connection 在安装/替换/detach/EOF/close 通知它，使服务 abort 任务、清正文/范围/cursor，并使旧快照失效。T20 仍应随模块结束 dispose service 与 adapter；本片不提前注册模块或 UI。

read/search 各自要求 note.read/note.search，旧 write lease 不隐含读权限。连接在派发前检查完整 lease/workspace/source 绑定，结果返回前再检查当前 Host/lease/有效期，验证 read 的完整 source 身份、search 的授权 source/scope ancestry、UTF-16 区间和 UTF-8 总预算。迟到、超时或撤销结果不发送正文；只读超时不会关闭仍健康的 HAP。原 invoke/queryReceipt 的 effect 回执流程保留，不把读缓存的撤销语义套到既有晚到效果回执。

adapter 与 service 各最多 8 项 underlying 工作并有 3s 期限。Vault.read 没有可取消参数：调用方可有界返回，但其真实工作配额保留到原 Promise 结束，不能靠超时不断开新读取。取消/模块关闭后迟到结果不入缓存/不外发；计时器、abort listeners 在收尾移除。未知 Vault 异常统一 SOURCE_READ_FAILED，连接只保留固定安全 reason，正文/OS 原错不进入错误回执或日志。`openSource` 返回公共 SourceOpenResult{source,changed}；当前内容变化只提示 changed，不替换捕获正文；未变化时用原文 offset 定位选区。

### 红绿与恢复

- [01-capture-red.log](logs/01-capture-red.log)：捕获入口缺实现；之后实际 adapter + Vault/editor marker 替身的捕获/read 转绿，加载失败未计为行为覆盖。
- [03-routing-red.log](logs/03-routing-red.log)：原连接没有 read/search 路由，两项真实 HapConnection 断言失败；[04-routing-first.log](logs/04-routing-first.log) 转为 30 tests 通过。
- [06-lifecycle-red.log](logs/06-lifecycle-red.log)：leaseChanged 安装回调抛错后 attach Promise 仍 pending；修复为安全拒绝并关闭，避免 pending 已从 Map 移除后悬挂。
- [08-host-green.log](logs/08-host-green.log) 实际为中间失败：空搜索范围被 schema 接纳并调用 Port；保留文件名与原始事实。026 修正唯一 schema 后该例通过。初次 lint 的两个 configDir 警告也已按实际 Vault.configDir 修正，没有关闭规则。
- [16-source-race-red.log](logs/16-source-race-red.log)：文件在授权 scope 的 Vault.read 途中移动，原本错误缓存/返回了新内容摘录；加入读取后的路径/对象/mtime/size 复核后，[17-source-race-green.log](logs/17-source-race-green.log) 37 tests 通过。
- [20-unicode-boundary-red.log](logs/20-unicode-boundary-red.log)、[25-vault-error-red.log](logs/25-vault-error-red.log)：分别保留 surrogate 切分错误被接纳、底层 Vault 原错透到 capture API 的红灯；随后拒绝错误 offset 并归一未知错误，最终 42 项定向检查通过。
- [19-full-first.log](logs/19-full-first.log)：共享 Go 正在维护时，两个 beforeAll build 因 ContextAccess 缺 FilterModelHistory（另一次 stdlib import 空路径错误）失败，62 tests 通过、13 Runner tests 未执行。没有删测试或把 skipped 算通过；等待 026/027 明确 cursor 窄窗口闭合、Go build-ready 后只重跑一次，最终全部 78 tests 通过。

### 最终验证

| 命令 | 退出 | 实际观察 |
| --- | --- | --- |
| `pnpm exec vitest run src/modules/huhubot` | 0 | [31-full-final.log](logs/31-full-final.log)：11 文件、78 tests，23.55s；含原 13 项真实 Runner 测试与新 Host/source 回归 |
| 定向 connection/method-validation/sources/host-read Vitest | 0 | [26-ts-final.log](logs/26-ts-final.log)：4 文件、42 tests；方法样本循环消费 174 cases，不额外计为 174 tests |
| `pnpm exec tsc --noEmit --skipLibCheck -p tsconfig.json` | 0 | [29-production-final.log](logs/29-production-final.log) |
| `pnpm exec tsc --skipLibCheck -p tsconfig.test.json` | 0 | [30-test-final.log](logs/30-test-final.log) |
| 定向 `pnpm exec eslint ... --max-warnings 0` | 0 | [27-lint-final.log](logs/27-lint-final.log)，本片生产文件零警告 |
| `pnpm test:architecture` | 0 | [18-architecture.log](logs/18-architecture.log)：1204 modules，无 zone/host/desktop/barrel/cycle 违规；后续无新增导入边 |
| `node --check scripts/obsidian-acceptance/huhu-bot-sources.mjs` | 0 | [10-probe-syntax.log](logs/10-probe-syntax.log) |
| `node scripts/obsidian-acceptance/huhu-bot-sources.mjs --check` | 0 | [28-probe-final.log](logs/28-probe-final.log)：实际生产 adapter/service browser bundle 500842B，hash ba4e403b07d46fb1f457d25c968fdee9de66adc83ffb669207cf61238cc2cc25；hostRun=false。这是独立 probe bundle，不是插件包体增量或预算验收 |
| `validate-dispatch.mjs ... --task 028-host-sources --stage return` | 0 | [32-validate-return.log](logs/32-validate-return.log)，errors/warnings 均为空 |

单元中实际生产捕获、Port/service、HapConnection 与唯一 validator 执行；替换的外部边界是 Obsidian App/Vault/editor。中文/emoji/换行用例独立对照 Node SHA-256：原文 `甲😀\n乙😀尾`、捕获 range 1..7、text `😀\n乙😀`，query `乙😀` 的 excerpt 为 7 UTF-8 bytes、3 UTF-16 units，绝对 range 4..7。明确两份来源时第三份 Vault.read 为零；scope 伪造、旧 lease、错误 workspace/profile 字段、无 read capability、未知资源、移动竞争、模块关闭和迟到正文均有拒绝/不外发断言。这里的“不外发”指 TS 回执边界；真正 EngineInput 捕获链由下一段的联合夹具证明，不偷换为模型现场。

### 宿主与联合接缝的实际边界

`huhu-bot-sources.mjs` 沿 fresh-vault，仅创建新的绝对 fixture root 和固定哨兵文件。实际执行模式会加载本片生产 adapter/service，开两个窗口、捕获未保存 Unicode 选择与第二份笔记、切焦点、核对范围、changed、伪资源和 detach 拒绝，以及第三份零读取；结果写 fixture evidence。probe 中 lease 是本地固定夹具，目标为 Obsidian 来源 API/窗口行为，不是 Runner/Grant/模型贯通。本轮仅执行 --check 和语法检查，**未启动真实 Obsidian**。

用户后验示例：`HUHU_OBSIDIAN_EXECUTABLE=/absolute/Obsidian node scripts/obsidian-acceptance/huhu-bot-sources.mjs /absolute/new-fixture-root`，root 必须尚不存在。正式 UI/翻译/模块装配仍归 T20/21/22。

027 已消费本片实际生产 HapConnection + HostReadService，自己的 Go tests/contract/access 联合 harness 通过 inline esbuild Node bridge 接真实 bootstrap/Façade/SQLite，仅替换外部 Vault Port 和 Engine 捕获器，并加入同一 Unicode selection/hash/search 向量。该 harness 的最终运行/报告属 027 与 Root，**本片没有执行或代签其 EngineInput/撤权/history 验收**。Root 已明确将最终固定输入的 Go↔TS E2E 与全局工程检查作为 Lead-owned；本报告不以本地 78 tests 替代它们。

## 问题与下一步

本片没有已知未实施的 TS 事项，源码/测试 writer 已停，当前测试进程均已 Wait。请 Root 在 026/027 最终停写后固定整批输入，接收联合 Engine/权限捕获结果、执行全局 build/lint 和独立双轴审查；共享输入若再变，只重验受影响闭包。

真实 Obsidian/popout、用户 Vault、真实模型和目标 OS 未运行，按用户口径列 user-owned/not-run；代码 probe、替身和 bundle-check 均不冒充现场通过。completed 仅为 028 候选返回，不改变 T-05 正式状态或复合 AC 的最终完成判断。
