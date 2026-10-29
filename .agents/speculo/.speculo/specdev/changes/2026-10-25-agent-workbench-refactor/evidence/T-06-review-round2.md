# T06 round2 独立双轴审查

本报告只针对冻结的 T06 完整交付切片，不是 T06 或 18 票 Goal 的完成声明。审查者实际身份为 `codex:/root/review_t06_round2`，未参与该切片实现或修复，未递归委派。生产、测试、配置和正式文档始终只读；仅写入独占 `/tmp/huhu-t06-review-r2-*`。SOURCE STOPPED。

<a id="standards"></a>
Reviewer: codex:/root/review_t06_round2
Axis: standards
Result: pass
Input-SHA256: 9385796b452e0c596305021d0a8bb8c73051d6d47cd7f1b58473283ab77fc6a3
Observed: 已独立核验冻结输入摘要、完整 42 路径当前/快照及模式、90 项冻结来源摘要、119 项上一轮未变交付；阅读 T05→T06 增量及当前调用链，独立运行原两条反例、真实生成 OpenCode 扩展→物理 spool→consumer→Session 探针，以及多洞恢复/完成 N/生命周期探针，均 exit 0；本轴未确认需要修改的缺陷。

## 来源发现与固定范围

1. 先读 `.agents/speculo/.speculo/workspace.json` 解析 roots，再检索 catalog；选择公共 code-review 能力后读取运行指南、公共 Skill 及 source-discovery、fowler-smells、risk-review、reviewer-contracts、review-evidence、working-tree-review。没有创建额外 Change 或 Work。
2. 按 42 路径实际祖先目录检索项目规则：找到根 `AGENTS.md` 和既存 24 字节 `CLAUDE.md` 转发桩；未找到适用的嵌套 AGENTS/CLAUDE、CONTRIBUTING 或 CODING_STANDARDS。未新建或恢复 CLAUDE。
3. 找到并阅读 dev/ui Skills，以及涉及本切片的架构、测试、许可、Obsidian API、设置/i18n、模块、构建、shell、设计系统、动效与无障碍参考；阅读错误处理和测试可靠性标准。核对 ESLint、TypeScript、Vitest、Prettier 等实际配置，不把纯格式启发式当硬性缺陷。
4. 找到明确的 Spec、implementation-contracts、T06 Ticket、ADR/CONTEXT、获批 DESIGN revision1、API/resource/presentation 合同、recovery1 与 repair1 决定及交接。因此规范轴适用，不能跳过。没有远端 PR 或新 commit；采用工作副本审查，base/HEAD 都是 `33c21e098ef3188cbab5a09f3e0a01fadb787715`。没有浏览可变外部资料，也没有打开 GPL 参考源码。
5. 输入为 `/tmp/huhu-t06-review-round2-input.json`，使用 Node 执行 JSON.parse→JSON.stringify→SHA256，实测与本报告字段一致。42 路径以完整当前实现及上下游检查，增量定位使用 `/tmp/huhu-t06-review-round2-increment.diff`，不将修复七路径当全部范围。
6. 重新执行同 42 路径 review-scope 校验，exit 0。base/head、selection、index、tracked diff、working snapshot（含 mode）与冻结输入一致。excluded inventory 多出五个 round2 正式控制工件：reused-prior-round2、review-input-round2、review-round2-dispatch、review-round2-pre-dispatch-correction、review-round2-task；它们不属于生产交付。未刷新或替换原 Input SHA。
7. 审查末再次核对：42 当前与快照均匹配；90 冻结 source 均匹配，无锚点的 source 同时与当前整文件匹配；119 prior 当前/上一轮快照均匹配，errors=[]。锚点 source 校验的是已冻结 section 原文字节，未独立重跑锚点提取器，不宣称做过该步骤。

## 标准轴风险复核

| 可证伪的失败假设 | 实际检查与判断 |
|---|---|
| 来源串写、缺口期间仍宣称 current，或普通事件清除硬失效 | 追踪 `automation-hooks.ts` 的 provider/registration/sequence/first-root 归属到 `TerminalSession.bindActivityRuntime`；同一 registration 首个合法 OpenCode root 锁定在活动 consumer，冲突使该来源不可恢复为 current。`observeOrdered` 在写状态前校验结构、序号及总摘要预算，整批应用、最后通知；stop/HookError/close 不被填洞恢复。独立探针见下。 |
| 无界事件、正文或监听器导致内存与磁盘增长 | 检查 `managed-runtime.ts` 总 UTF-8 JSON 8192 B（含转义/身份）以及 source 8、listener 32、reorder 8；检查 HookSpool 的 scope 32、collector 4、小槽每 scope 8/全局128/64 KiB、大槽每 scope2/全局4/16 MiB+64 KiB、16small/1large 公平批次，以及超限降级。原生答案独立 2 MiB，没有被 8 KiB 摘要限额截成成功答案。 |
| 逻辑超时提前释放仍占用的物理资源，dispose 后异步结果复活 | 检查 prepare/runtime/install 各自归属、abort 后迟到 prepare 的关闭；spool 同步撤销 admission 再等待实际 cleanup；Space hint 保持单物理 writer，观察超时不等于 writer 完成。关闭/重开跟随原 lease，错误保留。未发现新增无限重试或未收束任务。 |
| 文件路径、令牌或重复 delivery 绕过读取边界 | 检查 canonical reader、nonce/inode claim、token、guarded file path、O_NOFOLLOW、有界 E+1 读取、ready→consuming 和先 tombstone 后回调、retirement 上限及清理失败的保留。未把这些边界表述成能抵御恶意同用户进程的安全沙箱。 |
| 状态持久化把新代次或更晚 completion/seen 覆盖 | 检查 SpaceService 单 writer+有限 latest 合并，32 个目标/等待者边界，同 runtime 单调合并及 writer 内真实 record/lastAttempt 校验；records 的严格 hint 白名单；错误后显式重试。现有 stalled-writer、代次与 seen 测试的断言检查了结果而非只调用实现。 |
| 聚合副作用进入输入、审批或终端尺寸链路 | 活动事实/导航路径没有发送 Enter、批准或拒绝；foreground 只在既有交互输入意图和严格 View 条件下 focus textarea。检查实际 renderer/Host/Workspace/Controller 端点及原尺寸 lease。Root Chrome 原始结果中唯一 trusted ArrowUp 保留原 SID 字节 `\u001bOA`，导航无输入；resize follower 被 not-owner 拒绝。 |
| React mount、订阅时序或 owner-document 漂移导致误 focus/seen | 检查 ForegroundIntent→Controller→Workspace→Host→mounted View/textarea/lease 全链，render/subscribe 间隙复查，原 document/leaf/pane/ref、deadline、取消与 blur、同 Session 更换 View。Seen 依赖实际 presentation generation、完整 viewport render、当前可见 pane/window/leaf；保存回调不冒充呈现。 |
| 分区、懒加载、文案、许可或产物不一致 | core 保持纯模型，Node 文件操作在 desktop 平台侧，跨模块使用 api；新增用户文案走现有 t()/en/zh，docs 中文且与保守活动语义一致。核对 main.js/current hash、精确增量归因及 budget；未加入依赖或许可来源不明代码。Root 数字相似度读回见后文，未读取参考项目源码。 |

维护性上，Session/Workspace/Spool 本身较大，但此次修改的状态归属、容量及生命周期边界可定位，焦点与活动提交也保留独立接口。没有将一般“长文件”启发式提升为缺少具体后果的阻断 finding。纯格式变化不另报问题。

## 本审查者实际执行的反例与探针

全部 probe 源码、打包输入 metafile/实际输入 SHA、原始 stdout/stderr、exit code 和清理说明保存于 `/tmp/huhu-t06-review-r2-probes.json`。使用实际仓库实现；隔离 Node 模型用既有 `scripts/obsidian-stub.ts` 替代宿主 API。没有运行真实 Provider CLI 或 native helper。

- 原 round1 consumer/Session 反例：同 registration 先 root-A working，再 root-B Stop，现为 `unknown/source-mismatch`、无 completion，`nativeSessionId` 保持 root-A。seq1 registration、seq2 working、seq4 Stop 缺 seq3，现立即 `unknown/sequence-gap`，保留 working lastFact。`probe-output.json`，exit 0。
- 原 round1 生产者反例：实际导出的 `OPENCODE_EXTENSION` 写到独占临时文件，通过受控 OpenCode client 和真实物理 HookSpool 接回 consumer/Session。实测三条 row（registration/root-A busy/root-B Stop）、child-C 被过滤、errors=[]；冲突不能完成或改恢复身份，原生 root-B `last_assistant_message='finished root-B'` 仍完整存在。`producer-output.json`，exit 0。
- 新的多洞与原子恢复探针：先1、2、4、3Stop，最终 working，原 Stop 的 completion N=5 小于最终 activitySequence6；再7Stop、5时仍 gap，补6后得到 completion10，一次整批通知。markSeen5 单独触发一次后续通知且仍有 unread10；不误把通知总数2说成批处理通知2。分别插入 stop-requested、越窗 overflow、HookError、consumer close，填洞均不能推进原 completion5。`ordered-output.json`，五模式均 exit 0。
- 真实 spool 探针 finally 调用 consumer.close、Session.dispose、await slot.close 并还原环境；Node 正常退出。末次检查隔离 pool 只余四个空目录，没有遗留活动槽或 collector。其他 probe 也关闭 consumer/Session。源码及结果留作证据，没有删掉反例材料。

## 沿用验证的审阅与边界

以下是 Root 的执行事实，由本 reviewer 回读实际 receipts/logs/result JSON 核对；没有冒称本 reviewer 重跑全局检查。

- build、全局 lint 零警告、architecture（1232 modules）、Promise guard 均 exit 0；47 文件/526 tests/0 skipped 的原日志为通过，不将只筛选修复用例的绿色等同全局验证。
- main.js 为 6,310,559 B、SHA256 `3e3aded6f8e81890ddc74ebd5f424248a827f1e17e0b5eafb3dea260aee3dde0`。repair 比前候选增加2659 B，归因 Session2184+automation-hooks465+managed-runtime10；eager123531 B/106 inputs 未变；output/agent 最小 KiB caps 有实际检查。styles1421846 B 未变。
- i18n31 dictionaries/4701keys 有前轮结果及本轮 AST 等价读回；不是重复运行整个旧检查。docs 原 exit1 的六个无关 Bot anchors 保留，不能报告 docs 全绿。
- Chrome 当前11/11，failures=[]、source drift=[]。核对真实结果中的隐藏文档、N/N+1、offscreen/noncurrent leaf、双观察者/dispose、保存失败显式重试、原运行只读提示零新 spawn、trusted keyboard、resize-owner。Root 的 trace 是420事件、查看六图；本 reviewer 实际查看其中 focused-blocked、narrow、save-error、readonly-original-hint 四张 PNG，不声称看过全部六图或重新执行 Chrome。
- 相似度前轮39源码与本轮七路径补查有实际数字；另32项哈希未变沿用。当前 raw max .004/run25，normalized .011/run41 来自测试脚手架；此前 raw max .006/run36。保留归一化词典结构高相似及模板字符串分词限制，不从数字推导绝无复制，也未访问 GPL 源码。
- 原 cycle3/recovery1 attempt1、round1 request-changes、A/C 红灯与类型/lint 失败仍是历史证据。本次通过只针对当前 frozen round2，不抹掉失败，不将修复摘要替代独立语义判断。

标准轴确认 findings：无。上述未执行的宿主/平台验证仍按原合同保留，不升级为已自动通过。

<a id="specification"></a>
Reviewer: codex:/root/review_t06_round2
Axis: specification
Result: pass
Input-SHA256: 9385796b452e0c596305021d0a8bb8c73051d6d47cd7f1b58473283ab77fc6a3
Observed: 已将同一完整 42 路径交付与 Spec §3.3–3.8、implementation-contracts、T06 purpose/scope/acceptance/verification/constraints、ADR/CONTEXT、获批 DESIGN revision1 PAGE-001/PAGE-003、API/resource/presentation 合同及 repair1 决定逐项对照；原两项规范反例通过实际独立探针确认关闭，未发现当前切片缺失、越界或相反的外部行为。

## 规范依据与失败假设

本轴依据为冻结输入声明的规范来源；DESIGN revision1 digest 为 `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`。GP-021/Map22 和 recovery/repair 调整实现或验证方法，没有降低外部 AC。下表只对 T06 当前合同判断；T14/T15 的 consumer 迁移不冒充已在 T06 交付。

| 规范要求及反例假设 | 当前实现/证据与结论 |
|---|---|
| Spec §3.3、API 活动合同：收到可信结构化事件才能描述本次运行；安装、安静或 exit0 不能制造智能体完成 | Session 使用明确 runtime/source/registration/programEpoch、freshness/sequence；native registration 与 command-hook 的可信范围区分，未知/过期/并存来源保持保守。status 的 shell 退出状态不成为智能体 completion。没有文本猜测或 prompt-ready 推断。 |
| 原 round1 P1：同 OpenCode registration 的不同根运行串为一次完成，并覆盖恢复身份 | 实际 source preflight 与 first-root fence 在活动 consumer；新的 root 冲突使 source-mismatch sticky，既不采用其 completion 也不改原 resume identity。真实生成扩展/物理 spool 复现实测关闭；原生完整答案仍独立传递，符合 repair1“不改变完整结果合同”。 |
| 原 round1 P2：缺口在重排窗口内仍向用户显示 current working | 首个孔洞通过 observeOrdered([], true) 立即切 unknown；整个有界 pending Map 保留至所有孔洞填齐；不能用部分连贯子段提前清 gap。独立原反例和多洞探针确认；batch 恢复保留真实 Stop N，不把 batch 尾序号充当 completion。 |
| §3.3/3.4：stop、exit、transport、异常和容量不足不能被迟到事件洗回成功 | Session lifecycle 和 consumer 的关闭/overflow/HookError 优先于后续填洞。读当前 stop、failed/exit/disconnect、scope close 与 prepare 迟到路径；独立 stop/close/HookError/overflow 探针保留历史 completion 而不新增完成。 |
| §3.4/3.6：待处理是原终端导航，审批与输入由用户在原 CLI 完成 | Sidebar allVault 汇总 current 及历史未解决 blocked 事实，保留 provider/版本/观察时间；打开精确 Space/Session/runtime、split pane。Workspace 确认原 record/attempt，终止或断开运行只显示原提示，不偷建运行，不发送 y/Enter/批准或拒绝。blocking 只由同源/同注册/同问题标识真实配对事件清除。 |
| §3.5 及 Space 身份：不能根据 cwd、当前焦点或唯一候选猜 Space | managed 创建与附着使用显式 ref，交互旧入口选择后再次校验原意图/selection revision，取消零 admission；后台无有效 Space typed failure；pending 打开仍为 pending。焦点变化不改变已绑定的运行 Space。审查了 Workspace 两端及 Controller/Session 调用，不把后续票的 oneshot consumer 迁移当本票成果。 |
| completion N 与 seen N 不可被晚到/新代次覆盖或重播 | Session 独立单调 activitySequence、revision、seenThrough；markSeen 限于捕获 N。Workspace 校验 record.lastAttempt、selected space、当前 visible tab/原 pane/ref/runtime，Space writer 再校验代次。hint 严格 schema 和有限合并，恢复只展示上一轮提示，零 helper/spawn。独立 N=5/10 探针及实际 Root Chrome N/N+1 证据一致。 |
| PAGE-001/PAGE-003 和 presentation seam：只有原终端真正呈现才能消未读，点击入口或仅 mount 不足 | Host 要求文档/窗口/leaf/pane 仍可见且匹配；View generation 在 hide/error/remount 后失效，实际完整 viewport render 才完成 presentation；最多一个进行中提交+一个 latest。失败显示保存错误和显式 Retry，不自动伪成功。已查看持久化的物理 writer 不因观察超时放弃。 |
| recovery1 foreground 合同：原用户意图可一次 focus；切窗、同 Session 换 View、失焦、取消或 deadline 后不能抢焦点 | ForegroundIntent 捕获原 document/window/leaf/container；Workspace 只有一当前 intent/定时器；Host 使用精确 mounted renderer/textarea/lease 和当次 commit token，同步校验后才 focus。render/subscription gap 有再检查；背景 attach 不获前台意图，pending→connected 不创造新意图。读当前全链和相关回归断言，Root Chrome 覆盖有界真实 View 场景。 |
| 资源预算与权限边界：活动摘要和 raw answer 分离；不借 Hook 改现有 Provider permission policy | 8192 B 总摘要严格限制包含身份/转义，raw answer 仍单独2 MiB；物理 spool 先取得资源再收集正文，超限/污染/失败可观察。system-hooks 只迁移 HUHU 精确已知旧命令、追加 provider provenance 参数，保留用户配置/外来扩展及安全写入规则；没有新增审批绕过策略。 |
| 分区、国际化、文档与发布范围 | 交付沿现有模块、终端和 Space writer；现有 permission policy、输入及尺寸 owner 不被活动层取代；文档准确陈述 unknown、历史事实、独立原生结果、有限持久化及未完成的前台识别。源码、生成物和预算符合实际冻结候选；未提交、推送、发布或归档。 |

## 规范轴结论与明确未验证项

规范轴确认 findings：无。两条 round1 发现均由实际原触发序列在当前代码上独立验证关闭；本结论不是由526项绿色测试、Root 摘要或 schema 校验推导。

以下仍保持原合同边界：OS foreground identity 在 T08 前为 unknown，不能凭 focus 成功开放自动提交；真实 Obsidian、多窗口真实宿主、真实 Provider CLI、五平台 E2E 由用户持有验收，不由 Node probe/happy-dom/Chrome fixture 代替。没有新发现要求扩大本票范围，也不将 T14/T15 尚未交付的 consumer 迁移标为已完成。没有将文档六条既存 Bot anchor 失败改写为通过。

## 原始工件

- 独立 probe 索引：`/tmp/huhu-t06-review-r2-probes.json`（含 source inputs、输出、退出、清理及各 SHA）。
- 审查末完整摘要核对：`/tmp/huhu-t06-review-r2-final-integrity.json`，42/90/119 全部匹配，errors=[]。
- scope 实际复查：`/tmp/huhu-t06-review-r2-scope-recheck.json`，stderr 为空；五个正式控制文件的 excluded 差异已明确保留。
- frozen 原输入：`/tmp/huhu-t06-review-round2-input.json`；完整 source42/sources90 及 T05→T06 increment 仍使用派遣时原件。

标准轴 pass；规范轴 pass。正式 Evidence 的保存、独立派遣回执核验和后续票状态更新由 Root 执行。本 reviewer 未修改正式状态。SOURCE STOPPED。
