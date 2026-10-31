---
schema_version: 2
session: "20261025T043239Z"
task: "053-collaboration-policy"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-11
---

# T11/T12 联合委派、消息、限制与预算实现

## Goal
完成发现/已有或临时派遣/确认创建提案，以及通知/问答/回执/限制/逐模型调用预算/父子终结，实际接入共同Executor。原 /root/credential_provider；仅Root实际派遣后启动，沿既有实现模型偏好，不再委派。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715；Map14/Goal13/LOG072代码门、LOG051用户后验。AGENTS → Map → dev架构/测试/许可 → T11/T12与原T05维护/I。完整回读041委派、045群恢复、047模型协议预检REPORT与evidence/model-protocol-preflight.md，核对Spec/ARCH/ADR真实合同；研究未来建议不当成当前实现。

T12开工依赖由T11调整为两票共同已完成上游；先冻结T11/公共Port与缺策略默认拒绝，再完成真实T12 policy，联合候选验收后才能给T13。不能把T11恒拒绝/恒允许或未装配的策略当代码完成。

## Workspace and Scope
唯一自有生产路径以两票writable为准，Go路径均在native/huhubot/内：
T11 domain/collaboration/delegation/**、application/collaboration/{delegate,discover,proposecreate}/**、adapters/outbound/sqlite/collaboration/**、adapters/outbound/sqlite/migrations/011-delegation.sql、application/tooling/collaboration-tools/**、tests/contract/delegation/**。
T12 domain/collaboration/policy/**、application/collaboration/{messages,scheduler,finalize}/**、application/execution/usage/**、adapters/outbound/sqlite/{usage,messages}/**、adapters/outbound/sqlite/migrations/012-budget-message.sql、tests/contract/collaboration-policy/**。
原T05 application/access/{context,grants}/**、adapters/outbound/sqlite/grants/**、tests/contract/access/**，仅lineage/当前权限与共同消费者。
原T02最小凭证元数据guard：adapters/outbound/sqlite/assistant/credentials.go，仅BeginDelete等同事务引用谓词识别temporary TaskConfigSnapshot/pin；对应新增消费者回归写自有tests/contract/delegation/**，不改052的assistant测试，也不触及raw provider/OS/keyring/D-Bus。先与052冻结唯一SQL形状，不能通过限制临时模型配置或假Agent行避开真实引用生命周期。
本TASK REPORT/log可写；T01公共API/schema/api.ts/路由/装配/注册、T02配置pin、T03执行器/Run/线程/存储、T06效果与Broker由foundation_go唯一维护；先提出准确合同/事务helper请求，不自己越界或复制第二套。T04事件只读，如确需生产修改先Root开窗口。T07 Host实现他人独占。旧SQL001/002/003/005/006与其他凭证实现/锁/根工程/正式状态都不改，不提交推送发布。

先与052原共享owner冻结唯一API/Port/SQL形状；011/012正文你同一writer串行，注册实际Version6/7由T01确认，不以票号当schema版本。新目录不是创建空壳的理由，按实际职责落地。声明准确子文件后再并行消费，重测试/最终冻结协调Root。

T11：
- discover仅受权摘要，不泄露人格/私有记忆/私聊，不按姓名猜重名；空结果、不可用、截断/分页显式。模型caller取真实ToolExecution，不接受参数伪造。
- delegate existing只创建独立workThread/childRun/Delegation，绝不读目标Bot私聊或新增目录身份。temporary有持久TaskConfigSnapshot/明确Sponsor/recipient/配置修订，崩溃后仍能定位；持久Bot新建仅proposeCreate草稿→用户明确确认→assistant用例，模型文本不能代替确认。
- 受理前交集目标可见/启用、能力、当前来源与接收方、root/parent/深度/数量/预算；缺策略默认拒绝。短事务创建root关联/thread/config pin/lineage/limit reservation/receipt/event与child accepted，commit失败无部分事实，重复同intent仅原ID，异输入冲突；新用户同正文仍新意图。
- 父已经实际消费的history/effective provenance必须传播，包含问题/返回；不能只检查新附件，也不能复制不再匹配child绑定的旧Grant ID。T05派生Grant保持父约束/current revoke/expiry，子结果所有来源进入父下一次模型准入。
- tasks get/list/cancel与统一Run关系、当前权限/分页真实持久查询，不凭内存Promise。

T12：
- notify记录送达不自动创建模型工作；question有界唤醒，reply关联原问题/线程，分清delivered/answered/completed，重复投递/结果/唤醒/父消费持久去重，终态后新工作新Run。按真实Run/thread等待图检测环，不能按Bot名字拒绝合法隔离同Bot委派。
- Spec默认深度3层子执行、总子32、root并发子4/Profile并发子8、自动问答唤醒8，hello/status与根快照一致。不要把子并发4/8偷换为所有HTTP并发默认值；持久子调度计数、实际HTTP槽、费用reservation三者生命周期显式。父wait审批/child/question且producer已停才放模型槽，pin/非终态线程占用保持；明确子等待/重领如何仍遵守4/8且无死锁，固定压力夹具证明。
- 每一次真实模型HTTP attempt预留根额度，唯一attempt ID/用途/配置/claim/generation/provenance/parent budget绑定；dispatch前再校验当前授权/取消/额度/并发。known结算退未使用，estimate/unknown明确非零，不凭取消/断流全退已派发额度；未派发可退且幂等。重试/工具后续/摘要/问答/子调用/未来记忆都消费同一pure Port；不能只按Engine.Run预留一次。优先禁SDK自动retry，后续adapter受控retry每次重新准入。
- 费用/usage记录能关联agent/persona/model revision、root/task/purpose、known/estimate/unknown，不能在诊断里放正文；精确美元封顶不是本票承诺。root retry仍原预算归属。
- 父状态由真实Run/Delegation投影，有活动后代或unknown effects不能succeeded，部分结果/失败原因结构化，持久等待释放实际worker；真实结果投递后同Executor继续，不由模型自报完成。
- 与原T03/T06提供T13成员移除所需最小子树cancel/admission屏障；取消一个child不关sibling连接/其他root，不抹已dispatch unknown。完整手动恢复属T16，不在此复制恢复引擎。


055-memory-preflight已真实MESSAGE/FINAL交回并由Root完整回读、return0、11个产物摘要核对接纳，见evidence/memory-preflight.md；完整阅读REPORT及interfaces-and-owners.md，其12项矩阵全部未运行。Root已核Spec §5与§10，以下是当前接缝约束：047的同一逐HTTP attempt Port足够，自动维护需独立purpose/account额度与Profile总账归属，未配置/用尽/暂停即零模型请求，不借已终结聊天余额。此窗口只让共同Port与受控consumer证明这个门；维护job、memory item、forget墓碑与作业代数CAS由T14实现。T11须持久携带应用从真实选入消息/摘录/子任务结果得到的派生身份与所属namespace/workThread，不能只有正文+Host SourceSnapshot；未来memory revision沿同一可信lineage接入，不接收模型自报owner/source，也不提前造无消费者记忆表。

## Acceptance
真实公开Facade/SQLite + 同一Executor受控Engine完成已有/temporary委派、再委派、notify0模型、question/reply、取消隔离、最后额度竞争、limits/wait graph、unknown费用/partial结果以及commit/重启扫描故障；必要经过真实stdio共同合同。验证实际模型请求计数的受控回调，不以内存policy单元测试替代消费者。引用每项AC本票职责；真实Provider/Obsidian/目标OS用户后验。

永久有意义的红→绿用例，适用Go普通/race/vet与架构；所有来源授权原断言保留，最终共享input冻结后RootE2E及独立双轴审查。禁止旧默认D-Bus探针或真实keyring访问。本TASK不改正式Map/Evidence/票状态。

## Return
REPORT首个h2前Session: 20261025T043239Z、Task: 053-collaboration-policy、Status: completed；h2聚焦交接、产物与验证、问题与下一步。准确自有文件SHA/合同冻结/原始命令exit/事务故障事实与未来消费者边界；全部进程Wait和writer停写，return0后真实MESSAGE/FINAL，Root全读核验。额外路径/合同需求先精确请求。


实际窗口：LOG072已接纳050标准/规范两轴pass，Map14/Goal13/LOG073已生效，map14-maintenance-validation.json全部适用结构/Skill/Execution检查0，55AC无删减；精确共享owner见map14-ownership-validation.json。052原API owner已通过057只读预读准备共同合同，正式实现以Root实际派遣为准。先共同确认唯一API/SQL/生命周期，不用临时平行类型开路；可先做不依赖未冻结合同的自有纯policy/行为测试设计。051只写五个根共享路径，054随后接TS，无共同产品writer。当前TASK准备不启动任务，等Root真实followup_task。


## Root 实际交接补充
LOG072 的双轴复审已真实接纳，Map14/Goal13/LOG073 是当前窗口，HEAD/base 未变。057 已真实 MESSAGE/FINAL 交回，Root 全文回读和 4 产物核验，接纳见 evidence/notes-collaboration-contract-prep.md；056 同样已真实交回，最终 REPORT SHA f5a02bb40d40169dc858a98138af186efb0ef9d46c796608716620256c89047a、11 产物核验，见 evidence/data-maintenance-preflight.md。两份研究矩阵均未运行，不冒称代码验收。
迁移默认采用独立完整 HUHUCP1 副本和最后清单，放在 live checkpoints 外；base 通过内部 adapter 阶段与 bootstrap 组合，避免反向 import effects。原凭证 guard 的测试仅 053 自有 delegation 测试，不扩 052 原 assistant 测试。取消协议须覆盖响应先于取消、取消先于响应、非常迟到的真实 Vault promise；正常单请求取消不得破坏兄弟任务连接。
