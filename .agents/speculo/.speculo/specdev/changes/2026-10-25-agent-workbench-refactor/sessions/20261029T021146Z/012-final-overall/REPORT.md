# G-06 候选三最终整体独立双轴复核

Session: 20261029T021146Z
Task: 012-final-overall
Status: completed

## 聚焦交接

本冻结候选的整体标准轴、规范轴均为 pass；007留下的六个独立问题已逐项关闭，原001–003发现没有在影响闭包中重新出现。结论覆盖从最初基线至当前工作副本的整个G-06交付，结合本人原生/CLI与跨域复核及013工作台、014数据的独立支持审查，不仅针对最后修复文件。当前全量Vitest、构建、原生、helper及适用静态门禁已实际结束；受控Chrome的历史portal44px缺口已验证关闭，文档总检查的11条问题按下文如实保留。completed只表示本原始报告交回，真实Obsidian/Provider/五平台等依Spec §11留给用户，正式Gate/Ticket/Evidence/Goal由Lead按这些边界更新。

### 独立身份、范围与来源

审查者为 codex:/root/review_native，实际 gpt-6-astra / high，仍是原独立整体两轴owner。未参加任何本范围实现、修复、整合或冲突解决；真实实现者包括旧Codex/Claude及其实现子Agent、用户、当前codex:/root和repair_native/workbench/data。未递归派遣，未改生产、正式Evidence、Git/index或根产物；只写本REPORT及 `/tmp/huhu-012-final-overall/`，未执行插件build、共享Cargo或全量测试。

current为 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，分支NAMEWTA/terminal；review_mode为working-tree，base `33c21e098ef3188cbab5a09f3e0a01fadb787715`，observed HEAD `78102da2811953e72fe317cd08cd91311d9cac0d`。完整输入唯一来自本目录review-input.json；规范化JSON.parse→JSON.stringify SHA256为 `ad85880384c79e07d781e6b18ac4fa97a9585bce88009432d825b4f295c476e7`。按原tracked_diff_command验证，diff SHA256为 `13ce9c0ce7fb266f7e6ddb60358d39f90144895dce0f6295ce939990e2ebca17`。456路径包含455当前文件、1删除项；文件字节、模式、存在性、20来源、base/HEAD及diff均匹配，入口和末次检查errors=[]。与007相比36路径变化，未以相同HEAD推定内容未变。验证原件为 `/tmp/huhu-012-final-overall/verify.mjs`、`input-check.json`、`verify-final.log`；最初脚本未处理after=null而退出1，修正本地验证器后exit0，不计产品失败或漂移。

继续实际使用common code-review及source-discovery、result-reuse、Fowler、risk-review、reviewer-contracts/review-evidence与项目dev/ui、错误和测试可靠性规则。来源发现保持本地Spec/DESIGN/ADR/implementation-contracts、Map43与Goal五段稳定合同；AGENTS/dev/ui及相关架构、测试、构建、设置/i18n、许可、设计与无障碍参考均在20来源中。Goal按公共readArtifactSectionSync(path,anchor).text核验明确锚点，不把动态状态/进度当合同，也不从原始历史输入另造要求。未复用中断123报告作为通过。

007原始request-changes及001–003历史保持原样；本轮是对变更影响闭包的新两轴判断，复用未变路径的有效阅读和实验证据，不把旧结论改写成pass。010/011是实现者导航报告，不能代替独立审查。013/014交回后，已完整读取其正式原件、关键反例/日志，独立沿实际消费者交叉核验：

- 013-final-workbench/REPORT.md：SHA256 `5db8959308d17dff9f9ee67b92aa923ccb7a793faed09459b9376a8f6db1e8e9`。
- 014-final-data/REPORT.md：SHA256 `b1ff50dd69f432a1fd34aef30991b7236b8662a54d84482909431e10b440c5f3`。

支持者均为原独立Astra/high，未参与实现。整体owner重新核对了source identity→native read→Store/CLI/export、adopt→首次启动→归档、公开备份预检→codec、实际adapter→共享queue→recovery factory/startup/settled/run以及UI容器→portal/CSS等跨域接缝，未将两个支持报告自述机械相加，亦未声称本人逐行重读全部456文件。

## 产物与验证

<a id="standards-output"></a>
Reviewer: codex:/root/review_native
Axis: standards
Result: pass
Input-SHA256: ad85880384c79e07d781e6b18ac4fa97a9585bce88009432d825b4f295c476e7
Observed: GP-046 / Map43，同一456路径/20来源冻结候选前后无漂移；已完整读取013/014原始报告及关键回执并独立核验消费者。原G-S01至G-S04均关闭，原生F1–F5保持关闭；本范围无未关闭high、medium或另列low发现。

### 007四项标准问题的关闭依据

| 原项与原severity | 本人核对的生产行为、反例与结论 |
| --- | --- |
| G-S01 / 009-S11，high，公开预检原型污染 | `src/modules/agent/core/backup/settings-codec.ts:21`用自有项复制到null-prototype记录；顶层/group/provider/quick-command及merge base/current/rows/existing均不再取得继承的可写别名，`:135`、`:138`动态行与Object.hasOwn配合。本人将007合法摘要包公开预检反例原样复制到本任务/tmp重新执行，buildPackage→serialize→inspectPackage→真实World/preflightImport的原安全断言现通过，exit0、1/1。正式roundtrip额外覆盖实际runImport、reserved keys、正常账号/本机字段及前后原型描述符；014独立执行通过。不是只屏蔽一个键或降低格式校验。关闭。 |
| G-S02 / 009-S10 / 003-P09，high，旧shutdown跨重载覆盖恢复 | `src/shared/storage/write-queue.ts:50`的既有queue挂在真实adapter，`:66`以Symbol.for存plain recovery carrier；`src/host/private-storage.ts:29`已有转发，`src/app/recovery.ts:120`让新recovery wrapper也取得该queue。`recovery-transaction.ts:159`、`:198`、`:251`让startup/loading/run共享隔离；取消及时返回，租约仍覆盖实际operation、late drain/quiesce和cleanup，正常成功等待release收束。本人回读真实factory、private storage、transaction与正式公开生命周期测试，014独立运行旧AutomationService shutdown暂停→取消→新factory/vi.resetModules→offline runImport等四入口，均在旧尾部未完时拒绝；不同adapter不受阻；释放旧写后新host可导入retained-result且不再丢失。同模块对象缓存不足的问题已真正修正。关闭；不可恢复分支边界见后。 |
| G-S03 / WB-S03-R，medium，补来源误当从未启动 | `services/spaces/records.ts:25`、`:46`单独的neverStarted证明只用于无lastAttempt记录；`space-service.ts:593`adopt只补来源，`:621`真正新建import才加证明，`:789`首次启动接纳与lastAttempt同次持久写入清除证明。Workspace恢复/归档与Space提交使用同一判断，codec拒绝证明与已有attempt矛盾。本人读完整adopt→prepare→archive路径；013重新执行008真实三服务反例，created=false的旧未知记录现incomplete，reload保持unconfirmed，prepare拒绝；fresh metadata-only导入零spawn归档仍通过。关闭。 |
| G-S04 / WB-S06，medium，同key不同来源混挂 | `platform/history/source-identity.ts:11`比较key/provider/account/native ID/transcript/sourceRef；NativeHistory.read先冻结选择、发送当前device的expectedSource，再核对返回DTO，export沿同一选择。`native/pty-server/src/agent_data.rs:438`正文前核验expectedSource；`:710`保留已索引原summary/locator，冲突清正文并最终标identity-collision，避免扫描顺序移交标注。`HistoryStore:80/:160`和`control/history.ts:296`拒绝错来源缓存/正文。本人读完整实现和013当前release helper原件：A/B同账号同ID不同locator同mtime并存后保留A、changed且无正文；错误expectedSource拒绝，移除B后恢复A正文。旧两条Store反例、选择await变动、export零写入及CLI不可读回执通过。保留旧opaque key的兼容策略满足要求，不需新增持久迁移。关闭。 |

### 原始001–003发现逐项保持闭合

以下是历史问题的当前处置，不更改原始报告。第二轮已关闭且生产字节/消费者未变者保留其有效实证；变化处由本轮定向/全量和013/014影响闭包覆盖。

| 原报告项 | 当前依据与结论 |
| --- | --- |
| 001 F1 CLI接口/安装回退 | 关闭。binary资产接口、runtime/lazy/NativeHost.cli、controller.checkCli与CLI环境/PATH接线保持；候选三全局生产/测试类型、build、helper/CLI smoke均通过。007已独立核对原失败消费者，相关源码未再变。 |
| 001 F2 Hook崩溃reader | 关闭。物理根内核独占lease与generations-v2代码未变，007真实SIGKILL→AutomationHooks.prepare→新spawn/晚publisher证据有效；本轮全量覆盖相关测试。未把同进程已有manager的readerBusy当持久堵死。 |
| 001 F3 文件无界读 | 关闭。有限File.open/take(limit+1)及正文worker未变；本人本轮当前release对64MiB文件实测exit2/CAPACITY_EXCEEDED，maxrss3392KiB，原68756KiB反例不再出现。 |
| 001 F4 stdin吞Ctrl-C | 关闭。本人保持pipe不EOF实测短截止exit6/WAIT_TIMEOUT、独立SIGINT exit130/WAIT_CANCELLED，effect none/messageId保持；有界主线程不被阻塞reader拖住。 |
| 001 F5 prompt/send-text缺stdin/file | 关闭。canonical textInput/schema/parser/help/双语Skill未回退；真实IPC四组合原回归与候选三native测试通过。本人两命令stdin解析已进入寻址阶段并正确返回CONNECTION_UNAVAILABLE，未把该拒绝声称成功输入。人工M12遗留另见G-P06关闭。 |
| 002 WB-S01 跨账号库外摄入 | 关闭。账号/设备/sourceRef/locator准入与owned摘要保持；013本轮ownership/native-history通过，008双账号拒绝证据有效；同账号碰撞另经G-S04验证。 |
| 002 WB-S02 Browser open吞错 | 关闭。布局edit Promise及error/partial/unknown传播和新Page失败清理保持；013实际Browser/shared-browser消费者回归通过。 |
| 002 WB-S03 纯导入不能归档 | 关闭。fresh专属证明支持零spawn归档，原修复引出的adopt未知绕过也已按G-S03关闭。 |
| 002 WB-S04 history最终target | 关闭。未confirmed的history回执重新取prepared.target，confirmed输入不覆写；013真实router import/resume/open回归通过。 |
| 002 WB-S05 正文取消变unavailable | 关闭。signal/AbortError/WAIT_CANCELLED保留，新增来源比较不吞取消；013控制历史与native取消测试通过。 |
| 002 WB-P01 时间/普通终端筛选 | 关闭。day/week/month/all和opt-in terminalRows保留；Panel默认/Space/时间筛选与Shell无原生继续回归通过。 |
| 002 WB-P02 partial不可见 | 关闭。Store previewPartial到Row片段说明及CLI容量信息保持，候选三Chrome截图显示“前段/本次片段”，不冒称最后完整答案。 |
| 002 WB-P03 模态焦点 | 关闭。Dialog/AlertDialog默认取消、Tab/Escape、回触发器、取消零启动在DOM和当前Chrome保持；新增44px问题亦关闭。 |
| 002 WB-L01 工具栏不能关 | 关闭。父组件重复open回写已去除，013真实Page/Toolbar切换回归通过。 |
| 003 S01/P01 任意本机字段覆盖 | 关闭。portable白名单及正常字段保留继续通过；新ownRecord收紧自有键读取，G-S01危险键副作用也关闭。 |
| 003 S02/P02 inherit提升YOLO | 关闭。effective own/global前后权限比较保持，manual→inherit不能借目标global yolo升权；014units及往返通过。 |
| 003 S03/P03 backup-only遗漏 | 关闭。缺primary读取有效backup和backup-only设备枚举保持，损坏现存primary拒绝；014真实owner/离线设置回归通过。 |
| 003 S04/P04 来源device被改写 | 关闭。rebase只改业务owner/Vault/grant，不递归改nativeImport；本轮neverStarted可选codec不删/改来源tuple，014记录及跨来源回归通过。 |
| 003 S05/P05 定义操作未排空 | 关闭。完整save/remove/source异步生命周期计数，preflight/quiesce/drain BUSY检查不变；四定义barrier回归通过。 |
| 003 S06/P06 盲信progress | 关闭。目标device、精确路径、存在性/摘要及最终报告核对保持，伪marker/删除/后改数据回归通过。 |
| 003 S07/P07 新集合漏双读 | 关闭。实际list、缺失primary/fallback也记录并复读，新增设备/section/definition与已存在源漂移拒绝；不称双读为跨进程强锁。 |
| 003 S08/P08 settings先mutation后拒绝 | 关闭。held/disposed在recipe/内存/notify前拒绝，drainPending保持hold，storage/listener barrier通过。 |
| 003 S09 无效备份夹具 | 关闭。正式fixture使用生产automationDocuments.encode，decoder未放宽；014往返/failure/legacy-browser通过。 |
| 003 P09 排空无界/迟到写 | 关闭。默认30秒/最大120秒和取消合同保留，真实未收束尾部跨wrapper/模块reload隔离与收束后可继续已按G-S02验证。 |

### 恢复保留租约的实际边界

本人独立追读014的 `/tmp/huhu-014-final-data/retained.test.ts`、probes.log及生产closeFailed/retainLease分支。done journal一次写失败后，run准确返回UNRECOVERABLE，owner不release，journal停在committed；共享lease虽已resolved仍保留，同adapter仅重载插件会得到RECOVERY_PENDING。不能笼统说“所有tail完成都会自动解封”，也不能把错误文字earlier-operation-unsettled当作仍有IO的证明。

同实验把完整磁盘字节复制到没有旧carrier/owner回调的新adapter，模拟完整进程重启边界，recoverBeforeStart实际rolled-forward，数据new、journal done、settled成功。Spec §3.8/合同§6要求无法确定时保持门禁，docs/data.md明确进程终止后的启动恢复和“重启Obsidian”；未保证不可恢复错误只重开插件即解封。此保守隔离满足当前合同，不列新medium；普通取消且cleanup成功则已证明尾部结束后无需完整进程重启可继续。该实验是生产公开接缝模拟，真实Obsidian重启仍未运行。

### 实际验证、执行者与回执

| 执行者/命令或原件 | 真实结果与限制 |
| --- | --- |
| 本人：`node /tmp/huhu-012-final-overall/verify.mjs` | 修正after=null处理后exit0；最终456路径/模式/删除、20来源、base/HEAD/diff匹配。冻结Goal五段用公共API。 |
| 本人：`pnpm exec vitest run --config /tmp/huhu-012-final-overall/prototype.config.mjs` | exit0，1文件1测试通过，prototype-public.log；原007公开预检反例原样重跑，缓存/配置/fixture仅/tmp，未碰真实库。 |
| 本人：`python /tmp/huhu-012-final-overall/cli-recheck.py` | exit0，cli-recheck.log；开放stdin超时6、SIGINT130、64MiB文件容量拒绝2/RSS3392KiB、prompt/send-text新stdin形式到达连接寻址。测试故意使用不存在的instance，未向真实会话发输入。 |
| 013独立支持 | targeted.log：24文件243 tests exit0；old-repros.log：两文件3条旧反例passed、22未选择skip，exit0；当前helper stdio碰撞/expectedSource/恢复Python回路exit0。本人已回读脚本关键链与原日志，未冒称本人执行这些命令。 |
| 014独立支持 | focused.log：12文件200 tests exit0；closure.log：2文件10 tests exit0；probes.log：公开prototype和retained故障实验2文件2tests exit0。测试数含原helper导入的重复注册，不等于相同数量独立业务场景。 |
| Lead：final-checks/results.json候选3与原日志 | build-css/build/native-build/native/helper-smoke/lint/CSS/architecture/i18n/promises/safety/build-text/workbench-entry/workbench-lifecycle/protocol/notices均exit0。build实际含生产和测试tsc；helper日志确认control CLI 0.0.1/protocol1及Linux helper 0.0.1。本人未重跑全量或构建。 |
| Lead：`pnpm test`，vitest-candidate3.log | 已实际结束exit0，513 files passed/4 skipped（517），4889 tests passed/42 skipped（4931），runner286.04s。未把运行中结果先报green，skip不算通过；前两轮失败日志保留。 |
| Lead：bundle | candidate3首次exit126；同builder逐input归因后最终candidate3-final exit0。output 6898153→6901204 bytes，eager126169→126339 bytes且无新增eager input，主要是history source/portal/record/recovery；只有Agent activation增长，其他module activation不变。styles增加481bytes。已读归因对象delta和最终检查，最小预算调整不当作功能证明。 |
| Lead：docs-candidate3.log | exit126，实际11条：另一huhu-bot-architecture历史输入6个旧锚点，另010原始REPORT反引号内5个CSS selector被识别为reference link。它们均不属冻结产品修改范围；报告原件不编辑，checker不在本轮扩修。013正文“只六条”在此明确补正，Lead已收到。不得声称全局docs绿色。 |
| Lead：final-ui/results.json的candidate3-fine及原件 | harness exit0；fine pointer实际media断言成立，四种历史portal的布局/可见五点命中/邻接不重叠及键盘路径通过。本人回读summary、hit-targets四JSON、相关生产harness并实际查看narrow-history-dark截图；详细范围见规范轴。 |

Root产物SHA256已独立回读：main.js `a72d40e40ae28c2172dcc8a814556e0216b8dfd62d1b0f3114c52baa5bd0aee7`；styles.css `57a6acaa99fa876c00c38a843ed51554ccf03a83f623e6bd1e3e6421a4f7e8c8`；release huhu `992b3f69e71424ebf74d26b76cff1998bd6df3c9a3a7677985cfa18edf543c65`；release huhu-pty `58e22cd75bf65784a902b33bc3cefe0d421c9f345487cd13c76f3c162b9129a1`。CLI二进制与007相同，helper随历史修复更新；不以mtime或实现者口头“已build”替代这些回执。

## 问题与下一步

<a id="specification-output"></a>
Reviewer: codex:/root/review_native
Axis: specification
Result: pass
Input-SHA256: ad85880384c79e07d781e6b18ac4fa97a9585bce88009432d825b4f295c476e7
Observed: 同一456路径/20来源及完整最初基线范围；按Spec全部64AC、7NFR、DESIGN与跨票合同组合核对，007六项残留均关闭，无新的明确规范缺口。真实Obsidian/Provider/人工审批/OS输入法/五平台和真实负载仍未运行，按Spec11保留人工分工，不宣称64AC全部实机通过。

### 规范轴六项原缺口的独立结论

G-S01对应Spec §3.8、AC-051和合同§6只读预检/白名单无副作用：公开预检及实际导入不再修改运行时原型，正常可携带字段与本机授权保留。G-S02对应AC-050/051、NFR-001/002、合同§6旧writer隔离和数据保全：真实shutdown尾部跨factory/reload仍受同adapter门禁保护，不能再在新导入done后覆盖它，收束后可继续。G-S03对应AC-028/029、NFR-006：来源adopt不再制造终止证据，fresh专属证明被首次接纳消费。G-S04对应§3.1/3.7、AC-035/040：完整来源身份到达索引/read/cache/export，冲突保留原属且可解释。以上四项不仅满足测试，也满足相应外部保证。

**G-P05 / WB-P04，原medium：关闭。** `src/modules/agent/styles/agent.css:39`起局部portal规则设真实最小宽高44px；AgentWorkspace容器narrow传到Panel和Dialog/AlertDialog/两个Menu，未用coarse-pointer取代窄桌面合同。DESIGN §5、AC-061/NFR-005的原缺口由生产组件接线、当前产物、DOM与Chrome原件共同证明。history 11个控件最小44×44，confirm 2个最小398×44，row-menu 11个最小166×44；filter 25个最小204×44，其中15个可见项进行了五点elementFromPoint，另10项视口外只有尺寸/不重叠检查，不冒称它们均完成可见命中采样。可见采样全部通过、无相邻rect重叠；原生Tab/Escape、默认取消、焦点返回与DOM取消零启动保留。受控Chrome不是Obsidian或Provider E2E。

**G-P06，原medium：关闭。** `docs/agent-workbench-acceptance.md:69` M-12已同步message send、agent prompt、terminal send-text三命令的text/stdin/file三选一，中文多行/末尾换行、原始文本与submit区别、开放stdin提交前Ctrl-C/超时、effect none/无输入及已提交未知不得盲重发。保留message16KiB、另外两类本地256KiB与完整JSON32768字节帧的区别，明确不能把本地上限当可提交容量。与canonical CLI/schema/help/双语Skill和合同§2一致，满足AC-019/064及Spec §11人工交接要求；没有通过删掉人工验收步骤回避矛盾。

### 全范围64AC与7NFR的组合覆盖

| AC范围 | 当前审查组合与实际限度 |
| --- | --- |
| 001–004 | Space持久ID、目录授权、显式目标、同cwd隔离；原完整服务/控制审查与013重跑，未把fixture授权当真实OS选择器。 |
| 005–012 | 六现有Provider/Shell入口、后台/附加、前台证据、布局/实例身份；共享NativeHost、terminal/control消费者、helper及013影响闭包保持。 |
| 013–022 | 顺序输入/回执/水位/取消/unknown与人工审批入口；原生/协调测试、CLI/schema/help/Skill及本轮本地输入探针；M12已同步，真实Provider审批未运行。 |
| 023–025 | 被动邮箱、容量/分页、read/ack分离和持久失败；原owner/router/inbox受控UI与当前全量无退化，不启动模型。 |
| 026–032 | detach与stop分离、归档先收束、旧事件代次、headless屏幕/IME/resize/水位；G-S03关闭，OS真实输入法仍人工待验。 |
| 033–040 | 默认Vault准入、缺失/partial/分页、精确来源与继续/占用；013真实helper与读缓存导出消费者证明G-S04关闭；复制副本冲突可解释。 |
| 041–045 | 独立Browser/NativeHost租约、旧业务existing/fresh/结果/Space接线、移动轻入口；013/014兼容闭包和架构/lazy证据保持，未声称移动实机运行。 |
| 046–053 | 先存记录再启动、迁移/业务包/旧writer/启动恢复/物理绑定；014全闭包及本人公开预检复现证明两项high关闭，无自动启动/补发历史任务。 |
| 054–060 | 有界队列/outbox、慢视图/Rust回入、disable/spawn、共享owner、Hook崩溃/重启不重放；原生与本轮全量保持，真实宿主退出和跨平台负载仍待验。 |
| 061 | DESIGN工作台/历史与既有shell、主题/双语/减少动效/200%/焦点；候选三Chrome覆盖实际portal44px，G-P05关闭，保留fixture限制。 |
| 062–064 | 资产校验/协议兼容、五平台CI/许可/双语Skill/产物/人工清单；Linux开发机真实检查通过，其他平台仅代码配置审查；AC-063实机不标passed，G-P06已关闭。 |

NFR-001/002：预算、取消、停止、恢复尾部与失败隔离已有明确回执；NFR-003：准入、凭据/机器字段白名单、无副作用预检及完整来源闭合；NFR-004：复用共享NativeHost、现有adapter queue、xterm/React/组件，无新Run平台或业务数据库；NFR-005：双语、主题/动效/焦点、窄fine-pointer目标已核验；NFR-006：effect/phase/unknown/partial、真实终止证明和来源变动均保留；NFR-007：来源声明、许可和发行链分工保持，不把CI配置或阅读研究当多平台运行证据。

### 交接与未验证项

本冻结产品范围无待修复high/medium/low finding，也无需要新增用户产品决定的阻塞；可以将本原始两轴pass用于G-06代码审查收束。文档总检查未全绿、不可恢复门后的完整进程重启、42跳过测试及可见命中采样范围均如实保留，不以“全部测试通过”掩盖这些边界。正式状态更新由Lead负责，旧失败/原始报告不覆盖。

真实Obsidian宿主停用/退出/热重载、真实Provider登录及审批、系统IME、其余平台与实际负载/性能未由本人或支持reviewer执行；Spec §11分工不新增代码缺陷，也不等于已通过实机验收。未提交、推送、升版本、发布或归档，未操作真实用户库/账号。若冻结产品或规范再变化，按实际影响重验；本报告仅对上述输入有效。
