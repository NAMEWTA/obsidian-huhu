# 任务回报

Session: 20261026T045732Z
Task: 021-t08-full-review-r4
Status: completed

## 聚焦交接

已完成 T08 R4 完整88路径的独立标准轴与规范轴审查，两轴均为 **request-changes**。F1–F5保持关闭，F6原真实Helper/Host反例已独立转绿；新增一项 medium/P2 的 F7：Cookie读取失败和最后租约清理失败同时发生时，原读取错误被finally中的新shutdown rejection覆盖。F7位于主88路径以外的实际消费者，是本次Host/helper拒绝语义改变的影响闭包，不把该文件虚列成本次已改路径。审查者保持 `codex:/root/review_t08_native`、用户指定 `gpt-6-astra/high` 的原独立身份；未实现、未修产品、未派遣，Root持有最终验收与状态权。

## 产物与验证

### 输入与 source discovery

021 TASK完整回读，SHA `6b7f2a6572ca1470088501b6604fd595f69a7f85fa160fe67e525c3ad1f199b2`。当前GP031/Map32、T08 in_progress、恢复周期1 attempts2，旧周期3和blocked历史不变。所有产品SOURCE STOPPED；只写本021 REPORT及新 `/tmp/huhu-t08-full-review-r4-astra/`（下称R），所有旧TASK/REPORT/bin/probe只读。

- 规范化输入 `evidence/T-08-review-input-round4.md#review-input`：Markdown SHA `2664b98bd216b2fe8f711f2859babf48b2b289fed1ac81da4e7a8d20ad389016`；按实际review-evidence实现重算唯一对象的digest为 **`07fcc38f90528a6f3be4635846c769a7cfe3b4fce36a752940cdb5f6d67c101a`**，两轴原字段均使用它。
- 完整语义包 `evidence/T-08-review-input-r4.json` SHA `148c80772ff53451cffb82216cf06eba36c0aacba2e9749f2898172708fc8094`；working-tree，A34/B16/C33/Root5共88路径、76本票变化。before为已含T01–07的T08初始工作副本，不用HEAD全部差异冒充本票。HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`、branch `NAMEWTA/terminal`仅作Git观察锚。
- 沿workspace/catalog已有定位执行common code-review、source-discovery、Fowler/risk、working-tree、reviewer-contracts、review-evidence/result-reuse、error-handling/test-reliability；dev/ui和架构、测试、许可、构建、设计系统、shell与动效可访问性已读且匹配部分复用。规范为spec/implementation-contracts、ADR/CONTEXT、reference-notes、DESIGN revision1 PAGE001/003及批准包、T08稳定/修复/恢复章节、Goal execution-protocol、allocation与工程决定。新F6 packet/replan、020检查点、023候选、Root接收/组合/预算与复用资料实际回读。
- 93个canonical locator按原文/锚点读取方法逐项核SHA，见 `normalized-audit.json`、`final-normalized-audit.json`，errors[]。reviewer不在Root、implement_t01、implement_t08_business、implement_t08_profile、prepare_t08_full_cli实现者之列；没有改名、重置或重派遣。

### 有界复用与完整覆盖

019原报告 SHA `0cb8815abc80978c12659d3cd72dab08e86c9febddd7608afb070f0558c40904` 及009/011/016原件均保留。当前2072产品与R3逐项比较：2060未变，恰12路径变化，即三生产TS、七测试、main.js和bundle-budget.json；88主范围中其余76路径未变。`helper.test.ts`是本轮新纳入主范围的既有文件，并非新增产品。R `delta.json`保存12份真实增量；三生产TS、所有测试增量、预算规则及其相邻消费者完整审读。Rust/UI/CSS/依赖字节未变，原native shutdown与UI结论可复用；旧Helper/Host成功关闭判断和旧main测量不用于证明F6。

R `package-audit.json`逐字节核728个新可达snapshot路径、66,541,970 B；2349个与既有已核记录匹配的路径/SHA有界复用，未声称重读所有历史CAS。完整before/after重建source diff1,095,444 B、generated diff12,564,020 B均匹配。`consumer-reuse.json`核2072产品差异、017 producer的26生产/8测试原源及snapshot、六项独立probe实际编译输入，errors[]。

| 完整风险面 | 本轮判断/有效复用 |
| --- | --- |
| Space/runtime/source/editor身份与A业务 | A业务与身份、wait/read/水位/continue不重发、bounded envelope、路由和效果前重校验字节未变，复用011–019已审闭包。所有业务显式Space，旧交互先选/后台缺配置失败的完整接线仍由T14/T15承担，不按cwd/焦点猜Space。Root新Host组合重跑实际业务链。 |
| B实际程序、Pi gate与安全输入 | 原Node/入口、Pi/Jiti1295文件、扩展和默认editor同步gate未变；draft/selector/paste/UTF8/streaming/clipboard/外部editor保守拒绝及queued none/dispatch unknown不变。新关闭不改变prompt原业务效果或自动重放。 |
| C并发、取消与物理责任 | 新Helper exit/stdio/termination fence、PendingEditor错误缓存、Host关闭/退休/多owner/迟到回调重新审；原native锁顺序/统一8秒/own-inode unlink未变。physical fence仍永不reject，失败不提前返额；非零最终关闭诚实传递。 |
| 现有消费者 | 追踪Sessions、control environment、lazy host、Cookie reader与Browser read调用。Sessions/control原allSettled汇总仍接住新rejection；Cookie/history其他owner活性有023矩阵，最后Cookie请求的双重失败另由本轮实际probe发现F7。不能以共享TS旧字节相同排除新语义影响。 |
| UI/焦点/设计与回执 | Panel/TabStrip/生产Page、ownerDocument单实例、手选身份、失效目标、确认/焦点回收、F2/F3均未变。i3真实Chrome15、312/44、明暗、200%、键盘/被动read原证据按匹配输入复用，未把旧视觉测试当新Host失败测试。 |
| canonical/生成物/包体与质量 | 共享协议/canonical/native/许可/依赖未变。新main由Root实际build重新生成并归因；类型、全仓lint、architecture、Promise与enforced bundle新原log回读。未重跑全仓/native全量，未改规范或预算来绕过失败。 |

### F1–F6与新生命周期语义

| 原问题 | 处置与依据 |
| --- | --- |
| F1 helper迟到关闭不退休 | ordinary fences、binding phase、operation/frame会合逻辑保持；Root当前真实三SID同helper原件和023既有矩阵继续绿。新PendingEditor物理错误保留没有提前释放原额度。关闭。 |
| F2 上笔receipt污染新输入 | Panel新prompt/raw输入清receipt、epoch隔离与continue保留原事实不变；016独立Panel及015矩阵有效。关闭。 |
| F3 shell丢关闭状态 | agentControl白名单与sanitizer/view恢复不变，原真实compose和独立接缝证据有效。关闭。 |
| F4 文档枚举 | failed/interrupted仍与canonical schema匹配，Rust/协议本轮未改。关闭。 |
| F5 普通EOF遗留socket | 017 native同源同pair；本轮新Helper下独立五代正常EOF均无socket残留，未外部删除。关闭。 |
| F6 native失败被helper/Host吞掉 | 复制019两级真实反例到新根执行：helper.dispose和最后lease.release/host.dispose均拒绝NativeShutdownError，code1/forced=false/stdioClosed=true及diagnostic准确；重复release保留同错，sentinel未被native删。关闭。 |

`helper.ts:160–184/1183–1231`把terminated物理事实与真实stdio close分开；exit0、无signal、未forced、真实close才正常成功，not-started也必须等实际close。error无pid只证明未启动，不伪造stdio完成。stderr迟到部分在close前可进入最后4000字符串单元诊断；outcome Object.freeze，迟到事件不反改已返回错误；恢复不解析诊断。原4s升级+1s观察保留，已经exit但stdio不close不会kill已gone进程，仍准确有界失败。

Host `:102–117/168–181/911–959`在原Generation上区分已gone与unconfirmed：已确认gone的失败仍reject原调用者并退休原代，下一明确acquire新建；未确认则阻止第二helper，晚fence只退休原代且以current身份防止清新代。lastClosing保留最近已退休失败，直到新generation明确开始；重复release/dispose缓存同Promise/结果。多owner仍仅最后释放才关helper。release及host.dispose保留原NativeReleaseError.outcomes/stop cause和shutdown错误；startupFailed保留握手/启动原错及cleanup错，unconfirmed startup继续阻止第二helper。旧回调仍只操作原generation对象，无自动业务重放。

`helper.ts:397–404`缓存terminationError解决“物理exit先到、local frame后结算”丢失完成事实：同frames清空前不删operation、不还bytes/count；清空后重试会保留物理错误并settle。finished已有adapter-applied/completed不被降级。023的008原5秒悬挂红、010目标绿、016最终127绿及明确bytes/frames断言实际回读。新代码没有以公开dispose失败代替真实物理fence。

七测试增量已核：正常fake补Node close，负面exit1继续为1且精确期待typed失败，没有通用catch吞错；helper.test仅两处normal finish补close0，七原断言不变。023 REPORT两项0600误写由Root audit勘误，helper-editor及host-editor.integration真实0664，与冻结模式相同；未偷偷改模式。

### 独立probe原件与资源闭合

R `evidence-index.json` SHA `eb32d04e57ad42b8e17b1cb66596573754c72b175683a8134ea182036451fab6`。每项含实际`.ts`、build脚本、bundle、编译输入清单、`.receipt.json`和stdout/stderr；真实argv/cwd/UTC/exit/输出SHA可回读。绝对Node26.11.1 SHA `5a7b8a3cf5ccb57d297519754fd73238f64cf560afd0ef19a2f9bf7384cbb657`，HOME/TMPDIR在R，无真实账号/Vault/Provider动作。

只读017 pair再次核SHA/模式：huhu-pty `950b1832947eaa287ef9c03499e9574a61ee7b7c4845a31ff422a350ce3af843`、31,119,408 B、0555；huhu `63db57114503eaedf757c6c087eef8c0c268d393dc86b58035de51c67fdacd74`、15,428,448 B、0555；producer `5d82fd3794c4109fbd02151e5d41e69adb67310bbff667c0dc03f40ac626f7c3`、0444。未重建Rust、未写Cargo缓存或旧pair。

| 新原件 | 实际观察与边界 |
| --- | --- |
| `socket-cleanup.stdout` SHA `cbfc8c67dd326518f1afbfadee2d292c363619cd19ecb33b7ab10e968aaa5999` | 新生产Helper+017bin五代，ordinary/editor栅栏后dispose，每代remaining=[]、sockets=[]，exit0。无cap/endpoint替换、无force、无外部删除。 |
| `shutdown-error.stdout` SHA `6d1749847964e19e0a87288c987804fe1e2b06896008e81dd3a6c3a766504e21` | 自己的endpoint改名并写sentinel后，真实native exit1，Helper拒绝typed错误、diagnostic含identity changed，sentinel保留。 |
| `host-shutdown-error.stdout` SHA `9bb0d3e53aaec7a515d76349d62554223cdd00e8cfef50a4be116ea532fea5db` | 14:20:00.064933Z–14:20:00.240567Z，生产公开Host lease链，两次release同错，host.dispose同样拒绝，actual native exit1、stdioClosed=true。旧F6反例转绿，exit0是断言通过。 |
| `forced-and-late.stdout` SHA `a1b06ac3ae8b3aa5659b968ff8e162a3c005512569b8deac62d9b97ea94f55c5` | 生产Helper/Host配自己的真实Node受控协议子进程，第一组SIGTERM退出且forced=true，准确失败；第二组忽略SIGTERM、6.5秒后exit0，5秒观察返回unconfirmed，下一acquire同错且starts=1；晚物理fence到达不自动启动，明确下一acquire才starts=2并用017真bin正常关闭。不是mock Promise，不冒称第一组运行native Rust；stdout forced.elapsedMs是在整个两组结束后取值，不能当第一组单独延迟。 |
| `cookie-dual-error.stdout` SHA `2981e904bb64e836c8851a9999920f3e00d3fec3aceeef421eaa8c26e4aef344` | 第一遍真实Cookie双失败观察：原缺失snapshot读取Error消失，最后只得到NativeShutdownError，无cause/errors。exit0为成功采集缺陷。 |
| `cookie-dual-error-observed.stdout` SHA `4fefb3179704925b0198da99acc33cc5823681ba413a314d6c00009b4f6b7317` | 14:24:08.611256Z–14:24:08.791194Z，加只读独立FrameDecoder观察同次native stdout：对照和目标两个不同rid的cookies-result都明确unable to open database file；目标readCookies最后仅shutdown错误，无原错链。新F7的正式反例。 |

Cookie两probe正常import生产nativeCookieReader、NativeHost、PtyHelper，使用017bin和自己不存在的snapshot路径；没有真实Cookie数据。协调adapter仅在实际Cookie lease已获取后await原PTY lease.release，使Cookie成为最后owner；不改request结果，不mock业务失败。只读child引用用于观察真实exit/stderr/stdout，不替换生命周期；同次原回包排除了仅凭先前对照推测目标错误。

`consumer-reuse.json`记录21个helper/root/受控子进程PID全部gone；`external-consumers-and-resources.json`检查R无socket、/proc/net/unix无自有listener。e2普通EOF在任何外部清理前已全0。e3/e4/e5/e6均先保存sentinel、真实exit和错误，再由finally仅删自己的sentinel与改名旧socket；该外部删除不冒充产品成功。entry、endpoint记录及受控fixture留作证据，不删除旧根。所有短XDG运行根0700，未放宽保护。

### 修复与Root组合原证据

020是未完成检查点，002真实F6红、003缺Node close导致75秒外层TERM143、004原helper.test首项超时/余6未运行全部保留。023新001无pid提前完成红和008物理fence5秒红已回读原断言；002负面fixture期望失效、004错误rows期望、007测试被既有eslint ignore跳过的警告不抹去。最终016原log8文件127项无skip、生产/测试types与生产lint通过；不是把选择性未运行项凑成全绿。

Root recovery1 integration2九条实际命令原log回读：build（两类型、样式、main）、lint、architecture、Promise、enforced bundle均0；consumer首轮44绿+7无官方artifact跳过，后显式artifact仅补7绿/另2未选，合计51唯一消费场景。当前3文件7项native集成全过；这些原测试未覆盖本轮F7的Cookie双错误，因此通过数量不抵销实际反例。

唯一新增官方根 `/tmp/huhu-t08-a-stage2-native-6SoGWT`，actualModelConversation/nativeFullAnswer/businessPath/passed=true、failures[]；完整官方Pi CLI和生产业务/Control/Host/helper对受控loopback SSE，90业务/16driver编译输入与1295vendor文件匹配。通过pre-command库存和唯一新根作关联，不伪造直接outer标签。Root12记录PID/locator gone，外部清自己runtime前无文件/socket、仅空目录；017 native142/Linux producer/WindowsGNU check和i3 Chrome15按未变输入有界复用。原六Bot文档锚点失败及更早装配/度量失败均保留。

当前main6,669,680 B，SHA `19b8ffb4eeb5f3a97de43f1b56364204ad9541405b209b05b7f76d2903105ac7`；styles1,422,357 B未变。三方归因精确重现初始6,379,974 B和前次6,667,083 B，当前产物匹配；新增2597 B为Host1365/helper1084/shared error142/未改源构建重命名6。outputBytes仅按最小KiB升至6,670,336，理由和差额记录在两份r4预算证据，eager123,533与agent activation1,314,666仍在原上限。无新增依赖，未沿用失效旧main的测量。

### 最终输入与scope核验

R `final-audit.json`：14:26:21.525Z–14:26:22.668Z实际执行固定git_scope_command，exit0，stdout SHA `1bcb14fa385adf2fd3ac9d152e95c8b6fab8957c3c35d3ef1aaf85cc7df9add7`。88路径字节/模式、93来源、2072产品、HEAD/digest全匹配，errors[]；原index SHA仍 `0dc36455cc312a56435427ec186162d50fc70f38520757b7eeab33d46187eacd`。

仅去掉excluded_paths/inventory_sha256/input_sha256后，scope其余全部字段完全相同。excluded从35927到35952，25新增全部是本change evidence/sessions行政材料，无产品漂移。F7外部消费者单独记录于external-consumers-and-resources，均匹配冻结2072产品manifest：其中cookies.ts SHA `f1bf22a532da8df23916e719929f61ffd37f12221ce25f7b3ec31f155fba3ad9`，不在主88scope内。未扩大产品写集。本REPORT之后另保存实际return原回执，不预填其结构结果为产品通过。

<a id="standards"></a>
## standards

Reviewer: codex:/root/review_t08_native
Axis: standards
Result: request-changes
Input-SHA256: 07fcc38f90528a6f3be4635846c769a7cfe3b4fce36a752940cdb5f6d67c101a
Observed: 完整88范围及12路径增量审查、实际消费者闭包和93来源已核；F1–F6关闭，真实强制/迟到退出边界准确。新reject语义到Cookie reader时，finally release覆盖同次原生读取错误，F7真实回包与公开结果均可回读。

### F7 — medium / P2：最后Cookie租约的清理失败覆盖原读取失败

**位置与归属：**`src/shared/native/cookies.ts:16–17`，生产 `nativeCookieReader.readCookies` 的 `try { return await ...request(...) } finally { await lease.release() }`。该文件不是本轮88主路径内的改动；引入可达性的本轮路径为 `src/host/desktop/native/helper.ts:1207–1212` 和 `src/host/desktop/native/host.ts:833–841/925–935`，把真实非零关闭准确拒绝到最后release。原未变消费者因此必须纳入影响分析，不能把F7算作无关既存代码风格问题。

**真实条件：**同helper已创建editor服务；普通session/editor/output/reply栅栏完成，另一个Cookie owner仍持租约；自身endpoint被替代，原PTY owner随后释放；Cookie读取失败且成为最后owner，最后安全unlink也失败。独立公开链probe用自己的缺失snapshot，实际native产生两个不同rid的cookies-result错误（前一项对照、后一项目标调用），都为unable to open database file。目标readCookies却只抛NativeShutdownError，cause=null、errors=null；同native真实exit1/identity changed、sentinel保留。协调adapter只控制合法owner释放顺序，无mock结果；不把特殊endpoint替代称为正常常见路径。

**用户影响与标准：**原读取失败的准确原因在公开API边界永久丢失，后继Browser `services/host.ts:211`→`cookies/read.ts:21`→CookieImport错误处理拿不到它。`CookieImport.tsx:87–99`的详情取返回error.message，因此此路径只能呈现helper关闭错误，不能解释本次Cookie读取为何失败；本轮没有运行真实Cookie UI，也不声称观察到实际toast。common error-handling要求保留失败后的事实、清理失败和业务失败分别报告；这里finally以次生清理失败替换了原业务错误，和本轮在Host/startup内部已修的双错误原则不一致。

**满足条件：**该实际消费者在读取与release同时失败时保留两份原错误，调用方能分别诊断读取和清理失败；仅读取失败、仅清理失败、两者成功分别保持准确结果，原取消signal监听仍释放。验证须覆盖生产nativeCookieReader加真实Host/Helper的双错误消费链，保留原F6非零/forced/unconfirmed拒绝、普通EOF、最后owner规则和后继明确acquire；不能吞release错误、把native exit1改成成功或回滚F6以消除本反例。可由Root安排最小消费者修复，reviewer不扩大写集。

本轴当前仅F7一项finding；未将F1–F6重新打开，亦未把未验证平台或可选检查升为finding。

<a id="specification"></a>
## specification

Reviewer: codex:/root/review_t08_native
Axis: specification
Result: request-changes
Input-SHA256: 07fcc38f90528a6f3be4635846c769a7cfe3b4fce36a752940cdb5f6d67c101a
Observed: 对照spec/implementation-contracts、T08关闭结果packet与既有消费者合同审完整组合；身份、输入效果、wait/read/UI与F1–F6保持成立，Cookie原读取失败在新清理拒绝下被抹去，错误边界和既有能力诊断仍存在F7缺口。

### F7 — medium / P2：共享helper关闭修复未保留Cookie消费者的原失败事实

**位置/条件/证据：**同standards中的cookies.ts:16–17及本轮helper/Host结果生产者；真实目标cookies-result明确读取失败，公开readCookies仅保留shutdown失败。主88scope和外部消费者角色分开记录，不声称Cookie文件已由020/023改写。

**合同判断：**spec §4保留网页/Cookie原能力、NFR-004独立错误边界与类型化公开入口，以及当前T08关闭结果packet对“原owner错误与最后shutdown同时失败，两份真实事实均保留”的修复影响约束共同适用。Packet点名NativeReleaseError/启动双错是具体必要场景，不构成允许新reject语义覆盖其他实际owner失败的例外。AC-041提供共享Cookie消费者仍独立的功能边界；本finding不是提前实施T14/T15、增加新Cookie能力或要求真实账号E2E。

**实际影响与关闭条件：**最后Cookie owner无法同时报告本次读取失败与helper清理失败，上层失去原失败诊断；新的typed关闭结果虽已正确，但当前完整组合未保留被影响消费者的两份事实。修复后须保留原读取原因及准确cleanup outcome，保持多owner、取消监听释放和有限关闭；不能将请求失败和进程gone混成一个业务成功/失败推断，也不自动重读或重放输入。独立反例的snapshot/endpoint均为reviewer自建，未读取任何真实Cookie资料。

本轴仅F7一项当前finding。PAGE001/003、AC013–018/021/030/061、显式Space与原应用保留部分按前述完整匹配/新消费者证据继续成立；本轴依据外部合同独立判断，没有用standards字段替代规范判断。

## 问题与下一步

Root需接收F7，明确最小消费者修复范围并沿当前恢复周期记录新候选；旧F1–F6、020未完成检查点、023原红绿、019反例与本轮全部原件保留。reviewer未改产品、正式Evidence/Goal/Map/Ticket，不自行推进T08或后继票。报告completed仅表示独立审查交回，return结构通过不改变request-changes。

真实Obsidian、远端Provider/账号、OS IME、五平台实机仍由用户验收，本轮未运行；Windows仅既有GNU交叉检查。未重跑全仓/native全部，不冒称Root/旧轮执行是reviewer本轮执行。无提交、推送、发布、归档或整个Goal完成结论。
