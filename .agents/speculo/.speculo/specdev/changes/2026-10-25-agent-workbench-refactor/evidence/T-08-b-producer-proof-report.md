# T08 Pi producer 真实入口补证（只读）

**已闭合实际 bundled loader/Jiti 类身份，以及真正 InteractiveMode 原默认 editor 的同步输入机制。** 固定官方 npm `@earendil-works/pi-coding-agent@1.4.0`，原 tar SHA256 `d155c16ef6fa00960fbf58b2911536e80b05f33700e0b14fbd08967ede0c7428`，在新的临时目录补入唯一缺失的固定外部依赖 `jiti@2.7.0` 后，真实 loader 执行扩展 factory，扩展 import 的 CustomEditor 与 bundle export 严格相同。真实 InteractiveMode 经 public `init/run` 创建并使用其原默认 editor；中文多行＋唯一 Enter 经过未修改的原正常 onSubmit，working 分支调用原 `session.prompt(...,{streamingBehavior:'steer'})`。

**证据截止于受控 Session 边界。** 工作状态由 Session Proxy 的公开 isStreaming 边界控制，prompt 在同一边界记录调用，不是正在运行真实 Provider，也没有验证真实 AgentSession streaming 队列的消费。这已超出此前“手工创建组件”的证据范围，仍不是原生 PTY/认证事务/Provider E2E。T08未解锁，T07 B12 SOURCE STOPPED。

## 1. 可重建的最小入口与依赖闭包

隔离根 `/tmp/huhu-t08-b-producer-proof/`。从已经缓存的原 tar 复制并核 SHA后原样解包1279个普通文件；不改第三方源码。测试实际 import 发行物 `dist/bundle/index.js`，使用它导出的官方 loader、DefaultResourceLoader、AgentSession、AgentSessionRuntime、InteractiveMode、SettingsManager 与 SessionManager。

bundled Node 发行物在这些实际路径上只需额外解析 Jiti。创建私有临时 package.json 精确固定 `jiti:2.7.0`，用实际 Node26.11.1 配套 npm 执行 `install --prefix /tmp/huhu-t08-b-producer-proof --ignore-scripts --no-audit --no-fund --package-lock=true --registry=https://registry.npmjs.org`，只安装1包、无传递依赖。仓库 package/lock/node_modules 均未触碰。最终 lock SHA256 `9093f0a81566128798909e6c7078ca18a1932c8c259cfbd40e63046fade9fa0c`。

| 输入 | 版本、来源和许可事实 |
| --- | --- |
| Pi实际发行物 | `@earendil-works/pi-coding-agent@1.4.0`；已保存官方registry tarball，package.json声明MIT；该tar没有独立LICENSE文件。原来源/SRI/provenance沿第一次readiness原件；它对应的provenance声明提交与d5b3de研究源码不同，不合并为同源审计 |
| 实际外部依赖 | `jiti@2.7.0`，`https://registry.npmjs.org/jiti/-/jiti-2.7.0.tgz`；官方缓存tar SHA256 `8dd0d365fb49c0e7cc42d6a00df6fb2da9056fc24492094346fc34ecdbcf28ca`，SHA512与lock integrity独立重算一致；package metadata MIT，repository unjs/jiti |
| 许可原件 | 新目录 `node_modules/jiti/LICENSE`，1078B，SHA256 `46231df5a7733c3f52f11b71f3df61813007745b62b09031acfb45fb42d75082` |
| 最小实际CLI入口 | 原 `dist/bundle/cli.js --version` 实际exit0并输出1.4.0。它只证明该固定入口可加载/执行，不冒充真实CLI TUI启动正例 |

完整bundle内含的1279文件均核对原inventory；Jiti安装后的16个原普通文件与官方npm缓存tar逐字节比对，无变化。这里没有安装package.json列出的所有unbundled依赖，也不声称审计了所有可选CLI功能；该最小闭包是**实际bundle loader＋本次public InteractiveMode路径**所需的完整可执行输入。

## 2. 实际调用链与没有替换的东西

`harness/identity-extension.mjs` 由真实 `discoverAndLoadExtensions` 或 DefaultResourceLoader加载；它从两个官方virtual namespaces import CustomEditor/getKeybindings。真实Jiti factory执行后写入测试专用Symbol，注册正常session/UI生命周期事件。实际结果为 errors=[]、恰好1个extension，`extension.CustomEditor === bundledSdk.CustomEditor`。

随后真实 DefaultResourceLoader 使用 `noExtensions:true`＋唯一明确additionalExtensionPath，禁用本测试不需要的skills/prompts/themes/context发现；真实SettingsManager和SessionManager用inMemory。真实ModelRuntime以refreshOnCreate=false、allowModelNetwork=false、临时auth/model路径创建，真实createAgentSession创建AgentSession和ExtensionRunner。没有账号/认证资料，创建时原isStreaming=false，默认model显示unknown。

真实AgentSession包一层**明确的Session测试边界**：只把公开 `isStreaming` 返回值设为受控working布尔，把公开 `prompt` 调用记录为文本/options；其余getter与方法仍委托真实AgentSession，包括真实bindExtensions/reload。真实AgentSessionRuntime持有该边界。没有patch原session/editor/onSubmit/handler源码，没有调用私有setupEditorSubmitHandler。

真实InteractiveMode通过公开terminal选项得到受控Terminal实现，public init自行创建默认CustomEditor、设置startup stub、完成工具/正常handler安装和TUI binding；没有手工创建CustomEditor、没有setEditorComponent。扩展只通过公开setWidget factory获得当前TUI reference，返回零行组件；从公开getFocusedComponent取实际focused对象，严格核其prototype为真实import的CustomEditor.prototype、custom factory为undefined。没读private defaultEditor引用、draft/pasteBuffer/jump字段，也没有从constructor.name/duck typing补真。

协作测试gate为本次自有离线harness逻辑，**不是已落源产品能力**：当前binding/ctx.mode、block、overlay、真实owner/prototype、disableSubmit、autocomplete、严格空getText、Enter binding全部通过后，同一个无await的函数依次调用真实editor.handleInput(完整bracketed paste)和一次handleInput(Enter)。使用原Editor及原InteractiveMode onSubmit；正常idle输入由原run loop取得，working输入由原onSubmit分支送入Session边界。

## 3. 真正运行的正反例

首轮完整机制执行command018 exit0；command026的producer/UI断言仍通过，但其目录值JITI_FS_CACHE没有实现所期待的cache隔离，最终command031审计真实exit1。按官方依赖明确支持的JITI_FS_CACHE=false关闭source cache、TMPDIR固定新隔离目录后，最后同源command035再次exit0。没有新增产品功能或换Provider；三轮原日志、输入脚本、前后快照和失败审计都保留，不反复运行producer。

| 实际用例 | 真实观察和准确上限 |
| --- | --- |
| startup未进入正常binding | terminal已经start，真实init尚未完成；gate因unbound拒绝，零协作paste/Enter、零prompt call。没有把同类editor/启动stub当就绪 |
| 正常空草稿＋中文多行 | 真实public init完成，mode=tui、默认owner严格prototype、空草稿、无custom editor。`你好，正常输入\n第二行保留中文` 经原editor粘贴＋唯一Enter，原正常onSubmit/run loop调用Session.prompt，options=null，之后原草稿空 |
| working＋原native steer分支 | 受控Session.isStreaming=true，仍是同一个真实默认editor。`正在工作时的新输入\n仍走原生 steer` 同栈粘贴＋唯一Enter，原InteractiveMode分支实际调用Session.prompt且options严格为 `{streamingBehavior:'steer'}`，记录beforeWorking=true。没有改handler为自造steer；未证明真实AgentSession队列/Provider消费 |
| 只有空白的用户草稿 | 人工路径输入3个空格；gate拒nonempty-draft，3空格原样保留，零CLI正文/Enter。清理是之后独立模拟人工3次Backspace，不是gate偷偷清空 |
| 权限风格确认 | 真实ExtensionRunner包装的ctx.ui.confirm创建真实确认框；不依赖agent pending，ui_prompt_start使gate拒blocking-ui；真实focus不是原editor。人工Escape退出后ui_prompt_end恢复。此处是实际原生确认UI，不是实际Provider工具审批事件 |
| extension selector | 真实ctx.ui.select，原生selector＋ui_prompt生命周期；gate拒，人工Escape关闭 |
| 原生设置selector | 人工路径输入`/settings`＋Enter，真实原handler打开设置selector；CLI gate拒非默认owner，人工Escape恢复 |
| 原生登录selector | 人工路径输入`/login`＋Enter，真实原handler打开登录provider selector；CLI gate拒非默认owner。只按Escape退出，没有选择provider、浏览器登录或触碰账号 |
| 原生reload撤销 | 人工路径`/reload`调用真实reload路径、原resource loader/Jiti产生新extension实例；旧实例session_shutdown后bound=false，旧binding gate拒绝；新实例恢复真实默认focus、构造器身份仍严格成立。没有复用旧许可 |

每轮正例共2次gate Enter、2次Session.prompt，所有7个拒绝用例都断言prompt计数/Enter计数不变。gate拒绝前不调用editor.handleInput；负例中用于打开/退出UI的人工输入与CLI正文分开记录。没有包装onSubmit或editor.handleInput来伪造观测。实际network fetch尝试计数为0，环境PI_OFFLINE=1；没有模型/Provider调用。

## 4. 原始命令、失败和隔离修正

`run.py` 对每次实际命令保存独立 `.before.json`、`.raw.log`、`.receipt.json`：argv/cwd/UTC、精确环境、执行前harness/runner/package/lock的内容地址快照、实际exit/timeout、执行后相同脚本/清单快照与B12逐源SHA。并行只读命令可能有相同数字前缀，完整label/path唯一，不重排成虚构严格序列。原stdout/stderr合并log未截断保存；工具展示只是尾部。

重要实际执行是003固定依赖安装、006真实Jiti身份、018真实Mode机制、021实际CLI版本及依赖/第三方逐字节审计、026目录cache尝试的相同Mode机制、031最终隔离审计失败、035关闭cache后的最后同源Mode机制。013/014是静态定位时不存在路径导致的exit2，031是实际隔离断言exit1，原失败均未删或记绿。此前readiness中loader缺jiti的exit1与组件only exit0在旧目录保持原SHA，不被新结果改写。

**初轮隔离有一项实际偏差，完整保全：** Jiti默认fsCache在`/tmp/jiti/harness-identity-extension.ed509490.mjs`写出1331B自有harness转译缓存（SHA256 `bedcc0bee7c40101b5b3737f0384b4f16281de2b84c16f5c19a160859f815f4a`）。它不是仓库或第三方源码，但初轮不能宣称所有临时输出都在新目录。识别后记录原路径/mtime/SHA，只迁移这一自有缓存至新目录`observed-default-cache/`，未改其他/tmp缓存；原command018输出也另行保全。把JITI_FS_CACHE设为目录字符串的command026虽UI通过，却又写了相同默认缓存，故command031最终审计正确失败。第二个自有缓存/mtime及026输出同样保全，原件未删。最后采用官方README明确的JITI_FS_CACHE=false，并将TMPDIR设为新隔离根/tmp；command035成功。最终是否仍出现默认缓存由最后审计实际记录，不因UI通过推定。详见`isolation-observation.json`及commands023–035。

每次命令均有B12前后检查；最终再次核对Root已接受的B12基线、原1279个Pi文件和Jiti原16文件。任何报告都不把缓存隔离修正冒充产品修复。除上述已记录的初轮默认缓存，依赖、HOME/XDG、npm缓存、应用临时状态、实验和原件都在新的隔离根；交付md/json按任务指定位置输出。

## 5. 现在能消费什么，仍缺什么

这次已能给T08实施消费一个真正可运行的producer接缝：固定bundle真实Jiti身份一致；唯一扩展集合下真实Mode的默认focused editor可经公开widget/TUI取到并严格校验；正常启动后完整paste＋一次native submit可成功；真实原Mode的working分支确实走steer调用；原生登录/selector/确认、空白草稿和reload都能准确拒绝协作输入，人工操作保留。源码副作用仍只在原editor内部。

未验证且不得标绿：

- 真正AgentSession/离线Provider传输正在streaming时的原steer队列消费、input事件阶段、模型/Provider/任务结果；本轮Session边界只证明真实UI至该边界的调用。
- 完整官方CLI main的argv→相同resource-loader→真实TUI整链；本轮用了同bundle的真实public Mode/loader，CLI仅`--version`。recipe的实际spawn、Node/入口身份、前台与adapter私有认证仍待产品实施。
- partial bracketed paste、split UTF-8/IME、jump/history/autocomplete特殊模式、异步clipboard、pending人工Enter及并发输入压力；本轮仅把来源静态推断留在原supported-plan，没有把这些写成已测。
- 原NativeInputQueue的同槽事务、deadline/cancel/late结果/物理I/O结算、parser reply/ACK/stop/query/Browser活性；本轮没有实现协议或接PTY。
- 真实Provider、Obsidian及五平台E2E，继续按用户分工。

下一步可直接按Root已选的单一authenticated editor transaction实施及补上述定向测试，无需再等待一个通用Pi readiness API，也不需要idle-only或PTY正文第二方案。Root已明确接受原slot本次fresh native观察＋同绑定应用gate及OS check→commit竞态；本报告不再扩写不存在的原子OS保证。

## 6. 生产可稳定核验的闭包，以及唯一建议接线路径

仅认cli薄头、version或package.json不足。本次从已核官方原件导出`producer-profile.json`，给出一个可直接用于正式实现的**有限文件集核验算法和全部相对路径/字节数/SHA记录**：按相对路径排序，对每个普通文件生成紧凑JSON `[relativePath,byteLength,fileSha256]`＋LF，再对UTF-8整体取SHA256。Pi官方全部1279文件共23,419,059B（最大3,536,719B），文件集digest为`c7fbbe6a4b2f91f04505d7dddb068c64e0e42f99c5e2708ffdcbc6e16445fb78`；Jiti全部16文件共1,751,293B，digest为`176867a8c5336f4cd613ccb7a00fbda2f0f0d04facb8d023b5fa06d6d7712ac7`。

正式实现可懒加载这一个审定profile，解析实际CLI symlink→realpath→package root，流式核完整文件集、固定包名/版本和真实入口`dist/bundle/cli.js`，按该bundle loader实际Node resolution位置解析并核外部Jiti完整文件集。node_modules单独处理，不能混成Pi官方tar内容；其他未知源码/symlink/超额/替换均使这个首条profile不支持，不自动修改安装。文件遍历先用profile的文件数/总字节/最大文件界限拒超额，不读无界目录/文件。实际Node解释器路径/文件身份在spawn边界捕获，profile/入口/外部依赖digest与原slot/runtime/source绑定，之后fresh native观察重核身份。这里不是在提交时按basename重新找一个Pi，也不把文件hash→OS提交原子性或任意Node二进制“官方认证”说成已证明。

此profile当前只是/tmp候选，**未写入产品、未批准为永久支持清单**。保守核整个Pi文件集会把文档也计入，这是首条最简单可复核的严格策略；不能为了少核文件而漏掉共享chunks、Jiti/virtual module入口或运行时资源。以后减少成精确依赖闭包需要另有证据，本轮不同时提出另一算法。真实CLI flags→同loader/TUI的端到端验证仍保留上节缺口。

建议正式T08只采用以下一组Host/helper/extension生产路径，签名/写owner仍由Root准入，不因本报告解锁：

| 精确路径 | 唯一职责 |
| --- | --- |
| `src/shared/native/host.ts` | 在现NativeConnection/原PTY NativeLease代次上暴露optional协商能力、同SID fresh foreground观察和editor事务提交；Browser/旧helper缺能力准确unsupported；不新acquire另一个helper |
| `src/shared/native/input.ts` | 为同队列editor事务定义纯类型/有限结果与取消语义。现NativeInputFinishedResult的written只表示旧PTY物理写，不能把editor提交伪报written；需要独立有判别的editor-submitted结果。原预算复用，原raw输入默认合同保持 |
| `src/host/desktop/native/host.ts` | 把新能力绑定原owner/generation/SID并在每次调用同步核原lease/closing；无跨代重放、无fallback raw正文 |
| `src/host/desktop/native/helper.ts` | 原callback+drain有界发送、同队列op与真实应用/I/O结算；新状态等待不占全局writer或parser；继续让reply/ACK、query/stop保留池和其他SID/Browser工作 |
| `src/modules/agent/platform/desktop/hooks/native-extensions.ts` | 唯一Pi producer：认证adapter绑定，真实公开widget/focus gate，同栈原editor paste+唯一Enter，所有UI prompt/reload/close撤证；保留原状态Hook与其他Provider实现 |
| `src/modules/agent/platform/desktop/hooks/automation-hooks.ts` | 沿原扩展生成/安装与close作用域准备本次私有capability/已核扩展摘要；不自动加no-extensions、不改用户editor/其他扩展，不用spool轮询正文 |

实际存在、可就近复用的定向测试路径为`src/shared/native/{input.test.ts,lazy-host.test.ts}`、`src/host/desktop/native/{helper-control.test.ts,helper-stream.test.ts,host-control.test.ts}`、`src/modules/agent/platform/desktop/hooks/{native-extensions.test.ts,automation-hooks.test.ts}`；真实native broker/队列/PTY活性由C在其已分配路径验证。不需要改frames.ts或新造第二parser。A原计划的`src/modules/agent/platform/desktop/agents/program-identity.ts`（新）承担启动身份核验，可在同目录新增单一`pi-artifact-profiles.json`保存批准文件集profile；本报告不会替A写它们。

最小共享native接口需求（不是已冻结DTO）：

1. 新capability协商。原lease.value上有一次性fresh foreground/recipe观察，绑定owner/generation/SID/source/program epoch，返回不由CLI任意伪造的有限引用；零输入拒绝应在对外started前。无能力即unsupported。
2. 一个捕获同SID原NativeInputQueue槽的editor transaction提交入口（候选名submitEditorInput），接收完整有界正文、绑定/观察引用、原signal/绝对期限；返回queued与最终editor-submitted/none/unknown等准确阶段。它不是第二writer，不把观察取消当应用终态。
3. helper内现有非阻塞broker增加purpose-separated adapter角色、完整认证帧与对应有界回执；单SID一笔，旧binding不可重连重放，late结果与本地I/O都结算才归还permit。认证endpoint/token不从公共CLI locator复用。
4. 这些新的kind1 control-prefixed内部消息及strict计量/DTO统一扩展现`src/shared/native/control-wire.ts`、`control-wire.generated.ts`和C唯一schema/generator；B/extension只消费同源实际codec，不在input.ts/helper/extension里再写第二套JSON语法。Rust继续由C在原broker/session/队列接线。具体字段/额度须Root正式packet冻结；现公共operation canonical不因本报告私增。

生产代码仍STOP；上述是为Root切实际任务的精确接缝，不是一次额外实现。

完整实际命令、源SHA、锁、许可、正反例结果和漂移审计在同名JSON及隔离目录。无仓库/正式工件写入，无提交/发布。READ-ONLY SOURCE STOPPED。
