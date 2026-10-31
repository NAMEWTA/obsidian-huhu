# T-05 独立双轴复审 round 3

Reviewer 为 `codex:/root/review_t05`，沿原独立身份，未参与当前范围实现或修复。本轮只读仓库，新核验脚本、探针、日志及报告仅在 `/tmp/huhu-t05-review-round3-*`；未编译 native、未写共享 target、未提交/推送/发布、未递归派遣。实际实现者仍为 Root、prepare_t03、prepare_t05_screen、implement_t01。C 代表 `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor`。

唯一输入为 `C/evidence/T-05-review-input-round3.md#review-input`。前两轮报告和历史失败保持原样；本报告对第三轮当前候选重新判断，不改写旧 request-changes。

<a id="standards"></a>
## standards

Reviewer: codex:/root/review_t05

Axis: standards

Result: pass

Input-SHA256: a1e5c84108745f14a691df405b416e695e4c168f971e864cebe51983ce6c2a13

Observed: 核验完整冻结工作副本、标准与生命周期修复，独立五项探针通过；详细范围及限制如下。

- 完整读取第三轮 brief、两份 settlement 合同、round2 修复 Packet、fast-exit/owner-drain/capacity Packet 与冻结输入；沿 workspace/catalog/runtime 既有发现路径调用 common/code-review，本轮回读 Skill 与 source-discovery、Fowler、risk-review、reviewer-contracts、review-evidence、working-tree-review、result-reuse，以及错误处理/测试可靠性规则。项目 dev/ui 与其已读参考按冻结来源摘要复核；不以 Fowler 风格启发替代项目明示规则。
- 固定 HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715` 的未提交工作副本，完整49交付文件、57来源；初核57来源+49当前字节+49不可变副本，共155项一致。最终正式 working-tree scope 的全部可比较字段一致（含 tracked/untracked、模式、index、基线和字节），57来源再次一致。新增排除路径只有本次正式 review 输入/brief/dispatch/reuse Evidence，没有新增生产文件被排除。前序94未变文件按依赖复用，不冒称本票增量。
- 沿完整当前交付复核15条 round2 后修复变化路径；实际逐读 Rust frame/main/outbox/session/stdio、Node Helper/Host/shared contracts 与新增测试、容量 fixture、包体预算说明；追踪受影响 TerminalSessions/Session 的启动、退出、失败、ACK、replyFailure 与 dispose 消费。未变 screen/DTO/Presentation/adapter/lease/旧整笔输入消费者沿前两轮实读与本轮字节校验复用。main.js 核冻结字节、构建/包体归因证据，未冒称逐行人工读压缩产物或 reviewer 重建。
- 针对并发提出并检查：未预留拒绝在有限 sibling 积压时被 exit 越过；reply marker 容量耗尽/恢复/断链；writer 在 exit 后才结束；提前/重复/陌生 SID fence；已取得 reservation 但零输出失败；成功 spawn 回执晚于 exit/fence；多个已撤准入 owner 并发 release；timeout 后旧 scope 与新 owner 的隔离。沿生产 owner、消费者、测试与恢复追踪，未找到仍成立的新反例。
- Reviewer 实际运行 `/tmp` 五项独立探针，5 pass、0 skip、exit0。四项是前轮 reset selection、reset sync、resize 可见诊断、本地 reply 容量原有效探针的逐字节副本；第五项由前轮 late-reply 探针沿新增协商合同调整 hello，真实 Helper→Host→TerminalSessions→Session 消费 late write-failed，再发送最终 reply-settled，并核一次 close、零重复 end。未删除原红灯，未修改生产实现。DOM 为 happy-dom，native 为假流，无真实 child/PTY/Provider。
- 阅读 Root 最终30文件227tests/0skip 原日志、build 与 Chrome-v3 的20/20、errors[]；核对 Root 最终/复用日志、输入 manifest、不可变 helper 及12 producer 源，共31项摘要匹配。阅读 C 原生真实 Outbox 全相位 red-v2/green 日志与最终 native 结果；对 C32条记录的 receipt/input-manifest/log 共96项核 SHA 一致。Root/C 的原生运行、Chrome、全局静态门均为已有证据，不冒称本 reviewer 重跑；未查看 Chrome 截图，不声称实际视觉/IME E2E。

### 前轮发现处置

| 前轮发现 | 第三轮判断 | 当前代码与证据 |
| --- | --- | --- |
| STD-01 → STD-R2-01：同 SID 结果被 exit 越过 | 已关闭 | `native/pty-server/src/outbox.rs` 的 `control` 以消息类型将所有 input-state/resize-state 放入同 SID stream，不再以 receipt 是否存在决定顺序；普通 control 与 reserved receipt 仍分别记账并在物理 write 后返还。当前真实 Outbox.new/run 屏障测试覆盖9个 wheel phase、有限64个 sibling high 积压、未 reserved closed/capacity/input/resize、各已预留阶段及 raw→notice→exit。原 red-v2 日志明确 phase0、SID1、op4 none/closed 被 exit 越过，green 实际通过；第一版积压不足的 red 实际为绿，不计有效红灯。另有普通额度洪泛/预算归还用例。 |
| STD-02：RIS 选择与同步输出残留 | 已关闭，保持前轮有效结论 | 本轮相关 source/target 字节未变；已解析 RIS 的 reset reason 与有序 sync-output(false) token 继续由唯一 parser 产生。两个原独立探针本轮再次通过；normal/alt、分片、菜单、多RIS/2026与自然到期的既有验证保持。 |
| STD-03：运行中 resize 故障不可见 | 已关闭，保持前轮有效结论 | 独立当前请求 resizeDiagnostic 与 View 有限通道消费未回退；只有当前 applied 清故障，requested/superseded 不伪称恢复，旧回调与 disposal 有守卫。原独立探针本轮通过。 |
| STD-04 → STD-R2-02：reply 故障被吞或退休路由丢弃 | 已关闭于已协商的新协议 | 本地 typed error、native 首故障常数槽及 Session sticky 诊断仍成立；新增独立 ingress/writer settlement fence，Helper 与 Host 都等待准确结算再退休。晚故障生产消费链本轮独立通过；native 当前 claimed writer 成功/失败屏障测试检查真实 writer 完成/drop，再产生 failure→settled，numeric exit 不等 writer。 |

### 当前边界核验

1. **FIFO 与有限性。** 未 reserved 结果使用普通 control 额度，没有借 receipt reserve 绕容量。不同 SID stream 的数量受已准入 frame 总额约束；未知 SID 不建立无限 reply slot。修复使“已入队 none 被后入队 exit 越过”的帧流不可达，因此不要求改写已 settled unknown 来让旧手工 exit→none probe 变绿。该原 probe 保留为旧消费后果证据。
2. **真实完成与结算。** `InputQueue.settle_replies` 同时要求 negotiated capability、reply ingress 已关闭、InputQueue ended、实际 writer_done；`Outbox.reply_settled` 常数一次且沿 SID stream 排在已产生 fault 后。Node marker 与既有 reply 使用同 lane/SID FIFO；`write(false)` 不重发，pending marker 最多32，恢复后一次准入，断链清理。每 SID fault 与 settlement 各一个≤256B预留，合计上限32×512B，沿物理 write 释放；numeric exit/master close 没有等待 future writer 的循环依赖。
3. **失败启动不伪造 I/O 结算。** native `reserve_for_wire` 在 admission 锁下同时核 pending/live/仍被 packet 持有的 reply slot。只有未建立队列且无旧同 SID owner 的 typed-none 可携 literal replySettled:true；closing-existing-owner 和 duplicate 不借该标志退休旧请求。Helper 额外要求能力已协商、literal true、typed-none、未观察 raw。已 reserve 的零输出失败仍发 reply-close 等实际 fence。unknown 失败保持 unknown，缺能力 legacy 不发新 wire、不等待不支持的 fence；不把旧 helper 冒称拥有晚 I/O 保证。
4. **成功收养与并发释放。** Host 将 spawn 期间 settlement 分为 before-exit/after-exit；成功/unknown 只继承真实 after-exit，before-exit 仅与 typed-none 配对。raw ACK、cleanup 与 reply fence 各自独立；已完成的 released SID 不重复 end。`released` 同步撤准入，`releaseObserved` 标记既有有界观察已完成，空 History/Cookie 释放不再提前关闭 sibling PTY drain。正常 shutdown 不等待自身 release promise；仍活跃的新 owner 阻止旧 release 关 helper；强制 dispose/断链沿原失败分路，timeout 不假称 cleanup。
5. **容量 fixture 的准备条件。** 最后仅变 `host-stream.integration.test.ts`：一个循环外4s总 deadline，逐 SID 等真实 spawned 再发下一项，失败/退出立即报告；仍为32个真实 scope、第33次真实 native 拒绝、Node routes/marker归零与 Browser 存活。没有增时、重试、降数量或全局串行。此改动验证准备条件，未证明原填充失败根因。

Findings: 本轮有效审查范围内无新增可定位的标准轴缺陷。`pass` 表示当前候选满足本轮代码审查，不是所有交错或平台的无缺陷证明。

未解事项与影响：早先 blocked-input 34 cycles 的 stdinEOF masterHandlesPending=1 原 primary 不全，根因仍未知；后续4s填充32 scope未完成的旧组合原因也未知，一次只读 probe 通过不能解释它。新 FIFO/settlement/owner 修复、fixture 屏障和最终227项通过均不倒推这两次历史根因。原失败完整保留为可靠性证据限制；本轮没有从它们构造未定位的新缺陷，也没有声称“已修其根因”。真实 Obsidian、Provider、五平台及 OS IME 仍由用户验收。

<a id="specification"></a>
## specification

Reviewer: codex:/root/review_t05

Axis: specification

Result: pass

Input-SHA256: a1e5c84108745f14a691df405b416e695e4c168f971e864cebe51983ce6c2a13

Observed: 按同一冻结输入核对 T05 规范及新增结算合同，前轮缺口已闭合；详细依据及限制如下。

- 同一完整49文件未提交候选；57来源经当前与终审摘要核验。按已读且未变的 Spec、implementation-contracts、T05 purpose/scope/research/route/acceptance/verification/constraints、ADR/CONTEXT、reference-notes、DESIGN rev1 PAGE-001/UI-001、goal-plan protocol、T05实施方向与Session/native/screen proposals、output-abandon/failure-drain/metrics/scope20/i18n决定，复核本票行为。完整阅读新两份 settlement 合同和 fast-exit/owner-drain/capacity 修复 Packet；不把 proposal 的旧候选签名当另一套当前协议。
- 保持 AC-031/032/054、本票 AC-061 PAGE-001 与 AC-030 原交互保证；检查唯一解析权威、纯 screen DTO、增量/resync/read预算、parse ACK、独立设备回复、整笔输入及尺寸 requested/applied、可见失败和有限退出。未变部分复用前两轮实际分析；新协议/owner交错按当前最终代码重新审，不仅检查修复 diff 或测试数。
- 实际独立五项探针结果与标准轴所述相同，但本轴按规范分别判断。尤其 late reply 实验使用新增 negotiated capability 与最终 fence，保留原 exit 后准确 failure 断言；未把无cap旧probe的旧red覆盖为pass。原生 writer与Outbox、真实 Linux容量/压力为读取并校验的 C/Root证据，本 reviewer 未实际运行 native/helper。
- 终审正式 scope 所有可比较字段、57来源与 Input-SHA256 均匹配。规范未漂移；只增加正式 review Evidence。T06–18 未实施项不纳本票缺陷，也未修改 Ticket/Goal/Map 状态。

### 规范发现关闭依据

| 前轮发现 | 第三轮判断 | 规范核验 |
| --- | --- | --- |
| SPEC-01 → SPEC-R2-01 | 已关闭 | T05实施方向5/6、native proposal §2–3与ADR-008要求准确区分none/unknown。当前所有已准入操作状态与exit共享SID FIFO，包含没有reservation的明确拒绝；生产调度屏障证据覆盖该分支，未采用盲重发、增加额度或篡改既有unknown效果语义。 |
| SPEC-02 | 已关闭，保持 | AC-031 reset/屏幕一致和AC-030选择复制语义由已解析 reset effect恢复，单parser/target不解析raw保持。原两个独立反例本轮再次通过；不改变批准的 PAGE-001 设计。 |
| SPEC-03 | 已关闭，保持 | AC-061 PAGE-001错误状态与T05方向4的requested/applied/none/unknown/superseded区分仍落实到运行中的可见通道，原probe再次通过；后续仅当前applied恢复，无伪造回退或尺寸owner转移。 |
| SPEC-04 → SPEC-R2-02 | 已关闭于已协商协议 | AC-031设备回复、AC-054有限资源与修复packet“已结束runtime记录准确结果，不反复stop”贯通到真实Helper→Host→Sessions→Session。exit不等future writer；晚completed(false)准确unknown/write-failed先于最终reply-settled到达原Session，新独立probe通过。旧helper无能力的限制按新增合同明确保留。 |

本轮新合同逐项核验：

- `T-05-repair-round2-settlement-contract.md`：protocol3 双向可选 `replySettlement=1`，不能由protocol版本推断；严格 reply-close/reply-settled，无cap不发送/不等待；Node numeric exit 后同步拒绝新reply，旧准入reply先于marker；native ingress+ended+实际writer完成才结算，EOF作最后ingress；有限slot和原captured owner/generation保留，release仍沿原10s观察，timeout/断链准确呈现。
- `T-05-repair-round2-reserve-settlement-contract.md`：仅pre-reservation且无同SID旧owner的typed-none可直接结算；本地oversize测试没有替代真实32scope后第33次native拒绝；有reservation零输出仍等真实fence，错误类型/legacy/output/foreign frame负例存在。`failure.effect:none`不被泛化成“所有I/O已结束”。
- fast-exit Packet：成功spawn回执晚于numeric exit和最终settlement时保留已有事实；before-exit不能错误结束正常live；released成功回执不重复end，late raw ACK不能被reply fence替代，unknown失败仍unknown。真实Helper/Host回归与Host矩阵覆盖这些消费路径；更上层Session.adopt仅把starting转connected，已接受exit不被迟到spawn回复复活。
- owner-drain Packet：同代多个owner已released不等于已完成观察；私有releaseObserved区分这两个事实。Browser新owner存活、旧owner晚fault/ACK/fence、既有timeout与最终单次关闭均保留；没有新增公共接口、资源额度或等待预算。
- capacity Packet：原单一4s deadline和全部业务断言保持，修改限fixture readiness；没有把32上界扩张成“32个并发bootstrap必成功”的产品保证。Root最终227项包含原真实压力、双observer、Cookie和未改sessions.e2e，属于既有代码层验收证据，不等于真实宿主/Provider验收。

Findings: 当前冻结范围内无新增规范轴缺口。两轴分别通过，既有旧报告仍为其各自输入上的 request-changes；本次pass仅用于T05当前代码候选。

未解事项与有效范围：旧 masterHandlesPending=1 与后来的4s容量填充失败原因仍未知；其原日志/尝试不被新绿色覆盖。后者仅修准备假设，前者没有因果归因；继续保留为 AC-054压力/清理证据局限。本票当前合同缺口已由具体实现与有效证据闭合，不将未知历史解释伪装为已修，也不把用户负责的真实Obsidian/Provider/五平台/OS IME写成完成。T06及以后仍不在本轮通过范围。

## 原件与实际执行收据

- 原输入与代码：`/tmp/huhu-t05-review-round3-input.json`、`/tmp/huhu-t05-review-round3-source/`、`/tmp/huhu-t05-review-round3-increment.diff`、`/tmp/huhu-t05-review-round3-repair.diff`、`/tmp/huhu-t05-review-round3-repair-files.json`。
- 初核脚本与结果：`/tmp/huhu-t05-review-round3-verify.mjs`、`/tmp/huhu-t05-review-round3-source-observation.json`（155项全匹配、正式JSON对象一致）。当前审查规则摘要 `/tmp/huhu-t05-review-round3-review-rules.json`。
- Reviewer真正执行的五项测试：`/tmp/huhu-t05-review-round3-probes/`，含原四probe副本、`late-reply-negotiated.test.ts`、config、`check.log`与`check.receipt.json`。执行前输入摘要 `/tmp/huhu-t05-review-round3-probe-inputs.json`；2026-10-25T19:11:55Z–19:12:02Z，5pass/0skip/exit0，argv/cwd/原log SHA/cleanup边界在receipt。没有真实native child。
- 最终正式scope有效原件：`/tmp/huhu-t05-review-round3-final-scope-v2.{json,stderr,receipt.json}`；比较结果 `/tmp/huhu-t05-review-round3-final-check-v2.json`；实际wrapper `/tmp/huhu-t05-review-round3-final-verify-v2.mjs`、`.log`、`.receipt.json`。有效正式命令exit0，完整scope可比较字段全相同、57来源全相同，新增排除仅4条正式review Evidence。
- 第一次scope wrapper的默认spawnSync输出缓冲不足，保存的JSON截断，wrapper parse失败/实际exit126；这是reviewer工具装配失败，未运行产品测试或改源。原 `final-verify.mjs`、`final-scope.{json,stderr,receipt.json}` 和 `final-scope-assembly.json` 保留。v2唯一执行修正为maxBuffer=32MiB，正式argv与49路径不变；没有据截断结果给通过。
- 已有证据核验：`/tmp/huhu-t05-review-round3-reused-receipts.json`（Root31项）；`/tmp/huhu-t05-review-round3-native-receipts.json`（C96项）。来源为 `C/evidence/T-05-capacity-root-attempt3-audit.json`、`T-05-owner-drain-root-attempt2-audit.json`、各 C handoff/checks。Root最终30文件227tests、Chrome20/errors[]与生产build/静态门未被 reviewer 重跑；v7→v8唯一测试准备变化支持不变生产检查复用。C native74/verify与Windows GNU交叉类型仅按未变12producer复用，不称Windows实跑。
- 不可变helper `/tmp/huhu-t05-repair-r2-c-linux-final-20261025T180555Z`，SHA256 `68364efe0e253ed9662814f596a904680476e918d2c4fd86207b9c0849417e91`、0555、26357552B；本reviewer只核字节与producer，不运行或重建。未打开GPL参考源码，仅核现有数字相似度审计及项目/xterm MIT实际依赖语义。
- `/tmp/huhu-t05-review-round3-checks.json` 与 `/tmp/huhu-t05-review-round3-manifest.json` 汇集本轮真正运行及源/原件摘要；历史round1/round2报告、探针和失败未覆盖。

SOURCE STOPPED。无仓库写入，无后台reviewer fixture或自有native进程。T05当前冻结候选两轴pass；正式状态与后续验收由Root维护。
