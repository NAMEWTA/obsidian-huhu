# 任务回报

Session: 20261026T045732Z
Task: 019-t08-full-review-r3
Status: completed

## 聚焦交接

已完成 T08 R3 完整87路径的独立标准轴、规范轴审查，两轴均为 **request-changes**。F1–F4保持关闭，017修复使F5普通EOF残留反例独立转绿；本轮新增一项 medium/P2 的 F6：native明确报告关闭失败并退出1，但生产helper吞掉退出结果，最后Host租约release与host.dispose均正常兑现。结论来自真实新pair和生产公开消费链，不把假设修复后的风险列成现有缺陷。审查者保持 `codex:/root/review_t08_native`、用户指定 `gpt-6-astra/high` 的原独立身份，未参与实现、未修产品、未派子Agent；Root继续拥有状态、修复与验收权。

## 产物与验证

### 输入身份与 source discovery

本报告仅写019原件及新 `/tmp/huhu-t08-full-review-r3-astra/`（以下R），未覆盖009/011/016及任何旧probe。019 TASK完整回读，SHA `019a48d503bb3ff6f218fd3fa7faa53f89fbeb361f3040fca7379924441a0754`。当前GP029/Map30、T08 in_progress、恢复周期1第一次整合；旧attempts3/blocked历史仍保留，报告不推进状态。

- 规范化输入 `evidence/T-08-review-input-round3.md#review-input`：Markdown SHA `13f7ca5999fc6e8c8d80f36afcb1d894ec9ff439fe41ff34931123f204d7b2db`；用实际review-evidence实现重算唯一JSON对象digest为 **`630404fbe847c70e44e8ddd58585adb8454e285485538394908ef3025bb5f6d2`**。两轴均使用该digest。
- 完整语义包 `evidence/T-08-review-input-r3.json` SHA `3cf998b47e027ee153d6a5b9440a907ce705c7a6f98a5de3b3476cc09665b40d`，working-tree、A34/B15/C33/Root5共87路径，74本票变化。before是已含T01–07的T08初始工作副本，不把HEAD→当前全部差异归T08。HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`、branch `NAMEWTA/terminal`仅作Git观察锚。
- 沿workspace/catalog已定位的common code-review，执行source-discovery、Fowler/risk、working-tree、reviewer-contracts、review-evidence/result-reuse及error-handling/test-reliability；dev/UI和架构、测试、许可、构建、设计系统、shell、动效与可访问性规则按已读且SHA匹配部分复用。此次重读错误状态规则、报告模板和新增恢复合同，不递归派遣。
- 规范来源仍为spec、implementation-contracts、ADR/CONTEXT、reference-notes、DESIGN revision1及批准原型、T08稳定章节/修复/恢复章节、Goal execution-protocol、allocation和工程决定。新增recovery1 packet、Root冻结manifest/audit/reuse明确回读。79个canonical locator全部以原文/锚点实际读取并核SHA，见 `normalized-audit.json`、`final-normalized-audit.json`，errors[]。
- 实现者为Root、implement_t01、implement_t08_business、implement_t08_profile、prepare_t08_full_cli；reviewer未参与任何候选实现。本轮沿原独立身份，没有改名或重置履历。

### 完整范围的复用闭包

016原报告 SHA `30cc865bade17ba4c7cfa9b9b39201c785e2cfa7ac3131d070fb1e6f539d8a15`、011原报告 SHA `aad8e99dbe325e7db34cce854631e7221dcaf15e701ca49b147d8d8721396119` 与009局部原件不变。当前2072产品与R2逐项比较，**2066未变，恰六个native路径变化**；87审查范围中81路径未变。六路径为editor.rs、session.rs、main.rs、control/unix.rs、control/windows.rs、tests/editor.rs，完整增量及相邻消费者已审读，R `delta.json` 保存原增量。旧native shutdown判断及旧pair不能关闭F5，新的六路径和跨owner错误传递重新判断。

R `package-audit.json` 对714个新可达snapshot路径、167,903,742 B逐字节核对，2288个与既有已核记录相同的路径/SHA有界复用；不是声称重读所有历史日志。完整源码diff1,053,345 B和生成物diff12,561,423 B从before/after重建并精确匹配，errors[]。R `consumer-reuse.json`另核新pair producer的26生产/8测试源及snapshot全部匹配，三个独立probe的实际编译输入也无漂移。

| 范围/风险 | 本轮观察与有效复用 |
| --- | --- |
| A业务、Space/runtime/source身份、wait/read/回执 | A34与原消费者字节未变，复用011/016已实际追踪的controller→router→sessions→Host/helper/native身份与效果边界、活动水位/期限/continue不重发、观察额度及完整envelope上界。显式Space，不按cwd/焦点猜Space；全旧入口接线仍由T14/T15承担。新native关闭不改变这些业务协议。 |
| B实际Pi/程序身份/安全提交 | B15及Pi/Jiti依赖闭包未变；原regular TUI/default editor gate、draft/selector/paste/UTF8/streaming/外部editor/clipboard保守拒绝、原Node/入口/扩展及效果前重新校验继续适用。Root新pair完整官方CLI+原Pi业务链重新运行，证明新关闭机制下原主链仍工作；不以旧pair代替当前消费者。 |
| C并发、取消、writer与责任 | 六native源全部重审；ordinary output/root/reply栅栏、editor operation/frame/settled责任、queued none与dispatch unknown、ACK/query/stop活性原字节不变。追踪新增listener退出结果经过main再到helper/Host最终调用者，发现F6。不是仅看F5测试断言。 |
| UI/焦点/状态/设计 | Panel、TabStrip、生产Page/ownerDocument单实例、手选目标、source/runtime变更失效、停止确认与焦点归还均未变，复用已审页面与Root真实Chrome15/15、312/44、明暗、200%及键盘/被动read证据。F2/F3闭合保持；受控Chrome不冒称真实Obsidian。 |
| Root产物/canonical/质量 | main、styles、预算阈值、依赖/锁/协议生成与文档未变；main为6,667,083 B、SHA `4d334fcc1e21ebe9d3d58086cf2c9137e374b5da71e305bd8974e02ba74de63d`，styles1,422,357 B。2066输入匹配支持复用第三次build/types/lint/architecture/Promise/bundle、TS/DOM及Chrome证据。没有重新全仓构建或测试，没有放宽预算/保护。 |

### 原F1–F5处置与新native语义

| 原问题 | 本轮确认 | 结论 |
| --- | --- | --- |
| F1 helper迟到关闭不回收 | 原同一join仍要求ordinary fences、phase closed、无editorOperations与local frames；相关TS完全匹配016，Root新pair三SID同helper实测也通过。 | 关闭。 |
| F2 上笔receipt污染新输入 | 新prompt/raw input清理receipt、原epoch隔离和continue保留原操作事实均未变，016独立Panel及015矩阵有效。 | 关闭。 |
| F3 shell丢关闭状态 | agentControl白名单与生产sanitizer/view恢复路径未变，016独立接缝和015真实compose测试继续有效。 | 关闭。 |
| F4 文档状态枚举 | failed/interrupted与canonical schema保持匹配，native本轮未改schema。 | 关闭。 |
| F5 正常EOF遗留service socket | 新Runtime保留JoinHandle及实际close结果；独立复制旧016正常EOF probe到新根/新pair，五代ordinary fences、editor-closed、binding.close、helper.dispose后，每代socket列表均空，未经外部删除。 | 原普通EOF反例关闭；异常结果传递另列F6。 |

`editor.rs:140/237/243/607/705`：enroll持runtime锁覆盖cap创建与entries注册，取锁后重查closing；listener在同一runtime临界区重新采entries为空，消除先采空再取锁的TOCTOU。锁顺序runtime→entries一致，run释放binding state后再删entries，未发现引入反向环。finish_shutdown用try_lock检查原截止、只join已结束worker，实际join/显式unlink成功才缓存成功；panic/error可重复观察，超时保留句柄与责任。原Sessions共同8秒截止在end_all入口建立，session/root/reply消耗同一预算后再传service，没有第二个8秒。该预算是协作式有限观察，不宣称硬实时OS/kernel保证。

Unix显式close关闭Drop重试并返回同inode删除结果，替代实体保留；普通旧控制listener的Drop尽力语义未被改成新的强制成功保证。Windows新增close使用原RAII，editor仍不支持，只有GNU交叉编译证据。main在service错误时打印诊断并exit1；原stdout最多5秒尾部flush未变。017原runtime锁预算红、确定性stale-empty红及最终绿实际回读；未把is_finished当作物理完成证明。

### 原件、真实执行和资源

R `evidence-index.json` SHA `0f9d3516dc6ca9b98c33fba3a97fd8133021b9af78e7dc10297e1eff8e89d239` 索引本轮原件。各probe有`.ts`、构建脚本、实际bundle、`-inputs.json`、`.receipt.json`、stdout/stderr；回执保存真实argv/cwd/UTC/exit和输出SHA。绝对Node26.11.1入口、自己的HOME/TMPDIR、短0700 XDG根；只读实际新pair：huhu-pty SHA `950b1832947eaa287ef9c03499e9574a61ee7b7c4845a31ff422a350ce3af843`、huhu SHA `63db57114503eaedf757c6c087eef8c0c268d393dc86b58035de51c67fdacd74`，两者0555，producer SHA `5d82fd3794c4109fbd02151e5d41e69adb67310bbff667c0dc03f40ac626f7c3`、0444。没有覆盖旧pair或Cargo target。

| 独立原件 | 实际观察 |
| --- | --- |
| `socket-cleanup.stdout` SHA `b101cebc1e34a9a08e7dad8816da825150db2151558c81a7a6d2e3103daa9005` | 12:20:38.892972Z–12:20:39.623074Z，exit0，5代均remaining=[]。无cap/endpoint替换、无force、无外部删除；F5正常路径绿。 |
| `shutdown-error.stdout` SHA `8448be2c34ac52634f4217fb53dae398cf9fa1da7870a4a9e391f9c7800e75f9` | 12:22:55.572219Z–12:22:55.756672Z，生产PtyHelper。普通session/binding栅栏全部完成后，仅将自己的endpoint改名，原路径写自己的sentinel。native真实exit1/signal null、stderr为 `editor service shutdown incomplete: control identity changed`；helper.dispose resolved，公开closed只有先发的closed，sentinel保留。 |
| `host-shutdown-error.stdout` SHA `460eb9777269c10e12181d816b8ea624329ab7624a0dc0a92b92eade9c5eaf2c` | 实际NativeHost.acquire('pty')、公开lease.value.spawnSession/binding、最后lease.release与host.dispose链；同一受控endpoint替换后两者均resolved，native仍exit1/同诊断，公开lease事件没有该错误。不是只观察helper私有方法。 |

后两probe的exit0表示成功采集缺陷，不表示产品关闭绿；只读child引用用于观察真实exit/stderr，没有替换生命周期方法或mock返回。Node测试程序只用于native/transport生命周期，不冒称官方Pi业务。R `consumer-reuse.json`记录14个helper/root PID全部gone；e2只剩空运行目录与测试entry，native socket确实自行消失。e3/e4在观察sentinel保留与错误后，finally只删自己的sentinel与改名旧socket；该外部清理不当作native成功，其源码和原输出均保留。

017最终native原log实际为142个顶层通过，session_tree嵌套1项不重计；Linux build、WindowsGNU check、六文件fmt退出0。旧EOF12代红、新pair12代全0绿、endpoint/cap替代错误与准确exit1的直接bin原件分开；018依赖checksum夹具采集失败也保留，之后88归档/8369解包文件核对通过。不将测试数量代替语义。

Root `T-08-root-recovery1-audit.json`及原 `/tmp/huhu-t08-root-r1-native.log` 实际3文件5项通过；唯一新增官方夹具 `/tmp/huhu-t08-a-stage2-native-2P6YOY` 的 actualModelConversation/nativeFullAnswer/businessPath/passed=true、failures[]。完整官方CLI、生产业务/Control/Host/helper对受控loopback SSE，含中文多行/steer/结果观察；90业务/16driver输入及1295vendor闭包记录匹配。夹具与外层命令的关联是pre-command根集合和唯一新根推断，不伪造直接runner标签。Root记录7PID/locator gone，外部删自己runtime前已只有空目录、无文件/socket。旧Bot六锚点失败、fixture模式失败及更早测量失败不抹去。

### 最后冻结核验

R `final-audit.json`：2026-10-26T12:29:20.196Z–12:29:21.451Z实际执行固定git_scope_command，exit0，scope stdout SHA `be40bd1dd132a60f86cb3d0e6d5d7b57722950ad9f0cb495c86acab7449f2462`。87路径字节/模式、79来源、HEAD、输入digest和2072当前产品全部匹配，errors[]。原始index SHA仍 `0dc36455cc312a56435427ec186162d50fc70f38520757b7eeab33d46187eacd`。

按review-evidence仅去掉excluded_paths/inventory_sha256/input_sha256后，其余scope所有字段精确相同。excluded从35485到35561，76新增均为本change的冻结输入/派遣及T09只读准备的evidence/sessions行政材料，完整清单在final-audit，无产品漂移。本REPORT是另一个授权行政输出。写后另存实际return结构检查回执并回传Root，不预填校验成功为产品通过。

<a id="standards"></a>
## standards

Reviewer: codex:/root/review_t08_native
Axis: standards
Result: request-changes
Input-SHA256: 630404fbe847c70e44e8ddd58585adb8454e285485538394908ef3025bb5f6d2
Observed: 完整87范围与未变闭包经核对，六native增量的join、统一截止、try_lock及entries同临界区顺序已审；新pair正常EOF五代均无残留。真实生产Host最后release却吞掉native exit1和关闭诊断，形成F6。

### F6 — medium / P2：native关闭失败在helper最终释放处被转换为成功

**位置：**`src/host/desktop/native/helper.ts:159`的terminated只记录exit fence，`:1139/1144`的close提前ended短路，`:1175–1209`的dispose先close('closed',true)，再对terminated无条件resolve。公开消费者为 `src/host/desktop/native/host.ts:734/800/875–885` 的lease.release finally→shutdown→helper.dispose，以及`:889` host.dispose；生产装配是runtime.ts的createNativeHost。新producer为 `native/pty-server/src/main.rs:439–454`。

**真实前提与路径：**Linux已成功创建editor service，session/root/reply/editor binding均正常完成，尚未关闭helper；自己的endpoint inode被替换。该异常正是017显式安全unlink所识别的真实错误分支。新native正确保留外来inode、打印诊断并exit1；但dispose已置ended，随后exit事件的close无法发布结果，terminated又丢弃code/signal。因此helper.dispose、最后租约release和host.dispose全部fulfilled。两级独立probe原输出可回读，绝非猜测异常可能被吞。

**影响与标准依据：**调用方只能知道进程不再存在，无法获知本次IPC安全清理未完成。`src/modules/agent/services/terminal/sessions.ts:890–910`原有Promise.allSettled汇总release拒绝并抛shutdownIncomplete的渠道收不到该事实；未声称真实Obsidian显示了成功toast。common error-handling要求保留失败后的真实保证、清理失败分别报告，dev生命周期要求覆盖关闭/重开/失败路径。native错误不能仅停留于无人消费的stderr缓冲而在公开最终释放处被抹掉。

**既有语义边界：**helper.dispose旧注释只保证等进程exit，其4秒kill、再1秒未退出才reject的有限升级语义原已存在；本finding不把所有旧尽力清理提升为必须成功，也不要求额外等待完整8秒。此次新native将实际listener join/unlink错误纳入关闭结果，完整T08组合却无法向既有调用者保留这项错误；它是当前新结果与原消费者的接缝缺陷，不声称TS这几行是017新写。源码还显示4秒升级可早于native共同8秒deadline，signal也被terminated丢弃；这是同一结果丢失机制的强制退出风险，未冒称本轮实际运行了该延迟场景。

**满足条件：**沿现有最终释放渠道保存并准确交付native已报告的关闭失败；进程gone与清理成功可区分，普通EOF仍正常完成，替代inode仍不被删除。回归须经生产helper/Host最后release验证，涵盖非零退出/诊断、有限强制退出与重复关闭；不靠解析本地化字符串决定恢复，不自动重放旧输入。若采用dispose拒绝，应同时检查Host.shutdown只在成功后清current的现有结构：后继acquire可能遇同一rejected closing，这是修复影响风险，**不是已复现的另一个现状finding**；启动失败与重复dispose亦应维持有界、可重开语义。

本轴仅此一项当前finding。F1–F5关闭与其他完整风险面结论见前述独立观察/有界复用。

<a id="specification"></a>
## specification

Reviewer: codex:/root/review_t08_native
Axis: specification
Result: request-changes
Input-SHA256: 630404fbe847c70e44e8ddd58585adb8454e285485538394908ef3025bb5f6d2
Observed: 对照spec、T08恢复合同、DESIGN与AC范围审查全票；F1–F5原满足条件成立，新增listener失败在直接bin可见，却被实际Host最后release抹去，未满足有限关闭中残留/未知可辨的F6条件。

### F6 — medium / P2：异常IPC关闭的准确结果未到达既有业务释放调用方

**位置与可达前提：**同standards所列helper/Host消费链；无需真实Provider、活动业务失败或未完成binding，只需已分配editor service在最后关闭时遭遇安全unlink失败。独立Host原件证明nativeexit1与公开release/host.dispose fulfilled同时成立，错误没有通过lease.closed到达消费者。

**规范依据：**spec §3.6（本机临时IPC且不得降低关闭合同）、§3.9/第204行（停止接纳后保留真实输出/退出处理直到确认或有限预算耗尽）、NFR-002（关闭有限结束，残留/未知持续可见）；T08 `#t08-native-shutdown-recovery` 所纳入的 `evidence/T-08-recovery1-packet.md` 第11/29行明确要求异常清理准确收束、不得隐藏异常、替代实体保留且关闭有限/残留可辨。此判断对应当前T08新增editor IPC关闭恢复，并非提前要求T14/T15全消费者迁移，亦不改变终端级协作而非逐任务保证的既定边界。

**影响与满足条件：**直接bin已诚实失败，但产品正式helper/Host发布的最终完成结果不保留该失败，上层原shutdownIncomplete渠道无法区分“进程结束”和“IPC安全清理完成”。需要在现有有限关闭机制里保留这项可观察差别，让实际调用者能够报告该清理异常，不能用延长超时、删除替代inode或事后清测试目录使其看似成功。F5正常多代0残留、原binding/frame/operation/root/output责任和F1释放join继续保持；不要求真实Provider或新增服务。

本轴仅此一项当前finding。PAGE001/003、AC013–018/021/030/061相关的身份、输入效果、回执、焦点、布局与原业务保留部分依完整匹配闭包继续成立；不是直接套用standards结论。

## 问题与下一步

Root需接收F6并在同票恢复周期内修复最终关闭结果传递，冻结新输入后独立复核受影响轴与跨owner释放/重开影响。F1–F5不重新打开；旧红/绿原件及本轮F5独立绿、F6真实反例均保留。reviewer没有修改产品、正式Evidence/Goal/Map/Ticket状态，return结构通过也不改变request-changes。

真实Obsidian、远端Provider/真实账号、OS IME与五平台实机仍未运行并由用户验收；Windows仅交叉检查。未重跑全仓/native全量，不冒称Root或旧轮测试是本reviewer本轮执行。没有提交、推送、发布、归档或整个Goal完成结论。
