# 任务回报

Session: 20261026T045732Z  
Task: 029-t09-pane-protocol-stage1  
Status: completed

## 聚焦交接

029 T09 B协议第一阶段已完成并SOURCE STOPPED。仅Task分配的10条产品路径变更，六条pane操作available始终false。未接ControlCommands/Router/paging剩余8路径，未写A布局/identity/Store、U界面/i18n、Host/helper/editor/codec/generator、SpaceService/records、根产物或正式状态。阶段1只交协议/字面CLI语法候选，不宣称T09、AC009/061或真实布局闭环通过。

当前交付：pane.list沿既有limit/cursor并声明Space目标；Pane ID为最多4096 UTF-8字节的opaque字符串；ratio范围0.15–0.85含端点；CLI Pane/Session必须显式，只有pane.list补Space hint；split插入Session/runtime与源Pane独立解释；机器帮助、固定fixtures和中文CLI说明一致。原T08非Pane的Session/runtime默认及输入/等待/读屏deadline/receipt/error/effect合同未改，原定向回归保留。

真实布局、revision分页、持久化effect与焦点consumed证明待A六操作真实export。A已通知其新domain context直接采用原ControlExecutionContext的performance.now绝对deadline；后续B应原样传递，不桥接Date.now、不重置排队期限。当前仍等待Root正式新阶段任务，不自行解锁剩余8路径或启用能力。

## 产物与验证

### 输入、范围与产物

R=`/tmp/huhu-t09-pane-protocol-20261026T160321Z-qey105gx`。已完整核TASK SHA `bfa00bc04c080587054c66bd1b37a4bcfbc42f3dfb4c3a50914d65d2c4dd6747`，沿同current workspace、原gpt-6.1-sol/xhigh。收尾时Root通知GP034/Map35追加Root独占vitest.config.ts，r2为57路径；029原56路径allocation及本10路径授权保持历史不变。post-parent-updates.json另存这项后续来源，不追补原测试输入或重跑。Root原T09 dispatch input SHA `aec8e02b821c7ea7869e0c153e213acc655fb60e1e9347cd78919577462acfc8`原件副本为R/input.json；基线含T01–08，全部HEAD差异未归给T09。

实际before/after原件、文件模式、逐文件diff在R/before.json、after.json、candidate.diff及CAS。以下10条完整前后SHA以现场stat为准；不是沿用旧T08文件模式表：

| 路径 | before SHA256 | after SHA256 | mode |
| --- | --- | --- | --- |
| `src/shared/native/control-schema.json` | `7583a7daba90fd889acecfb7cfc43c09d935811b94168da137e2859047d97671` | `f91efa05b4e5617d8674dfdb32b8c8ffc21df5b84d94a3c5fbf274d61389024e` | `0o600 → 0o600` |
| `src/shared/native/control-wire.generated.ts` | `77f39b0934238a05b09c641fa47023cd1d022aa44c24244ce372e9eff24cc8b2` | `d2ef2ab83a43c8e35f2625ba9545c66262d3370635370df108ec617bf9254f91` | `0o600 → 0o600` |
| `src/shared/native/control-wire.test.ts` | `90640e0f97e720e7039fab808ec4ab876820e8fa0ca049e98a38c81eed3dec6c` | `8fe1eadf34846a488b71164519d482d8d09ec5c517e48836de9c099036758e57` | `0o600 → 0o600` |
| `native/pty-server/src/control/wire_generated.rs` | `9e31826753ff7abe88e7461357bb07e4442d3e3f86401cef69bcb0cb2f3e659a` | `45d71c617c9c0f037ae9bc2218a7c87aaebd81333f2606aaaa3e7a6e8ca0337f` | `0o600 → 0o600` |
| `native/pty-server/src/control/cli.rs` | `676025a9d39e3f754f6b2a7543cea6d366cf97a83933f793e0dbf20a5713ae32` | `01cd9206980ac8b3be6fd5b865832bb08e2f8573bac6fecdf4e96c554c4d23e1` | `0o600 → 0o600` |
| `native/pty-server/tests/control.rs` | `6b3473652a37fb89ca70e992a121f3610ecb9a03ac5ce06a9f51f4ad11cc0fcb` | `d6b8d141099be1d798033f85bf18cc200da7e5d090ceed5e76e12c5295f7a98e` | `0o600 → 0o600` |
| `native/pty-server/tests/control_protocol.rs` | `0287d417ec0fb1d0c78459578389093bd0baa9be7f88e23be3d65509c0d75ab7` | `4653e8fbba516ffa6bd580dfb5d8274a6cff12670206bbe801077b9387deba00` | `0o600 → 0o600` |
| `test/fixtures/native/control-v1.json` | `2c7f2199cdbfd0cebb98bfe01654380cf043656f39c2dc6dfa4615f81704894b` | `0005ce7103c24a80a67e1992bd6e9642b574de1932d9953f3b656a91b0c3f8de` | `0o600 → 0o600` |
| `test/native/control-protocol.test.ts` | `d74373df5f1e84974f9dae80c9ffef13f82e95af4fdefd3450f4a247fd4c6230` | `989ec78827f7fec0bed7b23ca5b35667ad63cf4d3a617d6e72f23fe826a06992` | `0o600 → 0o600` |
| `docs/agent-workbench-cli.md` | `879baf962b2e4e1abc69af60f1e3e19b96c8f8434b793628a54658571f105d83` | `a869f298548ec61ea2d7b154aa568c35cbca636fb6caf29863a675d2bf954ebe` | `0o600 → 0o600` |

R/final-audit.json SHA `67afe9d2c6b443012e939fed1268bf633382b8643d47dfe7e4a137e5b0579f4f`：B写集之外、扣除已分配A/U之后的原产品漂移为空；现场观察A/U共22条变化逐项单列，未计入B候选。最终B真实消费闭包与A/U写集交集均空。这个结论绑定本次执行时点，不声称并行工作区全体未变或替A/U验收。

### 实现和合同精度

- canonical只扩pane.list params/target、收紧pane.resize范围、给target.paneId加maxUtf8Bytes=4096。生成器自身只读，事先实读确认仅写两个分配的generated文件；007/010/020通过原生成器生成，036 --check实际0。没有改动editor版本、额度、receipt格式或helper protocol。
- CLI沿原parse和canonical字段，Pane分支禁调用者Session/runtime回填；缺必须目标返回TARGET_REQUIRED、语法/目标组合/控制字符错误返回INVALID_ARGUMENT，仍在任何endpoint之前拒绝。其余T08命令保留原回填与校验。保留既有全局--help/--version路由优先规则；形似flag的字面ID用inline形式（如--pane=--help），不通过shell重新解析。
- pane.list仅缺Space且无明确Pane/Session时用原Space hint，显式Space B不被hint A覆盖。pane.attach显式Session；focus/resize/close显式源Pane；split显式源Pane+插入Session，可选runtime只约束插入目标。list不接无关runtime，attach不接无关pane，focus等不接无关session。语法fixture中的PWD相同证明cwd不参与CLI寻址，真实两个同cwd Space的业务布局证明留后续。
- 与A确认同一Pane ID合法边界：保持Unicode/大小写/空白opaque值，不trim、不UUID化；CLI拒C0 U+0000–001F与DEL U+007F。原wire还拒不成对UTF16 surrogate。4096B及4097B正反均有；lp1.前缀字符串在语法层保留，不把它冒称已经解析到真实持久叶，A的3069/3070可逆兼容编码与唯一性另验。
- Root明确本阶段不扩两codec和generator。通用wire只保证DTO形状/字节上界，escaped控制字符仍可被解码为“不可信身份DTO”；CLI和后续A/Router业务门才决定有效目标。fixture故意保留此层次，未用ascii-id拒绝合法旧opaque。阶段2必须测直达Router非法ID，不能只靠CLI。
- split fixture的request.target.paneId来自源B，sessionId/runtimeId来自插入C；response顶层target为源B完整tuple，data.insertedPane单列C。127条原始wire fixture保留旧风险并新增Pane正反；32条CLI fixture由真实Rust cli::parse消费。split response明确为示例合同，不是fake handler执行/保存/布局回读，也没有复制A DTO或新建分页store。
- help从canonical Pane required-target生成语法，显示--pane、0.15..0.85及六操作unavailable；最近父split子树份额、second换1-ratio、close仅detach、attach不spawn的文档是后续handler合同，不声称本阶段已经执行这些效果。

### 实际红绿与回归

R/commands逐条保存argv/cwd/UTC/exit/raw、根PID/PGID、工具摘要与显式环境。没有用新同名记录覆盖失败。定向-t筛选的未运行项只记filtered/skipped，以下最终完整套件无skip：

| 记录 | 实际结果 |
| --- | --- |
| 005→008 | pane.list契约红：原target=[]；canonical分页/Space合同生成后定向绿。 |
| 009→011 | ratio红：原0.01–0.99接受了不可渲染值；改0.15–0.85生成后绿。 |
| 016→017 | 真实Rust parser红：缺--session的attach继承session-A；仅Pane目标默认规则修后绿。 |
| 018→021 | wire UTF8红：4097B Unicode Pane值仍被接受；增加canonical字节界后绿。 |
| 019→022 | CLI shape红：focus携无关session被接受；Pane组合/C0/DEL拒绝及literal ID正例绿。 |
| 023→024 | 实际huhu二进制离线help红：缺--pane；schema/help范围与false能力标识绿。 |
| 029 | 首完整TS两文件144/144绿；原默认module-strings会加载字典，捕获源保留。临时capture配置扩展名产生future-native-loader警告，未隐藏。 |
| 030→035 | 原R1压力fixture红：--pane用了2000个中=6000B，新canonical先拒INVALID_ARGUMENT，未到原发现列表溢出分支。只将Pane改为合法4096B，保留其余四个6000B target、三个长candidate及原整response/CAPACITY_EXCEEDED断言。修后真实whole response **28427B**，code=CAPACITY_EXCEEDED。原失败不冒充业务回归红。 |
| 031→033 | 自有/tmp targeted tsconfig没有找到既有@types/node，真实TS2307/2580失败；只补本次typeRoots/types，未装依赖或改产品类型。修后targeted types actual0，保存177个实际listFiles输入。 |
| 038 | 最终pure协议两文件 **144/144通过**。沿原isolate-home，去掉对本纯codec测试无用的module-strings，保留Root原配置其余项目/插件；只读transform观察器保存6个实际源，不更改被测代码。未消费A/U实现。 |
| 039 | 最终Rust control **23/23**、control_protocol **4/4**，合计27顶层，0 ignored/filtered。保留原T08 receipt、timeout、closing、真实SIGINT、请求取消、响应整envelope、locator/权限/退出回归。不是完整native全测试或六Pane业务handler闭环。 |
| 034、036、040、041 | 生成TS定向ESLint零警告、原生成器check、5条手写TS/JSON/docs格式及3条Rust格式均actual0。项目ESLint正式忽略测试文件，因此没有虚报测试ESLint覆盖；测试用targeted类型/格式与实际执行验收。 |

012为rustup which误带两个参数的工具发现失败，后013/014分开取得实际路径，不算目标红灯。最初bootstrap/source读取及目录建立在宿主工具记录，尚未有独立runner UTC收据；不追补成历史raw。所有原失败保留。未跑根build、全仓lint/architecture/Promise、真实Obsidian、Provider、Pi/模型或五平台E2E，没有提交/推送/发布。

### 实际消费输入、生成器与工具

R/consumed-inputs.json SHA `3d77013d2cbd09849f53b437d14f823ec8f70f86a091726d5b0a086af97a76c4`保存：最终Vite实际6源、targeted tsc 177文件、Cargo dep-info的566源、原始dep-info、实际fingerprint/profile、49个编译依赖crate archive（核Cargo.lock SHA）、SQLite C/H输入、生成器静态import/config闭包及工具配置。所有源/依赖字节有模式/SHA/CAS；不是只冻10个写入文件，也不是把声明superset当实际A API消费。76项阶段快照保留作保守导航，其中缺.prettierrc.json/build.rs是不存在候选，实际.prettierrc和原无build.rs已明确。声明superset里的并行词典不当稳定测试输入；最终纯协议关闭这项无关消费。

生成器的真实Node-free codec依赖control-wire/input/generated与canonical，esbuild write:false，再写两生成文件；没有手工改generated。已有prettier/esbuild/typescript/vitest/eslint的入口与包版本、绝对Node/Cargo/rustc/rustfmt/cc身份和锁均在producer记录。此为源/锁定依赖/工具身份证据，不声称冻结OS内核、全部动态系统库或原生进程的全系统调用轨迹。

共享generated里的embedded codec字节可能随canonical变化而变，严格Pi安装内容匹配合同没有放宽；后续Root正式build/安装扩展及完整T08回归应消费同次新生成字节，不能拿旧安装原件冒称新候选通过。本阶段未动Pi扩展实现、安装配置或旧017 pair。

### 资源、profile与清理

初始磁盘仅约3.0GiB可用。只用新R/cargo-target，offline/locked，CARGO_PROFILE_DEV_DEBUG=0、CARGO_PROFILE_TEST_DEBUG=0、CARGO_BUILD_JOBS=2、绝对RUSTC；CARGO_HOME为本次新目录，registry的cache/src/index仅链接既有离线依赖读取，锁与global-cache在自己目录。未写旧target、依赖锁或node_modules源。

TMPDIR/XDG先为新R下私有目录，完整native fixture阶段用原子独占0700的`/tmp/huhu-t09-pane-protocol-K`；原h7-16hex fixture子目录49B，符合原native XDG检查，避免共享fallback。自身命令根PID/PGID有记录，现有测试通过Child wait/reader join/endpoint关闭收束；042事后本次PGID/自有exe扫描active=[]、自有short namespace无socket。未逐个记录所有短生命周期CLI子PID，不把根PID记录说成完整进程追踪。

042在保留源码、dep-info/fingerprint、工具和日志后清理自有target **318711974B**及short根，包括测试HOME、Jiti/Node编译缓存；真实账号/HOME未读取。未把强杀当正常清理成功。保留两份0555同次debug=0语法调试工件供Root回读，**不是最终发行pair、Pane可用性或正式平台验收**：

- R/stage1-bins/huhu：SHA `c3c334b92886bac37f3f584be8da848cf392e770c90e93f8c6b964d7350dff4d`，1982984B。
- R/stage1-bins/huhu-pty：SHA `1d40e3a4b51c57b7249d0554f89bf7e368a4f6036c80e0c9d1431a1bd1cd5509`，7905056B。

R/stage1-producer.json SHA `7054efd8979a05a931d8fc26504eb7e10e4f34a6050923eb4f9047a365e9add9`绑定这些工件、实际profile与消费输入；Target删除前已经复制，旧017 immutable pair保持原路径只读。最终全native/Linux/WindowsGNU、新正式pair及NativeHost→Workspace/store→GUI/CLI一致性留后续源稳定阶段，不用当前工件替代。

### Skill与设计/许可

按bootstrap→Map最低矩阵→实际dev/ui→当前T09 Ticket/Goal与工程Packet/allocation执行；复用未变规则，实读I入口/implementation-procedure/preflight、codebase-design、TDD、错误与test-reliability。模块设计选择沿原canonical/generator/cli/codec接缝：JSON是字段唯一源，Rust只负责字面解析和hint，业务source/插入身份留原A owner，没有新增布局存储/跨模块API/daemon。真实red→最小实现→green记录如上；tests不删除、失败不吞、无扩大写集。

Design Conformance：沿DESIGN revision1、digest `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`、PAGE001/003与AC009/061；阶段1没有生产UI/样式/焦点渲染变化，视觉/尺寸/200%/减少动效/真实Chrome由U及Root在完整消费者闭合后验收，本报告不以离线fixture或原型截图充数。

许可沿012准备及Root联合接收的固定官方机制参考：Herdr运行/显示分离（Apache-2.0）、tmux稳定目标/显式命令机制（ISC）、现有Rust/portable-pty 0.9与项目自有控制协议。实际只沿本仓库原生成器/codec/CLI，未复制GPL/未知代码、执行外部项目、操作Herdr工具或新增依赖；不为已核窄协议重新泛搜/移植终端。

## 问题与下一步

Root可回读10路径CAS/diff与真实命令接收本阶段；T09最终验收/独立双轴仍由Root编排。本报告只完成029子任务。待A实际六操作/布局端口/export冻结，新的B阶段再接剩余8路径与U文案；直接Router非法ID、真实默认/跨Space、稳定分页整envelope、同owner dirty与持久化effect、第三C/runtime捕获、实际焦点consumed、close后PID仍活均未在本阶段声称通过。

阶段1源码已停写；后续只写本REPORT和自有证据，报告后实际return结构校验/最终hash复核及delivery另留原件。SOURCE STOPPED。未经Root正式新TASK不启用六能力，不写8个adapter路径，不开启后继票。
