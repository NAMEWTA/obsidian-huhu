# T07 工程接缝与分工合同

GP-022 / Map23 的 T07 准备输入。T06 已完成代码交付，独立 round2 两轴通过且最终当前交付校验 errors=[]；本票只有随后真实 DoR 和 Root 实际派遣才开启写入。用户完整18票 Agent Team、gpt-6.1-sol/xhigh 实现与独立 gpt-6-astra/high 审查授权持续有效；真实宿主/Provider/五平台 E2E 由用户验收。没有提交、推送、发布或归档授权。

## 设计选择与唯一owner

复用同一huhu-pty、NativeHost租约、Outbox与TS生产用例。与直接Win32/std Unix全自写比较，采用已核验interprocess2.4.6的非阻塞本机IPC/描述符设施，不引入Tokio/daemon/HTTP或新业务store；实际锁图、源许可、必要feature由C在安装前回读，不顺手升级既有依赖。与Rust类型生成整套跨语言SDK比较，采用有限纯JSON descriptor及确定生成器，只支持本协议所用构造。与公开host generation/PID或扩所有acquire转发比较，使用捕获PTY lease的bound acquireControl及B私有身份账本，减少暴露并避免首用自await。

精确写集见`evidence/T-07-write-allocation.json`：A22业务与消费者；B12宿主、raw framing接缝、测试/脚本/中文CLI说明及最小Node CI顺序；C27单源wire、Rust CLI/broker/平台IPC、依赖与生成器；Root4必要产物。所有路径唯一writer，不因目录相邻获得额外权利。C先落可编译真实wire，Root核读后B消费；B真实control端口核读后A集成。A在此之前只能在正式分配后做其独占scope/grant/rename及capture接缝，不自行猜另一份wire。已知签名只由所属owner写，变化先交Root。

## 不变的外部行为

每个新Shell/Agent/oneshot显式绑定有效Space；CLI缺绑定返回TARGET_REQUIRED，不弹框，不按cwd、GUI焦点或唯一候选推断。已明确Session稳定ID可解析原Space并跨同Vault查询/操作；显式Space冲突、跨Vault/物理root/device/instance不符或旧runtime在效果前拒绝。路由在调用开始冻结。T14/15负责旧消费者/配置，T07不新增无Space例外。

T07注册space list/get/create/rename/archive；session list/get/rename/archive；terminal start/get/read/stop；agent start/list/get/explain；离线version/schema/help及实际capabilities/doctor。T08–12未来命令可有描述，但未注册就CAPABILITY_UNAVAILABLE/effect:none；未知operation或非法参数INVALID_ARGUMENT。输入/审批/等待不偷接底层input；原生完整答案仍由原业务通道拥有。get/read/explain不attach、不markSeen、不刷新Provider目录。

## 单源协议与编码入口

canonical为src/shared/native/control-schema.json；外部major1与helper protocol3的localControl:1可选能力分开。C生成TS/Rust wire、operation/参数/错误→exit/limits/transport-class/env键及描述。CLI help/schema读取同一表；未知构造生成失败，--check只比字节。shared纯codec不依赖Agent/Node；大表在control显式首用加载。

采用既定envelope/phase/effect与退出码。已有业务ID允许非UUID文本，不截断、不擅自改旧记录规则（records允许4096 UTF16）；单次请求或metadata装不下时明确容量拒绝，mutation必须在效果前确认最坏回执/进度可表达。细分类CAPACITY_EXCEEDED归INVALID_ARGUMENT/exit2，BUSY归现状不允许/exit5；追加需同源说明，不能由中文文案决定分支。

运行时whole UTF8 JSON：request32768B、response49152B；深度32、节点8192，含target/params/error/range/转义。内部仅controlId/bridgeId采用有界ASCII随机ID（最多64字符），不复用外部requestId或SID；wrapper额外最多1024B，由生成测试算出并证明。5B帧头另计。认证帧上限2048B、注册scope整包上限32768B、注册ACK/关闭等固定控制包上限8192B；每次注册新随机token，不进env/业务/诊断。离线schema完整JSON单独上限1MiB并公开，此静态离线限制不放宽IPC48KiB。

B的FrameDecoder增加可选原始body parser hook；默认无hook行为保持。旧encodeControl/controlBytes固定depth16/nodes4096，新lane禁止经过它们；C在B取得新lane额度之后提供单源完整预检/计量/冻结后的raw body，B在frames.ts只做有界raw body→kind1 frame包装，不复制JSON语法。旧T05限额不变。生产PtyHelper在JSON.parse之前交C唯一parseHelperControlBody。C按原文discriminator识别新消息，重复/转义同名type或混合新旧type不得逃逸；新协议完整严格检查重复键、UTF8、深度、节点与形状。合法旧history/Cookie仍可用原4MiB外层上限和旧数据语义；不得把新32/48KiB施加全旧通道。kind1头部无JSON子类型，因此单个legacy-sized decoder temporary仍可能存在，必须如实计入，不能声称header阶段只分配32KiB。Rust在main获得raw control body后同样先走C入口，不先serde Value丢重复键。

## 同代注册与启动时序

B在原PTY lease闭包提供acquireControl(events?,signal?)，直接在捕获host/generation增加独立control owner；原owner失效、取消或代次不再current时拒绝并收束partial owner，不转调可起新代的普通host.acquire。显式工作台首次控制可普通acquire('control')。registration.current(capturedPtyLease)用B私有WeakMap核真实对象、同host/gen、两owner存活及helper current；不信结构类型/PID/version。全helper最多一份active/registering/closing control registration，closing尚未真实结算时新注册BUSY，避免无限旧代账本。

A prepareWorkbench只用于显式工作台入口；activation/settings-only prepare、CLI发现/version/schema/未连接doctor不启动模块/helper/下载。首个verified managed launch按原commit→同步reserve→onReserved(ref)→准备顺序；取得原PTY lease之后再通过TerminalHost.routeEnvironment(ref,capturedPtyLease)完成同代control注册。不得回调sessions.ensureHelper形成自await。Hook前注入路由，Hook与用户env后在实际spawn前重新覆盖受保护键，routeEnvironment返回env及捕获原registration/ref/lease的assertCurrent闭包；原beforeSpawn await完成后，先保留closing/remove/expected-runtime/stop门，再在同一同步段assertCurrent、覆盖受保护env键并调用捕获helper.spawnSession，中间不新增await。HUHU_SESSION_ID继续指runtime，新stable Session字段另命名并由canonical拥有。

A SpaceService提供get/assertControlScope，复用原instanceId、physicalRoot、device与Vault；不另建UUID，不为只读取得writer。mutation继续原单writer与目录授权门。createFromGrant只复用原有效grant，不把任意cwd当授权、不造GUI receipt。持久Session rename在原queue写成功后才投影当前代模型，pending晚创建不得覆盖；独立Pane/Tab customTitle保留。原create尾部session.rename(oldTitle)和entry.record/customTitle也须消费最新持久名称，避免pending晚完成覆写已成功rename。只读archived元数据不误用新运行准入门；只读scope不排到磁盘writer tail。

## 同步capture、进度、取消和关闭

B的forward只同步登记有界call并调用A capture，不await handler。A在原调用栈创建一次性captureManagedCreate，冻结路由、launch设置、presentationRevision/ForegroundIntent；之后才await scope，admit成功后execute。晚完成不重新获取显示许可，原意图失效则后台完成。execute同步标记一次性交接，此后内部业务独占原capture；未execute的dispose才释放。router finally、断线或观察取消不能撤已接纳启动，也不能撤已转交显示owner的token；原token不更新、T06门与1000ms规则保持。

保留进度端口，但它只传有界、可覆盖的最新已知target/phase/effect观察，不携正文、不替代admission/final，也不能把partial降none。onReserved恰在真实commit及reserve后、任何Provider/helper/env await前发布准确关联。它是非撤回观察：progress通道关闭或回调失败只收集有界诊断与late settlement，不能抛回启动链取消已接纳业务、重试或新capture。外部取消前若未handed可证明none；handed后只有原TS未admit的证据才能none，否则partial/unknown。CLI Ctrl-C/timeout/EOF仅撤观察，不stop、不回滚、不重发；实际业务和迟到error仍占原槽直至settle。

NativeControlCall/registration由B私有原handle校验。admit一次且在业务效果前同步占slot；progress最多一份在途和一份latest pending，只有未handed的观察可替换；final一次并独立收费。progress不得承载必须逐项送达的业务日志。metadata无法装进进度上限时在mutation前准确拒绝；正常查询可无progress。

close调用点同步撤TS admission并取消观察；native收到unregister才撤token/listener/locator，两者不能混为同时发生。有界等待未确认则typed unknown/error，不声称物理清理成功；closing保留未settle原permit，不无限建tombstone或新registration。control release不关闭shared helper/stdin/writer；Browser Cookie/history原owner继续。helper真正EOF/关闭代次才封存全代；旧回执不重连、不进入新注册。Controller原并行关闭与有界未知清理合同保持。

## 资源与公平性固定值

8 connections包括认证/关闭中；16 pending包括queued/admitted/观察者已走但业务未settle/慢socket。普通pending14，query/stop共享保留2；普通长调用connections最多6，另2留短控制。类别来自generated operation表，不信客户端priority。认证或半帧deadline2秒，实际单次调用默认30秒、显式timeout范围1..86400000ms；socket写与关闭观察有界。恶意同账号占满握手可暂时拒绝，不能许诺无条件stop时延。

既有Node control64KiB/reply128KiB/user4MiB和Rust ordinary256KiB/input/reply/history池不挪用。新增native forward帧池16×(32768+1024+5)=540752B；Node final帧池16×(49152+1024+5)=802896B。小stage whole JSON上限8192B，按每call admission一份+progress在途一份+latest一份保守预留16×3×(8192+1024+5)=442608B，final另计。native cancel/final-control reserve按16×(1024+5)=16464B单列；注册/注销固定有界槽，不能从满ordinary lane争关闭能力。

编码在clone/stringify/TextEncoder前取得对应permit；DTO/UTF16/UTF8/encoded frame/socket buffer/decoder/OS buffer分别有界说明，帧池总量不是RSS。Node frame只有callback且drain/returned全部结算才返额，write(false)只交一次。Rust/Node新增broker轮盘保留原有control/user/reply/SID/bulk份额及原raw→exit/reply settled因果，bridge内部FIFO/RR，不借SID空间。已handed物理write不可抢占。

## 页与真实验证入口

read先计算完整空正文envelope含最大cursor/range/error的H，再取raw maxBytes≤floor((49152-H)/6)，至少4；随后whole JSON复核。保留原ScreenRead16tokens/10sTTL、同snapshot和UTF16 offset；不截正文却沿旧nextCursor跳数据，不无cursor重试换snapshot。外层cursor绑定原scope/Space/Session/runtime，get/list/explain逐完整row计费；单row装不下明确capacity。非屏幕cursor绑定query/revision/位置，变化resync，不缓存无界Vault快照。

A control-native.test.ts拥有真实CLI→C broker→B host→A生产Workspace/SpaceService/Sessions→同helper spawn/read/stop主断言；B脚本只负责真实输入预检/进程测试启动和证据采集，不再建固定回答业务替身。C Rust tests负责协议/IPC/Outbox，不要求Rust CI装pnpm。Node CI将已有cargo check:native前移至test:all前，并通过HUHU_TEST_PTY_BINARY/HUHU_TEST_CONTROL_BINARY给测试明确两个built bin路径；required控制黑盒缺binary即失败，0skip，普通CLI帮助可离线。Root最终提供不可变副本与SHA，结束只清fixture自有资源。若本地默认pnpm test未先构建native，错误应明确指出必要命令，不能默默skip。全量cargo test的integration tests同时引用两个CARGO_BIN_EXE并验证真实行为，保证不是只生成测试harness；默认target/debug路径与Windows.exe按实际产物传入。无需仅为此新增package alias或放宽vitest匹配。

最低反例：共用raw正反样本两端及生成check；真实生产FrameDecoder注入（重复/转义键/UTF8/fragment/新oversize/旧大合法body）；同代lease伪造/旧代/异host；首次launch回入且gate住history/disk时query/stop先完成；16份最坏转义result+stage、callback/drain/slow socket账本峰值；取消各阶段及late result；注册close中重启/BUSY；Browser sibling仍可真实查询；后台B无Pane/不抢A、scope复制/旧runtime拒绝、read不seen、rename持久失败；Unix权限/身份替换不误删、Windows构造/编译可验证项。Linux代码/进程测试不冒称Windows/macOS/真实Provider/Obsidian E2E。

## 执行与证据

各owner先真实红灯再最小实现；只做定向自有检查，不能在他人活动写入时跑全局build/lint/guards或改产物。每阶段原输入/工具/配置实际argv/UTC/exit/原输出/后漂移可回读；复用不可变CAS与manifest引用，避免每命令重复展开全仓数组。C Cargo使用独占临时target目录，交二进制前Root核来源/冻结；不改node_modules。SOURCE STOPPED后Root统一集成、产物/notices/预算、真实required闭环和独立双轴审查。任一越界、接口冲突、许可缺口先停止该依赖分支，报告精确缺项；已有用户决定不重复询问。


## 实际派遣阶段

Root为唯一正式Evidence、状态、根产物与全局验收owner。A实际身份codex:/root/prepare_t03，B实际身份codex:/root/implement_t07_host，C实际身份codex:/root/implement_t01；写集表为唯一边界，不包含任何其他票的新路径。第一阶段C先交canonical/generator/codec真实可编译API并继续独立Rust；A仅做scope/grant/rename与一次性capture及自身测试，不猜C/B协议。Root实际核验C wire后才解锁B宿主集成；B真实端口再由Root核验后A接线。每次解锁以实际消息与冻结源回执为准，不把本段计划当成已经派遣。

A22首阶段活动源限core/control/context.ts、services/spaces/space-service.ts及space-service-control.test.ts、services/workspace-service.ts及workspace-service-control.test.ts、services/terminal/sessions.ts及sessions-control.test.ts（均在src/modules/agent下）；其他A路径仍等接口。C27按唯一owner实现，但不自发改B raw framing或A用例。B12未获Root实际解锁前只读。全局build/lint/architecture/Promise/notices及浏览器由Root在全部writer停止后执行，定向自有检查不得与其他writer的真实输入漂移混为稳定通过。


## GP023 / Map24 旧夹具补充

当前精确写集A23/B12/C27/Root4共66，初始GP022/Map23的65路径派遣事实不改。新增仅 `src/modules/agent/services/controller-managed-runtimes.test.ts`，由原A适配实际localControl注册/关闭语义；生产行为、原断言及其他owner不变。物理关闭终态与ACK传输顺序按T-07-close-ack-order-decision.md，保留独立固定permit和Host实际确认门。

## GP024 / Map25 第1次整合夹具修复

当前写集A24/B12/C27/Root4共67；新增仅 `src/modules/agent/services/controller-activity.test.ts` 给原A。Root真实66文件555tests为554pass/1fail；独立/tmp单变量实验确认缺control协议导致create在hooks/spawn前拒绝，finally掩盖原失败。只补fake注册/撤销/settled协议，不改生产、不删断言、不skip。许可生成缺项另由C只读核查，尚未授权新许可路径。整合attempts保留1。

## GP025 / Map26 许可输入补充

当前A24/B12/C30/Root4共70。原C仅新增3个许可输入路径：objc2-historical-MIT.txt、dispatch2-original-MIT.txt、sources.json（均在docs/third-party/licenses下）。完整许可正文逐字节保留上游固定历史commit，四个version键绑定全文SHA并以中文note链接当前精确发布LICENSE.md、说明历史来源。Root已直接回读官方固定原文；全73包与4份archive证据见T-07-license-readonly-root-audit.json。不改变Cargo/Rust/依赖、标记检查或任何业务；旧最终双bin证据仍有效。Root生成notices并构建；attempts保留1，第二候选尚未开始。
