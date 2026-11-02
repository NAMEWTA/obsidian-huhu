---
schema_version: 2
session: "20261025T043239Z"
task: "052-note-effects-go"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-07
---

# T07 Go 写入核查与 T11/T12 原共享 owner 装配

## Goal
完成单笔记 Host 写入/回执核查的 Go 端，维护同一公共合同、执行器/配置/效果存储以真正消费新委派与预算业务。原 /root/foundation_go；仅 Root 实际派遣启动，沿既有实现模型偏好，不再委派。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715；LOG072 实际代码门、Map14/Goal13、T07 与原T01/T02/T03/T06精确共享维护。AGENTS → Map → dev 的架构/测试/许可/Obsidian API参考 → 当前票/I。完整读036-note-effect-preflight、041-delegation-preflight、045-group-recovery-preflight REPORT；047-model-protocol-preflight已实际交回，完整阅读其报告及Root接纳evidence/model-protocol-preflight.md；采用逐HTTP请求Port的职责边界，不把建议的故障矩阵冒称已验证。其研究建议不取代Spec/ARCH/ADR。LOG051真实模型/Obsidian/目标OS用户后验，无密钥请求。

## Workspace and Scope
自有T07：native/huhubot/internal/application/tooling/reconcile/**、internal/adapters/outbound/hostbridge/write/**、tests/contract/effect-reconcile/**。
原T01：internal/application/api/**、internal/protocol/hap/**、internal/adapters/inbound/hap/**、internal/adapters/inbound/stdio/server.go、internal/bootstrap/core.go、internal/adapters/outbound/sqlite/migrations/*.go、internal/adapters/outbound/sqlite/base/**、tests/contract/foundation/**、contracts/hap/v0.1/**、src/modules/huhubot/api.ts（以上Go路径均native/huhubot/内）。锁文件只在真实依赖需要且Root登记后改，本阶段预期无需新依赖。
原T02精确：application/assistant/ports.go、service.go、adapters/outbound/sqlite/assistant/store.go、tests/contract/assistant/assistant_test.go；只配置/pin/usage共同消费者；sqlite/assistant/credentials.go临时引用删除guard由053原凭证owner独占，你只提出同Tx helper/列的准确合同，不碰该文件或raw credentials实现/测试。
原T03：domain/execution/run/**、application/execution/executor/**、application/conversation/direct/**、adapters/outbound/sqlite/conversation/**、adapters/outbound/sqlite/execution/**、tests/contract/chat/**。
原T06：application/tooling/broker/**、adapters/outbound/sqlite/effects/**、adapters/outbound/blob/store/**、tests/contract/approval/**。
只写上述和本TASK REPORT/log。011/012 SQL正文及collaboration/usage/messages业务由credential_provider独占；T07 TS与TS protocol由foundation_client，T05 Go由credential_provider，T04维持只读，T27工程由原owner。旧001/002/003/005/006 SQL不改，不写别人测试/报告/正式状态，不提交推送发布。

先与T11/T12作者共同冻结API/Port/SQL形状和调用顺序，再由唯一owner写合同/生成两端，发实际路径/hash给消费者。不要让构造器恒放行替代实际policy；注册011/012按下一实际schema版本串行，保留旧SQL哈希。各自fixture独立，重build/race和Root协调。

056/057只读准备发现且Root已回读核实：现有base.Open迁移前仅VACUUM INTO DB，随后bootstrap调用Blob Collect；下一011/012迁移前旧库已可能引用T06 CP。此次原T01/T06维护必须在任何新迁移前完成DB与所引用Blob的版本/hash一致恢复集，缺失/损坏/发布失败不得继续迁移；恢复集中的唯一正文不得被后续GC破坏，受管备份仍可由未来T17清除。复用原Artifact校验与不可变存储；完整T19备份管理/恢复UI和公开API仍后续，不借旧inode锁rename替换DB。原owner只读草案见057，正式报告若已交回则完整回读；未跑矩阵不冒称验证。

T07具体：
- 可信Host预览把opaque目标/当前workspace/origin lease、真实全文baseline/目标版本/工具版本与确切参数绑定，旧普通客户端不能提交路径自证身份；写前再核当前Grant/审批参数/取消/lease。
- Host Write/QueryReceipt/reconcile经生产反向HAP和HostWriteService，公开Effect核查用例挂实际Facade/router。只有匹配原effect fingerprint的可信completed回执可committed；仅后置条件满足reconciled；写前原文未变/超时/kill不证明没写，未知保留unknown，不自动重发。
- 受管回执先received后实际mutation再completed；文件与receipt非原子窗口明确处理。接收重复返回原identity/status，同effect异payload冲突，核查只读且可以新lease读取旧可信回执，不能借新lease重写。
- 045指出reverseCall ctxDone目前s.Close会关闭共用Host连接，TS非read abort也类似；与TS原owner共同实现单请求有界取消/结算及严格有界late-response关联，单树cancel不打断其他任务。连接真正失联仍按统一持久中断处理，不能制造无限pending/tombstone。
- reconciliation在原终态Run追加非正文ledger，不能重开Run/pin或把reconciled伪装原committed；公共API测试真实DB及TS-Go穿过生产桥，外部Vault用受控adapter测试。

T11/T12共同接缝：
- 仍同一个Executor/Claim/Finalize/Resume，不开第二团队引擎。已有Bot新workThread与私聊隔离，temporary持久TaskConfigSnapshot明确Sponsor/recipient，原T02配置/pin快照正确；子受理原子绑定root/parent/thread/config/delegation/lineage/limit/receipt/event，accepted真实扫描。
- RootRunID不再默认为每个child自身，单读/批读沿同一scanner保持ACL；业务SQL事务由collaboration store与原execution/assistant helper同一Tx，pure Application不带sql。
- caller从真实ToolExecution注入，工具进入共同ToolInvoker/Broker分派，不复制业务授权。父实际消费的历史effective来源、结果/问题/回复传播必须交T05逐跳授权；不能只转新附件或复制不兼容旧bound Grant IDs。
- EngineInput新增纯逐实际model attempt Port，绑定run/root/claim/generation/config/purpose/recipient/provenance；permit/reserve→真实dispatch→幂等known/estimate/unknown结算，后续Engine每回合/重试/工具后恢复都消费，不能只按Run一次预留。现阶段受控Engine至少实际模拟多模型尝试验证消费者，真实SDK由T08–10。
- Spec根4/Profile8为并发子执行；持久子执行位、真实HTTP在途位、费用预留分别治理。wait审批/child/question后确无模型producer才释放模型槽，但pin/非终态身份/线程不释放。必须与T12作者显式冻结子执行等待/重领计数语义，保持3/32/4/8/8且无隐藏新上限。
- 原T03/T06提供T13即将需要的最小持久子树cancel/admission屏障，取消一个child不影响sibling/其他root，已dispatch unknown保留；完整树用户恢复属T16。父有活动后代或unknown effect不能succeeded，共同Finalize用真实T12 policy返回partial/failed结构，不由模型自报。


055-memory-preflight已真实MESSAGE/FINAL交回并由Root完整回读、return0、11个产物摘要核对接纳，见evidence/memory-preflight.md；完整阅读REPORT及interfaces-and-owners.md，其12项矩阵全部未运行。Root已核Spec §5与§10，以下是当前接缝约束：047的同一逐HTTP attempt Port足够，自动维护需独立purpose/account额度与Profile总账归属，未配置/用尽/暂停即零模型请求，不借已终结聊天余额。此窗口只让共同Port与受控consumer证明这个门；维护job、memory item、forget墓碑与作业代数CAS由T14实现。T11须持久携带应用从真实选入消息/摘录/子任务结果得到的派生身份与所属namespace/workThread，不能只有正文+Host SourceSnapshot；未来memory revision沿同一可信lineage接入，不接收模型自报owner/source，也不提前造无消费者记忆表。

## Acceptance
按票对应AC代码责任完成真实公共Facade/SQLite/反向HAP的批准/拒绝/源变/未保存/create冲突、写后丢回执/断连/取消/重开、重复与unknown查询行为；真实Vault操作留用户。新增协作共同消费者在同一Executor上实际走通，不以未装配Port通过。保留行为红灯→修复/适用Go普通/race/vet、schema严格验证和生成一致性；最终联合冻结后Root全插件build/lint/Lead E2E与未参与实现者双轴审查。不能自行标完成或重跑旧默认D-Bus探针。

## Return
REPORT首个h2前Session: 20261025T043239Z、Task: 052-note-effects-go、Status: completed；h2聚焦交接、产物与验证、问题与下一步。准确自有文件/hash、合同冻结、公共消费者、原始命令/exit/工具链与复用边界，所有受控fixture/probe进程退出Wait、停写。return0后真实MESSAGE/FINAL，Root全读核验。若需要额外文件先请求Root精确窗口，不靠空文件或改断言绕过问题。


## Root 实际交接补充
LOG072 的双轴复审已真实接纳，Map14/Goal13/LOG073 是当前窗口，HEAD/base 未变。057 已真实 MESSAGE/FINAL 交回，Root 全文回读和 4 产物核验，接纳见 evidence/notes-collaboration-contract-prep.md；056 同样已真实交回，最终 REPORT SHA f5a02bb40d40169dc858a98138af186efb0ef9d46c796608716620256c89047a、11 产物核验，见 evidence/data-maintenance-preflight.md。两份研究矩阵均未运行，不冒称代码验收。
迁移默认采用独立完整 HUHUCP1 副本和最后清单，放在 live checkpoints 外；base 通过内部 adapter 阶段与 bootstrap 组合，避免反向 import effects。原凭证 guard 的测试仅 053 自有 delegation 测试，不扩 052 原 assistant 测试。取消协议须覆盖响应先于取消、取消先于响应、非常迟到的真实 Vault promise；正常单请求取消不得破坏兄弟任务连接。
