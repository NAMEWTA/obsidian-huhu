# 任务回报

Session: 20261026T045732Z
Task: 016-t08-full-review-r2
Status: completed

## 聚焦交接

已完成新的 T08 整票 R2 独立复审，标准轴与规范轴均为 **request-changes**，不是旧011的续写。原 F1–F4 已关闭；本轮发现一项新的 medium/P2 问题 F5：正常 helper 退出时，editor listener 线程未被等待完成，可能遗留 Unix socket 文件，重复启动后累积。该结论来自冻结生产 helper/native bin 的正常退出 probe，未替换 capability、未使用真实 Provider；5代 helper 全部结束后留下4个连接返回 ECONNREFUSED 的 socket。审查者保持 `codex:/root/review_t08_native`、用户指定 `gpt-6-astra/high` 的原独立身份，未参与候选实现、未修产品、未派子Agent；Root继续持有状态与修复接收权。

## 产物与验证

### 固定输入和 source discovery

- 规范化输入：`evidence/T-08-review-input-round2.md#review-input`，Markdown文件 SHA256 `a4cebeaf3278dab25a0903220b56f82c88c33847f55f0e1c854ca8171a8cdc8a`。实际读取当前 `common/tools/review-evidence.mjs`，以其 `reviewInputDigest(input) = SHA256(JSON.stringify(input))` 重算得到 **`a79ced936983d3190c3c70012a9f452d41049959bed72ecf0f67eae3c1c9a7fa`**。两轴原始字段使用此 digest，不使用文件SHA。
- 完整语义包：`evidence/T-08-review-input-r2.json`，SHA256 `363054d9a93ad63497941889b71b2c47708aca272880cdec42f7b8709d307d7f`。`review_mode: working-tree`，A34/B15/C33/Root5 共87路径，74本票变化；before是包含T01–07的T08真实初始工作副本。HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`、branch `NAMEWTA/terminal`仅为Git来源，不将HEAD→当前全部变化归给T08。
- 对完整 before/after 原件重建：源语义diff 1,033,725 B，SHA `6b337e61acf8282889f00249b5a094f9ae38bbb83037abdf6849de72b6455a32`；生成物diff 12,561,423 B，SHA `9cb93c8df334883ca5d416209666f9580f867dfabf6e6c12013bc7c6ea4fcdf4`，均精确匹配。完整路径/模式以规范化scope与语义包files为准，两份scope相同。
- 实现者仍为 `codex:/root`、`/root/implement_t01`、`/root/implement_t08_business`、`/root/implement_t08_profile`、`/root/prepare_t08_full_cli`；reviewer不在其中，未通过改名/重置扮演独立。真实原生派遣为Root的016 TASK与消息；不是实现者自查或结构工具认证。所有writer停止期间，仅写本016 REPORT和新 `/tmp/huhu-t08-full-review-r2-astra/`（下称 R）。
- 按workspace/catalog既有定位，继续执行common code-review、source-discovery、Fowler最低启发式、risk-review、working-tree-review、reviewer-contracts、review-evidence、result-reuse、error-handling/test-reliability。已读且匹配的规则复用，实际重读了结果复用和review-evidence实现语义，没有递归派遣。
- 标准来源：AGENTS；dev及architecture/testing/licensing/build-and-release；ui及design-system/shell/motion-a11y。规范来源：spec、implementation-contracts、ADR/CONTEXT、reference-notes、DESIGN revision1（批准digest `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`）、原型批准包、T08各稳定章节及修复章节、Goal execution-protocol、allocation-r2、工程和editor/launch/progress/blocking决定、完整冻结证据包。规范化对象内全部72个标准/规范/指令locator均按工具相同的原文/锚点读取方式核对SHA，见 `normalized-audit.json` 与 `final2-normalized-audit.json`，errors[]。
- 新增ADR/CONTEXT明确读回，保持终端级协作而非逐任务持久结果承诺、显式Space/跨Space身份、既有业务原答案保留及用户实机验收边界。GP028/Map29/T08 in_progress 不被本报告自行推进；验收勾选是证据入口，不代替独立判断。

### 原结果复用的实际边界

011原报告 SHA `aad8e99dbe325e7db34cce854631e7221dcaf15e701ca49b147d8d8721396119` 仍原样保留为 request-changes；009 C33报告也未覆盖。不是把旧两轴结果改为pass。当前完整产品manifest与011比较：2071→2072产品，恰10路径变化、范围外变化[]，见 `consumer-reuse.json`；87范围中其余77路径字节/模式匹配。C33、样式、依赖/锁/配置、原真实Pi扩展和身份核验、共享协议均未变化。

10路径为 helper.ts及两份helper测试，Panel及DOM测试，compose-workbench.ts及新增agent-contribution测试，CLI文档，main.js和budget说明。逐份重读完整增量与相关消费者；compose相对此前冻结字节仅加一个白名单字段，新增测试真正执行compose。服务层/Host/session/native协议等未变部分依011已实际审读的范围和原证据有界复用；因helper回收和UI操作归属变化，仍追踪其调用双方及最后发布/释放顺序。不能因C33相同而排除新风险：本轮资源观察触发重审native service级shutdown，发现F5，故009的局部无finding不再被用作当前这条关闭路径的充分证明。

R `package-audit.json`：新可达snapshot路径685份、90,535,177 B逐字节核对，errors[]；4428份与011已核对记录相同的路径/SHA复用而未递归重哈希旧整棵证据树。此数字是不同snapshot路径数，不是去重内容数，也不声称每份历史日志都重新作语义阅读。所有新的修复报告、关键red/green原断言、Root第三次11命令原log和当前组合证据实际回读。

### 原 F1–F4 处置

| 旧问题 | 当前行为与独立确认 | 结论 |
| --- | --- | --- |
| F1 helper迟到关闭不回收 | `helper.ts:406/1107` 由同一join保留ordinary fences，直至phase closed、无editorOperations、无local frames；editor-closed、operation-settled、callback+drain各边再尝试retire。旧failed-none无editorId特例仍先等ordinary fences。查Host/session持有原binding的调用，不依赖退休后重新查找，不提前返额。独立复制011 E1到新路径，真实bin确认最终bindingRetained=false、operations=0。014原真实三SID与反向output/operation/callback/drain矩阵也回读。 | 已关闭；新F5是helper进程级listener退出，不是此map回收回归。 |
| F2 上一笔确认污染新输入 | `TerminalControlPanel.tsx:147` 仅新prompt/raw text/raw keys清lastInput/result；旧progress/final受原epoch隔离。continue、被动read与原操作cancel/timeout仍保留receipt/target/N。独立011生产Panel反例现1/1绿；015新9个none/unknown/throw与迟到回调、cancel/timeout继续等断言读回。 | 已关闭。 |
| F3 shell丢关闭状态 | `compose-workbench.ts:84`仅添agentControl，`cleanPageState`及view默认/history逻辑不变。新测试正常import执行compose并通过生产sanitizer/view；独立接缝probe false→序列化false→恢复false，初次默认与history优先另有实际测试。没有把正文/运行ID/凭据列入保存白名单。 | 已关闭。 |
| F4 文档等待状态 | docs第54行改为failed/interrupted并区分观察取消；协议没有新增别名。独立执行冻结CLI `--json schema`，真实enum与文档一致。 | 已关闭。 |

### 完整范围及当前组合审查覆盖

| 风险面 | 当前审查/复用依据和观察 |
| --- | --- |
| Space/runtime/source/editor身份与启动 | 011已追踪controller→commands/router→sessions/session→program-identity→Host/helper/native，原字节/消费者匹配。最终env/argv/cwd、实际Pi/Jiti文件闭包、原Node/入口、安装扩展、helper代与fresh lease/preflight仍一致；prepare原期限/取消和效果前再校验未受修复改变。明确Space、跨Space不迁移/不跟焦点，unsupported仍人工启动。 |
| 原应用安全提交与前台 | 原regular TUI/default editor同步gate、draft/selector/未闭合paste/UTF8/streaming/外部editor/clipboard/未知状态保守路径未改。真实官方完整CLI+原Pi的Root第三次主链重新运行，adapter-applied与raw pty-written不混淆；不增加自动重放或自动批准。 |
| writer/取消/资源/活性 | 重审helper所有完成边、native operation/result/settled、local frame、普通output/root/reply fences与Host lease释放。旧queued none、dispatch unknown及迟到结果保留真实物理责任，修复F1有效；继续检查helper EOF/service线程清理时发现F5。parser reply/ACK/别SID/query/stop原活性证据仍适用。 |
| wait/read/回执 | 服务层原活动水位、首次期限、32观察额度、continue不重发、readOnly与副作用隔离、同socket Ctrl-C有界尾随、完整envelope上界与partial/unknown未变。可信completed receipt不被后续观察错误降级；Panel新操作状态正确清理，原操作续等事实仍保留。 |
| UI/shell/可访问性 | 正常生产Page/Panel/TabStrip/current Space/手选目标、重复名稳定ID、source/runtime变更失效、停止确认/定位、ownerDocument单实例/焦点回收按匹配011分析复用。白名单接缝重审。Root当前Chrome15/15、312/44、明暗、真正200%与键盘/被动read证据读回；亲自查看当前 `zoom-200-dark-top.png` 原图，原CSS未变。受控浏览器不冒称真实Obsidian。 |
| canonical/生成物/质量 | C33 TS/Rust/canonical/embedded源仍匹配，既有生成与跨平台编译证据有界复用。main当前SHA与生产build和归因匹配；预算上限未放松，仅说明更新。i18n/许可/notices/模块边界/懒加载原相同检查复用，Root当前build/types/lint/architecture/Promise/bundle另已重跑。 |

上述覆盖形成当前整票结论；既不是只勾四条修复，也不声称穷尽所有运行调度或未运行平台。

### 新 probe、原件与实际检查

全部新原件在 R，索引 `evidence-index-r2.json` SHA `6ca67c968fd7a4f150bc4f9395212e0ad4ab9c5e45fecf54c6599825a7070809`。各 `.receipt.json` 含真实argv/cwd/UTC/exit与stdout/stderr SHA；build输入清单包含实际生产依赖，原011 probe只复制到新根，不覆盖旧文件。

| 原件/执行 | 实际结果与边界 |
| --- | --- |
| `probe-origins.json`、`run-probes.py`、`probe-commands.json` | 第一批5条准备命令均exit2：隔离HOME后PATH里的node包装器找不到其project-runtime.sh，未执行产品。原stdout/stderr全部保留；不是产品red。随后仅使用已知绝对Node26.11.1入口，未改产品或放宽保护。 |
| `run-probes-r2.py`、`probe-commands-r2.json` | 绝对Node入口下两次tmp build及三项probe全部exit0；HOME/TMPDIR限定R。独立Panel生产组件边界与旧probe相同，不冒称完整后端。 |
| `r2-late-close.stdout` | 2026-10-26T11:06:07.009525Z，exit0，SHA `f5fd4110f4c30f5c325d25b0194eb2c1a64ade877306d8f154c9f6d8df12a668`：ordinary fences先到、恢复原cap inode后closed，binding不再保留，验证F1。后续资源观察发现E1运行目录仍有1个service socket，原 `cleanup.json` 未改。 |
| `r2-panel-probe.stdout` | 2026-10-26T11:06:07.590141Z，exit0，SHA `09a286e22f5f787968c0bb1f5c2abc7bb9ad10760beb0fb90a3d75277c0b7d62`，原011第二笔拒绝测试1/1通过，验证F2。 |
| `r2-layout-state.stdout` | 2026-10-26T11:06:07.560098Z，exit0，SHA `e0138f79b02ed6ad0136532225afacf8b84e6cf3335f83b00b3c65f73b049eac`，真实白名单+生产sanitizer/view恢复false。完整真实compose装配另由已回读015新测试证明，未把本regex读取白名单的probe冒称完整compose执行。 |
| `cli-schema.stdout` | 冻结huhu执行 `--json schema`，2026-10-26T11:09:01.173788Z，exit0，SHA `8e3fdcc4ba8eba4de4439d5fc5765c23b6e9c4f17fbf2840452ad1d5beb70dda`，验证F4。没有helper或Provider启动。 |
| `socket-cleanup.ts`、`build-socket-cleanup.mjs`、`socket-cleanup-inputs.json`、`socket-cleanup.mjs`、`socket-cleanup.stdout` | 新F5 probe：绝对Node执行新bundle，2026-10-26T11:11:39.567600Z，exit0，stdout SHA `bee43eedb47dbccaf4174a82c3c3b3b2a9af678743c5c8bd07d9078981ac67cf`。5轮正常子进程自然exit；每轮等待editor-closed、reply-settled并await binding.close/helper.dispose。0700短XDG根复用，未替换cap inode；累计socket数1/1/2/3/4，全部ECONNREFUSED。exit0表示采集成功，不表示cleanup通过。 |

所有native probe复用同只读Linux pair：huhu-pty SHA `f99ec633e2201d66ccd67605c65c709d6b25c443ec71978feff897fb27d315ca`、huhu SHA `923ac2d6fbc4f472537c73236040a487b8d991e4226aec81d5ebda488e995eee`；未重建bin/Cargo target。这些Node入口只用于transport/native生命周期，不声称官方Pi gate或模型交互。

`cleanup-r2.json` SHA `1b2e0dda04e563cd5282c126561173457c7537d9df30d168cf94aae0d9c7e530` 保存两组原文件type/dev/inode/mode/UID，以及11个已记录helper/root PID均gone、capabilityFiles=[]。原E1一个和正常退出组四个文件都是mode0600、UID1000的Unix socket inode，非普通日志文件。确认所有相关进程结束后，reviewer仅按记录的相同dev/inode删除自己的这5个无监听fixture socket，remainingOwnedSockets=[]；这一步是测试资源清理，**不是native自行清理或产品修复**。自己TMPDIR内唯一可归属test-home已清理，未删除015归属不明的共享tmp或任何旧原件。

### 修复与Root现有原始证据

实际回读014原002目标红（binding应undefined）、003矩阵3红（迟到operation与callback/drain）、004两文件10绿、005八文件105绿；未将001长runtime fixture错误算产品红。回读015最终DOM27、app/view/sanitizer20及源码断言；原全局types期间B两源变化的边界仍保留，Root最终共同build已补覆盖。015共享11个test-home归属不明的限制未被本审查抹去。

Root第三次11命令原件在输入的 `T-08-root-integration3-audit.json` SHA `90b58c77ea53cef2b8a9c069e154d16e74c320a0ec4afcb65223e3799416b48d`：build:css/build（两类型）/lint/architecture/Promise/bundle/Chrome退出0；初native4/5失败来自Root私有目录0775被既有gate拒绝，Root仅改自己的目录0700后同源/bin3文件5项全绿，原失败保留。docs退出1仍为另一Bot change原6锚点，与本票新文档枚举修复无关。

实际当前官方完整CLI链 `/tmp/huhu-t08-a-stage2-native-XZTOL7/official-driver/summary.json` 为 actualModelConversation/nativeFullAnswer/businessPath/passed=true、failures[]，与production Host/helper/认证editor和受控loopback SSE组合；business-summary保留准确target/adapter-applied/watermark/read。Root把新目录与外层命令关联的方法是测试实现加时间区间推断，未冒称直接runner链接。真实远端Provider仍未验。

当前main 6,667,083 B、SHA `4d334fcc1e21ebe9d3d58086cf2c9137e374b5da71e305bd8974e02ba74de63d`，比011增加90B（helper55/Panel20/compose15）；styles仍1,422,357 B，eager123,533 B/106 inputs、agent activation1,314,518 B。预算脚本真实再现T08起点旧产物并匹配当前产物，阈值全部不变；不是只对压缩diff作审查。Root Chrome `/tmp/huhu-t08-root-ui-i3` 15/15、drift[]，真实200%/边缘尺寸校准/旧裁切负例及两浏览器/server关闭原件均保留；Root删除其独占runtime目录不能作为native自清理的证据。

### 最终冻结核验

新probe结束后再次执行原 `git_scope_command`，2026-10-26T11:12:56.647Z–11:12:57.950Z，exit0。`final2-audit.json` SHA `5775ec8888dc3331216491c065c74f07b696a56c0a879bdc1a528afbd2430a46`、`final2-scope.stdout` SHA `a88d916f0b00740d5b81b7dfdd0f57bd40288fcce6d250f379600efdf1800dd8`，errors[]。

87源字节/模式、72规范化来源、固定digest及HEAD均匹配；额外逐字节核当前manifest的2072产品输入，也无漂移。按review-evidence工具语义只排除excluded_paths/inventory_sha256/input_sha256后，scope其余**全部字段**完全相同，包含working_snapshot、selection、scope_paths、changed_paths、HEAD/base、index和tracked diff。原始index SHA仍 `0dc36455cc312a56435427ec186162d50fc70f38520757b7eeab33d46187eacd`。

excluded_paths从34951到34968，17新增项都是本轮冻结输入/对象/派遣/TASK行政材料，清单保存在final2-audit，不是产品漂移。此REPORT之后是另一个授权行政输出。写后实际执行return结构校验，另存R下 `return.stdout` / `return.stderr` / `return.receipt.json` 并通过原生通道回传，不预填该结果为代码通过。

<a id="standards"></a>
## standards

Reviewer: codex:/root/review_t08_native
Axis: standards
Result: request-changes
Input-SHA256: a79ced936983d3190c3c70012a9f452d41049959bed72ecf0f67eae3c1c9a7fa
Observed: 已核对完整87路径、相对011的10路径变化与未变消费者闭包，确认旧F1–F4关闭；当前真实helper普通退出probe在5代结束后累计留下4个无监听Unix socket，追踪到native editor service线程未参与主退出join，形成F5。

### F5 — medium / P2：正常 helper 退出未等待 editor listener 线程，留下不可回收的 socket 文件

**项目位置：**`native/pty-server/src/editor.rs:154` 的 detached `thread::spawn` 和 `:225` 的 `Service::shutdown`；完整消费者是 `native/pty-server/src/session.rs:1607` 的 `end_all` 与 `native/pty-server/src/main.rs:438–451` 的最终退出。Unix socket unlink位于 `native/pty-server/src/control/unix.rs:142` 的 `Listener::drop`。

**可达前提：**Linux正常helper已创建过一个editor allocation，子进程自然结束，binding和ordinary fences均完成；随后宿主正常dispose helper/关闭stdin。无需异常kill、cap替换、真实账号或第三方篡改。

**具体行为与原因：**`Service::shutdown` 只置closing并关闭binding；listener线程的JoinHandle没有保存。`Sessions::end_all`只等待live/pending session表，可以在editor entries已空时立即返回；main仅等待outbox writer后 `process::exit(0)`。listener线程仍可能在其循环/sleep中，来不及执行拥有socket inode的Drop，因此进程已完全退出但socket pathname仍在。后续helper用新的nonce建立新endpoint，runtime_root也不清理旧endpoint，残留随helper代次增长。

**可观察影响：**私有runtime目录积累无服务的socket inode，正常关闭不满足其IPC资源收束。5代普通退出的实际累计数为1、1、2、3、4；当前目录默认为合规XDG下的huhu-ctl-UID，fallback可为/tmp/huhu-ctl-UID。该finding不声称进程仍活着、socket仍能提供服务、cap/token泄漏或旧正文被重放；实际所有连接ECONNREFUSED、cap文件已消失。

**标准依据：**项目dev资源归属/有界生命周期，risk-review关于关闭与恢复的真实消费者追踪，error-handling/test-reliability关于不能把进程退出或外部fixture删除冒称所有资源已清理。Fowler仅辅助判断，不以代码风格作为理由。

**满足条件：**正常helper退出在有限预算内观察到editor service/listener实际结束，并完成仅自己持有inode的安全删除；不能采用sleep猜测、广泛删除runtime目录或放宽权限。覆盖session早已结束再EOF、活动editor中EOF、连续多代同runtime根，确认无旧endpoint累积；异常或超时收束仍应准确保留未知/残留边界。不同binding的operation/frame/native/root清理责任不能为此提前释放。原F1修复无需回退；最小修复应由Root分配真实native owner实施。

<a id="specification"></a>
## specification

Reviewer: codex:/root/review_t08_native
Axis: specification
Result: request-changes
Input-SHA256: a79ced936983d3190c3c70012a9f452d41049959bed72ecf0f67eae3c1c9a7fa
Observed: 对照spec/implementation-contracts/T08/DESIGN与工程决定核对完整组合；旧F1的有界binding回收、F2的本次输入事实、F3布局偏好、F4canonical文档均满足原条件，但正常退出遗留service socket的实测F5使生命周期与本机IPC收束合同仍不完整。

### F5 — medium / P2：本机 editor IPC 的正常关闭存在未被纳入收束的残留

**位置与前提：**同standards中的准确native位置；普通Linux editor allocation的所有binding/会话栅栏均完成后，正常helper EOF/dispose即可触发，不依赖cap替换。该代码属于T08新增editor service，虽然与009/011字节相同，本轮新真实反例使这条关闭路径必须重新判断，不是后继票范围。

**规范依据：**spec NFR-001的有限资源/缓存要求、NFR-002的关闭有限结束且残留/未知可核对、spec §3.9 的停止接纳后实际清理与迟到责任；T08 editor-transaction 对原IPC/物理责任收束的约束。正常结束的socket inode没有跟随service完成安全回收，也没有在当前成功退出观察中披露；同一runtime根连续helper代次可累积，因此当前完整关闭合同仍未满足。

**实际影响与满足条件：**E1资源观察留1个socket，独立无cap替换的E5五轮留4个；原始类型/dev/inode/UID/退出PID/ECONNREFUSED在probe和cleanup-r2可回读。需要将service退出/安全unlink纳入有限结束观察，正常多代运行不累积无服务endpoint；不能用Root删除自己的临时目录补充成产品通过。保留已有queued none/dispatch unknown、原binding/operation/frame/output栅栏和用户验收边界；不新增逐任务保证、改变Space寻址或扩为真实Provider平台。

本轴仅此1个当前finding。原F1–F4关闭条件及PAGE001/003、AC013–018/021/030/061范围的其他判断见前述逐项观察；这些未变部分的代码与有效证据有界复用，没有用standards结论替代本轴对合同的判断。

## 问题与下一步

当前需由Root协调F5的native service关闭修复、冻结新输入并独立复核受影响轴/跨owner生命周期。原F1–F4无需继续视为开放问题；009/011原报告、两组新socket原始观察和准备失败原件均保持不变。此reviewer没有修改产品、正式Evidence或状态；return结构校验成功也不改变request-changes。

真实Obsidian、真实远端Provider/账号、OS IME与五平台实机仍由用户验收，当前未运行；Windows已有证据仅编译。旧有效的native131/TS122/generated/CSS/i18n/notices等未全量重跑，不冒称全部本轮执行。没有提交、推送、发布、归档或完整Goal完成结论。
