# T 规划审查与文档对齐证据

- 日期：2026-10-25。
- 当前 owner / Work：codex:/root / specdev/tickets。
- 输入：用户明确激活 T、要求最终 Tickets、陌生功能研究先行及全面对齐本 change；既有 Q1–Q10、S/P/A 采用与设计基线发布授权持续有效。
- 方法：按 <Path>{roots.workflows}/specdev/common/skills/plan-quality-review/SKILL.md</Path> 及其 checklist 对 18 票逐一自查，结合真实代码入口/测试/CI、官方 GitHub 研究与机器校验；本记录不是独立 Agent 审查，也不是产品实现验收。
- 写入边界：本 change 的票据、研究、跨票实施约定、现行说明和追加日志。未触发实施、Git 提交/推送、产品发布或 change 归档。

## 1. 审查结论与证据职责

全部 64 个 AC 有且仅有一个主要完成责任，14 张 UI 票另外承接各自设计一致性；T-18 汇总生产 UI 与五个实际 OS/架构。18 票均有完整目标、来源、范围、接缝、有序步骤、正反例、E2E disposition、恢复和证据失效规则。当前没有需要再访谈的高影响产品决定。

计划的 Ready 与可立即调度不同：所有票的实现 owner 暂为 unassigned，产品 Evidence 尚未生成。静态根票是 T-01；I/Goal 在获得实现授权并分配实际 owner 后才可推进。只读控制器可能据此报告尚无可执行 frontier，这不是计划缺失，也不能为让输出变绿而伪造已分派或已完成依赖。

机器可回读记录：<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/planning-integrity.json</Path>、<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/tickets-validation.json</Path>、<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/ticket-control.json</Path>。研究来源在 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/reference-sources.json</Path>。本节只记录 2026-10-25 规划快照；后续状态以原 Ticket/Evidence 为准，不在此同步进度。

## 2. 七轴审查

| 轴 | 本次核查与结论 |
|---|---|
| 背景与边界 | 核对 Spec 11 故事、64 AC、ADR-001–009 与用户最新范围；各票有 IN/REUSE/OUT。真实终端增强、被动邮箱、原生人工审批及数据恢复均保留，未重新引入任务平台/业务 DB/账号搬迁。 |
| Skill 调用 | 扫描项目入口后采用 dev（ALL）与 ui（14 票）；每票 implement/verify 的真实路径、字节摘要、引用摘要、输入/输出、required 和失败动作已逐个核对。SpecDev 自身流程没有被冒充项目 Skill；未来 I 需记录真实调用轨迹。 |
| 执行路线 | 逐票核对公共契约和异常顺序：先保存身份、运行代次、停止收束、屏幕水位、能力/状态再开放控制；兼容收缩与数据 writer 收缩分别由 T-14/T-15 承接。早期版本只在隔离库展开，CLI 未完成能力显式 unavailable。 |
| 控制图 | 18 节点引用完整、无环，根为 T-01；T-10/T-12/T-13 汇合到 T-14。无为人员交接捏造的依赖边。所有共享入口与生成物交唯一 Lead 角色，资源互斥使有交集的分支串行；不按文件名猜可并行。 |
| 验收与数量 | AC-001–064 全 covered，无延期；五平台来自用户 Q8/AC-063，在 Map requested_deliverables 逐项计数。每票有正常/失败/回归与 required E2E，模拟原型不替代真实 Provider/宿主。 |
| 权限 | 本轮用户已要求最终规划和文档对齐，不为形式重复确认已选方案。各票明确本次不是实现授权，也没有提交/推送/发版授权。未来在隔离环境验证；实际用户数据变更应按具体实施范围核对。 |
| 恢复 | 所有票绑定基线/Skill/设计与证据失效条件；公共合同说明输入效果未知先查、不重放、wait 不 kill。迁移留恢复副本/不可归属报告，单 writer 原位恢复，不抢占别的实例锁。 |

## 3. 完整逐票核对清单

以下是发布时的只读快照。全部票 deep / high / Ready，未决问题为“无”；深度原因逐票列出，并非按数量套用复杂度。实现 owner 都尚未分派。共享写入统一由 `lead:agent-workbench-integration` 承担，T-10/11/13（及随后 T-12）虽无互相依赖，仍因资源锁串行；本轮不派遣额外 Agent。

| ID / 交付 | 被阻塞于 | Deep 原因 | 最低项目 Skill |
|---|---|---|---|
| T-01 共享原生宿主与按需能力租约：关闭 Agent 或最后一个终端时，仍在用 native Cookie/历史能力的消费者能完成；没有使用相关能力时不启动 helper、扫描或下载。 | 无 | PTY、历史和 Cookie 共用 helper，当前 Agent 服务 owner 会影响 Browser；涉及跨模块生命周期与启动边界。 | dev |
| T-02 可持久化的 Space、目录授权与单写入者：用户能创建/重命名空 Space，两个同 cwd 的 Space 独立；库外目录必须明确选择，保存失败不产生不可追踪进程。 | T-01 | 新增持久身份、目录授权及物理 Vault 单 writer，触及数据完整性和安全边界。 | dev + ui |
| T-03 真实终端启动、后台运行与重新附加：用户或控制用例可创建真实 Shell/Agent；后台运行不抢焦点，关 Pane 后可重新附加原 runtime，重复打开不生成第二个进程。 | T-02 | 持久 Session 与 PTY 生命周期分离，须保留六种 Provider/账号和无 Pane 的运行。 | dev + ui |
| T-04 明确停止、归档与宿主恢复：停止只结束指定代次；归档先收束运行并保留历史，部分失败可见；宿主退出后恢复记录而不自动执行。 | T-03 | 停止与 spawn/退出/重启竞争可能遗留进程或丢失用户记录，包含不可交换的归档顺序。 | dev + ui |
| T-05 权威屏幕、重同步与有界流控：多个观察者看到同一终端；订阅/resize/重连不丢字重复，慢观察者不会拖死其他终端或 stop。 | T-04 | 改变终端解析/订阅/resize 热路径，涉及数据顺序、压力隔离及当前依赖风险。 | dev + ui |
| T-06 Agent 状态与 HUHU 内原生人工审批：受管 Shell 手动启动 Agent 后可发现能力；后台待处理可定位原终端，用户批准/拒绝后继续该会话；不可靠识别显示未知。 | T-05 | 状态判断决定输入是否安全，且须保留账号的 Manual/YOLO 与原生权限边界。 | dev + ui |
| T-07 本机 CLI、精确寻址与机器协议：外部 huhu CLI 能准确发现当前实例和目标；默认当前 Space、明确同 Vault 跨 Space，跨 Vault/过期运行拒绝；慢扫描不堵控制。 | T-06 | 新增公开控制协议、Unix/Windows 本机访问边界与 Rust→TS→Rust 回入。 | dev |
| T-08 输入仲裁、状态等待与有界读屏闭环：Agent A 通过 HUHU CLI 给 B 提交输入、等状态并读屏/查产物；键盘/粘贴/CLI 不交错，wait 超时或取消不会停止/重发。 | T-07 | 公共 prompt/wait/read 涉及输入副作用、取消竞争和任务成功误判，必须端到端证明。 | dev + ui |
| T-09 A 方案工作台与双向面板控制：用户获得已批准 A 布局；CLI 附加、聚焦、分屏、调比例与关闭视图可立即在 GUI 看到，双方查询一致。 | T-08 | GUI/CLI 同一布局与焦点合同，跨现有标签/分屏/侧栏和终端输入目标，属于共享 UI 接线。 | dev + ui |
| T-10 被动通知邮箱与主动读取确认：Agent 可给同 Vault 明确目标留消息；目标停止时消息仍在，接收方主动读取、显式 ack，界面显示未读且不启动模型。 | T-09 | 新增持久通知与公开 list/read/ack 接口，需保证写失败、分页和运行状态边界。 | dev + ui |
| T-11 本 Vault 历史摄入、检索与只读预览：右侧只列当前 Vault 的全部 Space/归档/可归属记录；筛选和预览稳定，坏来源局部降级，外库正文不污染索引。 | T-09 | 历史摄入涉及跨 Vault 隐私边界、原生来源异常和分页；不能先读入全文再过滤。 | dev + ui |
| T-12 精确继续、来源导入与原生占用保护：用户可从历史继续准确原生会话，活动时只附加；同时继续只产生一个 HUHU 写运行，缺来源不偷建空会话。 | T-11 | 原生会话继续会产生进程和写副作用，涉及跨 HUHU 实例去重、账号/目录与 argv 安全。 | dev + ui |
| T-13 共享标签承载与浏览器独立运行：没有 Space 或 Agent 已关闭时仍能打开/恢复网页和导入 Cookie；共享标签体验、资料引用和分屏保留。 | T-09 | 网页现由 Agent-owned tab/page 承载，需跨 shell/app/browser 解耦且保留旧布局和原入口。 | dev + ui |
| T-14 既有消费者兼容与旧控制接线收缩：所有既有消费者使用新运行/宿主接线继续工作：原生完整答案、existing 只粘贴、技能只读与移动端轻量入口均保持。 | T-12, T-13, T-10 | 公开 Agent API 被 Home/Browser/Shell/自动化调用，移除旧控制器接线可能降级完整答案、取消或移动端能力。 | dev |
| T-15 旧工作台数据迁移、恢复与 writer 收缩：旧用户升级后得到明确导入空间，原布局/身份/标注可核对；迁移中断可恢复，新版写入后回滚不会被旧 writer 覆盖。 | T-14 | 旧布局/标注/账号引用迁移及回滚属于数据完整性高风险，必须 expand→migrate→contract。 | dev + ui |
| T-16 HUHU 业务备份、导入预检与恢复：用户导出后能在空环境完整恢复 HUHU 自有记录，清楚看到原生全文/凭证缺项；坏包、冲突或目录失效不会覆盖有效数据。 | T-15 | 导入会改变业务记录，涉及版本/摘要/身份碰撞和可恢复切换，不能只实现导出按钮。 | dev + ui |
| T-17 CLI 资产、配套 Skill 与交付一致性：每个正式平台可获得匹配的 helper/CLI；帮助、schema、Skill 示例对应真实功能，错版本/无效摘要不执行，源码与产物及声明一致。 | T-16 | 新增 CLI 二进制及帮助/Skill 公开面，涉及发布资产可信性、版本兼容与来源许可。 | dev |
| T-18 五平台真实主链与全页面验收：同一候选源码/资产在 Windows x64、macOS x64/arm64、Linux x64/arm64 各有实际主链证据，四个页面的生产交互与已批准 A 一致。 | T-17 | 正式支持矩阵与重构汇合，必须汇总固定输入上的真实宿主/Provider/恢复证据，交叉编译不够。 | dev + ui |

每票的完整来源、验收动作与写集由 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path> 导航到原票，不把本表当作动态控制数据。全部 implement/verify 摘要和路径核对结果已保存 planning-integrity.json。

## 4. 发现并修正的规划问题

| 发现 | 处置与复核 |
|---|---|
| 消息 UI 拟接入现有 AgentWorkspacePage，但首稿写集漏 composition 文件 | T-10 补真实页面写集，按 shared owner 集成；expected_changes 均在写集内。 |
| 迁移入口引用实际 settings-page，但写集只含拟新增 settings 子目录 | T-15 补 settings-page.tsx，与 T-16 由同 owner 按真实依赖接续。 |
| 消费者迁移有猜测路径 workbench-port、automations 文档复数名，且遗漏 Home/module 与 app composition | 以 rg 核对实际 services/workbench.ts、docs/automation.md、home/module.ts、compose-workbench.ts，修订 T-14。未创建重复旧文档或误导实施入口。 |
| 原型包尾段仍写等待基线授权/发布，与前文及已完成 LOG-021 冲突 | 改为已发布 DESIGN-0001、已完成 S 引用，导航到当前 Tickets；不改获批源码块、候选或固定批准。 |
| 首次机器校验不接受 UI Skill 路由的中文分隔符，产生 15 个关联错误 | 读取工具合同后使用 ASCII 逗号分隔；重跑 tickets stage 消除全部 error。没有绕过 Skill 绑定或删除 UI 要求。 |
| 静态校验持续提醒五组并发 Ready 票共享路径 | 这些是已知真实交集：T-10/11、T-10/12、T-10/13、T-11/13、T-12/13。唯一 shared owner 与公共 resource_claims 已声明，Map §5 明确串行；保留 5 条警告及处理说明，不删除真实写集或造依赖边。 |
| 新能力的命令/测试/目录并非现有能力 | 计划 CLI 统一标为未发行；新 control.rs、迁移/备份 fixtures 等标为拟新增产物。既有 expected_changes 和回归测试已按真实路径核对，不用未来命令宣称本轮通过。 |

以上均已在发布稿消除或明确解决，未留下需要实施者重新猜测的范围/责任问题。参考中的 xterm #6063、状态 Hook 变更和 Windows 历史问题是后续票的复现/回归输入，不是当前 HUHU 已证实缺陷。

## 5. 全 change 对齐与保全

| 工件组 | 本次处理与权威 |
|---|---|
| README / Spec | 更新为 T 已形成完整计划；增加研究约束、公共 CLI 约定和票据入口；64 项行为 AC、已选 A 与产品范围保持。 |
| ADR / CONTEXT | ADR-001 补用户最新研究规则和一手来源；术语导航指向票据/工程合同，原 accepted 决定不重新推翻。 |
| implementation-contracts / reference-notes / tickets-map / ticket | 分别拥有派生工程约定、研究证据、静态导航与单票交付；互相引用，禁止覆盖 Spec/DESIGN。 |
| LOG / design-tree | LOG-022–024 追加；之前 LOG 原始字节前缀完整保留。design-tree 原问答及闭合状态逐字节保留，历史题面不会成为新限制。 |
| inputs | 全文仍 1278 行、101,143 字节，SHA-256 `c71b8637aef44c57f78cd5fd51da08e74ab37b004056c4012d7e6ad03bbb7aee`；仅 README 补当前实施导航。原文与 temp 原件逐字节一致。 |
| DESIGN / 原型 A/B/C / approval / baseline-draft | 获批规则、所有运行 HTML/CSS/JS/字体及比较文件、固定批准与候选基线保持字节；只修原型包说明中的过期接续文字。审批摘要未变化，不能为了对齐而“重新批准”。 |
| 原型 evidence | 全部原运行证据保持字节；是 P 的历史结果。新 package 叙述不进入运行摘要，物化/设计检查确认源码一致，不重复未失效的浏览器操作。 |
| 项目永久设计 / 生产源码 / 其他 change | 本轮未写。永久 current 与 revision 字节摘要仍匹配已发布快照；用户已有 AGENTS.md/.gitignore 摘要未变。生产 docs 仍描述旧能力，由对应实现票更新。 |

已存在文件只有 README、Spec、ADR、CONTEXT、LOG、inputs/README 和原型包说明 7 个路径变动，另新增票据/参考/合同/本轮证据。48 个原有文件逐字节保留（含 symlink 类型），完整清单在 planning-integrity.json。LOG 旧前缀也逐字节保留。

## 6. 实际验证与限制

最终命令、退出码、输出和运行时间保存于 tickets-validation.json；票据控制器完整原始只读结果另存 ticket-control.json。全仓文档检查的范围外失败也按原输出保留，不能算成本 change 通过；最终摘要补在下节。

本轮仅文档/规划，未运行生产 build/lint、PTY/Provider/真实宿主或五平台测试，也没有生成 T-01–18 的完成 Evidence。旧浏览器证据与固定摘要仍有效，只重验说明变动相关的工件/链接。没有使用测试跳过或 Mock 替代所需真实验收。


## 7. 最终验证结果

| 检查 | 实际结果 |
|---|---|
| 逐票结构/现有路径/Skill 摘要/覆盖/原件保全 | planning-integrity.json：18 票、64 个唯一主要 AC、14 张 UI 票、DAG 无环、0 个问题；静态根 T-01 |
| validate-specdev tickets / spec / prototype(UI-001) | 三项均退出 0：每项 0 errors、5 warnings；五条均为同一组已注明 owner/资源锁与串行处置的路径提醒 |
| ticket-control --map，只读 | 退出 0，errors 与 validation_errors 均为空；frontier/done 均空。18 票尚未分配实现 owner，T-01 只缺实际 owner，后续还受真实依赖阻塞；没有运行任何 Ticket |
| materialize --check | 退出 0，3 个原型源码文件一致 |
| design package --check-ready | 退出 0；原型证据有效，不是宿主认证 |
| DESIGN / 完整原型摘要 | 分别为 `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`、`b8bcf55791eabb1d620c990e2aaaad49f7ccec9ab6a0f557e65ba3baa12fe1af`；与既有批准完全一致 |
| pnpm test:docs | 未通过：命令包装退出 126，Node 检查退出 1；仅报告另一 change 的 6 个既有缺失锚点，没有报告本 change 新链接问题 |

范围外文档失败位于 `2026-10-25-huhu-bot-architecture/inputs/HUHU-Bot_架构审核与工程设计规范_v1.1.md`，分别为 `#9-工具审批与效果日志`、`#12-数据路径与迁移`、`#14-记忆知识与可扩展能力`、`#15-权限凭证与运行治理`、`#17-验证性能与发布门禁`、`#19-决议未决验证与完成定义`。与先前 P 验证记录一致，本轮未写该 change，也未关闭文档检查来隐藏失败。

本次请求的 T 计划及全 change 对齐已完成；产品仍未实施。未来从原票分配 owner、回读真实环境与依赖后执行；正式版仍须完成五个平台实测和全部适用产品合同，不能以本报告代替。
