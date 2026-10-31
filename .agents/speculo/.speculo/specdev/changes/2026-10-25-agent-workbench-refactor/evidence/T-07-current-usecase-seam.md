# T-07 当前生产用例接缝增量（只读候选）

仅补 `evidence/T-07-preflight.md` 中“等 T03–06”的部分，不重做其 IPC/ACL/Cargo/许可研究。GP019/Map20 不变；T06/T07 未解锁，T05 正在独立复审。本文是接口/派单建议，不是 API freeze 或验收；未运行测试、编译、build、helper、Provider、Chrome 或 Git，未写仓库/正式工件/target。

T03/04 的真实 owner 可直接复用，T05 读屏与输入端口已存在但本轮仍受复审冻结；T06 以 `/tmp/huhu-t06-activity-api-candidate-v2.md`（SHA `92da6dc480c537f4a7bda7132efdf1d9e60b1c4b5ec57e1300c60a95b3379b92`）为**未冻结候选**。T07 不新增业务 manager，不把 CLI requestId 变成 invocation 幂等键，不从 GUI 焦点/cwd/唯一候选猜绑定。

## 1. 旧等待项现在对应什么

| 业务 | 当前真实生产入口 | T07 接法/剩余小缺口 |
|---|---|---|
| Space 查询与精确解析 | SpaceService.list()/resolve({spaceId?,name?})；requireSpace(id,{interactive:false})；ready | 只读命令从同 owner 读取；缺目标/同名按原错误。list 需在 router 分页，不能把10000条整包输出。不能把 selectedSpaceId 当 CLI current Space。 |
| Space 创建/重命名 | SpaceService.create({name,relativePath?,externalReceipt?})、rename(spaceId,value) | 库内 `--cwd` 映射 relativePath；现 externalReceipt 是 GUI 单次选择票，**不是**已有 grant-id。`--directory <grant-id>` 需要同 owner 最小 create-from-existing-grant 接缝，不能调用 chooseExternal 弹框或伪造 receipt。 |
| 持久 Session 与后台启动 | WorkspaceService.createManaged(ManagedCreateRequest)，与 createManagedInteractive 分开；getManaged/listManaged/getManagedSnapshot/subscribeManaged | CLI 只用严格 createManaged；默认 foreground:false。commit→reserve 同步 pending、beforeSpawn/权限/账号规则保留，失败记录可查；不直达 sessions.create。 |
| 停止/归档 | stopManaged(ref,options)、waitManagedStop(ref,options)、previewArchive(scope)、archiveManaged(plan,options) | 透传 T04 逐项 effect/termination/persisted；取消是停止观察，不撤销 stop。归档用捕获 plan/fingerprint，不在晚返回后重建新集合。 |
| Session 重命名 | 当前有 runtime.rename 与 tab/pane rename；SpaceService 无持久 Session rename | CLI session rename 需要同 SpaceService queue 的持久 record 更新，再投影到当前 exact runtime；不能只改 tab、只改活进程或直接写 records。建议窄 renameManaged 用例。 |
| 终端 get/read | TerminalSessions.get(runtimeId)、checkManaged(ref)；Session.readScreen(ScreenReadRequest)、getScreenProfile/getScreenUsage | wrapper 先校稳定 triple/current runtime，再读原单 headless；read 带 expectedRuntimeId，保留 cursor/range/truncated/output 和 resync-required。终端 get 不伪造未取得的 contentSequence。read stale-runtime映射STALE_RUNTIME；expired-cursor/retention-gap为SOURCE_UNAVAILABLE并要求显式重取首页；invalid-limit为INVALID_ARGUMENT，保留原union原因，不自动重读掩盖水位变化。 |
| 活动 get/explain | 当前只有旧 activity/连接；T06 v2拟增 activityDetail/sequence/sources 与 completionHint | 必须等 T06 实际 freeze/交付后消费。四 command lastFact≠current completion；foreground 固定 unknown；不存在的字段省略，不填假 idle/版本/能力。 |
| 精确显示 | 当前 attachManaged 及 focusSession；T06 已计划修 split exact pane/每调用方 intent | T07 不另做 textarea focus。T09 Pane 命令尚未交付，不能因内部 attach 存在就声明整组已支持。agent start --foreground 可复用明确的显示动作，但 CLI 不获得长期 GUI焦点授权。 |

停止的实际方法名是 **stopManaged**，不是旧预检中的泛 requestManagedStop；后者是 TerminalSessions 内部同步 effect 入口。Session.readScreen 是 Promise，失败/expired cursor 的 union 不是异常字符串；无需另设 PTY screen store。

**严格后台启动已具备的语义：**createManaged 不弹首次确认；未取得所需权限准确 AGENT_BLOCKED；GUI后台仍走 createManagedInteractive 保留确认。foreground 与 interactive 不等同。新 router 不调用 newAgent/newShell/start 旧 wrapper，也不调用 controller.prepare/checkHelper 作为每次查询的前置。

## 2. T07 首轮能力表与后票扩展

单源描述列出计划拼写与 `providedBy`，运行时 capabilities 只列已注册、当前可执行的 handler（或显式 unavailable 原因），不把“描述存在”当能力存在。

| 命令 | T07 应闭合的接线 | 未闭合时的准确结果 |
|---|---|---|
| version/schema/help | 同源编译描述，离线可用 | 不连接/下载/唤醒模块 |
| capabilities/doctor | 当前已显式登记 gateway 的实际协议、scope、limits、handlers | 无 endpoint：MODULE_INACTIVE/CONNECTION_UNAVAILABLE；错 major：PROTOCOL_MISMATCH；无自动启用 |
| space list/get/create/rename/archive、session list/get/rename/archive | 上表同 owner，补 grant-id/持久rename窄口后接通 | 这是T07本票应补的工程闭包，不以长期unavailable代替已定范围 |
| terminal start、agent start | 严格 createManaged，固定Space；默认后台 | 配置/账号/权限拒绝准确；已保存/已spawn效果不能改none |
| terminal get/read/stop | 当前 managed检查+T05read+T04stop | 旧runtime、无模型、expired cursor、unknown cleanup各自准确说明 |
| agent list/get/explain | T06实际能力冻结后接线 | T06未交付前不宣称available；不能把当前旧activity包装成新来源证据 |
| terminal send-text/send-keys、agent prompt/wait | **T08**完整仲裁/前台证据/新活动水位用例 | 已知命令但handler未注册：CAPABILITY_UNAVAILABLE/effect:none/exit4；Session.submitInput存在不等于此CLI用例已交付 |
| pane * | **T09**稳定Pane/布局用例 | 同上；不能把runtimeId冒充paneId，或凭现有GUI函数声称全组可用 |
| message/inbox、history | **T10–12**垂直切片 | 同上；不转发到旧server的私有API顶替新scope/receipt合同 |

真正未知 operation/非法参数是 INVALID_ARGUMENT/exit2；已知但尚未实现/未协商的是 CAPABILITY_UNAVAILABLE/exit4。运行中某目标不支持某能力也返回明确 unavailable，不伪造成功。T08 以后通过同一 catalog 添加实现状态/handler/fixture，不再造第二个 router/schema；当前 T07 不实现 prompt 安全策略或 mailbox。

## 3. 唯一 scope 与调用上下文

当前 SpaceService 的 vault、options.instanceId、lease/lost 都是私有事实；store.records 有 logical/physical/device，没有可靠公开 instance 端口。不能再 mint 一套 gateway instanceId。建议由同 owner 增两个只读方法（签名候选）：

```ts
interface ControlScope {
  readonly vaultId: string;
  readonly deviceId: string;
  readonly instanceId: string;
  readonly physicalRoot: Readonly<{ canonicalPath: string; dev: string; ino: string }>;
}
// SpaceService；只读、无需writer acquire，不写业务记录。
getControlScope(): Promise<ControlScope>;
assertControlScope(expected: ControlScope): Promise<void>;
```

返回捕获 clone；assert 复用原 DirectoryPort.assertVault/loaded binding 校验实际物理根与 device/instance/关闭门，不能只看内存 logicalID。mutation 仍走原 queue/owner permit/beforeSpawn；查询不为了scope握手获得writer或创建业务文件。控制 owner lost/关闭使该注册失效，协议握手和每次 mutation 前都核本次捕获scope。T02的TCP port仍仅writer互斥，禁止借它开业务HTTP/TCP或扫描端口猜实例。

上下文建议放 `core/control/context.ts`，业务用例仍原实例：

```ts
interface ControlUseCaseContext {
  readonly scope: ControlScope;              // registered instance, not client-selected new identity
  readonly currentSpaceId?: string;          // explicit/captured caller hint, validated once
  readonly origin?: Readonly<{ spaceId: string; sessionId: string; runtimeId: string }>;
  readonly requestId: string;                // correlation only
  readonly deadline: number;                 // local monotonic deadline from bounded remaining budget
  readonly signal: AbortSignal;              // observation/queued admission cancellation
  readonly interactive: false;               // no dialog/automatic confirmation
  progress(value: Readonly<{
    target?: ControlTarget; phase: string;
    effect: 'none' | 'partial' | 'completed' | 'unknown';
  }>): void;                                // bounded one latest receipt, not event log
}
interface ControlTarget {
  readonly spaceId?: string;
  readonly sessionId?: string;
  readonly runtimeId?: string;
  readonly paneId?: string;
}
```

- 无 `--space` 的查询只用该调用开始冻结的 currentSpaceId；不读当前GUI selectedSpace。外部终端无上下文，即使仅一个Space也 TARGET_REQUIRED；--all-spaces 显式查同Vault，不等于默认全库。
- 显式稳定Session/runtime可从原记录解析其Space；若另带spaceId与原归属冲突则SCOPE_MISMATCH，不改归属。运行操作必须同时session+runtime；旧代拒绝，不默默选新代。名称只发现，歧义拒绝。
- origin/currentSpace环境是路由提示，不是认证或权限；同OS用户仍可明确选择同Vault另一Space。跨Vault/复制logicalID但physicalRoot不同/旧instance拒绝。locator只读本机受保护根，保护机制沿旧预检，不扫描用户Vault/账号。
- fresh start 的最终spaceId必须明确传入createManaged（可来自已验证捕获提示），后台缺/失效绑定配置失败；不弹SpacePicker、不按cwd/focus猜。外部路径授权仍来自既有grant，CLI正文文件只由CLI按明确--file读取，服务端不提供任意路径读取。
- 子进程路由env在 TerminalSessions **单一最终env接缝**写入已验证Hints，覆盖同名用户env，不能六Provider各写一套。保留HUHU_SESSION_ID当前runtime含义；新增显式HUHU_SPACE_ID/HUHU_BUSINESS_SESSION_ID/HUHU_RUNTIME_ID/HUHU_INSTANCE_ID及必要locator提示（名字待单源描述冻结）。Hook env不能覆写最终受管身份。读取这些值后仍执行scope/target验证。

**GUI显示意图：**后台全程不select/open/focus。CLI显式--foreground只是一次显示请求，仍interactive:false；在router接纳时捕获该调用的显示意图/当前用户revision，后续GUI新意图/关闭/外部leaf-window变化使迟到展示失效，运行留后台可查。不得在业务完成后重新 capture 意图授予自己前景；不能因CLI不是GUI事件就永久绕过GUI fence。建议给 createManaged 内部 context 增可注入captured intent的最小端口，或在接纳同步段调用现有launch.capture/foreground；不能让在router队列等待之后才捕获。公开CLI不接收DOM/leaf对象或任意“intent有效=true”凭据。

## 4. 单源 command 描述与纯 shared Native control shape

推荐仍是一份中立 `src/shared/native/control-schema.json`：外部major1、请求/响应/target/error/effect、命令拼写/参数互斥/scope/limits、providedBy及帮助文本key。确定生成器只覆盖本协议子集；产生TS validator/types、Rust wire/CLI parser描述及公开JSON Schema。C/Root明确一个唯一writer；A只绑定type-safe handlers，不能分别手抄Rust/TS枚举。help/schema/已知未实现命令也从同源产生；capabilities再与实际handler registry取交集。

未来可冻结的最小外部 shape（字段与合同一致，类型由canonical生成）：

```ts
interface ControlRequest {
  readonly protocolVersion: 1;
  readonly requestId: string;
  readonly scope: ControlScope;
  readonly operation: string;                // generated known operation union
  readonly target?: ControlTarget;
  readonly context?: Readonly<{ currentSpaceId?: string; origin?: ControlTarget }>;
  readonly params: Readonly<Record<string, unknown>>; // per-operation generated exact codec
  readonly timeoutMs?: number;
}
interface ControlResponse {
  readonly protocolVersion: 1;
  readonly requestId: string;
  readonly ok: boolean;
  readonly operation: string;
  readonly target?: ControlScope & ControlTarget;
  readonly phase: string;                    // generated documented finite stages
  readonly effect: 'none' | 'partial' | 'completed' | 'unknown';
  readonly data?: unknown;                   // per-operation bounded generated payload
  readonly error?: Readonly<{
    code: string; message: string;
    details: Readonly<Record<string, string | number | boolean>>;
    nextAction: string;
  }>;
}
```

unknown/Record是此报告展示简写，**实际codec不得接受任意对象**：operation分支exact keys、JSON类型/深度/字符串/数组数和编码总bytes全部有限。正常target包含已核身份，不以空字符串伪装；缺已核字段则省略。物理根/canonicalPath不反复写stderr敏感日志；受保护locator/握手才携校验所需值。

shared不能导入Agent core。建议 `src/shared/native/control.ts` 承载由生成字段组合的下列端口；host/desktop只搬运，Agent router才解释Space/业务。外部major1与当前helper PROTOCOL3分开；hello新增协商localControl:1，旧helper缺该能力拒绝注册且不publish locator，不能从numeric版本/PTY输入能力推断支持。

```ts
interface NativeControlKey {
  readonly controlId: string;                // unique registration within captured helper generation
  readonly connectionId: string;             // broker-created, not client requestId
  readonly bridgeId: string;                 // unique pending key, safe opaque string
}
interface NativeControlRequest extends NativeControlKey {
  readonly request: ControlRequest;
  readonly remainingMs: number;              // bounded original deadline remainder, never reset on reentry
}
interface NativeControlCancel extends NativeControlKey {
  readonly reason: 'client-closed' | 'timeout' | 'cancelled' | 'gateway-closed';
}
interface NativeControlRegistration {
  readonly controlId: string;
  readonly scope: ControlScope;
  readonly protocolVersion: 1;
  readonly limits: Readonly<Record<string, number>>; // generated exact finite limits
}
interface NativeControlRegistered {
  readonly controlId: string;
  readonly endpoint: string;
  readonly protocolVersion: 1;
}
// NativeCapability adds 'control'. Existing pty/history/cookies leases stay independent.
// NativeEvents gains synchronous, non-awaiting callbacks:
// controlRequest?(value: NativeControlRequest): void;
// controlCancel?(value: NativeControlCancel): void;
// NativeConnection gains optional negotiated operations:
// registerControl?(value: NativeControlRegistration): Promise<NativeControlRegistered>;
// respondControl?(key: NativeControlKey, value: ControlResponse): void;
// unregisterControl?(controlId: string): Promise<void>;
```

内层 kind1 消息建议固定六组：`control-register/registered`、`control-unregister/unregistered`、`control-request`、`control-cancel`、`control-result`；register/unregister结果带controlId和明确ok/error，不能仅返回无关联字符串。三个key字段贯穿request/cancel/result；公开requestId只相关性，同名client不能覆盖pending。NativeHost将回调/结果权限绑原owner+generation+controlId，release前同步关新动作，晚result绝不能给新owner；从不把PTY numeric SID塞成business target。注册失败/超时不publish locator，清理只核自己创建的nonce/文件身份，不删新实例locator。

当前 NativeEvents/Connection/Capability 没上述control端口，现有request仅history|cookies；因此这些是**确需补的shared路径**，不以desktop宽写集代替。当前helper main已把spawn放线程；未来broker仍不能在dispatch里等TS。保留一条stdout writer，不能另println协议。

## 5. Router执行、取消和有限生命周期

Router只拥有有限request bookkeeping和handler表，不拥有Session/PTY/磁盘业务。TS receive与Rust stdin只验证→短登记/分派→返回；Promise业务在外运行。禁止把整router塞进旧createSerialQueue。需要TS再调用helper.spawn/history时，stdin仍能处理响应；慢扫描/Socket写不能挡stop/exit/Cookie。

状态：validated→queued→admitted→executing→replied。ctx.signal在未admitted时取消即可保证零晚执行；**调用生产mutation即按已接纳处理**，不能因为其首个await还没完成便假称可回滚。当前createManaged没有signal参数，T07不要用Promise.race后遗忘它，也不要把CLI断开当stop；保留一条有限late settlement，运行/记录始终可query。

- readonly/get/read：取消结束该调用者等待，游标等内部资源仍受T05 TTL/数量限制；不dispose模型/停止Session。wait由T08 join/subscribe拥有，取消只dispose该订阅。
- start：保存失败零spawn按原证据；record-saved/pending后等待丢失，返回已知target/phase和partial或unknown，随后query，不重发。router不得自造requestId幂等cache或再调用create补偿。
- stop：请求已送后timeout/abort仍可能继续cleanup；直接保留StopResult的pending/effect/termination/persisted/error。不能把stop-requested输出成exited，更不能从root exit推cleanup confirmed。
- archive：preview不effect；确认/明确命令后使用原plan，取消/timeout不撤已做stop/已开始write，逐项rows保留。无开始write不得晚自动归档；已开始不可取消disk的真实结果由原Space owner隔离/收集，不能none/rollback。
- 本地传输请求**未发送**时失败可none；送出mutation后失去最终回执准确EFFECT_UNKNOWN/exit8。WAIT_CANCELLED/130与WAIT_TIMEOUT/6主要描述观察；即便返回该码也保留已知effect，不推“非0=无效果”。本地已收到完整reply后取消不得覆盖成功；每bridge最多结算一次。

建议初始可审查profile：≤8连接、≤16已接纳pending（含late settlement直到真实结束）、每连接最多1个在途请求；满额拒新且effect:none。每pending只保留一个latest progress+一个有界result，观察者消失不释放仍执行的slot，更不无限堆detached任务。scope/实例失效停止接纳；只读控制与stop/cancel保留独立有限调度配额，不能被长future wait全占完。最终数值需C按实际writer/outbox整链测后冻结。

**不能重用旧16MiB frame数字冒称可安全发控制结果。**当前PtyHelper控制writer总lane仅64KiB、decoder控制体约4MiB；候选单控制帧≤48KiB（请求≤32KiB），screen/list每页再按JSON最坏转义预留，超过明确拒绝/更小页，不能先构造巨result再量。并发保留result额度、stdout/broker/socket缓冲和取消保留位必须一同准入；若需单独control lane，由C在同writer内明确计费，不挤掉T04 ACK/termination或T05 reply。T05真实limits从getScreenProfile读取，read.maxBytes受本次可编码残额约束；不能只把--limit当文本字节，也不能截断ID偷偷让一页塞下。所有limits单源公开，数值不是本轮验收。

关闭：同步router关门/使locator不可发现→取消未开始请求和独立观察→收集已接纳用例/真实晚结果（原owner继续写隔离）→注销control→release仅该control lease。Controller现并发settle native/registry/managed/layout，writer最后；新增gateway应在最前同步关门，不把某个挂起router Promise放在native cleanup前串行await。Browser cookie/history owner继续；无control owner时不能全helper.shutdown。外部CLI探测永不调用module.load/prepare/checkHelper/acquire；gateway只由已有显式工作台/控制启用路径登记，普通module activation与metadata查询保持被动。首次显式启用是否已有helper由同host lazy acquisition处理，不由外部CLI自动创建。

## 6. 精确补写集与可派工顺序

以下仅建议Root正式修票/Map，当前无写权。旧T07宽目录仍可用，但这些真实闭包不能漏：

- **C：native/shared/descriptor唯一writer。**原 `native/pty-server/{src/control/**,src/bin/huhu.rs,src/lib.rs,src/main.rs,src/frame.rs,Cargo.toml,Cargo.lock,tests/control*.rs}`；补 `src/shared/native/{host.ts,control.ts,control.test.ts,control-schema.json,control.generated.ts,control.public.schema.json}`、`src/shared/native/lazy-host.test.ts`（新增cap不破lazy）；`src/host/desktop/native/{host.ts,host.test.ts,helper.ts,helper-stream.test.ts}`。建议共同fixture `test/fixtures/native/local-control-v1.json`，生成器 `scripts/generate-agent-control.mjs` 与其确定性检查入口由C独占。是否需frames改动必须实际证明，现有kind1可承载，不默认越界。Cargo新依赖许可/notices当票正确，发行打包仍T17。
- **A：TS router/原业务接线。**原 `core/control/**`、`platform/desktop/control/**`、`services/control/**`、module.ts、services/controller.ts；精确补 `services/{workspace-service.ts,workspace-service-control.test.ts(新增)}`、`services/terminal/{sessions.ts,sessions-control.test.ts(新增)}`、`services/spaces/{space-service.ts,space-service.test.ts}`、`core/space/{model.ts,ports.ts}`（仅scope端口确有需要）和 `i18n.ts`。scope getter/assert、既有grant创建、持久Session rename、中央routing env、内部foreground intent注入均属此闭包，不改六Provider账号/argv逻辑。若context类型可全放core/control且复用现core/space则不改model/ports，不能为清单而动无关源。
- **组合测试**拟 `platform/desktop/control/{gateway-process.test.ts,gateway-process.fixture.ts}`：真实NativeHost+SpaceService+WorkspaceService+Sessions，隔离临时storage/目录，固定新huhu/helper字节；Rust control传输黑盒与Node生产组合分开，不让cargo测试依赖缺pnpm的CI环境。测试清理/有界等待与原二进制显式路径规则保持。
- **Root**独占正式合同/生成main/styles、全局检查与独立review；`docs/agent-workbench-cli.md`随实际命令，T17接后续打包/帮助/Skill。`scripts/third-party-notices.mjs`是否本票需改由真实新增依赖图决定，不为了第二bin重写。CI前置与T17 release.yml旧缺口沿前报告，不在本增量重复扩写。

先C落canonical+shared接口/fixture（含effect/取消/旧helper拒绝），Root核读实际SHA；A随后接router/context/usecases。A/C不同时改shared/native/host.ts或schema；后票handler只能消费这个协议扩展入口。所有新增精确路径由Root正式纳入再写。

## 7. 首批可证伪边界（本轮全未运行）

1. 真实huhu→gateway→生产createManaged：Space A前台不变、B后台无Pane且可get；保存失败零spawn，spawn已发生而回路断开unknown、之后query原runtime且不重发。
2. defaultSpace捕获A后GUI切B仍查A；显式Session-B跨同Vault成功，显式Space-A+Session-B拒；无context/唯一Space也不猜；physical root替换/复制Vault/旧instance/controlId/runtime全部零越界效果。
3. native→TS→native实际回入，受控挂起history/归档flush时另请求get/stop/exit仍前进；外部慢读socket仅卡自身有界slot，不能堵stdio/Browser Cookie。不能仅以最终全结束证明未阻塞。
4. queued取消零迟到执行；admitted start/stop/archive观察取消不撤真实effects；late resolve/reject不泄漏pending或早释放writer。重复requestId来自两个连接不能串结果；旧result/cancel不碰新owner。
5. terminal read同cursor重试幂等、runtime失效/TTL准确、JSON转义/页上限和output状态保留；不滚TUI，不把screen当原生全文答案。未注册T08/T09/T10命令始终CAPABILITY_UNAVAILABLE/no-effect。
6. foreground start在queue/Provider await期间用户换pane/leaf/window，迟到运行留后台；CLI从不绕过interactive:false首次确认门。T06活动实际来源freeze后get/explain再测unknown/lastFact/blocked，不补假foreground。
7. module停用立刻关gateway；registry/layout持久挂起仍native cleanup，真实owner隔离保持，其他native租约可Cookie请求；locator清理只删自己的nonce/identity。Unix/Windows访问保护与五平台边界沿原预检，Linux代码/fixture不当Windows实机通过。

无新增产品决定。需Root处理的是正式精确写集、未来C唯一wire/schema owner及实际limits的工程冻结；T06签名仍候选，正式T07准入必须回读届时T06交付，不把本稿作为已实现API。READ-ONLY SOURCE STOPPED。
