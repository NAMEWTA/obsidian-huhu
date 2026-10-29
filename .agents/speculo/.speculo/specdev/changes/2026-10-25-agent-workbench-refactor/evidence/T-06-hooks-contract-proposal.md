T-06 Hook / 手动启动发现接缝提案（只读，未冻结 DTO）

本轮只复核源码；T05 源码/cargo/target 继续 STOPPED，未运行测试、helper、Provider、构建或用户数据操作。A 正在修改 TerminalSession，相关 Session/sessions/controller 仅为时点观察。48条独立路径、58次读取的SHA/字节/UTC与漂移检查见 `/tmp/huhu-t06-hooks-source-observation.json`；本轮读取期间未观察到漂移，不等于冻结候选。依据最新T06 Ticket、Spec§3.3/3.4、AC007/020/021/022及实施合同§1/4；复用已固定R-01/K-01/K-02与原T06预检，无新增外部能力认证。

**当前源码事实与最小路线。**`controller.ts:895–906`创建Shell时没有Hook准备；`sessions.ts:497–502`仅在hooks+agentId存在时prepare。`probe.ts:5–11`只返回可执行路径，catalog.versionRegistry也不是已运行版本。`AutomationHooks`已有每次prepare的私有目录/token、300ms轮询与close，`TerminalSessions`已捕获具体Session对象，`setActivity:605–616`已有running保护；因此不需要第二runtime或活动manager。缺口是同一Shell运行内的程序身份/来源有效性，而非重做T03/T04运行代次。

现有系统Hook命令 `system-hooks.ts:48–67,322`只传event，共用同一脚本；几个Provider的SessionStart/Stop同名。`data.agent_id`是原生agent/subagent信息，不是Provider枚举。Shell即使补DIR/TOKEN，`spool-guard.ts:3–6`仍要求HUHU_ACCOUNT_ROOT，不能假造某Provider账号来绕过。推荐将“准备runtime spool”和“按既有明确配置策略安装某Provider adapter”拆成同一AutomationHooks内的两个步骤：Shell显式启动且statusHooks开启时只准备惰性scope/环境；不改HOME、账号/凭据、argv/Manual/YOLO，不为被动发现自动写六家配置。原账号启动继续原prepare兼容入口。没有已安装且实际发事件的adapter，就如实unknown并保留原终端。

Shell的spool可复用当前 `.huhu/agents/<device>/system/runtime/hooks/terminal-*`（accounts.ts:48–54 的现有system owner），提取不依赖AgentId的根解析；新增独立的hook-root环境标记供guard检查，不能把它当账号身份。scope只在已admit的显式启动时创建，查询/列表不安装、不扫描、不启动进程。它是临时运行数据，不新增持久schema，token/目录不进Session记录或备份。

**交A的最小producer语义，名称待Root/A冻结。**建议复用ManagedRuntimeRef，在Controller/TerminalSessions已捕获的scope上调用类似 `prepareRuntimeHooks(capturedRef, env, initialProvider?, receive)`，返回既有env/close。producer交付两类观察：有限原生事件摘要及来源失效；A仍唯一拥有状态、activitySequence、seen与managed投影。

| 字段语义 | 边界 |
|---|---|
| captured runtime三元组、opaque bindingId | 由宿主闭包绑定，不信spool内自报space/session/runtime；close立即撤销，异步poll/prepare每次await后重验捕获binding和当前代次 |
| Provider来源、adapter revision、可选实际版本 | command Hook须显式携Provider归属，Pi/OpenCode由各自adapter固定归属；不能从事件名、标题、CLI路径、配置可写或registry最新版本猜。没有实证版本就缺省/unknown |
| sourceInstance/nativeSessionId/turnId/源序号（按真实来源可选） | 扩展可在自身生命周期生成instance与递增序号；command Hook子进程PID/ppid不是Provider PID证明。原生sessionId也不等于一次进程寿命，resume同ID时不能伪造新前台身份 |
| event / eventAt / observedAt / stable deliveryId | 保留源时间供诊断，以本地收到/采纳为水位；文件名hrtime来自不同写进程，不能当全局因果时钟。重复投递同文件/ID不造新活动，新事件即使枚举相同也可推动A水位 |
| source health/invalidation及有限reason | HookError、unsupported/legacy-unattributed、source-mismatch、program-changed、expired、closed、runtime-ended/lost等语义由A最终定名；失败不是idle/done |

来源状态是observed/unknown/unavailable的按能力投影，不是“六家supported=true”。事件进入A前先查binding有效、runtime当前、来源/程序证据仍匹配；native退出/stop/lost优先，迟到SessionStart不能复活。启动期事件可有界暂存或作为该preparing runtime的证据，不能因adopt尚未完成丢掉后再拿旧idle充新状态。C不自行维护第二个activitySequence；A在同一序列点采纳事件或失效，再发布快照/订阅。activitySequence不使用contentSequence、ManagedSnapshot.revision或Date.now替代。

state producer只投影有限元数据，不复制完整答案给Sidebar。原NativeHookEvent(event/at/data)和prepare(agent,env,receive)兼容通路继续供agent-runtime；它当前对HookError结束失败、保留完整原生答案和子会话过滤（agent-runtime.ts:177–245）。不把终端read/idle改作原prompt-runner最终答案，也不改变取消/回执。

**什么可证明、什么必须失效。**

- 收到已归属Provider的合法事件，只证明该source在该scope产生了该事件；安装、可执行路径、配置写成功只能是准备/候选证据。能力逐项由实际事件与已验证adapter规则给出，版本不明照实显示。
- HookError立即令相应source不健康、当前推断unknown，保留最后事实/时间/原因及查看入口。Controller当前只在hookActivity有映射时转发（:182–186），故交互HookError被丢弃；这是源码事实，尚未复现故障。
- 陈旧的SessionStart/旧Stop、相同runtime内第二个程序、adapter reload、原生会话换源：更换程序epoch并撤销旧source。无法把旧事件可靠归属当前epoch时不覆盖活动/标题，不解除blocked。事件文件排序和源wallclock只能辅助，不能证明它属于新前台。
- 当前搜索范围没有前台程序查询端口。页面focus、Shell prompt mark、标题、进程存在、屏幕静默不补这个证明。Hook-only最小方案能发现有证据的Provider/部分事件能力；不能保证察觉任意前台切换。观察不到或无寿命证明时foreground/safe-prompt保持unknown，不对普通prompt放行。若后续要提供更强OS foreground探测，须另行精确准入与官方机制核验，不能假装当前已有或本轮已认证，也不必为unknown降级引入第二PTY平台。
- 失效可由明确生命周期/换源/已知前台变化立即触发；若采用freshness上限须明文有限值和假时钟回归，本提案不预填阈值。长期无事件不等于退出/完成，TTL也不能解除权限阻塞。原生root exit只更新运行维度，不等于模型任务成功。

各adapter现有源码只给以下上限，全部尚非本轮真实CLI认证：

| 来源 | 已有事件设计及限制 |
|---|---|
| Claude Code | 配置SessionStart/Prompt/Permission/PreTool/Stop；以实际版本触发和来源寿命为证，配置本身不认证 |
| Codex | 源码配置同类Hooks；K-01已记录参考项目撤回turn hooks，不据此断言HUHU已复现失败，也不假定当前CLI可用 |
| Gemini | Notification当前映waiting，不证明权限审批或问题种类；AfterAgent不赋予其他Provider等价能力 |
| Grok | 当前无PermissionRequest配置；不能补造审批可检测能力 |
| Pi | 持久extension的pending、ui_prompt、settled，能提供自身instance；ui_prompt仍不自动细分成安全审批；保持settlement去重 |
| OpenCode | 只取root session，busy/retry和permission.asked/question.asked，idle还需已完成原生答案；question不统一叫权限，recoverable error不等于完成 |

**与A/B分工和精确范围补缺。**C只拥有desktop/hooks/**及必要detection/**的生产者/测试；A拥有Session活动聚合、runtime投影、快照水位与seen，B消费其冻结结果。UI焦点不是OS前台身份。B已指出原attach已存在split时的准确pane静态缺口；留A定位统一保证，C不在hook回调切Space/Tab/焦点。seen只能提交捕获runtime/活动水位，绝不修改mailbox ack。未识别也有“查看原终端”，用户在原TUI人工允许/拒绝；无自动允许/通用审批API。

现Ticket已有hooks/**、detection/**、status*.ts、sessions.ts、controller.ts、Sidebar/control/i18n。实施前实际必须补：

1. `services/terminal/session.ts`、`session.test.ts`：活动来源/sequence/失效与生命周期采纳；`services/terminal/sessions-activity.test.ts`（拟新增）或精确等价现有测试，证明真实准备→绑定→聚合，不只测mapper。
2. `core/workspace/managed-runtime.ts`：共同纯类型及发现/来源/活动投影；core不得反向引用platform NativeHookEvent或services Session。可就近内联共同纯DTO，避免另起状态owner。`services/workspace-service.ts`及精确活动投影测试仅在A需要增量/缓存接线时补；`services/controller-activity.test.ts`拟补生产组装验证。
3. 推荐的现有spool根提取需窄补 `platform/desktop/agents/accounts.ts`、`accounts.test.ts`，只提取system runtime根，不动账号/登录/权限语义；不借已列account-permissions*.ts伪装授权。
4. hookCommand加Provider归属时，在已列`hooks/system-hooks.ts`及其测试同时兼容旧HUHU命令识别/移除、用户同组命令、跨Vault固定命令、幂等安装；只认本票新增格式会遗留旧命令。不需改core/launch/catalog/flags或launcher.ts，除非A冻结的新接线实际需要；Manual/YOLO现有实际argv首次确认保持。

推荐未来最小负例夹具（本轮未运行）：真实临时FS下旧token、close/poll竞争、畸形/过大/重复事件与HookError；同Shell A→B后迟到A Stop不能更新B/解除blocked；同原生sessionId复用但缺instance时unknown；pre-adopt事件及stop/lost优先；重复同枚举新活动推进水位、重复delivery不推进；Shell环境无HOME/账号覆盖、缺adapter准确unknown；原完整中文答案、Pi settlement、OpenCode child、system hook旧命令移除和Manual/YOLO回归。源队列/文件/去重记录须有限，溢出准确source失败/unknown，不能丢掉去重状态后把旧Stop当新完成。

没有调用真实Provider/宿主，未认证当前Codex/Claude版本或五平台前台/审批行为；受控spool/事件测试未来也不能冒充它们通过。真实允许/拒绝与能力差异仍交用户。READ-ONLY SOURCE STOPPED；本报告不是实施解锁、公共DTO冻结或票据验收。
