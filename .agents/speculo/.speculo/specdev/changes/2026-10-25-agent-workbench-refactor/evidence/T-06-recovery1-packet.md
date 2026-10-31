# T-06 恢复周期 1：真实显示意图与几何验证

本 Packet 由原 Lead codex:/root 拥有。GP-021 / Map revision22 / T-06 in_progress；本地 workspace 仍为 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`。实际实施只从 Root 后续原生派遣开始，不能凭此文自行解冻。

## 授权、输入与恢复依据

沿用 LOG-027 的完整18票实施、Agent Team 与代码验收授权；实现者沿 gpt-6.1-sol/xhigh，独立 reviewer 为未参与实现的 gpt-6-astra/high。真实 Obsidian/Provider/五平台 E2E 由用户执行。不得提交、推送、PR、发布、归档或操作真实 Vault/账号。

Spec、DESIGN revision1/digest f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab、PAGE-001/PAGE-003 与原验收范围不变。旧业务必须绑定 Space，交互入口先选 Space，不能以 cwd/当前界面猜归属（LOG-030）。新焦点机制是已有显示意图的实现修复，不是 T08 的 OS foreground 能力。

按已调用的 I / Goal / dev / ui 继续执行；实施前回读原 Ticket、当前 Map、dev 测试选择表、ui motion-a11y、原 Packet 的其他合同及当前风险参考。现有功能邻接修复复用本项目机制，不新增依赖或外部代码。Root 保存的原 GP020/Map21/Ticket/Evidence 与 attempts3 见 `T-06-recovery1-preplan.json`，SHA7ecbc31ce4dabfabbd5e8247bad2a0cf63b673169778a23ddb62a6bb1d4e3fae；原三次整合和全部失败不覆盖。

本轮的实质新输入：

- `T-06-real-foreground-causal-observation.json`（f885e482…）：固定 v3 仅接真实 capture 后，Sidebar token true → 原 companion textarea focusin → false → exact attach focused:false。0 observer/unhandled/源漂移，原浏览器夹具缺少生产 foreground factory 已被实际对照确认。
- `T-06-geometry-causal-root-decision.json`（96b72a93…）：真实 markManagedSeen 委托前 hold/release，使同 primary lease1/view8/revision4 实际接受102×38→102×37→102×38，DOM684→668→684。原 count 2→4 断言红，全部相位闭合且0 observer/unhandled/源漂移。证明“任何resize等于owner转移”的代理无效，不回填未插桩v3的未知顺序。
- `T-06-geometry-observation1-root-capture.json` 保留原 settle predicate 在旧48列模型上提前返回的事实。不得加 sleep 代替真实接受条件。
- `T-06-recovery1-design-decision.json` 与已保全的 A 设计3725bf26…：选择先提交显示请求、Host一次消费原 token；另一候选需额外许可中间 companion 且同样需要显式 commit，故不采用。

## 唯一写集

精确总集见 `T-06-recovery1-write-allocation.json`：A23/B7/C14/Root3，共47路径。只有下列窗口解冻；其余源继续 STOP。

| Owner | 本轮允许产品路径 |
| --- | --- |
| A /root/prepare_t03 | workspace-service.ts、workspace-service-activity.test.ts、controller.ts、services/launch/foreground-intent.ts、同目录foreground-intent.dom.test.tsx、新增services/workspace-service-foreground.dom.test.tsx（均src/modules/agent/下） |
| B /root/prepare_t05_screen | ui/terminal/TerminalTabView.tsx、TerminalTabView.dom.test.tsx、terminal-view.ts、terminal-screen-xterm.dom.test.tsx（均src/modules/agent/下），scripts/obsidian-acceptance/agent-workbench-activity.mjs |
| C /root/implement_t01 | 无；C14继续STOP |
| Root | main.js、styles.css、scripts/bundle-budget.json；正式状态/Evidence与/tmp验收工具 |

实施者不运行根构建、全局lint/guards、Chrome或改正式工件；只运行冻结前输入/真实工具/原输出可回读的定向检查。格式化只碰自己的本轮路径；本次新增路径以外仍需先交 Root 修订，不能先写后补。

## A：显示提交与原 token 的一次消费

保留原 ensure-pane共享、各caller独立 token、所有 revision/runtime/Space/layout/module 门。选择期间只发布 selecting 事实，Host不自动聚焦恢复布局的 companion；全部原门通过后才发布 committed，请求即使布局对象完全不变也必须可观察。

候选内部 API 为 getFocusPresentation / subscribeFocusPresentation / presentManagedFocus，以及真实 ForegroundIntent.commitFocus。每caller一个单调id、phase随 selecting→committed→consumed/cancelled 改变；真实token不暴露UI。A先落真实类型/API与最小红绿，再发 Root 回读；B在 Root 确认前不得凭候选签名消费。

present 必须核原请求对象/id、phase、预期 revision、当前精确 managed runtime/Space/tab/focused pane、模块状态、仍活着的实际View/textarea。Controller把原捕获leaf容器传入scope；同document另leaf也必须拒绝。commitFocus只消费仍有效、未释放/消费的原token，在一次同步调用栈内释放其撤销监听并执行确切term.focus；无await、重捕获、重放、宽白名单或UI补救。原pointer/key/外部focus/leaf/window在消费前始终可撤销；allowWithin原modal语义不变。

保留旧valid/dispose语义，已有split确实dispose后还读valid，不能顺手改成全局永久false。新commit能力单独受released/consumed门约束。成功转移原token给短呈现请求，attach finally不能释放已转移或其他caller的owner；旧finally/旧effect只能处理原id。取消/消费/模块关闭/替换时幂等释放。

资源合同：最多1当前原token、1定时器和1最新有限终态元数据。截止从 committed 发布起1000ms，不续期、不重试，超时只丧失显示许可。selecting仍使用原attach生命周期，不另造在途队列。订阅随实际Host mount/dispose；不得按活动事件积攒observer。A须证明由实际View预算约束的可达上界，若需独立容量规则先交Root，不静默引入任意上限。

必须明确旧 effect / 终态快照的门：清理自身不能触发fallback；后来真正的pane/tab/Space导航仍能正常聚焦。UI不能按是否有pointer、DOM isTrusted或临时全局布尔猜操作归属。若三个候选方法不足以表达该正常导航代次，A先报告精确最小接口补充，经Root回读后B消费。

## B：精确 Host 消费与浏览器验收修正

原自动focus effect与committed请求的消费分开；render捕获的请求id/phase与真实View代次在执行点再次核对。selecting/尚未消费的committed门必须位于原effect的setFocused(true)和focus两者之前，避免只挡DOM焦点却提前授予尺寸lease；mount/setVisible仍可照常。cancelled/consumed/cleanup不补焦点。目标已focused且store无变化时仍消费新的committed一次。后台零显示请求；旧view/disposed/另leaf/旧id全部拒绝。

TerminalView内部提供实际textarea与同步term.focus接缝，执行前核自身仍存活及同一个term；Host核captured id/current View/doc/lifetime，A独立核request/ref/tab/pane/revision和原container。不得仅凭runtimeId声称A已独立证明View身份，也不得从外部请求任意DOM目标或接入异步/CLI回调。不给UI原始token，不建立第二运行owner；focus消费不是paint/seen回执。

正式Chrome夹具接入真实capture及Controller同义的leaf/container/document/window/current/closed/onTargetChange，全场景使用真实撤销源。原complete Enter、exact split、trusted ArrowUp、N/N+1、readonly原tuple、受控storage故障及其它场景保留。增加能判别真实焦点取消/不同leaf/旧请求的负例；实现细节可用最接近它的DOM测试，但不以布尔token替代真实capture正向闭包。

几何场景用真实accepted owner fit / native调用 / model一致建立baseline。之后检查精确owner lease/revision保持，每个accepted/native resize属于该owner真实请求，允许提示条引起合法行变化。用follower原lease实际requestViewSize验证rejected/not-owner，native及模型零变化；还要有真正切换到不同owner的受控反例证明检查器能识别转移，不能仅删length断言。可保留seen barrier以确定暴露提示高度变化，但必须标明受控时序且finally释放；不用额外sleep、放宽超时或更换生产fit逻辑。

## 验证与停止条件

先保存能击穿当前源的组合red，再实施对应最小修复。A涵盖真实capture+Workspace发布、already-focused、消费前所有撤销源、同doc另leaf、后台、两caller、过期/关闭/旧id、旧modal/split行为。B涵盖真实Host/TerminalView消费、旧effect、取消无fallback和正常后续导航。每次定向命令保全实际前输入（含formatter配置、Node ELF、工具与配置）、原输出和后漂移，不用被过滤/skip的数目充当通过。

全部writer SOURCE STOPPED并回读handoff后，由Root冻结新候选，运行受影响测试、build、lint、Promise/架构（顺序避免临时fixture重叠）、适用bundle/i18n/样式复用核验、真实组件Chrome和修复字节相似度补扫；原未受影响证据继续复用。Root按实际产物重新归因预算，不能为通过先放大cap。正式固定审查输入后交独立Astra/high双轴审查。

原周期 attempts3 保留；新周期因实际新增机制反例、生产夹具和验证不变量变化而从0计，只有正式新候选整合开始才递增。失败上限仍3；没有新事实则停止重复，不换Agent清计数。发现外部产品/视觉合同改变、路径冲突、来源/必需证据缺失时暂停受影响分支并返回Root；不自动创建用户审批或停止全部已授权工作。

本轮完成仍要求T-06全部代码门与独立审查；本 Packet不是完成证据。T07–18保持依赖锁定，整个18票Goal继续active。
