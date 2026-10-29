# T-04 独立只读审查，第 1 轮

结论：标准轴与规范轴均为 **request-changes**。发现 3 类需修正问题；保留本轮真实红灯，不以此前绿色检查替代边界行为验证。没有修改仓库、正式 Evidence、target、原生二进制或 Git，没有执行提交、推送、发布或归档。

## 固定输入与独立性

- Reviewer：`codex:/root/review_t04`，Root 实际派遣的独立 reviewer；未参与本范围实现或修复，未递归派 Agent。
- Implementers：`codex:/root/prepare_t03`、`codex:/root/prepare_t02`、`codex:/root/implement_t01`、`codex:/root`。
- Workspace：`/home/wta/orca/workspaces/obsidian-huhu/terminal`。
- Input：`.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-review-input.md` 中唯一 JSON。
- Input-SHA256：`6b88551127001cc9d60ee42794f8d450adeaa2d6cbe900de6daed1d36d129516`。
- Scope：working-tree，57 文件、30 来源；scope SHA256 `b25fd2cf65e80c01b0e075bc952e711b781dbeaa053d7c778e51a212ff54e2f4`；base/HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`，branch `NAMEWTA/terminal`。
- 以当前完整工作副本审查共享 owner；用 `/tmp/huhu-t04-prior-source-snapshot` 区分本票增量，前序不存在的路径取固定 base 原文。没有仅审 HEAD，也没有把本票新增文件、测试、删除或生成物排除。58 份确实未变的前序产品按固定清单复用；Change 运行状态/Evidence 不属于产品漂移。
- 起始冻结：2026-10-25T10:53:20.915Z；结束冻结：2026-10-25T11:04:57.236Z。两次均 exit 0，选定 scope 一致、30/30 来源原文一致，index SHA256 均为 `10a283748f5edff250e8b5af2378b1c3d898beaf650c92826a5885b282a8ead1`。原记录见 `/tmp/huhu-t04-review-freeze-{start,end}.json`；脚本 `/tmp/huhu-t04-review-freeze.mjs`。

按 AGENTS 的 workspace → catalog → runtime 发现顺序读取入口，应用公共 code-review Skill 与 source-discovery、working-tree-review、reviewer-contracts、review-evidence、Fowler、risk-review、error-handling、test-reliability；并应用 dev/ui 实际规则及固定来源。未找到另一套 CONTRIBUTING/CODING_STANDARDS 合同；既有 CLAUDE.md 只转引 AGENTS，不构成新增标准。没有创建新的 workflow 状态。

<a id="standards"></a>
## 标准轴

Reviewer: codex:/root/review_t04

Axis: standards

Result: request-changes

Input-SHA256: 6b88551127001cc9d60ee42794f8d450adeaa2d6cbe900de6daed1d36d129516

Observed: 在固定工作副本中追踪 NativeHost/lease → TerminalSessions → WorkspaceService/SpaceService → Controller → 生产 UI，核对 Rust session/job/bootstrap、共享 codec、记录恢复、现存旧消费者及失败/取消路径；针对三个失败假设实际执行隔离反例。标准轴不以测试数量、manifest 哈希或规范轴结论代替正确性判断。下列 F1 为真实 Linux helper 复现；F2/F3 为生产 TS 编排配合明确故障/时序注入，未冒称真实 Obsidian 或真实磁盘故障。

### F1 — High：自然根退出后的 partial 被当作停止操作已经结束，首次 stop 和 force 均不发送

**位置：** `src/modules/agent/services/terminal/sessions.ts:416–428`，尤其 `424–426`；同文件 `394–400` 的 settleStop。消费者位置：`src/modules/agent/services/workspace-service.ts:307–310,374,383`。

**已证触发与结果：** 根 shell 自然 code 0 退出；仍有同一 Unix Session 内忽略 HUP/TERM 的真实子进程。原生 8 秒观察返回 `cleanup=partial, remainingKnown=2, reason=deadline`，捕获的 helper/lease/sid 仍存活并拥有该清理范围。此时调用第一次 `requestManagedStop(ref)`，再调用 `requestManagedStop(ref,true)`，实际原生 request 数为 **0**：第一次因既有 termination 不为 pending 跳过 sendStop，马上 settled/partial；第二次被 `phase === 'stop-requested'` 限制挡住。子进程仍处于 S 状态，不能解释为“native 已结束且 route 已消失”。

**独立交叉核对：** 同一探针 finally 直接向相同捕获 helper/sid 发送 force，生产回调随后收到 `confirmed/remainingKnown=0`，证明原范围仍可控。Browser cookie lease 在失败点仍 alive。native/session 自然退出后保留清理责任的机制本身在该反例中有效，问题在业务停止门。

**影响：** 用户明确停止或升级 force 对仍存活的目标没有效果；归档调用相同停止路径而无法完成收束。UI 没有掩盖残留：attached SessionCard 有 stop/check 菜单（`AgentSidebar.tsx:130–133`）；detached ManagedCard 有 stop 与 partial 后 force（`:295–297`），但均消费这条失败路径。`archiveManaged` 的 confirmed 检查仍正确返回 incomplete，不是错误成功归档。本报告不声称 attached 卡片也有 force 按钮。

**依据：** 错误处理合同要求区分观察结算与外部工作实际终止、保留 owner 的清理责任；项目生命周期规则不允许以根 exit 替代整个目标清理。此处是可执行状态机错误，不是 Fowler 风格偏好。

**修复满足条件：** 对仍持有捕获 transport 且 cleanup 未 confirmed 的代次，首次显式 stop 必须到达原 native scope；force 升级不得因早先自然退出/观察 settled 而永久失效。保留幂等请求、原 generation/sid 身份与有界预算，不重启 helper、不重发 spawn、不对失联或已消失的 scope 发明成功。新增真实自然退出→partial→首次 stop/force 反例，验证后代实际结束、confirmed、Browser owner 保持可用；另保留真实断连/不可控范围的 unknown 分支。

**证据：** `/tmp/huhu-t04-review-probe.test.ts`、`/tmp/huhu-t04-review-vitest.config.mjs`、`/tmp/huhu-t04-review-probe.log`；1 test 实际执行并在 request 数断言失败，child exit **126**。完整清理与摘要见本报告“原始反例”。

### F2 — Medium：有界停止之后重新无界等待持久化，关闭及归档无法按预算结束观察

**主位置：** `src/modules/agent/services/workspace-service.ts:428–434`，特别 `await this.checkpointTail` / `persistence.flush()` / `spaces.flush()`。

**同一等待缺口的归档位置：** 同文件 `368,392,401–403`。上层关闭链为 `src/modules/agent/services/controller.ts:965–978`；`agent-runtime.ts:555–564` 新增等待 registry 也在该串行链之前。

**已证触发与结果：**

1. 生产会话已确认结束并保存后，归档进入最终 layout `persistence.flush()`。注入该 port 的 pending Promise，设置 `timeoutMs=50`，进入 flush 后 abort；200ms 后 archive Promise 仍未结束，archived 仍 false。`beforeCommit` 只在无界 await 返回后检查信号/截止时间，不能结束当前观察。
2. 生产 settled checkpoint 的 storage.write 被 barrier 挂起，调用 `workspace.drainManaged()`；fake timers 推进 **60,000ms** 后 Promise 仍未 settle、writer close 为 0，磁盘上原 pre-spawn marker 仍为 unconfirmed。每个 waitManagedStop 的预算没有覆盖随后的 checkpointTail/flush。Controller 顺序 await 此方法，因而不能继续到 sessions.dispose 与余下释放。

这里的故障是假设持久化 port 不 settle 后所作的**确定性故障注入**；不声称在本轮遇到真实 OS/Obsidian 磁盘挂起，也不声称底层 write 支持 AbortSignal。原有 rejection 测试只能覆盖“返回失败”，不覆盖“永不返回”。归档 acquireArchive 和无活动 entry 的 checkpoint 也有同类裸 await，静态可达，未另外制造真实磁盘故障。

**影响：** 关闭、停用或归档卡住；用户无法在指定观察预算后取得准确 incomplete。关闭的后续资源释放被阻止。现实现没有伪造保存成功，也保留了旧有效 marker；这两项不能弥补有限结束的缺失。

**依据：** error-handling 的预算、可释放生命周期、失败后可见处置与清理责任；test-reliability 要求验证 pending 和拒绝两个不同边界。此处可定位到新关闭编排，而非要求重写全仓所有 I/O。

**修复满足条件：** 把本票停止/归档/关闭的总观察预算传到该编排的 queue/checkpoint/flush 边界；到期或取消返回明确未完成，并使尚未执行的归档提交永远不能晚到执行。必须由原 writer owner 隔离/拒绝迟到写入、维持 verified unconfirmed 恢复事实，并在不能安全交接时保持该身份隔离；不能只加 Promise.race 后释放 writer 让下一实例写入、也不能谎称不可取消的 write 已被取消。成功路径仍严格 drain 后释放；失败路径报告未保存并有界处置原生资源。验证 pending/reject、归档取消/超时、释放 gate 后晚到保存、重新启用不受旧写污染及 Browser 独立性。

**证据：** `/tmp/huhu-t04-review-bounds.test.ts`、对应 config/log；2 tests 实际执行、2 个目标断言失败，child exit **126**。barrier 在 finally 释放，等 operation/drain 完成再清理；没有遗留真实进程、网络或用户 vault 写入。

### F3 — Medium：quiesce 后旧低层已接纳启动仍能跨过 spawn 点

**位置：** `src/modules/agent/services/terminal/sessions.ts:349–357,365`；与 `441–444` 的 quiesce 对照。`terminal/session.ts:385–386` 只对 connected 的 end 生效。

**生产可达入口：** `Controller` 在 `controller.ts:231` 将旧 runtime 的 create 直接接到 `TerminalSessions.create`；`AgentRuntime` 的 agent automation 路径 `agent-runtime.ts:429–449` 和 script 路径 `:511–531` 仍可创建没有 managed runtime 的 session。这是当前存在的调用链，不把计划中 T-14 的完整 Space 绑定迁移要求提前列为本票缺陷。

**已证行为：** create 已通过 environment 后的 closing 检查、session 已登记但尚未调用 native.spawn；此时 quiesce 置 closing 并 closeInput。由于未绑定 entry，`entry.stop` 不会保护它；starting session.end 不执行任何动作；hook/beforeSpawn 后及 spawn reply 后均仅重查 disposed/removing/map，没有 closing。释放准备 barrier 后实际调用 spawn **1 次**并 adopted/connected。

第二个独立小探针使用与现存 script 入口相同的 `kind=script, automated=true, prepare` 请求形状，**无 runtime、无 beforeSpawn**；从 prepare 排入 quiesce microtask，使其在 `await request.beforeSpawn?.()` 的恢复前执行，仍观察到 spawn=1/connected。该探针验证生产 create 的重入/微任务窗口，不冒称运行了整个真实 automation 或 Obsidian 停用界面。若 native spawn 已发出后才 quiesce，后置判断也缺 closing，会留下相同迟到 adopt 窗口，后者本轮以静态跟踪确认，未另跑真实进程。

**影响：** 停用已关准入后，本来还可取消的用户程序仍会执行；随后 dispose 即使最终清理进程，也不能撤销已经发生的外部副作用。

**依据：** 生命周期 owner 的同步准入闸应在每个异步恢复边界成立；错误处理合同要求分别定义停止接收、执行和外部工作终止。既有 managed stop 防护不能替代仍在生产中的低层入口。

**修复满足条件：** 最终 spawn 门对所有 request 重验 closing，未发出的启动按取消/未开始结算；已发送的迟到结果仍仅按捕获 generation/lease/sid 清理，不能 adopted 为可继续工作的 session。保持原输出/ACK 清理通路。补带与不带 managed ref 的 quiesce-before-send、quiesce-after-send 回归；不需要为修此门提前实现 T-14 配置迁移。

**证据：** `/tmp/huhu-t04-review-quiesce{,-legacy}.test.ts` 及各自 config/log，两次各 1 test 执行并失败，child exit 均 **126**。只有 fixture native，无真实用户程序；finally 等待 dispose，fixture 的未知清理 AggregateError 被探针明确捕获，不作为成功清理实机证据。

### 已检查而未新增 finding 的标准风险

- 单 writer/持久化：Space queue、pre-spawn verified marker、按 attempt 比较 checkpoint、archive gate 与冻结成员集合、取消后不晚归档、旧 v2 可选字段、恢复不复用 PID/SID；本轮发现的有界等待问题单列 F2。
- 并发/资源：原 generation/route/sid、旧事件隔离、root/cleanup/output 三事实、ACK/parser reply、Browser cookie/history 独立 lease；真实迟到 stop 反例单列 F1。
- Native：Windows bootstrap 私有 gate/逐 Session Job/返回值与失败收束、Unix 出生身份与 SID/TTY/组核验、已知逃逸和枚举失败不暗降 confirmed；当前平台运行范围见限制。
- 安全/许可：未新增依赖版本或 GPL 代码来源；Cargo.toml 是 windows-sys 必需 feature，官方研究/许可/活动取证有实际来源清单。未把文档中 URL 或配置文字当作额外授权，未访问用户账号/vault。
- UI/架构：沿原 modules API/owner、局部 React 组件及 t()/en/zh，确认目标冻结、状态/失败保留、只读恢复和焦点/小屏行为有生产组件证据；没有因为 Fowler 启发式提出整仓重构或格式 finding。
- 工件/验证：源码和生成物通过原 build/type/lint/architecture/预算记录回读；保留曾失败的原输出，Browser numeric-only 拒绝是明确覆盖的新期望而非删弱测试。

<a id="specification"></a>
## 规范轴

Reviewer: codex:/root/review_t04

Axis: specification

Result: request-changes

Input-SHA256: 6b88551127001cc9d60ee42794f8d450adeaa2d6cbe900de6daed1d36d129516

Observed: 独立按固定 Spec、implementation-contracts、T-04 purpose/scope/route/acceptance/verification/constraints、Root 已接受的 runtime-proposal §2–5、native-design、api-record-view 与 DESIGN revision 1 逐项核验。规范存在且充分，未 skipped；结论不是从标准轴机械推导，而由以下外部行为合同与已观察结果判定。

### N1 — High：AC-027 的明确停止在根先退出的残余场景无效果

**位置：** `src/modules/agent/services/terminal/sessions.ts:416–428`。

Spec `AC-027`（`spec.md:254`）要求明确停止处理正确代次并保留失败/残余；Ticket route 2 与 runtime-proposal §2/§5 进一步明确根退出不等于 cleanup、根先退不能跳过 force。F1 的真实原生证据显示：正确 target 有 live descendants 且原 owner 仍可控制，但首次 stop/force 都零请求。残余“可见”部分已满足，明确控制部分未满足。`AC-028` 的正确 incomplete 保护并未失效，但该场景归档无法完成其应先尝试的收束。

**满足条件：** 对仍可控未确认范围执行目标 stop/force，并以 root+cleanup 确认或诚实 partial/unknown 结算；原自然退出/旧观察结算不能永久封死控制。沿 F1 的真实进程及 Browser 对照验证。这里不要求杀任意不可观测 daemon，也不要求把已失联 scope 伪造成可控。

### N2 — Medium：AC-056 / NFR-002 的等待有限结束没有覆盖保存与归档末段

**位置：** `workspace-service.ts:428–434` 和 `368,392,401–403`；关闭消费者 `controller.ts:967–978`。

Spec `AC-056`（`:283`）要求停用时等待有界，`NFR-002`（`:319`）要求停止与关闭有限结束且残余/未知持续可见。Ticket scope 明确 stop/archiving/shutdown 有限收束；获批 runtime-proposal §2 规定 signal/timeout 仅结束当前观察，§3 要求 timeout/取消返回 incomplete 且不晚归档，§5 要求保存失败后先阻断晚写并有界释放。

F2 证明当前前半段 observer 有界，但随后无界 await 把总操作重新挂住；归档不响应自己的 50ms 截止与 abort。没有发现伪造 archived 或擦除旧 marker；规范失败点是操作/观察不能结束。不可取消的底层 write 是必须保留的真实限制，不是无限悬挂上层接口的验收豁免。

**满足条件：** 在不宣称取消底层 I/O、不让旧 writer 与新实例并发的前提下，有界返回可定位的 incomplete/失败，并安排同 owner 的安全后续处置；成功仍 strict drain→release。验证应涵盖永不返回与拒绝两类 IO，以及 timeout/abort 后绝不晚到 archive。

### N3 — Medium：AC-056 的关闭准入闸未保护既有旧入口的在途启动

**位置：** `terminal/sessions.ts:349–357,365,441–444`，生产旧入口 `controller.ts:231` / `agent-runtime.ts:429,511`。

Ticket route 1 明确“先关闭新动作接纳，取消未开始的 spawn/input/wait”；runtime-proposal §5 明确同时阻断 managed/旧低层新动作。F3 两个时序反例显示 quiesce 已发生、native 尚未发送，随后仍 spawn/adopt。与 `AC-056` 的拒绝新动作/迟到进程按身份清理冲突。

implementation-contracts §4.1 的旧业务显式 Space 绑定由 T-14 完整迁入；本 finding 不要求本票接管 T-14，而只要求当前仍存在的旧 request 也遵守本票关闭门。只在未来迁移后删除旧路径，不能满足本票当前代码验收。

**满足条件：** closing 后未发送 request 零 spawn；已发送者按原捕获身份收束，不能变成可继续的运行；managed 与旧 request 都有确定性竞争回归。

### 其他 AC 与设计核对

| 合同 | 本轮观察 | 边界 |
|---|---|---|
| AC-028 | 确认前取消不停止；plan 冻结集合，变化重验；部分/未知不归档；父 Space 标记不删除历史/子记录 | N1/N2 影响完成停止或等待；未发现错误归档成功 |
| AC-029 | captured generation/lease/sid、sequence 与 stable Session→runtime 比较阻止旧 exit/hook 覆盖新运行；checkpoint expected attempt 防旧写覆新 | 未用新真实 Provider 跑宿主 E2E |
| AC-058 | structured spawn none/unknown、无 cleanup 的旧 numeric exit、Host closed 均保留失败/失联；未重放输入 | 完整宿主重启/崩溃用户执行 |
| AC-060 | verified marker 先于 spawn；重开不自动 helper/Provider/spawn/旧 PID kill；只读记录可开，显式 continue/restart 重验来源 | 关闭有限结束受 N2/N3 影响，五平台实机未运行 |
| AC-061 本票局部 | PAGE-001/003/004 上的停止确认、归档结果、未知/恢复、键盘焦点及尺寸均沿生产组件；已打开 narrow partial 与 320×360 长确认 footer 图核对 | 生产组件外围有显式 fixture；不是整个 Obsidian 页面或所有后续票 UI 验收 |

设计绑定为 DESIGN revision 1 / DESIGN-0001 / UI-001 candidate-a，designDigest `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`。本轮未发现需回 P 的新设计漂移；不能据局部样例声称全 T-18 页面验收通过。

<a id="raw-evidence"></a>
## 原始反例、清理与复核

可回读清单：`/tmp/huhu-t04-review-probe-records.json`，记录每个实际 argv、cwd、child exit、测试执行数、原 source/config/log 路径及 SHA256。所有 targeted Vitest 均实际执行目标断言后失败，**126 是实际捕获退出码**，不改写成 1；打印状态/日志的 shell wrapper 退出 0，二者不能混用。未重跑原红灯以制造漂亮回执，没有编造探针起止时刻。Vitest 的原本地开始时间及 duration 留在原 log。

| 探针 | 实际命令（均在 workspace） | 执行结果 | 原输出 |
|---|---|---|---|
| F1 真实 Linux | `pnpm exec vitest run --config /tmp/huhu-t04-review-vitest.config.mjs` | 1 执行 / 1 failed / 0 skipped，exit126 | `/tmp/huhu-t04-review-probe.log` |
| F2 pending I/O | `pnpm exec vitest run --config /tmp/huhu-t04-review-bounds.config.mjs` | 2 执行 / 2 failed / 0 skipped，exit126 | `/tmp/huhu-t04-review-bounds.log` |
| F3 preparing gate | `pnpm exec vitest run --config /tmp/huhu-t04-review-quiesce.config.mjs` | 1 执行 / 1 failed / 0 skipped，exit126 | `/tmp/huhu-t04-review-quiesce.log` |
| F3 旧请求形状 | `pnpm exec vitest run --config /tmp/huhu-t04-review-quiesce-legacy.config.mjs` | 1 执行 / 1 failed / 0 skipped，exit126 | `/tmp/huhu-t04-review-quiesce-legacy.log` |

F1 使用固定 helper `/tmp/huhu-t04-c-linux-final-20261025T103906Z`，23217880B，SHA256 `ce263fd68bdbd792d2b36f675d2ee838ff39052926ce688dcb06b086eb076343`。隔离 HOME/cwd 位于 mkdtemp `/tmp/huhu-review-late-stop-yD9b62`，无 Provider、真实账号或用户 vault。root PID1664795、child PID1664798；日志含真实 `/proc/child/stat` 和生产 evidence。finally 直接 force 原捕获 scope，等待 confirmed/0 与 numeric exit，再 await sessions.dispose、Browser lease.release、native.dispose；日志记录 helperAlive=false。之后 `/proc` 复核两 PID 均不存在，临时目录已不存在，见 `/tmp/huhu-t04-review-special-audit.json`。本 TS probe 不把 `/proc` 消失冒称 subreaper wait；原 Rust 树测试另有真实 subreaper 清理证据。

F2 使用内存 TextStorage/native fixture，barrier 释放后等待 operation/drain，再 dispose，fake timers 在 finally 恢复。F3 只用 fixture native；没有创建真实子进程，清理中捕获的 fixture 未确认 release 不证明平台清理成功。每个 probe 的真实失败发生在预期行为断言，非编译、缺环境或 timeout 杀测试。

F1/F2 的原数值 tool chunk 字段未保留在上下文压缩摘要；其实际 child status、原 log 和观察已由 Root 在本轮消息回读确认。记录明确保留该局限，不伪造 chunk/start/end 字段；F3 两次与结束 freeze 的实际工具回执字段可从本会话回读，probe-records 中保存了可用字段。所有普通只读源码检索的完整工具轨迹由本 reviewer 会话保留，不将其冒充产品测试命令。

## 已有证据复用与特殊记录

实际回读 A/B/C/root/Browser 的 handoff、checks 与相关原日志；独立重新哈希核对 53+33+62+17+3 条检查记录所指向的 **336 条 record/log 原件哈希引用**，无不匹配，见 `/tmp/huhu-t04-review-reused-evidence-audit.json`。哈希相符只证明原件一致，不把实施者自查当独立审查。

- 复用最终 37 文件235 tests/0skip，以及 build/lint/architecture/Promise/i18n/CSS/buildtext/budget exit0；本 reviewer 没有重跑全局构建或 lint。Rust46/0ignored 和 verify0、Windows GNU `--tests` 交叉类型0、B43 DOM 与 Chrome19状态/9行为/20图均按原件范围解读。
- 4 个误触 Rust 文件 `cookies.rs/data.rs/frame.rs/inherited_fds.rs` 已由 reviewer 再次逐字节对固定 base 核对，相等；见 `/tmp/huhu-t04-review-restored-source-audit.json`。不将纯格式事故偷偷计入本票交付。
- 当前 Cargo.lock 精确等于 base，SHA `52fbd40b93902a8f3a8a4908de849d9c915720a1640478b7b01af23d34da7b52`。最终 helper 原生产锁确为 `95dc808bd7e40a5659f4fae5b1b76bd1f2ad700750078c4750250c234f8ea3ed`；reviewer 使用 tomllib 独立比较完整 package 图相等。原 producer 记录和 helper 未被改写；恢复/隔离 locked 检查有原件。未声称当前锁原文字节就是当时 producer 输入。
- 主包+41868B、Agent+28185B，Navigator 源/闭包不变但输出+339B；回读前序 overlay 精确复现 T03 与最小三项 KiB 预算调整。启动123518B/106输入不变；没有把 Navigator 输出字节变动编造成新功能。
- native stop observer 10s 与最后 helper 物理关闭4+1s是不同阶段，不能宣称整条关闭总共10s；F2 所指无界 I/O 更不在这两段预算内。
- Browser 旧 numeric-only 明确拒绝 cleanup 成功，同时 Cookie 能继续；不是为了通过而删除行为断言。
- docs check 的另一 Bot change 6 个既有坏锚点 exit126 原样保留，未将其记为通过，也未把它扩张为本票新 finding。

## 未验证与后续门

真实 Obsidian、真实 Provider/账号、Windows/macOS 实机及五平台 E2E 按用户指示由用户执行；交叉类型检查不证明 Windows运行，Linux probe 不证明 macOS/Windows，Chrome fixture 不证明宿主多窗口/IME。没有运行真实 disk hang，也没有证明不可观测任意 daemon 都可清理。上述范围不是跳过规范轴，而是明确的验收边界。

本轮只交只读 review findings，不修代码、不更新正式状态。Root 应保留本报告和原红灯，按原 owner 修复 F1/F2/F3；修复后重新冻结受影响产品与来源，补相应反例及必要回归，再做独立双轴复审。当前 T-04 不能据本报告宣称代码验收通过。

## 原始日志 SHA256

- `/tmp/huhu-t04-review-probe.log`：`28d5a61d4a376ba6727d4cb747d47e2d43221a24bf22e8714decfeed37d78342`。
- `/tmp/huhu-t04-review-bounds.log`：`29423ec42d827834e8b481108f661c528a0177f2a34e3de7d48caa0e3e849f00`。
- `/tmp/huhu-t04-review-quiesce.log`：`9d96ba54e3344c1404eeddb8eb2d60b8ee4769e06205881789a088a4ace022a8`。
- `/tmp/huhu-t04-review-quiesce-legacy.log`：`aff5510c83563cf3a1dc79dde585137f001d480d7ccf2b02e201f9c83b1239ec`。
- `/tmp/huhu-t04-review-probe-records.json`：`d76145cf45d347f3df0c957c0c8b73914f0f0b3d9f7656d0effd1adfb7276ccb`。

交付前再次只读复验：`2026-10-25T11:10:02.006Z`，`node /tmp/huhu-t04-review-freeze.mjs` 实际 exit0，57文件scope与30/30来源仍一致；原输出 `/tmp/huhu-t04-review-freeze-delivery.json`，SHA256 `8fd231d01ae39571567fd2c0ed45d873e7d1d066b5fdbdff1f5b2cfa45cd5681`。此复验未重跑任何红灯，也未改变冻结产品。
