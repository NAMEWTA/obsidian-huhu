# T08 editor port：只读工程补充

**推荐按 Root 已选路径实施：正文走同 helper 的独立认证 editor 应用角色，原 NativeInputQueue 持槽，Pi 原 editor 同步 paste＋一次 Enter；不再给普通 prompt 设计 guarded PTY paste。** 原 raw send-text/send-keys 继续 PTY。T07全部源/target继续STOP；以下都是待正式派遣的类型/预算建议，本轮没有构建、测试、运行Pi/helper或仓库写入。

已读实际 B producer-proof：官方Pi1.4.0的真实Jiti/InteractiveMode/default editor及原working→steer调用已有隔离机制正例；它的Session Proxy边界没有证明真实Provider队列/账号任务。本报告使用这个新证据，不用旧组件only/缺jiti结果否定新正例，也不把新正例提前算成产品能力。

## 1. canonical 首步：readOnly 与调度正交

在唯一 `src/shared/native/control-schema.json` 给**每个**operation显式 `readOnly:boolean`，生成器拒缺失/非boolean，不以transport推导。query及agent.wait=true；创建/改名/归档/stop/输入=false。agent.wait仍transport=ordinary，继续占ordinary14，不挤query/stop保留池。A plan已定的同一wait枚举：`idle | working | waiting | permission | done | failed | interrupted | unknown | blocked`；agent.prompt.wait与agent.wait.state引用同一schema。blocked匹配blocking.state，其余8项是实际AgentState，不加success/finished。

CLI的--stdin/--file由C的现control/cli.rs采集为text，先有界读、完整外层JSON计量，不能把任意file路径发给native应用角色执行读取。离线schema的1MiB、runtime请求32768B/响应49152B继续分别适用。

最小闭包：canonical、`scripts/generate-control-protocol.mjs`、TS/Rust generated、`control-wire.test.ts`、共同control fixture、`test/native/control-protocol.test.ts`、Rust `control/{client,broker}.rs`/control tests；A的commands/router以!readOnly判mutation，B的Host取消reason采用readOnly，transport仍只决定原池。现R1的transport=query兜底须统一迁到readOnly，避免纯wait超时变unknown。输入已获可信input-submitted/completed后，随后的wait失败要保留该receipt与最新progress；abort.reason不能覆盖已完成输入为unknown。原启动未结算仍unknown，不泛改所有mutation。

`PreparedControlCommand`由A加原call.signal及**首次capture**的本地观察deadline。native/CLI/Node/Pi不能比较各自绝对monotonic或Date.now：跨进程只传发送时的相对remainingMs，接收端用自己的单调时钟锚定。A在run时不得重给满观察timeout；原native输入10s是输入尝试预算，不是CLI wait总时长。已完成输入后wait取消只拆观察。

## 2. 最小 shared 端口与字段唯一owner

建议**随spawn接纳editor enrollment**，不新增一个会与Sessions.reserve竞争的prepare票据管理器。A的实际recipe验证/最终env完成后传下列launch值；native先取得原SpawnTicket/32物理slot，再创建cap文件，并在真正spawn的env中注入仅文件路径。未匹配支持策略的普通启动不带editor，保留人工TUI；显式带editor但未协商能力不能静默忽略。

```ts
// C拥有字段；rich端口类型复用shared/native/host.ts与input.ts，wire DTO由唯一canonical生成。
type NativeEditorLaunch = {
  readonly identity: { readonly runtimeId: string; readonly bindingId: string; readonly programEpoch: string };
  readonly provider: 'pi';
  readonly recipe: NativeEditorRecipe; // 有界、版本化，含审定artifact引用/实际exe和入口身份，不传整份inventory
};
// NativeSpawnOptions增加 editor?: NativeEditorLaunch
// NativeConnection增加 readonly editorTransactions?: 1
// NativeConnection增加 editorBinding?(sid: number): NativeEditorBinding | undefined
interface NativeEditorBinding {
  readonly active: boolean;
  readonly ready: Promise<NativeEditorRegistration>; // native已核root/recipe＋真实sourceInstance，A仍核同T06 source
  readonly closed: Promise<NativeEditorCloseNotice>;
  submit(text: string | Uint8Array, options: { readonly remainingMs: number; readonly signal?: AbortSignal }): NativeEditorSubmission;
  close(): Promise<void>; // 首同步段撤新准入；有界观察失败不返尚存的物理额度
}
interface NativeEditorSubmission {
  readonly op: number;
  readonly queued: Promise<NativeEditorQueued>; // queued或明确none
  readonly finished: Promise<NativeEditorResult>; // adapter-applied/none/partial/unknown，绝非PTY written
  readonly settled: Promise<void>; // 原资源结算；unknown的finished可早于它，断链拒绝不证明未执行
  cancel(): void;
}
```

NativeEditorResult携同op、binding identity、稳定reason及effect；adapter-applied仅表示原生输入操作，供A映射input-submitted/completed，不是模型ACK。不可把ready、一次OS观察或submit成功合成为永久readiness。

C是canonical、生成物、私有JSON/二进制布局、strict codec、shared端口与Rust的唯一字段owner。推荐**复用现canonical文件和生成器**：新增editor metadata schemas/messages/limits及二进制布局常数；复用shared/host.ts和input.ts承接小端口，现control-wire raw入口认识editor命名空间，仍在JSON.parse前拒重复键/越界/错方向。没有正文JSON字段。B消费C实际源码，不另抄grammar；Browser-only Cookie/history原raw判别不初始化整张schema，editor表仅能力首用。

阶段：C先交readOnly/wait单源实源→A独立wait/raw可继续；C再交editor实际类型/codec/fixture/limits→Root回读后B接Host/helper/Pi adapter、A接recipe/source/Session；C完成native后给不可变helper做真实组合。签名目前只是候选，不是已冻结生产API。

## 3. 原队列持槽，不阻塞PTY writer

正文从Node沿现 `INPUT_PART=4` 二进制分片进入**同一个**InputBudget/UserAction，新增Editor变体；begin关联当前binding/recipe/剩余预算，完整commit才queued。native认领后，在锁外对原slot/root/birth/TTY前台/recipe做fresh核验，成功才向已认证app投递完整事务。app端完整收体、取消/期限/当前binding/focus/空草稿最终门通过后，在一个无await栈调用原editor。

claim Editor后不能在write_inputs里await socket/JS。留一个per-SID claimed-editor状态，由现helper的非阻塞IPC轮转推进；PTY writer继续取reply，后续所有user action留同SID队列。不是第二个输入queue/PTY writer。app结束通过原队列的完成入口结算；扩大原reserved receipt识别到editor-state，保持同SID FIFO/exit fence和公平轮盘。lifecycle小通知有独立固定池，不能靠普通control256KiB或broker16份48KiB代付。

- 未claim取消：原项及未handed帧原子撤回，none，不可能迟到输入。
- native claim后尚未dispatch、明确拒绝且零应用投递：可none。dispatch过、超时/断链/close不能确认是否执行：finished=unknown，绑定撤准入，原槽/bytes/retiring仍占额，不能靠timeout删表。
- app明确最终门拒绝：none；paste已发生而Enter失败：partial/unknown，不能清草稿/补Enter/重放；同栈完成才adapter-applied。
- 必须收敛到实际app结果及本地写结算/最终有界回执fence，或原root寿命已结束且连接/handle实际退出，才能归还原app action。generation终结按原lost/unknown处理，不把EOF说成未执行，不向新generation重发。不能为等JS延后numeric exit或master close；Host退休条件独立纳入editor责任，不能借reply-settled代替。

parser ACK/reply、stdout drain、query/stop、其他SID及Browser不等待这个user槽；只有原SID的后续user动作等待。保留现有限close观察失败与捕获清理责任，不用永久await拖死模块关闭。

## 4. IPC角色、cap交付及候选账本

一个helper内增加惰性的app purpose listener/状态，复用现interprocess非阻塞Stream/Reader/轮转设施；**不依赖普通CLI registration的存在，也不复用其令牌/locator/16 call池**。可选不同endpoint名以机械隔离角色，process仍只有当前helper，所有binding状态挂原物理slot，非第二业务manager。

Unix用原受保护runtime root(0700)、listener0600和O_EXCL/O_NOFOLLOW单运行cap文件0600；只向目标child env交 `HUHU_EDITOR_CAPABILITY_FILE` 路径，不改HOME。文件由native在已有slot保留后生成，含purpose/version、随机单运行secret、endpoint、当前绑定引用；A不持有secret。删除/撤销核捕获文件实体，改向/替换/权限问题拒绝，unlink失败保留占位/错误，旧cleanup不能删新文件。普通CLI凭据在app角色必拒，app角色也没有调用业务命令权限。

app注册携sourceInstance声明；Linux须与OS peer PID/UID、该slot捕获root寿命、直接Node/exe/审定官方CLI入口及当前source绑定交叉验证，不凭自报PID/token/包名认官方身份。A将native verified registration与T06当前sourceInstance交叉匹配。reload/close撤旧binding，不自动重连/重放；首分支可以在同runtime失效后准确unavailable，不能偷偷用新UUID洗掉未知旧事务。fresh OS观察＋最终JS gate保留Root已接受的非原子竞态；正文不进入接替stdin者。macOS相关接口仍须真实实现/验证；Windows现无可靠前台正证据，不能以Job/交叉编译补真。

以下是**建议有限值，待正式准入/实测**：32 binding（含preparing/closing/retiring，隶属原32slot）；每binding1 authenticated连接、helper最多32，另仅2个短期未认证接纳槽；auth/metadata whole UTF8≤4KiB，recipe/固定stdio lifecycle≤8KiB，cap文件≤4KiB；每SID1 claimed-editor、完整正文≤256KiB，并共享原128操作/2MiB helper、32操作/512KiB SID InputBudget。app本地IO/排队有自己的deadline和固定permit，callback/drain前不返；retiring不加第二套无界tombstone。普通CLI整request仍32768B，故CLI可发正文实际上更小，不能按256KiB文本字段绕整包限制。

推荐app IPC metadata＋独立binary body，native发送引用原Vec/分片偏移，不先JSON.stringify整正文，不复制一份完整packet；完整app体未收到前零editor调用。app须在清除本事务transport/解码/paste临时引用后排最终小回执，不能提前ACK返还再保留整份正文；GC尚未回收与Pi自身持有的正常正文不冒称已释放RSS。Node编码/在途继续记原writer user4MiB与持有的UTF8操作2MiB；Rust原Vec2MiB；apps接收raw buffers总≤2MiB、解码UTF16最坏≤4MiB、完整paste字符串最坏≤4MiB＋分隔符（32份）。这是约18MiB跨进程**逻辑协议副本**的保守候选和另计fixed metadata，不是RSS、内核socket buffer或Pi既有模型/历史存储上界。须在编码前预量/获额，拒accessor/toJSON，分配前核binary长度，错UTF8拒绝。原输入receipt池复用其128操作保留；额外lifecycle池候选32×(8192+5)B，独立预留并物理write结算后返。实际实现若增加concat/Buffer/string副本必须追加计费，不能把借用caller原字符串与新分配混算；Pi原editor内部规范化/存储另由B核实际闭包和压力样本，不冒称已测总内存。

## 5. 精确派遣路径与验证

**C canonical/shared/native（候选写集）**：

- `src/shared/native/{control-schema.json,control-wire.generated.ts,control-wire.ts,control-wire.test.ts,host.ts,input.ts,input.test.ts}`；`scripts/generate-control-protocol.mjs`。不另增shared editor文件，采用Root候选原路径。
- `test/fixtures/native/{control-v1.json,terminal-editor-v1.json}`（仅terminal-editor-v1新）；`test/native/control-protocol.test.ts`。
- `native/pty-server/src/{main.rs,session.rs,frame.rs,outbox.rs,editor.rs,foreground.rs}`（editor/foreground新；不改job/bootstrap旧停止owner）；`src/control/{mod.rs,codec.rs,wire_generated.rs,cli.rs,client.rs,broker.rs,ipc.rs,unix.rs,windows.rs,locator.rs}`（均相对native/pty-server，平台IPC只为复用必要小原语/角色）；`src/lib.rs`仅测试/模块导出确需时。
- `native/pty-server/tests/{control.rs,control_protocol.rs,control_outbox.rs,stdio.rs,foreground.rs,editor.rs}`（foreground/editor新）。不需要新依赖、锁文件或新的CLI binary。

**B独占**：`src/host/desktop/native/{host.ts,helper.ts,host.test.ts,helper-stream.test.ts,host-control.integration.test.ts}`及新editor真实组合测试；`platform/desktop/hooks/native-extensions.ts`和就近真实extension测试，新增小Pi editor adapter文件（如 `editor-extension.ts`）承接应用端状态，不另建spool。字段均消费C端口；B的Host必须在spawn写前捕获editor路由，正确接受早ready/失败/exit/late结果，不再丢fast-exit fence。

**A独占**：program-identity/launcher/最终env、现RuntimeActivityBinding/source匹配、Session/Sessions原仲裁与lifetime、commands/router/wait、UI入口。prepared hooks与实际source UUID的创建继续由原入口协作，B的app adapter用同一个实例UUID，不生成另一份“看起来相同”的来源。Host/helper代码不由A/C并写。

验证最小闭包：TS/Rust同一strict fixture（错purpose/错SID/重复/旧epoch/非法UTF8/whole预算）；真实Linux原helper＋同root/exe/入口/前台正反；旧CLI token不能认证app；queued取消零正文、dispatch后unknown不返槽、迟到结果/关闭/stop/numeric exit/fence；阻塞app时实际reply/ACK/第二SID/Cookie和原CLI query/stop继续；原完整答案spool不改；B真实Pi默认editor新启动/working及登录/selector/草稿/reload/partial paste/IME组合。C正式交不可变helper后再跑生产CLI→Host→Session→app组合，不把受控程序冒充Provider认证。

仅剩一个实现选择建议：**采用复用kind4＋app binary body**，不把正文放入新JSON，也不为此另开业务API。reload首版不自动补cap；若Root要求同runtime重新授权，应显式在旧binding真实settled之后设计单次rotate，不能在reader里隐式重连。除此不需要新增用户决定，细节留正式红绿阶段。

READ-ONLY SOURCE STOPPED。
