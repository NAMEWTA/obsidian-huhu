# 任务回报

Session: 20261031T062046Z
Task: 022-host-stop-review
Status: completed

## 聚焦交接

独立审查已完成，两轴均为 request-changes；completed 仅表示报告交回。固定10项候选、9项来源、tracked diff 与完整 Input-SHA256 均已核对匹配，未参与 T06 实现，未改候选。现有三个控制测试文件21项通过，但只读探针确认两个 Host 清理失败缺口：已结算的 refresh 失败被后续 stop 遗忘，以及重连时同步 cleanup 抛错绕过进程停止。请 Lead 派发最窄修复后冻结新输入复审；T09 保持50 Run检查点暂停。

## 产物与验证

### 固定输入、方法与范围

- Reviewer：native:/root/sources；实现者 native:/root/bundle；Astra low，未递归派遣。T03/T14/T16实现与T04审查不属于本票实现。
- 仓库 current/dev，base 与实际 HEAD 均为 `86c500556db1d64865c4cc7f1aff1dd83de071fa`。
- 原输入：`evidence/T-06.md#review-input`；完整摘要 `50504adfbeb61da567acaa67b2b03c586d467b3b06c81e57438ec72fbd43c5cf`；tracked diff `00d5268679b8fb79dea4548762694d00032209b1313aba084ec69c2a973f4c7e`。通过 Node 读取JSON、逐项SHA256、使用原始diff argv、按 `readArtifactSectionSync` 提取来源section核对，退出0；不是只相信作者摘要。
- 10项为 runtime/client-runtime.ts及测试、transport/managed.ts及测试、managed-stop.ts及测试、managed-session.test.ts、credentials-runner.test.ts、transport/runner.test.ts、services/events/runner.test.ts。T09新增夹具不在范围。
- 标准来源：AGENTS、dev及testing、execution-boundaries、公共 code-review 的风险/两轴合同。规范来源：完整Ticket06（含显式行为、执行、原子集成section）、Spec AC281/282、ADR002、已验收T04生产者/Evidence；读取018作者报告但不以其代替代码。工作树无新增提交，commit message来源不适用；本地明确规范已找到，不需要远程检索。没有UI变更，不进行视觉判定。
- 实际追踪：module.ts 的同步Host disposer、cleanupCompleted→refreshHost、dispose→runtime.stop，注册Host的 dispose 链；HapConnection通用close；Go stdio的最终shutdown回复/在途回复退出；runtime→managed session→managedStop→transport真实退出与reservation。只写本REPORT。

### 独立运行

1. `pnpm exec vitest run src/modules/huhubot/platform/desktop/runtime/client-runtime.test.ts src/modules/huhubot/platform/desktop/transport/managed-stop.test.ts src/modules/huhubot/platform/desktop/transport/managed-session.test.ts`：退出0，3文件21测试，749ms；Linux，Node26.11.1，Vitest5.0.3。
2. 下列只读内存探针：退出0，两个反例均出现。读取并用已有esbuild转译真实 `client-runtime.ts`、`managed.ts`、`managed-stop.ts`，不改写文件；替身仅是Obsidian/安装输入、HAP连接及物理子进程。真实runtime状态机、session reservation、Host barrier、managedStop与observeStop均执行。它证明控制流缺陷，不冒称真实Go/宿主失败复现。第一版探针因返回旧exports而报 `createBotRuntime is not a function`（退出126），修正为读取module.exports后运行成功；未把初版失败当产品红灯。
3. 作者59项/Lead Go全量与构建属于其来源证据，本review未重跑，不宣称本review执行。未运行真实Obsidian、Windows/macOS、最终全局构建预算，也未恢复T09规模测量。

只读探针可从仓库根直接复跑：

```sh
node --input-type=module <<'JS'
import {readFileSync} from 'node:fs';
import {transformSync} from 'esbuild';
import {createRequire} from 'node:module';
const native=createRequire(import.meta.url);
function load(path,require){
 const module={exports:{}};
 new Function('require','exports','module',transformSync(readFileSync(path,'utf8'),
  {loader:'ts',format:'cjs',target:'es2022'}).code)(require,module.exports,module);
 return module.exports;
}
const base='src/modules/huhubot/platform/desktop/';
const stop=load(base+'transport/managed-stop.ts',native);
async function scenario(reconnect){
 let shutdownCalls=0,cleanupCalls=0,exited=false,release;
 const exit=new Promise(r=>{release=()=>{exited=true;r({code:0,signal:null,forced:false})}});
 const transport={exit,exited:exit.then(()=>{}),close(){},openCredentials:async()=>({})};
 const facts={requested:true,executionDrained:true,persistenceComplete:true,
  profileReleased:true,finished:true,failures:[]};
 const client={state:'ready',hello:{profile:{profileId:'profile:probe'}},
  service:{shutdown:async()=>{shutdownCalls++;release();return facts}}};
 const managed=load(base+'transport/managed.ts',id=>id==='./managed-stop'?stop:
  id.includes('core/protocol/connection')?{HapConnection:class{async connect(){return client}},BotRpcError:class extends Error{}}:
  id.includes('core/protocol/codec')?{MAX_FRAME_BYTES:100000}:
  id==='../credentials/client'?{}:native(id));
 managed.DesktopHapTransport.launch=async()=>transport;
 let launchOptions;
 const req=id=>id==='../transport/managed'?{launchManagedBotSession:async(...args)=>{
  launchOptions=args[0];return managed.launchManagedBotSession(...args)}}:
  id==='../transport/managed-stop'?stop:
  id==='node:fs/promises'?{realpath:async x=>x}:
  id.includes('device-id')?{vaultIdentity:()=>({vaultId:'v',deviceId:'d'})}:
  id.includes('protected-receipt')?{}:
  id==='../installation/binary'?{ensureBotBinary:async()=>'/runner'}:
  id==='./portable-files'?{}:native(id);
 const {createBotRuntime}=load(base+'runtime/client-runtime.ts',req);
 let saved;
 const app={vault:{adapter:{getBasePath:()=>'/vault'}},loadLocalStorage:()=>saved,
  saveLocalStorage:(k,v)=>{saved=v}};
 const runtime=createBotRuntime(app,{get:()=>({binaryPath:'/runner',workingDirectory:'/vault',profileRoot:''})},
  {dir:'.',version:'1'},async()=>()=>{cleanupCalls++;throw Error('HOST_DISPOSE_FAILED')});
 await runtime.start();let error;
 try{if(reconnect){client.state='closed';await runtime.start()}else await runtime.refreshHost()}
 catch(e){error=e.message}
 let outcome;try{await runtime.stop({timeoutMs:50});outcome='resolved'}catch(e){outcome=e.message}
 let reopen;try{await managed.launchManagedBotSession(launchOptions,{name:'probe',version:'1'});reopen='allowed'}
 catch(e){reopen=e.message}
 console.log(JSON.stringify({scenario:reconnect?'sync reconnect cleanup failure':'settled refresh cleanup failure',
  error,stopOutcome:outcome,state:runtime.state,shutdownCalls,cleanupCalls,exited,reopen}));
 release();
}
await scenario(false);await scenario(true);
JS
```

实际输出：

```json
{"scenario":"settled refresh cleanup failure","error":"HOST_DISPOSE_FAILED","stopOutcome":"resolved","state":"closed","shutdownCalls":1,"cleanupCalls":1,"exited":true,"reopen":"allowed"}
{"scenario":"sync reconnect cleanup failure","error":"HOST_DISPOSE_FAILED","stopOutcome":"resolved","state":"closed","shutdownCalls":0,"cleanupCalls":1,"exited":false,"reopen":"HUHUBOT_PROFILE_ALREADY_OWNED"}
```

<a id="original-standards-output"></a>
## 标准轴原始输出

Reviewer: native:/root/sources
Axis: standards
Result: request-changes
Input-SHA256: 50504adfbeb61da567acaa67b2b03c586d467b3b06c81e57438ec72fbd43c5cf
Observed: 10项候选与来源实摘要匹配；独立21测试通过；只读真实runtime/session/stop控制流探针确认S1、S2。生命周期与失败owner不满足dev资源释放要求。

### S1 — P1：已完成的 refresh 清理失败从 stop owner 中消失

- 位置：`src/modules/huhubot/platform/desktop/runtime/client-runtime.ts:181`、`:192`、`:322`；释放点 `src/modules/huhubot/platform/desktop/transport/managed.ts:358`。
- 触发：已启动runtime，`refreshHost()`调用旧Host cleanup，cleanup同步抛错或返回reject；调用方收到失败后再调用stop。refresh先清空disconnect，finally又清空hostRefresh，没有持久保存失败。stop收集到的hostRefresh/exitCleanup/disconnect均为空，将hostDone resolve；真实managedStop成功后reservation被删除。
- 影响：Host清理明确失败仍返回stop成功、state=closed，另一个runtime/session可获取同Profile；可能仍有未释放Host资源与新owner重叠。探针观察 `reopen=allowed`，不是仅从字符串推断。实际module回调返回同步disposer（module.ts:74附近）并调用registered.dispose；这不是只接受async callback的接口。
- 最小修正：仅runtime的Host清理状态/归属与对应测试，保留已结算失败或统一每owner的cleanup结果；失败必须传入hostDone并使stop失败、reservation保留。覆盖refresh失败已结束后stop、同步/异步两种失败，以及新runtime不得重开；不能只测试stop与refresh同时未结束。

### S2 — P1：重连 cleanup 同步抛错会丢掉进程 owner，随后 stop 假成功

- 位置：`src/modules/huhubot/platform/desktop/runtime/client-runtime.ts:229`、`:234`、`:316`。
- 触发：旧client已closed，runtime.start进入obsolete分支。`cleanup?.()`在构造Promise.all参数时同步抛错，尚未执行stopOwned；hostEnds也没有结算。finally清掉pendingSession，而session/disconnect已在前面清掉。start失败后再次stop看到无current、无startPromise、空stops，直接state=closed。
- 影响：进程停止/收割根本没有被调用，Host barrier悬空，后续stop却成功。探针显示shutdownCalls=0、exited=false、state=closed。reservation仍停留already-owned而非准确的recovery-required；旧进程即使自行退出也未被runtime收割。闭合HAP不代表物理进程已退出，当前T04慢清理场景会扩大该时间窗口。
- 最小修正：把同步cleanup也变为被owner保存的Promise失败，确保进程停止独立启动且所有结果allSettled后才结算；失败时保留/归类原owner而非丢引用。补同步cleanup throw + 延迟真实exit控制测试，断言stop一定被调用、caller超时后仍能等owner、最终failed而非closed，且不能重开。

其他标准检查：未见本票引入跨模块生产导入、数据根变化或隐式TERM/KILL；force明确标记不能成为成功事实。暂不把大小写/软链接未运行的平台特性写为已确认缺陷；生产runtime使用绝对managed-root与稳定小写binding，session在launch前同步claim，Windows键转小写。失败reservation在模块缓存存续期间保守阻断是明确有意边界，但S1/S2使该规则不能覆盖全部Host失败。

<a id="original-specification-output"></a>
## 规范轴原始输出

Reviewer: native:/root/sources
Axis: specification
Result: request-changes
Input-SHA256: 50504adfbeb61da567acaa67b2b03c586d467b3b06c81e57438ec72fbd43c5cf
Observed: 按AC281/282、ADR002、T04和完整Ticket06逐项核对；基本四阶段/超时/真实退出合同成立，但S1/S2的Host失败路径违反完成与唯一owner约束，需修正后新输入复审。

- P1，S1同路径/触发：AC281及TASK的“成功释放必须四阶段+child exit+Host cleanup、失败保守阻断”未满足。已完成refresh失败不能因调用顺序而变成成功Host清理。最小满足条件为失败事实持久归属原owner，stop拒绝且新session被recovery-required挡住，并提供真实session reservation参与的回归。
- P1，S2同路径/触发：AC282/ADR002要求资源owner在观察超时或调用失败后继续清理；同步Host回调异常绕过stopOwned且后续虚报closed，违背唯一owner及“不以UI/连接关闭当进程完成”。最小满足条件为异常不能取消或跳过原进程owner，等待实际exit与Host失败结算后准确报告失败。
- 已满足的静态与控制证据：managedStop使用独立owner promise，caller timeout/signal只结束observeStop；四阶段齐全、无failures、真实code=0且无signal/forced才成功；EOF不补造阶段；普通BotClient.close仅断管道；managed:false仍不自动发送managed shutdown。运行期晚到launch/onConnect、重复stop、正常Host gate及prehello不伪造事实有现有控制测试，真实TS↔Go慢观察/重开与明确信号是作者来源证据。
- 夹具检查：真实暂停只控制自有transport PID，finally恢复SIGCONT并在失败时显式force+等待close；各路径先等实际退出再清理Profile临时目录；Linux专属用例不被当成其他OS证据。未新增全局时限放宽。
- 联合集成与剩余边界：T04上游已验收而T06仍需修复，不能据此放行原子集成。T33负责呈现；无失败reservation解除API是本票明确边界，普通模块重启不能视为已验证恢复。最终构建/预算/真实宿主均不由本报告宣称通过。

## 问题与下一步

请Lead按S1/S2派原实现者做runtime生命周期最窄修复与回归，再冻结10项受影响候选新摘要；可复用本次无关路径结论，但两轴最终通过须绑定新输入。本报告写完停写，无产品修复，无Git写入；T09保持暂停，等待Lead安排恢复。
