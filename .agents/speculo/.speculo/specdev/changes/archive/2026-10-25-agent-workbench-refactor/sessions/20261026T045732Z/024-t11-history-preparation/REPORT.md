# 任务回报

Session: 20261026T045732Z  
Task: 024-t11-history-preparation  
Status: completed

## 聚焦交接

本024只读准备完成，未实施T11，未运行生产probe、测试、PTY、Provider或Obsidian，未读取真实账号/原生日志目录。T08和全部产品继续SOURCE STOPPED。建议沿原NativeHistory/HistoryStore及native agent_data实现“有界来源元数据→精确归属→正文读取→可重建索引→Vault投影”，把HUHU自有引用、绑定、标题/标注及最后已知元数据独立保存。无需新增历史daemon、业务SQLite或另一套账号/Session管理器。

关键现状不是简单“native一律写完再过滤”：默认右侧走account索引，确实会摄入并读取跨Vault正文后才在UI过滤；独立vault索引会按真实cwd在写库前拒绝外库，但部分解析器已先读取正文，且缺少HUHU精确绑定优先、已授权库外Session自身绑定的例外。两条路径都不能直接作为T11完整准入合同。

本报告供Root后续落具体路线与写集，不宣称T11/AC033–036/061或完整Goal通过。T12负责精确继续/导入、跨实例占用；T15负责旧归属/账号标注迁移，T16负责恢复协议。T09未来控制schema/UI/Pane变化需要在T11实施前重核。

## 产物与验证

证据根 `/tmp/huhu-t11-history-preparation-20261026T142847Z`（R）。R/input.json为Root T08冻结输入原件，SHA `fec66cf44fe9258bb84fe8e7f99614a7a4ea91a03f0f05a76e27bceff0a39642`。R/source-manifest.json SHA `d28dbc0086a19e3a7eaac6fe6ab320ca41d5a742b21a135785804e11753cd552` 保存61个实际源/合同输入的SHA、模式及可回读CAS；历史源对已提供冻结基线未发现产品漂移。此为静态来源快照，不是编译依赖图或测试通过。 最终只读复核见R/source-manifest-final.json（67项，SHA `0ec922ffe853bf0e67f4ae26ea7a101c7c0c82084a104090f45736a0f3d7d0f9`），补入已读CLI/usage及本次validator闭包；selected_source_drift=[]。这里只核所列输入，不声明全仓无漂移。

024冻结TASK写GP031/Map32；工作中Root通知GP032/Map33仅行政推进及后续025 Cookie三路径窄修。实际manifest已保存Map33/GP032字节；没有回改024 TASK或追着其它writer扩研究，没有导入/编译Cookie动态路径。旧020/023报告、临时根、bin与证据只读，023报告文件模式表的Root勘误也未覆写。

下文未以`native/`或`src/shared/`开头的源码路径，均相对`src/modules/agent/`；实际完整路径、字节与CAS见source manifests。

### 一、当前实际链路与owner

```text
Controller.historyStore（默认account）
  → NativeHistory.scope/index.sqlite + configured account roots
  → TerminalSessions.historyClient → acquire('history') → native History worker
  → agent_data scan/parse → history_text全文 + history.body搜索内容 + summary
  → SQL query(scope=account/vault, OFFSET页)
  → HistoryStore逐页收集全部结果、4并发读取正文及原文件details
  → SessionHistoryPanel：默认inVault展示过滤、客户端搜索/排序/虚拟列表

另一路 workspaceHistoryStore(scope=vault)
  → workspace-index.sqlite → WorkspaceUsageStore
  → 不是当前右侧SessionHistoryPanel的数据源

HUHU标题/标签/收藏/归档
  → NativeHistory JsonStore → .huhu/terminal-agent/<device>/history.json
  → 不在原生CLI日志，也不在可重建SQLite全文表
```

| 真实入口/源定位 | 当前能力与缺口 |
| --- | --- |
| `services/controller.ts:335,339,444` | 建立account HistoryStore及独立vault workspaceHistoryStore；右侧使用前者。recentHistory只缓存第一页，history()默认account。 |
| `platform/history/service.ts:173–286` | scope解析实际Vault根及两个索引路径；扫描系统Provider roots和配置托管账号，保留账号alias；共享scan/query请求、32页缓存、连接/metadata/index版本。尚无精确HUHU绑定/显式来源授权输入。 |
| `services/terminal/sessions.ts:370,875` | history请求只懒取history能力，不调用spawnSession；可启动共享helper，不能把“不启动PTY”误写成“不创建任何helper/缓存”。查询还可创建HUHU自有索引/账号辅助目录，不等于全链零文件写。 |
| `native/pty-server/src/data.rs:29–96` | scan/query/read独立worker，scan写锁串行，cancel flag及原result permits；不阻塞PTY解析循环。等待写锁的取消和文件遍历仍需保持预算，不能用当前worker存在就宣称整个扫描有硬期限。 |
| `agent_data.rs:137–326,434–556` | private index路径/sidecar保护；scan 32条批事务提交并增revision；save保存完整text及title/cwd/text组合搜索body。没有删除HUHU标注。 |
| `agent_data.rs:560–686` | 每页事务内一致计算allowed/筛选/total/usage/page，排序modified DESC,key ASC，固定100条、OFFSET。返回revision但没有expectedRevision门，页与页之间可换版本。query先遍历summary校验来源，不等于bounded seek索引。 |
| `services/history-store.ts:21–91` | 刷新读完整列表，再4并发read/details，缓存仅按key+modifiedAtMs；account路径另查vault keys再标inVault。四并发不是总内存/全文摄入上界。dispose取消，尚无每次筛选旧请求的epoch。 |
| `ui/history/SessionHistoryPanel.tsx:172–228` | 默认vault过滤但可切all；搜索包含firstPrompt/最近turn正文；只在展示阶段筛，虚拟化不抵消前面的全量读取。展开预览本身不启动Session；resume是另一个明确按钮调用。 |
| `platform/desktop/history/details.ts:14–45` | 先验证账号/源路径，再fs.readFile原始日志作结构化details；读取无大小上界。旧scan.ts的128KiB上限不适用于这条链；`scanVaultSessions`当前只发现其自身与测试调用，不能拿它的cap证明NativeHistory有界。 |
| `core/history/types.ts`、`server/agent-data-client.ts` | 当前NativeSessionSummary有provider/accountKey/sessionId/cwd/path/mtime，但无完整设备/来源身份、状态、正文能力或cursor。模块api.ts没有公共History服务；应继续由Agent模块内部控制适配器访问原owner，不必造跨模块全局服务。 |

当前`history.json`已经与全文索引分离，是应保留的基础；JsonStore的校验、备份、共享写队列及merge可复用。不要另建业务SQLite。两个NativeHistory实例都指向同一标注文件，未来应共享同一facts owner/版本通知；不能让新抽屉、CLI各自维护不一致的标注副本。

### 二、摄入前判定的实际精度

`account`扫描允许系统账号的已命名Provider目录，以及本Vault `.huhu/agents` 下托管账号；路径约束证明来源权限，不证明其中每条会话归当前Vault。其`parse(...include_outside=true)`会保留外cwd，随后save正文；UI默认inVault无法撤销此前SQLite/内存摄入。相关现有测试`account_scope_includes_external_cwd_but_never_global_or_symlinked_sources`恰在证明旧account语义，不应删掉后声称新Vault准入已实现。

`vault`扫描确实在save前拒绝不在Vault的cwd，但“首次读取正文”仍有区别：

- JSONL路径先逐行读并`consume`加入text，再检查已取得的cwd；cwd缺失/晚出现时可能已读较多正文，单行及文件遍历未见metadata总预算。
- Gemini JSON分支先`serde_json::from_reader`整个文档并消费messages，最后才按cwd决定是否保留；`.project_root/projects.json`也不是精确Session授权。
- Grok先读session.json里的info.cwd并校验，再打开chat_history伴随文件；OpenCode先查询session元数据并校验cwd，再读取message/part。这两条顺序更接近应采用的两阶段接缝，但仍须补HUHU绑定/授权例外及有界metadata。
- `read`先从SQLite取summary+text，再`session_allowed`校验来源/cwd；它不重新核正文stamp。文件同路径换成另一会话或损坏后，旧缓存不应仍冒称最新可用正文。现有sources主要记录路径/required，未记录完整内容版本与同一打开句柄的身份。

建议准入按Spec优先级逐条、失败关闭：

1. **明确HUHU绑定**：从已持有VaultBinding/WorkbenchRecords及原Session runtime取得完整ref。使用records.sessions、TerminalSessions.list/get/managedRef/checkManaged和workspace.getManagedSnapshot的已提交身份核对；不能仅按nativeId、cwd、标题、process.title或当前账号设置猜。活动Session的nativeSessionId/transcriptPath已在TerminalSession上，持久记录通常在checkpoint补齐；Controller可注入只读binding投影，不必T11改Session布局格式。
2. **可验证Vault内真实cwd**：仅对未绑定候选做有界header/metadata读取；需可验证的绝对真实目录和当前Vault物理归属。编码bucket、词法prefix、NFC/NFD映射或Windows统一lowercase只可缩小枚举候选，不能成为最终授权。复用现有canonical边界，并针对大小写敏感目录/链接/权限失败补真实物理核验；不能假定`isCwdInsideVault`字符串工具自身有文件身份保证。
3. **用户显式精确来源授权**：授权应约束provider/account/device/native session/source locator，不能把Provider根的读取权限或一个库外Space目录grant扩大成全账号历史授权。授权库外新Session依自己的HUHU绑定准入；同目录、同账号的其它日志仍不获准。

metadata预算不足、格式未知、路径不可验证时只返回候选不可归属/来源状态，不继续全文兜底。只有通过准入的精确来源才进入正文parser、索引和搜索body。正文读取与预览再核原source绑定、权限和版本；用同一已验证打开对象或等效平台安全边界，避免检查路径后另开文件时被链接/替换换源。历史源只读，索引写只在当前Vault自有范围。

### 三、完整来源tuple与自有事实

建议稳定逻辑引用至少包含：`providerId + sourceDeviceId + account(stableId, system/managed) + sourceRootId + nativeSessionId + sourceLocator`。sourceLocator应是来源root下的精确逻辑位置/文件标识（SQLite来源还须有相应行身份），不是显示标题、cwd、当前PID或仅nativeId；拒绝路径穿越及未授权根。完整tuple作版本化规范编码/opaque sourceRef，CLI不直接暴露accountKey里的整份env。raw绝对路径、mtime/size、文件物理identity和parser版本属于当前观测/正文版本，另存，不能混成跨设备通用身份。 sourceDeviceId是来源provenance；导入/复制后不能偷换成当前读取设备。无法证明旧来源时保留unknown/歧义，不凭当前路径补全身份。

当前key只是JSON `[agentId,accountKey,sessionId]`：不同device/来源目录/文件复用ID会碰撞；系统账号更换Provider home时account标记也可能不变。不能按nativeId去重，不能把一个来源正文/标注覆盖到另一来源。需要保留账号ID及来源根的历史身份，而非查询时按当前显示名称重新解释。

| 变化/失败 | 推荐处理 |
| --- | --- |
| 同sourceLocator追加 | 逻辑ref不变；重新验证来源/版本，正文缓存revision变化，旧分页失效。mtime+size仅是缓存线索，不能证明同尺寸替换内容未变。 |
| 同locator换inode、改nativeId或格式 | 不自动把新文件当旧会话；校验元数据/版本后明确重建缓存或呈changed/unsupported。旧自有标注和来源引用保留。 |
| 同nativeId来自另一locator/root/device/account | 保留不同完整ref。若Provider明确证明日志轮转属于同一会话，可建立经过验证的locator alias；否则不静默合并。 |
| 来源被移动、轮转或缺失 | 保留ref、标题/收藏/标签/归档和最后已知元数据，呈missing/stale；只允许在已授权根有界定位及核验。不能用basename搜全账号或返回空text伪装成功。 |
| source或父目录被symlink替换 | 延续现有managed/system根与伴随文件约束，并核实际打开身份；不同物理来源不获准。Provider base本身的已配置合法链接与其下逃逸链接要区分，不能为方便一概放开。 |
| cwd不存在/权限拒绝 | 无绑定者不能由字符串补归属；已绑定者保留记录，若原文仍安全可读可以只读预览，继续启动的目录核对交T12。权限失败不等于不存在或损坏。 |
| Vault移动/复制、设备迁移 | 复用原VaultBinding/vaultId/deviceId/physicalRoot owner。原地移动与复制不得仅凭路径相似自动认同；重绑定/旧事实迁移交T15，跨实例占用交T12。 |

最小facts仍放当前Vault自有数据owner：完整ref、准入证据、关联space/session（可缺，表示未归类）、自有标注、最后已知最小metadata。Native正文及可重建搜索/排序副本只放索引。普通Shell只投影已有Session元数据，默认不含，可显式包含；不要给它伪造native会话或正文。

原`history.json`三元组标注先保留；只有完整来源可唯一证明映射时合并投影，歧义隔离可见，不把旧标注随cache重建删除。T11可建立版本化新facts/索引并安全读旧标注；旧account事实迁移/清理、Vault复制恢复的正式writer切换仍由T15/T16协调，不能把多JSON文件称作事务。已有Session标题/归档继续交SpaceService等原owner，历史独有标注交History facts owner，避免双写同一业务字段。

### 四、稳定分页、预览与局部降级

推荐“有界opaque cursor + 明确版本失效”，比跨请求长期持SQLite读事务/保存整库snapshot更小：cursor绑定当前Vault/device/instance、canonical筛选、indexInstance+revision、facts/binding版本及稳定排序位置。排序用`updated DESC,完整refKey ASC`；index重建即使revision重置也换instance。任何影响资格、筛选、标题排序或来源状态的变化，旧cursor返回明确stale/需刷新，不能静默拼旧新页。底层可改keyset或继续受版本保护的offset；不能仅因SQL有排序就声称稳定跨页。

现有NativeHistory的sharedRead/消费方取消、连接revision和32页缓存可复用。新HistoryStore按页/需要预览加载，不为列表eager读全部正文；筛选切换用独立AbortController和请求epoch，取消旧消费但不取消还有其它消费者的共享读，晚到结果不得写新筛选。旧NativeHistory.query调用者需同步核对或保留明确兼容适配，不能用新签名悄悄断开Controller/WorkspaceUsage等消费者。

CLI当前history.list/preview/open/resume/import在canonical schema有声明，但available=false，CONTROL_HANDLERS不含history。`history.list`只有provider/query/cursor/limit占位；history.preview只有source。explicit --space走通用target语法，当前history.list不会从环境自动注入当前Space，符合默认本Vault全Space的方向；实施时应真实grammar/服务核验可选Space过滤，不能为接线将Space改必选或偷偷用UI焦点。

复用`ControlPaging`的有限cursor与`controlJsonBytes`的完整封装预算，但它目前遍历Iterable/offset，不能直接拿来模拟native稳定分页。允许在原类加最小backend位置门，或在history适配中使用同一预算/版本策略；不保存第二份整库正文快照。list/preview须算完整`ControlResponse`外壳、requestId/target、source状态/warnings、cursor及JSON转义后的UTF8，始终≤49152B；native history内部RESULT_DATA_BYTES是524288B，两者不可混用。遇到单行无法放入需准确capacity；多行动态减页长，不切半个JSON对象。preview缺失/损坏/unsupported用明确状态和无正文，支持的有界片段给representation、范围/截断及sourceVersion，不能用空成功或把规范化Markdown称原生完整文件。

来源局部失败应保留其他已准入来源和自有metadata；索引重建、source缺失、格式损坏、权限拒绝、partial、unsupported分别可判。当前scan会批提交，warning超过128条/64KiB后整体error；旧行未必随parse失败删除，read又不核stamp。新路线应按来源更新状态、保留旧有效facts，取消/错误不能把部分扫描宣称完整，也不能一失败清空其他来源。不得把HistoryStore的`transcriptDetails('')`错误fallback当作可用空正文。

### 五、拟写集与owner建议（尚未授权实现）

| 最小主链路径 | 用途/边界 |
| --- | --- |
| `core/history/source.ts`、`source.test.ts`（建议新增） | 纯来源tuple/状态/准入决策类型与规范key；不导入Node或业务store。 |
| `platform/history/service.ts`、`desktop/server/agent-data-client.ts`、`services/history-store.ts` | 仍由原NativeHistory拥有facts与native请求，注入可信绑定/来源授权；返回有界页与按需preview；不新增全局管理器。 |
| `native/pty-server/src/agent_data.rs` | metadata先行准入、源版本/状态、可重建索引与稳定页；原inline tests为就近验证。`data.rs`仅当新请求/取消/结果语义确实需要时修改，沿原worker/permit。 |
| `platform/desktop/history/details.ts`及原scope/canonical接缝 | 限定准入后的只读原文/details；补字节/来源/取消边界。不要将旧scan.ts未使用路线扶成第二生产scanner。 |
| `services/controller.ts` | 必要实际接线：右侧/CLI切同一个Vault投影，并只读采原Space/Session绑定。该路径不在T11旧writable_paths，Root须先补。可用TerminalSessions现成managedRef/list/get与Space records，不必先改持久Session模型。 |
| `ui/history/SessionHistoryPanel.tsx`及新增`.dom.test.tsx`、`i18n.ts`、`docs/agent-workbench.md` | PAGE002列表、过滤、部分来源失败、明确只读预览；继续/导入保持T12边界，不把旧resume路径冒充新精确继续。原Drawer宽度/focus恢复由现有AgentWorkspacePage接缝复用。 |
| `services/control/history.ts`（建议新增）、`services/control/commands.ts`及相关tests | 模块内thin adapter，捕获同Vault scope/可选Space，不走terminal创建。Root须补commands及必要controller测试范围。router仅在现有捕获/生命周期端口不够时改，不机械扩大。 |
| `shared/native/control-schema.json`、generator及既有TS/Rust generated、control fixtures/tests、`native/.../control/cli.rs`若语法确有变化 | 由原协议唯一writer/Root串行生成；只在实现可用后广告history.list/preview。这些不在T11旧写集，正式补齐再做；T09结束后重核，不能照当前字节直接写。 |
| `history-store.test.ts`、`desktop/server/native-history.test.ts`、原scope tests、native inline tests | 保留原风险并新增下表闭环。根main.js/styles.css及可能budget/notices仅由Root实际构建后处理；无新依赖建议。 |

不建议T11写SessionRecord布局格式或跨实例占用表。完整来源ref可以由history facts关联现有Session身份，runtime原始来源只读注入；确需改Space持久字段时先明确T12/T15共同owner再补精确路径。`docs/data.md`若具体新文件格式需要说明，也由Root补对应维护职责，不在本准备越界改。

### 六、必须保留/新增的验证方向

现有可复用：history-store三项（4并发/cache/dispose及vault-only请求）、native-history的来源/账号alias/shared read/消费者取消、scope编码/边界、core transcript details、native的真实目录/取消、只读OpenCode、伴随文件/系统Provider根、index私有模式/sidecar、新旧schema、literal搜索/metadata先过滤、WAL读与批提交、超大read两阶段预算。这些本轮只读过，未运行，不称新绿。

未来至少补：

1. 同账号放两个Vault和库外日志、metadata晚出现/缺失/巨行/格式未知；记录读取字节及打开顺序，证明未准入正文不进text/search表和UI内存，而非只断言最终列表为空。
2. 已绑定库外Session可读，旁边同cwd/同账号的未绑定日志仍拒；绑定与cwd冲突、nativeId相同但device/account/root/locator不同，不能串标注或覆正文。
3. symlink/父目录替换、同尺寸换文件、源轮转/损坏/缺失、权限拒绝、Vault别名/移动/复制、Unicode/Windows case-sensitive路径；保留facts，准确状态，其他来源继续。
4. page1与page2之间追加/重排/删源/改标注/重建索引及同时切筛选；同版本无漏重，换版本明确stale，旧请求晚到不污染新页。49152B整envelope用中文、引号/control转义、长source/warnings和超大单行压界。
5. GUI和真实CLI共用实际投影→history-only租约→native隔离fixtures；检查spawnSession/Provider/Session记录写入计数为0，query/preview不隐式resume/import。缓存重建仅改可重建部分，标注更新失败须reject且保留前有效版本。
6. PAGE002正常/空/加载/部分失败/缺失/unsupported/只读预览与筛选可见性；宽窄、200%缩放、键盘焦点及返回、减少动效。T12继续确认/取消另验，原型三条fixture不是分页证据。

### 七、少量外部参考与采用理由

继续采用reference-notes的固定版本及窗口内活动证据：Herdr `2ecf19a...`/v0.9.5，活动commit `5608de0...`（2026-10-23）；Wave `97e5600...`，v0.14.5（2026-04-16）。本轮重新打开官方页面并取得6份固定原始源码/许可/依赖字节，均HTTP200，SHA存R/external-manifest.json。API活动/release三次GET因403限流，原错误和raw保留；不声称重新取得API当前状态，活动细节沿已验证reference-notes并辅以官方页面，不推导最新Issue状态。

- Herdr的[原runtime registry](https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/terminal/runtime_registry.rs)把live资源与纯状态分开，适合佐证历史预览不附带runtime。其[Apache-2.0许可](https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/LICENSE)及[Cargo依赖](https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/Cargo.toml)已回读；保留HUHU栈，不移植Tokio/ratatui/Ghostty或vendor。其[v0.9.5说明](https://github.com/herdrdev/herdr/releases/tag/v0.9.5)有Hook/非ASCII跟踪修复，作为来源版本和路径反例线索，不是HUHU历史parser失败的实证。
- Wave的[block controller](https://github.com/wavetermdev/waveterm/blob/97e560027f494d20fed347b2d6b72b6bcb3e50e0/pkg/blockcontroller/blockcontroller.go)分开持久block与版本化runtime状态，能借其分离思路；[Apache-2.0](https://github.com/wavetermdev/waveterm/blob/97e560027f494d20fed347b2d6b72b6bcb3e50e0/LICENSE)、[Go依赖](https://github.com/wavetermdev/waveterm/blob/97e560027f494d20fed347b2d6b72b6bcb3e50e0/go.mod)与[v0.14.5](https://github.com/wavetermdev/waveterm/releases/tag/v0.14.5)已核。它不是HUHU Vault原生日志准入器；不引入Go/sqlx/业务存储或controller自动启动行为来解决本票。

两者均没有可直接替代本票Vault归属与精确source tuple的证据。实际采用的是已有HUHU解析/JsonStore/共享history能力与分页预算，只借上游分离机制；没有复制外部生产代码、执行外部程序、添加依赖或操作Herdr工具，也没有阅读/移植GPL终端源码。

## 问题与下一步

准备目标已完成，无需新增用户产品确认：准入优先级、库外绑定例外、只读预览、事实保留和分页失效已由Spec明确。具体tuple编码、facts版本文件与cursor TTL/页大小属于Root在既有边界内可作的工程决定，上述给出推荐。真实来源格式及账号/设备绑定不明确时按unknown/unsupported处理，不放宽全账号摄入。

Root应等T08关闭和T09真实接缝稳定后，回读这些受影响输入、正式补最小controller/control/schema写集，再实施T11。T12/T15/16责任不在本轮提前实现。当前无生产probe，静态源码足以区分路线；没有为阅读制造测试，也未预填任何AC通过。仅执行来源快照/远程参考获取及报告后的return结构检查，结果分别留R/commands与delivery。 001/002执行前未另录独立argv收据或UTC开始时间，保留原raw与manifest完成时间，不追补开始值；003 return会保存本次真实argv/cwd/开始结束/退出码。

本024只写REPORT及新R；所有业务源、正式状态、旧证据、账号/日志、Git/index、依赖/Cargo/bin均保持只读。无PTY/服务/监听需要清理，原参考字节和报告证据保留。SOURCE STOPPED。
