# T-05 独立双轴复审 round 2

审查者：codex:/root/review_t05；未参与实现，只读仓库，无提交、推送、发布、原生编译或递归派遣。所有新探针及报告仅写 `/tmp`。C 代表 `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor`；代码行号指本次冻结工作副本。前轮报告与失败原件保留，本报告没有把原 request-changes 改写为 pass。

<a id="standards"></a>
## standards

Reviewer: codex:/root/review_t05

Axis: standards

Result: request-changes

Input-SHA256: be9cc7f307e0651cc0eb009862a93a337fd89b93dfd6251102dfacbec07ac96c

Observed:

- 沿根 AGENTS 的 workspace/catalog/runtime 发现流程及直接 common/code-review 审查合同，复用 SHA 未变的 source-discovery、fowler-smells、risk-review、reviewer-contracts、review-evidence、working-tree-review、dev/ui 与相关项目规则的实际阅读；本轮另外读取 result-reuse。Fowler 仅作定位启发，不把固定版本集中 adapter 的必要私有访问本身作为缺陷。
- 审查对象为 HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715` 上未提交的 48 文件工作副本，包含 untracked 与模式。初核 46 来源、48 当前文件及48不可变副本共142项；终审重跑正式只读 scope 工具，base、HEAD、scope、changed paths、working_snapshot、index、tracked diff 全部相符。正式 review-input 与 /tmp JSON 对象相同，46来源再次相符。排除集新增仅正式 Evidence；未发现生产源漂移。前序95个未变交付文件仅作依赖复用。
- 本轮实际回读前轮四项与 repair packet，逐项追踪25个修复变化路径（包含产物），读取 Rust frame/main/outbox/session、Node helper/host/shared contract、Session/Sessions/screen source/View、i18n/docs、相关新增测试及 Chrome 脚本改动。对未变23个交付文件和原43条未变来源复用原审查阅读，不把旧结论当新修复的通过证明。main.js 核字节及 Root 构建证据，未冒称逐行审阅压缩产物或独立重建。
- 实际重新运行前轮四个独立有效探针：reset selection、reset synchronizedOutput、resize 可见诊断、reply 本地容量诊断；4 pass、0 skip、exit 0。真实生产 Session/Presentation/adapter/xterm 或 TerminalSessions/PtyHelper，DOM 为 happy-dom，native 为 fake streams。
- 实际新增两个真实生产消费链探针：PtyHelper → NativeHost → TerminalSessions → Session。各1个目标断言失败、runner 实际 exit 126，均正常完成 finally 清理，无真实 native child。生产 Rust 的可达时序由源码证明；这两个探针只注入该时序的 wire 帧并验证消费后果，没有执行 Rust scheduler 或真实 PTY。具体边界见下两项。
- 读取 Root build-v1、tests-v1、architecture-v2、Chrome-v1/v2 等命令收据和 C repair handoff；Root 的30文件207tests、Chrome-v2 20/20及 errors[]不是本 reviewer 重跑。Chrome-v1 18/19失败保留，后续脚本单变量修正不抹除原失败；本 reviewer 未查看5张截图或执行 Chrome。lint/Promise/i18n/bundle 的通过来自 Root 收据/交接，未独立重跑全套。C 的 Rust 与 Windows 交叉类型结果不等于真实五平台。未打开 GPL 参考终端源码。

### STD-R2-01 — P1：未预留槽的已知操作拒绝仍可被同 SID exit 越过

位置：`native/pty-server/src/outbox.rs:219–262`，`native/pty-server/src/session.rs:330–349,1192–1197`；消费端 `src/host/desktop/native/helper.ts:333–343`。

修复把有 receipt reservation 的 input/resize 全阶段放入 SID stream，但 `control` 只有在 `(sid,op)` 已存在于 receipts 时才设置 packet.receipt。没有预留的 none/closed、none/capacity 等合法拒绝仍占普通有界 control 额度、进入 high lane。`InputQueue.begin` 在 closed、invalid 或 room/reserve 失败时恰好没有 reservation。resize 的前置拒绝有相同结构。

可证伪触发：某 SID 的 monitor 已执行 `input.close(true)`，尚未 enqueue numeric exit；stdin 线程处理此前 Node 已发出的 input-begin，得到已知 none/closed，并成功 enqueue 到 high。随后 monitor enqueue exit 到 SID stream。在有限的其他 SID high 回执积压下，4 high / 4 stream / 1 bulk 的物理轮转允许 exit 先写出。这里 none 已产生并成功准入，早于 exit；不是要求等待未来未知 writer 结果，也不是退出后新增用户输入。InputQueue 和 outbox 锁没有跨越 close→exit 的整个区间。

实际消费反例：`unreserved-rejection.test.ts` 经真实生产链提交一次输入，确认 input-begin 实发一次且未接到 reserved；随后注入合法 confirmed/drained notice、numeric exit、none/closed。得到 `{op:1,state:'unknown',reason:'transport-lost'}`，Session 记录未知诊断，beginCount=1。期望 none 的断言红。此处**没有运行 Rust 物理调度器**；源代码给出可达生产顺序，探针只证明该顺序在当前消费者造成的后果。没有把旧 round1 的 native 实验冒称新候选的未预留槽实验。

影响：原本确定没有效果的输入被内部调度永久降级成未知，用户收到不必要的人工核实提示。没有观察到自动重发，也不声称未知被错误当成 none。现有 reserved 全相位测试无法覆盖这个无 reservation 分支。

标准依据：common/rules/error-handling 的已知未发生、已确认提交、未知应准确区分；risk-review 的并发因果、状态归属、失败恢复。修复 packet 所列 reserved 回归只是具体实现工作，不消除原审查的全体已产生结果要求。

满足条件：让已经成功准入的同 SID 操作结果（包括未 reserved 拒绝）在失去结算能力之前有序到达，或提供等价有限对账；保留普通 control 容量、receipt 预算及未知 SID 防洪边界。用真实 Outbox.new/run 在各 wheel 相位验证未 reserved closed/capacity/resize 与 exit、物理返还。**不要求把已永久 settled 的 unknown 强改为 none 来使这个固定错序帧 probe 变绿**：若 native 修复证明该入队顺序不能再物理错序，旧手工错序输入只保留为后果证据，不独立否决修复。不要等待尚未产生的 writer 结果来阻塞 exit。

### STD-R2-02 — P2：exit 后才完成的 reply 写失败被已退休 SID 路由丢弃

位置：`src/host/desktop/native/helper.ts:270–277,773–787`；生产时序 `native/pty-server/src/session.rs:546–556,728–753,1192–1211`。端到端责任还包括 `src/host/desktop/native/host.ts` 的 released owner 退休条件。

native 正确地不在 close 时伪造 claimed reply 的失败，而在 writer 实际 completed(false) 时发 unknown/write-failed。但 monitor 在检查 writer_done 之前已经发送 numeric exit，并继续 flow.close/close_master；因此 claimed writer 可能在 exit 后才返回失败，typed reply-failure 随后进入同 SID stream。Node retireSession 只检查 numeric exit、confirmed 和 raw credit，立刻删除 terminationSequences；后来的 reply-failure 在控制分支因 SID 不存在直接 return，未到 NativeHost 和 Session。

可证伪触发与实测：`late-reply.test.ts` 使用真实 parser 发一次 DSR reply，经过真实 PtyHelper/NativeHost/TerminalSessions；fake transport 发送 confirmed/drained、numeric exit，再发送合法 `{type:'reply-failure',state:'unknown',reason:'write-failed'}`。观察 `received:[]`、`connection:'exited'`、`diagnostic:null`、`ends:0`，期望 Session.replyDiagnostic.reason='write-failed' 的断言红。source 明确允许 writer 在退出之后完成；本 probe 未运行真实 PTY blocked write。新增直接调用 Session.replyFailure 的“accepted exit 后保留事实”测试只验证 Session 本身，跳过了发生丢失的生产路由。

影响：本轮新增的准确、有界 reply 诊断在合法退出竞争下仍消失，用户与 Session 不能辨认已经发生的查询回复写失败。原 SID 即使仍由用户页面持有也复现；释放 owner 的生命周期也需一起核对。没有要求退出后的故障再重复 stop。

标准依据：common/rules/error-handling 的失败可观察性和明确结果；risk-review 的实际 owner/消费者/资源退休顺序；dev 测试规则要求覆盖实际受影响路径，直接调用终点不能替代跨边界验证。

满足条件：通过有限且准确的生命周期 fence/结算协议，保留原 SID 与 owner 路由直到晚 I/O 结果可以结算，或在明确边界给出准确的最终未知；不得无界保存 tombstone、将故障交给新 SID，或将 claimed reply 提前假称失败。不得等 writer 才允许 numeric exit/master close，形成关闭依赖死锁。必须验证完整生产消费链在 confirmed+exit 先于 writer failure、owner release 与兄弟 SID 下仍有准确结果；与上一项不同，这里的结果真实地**在 exit 后才产生**，仅改变已有 packet FIFO 不足。

### 前轮标准轴四项处置

| 前轮项 | 本轮处置 | 证据与有效边界 |
| --- | --- | --- |
| STD-01 | 部分解决，仍未关闭 | reserved 各阶段同 SID FIFO 与生产全相位测试已补；未 reserved 拒绝见 STD-R2-01。 |
| STD-02 | 本轮范围内解决 | source 已解析 RIS 记录 reset、sync-output(false) 顺序 token；target 沿既有 reset 语义清选择。原两个独立探针通过；新增 normal/alt、分片、菜单、多 RIS/2026 与自然到期场景已阅读。真实 OS IME 非本项验证范围。 |
| STD-03 | 本轮范围内解决 | 独立 resizeDiagnostic 绑定当前 request sequence/op/runtime，只有当前 applied 才清旧故障，旧失败及 disposal 有守卫；View 按有限通道组合显示。原独立探针通过，throw/none/unknown、后续成功与双观察者测试已阅读。 |
| STD-04 | 部分解决，仍未关闭 | 本地 typed error、native 独立首故障槽、原 SID 事件与 Session sticky 诊断/至多一次 stop 已接通；原129 DSR容量探针通过。退出后的真实完成失败仍丢失，见 STD-R2-02。 |

未解事项及影响：原压力 attempt2 的 blocked-input 34 cycles 最后记录 stdinEOF masterHandlesPending=1，primary 曾被 cleanup 覆盖，根因仍未知。本轮通过、此前 attempt3、上述两个时序缺陷都不能证明其根因或已修。它作为压力/清理证据限制保留，不凭猜测另设第三项缺陷。当前 request-changes 由两项具体可证伪缺口成立。真实 Obsidian、Provider、五平台及 OS IME 仍由用户验收，本 reviewer 未运行且不声称完成。

<a id="specification"></a>
## specification

Reviewer: codex:/root/review_t05

Axis: specification

Result: request-changes

Input-SHA256: be9cc7f307e0651cc0eb009862a93a337fd89b93dfd6251102dfacbec07ac96c

Observed:

- 使用同一48文件冻结候选与46来源，不只看 HEAD 或 repair diff。原43来源 SHA 未变，复用前轮对 Spec、implementation-contracts、T05 purpose/scope/research/route/acceptance/verification/constraints、ADR/CONTEXT、reference-notes、DESIGN rev1 PAGE-001/UI-001、goal-plan protocol、实施方向、Session/native/screen proposals、output-abandon/failure-drain/metrics/scope20/i18n 决定的实际阅读；本轮回读原四发现、新 repair packet 与 repair input。终审46来源及工作副本模式/字节无漂移。
- 继续以 AC-031/032/054、本票 AC-061 PAGE-001 和 AC-030 交互兼容约束审查；不扩大到 T06–18 的未来实现。proposal 用于已采用行为，不把旧候选签名替代实际当前合同。修复 packet 是本轮增加的明确接缝，不撤销原 none/unknown 与可观察失败保证。
- 重点核对同 SID 操作因果、reply 独立预算与真实生命周期、退出后的 owner 路由、RIS 已解析 effect/选择/同步模式、resize requested 与 applied 及持续可见诊断；对 unchanged parser/DTO/journal/read/budget/lease/ACK/旧消费者沿原实读复用。运行四个原探针全绿和两个新消费链反例，边界均为真实生产 TypeScript 逻辑与 fake transport/happy-dom，不声称真实 Obsidian/Provider/平台 E2E。
- Root/C 全套验证仅作为读取的外部收据，未以测试数或 SHA 代替合同核验。Chrome-v1 失败、原压力 attempt2 与原四项报告仍保留。

### SPEC-R2-01 — P1：整笔输入在原生明确拒绝后仍被内部退出调度永久变为 unknown

位置：`native/pty-server/src/session.rs:330–349,1192–1197`，`native/pty-server/src/outbox.rs:219–262`，`src/host/desktop/native/helper.ts:333–343`。

触发：monitor 关闭 InputQueue 后、enqueue exit 前，已从 Node 发出的 begin 被 native 拒绝为 none/closed；由于没有 reserved slot，成功准入的拒绝走 high，exit 走 stream，在有限合法 high 积压及轮转下 exit 可以先发。当前消费者看到 exit 立刻 settle unknown 并删除操作，后续 none 无法结算。不存在真实 transport 断开。

实际观察：完整生产消费链 probe 注入上述 wire 次序后返回 unknown/transport-lost，而不是已经明确的 none/closed；beginCount=1，没有自动重发。原生调度可达性是静态源码证据，本轮没有执行该未 reserved 情形的真实 Rust scheduler。reserved 情形已修不能覆盖这个分支。

规范依据：`C/evidence/T-05-implementation-directions.md` 选择与不变量5、6的准确整笔准入结果与有界 outbox；`T-05-native-contract-proposal.md` §2–3 的 queued/started/written/none/unknown 和接收结算；ADR-008 的结果与未知区分。先产生的确定无效果在本实现内部丢失，不属于外部不可确认的合理 unknown。repair packet 指定 reserved FIFO 是修复方向，不是允许未 reserved 拒绝失去结果的合同例外。

满足条件：成功准入的同 SID 操作结果，包括前置拒绝，保持结束前可结算的顺序或等价有限协议，同时保持预算、物理 write 返还、raw fence 与无重发。使用真实生产 Outbox.new/run、未 reserve target、各相位和 finite sibling load 证明修复。手工固定 exit→none 的旧 probe 是当前错序后果证据；修复使该帧流不可达后，无需修改永久 settled 效果语义强行让旧 probe 通过。不得阻塞 exit 等待尚未产生的未来结果。

### SPEC-R2-02 — P2：修复合同要求的“已结束 runtime 记录准确 reply 结果”未贯通

位置：`src/host/desktop/native/helper.ts:270–277,773–787`；`native/pty-server/src/session.rs:546–556,728–753,1192–1211`；NativeHost released-owner 路由为关联生命周期边界。

触发：reply 已由 native writer claim，numeric exit 在 writer 完成之前发出；随后关闭 master 等路径使 write 返回 false，native 才产生真实 unknown/write-failed。此顺序不违反同 SID FIFO，因为 fault 在 exit 后才存在。Node 早已依据 confirmed+numeric+raw drained 退休 SID，丢弃晚 fault。

实际观察：真实 parser/PtyHelper/NativeHost/TerminalSessions/Session 探针发送 DSR 后依次接收 confirmed、exit、typed write-failed，最终 Session 为 exited、replyDiagnostic 为空，事件 received=[]、ends=0。断言失败；不声称执行过真实 PTY 阻塞写。直接调用 Session.replyFailure 能记录事实的单测未经过丢失处，不能满足端到端合同。

规范依据：Spec AC-031 的设备回复、AC-054 的受控资源与控制完成；原 native proposal §2 的失败可观察性。新增 `C/evidence/T-05-repair-round1-packet.md` 明确规定实际 completed(false) 才是 unknown/write-failed、close 不得提前假称失败、不等待 writer 形成关闭死锁，以及“已结束/失联runtime只记录准确结果，不反复stop”。当前保留了正确 native 生成时机，却没有保留能消费它的有限生命周期。

满足条件：在有限预算和原 SID/generation/owner 归属下，用真实生命周期 fence 或准确终结协议保证晚完成结果到达 Session/UI；继续 parse/ACK，不重复 stop、不重发 reply、不把设备回复转成普通输入。验证 confirmed+exit 在先、实际 write failure 在后、owner release 及兄弟 SID 的完整消费链。不能靠只移动既有包 FIFO、无界 tombstone 或提前假造 write-failed 通过。

### 前轮规范轴四项处置

| 前轮项 | 本轮处置 | 对应合同结果 |
| --- | --- | --- |
| SPEC-01 | 部分解决，仍未关闭 | reserved 阶段与退出因果已落实；未 reserved 的确定 none 仍可能永久变 unknown，见 SPEC-R2-01。 |
| SPEC-02 | 本轮范围内解决 | reset 的权威已解析语义、选择清理和 sync token 保留顺序；两个原反例通过，normal/alt/raw/fragment/menu 与显示 flush/离屏自然到期的新增测试及脚本已核读。未另加视觉方案或 raw 重解析。 |
| SPEC-03 | 本轮范围内解决 | 运行中 resize 故障独立可见，requested/superseded 不伪称 applied，只有当前 applied 恢复；原探针通过，旧回调/卸载防污染的实现和测试符合本轮接缝。 |
| SPEC-04 | 部分解决，仍未关闭 | 本地/远端准入失败已 typed、有界并路由会话，原容量反例通过；实际 writer 晚完成故障仍不满足 ended runtime 准确记录，见 SPEC-R2-02。 |

未解事项与有效范围：原 attempt2 masterHandlesPending=1 的因果仍未知；后续全绿、fixture 清理诊断修正与本轮两个缺口均不证明它已修，继续作为 AC-054 压力/清理证据限制保留。当前规范轴拒绝由上述两项明确合同缺口成立，不额外要求 reviewer 执行用户承担的真实 Obsidian/Provider/五平台/OS IME，也不将 T06–18 未实施作为 T05 缺陷。

## 原件、实际执行与停止状态

- 冻结对象：`/tmp/huhu-t05-review-round2-input.json`、`/tmp/huhu-t05-review-round2-source/`、`/tmp/huhu-t05-review-round2-increment.diff`、`/tmp/huhu-t05-review-round2-repair.diff`；变化清单 `/tmp/huhu-t05-review-round2-repair-files.json`。
- 初核 `/tmp/huhu-t05-review-round2-sha-check.json`；终核 `/tmp/huhu-t05-review-round2-final-scope.{json,stderr,receipt.json}` 与 `/tmp/huhu-t05-review-round2-final-check.json`。scope 实际 argv/cwd/UTC/exit0 在 receipt；全部字段及46来源匹配。新增排除路径全在 C/evidence，无生产漂移。
- `/tmp/huhu-t05-review-round2-probes/manifest.json` 包含13个源/config/log/receipt 的 SHA 与字节数。原四测试副本 `reset.test.ts`、`reset-sync.test.ts`、`resize-diagnostic.test.ts`、`reply-overflow.test.ts`；本轮共同运行收据 `round1-probes.receipt.json`、`round1-probes.log`：2026-10-25T17:16:14Z–17:16:21Z，4pass、0skip、exit0。
- 新原件 `late-reply.{test.ts,log,receipt.json}`：2026-10-25T17:17:29Z–17:17:31Z，1个目标断言失败、exit126；`unreserved-rejection.{test.ts,log,receipt.json}`：17:20:02Z–17:20:04Z，同样1个目标断言失败、exit126。两者 receipt 均保存完整 argv/cwd/UTC/源码SHA及 finally 清理边界；没有真实 child/native 进程。测试失败为产品断言，不是装配失败。
- 读取而未重跑的 Root 证据：`/tmp/huhu-t05-root-repair-build-v1.json`、`/tmp/huhu-t05-root-repair-tests-v1.json`、`/tmp/huhu-t05-root-repair-architecture-v2.json`、`/tmp/huhu-t05-root-repair-chrome-check-v1.json`、`/tmp/huhu-t05-root-repair-chrome-check-v2.json` 以及相应交接原件；C 为 `/tmp/huhu-t05-repair-c-handoff.md`。以实际原件名称为准，全部历史失败保留，不把 C 早先宽组合40pass/1fail冒称重跑为全绿。
- 唯一允许的原生 helper `/tmp/huhu-t05-repair-c-linux-final-20261025T164513Z`：SHA `2d96d4b3da932e38e8cbcd8e151f712b229eb4b3a4adb7af55bba44bdd3060d7`。本 reviewer 只核 SHA，未运行、改写或重建。
- 前轮原报告 `/tmp/huhu-t05-review-round1.md` SHA `d8b6a3956d16d092ab2d9b2f85da76aa53dfcf92d5c06fb3c56aee90f0998cc0` 及全部原 probes/Outbox 实验仍存在；本轮不覆盖它们。

SOURCE STOPPED。无仓库写入，无运行中的 reviewer fixture；当前双轴均 request-changes，待上述同范围修复后重新冻结复审。
