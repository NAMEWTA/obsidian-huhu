# T-18 platform-acceptance 只读工程预检

观察：2026-10-25，GP014 / Map15；workspace `/home/wta/orca/workspaces/obsidian-huhu/terminal`，Root声明 branch `NAMEWTA/terminal`、base/HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`。本轮没有运行Git或测试、构建、lint、cargo、helper、Provider、真实Obsidian；不是独立审查或候选验收。只写本报告与对应source-observation JSON。T03修复已SOURCE STOPPED、Root正在集成；此处hash仅观察时点，不是冻结快照。

## 1. 执行边界与可落地路线

已沿 workspace/catalog → 当前Map/Ticket/Goal → dev/ui适用规则、测试/构建发行参考、Spec §3/§11、implementation-contracts、LOG027/030、批准DESIGN四页与固定reference-notes读取。最新合同将Agent代码实施、自动化、构建与独立双轴审查，和用户实际Provider/宿主/五平台端到端验收分开。**代码证据完整且适用门通过，可以交付待用户实机验证；本机测试或CI矩阵配置不能写作五平台实机已通过。**

T18主责AC061/063，阻塞于T17。不是重做18票、临时补造业务平台或另建browser/runtime owner；路线是收集每票可回读证据、补真实生产接缝的最终跨票自动化、完成四页代码/局部视觉检查、固定整个change真实输入后独立审查，生成同一版本的用户手工步骤与未验清单。T07、T13–16尚未冻结的schema/CLI/owner在它们完成后再读，不作为当前API。LOG030要求所有新受管运行显式绑定Space；旧定义保留unbound、旧invocation/receipt保持查询原字节/原native结果，迁移/恢复不等于执行。不得从cwd、焦点或单候选补绑。

票的最新标题、ordered steps和AC063已表达上述分工，部分objective/planning-reason/unresolved仍保留“缺平台实证即阻塞”的旧措辞；应以更新的Spec §11和LOG027为准，Root可在正式记录统一解释，本预检不改正式工件。缺机器不是把代码通过项降为失败，也不是允许把未运行项标通过。

## 2. 真实可复用入口及范围

| 当前入口 | 可复用的真实行为 | 不能从它推出的结论 |
|---|---|---|
| `.github/workflows/terminal-build.yml` | 同一github.sha的五个native target，cargo test/build locked release，运行当前helper verifier，打包helper+sha256。 | 现仅huhu-pty，没有未来CLI；配置存在不代表当次runner实际成功，更不代表真实Obsidian/Provider。 |
| `.github/workflows/lint.yml`、`test/release/workflow-gates.test.ts` | Linux Node22/24、Windows Node24检查配置；固定同SHA、失败传播、检查命令顺序的约束。 | 门的源代码断言不能代替真实CI运行日志，也不证明macOS/arm64宿主。 |
| `package.json`、`scripts/run-all-tests.mjs`、Vitest配置 | build含生产与测试tsc/样式检查/esbuild；test:all串行枚举test:*并传播非零。 | test:all可能重复Vitest、进入Chrome等环境；exit0仍可能含skip，必须列实际项目/用例与skip原因。 |
| `scripts/verify-pty-helper.mjs` | 真实stdio protocol3 hello、shell输入/resize、退出码4、1MiB流控暂停/ack恢复、stdin EOF退出；Windows含ConPTY探测应答。 | 当前不验证未来control major1或huhu CLI业务；异常断言路径需保证finally kill并await exit后清理，不应只凭成功路径认为没有子进程。 |
| `services/terminal/sessions.e2e.test.ts` | 本机真实helper的TerminalSessions输入/resize/native错误等。 | 搜索release/debug裸huhu-pty，Windows明确skip，缺binary也skip；不应引用为Windows或五平台证据。CI注释称先build不能代替实际job顺序/日志。 |
| `scripts/obsidian-acceptance/fresh-vault.mjs` | 新绝对空目录、独立HOME/USERPROFILE/XDG/profile、复制固定插件产物、CDP、信任提示、截图/日志、停止清理。 | 是侵入真实宿主的手工工具，当前禁运行；现quit超时SIGKILL后还应核对exit观察，不可删除仍使用目录或复用用户Vault。 |
| `terminal-reliability.mjs` | 真实release下载安装、摘要失败/下载异常/离线缓存/重启等；可选真实Codex，部分代理故障夹具。 | 硬编码win32-x64资产及cmd，不能不改就宣称五平台；禁止HUHU_PTY_BINARY且要求已发布同版本，不能直接当未发布candidate验证器。 |
| `workbench-probe.mjs` | 真实宿主导航/模块开关/工作台/设置/1500、900、500宽度及恢复。 | 不是Space/受管runtime/Provider合同验收，旧controller暴露和新接口需到实施时重读。 |
| `agent-page-tabs.mjs`、`workbench-window-owner.mjs`、Browser相关脚本 | 有旧页面、主/弹窗归属和guest/cookie/recovery夹具，可复用其宿主准备、截图与清理思路。 | 旧automation tab等假设已失效；单页fixture/注入usage不等于真实Provider配额或新owner通过；T13未交付前不猜API。 |
| `release-vault-install`脚本 | 新Vault、同发布版本安装、真实platform资产映射/摘要、重启缓存等。 | 依赖已发布资产；准备阶段不能触发tag/release/远程workflow或将本地candidate冒充官方release。 |

现无 `scripts/obsidian-acceptance/agent-workbench-*.mjs`。未来可在票已允许的新路径编排真实公共API，但不要调用私有对象推测实现，也不要把UI脚本的mock返回值当native/Provider成功。脚本预检必须明确candidate来源：固定本地受控binary验证与正式release下载验证是两条不同来源链，输出中保留source/version/hash，不互换。

## 3. 64 AC 的最终对账输入

以下是Map15主责的完整64行分组抄录，**是责任观察，不是通过状态**。T18只汇合，不把上游状态复制成新权威；每条应链接主责Ticket的行为、自动化原输出、输入SHA、review结果及未验限制。同一测试可支持多条，但需指明观测断言，不以“unit全绿”替代合同。

| 主责 | AC |
|---|---|
| T01 | 057、059 |
| T02 | 001、003、053 |
| T03 | 005、008、026 |
| T04 | 027、028、029、056、058、060 |
| T05 | 031、032、054 |
| T06 | 007、020、022 |
| T07 | 004、006、010、011、012、052、055 |
| T08 | 013、014、015、016、017、018、021、030 |
| T09 | 009 |
| T10 | 002、023、024、025、046 |
| T11 | 033、034、035、036 |
| T12 | 037、038、039、040 |
| T13 | 041 |
| T14 | 042、043、044、045 |
| T15 | 047、048、049 |
| T16 | 050、051 |
| T17 | 019、062、064 |
| T18 | 061、063 |

特别追踪Map跨票切片AC002/004/006/021/046：身份证明或端口单测不是最终自动化、CLI、邮箱/生产者接线的验收；最终producer必须和真实接收端组合。上游T01/T02/T03已交付内容也要在最终相同输入上核对未失效，不重写历史或把仍在review的代码当done。T04/10/11未来schema未冻结时，将对应行标“待生产接线重审”，不生成虚假的field fixture。

7个NFR还需独立检查闭包：001有限输入/输出/查询/缓存及取消背压；002有限关闭/停止、残留unknown可查；003当前Vault与scope、凭据不进日志/argv/备份；004复用现有xterm/Rust/组件而无第二服务；005主题/语言/焦点/键盘/reduced-motion；006effect/phase与业务结果分离、partial/timeout/unknown不自动重放；007五平台分层证据与活跃、许可明确的来源。不能仅凭64个AC勾选推导NFR自动通过。

## 4. Root最终可独立执行的代码检查

本轮全部NOT RUN。只有各writer SOURCE STOPPED、输入固定后，由Root按当时package与testing选择表执行；具体命令以真实脚本为准，保留cwd、exact argv、工具退出与子进程真实退出、stdout/stderr路径及SHA。不得把工具exit126写成内部测试成功，也不得擦除首次失败。

1. 固定完整输入：原始实施base `33c21e0…` + 全部实施源码/测试/文档/合法依赖/产物manifest + 版本与CI文件 + 所有前票已验收脏改。独立review从整个change实施基线到最终候选，不只审最后一票或最后一轮delta；规划历史commit不能错当本次实施base。当前不执行Git取差异。
2. 构建/静态：所需CSS生成后build生产/测试tsc、样式、full lint、architecture/懒加载/未await Promise/i18n/docs/bundle/第三方notices等适用门；比较源码与main/styles，生成物只Root写。预算变化必须有真实测量，不放宽阈值掩盖回归。脚本清单从当前package读，不把旧日志当新候选运行。
3. 行为闭包：各票真实service/FS/owner/native故障路径，跨Space并发启动、布局dirty/在途save、detach/attach/stop、只读restore零spawn、owner丢失、drain/BUSY；后续CLI/automation/mailbox/backup等完成后加真实生产组合。确认用例中没有整体mock业务service宣称生产已过。未变的UI截图/B进程边界测试不因汇总重复运行，输入变化后才扩大相关闭包。
4. 发行链：五target cargo与打包矩阵真实日志；T17双角色资产/版本/schema/协议/摘要/许可证集合；临时fixture的负例和本机真实binary黑盒。可以准备脚本和本机适用自动化，未经授权不触发远程CI/tag/release/安装用户Skills。平台执行结果逐target列明，未运行不能用别平台代替。
5. 四页代码/局部视觉：按下节检查；本地Chrome生产组件harness注明隔离宿主/受控数据范围，保留DOM断言/尺寸/截图时点。不会冒充Obsidian/Provider E2E。
6. 完整独立双轴审查：标准轴与规范轴使用相同冻结manifest，包含全18票+DESIGN四页+i18n+最终64AC/NFR追踪。未解决请求修改保留待验状态；修后保存原反例红灯、绿灯和新manifest再复审。不以本只读预检替代review。

版本/摘要/未知资产拒绝至少覆盖：缺失/重复/额外资产、错误role/platform/arch、空文件/sha格式/错误bytes、跨role/版本receipt、污染offline缓存、旧协议/缺capability、发行版本组合不一致。坏摘要应exec0且保留旧有效bytes；已验证binary的协议负例允许启动hello检测，但业务spawn/input/commit0并清理进程/lease。检查CLI help/schema/Skill所有示例实际一致，不将native stdio3误写为control major1；未知资产应明确拒绝而非猜名、回退另一架构或忽略额外文件。详细实施接缝见T17预检。

## 5. 五平台用户人工矩阵

当前均“未运行，由用户按固定版本执行”。CI runner列只代表配置观察，未来需填实际job/version/hash/result。每平台一份独立记录，不从同CPU或同OS推导另一行。

| 平台 | 当前native runner/target与helper资产 | 人工特别观察（通用合同另列） |
|---|---|---|
| Linux x64 | ubuntu-22.04 / x86_64-unknown-linux-gnu / huhu-pty-linux-x64 | 本机真实shell/权限、文件与外部目录、输入法/剪贴板、关闭与子进程残留。 |
| Linux arm64 | ubuntu-24.04-arm / aarch64-unknown-linux-gnu / huhu-pty-linux-arm64 | 实际arm64宿主与binary，不以交叉编译代替；其余同通用矩阵。 |
| macOS x64 | macos-15-intel / x86_64-apple-darwin / huhu-pty-darwin-x64 | 真Intel宿主、下载/运行授权、IME、主/弹窗焦点、shell/账户路径。 |
| macOS arm64 | macos-15 / aarch64-apple-darwin / huhu-pty-darwin-arm64 | 真Apple Silicon宿主，拒错架构；其余同通用矩阵，不借x64兼容运行证明arm64资产。 |
| Windows x64 | windows-latest / x86_64-pc-windows-msvc / huhu-pty-win32-x64.exe | ConPTY与真实cmd/PowerShell、中文用户名/目录/PATH、IME/剪贴板、Job/关闭回收、重开与owner冲突。 |

每行记录：候选版本/commit与main/styles/helper/CLI SHA、OS/arch/Obsidian与Electron版本、账户/Provider版本（脱敏）、locale/theme/显示缩放、是否本地受控candidate或官方release、准备命令、步骤、实际结果、日志/截图、失败后的可恢复路径。不要记录token/prompt敏感内容；测试仅新隔离Vault/账户目录，用户真实Vault须另行明确选择，不自动改系统CLI状态。

通用人工场景：
- 首次启用/空Space：Agent disabled仍可用独立Browser，普通浏览/查询不启动helper/Provider；两个明确Space A/B、取消选择、外部目录重授权/拒绝，不猜cwd/focus。
- Codex/Claude真实交互与权限对话：前后台创建、名称、等待输入/运行/结束阶段、中文与长输出、输入Ready与业务结果区分；另四Agent保留原交互入口与无证据能力的诚实unknown，不把AI文本当结构化成功。
- 两Space并发/切换/新旧代次：无串线，后台晚返回不抢焦点；detach关闭仅视图、可重新attach；真正stop/end语义独立；应用重开只读恢复零spawn，显式继续/重启才执行。
- CLI本地作用域/授权/幂等/长度/超时/背压，自动化旧定义unbound/后台失败、旧回执查询不重放；目标Session材料投递与确认/失败按最终schema，不从当前不存在API编造步骤。
- Browser owner/Cookie/Profile/主webContents与Portal安全边界、Agent关闭/无Space独立使用、恢复迁移、向冻结目标Session投材料、主/弹窗切换不抢焦点，原网页菜单保留。
- mailbox/通知read/receipt/tombstone、自动化/看板/调用journal、完整迁移/备份往返、库外授权、stage/journal崩溃恢复、BUSY/drain、错误版本/digest/owner冲突拒绝、旧版回滚不覆盖新数据。T15/16交付后以真实schema重写精确步骤；导入不能自动启动/重放。

这些是待落实步骤矩阵，不是当前实现/完成声明。Provider付费、登录、人工许可、五平台原生宿主由用户执行；Root可提供可复制的准备脚本与预期观察，不代替用户打勾。

## 6. 四页设计与局部UI验证

PAGE001工作台、PAGE002详情/邮箱、PAGE003设置/迁移、PAGE004备份恢复按DESIGN批准内容逐控件映射。保留既有导航/菜单、焦点、键盘、IME、Portal所属document；T09之前的最小接线不等于已全面重构侧栏。每页至少列normal/loading/error/empty及适用pending/failed/restored/conflict/BUSY状态；可操作错误有明确恢复入口，unknown/partial不显示为成功。

矩阵覆盖en/zh、HUHU light/dark、长中文/长名称完整title、窄屏/缩放与200%内容、键盘Tab/Enter/Escape/IME、focus可见与reduced-motion、desktop32px/coarse44px、主/弹窗document与迟到结果；具体宽度遵循当前ui/批准页，不为本票另造断点。对截图记录viewport/scale/lang/theme与fixture来源，视觉观察与DOM行为断言分列。测试可用真实生产组件+受控端口，native/Provider仍需人工。现有局部截图只在源码与依赖输入未失效时复用；本次未运行Chrome、未产生新截图。

## 7. 精确写集缺口与实施前再核对项

T18当前允许terminal-build、`scripts/obsidian-acceptance/agent-workbench-*.mjs`、terminal-reliability、workbench-probe、verify-pty-helper、test/release、指定docs与main/styles。足以新增窄的交接编排/故障fixture与说明，不授权改所有脚本或生产逻辑。

- 若要修共同宿主生命周期，精确缺口是 `scripts/obsidian-acceptance/fresh-vault.mjs`（失败kill后await exit、candidate来源/跨平台准备）和可能 `scripts/obsidian-acceptance/cdp.mjs`（真实CDP所属document/连接清理）；应先证明新编排不能仅复用现有API，再请求Root精确增补。此处不写、不运行。
- 若直接更新旧验收而非写新agent-workbench脚本，需分别补 `scripts/obsidian-acceptance/agent-page-tabs.mjs`、`workbench-window-owner.mjs` 或具体Browser脚本；当前wildcard不包含它们，不能借“验收”泛化写权限。
- 如修Windows真实Sessions用例的binary解析/skip，需要精确 `src/modules/agent/services/terminal/sessions.e2e.test.ts`；票verification提及不等于writable。若生产bug暴露，回对应owner/Ticket按真实路径修复，T18不能直接扩大到controller/core/UI/native。
- T17关键缺口 `.github/workflows/release.yml` 的双角色下载/校验/发布集合接线，不能推给T18未授权路径；shared/native旧提示与能力验证等见T17报告。只添加terminal-build资产而不改严格只接受五helper的release verifier/handoff会使发行失败。
- 最终64AC证据汇总/用户交接正式保存位置与状态由Root确定；不创建第二正式AC owner平台，不自动修改C、Skill/永久ADR/context。四页实际生产控件/测试若不在T18写集，精确回原票或Root扩集。

复用固定reference-notes的Herdr/Wave/tmux/xterm/portable-pty已核验来源、活跃时点与许可/K01–K07限制，只借设计和故障维度，不移植GPL或新增依赖。release license检查需同时核实际运行依赖、CSS/fonts/Rust全target正常/build依赖、许可全文/NOTICE/真实源commit/hash；项目自身Source Available不改写为MIT。本轮未引入陌生设计，未开展新外查，不声称固定来源在观察时点又被在线验证。

70份输入与64行主责观察见 `/tmp/huhu-t18-source-observation.json`，SHA256 `1d5069691424a3c3081fe2dd2b18fb6faa44cc9b33f39429ceb9cefd2888867a`，观察UTC `2026-10-25T09:09:58.949467+00:00`。T03集成、后续T04–17实现/Map/schema/资产/依赖/生成物变更都会造成时点漂移；正式派单/冻结时须重读相关闭包，此文件不锁其他writer。

只写本报告与source-observation JSON；仓库、正式工件、Git、依赖和生成物只读；未执行测试/build/lint/native/helper/Provider/宿主/远程CI、未下载/发布、未创建Goal、未派Agent。**READ-ONLY STOPPED（T-18）**。
