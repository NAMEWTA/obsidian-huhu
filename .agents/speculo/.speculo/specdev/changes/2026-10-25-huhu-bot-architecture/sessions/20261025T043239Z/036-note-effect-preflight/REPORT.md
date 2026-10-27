# T07 单笔记效果、宿主 CAS 与回执核查预检

Session: 20261025T043239Z
Task: 036-note-effect-preflight
Status: completed

## 聚焦交接

研究结论：现有 Obsidian 公共 API 与项目宿主适配足以承接 T07，但当前 `HostInvoke`、`HostReceipt` 和来源 Port 还不能表达“用户批准的确切单笔记效果”。必须由原 owner 扩充真实协议及既有消费者，T07 再实现目标绑定、临写检查和回执核查。不能仅在新目录中做出一个绕开 BotClient / Application API 的可运行演示。本报告是实现前请求清单，不是 T05/T06 接纳、T07 实施或真实宿主通过证明。

本次按 TASK 冻结 Map 10 / Goal 9，代码 HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`；采样文件摘要见 `observations.json`。T07 现有写集是 Go `application/tooling/reconcile/**`、`adapters/outbound/hostbridge/write/**`、`tests/contract/effect-reconcile/**`、TS `platform/obsidian/note-effects/**`、`services/host-write/**` 和 `scripts/obsidian-acceptance/huhu-bot-note-effects.mjs`。共享 API/schema 属 T01，模块装配属 T20，根构建及现行工程文档属 T27。035 审查涉及的来源替换、长选区及 Grant 摘要问题仍归原作者，本报告不改其来源或重复认领。

### 1. 约束与实际接缝

| 事实 | 可回读来源 | 对 T07 的含义 |
| --- | --- | --- |
| 预览绑定目标、基线、diff、来源，批准绑定 effectId、参数摘要、能力版本、目标版本、策略、有效期；派发与批准分时复核 | `spec.md` §7；`ADR.md` ADR-007/008；T07 第 48–60 行 | 单个有效批准不等于所有笔记写权限；拒绝、过期、取消、版本变化不能实际写笔记。 |
| 业务 Effect/Approval/Run/event 由 Profile SQLite 持有，Vault 正文归 Host；Host 断线不可由 Go 接管 Vault | `ARCHITECTURE.md` §10.1、12.1、12.3；`ADR.md` ADR-003；`docs/data.md` | Host 本机接收/完成凭据是外部效果证据，不能变第二个审批或业务状态账本。 |
| `GrantOperation` 只有 read/search/send/summarize/memory/delegate/deliver | `src/modules/huhubot/api.ts:249` | 不新增全库 write Grant 来省略确切效果批准。资料 read/send 授权与笔记效果批准分别验证。 |
| 来源 registry 持有 TFile、来源视图、全文 hash；公开 revision 是递增序号，selection 的公开 hash 是选区 hash | `sources/sources.ts:75,122,137,151` | SourceRef 可定位已捕获来源，不是完整目标 CAS 或写许可；选区 hash 不能当全文基线。 |
| 来源 lease 变化清 registry、abort；read Port 只有 readSnapshot/searchSnapshots | `sources/sources.ts:55`、`sources/port.ts:4` | 不假设旧 sourceId 重连后仍可写；需要受信目标准备/解析 Port，不绕过私有 Map。 |
| HostInvoke 仅有 leaseId/workspace/capability/effectId/resource/revision/content；query 仅 lease/workspace/effect | `src/modules/huhubot/api.ts:314`；Go `application/api/types.go:74`；`contracts/hap/v0.1/schema.json` 的 host.invoke/queryReceipt | 缺当前 connection/epoch、能力实现版本、批准与参数摘要、目标模式/基线、执行归属及证据绑定。现有字符串 capability 不能表示版本。 |
| TS 仅 read/search 保留安全业务 reason，其他 Host 错误折成 HOST_REQUEST_FAILED；Go 对 invoke 的 reason 折成 HOST_REJECTED | `core/protocol/connection.ts:391`；`inbound/stdio/server.go:373` | SOURCE_CHANGED / UNSAVED_EDITOR_CHANGES / create 冲突必须由两端 owner 贯通，不能让 UI 只看到宿主不可用。 |
| 当前 receipt 校验 effectId 和四种 status，receiptId 可缺省，没有调用摘要或完成证据绑定 | `stdio/server.go:430`；TS `api.ts:328` | 单凭“status=committed”及相同 effectId 不足以验证原调用归属。 |
| 普通 HAP 客户端不能调用 host.invoke/queryReceipt；只有受管 owner 注册 Host | `inbound/hap/router.go:133`；`api/service.go:67` | 保留此方向和认证边界；不可通过新增普通写 RPC 绕开审批 Broker。 |

以上 `sources/`、`core/`、`services/` 短路径均位于 `src/modules/huhubot/`；Go 短路径位于 `native/huhubot/internal/`。固定来源清单记录的是读取时内容。交回前摘要复查发现 sources.ts、schema.json、goal-plan.md 已由其他 owner 改动：定向回读确认来源新增背景读取身份复核（unchangedFile，含异步 hash 后复核），host.invoke/queryReceipt 四个 schema 定义仍是上表形状，Goal 仍为修订 9。本报告不评价或接纳其修复；本文来源行号指初次采样，原始与交回摘要均保留。后续 T07 仍需自己的临写身份/全文基线 Port，不能把背景读取修复等同于写 CAS 已实现。

### 2. 目标是 Host 发出的受信身份，不是参数中的路径

**update 的最小本地记录（建议接口，尚未实现）**：opaque targetId、workspace/profile/device、来源 origin/client/view 与捕获 lease、捕获时 TFile 对象及冻结相对路径、完整正文基线或供同步比较的等值文本、基线 hash、目标版本/失效代数、能力及实现版本。Go 只拿序列化目标描述和 hash；TFile/App/Editor 留在 Obsidian adapter 内。Host 从已受信的来源 registry 或用户明确选择的文件/leaf 准备此记录，必须检查 view.app、file 所属 Vault、Markdown 类型与当前目录对象身份。后续切换活动 leaf 不重新解释目标。

来源公开 revision 不是 mtime，selection hash 不是全文 hash。目标基线必须来自实际目标内容；Host 本地保存用于 CAS 的全文不等于把未授予的全文发送给模型。模型若需读取目标全文仍走现有资料授权；预览需要显示的 diff 由受信准备用例生成。不能在派发时临时 getActiveFile/getMostRecentLeaf 找另一个文件。

**create 的最小本地记录（建议接口）**：用户明确选择的受信父目录（或受控默认目录）、最终显示并批准的单个 Markdown 文件名/相对目标、父目录身份/失效代数和“目标不存在”基线。模型可以提出名字，Host 负责校验和返回最终候选，审批绑定规范化后的确切候选；不在批准后自动改名、换目录或补建任意目录。现有生成文件命名规则应在预览前执行，不能对既有用户笔记重命名。文件路径只在 Host 内解析；wire 可有展示标签，不能因收到绝对路径便取得权限。

路径校验至少覆盖绝对/盘符/UNC/URL、反斜线别名、NUL/控制字符、空段与 . / ..、越界、配置目录、.huhu、.git、非 Markdown 与非 TFolder 父目录。normalizePath 是规范化工具，不是授权判定。新文件名/大小写与 Unicode 等价规则要以目标平台实际 API 行为冻结，不靠“校验时不存在”宣称无覆盖；文件、目录或平台别名冲突都须保留原对象并重新预览。

同路径删除重建必须失败：临写检查当前 getAbstractFileByPath(frozenPath) 仍是捕获的 TFile，且 TFile.path 未变；rename/delete 事件使本地目标代数失效。重启后旧 TFile 对象无法恢复，持久 locator 只供 receipt/postcondition 核查，不能让旧 targetId 自动换绑同名新文件并重写。公共 API 无 inode 身份证明，不能宣称能够识别所有绕开 Obsidian 的“相同字节、相同路径替换”或所有 symlink 竞态；需要目标 OS 后验，无法证明时保留 unknown/重新准备，不能改用 Go/Node 直写用户笔记。

### 3. 编辑器与 Vault.process 的确切边界

本地 Obsidian 类型依赖是 1.13.1；`obsidian.d.ts:7495` 声明 Vault.process 的变换回调同步返回新正文。官方指南说明需要异步准备时先准备，进入 process 后比较当前原文；隐藏目录通过 Adapter，普通笔记通过 Vault。官方当前固定声明也明确 plaintext create 遇已有文件抛错。来源：[Vault 官方指南](https://docs.obsidian.md/Plugins/Vault)、[固定 API 声明](https://github.com/obsidianmd/obsidian-api/blob/9abd9605ce081383674aae1ed111c456edde0688/obsidian.d.ts#L10245)。

建议时序是“有界准备 → 持久接收凭据 → 目标队列 → Vault.process 同步 CAS → 持久完成凭据”。异步 read/hash、预览、加载必要 deferred view、凭据 I/O 都在回调之外。回调内同步完成：当前本地 lease/generation/能力版本与取消信号 → TFile/路径身份 → 所有相关编辑器正文 → 当前全文等于批准基线 → 返回已准备好的新正文。禁止在回调中 await RPC/DB/crypto/收据落盘，也不把 file.stat.mtime/size 当正文一致性证明。按原文字符串比较能保持完整内容 CAS；编码/换行格式差异需要单独 fixture，不能偷偷忽略实际正文变化。

所有相关 MarkdownView 都要检查，包含另一个 tab、侧栏、浮动窗口。可用 iterateAllLeaves（官方声明明确含 floating/sidebar）或已核对的 getLeavesOfType('markdown')，先 instanceof MarkdownView，再检查同文件对象或冻结路径的 editor.getValue()。不能只检查捕获来源的 view。项目 `src/host/obsidian/storage/content-files.ts:405` 已展示全 leaf 检查并在 process 回调内执行；`content-moves.ts:48` 展示同步原文比较，可复用机制而非跨模块复制或复用其移动恢复语义。

DeferredView 不能强转成 MarkdownView；准备阶段可对确切相关 leaf 有界 loadIfDeferred，之后重新枚举。无法证明相关编辑器安全时拒绝本次写入，不把“没有 MarkdownView”自动当干净。Obsidian 未公开稳定 isDirty 属性；TextFileView 的 data/requestSave 也不构成可靠的已保存标志。editor 正文与磁盘原文的差异是保守拒绝信号；CRLF/编辑器显示规范化的假阳性需真实宿主验证，不以私有 .dirty 字段补洞。来源：[Deferred Views 官方指南](https://docs.obsidian.md/plugins/guides/defer-views)、本地 `obsidian.d.ts:7046,7998,8279`。

P1 对未保存编辑器返回 UNSAVED_EDITOR_CHANGES；不能 force-save、editor.setValue 或让已批准 diff 覆盖待保存输入。同步回调通过后用户仍可能继续输入、外部程序仍可能写文件，取消也可能在 API 已不可撤销后到达；Vault.process 不能把远程取消、编辑器自动保存和本机回执拼成一个分布式原子事务。应保存已发生的可信完成事实，另用后置条件核查表达当前目标状态，不做“出错即回滚用户文件”。

create 使用 Vault.create 的无覆盖合同，加紧邻调用前的现存对象检查；已有文件/目录的异常不得 catch 后改成 modify/process。当前官方声明有“已有文件抛错”，本地 1.13.1 plaintext create 注释未写此句，因此本次只确认文档合同，不声称最小支持宿主/外部创建竞态已实测。项目 createContentExclusive 的桌面实现把目的地限于 .huhu（`src/host/desktop/content-io.ts:8`），不能直接当普通笔记 create 原子发布器，也不能放宽其私有目录约束来省掉 Vault 接缝。

### 4. 批准、派发、Host 临写与结果的接口形状

建议 T01/T06 冻结纯 DTO/Port 后由 T07 消费，具体类型名可由 owner 决定，不能把此表当已存在的 API：

| 阶段 | 必需数据与规则 | 真实消费者 |
| --- | --- | --- |
| PrepareTarget / PreparePreview | opaque 目标、create/update、受信来源引用、目标完整基线/不存在、最终 diff/内容摘要、能力实现版本；返回本地 targetId 与可序列化预览绑定。准备不产生写权。 | 来源/目标 Host adapter → 统一预览用例。若现有本地 UI 捕获即可承接，可不新增 wire 方法；若 Go 发起准备必须走具名、受管反向方法，不能伪装 readSnapshot 可写。 |
| ClaimDispatch | 既有 effectId/runId/profileId、批准 id/revision/预览及参数摘要、目标版本、policy version/expiry、当前资料授权/接收方、取消状态、能力版本及当前 lease；短 Tx CAS 领取唯一派发。 | T06 Broker/Effect store；资料资格调用 T05 当前授权谓词。批准后的普通恢复仍走同一 Executor，034 已说明。 |
| Host invoke | current hostConnectionId/leaseId/leaseEpoch/workspace；上述确切 effect/approval/digest/target/capability 绑定；操作与新正文；有界有效期/派发代数。所有字段由受信 Broker 组装，不能相信模型自报 approved。 | Go outbound Host write → 受管 stdio → BotHost/HostWriteService。Host 检查批准绑定与本地准备记录一致；不能查到任意路径就执行。 |
| Host receipt/query | 原始 profile/workspace/device/effect 与调用指纹、原执行 lease/能力版本/目标基线、receiptId/证据种类及必要完成后 hash；query 另外带当前连接授权。committed 必须有可信原调用归属。 | Host receipt store → Go receipt verifier → 同一 Effect ledger CAS/event。新 lease 可核查旧调用，不能因此重新派发。 |
| Reconcile | 只读取已保存原 receipt 或确切目标后置条件；返回 committed / reconciled / unknown_outcome / 可证明未执行的 rejected，绝不执行笔记 mutation。 | T07 reconcile → T06 Effect ledger，沿 T04 已持久事件规则追加。 |

Host 不需要新建业务审批数据库，也不需要在同步 process 内向 Go 查询 Grant。Go 在独立 dispatch Tx 复查当前资格并给出受信的确切请求；Host 对已有本地目标及最新收到的 lease/取消/能力信息临写复核。取消若先赢派发 CAS 则不发 Host 调用；调用已在途时取消无法证明文件未写，必须按原 effect 核查。网络延迟下 Host 尚未观察的远端取消不能被描述为即时全局屏障。

错误需稳定区分 SOURCE_CHANGED、UNSAVED_EDITOR_CHANGES、create conflict、CAPABILITY_DENIED、HOST_UNAVAILABLE、IDEMPOTENCY_CONFLICT 与 UNKNOWN_EFFECT；错误码/安全 reason 由现有 schema owner 定义，不直接透传任意宿主异常或文件绝对路径。当前 reason 折叠是必要维护项；仅在 T07 throw 一个 BotRpcError 并不会端到端满足 AC-026。

同一 effectId＋同指纹：在途去重、返回已有完成证据，或只核查；不可再走 Vault.write。相同 effectId＋不同目标/参数/批准/能力绑定：冲突并保留原记录。重连不能通过换 effectId、运行 Retry 或修改 expectedRevision 洗掉未知效果；新的用户意图必须先处置原未知效果和权限边界。

### 5. Host 凭据数据归属与非原子窗口

最小候选位置是 `.huhu/huhubot/<deviceId>/host-receipts/<profile-key>/<effect-key>.json`，用现有 privateVaultStorage/TextStorage 受管写入；deviceId 从已初始化 vaultIdentity 注入，不在每次写中建立新机器身份。profile/effect opaque ID 不直接拼文件名，应生成受限安全 key，并在经过验证的内容里保存原 tuple。此路径是**待 Root/owner 绑定的实现选择**：符合现有 .huhu 运行数据分类，但当前目录常量/数据文档和 Git 排除没有它，不能把“隐藏”说成本机不被同步。外部 Obsidian Sync 是否同步此目录仍由宿主设置与用户现场核对，不能仅靠本项目 Git 排除证明。

回执只保存执行指纹、目标最小 locator/版本/hash、状态与证据，不保存全部对话/CP/凭证或另一个 Approval/Run/event 副本。目标 locator 本身属于受管数据，要纳入删除/恢复清单。Profile SQLite 仍是业务状态权威，Host 凭据证明那台宿主收到/完成了哪个确切调用；Host 本地状态不独立宣布 Run 成功。现有 TS 没有可直接写 Profile 的受控 HostEvidence Port；若选择 Profile 路径，应由原 owner 新增明确接口，不能让 TS 直接打开 SQLite，也不能让 Go 读 Vault 用户文件。本报告优先建议现有隐藏运行数据接缝，不决定第二种新存储架构。

可复用 JsonStore 的 schema 校验、串行写和写后回读（`src/shared/json-store.ts:109`），但其默认三方合并/旧 backup 恢复不能自动用于防重放记录：状态与调用绑定必须单调，坏文件/回滚的备份不能恢复成“尚未调用，可以再写”。TextStorage.updateAtomically 是可选能力，不能推定笔记与回执共同事务或跨机器锁。不要为回执失败再次调用笔记写；写前接收凭据失败就停止。

| 已知证据/故障窗口 | 可报告结果 | 禁止推论 |
| --- | --- | --- |
| 明确在 mutation 前被拒绝，且本机执行控制证明本次未开始 | rejected，并持久化必要拒绝证据 | 异步调用超时/断线不能按这个分支推断未写。 |
| Vault mutation 返回成功且原调用完成记录可靠保存/验证；回包可丢失 | committed；query 返回同 receipt 与同调用归属 | 仅批准或仅 received/prepared 记录不是 committed。后续用户改了正文也不抹掉已发生的原提交事实。 |
| 笔记可能已写，但完成记录没有保存；核查时目标严格符合已批准的后置条件 | reconciled，并明确只有状态证据 | 相同 hash 不能证明“由原 effect 写成”，也不能伪造 receiptId。 |
| 原调用是否落地不明，目标缺失/不同、身份替换或证据损坏 | unknown_outcome | 当前仍是 before 内容也不能证明没写过，可能写后被恢复；不能因此盲重写。 |
| 原完成记录可信但新连接/Run 已终结 | 保留 committed 事实并按当前读权限追加核查事件 | 旧 lease 只能证明原效果，不能获得新派发权；terminal 不等于拒收证据。 |

received/prepared 应在触发 Vault mutation 前持久化，故障后至少知道哪个 effect 可能在途；记录无法消除它与物理写入之间的窗口。重启读到 prepared/dispatching 必须核查，不能当安全重试令牌。只有当前可信 receipt 或状态证据能推进业务账本；无证据保持未知。

普通会话正文删除不修改已交付笔记。未知效果的最小核查/去重记录可以按 ARCH §10.2 保留，核查结束及清除旧命令有效窗口后才能移除；不能无限保存完整对话。T17/19 后续需覆盖 Host 本地凭据和 epoch 失效，本票只提供清晰所有权与清理 Port，不借此扩大到整个产品删除实现。

### 6. 有界执行与生命周期

TS 当前 reverse pending 限额、HostReadService 的 8 个活动操作/3 秒上限可参考，但不能把数值当已测写预算。HostWriteService 必须有全局活动数、排队数、待处理字节、单目标串行及同 effect 去重；超额在 mutation 前拒绝。新正文/基线/receipt 的最大字节数还须计入 HAP 1 MiB 帧与 JSON 开销，不能仅给 content 一个“最长字符数”。

`HostReadService:49` 在底层 promise 真正 settled 后才释放 active，这是写服务应保留的机制。当前 connection 的 Promise.race 超时会移除 reverse 项，但不能终止已调用的 Vault API；若写服务也立即释放底层许可，连续超时可积累无界实际工作。已经启动的 mutation 必须继续持有预算至真实完成，迟到完成保存本地证据。queued 项收到 lease/generation 变化或 abort 应在临写前拒绝；已越过不可撤销边界的项只记录事实，不能声称取消回滚了文件。

Go stdio.call 有有限等待、pending/输出队列与超时关闭；超时后旧响应不能简单塞回新 pending。现有读取路径“结果完成后 lease 变了就丢弃”的规则不应原样应用到写证据：旧结果不得授权动作，但必须能通过持久 query 核查。关闭时停止新受理、失效未派发项，有界等待；无法等待到底就保留 unknown。模块 dispose/宿主退出不承诺所有异步 Vault promise 已撤销。

### 7. 精确最小原 owner 维护清单

下表是需要 Root 冻结到相应写集的请求；没有给本研究或未来 T07 自动扩大写权。先完成 T05/T06 接纳再派 T07，现有 035 修复窗口不被打断。

| owner / 原路径 | 最小维护请求与消费者 |
| --- | --- |
| foundation_client / 原 T05 来源 owner：`src/modules/huhubot/platform/obsidian/sources/port.ts`、`sources.ts`、`sources.test.ts`（若实际测试拆分则原位） | 提供受信目标准备/解析的窄接缝，保存冻结文件身份/路径/全文基线及失效代数；内部目标对象只交 Obsidian note-effects，不泄漏到 Go DTO，不创建平行 source registry。T07 私有 target registry 可由该 Port 创建记录。035 来源问题由该作者自己的修复处理。 |
| foundation_go / T01 合同：`internal/application/api/types.go`、必要独立 `api/host_write.go`、`internal/protocol/hap/types.go`、`contracts/hap/v0.1/schema.json`、`methods.json`、`fixtures/methods.json`、`fixtures/golden.json`、生成文件及 `src/modules/huhubot/api.ts` | 一次冻结准备/派发/receipt 的纯 DTO、当前与原执行 lease、能力版本、目标与摘要绑定、拒绝/证据形状及有界数据；只在实际需要远程准备时新增具名 reverse method。同步 runtime validator、有效/无效夹具，不只改类型。沿用现有 Decimal/opaque ID/error 合同。 |
| foundation_go / T01 Host与传输：`internal/application/api/service.go`、`internal/adapters/inbound/stdio/server.go`、`internal/adapters/inbound/hap/router.go`、`internal/bootstrap/core.go`；原 foundation duplex/fixtures 测试 | Invoke/QueryReceipt 的逐字段转换和结果验证、current lease/版本检查、安全业务 reason、真实 write/reconcile Port 注入。继续拒绝普通客户端反向 Host 方法。query 可核查旧调用但不恢复旧写权；晚到响应依持久查询收敛，不放松任意响应匹配。 |
| foundation_client / 原 T01 TS：`core/protocol/connection.ts`、`connection.test.ts`、`method-validation.ts`、`method-validation.test.ts`，如错误 DTO 扩展再维护 codec | 对 invoke/query 贯通批准/目标/epoch/版本校验与稳定错误；保留有界 reverse、关闭/leaseChanged 生命周期，不能把写后成功证据按读取语义丢掉。若增方法同步现有 schema 形状计数，不重新造 validator。 |
| T06 Effect/Broker/Executor owner：已派遣时实际 `application/tooling`、Effect store 与 T03 executor Port | 给 T07 使用唯一 ClaimDispatch、RecordReceipt/Reconcile CAS、原 effect snapshot、取消/版本校验与终态后 event 入口；实际 receipt 与业务 Effect 更新同短 Tx，Host I/O 在 Tx 外。当前未实现的接口不能以 report 文字冒充生产消费者。相关 pin/Resume 仍按 034 完整正常审批闭环，不移交 T16 逃避。 |
| T05 授权 owner：既有当前 Grant/recipient/source 授权谓词 | T06 dispatch 复用 read/send 等现有资格；Host 对准备记录绑定复核。无需新增 write Grant 或重复完整 Grant Store。 |
| T07 本票写集 | 实现目标/receipt adapter、HostWriteService、有界生命周期、Go outbound write/reconcile 用例和 contract fault suite；接口消费跨上述真实边界。已有 content-files/moves/private-storage/JsonStore 只作机制或公开共享适配复用，不挪动其 owner。 |
| T20 装配 owner：将来冻结的真实模块 manifest/module/runtime 入口 | 同一个 BotHost 合并 read/search 与 invoke/queryReceipt，注入 app、workspace、初始化身份、leaseChanged、Component lifetime；capability 只声明实际已实现版本。当前 huhubot 尚无可据以声称已注册的 manifest/module 入口，T07 可交实际 adapter factory 供 contract fixture 消费，不能冒称正式 UI 完成。 |
| Root 指派目录/同步 owner；最小文件为 `src/modules/sync/core/excludes.ts` 及其既有排除测试；如采用集中路径常量，再明确 `src/shared/storage/vault-layout.ts` owner | 若选择候选 receipt 根，加入准确本机运行数据 Git 排除与 fixture。现有 excludes 第 13–35 行未覆盖 .huhu/huhubot；不能只放文件便认为私有。无该维护不得宣传 local-only/sync-safe。 |
| T27 数据文档 owner：`docs/data.md`、相应实际开发数据规则；T17/19 生命周期 owner | 最小记录 receipt 路径、owner、最小保留和清除接缝；不改永久 ADR/context，不重写全产品数据方案。Host 凭据不作为可移植有效批准导出。 |
| T07 新 probe + 原 acceptance helper owner（仅实际需要时） | 新脚本调用公共审批/应用 API 和真实 Vault adapter，复用 fresh-vault。当前 helper 的 stop 强杀分支没有在 kill 后 await exited（`fresh-vault.mjs` stop），若需要可靠重启/清理，应请求原 owner 最小补齐或为新脚本提供可等待出口，不能在 T07 越权改 helper。 |

本报告没有发现必须新增第三方依赖、修改 go.mod/go.sum 或新建另一业务数据库的理由。单机 receipt 表若改用 SQLite/新 migration，须回到 T01 串行 schema owner，并先明确为何现有 Host 存储接缝不足。

### 8. 最小自动化故障矩阵

每项至少断言“调用次数/目标前后内容与 hash/原 effectId/receipt 类型/业务状态及 event seq”，不能只断言异常字符串。下表是待实现测试，不是本次运行结果。

| 故障注入点 | 必须观测的结果 | 验证层 |
| --- | --- | --- |
| 来源 leaf A 捕获后活动 leaf 切 B；目标是 selection，全文其他位置变更且 stat/大小不变 | 不改 B；以全文基线拒绝 A 的 stale intent；公开 selection hash 不被误作全文版本 | TS adapter + Go 公共审批链 fixture |
| 准备后同路径删建新 TFile、rename-away/recreate，或 create 父目录被替换 | 身份/代数失效；不写新对象；不自动换绑 source/target | TS fake Vault；用户现场真实事件 |
| 同笔记第二 leaf/浮窗有未保存正文；原 leaf 干净或关闭；deferred leaf | 返回可见 UNSAVED_EDITOR_CHANGES/无法安全验证错误，无 Vault mutation；不只看 origin | TS 多 leaf fixture；真实 Obsidian 后验 |
| process 调用等待期间磁盘正文变更；同步 callback 进入前 lease/能力版本失效或 signal abort | callback CAS/准入拒绝，零写；禁止 callback Promise/外部等待 | 受控 async Vault fixture，不能仅 mock process 为立即写 |
| create 预检后另一 actor 创建文件/目录；大小写等价路径 | 竞争目标保留，无覆盖/追加/另起名称；错误要求重新预览 | fake API 合同 + 目标 OS 真实竞态后验 |
| 批准后撤销资料授权、取消、过期或参数/目标/能力版本变化 | dispatch CAS 拒绝，Host 调用次数为 0；资料 Grant 与确切批准分别测试 | T06/T07 跨 Go Application API/SQLite fixture |
| 同 effect 同指纹并发两次；同 effect 异指纹；两 effect 同目标 | 最多一次 mutation；异指纹冲突；第二不同 intent 必须经过当前 CAS，不能沿旧基线覆盖 | TS 队列 + Go effect ledger fixture |
| 队列已满/字节超限；一 mutation 底层不 settle 而 reverse 多次超时 | 后续调用有界拒绝，实际活动数不因 timeout 释放而无限增长；退出有界保存未知 | TS fake timers/controlled promise + stdio |
| received/prepared 持久化失败或成功后、调用前崩溃 | 失败则零 mutation；崩溃记录恢复只核查，不因 prepared 自动重发 | Host storage fault + restart fixture |
| Vault 已成功、完成 receipt 写失败/损坏/只有旧 backup | 不重写；后置条件符合为 reconciled，身份/内容不明为 unknown；不伪造 committed | Host storage fault + Go reconciliation |
| 完成 receipt 已保存，stdio response 丢失/lease 改变/用户取消/Run 终态 | 新连接 query 原 effect 得 committed；最多一次 mutation；追加核查事件，不重开 Run、不重新批准旧派发 | 跨进程 fault fixture，消费真实 API |
| 断线时 mutation 尚未 settle，之后真实成功；Host 重启 registry 为空 | 底层完成留可查询证据；无证据仅检查后置条件；旧 registry/lease 不产生新写权 | 生命周期/restart fixture |
| query 回传错 profile/workspace/device/effect/摘要/receipt 归属或伪造成功形状 | 拒绝或 unknown，不提升业务 Effect 为 committed；普通客户端不能 invoke | HAP 有效/无效夹具 + Go verifier |
| 已写后外部修改/恢复为旧内容，再 query；删除会话正文 | 有原可信 receipt 保留 committed 事实；只有现状证据不得假定未写；删除不触碰交付笔记 | contract reconciliation + 删除接缝后续整合 |

不能把“fake Vault.create 覆盖前抛错”当真实文件系统 create race 证据；也不能以真实 Vault probe 代替 Go dispatch/Approval 状态机故障测试。两层证据分别记录。

### 9. 用户后验 probe 最小入口

按 T07 已有写集新增 `scripts/obsidian-acceptance/huhu-bot-note-effects.mjs`，复用 `launchFreshVault`，只接受不存在的绝对一次性 root、显式 HUHU_OBSIDIAN_EXECUTABLE，并记录构建/Obsidian/OS/配置摘要。脚本使用真实 BotClient → Application API → T06 审批/Executor → T07 Host adapter；模型用受控 fake Engine，无真实 Provider/keyring。故障 hooks 由 fixture 构造注入，不向生产用户暴露“跳过审批/改账本”开关。

最小样本：一个目标笔记、一个无关笔记、另一个目标 leaf/浮窗、新建目标；批准/拒绝/源变/未保存/create 冲突/写后丢 receipt/有 receipt 丢回包/重启核查。通过实际 API 发送批准或拒绝，保存前后原文 hash、effect/receipt/event 及调用计数；故障后使用同 effect 查询。可通过受管 fixture 主动控制 callback/receipt 故障点，但不手写最终 receipt 或直接调用私有 adapter 方法绕过公共链。T20 尚未装配时只标宿主接缝 fixture；正式 UI 验收归 T23/28。

脚本必须 finally 停止自有 Obsidian/Runner/CDP 并等待真正退出，保留一次性证据；不得选择已有用户 Vault 或让默认环境访问真实凭证。真实进程重启、编辑器 autosave、deferred/popout、CRLF、create race 和目标 OS 身份替换均为 user-owned / not-run，本次未运行。

## 产物与验证

- 本目录 `REPORT.md`：目标、CAS、Host 协议/receipt 的原 owner 请求、故障矩阵与后验入口；仅研究产物。
- 本目录 `observations.json`：52 个本地来源的 SHA-256/字节数、关键源码原行及固定外部来源元数据；采样 HEAD 与时间均记录。只读检查的路径纠正和网络失败也保留。
- 本次实际完成：完整回读 TASK、T07、obsidian-api 工程规则；复用已读能力发现/dev 规则/034；核对 Spec §6–8、ADR-008/009/016（并关联 ADR-003/007）、ARCH 数据/Host/效果边界；读取两端现有源码、类型/schema、共享存储与 fresh-vault。所有 shell 读取命令已完成，没有持续进程。
- 外部取证：`git ls-remote https://github.com/obsidianmd/obsidian-api.git HEAD refs/tags/1.13.1 refs/tags/v1.13.1` exit 0，HEAD 为 `9abd9605ce081383674aae1ed111c456edde0688`，无匹配版本 tag；固定声明/LICENSE.md/commit API 和 REF04 queue 下载均 HTTP 200，摘要在 observations。误试的 1.13.1 tag 与 LICENSE 路径为 404，未当有效证据。部分旧 Reference 页面未找到/超时，结论只依赖成功读取的官方指南和固定声明。
- 官方固定 commit 日期 2026-10-05，MIT；API 声明 SHA-256 `97c86417c893db691e401fdffd9026e348dc96da6bfcfa5d49a301d7fe7542a0`。本地类型包为 1.13.1，与该 commit 不是同一版本证明；未安装或升级。许可见 [固定 LICENSE.md](https://github.com/obsidianmd/obsidian-api/blob/9abd9605ce081383674aae1ed111c456edde0688/LICENSE.md)。
- 既定 REF04 OpenBot 固定 `46642d6c91daa663bccff673595f4e12a419a496`，活动证据 2026-10-24、MIT；本次重读 [queue.ts](https://github.com/CopilotKit/OpenBot/blob/46642d6c91daa663bccff673595f4e12a419a496/server/src/work/queue.ts)，文件 SHA-256 `a9f928ef57b26899e052763f3adbb07188dbe58823a722a1f7ab833a5a29ed4b`。可借鉴稳定工作身份、持久队列与 attempt 区分；其 Postgres/Mastra 服务及 lease 重试不证明 Obsidian 写已发生与否，不复制其自动重试策略，不引入依赖/源码。
- 本次没有运行任何 runtime probe、Go/TS 测试、build/lint 或真实宿主；没有安装依赖、启动 Obsidian/Runner/模型/keyring/D-Bus，没有临时运行资源需要清理。没有产品、永久测试、正式工件或他人 REPORT 写入。
- 本 TASK return 校验的原始命令、退出码、最终来源变化检查与报告摘要保存到同目录 `return-validation.log`；以该实际日志为准。研究检查通过不等于 T07/AC/平台支持通过。

## 问题与下一步

1. Root 应先把第 7 节确切共享协议、来源 Port、receipt 根/排除和组合维护分配给原 owner；T05/T06 接纳与其独立审查仍按原编排。T07 现有只写新目录无法独立修复两端错误折叠或补全共享 DTO，不能要求它靠平行 API 回避。
2. 在 T06 接口冻结时确定目标准备的真实调用者（本地捕获是否足够，还是必须增加具名 Host 反向准备方法），同时冻结 capability 版本、目标 revision/hash、canonical invocation fingerprint 和 receipt 证据绑定。模型参数不提供用户批准资格；无须全库 write Grant。
3. 在 T07 代码验收中真实跑第 8 节故障闭环，尤其“Vault 成功而 receipt 失败/回包丢失”与“底层 promise 超时后未结束”；成功证据与状态核查不能混为 committed。正常审批生产消费者及 pin 生命周期仍遵循 034，不以未来手动恢复票代替。
4. 真实 Obsidian/目标 OS 的 create 无覆盖竞态、编辑器换行/自动保存及 deferred/popout、外部同路径替换仍待用户后验；这是 LOG051 的 not-run，不是代码工作审批或中止理由。本次不宣称底层 exactly-once、跨文件原子或全平台支持。
5. 本研究完成后停写；没有自有后台 writer/probe/进程。正式生产修改须待 Root 新派遣，当前读取不构成产品写授权。

