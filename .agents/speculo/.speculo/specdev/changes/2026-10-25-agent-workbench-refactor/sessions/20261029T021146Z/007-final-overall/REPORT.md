# G-06 最终整体独立双轴复核

Session: 20261029T021146Z
Task: 007-final-overall
Status: completed

## 聚焦交接

<a id="standards-output"></a>
Reviewer: codex:/root/review_native
Axis: standards
Result: request-changes
Input-SHA256: 69e01201a2aa5f8cf6d0435c41714811ccb45e6b9d8921a21c42e0fe6b4e8583
Observed: GP-045 / Map42；current 工作区 /home/wta/orca/workspaces/obsidian-huhu/terminal，NAMEWTA/terminal；base 33c21e098ef3188cbab5a09f3e0a01fadb787715，HEAD 78102da2811953e72fe317cd08cd91311d9cac0d；453 产品路径、20 来源在入口及交回前均匹配；已收到并完整读取008、009原始报告，独立核验其消费者与反例。

本报告对从最初基线至当前候选的整个 G-06 交付形成两轴结论，不局限于原生分区。原生 F1–F5 已关闭，但标准轴仍有四项未解决问题；规范轴另有两项明确缺口，合计六个独立根因（high 两项、medium 四项）。最终全量测试、构建与多数门禁通过，并未覆盖这些反例，不能据此关闭整体审查。completed 仅表示原始报告交回；修复及状态更新仍由 Lead 负责。

### 审查身份、支持与固定输入

实际 reviewer 为 codex:/root/review_native，gpt-6-astra / high，仍是未参与任何本范围实现、修复或整合的独立原生任务。实现者包括旧 Codex/Claude 及其实现子 Agent、用户提交、当前 codex:/root 和 repair_native/workbench/data；Lead 的37路径恢复、协议/schema/生成物、类型/夹具/harness与产物也算真实实现。本 reviewer 未递归派遣、未修改生产或正式 Evidence、未构建或操作 Git。

008工作台、009数据支持 reviewer 均未参与实现。通过原生消息确认其真实交回后，完整读取报告与关键原始日志/探针，再独立追踪源码和消费者；并非将两份自述机械相加。报告摘要：

- `../008-final-workbench/REPORT.md`：c9484ca4e5d93aa8248c5852ab551dadd0719a4c2e9156643ff337a16abd7223。
- `../009-final-data/REPORT.md`：0325477cca2076b6b5d2072c260014ffd28f6af229b68aaef6d8e3555200eda8。

review_mode 为 working-tree；严格使用 review-input.json 的原 tracked_diff_command，摘要为 `8dd162f65e04f087cc77defc7919758ed823a147eb169171f7a516b95aab1e3a`。与001输入相比91项产品内容变化；最终逐项核对453项 after 字节/删除状态和20来源，errors=[]，见 `/tmp/huhu-007-final-overall/final-input-check.json`。Input 摘要是 JSON.parse→JSON.stringify 后计算；Goal五节使用公共 readArtifactSectionSync 的 text 核验，均匹配，不用整个动态 Goal 文件替代分节摘要。没有复用旧123中断报告作为通过。

### G-S01 · high · 合法备份的只读预检污染全局 Object.prototype

定位：`src/modules/agent/core/backup/settings-codec.ts:129`–`:143`，尤其 `:133`、`:136`；真实消费者 `src/modules/agent/services/backup/plan.ts:255`–`:264`，公开入口 `src/modules/agent/services/backup/import.ts:91`。

portable codec 使用 Object.fromEntries 保留 JSON 自有的 `__proto__` Provider 键；merge 却用普通对象的 `rows[id]` 查已有项。当 id 为 `__proto__`，这里取到 Object.prototype，之后 AGENT_ENTRY 写入直接修改全局原型。正常字段的白名单校验没有隔离键控对象的原型。

本人独立反例使用合法摘要包，payload 为 `agent.agents.agents.__proto__ = {enabled:true, permissionMode:'manual', accountId:'review-polluted'}`，经 buildPackage → serializePackage → inspectPackage → 真实 World / preflightImport。尚未调用 runImport；预检无 error，storage mutations=0，却已使 Object.prototype 出现自有 enabled，任意普通空对象继承 accountId/permissionMode。安全断言真实失败，Vitest 1 failed，工具 exit126。原件 `/tmp/huhu-007-final-overall/prototype-public.test.ts`、`prototype-public.log`；独立子进程内执行，finally恢复原描述符，未污染用户宿主或生产数据。纯函数隔离探针另以 exit0确认相同根因，见 prototype-probe.log。

风险是一个被描述为只读的预检改变整个执行环境的属性查找结果，影响后续默认配置与其他模块；不声称已证明任意代码执行。依据：dev 数据/设置边界、输入校验、错误与副作用合同；规范轴依据见下文。满足条件：导入字典只读取自有项，危险键不得写入运行时原型；检查所有同类允许的 keyed map，保持正常 Provider 配置兼容。用真实公开包预检和导入验证 Object.prototype 前后不变、未发生隐含内存副作用。009的S11是对本反例的交叉核验，整体只计一次。

### G-S02 · high · 取消后的旧 writer 隔离被生产 RecoveryHost 重建绕过

定位：`src/shared/storage/recovery-transaction.ts:186`、`:236`；`src/app/recovery.ts:51`、`:95`、`:117`；生产生命周期 `src/app/main.ts:258`、`src/app/modules/registry.ts:214`、`:236`、`src/modules/automations/core/service.ts:933`–`:949`。

当前有界取消保留的是按 RecoveryStorage 对象身份索引的模块局部 WeakMap 租约。生产 factory 每次重新包装同一个 App/vault adapter；drain阶段取消尚无journal，新host的recoverBeforeStart因此也不会拒绝。旧自动化shutdown的JsonStore写仍可能未完成，新host在自动化关闭时把其runtime文件当离线owner恢复，直接替换不等待旧写队列。

本人完整回读009的无sleep barrier反例及日志，核对真实factory、AutomationService停用/shutdown、offline owner、runImport与module registry调用链：旧主写暂停→旧host恢复取消→同host重试正确RECOVERY_PENDING→同App新factory host→合法业务包导入done且retained-result存在→放行旧主写→主文件runs=[]。`/tmp/huhu-009-final-data/late-writer.test.ts` / `late-writer.log`，009执行exit0、1/1通过代表该缺陷成立。不是仅从WeakMap推测，也不是实际Obsidian热重载E2E。

插件同步onunload不等待异步清理；处于disposing的自动化不会被disposeNow再次等待，新启动创建新的host。其持久开关已关闭，新实例没有活的automation JsonStore来代替离线恢复排空旧写，因此反例有实际生产可达路径。`.backup`可能仍保留数据，不改变成功导入的主文件被旧写覆盖这一事实。

依据：dev单writer、恢复与生命周期隔离，已接纳写入必须收束/隔离；原003-P09在此保留并提升为high。满足条件：同一实际App/底层存储在实例重建及模块重载后仍共享可验证的旧尾部隔离或等价fence，旧写未收束时不得恢复新数据后再被覆盖；单纯缓存当前模块中的对象不证明跨模块重载。保留有界取消、迟到quiesce/prepared清理和提交后原有完成合同，旧尾部收束后允许正常恢复。无需扩建跨机器服务。

### G-S03 · medium · 补历史来源证据被误认成从未启动，可归档旧未知运行

对应008 WB-S03-R。定位：`src/modules/agent/services/workspace-service.ts:1507`、`:1516`；`src/modules/agent/services/spaces/space-service.ts:593`、`:1301`；上游 `src/modules/agent/services/launch/native-resume.ts:279`–`:300`。

修复把 `!lastAttempt && nativeImport` 当成never-started，生成notStarted/persisted=true。但实际NativeResumeService.importSource会匹配已有相同Provider/账号/native ID/transcript的记录，经adopt给旧Session补nativeImport。没有lastAttempt的legacy记录于是由未知运行变为可归档，期间没有取得终止证据。本人逐行核对matching→importSource→importHistorySession adopt→archiveManaged→commitArchive，确认nativeImport只证明来源关联，不证明没有运行过。

008真实三服务反例 `/tmp/huhu-008-final-workbench/router.test.ts`，`review008: importing provenance into a legacy unknown record does not prove not-started`，实际created=false后archive结果archived，期望incomplete。本人回读 `repro-final.log` 的行为断言失败；其fixture并未声称制造真实残留Provider。风险与依据：生命周期不能把unknown包装为已确认收束。满足条件：新建metadata-only import与给既有记录补来源的adopt必须保留不同的运行证据，后者继续保守；新建import仍可零spawn归档，补来源不得消除旧未知。

### G-S04 · medium · 同账号同 native ID 的不同来源在读取/缓存/导出中混挂正文

对应008 WB-S06。定位：`native/pty-server/src/agent_data.rs:695`、`:1671`；`src/modules/agent/platform/history/service.ts:484`、`:498`、`:542`；`src/modules/agent/services/history-store.ts:79`、`:153`。

native以Provider/account/native ID作索引key，另一locator/sourceRef可INSERT OR REPLACE覆盖。NativeHistory.read接收旧行却只发送key，不校验返回完整来源；HistoryStore把返回正文附到旧行，刷新缓存复用也只比较key/mtime/sourceStatus。复制历史保留mtime时，A正文可以继续显示在B来源行，或旧A行直接读出B正文；export也组合旧标题和新正文。

本人回读当前release helper反例 `history-source-switch.py/.log`，核对same key、不同A/B sourceRef、同mtime及read-old-A-key返回B正文；同时回读两个HistoryStore失败断言及相关源码。此前删A再加B得到missing的探索不算正文混挂证明；成立场景是A/B并存。两条均已获准进入本Vault，此项不是已关闭的跨账号库外越权摄入。

依据：精确身份与来源变动必须贯穿真实消费者；不能用key存在代替选中来源仍成立。满足条件：选中→read→preview/cache/export核验完整来源，错来源不发布ready；同key不同来源的索引冲突须保守可解释，不能静默改属标注。可保留现有opaque key兼容，不要求另建持久schema。覆盖A/B并存、同mtime、旧行读取/导出和缓存失效。

标准轴未关闭 low 项：无。G-S01/G-S02为high，G-S03/G-S04为medium；下文G-P05/G-P06是独立规范缺口。

## 产物与验证

<a id="specification-output"></a>
Reviewer: codex:/root/review_native
Axis: specification
Result: request-changes
Input-SHA256: 69e01201a2aa5f8cf6d0435c41714811ccb45e6b9d8921a21c42e0fe6b4e8583
Observed: 同一453路径候选、20项标准/规范来源及Goal五节合同均匹配；原生F1–F5已闭合；独立对照全部64AC、7NFR及DESIGN后，G-S01至G-S04对应保证和G-P05/G-P06仍未满足；真实宿主/Provider/五平台不宣称通过。

### 规范轴未解决项

| 项目 | severity | 对应权威合同与本轴判断 |
| --- | --- | --- |
| G-S01 | high | Spec §3.8、AC-051及implementation-contracts §6 inspect/preflight、白名单codec和无副作用边界：合法包预检不得修改全局原型。公开反例及满足条件见标准轴，规范判断独立成立。 |
| G-S02 / 003-P09 / 009-S10 | high | Spec §3.8、AC-050/051、NFR-001/002、合同§6要求旧writer排空/隔离及有效数据保全；导入done后旧shutdown覆盖新结果，不因限定same-storage对象而免责。 |
| G-S03 / WB-S03-R | medium | AC-028、AC-029、NFR-006及归档先收束合同：来源证据不能把未知旧运行变成notStarted。 |
| G-S04 / WB-S06 | medium | Spec §3.1必要locator、§3.7、AC-035/040：预览/导出必须保持精确来源，变化须可解释；被准入的其他正文也不能混挂为原选中来源。 |
| G-P05 / WB-P04 | medium | DESIGN §5、AC-061/NFR-005窄桌面窗口44px目标合同仍有未覆盖分支，详见下项。 |
| G-P06 | medium | AC-019/064、implementation-contracts §2和Goal人工交接要求：人工长正文清单仍反向描述已修复能力，详见下项。 |

### G-P05 · medium · 窄窗历史与确认 Portal 的实际命中区未达到44px

定位：`src/modules/agent/ui/AgentWorkspacePage.tsx:253`；`src/modules/agent/ui/history/SessionHistoryPanel.tsx:308`、`:326`及紧凑按钮；`src/modules/agent/styles/agent.css:26`；共享 `src/ui/styles/base.css:2`、`:22`、`:46`。

DESIGN明确窄屏包括fine-pointer桌面小窗口，不能仅以pointer:coarse兜底。当前44px容器规则仅覆盖toolbar/pane/group/tab，history Dialog与AlertDialog经portal脱离该容器；默认--nd-hit-size仍32px。008从Lead最终480px受控Chrome命令记录核实继续按钮rect高24且伪元素只扩到32，确认取消按钮高36且无44px扩展。本人查看实际narrow-history-dark/confirm截图，并回读生产base.css、agent.css、AlertDialog及harness断言，确认不是把视觉尺寸误当实际命中区。

现有Tab/Escape/取消零启动检查通过，但44px断言没有包含历史/确认内容。满足条件：在窄窗真实portal分支局部落实至少44px实际命中区，避免邻接重叠，补fine-pointer生产几何/hit-test并保留焦点、取消与主题行为；不要求重画页面。

### G-P06 · medium · 人工验收清单仍宣称 stdin 只属于 message send

定位：`docs/agent-workbench-acceptance.md:69`，M-12。

该行仍明确写“--stdin 只属于 message send”，并仅让用户对message做stdin长正文测试；与已修复的agent.prompt/terminal.send-text、本轮schema/help/中英文Skill、implementation-contracts.md:30–31直接冲突。Spec §11把真实宿主/五平台验收交给用户，这份清单是交付的一部分，不能用已正确的另一篇CLI文档代替。

满足条件：M-12同步三种正文命令的text/stdin/file三选一，加入prompt/send-text多行stdin/file及提交前取消/超时的人工核对；保留消息16KiB、prompt/send-text本地256KiB与完整请求32768字节帧容量的区别，不宣称256KiB正文必可跨当前帧发送。去掉否定实际能力的旧括注，核对与当前help/schema/Skill一致。该项是明确交付规范缺口，不是新增功能要求。

规范轴未关闭 low 项：无。

### 原始发现逐项复核闭包

| 原报告项 | 本候选处置及独立依据 |
| --- | --- |
| 001 F1 CLI接口/安装回退 | 关闭。binary恢复ensureVerifiedAsset等公开接口；runtime/lazy/NativeHost.cli、controller.cliEnvironment/checkCli及PATH/HUHU_CLI接线一致；原失败两个测试文件现通过，全局类型/build通过。 |
| 001 F2 Hook崩溃reader | 关闭。物理根内核lease+generations-v2隔离，进程死亡释放独占，旧nonce-only目录不再阻断新代；本人重跑正式活owner/真实SIGKILL→AutomationHooks.prepare→新env spawn/晚到publisher测试，且追到Sessions spawn前prepare链。 |
| 001 F3 文件无界读取 | 关闭。File.open后take(limit+1)，与stdin同一有限reader；本人当前release64MiB文件返回CAPACITY_EXCEEDED/2，最终探针RSS3312KiB，原反例68756KiB。 |
| 001 F4 stdin吞Ctrl-C | 关闭。有限worker、主线程可取消/超时、生产main process::exit收束阻塞线程；本人保持pipe打开实测超时6/WAIT_TIMEOUT与SIGINT130/WAIT_CANCELLED，effect none、messageId保留。 |
| 001 F5 prompt/send-text正文入口 | 关闭实现缺口。canonical cli.textInput元数据驱动parser/help，三来源互斥、local输入不进入wire；正式真实IPC四组合及边界测试通过，本人当前release确认两命令stdin已到寻址阶段。G-P06单列遗留人工文档，不重新计作实现未完成。 |
| 002 WB-S01 跨账号库外准入 | 关闭原场景。Controller→NativeHistory.resolveOwner→Rust owned_by_space/owned_digest含账号、设备、locator/sourceRef；回读当前helper双账号反例total=1、B read拒绝。G-S04是同账号另一来源的独立消费者风险。 |
| 002 WB-S02 Browser open吞错 | 关闭。shared module edit返回Promise并检查结构化error/partial/unknown，open/reuse等待，Browser catch清理新Page；008真实消费者回归通过。 |
| 002 WB-S03 纯导入不能归档 | 部分修复，保留G-S03。新建metadata-only正例可归档，但真实adopt旧未知记录负例失败。 |
| 002 WB-S04 history最终target | 关闭。router在未confirmed输入回执时对history刷新prepared.target；import/resume/open正式回归通过，已独立核对相关性保护仍保留。 |
| 002 WB-S05 取消变成功unavailable | 关闭。HistoryCommands read catch识别signal/AbortError/WAIT_CANCELLED，保留真正来源不可读语义；008回归通过。 |
| 002 WB-P01 时间/普通终端筛选 | 关闭。Controller从Space记录投影shell，Panel opt-in终端和day/week/month/all筛选；不进入native继续；008Store/Panel测试通过。 |
| 002 WB-P02 partial不可见 | 关闭。previewPartial由Store到Row，显示前段限制和“本次片段”；本人实看当前中文截图，CLI fit仍携容量信息。 |
| 002 WB-P03 模态焦点 | 关闭原交互回退。Dialog/AlertDialog、默认取消、Tab/Escape/返回触发器与取消零启动已验证；G-P05另列尺寸缺口。 |
| 002 WB-L01 工具栏不能关 | 关闭。去掉父级重复回写，真实Page组合第二次点击关闭/aria-pressed回归通过。 |
| 003 S01/P01 任意本机字段覆盖 | 关闭原场景。导入经过portable allowlist，保留机器配置并校验嵌套类型，合法摘要攻击包回归通过；G-S01为另一个已证实的危险键副作用。 |
| 003 S02/P02 inherit提升YOLO | 关闭。比较前后effective permission，包含own/global组合；本人读guard和units依据，009运行通过。 |
| 003 S03/P03 backup-only遗漏 | 关闭。export primary缺失时读取并校验backup，设备发现含.json.backup；真实Space owner往返通过；损坏现存primary仍拒绝。 |
| 003 S04/P04 改写来源device | 关闭。records只重绑定业务owner/vault/grant，不递归改nativeImport；跨来源device同ID往返测试通过。 |
| 003 S05/P05 定义操作未排空 | 关闭。save/remove/source完整异步操作计数，preflight/quiesce/drain均BUSY；四个barrier及稳定错误回归通过。 |
| 003 S06/P06 盲信progress | 关闭。目标device、计划精确路径、存在性及摘要核对；伪marker/删除/用户修改等failure回归通过。 |
| 003 S07/P07 新增集合漏双读 | 关闭原反例。实际list和缺失primary/backup也纳入两次观测，新增设备/section/definition及既有变化拒绝；不把双读声称为跨进程强锁。 |
| 003 S08/P08 settings mutation后拒绝 | 关闭。update/touch入口先检查held/disposed，drainPending保持hold；真实storage/listener barrier通过。 |
| 003 S09 无效备份夹具 | 关闭。生产automationDocuments.encode生成原件，decoder未放宽；完整往返/失败套件通过。 |
| 003 P09 无界冻结排空 | 有界等待/取消部分已修；以G-S02保留生命周期隔离，high。真实旧shutdown晚写覆盖新恢复不被同对象测试覆盖。 |

### 全范围覆盖与规范组合

使用公共code-review及source-discovery、Fowler、risk-review、reviewer-contracts/review-evidence，结合dev/ui和错误/可靠性规则。复用此前真实读取且摘要未变化的来源，回读本次变更与新增规范参考；未仅按最后一票/commit审查。来源发现仍有明确本地Spec/DESIGN/ADR/implementation-contracts/Map/Goal，无缺失规范轴；base..HEAD提交无额外Issue/PR规范引用，source.md不存在。20冻结来源包含AGENTS、dev/ui及其相关架构/测试/发行/i18n/许可/设计/无障碍参考；Goal仅固定§1–5稳定合同。实际模块边界、权限、恢复、数据保全和并发优先于风格启发式。

本 reviewer 从001完整原生范围继续独立复核本轮变更，重点重读控制协议/parser/client、schema生成器、CLI资产runtime/lazy/controller/环境、Hook租约/reader/真实消费、native历史来源、control Router和历史消费者、备份portable codec、恢复状态机及App/module生命周期、UI portal/CSS和发行文档/CI。008/009补齐Space/布局/Browser/历史、备份/迁移/自动化旧消费者的完整分区；本owner实际回读其原件与关键链，未声称本人逐行重读全部453文件。

| AC范围 | 组合核对与当前判断边界 |
| --- | --- |
| 001–004 | Space持久身份/目录授权/显式目标/同cwd隔离；Space公共服务与控制原生测试，008补充；不把fixture目录授权当真实OS选择器。 |
| 005–012 | 六Provider/Shell入口、后台/附加、前台证据、布局与同Vault/跨实例身份；host/terminal/control/Space消费者及真实helper测试。 |
| 013–022 | 输入队列/回执/状态水位/取消/权限unknown与人工入口；原生与协调测试、CLI/schema/Skill；G-P06保留文档缺口，真实审批未运行。 |
| 023–025 | 被动邮箱、读取/ack、容量/失效与持久失败；生产owner、router与inbox受控UI，保持不启动模型。 |
| 026–032 | close-view与stop分离、归档/旧事件、屏幕/IME/resize/快照水位；G-S03保留归档未知风险，OS输入法仍待用户。 |
| 033–040 | 来源准入/缺失/分页/preview/精确继续/占用与导入；008实际helper/消费者；G-S04保留来源混挂。 |
| 041–045 | 共享网页/NativeHost租约、existing只粘贴、原生完整答案、旧消费者与轻量移动入口；008/009及架构/lazy回归，未在移动宿主实机运行。 |
| 046–053 | 创建先存后启动、迁移/备份/恢复/物理绑定与writer；009全闭包，G-S01/G-S02仍违反预检安全和恢复保全。 |
| 054–060 | 有界outbox/慢视图、Rust回入、disable/spawn、共享owner、崩溃及重启不重放；原生检查与Hook进程恢复通过，真实多平台负载/宿主退出仍人工待验。 |
| 061 | DESIGN四页面/亮暗/窄窗/200%/减少动效/焦点；已看生产受控截图和输入脚本，G-P05是已批准尺寸合同缺口。 |
| 062–064 | 校验资产/兼容协议/五平台CI与人工清单、t()/来源许可/产物一致；当前Linux实测，其余平台只核对代码与配置；G-P06未闭合；AC-063实机仍待用户，未标passed。 |

NFR-001/002核对预算、取消、停止及恢复尾部（G-S02）；NFR-003核对摄入/凭据/白名单及预检边界（G-S01/G-S04）；NFR-004核对共享NativeHost、lazy模块、xterm与现有组件，Hook lease为内部资源独占而非业务服务；NFR-005核对双语/主题/动效/目标尺寸（G-P05）；NFR-006核对effect/phase/unknown/partial（G-S03/G-S04）；NFR-007核对来源声明、无新增依赖及五平台分工，不将研究/CI配置当实机证据。现有T-18矩阵的历史passed-code标签不能覆盖本报告反例。

### 本人实际验证与引用门禁

| 执行者、命令/证据 | 实际结果与限度 |
| --- | --- |
| 007：`pnpm exec vitest run src/shared/native/lazy-host-cli.test.ts src/modules/agent/platform/desktop/pty/binary-cli.test.ts src/modules/agent/platform/desktop/hooks/hook-recovery.test.ts src/modules/agent/platform/desktop/hooks/hook-spool.test.ts src/modules/agent/platform/desktop/hooks/automation-hooks.test.ts test/native/control-protocol.test.ts test/release/control-skill.test.ts --reporter=dot` | `/tmp/huhu-007-final-overall/native-regression.log`：7文件69 tests passed，无skip。首次工具调用仅转出output而未保留后台session终结码，故不编造shell exit；完整结束摘要已回读，Lead最终全量exit0另作证据。 |
| 007：`python /tmp/huhu-007-final-overall/cli-recheck.py` | 最终exit0，日志cli-recheck-final.log。开放stdin超时6、SIGINT130均effect none/messageId保留；64MiB文件容量拒绝2，RSS3312KiB；两类新stdin命令通过parser后正确连接拒绝4。首次探针漏显式instance得到TARGET_REQUIRED使探针断言失败，已改正探针；不是产品失败。 |
| 007：`pnpm exec vitest run --config /tmp/huhu-007-final-overall/prototype.config.mjs --reporter=dot` | 工具exit126，1条安全断言失败；prototype-public.log实证预检污染。无fixture/transform错误；仅/tmp和隔离worker。 |
| 007：Node固定输入/来源/HEAD/diff核验 | exit0，453/20全部匹配，91项相对001内容变化，最终errors=[]，final-input-check.json。 |
| 008：原报告与原件回读 | 正式定向25文件229 tests通过，exit0；新反例3失败/22skip，exit126；两个Python当前helper探针exit0。本人未重跑其命令，已读取源码/日志及生产链。 |
| 009：原报告与原件回读 | 正式定向9文件187测试及legacy-browser2测试通过，exit0；late-writer确定性反例1/1通过，exit0，表示缺陷成立。187为实际注册测试数，非声称187个唯一业务场景。 |
| Lead：evidence/final-checks/results.json及原日志 | 最终build exit0（含生产/测试类型）、bundle exit0、native-build/native/helper-smoke exit0；lint/CSS/architecture/i18n/promises/safety/build-text/workbench-entry/lifecycle/protocol/notices均exit0。早期失败原件保留，不把它们写成未发生。 |
| Lead：最终全量Vitest | results.json exit0，vitest.log 512文件passed/4skipped，4873 tests passed/42skipped。旧失败已修正，但该套件未覆盖本报告新反例。 |
| Lead：docs | exit126，原日志仅另一个huhu-bot-architecture change的6个旧锚点；非本产品缺陷，也不冒称文档全局绿色。G-P06独立来自本次手工合同核对。 |
| Lead：final-ui/results.json、v2 summary/commands/截图 | panels-final/inbox-final exit0；此前coordination exit0。生产组件+fixture ports的Chrome检查，不是真实Obsidian。本人实看narrow-history-dark.png和narrow-history-confirm.png；44px历史分支不在既有断言范围。 |

当前实测产物：main.js SHA256 `0dba736651169298f97d44d1c9d652335ecd0283b5ef021ebde725dfac1c4a8d`；styles.css `a2fa403761ee87f9f5ab879e060abc67f31f1592e358432dac7df868a50715b3`；release huhu `992b3f69e71424ebf74d26b76cff1998bd6df3c9a3a7677985cfa18edf543c65`；release huhu-pty `91457600300ff89e7e9847b3e6ede9f2ec9578f54897059c0efcd91b4e70537e`。本人未构建；使用Lead当前源码构建产物，并核对bundle包含新Hook/partial/recovery路径标记。Rust本地输入诊断不应出现在JS bundle，未以简单字符串搜索代替构建证明。包体四项预算调整有pinned构建器只读overlay归因，eager输入未新增；已回读记录，不把调高预算本身当作功能证明。

## 问题与下一步

保持本轮两轴request-changes，交由实现者仅修G-S01、G-S02、G-S03、G-S04、G-P05、G-P06后重冻。原生五项已闭合的证据可在相关字节与消费者未失效时保留；不要为收束新增无关改版、数据格式或服务。新回归应覆盖公开包预检/导入原型不变、真实shutdown/factory/离线导入晚写隔离、实际legacy adopt归档、同key来源变动的read/cache/export、fine-pointer历史portal命中区，以及用户清单与canonical CLI一致。

没有等待用户新增产品决定。真实Obsidian/Provider/人工权限、OS输入法、五平台E2E和真实负载依Spec §11保留未运行；本报告未把这些分工本身当缺陷，也未宣称全部64AC实机通过。源码/规范/产物保持冻结；正式Ticket/Evidence/Goal/Outcome由Lead在后续候选真实通过后更新。未提交、推送、发布、归档，未操作真实用户库或账号。
