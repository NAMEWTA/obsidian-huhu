---
schema_version: 2
session: "20261025T043239Z"
task: "026-chat-implementation"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-03
---

# T-03 单聊原子受理、扫描执行与可靠终结

## Goal
实现T03全部代码；从真实公共Facade/HAP进入同一SQLite，幂等受理、独立持久事实、受控fake Engine合同与历史均可复验。Root仅编排/集成，不代写生产实现。

## Inputs
工作区 /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，初始base33c21e098ef3188cbab5a09f3e0a01fadb787715。用户LOG-047/050/051授权完整28票代码与Agent Team，本轮代码层验收，真实模型/Obsidian/目标OS操作留user-owned；不得索密钥或重复实施批准。先读当前Map→dev/architecture/testing/licensing→当前Ticket→相关Spec/ARCH/ADR及I implementation-procedure/execution-preflight/TDD/风险参考。当前Map10/Goal9，LOG060依赖门已关闭，产品r2由033两轴pass，工程slice3由030两轴pass，Root当前全部校验0（evidence/T-02-logs/code-gate-r2.json）。本TASK仍以真实Lead followup_task为启动信号。依赖证据在evidence/T-01.md/T-02.md，实际当前快照以派遣消息为准；不能拿旧r3冒称新共享代码已通过。另完整回读031-chat-access-preflight/REPORT.md；参考evidence/chat-access-preflight.md与IMPLEMENTATION-REFERENCES.md固定来源/近两年活动/许可/采用差异；陌生点先查官方源码与维护/许可，必要时最小探针，不复制不明代码。

## Workspace and Scope
原foundation_go负责T03全部原票Go写集：domain/conversation/direct、domain/execution/run、application/conversation/direct、application/execution/commands、application/execution/executor、sqlite/conversation、sqlite/execution、003-conversation-run.sql、tests/contract/chat。同时作为原T01 owner独占API/schema/协议映射/Go锁/迁移注册/CLI/core bootstrap，接受T05两位的精确合同请求；不得改T05自有目录或TS transport/host/client。共享API先小步冻结再让T05消费者实施，SQL迁移003/005注册串行，不同时跑全局构建。

LOG061已同步T01/T02精确维护和Map9资源合同，原owner现可维护：sqlite/assistant/store.go的PinInTx/ReleaseInTx及事务内Usage最终guard，application/assistant/{ports,service}.go的纯接口，tests/contract/assistant非credentials*回归；credentials.go默认只读复用，确有必要的私有helper抽取先给root精确请求。002历史迁移不可改，credentials provider/其测试仍原owner。SQL事务类型仅停留adapter之间，不进入Application/Domain。实际同库SnapshotUsageInTx也不能再次BeginTx造成单连接死锁。

003/005是票号文件，注册为连续SQLite Version3/4；将来004文件取得后续真实版本，不能造空004或重排历史。003/005正文分属026/027，embed/CurrentVersion/Ordered由026唯一串行接纳；两份SQL就位后冻结注册，再让独立临时Profile进行两票数据库验证。共享API先冻结，包含031最小SourceSnapshot/Grant/Host read-search及服务端lease字段请求，两个消费者不能各自复制DTO。028获root明确原TS协议维护窗口后负责connection.ts与相关测试，026不跨写。

优先回读原幂等receipt与epoch，再判断新意图revision/busy；同input同key一条Run/用户消息，异输入冲突；commandId不是意图去重替代。受理在同一短事务提交Session占用/修订、immutable配置与来源引用、根Run accepted、首持久事件和receipt。真实使用T02配置引用和usage消费者，协商最小事务接缝避免预先pin后busy/失败泄漏、disable/delete竞态。不能在SQL事务等待Host/模型。新的相同正文新key不能被hash吞掉。

RunExecutor由bootstrap实际装配，持久扫描accepted、CAS领取；唤醒仅优化，断开客户端不取消已受理工作。Engine port只纯HUHU数据，实际fake用于测试依赖注入，不开放生产fake回答或假成功；未装配模型明确不可用。preparing/running中断不能因扫描自动重放付费动作，按T16未来核查入口保留旧事实。有限并发/队列/退出，模型与Host在事务外；终结一个事务写完整/部分消息、usage、事件、终态与释放占用，失败不呈现已保存。T04维护事件续读，但T03首/终事件必须真实持久。先回读T04合同：seq按Run作用域在持久事务提交时分配，T04复用本票唯一事件事实与同事务写入口，不另建广播权威；本票交回时说明原子事件写入/续读所需最小接缝及owner，不提前实现T04全票。

历史分页、归档、编辑新意图关联通过当前权限Port；与T05协商共同读取/上下文校验接口，未装配的资料能力fail closed，不复制全部Vault或只在UI隐藏。向T02注入真实Run/session UsagePort，不保留永远empty fallback。

## Acceptance
真实SQLite并发同key同/异输入、不同key busy与原key仍复用、两个入站同一Facade、配置旧新revision、相同正文新意图、历史分页与归档不调模型。真实进程在commit后唤醒前退出/重开扫描；终结故障注入/磁盘失败证明旧状态、receipt/event/message一致且Session不双占用，失败不能重新产生key。断开/EOF/异常清理与生命周期race，定向chat/assistant/foundation回归、架构/vet、schema生成一致性；root最终E2E与T27工程窗口。保留T01日期/Unicode/实例锁/背压边界。

## Return
不要改正式Ticket/Map/Goal/Evidence、别人的TASK/REPORT、根package/lock/build/notices/current文档；不提交/推送/发布/归档，不再委派。仅写准确生产/测试写集与本TASK的REPORT/原始日志/快照。REPORT首个h2前保留Session: 20261025T043239Z、Task: 026-chat-implementation、Status: completed；h2为聚焦交接、产物与验证、问题与下一步。报告源码路径/hash、实际红绿/命令exit/观察/故障恢复/依赖变更、未运行项与剩余接缝；completed只是候选交回，不自行done。最后validate-dispatch --stage return，确认所有测试子进程退出、production writer停写，再通知root。超出写集先提交精确路径和理由，由Lead处理，不能另造API/表/进程绕过owner。

## 当前依赖接纳与协作顺序

LOG060接纳产品r2 SHA886b568a11a1cbe8209412e02b1ee00bcf09b68cdbc2dc5c50f0c8a75b21387b与工程slice3 SHA29f9eedca116923c1ceb15a7855944ae9fa4bc3c0a221b63414996e5b35c9a18；原候选完整保存，LOG061为新维护阶段。026唯一共享Go/API/schema/注册writer；027/028先与026交换精确字段/方法请求，冻结后再写依赖新DTO的消费者，独立研究/纯策略和本任务测试准备可并行。不可重新运行历史默认dbus --session探针，不访问真实keyring/Vault/模型；若确需T02回归仅使用当前禁止service activation的安全fixture。每个测试进程退出并Wait后再交回；不机械重跑未变检查。

当前补充Map10/Goal9（LOG062）只给028原T01 TS owner method-validation.ts固定方法形状总数维护；本任务写集与已协商接口不受影响。026冻结schema后告知028精确总数，一处同步，不并发改TS validator。
