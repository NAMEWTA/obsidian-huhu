# T-16 backup-restore：只读预检

2026-10-25；`/root/prepare_t02`，沿用 6.1-sol/xhigh。workspace `/home/wta/orca/workspaces/obsidian-huhu/terminal`，Root 声明 branch/base/HEAD `NAMEWTA/terminal` / `33c21e098ef3188cbab5a09f3e0a01fadb787715`；未运行 Git。依据 GP014/Map15 → dev/ui 及绑定架构/许可/测试、shell/设计系统/动效无障碍规则 → T16/T15、Spec §3.8/3.10/§11、公共合同 §4.1/5/6、LOG030、已批 DESIGN rev1 A PAGE004，以及 backup-owner-analysis、T10/T14 预检。DESIGN 摘要 `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`。

**结论：业务包必须按原 owner 和全部已存设备枚举，不能递归 zip .huhu 或只导出当前可见会话。T15 的恢复事务须先独立完成，T16 再把 automations/notifications 等真实 owner 接入；恢复必须有专用静默 adopt 和持久抑制重放元数据，普通 load/invoke/save 不是安全恢复入口。当前这些恢复协议/目录尚未存在，不是已可调用 API。T03A 活跃路径仅作 owner 观察；T04/10/11/12/13/14 最终 schema 与签名均待前序交付重审。**

## 1. 实际包覆盖清单（按 owner，而非目录猜测）

| 数据 / 实际来源 | 包内应保留及明确不含项 |
|---|---|
| Space/稳定 Session/展示布局 | 当前 `agent/services/spaces/records.ts`、SpaceService 的 `.huhu/terminal-agent/<device>/workbench-v2.json`：Space/Session/目录意图、归属、per-Space layouts、无Space sharedLayout；已存旧 workspace.json 单独作为来源/迁移资产按 T15最终格式处理，不能二次调用旧 writer。全部设备枚举，当前展示布局由用户明确选源设备；其他设备保留 provenance 归档。 |
| Session mailbox | T10 future owner：messageId/接收 Space+Session/顺序/正文/来源、read（若存在）及 ack，容量/游标依其最终格式。**不能从 tab.unread/全局 notifications.read 重建**，不能漏停止或已归档 Session 的已存消息。当前 core/services inbox 不存在，路径不可预填成事实。 |
| 历史标注与来源引用 | 当前 `NativeHistory` 的 history.json，完整 provider/accountKey/device/nativeSessionId/transcript reference、title/tags/favorite/archived 及明确 alias；T11/12 最终 codec 取代当前时点观察。两账户同 sessionId 不合并；不为补字段扫描原生历史，不把无法归属 account 原文摄入本 Vault。Provider transcript 正文与 account home 不打包。 |
| automation-session 来源登记 + 自有统计 | automation-sessions.json、stats.json、workspace-stats.json：原来源 tuple/账号引用、累计 daily/byAgent/次数/时长完整保留；不以 SQLite/token查询缓存替代。缺文件与坏文件严格区分，坏文件不可静默给空。 |
| agent 设置可携带部分 | app SettingsStore 是唯一文件 owner；从 settings.json 和每个 devices/<device>.json 的 agent namespace 按白名单 codec 取值。保留普通外观、命令文本、Provider/account标识、权限模式意图；排除 overrides.env、agents.agents[*].env 等结构化 env 值/凭据和本机有效 YOLO acknowledgment/外部授权。包列出排除字段类别，不打印秘密；普通命令/结果文本不靠猜测内容随意删改。不整份覆盖 app/home/browser/theme 等 namespace，不用源 identity.json 替换目标设备身份。 |
| Automations runtime | `.huhu/automation/<device>/runtime.json` 的原 AutomationState：definitions（历史兼容集合）、**所有当前实际存储 runs/cursors**，run.definition/retryOf/taskDelivery/effectKey/receipt/timeline/precheckResult/message/errorCode/errorParams/output/usage/session/source/terminalId、invocation.request/receipt/notificationAttempted。已有结果就在原 run 结构中，不新建 Run/Outbox。AutomationRun.message 的原生完整答案与脚本 output/usage 按原字段保全，不换成屏幕文本；PromptRunner 直接返回而未持久的回答不凭空声称可备份，相关 caller 另有持久 owner 时才由清单列明。 |
| Standalone automation 定义原件 | `MarkdownAutomationDefinitions` → `.huhu/automation/definitions/<name>-<id>/操作.md`；`domain/automations.json` **是逻辑集合键，没有这个业务实体文件**。必须取得原 Markdown owner 的完整文档/未知作者字段/退役 action tombstone，不用运行缓存里的 definitions 冒充全部定义原件。导入禁用可执行定义，保留原 enabled 意图/provenance；历史 run.definition 与 invocation request/receipt 不因此被重写。 |
| 来源看板/技能/普通笔记边界 | Home Common Action/skills/Pipeline 定义在 Home settings 和 board Markdown，来源型 automation 在各 SourceRef owner 文档里；T14 新绑定字段由原 codec 保留，旧值仍 unbound。公共合同 §6 把来源笔记定为引用，**不递归打包 dashboard/用户笔记、skills 目录或整个 Home namespace**，不把引用缺失伪装成原文已恢复。包需列出这些 source refs 与缺项；若后续声称恢复来源型可编辑原件，必须先经其公开 owner 明确范围与写集，不能 Agent 越界复制。 |
| Notifications（整个 HUHU 集合） | `.huhu/notifications/<device>/inbox.json` 的 records/read/完整 request+source/target/presentation、独立 receipts，每 channel pending/sent/failed/unknown，包括 clearRead 后 records 已删除的去重墓碑。当前公开 NOTIFICATION_INBOX.records 不含 receipts，不能用它单独导出。全部来源通知属于既定范围，不能只过滤 automation 或当前 Session。 |

不包含 Browser Cookie/登录态/cache/download、系统/托管账号凭证及原生 transcript、helper/CLI、active endpoint/socket/lock/runtime/PID/热屏、SQLite 等可重建缓存；Browser 的设备/共享**布局引用**仍包含。旧账号恢复 archive、密文保险箱、整库日常备份和本票业务包是不同 owner/用途，不能借“完整”把敏感目录顺带装入。docs/data 现有“日常备份整个 .huhu”是用户外部全库备份建议，不是 T16 包范围。

## 2. 现有工具可复用到哪一层

- JsonStore：单文件校验、备份、三方合并、读回与显式失败；SpaceService 在它外面已有 future/foreign scope 门、单队列/permit。`load` 可写 corrupt evidence，不能拿它无门禁遍历导出；backup-only 的恢复也属于受控写。WriteQueue 只按 key 串行、settled 不保留失败，不是跨 owner 原子事务或全局 freeze。
- Home `board-backups.ts`：有 SHA256、manifest 最后发布、逐文件临时写/rename/读回、before-restore副本、源目标捕获、坏/未提交组不采用；测试覆盖 partial/empty/corrupt-success/cleanup-failure。其范围是 board + 四类记录，只恢复当前 board，不能作为本票全工作台备份实现或顺便扩大其定时器职责。
- Safe desktop export：同目录 wx 临时文件、sync、读回、重验目标、rename/目录sync和 readback，以及禁止覆盖受管文件/硬链接别名的测试思路可借鉴。不从 Agent 直接 import safe 私有代码；原 safe 密文/加密恢复不加入业务包。
- 现有 JSON 与 WebCrypto SHA256 足够形成最小版本化 manifest+section payload，尚不需要压缩/归档依赖。包格式由正式 I 固定，限定大小/记录数/嵌套/字符串和精确 section schema；包中路径仅 provenance/白名单声明，目标路径由 owner 生成。若选择 ZIP，再研究锁定库/逐文件许可与 path traversal/膨胀边界，不为预检添依赖。
- ContentFiles/MarkdownCollectionStorage/DocumentRepository 保持作者未知字段、huhu-deleted tombstone、原文并发检查；ContentFiles.checkEditor 可拒未保存 editor/draft。恢复 adapter 应经这些 owner 的受控 stage/adopt，使 index/repository cache 采用新集合，不通过 normal save 逐条重建并丢原文。绕过后若缓存还旧，下次正常保存会覆盖导入结果。

## 3. 最小恢复合同与无重放约束

使用 T15 既定 inspect→quiesce(token)→strict drain→snapshot/stageRestore→commit/adopt→release/abort。T16 只追加真实 owner 和 package codec，不另造锁、缓存、运行 registry、定时平台或业务 DB。

**导出：** 所有参与 owner/全部实际设备预检，活动 PTY/Agent/automation action/launch或无法冻结writer返回 BUSY，列明工作，不自动 stop/disable模块。原子关 admission（包括 memory mutation、tick/invoke、完成通知预占/失败回调、标注、设置、布局、定义编辑）；等已接收工作严格排空，全部冻结后共同快照，全部快照完成前不逐个 release。source-set digest 在读取/暂存/提交边界重验；外部同步/其他设备漂移拒绝，不能拿本机TCP lease声称跨机器冻结。不能安全取得某集合则明确 unavailable/BUSY，不给空数组并宣称完整。

**导入预检：** 不改有效数据；验证 package/schema/version/section digest/容量、源Vault+device、唯一业务ID/引用、owner集合完整性、路径白名单、目标为空或已有完全相同 package digest 的幂等事实。默认保留 Space/Session等业务ID，source device只作provenance；显式映射到目标Vault/设备和用户选定布局，不覆盖宿主device identity。不同内容身份碰撞先拒绝，不自动 merge/rename。目标“空”按实际参与业务集合检查，不能仅看Spaces.length=0而忽略已有receipts/runs/settings记录；已有身份、其他namespace、默认骨架不应被误当可整文件覆盖。

**目录与权限：** 当前 v2 assertScope 严核 physicalRoot+device，不能把foreign envelope直接写入绕过。由原owner生成目标绑定后的记录，保留源root/目录意图为provenance；库外DirectoryGrant不能作为有效授权导入，chooser receipt只由本机明确选择产生，源dev/ino/path不证明目标授权。未重授前相关Space/Session可读待处理，启动明确拒绝；账号/原生来源缺失准确提示，首次YOLO确认在目标重做，不把源ack作为授权。保留permissionMode意图，不悄悄提高或抹掉用户配置。

**提交与adopt：** 先验证全部 staging/恢复副本，journal记old/new hash、operation/package digest、映射、阶段；逐文件提交可恢复，相关reader一直关门，不能宣称一次跨目录rename原子。新实例在settings/业务owner加载前恢复全旧或全新；unknown中间态保持恢复门与报告。所有owner重建内存/baseline/JsonStore/namespace/Markdown索引/bridgedraft后才开放写入。不同于用户取消：预提交取消无live写；提交后取消仍先收束journal，不能半途release。相同digest重试重用已核验阶段与ID，不再次改写旧journal事实或重新执行任务。

**自动化不能使用正常load/adopt：** 当前 AutomationService.loadData 会把active标interrupted并commit→refresh sources→publish每条未notificationAttempted的run；runtime还注册minute/focus/layoutReady tick。setExecutionEnabled(false)/shutdown会停止owned runs和写状态，不能用来临时冻结。普通commit每automation裁剪100条历史，不能用于导入当前实际全部runs。恢复需专用no-effects adopt和owner-local持久恢复元数据：保留原active/notificationAttempted等来源事实，展示为非活动待确认，已导入定义不自动执行/补跑，未发送通知不伪造sent，**下一次正常启动也不得补publish**。可在原AutomationState/owner恢复元数据中落定，优先不改变历史run/invocation结构。

**通知不能重发：** send先持久化receipts.pending再外发，失败回调又enqueue，读后清除只删records。导出须包含预占/完成回写的一个一致切面，和automation completion/notificationAttempted一起冻结；未完外部投递应先drain或BUSY，不能强停。恢复pending准确unknown/受抑制并保留source事实，严禁调用send恢复records、复演adapter或清空receipts。read不等于mailbox ack，receipt不等于模型成功。

**旧invocation字节/语义：** LOG030只约束新运行显式Space，旧request/receipt作为历史保留。不要从导入Space、cwd/当前焦点/唯一Space补字段，不重新展开finalPrompt/files，不把started/pasted/timeout/unknown改成完成。owner采用数据后，同invocationId+原请求仍返回原receipt（或原未定事实），不同请求仍conflict；不调用invoke来恢复或dedupe，不自动补发因回执不确定的动作。原生完整结果留原message/usage/error等字段，不能读屏伪造全文。后续显式新调用使用新ID+有效绑定。

## 4. 精确写集核对

当前 T16 已含 shared recovery/app main/settings/agent api,module,history,registry,stats、automations api/module/runtime/service/documents/definitions及测试、notifications api/module/service及测试，足以做大部分原owner接线；前述 recovery文件/backup目录、automations/core/backup.test 仍是拟新增。

目前缺口或需前序交付后精确补入：

1. **SpaceService实际文件**：`src/modules/agent/services/spaces/space-service.ts`、对应 `space-service.test.ts`/`space-service-recovery.test.ts`，必要 `records.ts`/`records.test.ts`；T16没有覆盖这些，也没有 workspace-store*.ts。若实际v2/shared carrier恢复需重置bridge，同票精确补 `services/workspace-store.ts`、`workspace-store-spaces.test.ts`，以及真实layout服务/Controller接线测试，避免旧缓存下一写覆盖。优先复用T15/T13最终公开owner，不能在backup目录另读写。
2. **mailbox最终owner**：T10实际core/services/inbox及schema/stores/测试待其冻结；当前不存在，不给未来拟名作批准路径。T11/12来源记录及T13共享Browser owner同理。T16必须拿到schema/文件集合/strictdrain/snapshot/adopt后再定manifest，不预填“空”。
3. **持久路径/离线装配**：如新增package/journal/provenance归档常量，补 `src/shared/storage/vault-layout.ts`、`vault-layout.test.ts`；TextStorage不足list/rename/remove，不以写集隐含可改ports.ts。当前禁用模块无recoveryloader，若module/api+app/recovery不能闭合轻量装配，需精确 `src/app/contracts/module.ts` 及实际manifest/registry测试，不能acquire正常Agent/Automations来导出。
4. **Markdown事务宿主**：`src/host/obsidian/storage/content-files.ts`、`document-collection.ts` 及对应精确测试仅在现有公开保护不能stage/adopt/冻结时补入；也可由已授权automations/platform/definitions提供窄owner adapter。原文/raw properties/tombstone须保存，不能因路径未授权改成Agent直接fs覆盖。Home board/SourceRef正文按既定范围只保引用；不为方便开放整个Home模块。
5. **恢复标记schema**：优先在已授权 `automations/core/service.ts` 定义原owner恢复metadata并测试不重放；若最终真的要改共享definition/run类型或codec，先精确申请 `src/shared/automation/types.ts`、`metadata.ts`/`metadata.test.ts` 和需要的action codecs，T16当前未含。不把导入标记偷偷塞进未验证历史对象再靠unknown字段幸存。
6. settings入口当前依赖Controller；Agent.module.settingsPage还prepare Controller/ensureSkillManager。备份读取禁用owner不能靠此路径激活能力；T15/T16可通过已授权module/settings页传独立recovery facade，Root app负责装配。若需要在Agent关闭时仍展示入口而app settings wrapper阻挡，精确核查 `src/app/workbench/settings-page.tsx`/`.dom.test.tsx`，当前不在T16写集；不增加新全局页面或独立backup平台。

## 5. 往返、故障和零副作用验证矩阵（待正式实施，无本轮结果）

| 夹具/行为 | 必须断言 |
|---|---|
| 完整多owner roundtrip | 至少两device、两Space同cwd、两account同native sessionId、active/archived/stopped来源、perSpace+shared browser/page/group/focus/closedtabs、title/favorite/tags/alias、mailbox正文/read/ack、registry/stats、所有automation结果字段与Markdown未知属性/退役tombstone、notificationread+clearRead墓碑。导入空隔离目标后逐字段/数量/引用+来源hash比较，映射差异单列；不仅比较ZIP hash或当前UI行数。 |
| 相同digest/冲突 | 初次导入和同digest重试所有业务ID/原receipt/原答案相同，操作/外发/spawn计数不增加；新包不同内容同ID、目标已有独立数据、重复section/ID/不完整owner先拒绝、零live写。全部源设备在清单，不用current device筛选漏掉历史。 |
| Automation+Notification切面 | 真实AutomationService、NotificationService+JsonStore/内存或真实FS，barrier插在run completion、notification reserve、adapter settle、run.notificationAttempted回写边界；拿到一致快照或BUSY，不能新run+旧receipt。clearRead后的receipt往返仍去重，pending导入显示unknown而adapter调用0。 |
| no-effects含下次启动 | 导入即时adopt和**全新实例正常启动**断言startScript/start/invoke执行/paste/schedule action/notify adapter/native scan/browser navigation均0；测imported run.notificationAttempted=false、旧pending/unknown、未绑定enabled definition、已消费cursor、失败/缺receipt。恢复不靠临时enabled=false一次掩盖下次publish。 |
| Invocation/原生结果 | 复用core/invocations.test.ts的真实journal先保存再启动、并发同ID/不同request conflict；导入不调用invoke。保全literal finalPrompt/files/source/旧无Space request、receipt started/pasted/timeout/rejected，message的完整Native result/usage/error/output/timeline/taskDelivery；恢复后重复查询/显式同请求只返回原事实。prompt-runner.test确认完整原生结果语义不被屏幕替代。 |
| 故障/重入 | 每个journal/backup/stage/replace/adopt/cleanup阶段partial/throw/readback mismatch/newinstance restart；全old或全new，不能混合。future/foreign scope/unknownowner、只读盘、ENOSPC、损坏摘要、路径穿越/绝对路径/编码别名/重复目标、symlink/硬链接覆盖受管文件、目录撤权/外部source drift均保全有效数据与诊断；cleanup失败不把坏包公布为成功。 |
| 门禁/缓存 | activePTY/action/launch、无法冻结owner、外部修改、未保存Markdown editor/draft均准确BUSY/冲突；gate之后memory update/touch/rename/close/late callback不能先改内存后悄悄丢写。失败/取消/超时安全release；新adopt后改一个settings/标注/布局/definition，其他导入字段和非agentnamespace保持；导入不走100条retention。 |
| 授权与禁用owner | 不读account home/transcript/任意SourceRef路径；structuredenv/凭据/activeendpoint不在包；sourceGrant/YOLOack不变目标授权。Agent/Automations/Notifications关闭仍能离线codec导出/预检，或明确unavailable，不能silently-empty，也不能启动controller/scheduler/helper来读。 |

可复用现成夹具：shared/json-store、SettingsStore/runtime、T02真实Space/FS/owner+recovery、agent registry/stats/history、core/invocations、automation.test的cursor/关停/重复与通知墓碑、notifications/core/service.test、automations documents/definitions未知区域/退役action、golden user-formats、Home board-backups故障/捕获目标，以及Safe export目标别名/发布模式。现成测试不覆盖尚无实现的跨owner协议；正式新增 test/agent-backup、automations/core/backup.test和各owner/adopt/recovery回归必须真正运行。Root统一类型/架构/样式/lint/build；当前只读不运行任何检查。

## 6. UI/设计和剩余限制

PAGE004 是备份范围/恢复说明：既有设置中展示实际owner/device/记录数量、包含/排除项、选源device布局、原生来源缺失/目录待重授、预检错误/身份碰撞、BUSY清单、staging/提交/恢复结果和可回读报告；未成功不显示成功。导入前明确范围，取消不落有效数据；提交中不能让Esc触发半事务release。保留原terminal/account/skills设置，不新造源文件浏览器或批量Run UI。PAGE003仅核对恢复后notifications与mailbox的read/ack/unknown语义及明确目标/焦点，不重做T10的控制工具或审批。

生产组件自动化/局部Chrome范围：正常/loading/empty/failed/BUSY/partial-source/longtext、en/zh、明暗/代表主题、≥960/600–959/<600/200%等价、32px desktop/44px coarse、键盘Esc/Tab/IME、错误role/status、所属Document Portal/焦点返回；后台导出/异步预检迟到不能切换当前Space/tab/窗口。真实双Vault导出导入、native chooser、Obsidian重启、Provider来源/五平台机器均按Spec§11交用户，未运行不冒充。

复用已固定 R01 Herdr/R02 Wave 的owner/引用分离参照（Apache-2.0），不推断其有本项目包/事务、不复制其数据库与运行平台；当前采用HUHU既有存储/备份机制，不加依赖。没有需新外查的陌生实现，未浏览外网/复制外部代码。未知仍为前序最终schema、离线owner装配、跨设备外部writer可冻结性、不同平台durable replace；缺验证时准确unavailable/BUSY/恢复门，不承诺未经测试的跨文件/跨机器原子性。

106 份共同来源的全文件时点摘要见 `/tmp/huhu-t16-source-observation.json`（SHA256 `031f7260a0bb22b6efd109d36d78c28349b1598c4aae815bda46a330b26194bb`）；相关段/检索/未变规则复用及hash观察，不是冻结输入/验收通过。只写本报告及observation JSON；未改任何仓库/正式记录/生成物/Git/deps/真实Vault，未运行tests/build/lint/helper/provider/native/宿主进程，未派Agent。

**READ-ONLY STOPPED（T-16）**
