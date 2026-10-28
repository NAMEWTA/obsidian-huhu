# T-04 停止、归档与恢复：只读工程预检

日期：2026-10-25。执行者：`/root/implement_t01`，模型沿用指定 6.1-sol / xhigh。仓库 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，父任务给定 branch `NAMEWTA/terminal`、HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`。本轮仅工程预检，**未解锁 T-04 实施**；T-02 B 已冻结且没有恢复写入。

本轮没有修改任何仓库/正式状态/生成物/Git，没有启动 helper、Provider、PTY、用户进程，没有运行构建或测试。下述是当前工作副本的静态观察和未来接口建议，不是故障复现或验收通过。T-02 A 仍可能改其独占源，T-03 尚未固定产物；不能把本报告当作未来 T-03 的冻结基线。

原文读取快照保存于 `/tmp/huhu-t04-source-observation/`；逐文件 SHA256、字节及 UTC 读取时间在 `/tmp/huhu-t04-source-observation.json`。附录列完整摘要。本报告的行号对应该次快照，不保证后续工作副本行号不变。

## 结论与分界

T-03 应先建立并保留 **持久 Session → 独立 runtimeId → 捕获的 native lease/sid** 的三层关联，且不随 Pane 关闭销毁。T-04 在这一唯一运行 owner 上实现 expected-runtime 停止、有限终态等待、归档与重启显示；不要另建第二份 manager/业务队列。T-03 已拥有 detach/重新 attach 同一运行的交付，T-04 应复用并回归，不能重新把关闭 Pane 接成 stop。

目前低层已具备 T-01 的宿主代次/owner 隔离、迟到 spawn 回收和租约退出等待；缺口主要在业务终态、归档写入和生产 UI/控制器接线。单凭 `end()` 返回、从列表删除或 `NativeLease.release()` resolve，都不能向业务声称指定进程已退出。归档持久写入需要接入 T-02 的同一 SpaceService 队列，当前 T-04 写集尚未覆盖该 owner。

## 已消费合同与参考

读取 T-04、直接依赖 T-03、Spec §3.3/3.8/3.9 和 AC-027/028/029/056/058/060、implementation-contracts 的 owner/运行/回执/恢复边界；复用当前 dev 的 architecture/licensing/testing/Obsidian API 规则。此轮没有 UI 实施或新设计决定。

复用 `reference-notes.md` 的 R-01、R-05、K-05：Herdr 固定 `2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01`，Apache-2.0，窗口内实际维护活动已有原证据；portable-pty 固定研究提交 `e2a98e1b8af156988ad0ac778658ac27b60a55fb`、pty 0.9.0/MIT，窗口内维护 commit 已固定。采用运行注册与视图分离、现有 PTY/Job/退出事件机制；不复制第三方实现、不引入依赖/daemon。K-05 是旧版 0.8.1 Windows 清屏报告，不是当前树回收缺陷或已修复证明。实际 Windows 进程树语义仍由本项目 Job 源与实机测试核对。本轮没有新增陌生机制或重新访问外部资料。

## 当前源观察：已经存在什么

| 源位置 | 当前事实 | T-04 意义 |
|---|---|---|
| `services/terminal/sessions.ts:177–265` | 原生启动前登记 TerminalSession/bySid，保留捕获的 helper/lease/sid；hooks/env 与 `beforeSpawn` 后再次检查取消/关闭；spawn 迟到且调用者取消/关闭时发送该捕获 helper 的 end | 应保留最后 spawn gate 及旧代清理闭包，不能用当前新 helper 重发 |
| `sessions.ts:267–286` | `end(id, force)` 返回 void；`remove` 对 running 先 end，再人为 `session.exit(-1,null)`，然后删映射/订阅/模型 | remove 不是确认退出的依据；UI detach 和运行 stop/forget 必须分离 |
| `sessions.ts:306–322` | 关闭同步 disposed/lifetime.abort，但立即 dispose/清空所有 session/bySid/消费者，之后才 await 各 lease.release | 新动作拒绝已有，业务层仍缺保留输出/exit处理至终态或预算耗尽的阶段 |
| `services/terminal/session.ts:8,259,303–364` | connection 有 starting/connected/disconnected/exited/failed，无 stop-requested；end 不关闭输入、无结果等待；disconnect 标 disconnected 但 activity=exited；exit(null,null) 被折成0 | 必须分别表示停止请求、失联与确认退出；未知状态不能显示成功退出码0 |
| `session.ts:329–340` | Hook 回调按捕获的 TerminalSession 对象更新，running=false时忽略；并无持久 Session/runtimeId fencing 类型 | 当前每次随机 terminal ID/对象有隔离价值；T-03 不可将其直接替换成可重用的持久 Session ID |
| `host/desktop/native/host.ts:47–52,107–161` | 每个 surviving helper generation 的 sid 单调分配；各 owner 操作严格校验 owner/capability/sid；连接 alive 在 owner released/failed 后为false | 不放宽严格 owner 校验；sid 是原生传输路由，不是持久 Session/runtime ID |
| `host.ts:139–155,167–183` | spawn 发出前登记 owner.running；release 立即拒新操作、force end 本 owner，最长5s等该 owner exit；迟到 spawn 再向捕获 transport end；最后 owner 才关闭 helper | 可继续作为低层 cleanup；Browser Cookie 等其他 owner 不能被 explicit terminal stop/Agent disable 一起关掉 |
| `host.ts:91–100` | host失败通知各 owner，并让内部 cleanup 等待结算；generation不复活 | 内部 running.exited resolve 用于收束，不能把这种 resolve 当作业务上的进程退出证明；业务必须观察 closed/lost |
| `host/desktop/native/helper.ts:187–222` | 关闭拒 spawns/requests，dispose 关stdin并等实际 child exit，4s后kill，再1s失败 | 已有 helper 真实退出边界；不以 child.kill 返回值当退出证明，不为一条 stop 杀共享helper |
| `services/workspace-service.ts:308–338,431–458` | closeTab/closePane 会调用 sessions.remove；end(tab)确认后逐 ID end但不等退出 | T-03负责detach；T-04负责真正 explicit stop 的状态/结果，不能保留假exit删除作为停成功 |
| `workspace-service.ts:466–535` | restore/restart 是显式方法并通过已提交Session的 beforeSpawn；reopen只是恢复layout引用 | 应保持仅明确继续/重启才产生新runtime；重新打开显示不应spawn |
| `services/spaces/space-service.ts:102–140,212–255` | 唯一业务 mutation队列、permit、严格flush/drain、owner释放；prepareSession先提交稳定记录再给 beforeSpawn；尚无archive操作 | 归档不能绕过此队列直接写记录，也不能在等待所有进程退出期间独占整个磁盘队列 |
| `services/spaces/records.ts:7–18,39–63` | SessionRecord有稳定ID/spaceId/launch/native引用，但无archived/lastOutcome；字段白名单严格拒额外字段；SpaceRecord已有archived | Session归档/残留记录需有意维护schema及codec/测试，不能偷偷往记录塞字段 |
| `services/workspace-store.ts:101–123` | load/adopt只normalize；dispose严格flush并最终spaces.dispose | 不通过恢复函数启动；保留先结算布局写再释放writer的顺序 |
| `services/controller.ts:901–923` | 立即启动sessions.dispose并及时接catch；随后逐服务清理、保存workspace、取消prompts/runtime，最后聚合失败 | 清理错误聚合已有，但终端消费者被清空早于真实exit；T-04要协调保留终态/残留与有限等待，不能释放writer来伪造排空 |
| `module.ts:152–166` | abort本轮模块modal/准备生命周期、关闭服务入口，最后await controller.dispose | 应保留同步关接纳；不靠界面消失宣称受管进程已结束 |
| `services/agent-runtime.ts:493–502,554–561` | 旧自动化stop先结束业务completion、force prompt/end/remove并立即resolve；dispose还保留旧native结果/registry逻辑 | 这是旧业务取消合同，不是物理退出回执；不得把它作为archive退出证明或顺手重写T-14旧消费者语义 |

Rust 当前 `session.rs` 明确 GRACE=2s、DRAIN=3s：`end(false)`先hangup再延迟force，`end(true)`调用ChildKiller；child.wait后最多等输出drain再发exit。Unix hang_up 向进程组SIGHUP，force路径只见child killer；不能据此声称所有孙进程均已核实退出。`job.rs` Windows建 KILL_ON_JOB_CLOSE 并把helper放入Job，但SetInformation/Assign返回值未检查；当前源码本身不构成五平台回收保证。`main.rs:160–171` stdin断开后end_all、等待writer最多5s，随后exit；应复用并增强真实树回收/错误证明，不新造控制协议或PID猜测方案。

## 静态推导的两处顺序风险（未复现，不作为已确认故障）

1. **early exit 后 spawn completion 覆盖终态。** Rust `Sessions.spawn` 在返回PID前启动output/exit线程；main随后才发spawned。TS已在await前登记bySid，exit可以先落到Session；随后create无终态检查地attach，把connection重新置connected。T-03的adopt/attach必须检查捕获runtime仍是当前代且尚未进入terminal outcome，允许early-exit作为合法结果。单靠“await spawn 后设置running”不足。
2. **未知wait结果被映为成功0。** Rust `child.wait()` Err也发exit，code/signal均null；TS exit当前把null/null折成0。T-04应将这种证据表示为无法确认/失联，禁止用来完成归档或宣称成功。可先在TS解释现有null/null语义，未必需要协议扩展；若确需新增错误字段，由Root明确批准host/shared与Rust同源契约写集再实施。

## T-03 现在应保留的最小接口与不变量（建议，尚非冻结API）

建议仍由现有 TerminalSessions/其同目录 managed-runtime 接缝单点拥有，不增加平行运行平台：

- **稳定引用**：每次运行在任何await前生成独立runtimeId，与已提交 persistentSessionId/spaceId绑定。返回不可变 `{persistentSessionId, runtimeId}`；内部保留捕获的TerminalSession/native connection/lease/sid。PID只诊断。旧TerminalSession.id可继续作本次运行标识，不能随持久Session重用。
- **显式解析与代次核验**：可查指定runtime快照及当前Session的runtime。input/stop/attach/Hook/exit/adopt以expected runtime比较；不匹配明确stale，无原生操作，不能重新取“当前运行”继续。用户操作不向过期runtime发送；内部迟到清理只用该次捕获引用，不走当前代resolver。
- **停止接纳与终态分开**：可同步关闭某runtime的新输入/启动adoption、记录stop-requested并请求end；另有可订阅/有界等待的终态结果。具体函数名不强求，可为 requestStop + waitForOutcome 或一个stopAndWait，但回执/phase必须分开，重复stop复用同一代结果。
- **终态结果带证据**：`exited`仅来自准确代次的有效exit/status，保留code/signal；`lost`来自host closed/无法证明结束；`failed-before-spawn`要能区分明确无进程与已发spawn效果未知。timeout/cancel结束等待，不能把stop-requested改成exited、重发输入或自动起新代。stop已发后取消等待不是撤销kill。
- **pending creation可追踪**：记录准备中/已发spawn/已采纳，保存每次create的取消与结算promise。dispose同步禁止新admission，取消未发spawn，已发spawn保留旧代清理直到exit或预算；晚PID不得出现在新代上。不能从pending map删除后失去回收句柄。
- **运行与显示引用分离**：关闭Pane只detach；map/模型/输出ack/退出仍存在。重新attach同runtime零spawn、无焦点抢占；explicit stop/归档才收束。保持T-02最后beforeSpawn验证，长对话框之后不按UI焦点换Space。
- **跨代事件与持久写入**：Hook闭包、exit/output、标题/native引用更新、异步磁盘提交回调都带捕获runtime token。旧事件可以更新其旧诊断记录，但不可覆盖当前runtime状态/标题/屏幕，也不能删除当前映射。
- **关闭接缝**：一处 beginClosing/同等原子门禁 + 可等待的收束结果；T-04能够看到各runtime已退出/失联/超时，不能只得到void并清掉所有记录。外部Browser/native owner独立。

这些是为T-04留接缝，不要求T-03提前交付归档、停止UI或新的持久runtime表。三份T-02 DirectoryPort/WriterOwnerPort纯接口无需修改。

## T-04 停止、归档与恢复的最小落地路线

### 停止和关闭

`stop-requested`是已关新输入并发出终止请求；仍处理输出、flow ack和exit，保留可查询记录。`exited`是收到同代有效退出证据；`lost`是连接/证据失去，不能假称进程不存在。失联后重建helper只供新明确动作，不重放旧spawn/input/end，不将旧sid发给新generation。

正常stop竞争自然退出应幂等；未确认终止时返回逐runtime的失败/残留/unknown。bounded budget到期只结束等待并保留诊断/清理责任，不删除记录掩盖残留。不要让任意调用者的wait取消释放共享native lease。

模块关闭同步禁止新create/input/attach启动，取消modal/准备/wait；已发spawn按旧代回收。保留必要事件消费者到确认或有限cleanup预算耗尽，再释放显示/模型。NativeHost现有release与helper dispose预算可复用；总关闭不能只盲加多个timeout并声称更快。异步准备和严格磁盘排空需分别处理：**不能因为UI关闭期限到了就释放仍有底层I/O的Space writer**；已发I/O结算与错误保全仍沿T-02唯一队列。失败聚合保留每个对象的结果，不通过catch/清空使关闭看起来成功。

### 归档

用户取消确认之前：零stop、零归档写入。确认后对稳定Space/Session及本次runtime集合重验；dialog期间目标代次变化要拒绝或重新确认，不能静默杀后来启动的新runtime。随后关该范围新启动接纳，处理已接纳pending spawn，停止并逐对象核实。不要在等待进程退出时持有磁盘mutation permit导致其它记录/退出诊断无法提交。

只在所有所属运行均确认无活动（包含明确未发spawn、已确认exit）后，经SpaceService同一mutation队列提交归档。lost/timeout/unknown/kill失败不能当作完成；保存逐对象结果，保留未归档状态/可恢复诊断。部分运行已停止后用户再终止等待，不可能还原进程；准确报告部分效果，不把“确认前取消无影响”扩张成进程事务回滚。历史/native引用/消息不删除，不能据关闭Pane或删除sessions map判断归档资格。

SessionRecord需支持Session归档；Space归档更新其已有archived字段即可，但范围内Session/新启动门禁必须由同一个业务owner协调。具体lastOutcome/archived字段兼容codec方案在T-03冻结后由原owner有意实施，不在预检偷偷定schema。

### 重启

加载恢复Space/Session/各Space布局及共享网页记录，只读阶段不acquire PTY、不spawn/提示词/扫描历史。旧runtime恢复为已结束或失联的来源事实，不能恢复成alive；没有退出证据时用lost/未知，不推造exit code。现有normalize把tab state设idle，仅是展示默认，不应冒充运行证据。明确“继续/重启”再提交/核对身份和目录授权并生成新runtimeId；仅重新打开Pane优先附加现有runtime，不重复运行。

Agent停用保留Browser owner，Cookie在途按T-01继续；关闭整个宿主才结束宿主管理进程。已有网页恢复链路需要回归，完整后续共享网页owner迁移仍归T-13，不能在T-04偷偷造第二个Browser存储。

## T-04 写集缺口

以下是对现有Ticket的建议，不授予写入；实际路径须Root在T-03冻结后再核准。

**已确认的生产owner缺口：**

- `src/modules/agent/services/spaces/space-service.ts`、`space-service.test.ts`：归档需复用唯一mutation/permit/drain及稳定记录解析，当前T-04写集没有services/spaces。
- `src/modules/agent/services/spaces/records.ts`、`records.test.ts`：SessionRecord缺archived与残留/终态诊断字段，严格白名单codec必须与有意schema变更一起维护。不能只在UI加标记。
- `src/modules/agent/services/controller-stop-recovery.test.ts`（拟新增精确文件）：T-04仅授权controller.ts，没有真实Controller关闭/归档接线测试路径；必须验证生产入口到同一runtime/Space owner的顺序，不能只有内部class测试。

**T-03固定后再按真实实现确认：**

- `src/modules/agent/core/workspace/model.ts`、`ops.ts`、`ops.test.ts`：如runtime引用/恢复终态在这里投影，需同步normalizer，当前T-04无core/workspace；若T-03已提供充分投影则只复用、不为形式扩源。
- `src/modules/agent/services/workspace-store.ts`、`workspace-store.test.ts`：恢复/归档布局接缝如果需要改，归属在这里；至少真实恢复无spawn/严格flush测试的精确路径需补。不能另存并行layout文件。
- `src/modules/agent/ui/terminal/TerminalTabView.tsx` 与 `TerminalTabView.dom.test.tsx`：若失联/stop-requested/恢复动作落在终端视图，T-04目前只列confirm.tsx与sidebar，实际视图不在写集。`ui/terminal/confirm.dom.test.tsx`如新增也需精确补齐。Sidebar已有通配写集可承担菜单/逐对象归档反馈。
- 旧 `services/agent-runtime.ts`/`agent-runtime.test.ts`、`prompt-runner.ts`/`prompt-runner.test.ts` 仅在新停止/关闭接缝需要适配其取消等待时补最小接线，不承接T-14 Space配置/旧消费者全迁移，也不降级其原生完整结果合同。
- 默认可保持T-01 host/shared源不变：现有exit/closed事件足以在TerminalSessions建立业务结果等待。如果确需扩展原生退出失败payload/宿主预算，则先追加 `src/shared/native/host.ts`、`src/host/desktop/native/{host,helper}.ts`及对应tests；不能把旧Agent helper缓存副本当真实owner。当前T-04不能自行改这些路径。

当前已含的terminal/**、workspace-service*.ts、module*.ts、controller.ts、sidebar/**、i18n、native session/job/main/tests、用户说明足以承担相应原范围。生成物仍Root独占。core/space/model.ts的Space已有archived，不因归档功能自动要求扩它；纯端口也无需重冻。

## 可复用的真实helper夹具与未来验证

本轮只读，不运行以下测试。`/tmp/huhu-t04-helper-artifacts.json`记录当前artifact：release二进制缺；debug存在，21,681,960 bytes，SHA256 `5f01f05d62625f4199eb3a61866bbbc94697536446dfe7972f4d74cb63aafe91`。这只证明文件存在/摘要，未证明它与未来Rust源码一致或可执行成功；真正验收须Root/owner按当前源构建后再用。

| 现成接缝 | 适用内容 | 必须说明的限制 |
|---|---|---|
| `services/terminal/sessions.e2e.test.ts` | 真PtyHelper/NativeHost，输出/输入/resize/exit、缺程序 | 当前缺binary或Windows时skip；/bin/sh分支不能当Windows证明；until与exit轮询应在扩展测试中补有界/清理finally |
| `host/desktop/native/host.integration.test.ts` | 真实PTY释放期间SQLite Cookie等待继续、最后release回收helper，记录PID消失 | 可作为Browser owner共存夹具；使用node:sqlite/临时锁，需实际运行环境；不是Provider验收 |
| `services/terminal/sessions-cancellation.test.ts` | 子进程隔离的dispose→abort/abort→dispose/crash→abort与迟到spawn回收，捕获uncaught并证明Browser继续 | transport是受控替身，强于纯mock但不是实际PTY kill；保留原红绿风险，不冒充真实helper进程证明 |
| `host/desktop/native/host.test.ts` | 原生owner代次、SID唯一、late spawn、release等exit、崩溃与新owner | 受控传输适合精确调度竞争，需与真实helper夹具组合 |
| `native/pty-server/src/session.rs`单测 | output→exit、hangup→exit、流控、缺程序 | 多数shell测试cfg(unix)；现有单会话exit不证明孙进程回收 |
| `native/pty-server/tests/stdio.rs` | helper framed stdio、stdin关闭、进程wait、继承FD清理 | 主shell流程cfg(unix)，Windows只有部分协议负例；当前stdin-close测试等helper退出，没有完整孙进程存活断言 |

最小新增验证序列（未来）：

1. 受控exit先于spawn completion、旧Hook/exit/commit回调晚于新runtime：新代状态/标题/模型不变，旧代清理不发给新helper。
2. stop与自然exit并发、重复stop、expected runtime过期：一代内幂等，旧目标无新代副作用；end回执之前/之后均不能伪造exited，null/null保持未知。
3. dispose与prepare/hooks/env/beforeSpawn/spawn/wait竞争：同步拒新动作、等待有限、晚进程按旧引用回收，Browser Cookie继续；捕获uncaught/unhandled并要求为空。
4. 真helper启动测试自有脚本，读取自己报告的parent/child PID和ready标记再stop；只核实本次进程，等待实际exit/自有process句柄，不扫描/kill其它Agent或用户进程。Unix含忽略HUP/TERM的后代；Windows用平台fixture验证Job/ConPTY，不借Unix通过冒充。
5. 归档确认取消零效果；确认后部分stop失败、lost、持久commit失败：不宣称归档完成，逐对象结果可见、旧记录/history/grants仍在；全成功后才提交archived。
6. 构造持久记录/布局重载，覆盖所有后台/hidden Space：加载与reopen零spawn/零prompt，明确继续产生新runtime；Browser恢复与Agent未激活共存。Controller级生产接线应使用B真实Directory/WriterOwner fixture至少一条，不能只有存储mock。

预算到期不得为清理测试而随意kill测试外PID。fixture清理必须等自己创建的child/helper exit后才删临时根；skip要记录原因，不能把exit0跳过写通过。真实Obsidian/Provider/五平台仍按Spec §11由用户验收。

## 安全的A/B拆分建议

同票可以安全按语言/owner拆分，但须先冻结T-03实际runtime/terminal outcome接缝，保持唯一写者：

- **A：全部TS业务owner与UI。** 独占terminal/**、SpaceService/records、WorkspaceService/Controller/module、恢复projection及UI/i18n，负责expected-runtime/public use case、archive队列和生产接线/DOM。不能让第二人同时改session.ts/sessions.ts或SpaceService。
- **B：Rust进程收束与其就近真实进程测试。** 独占native/pty-server/src/{session,job,main}.rs和本票分配的tests，核实grace/force、child.wait失败、孙进程/Job及stdin-close退出。B不做业务archive，不改A状态模型/队列，不新增控制gateway。
- 若B需要TS真实helper fixture，Root先精确指定独立新fixture/test文件名并排除A写入；它只消费冻结接口，最终由A/Root串行做生产汇合。原host/shared源默认冻结，确有协议缺口由指定单点writer改并重冻，不各手抄一份exit schema。

并行门：协议无需扩展时B可先做Rust现状/树回收测试，A在冻结接口上实现；协议确需改变则先单点冻结新payload/解释，再并行。Root串行构建、Rust+TS汇合、独立review与最终冻结。T-04未获实施派单前双方均不得写源。

## 未运行与停止回执

本轮只读源与已有参考；没有复现上述竞态，没有启动任何测试进程/用户程序、没有执行build/lint/test、没有产生产品通过证据。真实Windows Job/ConPTY、macOS、Obsidian退出/重开、Provider退出树均未运行。T-02 B源码持续停写，T-04只读预检结束，后续实施等待Root明确派单。

## 读取源摘要

| 路径 | SHA256 |
|---|---|
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/04-stop-and-recovery.md` | `360ef61854e36e5b27fc2d463aafdeedd571cdd96f72961270e54b6778e4a16e` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/03-managed-runtimes.md` | `dbdf0c05167acb300d004dd09df771184a46c2b735eda9b89fb32a8ee90e1ca1` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md` | `d204c7a0b3178a60ddeb291a8153f79cb8e3864427c5317b7660832182d12618` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md` | `f13ca8cf0ef1185065e7c6d4e537a787f50ac813678aec428e498c0a8f03e397` |
| `src/modules/agent/services/terminal/sessions.ts` | `94069dfd409b84eb96314d0fa827e9fcf01e3a6a0e9ea2c913c4cc0f1f61d323` |
| `src/modules/agent/services/terminal/session.ts` | `483203afdcb172c92e934bd2db6c95ef180fdc703f1e53eea4a9f9da2277072b` |
| `src/host/desktop/native/host.ts` | `0255c0fb39186e2d6ca5e9cec6e3e0a74f8ad0bf7183462f6b5cedcaecc0b068` |
| `src/host/desktop/native/helper.ts` | `1ee73cae6ec255f5cf91678b61b55f3de0b10d41e7fedc1eb0f482a08b17e8b1` |
| `src/shared/native/host.ts` | `c764fc8f62a70450febd87c7f15df896266ea46fbea46559ac839fb32b757569` |
| `src/modules/agent/services/workspace-service.ts` | `3a62ab673d88bc04e5ff7c5019aeae1cb2d0d256fbc4211e3e926a906f2e163f` |
| `src/modules/agent/services/controller.ts` | `4aaeae21fe5c032d4df4944fd7c6e3502d09a01fda0be453374a83d7c9c48336` |
| `src/modules/agent/services/spaces/space-service.ts` | `8712c1981016dff663fb688cf69de038d053b11e1dbd6427f3cf064abdde2de7` |
| `src/modules/agent/core/space/model.ts` | `867ef47ae8e7a9f6ea079dd6263e850af55bd3b43d94421cb6e12c5e8458132e` |
| `src/modules/agent/core/space/ports.ts` | `5bb0fb11e6dd8928f3adee6905824f2c1588ecf277d686dd07209b6c4fd4c5b1` |
| `src/modules/agent/services/terminal/sessions.e2e.test.ts` | `b65aed981f4756a913579043c9992d92585cd9b748e48b2bbc86969c06957c9f` |
| `src/modules/agent/services/terminal/sessions-cancellation.test.ts` | `59106c02234f0f3325711e863ee84b4fd4e658b1f62335ab2f9705360391e6d2` |
| `src/host/desktop/native/host.integration.test.ts` | `d47756c71903e37437832a9afa51b2769bb797e064a09060c9347ab5a170e9b5` |
| `src/modules/agent/services/workspace-service-spaces.test.ts` | `3a0ba25a7a34f909150ce6c5f9d6622b919957cdabe0e3cd2458c8b55024e430` |
| `src/modules/agent/services/workspace-store.ts` | `cd0eba9b220e237ea69f464eb80eefee729ce7e2440f41947674516dd59bc11a` |
| `src/modules/agent/module.ts` | `e5a1b8717022742d6796d8063cdaeb96bb8582f4b5bfb6aca16d89b5d77aeb00` |
| `src/modules/agent/services/spaces/records.ts` | `1f6ac211a8ba2933532acb1fe70e124297e2f975952bc6c12f75a46fd1c795b3` |
| `src/modules/agent/services/agent-runtime.ts` | `499dba720ad4b5a357bb79b0605044199a9bc110cc5173ab3f12ce4c60d8b2fc` |
| `src/modules/agent/services/prompt-runner.ts` | `588082628e0d24c33015217b9c1d056c0474b13212972e52ca2e17781bfd30dd` |
| `src/modules/agent/ui/sidebar/AgentSidebar.tsx` | `29e6842a70efca313e8e5ca5f19682f464c20b062bb88e43700d964ee33b5a3a` |
| `src/modules/agent/ui/terminal/TerminalTabView.tsx` | `5a6e005dd77ff978f0daf1ba49742d10ab0ace4e4e31a85b18d2ffa4434ed53f` |
| `src/modules/agent/core/workspace/model.ts` | `a01440053e123ef09a85beb767732e5f3822b0084e25d0b1dfbd7a087757618a` |
| `src/modules/agent/core/workspace/ops.ts` | `d7e191afac0e92a9374cf7fabc1e841a7995f4277071430749f028f34f3ac037` |
| `native/pty-server/src/session.rs` | `e66231fc943fc37e2db244bec8fd67111a7a97cb986cf43fc06f532c0db8c928` |
| `native/pty-server/src/job.rs` | `49c9fecfc1c9d5a931f3aebd4786f2791186b04ad614b3595e05959e4accd540` |
| `native/pty-server/src/main.rs` | `cc4080ae15d34684f9216710f916b21bd8f5e9530c668b149837640a428cb1fe` |
| `native/pty-server/tests/stdio.rs` | `821862321ebd753a2216d743ee0ba91e97ad2626e36e99a7e1e7677d83859049` |
| `src/host/desktop/native/host.test.ts` | `2368913c32487d291e3d263eff79c51fa84ba02382212b9800380a321b940907` |
| `src/host/desktop/native/runtime.test.ts` | `5b5b11a5fa92461ed6dd40f058227c168c33cf60274a644eed4c6462deeab9e8` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md` | `f54b94009192820a3f8a82ab24a62b6c36502443b77e30fbb2326aee2bd45fa8` |
| `.agents/skills/dev/references/architecture.md` | `c8d02dad082e075be91fbbc33d669169756a617c7b598d56c4cd9e5954a26bf2` |

读取快照manifest SHA256：`84ff7808443ed3ce55da94e0a776ed731be647cb8bf7d4da43de4a30802727ce`。
交接前只读漂移核对 UTC 2026-10-25T06:36:03.567848+00:00：上述35份源与读取快照一致。
