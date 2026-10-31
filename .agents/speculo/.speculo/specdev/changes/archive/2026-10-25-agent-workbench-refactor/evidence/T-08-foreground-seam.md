# T08 Linux 前台证据最小生产接缝（只读）

GP019/Map20不变；T06–18未解锁。复用T07/T08预检、K01/K02及Root/C已核的固定来源，只回读必需接缝，未读GPL终端实现。没有测试/构建/cargo/helper/账号/用户Vault运行或写入；本报告与配套source observation是唯一输出。当前C仍可能修改T05 native/shared范围，所列源SHA只代表观察时点，不是稳定交付或新协议权威。

**建议：从“原helper内、捕获PTY master、窄的已验证启动身份、写入前重验”建立Linux正向路径。**先证明owned root shell/明确已验证目标仍在前台，再将该证明接到生产prompt用例。只给API加unknown/refuse不满足AC013；只证明前台shell也不能冒充安全Agent prompt。

## 1. 当前已有与缺失

| 层 | 已有真实事实 | T08必须补的窄接缝 |
|---|---|---|
| TS业务 | managed Space/Session/runtime，exact runtime检查，T04 stop门；T06来源/binding/programEpoch候选 | 同一生产prompt owner冻结完整target、活动基线、可信来源/明确blocking、readiness与预期程序身份；不读GUI焦点，不把provider配置当运行证据 |
| TerminalSession | id是runtime，sid是native数值；捕获SessionPort；submitInput/submitPaste整笔输入；inputReady仅connected+未关input+headless bracketed-paste mode | inputReady不证明权限/登录/目标程序。NativeInputOptions当前只有signal，无foreground guard；ordinary prompt不可调用无guard旧input旁路 |
| NativeHost | captured Owner/Generation、owner.sessions、单调nextSid；release/lost隔离；现inputAdmission与typed queued/finished结果 | 同owner/generation/SID的前台观察及guarded-input能力；旧/无cap helper拒该ordinary prompt，不能从numeric版本或inputAdmission推断支持 |
| Rust Session | Streams.master保留真实MasterPty；child.process_id；job::Scope::capture保存root pid/SID/group/TTY/birth；input queue/writer每SID独立 | 独立的前台观察/程序身份，不复用cleanup成功作前台证明；原生program epoch/不可复用slot身份；把guard绑这笔UserAction并在claim/首次write前重新核 |
| portable-pty0.9 Unix | process_group_leader实际调用tcgetpgrp(master fd)，失败None；as_raw_fd可用 | 可以直接在原helper观察，不另起Node进程从一个spawned.pid猜TTY。无需新PTY owner/daemon或升级依赖 |

当前job.rs的Member字段只含pid/sid/group/tty/birth/alive，没有exe/脚本/Provider身份；它的全局扫描有16384项上限，且会跳过部分不可读行。这适合当前cleanup合同的已知身份复核，**不能原样当“完整前台组已无歧义”的证明**。前台guard需自己的严格结果：相关/可能相关身份不可读、扫描未完成或超限时unknown，不能filter_map后当零候选。

当前InputQueue.claim会在pop后发started；write_inputs随后直接写，只有queue.closed/ended检查。当前write_captured在Unix按16KiB片段续写、最长10s；没有前台变化检查，且bool结果没有字节进度。新增guard的零写拒绝必须在真实first write前发生；不能在已经started/部分写后伪报none。

## 2. Linux可证明的正向条件

推荐第一阶段只支持两个明确等级，不声明所有wrapper/六家版本等价：

1. **owned-root**：已由本helper创建、仍活的root，前台PGID等于其捕获group；同一OS session/TTY、相同birth和真实程序身份；前台组没有无法解释的其他成员。可直接支持原shell/直接exec的已验证目标。
2. **verified-program**：受管Agent已解析的真实启动程序，或Shell中已实际发现的目标；除上述范围外，还需要明确的程序身份策略，把该前台成员与A的预期Provider/registration/programEpoch相连。没有该策略的Node/env/shell脚本wrapper或手动子程序保持unknown，不能只认basename。

观察顺序（不是已冻结wire）：

- 从**同一captured Session.master**读tcgetpgrp；>0才继续。核root原SID/TTY/birth与当前slot，不能接纳外部传进来的自由PID作为owner。
- 读取该前台组候选的pid/birth、SID/TTY、状态和真实exe身份。最小已验证身份是已接纳启动路径对应的实际可执行文件身份（例如dev/ino）；脚本/Node还须核受限、明确的入口参数/脚本引用，不因为exe都是node就相同。argv只读取必要有界字段，不持久化/日志输出正文、凭据或环境。
- Linux可使用保持打开的/proc目录或等价生命周期句柄，结合birth，防PID复用；exe需在claim再核，**exec替换可保持同PID/birth**，只比starttime不够。具体fd/pidfd选择是C工程实现，不能把当前尚无的句柄写成已有能力。
- 审定的前台group必须属于原OS session/TTY且目标唯一/可解释。**进程组不等于唯一输入消费者**：另一子进程即便留在同PGID，也可能读TTY；窄owned-root正例只在成员无歧义时confirmed，未知子进程/不完整枚举拒绝。不能用“root仍活”放行。
- 再次读取master前台PGID及已选成员birth/exe；前后不一致为changed/unknown。结果只证明这一时点观察，不能证明未来不切换。

前台观察在每SID工作线程/有限任务里做，短时取得master句柄，不能持sessions.live/InputBudget/stdio全局锁扫描/proc；同时请求数、成员/字节、耗时与保留token都有上限。超额准确unknown/resource-unavailable，不降级成“随便选第一个”。不需要全机器进程管理平台。

**Agent prompt的额外门不能被OS证据替代：**A还必须确认原runtime/binding/programEpoch、明确非blocked、可信就绪/输入能力。T06四command unproven只能lastFact，OS匹配不会自动把旧Stop/Permission变current或把unknown变clear。应在T08至少实现一条具有真实正面来源/解阻语义的路径，例如Pi registration中真实配对ui_prompt_start/end后的clear，加实际前台身份；或另一条已核Provider明确输入证据。若只有shell native guard通过而普通Agent prompt仍全部unknown，AC013仍缺口，不能标完成。OpenCode缺clear/未识别wrapper应准确保守，不编造外部事件。

## 3. 启动→观察→提交的最小职责与TOCTOU

```text
verified Space/Session admission → 原runtime reserve → captured native SID/slot
 → native spawn保存root寿命/启动身份；A保存实际launch recipe与programEpoch
 → T06 source事实 + A就绪/非blocked门
 → 原helper fresh foreground observation（同owner/SID）
 → A再次核tuple/source/blocking，提交文本+Enter一个有界UserAction
 → native queue等待后，claim/first-write前按捕获guard重新观察
 → 任一未开始门失效：none；开始/部分写后失效：partial/unknown，不补Enter/重放
 → queued/written与活动wait/read分别回执，written不等于目标消费/任务成功
```

最小端口语义建议是：原NativeConnection增加**协商的前台观察**，原NativeInputOptions允许**内部guard引用**；名字/JSON由T07 canonical与C共同fixture正式决定，本报告不设第二权威。观察载荷至少能关联captured owner-generation/SID-slot、native program identity/epoch、PGID/SID/TTY及观察预算；不要求把所有PID或路径公开给外部CLI。可用helper生成的有限opaque token，绑单op/单runtime目标、原截止时间；A不能自己mint“confirmed=true”。token有数量/bytes/有效期，stop/root/lost/release/slot退役立即失效。

- 缓存观察/TTL只用来拒旧token，不能代替claim重验。外部CLI不能传任意guard或选择跳过guard；prompt用例内部取得。原始人工键盘与parser reply/ACK仍按原语义，不把设备reply卡在前台gate后丢drain。
- A在排队前与本用例开始时核source/blocking；绑定变化取消尚未claim项。native在FIFO等待之后再次核OS事实，不能只在Node发送input-begin时核。新guard需穿过begin/parts/commit到UserAction，不是发送前一次独立查询后直接旧input。
- native的nativeProgramEpoch只由实际身份建立/变化产生；A的programEpoch关联可信来源，两者不是可互换字符串。同exe重启、换runtime、PID复用、exe替换、source关闭、root exit均不得让旧引用通向新进程。
- 对非阻塞短写，每次续写前重验能限制前台已换后的继续写入。零bytes前变化可none；一旦有bytes可能进入TTY，准确partial/unknown，取消剩余事务而不自动补CR。shared typed failure/原因两端共同扩展，旧helper缺能力准确unsupported，不默认接受未知guard字段。
- **内核观察与write不是原子操作。**即使前后两次tcgetpgrp一致，也存在检查后立即切组/同组新reader/同PID exec的窗口；group也不承诺具体程序读取。不能用TS mutex、锁master或SIGSTOP无关进程声称消除该竞态。契约应如实承诺“claim/续写前最新已核事实，检测到变化即拒绝或停止剩余”，不承诺按字节原子指定接收者；若需强接收者确认须另有真实Provider协作通道，目前无此能力。
- 如果切出再切回之间完全未被观察到，也不能声称已检测过该历史变化；当前重验只证明当下目标。实际observed epoch/source失效不得因切回而自动重试旧请求。

T08必须把此有限证据与局限写入原机器回执/文档，不以新增协议草稿暗改Spec。working不是自动拒绝条件，明确blocked/未知安全证据仍拒绝；prompt --wait先捕获activity基线并atomic join，新事件不关联特定最终答案。read继续T05被动cursor，不推动TTY/scroll；wait取消仅拆观察，不能stop。

## 4. 最小确定性真实Linux测试（当前全部未运行）

用隔离fixture目录/临时HOME和Root冻结的新helper/CLI字节。仅创建/清理自有进程；信号、进程组和输入必须是真实OS事实，不能mock foreground函数接受。

1. **native owned-root正例**：真实PTY启动绝对路径shell，禁profile/rc；等带pid/pgrp/TTY的确定ready握手。目标是唯一前台成员时观察confirmed；同guard经生产NativeHost/Session整笔submitPaste/输入，验证目标真实收到唯一nonce正文/CR顺序，finished=written。另一个Session继续输出/resize/stop，原ACK/reply/drain保持。
2. **不同前台组负例**：fixture通过独立FIFO/控制pipe（不是待测prompt输入）让shell/job-control把真实child组设为前台；等child和OS观察明确就绪，再以旧root目标发prompt。断言零目标正文/Enter、typed none/INPUT_NOT_READY或对应前台变化错误，shell与child均继续存活、无自动重试。child退出/明确交还前台后，**新的**观察+新请求应再次成功，旧请求不复活。
3. **同PGID/身份负例**：让另一reader留在原组，或以同PID exec不同程序；不能只靠PGID/birth匹配通过。PID复用不强求真实循环撞号，寿命句柄/解析层确定性fixture覆盖；真实exec替换和旧runtime/slot fence用进程测试验证。扫描不可读/超限、master已关均unknown/none，不伪confirmed。
4. **队列时序负例**：独立可控barrier使操作进入queue但未claim；此后切前台/取消/source变block，再释放。assert真实TTY零字节、无迟到CR。另以受控短写/背压在首片之后切换，收据unknown/partial且无重放；不以只检查exit0代替字节断言。native stdin/其他SID stop不被该probe/queue等待卡住。
5. **生产Agent prompt正向闭环**：T07真实huhu进程→生产router/usecase→Workspace/Session→NativeHost→真实helper→已接纳的可验证目标程序。用自有明确launch identity的fixture程序模拟受支持adapter的真实注册/就绪/配对clear事件，但**不mock native OS观察/写入/返回值**；观察queued/written、一次文本+提交、捕获activity之后的新事件wait和read原模型。然后同一路径真实换组/换实例/blocked拒绝。该组合证明生产代码有可成功分支，不能只跑native层shell通过或一律拒绝。

第5项的受控adapter事件不等于真实Pi/Codex/Claude认证。实现还应明确至少一个实际Provider的program identity/readiness策略可用；真实Provider协作及版本/E2E按既定分工交用户。若代码仍没有能将真实受支持Provider与OS身份绑定的策略，必须保留该缺口，不用fixture名字冒充Provider支持。

自有root/child/helper都在finally独立清理并核退出；timeout只用于有界观察，不用sleep猜已切组。不能对生产进程执行tcsetpgrp/kill，也不启动真实账号CLI。新binary必须与实际Rust源/producer SHA对应，旧T05二进制不能证明新guard。

## 5. 平台与精确派单缺口

- **Linux**：上面路径可从当前MasterPty+/proc扩展，先交可真实成功的owned-root及明确程序身份策略；真实foreground切换与claim拒绝须运行，不只是codec绿。
- **macOS**：portable Unix master同样有tcgetpgrp，job.rs已有proc_bsdinfo/getsid/出生时间，但前台guard尚未实施。可复用Unix语义；需macOS编译、成员/程序身份机制与真实TTY夹具，实机仍待用户。不把Linux通过写成darwin已验证。
- **Windows**：现per-session Job是cleanup范围，不是foreground输入owner；GetConsoleProcessList只列console附属进程。固定Herdr的descendant/runtime-marker/Git Bash路径是启发式，不能宣称等价证明。没有经验证正面机制时guard能力unknown/unavailable；普通manual TUI仍保留。需由T08正式Spec/平台交付明确实际支持范围，不能拿Windows cross-compile或Linux结果冒充Windows安全正例。

当前T08票只有session.rs/control*.rs和Session*等旧范围，不足以落此跨层接缝。建议Root正式补：

- **C/native-wire唯一owner**：`native/pty-server/src/{job.rs,session.rs,main.rs,frame.rs}`、`native/pty-server/tests/{stdio.rs,control-foreground.rs(新增)}`；必要自有fixture精确路径由C给出后纳入。`src/shared/native/{host.ts,input.ts,foreground.ts(新增),foreground.test.ts(新增)}`；`src/host/desktop/native/{host.ts,host.test.ts,helper.ts,helper-stream.test.ts}`；共同fixture `test/fixtures/native/terminal-foreground-v1.json`。字段/codec同源并由两端读同fixture，kind1能承载则不改frames。无新平台manager或daemon。
- **A/business**：既有services/control与core/control handler、Session*；补`services/terminal/sessions.ts`及其原captured-port测试、`core/workspace/managed-runtime.ts`（若实际前台snapshot需要扩字段）和真实生产组合`services/control/foreground-native.test.ts`（拟新增）。controller装配若确需改则精确加入controller.ts及对应测试；不要用Controller.target的焦点fallback。原prompt-runner/session-material只在仲裁实际闭包必需时动，保持原生全文/取消/仅粘贴。
- **T07单源描述**：实际canonical/生成物/CLI黑盒到T07交付后回读再追加，不先把拟名当文件已存在。T06 activity字段仍按最终freeze消费，不能现在重写其候选。

缺失的是同helper证据/claim guard、可验证程序身份/epoch、和Agent正面安全来源的实际组合；不是“再添一个状态enum”即可。无新增用户产品问题，本轮不冻结新协议/数值或赋予写权。

## 6. 固定来源复用

- 本地锁定portable-pty0.9.0（Cargo标MIT，官方仓库wezterm/wezterm），仅回读MasterPty和unix tcgetpgrp实现；版本文档入口：[MasterPty](https://docs.rs/portable-pty/0.9.0/portable_pty/trait.MasterPty.html)。没有读取其terminal renderer或任何GPL实现。
- Herdr固定`2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01`，Apache-2.0，活动/许可沿原R01/K01/K02保全证据；本次只比较[Linux foreground](https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/platform/linux.rs)与[Agent prompt校验](https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/app/api/agents.rs)。不复制其代码、不采用child-groups回退为确证；其测试child_pid为空直接true也不能作为HUHU正面生产证据。
- Root已核官方[Linux /proc](https://www.kernel.org/doc/html/v6.15/filesystems/proc.html)与[GetConsoleProcessList](https://learn.microsoft.com/en-us/windows/console/getconsoleprocesslist)事实直接复用；本轮无新网络认证/依赖检索。前者支持生命周期句柄边界，后者不提供前台owner证明。

READ-ONLY SOURCE STOPPED。SHA、实际读取范围、未验证边界和C瞬时源标记见配套JSON；阅读不算AC013–018验收。
