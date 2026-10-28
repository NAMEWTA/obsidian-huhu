# T-05 独立双轴审查 round 1

审查者未参与本票实现；只读仓库，未提交、推送、发布或递归派遣。诊断测试仅写 `/tmp/huhu-t05-review-probes/`。本报告的 C 简称 `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor`；代码行号均指本次冻结候选。

<a id="standards"></a>
## standards

Reviewer: codex:/root/review_t05

Axis: standards

Result: request-changes

Input-SHA256: 6762a4fcbfd16b026571c5d94731fd98d8d1325d3d7d9cfcad2e44268d7047ad

Observed:

- 按根 AGENTS 读取 workspace/catalog/runtime，并直接执行 common/code-review 的 source-discovery、Fowler、risk-review、reviewer-contracts、review-evidence、working-tree-review；读取 dev/ui 与相关架构、生命周期、Obsidian API、测试、构建、i18n、许可、设计系统、shell、无障碍规则及 ESLint/TS/Vitest 配置。Fowler 项按启发式使用，不将固定版本集中 adapter 的必要私有访问或格式变化单独报为缺陷。
- 固定 baseline/HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`；审查 input 中全部 48 个实际交付路径及相对 T04 交付字节的增量，包含新增 untracked 文件。初次核对 43 个来源及 48 个当前/不可变副本 SHA，共 139 项；终审重新运行正式 working-tree scope 工具，HEAD、基线、index、模式/字节 working_snapshot、tracked diff 均一致，43 来源再次一致。仅排除集增加正式 evidence，未新增生产实现；详见收据。前序未变 95 文件仅按依赖复用，不冒称本票新增实现。
- 实际追踪单 headless → SessionScreen → DTO/journal/read → Presentation → visible adapter/View/TabView；focus/resize lease、预算与 fault、退出/ACK/drain、旧手工与 prompt/agent-runtime 整笔输入消费者；Node writer/operation 状态机、NativeHost owner、Rust InputQueue/Outbox/frame/data/cookie/history 的容量与失败通道。读取相关现有测试、隔离 Chrome 脚本和已存审计；`main.js` 按冻结字节及 Root 构建证据核对，不将压缩产物逐行阅读或本 reviewer 重建冒充事实。
- Reviewer 实际运行四个独立定向反例（均为目标断言失败，runner 实际 exit 126）：reset 选择、reset 同步模式、resize 诊断、reply 容量诊断。使用真实生产 Session/Presentation/adapter/xterm 或 Sessions/PtyHelper；DOM 为 happy-dom，native/Obsidian 外壳为 fake，未运行 Provider 或真实 OS IME。reply 夹具前两次装配失败与最终有效运行分别保留。
- C 的独立 Outbox 实验由 C 运行；本 reviewer 回读其精确生产 outbox/frame 副本、屏障主程序、实际 argv/log、16 帧原始 bytes、order.json、生产 PtyHelper 消费测试及结果；独立解码验证 16 帧与 order 相符，并核 outbox/frame 字节等于当前生产。没有将它说成本 reviewer 再次运行了 PTY。
- Root attempt3 的 30 文件/185 tests、Chrome 16 项与 native audit 属于已有验证，边界分别为实际 Linux helper、fake-native Chrome、cargo/Windows 交叉类型；不据此消除下面新反例。未重复整套 build/lint/压力，无真实宿主/五平台 E2E 声明。

### STD-01 — P1：同 SID 已产生的操作终态可被 numeric exit 越过并永久丢失

位置：`native/pty-server/src/outbox.rs:122–174,257–285`；消费者 `src/host/desktop/native/helper.ts:319–329`；实际产生顺序 `native/pty-server/src/session.rs:1159–1167`。

`input-state/resize-state` 进入 high 队列，而 exit 进入 SID stream；有限公平轮转保证各 lane 前进，但没有保持同 SID 操作结果与结束之间的因果顺序。生产 monitor 先 `input.close(true)` 生成未开始操作的 `none`，后发送 exit；它们仍可在线路上反序。接收端一见 exit 就 `failOperations(...,'transport-lost')` 并移除操作，迟到的真实终态无法再结算。

可证伪触发：保持合法、低于预算的 sibling high 回执积压，先准入 target `none/closed`，后准入其 raw、drained notice、exit。C 的真实 Outbox.run writer 屏障样本准入 none=10、exit=13，实发 exit=7、none=15；原始 raw=4 < notice=6 < exit=7，因此并不是破坏 raw fence 的无效样本。生产 PtyHelper 精确消费这些帧，在 exit 落定 `unknown/transport-lost`，迟到 none 不改变结果，input-begin 只有一次。已知零效果被错误降级成未知；同一调度结构也适用于已产生的 written/applied，但本次动态样本只证明 none。

标准依据：common/rules/error-handling.md 要求区分已知未发生、已确认提交和未知；risk-review 的数据/状态、并发/owner、失败恢复要求。不是要求未产生的未来结果无限阻塞 exit。

满足条件：保留已经产生且成功准入的同 SID 操作各阶段与退出间顺序，或设计能正确对账迟到终态的有限结算协议；不能只移动终态而让它越过 queued/started，不能引入 writer/close-master/exit 相互等待。以全部 wheel phase、多 SID、完整操作阶段、raw fence、预算返还及未知断线用例验证。

### STD-02 — P2：RIS 重置未传递完整显示副作用，选择与同步输出状态残留

位置：`src/modules/agent/services/terminal/session-screen.ts:646–655`；`src/modules/agent/ui/terminal/terminal-screen-xterm.ts:426–428,587–594`；source token `src/modules/agent/services/terminal/session-screen-xterm.ts:151–160`。

原始 `ESC c`（菜单 reset 也经 raw local write）造成 buffer replacement，却成为 `buffer-replaced`，target 只在 `reset/clear` reason 时清选择；同步输出 token 只随 `?2026h/l` 更新，RIS 后真实模式为 false 但 token 不变，target 跳过模式更新。

可证伪触发：同一输入分别送 stock visible xterm 与生产 headless 投影视图，选中 `SELECTME` 后输入 `ESC cNEW TEXT`。stock selection 为空；投影仍 hasSelection=true 且 getSelection() 为 `NEW TEXT`，没有 adapter error。另一个用例先 `?2026h` 后 RIS：stock synchronizedOutputMode=false，投影=true。前者让复制取得用户没有选过的新文本；后者让 reset 后的展示继续保留旧同步模式直到本地超时等后续事件。

标准依据：code-review correctness/risk-review 的状态一致性与兼容检查；dev/testing.md 要求覆盖受影响行为与负例，ui 对实际交互语义负责。这是可观察回归，不是 adapter 风格偏好。

满足条件：将 reset 作为可靠的已解析语义/effect 传递并在目标执行必要副作用；保持唯一 parser，不将 raw 再送 target。覆盖原始 RIS、Session.reset、正常/备用屏、活跃选择与 ?2026 模式，同时保留同 token 本地 timeout 不被普通帧重启的原保证。

### STD-03 — P2：运行中的 native resize 失败没有可见诊断

位置：`src/modules/agent/services/terminal/session.ts:509–528`；`src/modules/agent/ui/terminal/terminal-view.ts:93–97`；`TerminalTabView.tsx:454–477` 的错误 overlay 仅在非 running 分支。

requestViewSize 已提交模型新 grid，异步 native none/unknown 或同步 throw 只写 session.error；View 仅在 inputDiagnostic 存在时显示这个 error，TabView 又只在终止/非 running 显示。因此首次 resize 失败时，持续运行的会话没有提示，用户无法辨认模型与 PTY 尺寸未一致。

可证伪触发：真实 Session 与 TerminalView 的生产 onChange/status 路径，取得 visible+focused lease，将 20×4 改为 21×4，fake native 返回 none/capacity。模型结果为 accepted/requested，session.error 有本地化文案、running=true，但 role=status 的 text=''、hidden=true。该 probe 不加载真实 xterm renderer；其验证的是实际状态订阅与呈现条件，不是视觉截图。

标准依据：common/rules/error-handling.md 的可区分失败和持续可见结果；ui/references/motion-a11y.md 的按实际状态反馈及文字状态要求。

满足条件：为 resize none/unknown 提供与当前 runtime/操作绑定的可见状态，不依赖先发生输入错误；准确区分 requested/applied，旧失败不得覆盖较新成功，也不允许诊断伪称模型已回退或 native 已应用。覆盖运行中 throw/none/unknown、后续成功、双观察者与卸载。

### STD-04 — P2：parser reply 容量拒绝在生产消费者被吞掉

位置：`src/host/desktop/native/helper.ts:399–405` 与 `src/modules/agent/services/terminal/sessions.ts:457–465`；native 分支 `native/pty-server/src/session.rs:469–481`、`native/pty-server/src/main.rs:333–337` → `helper.ts:342–343`。

Node 的独立 reply 队列到上限抛出容量错误，但 Sessions 的 catch 将它当作传输消失无条件吞掉。另一路，native per-SID 64/helper 512/bytes 上限会返回明确错误；main 保留 SID 发 generic error，PtyHelper 却只 console.warn，未路由给该 Session。后者为静态确认，未运行真实 PTY native reply 溢出实验。

可证伪触发：生产 TerminalSessions 创建生产 Session/PtyHelper，假 stdin 的首个 reply write(false) 暂停后续写；单 raw 批次给 129 个合法 DSR（ESC[5n）。真实第129次 reply 产生一次容量异常，生产 catch 吞掉。恢复 drain 后实际仅128个 reply，session.error/inputDiagnostic 均 undefined、screen.status=ok、connection=connected、helperAlive=true。目标程序可能等待被丢掉的查询回复，界面没有解释。native 可达条件是 PTY writer 受阻、helper stdin 继续接收合法 kind5，超过其独立队列容量；wire 中的 SID 存在，但消费时未使用。

标准依据：common/rules/error-handling.md 禁止把异常吞成健康状态，日志不等于恢复；risk-review 要求追踪实际失败消费者与独立 owner。reply 本身不需要无界保留或在系统阻塞时即时成功。

满足条件：本地与远端 reply 准入失败均通过有界、可辨认、捕获原 SID/generation 的诊断到达会话与用户，并执行准确的降级/收束；不自动重发或通过普通用户输入通道躲开预算。测试 Node frame/bytes 满、native per-SID/helper/bytes 满、关闭/失联、兄弟 SID 隔离及诊断容量自身受控。

未解事项与有效范围：attempt2 的 blocked-input 34 cycles 最后报 stdinEOF masterHandlesPending=1，primary 未完整保留；attempt3 通过和本次 Outbox 反例均不能证明其原因或已修复。它继续是压力清理证据的未解限制，不在这里伪造第五个已定位缺陷。以上四项已有独立可证伪证据，足以拒绝当前代码验收；修复后应有针对性补验。真实 Obsidian/Provider/五平台与 OS IME 保留用户验收边界。

<a id="specification"></a>
## specification

Reviewer: codex:/root/review_t05

Axis: specification

Result: request-changes

Input-SHA256: 6762a4fcbfd16b026571c5d94731fd98d8d1325d3d7d9cfcad2e44268d7047ad

Observed:

- 使用与标准轴完全相同的冻结工作副本，而非只看 HEAD。回读并核验 sources 中 Spec、implementation-contracts、T05 purpose/scope/research/route/acceptance/verification/constraints、ADR/CONTEXT、reference-notes、DESIGN rev1/PAGE-001、UI-001 采用/批准边界、goal-plan execution-protocol，以及 T05 方向、Session/native/screen proposals、abandon/failure-drain/metrics/scope20/i18n 决定。proposal 的候选签名不当成另一个现行协议，生产源码拥有实际签名和值；行为保证按已采用方向与 Spec 判断。
- 审查 T05 的 AC-031/032/054 和本票 AC-061 页面部分；用 AC-030 保留原交互语义，未将 T06 状态体系、T07/08 CLI、T09/13 布局/Browser、T14 业务迁移或其他未来票未实现内容作为本票缺陷。
- 静态核对双 buffer、半 ANSI/UTF-8、snapshot/journal/resync/read、唯一尺寸 owner、设备回复唯一来源、原始 parse ACK、资源限额、native whole-input/resize/reply 与结果、旧 helper 保守兼容和两个 prompt+Enter 消费者。实际执行的反例与复用实验边界如下各项，未把测试数、hash 或原型 mock 当合同完成证明。

### SPEC-01 — P1：整笔输入的已知终态被正常退出调度降级为 unknown

位置：`native/pty-server/src/outbox.rs:122–174,257–285`；`session.rs:1163–1167`；`src/host/desktop/native/helper.ts:319–329`。

触发与已观察结果：有限 sibling high 积压下，真实 Outbox 准入 none 在 exit 之前、物理发送却反序（none 10→15，exit 13→7）；生产接收端永久返回 unknown/transport-lost，迟到 none 不能纠正。raw→notice→exit 仍有序，transport 没有断开；因此不能把此 unknown 解释为真实丢连接证据。本次动态证明仅针对 none，不声称实际 PTY 的所有时序均复现。

规范依据：`C/evidence/T-05-implementation-directions.md` §选择与不变量 5、6 要求整笔相关准入与准确结果/有界 outbox；`T-05-native-contract-proposal.md` §2–3 的 queued/started/written/none/unknown 区分及接收结算；ADR-008 区分输入完成与未知并禁止盲重发。已有确切终态在本实现内部丢失，不是合同允许的“系统停读后结果无法确认”。

满足条件：同 SID 已产生并成功准入的操作结果在消费者失去结算能力前到达，或有等价有限对账；保留各阶段顺序、raw drain fence、预算与无重发。不能要求无限等待尚未产生的 writer 终态。须用真实生产调度器而非 cfg(test) channel bypass 补回归。

### SPEC-02 — P2：reset 后投影交互状态与权威终端不一致

位置：`src/modules/agent/services/terminal/session-screen.ts:646–655`；`session-screen-xterm.ts:151–160`；`src/modules/agent/ui/terminal/terminal-screen-xterm.ts:426–428,587–594`。

触发与已观察结果：选中 SELECTME 后接收 RIS+NEW TEXT，stock xterm 清选区而投影视图复制 NEW TEXT；先启用 ?2026 再 RIS，stock mode=false 而 target mode=true。均走生产 headless/Presentation/target，无 adapter error。

规范依据：Spec §3.9（第200行）、AC-031 明确包含 reset 与屏幕一致；AC-030 明确复制语义不退化；T05 实施方向 1–3 与“交付所需压力与交互证据”要求必要 input/display 状态和去重 effect、reset/selection/2026 的真实行为。只比较格子文字不能满足该合同。

满足条件：以已解析的 reset 语义使目标选择、同步输出及相关显示副作用与 stock/权威状态一致，并验证 raw RIS 与菜单 reset 的后续输出；保持 target 不解析 raw、普通增量不整屏重放和同步模式本地 timeout 的既有规则。

### SPEC-03 — P2：resize 的 native none/unknown 没有落实到 PAGE-001 错误状态

位置：`src/modules/agent/services/terminal/session.ts:509–528`；`src/modules/agent/ui/terminal/terminal-view.ts:93–97`；`TerminalTabView.tsx` 非 running 错误分支。

触发与已观察结果：20×4→21×4 模型已 accepted，native 回 none/capacity，session.error 存在但运行中 role=status 仍隐藏；没有前置 inputDiagnostic 时用户看不到失败。fake port 只提供明确 native 结果，Session 和 View 状态消费为生产实现。

规范依据：T05 acceptance 的 AC-061 PAGE-001 错误/尺寸检查、AC-031 多视图尺寸一致；实施方向第4条要求 model requested 与 native applied/none/unknown/superseded 区分；Session/native proposal 的异步 resize 失败投影边界。DESIGN rev1 PAGE-001 的准确状态不能仅存在不可见字段里。

满足条件：运行中正确呈现本代次 resize 失败/未知和当前尺寸状态；后续成功按操作次序清理旧诊断，多观察者结果一致，尺寸 owner 不被诊断恢复偷偷转移；parse/ACK 不等待 OS resize。

### SPEC-04 — P2：有界 reply 拒绝缺少合同要求的可观察失败

位置：`src/modules/agent/services/terminal/sessions.ts:457–465`、`src/host/desktop/native/helper.ts:399–405,342–343`；native `session.rs:469–481`、`main.rs:333–337`。

触发与已观察结果：真实生产链在一个含129次合法 DSR 的批次与 false/drain 屏障下丢掉第129个回复，恢复后只发128个，Session 仍 connected、screen ok、没有诊断。native 队列满会发带 SID 的 error，但接收端仅 console.warn；这一分支由源码确认，未伪称本 reviewer 运行过 native 溢出负载。

规范依据：Spec AC-031 的设备查询回复及 AC-054 的资源受控/其他控制可完成；实施方向第5、6条的独立有限 reply 通道和准确失败；被采用的 native proposal §2 明文“满额度或关闭须可观察诊断”，§5 不承诺抢占已阻塞 OS write。当前失败不要求扩大容量，要求如实暴露容量拒绝及处置。

满足条件：Node 与 Rust 两端拒绝均到原会话的可见、准确、有界诊断；不把 reply 当普通用户输入失败后重放，不牺牲 sibling owner 或 raw ACK。加入两端各容量/关闭分支及 UI 消费回归，并保留单 OS writer 的已知限制。

未解事项与影响：原 attempt2 masterHandlesPending=1 的因果仍未知，不得由 attempt3 全绿、此次调度反例或 fixture finally 改动推断已修。它保留为 AC-054/清理压力证据的未解限制；本轴拒绝已由上述四项具体合同缺口成立。用户负责真实 Obsidian/Provider/五平台 E2E，故未运行这些不是擅加的本票代码阻塞项，也不在本报告宣称完成。T06–18 未实施项不计入本票结论。

## 原件与实际运行收据

- `/tmp/huhu-t05-review-input.json`、`/tmp/huhu-t05-review-source/`、`/tmp/huhu-t05-review-increment.diff`：冻结输入与实际增量。
- `/tmp/huhu-t05-review-sha-check.json`：首次139项来源/当前/副本核对。
- `/tmp/huhu-t05-review-final-scope.{json,stderr,receipt.json}`、`/tmp/huhu-t05-review-final-check.json`：正式只读 scope 终审，argv/exit0 与字段逐项比较。inventory/excluded 增加项全在 C/evidence；48实现与43来源无漂移。
- `/tmp/huhu-t05-review-probes/manifest.json`：全部独立 probe 源、config、log、receipt 的 SHA/长度。`reset.test.ts`/`reset.log`/`reset.receipt.json`（首个 receipt 是从实际工具调用及原 log 补记，未补造原始 UTC）；`reset-sync.{test.ts,log,receipt.json}`；`resize-diagnostic.{test.ts,log,receipt.json}`；`reply-overflow.{test.ts,log,receipt.json}`。四次有效目标断言均红/exit126；各 finally 清理真实模型/视图或假流/租约。reply-overflow-assembly 与 assembly2 原件分别为mock装配错误，不计产品失败；assembly2尝试不存在的 fake-no-process 路径，未启动子进程。
- `/tmp/huhu-t05-c-order-experiment-report.md`、`/tmp/huhu-t05-c-order-native.{json,log}`、`/tmp/huhu-t05-c-order-consumer-resolved.{json,log}`：C 运行的 native exit0 和生产 consumer 1pass/0skip；另有保留的初次装配失败。`/tmp/huhu-t05-c-order-experiment/{order.json,frames.bin,consumer.json,consume.test.ts,native/pty-server/src/main.rs}` 为实物；`/tmp/huhu-t05-review-order-readback.json` 为 reviewer 的16帧独立解码与生产源比较。
- 复用但未重跑：`C/evidence/T-05.md`、`T-05-root-attempt3-audit.json`、`T-05-root-chrome-audit.json`、`T-05-c-linux-final-root-audit.json`。正式 helper SHA 为 `ebbf169532e29e5eaeb706a1ec286b8d13285d2b1b0a2da1160c28df2dbbf0a6`，本 reviewer 未执行或替换它。未打开 GPL 终端参考源码；仅看本项目与固定 xterm MIT 依赖用于核实事件/模式语义。
