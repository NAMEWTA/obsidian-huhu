# 任务回报

Session: 20261026T045732Z  
Task: 027-t12-resume-preparation  
Status: completed

## 聚焦交接

027有界只读准备完成，未实施T12、未改变其ready/blocked_by或任何Goal状态。本轮没有生产probe、测试、PTY/helper、Provider、Obsidian或整构建，没有读取实际账号/凭据/原生日志或用户Vault。T08和全部产品继续SOURCE STOPPED。准备期间Root通知026独立R5已两轴通过，这是Root交接事实，不是本027复验结果。

建议由原SpaceService持久化完整来源与导入去重，WorkspaceService提供同一继续/定位用例，Controller、GUI和CLI只作适配；TerminalSessions及原native Session继续拥有pending spawn、代次与物理退场。占用增加为原native生命周期的本机私有能力，不另建daemon或第二套Session manager。先交T11完整来源resolver，再落T12，不把024建议当作已经存在的API。

三个关键缺口：

- `Controller.resume(row)`当前为历史行新建Session；`WorkspaceService.restore()`才有保留稳定Session、生成新runtime和活动附加的基础。两者不能混称已完成精确继续。
- 当前恢复引用主要是provider/accountName/nativeId/path，没有完整来源设备/root/locator版本；缺path时仍有nativeId+cwd首匹配回退。T12必须接T11最后交付的精确解析结果。
- 字面argv构造不等于Provider已具备严格exact resume。特别是本次固定Pi源码在`--session <path>`缺失/空文件时会初始化新会话，且可采用header cwd。仅在HUHU调用前检查文件，不证明交接后仍“缺源不空建”；未能证明的Provider/版本/参数组合应准确返回不可用，保留手动路径。

## 产物与验证

证据根R=`/tmp/huhu-t12-resume-preparation-20261026T152323Z-qg7w0lcc`。Root完整2073产品基线为`evidence/T-08-root-recovery1-integration3-final-input.json`，SHA `cb246dc43e682997184ad5d51eb04968e83b497e1dd6e689e0d8ccda1c892c2c`，原件副本R/input.json。R/source-manifest.json保存100个实际静态输入的SHA/字节/模式/CAS，SHA `dcc491f5038bd066869fb40011261a3b203d9bb034550f96d73f8692ff06ea86`，所列产品对该Root基线无漂移。它不是编译依赖闭包，也不表示全仓执行或测试通过。

027 TASK及初冻输入为GP032/Map33；完成时Root通知已正式GP033/Map34、T09仍ready且无产品写入。030因较早Goal行政更新先exit1并未写REPORT；原失败/脚本保留，031补存当时Goal原件，不覆盖初始manifest。最终行政差异与新CAS见final-source-audit.json：[{"path": ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/goal-plan.md", "before": "0c90d83cb72020b954e1f7a9d4ee28c7c6ca52e94cb8e1da289e60d4031be15c", "after": "951acaf68f011f9b0897c1d0ec644e8ddbe30cef62e79f233ce27385013c3eba", "kind": "Root administrative change allowed by TASK", "snapshot": "/tmp/huhu-t12-resume-preparation-20261026T152323Z-qg7w0lcc/objects/951acaf68f011f9b0897c1d0ec644e8ddbe30cef62e79f233ce27385013c3eba.raw", "mode": "0o600"}, {"path": ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md", "before": "c19603a58e6e2839982109be7ca7509a550d44ab1ed3e95864e1adb6d121ce80", "after": "8ef0da615ac6d8aaf45e66f48de33f6a18dc72d4abfe69e72fb6eafbd6b6ee1c", "kind": "Root administrative change allowed by TASK", "snapshot": "/tmp/huhu-t12-resume-preparation-20261026T152323Z-qg7w0lcc/objects/8ef0da615ac6d8aaf45e66f48de33f6a18dc72d4abfe69e72fb6eafbd6b6ee1c.raw", "mode": "0o600"}]。所列产品无漂移，本任务未改正式状态。024 REPORT `d34756553fab33ef2173f3469cb3da161ec766b92f7e10b522a40ba5d55c639e`及Root接收audit `c1ea4f2be6a76627851bbc72cfff950c152bcdaa943cc633564dc767bff58bf1`均作为只读输入保留。以下未写仓库前缀的路径相对`src/modules/agent/`，完整路径及原件在manifest。

### 1. 当前真实调用链与身份

```text
历史行只读展开 → 已加载HistoryRow正文/details（T11旧链，详024）
  明确点击继续 → Controller.resume(row)
  → parse accountKey → VaultSession
  → requireSpace(interactive) → prepareSession(新Session提交)
  → reserveManaged(新runtime) → resumeAgent → startAdmitted → Sessions.create

已有持久Session / restored Pane
  → WorkspaceService.restore
  → 活动/pending：attachManaged，零新spawn
  → 结束：prepareSession(existingSessionId)提交新attempt
  → reserveManaged → Controller.restoreSession → resumeAgent → Sessions.create
  → beforeSpawn再次核Space/owner/目录/代次 → 原native spawn/termination
```

| 入口与定位 | 当前事实及T12接缝 |
| --- | --- |
| `ui/history/SessionHistoryPanel.tsx:26–42,79–99,158` | 展开只切UI；继续、拖放对应的resumeAt和复制命令是其他动作。继续按钮直接调用Controller.resume，没有PAGE002所需显示来源/目标/cwd的通用继续确认；YOLO首次确认不是这项确认。 |
| `services/controller.ts:927–975,730–782` | row.accountKey JSON失败会回退`{}`，后续restoredAccountReference通常拒绝；不应让这个宽松解析成为新ref解码。选择Space后先提交新Session/attempt，再准备账号、来源和Provider。cwd必须与选中Space admission.cwd相同；选择另一目录不会暗改源cwd，但失败已可能留下有来源的新记录。没有完整ref去重或活动运行查重。 |
| `services/workspace-service.ts:1916–2056` | 读取持久record覆盖旧Pane中的agent/account/nativeId/path；同Session活动或launch-pending仅attach；结束时原persistentSessionId传给admit，成功后替换Pane runtime key。`restart=true`明确清nativeId/path并走fresh launch，不能作为resume失败回退。restoring集合只按tab+oldruntime去重，不能充当跨Pane/实例nativeRef锁。 |
| `services/controller.ts:1069–1132` | restoreSession按保存的agent/accountName解析当前设备账号；兼容旧默认账号。无path时history.scan后只查第一页，按nativeId+cwd找首行，不核row.provider/account完整来源。应由T11精确resolve替代这条猜测，不能补大页数或改成更宽搜索。 |
| `services/launch/launcher.ts:98–156` | resumeAgent先核注入Space cwd或旧Vault-only canonical门，再restoredAccountReference、checkAccountTranscript、enabled/YOLO、resolveCli，最后生成数组与host.start。settings中的程序路径/普通参数和env仍会影响本次启动；账号受核env后合并并覆盖同名entry.env。当前没有完整sourceVersion/原生Header身份或atomic交接证明。 |
| `platform/desktop/agents/accounts.ts:183–210`、`transcript.ts:8–40` | 账号env与当前可解析期望值严格比对；旧引用仅唯一映射才恢复。系统日志限定Provider来源目录、文件名和下层非symlink；托管日志限定账号根并经absoluteHuhuPath。其意义是账户/文件权限与范围，不是正文里的nativeId、源设备、物理版本或退出证明。checkAccountTranscript(undefined)直接返回，因此不能作“来源必有”的门。 |
| `services/spaces/space-service.ts:511–590,653–684` | prepareSession先提交runtime attempt；existing必须同Space、非归档且旧attempt已确认，未知/缺marker拒绝；beforeSpawn重核writer lease、Space/grant、实际目录、record与runtimeId，checkpoint按对应代次保存termination及nativeId/path。新导入record与“旧无attempt未知”必须有可区分语义，不能为导入放行所有旧无marker记录。 |
| `services/terminal/sessions.ts:193–244,630–706` | 先有已提交Session才reserve；同稳定Session的pending/disconnected/running保护，最终beforeSpawn、signal和generation门以及迟到spawn责任可复用。它没有全nativeRef跨Session键；不要在独立历史层复制此生命周期。 |
| `core/workspace/model.ts:7–17`、`services/spaces/records.ts:10–43` | ResumeInfo携spaceId/persistentSessionId/nativeId/cwd/accountName/path；SessionRecord有稳定id/space/provider/account及lastAttempt，records有Vault/device/physicalRoot。都不是完整NativeSourceRef，Pane runtime叶key不是来源或业务Session身份。 |

稳定Session ID用于业务归属；runtimeId每次允许启动变更；nativeSessionId是Provider命名空间内的ID；transcriptPath是当前来源locator，Pi还直接用它作为resume参数；accountKey当前是历史序列化env，不是可公开长期身份。T11建议的`provider + sourceDevice + stable account/system-managed + sourceRoot + nativeId + locator`仍是待实现合同，须保留provenance、字节版本与本机可继续映射的区别。不能只凭标题、当前账号设置、cwd或PID重解释旧来源。

### 2. 原owner内的最小路线

T11需实际提供有界只读的“精确sourceRef→归属/来源状态/版本→安全本机定位”能力，返回可判定的missing/corrupt/unsupported/changed与最小身份信息；不隐式重新扫描全账号、创建Session或原文副本。新启动计划只能来自经核resolver，普通配置在调用开始冻结，最终spawn门再核原证据。这里说的是所需合同，没有假造已存在的类型或export。

建议以下行为归入WorkspaceService内一个实际用例；可有history薄适配文件，不能各自维护状态：

| 调用 | 推荐外部行为 |
| --- | --- |
| preview | 仅T11来源投影，零Session、零native写占用、零PTY；读取缓存/helper与创建Provider进程分开计数。 |
| import(source, space) | 明确选择/传入Space，先验证ref/来源及归属许可，再由SpaceService串行持久化完整source绑定与证据；导入本身不spawn。不要借prepareSession新造一个“已经启动过”的runtime。 |
| 同ref重复导入 | 同Space幂等返回原稳定Session；同Vault另一Space已绑定则明确SCOPE_MISMATCH并给已有目标，不静默移动、复制Session或绑定两份。GUI可让用户另行打开已有目标。去重键不含Space，否则会绕过此约束。不同完整来源的同nativeId不合并。 |
| open / 活动resume | 原代仍活动/已接受pending则定位原Session；pending可返回准确pending，不因没有可渲染Pane重发spawn。其他实例只能在身份和同Vault路由都可核时定位，否则报告有主运行冲突；不能自动切到别的Vault。 |
| 已结束resume | 完整ref解析、Provider精确能力、当前设备/账号/来源、原目录授权及占用全部成立，保留Session/Space/id与标注，再提交一个新runtime attempt并spawn精确resume。源cwd与目标Space授权不相符直接拒绝，不按界面/目录相似自动换绑。 |
| 来源缺失/损坏/不支持/账号或grant失效 | 无spawn，不以空会话/fresh/fork补偿。保留原来源、已有Session和自有标注；返回准确原因。确定性前置失败不先暗建替代Session。 |
| fork | 仅明确单独能力/动作，显示创建新Session及原来源关系；本票不能把Provider仅支持fork包装成同Session继续。 |

导入唯一事实建议落SessionRecord的版本化source绑定，由SpaceService单writer验证并建立派生去重索引；T11 facts继续拥有历史标注/来源状态。读取时投影关联，不用两个JSON独立写入假装原子提交。旧nativeId/path可兼容读取，但不能未经精确证明自动升级。新增明确“只导入、尚无HUHU attempt”的provenance，保留旧无attempt未知的拒绝，随后在占用permit保护下进行第一次resume；是否以专门origin字段或等效可验证记录表达，由Root正式模型冻结后决定，不需向用户重问。

先完成GUI确认/Space选择和无副作用resolver检查；取消此阶段为零导入、零占用、零runtime。接受动作后：取得本机占用reservation→再次验证source/Space→提交绑定/attempt→绑定同一permit进入原Sessions/native spawn。业务记录提交失败不spawn；提交后取消或spawn失败必须按原代记录not-started/termination，不能声称跨文件/进程事务回滚。异步取消、超时、窗口焦点变化及模块关闭走原请求generation和finally，迟到spawn仍由原owner负责退场，不能丢给下一次调用。

### 3. 跨HUHU实例占用：可复用与新增边界

现有`platform/desktop/spaces/writer-owner.ts:8–10,15–97`按`device + Vault physical(dev,ino)`哈希到本机TCP监听端口。它保护同物理Vault设备的记录writer，不同Vault读取同一个系统原生会话仍可能各自拥有writer；不能把该lease或其端口键改名当nativeRef锁。其`exclusive:true`也明确不是Windows SO_EXCLUSIVEADDRUSE，不能据此增添未证明的全平台排他结论。

可复用的底层：

- `native/.../control/unix.rs:19–88`有当前euid、0700/0600、NOFOLLOW/CLOEXEC、文件句柄身份、只删除自己inode；runtime_root为受核XDG_RUNTIME_DIR下或`/tmp/huhu-ctl-<euid>`。Windows `control/windows.rs:197–286`有本机LOCALAPPDATA、owner/DACL与reparse拒绝、volume/file-index身份。原runtime_root可能有环境覆盖，原生引用全机锁需使用协议固定的每用户机器根/选择规则；两个参与实例不能因不同临时目录配置建立互不相见的锁域。
- `control/locator.rs:32–84,126–153,196–213`有完整实例/物理Vault核验、私有文件有限读、nonce、发布与自有身份撤回；用于找到并核对claim owner，locator token和环境hint本身不证明原Provider已退出。
- `control/locator.rs:89–110`及Unix `retire_dead_endpoint:191–221`确认无listener后可安全撤自己的旧IPC原件；这只证明该endpoint死，不能扩成其曾启动的Agent/进程scope都gone。
- `shared/native/termination.ts:39–70`、native `session.rs`/`job.rs`分开root、scope cleanup、output；已有not-started、confirmed、unknown/partial和原始物理fence。数字退出码/EOF/idle/Stop Hook不证明scope清理。Unix job捕获进程开始身份/会话；Windows Job有kill-on-close，但正常/故障结果仍要实际证据，不凭helper消失宣布锁可回收。

推荐最小方案为原native Session中的**私有OS互斥句柄 + 有界占用状态记录**，经Host端口附到原spawn/termination责任；不增加外部daemon。互斥按完整经验证引用派生的本机写命名空间取key，至少含provider、物理账号/来源根、精确native/locator身份。Vault/Space/runtime/当前读取设备不能进入排他分区，避免同系统source在两个Vault或别名下绕过；sourceDevice仍保留为来源provenance。不同来源同ID要分开；经核alias/轮转指向同一实际可写原生对象时必须归同排他key。hash只作文件名，记录内核完整canonical key并比对，不以短hash碰撞判同源。

建议Rust侧优先使用现有工具链支持的非阻塞文件锁；[std File::try_lock](https://doc.rust-lang.org/std/fs/struct.File.html#method.try_lock)自1.89提供，文档说明Unix当前用flock、Windows用LockFileEx，也说明锁可为advisory且非持锁I/O行为依平台。实施前核最低工具链及五平台；不足时复用现有libc/windows-sys平台封装，不先增加crate。锁只约束参与HUHU协议的调用，手动复制命令和外部Provider进程不参与，不能声称约束它们。

占用intent须先通过自有句柄持久保存并确认，再允许spawn；无法确认写入的崩溃窗口保持unknown，不用旧released状态推断新请求未启动。状态记录只含完整ref/key、随机claim nonce、owner实例/物理scope、稳定Session+runtime generation、阶段与确证退场事实，不写凭据、全文或可同步Vault。限制条数/字节/锁等待与同一个原spawn期限；对未知版本、权限、损坏记录、无法核同一打开对象或根被换保持拒绝。锁文件不得在可能仍持锁时unlink再重建，否则会形成两inode两owner。临界区需短，磁盘/owner查询不能占全局Session锁或PTY读循环。

| 阶段/异常 | 必须保留的责任 |
| --- | --- |
| 同ref并发claim | OS互斥只给一份permit；其他有界返回现owner/pending/conflict，不先各写Session再用查表补救。不同ref并行。 |
| reserve后未发spawn、取消或持久化失败 | 只有确认未进入原native spawn责任并完成本地回调/fence，才写not-started并退占用；同nonce和代次核对。 |
| spawn-sent、晚返回、断连/超时 | 原claim保持pending/retiring；由原native slot处理迟到root并结算；观察者取消不释放可写资格。 |
| root退出而scope仍partial/unknown | 继续占用，不凭exit code/idle/output EOF解锁。正文/输入/物理清理fences沿原生命周期join，不能提前释放slot、bytes或editor责任。 |
| 正常确证结束 | 持久化同代终结事实，按自有句柄/nonce完成有限清理再释放；旧代回调不能清下一代claim。 |
| helper/app崩溃 | OS锁释放不等于child已死。保留持久本机未确认记录；新owner只有核实原scope确已结束或原请求从未spawn后才接管。PID须配开始身份/可核scope，mtime/TTL、ECONNREFUSED、PID不存在探针或权限错误不能单独偷锁。 |
| 崩溃窗口中未能留下可核root身份 | 保守unknown/conflict，不用超时推定安全；先把可证明恢复范围做实，不能为“自动恢复”盲放新运行。可见诊断与用户手动路径保留，不新增自动强杀/重启。 |

新能力应由实际helper协商确认，未具备的平台/版本不能广告可用。它不是所有启动均需新daemon，也不能用claim来改变原业务/目录授权。正常退出和崩溃回收要分开验收；本027仅给方案，未验证任何文件锁或native扩展。

### 4. 六种Provider的实际argv与能力判定

当前`scope.ts:46–63`只剔除`--resume`/`-r`/`--resume=...`后追加选择器。令L为`accountArgs(provider, launchArgs(frozen settings), verified account env)`，当前真实构造为：

| Provider | 现有file / 参数数组尾部 | 官方语义与必须补的门 |
| --- | --- | --- |
| Claude Code | resolved `claude`，`[...L, '--resume', nativeId]` | [官方CLI reference](https://code.claude.com/docs/en/cli-reference)允许ID或name，`--fork-session`另建ID。必须用已核ID，排除continue/picker、fork及冲突selector；不从名字匹配。文档不证明所有版本在来源替换竞争下的失败语义。 |
| Codex | resolved `codex`，`[...L, 'resume', nativeId]` | [OpenAI官方命令文档](https://learn.chatgpt.com/docs/cli/reference)区分resume与fork，并说明当前cwd与会话目录不同时可出现目录选择；不能默认原cwd传进spawn即为最终工作目录。managed账号的`account-args.ts:6–9`还在`--`前添加file凭据store/sqlite_home/log_dir配置，system账号保留原配置。 |
| Gemini | resolved `gemini`，`[...L, '--resume', nativeId]` | [官方session文档](https://geminicli.com/docs/cli/session-management/)区分最新、索引序号和完整UUID，来源按项目目录隔离。只用完整已核ID并核项目；不能传索引/省略值或相信当前目录自动选对。 |
| OpenCode | resolved `opencode`，`[...L, '--session', nativeId]` | [官方CLI文档](https://opencode.ai/docs/cli/)有`--session`与单独fork选项；当前resumeArgs没有剔除旧`--session/-s`。Provider项目/数据库命名空间与版本必须与精确source吻合。 |
| Pi | resolved `pi`，`[...L, '--session', transcriptPath]` | 必须是原件的完整安全path，不能换成nativeId/partial ID。固定版本下缺失/空源可初始化、header影响cwd，详下；仅生成数组不能广告严格exact能力。 |
| Grok | resolved `grok`，`[...L, '--resume', nativeId]` | [官方headless文档](https://github.com/xai-org/grok-build/blob/main/crates/codegen/xai-grok-pager/docs/user-guide/14-headless-mode.md)说明ID/标题选择、缺源报错及fork另建；这里是headless文档，不把它冒称全部interactive版本已验证。UUID形值走ID，禁止用title/continue；worktree和session-id等可能改变来源/新建语义必须按版本门控。 |

所有file经`resolveCli(detectCommand, entry.cliPath, captured PATH)`，cwd来自已授权Space或原legacy Vault校验；env仍含当前普通entry.env和已核account env。程序检测成功、TUI活着或Hook显示idle不等于恢复了请求的native ref。新能力须在真实Provider启动/关联后核同一预期nativeId/path，不能靠标题或某次agent_start就宣告继续成功。

现有剔除循环不是完整CLI parser：`--resume`可能是前一选项的字面值；`--`后的token属于位置参数却仍被扫描；Codex的`resume id`追加到`--`之后可能成为prompt；Pi/OpenCode原`--session`、各CLI的continue/fork/no-session/显式新ID等仍保留。建议在原launch/resume owner新增有限、按Provider/版本的参数消费判定，保留原settings、不用shell重解析、不无声删除不明用户参数；无法证明组合精确时拒绝并给准确能力原因。复制命令formatter只负责POSIX/PowerShell正确引用，不能由格式化字符串反推实际argv。

#### 固定Pi边界

官方仓库原badlogic链接现重定向earendil-works/pi。本次API固定commit [`f9daca3480732d0042b1df3a6e27221f597a620d`](https://github.com/earendil-works/pi/commit/f9daca3480732d0042b1df3a6e27221f597a620d)，commit日期2026-10-26T13:28:25Z，package.json版本1.4.0，MIT许可；R/pi-pinned-manifest.json含API和5份固定HTTP200原件及SHA。它们与此前捕获moving main的4份相关字节相同。这不是T08官方实跑artifact的版本或验收，不把新上游分支替换原T08候选。

- [main.ts](https://github.com/earendil-works/pi/blob/f9daca3480732d0042b1df3a6e27221f597a620d/packages/coding-agent/src/main.ts#L252)路径形参直接进入path分支；391–397进入openSessionOrExit/SessionManager.open。686–708先选session再确定runtime cwd，缺cwd还有交互/退出分支。
- [session-manager.ts](https://github.com/earendil-works/pi/blob/f9daca3480732d0042b1df3a6e27221f597a620d/packages/coding-agent/src/core/session-manager.ts#L1029)1032–1062：已有零长度文件会newSession并rewrite；缺文件会newSession并保留显式path；非空但没有可解析entry才报错。1766–1786从header决定cwd后构造。此为静态可定位路径，不宣称已用真实日志复现。
- [CLI文档](https://github.com/earendil-works/pi/blob/f9daca3480732d0042b1df3a6e27221f597a620d/packages/coding-agent/docs/cli.md#L84)还区分`--session path|id`、可缺则创建的session-id、fork与continue。T12不能退到这些相邻参数。

因此若实际安装版本也有该语义，单次lstat/读取header后传path仍有交接竞争；必要的是Provider支持的失败关闭交接或可证明保持原打开对象/来源的实现。不能复制日志到新路径冒充同源继续，不能把早于/晚于SessionManager的扩展回调当未核的原子门。没有可验证办法时该版本/组合的安全继续保持unsupported，仍可只读和人工继续，等待原生安全能力；这属于既有“不满足则明确失败”的边界，不需改Spec来放行。未来正式实现需针对实际安装原件重核，不能用本次1.4.0源码替代实跑证据。

### 5. 最小拟写集与owner

以下都是后续候选，**本027未授权写入**。Root应在T11真实接口交付、T09共享schema/Pane稳定后重新冻结；T12旧写集需要正式增补，不能直接照glob动共享路径。

| 精确候选路径 | 原owner职责 |
| --- | --- |
| `core/history/`内T11最终来源类型/codec及其实际test | 复用完整ref/状态/版本，不新建重复DTO。只有T12增量能力确实需要时补字段。 |
| `services/spaces/records.ts`、`records.test.ts`、`space-service.ts`、`space-service-lifecycle.test.ts` | source绑定、同ref串行唯一导入、已导入/旧未知区分、原Session新attempt；单writer兼容读取。旧T12未包含spaces路径，Root先分配。 |
| `services/workspace-service.ts`及就近`workspace-service-spaces.test.ts`/`workspace-service-launch-failures.test.ts` | 一个继续/打开用例，活动attach、既有Session身份、取消与迟到generation。复用restore/managed生命周期，不把新服务限制成必须有Pane。旧Ticket未包含此路径。 |
| `services/controller.ts`、`services/launch/launcher.ts`、`launcher-space.test.ts`、`platform/desktop/history/scope.ts`/`.test.ts`、`resume-command.ts`/`.test.ts` | 接T11 resolver和捕获计划；替换nativeId+cwd回退；按真实CLI有限参数门、字面数组及复制命令。旧复制formatter保留为复制出口，不作为执行器。 |
| `platform/desktop/native-reference/lease.ts`及`.test.ts`（拟新增） | 仅桌面端口适配/安全source-to-local key/owner诊断，不拥有另一个runtime map或daemon；实际锁由原native生命周期持有。 |
| `services/terminal/sessions.ts`及`sessions-space.test.ts`；`src/shared/native/host.ts`及`src/host/desktop/native/helper.ts`的必要就近测试 | 将同一reservation与原spawn代次/物理settled关联。须Root正式补共享Host写集，保留023物理fence与shutdown typed结果、F1–F7回归，不旁路Transport原责任。 |
| `native/pty-server/src/native_reference.rs`（拟新增）、`session.rs`、`lib.rs`/`main.rs`必要声明及`control/unix.rs`/`windows.rs`最小OS封装 | 本机私有锁、有限journal、同代spawn/退场join；不改可同步Vault当全机锁，不开另一监听daemon。按实际分层决定模块位置，不为准备预设新wire。Rust不在旧T12写集，Root先冻结精确协议、owner和验证闭包。 |
| `services/control/history.ts`（T11交付后实际文件）、`services/control/commands.ts`与就近tests；canonical `src/shared/native/control-schema.json`和必要generated/fixtures/CLI grammar tests | CLI与GUI调用同一实际use case；history.open/resume/import目前均available=false且无handler。helper内部claim协商与公开history能力分开；只有实际可用时广告。commands/schema/generated不在旧写集，Root/唯一协议writer串行整合。 |
| `ui/history/SessionHistoryPanel.tsx`/新增`.dom.test.tsx`、现有terminal继续入口的实际组件、`i18n.ts`、`docs/agent-workbench.md` | PAGE002确认显示来源/账号设备/目标Space/cwd，取消、只读/冲突/unsupported可见；PAGE001继续与活动定位同路。T09 Pane owner变化后重核，不按旧runtime叶key发明新paneId。en/zh产品文案，中文维护文档。 |

历史facts模型/全量迁移属于T11/T15，不在T12擅自重写旧账号/来源；备份与导入不带本机占用/活动endpoint/锁/凭据，交T16。根main.js/styles及生成预算/通知仍Root独占。本方案不用新依赖；若实际最小协议落点与上述不同，先回读真实闭包并修正式写集。

### 6. 后续验证矩阵与复用

本轮未运行下列任何测试。已读现有`scope.test.ts`的既有resume参数断言、`resume-command.test.ts`字面复制、`launcher-space.test.ts`Space gate/账号env优先/YOLO/Pi路径；`transcript.test.ts`Vault别名/内部junction拒绝；`workspace-service-spaces.test.ts`显式Space取消零admission、持久失败零native、目录替换最终gate、关Pane不杀runtime与重附加；`space-service-lifecycle.test.ts`未确认attempt拒覆盖；`sessions-space.test.ts`晚spawn/断连与terminate证据。旧fixture多数验证launch/Shell，不冒称已验证六种真实resume。

| 需要新增或扩大 | 必须观察的结果 |
| --- | --- |
| 同nativeId，两个账号/device/sourceRoot/locator；标题/cwd相同 | 完整引用不串正文、标注、导入或占用；非法/缺env、缺设备映射拒绝而不默认当前账号。 |
| 同ref同/跨Space同时import与重复调用 | 一个稳定Session；跨Space明确已有归属，持久化失败零spawn；preview零记录/zero PTY。新导入无attempt与旧无marker未知不混同。 |
| 活动/pending重复resume，结束后再次resume | 活动附加原代，pending无重复spawn；结束保持Session、更新runtime；旧代迟到事件不能改新代、清新claim。 |
| 两独立进程/不同Vault实例竞争同ref与别名 | 只一份OS许可/一可写spawn；不同ref可继续；检查真实文件/锁权限、owner scope、full key与句柄，而非仅Mock单进程Map。 |
| reserve/persist/spawn各阶段取消、timeout、关闭，晚spawn/退出晚到 | 不提前退占用；原physical fences、bytes/count、editor/local callback+drain按实际结算；next明确调用仅在确证后可接管。 |
| helper/app崩溃、socket死、PID复用、权限拒绝、journal替换/部分写 | unknown不偷锁；自有inode/nonce清理；有界结束，正常结束与可证明崩溃回收分开；不写源/不删他人原件。 |
| 源缺失、空/损坏、同尺寸替换、symlink/父目录交换、轮转、grant失效 | 不fresh/空建/fork；保持原事实；必须覆盖HUHU最后检查之后到Provider实际open的竞争。Pi固定原件只证明风险，正式目标需自身guard红绿。 |
| 六Provider精确argv及选项值/--边界 | 中文/空格/引号/`$()`/反引号单参数；`--resume`作为值、重复selector、continue/fork/no-session/worktree/print/remote与未知组合准确拒绝；不得输入恢复提示词或放宽未知。 |
| GUI与真实受控CLI | 同捕获Space/source/use case，非交互需配置则明确失败；完整49152B JSON envelope，effect=none/unknown准确，cancel不自动重试。未来真native/受控进程组合可以测进程与占用，但不冒充六Provider账户实机E2E。 |
| PAGE001/002 | 预览/确认/取消、活动定位、missing/unsupported/partial/冲突、键盘焦点返回、宽窄/200%缩放/减少动效；原型fixture不作生产截图。 |

按TASK/Spec §11和Ticket E2E disposition，真实Obsidian/Provider/OS IME/五平台由用户验收：Codex与Claude记录原nativeId、停止并继续，至少一次跨实例冲突与取消，及各已广告Provider实际版本失败边界。Agent后续负责代码、隔离真实native/业务闭环、类型/lint及Root统一构建；本准备没有代做、跳过或预填AC037–040/061通过。

### 7. 外部参考、执行收据与限制

复用当日reference-notes R01/R05及024已固定Herdr registry/Apache-2.0字节与2026-10-23活动commit，采用live runtime与纯状态分离，不采用自动重启语义。R05固定WezTerm [`e2a98e1...`](https://github.com/wezterm/wezterm/commit/e2a98e1b8af156988ad0ac778658ac27b60a55fb)的[MIT原文](https://github.com/wezterm/wezterm/blob/e2a98e1b8af156988ad0ac778658ac27b60a55fb/LICENSE.md)与[pty Cargo](https://github.com/wezterm/wezterm/blob/e2a98e1b8af156988ad0ac778658ac27b60a55fb/pty/Cargo.toml)本次HTTP200回读，已有portable-pty 0.9/Unix与Windows依赖继续复用，不引入WezTerm GUI或把PTY抽象当完整进程scope证明。K01/K02/K05的Hook、非ASCII、Windows问题仅作风险方向，没有声称当前HUHU或所用版本重现。

六Provider少量官方文档、Pi固定源码、Rust官方锁文档及许可原件的URL/UTC/HTTP/SHA在R/external-manifest.json、external-followup-manifest.json、pi-pinned-manifest.json。除已明确固定的Pi和portable-pty之外，其他Provider页面是本次捕获的移动文档快照，不称固定安装版本或实机行为。原badlogic LICENSE请求SSL EOF失败保留，随后earendil目标及固定commit LICENSE成功；没有覆盖首个失败。没有读取/复制GPL终端源码、执行远程代码、添加依赖或操作Herdr工具。

R/commands的001–029保存实际argv/cwd/开始结束UTC/exit/raw及执行文件SHA；其中002/006/018/021/023是指向不存在旧/拟路径的检索exit2，原错误保留，后续按真实路径阅读；它们不是产品红灯或测试失败。首个bootstrap读取与证据根创建发生在runner建立前，仅保留宿主工具记录及本次实际源快照/创建UTC，没有独立开始UTC收据，不能重构成历史原raw。网页工具检索/打开也以当次工具记录为准，HTTP字节另由017/020/029真实获取固定，未把搜索摘要当源码。

030写入前检查因Root Goal行政更新实际exit1，未写报告；031保存其当前原件。032保存原子报告写入及最终100项所列source复核，final-source-audit.json同时校验19份成功HTTP原件（含重复固定原件/API）；033随后实际return结构校验，最终delivery只在其actual0后生成。结构校验只验证报告格式，不能认证来源安全或AC完成。本轮没有执行source导入probe，静态链已足够区分路线；不为阅读堆测试。

## 问题与下一步

Root可按上述建议在既有合同内决定工程表示，无需向用户重问Space/继续/冲突范围。依赖仍是T11完整来源与T09实际控制/Pane接缝；实施前回读其变更，正式扩T12最小Space/Workspace/Sessions/Host/native/schema写集并确定唯一owner。Pi等Provider的严格交接若未证明，则准确保留unsupported，不能以追加argv、一次成功、提前文件检查或手动观察代替。

本027只写REPORT及新R。未创建进程服务、PTY、listener或临时账号/Vault，无对应运行资源需要清理；只保留自有静态来源与收据，没有删除旧证据、缓存或bin。旧024/023和所有产品、规范、正式状态保持只读。READ-ONLY SOURCE STOPPED。
