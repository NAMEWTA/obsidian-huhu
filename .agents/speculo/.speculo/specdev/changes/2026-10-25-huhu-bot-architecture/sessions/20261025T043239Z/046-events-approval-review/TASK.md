---
schema_version: 2
session: "20261025T043239Z"
task: "046-events-approval-review"
kind: review
change: 2026-10-25-huhu-bot-architecture
ticket: T-06
---

# T04/T06 与原 T01/T03/T05 维护的完整候选独立双轴审查

## Goal
对完整固定产品候选分别执行标准轴与规范轴。由未参与实现的原 /root/foundation_review 完成；只有 Root 实际 followup_task 才启动。原 gpt-6-astra/high 偏好沿用，不冒称底层模型 attestation。不能修复代码或再委派。

## Inputs
项目 /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，base/HEAD 33c21e098ef3188cbab5a09f3e0a01fadb787715，Map13 / Goal12。沿已读 AGENTS 发现规则、运行指南、Map → dev 适用架构/测试/许可/Obsidian API → T04/T06 与原 T01/T03/T05 维护，Spec/ARCH/ADR/LOG051，common code-review/Fowler/risk/reviewer-contracts/error-handling/test-reliability/working-tree/review-evidence/result-reuse。唯一当前输入 evidence/T-06.md#review-input-r1，共 169 文件 / 46 来源，SHA256 a129b2b03c62625b541392a92321f9cf16d74383d2de85dbd3c3b44f92339371。

完整回读 042-approval-implementation、043-events-implementation、044-event-client 的 REPORT 与适用原始输出；Root 独立公开 API/SQLite/实际 TS-Go、OS pipe 观察见 evidence/T-06-logs/lead-e2e-r2.json 及两个日志，Root TS 构建/lint 在 evidence/T-04-logs/lead-{build,lint}-r1.log、1814 输入 before/after 无漂移。Root r1自有probe曾把Engine ToolResult的denied/APPROVAL_REJECTED误断言为rejected，导致fake Engine主动报错；原源码/日志/非零退出完整保留。r2仅纠正该契约断言，生产未改。若Root E2E仍运行，以实际后续消息为准，不把计划当通过。

旧 040 chat/access r2 的完整两轴结果只在逐项摘要未变且无影响时复用。T02 未写入，凭证/第三方锁未变；不要机械重跑无影响许可或 OS keyring。历史 D-Bus 默认 --session 自动激活事故保留，禁止重跑旧默认 bus、访问/终止实际系统 keyring；必要凭证回归只用既有明确无 service dirs/无激活/一次性 HOME/XDG 的安全 fixture。

## Workspace and Scope
完整固定候选源码/SQL/协议/TS/测试均可审，不能缩成作者测试列表。只写本 TASK 的 REPORT、独立探针和原始日志；探针使用外部临时副本与一次性数据，不修改生产/测试/规范/锁/工程/正式状态或他人报告。所有产品 writer 已冻结；发现漂移通知 Root 并停止受影响审查，不自己选择新输入。不能提交/推送/发布。T27 最终发行资产单独维护，旧 dist 不证明当前产物。

每个适用风险先给可证伪假设，再沿真实消费者验证。重点：

- 同一 Run 的 durable seq、BigInt、重复/缺口、future cursor、bounded page、same-Tx snapshot 和 terminal compaction；未知 ledger 与终态后事实必须可重建，不回流进正文或覆盖终态。
- Tail/history/snapshot 当前读资格、read/send 区分、exact message provenance 与继承范围；读后排队再撤权、无 Grant clock 变化的 expiry、真实物理 writer 停止后才释放 gate。锁序/SQL 不跨外部等待、队列字节/帧限额、reader detach/EOF/lease 清理及旧响应不复活。
- 800 history subjects / 250ms 原预算失败及最终批量查询修复：保留原单读 owner/profile/Session-member/recipient/JSON/Grant 语义，所有缺失/外人/混合 message/run 必须拒绝，窄化不能污染共享输入；SQL rows 关闭再调用 writer。不能以普通测试绿覆盖 race 原失败。
- Windows output 的同步写取消、线程 handle/ack 与 Close 序列化；只做代码/编译范围结论，真实 Windows/Darwin 用户后验。
- Broker 首个等待意图关闭整 Run 写工具准入、原 effect 去重与新意图区分；CP 临时写/校验/不可变发布/DB 原子引用、孤儿 GC/reader hold、错误不返回假持久成功。
- Approval CAS/Principal/精确参数、目标/工具版本、Grant、lease、expiry 与取消/dispatch竞争；正常 approve/reject/expire 的持久 continuation 由同一个 Executor.Resume 消费，原 Run/pin/Session 与配置修订一致；已派发未知/迟到可信效果只补账不重开 Run。
- Engine 只能发文本类事件，不能伪造 Run/approval/effect 状态；历史 text-delta 正规化保兼容；实际 TS-Go waiting_approval/canceled 的原红灯和统一裸 Run 状态修复有真实消费者验证。TS reducer 仍禁止 ledger 状态覆盖 Run。
- ApprovalList 过滤撤权前缀仍可继续有界分页；恢复同 ToolCall 返回原 receipt 不被已变化目标预览误拒；三个真实子进程 CP crash 窗口/数据库失败原子性不能只检查 DTO。

T07 真实 Vault 写入/回执核查、T08–T10 真协议 adapter、T11–T16 群/树预算/用户恢复、T20/UI 都是后续明确范围，不能冒称完成，也不能把这些 OUT 本身当当前缺陷。当前正常审批 Resume、事件和授权真实公共链必须已装配，不能用 stub/永远空 fallback 代替本票行为。所有 fake Engine/Host/大序号 SQL fixture 与真实生产消费者准确区分。真实模型、Obsidian、目标 OS 保持 user-owned/not-run，不索取凭证。

## Acceptance
两轴分别给 pass / request-changes。所有可证实 finding 包含准确路径/行、触发条件、实际影响、严重性、权威依据、最小验证条件；不设 finding 数量上限，不以全绿替代独立反例。独立公共 API/SQLite/实际 TS-Go 观察与代码推断分清；无需机械重跑全部作者套件。重测试前和 Root 协调，避免时限测量受并行负载污染。最终重验相同文件/来源/HEAD/index，全部探针子进程退出并 Wait，writer/probe 全停后交回。

## Return
REPORT 第一个 h2 前有 Session: 20261025T043239Z、Task: 046-events-approval-review、Status: completed；h2 聚焦交接、产物与验证、问题与下一步。两轴独立 standards-output / specification-output 锚点和 Reviewer / Axis / Result / Input-SHA256 / Observed，SHA 来自固定输入。实际 validate-dispatch return0 后真实 MESSAGE/FINAL；Root 全读并核对实际回执后才接纳正式 Evidence。不宣称全部 28 票/55 AC 已完成。
