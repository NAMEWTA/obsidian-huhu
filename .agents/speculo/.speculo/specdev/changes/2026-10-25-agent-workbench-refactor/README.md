# HUHU 终端 Agent 工作台：规格、设计、票据与目标计划

Outcome: active

## Ownership

Owner: codex:/root
Work: specdev/goal-plan
Evidence: evidence/goal-plan-review.md

## 当前交付与权威

用户确认以 Herdr 为主要参照增强现有 HUHU 终端，允许省略不需要的复杂功能。G 的决定闭合至 Q10；S/P 已封板，A 方案已采用，6 条共享设计规则已发布为 DESIGN-0001。T 已形成完整实施 Ticket，并纳入“陌生功能先研究近两年活跃、许可明确的同类开源项目”规则。本轮进一步形成单 change 的 Goal Plan，明确 Agent Team、实现使用 gpt-6.1-sol/xhigh、独立 review 使用 gpt-6-astra/high 的默认安排。产品尚未实施，change 的 Outcome 仍为 active。

| 文件 | 唯一职责 |
|---|---|
| [goal-plan.md](goal-plan.md) | GP-001；5 个 Wave、执行入口与 6 个产品验收 Gate；拥有跨票调度、Agent Team、模型分工、集成与恢复。plan 已形成，尚未进入 run |
| [tickets-map.md](tickets-map.md) / [ticket/](ticket/) | 18 张完整票的导航、真实依赖、64 项 AC 覆盖、项目 Skill 路由和共享写入约定；票级状态从原票回读 |
| [spec.md](spec.md) | 当前外部行为与验收合同：11 个故事、64 项 AC、12 个验证接缝；ready_for_tickets 为 true |
| [implementation-contracts.md](implementation-contracts.md) | 跨票 owner、计划 CLI v1、机器回执/退出码、能力与数据切换约定；尚未发行 |
| [reference-notes.md](reference-notes.md) | Herdr/Wave/tmux/xterm/portable-pty 的活动、许可、依赖、机制、已知问题与对应实施票；一手链接可直接检索 |
| [DESIGN.md](DESIGN.md) | approved revision 1；已采用 A 的视觉/交互权威，绑定 DESIGN-0001 与完整原型摘要 |
| [原型包](prototypes/UI-001/design-system.md) / [已采用预览 A](prototypes/UI-001/final/index.html) | ready；3 个候选、40 个页面状态、完整离线源码与浏览器证据；终端/数据为模拟 |
| [项目设计基线](../../design/DESIGN.md) / [版本索引](../../design/INDEX.md) | DESIGN-0001；DS-001–006 已经 A 网关发布，本轮不再改动 |
| [ADR.md](ADR.md) / [CONTEXT.md](CONTEXT.md) | 已采纳架构取舍 / 当前术语；accepted 不等于已实现 |
| [LOG.md](LOG.md) / [design-tree.json](design-tree.json) / [原始输入说明](inputs/README.md) | 原始来源、用户原话、闭合访谈节点及输入；历史推演不能覆盖现行合同 |
| [Goal 规划审查](evidence/goal-plan-review.md) / [票据规划审查](evidence/tickets-review.md) | 分别保存本轮 Goal 规划与此前 T 规划的真实验证；不冒充实施 Evidence |

Spec 管行为、DESIGN 管界面、公共实施合同管跨票工程约定、Ticket 管本票交付；Goal 管跨票 Gate/Wave、Agent Team、模型、调度和恢复，Map 导航到原权威。参考与历史只提供证据。原始 Run/Outbox、新业务 DB、仅同 Space 等旧推演已按 Spec §10 处置。当前没有待答的高影响产品或设计问题；性能默认值、局部文件拆分等在明确合同内由实施测量决定。

## 原始输入与参考

原件 `temp/HUHU-智能体终端-完整架构与重构方案.md` 已完整复制到本 change `inputs/`：1,278 行、101,143 字节，SHA-256 `c71b8637aef44c57f78cd5fd51da08e74ab37b004056c4012d7e6ad03bbb7aee`。原文、用户答复、已固定的批准和原型运行源码不因本轮对齐而改写。

HUHU 源码探索基线 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`。Herdr 继续固定 v0.9.5 / `2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01`；本轮补充五个项目的近两年活动、实际许可文本与已知问题，记录在参考文档和 [研究来源证据](evidence/reference-sources.json)。借鉴机制没有直接引入外部生产源码。

## 查看与继续

从 Tickets Map 完整阅读后，再进入适用项目 Skill 与单票。实现时使用同一 change-workspace；当前仅进行文档规划，尚未创建或声称存在 Execution Context、实施分支和产品验收记录。首次 I 运行再一次性记录真实 base/head、工作副本摘要、配置和环境。

18 票的正式编排已在 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/goal-plan.md</Path> 形成。采用跨票串行、同票可调用 Agent Team：实现默认 `gpt-6.1-sol` / `xhigh`，独立 review 默认 `gpt-6-astra` / `high`；公共入口与产物由唯一 Lead 整合，reviewer 未参与被审范围实现。模型安排直接沿用本轮用户要求，不逐票重问。

本轮模式是 plan，尚未实际派遣团队或开始实现；后续明确 run 后由 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path> 逐票承接，并按真实依赖/Gate 持续推进。首次 I 再记录唯一 Execution Context。计划不代表 CLI 已发行、产品 AC 已通过或五平台已验收；用户没有要求提交、推送或产品发布。

## 验证与边界

本轮 Goal 结构、模型安排与对齐检查见 [goal-plan-review.md](evidence/goal-plan-review.md)，此前 T 的完整研究/票据审查见 [tickets-review.md](evidence/tickets-review.md)；原型浏览器证据及限制见 [原型验证记录](prototypes/UI-001/evidence/validation.md)。未失效的设计与浏览器证据沿用并核对摘要，真实 PTY/Provider、人工审批、迁移、性能和五平台运行按各 Ticket 验收。

写入范围仅为本 change 的规划与说明；永久设计基线、其他 change、生产源码及已有 `AGENTS.md` / `.gitignore` 改动保持原状。纯文档工作不要求构建插件；所有未来实施验证命令都标明为待运行，不能当作本轮通过记录。
