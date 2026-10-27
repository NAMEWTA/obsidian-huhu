# 128 首个可消费切片

Session: 20261025T043239Z
Task: 128-memory-access-budget
Status: in_progress

本切片已停止产品/测试写入，Go 窗口已交还。完整 128 **尚未完成**，这里不是最终 REPORT 或正式 return。

## 已落地的唯一接口

- `sqlite/grants/memory.go`：115 原 `MemorySubject/Witness/Requirement/Facts/MemoryFactsReader`、`SetMemory`、`CheckMemoryInTx`，Subject 含 context_entry。显式检查重读同 Tx 完整 requirement，调用私有原来源门，验证当前真实目标 namespace/scope、历史 Witness、当前 Grant/Group/recipient/parent 与 expiry；缺 reader 拒绝，未知 reader/SQL 错误不吞。UI 空 target 只允许 read。当前只声明/实现该显式入口，未给所有原 CheckInTx 自动加 Memory 扫描。
- `sqlite/usage/memory.go`：115 四字段 AttemptBinding、只读 MaintenanceEligibilityInTx、ReadAttemptBindingInTx。Eligibility 不创建 account/reservation；绑定读取实际 claim、job→run/namespace/settings、独立 config pin，缺 Memory 表原样失败，缺 namespace 关系明确 MEMORY_STATE_INVALID。普通真实 Run 在已存在但无关联 job 的 schema 下仍得到原 root 族。没有把原 BindAttempts 改成已完整消费维护账户的假能力。
- 原 access/delivery 只拆出私有 `checkSourcesInTx/readSourcesDeadlineInTx`，保持旧业务逻辑与单/批检查；供新 Memory 显式入口避免回调 reader。Store 仅加启动时注入字段。

完整 7 文件 SHA 与差异见 [freeze](logs/04-first-slice-freeze.json)、[patch](logs/04-first-slice.patch)。原 3 文件 before 是按自身精确改动逆向重建，逐个核对准备阶段已保存 SHA 后才保存副本，来源说明见 [original-source-proof](logs/01-original-source-proof.json)，不冒称修改前已提前复制了文件。

## 实际证据与边界

固定 Go1.26.10、GOWORK=off、GOEXPERIMENT空、CGO0、readonly，两包仅选择 3 个新组件例与 2 个原单/批授权例，不运行既有 Node/跨语言或 crash harness。Map34 已允许独立 TS 两文件检查，真实 Go 输入只含 native/huhubot Go/SQL/JSON/locks，未将无关 src TS 变化算成或忽略为 Go 漂移。

第一次 [02](logs/02-minimal.log) actual1 / Wait3.154297127秒：旧授权与 Facts/Eligibility 已绿，新绑定 helper 对缺 namespace 的 LEFT JOIN 返回 Scan NULL，没有合同要求的 typed state fault。这个红属于本次新实现的组件缺口，不是旧产品 finding。只修正该关系的明确 NULL 物化/状态分类，未知 SQL 继续原样。

同命令 [03](logs/03-minimal-green.log) actual0 / Wait2.647560376秒，5 顶层全部通过。345 Go 输入 tree `b921c0d051421771b21bf146433d36845e1e6c04091676b6d3990c4784c93cd2`，前后 drift=[]。命令、环境、输入、实际 exit/Wait 完整保存于 02/03 回执；两个 Go PID 已不存在。

Facts reader 是限定接口边界的组件替身；Source/Grant/Run 为实际 SQLite/公共 API 创建，并真实撤 Grant。预算使用原 T12 实表与实际公开 ConfigureBudget；job/namespace 只用待 014 字段的组件表，证明缺表不成功、旧 claim/无独立 pin 不借维护、设置/关闭状态与缺关系拒绝。**没有真实 T14 Store、独立维护 Run 或维护 HTTP 正向证据**，不把这些组件替身宣传成完整集成。没有强造类型编译红，也没有成功 stub。

## 后续仍须完成

126 实表与129工厂装配后，原 128 继续：空 Source 前自动核实际 run/output Memory 依赖；真实 private message/result/群正文的完整祖先、严格 Derived union 与 Run.revision；Plan/Seal 新贡献者资格的验证/持久传播；BindAttempts 按可信 job 固定账户族、summary/retry/RetryOf 与每次真实 Reserve/Dispatch；T04 全 subject 分类与批量同门/expiry/800/250ms，最后完成真实 stdio/HTTP/失效/恢复集成与最终报告。

当前显式 helper 使用真实持久目标资格；尚未将新私有贡献者在 Plan 阶段的预览 union 接入全消费者。此处需要随126/129的实际规划/Seal路径一起证明，不能把未经持久/受信准备的任意 Group union 当资格。纯用户原文与合法已发布历史的精确输出关联也留在完整闭包内。

Root 已标出下一联调的明确边界：直接读取另一 Bot 私有 item，与读取真正授权返回/已公开 message 的 memory 派生祖先不是同一权限路径。当前非空 target 的 namespace 精确相等守卫还未区分它们，需依真实 Facts/publication/原 Grant 正向闭环收敛，不能整 Run 粗判隐藏合法公开历史，也不能伪改 Namespace 绕过。第一切片保持冻结，不在本回合重开。

128 原契约和源清单保持历史 SHA；此切片不宣布 T14/128/Goal 完成，不索真实凭证、不提交推送发布。等待 Root 下一真实派遣窗口。
