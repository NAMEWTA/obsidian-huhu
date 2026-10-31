# T-15 data-migration：只读预检

2026-10-25；`/root/prepare_t02`，沿用 6.1-sol/xhigh。workspace `/home/wta/orca/workspaces/obsidian-huhu/terminal`；Root 声明 branch/base/HEAD 为 `NAMEWTA/terminal` / `33c21e098ef3188cbab5a09f3e0a01fadb787715`，未运行 Git。依据 GP014/Map15、T15/T16、Spec §3.8/3.10/§11、公共合同 §4.1/5/6、LOG030 用户原话、DESIGN rev1 A PAGE004，复用已回读未变的 dev/ui 及适用架构、许可、测试、shell、设计系统、动效/无障碍规则。DESIGN 摘要 `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`。

**结论：T15 应在真实持久 owner 上加一次受控停写/恢复事务，复用现有存储和前序单 writer，不另建业务平台。当前 v1 writer 仍有实现，但生产 Controller 已只接 v2；迁移不能把“正常 restore/normalize”或“停用模块”当作无副作用转换。T04/10/11/13/14 尚未冻结的最终格式必须在正式派单时重审。T03A 正修 AC005，本文只观察 owner/接线，不审查或干预其候选。**

## 1. 当前数据和 writer 清单

| 实际 owner / 位置 | 当前行为与迁移处置 |
|---|---|
| `createWorkspaceStore`：`.huhu/terminal-agent/<device>/workspace.json` | version1，500ms debounce；load 经 JsonStore，UI 采用 normalizeWorkspace；flush catch 后 report 并 resolve。定向调用搜索：生产仅 Controller 的 createSpaceWorkspaceStore；createWorkspaceStore 当前调用均在自身旧格式测试，不能写成仍有生产 v1→v2 双写。保留旧原件/backup/损坏证据，转换前单独严格校验和摘要。 |
| SpaceService / createSpaceWorkspaceStore：同设备 `workbench-v2.json` | 当前唯一生产 v2：逻辑 Vault/device/physicalRoot、Space、稳定 Session、目录 grant、per-Space layouts、sharedLayout、selectedSpaceId。布局内部 WorkspaceState.version=1 是嵌套布局格式，不是旧文件 writer。一个业务队列、同 owner permit、future/foreign primary+backup 每次读取/恢复/写前拒绝、严格 flush/drain；bridge 协调 same-ID/dirty/in-flight。迁移必须经同 owner，不能在 migrations 另建 JsonStore 并发覆盖。 |
| `NativeHistory`：`history.json`；historyStore 是展示投影 | title/tags/favorite/archived 以完整 tuple 为键；accountAliases 从明确旧账号引用映射，不按 native sessionId 合并。NativeHistory 构造即 JsonStore.load 元数据；HistoryStore.refresh 会 scan/query/read 原生日志，不适合作迁移枚举。NativeHistory.update 返回失败，但 tail catch 结算，dispose 仅 await tail，不能作为严格失败凭据。不可归属旧 account 标注/索引保留副本与报告，不认领到当前 Vault。 |
| TerminalAutomationRuntime：`automation-sessions.json` | AgentSessionRef 来源登记，不是完整答案仓库。registry key=[agentId,sessionId,accountKey]；已用共享 registry queue 避免重开穿插，dispose 的最后 persist 仍 fire-and-forget。迁移只保存原 tuple/引用，不 scan/listSessions，不通过 runtime.start 恢复。需 awaitable 严格 drain/adopt。 |
| StatsService：`stats.json`、`workspace-stats.json` | 自有累计 launched/workMs/daily/byAgent，不能当缓存删掉；当前 Controller 的计数使用 canonical workspace 过滤，旧 stats 文件仍需保留来源。flush 吞错；dispose 会 finish 工作区间，不能为导出而调用并伪造停止事实。活动运行直接 BUSY，空闲后 drain 原已接收 capture/写入。 |
| SettingsStore：`.huhu/config/settings.json`、`devices/<device>.json` | SettingsStore 是整文件 owner；agent namespace 为 device scope。raw/persisted/bound namespace.value 三种基线必须一起 adopt；单 reload 文件不会更新已绑定缓存。update 在 schedule 前已 mutate+notify，门禁必须先于 recipe/touch，不能只锁磁盘。迁移不重写其他 namespace。 |
| 旧消费者配置 | Agent quickCommands；Home settings shortcutButtons/skillWidgetButtons；board Markdown quickActions/skills/Pipeline；standalone automation definitions。T14 负责最终 codec/Space 字段和交互准入。T15 **保留旧 unbound**，不拿 imported Space、cwd、唯一候选或当前焦点补值。格式未需变化的 owner 保持原件，不因迁移顺手整篇 serialize。 |
| Automations / Notifications | runtime.json 中原 run/invocation/receipt/完整结果，及 inbox.json 的 records/read/receipts，继续原 owner。T15 不改变自动化语义；若本次转换触及它们，必须在本票完成其冻结/adopt，不能借 T16 未来保证安全；未触及时仅保留/报告，不执行 load/publish。详见 T16 清单。 |
| 账号/技能/浏览器 | `.huhu/agents/` 及系统 CLI home、账号 Hook、全局/库内/extra skill 原 owner 保留；现有 legacy-accounts 的冷重启/显式绑定/摘要封存不能被通用迁移替换或自动重播。Browser profile/Cookie/session 为原 Browser owner；T13 共享布局按其最终端口纳入，不复制 Cookie/cache。 |

设备枚举须由 owner 白名单发现全部已存设备，不能只用 deviceId(app) 漏掉旧设备。TextStorage 只有 exists/read/write/mkdir/可选 updateAtomically，没有 list/rename/remove；目录枚举与同目录发布在 desktop adapter，身份来自宿主，禁止从包/旧字段决定任意系统路径。当前 `.huhu/config/identity.json` 是宿主身份映射，不作为“还原旧设备”整体覆盖对象。

## 2. 转换中的两个具体风险

- **普通 normalize 不是迁移审计器。** normalizeWorkspace 限 200 tabs、4 groups、4 pane refs、树深度，丢未知字段/退役 page，归一化 terminal state/unread。先保全旧字节并验证版本，逐项计数/映射，明确报告不可采用的记录；不能正常 load 一个不支持版本得到 emptyWorkspace 再写。closedTabs、customTitle、pin/color、group/tree/order/recent/active 和 browser pageId/url/profile/zoom 都要核对。统计/标注/原生来源不以当前可见 tab 列表代替。
- **旧多 cwd 不自动变授权。** 一个旧 layout 可有不同 cwd 的 terminal/pane，Spec 仍要求无 Space 的旧布局进入明确命名的“导入空间 · 旧工作台”。保留旧 pane/native/account/cwd 的来源事实和映射；不要按 cwd 合并 Space、隐式为每目录造授权，或把所有 resume.cwd 改为 imported Space cwd。原 runtime ID 不是新稳定 Session/nativeSessionId；新持久 ID 映射应先记进 journal，重入复用，不能每次 randomUUID 再导入。后续明确继续按 T12/T14 的实际目录/账号/Space 准入核对；不一致准确待处理，不由迁移即启动验证。

## 3. 最小单 writer 迁移事务

沿公共合同既定语义，不新增数据库/daemon；函数名和具体 staging 路径由正式实施选定，以下为必须可验证的不变量。

1. **只读 inspect / dry-run**：固定 Vault/physical/device、源文件版本/原字节 hash、owner 与 ID/引用/数量；区分 missing、unreadable、invalid、future、foreign。既有 v2 非空不覆盖或自动拼接旧 layout，先按来源摘要/已完成迁移事实判定幂等或冲突。缺物理/目录授权保留未验证来源，不降级校验。
2. **BUSY + 关 admission**：活动 PTY/Agent/automation action、启动中/未核实残留、无法冻结 writer 或其他活动实例/设备均列出并拒绝，不自动 stop。先给全部参与 owner 加门禁，再等待已接收操作/晚回调；不能逐个 drain 后立即解锁。UI/CLI/后台、metadata/settings/显示布局内存写、只读 refresh/adopt 入口都受相同 token。
3. **strict drain / 共同快照**：任一 workspace/stats/history/registry/settings 持久失败 reject，超时撤销门禁且保留旧有效数据。WriteQueue.settled 吞结算错误、v1/stats flush 吞错、NativeHistory.tail catch、registry void persist 均不足。T02 flush 可复用，但 dispose 是永久 closing/关 lease，不是可恢复 quiesce。磁盘队列不在 Provider 等待期间占锁。
4. **保全 + stage**：所有参与文件旧字节与 hash 的恢复副本读回核实；先形成稳定源→目标 ID/device/Space/native tuple 映射和权限意图，再暂存转换。journal 记录 operation/source-set digest、各路径旧/新 hash、阶段及映射；不含凭据/runtime/锁。快照和 live 替换前重验源摘要，漂移停止，不悄悄吸收另一版本。
5. **校验后提交**：校验整个暂存集合的版本、大小、ID唯一性、引用、数量、权限状态；所有待采用目标均 ready 后写 durable journal，逐文件替换、读回。跨 config/terminal-agent/Markdown 等目录不能宣称一次 rename 原子。回滚/前滚依 journal 精确 hash，目标既非预期 old 也非 new 时保留两份并保持恢复门，不覆盖外来数据。
6. **adopt 再开门**：相关 reader 先不观察半旧半新；重新构建每 owner 的 live state、baseline、JsonStore、bridge draft/pending、namespace raw/persisted/value，全部成功后才 release。不是把新字节塞进旧缓存。失败保持可定位旧/新/stage/journal，不能把 cleanup 错误吞成成功。
7. **启动恢复**：在参与业务加载前处理 pending journal。当前 main 在 initializeDevice 后即 managedContent.refresh → loadSettings → 模块激活；恢复门至少须置于 settings/内容与模块业务采用之前，宿主身份本身不随业务恢复覆盖。全新实例逐阶段重入能收束为完整 old 或完整 new；重复 recovery 不重复导入/发送/启动。
8. **旧 writer 收缩/回退**：当前生产 v1 调用搜索已为零，只能证明该观察点，不代表迁移完成。正式 T15 要保留旧输入与已验恢复副本，给旧路径/版本 active-writer fence，并验证实际支持的旧 writer 在切换前已打开和切换后新打开两窗口都拒写新格式。不能声称任意历史二进制都会理解新增 marker；如果让旧版运行仍可写原 workspace.json，必须说明它只会产生隔离旧分支，不能据此宣称新版被逆向恢复。新版已有记录时先停止写入并完整保全新版，再更换程序/显式恢复旧副本；不做自动降级或用旧数据覆盖新 v2。已确认可读旧源不是可重放任务。

## 4. 写集缺口和正式派单前输入

目前 recovery-contracts/transaction、app/recovery、Agent migrations 目录是拟新增，尚无实现；当前 T15 已批准 app main/settings、shared SettingsStore、agent api/module、history service、runtime registry、stats 等，不能把其路径存在当功能存在。

已证实仍需按最终 owner 精确核对（本轮不写、不请求实施）：

- **`src/modules/agent/services/spaces/space-service.ts`、`space-service.test.ts`、`space-service-recovery.test.ts`**：真实 v2 queue/permit/scope、短期门禁/快照/adopt；T15 当前 writable_paths 没有 spaces。若转换增加 schema/migration provenance，再补同目录 `records.ts`、`records.test.ts`，不削弱 future/foreign 门。
- **`src/modules/agent/services/workspace-service.ts` 与实际相关测试，必要时 `services/controller.ts` / `controller-space.test.ts`**：当前业务和活动事实/显示写入口。T13 后共享 owner 若已提供完整 gate 可只消费它；否则 bridge 冻结不能在服务 mutation 后才拒写。workspace-store*.ts 已获范围并不覆盖这些。
- **`src/shared/storage/vault-layout.ts` / `vault-layout.test.ts`**：若 journal/staging/归档新持久路径统一落常量，这是实际 owner，当前 T15 未列。目录 safe resolver 可复用，Node 留在已批准 platform/desktop/migrations；不要为 list/rename 自动扩大 shared TextStorage。
- **`src/host/obsidian/storage/content-files.ts` / 对应精确测试**：只有迁移实际改 Markdown definitions/board 或需要启动前阻止其编辑 writer 时才补。现有 ContentFiles.checkEditor 已能拒绝未保存 editor/draft；优先使用其公开保护，由 owner 暴露 snapshot/stage，不在 Agent 直接改笔记。若不改这些文档，不扩大 T15 到 Home/Automations。
- **离线 owner 装配**：当前 services.acquire 会启用模块，peek 在禁用时不给数据；`ModuleInstance` 无 recovery owner hook。优先在已批准各 module/api 与 app/recovery 中提供独立轻量 codec/adapter 加载，不构造正常 Controller/scheduler。若公共 loader 需要字段，精确补 `src/app/contracts/module.ts`（及真实测试/manifest 路径），不能伪造 app serviceKey 或让 Agent 导入其他模块私有实现。

正式接票前需要 T04 归档/活动/恢复状态、T10 mailbox read/ack/limits、T11/12 完整来源 tuple/标注 codec、T13 shared layout owner、T14 unbound config 和旧 identity/receipt codec 的最终样本与真实端口；本报告不为它们造文件或平台。Home board/技能声明保持原 owner 与文本，若需有意转换，先给具体 public owner/文件写集，不能用 agent backup 读整个 Home 树。

## 5. 可复用故障夹具与 T15 必须新增的闭环

- `shared/json-store.test.ts` 已有 backup verification、partial primary、unreadable、corrupt/readback、外部删除/冲突、drop-read 队列场景；只证明单文件。T02 `space-service-recovery.test.ts` 是 cold/warm × primary/backup × future/foreign + repeat + needsRecovery/EIO，`workspace-store-spaces.test.ts` 保留 dirty/in-flight/same-ID/focus；真 FS/OS owner 集成在 workspace-service-spaces.test.ts。迁移不得为绿灯绕开这些门。
- SettingsStore/store 与 app/settings/runtime tests 有立即/防抖、raw未绑定 namespace、外部删除、写失败后恢复、保存中编辑/订阅者编辑；扩为 transaction adopt 后再改一个字段，其余恢复值/非 agent namespace 不被旧缓存覆盖。
- registry 的 agent-runtime.test 有外部+本地 hook 合并及立即重开排队；StatsService tests 有跨午夜/归属过滤；legacy-accounts.test 有冷重启+明确绑定+保留原件。它们不是迁移整体验收，新增严格 failure/门禁断言。
- 可借 Home board-backups 的 **manifest 最后发布、逐文件 digest+读回、before-restore 副本、捕获目标、partial/empty/corrupt-success/cleanup-failure** 夹具；其范围仅看板/记录，不能直接调用作跨 owner事务。Safe export 的同目录 wx temp→sync→读回→rename→目录sync/读回提供本机发布模式参照，不跨模块导入 safe 私有函数。
- 新增 test/agent-migrations + recovery tests：空/多组/多 cwd/未知/损坏/仅 backup/闭合引用；相同来源连续重入不变 ID/不重复；源漂移、target 冲突、旧 writer 两窗口；**每一个 journal写、旧副本、stage、目标替换、adopt、完成标志/清理前后故障后建全新实例恢复**，两文件以上跨 owner断言全旧或全新，不只 mock coordinator返回值。
- 每 owner write/readback/drain 失败都不能成功；BUSY/取消/超时后 gate 可恢复；版本/外 scope 拒绝零 live/backup/corrupt/mkdir 写。断言迁移/恢复/重启的 dispatch/spawn/paste/schedule/notify/native scan 都为零；旧 invocation request/receipt/finalPrompt/完整原生结果及未知状态保留，不补 Space，不调用 invoke 回放。

UI 绑定 PAGE004：沿既有设置新增迁移预检/范围与来源计数、BUSY清单、转换中、失败恢复/重试、已完成/回滚限制；明确保留旧副本的位置及未归属项。PAGE003 仅用于核对 mailbox read/ack 与投递状态在恢复后准确显示，**不在 T15 重做邮箱/审批工具**。正常/loading/empty/error/long-text、en/zh、键盘Esc/Tab/IME、所属Document/Portal、32/44px、宽/中/窄、亮暗/reduced-motion局部生产UI自动化由实施期完成；原型不证明生产。真实复制 Vault 升级、宿主重启、旧版回退由用户执行，Agent 负责代码/故障自动化/Root构建，遵从 Spec §11。

## 6. 参考与限制

复用 reference-notes 固定 R01 Herdr Apache-2.0 / R02 Wave Apache-2.0 的 owner/引用/显示分离，不复制其存储栈或推断它们提供本项目事务。当前可靠发布/恢复机制优先来自 HUHU JsonStore、board-backups、safe export、legacy account recovery；不新增依赖，无陌生外部功能需外查，未浏览外网/移植源码。跨平台 fsync/rename、跨机器同步 writer 可冻结性尚未实测；本机 T02 TCP lease 只证明同物理Vault/device本机参与实例互斥，不能宣称覆盖远端同步。无法安全冻结或外部来源漂移必须 BUSY/冲突，不造第二锁平台。

106 份共同输入时点 SHA/字节见 `/tmp/huhu-t15-source-observation.json`，SHA256 `8eb63787e8c06bb6910716b62734e9fced77fe06d961001d03e35e76a4c1d0c4`；含相关段/检索/规则复用及全文件 hash 观察，**不是冻结审查输入或通过证据**。T03 活跃与未来 schema 须回读。

只写本报告和 observation JSON；未改仓库/正式工件/生成物/Git/deps/真实 Vault，未运行 tests/build/lint/helper/provider/native/宿主进程，未派 Agent。**READ-ONLY STOPPED（T-15）**。
