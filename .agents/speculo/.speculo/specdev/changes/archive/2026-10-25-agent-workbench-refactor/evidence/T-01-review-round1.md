# T-01 独立代码审查原报告

## Standards

Reviewer: codex:/root/review_t01
Axis: standards
Result: request-changes
Input-SHA256: afa95e439a1c79efccb61325619a583ffbf7d7ec7f4d6fb76029e4b03a05a4c8
Observed: 只读审查冻结的 37 个源码、测试、文档、事实规则、预算和生成物文件；所有 after.sha256/bytes、跟踪 diff 摘要、base/HEAD 以及全部 17 个来源摘要（含 8 个锚点）匹配。重新 resolveReviewScope 的 input_sha256 为 24e116cab2dc30455b82e5977ff76775bc5d81dd9d9f76523abd34070e01c444，结束时复核仍一致，无来源或实现漂移。独立追踪 NativeHost、PtyHelper、TerminalSessions、Controller、PromptRunner、BrowserEngine 和历史消费者；隔离探针确认一处关闭/取消竞态。

### S-01 — P2：已释放租约上的取消回调抛出未捕获异常

位置：`src/modules/agent/services/terminal/sessions.ts:215–218`，具体出错调用为第 216 行 `if (spawning) helper.end(sid, true)`。关联新增租约检查 `src/host/desktop/native/host.ts:107–119`。

可达条件：带 AbortSignal 的 `sessions.create()` 已调用 `spawnSession()`，但 spawn 尚未完成；先执行 `sessions.dispose()` 释放 PTY 租约，再取消该请求。`helper` 现在是 NativeConnection，`end()` 经过 NativeHost.active，发现 owner.released 后同步抛错。异常发生在 AbortSignal 的独立事件回调，不能由 create 内部围住 await 的 try/catch 捕获。原 PtyHelper.end 在 ended 后只会停止写入，因此这是改为严格租约后留下的消费者兼容缺口。

实际调用链也能触发该次序：`src/modules/agent/services/controller.ts:886` 先调用 sessions.dispose；第 895 行再调用 prompts.dispose；`src/modules/agent/services/prompt-runner.ts:160` 会 abort 所有活动请求。信号经 `agent-runtime.ts:436` 传入 sessions.create。只需 prompt 的 spawn 仍在等待，即可能在正常模块关闭中出现该异常，不需要伪造错误的外部调用。

影响：关闭/取消这种预期流程逃逸为进程级 uncaughtException（隔离 Node 探针），在 Obsidian 的具体呈现尚未实机验证；不能声称会必然关闭整个 Obsidian。该问题未证明 Cookie 请求被误杀或子进程泄漏。

依据：dev 硬规则 4 的模块生命周期隔离，以及 code-review/error-handling 的取消与清理结果保证。不能通过吞掉任意异常或放宽宿主 owner 检查修复。

最小修复方向：让 create 的取消回调在租约失效/已关闭时安全结束，保留原 native owner 的退出等待与迟到 spawn 回收；不要向新代次重发 end。补生产消费者回归，覆盖 spawn pending → module dispose → request abort，以及相反次序/崩溃边界，观察没有全局未捕获异常且原子进程仍被正确回收。

复现：`node /tmp/huhu-t01-review-abort-repro.mjs`，实际退出 0，原输出为：

```json
{"uncaught":["The native capability lease is closed"]}
```

该探针用当前真实 NativeHost、TerminalSessions、normalizeTerminalSettings，经 esbuild 写入 /tmp；只替换 NativeTransport 的帧 I/O，用 deferred 固定 spawn 顺序。监听 uncaughtException 仅为隔离捕获错误和完成清理，因此退出 0 不表示通过。探针 SHA256：`c30f9bbd3960b1c9f06b794a6721b9a795b752a952f4cb535851b16815354bb8`。

### 其余工程核对与验证边界

- binary 迁移除相对 import 路径外保持相同实现；frames 新文件与基线旧文件字节完全相同；旧路径保留薄重导出，无新增依赖。新 shared 端口无宿主依赖，host 不反向依赖 app/Agent。
- 回读原始 18 文件/59 测试/0 skip 日志，以及 Root build-v2、bundle-v2、全库 lint 和 startup-boundary 原输出；没有把这些执行者的命令称为 reviewer 自己执行。本轮未重跑构建或整套测试，未写任何仓库文件、index 或 ref。
- 包体 main.js 6042396 B、启动求值 123387 B，相对基线 +8817/+520 B；代码中的租约、代次关闭与惰性接线能解释增量。预算 6042624/123904 为实测最小 KiB 上取整，其他阈值和 forbiddenEagerAreas 未改；符合 build-and-release 现有“记录理由”规则，没有发现用无理由涨预算掩盖重复打包。生成物核对限字节冻结和已有真实构建/包体输出，没有独立重建 main.js。
- docs 全局既有另一 change 的六个锚点失败保持原结论；本票文档/owner 事实修改与代码相符。
- 规范来源发现：本次是未提交工作副本，无本次 commit message/远程 Issue 来源；显式 Spec、implementation-contracts、Ticket 和 Goal execution-protocol 已提供且匹配，项目 docs/dev 规则存在。UI 标记 false，无新增视觉验收范围。
- 真实 Obsidian、真实 Provider、五平台机器验收未运行；按用户约定交由用户执行。没有以 stub 或现有 Linux helper 测试冒充这些 E2E。

## Specification

Reviewer: codex:/root/review_t01
Axis: specification
Result: request-changes
Input-SHA256: afa95e439a1c79efccb61325619a583ffbf7d7ec7f4d6fb76029e4b03a05a4c8
Observed: 仅按 T-01/AC-057、AC-059 和冻结的共享 NativeHost 合同审查；未要求 T-02 至 T-18 的未来产品行为。Browser 直接通过 context.native 创建每请求 Cookie 租约；PTY/history 具有独立能力；last-owner 关闭等待 helper.dispose；原始真实 helper 测试覆盖 PTY 结束、SQLite 锁下 Cookie 完成和最终 PID 不存在；未使用时的 Agent/Browser 与启动闭包证据可回读。但 T-01 关闭竞争中的现有消费者取消路径存在一处已复现缺口，故本轴不通过。

### C-01 — P2：关闭接纳门后，旧请求取消没有安全收束

位置：`src/modules/agent/services/terminal/sessions.ts:215–218`；触发调用链与复现为上文 S-01 的同一实际缺陷，两轴并非两个不同缺陷。

合同：T-01 `#implementation-route` 第 3 步要求处理关闭/迟到启动与失败分发；`#verification-plan` 明确要求 acquire/disable 竞争和失败路径验证，原有正常/负例行为不能退化；Spec §3.10 保留既有消费者取消保证。新的宿主严格拒绝旧租约操作是正确边界，但 TerminalSessions 的 AbortSignal 适配未同步，导致模块关闭过程中旧请求取消成为未捕获异常。应完成该消费者适配与回归后，再判定 T-01 关闭竞争可通过。

### pending acquire/dispose 的最终判断：本轮不另报缺陷

确实观察到 TerminalSessions.dispose 在尚未取得 lease 时可以先完成，原 acquire 立即取消；这不等于 NativeHost 丢失了资源 owner。隔离追踪显示 native owner 保持 closing 状态，迟到 helper 的 dispose 被调用；新的显式 acquire 在前一个 helper 清理完成前不会启动第二代。最终 helper 回收完成，没有旧请求自动重放或新代次污染。

本票没有独立承诺“取消 acquire 的返回时刻就是 helper 物理退出时刻”；已有合同区分取消接纳与实际清理，而已获得租约的 release 以及 host.dispose 会等待真实关闭。因此仅凭模块 dispose 先返回不足以构成另一个已确认 finding。真实宿主退出期间的最终进程观察仍保留给用户 E2E，不在此宣称通过。

复现：`node /tmp/huhu-t01-review-pending-repro.mjs`，实际退出 0，原输出：

```json
{"moduleDisposed":true,"acquisition":"cancelled","starts":1}
{"cleanupPending":true,"alive":true,"reacquired":false,"starts":1}
{"finalAlive":false,"starts":2,"reacquired":true}
```

探针 SHA256：`573beefe8ee5336e78e1eb6ca92d53a150fce1ae70e781778f7846d7e2e913fe`。它同样使用真实 NativeHost 和 TerminalSessions，仅 transport 为可控 deferred。

### 范围说明

没有把 Browser 无 Space/Agent-off 完整网页入口当成本票未实现项，该行为由 T-13 负责。没有把“所有未来运行显式绑定 Space”的 T-02/T-14 实施提前要求于 T-01。没有发现另外可复现的规格违例；这不构成对未来各票或未运行平台的验收。
