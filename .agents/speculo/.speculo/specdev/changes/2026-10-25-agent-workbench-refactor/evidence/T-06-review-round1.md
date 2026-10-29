# T06 round1 独立完整工作树审查

审查身份为工具分派的 `codex:/root/review_t06`；未参与 T06 实现，未委派子审查。TASK 说明本轮安排为 gpt-6-astra/high；本报告不把 TASK 的请求当作独立验证后的运行模型元数据。所有 repo 文件只读，未实施修复、未改正式状态、未运行全局 build/lint/Chrome/helper rebuild。SOURCE STOPPED。

冻结输入为 `/tmp/huhu-t06-review-round1-input.json`，完整 42 路径当前快照及 T05→T06 增量均纳入；不是只审 recovery focus。base/observed HEAD 为 `33c21e098ef3188cbab5a09f3e0a01fadb787715`。本报告的两轴依次如下。

<a id="standards"></a>
Reviewer: codex:/root/review_t06
Axis: standards
Result: request-changes
Input-SHA256: 0c6a73b7c544dd6eb53222c63e3a13f8a1d02608d4a8abb7feb38eff04b0a40f
Observed: 已核对冻结 JSON 的 parse→stringify 摘要、42 路径当前/冻结源码摘要及模式、77 份冻结来源摘要、实际 HEAD/index/tracked diff；沿 A/B/C 的 producer、spool、consumer、Session、持久化、Workspace、View/textarea 与 Sidebar 调用链阅读实现、相关测试及实际 Root 验证日志，并独立运行两份隔离探针，确认两个状态归属/失效缺陷。现有绿色检查不能否定下列反例。

## 标准来源发现与输入完整性

1. 按 AGENTS 先读 workspace roots、catalog，选相关能力后读 runtime guide。实际采用 common code-review Skill 与 source-discovery、fowler-smells、risk-review、reviewer-contracts、review-evidence、working-tree-review；采用项目 dev/ui Skill 和当前任务相关架构、测试、生命周期、许可、设置/i18n、Obsidian API、构建发布、设计系统、shell、动效/无障碍规则；读 error-handling 与 test-reliability 共同规则。
2. 找到根 AGENTS.md；CLAUDE.md 是现有 24-byte `@AGENTS.md` 转发，不是新增实现来源。未找到本次路径适用的嵌套 AGENTS、独立 CONTRIBUTING/CODING_STANDARDS；找到 eslint、tsconfig、vitest、prettier 与 package scripts。无需额外发明风格规范。
3. 没有新 commit/远端 PR，采用 working-tree mode；不执行无意义的 PR 元信息/commit 范围审查。找到明确 Spec、implementation-contracts、T06 Ticket、ADR/CONTEXT、DESIGN PAGE-001/PAGE-003、批准 revision1 及 T06 实际 API/资源/呈现/恢复合同。设计 revision1 摘要为 `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`。
4. 独立摘要验证得到本报告 Input-SHA256。全部 42 源码快照与当前字节相符，全部 77 冻结来源文件与声明 SHA 相符；非锚点来源当前整文件也匹配。锚点来源使用冻结 section.raw 验证；未宣称重新实现全部锚点提取器。
5. read-only `validate-specdev.mjs --review-scope` 退出 0，原始 stdout/stderr 已保留。HEAD/base/index/tracked diff/selection/42 路径 working_snapshot（含 mode）均一致。重算总 inventory/input 摘要不同的唯一原因是 excluded_paths 新增四份正式审查控制文件：`T-06-reused-prior-round1.json`、`T-06-review-input-round1.md`、`T-06-review-round1-dispatch.json`、`T-06-review-round1-task.md`；无 scope 内生产漂移。未以重算摘要替换冻结输入。原 T01–05 的复用只用于确认未变来源，不代替 T06 审查。
6. 不打开 GPL 参考源码，不浏览可变外部资料。仅回读已冻结的数值相似度结果、运行 receipt/log 与限制。

## STD-01 — P1 / high：OpenCode 不同 root 被合并为同一有效来源

**已确认。位置：** `src/modules/agent/platform/desktop/hooks/native-extensions.ts:72`、`:80`、`:85`；`src/modules/agent/platform/desktop/hooks/automation-hooks.ts:547`；`src/modules/agent/services/terminal/session.ts:396`、`:418`。

**可达前提与实际链路：** 一个实际生成的 OpenCode plugin initializer 建立一个 UUID/sequence registration。它接收 root-A 的 busy，随后接收尚未证明属于同一运行主体的 root-B 的 idle，root-B 有完成的 assistant answer。producer 只过滤 `session.parentID`，没有把 registration 绑定到唯一 root，也没有要求 root-B 在本 registration 中先出现 start/busy。不同 root 的 session_id 作为 resume metadata 进入 consumer，但 consumer 只按 `provider + ':' + instance` 选源，因此 Session 看见 candidates.length===1，错误通过完成和恢复身份采纳门。

**独立反例：** `/tmp/huhu-t06-review-r1-producer-probe.ts` 执行真实 `OPENCODE_EXTENSION`，通过真实物理 hookSpool 与真实 consumer/TerminalSession。外部 client API 是受控边界，依次返回 root-A、child-C(parentID=root-A)、root-B。实际 producer 请求 child-C 的 get 后过滤它；只有 root-B 调用 messages。实际落盘并读取三个 envelope：registration seq1、root-A UserPromptSubmit seq2、root-B Stop seq3。没有 root-A close，也没有 root-B start。原始结果 `producer-output.json` 的 errors 为 []，但 snapshot.state=done、source.health=current、completion.activitySequence=4、unreadCompletion=true、nativeSessionId=root-B。观察探针退出 0 表示执行成功，并非合同通过。

**影响：** 未结束/未撤销的 root-A 被 root-B 完成事实覆盖；原运行出现错误的当前完成/未读点，恢复引用被改为 root-B。这里没有证据表明自动发送了输入：foreground 仍 unknown、inputReady=false。不要把此缺陷扩大描述为已经发生自动审批。

**标准依据：** common risk-review 的行为与契约、数据与状态、并发与 owner；dev 的归属/生命周期要求。领域身份在 producer→consumer→Session 之间丢失，正常单 root 用例通过而竞争来源的失败路径保持成功状态。现有 native-extensions 测试覆盖一个 root 与 child，consumer 的多来源测试改变 instance，均未覆盖“同 instance、两个 root”。

**最小修复方向：** 在现有 owner 内有界保存 root 归属/冲突事实；遇到未证明旧 root 已结束的另一 root 时立即保持 source-mismatch/unknown，禁止该竞争状态提升 completion/title/resume。不要只把 root 拼入独立 sequence key：registration 的 sequence 原本跨 root 单调，分拆后必须明确处理其连续性。保留原完整答案通道已有的独立匹配合同，不借修复删除旧答案。

**回归要求：** 用实际生成 extension→实际 spool→consumer→Session 覆盖 busy A、idle child、idle B；断言 child 不产生记录，B 不制造完成、不覆盖恢复引用，晚到 A/B 均不默默换主。加单 root 正向和有明确撤销/close 的恢复情况；测试 stop-before-start/已有 completed answer 的可达入口，不能只构造内部 DTO。

## STD-02 — P2 / medium：有限重排窗口的已知缺段未撤销 current

**已确认。位置：** `src/modules/agent/platform/desktop/hooks/automation-hooks.ts:590` 至 `:608`（关键 `:598`、`:601`）；`src/modules/agent/services/terminal/session.ts:422`。

**可达前提：** 同 registration 的 seq1 registration、seq2 working 已采纳，随后 seq4 Stop 到达而 seq3 尚未到达；seq4 仍在八项窗口内。consumer 存入 reorder 后找不到 high+1，直接退出循环，不向 Session 暴露连续性缺失。

**独立反例：** `/tmp/huhu-t06-review-r1-probe.ts` 的 sequenceGap 情况直接调用真实 consumer 与 Session。原始 `probe-output.json` 在收到 seq4 后立即仍是 state=working、source.health=current、activitySequence=3、revision=3，没有 sequence-gap 降级。代码中的 freshness timer 仅从此前连续事实计算 30 秒过期；它不能代替已知缺口发生时的即时 unknown。

**影响与边界：** 保留 seq4 等待 seq3 是合同允许的有限乱序处理；错误在于缺口存在期间仍把旧事实显示为 current。探针没有错误地要求首次乱序永久拒绝，也没有声称 seq4 已被提前提交为完成。缺口之后可能补齐，恢复是否允许应由连续性及其他有效性门统一决定。

**标准依据：** risk-review 的失败状态、乱序恢复与状态一致性；错误处理规则要求失效可观察。现有测试覆盖 1,3,2 最终按序交付和超出窗口的序号失效，却未观察中间窗口状态，因此绿色用例遗漏实际用户可见状态。

**最小修复方向：** reorder owner 明确报告 unresolved gap，Session 保存 lastFact 但降低 aggregate current/阻塞解除/完成可信度；补齐且不存在其他阻塞、错误或失效时才恢复。保留有界重排、去重和窗口溢出 fence，不用 eventAt 补齐，不简单删除正常乱序能力。

**回归要求：** seq1,2,4 后立即断言 unknown/sequence-gap 与历史 working 保留，再输入3验证按序、至多一次恢复/完成；没有3时无需等 freshness 即保持 unknown。覆盖重复、溢出、旧完成及关闭后的晚到事件不能重新激活来源。

## 全范围风险审查记录

下表中的“未新增发现”仅表示已读链路和现有证据未确认其他缺陷，不是绝对无缺陷证明。

| 类别与可证伪假设 | 实际追踪和验证 | 结论 |
|---|---|---|
| 行为/契约：文本 Stop、native exit0 或其他来源可伪造当前完成 | native-extensions/system-hooks→activityFields→Session completion allowlist；command 为 unproven；status/native stop；两份独立探针 | STD-01 确认；其他已读分支保留前台 unknown、不以文本或 exit0 生成完成 |
| 数据/状态：乱序和过期可保持错误 current；seen N 可吞掉 N+1 | consumer high-water/reorder、Session immutable snapshots；Workspace captured N；SpaceService merge/serialization；records schema | STD-02 确认；N/N+1 已读用例与 Chrome readback 未确认新问题 |
| 权限/安全：payload/路径/软链接越界、完整答案变授权 | spool-guard 与 hook-spool 固定 scope/token、路径链、O_NOFOLLOW、打开后 E+1；摘要允许字段/8192 UTF8 编码前预算；原 payload 分路；permission policy diff | 未新增发现；两份 probe 的 token 为临时自建 scope，不是用户凭据 |
| 并发/owner：重复 reader/writer、清理释放他人额度、超时后第二 writer | canonical spool singleton、nonce/inode claim、consume-before-callback、tombstone 保槽、closing 同步撤准入后异步物理 cleanup；SpaceService 单一实际 writer、逻辑 timeout 不提前释放 | 已读失败/回收用例未新增发现；producer probe 实际物理 spool 关闭完成 |
| 兼容/迁移：旧答案丢失、恢复 hint 启动新 runtime、旧 schema 崩溃 | agent-runtime 原 receipt/cancel 筛选、完整答案与摘要分路；records 可选 hint；Workspace readonly original；旧缺字段测试 | 未新增发现；T14/T15 是后续消费范围，不误列为 T06 缺失 |
| 证据/测试：绿色只测替身、UI 没到原 textarea | ForegroundIntent→Controller→Workspace→Host→mounted terminal-view/lease；现有 DOM/xterm 与真实 Chrome receipt；独立 producer 探针实际核心通路 | 本报告明确受控边界；STD-01/02 的现有测试漏项为同两缺陷的验证要求，不重复计数 |
| 可维护性：重复事实 owner/隐式默认/规则四散不可修复 | managed-runtime DTO、Session 单一 reducer、SpaceService 提示持久化、Sidebar 投影与 i18n、模块边界/懒加载结果 | 未发现需另立 finding 的 Fowler smell；不因大文件或偏好要求无关重构 |

具体覆盖还包括：累计 source8/listener32 与4096无序ID上限、物理 small/large/collector 分账及公平轮转；stop/exit/transport/dispose 的同步失效与后续 close；Exact Space/runtime/tab/pane 恢复；每 caller 独立 intent、仅共享 pane、1000ms 单次 deadline、原 token 一次消费；pending→connected 与相同 Session 替换 View；render/subscribe 间隙补读；blur/导航/取消；readonly 零 spawn；持久化失败保留 UI 错误与显式重试；选择期间不经普通 focus 旁路；捕获 N 的可见 render ack；尺寸改变只触发必要刷新、不新增 resize owner。

## 实际验证证据与限制

- 本 reviewer 实际运行两份隔离 Node probe，均退出 0，输出已保留；确认的是反例。实际只读 scope validator 退出 0。未重复 Root 全局命令。完整文件/输入摘要与实际退出码在 `/tmp/huhu-t06-review-r1-probes.json`。
- 已回读 Root recovery1 integration 的实际 receipt/log：build、global zero-warning lint、32 files / 356 tests / zero skips、architecture 1232 modules、Promise、bundle 均退出 0。测试日志持续时间 22.63 秒。原20个未改测试文件的复用经 exact-source/risk audit，不把历史48 files /382 tests与本轮356相加宣称更多测试。
- 已回读 i18n 31 dictionaries/4701 keys 的 AST 输入等价复用；docs 仍退出1，六个已有且与本次无关的 Bot anchors，不能记成 all-pass。未因这组已证明未变基线制造本轮第三个阻塞发现。
- 回读实际 Chrome 11/11 named checks、failures=[]、drift=[] 与 source/runner 审计；人工观看四张实际 PNG：focused-blocked、narrow、save-error、readonly-original-hint。Root 报告六张截图，不把 Root 看过的六张说成本 reviewer 全部看过。已读 runner 的执行边界和关键断言，没有声称逐行穷尽1728行 runner。
- Chrome 使用真实 DOM/xterm/IntersectionObserver/keyboard，Native/Provider/Obsidian leaf/TextStorage 是控制边界；resize native acknowledgement 明示不支持。截图中“打开原运行”不等于已证明 OS 前台身份。真实 Obsidian/Provider/五平台 E2E 留给用户；T08 OS foreground 不属于本轮实现验收。
- 核对 main.js=6307900 bytes、SHA `bc0422968f6fa5a76bd3319385c25250dbafa2a83c41ca92ce1284082176517c`；styles unchanged。eager123531 bytes/106 inputs 不变；预算只按实际增长作 KiB 归因，不拿预算通过代替语义正确。
- 实际 similarity receipt/log 为39 codefiles 对33627 references，退出0；raw最大share .006、run36。规范化字典/测试模板得分不是来源证明；scanner 对 template literal 的覆盖有已声明限制，不能称没有相似度即保证无来源风险。未打开参考 GPL 源码。
- probe 的外部 OpenCode client 响应受控，未启动真实 Provider 或 native PTY。它证明仓库已交付的 producer 真实接收与过滤路径及后续落盘/消费缺陷；不声称已经在用户 OpenCode 会话现场观测故障。

<a id="specification"></a>
Reviewer: codex:/root/review_t06
Axis: specification
Result: request-changes
Input-SHA256: 0c6a73b7c544dd6eb53222c63e3a13f8a1d02608d4a8abb7feb38eff04b0a40f
Observed: 已将 Spec §§3.3/3.6、AC007/020/021/022/061、NFR001/002/006、implementation-contracts、T06 的目的/范围/路由/验收/验证/约束、ADR/CONTEXT、批准 DESIGN revision1，以及 API-v2/资源/呈现/恢复合同与完整交付链路核对；以下两个已运行反例直接违反原有明确合同，恢复包未修改这些外部验收要求。

## SPEC-01 — P1 / high：同 registration 的不同 OpenCode root 未降 unknown

对应 STD-01 的同一已确认缺陷，不是额外第三项。

**精确规范定位：** change 下 `evidence/T-06-activity-api-candidate-v2.md:206` 明定 OpenCode registration 与 root 会话分开，禁止多 root/重载挑最新；`:211` 明定“同一 runtime 中两个未确认结束的注册来源、不同 root/重载或无法排除旧来源，聚合立即 source-mismatch/unknown”，聚合不得完成/解阻/授予 prompt，不能以另一项更新或到期默默换主；`:212` 限完成为唯一、未撤销、允许语义且无未决 block/gap/error 的 registration。`evidence/T-06-dispatch-packet.md:23-24` 同样要求并存来源降 unknown 及完成门。它们落实 Spec §3.3 与 AC007/AC021 的可信活动/未知显示要求。

**实际违反：** producer 已过滤有 parentID 的 child，但没有 root exclusivity；busy A 后没有A close即采纳 idle B，当前 source 仍唯一/current，完成与 nativeSessionId 晋升B。B的 Stop 来自真实 producer 的 completed-answer 分支，不是测试伪造内部 completion flag；idle 前没有相应 root-B busy 也可走到该分支。

**要求修复/验证：** 同 STD-01。根身份冲突应保留来源不确定性，不能只给 UI 改标签而仍更新内部 completion/resume。原答案通道的既有身份匹配与错误语义需保持。真实 Provider 是否在特定版本发出该事件组合不是本探针测量对象；仓库公开 event handler 对可接收的多个根事件缺少合同要求的防护已由实际生成实现确认。

## SPEC-02 — P2 / medium：reorder 窗口内缺口期间仍显示 current

对应 STD-02 的同一已确认缺陷。

**精确规范定位：** `evidence/T-06-activity-api-candidate-v2.md:254` 的 registered sequence 表项明确“最多8个待重排摘要…缺口/窗口溢出 unknown”；`:264` 明确有限窗口按序交付、缺口不能用 eventAt 补齐。`evidence/T-06-hook-resource-profile.md:20` 再次规定“缺段/超界 unknown”。`evidence/T-06-dispatch-packet.md:23` 明确缺序号降 unknown，`:24` 不允许有未闭合 gap 的 turn-finished。规范分别列“缺口”和“窗口溢出”，并未把失效要求延后到超窗或30秒到期。

**实际违反及限度：** seq1,2,4 在等待3时保持 working/current。仅凭这个反例不能声称 Stop seq4已经被提前完成；真实错误是中间 current 状态。有限等待/可恢复重排与即时 unknown 可同时满足；不要求所有短暂乱序永久报错或删除 buffered4。

**要求修复/验证：** 同 STD-02，增加未补齐中间 snapshot 的断言和补齐后的恢复断言；只验证最终事件顺序不足以证明本合同。缺口期间历史 lastFact 可以留存，当前性不能沿用。

## 其余规范覆盖与结论边界

- AC007/021：当前/历史/来源/过期及不可用提示已沿 producer至Sidebar审查，两项反例阻止本轴通过。
- AC020/022 与 T06 original-terminal：精确 Space/runtime/tab/pane、取消零新 admission、后台没有合法 Space 的 typed failure、原运行 readonly/失效入口、单次 intent 到 exact mounted View/lease、真实焦点与 render seen 的边界已有代码与测试/readback支撑；本轮未确认第三个违反。
- AC061 与持久化/恢复：记录层只保存有限提示，恢复不推断真实 runtime，completion/seen 原子合并防止 N 覆盖 N+1，实际 writer 与逻辑 timeout 分离，失败可见与显式 retry 关闭输入旁路；已读失败与恢复用例未确认新问题。
- NFR001/002/006 与共同合同：摘要/池/监听/队列有界、懒加载与模块边界、i18n/en-zh、交付源码/产物一致性均已审查。固定上限和绿色构建不解除具体语义缺陷。
- 后续 T07–18、T08 OS 前台、T14/T15 消费者能力未被暗中扩大到 T06。没有要求新授权、发布、归档或降低验收。

## 原始证据交接

报告路径：`/tmp/huhu-t06-review-r1-report.md`。
原始探针清单：`/tmp/huhu-t06-review-r1-probes.json`（含每个输入/输出/bundle 的 SHA256 和实际 exit code）。
第一探针：`/tmp/huhu-t06-review-r1-probe.ts`、`.cjs`、`/tmp/huhu-t06-review-r1-probe-output.json`。
真实 producer 探针：`/tmp/huhu-t06-review-r1-producer-probe.ts`、`.mjs`、`/tmp/huhu-t06-review-r1-opencode.mjs`、`/tmp/huhu-t06-review-r1-producer-output.json`；隔离目录 `/tmp/huhu-t06-review-r1-producer-pool`。
只读 scope 回读：`/tmp/huhu-t06-review-r1-scope-recheck.json` 与 `/tmp/huhu-t06-review-r1-scope-recheck-stderr.txt`。
原始探针与原始输出未覆盖；报告和 manifest 使用独占新建。两个 Node 进程均已退出。consumer.close、Session.dispose 已执行；物理 producer probe 在 finally 内 await slot.close 并恢复环境。没有运行中 probe。

两轴均 request-changes。SOURCE STOPPED；本 reviewer 不宣称 T06/Goal 完成，不写正式 Evidence/Ticket/Map，不解冻生产源。Root 负责保存原文、裁定修复与最终验收。
