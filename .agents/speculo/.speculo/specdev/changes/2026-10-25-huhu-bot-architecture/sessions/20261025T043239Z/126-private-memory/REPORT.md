# 私有记忆与实际短期上下文实现候选

Session: 20261025T043239Z  
Task: 126-private-memory  
Status: completed

## 聚焦交接

完成 T14 分配的本域实现与已授权作者检查，交付 19 个生产文件（18 Go、014 SQL）及 11 个永久测试文件。作者四个定向批次共 **15 个顶层目标、23 个子场景全部通过**；最初同一默认 Core/HAP 管理消费者的有效缺失红及 Root 后续目标绿均保留。所有实际命令和测试资源已结束，Go 窗口归还 Root，30 源冻结。这里的 completed 表示作者候选已交付，不替代 Root 的共同物理投递验收、独立审查或 T14 正式签票。

[最终源清单](logs/final-source.json)的 30 源摘要为 `5179a3de5f52f214c436fbbae90d57c744dc96c0e39cf3b4aa7ea8131917ddb0`，[完整自有差异](logs/final-own.patch)保留全部代码。首个 Store/Hooks checkpoint 后仅按 Root 指令在 `context_read.go` 增加统一 body-free manifest 预检；[原字节](logs/08-context-read-before.go.txt)和[精确补丁](logs/09-manifest-precheck.patch)保留。后两批消费者没有发现需修复的生产或夹具反例，原 19 个生产文件在首次真实默认 Core 联编前已稳定。本作者未写 API/HAP/TS、Core/Run writer、Grant/usage、Engine、恢复实现、模块锁、迁移注册或正式状态，没有提交、推送、发布、归档、再委派。

`sqlite/memory.New(base, Config, Access, Eligibility)*Store` 持有原 owner 的窄端口，不访问数据库、不启动 worker。`application/memory/private.New(repo api.MemoryAPI, wake func())*Service` 提供六个实际管理用例；同一个 Store 同时实现 MemoryHooks、MemoryFactsReader、`SnapshotUsageInTx`、`RecoveryWatermarkInTx` 与 `StopAdmission/Done`。014 正文保存 namespace、item/不可变 revision/body、candidate、completion outbox/job、实际上下文 manifest/entries、完整依赖、稳定来源抑制及可重建索引。实际 schema10 的注册、Core 单实例装配与调用顺序由129/134原 owner 实施，后续 Core/Executor/recovery 消费者归140；本域不复制原 Run/Attempt/Group 状态机。

管理操作通过可信 Profile/principal/namespace/scope 与当前来源检查。未物化的 Agent 默认 auto=true、revision1，是否 eligible 由当前额度、开关和配置决定；读取不创建 namespace。显式 add 是独立用户意图；correct 保留受限祖先并保护人工 head，即使没有 pin；pin 只改变 CAS/固定标记；forget 返回无正文/旧 revisionID 的安全 stub。命令先核 epoch 和 receipt 再核 CAS；旧正文回执仍重新检查当前资格，不能用重放恢复失效正文。候选只能按固定候选内容、目标和双 CAS 显式应用；列表 cursor 绑定查询/范围/相关代，分页保留完整对象。

短期上下文使用123的真实 Plan/Seal 合同。Plan 在短 Tx 读取本 Agent 与实际 Session/workThread/群代允许的记录，保留已经消费的完整 Access/Derived，不能因选取减少原 Claim 闭包。原 T03 在两 Tx 之间执行 Host 准入，Seal 与 MarkRunning 同 Tx 提交；本域重新核验选定事实并保存不可变 body-free manifest、真实 entry ID 与完整依赖。后续 ReadInput/ReadContext 重建同一输入，不重新挑选。读取 Memory 正文前先调用唯一 `CanonicalMemoryInputManifestBinding`，比较返回值、持久 expected 与 BindingDigest 三者；通过当前 namespace/job/settings/来源门后才 hydrate，随后核完整正文 digest。坏 metadata 不靠读正文补齐。

选择器保留原 Intent、显式 Source 和当前 inbox；精确来源身份去重，不凭正文 hash 丢掉独立记录。近期最多8条整文，旧记录最多32条真实 UTF8 首尾摘录并报告省略；1025字节附近会缩短 span，避免加省略标记后反比原文更长。Derived.Hash 保完整原文，TextHash/spans 对应实际发送片段。context list 只给实际摘要，get 按稳定 entry/片段偏移分页；当前来源失效时只返回安全 redacted stub，独立用户原文仍可读。`ContextUsageInTx` 只读安全 manifest 计数，不用已释放的活动 pin 冒充正文资格。

真实完成输出先由原 Run/message/publication writer 接受，本域同 Tx 记录完整输出依赖与去重 outbox/job。未绑定 job 只做当前 read/资格判断；独立维护 Run/config/pin 与当前 read/send/summarize/memory Grant 重选由原 factory 负责，BindRun 不修改 execution_runs。Commit 再核实际 claim、当前 job/settings/generation、固定 manifest、全部当前来源和完整候选批，之后原子写 revision/head/index/candidate/job。pin/CAS 竞争且已消费正文仍有效时可保存可读冲突候选；correct/forget、job代或来源失效不得借候选继续输出。被替换 head 只作 audit，其他受限祖先仍完整保留，间接自循环明确拒绝。

忘记同时使用稳定来源规则与 job generation：既阻断旧回调，也阻断新 source/hash/job 沿同一旧 origin 自动复活；独立新 origin 与用户明确 add 可继续，旧抑制不删除。抑制不保存忘记正文、prompt 或语义向量。ReadFacts 从实际 DB 关系批读完整闭包，不反调公开 Grant 检查；坏 JSON、缺关系、循环、同 key 矛盾及超限均明确失败。RecoveryWatermark 只含本树实际相关的 head/manifest/job/settings/抑制事实，不因无关 namespace 的修改失效。Store 自己的公开调用有同步闭门、取消与实际退出 ACK，模型和费用 drain 继续由原 owner 承担。

## 产物与验证

执行沿已读 AGENTS、dev 与 SpecDev I 的预检/TDD/原生 Go/生命周期规则，复用115完整记忆合同、123短期合同、125公共接口、128权限/预算和132统一 manifest helper。没有新增依赖或再次开展宽泛开源研究。此前研究仅作已接纳背景，当前行为由实际源码与消费者证明。

全部 Go 均在 Root 调度的唯一窗口。后四个作者批次使用真实绝对路径 Go1.26.10、`GOTOOLCHAIN=local GOWORK=off GOEXPERIMENT='' CGO_ENABLED=0 GOFLAGS=-mod=readonly GOPROXY=off`；[批一版本回执](logs/14-go-version.json)、[批二版本回执](logs/19-go-version-batch2.json)记录实际 stdout/exit/Wait。每次保存原 JSONL/stderr、准确命令、Popen.wait、native Go/SQL/JSON/锁输入及 ZIP；未把 Root CLI 不编译的测试排除范围用于测试输入。[命令索引](logs/command-index.json)含逐测试结果，[五份 ZIP 核验](logs/input-archives-verification.json)逐项验证原始346、388、388、393、393个文件的字节与 SHA。

| 阶段与原结果 | exit / 整个命令实际 Wait秒 | 观察 |
|---|---|---|
| [初始默认入口红](logs/initial-red-result.json) | 1 / 1.265920 | 可编译默认 Core→HAP；实际 METHOD_NOT_AVAILABLE，未装配行为红 |
| [同一默认目标绿，Root执行](../../../evidence/T-14-logs/first-joint-core-return.json) | 0 / 7.245179 | 虚拟设置零物化、add修订、真实关闭与重开一致 |
| [第一批管理/上下文](logs/batch1-controls-initial-result.json) | 0 / 2.650176 | 5 top / 4 sub，package0.322秒 |
| [第一批维护](logs/batch1-maintenance-initial-result.json) | 0 / 2.885152 | 2 top / 7 sub，package1.829秒 |
| [第二批原子性/闭包](logs/batch2-atomic-ancestry-initial-result.json) | 0 / 2.106666 | 4 top / 10 sub，package0.932秒 |
| [第二批生命周期/来源](logs/batch2-lifecycle-origin-initial-result.json) | 0 / 1.365551 | 4 top / 2 sub，package0.422秒 |

后四批首次均绿，无编译/夹具失败冒充行为红，也没有为 TDD 人为制造失败。两批最新实际输入同为393文件 SHA `cadf811840e09a8b1ae2a88072ef3e57639bacd9bbc1866c837b022056312f8a`，drift=[]。与首批388输入相比，只增加本票五个测试文件，另有140原 owner 后续授权的三个其他测试文件变化；生产没有变化，历史快照保持原字节，不将旧回执冒称最新完整输入。[第二批归窗记录](logs/20-batch2-actual-return.json)记录此差异。

[风险与消费者映射](logs/risk-matrix.md)逐项区分作者、原 owner/Root 与待验边界。作者主要沿默认 Core 的公开 API/真实 SQLite/原 Executor 生成实际记录。维护输出使用受控 fake Engine，零远端请求；SQL批故障使用同库真实 Memory/Grant/Config adapter，先证实事务内已有第一项或完整两项，再分别在第二 statement 与真正 deferred-FK Commit 失败后核全回滚，最后由原 Executor 完成相同结果。未绑定准入的正控仅使用当前持久凭证元数据，不代表已关闭 session secret 恢复或模型可派发。800 subject 的原 Grant 组件对照使用 fake FactsReader，仅证明共同 gate，不冒称本票实际 Reader 的全量物理投递。

Root共同证据单独引用且未冒领运行权：[管理CLI](../../../evidence/T-14-logs/lead-memory-management-r1-accepted.json)证明生产 TS/HAP/默认 CLI、schema10、持久重开与两个 namespace；[三协议SDK CLI r2](../../../evidence/T-14-logs/lead-memory-model-r2.json)记录 complete=true、1890输入无漂移，每协议6次本地 HTTP、1次维护，自动提交修订进入下一次真实 SDK 请求及context，全部 attempt settled/producer ended、pins0、SQLite完整、各两次自然exit0。该证据是固定本地响应与一次性 Profile；不证明远端模型质量或 Obsidian。原共同首次11目标中的群根状态预期失败由128仅修测试，原失败和[局部复验](../../../evidence/T-14-logs/128-history-expectation-repair-return.json)保留；本域生产没有因此变更。

## 问题与下一步

本域代码候选与获准作者检查已交付，没有本轮实际失败待修复。交错物理 stdio、真实800 mixed subject的完整 Reader/fence消费、Core/producer/pin/DB 排空、Host→Seal重规划、缺 manifest恢复等由 Root 调度原 owner 与独立消费者继续验收；本报告不把这些共同门宣称通过，也不因共同审查未结束扣留作者候选。新的有效问题应回原 owner 修复。本作者未运行单次全package、全module、race、vet、插件build/lint或生成；各永久目标已有上述分批或Root同入口证据，未按无新风险扩跑。

临时任务 namespace、每种复合权限/群代及大量混合批未各自铺满本票重复矩阵；具体复用和未跑项列在映射，研究/例子数量不是实施覆盖上限。真实模型、Obsidian、目标OS及系统keyring均用户后验/not-run，未索取凭证或以本地夹具代替现场验收。所有生产和测试保持冻结，本作者无活跃 Go/HTTP/Core/DB 子进程；只读结构 [return](logs/return.json) 与最终[工件 manifest](logs/artifact-manifest.json)随本候选交回，结构校验不认证行为或总票完成。原生 MESSAGE+FINAL 后停止全部写入。
