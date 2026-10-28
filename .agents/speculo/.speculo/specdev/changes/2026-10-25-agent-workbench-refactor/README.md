# HUHU 终端 Agent 工作台：规格、设计、票据与目标计划

Outcome: active

## Ownership

Owner: codex:/root
Work: specdev/goal-plan
Evidence: evidence/run-start.md

## 当前交付与权威

用户确认以 Herdr 为主要参照增强现有 HUHU 终端，允许省略不需要的复杂功能。G 的决定闭合至 Q10；S/P 已封板，A 方案已采用，6 条共享设计规则已发布为 DESIGN-0001。T 已形成完整实施 Ticket，并纳入“陌生功能先研究近两年活跃、许可明确的同类开源项目”规则。本轮进一步形成单 change 的 Goal Plan，明确 Agent Team、实现使用 gpt-6.1-sol/xhigh、独立 review 使用 gpt-6-astra/high 的默认安排。用户现已授权实施；本轮代码验收由 Agent 完成、真实端到端由用户进行。change 的 Outcome 仍为 active。

| 文件 | 唯一职责 |
|---|---|
| [goal-plan.md](goal-plan.md) | GP-018；5 个 Wave 与代码验收 Gate；拥有跨票调度、Agent Team、模型分工、集成与恢复。已进入 run；真实端到端由用户验收 |
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

从 Tickets Map 完整阅读后，再进入适用项目 Skill 与单票。用户已授权 run；沿 current 工作区、跨票串行、同票可调用 Agent Team。实现默认 `gpt-6.1-sol` / `xhigh`，独立 review 默认 `gpt-6-astra` / `high`。每条路径只有一位获分配的实际 writer；同票可按不重叠写集协作，Lead 独占生成产物、正式状态和 Evidence；未参与实现的 reviewer 只读固定输入。用户没有要求提交、推送或发布。

<a id="execution-context"></a>
## Execution Context

```json
{
  "schema_version": 1,
  "change": "2026-10-25-agent-workbench-refactor",
  "workspace_policy": "current",
  "workspace_ref": "current",
  "branch": "NAMEWTA/terminal",
  "base_sha": "33c21e098ef3188cbab5a09f3e0a01fadb787715",
  "owner": "codex:/root",
  "ticket_execution": "serial"
}
```

2026-10-25 启动时 HEAD 与 base 相同，工作副本干净。授权来源为用户本轮目标及 LOG-027；实际执行者、固定候选和命令结果只在对应 Ticket Evidence 记录。恢复时核对实际 Git 与活跃 writer，不新建工作区。

## 验证与边界

当前执行范围与启动核对见 [run-start.md](evidence/run-start.md)。原规划与原型证据保留为历史输入，不当作生产实现验收。Agent 负责代码、自动化测试和构建；真实宿主、Provider、人工审批和五平台 E2E 由用户进行，具体分工见 Spec §11 与 Goal GP-018。代码交付仍覆盖全部 AC，未运行的人工场景必须保留为待用户验收。

允许写入本 change 及各票授权的生产、测试、生成物和必要 docs；永久知识、获批原型、其他 change 和无关文件保持原状。全部完成前保持 active，不将规划、mock 或交叉编译描述成实机通过。
