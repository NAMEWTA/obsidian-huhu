# #41：dev 稳定化、性能修复、全界面统一与产品线收缩

Outcome: completed

> 2026-11-11 迁移归档：按原完成与归档回执归入 implemented / refactor，宿主真机项仍按原约定由用户验收。本次未重跑产品验收、未提交或发版。原路径与依据见[迁移记录](../../../../project/specdev-migration.md)。

Evidence-Mode: conclusion-report
Evidence-Basis: AGENTS.md「SpecDev evidence 入库规则」；LOG-026
History-Rewrite: 仓库历史已重写，base_sha 86c500556db1d64865c4cc7f1aff1dd83de071fa 不再是 Git 对象

## 目的与导航

> **2026-11-02 `docs/e2e` 已删除（用户决定，LOG-025）：** 原 `docs/e2e/`（含 `dev-overhaul/ledger.md` 统一账本、baseline、hook、ui 等结果与截图，以及 T-39 的 `removal/residual-scan.mjs`）已从仓库删除，内容只在 git 历史（提交 `ffac3a0d` 及之前）。本 change 各票、会话与归档文档里出现的 `docs/e2e/...` 路径均为历史记录；Hook 测量与启动采样脚本的输出已改到被忽略的 `temp/dev-overhaul/`。后续统一账本与票级结果的新位置待用户决定，在决定前不要重新创建 `docs/e2e/`。

本 change 实施并验收 [#41](https://github.com/NAMEWTA/obsidian-huhu/issues/41)：在当前 dev 上实际解决启动、天气、Hook 发布、功能缺陷、诊断、包体预算与来源记录问题并统一保留模块的界面，以同一账本给出证据；同时承载删除主线 T-39–T-46，整体删除 Browser、huhubot（含 superbot 方向）、Home 网页嵌入分区与网易云音乐（ADR-010、LOG-020、LOG-022）。规格权威在 `<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/spec.md</Path>`；本 README 只做导航。

- 来源快照：`<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/source.md</Path>`
- 分诊与实施简报：`<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/triage.md</Path>`
- 删除盘点初稿：`<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/removal-inventory.md</Path>`
- 设计树 / 讨论 / 术语 / 决定：`<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/design-tree.json</Path>`、`<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/LOG.md</Path>`、`<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/CONTEXT.md</Path>`、`<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/ADR.md</Path>`

## 验收导航

见 `<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/spec.md</Path>` 的验收合同（AC-001 至 AC-903，对应 #41 §3 与账本 A/G 编号；删除主线为 AC-401 至 AC-408；huhubot 相关 AC 按 OOS-008 撤回）。

## 当前工作

- [x] T intake：来源冻结、源码机制核对、分诊简报
- [x] G 访谈：设计树 consensus（LOG-001–018；产品线收缩为 LOG-020，D-017–D-020）
- [x] S 规格：`status: ready`，`ready_for_tickets: true`
- [x] Tickets（46 张：原 38 张中 6 张因收缩取消，新增删除主线 8 张；逐票状态见 frontmatter）与 Tickets Map：`<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/tickets-map.md</Path>`
- [x] Goal Plan（已授权实施）：`<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/goal-plan.md</Path>`；票级进度只看各 Ticket 与 Evidence
- [x] W6 的 P 原型与 change DESIGN：UI-001 ready，change DESIGN revision 3 approved（删除 UI-BOT 页面与音乐账号恢复状态，用户 2026-11-02 授权，LOG-023），DESIGN-0002 已发布；UI 票的设计绑定已更新到 revision 3，逐票状态见 frontmatter

## 验证现状

**2026-11-04 实施结论：** 46 张票全部 done 或经用户批准 cancelled；G-REMOVAL 与 G-FINAL 本地检查全部通过，统一账本见 `<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/evidence/report-ledger.md</Path>`（passed 27、宿主部分待用户真机验收 5、withdrawn 7、cancelled 7）。AC-311 已于 2026-11-04 经 Windows CI 连续两次 20/20 关闭；dev 338f26a 上 Node.js build（三平台）、Build terminal helper、Highlights 全部 success。release 工作流运行即发版、未授权，not-applicable（见 `<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/evidence/T-38.md</Path>`）。完成依据：`<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/evidence/report-ledger.md</Path>` 与 `<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/evidence/T-38.md</Path>`。宿主内真机项（AC-163 实际启动预算、AC-202/211/251/351 宿主表现、Windows/macOS 实机）按 LOG-012 由用户验收，不在本计划执行与跟踪范围；关闭 #41 由用户在真机验收后决定。

T-01基线与T-02包体基线已验收，G-BASELINE关闭。44个测试入口42个通过；Vitest、docs与锁定Go全量失败原样保留，详见对应Evidence与docs/e2e/dev-overhaul/baseline。T-14 的 AC161/162 已由真实 Home 装配及竞争回归、Lead 工作台验收通过；T03来源与文档门、T04停止阶段已验收（原入口Go全量0）；T23已由Lead验收，48例矩阵/13交互及样式运行时通过；T06独立审查中，T16审查发现兼容与断言缺陷正在窄修复，T18已由Lead114例与构建/lint验收，T09规模基线和T12发布测量正在实施。最新wave3预算：main超20757B、启动eager超1165B、Agent激活超3478B，保留给T37/T38关闭，阈值未改；批准原型不代替真实实现。

## 下一步

2026-11-02 更新：删除主线 T-39–T-46 只完成规划，实施前需用户明确授权（G-REMOVAL，见 Map 第 13 节）。保留票照常按 Goal Plan 推进；T-05、T-07、T-08、T-10、T-11、T-33 已取消，下文提到的 T-07 诊断不再执行。以下为原文：

本次用户已授权实施，从 `<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/tickets-map.md</Path>` 进入 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/SKILL.md</Path>` 的 run 模式：Lead 先在本 README 记录 Execution Context（默认 current），再从 G-BASELINE（T-01、T-02）开始，按 Goal Plan §4 允许 subagent / agent team 派遣。可同时推进 T-07、T-18、T-19 的 D 诊断；G-DESIGN 已完成，不重复创建原型。不授权提交、推送或远程写入。

## 原型评审入口

- 可操作页面：`<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/prototypes/UI-001/final/index.html</Path>`
- 批准合同：`<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/DESIGN.md</Path>`
- A 发布与本轮例外回执：`<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/prototypes/UI-001/evidence/publication-receipt.json</Path>`
- 浏览器定向复核：`<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/prototypes/UI-001/evidence/recheck.json</Path>`

导航改为直接切页按钮，保留 URL 深链接；不大于 480px 容器的 toast 在内容顶部占位。原 Orca 会话及其报告保留为只读历史；本轮当前工件优先。

## 当前范围：产品线收缩（ADR-010、ADR-011）

**2026-11-03 当前数据政策：** HUHU 尚未正式发布。开发期旧中文目录、旧 Bot Profile、Browser/huhubot 数据、旧设置、看板字段、Cookie 会话与旧 Agent 布局均非受支持的历史版本。**不要求保留、迁移、回读或兼容任何发布前旧数据**；无需旧数据字节不变、旧库、旧布局恢复等验证，也不提供旧数据手动清理指引。仅支持现行格式的新库及功能，可删除旧类型、协议、迁移路径与专用测试；当前有效数据的写入正确性、隐私、权限、凭据和外部动作安全仍然有效（ADR-011，2026-11-03 用户最新指令，取代 D-019）。

用户 2026-11-02 决定整体删除 browser、huhubot、superbot，三者不再做任何优化或修复，代码、界面、设置、多语言、构建发行、测试、验收脚本与文档一并移除；发布前旧数据无需保留或兼容（ADR-011）。Home 网页嵌入分区、网易云音乐及其库内会话按 D-018 一并删除（用户 2026-11-02 决定，LOG-022）；“网页快捷卡”保留并改用系统浏览器，只去掉“打开方式”选项（D-021，用户已确认，LOG-023）。删除顺序与门禁见 Map 第 13 节；ADR-009 的冻结在 T-44 完成前继续约束非删除票不得修 Browser，删除票本身不受冻结限制。

## 历史范围：Browser 全面暂停（LOG-018，已被 ADR-010 取代）

用户计划后续完整重构浏览器。本 change 不再开发、修复、统一样式、迁移或优化 HUHU Browser/native runtime 及 Agent/Home/宿主集成，也不修复其测试或更新专用构建资产。冻结范围与共享文件处理见 `<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>`、ADR-009。不得由全局 token、Shell、打包、清理或“全量检查失败”间接恢复 Browser 工作；其他一般实施授权不解除暂停。（以上为 2026-10-31 历史表述。）

本轮已按用户批准修订十项审计问题；38 条 AC 有映射，基线采集已完成，具体生产功能按票实施验收。T-18 已完成精确诊断并 ready；T-07/T-19 诊断门与 T-37/T-38 上游门继续保留。UI 原型视觉与源码未变，change DESIGN 更新为范围修订版；永久 DESIGN-0002 与历史发布/批准证据不改。该基线为已批准的人工发布例外，不能描述为标准 promotion 工具成功。

生产实施已获本次授权；此处“暂停 Browser”不暂停用独立 Chrome/Chromium 验证其他模块 UI。执行时以最新 Spec、ADR-010、DESIGN revision 3 和票据为准；历史 LOG 与原型报告只作溯源。

<a id="execution-context"></a>
## Execution Context

```json
{
  "schema_version": 1,
  "change": "2026-10-31-dev-stabilization-overhaul",
  "workspace_policy": "current",
  "workspace_ref": "current",
  "branch": "dev",
  "base_sha": "86c500556db1d64865c4cc7f1aff1dd83de071fa",
  "owner": "host:codex/root",
  "ticket_execution": "auto"
}
```

2026-10-31 用户明确要求完成全部票据，指定 gpt-6-astra-low 实现、Codex Lead 派遣与验收。本次开启非 Browser 实施和本地验证；此前“未授权”文字为规划历史。未请求提交、推送、远程 CI dispatch、发布或永久知识更新。起点仅有已暂存的 change 规划材料，生产代码与 HEAD 一致；保全原有暂存内容。

2026-10-31 实施进展：T-01/T-02/T-03/T-04/T-14/T-16/T-18/T-23 已完成各自验收；T-04 的合同仍等待 T-06 联合集成门。具体固定输入、历史失败与验证边界以各 Evidence 和账本为准。

2026-10-31 T-06固定10项经独立复审与Lead最终67项真实TS↔Go通过，T-04/T-06同批联合验收完成，T-05停止资源解除等待；wave4类型/样式/esbuild通过，全局预算仍三项超限并留T-37/T-38。

2026-10-31 T-09改前规模设施经Lead真实代码/原数据/8项摘要验收完成，T-05/T-15/T-24继续本地实现；T-12具体远程四文件方案已提出最后授权，未得到答复前不执行远程写入。T-19独立Chrome扩大诊断仍未复现，保留未知。

2026-10-31 用户结束未复现的T19跟进：以cancelled+Evidence记录完成处置，根因未知且无生产修复；Map23显式解除T28该前置。用户明确暂不运行远程CI，T12 Windows继续待验收，其他本地工作继续。
