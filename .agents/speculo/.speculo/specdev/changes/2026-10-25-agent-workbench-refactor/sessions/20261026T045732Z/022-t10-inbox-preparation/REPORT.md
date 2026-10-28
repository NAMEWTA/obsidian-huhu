# 任务回报

Session: 20261026T045732Z
Task: 022-t10-inbox-preparation
Status: completed

## 聚焦交接

**SOURCE READ ONLY。**本次完成 T10 工程准备，不是 T10 实施或验收。推荐把 Session 邮箱作为可选、独立版本的子文档加入原 `workbench-v2.json`，由 **SpaceService 原 writer、原租约、原逻辑队列**负责 send/ack；list/read 使用零写接口，不能直接调用会恢复/备份的 `JsonStore.load()`。发送前由客户端持有消息 ID，效果未知后使用同 owner 的持久核对查询，不盲目重发。附件首版支持真实 Vault 文件引用；通知模块、SessionMaterial 和 PTY 输入均不参与投递。

原 TASK、T09/T10、所有产品和正式状态均未写。未派 Agent，未运行插件/native 构建、全库检查、真实 Vault/账号/Provider、Obsidian 或浏览器。旧 013/018 报告与旧 tmp 保持只读；本轮产物只有本 REPORT 和 `/tmp/huhu-t10-inbox-preparation-20261026T130228Z`。

### 1. 原存储 owner 与实际效果

`docs/data.md:48`、`src/shared/storage/vault-layout.ts:48–50` 把当前设备的 Space/Session/布局放在 `.huhu/terminal-agent/<device-id>/workbench-v2.json`。`services/spaces/records.ts:32` 的 version2 记录当前没有邮箱字段；顶层校验可扩展，但 SessionRecord 字段校验严格。最低改法是可选 `inbox: {version: 1, nextSequence, messages}`，不把新字段散入每个 Session、不另建通用通知库。旧文件缺字段投影为空，不因查询迁移/写盘；未知或损坏的 inbox 版本准确拒绝，不能当作空邮箱或悄悄采用旧备份覆盖。

`SpaceService.load:115–140` 原本直接 exists/read/decode，`getControlScope:293–326` 不取得新 writer。`mutate:214–264` 才在同一 tail 中取得原 Vault/instance permit、创建 guarded JsonStore、编辑 candidate、设置提交检查/primary-write 观察、等待 commit，再发布 records；失败路径 `272–283` 保留旧内存记录并报告 PERSISTENCE_FAILED。因此邮箱应增加 **有类型的 send/ack/read/list 端口**，而不是把任意 mutate 回调或 JsonStore 暴露给第二个 InboxService。

本次正常 import/编译实际 `JsonStore`、merge、write-queue，使用内存 TextStorage 得到以下原始观察；没有复制一个未来邮箱实现来证明自身正确：

| 原生产模块实际观察 | 必须落实的合同 |
| --- | --- |
| 合法 primary 的 load 零写；损坏 primary + 合法 backup 的 load 写 `.corrupt` | query 不能使用泛用 `JsonStore.load()`，也不取新写租约/备份/恢复 |
| base/value 完全相同的 commit 仍写 backup 和 primary | 重复 ack 必须在原逻辑队列内 changed=false 短路，不能靠相同 reducer 输出 |
| primary 已写，随后 readback EIO：commit reject、广播0，但 primary 已有消息；新 store 重开找到原 ID/正文 | 写失败不统一 none；原响应未知后需要真正的持久核对 |
| 两个 JsonStore 在入物理写队列前各分配 sequence=1，merge 保住两条记录，却得到 `[1,1]`、next=2 | 原存储队列不负责领域顺序分配；必须在同一 SpaceService 逻辑队列内分配 |

这里的持久成功点是 **原 commit 完成备份/primary 写入及验证读回**。它不是跨文件事务，也不是对任意 OS 故障的原子性保证。Router `251–274` 对已接纳的 PERSISTENCE_FAILED 已有 unknown 语义，应保留真实事实；不能为邮箱伪造 adapter-applied/pty-written 输入回执。

三种方案比较：第二个 JsonStore 写同一路径会绕过 owner/顺序，拒绝；另建邮箱文件即使复用物理写队列，仍要额外解决 Session 归档与消息提交的跨文件顺序/部分结果，本票无需承担；**同一 WorkbenchRecords 子文档、同一 typed owner**能把目标验证、sequence、正文、ack 放进一次原提交，是最小推荐。共享 `json-store.ts` 继续只读，无需为此改通用存储实现。

### 2. 可实施的 owner API 与未知结果核对

建议在 SpaceService 内提供下列语义，core/inbox 定义纯类型/验证/分页描述；services/inbox 只作 facade 和订阅，不持 permit 或第二个 store：

- `sendInbox(capturedScope, recipient, message, context)`：排入原 tail；在当前 scope/lease 和可信持久基线上重新验证 Session→Space 归属、归档、ID 唯一性、容量和原 signal/deadline，然后一次分配 sequence、构造完整候选并提交。已保存才发布邮箱更新。不能在队列外分配序号或只验证一次目标。
- `ackInbox(capturedScope, messageId, context)`：同队列查真实原记录。首次 ack 保存一次 ack 时间/修订；已 ack 则不 commit、不写 backup、不改 sequence/时间/修订、不广播。两个并发 ack 由队列决定先后，后者返回 already-acked/none。应让原 private mutation 内部支持 typed changed-result；不改变其他既有操作默认提交行为。
- `listInbox/readInbox`：正常从经验证的只读记录投影；不调用 mutation、owners.acquire、JsonStore.load、selectSpace、flush 或自动 ack。读附件状态同样没有落盘副作用。
- `subscribeInbox`：只发布已验证保存或已核对的持久事实。未读数从 ack 状态派生；不复用 Session activity/completion 的 unread 状态。

现 mutate 初建 JsonStore 后会读取 `loaded`，但领域修改仍从原 `this.records` 起步。邮箱首次获租约、恢复或写结果未知后，需要在这个 owner 内先建立可信的最新持久基线，再判断 ID、归档、sequence 或 ack no-op；不能把过期内存的“没有这条”当作真实磁盘结论。

**未知后的零写核对必须是一条真实接口，而非“刷新页面”。**同 SpaceService 增加 `readVerifiedInboxSnapshot(scope, context)`：

1. 等待本 owner 先前在途写结算，在同 tail 上捕获 scope/epoch；等待可有限逻辑取消，不能让取消的查询稍后继续触发 mutation。
2. 直接通过原 TextStorage 对 primary 做有界 read/decode、完整版本/目标/邮箱校验；不调用 JsonStore.load，不取新 permit，不写 `.corrupt`、backup 或 primary。若 primary 不可验证，返回 source-unavailable/unknown，而非空或权威 not-found。
3. 返回本次验证快照上的 known ID/不存在事实及其观察版本。只更新 owner 的经验证邮箱读视图/订阅；不能粗暴覆盖其他 Space 草稿或未提交布局。后续真实 mutation 仍由原 writer 刷新完整基线并正常提交，不能把这个只读视图变成新持久 owner。
4. potentially-written 失败后将邮箱读视图标记 freshness-unknown。旧记录可显示“待核对”，旧内存缺失不能报告权威 not-found；只有上面成功读回的 primary 才可解除这一不确定。读失败保持未知，原正文/诊断保留。

这是具体的原 owner 接缝；当前生产尚未具有它。本探针只证明 primary 后故障可留下真实消息，不宣称未知核对功能已经交付。

取消/结果边界：接纳前或可证未触 primary 的校验拒绝为 none；primary 可能改变但未验证为 unknown；原 commit 验证完成即记录 record-saved/ack-saved，观察者之后取消不撤销事实。成功保存之后的附件状态读取失败不把消息改成未保存。逻辑 timeout/abort 只停止本次观察/尚未执行的 continuation，不声称能强制终止已经进入 OS 的读写；已开始的写由原 owner 收束，禁止客户端自动重发。

### 3. 消息身份、精确收件人及容量

推荐最小记录：`messageId`、不可变 `{spaceId,sessionId}` 收件人、描述性 source、正文、有限附件引用、原 writer 分配的安全整数 sendSequence、createdAt、一次性 ack 信息。source 只是来源说明，不是认证，也不从字符串推导调用者权限。

**消息 ID 在任何发送 I/O 前由调用者持有。**沿用 read/ack 已有参数名 `message`，为 send 增加 required `params.message`；CLI 用 `--message <id>`，GUI 在点击发送前生成一次短 UUID 并保留在 pending/unknown 状态，提供复制/核对入口。CLI 调用者自己已持有该 ID，不依赖丢失的 send response。`requestId` 当前默认 `huhu`，仅作请求关联，不能复用为消息 ID。重复 ID 精确拒绝、不覆盖/新建第二条；这只是记录唯一性防护，不承诺 exactly-once 任务、自动重放或 Outbox。此建议需 Root 在正式开票时同步 canonical/计划 CLI 说明。

收件人来自显式 Session 记录的原 Space；同 cwd 的两个 Space 完全独立。send 捕获并显示完整目标后，不随当前焦点、cwd、Pane 或 Space 选择变化。read/ack 的 message ID 在当前认证 Vault/device scope 查存储记录，再返回其中的原收件人；显式 hint 不匹配则拒绝，不把旧消息移到当前 Session。Session ID 不是进程代次，接收不要求运行中 runtime。

| 生命周期 | 推荐行为 |
| --- | --- |
| 停止、断开、后台、detach | 仍可收/读/ack；不 spawn、resume、attach、prompt 或抢焦点 |
| Session 或 Space 归档 | 队列内拒绝新 send；历史 read/ack 保留，不因归档丢记录 |
| 模块禁用/服务关闭 | 准确 unavailable，不为投递激活模型；已存记录保留到正常启用 |
| 缺失/将来硬删除目标 | 当前没有删除入口，不新增。新 send/目标 list 拒绝；已知消息 ID 仍可读原归属并标 missing-target，保留显式 ack，不自动清理或改收件人 |
| 跨 Space、同 cwd | 明确目标 Session 允许同 Vault 中合法跨 Space 留言；不附加调用者当前 Space 的错误 hint，不通过 cwd 猜目标 |

建议有界默认值（**待正式合同固化，当前没有这些实现常量**）：ID 1–128 UTF-8 字节、source≤512B、正文≤16KiB、≤8 个引用且每个序列化≤1KiB、单条完整存储记录≤24KiB；邮箱总量≤4MiB 且≤4096条。容量耗尽准确拒绝，保留已有记录；没有静默裁切正文/ID、自动删除历史或隐式 retention。sequence 溢出也在写前拒绝。

这些字段上限不能取代 **整个 response envelope 的 49,152B** 上限；request 也受 32,768B 约束。应对真实 `requestId/target/result/error/cursor/附件状态` 完整 JSON 使用现有字节测量，计入 UTF-8、转义及所有元数据。send 接纳前同时确认本次回执及记录正常 read 表达能在预算内返回；read/list 对各自实际 envelope 再测量，不能靠正文字符数、单行大小或分批拼接绕过。单项也无法容纳时准确 capacity 错误，不写后才发现无法表达。

推荐 list 输出有界摘要，完整正文只在 read 中返回；摘要字段明确标为摘要，不能冒充完整正文。排序用 sendSequence 而非时钟/对象插入顺序。第一页冻结 `{recipient,generation,highWaterSequence}`，下一页只读取 `lastSequence < seq <= highWater`，append 留给下次刷新；ack 不改变成员、顺序或 cursor。v1 不增加会随 ack 变化的 unread-only 分页。cursor 只含 scope/窗口/TTL，不存正文快照，沿用现有 16 项/10s 临时分页资源约束；过期/不匹配准确 stale。当前 ControlPaging 以整个 revision+offset 工作，不能直接用每次 ack 变动的 records revision 假称稳定窗口，需要其窄 sequence-window 扩展或 `control/inbox*.ts` 中等价有界窗口实现。

### 4. 附件：首版真实支持 Vault 来源引用

`ContextMaterial` 的 files/source 只是描述；`SessionMaterialService.attach` 会显示/打开 live Session 并粘贴文本，不能复用来发被动消息。`DirectoryPort` 和 desktop directories 的 grant 校验针对 cwd，检查 revoked/device/真实 root/dev/ino；它没有授予任意文件读取。history/details 的真实路径检查也只授权特定账号 transcript，不是通用附件 API。

首版具体支持 `{kind:'vault-file', vaultId, path, observedVersion?}`：

- 由当前 Vault 绑定和实际 TFile 来源端口确认；GUI 通过真实 Vault picker 选取，CLI 只提交引用元数据。path 只接受规范 Vault 相对路径，拒绝 absolute/drive/`..`/反斜杠/NUL 等逃逸材料；vaultId 必须与认证 scope 一致。不能仅信任字符串或 Session cwd grant。
- send 写前验证存在、类型及可观察元数据；不读取/复制文件内容，不允许绝对本机文件。无效引用在写前准确 source-invalid/none，正文不能被报告保存。允许有限 title/size/mtime 等观察版本用于报告变化，不承诺附件内容不可变。
- 消息保存后引用消失/版本变化，list/read 返回该引用明确 unavailable/changed 状态，同时保留正文、原引用与 ack；不能静默删除引用或整条消息。附件只在用户显式打开时重新校验并调用 Vault opener，不执行 SessionMaterial/paste。
- 外部文件引用首版明确 unsupported/not-authorized，即使 Session 有 cwd grant；未来需要独立、真实受限的来源端口及物理路径验证。**Vault 引用正例和失效反例已是可实施的 AC025 路径**，没有因“附件授权尚未知”删去验收。

CLI `--file` 与上述引用不同：它由 **CLI 本地进程**有界读取正文后发 text，宿主从不按该路径打开文件。stdin/file/text 互斥，采用 limit+1 有限读取，UTF-8/容量错误在网络前拒绝。附件可用单个 `--attachments '<json>'` 参数，canonical 定义有限 typed array；现 CLI 对非既有类型默认作字符串处理，需要显式 JSON 解析/校验，不能接受重复 flag 拼成无界数组。

### 5. 实际 CLI、handler 与 UI 接线

当前 canonical 的四个 operation 都是 `available:false`。send 只有 `text`（max262144）并以 `target.sessionId` 定位；list 有 cursor/limit；read/ack 只有 `params.message`。`ControlCommands` 当前没有四个 handler。Rust CLI 是 descriptor 驱动普通参数，目标只认 `--session`；`--to-session/--stdin/--file` 当前没有实现，不能因为计划文档出现过就声称可用。

建议逐层接线：

```text
CLI 本地正文读取/已知 message ID/参数校验
  → 原 control transport/broker（scope、deadline、完整 envelope）
  → Router 原操作/效果边界
  → ControlCommands 的 inbox typed handlers
  → SpaceService 原队列/permit/验证/commit
  → 已验证邮箱 subscriber → 生产工具面板
```

保持计划 `message send --to-session ...`：在 send 中把 `--to-session` 明确映射到已有 `target.sessionId`，与 `--session` 重复时拒绝；不把调用者当前 Space 作为对显式收件人的 hint。加上 required `--message` 以及本地 stdin/file 读取，help/文档同步。read/ack 先按消息记录解析原目标，不能先套通用 active Session/Pane/runtime gate；依然走相同 ControlScope，不能放宽跨 Vault。只有全部 handler/CLI/owner 实际可执行并有集成证据后才打开四项 availability，不增加第二套 native mailbox 协议或 Host/helper 输入出口。

当前 controller 的 `NOTIFICATION_INBOX` 是 notifications 模块系统提示；其 `NotificationService.open:148–155` 会在 opener 后 markRead，另有外部投递 channel，不能当 Session 邮箱或直接 import 其内部 InboxPanel。复用共享组件与订阅惯例即可。邮箱保存只更新计数/数据；不调用 notifications 全局投递、PTY、prompt、wait、newAgent、SessionMaterial、show/focus。

生产 UI 建议复用 T09 最终工具抽屉/目标显示和 T08 312px / `<600` Dialog：收件人使用稳定 `{spaceId,sessionId}`，明确 Space 和 Session，包含停止对象；不能直接复用仅列 connected ManagedRuntimeRef 的协作输入 selector。list/read 的打开状态只是临时 UI 状态，**单独“确认”按钮才调用 ack**；未读基于持久 ack，与 `completionHint/unreadCompletion/markManagedSeen` 分开。发送 unknown 时保留本次 ID、目标与正文，提供核对动作，不自动重发/改送其他目标。保存失败和附件失效有独立文案。

若 T09 已统一 drawer/target API，直接消费；否则先由 Root 明确最小接线，不能在 T10 新建工作台。当前 workspace-view 和 compose stateKeys 只认 control/history 等；如果新增可保存的 inbox tool 字段，还需正常 compose→sanitize→view 的贡献回归，不能只写组件局部 state 或源码字符串检查。收件消息不自动打开 Dialog/切 Space，用户手动关闭返回原触发点；键盘、焦点、loading/empty/error/unknown/ack-pending 状态属于生产组件验收。

### 6. 精确最小写集与唯一 owner 建议

以下仅供 Root 正式修订未来 T10 分配，**不是本次解锁**。原 writable_paths 已有 core/inbox、services/inbox、ui/inbox、AgentWorkspacePage、control/inbox*、ui/control、controller、i18n、两份 Agent 文档和构建产物；不足以完成真实 owner/protocol 接线。

| 必须补的实际路径/候选新路径 | 唯一责任与理由 |
| --- | --- |
| `src/modules/agent/services/spaces/records.ts`、`space-service.ts`；`records.test.ts`、`space-service.test.ts`、`space-service-recovery.test.ts`（仅实际受影响者） | A：可选 inbox schema、同队列 send/ack、fresh baseline/零写核对/no-op；不改共享 JsonStore |
| `docs/data.md` | A/文档唯一 owner：说明同文件邮箱数据归属及保留/恢复边界；不用新增 vault-layout 路径 |
| `src/modules/agent/services/control/commands.ts`、`commands.test.ts` | P：注册真实 handlers 和消息目标解析；现 control/inbox* glob 不含该文件 |
| `src/modules/agent/services/control/paging.ts`、`paging.test.ts` | P：本推荐扩展 sequence-window；若实现完整封装在 inbox*.ts 可不补，不能复制无界分页池 |
| `src/shared/native/control-schema.json`、`control-wire.generated.ts`、`native/pty-server/src/control/wire_generated.rs`、`src/shared/native/control-wire.test.ts` | P 唯一协议 owner：message ID/source/refs/限额/availability，运行原生成器与双端验证；生成器和 codec 本身无需预增写权 |
| `native/pty-server/src/control/cli.rs` 及实际相邻 CLI 契约测试 | P：to-session、known ID、有限 stdin/file、attachments/help；`client.rs` 只在实际无法由 cli/run 边界保留 unknown ID 时再补，不机械扩写 |
| 候选 `src/modules/agent/platform/inbox/vault-source.ts`、对应测试，typed port 在 core/inbox | A：真实 Vault 来源 adapter；现 services/ui glob 不含 platform，不复用 cwd 或任意 FS reader |
| `src/modules/agent/services/workspace-view.ts` 和测试；`src/app/workbench/compose-workbench.ts`、`agent-contribution.test.ts` | U，条件补：仅新保存工具字段仍需时，正常贡献/恢复链验证 |
| `src/modules/agent/ui/tabs/TabStrip.tsx` | U，条件补：T09 尚无复用工具入口时；已有统一入口则不改 |
| 候选 `src/modules/agent/services/control/inbox.integration.test.ts`、`scripts/obsidian-acceptance/agent-workbench-inbox.mjs` | P/U 分别唯一 owner：实际 CLI→handler→owner→subscriber 和正常 import 生产 UI fixture；保留旧 T08 脚本，不把 mock 面板当产品验证 |

`router.ts` 目前已有 unknown/effect 归类，不机械补写权；若 typed 持久结果确实无法准确表达再给具体最小变更。`main.js/styles.css` 继续 Root 唯一串行生成；优先共享组件/Tailwind，无需预增 bespoke CSS 路径。预算清单/入口仅在新增依赖闭包实际超过既有约束时按事实补，不能将其作为大范围授权。Host/helper/editor/共享 json-store 不属于本推荐写集。

实施阶段先 A 冻结 typed domain/owner/freshness/effect/附件端口；P 在其上完成 canonical/CLI/commands 和集成，U 消费同 facade；controller 装配与 i18n 各指定一个 writer，不让三人并发写。正式 T10 前必须回读 T09 最终 Workspace/target/drawer/schema/Scope API、018 的原草稿 owner 接缝及当前 Root 状态，不能把本报告对现源的建议当作未来 API 已冻结。

### 7. 能击穿错误方案的验证矩阵（未来执行）

| 接缝 | 必须观察的证据 |
| --- | --- |
| 旧文件、损坏 primary、未知 inbox 版本、纯 list/read、未知后核对 | 原 storage write/acquire 计数均0；损坏/读取失败不当空或权威 not-found；不调用 JsonStore.load 恢复 |
| 同 owner 并发 send、归档 racing、lease 交接/重开 | 序号唯一稳定、目标归属精确；进入队列后再验证 archived/current disk，原有效数据不丢 |
| 同 cwd 两 Space、停止/后台/detach、跨 Space | 原 message ID/收件人不混，PTY/model/spawn/focus/wait 计数0 |
| send primary 前失败、backup 后/primary 后 readback 失败、响应丢失 | none/unknown 按实际边界；无假成功/未读提前广播，原 ID 可由真实零写 primary 核对，禁止自动重发 |
| read、首次 ack、重复 ack、并发 ack、ack 故障/重开 | read 不修改；首次保存后广播；重复 ack 无额外 primary/backup/revision/时间/事件；unknown ack 可核对真实 persisted 状态 |
| append/ack 间分页、长 Unicode/转义/目标/requestId/cursor、pool/TTL | highWater 页稳定、不重复/跳项，完整49152B envelope，expired/stale准确，容量不足不裁正文或写后失败 |
| Vault 引用正例、越界/外部/错误 Vault、发送后删除/变更 | 发送前拒绝无写；保存后保留正文/引用并标失效；打开需显式重验，宿主任意文件 read 计数0 |
| 实际新 CLI binary 与生产 Router/Commands/SpaceService + 内存/隔离存储 | 四 ops 真正可用；stdin/file 本地有限读取、ID先持有、无参数伪支持，不用直接 facade 调用替代 CLI 链 |
| 正常 import 的生产 UI/compose→sanitize→view | empty/loading/error/unknown/read/ack、固定目标、incoming 不打开/抢焦点；en/zh、亮暗、312px、<600Dialog、200%实际缩放、Tab/Enter/Escape/触点与焦点返回 |

这些均是未来验收建议，本轮未运行。T10 正式实施再按 dev/testing 选择受影响 types/lint/i18n/build、存储/CLI/生产组件集成；真实用户宿主 E2E 的既定 disposition 仍保留，不用准备探针冒充通过。

## 产物与验证

- 证据根：`/tmp/huhu-t10-inbox-preparation-20261026T130228Z`。`source-before.json` 保存40条初始关键输入；`source-after.json` 保存50条已冻结描述，另有 `supplemental-sources.json`、编译 inputs/metafile、原字节 CAS。记录的是实际选中闭包，不宣称整库冻结。
- TASK SHA256 `647fe397ec777d542ff3c9fe3ceab4d2325c005a946d4fefdf05d9f125529988`；dev/ui 与 Ticket 绑定 SHA 均未变，复用既读开发/界面/架构/测试规则。本次只应用只读边界、原 owner、i18n/生产 UI 验证要求，没有激活新的实施流程。
- `commands/001` 至 `008` 分别为 schema/UI、storage/CLI、CLI body/scope、附件/CLI发现、实际 JsonStore 探针、owner/UI边界、最小路径确认、生成物路径核对；均 actual exit0，各目录包含 exact argv/cwd/UTC/exit/raw SHA 和关键40输入前后快照。最初发现/恢复及最后行政读取是宿主工具只读记录，不冒称也都由 numbered runner 捕获；错误猜测路径/外网读取失败保留，不算产品测试失败。
- 实际探针的 `storage-run.json`：绝对 Node `/home/wta/.volta/tools/image/node/26.11.1/bin/node`；2026-10-26 14:04:58.322Z–14:04:58.356Z，exit0；bundle SHA256 `d49be656434d87eee9d2d72d3e02f21266380a0e1d70535d0600a8ba9eafe42a`；7个实际编译输入有 CAS/SHA/metafile。显式隔离 HOME/TMPDIR、10s/1MiB child 预算；deny-list 在读取编译输入前排除动态Host路径，`blockedPathsIncluded: []`。只证明表中五项原存储行为，不是 T10 测试通过。
- `cleanup.json`：child exit0，全部内存存储/Promise结算；本次 runtime-home、runtime-tmp 均已不存在，无真实 Vault/helper/Provider 进程，无旧 tmp 删除。保留研究脚本、日志、bundle、CAS 供 Root 回读。
- 022 执行中出现平台 `stream disconnected before completion`，沿同根恢复，核对无遗留命令，未重新研究/覆盖原件；不把平台中断当产品失败或完成。
- 只观察到 `goal-plan.md` 从 `01da7f7a429d9204342f7cbfbd2f9a5fa46e4ef0af870648731125c1973217fa` 到 `70dd240ecdf13e4f0542acc5e2f94ee6c579352f797bdf7b5c214eb6dd5ee305` 的已告知 Root 行政状态更新。TASK 原 GP030/Map31 不改，当前 GP031/Map32 和 T08 recovery attempt2 归属 Root；产品输入无此项漂移。main.js/T08动态Host闭包不在本次冻结/编译范围。

通知专门参考补充保存于 `web/001-mail-primary.json`、`002-mail-activity-dependencies.json`：官方 [herdr-mail 仓库](https://github.com/husniadil/herdr-mail) 与 [MIT LICENSE](https://raw.githubusercontent.com/husniadil/herdr-mail/main/LICENSE) 可回读；[CHANGELOG](https://raw.githubusercontent.com/husniadil/herdr-mail/main/CHANGELOG.md) 实际列2026-08-30活动，满足近两年。其 store-authoritative 消息身份/查询思路可借鉴；其 prompt/typed pane marker、重试/ask-reply 和 daemon 不符合本票被动边界，不采用。其 [go.mod](https://raw.githubusercontent.com/husniadil/herdr-mail/main/go.mod) 使用 Go/Cobra/SQLite/MCP；HUHU 不新增这些依赖。活动/许可检查的 GitHub API/commits 页面读取失败原件保留，未声称固定 commit 审计。没有复制源码或 GPL 终端实现。

## 问题与下一步

没有阻塞本次只读交付的问题。Root 可采用上面的同文件单 writer、known ID、零写核对、Vault 引用和 no-op ack 合同，先正式补足 T10 写集/公共参数/数据说明，再在 T09 结束后按实际 API 派实施。所有容量数字和候选新路径是本报告推荐，未伪装成现行 Spec/实现。T09 target/drawer 与布局 owner 的最终 API 尚未冻结，需要届时回读；不把工程选择交给用户、也不提前实施。

REPORT 原子落盘后另行运行并保存 return 结构校验原件；校验仅证明回报结构，不是 T10 产品验收。**SOURCE READ ONLY。**
