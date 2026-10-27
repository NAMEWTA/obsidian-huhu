# T16 恢复核心候选交接

Session: 20261025T043239Z
Task: 080-recovery-core
Status: completed

## 聚焦交接

本切片完成原 T01/T03/T06 的公共恢复合同、同一 Executor 持久执行位置、无 claim 的完整私有 CP 核查，以及真实 producer 排空后才释放数据库/Profile 的关闭路径。35份自有代码、测试及校验工具已停写；适用检查以保留原失败、原owner精确修复及受影响复验的组合证据闭合。`completed` 仅为候选交回，Root固定输入 E2E/build与独立双轴审查仍待执行，不代表全 Goal 接纳。

作者 `/root/foundation_go`；沿用 Root 实际派遣记录的 requested model `gpt-6.1-sol`、reasoning `xhigh`。工具未暴露可独立核验的底层模型身份，不作实际模型断言。授权为冻结 TASK `9821a81f3c44d4a158cd1d2da483f374f093d12a0f213aa43516df59a37a4522` 和 Map20/Goal19 联合窗口 `3befb9dca2031f81a4e3a0e02577cc80115955d2ef8ee6fd191faa6bedbdca63`；另遵循Root Map21测试维护及 `evidence/T-16-logs/python-validator-supplement-map21.md` 精确补充，只新增独立 `validate.py` 修复。未写正式状态、旧 SQL、依赖、T02/T05/T07/T13 产品或他人报告。

唯一公共合同如下，均已由真实 bootstrap 装配，并经唯一生成器生成：

- `runs.recovery(IdQuery)` 返回目标 `runId/rootRunId/revision`、资格 `state/generation/treeRevision/affectedRunIds` 及可选安全原因/核查时间。`revision` 是目标 Run CAS；`treeRevision` 是独立 SHA256 树水位，不能作为 CAS 修订。
- `runs.resume` 必需原 CommandMeta、`id`、`expectedRevision`、`recoveryGeneration`。沿原命令回执优先重放；恢复同 Run，不创建重试意图。
- `Run.recovery` 从原 Run 查询同一 SQL 事务投影当前元数据。独立资格查询仍可向原 owner 说明撤权/坏 CP 的阻断原因，不公开 CP、正文、密钥或文件路径。
- API/schema 为 72 个方法、144 个方法校验器、276 份共享 DTO 正负样本。`generation` 为十进制字符串，`treeRevision` 明确排除 `*Revision` 十进制命名规则并约束 SHA256；UTC 及真实日期规则保持。

与081的内部接缝是 `RecoveryInspection{Run,Access,Config,Position}`、`RecoveryInspector.InspectRecovery`、原 adapter-only `ReadRecoveryInTx/ResumeInTx` 和可注入 RecoveryGuard。016 正文由081独占；本作者只串行登记实际 Version9。完整树屏障、两短事务夹核查、水位/CAS、预算/取消/派生消费者由081实现并独立交回，不归本作者冒领。

执行位置保存 `run/continuation/resume/application`、原 Continuation、已交付 Decision 或应用终结结果。Claim 消费后同事务保存位置；进入真实 Engine.Resume 前保存 Decision。旧 schema8 的已领取子结果由081只读重建，审批续体由本切片从原审批/效果事实重建；不回退 pending、重复消费子结果或重派效果。原批量消息来源和 Group proof 刷新、纯编排根零模型行为保持。

CP 核查通过 Broker 无 claim 的完整 Artifact/registry 关联验证、不可变 Blob Open 的 hash/元数据校验和持有期，以及纯 `EngineCheckpointInspector` 读取私有 payload 完成；reader 在所有路径关闭。语义检查器未装配时明确阻断，不能把文件存在当作可恢复。仅核查尚未派发的批准续体时重验原 Host lease/目标；已有完成 Decision 不重新 Invoke。

关闭由唯一 `Core.RequestStop` 同步关闭进程内准入，再取消实际 worker。唯一后台排空循环重试持久 Stop，待真实 worker、Inspector 及已派发 HTTP producer 结束，才 GC/关 Provider/数据库/Profile。`Close` 最多等3秒；超时只报告未结束，`Done/WaitClosed` 是同一真实完成信号，不另启清理。CLI 的 stdin EOF、受管凭证 pipe 结束、信号和 managed shutdown 最终共用该路径，超时后等待真实排空；外部 supervisor 的 TERM/KILL 仍是兜底，不是“无效果”证据。

## 产物与验证

最终自有35文件逐 SHA 在 [36-final-own-source-with-validator.json](logs/36-final-own-source-with-validator.json)，树 SHA256 `1e83f398c02667a26d0070e9649a5444fcfdd05b8bf29171532bfe67da7d63c8`。最初31文件 [11](logs/11-own-source-freeze.json)、后加三份foundation测试的34文件 [20](logs/20-final-own-source.json)均保留；原34字节仍不变，最后只新增独立Python校验器维护。接口 SHA：`api.ts ff921139bdd82f2c6e2b83892fc499489ccef93183e7f827fe6709ec4697a401`，`schema.json a4daa358204d607614ddd15f62aeede4f0e161fe31498cee55c43dc7540de534`。

最终共同377输入 [35-final-joint-with-validator.json](logs/35-final-joint-with-validator.json)，树 SHA256 `9ef3b363489583b9b1a5332a02e5041dba06b9bd3972b23ce3ad8bb7f96dd718`；另列原schema8的3DB+6CP共9文件 SHA，fixture树 `d9cbbc68b6fa416f21b2e4c0dc5951502e2c365bfd14cf59b7e6bd597b6e3402`、aux=[]。相对 [21](logs/21-final-joint-source.json)，仅086的3份测试和本作者 `validate.py` 工具变化；所有运行时/唯一generator/6生成输出/固定样本均未变。081历史清单的events_test.go由086授权新SHA显式替代，其他081/082源无漂移，不修改其历史报告。全部检查、逐阶段前后SHA及复用边界集中于 [40-final-check-matrix.json](logs/40-final-check-matrix.json)。

当前实际窄验证如下，均已等待进程退出；Go 使用 `GOTOOLCHAIN=go1.26.10`、`-mod=readonly`，无真实模型/OS keyring 请求。

| 实际调用/证据 | 结果与边界 |
| --- | --- |
| [01 generation](logs/01-generation.log)、[04 shared negatives](logs/04-generation-negative.log) | 两次生成均 exit0；后者补8份恢复 CAS/代数/状态/水位/真实 UTC 日期/集合上界负例，最终276例。不是最终无漂移复验。 |
| 原 API/execution/effects/Broker/Executor 5包 `go test ... -run '^$'` | 窄编译最终 exit0；首个命令 cwd 拼接使编辑未执行，以及 `toolResult` 未导出导致编译失败，保留工具调用事实，未称为行为红。 |
| [02 first Close](logs/02-close-first.log) → [03 Close](logs/03-close-green.log) | 原断言把 `INSTANCE_CONFLICT` 当 reason，实际是 kind，属于本次夹具错误；只修断言。03 exit0/3.057s，证明真实忽略取消的受控 Engine 未结束时持 DB/Profile、拒新受理，结束后才释放，无 CP 重开明确资格 blocked。 |
| [05 actual Resume](logs/05-resume-first.log) | exit0/0.086s；真实批准→Host commit1→实际 Engine.Resume→关闭→新实例 startup Inspector，零 Run/Resume；用户 CAS 后同 Run/newclaim、原 CP/Decision、Resume1/消息1/Host仍1。 |
| [06 Stop transaction failure](logs/06-stop-fault.log) | exit0/3.242s；原3秒门不变，并以实际 SQLite trigger 拒绝 Stop，验证 durable gate 尚 open 时进程准入仍关闭、Profile未释放；解除后唯一 drain 重试提交再清理。 |
| [07 CP negatives](logs/07-checkpoint-negative.log) | exit0/0.377s；正向阶段链及 missing/corrupt/version/semantic/unassembled 五类真实 CP 阻断，零新模型/Host。 |
| [08 compile](logs/08-stage-settlement-red.log) | exit1，仅本测试误用 `IDQuery` 而实际 Effect API 为 `EffectQuery`，不是产品行为红。 |
| [09 two real reds](logs/09-stage-settlement-red.log) → [10 same-input green](logs/10-stage-settlement-green.log) | 09 exit1/6.137s：真实 completed 审批后位置写故障使点击后卡 recovering；Stop 后已派发 Host 返回错误却留下 dispatching。最小修复后10 exit0/3.187s，原调用/断言不变。 |

09→10 第一处修复仅在原位置为 continuation 时，与原 completed 续体精确比较 CP/审批身份，只读重建原完成 Decision；不回退续体。第二处只允许已派发/unknown 效果的原 owner+claim 持久化实际 unknown 结算；新 ClaimDispatch 仍受取消、恢复、关闭及当前授权门约束。该反例证明效果身份/unknown 与 unresolved 标记保留，不能借结束上下文抹去事实。

联合检查保留每次实际失败，不改称一次全绿：

- [r1全模块 normal](logs/13-normal.log) / [退出回执](logs/14-normal-result.json)：exit1，93.803s，仅 events/foundation 失败，其余包通过。foundation 包是旧版本8/未装配 `runs.resume` 预期；events 是活动受控 Run 未达终态时，测试外部 SQLite 连接附 synthetic delta 的等待超时。081外部受控实验确证相同类型写竞争，原事故是否同源仍仅推断，不能冒充已捕获原始根因。
- Root 精确授权的5份测试修正：foundation 改为实际 Recovery 装配/缺席对照、升级版本9和 Start 成功即登记同一个真实 Wait 的失败清理；events 只在 active fixture 原3秒门内等真实 terminal 后附原 synthetic delta，paused 情形不变。原270/seq274、100/800/250ms、来源/撤权/坏JSON/FK/回滚断言均保留，此轮没有改生产或放宽时限。
- [r2 events+foundation normal](logs/18-r2-affected-normal.log) / [退出回执](logs/19-r2-affected-normal-result.json)：exit1，27.080s，events及foundation其余测试通过；唯一遗漏是 `duplex_test.go` 另一个旧负控仍向已装配 `runs.resume` 发不完整参数。只把负控换成真正未装配的 `sessions.deletePreview`，保留 `METHOD_NOT_AVAILABLE` 断言。随后 [Hello/Recovery两顶层组](logs/22-unavailable-control-green.log) / [回执](logs/23-unavailable-control-result.json) 实际 exit0/Wait，0.885s。

首轮14回执中的 `allProcessesWaited` 仅能证实顶层 `go test` 的真实 `Popen.wait()`，不能证明 `hello(t)` fatal 后跳过正常收尾的嵌套 CLI 已 Wait；[15限定读回](logs/15-first-normal-process-readback.json) 明确保留这一未证实事实。后来无残留进程不替代历史 Wait。新 runner 测试在 Start 成功后立即登记 stdin.Close/cancel/同一个 `sync.Once` Wait，正常链复用同一 Wait，原5秒和业务断言保持。

[11包 race原始日志](logs/24-risk-race.log) / [实际退出](logs/24-risk-race-result.json) / [逐包与无进程读回](logs/25-risk-failure-readback.json)：`CGO_ENABLED=1 GOTOOLCHAIN=go1.26.10 go test -race -mod=readonly -p 1` 加 groups/access/events/delegation/collaboration-policy/chat/approval/effect-reconcile/foundation/assistant/recovery、`-count=1 -v`，实际 exit1/Wait，563.245s，377输入 drift[]。9包通过；groups的来源附件例在 root succeeded 后 History仅2条（预期3），events原270来源例在第二次 `waitTerminal` 的3秒 bounded GetRun返回 `sqlite3: interrupted`；没有 DATA RACE 报告。原100 source29.578ms、sourcefree800116.949ms、source800198.185ms均在原250ms门内，但不抵消两处失败。

该轮失败后按Root指令暂停后续；[085只读诊断](../085-recovery-race-diagnosis/REPORT.md)以屏障确证群fixture恰1 Derived会主动拒绝合法晚读公共消息；事件3秒到期时270事件持续推进并自然succeeded/seq274，guard合一候选仍红，未进入生产。随后Root Map21明确授权086的3份测试维护：群例严格匹配真实根用户message及实际公开History全部Derived、永久覆盖早/晚两顺序；event helper默认仍3秒，仅该270事务正确性case显式6秒。该6秒基于normal/race与观察竞争实测，并非放宽产品800/250ms或关闭3秒边界。原270/seq274/完整来源/坏JSON/撤权断言不减。

[086两包实际结果](../086-recovery-fixture-repair/logs/14-check-results.json)：groups/events normal实际0/Wait22.008s、race实际0/Wait261.758s，joint `01c841f6c6eb51f180daacc2828703c83a12716044bfac272ecbb47360cd5f97` 无漂移。该轮由086原owner执行，本作者/Root回读；不是本作者重复运行。原100/800/250ms断言保留，最终source10034.926ms、source800213.628ms均在门内；270/seq274完整路径绿。前述11包race的其他9包按完全相同运行时字节复用，r1/r2未变包normal亦按Root明确授权复用；不声称最终输入新跑过一次全模块normal或11包race。

最后静态窗口由本作者独占执行，结果如下；实际命令、环境和Wait均在各result JSON与40汇总中：

| 最终检查 | 实际结果 |
| --- | --- |
| [29模块vet](logs/29-final-vet-result.json)：`GOTOOLCHAIN=go1.26.10 CGO_ENABLED=1 go vet -mod=readonly ./...` | 0/Wait0.663s；在原运行时字节执行。 |
| [30唯一生成](logs/30-final-generation.log)：`node contracts/hap/v0.1/generate.mjs` | 0/Wait0.886s；72methods/276cases，40记录6输出逐SHA前后全相等。 |
| [31全局Python](logs/31-final-schema-validation.log)、[32隔离Python原脚本](logs/32-final-schema-validation-venv.log) | 两者实际exit1均保留：先是缺jsonschema的setup错误；既有隔离环境下则旧sample()同时构造none+range字段，被既有条件schema正确拒绝。不是运行时/schema变更。 |
| Root精确补充后的 [37独立Python](logs/37-final-python-green.log) | 既有 `/tmp/huhubot-contract-validator/bin/python contracts/hap/v0.1/validate.py`，jsonschema4.25.1/rfc3339-validator0.1.4；0/Wait0.680s，144形状/4golden/25decimal负例/276共享正负全部验证。 |
| [38 Go架构](logs/38-final-go-architecture.log)、[39 TS架构](logs/39-final-ts-architecture.log) | `pnpm test:huhu-bot-architecture` 0/Wait0.426s（57生产文件）；`pnpm test:architecture` 0/Wait10.379s。 |

Python仅移除旧平行样本构造，改用唯一generator现有规范正向值，校验无重复且精确覆盖144定义；25decimal仍深拷贝变异、276正负仍由独立Python引擎判断。原SHA `25f18159a844229616cd1eb09b51a782e0f05ceddba99b51122d71b4b2261147` → `38a96921af8e9dfd53854850b2987481c717712298cbed0d84e904ba9c0451a9`，schema/generator/固定样本/运行时/依赖锁均未动。[原文与精确补丁](logs/32-validator-proposed.patch)保留。最后只此工具源变化，Go vet和唯一生成按Root补充复用实际通过，不冒称最终Python新字节上重复跑过。

## 问题与下一步

当前自有35文件及全部产品/测试停写，无已知未闭合的本切片实现缺陷；081/082/086成果仍归其作者。各实际顶层检查进程已Wait，40读回当前Go/Runner进程=[]、377来源与9夹具 drift=[]；首轮失败嵌套CLI的历史Wait未证实限定不撤销。未再运行Go/生成/build，只完成本报告与结构交回。Root随后独立E2E/build/lint/审查是下一门。

旧 Source snapshot 绑定的 HostConnection/Lease/Epoch 在真实 Runner 重开后失效，即使新 Host 内容相同也不能无痕换身份；本轮按 Root 明确决定保守 blocked，由081的真实新 lease/零派发反例证明。没有 Go 直接读 Vault 的兜底，也未扩写 T05/T07。

资格 ready 不是未来 HTTP 额度、效果许可或自动恢复：真正模型请求仍逐次经原 Reserve/Dispatch 的当前账户、pause、预留与实际 producer 结束结算。调用者只能在真实 HTTP producer 已结束后 Settle；T08–T10 的实际协议消费者仍后续，不把本轮受控 Engine/HTTP fixture 声称为真实模型协议实现。

未运行真实 Provider/模型、Obsidian 真机、真实 OS keyring 和目标 macOS/Windows 运行；不声称 SDK 生产 CP 兼容已实现。最终原生资产/T27与 Root 独立固定输入 E2E、双轴审查仍由其 owner 执行，不写成此切片已接纳。
