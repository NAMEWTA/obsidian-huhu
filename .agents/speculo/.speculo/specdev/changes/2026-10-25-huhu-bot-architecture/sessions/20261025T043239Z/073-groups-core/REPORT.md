# 群聊共享合同、执行器与迁移交回

Session: 20261025T043239Z
Task: 073-groups-core
Status: completed

## 聚焦交接

完成群公共合同、同一 UoW/Executor 的纯编排根及真实目标子任务、群引用/附件投递、Version8 FK rebuild 和效果 owner 只读核查的候选实现。显式 @B/C 零 A 配置借用、零 A 模型与汇总费用；持久成员/来源贡献 proof 随真实消费增长，公开 transcript 单独按持久 seq 发布。作者 native `/root/foundation_go`，Root 派遣请求 `gpt-6.1-sol/xhigh` 仅是偏好记录，工具不证明实际底层模型。35自有源码/测试已停写，所有自有进程已 Wait；联合第二版全 Go normal、十包 race 和模块 vet 均通过。completed 仅表示候选交回，Root 后续独立 E2E、构建和审查门不由本报告替代。

## 产物与验证

### 精确写集与实现

按原073 TASK（SHA `598f4d8b8dc564169706644c8c057e6f25ed3575175e90ef271cf8f53f1cd40e`）、Map18 的迁移/附件与 stdio 精确补充，以及 Map19 效果 owner 补充实施；未改正式状态、他人报告、旧 SQL、依赖或提交发布。规则/原输入见 [00](logs/00-inputs.json)，效果补充 SHA `813ed67fc1c74e83f888339cb61019f5dd9bb60912aed6b73811f1ceee520d17` 的读取 ACK 见 [17](logs/17-effect-owner-check-results.json)。完整35自有路径与 SHA 见 [18 自有冻结](logs/18-own-source-freeze-before-joint.json)，树 `004431c16aba8e87473f05ec65a4ebba39ef0d9a4a5b9827f1710cd08117066e`；其后仅074有一行错误 reason 修正，073自有未变。其余 T06/T07 仍只读，本次仅维护 effects/reconcile.go 与原 reconcile_test.go 两路径。

群会话真正存储 `kind=group`、多成员、协调者、成员 incarnation/historyRevision/显式 none 或范围历史。群发送仍是一次用户意图和一个原 UoW：纯 `orchestration` 根不持 Bot 配置、pin、模型 recipient、模型 claim 或来源授权；默认只建协调者的真实执行子任务，显式 @B/C 只建这些成员子任务。每个真实子任务有独立配置 pin/线程/DelegationInput/来源准入，用户批量边不借 A 的工具 allowlist、Grant 或费用。根完成由同 Executor 的应用汇合处理，编排根本身不发模型，也不追加协调者汇总调用。整批任一目标失败、busy、CAS 与幂等仍同事务处理。

成员资格是服务端持久有效 proof 集：真实私有结果/消息消费可在更高 Run.revision 严格增加完整 tuple；旧代不能替换成新代。共享 Claim 在消息消费后刷新当前有效输入；AppendEvent/Finalize 的群路径在可信 claim 验证后重读实际全量 provenance。模型 HTTP/Host 最后门仍读当前事实，不能只检查启动时的旧 proof。成员移除阻止旧任务读取、Dispatch 和未公开正文发布；已合法发表的公共 transcript 按持久 message seq 独立保留，来源仍受当前授权约束。074负责业务资格、发布器、私有结果/消息贡献闭包及真实 Go↔TS 行为测试。

用户原文和附件标签分开。附件仅保存发送时快照/revision/originView 元数据，不赋予模型权限；Engine History 剥离标签。History 返回当前可读标签，物理 stdio batch 合并每个实际序列化副本的完整标签证明；nil 首副本不能丢掉后副本的证明，32项总上限超限拒绝、不截断。公开消息 seq 与每 Run event seq 分离；修复新 child 初始 accepted 真正为 seq1，保留严格日志缺口检查，不改历史事件。

### 唯一合同、迁移与检查

唯一 API/schema/generator 已冻结：71 方法、142 method validators、266 共享样本。TS api SHA `9cf6d25e4783e203bf47a475852bed436490da4892eaec86c1ba2b78739d4f34`，schema 与 Go 嵌入均 `d45693a3b4b2abbe635cf2f8b4655b63a4419458bb1e4854723f786a63ed1217`。六个输出在隔离目录重新生成逐字节一致，实际工具无 `--check` 参数，见 [06 生成复验](logs/06-generator-repro.json)。075 已消费这份合同并单独交回；其检查由075作者执行，不归为本作者实跑。

迁移仅 Version8/013 标记受控 FK rebuild。完整恢复集完成且 Profile 锁有效后，专用连接在事务外临时关闭 FK；原迁移序列同 Tx 执行；提交前检查完整图，提交后重开并验证 FK=1，再返回 Store。失败不返回可用 Store，不 rename 替换实际身份文件。旧 v7 手工夹具使用七个原 SQL 真实建库，验证旧 Session/member/message/Run/event/thread 保留，以及 statement/内生 FK 故障整事务回滚。该夹具无 CP；真实带 CP 的旧 Profile 升级留给 Root 尚未运行的独立 E2E。T02 usage 真实计算 active 群引用，成员移除后旧 deletePreview token 失效。

| 实际检查 | 结果与边界 |
|---|---|
| [01 迁移定向](logs/01-migration-check.log) | exit0 / Wait，0.115s；随后 registry 清理补强已由最终矩阵覆盖。 |
| [02 首轮基础/配置](logs/02-foundation-assistant-first.log) | foundation 0.352s、assistant 0.047s，exit0 / Wait；这是早期263样本输入，不冒称最终266。 |
| [04 单变量 batch 红](logs/04-first-proof-counterfactual-red.log) → [05 当前绿](logs/05-batch-union-green.log) | 隔离当前副本只恢复 first-proof collector 的受控反事实，不是完整历史生产快照；真实 stdio/net.Pipe 回归识别丢证明，当前8场景0.262s、exit0 / Wait。真实 SQLite/Grant fence 由074另测。 |
| [11 owner效果核查红](logs/11-effect-owner-probe-red.log) → [15 真实公开流程绿](logs/15-effect-owner-green.log) | 11红灯所用223文件隔离输入中，公开群 B 写入丢回执→unknown→移除B，owner Get/Reconcile 被 GROUP_MEMBER_REMOVED 阻断。最小修复仅效果读取门；当前旧6回执对照和新群/foreign对照 exit0 / Wait，0.370s。Invoke=1，合法新lease Query=1，foreign principal/Profile 查询0，审批 Preview 仍拒，终态未重开，幂等不再查Host。 |

[10](logs/10-effect-owner-probe-fixture-first.log)仅首次夹具缺必需 Title，不是产品红。[14](logs/14-effect-owner-green.log)虽文件名含 green，实际 exit1：尝试 child event head=0 被旧 CHECK(event_seq>0) 拒绝；保留完整失败，改为 head1 同 Tx 直接写 accepted seq1，未改旧 SQL。074的原始 Tail0 EVENT_LOG_GAP 红与后续相同永久用例保存在074日志。效果 owner 修复真实源前后差异见 [16](logs/16-effect-owner-and-event-fix.patch)，移除的只是无正文 EffectView/内部只读核查所不应依赖的当前模型正文门；唯一 execution.ReadInTx owner/Profile/Session 验证、Host lease/指纹/CAS/幂等仍保留。

联合348输入已实际固定，见 [19 joint](logs/19-joint-source-before-checks.json)，树 `62c543c90a4191e733b228ab2c71eaa0e522d43cbea5252421ae2c56e046ac22`；073/074/075的35/37/9自有 SHA 均核验无漂移。Root分配的唯一普通全module命令 `GOTOOLCHAIN=go1.26.10 CGO_ENABLED=0 go test -mod=readonly -p 1 ./... -count=1` 实际 exit1 / Wait，wall71.004s，前后348输入drift[]。唯一失败包access的原单读/批读错误一致性回归：direct Run principal异常被新单读Group检查提前换成GROUP_BINDING_CHANGED，原批读仍RUN_SCOPE_MISMATCH。其余9个合同包实际exit0（含最终266共享样本、迁移、效果owner、群真实TS-Go链）；保留 [20 完整日志](logs/20-joint-normal.log)、[23 实际进程结果](logs/23-joint-check-results.json)、[24 失败/复用边界](logs/24-normal-failure-summary.json)。该首轮按Root要求停止race/vet，均未启动；不改旧断言或边测边改源。此失败未修改旧断言：074只把相同持久 Run 范围异常的 reason 恢复为原 RUN_SCOPE_MISMATCH，DB/完整 proof/成员判断均保持；[074/28](../074-groups-domain/logs/28-single-batch-scope-green.log) 原完整单/批回归和 [074/29](../074-groups-domain/logs/29-scope-group-controls-green.log) 群撤权对照均实际0/Wait。

[25 联合 r2](logs/25-joint-source-r2.json) 核对唯一生产差异就是该一行，仍348文件，树 `49eb41c7b11d57051d2b12edfbf1ae1bfb682b85cd9ac4e0c2de4c1c24595be1`。07335、07437r2、0759自有摘要全部匹配；最终两份后端报告共同绑定这一 manifest。

| r2实际命令（cwd native/huhubot，GOTOOLCHAIN=go1.26.10） | 真实结果 |
|---|---|
| `CGO_ENABLED=0 go test -mod=readonly -p 1 ./... -count=1` | [26 完整日志](logs/26-joint-normal-r2.log)，exit0/Wait，wall69.309s；含全部10合同包及最终266样本、真实TS-Go/Host消费者。 |
| `CGO_ENABLED=1 go test -mod=readonly -race -p 1` + groups/access/events/delegation/collaboration-policy/chat/approval/effect-reconcile/foundation/assistant十包 + `-count=1` | [27 完整日志](logs/27-joint-race-r2.log)，exit0/Wait，wall462.458s；完整展开argv及每阶段进程PID/Wait在29。原100/800来源250ms、270 delta、071既有断言保持且通过，未抬门限。 |
| `CGO_ENABLED=0 go vet -mod=readonly ./...` | [28 完整日志](logs/28-joint-vet-r2.log)，exit0/Wait，wall0.788s。 |

[29 实际联合结果](logs/29-joint-check-results-r2.json)记录每阶段前后与最终348输入drift[]。r1九个成功包仅作为历史保留；r2对全部normal及十包race重新实跑，不拿r1旧字节冒充r2。075的180项客户端检查按 API/schema/TS 字节未变复用，没有重复运行或归为本作者执行。自有临时目录与进程清理见 [30](logs/30-cleanup.json)：所有子进程Wait，隔离probe目录已移除，完整输入清单/原始probe/差异/红绿日志保留。

最终 [31 复核](logs/31-final-source-check.json) 对07335/07437/0759与joint348逐SHA核对均drift[]，报告链接缺失[]、自有Go格式与diff检查exit0。所有生产/测试源码继续停写，剩余仅本报告与本任务回执写入。

## 问题与下一步

当前无已知未闭合实施阻塞。首轮normal错误合同回归已按原断言修复，第二轮完整适用检查通过；35自有源和348联合输入保持冻结。原始失败、夹具错误、受控反事实及真实产品红灯已分别保留，不计作正式独立审查尝试或替代Root验收。Root将对稳定候选独立运行真实 v7 完整恢复集升级、群公开API/Attempts/预算/资格竞争、TS→HAP→Go→Host E2E，再构建/lint与独立双轴审查。当前报告不替代这些门。

本作者未运行插件全build/lint、当前五目标资产构建；最终产物由Root/T27在稳定输入接纳。未运行真实模型/Provider、真实 Obsidian/Vault、OS keyring、Windows/macOS 真机操作；它们为既定用户后验边界。纯编排根和受控 Engine/Host 测试不代表三协议实际 adapter 已实现。未新增 T16 恢复策略或提交/推送/发版。
