# Goal Plan 规划审查与接续

- 日期：2026-10-25；owner：codex:/root；Work：specdev/goal-plan；模式：plan。
- 授权：用户要求创建 Goal Plan，并在其中强调可调用 Agent Team；实现使用 Codex GPT-6.1-sol X high，review 使用 6 Astra high 的建议组合已标准化并作为本 change 默认安排。原话与范围见 LOG-025。
- 交付：<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/goal-plan.md</Path>（GP-001 / schema v8）、Map revision 2 和必要导航对齐。
- 方法：按 <Path>{roots.workflows}/specdev/common/skills/plan-quality-review/SKILL.md</Path> 的七轴 checklist 自查；读取真实 Goal schema/模板、18 张票的 frontmatter、Map、Spec 与相关 Gate 风险票。未派遣 Agent，未调用实现或代码审查模型；本报告不是独立 Astra 审查结果。
- 规划输入观察：<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/goal-plan-baseline.json</Path>；最终文件/保全核对：<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/goal-plan-integrity.json</Path>；实际命令输出：<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/goal-plan-validation.json</Path>；只读控制器：<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/goal-plan-control.json</Path>。

## 1. 结果与执行边界

Goal 规划已完成：5 个 Wave，G-00 执行入口与 G-01–06 产品 Gate，覆盖全部 18 张原票和 64 项 AC。原 DAG、票级状态、依赖、AC、设计绑定与 Skill 调用未改变；Map 负责导航，Goal 负责跨票 Gate/模型/调度，README 继续拥有整体 Outcome。

当前 Goal 为 `draft / ready_for_execution: false`，原因是用户本轮只要求 plan，尚未要求 run；这与规划完整性分开。当前产品没有开始执行，没有 Agent Team 派遣、实现分支/worktree、实际 Execution Context、产品审查或通过记录。本轮无需为交付计划再次请求实施许可。

## 2. 七轴检查

| 轴 | 结论 | 证据与处理 |
|---|---|---|
| 背景与边界 | pass（规划） | Outcome 沿 Herdr 式终端增强、已采用 A、64 AC、现有原生结果/账号/浏览器/恢复；不重新引入任务平台，产品范围未变化。 |
| Skill 与调用可执行性 | pass（规划） | 原 dev/ui 入口与参考摘要仍匹配；Goal 指向真实 I/code-review 入口和 Task Brief。模型 ID/effort 均出现在当前宿主工具说明，明确模型覆盖用 fork_turns none；记录为“可选用且未调用”，不伪造可用运行回执。 |
| 有序执行与关键边界 | pass | 5 个 Wave 各有开始条件/可观察出口；单票 required E2E 保留。G-03 后才切数据 writer；G-05 后才用匹配资产执行五平台。修复 T-01 提前要求 T-13 网页交互的隐含循环，见 §3。 |
| DAG、路径与资源 | pass | 原依赖无环，T-14 真实汇合不变；选择 serial 使共享公共入口、i18n、产物不跨票并发。Agent Team 允许同票非冲突子任务，当前票共享路径交唯一 Lead，review 前相关 writer 停写。 |
| 验收与数量 | pass（计划），产品待执行 | 18 票导航全覆盖；64 AC 原始行逐字节一致；五个 OS/架构仍逐项验收。模型组合不被误用为 Agent 数量或票数上限，原型/编译不冒充实机完成。 |
| 授权与审查独立性 | pass（计划），执行门待 run | 用户已指定计划和团队分工；本轮无产品实现/Git/远程授权。实现 gpt-6.1-sol/xhigh，review gpt-6-astra/high；真实 implementer/reviewer 身份在运行时记录，Lead 参与实现也不得自审。 |
| 失败、漂移与恢复 | pass | 模型不可用、未知 writer、权限/依赖/环境缺项、部分迁移、重复 blocker 均定义局部阻塞与恢复；默认 3 次复盘上限有执行规则来源，无新证据不重复派发。 |

## 3. 规划修正与明确决定

1. **Agent Team 不等于跨票并行。** 原票共享两个语义资源和公共入口；选择 serial 逐票集成，同票仍可用多位实现者，review 独立且只读。未添加用户未要求的固定实现者人数，也未创建项目 coordination 配置。当前 4 活动槽位只记录为当次宿主事实，恢复时重查。
2. **模型来自用户要求。** 流程的默认“执行期选模型”被本次明确安排覆盖；保留执行期真实可用性核验，不预造 Agent 身份。未为 plan 实际启动模型，因此不会把自查称作 Astra review。
3. **T-01 的验收范围修正。** 原句要求停 Agent 后“Browser 请求与网页仍可用”，把 T-13 的完整独立网页视图提前作为 T-01 完成条件；本轮改为真实 native/Cookie 请求与租约存续、所有租约释放后的 helper 退出。完整网页入口/标签/恢复仍由 T-13/AC-041 与 G-03 完整验收。T-01 的 AC-057/059、required E2E、依赖、写集和状态保持，未降低任何产品合同。
4. **正式 Goal 已存在。** 删除 Map 的“用户尚未要求 Goal”旧接续，将候选里程碑改为对 Goal 的导航，revision 从 1 升为 2；README/Spec 同步。T 的旧证据是当时快照，继续保留，不覆盖原审查记录。
5. **使用当前 v8 合同。** goal-lifecycle 一处仍提 v7，schema、模板、规划规则、执行规则与校验器都要求 v8；按当前明确的 v8 编写，未修改方法安装目录，也没有把旧格式只改版本号充当计划。

## 4. 文件保全与验证选择

修改已有文件恰为 README、tickets-map、spec、LOG 和 T-01 的一段 E2E 说明。其余 76 个原有文件及类型保持；旧 LOG 前缀逐字节保留。18 张票的 frontmatter 均未修改；DESIGN、原型、批准、原始输入与研究材料未变化，已有设计/浏览器证据沿用，未重复运行浏览器或发布基线。

用户的 AGENTS.md/.gitignore 哈希与本轮开始相同，代码基线仍是 main / `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`。没有写生产代码、其他 change、全局编排配置或永久知识。没有构建产品、运行 PTY/Provider/真实宿主或五平台测试；它们是未来原票/Gate 的 required 验收。

本轮选择 Goal stage、只读 ticket-control 与文档链接检查。Goal stage 同时校验原 Ticket、Spec/设计绑定和计划结构；只读控制器应识别 serial，并因为 Goal 未获得 run 授权和 Ticket 未分配实现 owner 而不产生执行 frontier。该结果符合 plan 模式，不能为得到可执行输出而伪造授权/owner。

## 5. 当前接续

从 Map 进入 Goal §4 查看 Agent Team、模型与独立 review 方式；后续收到 run 指令后，Lead 先核对 G-00 并记录实际执行上下文，再从真实依赖满足的票开始持续推进。既有产品/设计及模型默认安排不逐票重问。五平台与最终独立审查全部保留，完成状态必须来自真实交付。


## 6. 实际验证结果

| 检查 | 实际结果 |
|---|---|
| Goal v8 stage | 退出 0；0 errors、5 warnings。五条均为既有 T-10/11、T-10/12、T-10/13、T-11/13、T-12/13 的共享路径提醒；Goal 已明确 serial、原资源锁和唯一共享 writer，未伪造依赖边消除提示 |
| ticket-control --map | 退出 0；实际读取 ticket_execution=serial；errors/validation_errors 为空，frontier/done 均为空。T-01 被 Goal 尚未进入执行及实现 owner 未分配阻塞，符合本轮 plan 边界 |
| 输入/覆盖/文件保全核对 | 18 张票的 frontmatter 未变；64 项 AC 原行未变；5 Wave、7 Gate 定义完整；用户已有文件摘要相同；0 个核对问题 |
| pnpm test:docs | 包装退出 126，底层 Node 退出 1；仅另一 change 的 6 处旧缺失锚点，无本 change 新链接错误。完整原输出保存 goal-plan-validation.json |
| Agent Team / 模型 / 产品测试 | 本轮实际派遣数 0。只写模型安排并依据工具说明核对参数；未运行实现、独立代码 review、生产 build、真实 PTY/Provider 或五平台验收 |

全仓文档失败仍在 `2026-10-25-huhu-bot-architecture/inputs/HUHU-Bot_架构审核与工程设计规范_v1.1.md`，对应第 9、12、14、15、17、19 节的旧锚点，与前轮记录一致。没有修改范围外 change 或关闭检查。

本次 Goal Plan 交付已完成。未授予 run 只是执行前提，不是要求用户重复批准这份规划的流程；后续实现指令到达后，按已有产品、设计与模型安排进入 G-00，并继续满足依赖的工作。
