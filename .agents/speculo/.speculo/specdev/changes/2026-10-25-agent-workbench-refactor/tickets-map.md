---
schema_version: 3
plan_contract_version: 1
plan_revision: 40
requested_deliverables: [{"name":"代码交付覆盖并交接人工验收的 OS/架构组合","count":5}]
deliverable_policy: "用户未指定 Ticket 数量；按 64 项 AC 和真实接缝拆为 18 票。五平台来自 Q8/AC-063；用户本轮接手真实 E2E，Agent 交付代码/构建配置及人工步骤，不以交叉编译声称实机通过。"
artifact: tickets-map
change: 2026-10-25-agent-workbench-refactor
status: ready
---

# Tickets Map：HUHU 终端 Agent 工作台

- **Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>；**设计：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/DESIGN.md</Path>。
- **Ticket 目录：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/</Path>；**实施 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/</Path>。
- **公共实施合同：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path>；**开源参考：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>。
- **Goal Plan：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/goal-plan.md</Path>；Wave/Gate、Agent Team、模型、调度与恢复的唯一权威。
- **规划审查：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/tickets-review.md</Path>（T）与 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/goal-plan-review.md</Path>（Goal）；不代表产品已验收。

## 1. 目标与拆分策略

交付现有 HUHU 内的 Herdr 式终端组织与控制：真实 PTY/Agent、Space、独立后台运行、同 Vault 明确寻址、CLI 输入/等待/读屏、面板控制、被动邮箱、原生人工审批、当前 Vault 历史及精确继续。保留现有六种 CLI 入口、账号与自动化原生结果合同、共享网页体验。以已采用 A 为生产 UI 的依据；不扩展为 Run/Outbox、独立 Chat、业务 DB 或远程守护服务。

**执行入口：** 用户已授权实现，Lead 与实际执行者调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>，再按当前输入实际调用项目 Skill。I 拥有固定快照、独立双轴审查、验证与实施 Evidence。本轮进入 run；无提交、推送或发版授权。

### 总体实施背景

源码探索基线 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`。现有 React/xterm/headless、workspace layout、Rust portable-pty、历史解析与 Cookie reader 均可复用。<Path>src/modules/agent/services/controller.ts</Path> 和 TerminalSessions 当前集中了生命周期；<Path>src/modules/browser/module.ts</Path> 经 Agent 服务取得网页承载及 Cookie reader。先解除这个真实阻碍，再将身份、运行、观察与显示分别接通。

T-01 是有独立停用隔离价值的 prefactor。T-02–09 逐步形成空 Space → 真终端 → 停止/恢复 → 屏幕/状态 → 外部 CLI → 真实协作 → 双向面板的可演示路径；不是按“先写所有后端、再写所有前端”分层。T-10/11/13 分别交付邮箱、历史、独立网页，T-12 在准确历史上继续。T-14 收缩兼容接线，T-15/16 对最终数据 owner 做迁移与恢复，T-17/18 完成同批资产与真实平台验收。

跨票顺序与接口见公共实施合同，不能从原始输入恢复已撤回的 schema/错误码。CLI v1 的拼写、回执、effects/退出码为计划约定，尚未发行；实际用例、schema、帮助与 Skill 必须一致。早期新格式仅在隔离测试库运行；完成 T-15 的单 writer 迁移前不能让新旧 writer 写同一业务文件。

### 项目 Skill 读取矩阵

先完整读 Map，再按入口触发条件完整读项目 Skill，最后进入当前 Ticket。下面是最低必读集合，不是 allowlist；发现新的真实适用 Skill 时先修订绑定与本表。每票 implement/verify 绑定包含真实入口/参考摘要、输入输出和失败动作；仅阅读不算执行调用。

| Applies To | Project Skill | Trigger / Scope | Read Timing | Purpose |
|---|---|---|---|---|
| ALL | <Path>.agents/skills/dev/SKILL.md</Path> | TypeScript/Rust、模块装配、持久化、兼容、测试、资产/CI 或技术文档 | Map 后、Ticket 前；implement/verify 实际调用 | 维护模块边界、懒加载、数据归属、许可及适用验证 |
| T-02, T-03, T-04, T-05, T-06, T-08, T-09, T-10, T-11, T-12, T-13, T-14, T-15, T-16, T-18 | <Path>.agents/skills/ui/SKILL.md</Path> | 本票负责 UI 交互/状态、共享视图、设计验收或截图 | Map 后、Ticket 前；implement/verify 实际调用 | 按已批准 DESIGN、现有组件及无障碍规则实施和验收 |

## 2. 执行清单

| ID | Ticket | 可观察交付与跨票导航 |
|---|---|---|
| T-01 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/01-native-owner.md</Path>：共享原生宿主与按需能力租约 | 关闭 Agent 或最后一个终端时，仍在用 native Cookie/历史能力的消费者能完成；没有使用相关能力时不启动 helper、扫描或下载。 依赖与汇合见 §3。 |
| T-02 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/02-space-identities.md</Path>：可持久化的 Space、目录授权与单写入者 | 用户能创建/重命名空 Space，两个同 cwd 的 Space 独立；库外目录必须明确选择，保存失败不产生不可追踪进程。 依赖与汇合见 §3。 |
| T-03 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/03-managed-runtimes.md</Path>：真实终端启动、后台运行与重新附加 | 用户或控制用例可创建真实 Shell/Agent；后台运行不抢焦点，关 Pane 后可重新附加原 runtime，重复打开不生成第二个进程。 依赖与汇合见 §3。 |
| T-04 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/04-stop-and-recovery.md</Path>：明确停止、归档与宿主恢复 | 停止只结束指定代次；归档先收束运行并保留历史，部分失败可见；宿主退出后恢复记录而不自动执行。 依赖与汇合见 §3。 |
| T-05 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/05-screen-stream.md</Path>：权威屏幕、重同步与有界流控 | 多个观察者看到同一终端；订阅/resize/重连不丢字重复，慢观察者不会拖死其他终端或 stop。 依赖与汇合见 §3。 |
| T-06 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/06-activity-and-approval.md</Path>：Agent 状态与 HUHU 内原生人工审批 | 受管 Shell 手动启动 Agent 后可发现能力；后台待处理可定位原终端，用户批准/拒绝后继续该会话；不可靠识别显示未知。 依赖与汇合见 §3。 |
| T-07 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/07-local-cli.md</Path>：本机 CLI、精确寻址与机器协议 | 外部 huhu CLI 能准确发现当前实例和目标；默认当前 Space、明确同 Vault 跨 Space，跨 Vault/过期运行拒绝；慢扫描不堵控制。 依赖与汇合见 §3。 |
| T-08 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/08-terminal-coordination.md</Path>：输入仲裁、状态等待与有界读屏闭环 | Agent A 通过 HUHU CLI 给 B 提交输入、等状态并读屏/查产物；键盘/粘贴/CLI 不交错，wait 超时或取消不会停止/重发。 依赖与汇合见 §3。 |
| T-09 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/09-workbench-panels.md</Path>：A 方案工作台与双向面板控制 | 用户获得已批准 A 布局；CLI 附加、聚焦、分屏、调比例与关闭视图可立即在 GUI 看到，双方查询一致。 依赖与汇合见 §3。 |
| T-10 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/10-passive-inbox.md</Path>：被动通知邮箱与主动读取确认 | Agent 可给同 Vault 明确目标留消息；目标停止时消息仍在，接收方主动读取、显式 ack，界面显示未读且不启动模型。 依赖与汇合见 §3。 |
| T-11 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/11-vault-history.md</Path>：本 Vault 历史摄入、检索与只读预览 | 右侧只列当前 Vault 的全部 Space/归档/可归属记录；筛选和预览稳定，坏来源局部降级，外库正文不污染索引。 依赖与汇合见 §3。 |
| T-12 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/12-native-resume.md</Path>：精确继续、来源导入与原生占用保护 | 用户可从历史继续准确原生会话，活动时只附加；同时继续只产生一个 HUHU 写运行，缺来源不偷建空会话。 依赖与汇合见 §3。 |
| T-13 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/13-independent-browser.md</Path>：共享标签承载与浏览器独立运行 | 没有 Space 或 Agent 已关闭时仍能打开/恢复网页和导入 Cookie；共享标签体验、资料引用和分屏保留。 依赖与汇合见 §3。 |
| T-14 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/14-consumer-compatibility.md</Path>：既有消费者兼容与旧控制接线收缩 | 所有既有消费者使用新运行/宿主接线继续工作：原生完整答案、existing 只粘贴、技能只读与移动端轻量入口均保持。 依赖与汇合见 §3。 |
| T-15 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/15-data-migration.md</Path>：旧工作台数据迁移、恢复与 writer 收缩 | 旧用户升级后得到明确导入空间，原布局/身份/标注可核对；迁移中断可恢复，新版写入后回滚不会被旧 writer 覆盖。 依赖与汇合见 §3。 |
| T-16 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/16-backup-restore.md</Path>：HUHU 业务备份、导入预检与恢复 | 用户导出后能在空环境完整恢复 HUHU 自有记录，清楚看到原生全文/凭证缺项；坏包、冲突或目录失效不会覆盖有效数据。 依赖与汇合见 §3。 |
| T-17 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/17-cli-delivery.md</Path>：CLI 资产、配套 Skill 与交付一致性 | 每个正式平台可获得匹配的 helper/CLI；帮助、schema、Skill 示例对应真实功能，错版本/无效摘要不执行，源码与产物及声明一致。 依赖与汇合见 §3。 |
| T-18 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/18-platform-acceptance.md</Path>：五平台真实主链与全页面验收 | 同一候选源码/资产在 Windows x64、macOS x64/arm64、Linux x64/arm64 各有实际主链证据，四个页面的生产交互与已批准 A 一致。 依赖与汇合见 §3。 |

本表只导航实际 Ticket 和静态合同。状态、Ready、执行 owner、深度、风险及写集从各 Ticket frontmatter 回读，实际 workspace 与完成结果从本票 Evidence 回读；Map 不缓存进度。`status: ready` 只表示 Map 合同就绪。

T13 scope revision 38：为实现同一 v2 layout/Space writer 跨 Agent disable 的共享 owner，T13 现扩展到 app/shell shared-workspace provider、ModuleContext 注入、AgentController/WorkspaceStore/WorkspaceService 生命周期适配、Browser/Agent renderer 接线及对应测试。该修订保持 AC-041 的行为合同，不允许 Browser 自建第二 writer 或以 `peek` 冒充独立运行。

T11 recovery scope revision 39：恢复 T11 blocked 阶段，扩展到 ControlCommands/controller 的生产接线、canonical history operation schema/generated wire、持久 sourceRef→Space owner 所需的 Space/Workbench records 与 native history DTO，以及安全来源状态的 native fixtures/tests。OpenCode/SQLite 只在已证明的安全 source gate 下读取；不能用路径复核、NOFOLLOW 或事后拒绝冒充 F1/F2/F3 关闭，无法安全打开时必须持久化明确 unavailable/unsupported 状态并保留来源元数据。

T13 scope revision 40：补齐 Browser resource page 的显式关闭合同。共享持久 tab 只有用户明确关闭资源时才删除；Workbench unload/Agent disable 只释放渲染 surface。Shell page binding/close path 与 Browser contribution tests 纳入本票写集，避免只移除 UI entry 而遗留 shared tab。

## 3. 依赖 DAG

```text
T-01 → T-02 → T-03 → T-04 → T-05 → T-06 → T-07 → T-08 → T-09
                                                                  ├→ T-10 ─────┐
                                                                  ├→ T-11 → T-12 ┤
                                                                  └→ T-13 ─────┤
                                                                              ↓
T-14 → T-15 → T-16 → T-17 → T-18  ←─────────────────────────────────────────────┘
```

箭头只表示前置产物完成，不表示线程/Agent 或新工作区。为避免图形换行误解，唯一依赖源仍是 Ticket 的 `blocked_by`；T-14 的直接前置恰为 T-10、T-12、T-13。

| 边 | 真实开始条件 |
|---|---|
| T-01 → T-02 | 原生资源与模块惰性装配已解耦，新增 Space 读取不会带起 helper 或跟随 Agent 错误回收 |
| T-02 → T-03 | 持久身份/目录授权与单 writer 能先提交，再创建可追踪运行 |
| T-03 → T-04 | 有真实运行代次、attach/detach 后才能证明显式停止与退出收束 |
| T-04 → T-05 | 快照/resize/背压引用已定义的运行终止及 generation 失效规则 |
| T-05 → T-06 | 屏幕/序号来源可靠后才能判断或解释活动状态与原生审批 |
| T-06 → T-07 | 对外公开真实状态、能力与错误；可区分 blocked/unknown，而非伪造空闲 |
| T-07 → T-08 | 输入仲裁/等待经可运行 CLI、同 Vault 身份校验与机器回执做黑盒验收 |
| T-08 → T-09 | 面板控制绑定已验证的真实运行、输入/状态，不以新一轮模拟原型替代 |
| T-09 → T-10 / T-11 / T-13 | 三项均接入同一实际共享布局、焦点与 GUI/CLI 扩展接缝 |
| T-11 → T-12 | 准入与完整来源引用已固定，才能安全恢复/导入与检查跨实例占用 |
| T-10 / T-12 / T-13 → T-14 | 邮箱、历史继续与独立网页公开用例齐备，消费者迁移后才能收缩旧控制接线 |
| T-14 → T-15 | 新写入方与兼容消费者已收敛，才能按最终归属转换旧数据并切单一 writer |
| T-15 → T-16 | 可复用已验证的版本预检、暂存转换与恢复切换，覆盖完整自有格式 |
| T-16 → T-17 | 所有首轮用例齐备后才固定可发行 capabilities、资产和逐个可执行 Skill 示例 |
| T-17 → T-18 | 五平台验收使用同一组匹配的真实 helper/CLI 和生产插件产物 |

## 4. 合同覆盖矩阵

下表给每项 AC 一个主要完成责任；GUI 各票另外承担自身 `design_ref` 内的 AC-061 局部一致性，T-18 负责四页整体生产验收。不能因局部 UI 已通过而跳过真实运行证据。64 项均有最终代码验收 owner，无 uncovered。早期切片必须完成本地生产能力与自动化，依赖后继能力的组合验证归最终生产者，不形成前票等待后票的循环。

| Contract ID | 覆盖 Ticket | 验证接缝 | 状态 | 说明 |
|---|---|---|---|---|
| AC-001 | T-02 | V-01、V-08 | covered | 记录存在；无 PTY/Agent；可重命名且 ID 不变 |
| AC-002 | T-10 | V-01、V-02 | covered | ID、布局、邮箱与归属独立；不按目录合并 |
| AC-003 | T-02 | V-01、V-04 | covered | 使用该目录，历史仍归当前 Vault/Space；目录被替换/撤销时拒绝 |
| AC-004 | T-07 | V-01、V-02、V-08 | covered | GUI 引导选择；CLI 给缺目标/歧义结果；不猜 Space |
| AC-005 | T-03 | V-03、V-08、V-10 | covered | 账号/程序配置保留；缺程序或缺能力可解释；实际 CLI TUI 可操作 |
| AC-006 | T-07 | V-02、V-03、V-08 | covered | B 无可见 Pane 也运行/可查；不抢 A 焦点 |
| AC-007 | T-06 | V-03、V-06 | covered | 能力按证据更新；不支持时显示未知且保留原始终端控制 |
| AC-008 | T-03 | V-01、V-02、V-08 | covered | 附加原 runtime；不启动第二个进程 |
| AC-009 | T-09 | V-01、V-02、V-08 | covered | 两端查询一致；目标稳定；不改变 Session 的 Space 归属 |
| AC-010 | T-07 | V-02、V-06 | covered | 协议与 Vault/物理绑定一致；失效或错实例明确拒绝 |
| AC-011 | T-07 | V-02、V-03 | covered | 默认范围当前 Space；明确目标可跨 Space；结果带原归属 |
| AC-012 | T-07 | V-02、V-06 | covered | 无越界效果；错误说明目标不属当前实例或已失效 |
| AC-013 | T-08 | V-02、V-03、V-06 | covered | 文本+提交顺序一致；返回输入阶段信息，不宣称任务成功 |
| AC-014 | T-08 | V-03、V-06 | covered | 操作不交错成第三条命令；取消未开始输入后不迟到提交 |
| AC-015 | T-08 | V-02、V-03 | covered | 明确拒绝；不向权限/登录界面注入任务正文 |
| AC-016 | T-08 | V-02、V-03 | covered | 不把旧 idle 当新完成；独立 wait 可立即匹配；已有 working 情况可见 |
| AC-017 | T-08 | V-02、V-03、V-06 | covered | 结束当前等待；B 继续；不自动重发/停止；查询仍可核对 |
| AC-018 | T-08 | V-02、V-06 | covered | 输出有界，身份/截断/位置准确；不主动滚动 TUI 或把屏幕称为完整答案 |
| AC-019 | T-17 | V-02、V-11 | covered | 命令与发行版本一致；stdin 长正文可用；错误分类不依赖中文文案 |
| AC-020 | T-06 | V-03、V-08、V-10 | covered | 在 HUHU 定位原终端；用户能批准或拒绝并继续该会话 |
| AC-021 | T-08 | V-02、V-03、V-08 | covered | 不自动放行、不换后端重放；未知准确显示；失败留查看入口 |
| AC-022 | T-06 | V-04、V-07、V-08 | covered | 保留选择与首次确认；不无声升级权限 |
| AC-023 | T-10 | V-01、V-02、V-07 | covered | 持久通知与未读可见；无 PTY 输入/模型启动 |
| AC-024 | T-10 | V-01、V-02 | covered | 读取与确认分开；ack 重复无额外副作用；分页稳定 |
| AC-025 | T-10 | V-02、V-04、V-07 | covered | 可判定拒绝或来源失效；未发生写入不报成功；效果未知不盲重发 |
| AC-026 | T-03 | V-03、V-06、V-08 | covered | 进程继续；可接回同一屏幕与运行；有后台提示 |
| AC-027 | T-04 | V-03、V-06 | covered | 区分请求和已退出；只处理目标代次；失败/残留可见 |
| AC-028 | T-04 | V-01、V-03、V-08 | covered | 取消无影响；归档先收束，部分失败不伪称完成；历史/消息保留 |
| AC-029 | T-04 | V-03、V-06 | covered | 新状态、标题和终端不被旧事件污染 |
| AC-030 | T-08 | V-06、V-08、V-10 | covered | 保留现有输入保护；组字不提前提交；复制与中断语义不退化 |
| AC-031 | T-05 | V-06、V-08 | covered | 尺寸 owner 明确；屏幕一致；设备回复一次 |
| AC-032 | T-05 | V-06 | covered | 无丢失/重复；UTF-8/ANSI 完整；失同步可重建展示 |
| AC-033 | T-11 | V-04、V-08 | covered | 默认本 Vault 全 Space；可筛选；读历史不启动 PTY |
| AC-034 | T-11 | V-04、V-07 | covered | 不把无归属正文摄入当前库；授权库外 Session 依绑定归属 |
| AC-035 | T-11 | V-04、V-08 | covered | 元数据/标注保留；准确缺失/部分/不支持；其他来源继续可用 |
| AC-036 | T-11 | V-04、V-08 | covered | 稳定分页或明确刷新；不静默重行漏行；结果与筛选一致 |
| AC-037 | T-12 | V-03、V-04、V-08 | covered | 活动只附加；已结束精确 resume；保持 Session 身份、新代次 |
| AC-038 | T-12 | V-04、V-06、V-10 | covered | 至多一个 HUHU 可写运行；其他定位或报冲突；无隐式 fork |
| AC-039 | T-12 | V-04、V-08 | covered | 明确失败，不新建空会话替代；fork 仅显式操作 |
| AC-040 | T-12 | V-01、V-04、V-07 | covered | 预览不建 Session；导入精确去重；保留源与归属证据 |
| AC-041 | T-13 | V-05、V-08 | covered | 网页独立可用；Cookie 不激活 Agent；原入口/标签体验保留 |
| AC-042 | T-14 | V-03、V-05 | covered | 一次粘贴、不回车；就绪超时/会话失效准确失败 |
| AC-043 | T-14 | V-03、V-05 | covered | 原生完整答案及原失败语义保留；不以屏幕文本冒充答案 |
| AC-044 | T-14 | V-05、V-08 | covered | 原服务消费者可用；existing 投递仍只粘贴；只读不启动模型 |
| AC-045 | T-14 | V-05 | covered | 轻量技能继续可用；无 Node/PTY/桌面控制器加载 |
| AC-046 | T-10 | V-01、V-07 | covered | 不返回成功；不先启动关联新进程；保留旧数据和诊断 |
| AC-047 | T-15 | V-04、V-05、V-07 | covered | 导入空间、身份与旧布局可核对；敏感源和原生日志保持 |
| AC-048 | T-15 | V-07 | covered | 保留源与恢复副本；不默认空对象覆盖；不重复导入 |
| AC-049 | T-15 | V-07 | covered | 先保全新版；不允许旧 writer 写新格式；限制清晰 |
| AC-050 | T-16 | V-07、V-08 | covered | 自有数据完整；清单明确外部正文/凭证缺项；不启动任何 Agent |
| AC-051 | T-16 | V-04、V-07 | covered | 不覆盖有效数据；失败可重试/恢复；外部目录重新核对 |
| AC-052 | T-07 | V-02、V-07、V-10 | covered | 不误连接原实例；业务身份可恢复；物理绑定与授权可核对 |
| AC-053 | T-02 | V-02、V-07 | covered | 唯一活动 writer 或明确冲突；不互盖 locator/记录 |
| AC-054 | T-05 | V-06、V-09 | covered | 缓存有界；其他控制可完成；慢视图独立重同步 |
| AC-055 | T-07 | V-02、V-06 | covered | 无全局读循环/锁死锁；控制和退出不被慢扫描挡住 |
| AC-056 | T-04 | V-03、V-05、V-06 | covered | 拒绝新动作；等待有界结束；迟到进程按身份清理 |
| AC-057 | T-01 | V-05、V-06 | covered | Browser 请求继续；全部 owner 释放后 helper 才结束 |
| AC-058 | T-04 | V-03、V-05、V-06 | covered | 各 owner 收到准确失败；屏幕/状态标失联；不重放输入 |
| AC-059 | T-01 | V-05、V-08 | covered | 无扫描/下载/Provider/PTY/活动 gateway 副作用 |
| AC-060 | T-04 | V-05、V-06、V-08、V-10 | covered | 进程随宿主退出；恢复记录/网页；Agent 需明确继续 |
| AC-061 | T-18 | V-08、V-12 | covered | 无无意横向溢出/遮挡；焦点可见与返回；状态非仅颜色 |
| AC-062 | T-17 | V-06、V-10、V-11 | covered | 延续摘要校验；无效二进制不执行；明确兼容错误 |
| AC-063 | T-18 | V-10 | covered | 每组合有实际端到端证据；缺项不宣称正式通过 |
| AC-064 | T-17 | V-11 | covered | 用户文案 en/zh；旧示例被替换；改编来源许可可追踪；无 GPL 终端代码 |

### 跨票组合验收

| 合同 | 先行切片必须完成 | 最终组合 owner 与接缝 |
|---|---|---|
| AC-002 | T-02：独立 Space ID、布局与持久归属 | T-10：同 cwd 多 Space 邮箱/查询隔离，引用 T-02 原证据 |
| AC-004 | T-02：GUI 引导和公共精确目标解析 | T-07：CLI 缺目标/同名歧义黑盒结果 |
| AC-006 | T-03：后台创建/查询且不改变焦点 | T-07：CLI 创建无 Pane 的 B 并查询原归属 |
| AC-021 | T-06：状态、未知、待处理定位与不自动审批 | T-08：CLI 输入拒绝、不换后端重放 |
| AC-046 | T-02：元数据提交失败不启动、保留旧数据 | T-10：通知提交/ack失败与完整持久化故障组合 |

这些先行贡献仍是本票必须完成的切片检查，但不单独宣称整个 AC 已通过；原票 contract_ids 只包含其主要代码完成责任与已绑定的局部 UI AC-061。最终 owner 必须回读前序有效证据并运行新增组合，不以删除场景来关闭票据。所有真实 E2E 按 Spec §11 留给用户。

七项横切要求没有退出计划：NFR-001 → T-05/07/08/10/11/18；NFR-002 → T-04/12/18；NFR-003 → T-02/07/11/12/15/16/17；NFR-004 → T-01/03/13/14/17；NFR-005 → 所有 UI 票与 T-18；NFR-006 → T-06/07/08/18；NFR-007 → 所有参考/依赖使用票及 T-17/18。五个正式组合由 AC-063/T-18 逐项计数，不把 Codex/Claude 两种真实 CLI 与五个平台相乘虚构通过记录。

## 5. 并行与路径所有权

本节保留 T 的共享路径分析；正式票据调度和 Agent Team 分工由 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/goal-plan.md</Path> §4 / Execution Policy Source 拥有。T-10/T-11/T-13 在行为 DAG 上可同时具备前置，公共 controller/API/UI 入口、i18n、docs 与生成物仍有共享写集；所有票声明 `huhu:integration-entrypoints` 与 `huhu:generated-artifacts` 互斥资源，Agent Team 不能绕过这些真实冲突。

唯一共享整合 owner 为 **`lead:agent-workbench-integration`**（角色，实际执行人由 I 在原记录分配）。每张 Ticket 的 `shared_paths` / `shared_path_owners` 列出其受托共享写入；Lead 在当前票 Evidence 分配唯一实际源文件 writer；可整票委托一位实现者，Lead 不同时改源文件。main.js/styles.css 由 Lead 独占生成。独立 reviewer 只读。这个角色不是新增 Ticket，也不是由任意实现者共同写入口；单执行者执行时仍按票顺序记录。Git index、全局验证与构建串行。未来要并行，必须先重划写集/资源并重新检查，不能删真实资源锁换取绿色调度。

| 候选 | 可能交集 | 真实依赖 | 当前处理 |
|---|---|---|---|
| T-10 / T-11 | i18n、工作台说明、main.js/styles.css；控制路由接线 | 无相互阻塞边 | 按原 Ticket 共享 owner 与语义锁串行集成 |
| T-10 / T-13 | 工作台 composition 语义、main.js/styles.css | 无相互阻塞边 | 同上；不得同时改真实公共入口 |
| T-11 / T-13 | shared view/history 生命周期、main.js/styles.css | 无相互阻塞边 | 同上；历史和网页行为各自验收 |
| T-12 / T-10 或 T-13 | controller/consumer 接线与产物 | 仅 T-11 阻塞 T-12 | 仍按同一资源互斥执行 |
| 其他前后票 | helper、controller、workspace、API、schema、生成物等 | §3 的实际合同依赖 | 前置完成且证据回读后才接手；旧 owner 不留后台 writer |

所有执行复用 README 的唯一 change-workspace。当前已按用户授权进入 run，真实 base/head 与 workspace 见 README Execution Context。票据调度、Agent 数量与 workspace 是不同维度。用户已要求计划内允许 Agent Team；具体模型、共享写入及独立 review 规则统一见 Goal，plan 阶段不派遣，不从团队协作推导额外 worktree。

## 6. Gate、Wave 与集成点

正式编排已经写入 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/goal-plan.md</Path>。下表只导航原 Goal；Gate 状态、关闭证据、动态派单和恢复不在 Map 再维护一份。各票完成当前切片的自动化验收，真实 E2E 按 Spec §11 交给用户；跨票组合由最终生产者补齐代码验证。

| 导航 | 原 Goal 位置 |
|---|---|
| W-01–W-05、关键路径、T-14 汇合与资源串行顺序 | §2 Execution Graph |
| G-00 执行入口、G-01–G-06 产品验收与完成证据 | §3 Gates and Completion Evidence |
| Agent Team、gpt-6.1-sol/xhigh 实现、gpt-6-astra/high 独立 review | §4 Lead Orchestration / Dispatch Packet and Review |
| current 工作区、授权边界与实际证据返回 | §4 Change Workspace and Verification / Authorization Matrix / Evidence Return |
| 迁移、模型不可用、共享 writer、证据漂移与重复失败恢复 | §5 Constraints, Risk and Recovery |
| 当前 Gate、继续条件与恢复 | §6 Progress and Decisions；Execution Policy Source |

Goal Plan GP-021 以本 Map revision 22 为输入；用户已授权 run，由 I 逐票承接。实际派遣与结果只记原 Evidence。

备份的跨 owner 范围、活动处理、公开停写/快照/恢复接缝及写集已在公共实施合同 §6 与 T-15/T-16 绑定；原 automation run/invocation 和通知回执保留，无新增 Run 平台。

T-05当前真实闭包补集见LOG-058与原Ticket：单headless状态投影、整笔输入准入和全helper有界输出；新增路径按A/B/C唯一owner派单。K03先复现，依赖仅条件精确pin现版本，未默认升级/patch。

T-06精确写集及活动/Hook/呈现接缝按原Ticket和evidence/T-06-dispatch-packet.md执行；跨owner消费以实际源码接口回读为准，Root独占产物，T-07/08仍保留原依赖。 GP021以evidence/T-06-recovery1-packet.md修复真实显示意图接缝并替换已被反证的几何计数代理；新增3个A路径，总47路径，原失败和attempts3保留，新周期另记。

用户已明确所有旧业务运行必须绑定Space（LOG-030）；T-02提供生产选择接缝，T-14完成旧交互/后台消费者与配置迁移，T-15保留未绑定的旧定义状态。

## 7. 横切契约与风险

1. **研究先行。** 用户新增要求已纳入所有票：不熟悉的功能先找近两年活跃、许可明确的同类 GitHub 项目，比较机制、依赖、已知问题并留采用理由。<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path> 的 R-01–05/K-01–07 已为本轮做首批核查；许可明确不等于可整包复制。继续禁止 GPL 终端源码、未知来源代码与未经比较的换栈。
2. **统一 owner。** Spec 管外部行为；DESIGN 管视觉；公共实施合同管跨票工程约定；票据管交付；参考只是证据。改 public schema/行为前先在原 owner 处理，不让 Ticket 偶然覆盖用户决定。保持手工启动六入口及现有 Hook/账号原归属，不搬凭证。
3. **身份与作用域。** Space/session/runtime/pane 不混用。默认当前 Space；同 Vault 明确寻址可跨 Space；复制 Vault ID、过期 locator、旧 runtime 不得路由到另一个目标。目录 grant、原生引用占用与本机 IPC 是不同检查，不能互相替代。
4. **副作用与兼容。** 输入回执不等于模型任务成功；wait 超时/取消不等于 stop，效果未知先查，不自动重发。原生完整答案/执行期限/取消及自动化 invocation 账本保持；screen read 不能替代原结果服务。
5. **数据与恢复。** 单 writer、先保存身份再启动；迁移/导入暂存核对后切换。保留无法归属旧来源及有效副本；备份不包含原生全文/凭证/活动进程，不能以空会话冒充恢复。测试只在隔离 Vault/账号/数据副本进行。
6. **运行与观察。** 同一 headless 权威解析、单设备回复、运行代次与快照水位；有限缓存/可取消等待/stop 不被慢客户端堵住。原始性能数字未被采纳，实施须固定样本测量并发布有限默认值。
7. **证据。** 离线原型、单测、native 测试、真实 Provider、真实 Obsidian 和五平台证据分别记录。真实环境按用户分工保留待用户验收；不以 skip、交叉编译或旧截图宣称通过。T-18 不能替前面票补造本应已有的实现证据。

## 8. 维护规则

- Ticket 进度只改原 Ticket/Evidence；恢复时回读，Map 不维护第二份状态。
- 合同/新增或移除 Ticket/路径/依赖/Skill 变化：在原 owner 处理，递增 `plan_revision`，修复导航/DAG/覆盖/调用摘要；已完成证据按影响闭包失效，不重跑无关未失效证据。
- UI 变化核对 DESIGN revision/digest 与 `design_ref`，不直接改获批 A 的历史源码/批准记录；永久基线仍经 A 网关。
- 本轮只修改当前 change。后续生产实现按票同步项目 docs，不提前把规划写成已发行能力；原始输入和历史日志保留，通过说明确定角色。
- 路径/资源变化后运行 <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> 并回读 <Path>{roots.workflows}/specdev/common/tools/ticket-control.mjs</Path>；内部工件引用用完整 Path 标签。

## 9. 总控与恢复

执行总控见 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/goal-plan.md</Path>。获实现授权后，先以 `ticket-control.mjs --map` 只读检查实际票级状态、依赖和资源，再由原 I/Goal owner 推进；工具本身不改代码。首个可调度工作必须以前置和资源检查当时的结果为准，不能因所有计划 `ready` 就跳过依赖。

中断后从 README 的 Execution Context（实施时才创建）、本票 Evidence 和真实文件回读。未闭合迁移先查原恢复记录，不抢 writer、不默认重放 prompt；共享资源冲突只暂停受影响票。授权/公共行为/许可/身份冲突回原 owner 解决，不用 mock 消除 required 缺口。全部票完成后仍需核对整体代码合同、五平台代码/构建配置与人工清单及本轮 Gate，不能以 18 个 done 宣称实机验收通过；提交、推送与发版需已有明确授权。

GP026/Map27依T07真实最终交付及T08已核producer研究，把T08精确写集补为A32/B15/C33/Root4共84路径；唯一owner、分阶段接口和验收见原Ticket与evidence/T-08-engineering-packet.md。跨票仍serial，生成协议归C唯一writer，插件根产物归Root。未解锁阶段保持只读。

GP027/Map28仅补T08现有取消测试的Obsidian解析别名路径，Root作为唯一writer；A32/B15/C33不变，总写集为85。原任务仍限定原分配，未改变依赖、验收、Skill或任何生产行为；按T08 Evidence记录夹具失败、最小修复与复验。

GP028/Map29按011真实独立审查为T08补终端贡献的stateKeys及就近app回归两路径，A34/B15/C33/Root5共87。先同步本票/Map/Goal与精确分配，再派窄修；C33保持STOP。F1–F4均为当前T08合同的修复，不改变Spec、DESIGN、依赖或模型分工；原审核输入与原件保留。

GP029/Map30保持T08总87路径及上层合同；016确认旧F1–F4关闭后新F5要求有界native服务结束/安全socket回收。原attempts3停止点保留，恢复周期1写集及真实owner见T-08-recovery1-packet.md与allocation-r3；先校验再派遣，T09不提前写入。

GP030/Map31沿T08恢复周期1修019唯一F6，完整87路径不增。当前10路径唯一owner及ROOT生成窗口见T-08-write-allocation-r4.json、T-08-shutdown-result-packet.md；native Rust/其它源停写。本周期第一次整合与R3失败保留，下一整合计2。T09只读准备不解锁产品。

GP031/Map32仅补020实际暴露的helper.test.ts正常退出替身到T08同owner；总88路径、修复11路径，023 continuation前全STOP。新路径原始字节已在T08起点快照，补Node实际close事件且保持原风险断言；不改Spec/设计/计数。

GP032/Map33按021完整R4真实F7为T08补共享Cookie原读取/清理双失败消费者三路径，A34/B16/C36/Root5共91；025原Sol/xhigh唯一修复owner，所有其他产品STOP。外部合同/设计/依赖不变，T09未解锁。

GP033/Map34在T08实际done及R5独立通过后，把T09准备收敛为A14/B18/U20/Root4共56精确路径。T09依原SpaceWorkspaceStore单writer维护兼容Pane身份与GUI/CLI布局，不新增数据owner；前阶段协议子集和后续UI按真实接口交接。T10–18仍待各自依赖/DoR，不提前写产品。

### GP034 DOM测试真实依赖入口

T09追加唯一Root路径vitest.config.ts，总57路径；证据与精确r2分配见原票。031临时真实browser入口恢复原PanelGroup ARIA/键盘行为，正式配置需按原开发规则核验。A/B/U写集、依赖顺序、Spec/DESIGN、用户Space规则与真实E2E责任均不变；不重开已完成票或将夹具通过作为产品验收。

GP035/Map36：在T09实际完成、G02代码关闭后，将T10原持久owner和生产Inbox方案落实为A17/B19/U14/Root4共54条精确路径。022/033/038/040准备只作为工程依据，不作为实现通过；分阶段DoR与实际派遣才解锁产品写入。T11–18继续等待各自上游与DoR。

T13 scope revision 38：保留 SpaceService 的唯一 writer 语义，由 app 通过 Agent module 的懒入口创建跨 Agent 生命周期共享 owner；不复制 writer，不由 Browser 自建缓存。Agent 关闭只 drain runtime，app unload 才 dispose owner；Browser 直接消费共享 browser port。
