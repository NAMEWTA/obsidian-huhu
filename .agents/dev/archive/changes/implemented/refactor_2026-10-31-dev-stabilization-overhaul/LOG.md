# LOG: 2026-10-31-dev-stabilization-overhaul

round 1 收录来源中维护者已作出的决定（来源作者即仓库 OWNER，也是本次请求的用户）；不重新提问。round 2 的 frontier 已提给用户，回答后追加条目。

## LOG-001 — 2026-10-31T03:50Z — Change 粒度
- **设计树节点：** D-001
- **轮次与依赖：** round 1 / 无
- **状态：** confirmed
- **问题：** 全部工作包是作为一个 change，还是先经 Wayfinder 拆成多个 change？
- **事实与来源：** 用户要求以一个 change 专门承载本计划；来源 Issue 要求计划、状态、依赖、证据和最终验收只维护在一处，提交可分批。
- **选项：** 单 change + 票据/Goal Plan 分批；Wayfinder 拆成多个 change 再由父 Implementation Map 集成。
- **推荐：** 单 change。
- **结论：** 一个 change 承载 #41 全部范围；实现按批次拆 Ticket 并用 Goal Plan 编排，每批独立提交，不写自动关闭 #41 的关键词。
- **原因：** 用户明确要求；总账本定在一处，拆 change 会制造第二套进度真相。
- **影响工件：** README / Spec / 后续 Tickets、Goal Plan
- **约束或不变量：** 存储大改与 UI 大改不进同一难以回滚的提交。
- **后续：** S 之后进入 Tickets 与 Goal Plan。
- **替代/被替代：** 无

## LOG-002 — 2026-10-31T03:50Z — 兼容策略
- **设计树节点：** D-002
- **轮次与依赖：** round 1 / 无
- **状态：** confirmed
- **问题：** 重构时是否保留旧接口、旧格式、旧样式别名的兼容层？
- **事实与来源：** #41 实施原则“不保留兼容层”与 §6 约束。
- **选项：** 不保留兼容层；保留过渡期双实现。
- **推荐：** 不保留。
- **结论：** 不保留永久兼容分支、双读双写、旧组件副本或历史别名；同一批次完成引用清点、消费者更新、旧实现删除与检查。§3.3 列出的保护语义（真实停止、Profile 锁、撤权与物理清除、来源版本绑定、审批与效果对账、秘密隔离、多窗口归属、未保存编辑保护、已提交事实可恢复）不可破坏。
- **原因：** 维护者决定；双实现会让验收无法收口。
- **影响工件：** ADR-001 / Spec 约束 / G1、G2
- **约束或不变量：** 不兼容不等于可以静默删除用户资料、弱化权限、跳过持久化屏障或隐藏失败。
- **后续：** 具体数据切换方式见 D-009、D-010。
- **替代/被替代：** 无

## LOG-003 — 2026-10-31T03:50Z — 停止生命周期方向
- **设计树节点：** D-003
- **轮次与依赖：** round 1 / D-002
- **状态：** confirmed
- **问题：** Bot Runner 停止的修复方向：撤掉关闭刷盘，还是保留持久性并分阶段报告真实完成？
- **事实与来源：** `Core.Close()` 固定 3 秒并把超时报成 `EXECUTOR_STOP_TIMEOUT`；`withinTx` 提交后持连接执行 TRUNCATE；永久 ADR-027。
- **选项：** 默认撤关闭刷盘/提前解锁；保留持久性，区分四种完成事实并把检查点移出业务调用。
- **推荐：** 后者。
- **结论：** 采用“保留持久性，明确分阶段停止与真实完成，解除请求路径中不必要的维护阻塞”。扩展现有 `RequestStop/Done/WaitClosed`，不新造 stop/done 系统；检查点改为 adapter-owned 有界维护，不增加第二条写连接。改变持久性承诺须单独记录产品取舍。
- **原因：** 维护者决定；与 ADR-027 一致。
- **影响工件：** ADR-002、ADR-003 / CONTEXT / Spec AC-28x
- **约束或不变量：** 超时不等于已停止；维护失败不改写已提交事实，也不触发业务重试。
- **后续：** Windows 实测比较 PASSIVE/RESTART/TRUNCATE（W2.8），结果写入实现 Evidence。
- **替代/被替代：** 无

## LOG-004 — 2026-10-31T03:50Z — 记忆依赖模型方向
- **设计树节点：** D-004
- **轮次与依赖：** round 1 / D-002
- **状态：** confirmed
- **问题：** 记忆依赖写放大采用什么存储模型？
- **事实与来源：** `sealEntries` 逐条 `closure()` 并写 `effective` 依赖。
- **选项：** 版本绑定的规范化直接依赖图 + 条目引用；不可变、按版本共享的依赖子图；只加缓存或索引。
- **推荐：** 直接图优先，共享子图作为有证据的备选。
- **结论：** 优先直接图；只有 W1.1 消费者盘点与访问成本证明直接图不合适时才改用共享子图，且须证明共享身份与失效规则。仅外包缓存而落库量不变不算完成。具体 schema 在 W1.1 决策记录后确定。
- **原因：** 维护者决定；把最终表结构绑定到测量结果。
- **影响工件：** ADR-004 / Spec AC-29x
- **约束或不变量：** 撤权、删除预览、物理清除、恢复与 lineage 仍能找到全部受影响对象；不引入无界递归。
- **后续：** W1.1 产出决策记录；schema 切换方式见 D-010。
- **替代/被替代：** 无

## LOG-005 — 2026-10-31T03:50Z — 技术栈与模块边界
- **设计树节点：** D-005
- **轮次与依赖：** round 1 / 无
- **状态：** confirmed
- **问题：** “不兼容”是否允许换技术栈或跨边界直改？
- **事实与来源：** AGENTS.md 结构与边界。
- **选项：** 不适用（维护者直接限定）。
- **推荐：** 保留。
- **结论：** 保留 TypeScript/React/Tailwind/Radix、Rust 辅助程序、Go Runner/Eino/SQLite、HAP 边界；模块之间只经 `api.ts`；React store 只是业务事实的投影。
- **原因：** 维护者决定。
- **影响工件：** Spec REUSE/OUT
- **约束或不变量：** 不改插件 id，不改成 Web 应用，不重写终端/编辑器。
- **后续：** 无
- **替代/被替代：** 无

## LOG-006 — 2026-10-31T03:50Z — 证据与验收纪律
- **设计树节点：** D-006
- **轮次与依赖：** round 1 / 无
- **状态：** confirmed
- **问题：** 什么算验收证据？
- **事实与来源：** #41 §6 证据约束与 §3 验收标准。
- **选项：** 不适用。
- **推荐：** 采纳。
- **结论：** 区分源码确认的机制、已报告现象、待复现假设、计划方案、已运行验证五类；没有再次失败不等于已修复；缺平台环境保持未验收；不靠删断言、无条件重试或全局放宽时限取得绿灯；每个勾选附 PR/commit、环境、命令/步骤与结果。
- **原因：** 维护者决定。
- **影响工件：** CONTEXT / Spec 验证策略
- **约束或不变量：** 历史数字不能包装成可重复基准。
- **后续：** 平台证据执行者见 D-012。
- **替代/被替代：** 无

## LOG-007 — 2026-10-31T03:50Z — UI 视觉方向与参考边界
- **设计树节点：** D-007
- **轮次与依赖：** round 1 / D-005
- **状态：** confirmed
- **问题：** W6 的视觉语言和外部参考边界？
- **事实与来源：** #41 W6；DESIGN-0001 DS-001–DS-006。
- **选项：** 不适用。
- **推荐：** 采纳。
- **结论：** 圆润、克制、内容优先的桌面工作台；单一 token 源；不引入第二套 UI 运行时或图表库；Galaxy 仅作固定版本 `adbd2adde0a299a3956ea288fb444ec01891ca41` 的精选改编来源，Radix Themes/Primer 只作比例与交互参考；所有复制/改编走 W8 来源登记。
- **原因：** 维护者决定。
- **影响工件：** Spec UI 部分 / 后续 change DESIGN
- **约束或不变量：** 拒绝紫蓝霓虹渐变、发光边线、大面积玻璃、卡片套卡片、`transition: all 1s`、hover 改变尺寸。
- **后续：** 设计基线的产出与批准路径见 D-013。
- **替代/被替代：** 无

## LOG-008 — 2026-10-31T03:50Z — 可选初始化与启动关键路径
- **设计树节点：** D-014
- **轮次与依赖：** round 1 / 无
- **状态：** confirmed
- **问题：** 首页可选恢复是保留永久 ADR 的 5 秒恢复上限，还是让可选恢复完全退出启动关键路径？
- **事实与来源：** #41 W4、A16“不等待任何可选读取”；永久 ADR `2026-10-31-home-cookie-restore-deadline` ADR-001；`netease-account.ts` 的 `restoreDeadlineMs = 5_000`。
- **选项：** 保留 5 秒上限；完全移出关键路径，由模块 lifetime 后台恢复。
- **推荐：** 完全移出。
- **结论：** 首页与工作台激活不等待任何可选账号/网络/凭据读取；保留迟到 Cookie 不能登录、计时器归所属窗口两项保护。
- **原因：** 维护者在来源中明确；5 秒上限只是既有缓解。
- **影响工件：** ADR-005 / Spec AC-161、AC-162
- **约束或不变量：** 后台恢复不使用无人负责的 `void promise` 或无限重试。
- **后续：** 对永久 ADR-001 的替代须在 change 完成后经 A 提升；G 不改永久 namespace。
- **替代/被替代：** 提议替代永久 ADR `2026-10-31-home-cookie-restore-deadline` ADR-001（待 A）

## LOG-009 — 2026-10-31T04:20Z — 默认可见目录名规范
- **设计树节点：** D-008
- **轮次与依赖：** round 2 / D-002
- **状态：** confirmed
- **问题：** `huhu/` 下 HUHU 生成的默认目录与固定文件名保留中文，还是改为固定英文 ASCII？
- **事实与来源：** `src/shared/storage/vault-layout.ts` 注释“Folder names are Chinese on purpose”；`src/modules/archives/core/resources.ts` 的 `个人档案/企业档案/基本信息.md`；#41 W5.1。
- **选项：** 保留中文固定名、仅本地化显示名；改固定英文小写 ASCII（kebab-case）。
- **推荐：** 改固定英文 ASCII。
- **结论：** 用户采纳推荐。新库中 HUHU 生成的默认目录与固定文件名统一为英文小写 kebab-case，一张表集中定义在 `vault-layout.ts`（及其调用方，不再各模块自定）并写入 `docs/data.md`；界面显示名全部经 `t()`。用户输入的标题、自定义名称与显式路径不翻译、不改写。
- **原因：** 原报告的正是英文界面看到中文目录；ASCII 路径对 Git、同步与命令行更稳；改动集中一处。
- **影响工件：** ADR-006 / Spec AC-191、AC-192、NFR-001 / CONTEXT
- **约束或不变量：** 语言切换只改变显示，不触发目录重命名；不保留代码层中文路径别名（ADR-001）。
- **后续：** 具体名称表在 W5.1 首张票中列清并写入 `docs/data.md`；旧库处理见 D-009。
- **替代/被替代：** 无

## LOG-010 — 2026-10-31T04:20Z — Bot Profile 新 schema 切换方式
- **设计树节点：** D-010
- **轮次与依赖：** round 2 / D-004
- **状态：** confirmed
- **问题：** 依赖存储 schema 变化后，旧 Profile 隔离保留还是一次性迁移？
- **事实与来源：** 永久 Bot ADR-003（SQLite 权威与设备本地 Profile）。
- **选项：** A 新建按 schema 版本隔离的新 Profile，旧 Profile 只读保留；B 显式触发、先备份的一次性迁移。
- **推荐：** A。
- **结论：** 用户采纳 A。新格式使用按 schema 版本隔离的新 Profile 位置；旧 Profile 原样保留，不覆盖、不删除、不迁移、不被新版本写入；首次启动明确告知旧数据位置与只读状态。不实现迁移器，不双读。
- **原因：** 来源允许；迁移器本身是需长期维护的兼容链。
- **影响工件：** ADR-007 / Spec AC-293、AC-902、NFR-001
- **约束或不变量：** 旧二进制不要求能打开新 Profile；新版本不得因看到旧 Profile 而锁定、修改或清理它。
- **后续：** 新 Profile 位置命名在 W1 决策记录中确定。
- **替代/被替代：** 无

## LOG-011 — 2026-10-31T04:20Z — 自动化通知名称语义
- **设计树节点：** D-011
- **轮次与依赖：** round 2 / 无
- **状态：** confirmed
- **问题：** 通知主文案用运行时名称快照还是当前名称？
- **事实与来源：** #41 W5.4。
- **选项：** 运行时快照；始终当前名称。
- **推荐：** 运行时快照 + 详情解析当前对象。
- **结论：** 用户采纳推荐。通知记录保存运行时名称快照作为主文案；详情按稳定 ID 解析当前自动化，已改名显示现名、已删除标注已删除；空名称显示本地化“未命名自动化”并保留可复制 ID。
- **原因：** 通知描述的是那一次运行；当前状态在详情里可追踪。
- **影响工件：** Spec AC-231 / CONTEXT
- **约束或不变量：** 去重、未读与关联身份保持；通知不含敏感参数。
- **后续：** 无
- **替代/被替代：** 无

## LOG-012 — 2026-10-31T04:20Z — 平台与实机验收的执行者
- **设计树节点：** D-012
- **轮次与依赖：** round 2 / D-006
- **状态：** confirmed
- **问题：** 哪些平台证据由 CI 提供，哪些由用户实机执行？
- **事实与来源：** #41 §6 证据约束、A16/A31/A35。
- **选项：** 见 D-012 推荐。
- **推荐：** CI runner 提供进程级证据；断电/骤停与真实 Obsidian 由用户；缺条件的项不挡其他批次合入。
- **结论：** 用户采纳推荐，并明确：所有真机验收（真实 Obsidian、Windows/macOS 实机、macOS 虚拟机骤停、三平台实机采样）由用户自己完成，agent 不执行、不跟踪、不为此准备额外清单。agent 负责的验证止于单元/DOM/合同/真实进程测试与 GitHub Actions Windows/macOS/Linux runner。真机项在 Spec 中标为“用户真机验收”，不计入 agent 交付的完成条件；未完成时不挡其他批次合入 dev，但挡住关闭 #41。
- **原因：** 用户决定。
- **影响工件：** Spec 验证策略、AC-163、AC-211、AC-251、AC-284、AC-311、AC-342、AC-351 / CONTEXT
- **约束或不变量：** agent 不得把 CI 或 DOM 结果写成真机通过；W7 等 #41 本身要求的可复跑脚本仍是产品范围。
- **后续：** 无
- **替代/被替代：** 无

## LOG-013 — 2026-10-31T04:20Z — 全插件 UI 设计基线
- **设计树节点：** D-013
- **轮次与依赖：** round 2 / D-007
- **状态：** confirmed
- **问题：** W6 是否先产出并批准 change DESIGN，再经 A 发布全插件设计 revision？
- **事实与来源：** DESIGN-0001 scope 仅 `huhu.workbench`；#41 W6。
- **选项：** 先原型与 DESIGN 再迁移；直接按来源文字迁移。
- **推荐：** 先原型与 DESIGN。
- **结论：** 用户采纳。B0 内经 `specdev-p-prototype` 产出 W6.18 三个真实内容原型与本 change DESIGN，用户批准后经 A 网关发布覆盖全插件的新设计 revision，B5/B6 才开始。批准前 Spec 的 UI 类 AC 不 Ready；非 UI 批次可先拆票实施。
- **原因：** 当前基线不覆盖全插件；不在 S 里替用户选风格。
- **影响工件：** Spec AC-351–353 / Tickets 依赖
- **约束或不变量：** change DESIGN 硬引用基线 revision/digest。
- **后续：** P 原型作为 B0 的一张票。
- **替代/被替代：** 无

## LOG-014 — 2026-10-31T04:40Z — 已有库的旧默认目录
- **设计树节点：** D-009
- **轮次与依赖：** round 3 / D-008
- **状态：** confirmed
- **问题：** 已存在旧中文默认目录的库，升级后首次加载如何处理？
- **事实与来源：** ADR-006；#41 §6“不得默认覆盖旧库、自动移动或清空用户文件”。
- **选项：** A 一次性把旧目录写成显式路径；B A + 用户触发的移动命令；C 不做任何处理。
- **推荐：** A。
- **结论：** 用户选择 C，未采纳推荐。不检测、不迁移、不读取、不写入旧中文默认目录，不提供移动命令；新版本只使用 ADR-006 的新路径。旧目录中的文件保持原样（不移动、不删除、不覆盖），由用户自行处理。
- **原因：** 用户说明 HUHU 尚未正式发布，旧默认目录属于发布前的兼容问题，按 ADR-001 不为其保留任何处理代码。
- **影响工件：** ADR-008 / Spec AC-192
- **约束或不变量：** 新版本不得对旧目录做任何写入、移动或删除；新路径与旧目录同时存在时也不合并。
- **后续：** 无
- **替代/被替代：** 无

## LOG-015 — 2026-10-31T05:00Z — 共识确认
- **设计树节点：** 不适用
- **轮次与依赖：** round 3 / D-001 至 D-014
- **状态：** confirmed
- **问题：** 设计树各分支是否已走完并达成共识？
- **事实与来源：** frontier 为空；用户回复“确认共识”。
- **选项：** 确认；补充遗漏节点。
- **推荐：** 确认。
- **结论：** 用户确认共识，设计树标为 consensus。
- **原因：** 用户决定。
- **影响工件：** design-tree / Spec 定稿 / Tickets、Goal Plan
- **约束或不变量：** 共识不授权提交、推送或发布。
- **后续：** 进入 Spec 定稿、Tickets 与 Goal Plan。
- **替代/被替代：** 无

## LOG-016 — 2026-10-31T05:19:23.625873+00:00 — UI 九项推荐批准、原型修复与设计绑定

- **状态：** confirmed，G-DESIGN 已关闭。
- **真实授权：** 当前承接会话用户“全部按你的推荐落盘”；随后反馈六页导航只能打开基础页，授权修复。旧 Orca 会话仅为只读上下文，未恢复其执行、未修改其 transcript。
- **决定：** 采用 A + C 等宽 ID + B 低密度分组；32/36/40 控件、44 触控、6/8/12/14 圆角、480/760 内容断点与 600/960 工作台断点；审批一次/拒绝、不确定不重复批准；终端异常持续显示；120ms 颜色过渡与加载例外在减少动效下关闭；窄容器 toast 顶部占位。完整不可变决定见 `<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/prototypes/UI-001/evidence/review-decisions.md</Path>`。
- **原型修复：** toast 移入容器顶部，≤480px 用正常文档流占位；导航改为直接切页按钮，保留深链接/前进后退，URL 写入被宿主拒绝时仍可切换。嵌入宿主原因是推断；在模拟锚点拦截及 URL 拒绝环境复测通过。
- **批准绑定：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/prototypes/UI-001/evidence/approval.md</Path>` 固定 change DESIGN revision 1、DESIGN-0002、HTML SHA-256 与完整 prototype digest；UI-001 ready，DESIGN approved。
- **A 发布：** DESIGN-0002 已写不可变快照、切换 current、重建索引并回读；DESIGN-0001 字节保持。工具默认 promotion 拒绝 active change（只读预检已保存）；按用户已批准“实施前发布全插件新版本”的具体指令执行本次 A-owned 人工发布，使用排他锁、CAS、无覆盖快照与回读；所有规则均 approved-intent，未伪造 completed，未修改工具或归档。见 `<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/prototypes/UI-001/evidence/publication-receipt.json</Path>`。
- **票据与门禁：** T-23–T-36 共 14 票绑定 design_ref，补充只读设计输入、组件复用与 Design Conformance 责任并重审 DoR；依赖、写集与 AC 数量不变。T-18 仍为 draft，AC-251 诊断及页面映射由其原门负责。Goal 保持 draft / ready_for_execution=false；本轮设计批准不授权生产实施、提交、推送或发行。
- **验证：** 19 项定向浏览器检查、42 张新截图、0 控制台异常；增加六页键盘可见焦点、近似 200% 缩放、减少动效检查。materialize --check、设计 --check-preview/--check-ready、SpecDev prototype/tickets/goal-plan、ticket-control 与 git diff --check 全通过（0 错误、0 警告）。具体回执见 `<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/prototypes/UI-001/evidence/closure-checks.json</Path>`。
- **纠正旧证据：** 原 REPORT 的“无遮挡”与旧 420px toast 截图不符；当前设计/技术评审已明确撤回该结论并引用修复后的截图。旧截图、旧浏览器记录和历史 REPORT 原样保留。未变组件状态/候选证据沿用，未声称本轮重跑全部旧案例。
- **未验证：** 真实宿主、触屏/IME、生产主题与全模块实施验收；未改生产源码，不运行插件构建。
- **下一步：** 从 Map 回读 Ticket 状态；取得生产实施授权后按既有依赖进入 I，不重复设计评审。

## LOG-017 — 2026-10-31T05:56:33.205Z — 采纳十项一致性审计建议

- **来源：** 本会话用户：“非常棒，全部按你的建议来。”对应上一轮列出的十组冲突/缺口。
- **决定：** 统一真机/独立组件验证边界、停止合同同批集成、token 收缩顺序、UI 文件与词典覆盖、Lead 来源/产物写入、EOF 诊断及 Windows 回归责任、fixture 性能口径；修正 AC 数量和陈旧设计状态；DESIGN-0002 保留人工发布例外的真实记录。
- **落点：** Spec、ADR/CONTEXT、design-tree、change DESIGN、Map/Goal、全部相关 Ticket 与 execution-boundaries。此授权仅覆盖文档/合同修订，不启动生产实现、不提交或推送。
- **证据：** 本轮设计范围批准及摘要见 prototypes/UI-001/evidence/approval-scope-revision-2.md；核对结果见本 LOG 后续验证条目。原始批准、源码、截图与发布回执不覆盖。

## LOG-018 — 2026-10-31T05:56:33.205Z — Browser 开发和修复全面暂停

- **来源：** 同一用户请求：“关于浏览器这部分，我需要你完全暂停相关的开发和修复。因为我之后会对浏览器进行完整的重构……避免触碰到浏览器相关的内容。”
- **决定：** ADR-009 冻结 Browser 模块、native runtime、Agent/Home/宿主集成、专用脚本/测试/文档/资产，以及共享文件里的 Browser 行为/路径/接口；T-34 仅留 Comments/Icons，T-29 排除网页面板。共享迁移不能改动冻结消费者，无法隔离的子项延期。
- **验收：** 不把 Browser 标为已修复/已迁移；它不属于当前 change 的实际交付。仅允许边界识别和不改冻结资产的通用只读检查。独立 Chrome/Chromium UI 测试工具不属于产品 Browser 冻结。
- **恢复：** 用户后续明确启动 Browser 重构/恢复开发时另行规划；任何其他票、整体检查或一般实现授权都不自动解冻。

## LOG-019 — 2026-10-31T06:01:57.354004+00:00 — 修订后的合同与范围核验

- **范围回读：** 38 张票保留稳定 ID；当前 33 ready、5 draft（T-07/T-18/T-19 诊断门，T-37/T-38 上游门）。这是本轮检查快照，后续状态以 Ticket 为准。Spec 38 条 AC 与 Map 一一覆盖，无遗漏/额外 AC。
- **语义核验：** 未排序的 worker 写集交叉为 0；共享来源、Home 词典、生成产物均声明唯一 Lead owner；T-04/T-05 共用停止生命周期资源。T-34 无 Browser 写集，T-29 无 WebPanel 写集，T-25 浏览器标签显式只读；全部票绑定 execution-boundaries。混合文件和共享消费者另按 ADR-009 保护。
- **命令：** validate-specdev.mjs --stage grill/spec/prototype/tickets/goal-plan（prototype 指定 UI-001）均 0 errors / 0 warnings；ticket-control 为只读，errors/warnings/diagnostics 为空、eligible=[]（Goal 实施未授权）。materialize-prototype.mjs --check 验证 3 个源码文件，validate-design-package.mjs --check-ready 有效。
- **设计绑定：** change DESIGN revision 2，designDigest `566034f112192e7d062540a1ce9051674b061d0475e61bf2a794825aad46f77b`；14 张 UI 票固定相同版本与摘要。prototype digest 仍为 `879ff0e8a5cfb47851e78f3a175003310a79a779058eed401782eec306f3e2c2`。原 DESIGN revision 1 保存为包内历史证据，原 approval/publication/browser 截图与证据不改；当前批准见 approval-scope-revision-2.md。
- **写入边界：** 本轮仅修改指定 change 内文档、票据与批准绑定。生产源码、Browser 文件、main.js/styles.css、永久 DESIGN/current/revision/INDEX 与原会话 transcript 均未改；未运行生产构建、生产测试、真机验收或远程写入。源码/视觉未变，本轮未重复运行原型交互；旧浏览器证据仅按原型摘要复用，不冒充新的生产结果。
- **剩余工作：** 独立 UI runner、性能采样脚本和各生产修复均是实施票的待交付内容，本轮未实现。生产实施需后续明确指令；Browser 全面暂停持续有效，不因其他实施授权自动解除。

## LOG-020 — 2026-11-02T02:30Z — 产品线收缩：删除 browser、huhubot、superbot

- **来源：** 用户 2026-11-02 请求：“我现在的目的是全面收缩产品线，帮我全面的将涉及到 browser浏览器、huhubot、superbot 这种相关的开发都全部的移除删除干净。不做任何的保留「所有的代码和功能都清理删除干净」如果涉及到优化重构的都删除掉。这两个功能模块将从我的产品线里移除。”补充：“优化修复的也别少，同时增加上针对 browser、huhubot、superbot 的删除「这部分的功能就不需要任何优化了，都删除清理干净即可」”。同日用户关闭了相关的 Browser 共享会话与 huhubot 重构规划，并删除对应的两个文档分支（不恢复、不带回其内容）。
- **决定：** ADR-010 取代 ADR-009；D-017–D-020 见设计树。superbot 指 huhubot 的 superhuhu 重构方向，代码层由 huhubot 覆盖（全仓检索无 `superbot` 命中）。
- **票据：** 取消 T-05（原 review）、T-07、T-08、T-10、T-11、T-33；新增 T-39–T-46 删除主线；修订 T-22、T-24、T-25、T-26、T-27、T-29、T-34、T-36、T-37、T-38 的依赖与范围说明；已完成票原样保留。
- **规划依据：** 规划期只读检索 dev `21336514`（`removal-inventory.md`）：browser 117 + 9 个模块/原生文件，huhubot 126 + 501 + 10 个；模块外消费者、服务键、动态入口、构建字符串、工作流与用户数据位置均有文件定位。逐文件终版由 T-39 产出。
- **边界：** 本轮只修改本 change 的规划文档，不改生产代码、测试、构建脚本，不开 PR、不动 main。删除主线实施授权需用户另行确认（2026-10-31 的实施授权覆盖原有票，新增范围按 AGENTS.md 补充确认）。
- **待确认：** D-018（Home 网页卡片/库内会话保留）为推荐默认（后由 LOG-022 推翻）；Runner 停止、依赖写放大、EOF 与 macOS 持久性的对象随 huhubot 删除，账本对应编号记“用户取消、功能删除”。除按用户要求把本规划文档提交并普通推送到 origin/dev 外，未做 Issue 评论/关闭、PR、合并或其他远程操作。

## LOG-021 — 2026-11-02T03:40Z — 产品线收缩规划核验

- **票据快照：** 46 张票：done 12（T-01–T-04、T-06、T-09、T-14–T-18、T-23）；cancelled 7（本次 6 张 + 历史 T-19）；in_progress 3（T-12、T-20、T-24）；ready 17（含新增 T-39、T-40、T-41）；draft 7（T-37、T-38、T-42–T-46）。状态以各 Ticket 为准。
- **合同：** Spec 新增 AC-401–AC-408，均映射到删除票；AC-281/282/283/284/291/292/293/301/341/342 在 Map 记为 withdrawn（OOS-008），仍保留原票引用。
- **命令：** `validate-specdev.mjs` 默认及 `--stage grill/spec/tickets/goal-plan/triage` 均 0 errors / 0 warnings；`ticket-control.mjs --map` errors/warnings/diagnostics 为空，新增票因 owner 未指派与授权未给出不进入 eligible。`pnpm test:docs` 退出 0（1733 个 Markdown，本次前基线 21336514 为 1719 个、同样退出 0，差额为新增 14 个文件）。
- **校验修正：** 首轮发现 T-05 的 Workspace Execution Record 仍为 active，与 cancelled 冲突，已改为 cancelled 并写明未执行原因；T-39 的 D-018 说明移出“未决问题”，改为上报条件，不改变其含义。
- **未改：** DESIGN.md（批准摘要被 14 张 UI 票绑定，改动会使绑定失效；UI-BOT 页撤回记录在 Spec OOS-008 与 T-33）、原型与发布证据、生产代码、测试、构建脚本。

## LOG-022 — 2026-11-02T03:10Z — D-018 改为删除；实施授权撤回

- **来源：** 用户 2026-11-02 10:47（UTC+8）答复：“1、网页卡片和网易云音乐应用库都删除干净 2、不需要我批准，直接开始继续实施就好了 3、关于huhubot相关的都关掉，如果ticket里有涉及到的也删除或者优化掉。完成整体的文档优化提交”。11:04（UTC+8）用户再次指示：先不要删除任何代码、依赖、测试、构建脚本或发行资产，只把文档改好提交到 dev，T-39–T-46 保持待实施。
- **执行事实：** 两次指示之间，Lead 已按第一条授权在 dev 推送 `dc5c1857`（删除 huhubot 插件侧、原生 Runner、HAP 与构建发行链）。收到第二条后用普通提交 `ff49ea39` 完整 revert，未改写历史；`ff49ea39` 的树与 `6f210e24` 一致。T-39–T-46 仍为待实施，未标完成。
- **D-018：** 推翻原推荐，Home 网页嵌入分区、网易云音乐整项功能与库内 Electron 会话一并删除；“网页快捷卡”保留（D-021，Lead 推荐，待用户确认）。D-019 补充遗留会话目录、旧分区 Cookie、看板 `web` 分区配置与音乐字段的忽略规则。
- **合同：** AC-161、AC-162 按 OOS-008 扩展撤回（T-14 已完成，交付物随 T-42 删除）；AC-406 改写；AC-351 不含网页分区与音乐。T-42 增加 Home 删除范围、依赖 T-41、承担 AC-406 的 Home 部分；T-44 删除 `src/host/desktop/browser-session*.ts`；T-29 改为只统一媒体子项并依赖 T-42。Map 升至 plan_revision 25。
- **huhubot 票据：** 涉及 huhubot 的未完成票 T-05、T-07、T-08、T-10、T-11、T-33 已取消（LOG-020）。specdev 要求 Ticket ID 稳定、每条 AC 有负责票，取消票不能物理删除，保留作取消记录；已完成的 T-04、T-06、T-09 加处置说明，交付物将由 T-40/T-41 删除。
- **DESIGN.md 未改：** 其批准摘要被 14 张 UI 票绑定，修改需用户重新批准（P 流程）。本轮在 Spec 记录 UI-HOME 的音乐账号状态与 UI-BOT 对本 change 失效，实施方不得据此实现；需要重新发布设计时另行走 P 流程。
- **账本：** 音乐账号（A16 部分）与 huhubot 各项记“用户取消、功能删除”。

## LOG-023 — 2026-11-02T03:12Z — D-021 确认；change DESIGN revision 3

- **来源：** 用户 2026-11-02 约 11:12（UTC+8）答复：D-021 确认，网页快捷卡保留，只去掉“打开方式”选项；DESIGN.md 授权直接修改，原话大意“你直接改，不需要我批准设计，相当于把 bot 和浏览器这部分删除了而已”。按该授权，revision 3 视为已批准。
- **D-021：** 状态改为用户确认；T-42 只删除 `openIn` 选项，卡片改用系统浏览器打开。
- **DESIGN revision 3：** 删除 UI-BOT 页面、UI-HOME 的 `music-restoring` 状态与音乐账号恢复描述、Browser 冻结相关表述；新增“Revision 3 删除范围”。designDigest `78dd227f70b86804078218988b35850af8f2078a02ea791486dfb5b6f65d689f`，批准记录 `prototypes/UI-001/evidence/approval-scope-revision-3.md`；基线 DESIGN-0002 与 prototype digest `879ff0e8…` 不变（原型 `final/`、`comparison/` 未改，原浏览器证据仍有效）。
- **绑定：** 19 张带 `design_ref` 的票改绑 revision 3 与新摘要，T-33（已取消）移除 UI-BOT；已完成的 T-16、T-18、T-23 在 Evidence 的 Design Conformance 中追加重新绑定说明（页面与验收映射未变，未重新运行）。
- **未改：** 永久 DESIGN-0002、revision/INDEX、发布回执、原型视觉与交互源码；生产代码未改，删除主线 T-39–T-46 仍待实施。

## LOG-024 — 2026-11-02T03:20Z — 来源切换

- source 于 2026-11-02 切换到新 issue #41（按用户要求以最新状况完整重写的唯一来源）；本 change 的文档只以 #41 为需求来源。
- 同步改写本 change 全部文档中的来源引用（README、triage、Spec、Map、Goal Plan、ADR、CONTEXT、设计树、diagnosis、票据、Evidence、diagnostics、sessions）；diagnostics 中被改写的观测文件已同步更新所在目录的 SHA-256 清单。原型 `final/`、`comparison/` 及 `design-system.md` 内嵌的同一源码未改，因其与浏览器证据的 prototype digest 绑定。

## LOG-025 — 2026-11-02T10:10Z — evidence 不入库；删除 docs/e2e

- **来源：** 用户 2026-11-02 要求：specdev change 下所有 `evidence/` 目录不再跟踪；删除整个 `docs/e2e/` 目录。
- **evidence：** `.gitignore` 新增 `/.agents/speculo/.speculo/specdev/changes/**/evidence/`，取消跟踪 2084 个文件（约 478 MB），本地磁盘保留（提交 `f533a696`）；归档文档中 90 处指向 evidence 的链接改为纯文本路径（`ffac3a0d`）。全新克隆中本 change 的 validate-specdev 会因已完成票（T-01–T-04、T-06、T-09、T-14–T-18、T-23）缺少 `evidence/T-xx.md` 及 DESIGN 批准记录 `prototypes/UI-001/evidence/approval-scope-revision-3.md` 缺失而报错；保留本地文件的工作区仍 0 错误。处理方式待用户决定（见汇报），校验器未改。
- **docs/e2e：** 整个目录删除（814 个文件，约 130 MB）；Hook 测量 workflow、`run-measurement.mjs` 与启动采样测试的输出改到被忽略的 `temp/dev-overhaul/`；`docs/huhu-bot-performance.md` 的失效链接改为文字说明。票据、会话与归档中的 `docs/e2e/...` 路径保留为历史记录，统一账本新位置待用户决定。

## LOG-026 — 2026-11-02T13:10Z — evidence 只入库检验结果报告

- **来源：** 用户 2026-11-02 定下整体规则：入库的只能是检验结果报告 md，即检查后形成的结论，写明通过或不通过、不通过的原因；构建文件、代码、截图、patch、评审输入 JSON、日志、哈希清单等不入库。规则已写入 AGENTS.md「完成标准」。
- **.gitignore：** `changes/**/evidence/**` 默认忽略，只放行进行中 change 的 `evidence/T-xx.md`、`evidence/report*.md` 和 `prototypes/*/evidence/approval-*.md`。归档 change 的 evidence 仍全部不入库：其中的报告混有大段评审输入，未逐份精简。
- **入库报告：** 本 change 共 25 份：23 份票级报告和 2 份 UI-001 批准记录。其中 13 份（T-01、T-02、T-03、T-04、T-05、T-06、T-09、T-14、T-15、T-16、T-17、T-18、T-23）删去了 `Review Input` 各节里的冻结评审输入 JSON（含历史轮次），每节改为范围、base/head、路径计数、input_sha256 和排除说明的摘要。原有锚点保留，其余结论、偏差、验收记录不变。原文件保留在本地被忽略的 `evidence/_local-full/`。其余 12 份本来就是结论报告，未改动；`approval-scope-revision-3.md` 的字节由 DESIGN confirmation.record 绑定，也未改动。
- **校验影响（未改校验器）：** 12 张已完成票的 Review 记录 `Input: evidence/T-xx.md#review-input…` 按现有合同要求锚点内恰好有一份冻结 JSON，且 `JSON.stringify` 摘要要与 Standards/Specification Output 的 Input-SHA256 一致。删去 JSON 后，这 12 张票各报 `Input must reference one frozen review JSON object`，本地和全新克隆都一样。执行记录 checkpoint 也绑定这个 Input，所以不能只改指向。待用户在两条路里选：由框架让校验器只校验报告结论与 input_sha256（Speculo#102），或者对这 12 份临时放行各自唯一一份冻结 JSON（其中 7 份会超过 100 KB）。

## LOG-027 — 2026-11-04 — 全部票据实施与整体验收

- **来源：** 用户 2026-11-03 /goal 指令：按本 change 全部文件完成所有 ticket，每票完成后提交并推送 dev，使用 subagent（限 sonnet），无需考虑任何兼容性；该指令同时授权删除主线 T-39–T-46 实施，取代 LOG-022 的撤回。2026-11-04 用户补充：CI/CD 问题之后统一解决，先完成代码开发与本地确认。
- **执行：** Lead host:claude-code/root，执行者为 sonnet subagent；current 工作区（dev），每票单独提交推送，提交引用 #41（Refs）。`docs/e2e` 不重建，账本改为 `evidence/report-ledger.md`。
- **结果：** T-12、T-13、T-20–T-32、T-34–T-46 完成；全量 build/lint/test/docs/i18n/bundle/notices/native 通过；残留检索 0。未验收项：AC-311 Windows 多轮复核、release 工作流实跑（CI 待统一处理），以及用户真机项。
- **待 A 网关：** T-45 列出的永久 ADR/context 修订清单（huhu-bot-architecture ADR-027 等失去对象）。

## LOG-028 — 2026-11-04 — AC-311 关闭与 change completed

- **来源：** 用户 2026-11-04 授权为 AC-311 例外运行 Windows CI（AskUserQuestion 选择"现在处理 AC-311"）。
- **修复：** T-21 压缩器 CRLF 缺陷（6d8e034）、全局数据槽位随机起点（9287af1）、收集器等待按剩余时限提升优先级与 stdin 提前创建（450263d）；文档检查 CLI 用例按项目惯例声明进程级时限（338f26a）。容量与 3 秒时限未改。
- **验证：** hook-windows run 41752095795 连续两次 20/20；dev 338f26a 全部 CI success；本地全量 pnpm test 4227 例通过。
- **结论：** Lead 按 change-completion 将 Outcome 改为 completed；release 工作流（发版）未授权，not-applicable；真机项由用户验收（LOG-012）；#41 关闭由用户决定。待 A 网关：T-45 列出的永久 ADR/context 修订。

## LOG-029 — 2026-11-04 — 发布前旧数据兼容整体删除

- **来源：** 用户 2026-11-04："针对旧数据的问题，请你完成整体的重构删除，无需兼容任何旧数据。保证最新的代码和文档一定是最新的，符合当前代码情况的。不需要什么V1适配。因为我还没有最终发版"。依据 ADR-011。
- **执行：** 4 个 sonnet 执行者按 agent / archives / home+comments / safe+versioning+storage+host 并行，多轮收尾；Lead 复核、二分、按区域提交推送（b79c3e3 … fae97ef 及本条提交）。
- **结果：** 旧格式读取与升级链、旧路径/设置键、旧导入界面、退役集成（含凭据字段）、旧 helper 能力降级、旧字段双写/回退全部删除；遇旧数据走当前无效/损坏路径且不改写文件；设置归一化只保留当前字段。删除误伤 `SyncEngine.replaceData` 一处已修复并补单元回归。
- **证据：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/evidence/report-legacy-removal.md</Path>`。

## LOG-030 — 2026-11-04 — 归档：证据模式、知识沉淀与封存

- **来源：** 用户 2026-11-04 要求按 A（归档与整合）归档本 change；`archive-ready` 初测 359 条错误，全部源于校验器要求过程材料（9 固定章节、执行记录、冻结评审 JSON、Skill 执行记录、原型浏览器 JSON），与仓库"evidence 只入库结论报告"规则（AGENTS.md、LOG-026）冲突。用户决定：现有 evidence 符合要求，冲突时改造规则；同时做 ADR/context 修订沉淀并完成归档移动。
- **规则改造（936526a）：** 校验器新增显式声明的 `Evidence-Mode: conclusion-report` 模式（README 声明 Evidence-Basis，可选 History-Rewrite 说明不可达 base_sha）；该模式改为校验结论报告而不要求过程材料，真实性检查（依赖、状态、Outcome 门、设计批准摘要、delivery/publish 门）保留；未声明的 change 行为不变；校验器测试 83 通过。
- **change 修正：** 12 份早期 evidence 补 `## 结论`/`## 验证`；T-12/T-13/T-20/T-42/T-44/T-46 的 partial 按后续补齐的事实改为 passed 并保留原因；T-40/T-42/T-43 补 Design Conformance；T-46 登记 AC-406 撤回；新增 `evidence/final-review.md`。`archive-ready` 0 错误。
- **知识沉淀（379048a）：** 新增 ADR 与 context，旧 huhu-bot、home-cookie-restore-deadline 标 Superseded，Browser 与 agent-workbench 相关条款按取代关系修订；dev Skill 持久化条目改为只支持当前格式。明细见 `archive-plan.md`。
- **未处理：** DESIGN（revision 3 删除 UI-BOT 等范围）未走 DESIGN 网关；release 工作流未运行（发版未授权）；真机项由用户验收。

