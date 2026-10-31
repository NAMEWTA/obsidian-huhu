# T-06 activity / 人工审批：只读预检

2026-10-25，`/root/implement_t01`，6.1-sol/xhigh。仅本 `/tmp` 报告及 source observation JSON；未写仓库/正式证据/Git/生成物，未构建、测试、启动helper或Provider，未派Agent。未把A仍在修改的SpaceService/WorkspaceService/workspace-store当作稳定源。T-03/04/05/06均未解锁实施。

**最小结论：**复用现有每终端Hook spool/原生扩展、headless状态和人工原TUI入口；在T-03唯一runtime上补证据与activitySequence，在T-06补“待处理→定位准确运行”。不建立通用审批API，不向六Provider承诺相同能力。普通协作prompt的最终CLI拒绝/不重放由T-08组合验收，原一次性原生完整答案合同继续保留。

## 当前可用状态来源（源码事实，不是实机能力认证）

| Provider | 已有配置/适配来源 | 能力限制 |
|---|---|---|
| Claude Code | SessionStart、UserPromptSubmit、PermissionRequest、PreToolUse、Stop/StopFailure命令Hook | 当前CLI版本是否实际支持/触发仍待测，不能只据配置文件宣布可用 |
| Codex | hooks.json声明SessionStart、UserPromptSubmit、PermissionRequest、PreToolUse、Stop/Interrupt | R-01/K-01已固定Herdr撤回Codex turn hooks的事实；这不是HUHU已验证失败，也不能假定此Hook可靠 |
| Gemini | SessionStart、BeforeAgent/BeforeTool、Notification、AfterAgent | Notification只被投影waiting；没有代码证据证明它等于结构化权限审批 |
| Grok | SessionStart、UserPromptSubmit、Stop/StopFailure/StopCancelled | 当前配置没有PermissionRequest，不能补造blocked识别能力 |
| Pi | 本地extension：agent_start；pending期间ui_prompt_start/end；agent_settled给Stop/失败/取消 | 不是从任意输出推断；已有settlement去重测试，真实版本/插件生命周期另验 |
| OpenCode | root session busy/retry、permission.asked/question.asked；root idle查询已完成native answer后才Stop | child session被过滤，recoverable session.error不是完成；question与permission当前合并，不能编造细分审批原因 |

`AutomationHooks`每次prepare生成独立token/目录，300ms轮询，检查token及slot仍存在，有输入/答案大小限制；系统Hook安装保持用户配置与所属命令。`TerminalSession`初始Agent activity=unknown、Shell=idle；原生exit/closed分别提供运行/连接证据。`probeAgents`只解析CLI可执行路径，不提供运行中前台程序身份或版本证明；当前没有“受管Shell手动启动Agent”的完整运行检测接线，`agentId`只来自创建参数。

## 已证事实与静态风险

- `hookActivity`将原生事件映为running/waiting/permission/done/failed等；`HookError`不映射，Controller只在有映射时更新交互Session。**事实：错误不会更新该activity。静态风险：Hook失效后旧状态可持续显得有效。**应保留旧证据但标来源失败/当前unknown，不伪造idle。
- `sessionState`明确不以输出安静判断完成，unknown也不会自动转idle；已done或exit0超过30分钟会投影idle。这是当前展示老化事实，**不能把老化idle当新Provider就绪/新任务完成**，也不能把进程exit0等同模型任务成功。
- `setActivity`用本地Date.now覆盖activityAt，不保留Hook源at/source/reason，也无activitySequence；当前没有可用于prompt等待的活动水位。重复同状态事件仍可能是新活动，不能只在枚举改变时递增未来sequence。
- 现有`submitInteractivePrompt`只检查running、bracketed paste或shell prompt mark，没有blocked/foreground/runtime证据参数。**静态风险，未复现：**权限/登录界面可能仍具输入就绪表象，旧shell mark不能证明前台仍是原Agent。T-06提供明确可查询证据/安全接缝，T-08负责普通协作prompt生产组合拒绝。
- Sidebar有waiting/permission/failed/interrupted的attention组、unknown组，点击调用activate(tabId)；它枚举workspace tabs，不是跨Space/无Pane运行的待处理索引。T-03的新runtime注册/定位接缝需要承接背景运行；事件只更新提示，不自动抢焦点。
- Manual/YOLO真实逻辑在`core/launch/flags.ts`、defaults与`services/launch/launcher.ts`，首次确认检查实际argv并按Agent记录确认。Ticket所列`account-permissions*.ts`目前只有OS文件ACL测试，不是Provider审批模式实现。二者不可混为同一权限能力。

以上没有故障复现；不推断Hook文件排序能代表跨进程业务因果，不用屏幕关键字命中编造确定审批理由。未知保留“查看原终端”。

## 给T-03/04/05保留的最小接缝

1. **同一runtime证据入口**：native hook、前台检测、screen detector、exit/lost都绑定捕获runtimeId及Provider/account来源；旧token/旧回调不能改新runtime标题/状态。T-04终态不能被迟到SessionStart/Stop复活。
2. **活动快照**：保留connection、activity、seen、来源可用性四个维度；activity附`runtimeId/activitySequence/source/observedAt`及可解释失效原因。activitySequence独立于T-05 contentSequence、PID与时钟；只对该代采纳的证据单调推进。
3. **原子观察水位**：读取活动快照并订阅后续证据无空窗；T-08可在发送前捕获基线，prompt+wait要求后续新活动，独立wait可匹配当前状态。blocked/unknown只是匹配/处理结果，不是任务成功。
4. **按Provider发现**：输出“已支持/不可用/未确认”及版本/证据，不把CLI已安装、进程存在或Manual模式当作idle/blocked。T-05屏幕只作为该runtime的辅助证据，检测失败降级unknown；不新增统一万能检测器。
5. **人工导航与输入边界**：定位冻结的Space/Session/runtime，附加原屏幕，由用户在TUI操作。未知/拒绝后仍可查看，不重新launch、不换后端、不代按允许；T-04取消订阅/disable及时收束，T-05输出/ACK不因待处理提示停掉。

不要求T-03提前实现所有状态算法；只保留唯一runtime、事件/订阅与可附加定位，T-06不另造manager。新普通输入是否安全必须在真正提交前再次核对运行/前台/blocked，不能只看UI快照。

## 写集与最小验证建议

**确定缺口：**`src/modules/agent/services/terminal/session.ts`、`session.test.ts`需容纳来源/activitySequence/代次证据，当前T-06只列status*.ts和sessions.ts；`src/modules/agent/services/controller-activity.test.ts`（拟新增）需覆盖真实Hook→runtime状态→导航接线，当前仅controller.ts。其余新增状态adapter测试可置已授权status*.ts、hooks/**、detection/**、ui/control/**。

**仅按接线实际补：**若Provider能力表改catalog/type，则补`core/launch/catalog.ts`、`types.ts`及就近测试；如权限保留逻辑要改，补`core/launch/{flags,defaults}.ts`、`flags.test.ts`、`services/launch/launcher.ts`和对应测试，不能在ACL测试路径重写另一套YOLO规则。若新证据要经过workspace projection，再由Root补core/workspace或workspace-service精确路径；待T-03固定后确认，当前不触碰A源。Sidebar/control/i18n已在本票写集，可做待处理入口与en/zh来源说明；不必扩成Provider Chat或结构化审批卡。

未来定向检查（本轮均未运行）：

- `hooks/automation-hooks.test.ts`：真实临时FS、账号隔离/配置并发；新增错误事件、slot关闭/旧token/乱序旧runtime负例，不能只测安装成功。
- `hooks/native-extensions.test.ts`：真实spool + 受控Pi/OpenCode事件，保留root/child和final-settlement风险；它们不是真CLI/审批通过。
- `hooks/system-hooks.test.ts`/`event-payload.test.ts`：命令与payload/用户配置边界；现有shell执行测试Windows会skip，需记录。配置可写不证明Provider会发事件。
- 新`status*.test.ts`及session测试：unknown、HookError、缺能力、过期证据、permission→用户拒绝→真实新状态、旧代迟到事件；假时钟验证activity水位，不用sleep/静默证明idle。
- `core/launch/flags.test.ts`与现有account-permissions测试分别验证YOLO首次确认和OS私有目录权限，不相互冒充。新增Controller/UI自动化证明待处理只导航原runtime、取消无输入、事件不抢焦点、seen不修改mailbox ack。
- 原prompt-runner/agent-runtime完整答案、取消与时限合同保留；blocked且inputReady=true的协作输入负例在T-08生产链汇合，不能以readiness mock证明安全。

复用R-01/K-01/K-02的固定活动/Apache-2.0及已批准机制比较；不复制新外部代码、不升依赖。真实Codex/Claude版本、允许/拒绝、前台切换、六Provider能力差异与五平台UI/Hook/原生审批未运行，按Spec §11交用户；不能把受控事件或平台skip记实机通过。

## 观察与停止回执

本报告只对观察源成立。完整30份源SHA、字节、UTC时间在 `/tmp/huhu-t06-source-observation.json`；正式Evidence不变。预检完成后停读等Root，T-02 B持续停写，后票没有获得实施授权。

Observation SHA256：`72280ca7d0e27e94cd0f05d94e738b113b28b11155a942441365de3087b260b9`；交接前上述源无漂移。
