# T-03 独立双轴审查原始报告

Reviewer: native:/root/review_browser
Implementer: native:/root/audit_browser
Mode: native；未参与 T-03 实现/修复，未递归派遣。
Input-SHA256: `d792ff2ca6b99c28e76d916134fa06fb2667610a6d82478e309229b293c43000`
Observed: 2026-10-27。standards=request-changes；specification=request-changes。3 个唯一 P2，其中 1 个是已确认的架构检查失败，2 个是生产消费者反例。

## review-input

完整固定对象：[T-03-review-input.json](T-03-review-input.json)。摘要由工具计算完整对象经 `JSON.parse` → `JSON.stringify` 后的 UTF-8 SHA256，区别于内部 scope.input_sha256。

- working-tree 显式 14 文件；共同 base/head 为 `265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`。前序 T-02-r3 仅作为已固定依赖按需读取，没有把其整个交付混入 T-03 实际写集。
- 开始时逐项核验 14 文件 after SHA256、31 份来源原字节 SHA256，全部匹配。
- 结束重跑同一 review-scope 选择：base/head、index SHA、tracked diff SHA、14 文件完整 working_snapshot 全部匹配，没有审查源码漂移。
- 结束时 29 份来源匹配，2 份来源漂移。Lead 明确说明是为本轮确定的架构 finding 扩展纯测试 fixture 的最小写集，未改产品合同：Map plan_revision 5→6，T-03 writable 增加 `test/release/browser-operation-ledger-process.fixture.ts`。本报告不宣称 31 来源终态全部匹配；后续修复必须新冻结。

| 来源 | 输入 SHA256 | 结束时实际 SHA256 |
|---|---|---|
| tickets-map.md | aeef79a895919399f9d0700a5695ea7f8599418021fc843e05a3302ac9828f6d | 6a0c31b25b23eb0c69d826749b339426e0ffbdf4cd0d3217f373ada4d4c44a68 |
| ticket/03-browser-ledger.md | 6e964d92f2377b38c1308ea10f5c744189d561cd6c4fbb4b3dd5a01a5e69735f | 4163411458db43e82036411bad66c70698a686834239874c9aec2c3ab041a15b |

上述路径相对于当前 change。结束 inventory 排除项新增本轮输入与 T-14/T-18 审查、T-19 evidence，不属于本轮源码。

## standards-output

Reviewer: native:/root/review_browser
Axis: standards
Result: request-changes
Input-SHA256: `d792ff2ca6b99c28e76d916134fa06fb2667610a6d82478e309229b293c43000`
Observed: 实际读取固定 14 文件、持久化依赖和调用者，检查原子状态/恢复、权限、去重、回收、deadline、生命周期及故障测试。以下 3 项阻止通过。

### S-01 / P2：进程测试 fixture 在 platform 层反向导入 services

- 位置：`src/modules/browser/platform/desktop/persistence/operation-ledger-process.fixture.ts:5`，导入 `../../../services/operation-ledger`；消费处是同目录 `operation-ledger.integration.test.ts:13` 及其 esbuild entryPoints。
- 影响：这份 `.fixture.ts` 是架构检查会扫描的普通源码。模块 platform 只允许导入自己的 core/platform/api 等，不允许反向导入 services；当前交付使项目必需架构检查失败。它是 T-03 新增 fixture，不属于 T-18。
- 依据：dev 硬性规则 2；`.agents/skills/dev/references/architecture.md:48` 的导入矩阵与 `:35` 的零基线检查规则。
- 实际证据：reviewer 直接核对了该 import 和规则。Lead 提供其独立重跑 `pnpm test:architecture` 的真实失败：同一 forbidden zone direction；脚本 exit 1（外层 wrapper 126）。reviewer 没有重复运行该已确认检查，也不把作者 lint/type 绿色当作架构检查通过。
- 满足条件：将只用于测试的跨层进程 fixture 移到合适测试树并更新 import/esbuild 引用，保留原 SIGKILL 故障断言；按新 Map/Ticket 写集执行。重新通过 architecture，不放宽规则或忽略该源文件来绕过。

### S-02 / P2：operation.execute 忽略当前 RPC 剩余 deadline，排队超时后仍开始网页派发

- 位置：`src/modules/browser/services/protocol-service.ts:233`–`:236`；接下来的 `services/workspace.ts:875` 的 execute/动作队列；`services/operation-ledger.ts:205`、`:221`–`:238`。
- 可达前提：先取得仍未过其 prepare 期限的票据；同 Space 有长操作占据 actions 队列；当前 operation.execute HTTP 请求使用更短 deadline，在排队期间过期，Run/lease 仍有效。
- 风险：RPC server 确实提供单调剩余时长，Protocol 也把它传给新 prepare、page.open/close 等，但 operation.execute 分支完全未读取/传递。Ledger 只检查原 prepare 期限。因此 HTTP 已结束、当前 execute 请求 deadline 已过之后，排队的动作仍可第一次进入 runtime.execute。这里不是撤回已经被网站接纳的动作，而是还没开始的网页派发没有受当前请求期限约束。
- 实际反例：内存运行生产 Protocol→Workspace→Ledger。第一张 reload 票进入 fake runtime 后由 gate 阻塞同 Space 队列；第二张已 prepare 票经 Protocol.call 的 operation.execute 排队，传入剩余时长函数，随后将其值从 1 置 0，再释放第一动作。第二动作仍派发并 completed：

```text
execute queued beyond RPC deadline:
{"remaining":0,"deadlineReads":0,"runtimeCalls":2,"state":"completed"}
```

- 依据：工程错误/可靠性规则的明确取消/截止边界；本次新增 RpcHandler remainingMs 与单调 deadline 传递合同。已有 RPC 测试只证明超时不取消已派发后端工作，不能证明排队中的新网页派发应该忽略 deadline。
- 满足条件：把本次 execute 请求的有界单调期限传过 Protocol/Workspace 队列到首次派发前检查，与票据自身期限取更早者；到期未派发时不得进入 runtime。不能延长原票据期限，也不能用短重复查询去取消已经派发的原操作。增加“票据仍有效、execute 请求已过期、队列随后放行”的 barrier 回归，同时保留已派发操作不重放和持久结果查询语义。

### S-03 / P2：只读第二实例无法正常 dispose，关停时反而初始化账本

- 位置：`src/modules/browser/services/workspace.ts:1482`；对照 initialize 的 readOnly 提前返回分支，以及 `platform/desktop/persistence/browser-persistence.ts` 的 read/assertOwner；上层 `src/modules/browser/module.ts` 设置 retainOnDisposeFailure=true。
- 可达前提：另一个实例持有同 browser 数据根，当前实例成功进入 ready/readOnly 的 owned_by_other_instance 状态。该状态本来不初始化账本，也不拥有任何 Space/runtime。
- 风险：新 dispose 无条件调用 ledger.prune。prune 会 initialize，首次读取 checkpoint；真实 DesktopBrowserPersistence 的只读实例拒绝任何 read/write，因而 dispose 抛 owned_by_other_instance。模块的 retainOnDisposeFailure 使普通禁用/卸载被当作清理失败保留；此实例不应在关停时才尝试访问另一个 owner 的账本。
- 实际反例：生产 Workspace+Ledger，持久化端口复刻真实只读端口的拒读行为。initialize 正常，未进行账本 read；dispose 却发生一次 read 并失败：

```text
read-only workspace initialized {"ready":true,"readOnly":true,"reads":0}
readonly dispose failed {"code":"owned_by_other_instance","reads":1,"persistenceDisposed":true}
```

- 依据：dev 生命周期规则 4；模块失败隔离和原有只读 owned_by_other_instance 消费路径。`browser-persistence.test.ts` 已明确只读端口 read/write 都拒绝，不是本反例另造的新端口语义。
- 满足条件：只有实际持有写权限、已经启动其账本的 owner 才做关停 prune；第二实例直接释放自身资源并成功 dispose，不读取/写入他人账本。仍保留主实例正常回收与 finally 释放 persistence 的保证。补充 ready/readOnly→dispose 的回归，断言零账本访问、无错误及资源释放。

## specification-output

Reviewer: native:/root/review_browser
Axis: specification
Result: request-changes
Input-SHA256: `d792ff2ca6b99c28e76d916134fa06fb2667610a6d82478e309229b293c43000`
Observed: AC-006 主线实现具备明确的持久化与故障恢复路径，但真实 deadline 消费与既有生命周期回归仍有下列差距；Map/Ticket 的已知写集漂移不替代代码结论。

### R-01 / P2：未执行动作没有受 execute 请求自身 deadline 约束

- 位置：protocol-service.ts:233–236 → workspace.execute → operation-ledger.ts:205/221。
- 依据：Issue #1 §14.1/§14.3 对请求 deadline、接入层剩余时长、运行期单调时钟的要求；T-03 的真实 Protocol/Workspace/Ledger 消费与失败合同。
- 差距：旧 prepare deadline 仍有效，不等于当前 execute envelope 仍有效。排队到当前请求截止后，仍第一次派发网页操作；具体可达链、真实输出和修复条件见 S-02。
- 满足条件：保留未知操作不重派，额外拒绝在当前 execute 截止后尚未发生的首次派发，并用确定队列反例验证。

### R-02 / P2：新增关停维护破坏原只读 owner 路径

- 位置：workspace.ts:1482；实际拥有权边界在 DesktopBrowserPersistence.assertOwner。
- 依据：Ticket T-03 的“真实消费者、回归”要求；Issue #1 §14.1 Workspace owner 权限分支与 §15.5 单数据根持久 owner 合同；项目模块生命周期规则。
- 差距：没有写权限且从未启动账本的第二实例，在正常 dispose 时仍被强制访问账本并失败。实际反例与风险见 S-03。
- 满足条件：只读实例不启动账本维护且正常释放；主 owner 的安全回收行为保持并回归验证。

S-01 是标准轴的确定架构失败，没有另造与 AC-006 无关的产品缺陷。唯一缺陷合计 3，不把两轴对应事实重复计数。

## 已核对的实现与故障保证

- 新操作 ID 按 issuer 随机 namespace 与递增序号发行；checkpoint 同时保存发行位置、低水位、精确 requestId 映射与状态，单写队列占用保证同票并发不各自派发。不同 payload 比较 HMAC 摘要后拒绝。
- issuerKey 将 principal/issuer/authority incarnation/Space 绑定，payload digest 继续包含完整 scope。Workspace 根管理 grant 使用实例 authority，human 使用 lease，Agent 使用 Run/lease；旧 boot Run/capability 没有通过本票恢复或开放历史权限。
- dispatch-intent 在网页 dispatch 前写入并读回；不确定 commit 会 fault owner。dispatching 恢复为 outcome_unknown、prepared 恢复为 cancelled_before_dispatch；不会把恢复读当成重新派发依据。
- 结果正文独立保存；checkpoint 完成状态包含结果摘要。缺损正文恢复时保留完成/未知事实并返回 result_unavailable。结果满容量时只重试本地结果写，先提交/读回旧结果不可用状态再删除旧正文，不重派网页动作。
- 活动 authority 的精确请求映射不随结果清除而丢失；失活 issuer 只推进连续、终态、非 active 且过保留期的前缀水位。发布并读回 checkpoint 后才删除正文；删除故障由后续 prune 清理 orphan。
- 未执行预算 256 全局/64 每 issuer、prepare 默认最长 5 分钟、元数据条目 10000、结果 30 天或容量先到的限制真实存在；没有把这些数值误称为性能实测。
- 旧 UUID operations 被读取为历史终态，仍走原摘要校验，不把旧 ID 作为新操作执行；生产 storage 的 HMAC/AEAD、canonical-root owner、原子 private file 与 fsync 是依赖，未因本票改写。
- RPC envelope→remainingMs→Protocol→Workspace→prepare 的新链已经接入，S-02 具体指出 execute 消费缺口，不否定其他分支的传递。
- 读取了新增 15 项磁盘/进程故障测试与四个 SIGKILL 接缝、ACK 丢失、缺损、密钥及 GC 故障断言；这些测试不是真实浏览器网页副作用证明。架构失败也说明 lint/type/单测绿色不能代替所有项目检查。

## 检查方法与证据限制

reviewer 实际执行：完整输入 JSON 摘要、14 文件/31 来源开始校验、14 文件基线 diff/新增源码阅读、实际调用者/存储依赖追踪、deadline 和 readOnly 两个生产类内存反例、结束 review-scope/来源复验。没有无理由重复作者报告的 34 files/221 tests 或 15 项磁盘集成；作者 Worker/test types/lint/diffcheck 结果也只作为其提供的检查事实。

反例不修改源码和生成物：读取 workspace.test.ts 的 describe 之前 fixture，替换 vitest import 为简单函数 spy，采用 esbuild stdin/write:false 内存打包后 Module._compile。真实 Protocol、Workspace、Ledger 代码执行，runtime/persistence 按测试端口提供；使用有效长度的 connection capability。第一动作与第二动作通过 deferred gate 确定排序，没有 sleep。finally 释放 gate 并 dispose 工作区。只读反例端口令 read 抛 owned_by_other_instance，与真实 DesktopBrowserPersistence 契约一致。

另做过一个核心层恢复边界实验：删去 checkpoint，若旧操作是 outcome_unknown 且没有任何 result body，open 会把目录当空账本，直接 core 调用可重新 prepare 同 requestId。该实验在默认 writable 回调下产生 effectCount 2；本报告**没有把它提升为生产 RPC 重放漏洞**，因为实际 Workspace 重启不会恢复旧 Run/authority，旧 operationId 本身仍返回 operation_gone。它不证明攻击者能绕过生产授权，也不能当作已完成真实磁盘/网页故障验收。如果未来增加恢复旧 authority 的能力，应补这一边界的固定合同与验证。

已实际应用 code-review/dev 及对应 source-discovery、risk-review、fowler-smells、reviewer-contracts、review-evidence、working-tree-review、result-reuse；并按 error-handling/test-reliability、change-scope/research 合同审查。已读未变规则复用。规范来源完整，未跳过规范轴；没有界面新增，ui 不适用。T-02-r3 的既有观察结论仅在不变依赖范围复用。

未运行真实 Chromium/helper/Obsidian/四平台/视觉/性能验收，SRC-010 将其交用户。未重建或验证最终 main.js/browser-worker.cjs/browser-cli.cjs/generated bridge 组合，仍由 Lead 串行负责。架构检查失败由 Lead 独立执行并反馈，本报告没有声称 reviewer 自己重跑。没有修改源码、正式状态、前序报告或产物。

standards=request-changes；specification=request-changes；skipped_axes=[]。报告交回后停写。
