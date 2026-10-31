# T-12 精确原生继续：只读实施前预检

基线：`/home/wta/orca/workspaces/obsidian-huhu/terminal`；派遣 HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`；GP-013 / Map14。T-03 已由 Root 报告 SOURCE STOPPED、交独立 review；本报告只是静态观察，不实施、不验收。读取明细和每个完整文件的字节 SHA/UTC：`/tmp/huhu-t12-source-observation.json`（69 项，SHA256 `d0172e92c4085797286ad55628f02d7a9b7ad97c2e4b9b91cbda48622d88eeb0`）；并非候选冻结。

## 当前恢复链与身份事实

`SessionHistoryPanel → Controller.resume/resumeAt → admitLegacyLaunch → resumeAgent → startAdmitted → TerminalSessions.create`。Controller 每次 history resume 准入一个 Session（`:618–647`），目前没有完整 native ref 的跨 Space 导入登记/并发去重。工作台 restore 则已有 `WorkspaceService.restore:646–716`：同 persistentSession 若处于 pending/running 先 attachManaged，否则用 existingSessionId 准入并 reserve 新 runtime，保留原身份。其 restoring map 只约束同 tab/旧 runtime，不是跨实例来源占用表。

`TerminalSessions.reserveManaged:123–142` 针对 Space/persistentSession 拒绝活跃/失联旧代次，生成唯一 runtime；它不按 native 来源去重。`SessionRecord`（services/spaces/records.ts:7–18）及 ResumeInfo（core/workspace/model.ts:7–17）只有 Provider/accountId/nativeId/transcriptPath 等字段；严格 SessionRecord codec 不接受任意新字段。native summary 的 key 是 Provider + accountKey + nativeID，没有独立 sourceDevice/locator 身份维度。账号路径中隐含设备不能替代持久 provenance。

已有六 Provider 来源/恢复构造（是**当前代码事实，不是最新 CLI 实机能力认证**）：

| Provider | 现行读取位置/必要 locator | 现行恢复 argv |
|---|---|---|
| Claude Code | CLAUDE_CONFIG_DIR/projects 的 JSONL、原 nativeID | `--resume <id>` |
| Codex | CODEX_HOME/sessions JSONL、原 nativeID | `resume <id>`；保留 accountArgs |
| Gemini | GEMINI_CLI_HOME/.gemini/tmp，项目映射及 chat JSON/JSONL | `--resume <id>` |
| Pi | PI_CODING_AGENT_SESSION_DIR 的 JSONL，**transcript 路径是恢复 locator** | `--session <transcriptPath>` |
| Grok | GROK_HOME/sessions 的 session.json + chat_history.jsonl | `--resume <id>` |
| OpenCode | XDG_DATA_HOME/opencode/opencode.db 的 session 行 | `--session <id>`；只读历史排除 child |

位置解析由 desktop/agents/system-homes.ts:58–78 拥有；真正 resumeAgent 在 services/launch/launcher.ts 复用 restoredAccountReference、checkAccountTranscript、程序解析、原权限确认、accountArgs 与字面 argv。复制命令才走 resume-command.ts 的 POSIX quoting / PowerShell EncodedCommand，不可把复制用 shell 字符串送进真实 spawn。

`restoredAccountReference:90–113` 严格核对保存的账号 env 与当前 expected 或唯一明确 legacy binding；transcript.ts 验证文件/账号根/内部 symlink，保留 Vault alias 支持。该校验不会证明文件内容的 nativeID 等于请求 ID，T-12 还须做精确 locator/身份比对。Controller.restoreSession:733–739 的无路径回查目前只匹配 nativeID+cwd，未在 find 条件同时匹配 Provider/account；这是需移除的**静态歧义回退风险，未在本轮复现**。Controller.resumeCommand:600 仍只接受库内 canonical cwd，外部已授权 Space 的复制/恢复需要走相同授权校验，不能降低目录门。

## 最小实施闭环与先后依赖

1. **先收 T-11 的精确 ref。** 共用 provider/account namespace/sourceDevice/nativeID/必要 locator 和不可改写 provenance；不要只用 ID、cwd、UI 行 key 或当前默认账号。预览只读，明确 import/resume 时选择 Space；通过 T-02 的现有业务队列持久登记精确来源→稳定 Session。重复/并发导入和跨 Space 同源导入复用原身份/定位或清楚冲突，不能先造第二 Session 再靠进程锁掩盖。
2. **复用 T-03 的运行 owner。** 活动同源先定位/附加原 persistentSession/runtime，不另 spawn；已核实结束才对同 Session 新建 runtime。冻结 Provider/账号配置、目标 Space/cwd/grant、ref 和权限选择，最后异步准备完成后继续由 beforeSpawn 复核，不能用 UI 后来选中的 Space 重算。缺来源/损坏/账号不匹配/格式或恢复能力不支持都保留来源事实和明确原因，禁止退化成 fresh empty、隐式 fork 或换账号。
3. **占用是单独的本机生命周期检查。** Ticket 的 desktop/native-reference/** 尚是拟新增位置。T-02 writer-owner.ts:7–10 只锁 device+物理 Vault 的业务 writer，既不能阻止两个不同 Vault 继续同一个系统原生会话，也不提供来源占用；不可直接当作 AC-038 已完成。T-12 需按完整 ref 跨参与的 HUHU 实例互斥，spawn 前 acquire，并绑定稳定 Session、runtime 与实例存活证据；本机占用状态不写进 Vault 业务备份。不得靠 PID/mtime、超时或 disconnected 就认定旧进程已退出/抢占。
4. **T-04 的确认退出接缝是必需输入。** stop-requested、已确认 exited 与 lost/disconnected 必须分开；迟到 spawn 的回收未完成前不能释放占用、让新代次接管。只有有证据退出后释放；宿主关闭还要等本次 owned 进程收束。占用监听失效本身不证明 PTY 已退出。T-05 继续沿原 runtime/headless 附加，T-06 提供可信 native 身份证据；它们及 T-07 history 路由、T-09 focus/layout 是**未来行为接缝，本轮未交付真实签名**。不新建第二运行/屏幕 owner。
5. GUI 与 CLI import/resume 走同一用例，回执保留目标及真实阶段/未知效果；取消准备不迟到 spawn，已发生效果不自动重试。PAGE-002 的明确启动确认要显示源、目标 Space 与目录，取消零启动；已有运行只定位，不把预览点击变成启动。保留原生全文答案、执行期限/取消与 usage/account owner；headless/历史预览都不能冒充业务完整答案。

## 精确写集补缺与格式交接

- **必需接线缺口：** `src/modules/agent/services/workspace-service.ts` 与 `workspace-service.test.ts`（或新 workspace-service-history.test.ts）目前不在 T-12 写集。历史来源必须进入其已有 persistentSession restore/attach/admission，Controller 新造一条只按 nativeID 的 owner 不合格。Controller.ts 已在票内，其新就近 controller-history.test.ts 当前未获写入，应精确补入。
- **按冻结格式补窄路径：** 完整 ref 若写进业务 Session，则需 `services/spaces/records.ts`、`space-service.ts` 及定向 records/Space 测试，并视实际恢复元数据扩充 `core/workspace/model.ts`；另一可行最小方案是在 history owner 持久来源→Session 登记，避免无理由扩 schema。无论哪种，T-15/16 接收明确 codec/version、原来源设备与稳定 ID 映射，恢复只导入事实、不启动/重放、不搬账号正文/凭据。
- 终止/lease release 优先消费 T-04 提供的带 runtime 身份退出订阅；若真实公开接缝不足，应由其 owner 交付，或在派 T-12 前精确授权 `services/terminal/sessions.ts` / `session.ts` 的窄钩子及对应测试，不能实现者擅自越界。T-11 必须已将完整引用穿过 native DTO；否则 desktop/server/agent-data-client.ts（T-12 未列）需补。若实际要改账号/locator 安全解析，desktop/agents/accounts.ts、transcript.ts 和各测试也需逐个授权，不能把 history/** 解释成全 desktop 权限。
- A 可独占 source-ref/登记/occupancy 与 WorkspaceService/Controller；B 只在 DTO/用例冻结后写 history UI/DOM。i18n/共享 core 文件归单人，main/styles 仍 Root。占用机制、准确键编码和 lost 后保留/核验状态应先出短生命周期设计与反例；这是工程选择，没有新产品决定待用户回答。若采用本轮 reference-notes 未覆盖的新 OS 机制再查官方/活跃源码。

## 复用测试及真实边界

现有未执行接缝：launcher-space.test.ts 有六 Provider/system+managed 的字面 argv/权限及 Pi transcript 精确测试；history/resume-command.test.ts 有 Windows/Unix 字面参数和 managed 路径；scope.test.ts 有各 CLI resume 参数；agents/accounts、legacy-accounts、system-account、transcript 测试涵盖账号边界/旧引用/目录 alias 与内部 link；WorkspaceService 测试覆盖原账号/nativeID restore 及关闭 Pane 时迟到运行留后台。T-03 真实 Linux helper+WorkspaceService 夹具可复用验证同 Session 新旧 runtime/同 PID attach，不代表 Provider 自身 resume 已验证。

新增有意义反例：同 nativeID 不同账号/设备/locator 不合并；跨 Space 同源重复 import 和同时 resume 只有一个 writer；两个隔离真实子进程在不同临时 Vault 竞争同完整 ref，冲突不换键，等待确切退出后才重获；abort/stop/断连/晚到 spawn 不早放占用；旧代次 exit 不释放新代次；源轮转/损坏/账号变更/grant 撤销不启动 fresh；原来运行的只 attach；重启恢复事实零 spawn；preview 零 Session。复用 T-02 writer-process fixture 的受控 child/exit/finally 模式，不复用其 Vault 锁键充当来源锁。DOM 验证确认取消/冲突定位/focus-return；各 Provider 当前版本、账号登录与 Windows/macOS 进程退出/argv 边界仍分别需实机，平台 skip 不是通过。

复用 reference-notes 的 R-01 运行注册与本项目精确恢复构造、R-05 既有 portable-pty 0.9/MIT；不引入 Herdr 自动重启、Wave 业务 DB 或外部 daemon，不复制 GPL/不新增依赖。本轮没有运行任何测试/类型检查/lint/build/helper/Provider/native/宿主进程，也未操作 Git、仓库源/正式记录/用户数据。**READ-ONLY STOPPED**。
