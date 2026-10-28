---
schema_version: 2
session: "20261025T043239Z"
task: "155-context-busy-retry"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-03
---

# 上下文Seal的已知快照冲突与生命周期

## Goal

原146/152 owner native:/root/foundation_api_repair 修复152已实证的 SQLITE_BUSY_SNAPSHOT 处理缺口，不让未进入Engine的Run永久preparing、父Run永久等待。为原SaveResume非法包负控确定真正窗口，同时单独证明并发快照冲突得到重试或明确处置；不能只加barrier掩盖生产缺陷。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715，branch NAMEWTA/bot，Map39/Goal38。完整28票55AC/Agent Team代码授权持续，真实Provider/Obsidian/目标OS用户后验，不索凭证、不提交推送发布归档。

读取workspace/catalog、Map→dev/testing→T03/T01及I错误/异步可靠性规则，既读未变复用。直接依据152 TASK/REPORT、logs/19-diagnosis.md与原始08/15/17日志，146恢复包合同、140上下文Plan→Host→Seal合同及原151固定f0db候选。

Root整套Go r2唯一红middle waiting_children Rev4，152定向重现证明叶未进入Engine、PrepareAndMarkRunning返回errors.Join内sqlite3.ExtendedErrorCode=517/base5（BUSY_SNAPSHOT）；其错误被应用层直接return，ProducerEnded释放slot，叶仍preparing Rev2/claim1，父wait edge1/delivery0。只给原测试加leafEntered后同一非法kind在父SaveResume安全失败，五次绿。全部152探针/tmp原字节和原产品零漂移，非编译红/整包相对fixture失败已分类保留。

151已正式双轴request-changes并Root回收；本源写属于既有T01/T03修复，不继续使用f0db假称最新pass。153在Memory completion/context_plan本域修F1/F2，154在generator/schema/TS修F3，互不写本155文件。

## Workspace and Scope

实际派遣后允许source-only：`native/huhubot/internal/adapters/outbound/sqlite/execution/context.go`、`internal/application/execution/executor/executor.go`、原 `tests/contract/foundation/resume_inbox_test.go`，以及用于真实快照冲突的新增 `internal/adapters/outbound/sqlite/execution/context_retry_test.go` 或 `tests/contract/foundation/context_retry_test.go`。在同一repo模块根下解析以上相对路径。仅在原两事务机制及已知故障分支改动，不改Base.WithinTx全局语义。其它产品/API/Memory/usage/grants/groups/Engine/DDL/锁/生成全只读；如需要额外接缝，先报精确路径/证明。

153/154当前source-only及限定独立Node，所有Go/DB检查仍关闭。先提出具体最小重试/耗尽处置，再实现并冻结输入，Root统一授予Go窗口。不修改旧152/151/146 TASK/REPORT/日志，不扩测试时限。

## Acceptance

1. 仅识别真实driver的BUSY_SNAPSHOT及明确回滚、未提交条件；在事务已关闭后有界重跑Plan→当前Host授权→Seal，不拿旧授权或旧plan在新快照直接重写。不把一般SQLITE_BUSY、未知SQL/I/O、stale claim或取消错误统统吞掉/重试。
2. 有限重试耗尽时返回精确body-free typed fault，应用Executor沿既有明确终态/恢复路径处置，真正producer结束后slots/pins释放，父能观察相应结果；未知故障保留原恢复责任。context取消/停止时不启动额外重试或模型请求。保持唯一MarkRunning writer，无SQLschema/执行器旁路。
3. 原非法补充SaveResume负控用真实leaf进入barrier固定其目标阶段，保留原8秒、消息/CP/Decision及reason/模型未Resume/slot/pin断言。另建真实SQLite受控并发读快照→独立writer提交→Seal写入，确认实际517而非手造fault：一次冲突后安全重规划成功；持续冲突耗尽有明确状态，旧claim/当前来源变化不会绕过权限，不留下preparing/running无人处理。测试不得只依赖随机重复或sleep。
4. 不改变146持久恢复包/147协议去重或149alias严格模型数据；必要受影响foundation/恢复/停止目标按风险验证。固定Go1.26.10绝对路径、GOTOOLCHAINlocal/GOWORKoff/GOEXPERIMENT空/GOFLAGSreadonly/GOPROXYoff、normalCGO0，race等Root明确窗口。保存实际goList闭包、源hash/mode、原输出、exit/Wait和漂移。

## Return

REPORT首h2前Session:20261025T043239Z、Task:155-context-busy-retry、Status；聚焦交接/产物与验证/问题与下一步。说明精确错误归类、提交/取消边界、实际反例和未验证项，所有进程Wait后归窗，亲自validate-dispatch return并冻结source/report/manifest。Root负责153/154/155共同验证、原151差异复审和完整DAG继续；不关闭Goal。
