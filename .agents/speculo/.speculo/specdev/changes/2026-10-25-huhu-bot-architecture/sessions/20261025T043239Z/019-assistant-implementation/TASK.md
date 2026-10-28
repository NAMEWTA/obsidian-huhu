---
schema_version: 2
session: "20261025T043239Z"
task: "019-assistant-implementation"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-02
---

# T-02 完整代码实现切片

## Goal
依赖放行后负责完整持久Bot/配置/删除预检/模型入口，以及原T01共享合同和Go装配维护。不得在Lead明确T01代码验收通过/派遣前启用writer。先冻结可供020/021消费的精确公共合同，再实现真实SQLite用例；不得把空handler/fake成功当产品交付。

## Inputs
工作区 /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，实施基线 33c21e098ef3188cbab5a09f3e0a01fadb787715。用户完整实现授权及代码层交付口径见 LOG-047/050/051；真实模型、OS keyring/Obsidian用户操作留 user-owned，不索取真实秘密。Map8 → 当前 dev 与 architecture/testing/licensing/build-and-release → T-02 → Spec/ARCH/ADR 的本票范围；阅读 I implementation-procedure/execution-preflight 与适用风险/TDD规则，复用不变部分。完整读 sessions/20261025T043239Z/010-assistant-preflight/REPORT.md 与 evidence/credential-interface-research.md，预检已有固定官方源码/许可证/可行性探针，不从零猜 Windows fd 或直接复制不明代码。先比较两种实现/失败边界，再采用已有预检的窄接口、有界 worker 与独立匿名管道。T-01共享合同只有原owner在Lead窗口维护；该维护属于新输入，旧T01快照保留历史，受影响测试/审查重新覆盖。全部生产实现由执行者完成，Lead只编排/集成/正式状态。

## Workspace and Scope
作者原 foundation_go，T02自有 domain/assistant/**、application/assistant/**、sqlite/assistant/**、002-assistant.sql、tests/contract/assistant/**中助手/事务测试（不写credentials*文件，由020拥有）。同时以原T01 owner身份维护 src/modules/huhubot/api.ts、contracts/hap/v0.1/**、internal/application/api/**、inbound/hap/**、protocol/hap/**、cmd/huhubot/**、bootstrap/core.go、sqlite/base/**、migrations/*.go、go.mod/go.sum、foundation受影响测试。不得写TS protocol/transport/credentials/services、Go credentials adapter或T27文件。先向020/021发送具体接口/DTO和fixture/hash冻结；其修改请求统一由你维护，不允许他们写上述共享文件。

采用010精确请求：Draft与server revision分离、无credentialRef草稿、安全CredentialStatus、isDefault、必需expectedRevision、agents.delete必需id、明确models.test可用性；秘密不进公共HAP。API纯stdlib，不引入SQL/keyring/wire。Credential provider/registration/catalog窄Port和model probe/usage/config snapshot Port要由真实消费者使用，不是通用框架。与020约定私有channel与worker导出接缝，CLI只由你接纳可信managed/private-channel及内部worker分支，bootstrap注入真实provider和DB元数据引用owner。020不得自行改cmd。Go依赖采用010固定keyring0.2.8/真实传递闭包，只有实际需要才加入，向T27通知。

002迁移在原同一DB/UoW串行注册；旧schema1真实Profile需安全升级、失败保持原库，不能仅bump版本或重建库。最小一致备份/原子迁移接缝与T19方向一致，不提前假报完整T19。默认Bot一次性初始化；receipt键 profile/principal/method/idempotencyKey，同输入复用/异输入冲突；epoch/expectedRevision CAS、immutable persona/model revisions、稳定不可复用ID。schemaVersion变动要区分HAP合同版本和DB版本，不无意改客户端固定协议版本。

## Acceptance
AC-002/003/004/042本票接缝全面实现：真实SQLite重开默认/自建Bot稳定ID，重名允许、临时Run不自动创建目录Bot；同revision并发一胜一冲突；同key重放/不同输入冲突；实际fake Run消费者固定旧修订，新run取新head。disable先阻止新准入，UsagePort非空真实回执阻止不安全删除，preview绑定epoch/revision/usage快照且短期，变化重预检、不删别的Bot；无相关上下文时需明确未装配状态，未来注入真实Port后不得保留永远empty fallback。

凭证只保存随机ref/归属/模式等必要非秘密元数据，以便重开解析和后续Profile清除；private registration不可复用ref避免覆盖未知结果，protected超时unknown经同ref核查，关联引用保守。OS/网络不在SQL事务等待。删除人格/模型正文与在途快照/引用必须一致，无需求不遗留正文；若清除含正文的历史命令回执，按Spec增加commandEpoch，旧epoch必须先拒绝，不能先读取旧receipt让已删除人格正文重新可见；credentials可能共享引用不得扫全库删除。模型测试入口只最小Probe，不携带资料/历史/记忆/工具，未装配adapter真实返回MODEL_UNAVAILABLE/ADAPTER_NOT_ASSEMBLED，不谎称连接成功，不静默协议/endpoint替换，不读取CLI/env钥。

真实公共Facade+HAP+SQLite合同测试覆盖正常/失败/并发/旧schema升级；使用固定哨兵，HAP/错误/DB/回执无secret。CLI/worker接缝联合后测EOF/超时/清退。新行为先红后绿；定向assistant+foundation回归、race关键CAS、vet/架构、生成一致性/跨语言schema，协调021真实TS→Go。T27串行最终工程构建，不能自行写根产物。

## Return
不得改正式 Ticket/Map/Goal/Evidence、其他TASK、根 package/lock/build/notices/current文档；不得提交/推送/发布或再派遣。只写本TASK报告/原始日志/hash及明确生产写集。首个h2前 Session: 20261025T043239Z、Task: 019-assistant-implementation、Status: completed；必需h2聚焦交接、产物与验证、问题与下一步。列采用方案、真实消费者、文件、红绿/失败与恢复、命令/exit/观察、源码/输入hash、未验证项和依赖接缝；completed仅候选返回。最终validate-dispatch return0、所有子进程结束、生产writer停写后通知root。需要超出写集先向Lead给精确路径/必要性，不写平行入口。
