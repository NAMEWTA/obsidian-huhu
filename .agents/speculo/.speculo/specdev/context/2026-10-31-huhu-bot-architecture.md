# Bot应用权威与恢复边界术语

类型：domain-terms

适用范围：2026-10-25-huhu-bot-architecture 的已采纳领域合同；目标与实际实现分别判断。

来源：[CONTEXT.md](../changes/archive/2026-10-25-huhu-bot-architecture/CONTEXT.md)，SHA-256 `3736d058bb3b1667bfc3f22c1ba8e7305f12ed270c4f43b1db1cafd26f964614`；关联[决策](../adr/2026-10-31-huhu-bot-architecture.md)。提升日期：2026-10-31；网关 owner：specdev/archive-and-consolidate，codex:/root。

持久性限定：下文的“持久受理/持久保存”按 ADR-027 解读：进程崩溃与断电不同，普通 NORMAL 提交在最后屏障之后可能因断电回退；效果出站先经过 FULL 持久屏障。

**Run**：一次已被持久受理的执行尝试，拥有独立于页面、连接和请求的生命周期；同一 Run 的终态只提交一次。
_Avoid_：请求、连接、会话、终端会话。

**前台 Run**：占用 Session 前台执行位置的运行；同一 Session 同时最多存在一个未终结的前台 Run。
_Avoid_：把所有未来后台或委派运行都算作前台。

**Effect**：一次外部效果意图及其派发和核查记录，使用稳定 effectId；恢复同一意图保留该身份。
_Avoid_：工具参数 hash、传输 request ID。

**Receipt**：受信执行方对一次效果提供的结果证据；目标当前状态相符并不自动证明原调用归属。
_Avoid_：模型自述成功、已发送、连接未报错。

**unknown_outcome**：不能确定某个效果是否发生的状态；它要求核查而不自动授予重放资格。
_Avoid_：可安全重试、已回滚。

**reconciled**：核查证据证明目标符合批准的后置条件，但未证明原调用归属。
_Avoid_：committed 的同义词。

**Checkpoint**：引擎私有的恢复材料及其业务引用；它解释引擎进度，不拥有效果是否发生的最终事实。
_Avoid_：业务数据库、完整备份、写入回执。

**Resume**：在核查通过并取得用户继续决定后恢复同一非终态 Run，保留原效果身份并重验派发资格。
_Avoid_：重新提交同一意图、自动重连。

**Retry**：新建一次 Run，并引用原 Run；旧效果仍需核查，不能借新身份绕过冲突。
_Avoid_：Resume。

**RunEvent**：先持久保存再提供客户端续读的运行事实，按 Run 拥有单调序号。
_Avoid_：仅存在内存的唤醒消息。

**最小核查记录**：正文删除后，为核对未知效果和拒绝旧意图重放保留的必要身份、目标摘要、状态与证据。
_Avoid_：完整对话、可继续运行的 Checkpoint。

