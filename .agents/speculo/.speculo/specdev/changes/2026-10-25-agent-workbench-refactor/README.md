# HUHU 终端 Agent 工作台：规格、设计、票据与目标计划

Outcome: completed

## Ownership

Owner: codex:/root
Work: specdev/goal-plan
Evidence: evidence/run-start.md

## 当前交付与权威

HUHU终端Agent工作台的本轮代码交付已完成，保留原18票、64项AC与批准A方案的权威。当前完整未提交工作副本已重建main.js/styles.css，最终独立标准轴、规范轴均通过；[最终审查与验收](evidence/final-review.md)保存输入、原始报告、失败/修复回路和实际验证。真实Obsidian、Provider、人工审批、输入法、五平台与负载按Spec §11由用户验收，当前完成结论不宣称这些实机结果成立。

| 文件 | 唯一职责 |
|---|---|
| [goal-plan.md](goal-plan.md) | GP-047；拥有跨票Gate关闭、Agent Team、模型分工、整合与恢复，代码Goal已完成，真实端到端由用户验收 |
| [tickets-map.md](tickets-map.md) / [ticket/](ticket/) | 18 张完整票的导航、真实依赖、64 项 AC 覆盖、项目 Skill 路由和共享写入约定；票级状态从原票回读 |
| [spec.md](spec.md) | 当前外部行为与验收合同：11 个故事、64 项 AC、12 个验证接缝；ready_for_tickets 为 true |
| [implementation-contracts.md](implementation-contracts.md) | 跨票 owner、计划 CLI v1、机器回执/退出码、能力与数据切换约定；尚未发行 |
| [reference-notes.md](reference-notes.md) | Herdr/Wave/tmux/xterm/portable-pty 的活动、许可、依赖、机制、已知问题与对应实施票；一手链接可直接检索 |
| [DESIGN.md](DESIGN.md) | approved revision 1；已采用 A 的视觉/交互权威，绑定 DESIGN-0001 与完整原型摘要 |
| [原型包](prototypes/UI-001/design-system.md) / [已采用预览 A](prototypes/UI-001/final/index.html) | ready；3 个候选、40 个页面状态、完整离线源码与浏览器证据；终端/数据为模拟 |
| [项目设计基线](../../design/DESIGN.md) / [版本索引](../../design/INDEX.md) | DESIGN-0001；DS-001–006 已经 A 网关发布，本轮不再改动 |
| [ADR.md](ADR.md) / [CONTEXT.md](CONTEXT.md) | 已采纳架构取舍 / 当前术语；实施完成依据仍由Ticket与最终审查提供 |
| [LOG.md](LOG.md) / [design-tree.json](design-tree.json) / [原始输入说明](inputs/README.md) | 原始来源、用户原话、闭合访谈节点及输入；历史推演不能覆盖现行合同 |
| [Goal 规划审查](evidence/goal-plan-review.md) / [票据规划审查](evidence/tickets-review.md) | 分别保存本轮 Goal 规划与此前 T 规划的真实验证；不冒充实施 Evidence |

Spec 管行为、DESIGN 管界面、公共实施合同管跨票工程约定、Ticket 管本票交付；Goal 管跨票 Gate/Wave、Agent Team、模型、调度和恢复，Map 导航到原权威。参考与历史只提供证据。原始 Run/Outbox、新业务 DB、仅同 Space 等旧推演已按 Spec §10 处置。当前没有待答的高影响产品或设计问题；性能默认值、局部文件拆分等在明确合同内由实施测量决定。

## 原始输入与参考

原件 `temp/HUHU-智能体终端-完整架构与重构方案.md` 已完整复制到本 change `inputs/`：1,278 行、101,143 字节，SHA-256 `c71b8637aef44c57f78cd5fd51da08e74ab37b004056c4012d7e6ad03bbb7aee`。原文、用户答复、已固定的批准和原型运行源码不因本轮对齐而改写。

HUHU 源码探索基线 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`。Herdr 继续固定 v0.9.5 / `2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01`；本轮补充五个项目的近两年活动、实际许可文本与已知问题，记录在参考文档和 [研究来源证据](evidence/reference-sources.json)。借鉴机制没有直接引入外部生产源码。

## 查看与继续

代码完成依据从[最终整体审查](evidence/final-review.md)与[Goal Gate关闭回执](goal-plan.md)进入；单票状态和Evidence由[Tickets Map](tickets-map.md)导航，不在README复制第二份进度。人工验收场景见 <Path>docs/agent-workbench-acceptance.md</Path>，真实执行结果由用户后续提供。未请求提交、推送、升版本、发布或归档，产物与源码保留在当前工作区。

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

[最终检查记录](evidence/final-checks/results.json)保留实际命令、退出码和全部历史失败；候选3的构建（含生产/测试类型）、全量测试、Rust、CLI/helper实进程、lint及适用架构/i18n/Promise/安全/包体/生成/许可检查通过。全量为513文件通过、4跳过，4889测试通过、42跳过，跳过不记通过。[受控Chrome](evidence/final-ui/results.json)验证生产组件与fixture端口下的布局、44px实际命中、焦点/取消与局部正文提示，不替代真实Obsidian/Provider。

全局文档检查exit126保留11条：另一change六处既有断链，以及010原始REPORT中的CSS selector五条解析误报；原始报告未改写，未新增产品文档断链，不冒称全局docs绿色。不可恢复journal/cleanup失败后的保留门禁需完整重启Obsidian；仅重开插件不会解除，普通取消且cleanup成功则尾部结束后可继续。详细实证和未运行边界见最终报告。

最终冻结范围456产品路径/20规范来源，基线33c21e0，当前HEAD仍78102da。18票均done且实际执行记录verified，所有writer停源；源码、必要文档与产物一致。[产物摘要](evidence/final-checks/artifacts-candidate3.json)及[不可变审查输入](evidence/final-review-candidate3-input.md#review-input)可回读。change留在原目录，永久知识和其他change未改。
