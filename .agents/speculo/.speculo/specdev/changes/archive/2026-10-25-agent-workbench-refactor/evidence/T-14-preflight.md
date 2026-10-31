# T-14 consumer-compatibility：只读预检

2026-10-25；6.1-sol/xhigh，`/root/implement_t01`。回读 current T-14、Spec §3.10/§11、implementation-contracts §4.1，复用已读 dev/ui/既定研究；新增回读 settings-and-i18n。本轮只有静态读取，未解锁 T-14。下文路径以仓库根为准；代码行是时点观察。**T-03 A/B 活跃，尤其 Controller、ui/create；不得将其内部现状视为最终交付或本轮缺陷结论。T-04–13 的 stop/read/registry/Browser 等接口均 future，实际签名待验收。**

## 旧路由矩阵：保留不同结果 owner

| 入口 → 持久定义/请求 | 当前实际路由与启动 | 必须保留的回执、取消和定位 |
|---|---|---|
| Home Common Action/Shortcuts 的 agent；定义为 QuickAction/ShortcutButton；`home/services/board-store.ts:480`、`shortcut-run.ts:70` | 点击后生成 AgentDispatchRequest（fresh cwd 空、无 Space）→ AGENT_DISPATCH → `agent/services/prompt-port.ts:13` → AUTOMATION_INVOCATIONS → `automations/core/service.ts:317`，先 journal 再 runtime.start | literal finalPrompt/files 只冻结一次；started 是投递接纳，不是模型完成；10s delivery timeout 不声称已取消已接纳任务；同 invocation 重复不重发。 |
| Home SkillWidget、board skills、Pipeline、技能库启动；`home/services/skill-shortcuts.ts:23`，调用在 SkillWidget:76、P1Section:93、SkillCard:215 | SkillShortcut（fresh cwd / existing sessionId）+ captured context → 可编辑 preview 或 directSend → 同一 dispatch/journal；existing 走 attachMaterial，fresh 走 agent runtime | preview 取消/页面取消无新投递；确认不重展开模板；existing 完整粘贴一次、无 Enter，不拥有该交互运行；“pasted”不能称模型成功。 |
| Agent 设置/新建菜单/Home quick button；`agent/services/quick-commands-port.ts:23` | agent.quickCommands → Controller.runQuickCommand:566 → WorkspaceService.newAgent/newTerminal → submitInteractivePrompt（paste+Enter）；当前 QuickCommand 只有 cwd/scope，无 Space 字段 | 已配置命令删除后失败；保留 readiness、超时与原交互式提交语义，不能改成 existing 素材的无 Enter，也不能用 prompt argv 替代 TUI。Controller 是 T-03 活跃观察。 |
| 自动化手动/定时 agent/script；AutomationDefinition.action；`automations/ui/AutomationsPage.tsx:147`、services/runtime.ts:246、core/service.ts:295 | manual run / tick → execute 克隆 definition → durable pending run → precheck → agentAction.start / scriptAction.start → AUTOMATION_AGENT_RUNTIME → TerminalAutomationRuntime；`agent/services/agent-runtime.ts:262/504` 当前 host.create 由 Controller:230 接 sessions.create | AutomationRun、timeline、native result、usage、通知、stop/open 仍由原自动化 owner；start 迟到、disable、取消竞争原保证保留。precheck 是真正 child_process（platform/desktop/precheck.ts:47），未绑定不能先跑 precheck。 |
| AGENT_PROMPT_RUNNER；`agent/api.ts:96`、services/prompt-runner.ts:52 | 公共 run(request) → TerminalAutomationRuntime.execute(kind prompt) → native hooks；当前 src 内未发现该公开服务的额外生产消费点，module 发布与测试仍存在，不能据此删除 API | 完整 native last_assistant_message（agent-runtime:218）、usage/accountIdentity；timeout/signal 是执行期限/取消，非 T-08 wait 取消；runContext grant 必须撤销，keepTerminal/continue 只允许原 runner 自有运行，open/close 精确定位。不得用 headless screen 替代答案。 |
| Browser 素材/截图/选择；`browser/module.ts:62–72` | AGENT_SESSIONS.list 选目标 → attachMaterial → SessionMaterialService:29 捕获具体 session、等待 open+readiness、重验后一次 paste | 旧目标替换/退出/忙/超时准确失败；无自动 Enter、无 fresh fallback。素材动作只解析原 Session 的 Space，不能由 Browser 当前页/焦点重绑。 |
| Shell 标题、状态、用量及 Home directory/skills/catalog | AGENT_WORKBENCH → `agent/services/workbench.ts:6`，compose-workbench:82/181；Home module:163–177；skills.ts/catalog 只读 | 标题/后台待处理/usage subscribe 与释放继续；只读不选 Space、不启动模型。mobile module.ts:126 在 desktop controller import 前返回，只发布 portable skills/catalog；module.test.ts:10 已有依赖加载负例。 |

当前实际 serviceKey 是 **AUTOMATION_AGENT_RUNTIME**（automations/api.ts:61），实现为 TerminalAutomationRuntime；定向搜索生产 modules/app/shared 未发现名为 AGENT_EXECUTOR / AGENT_RUNTIME 的独立 serviceKey。不要为旧称新建第二运行 owner。当前旧 runtime 本就经 host.create 到 TerminalSessions；迁移应接 T-03 的持久 Session/admission 和指定 runtime，而保留原 completion/ledger、Hook 来源与账号 tuple。notify/file/url/task 等非终端 AutomationRun 不因此强制变成 TerminalSessions；precheck 保留自己有界临时进程 owner，但也必须受该 agent/script 的绑定准入保护。

## Space 准入、冻结与失效

1. **新执行请求必须明确绑定；旧记录读取可保留未绑定。** AgentPromptRequest、fresh destination、AutomationAction agent/script、QuickCommand、Home agent button/SkillShortcut 增加稳定 Space 引用。既有 session 的输入从完整身份解析原 Space，不能据 cwd/同名/唯一 Space/当前 UI 自动补。T-02 requireSpace 已支持显式解析与 interactive chooser（space-service.ts:182）；无 Space 的 picker 当前只是空提示，T-14 需复用已有创建表单完成“创建→明确选择→启动”，不是默建默认空间。
2. 交互点击/手动运行：在生成/接纳**新 invocation**前选择；取消/保存失败零 spawn、零 paste、零已接纳 invocation。directSend 只省 prompt preview，不能绕过缺失 Space 的选择。已保存有效绑定可复用；持久绑定只由原配置的明确 Save 写入。自动化 runAction 与 GUI manual、scheduled tick 必须区分交互意图，不能给通用后台 runtime 加一个总会弹窗的默认行为。
3. 后台：未配置、归档/删除、目录授权失效立即可处理失败，**precheck、Hook/CLI 启动前**拦截，不弹无人可处理的选择框，不保存后延迟盲重试。选择时冻结 spaceId/目标/最终正文到该次快照，异步中切 Space/改定义不重算；接纳前与最终 spawn/paste 前重验 owner、绑定和 expected runtime。原 cwd 的 Vault/权限限制仍需保留；不能把选 Space 当作文本 cwd 授权或静默换目录。
4. 重复/历史：dispatchIdentity 当前位于 shared/agent-dispatch.ts:21，尚不含 Space；新身份须含明确 Space（以及 existing 的实际目标），同 invocation 换 Space 继续 conflict。**旧 request/receipt 不补字段、不改写、不重放**；精确重复旧历史请求应先复用已记 receipt，不能被“所有旧请求缺 Space 都拒绝”的新准入提前截断。新请求与历史读取分开验证；同旧 ID 加新 Space 应 conflict，配置后使用新 ID。无需承诺跨崩溃的新任务幂等。
5. AGENT_SESSIONS 的旧 runtime id、AutomationRun.terminalId/AgentSessionRef 与未来持久 Session/runtime 引用要在适配器明确映射；不能让 nativeSessionId、Pane、PID 或前台 fallback 互换。continue/reuse 必须校验同 Space/账号/来源且仍属原 owner，不能继续到新代次或另一 Space。T-04 的退出核实与 T-08 的 wait 是 future，不以其名字改写现有取消结果。

## 最小写集缺口（派单前由 Root 修订）

现票已含 api/module/controller、prompt*/runtime/material、Home services/widgets、自动化 action/editor/service/docs 与黄金样本；确定还缺：

- `src/modules/home/core/board/types/model.ts`：SkillShortcut/PipelineSkill、QuickAction 的真实定义；`core/board/parser/parse.ts`、`parser/generate-default-markdown.ts`：QuickAction 当前显式白名单读写 agentId/prompt，新增字段否则丢失。同目录 parser 测试/fixture 按实际变更精确补入；已有 skill-shortcuts*.ts 已授权，Pipeline codec 经 spread 可复用，不预先改其全部目录。
- `src/modules/home/ui/quickbar/SkillList.tsx`：SkillWidget/Pipeline 共用的真实持久配置表。`src/modules/agent/ui/quick-commands/QuickCommandEditor.tsx` 及就近拟 DOM 测试：设置页实际编辑器在票外；`services/quick-commands-port.test.ts` 当前也未被 exact .ts 写集覆盖。
- `src/shared/automation/metadata.ts`、`metadata.test.ts`：isDefinition 必须接受缺绑定的旧定义、验证有意新增字段；只加 types/Markdown properties 不足。共享错误可在已有 services 转 AutomationError，只有确需共享新增规则时才申请 errors.ts，不为此扩大范围。
- 自动化注入选择/能力端口若经过 UI host：`src/modules/automations/ui/panel-contract.ts`；若经 core/public API：`core/api.ts`、`api.ts` 的实际签名路径当前亦不在票内。优先由 Agent api 暴露轻量列表/显式 admission facade，跨模块不得导入 Agent 私有 SpacePicker/SpaceService；选定装配方式后只补真正用到的路径。

SkillCard/P1Section 等真实消费者未在 T-14 UI 写集；若统一 admission 可在已授权 Home services 里闭合，保持其页面不改，补调用测试即可；若要在原预览中展示/编辑 Space，则精确申请 `ui/skills/SkillCard.tsx`、`skill-card.dom.test.tsx`、`ui/sections/P1Section.tsx`。Browser 当前真实注入在 module.ts，T-13 交付后再查是否仍需适配；仅改 AGENT_SESSIONS 内部实现可保持此签名，不提前申请 Browser 全模块。不假定 T-04–13 的未来 schema 文件名。

## 给 T-15 / T-16 的有意 schema 交接与验证

T-14 交付后给两票实际格式样本/codec/owner：① agent.quickCommands 与 Home settings.shortcutButtons/skillWidgetButtons；② board Markdown quickActions/skills 与 Pipeline skills；③ Markdown agent/script frontmatter 的 spaceId、managedProperties、action read 白名单；④ AgentDispatchRequest/identity、AutomationRun.definition/invocation/receipt 的原快照及新目标引用；⑤ PromptRunner 的请求/运行定位映射（临时 grant/env 不持久）。T-15 保留旧定义“待选择 Space”，不按导入布局空间或 cwd 填值；T-16 按原 owner 导出/预检上述业务数据及历史 receipt，设备/Space 映射、碰撞与未知属性保留，库外授权在目标机器重验，导入不激活定义、不重放/补发、不恢复 runtime/锁/endpoint/凭证。不能为加 Space 重写旧 journal。

未来自动化最小组：无/一个/同 cwd 两 Space、选择取消/创建失败/保存失败、无绑定后台含 precheck **零进程调用**、授权/归档在等待中失效、接纳后换界面/卸载、并发同 ID/换 Space conflict、旧 receipt 原样返回且不 spawn/paste。复用 invocations.test.ts 的真 JsonStore 内存存储/持久前启动断言、prompt-port/runner/material 的取消与完整原生答案夹具、Home 捕获/保留未知字段测试，以及 mobile module 导入负例；增加真实入口 DOM 的选择/取消/焦点返回。t() 双语、所属 Window Portal/IME/不重排原页面；真实宿主、Provider、人工审批与移动设备按用户分工未运行。

**本轮未运行 tests/build/lint、宿主/helper/Provider/CLI 或 Git 操作，未写仓库、正式记录或用户数据。**84 份部分读取/定向搜索/已读规则的全文件时点 SHA 见 `/tmp/huhu-t14-source-sha.json`（SHA256 `f339913437f9377441c6a31ef085aebf085b93939837a0f6ca0a695418bf276d`），非冻结证据。T-14 预检结束，**STOPPED（T-14）**；后续另按 Root 的 T-03 C 精确测试授权执行。
