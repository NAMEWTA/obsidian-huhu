# #37 总收口：dev 稳定性、性能、功能修复与全界面统一

Outcome: active

## 目的与导航

在当前 dev 上重新确认、实际解决并以同一账本验收 [#37](https://github.com/NAMEWTA/obsidian-huhu/issues/37) 归并的 18 个原 Issue（#16、#19–#35）。规格权威在 `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`；本 README 只做导航。

- 来源快照：`<Path>{roots.state}/specdev/changes/{change}/source.md</Path>`
- 分诊与实施简报：`<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>`
- 设计树 / 讨论 / 术语 / 决定：`<Path>{roots.state}/specdev/changes/{change}/design-tree.json</Path>`、`<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`、`<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`、`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`

## 验收导航

见 `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>` 的验收合同（AC-001 至 AC-903，对应 #37 §15 的 A/G 编号）。

## 当前工作

- [x] T intake：来源冻结、源码机制核对、分诊简报
- [x] G 访谈：设计树 consensus（LOG-001–018）
- [x] S 规格：`status: ready`，`ready_for_tickets: true`
- [x] Tickets（38 张；逐票状态见 frontmatter）与 Tickets Map：`<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- [x] Goal Plan（draft，待实施授权）：`<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`；票级进度只看各 Ticket 与 Evidence
- [x] W6 的 P 原型与 change DESIGN（G-DESIGN 当前绑定见 LOG-017/018，原视觉批准见 LOG-016）：UI-001 ready，change DESIGN approved，DESIGN-0002 已发布；T-23–T-36 按 LOG-017/018 修订绑定与执行边界，逐票状态见 frontmatter

## 验证现状

尚未实施生产代码，没有生产 AC 的验收结果。UI-001 原型完成浏览器定向复核（19 项检查、42 张新截图、0 控制台异常），保留原有未改动状态/候选证据与其局限；源码物化、设计就绪与 SpecDev/Tickets 门的结果见 LOG-016。未运行插件构建、生产测试或真机复现。最新规划一致性与范围核验见 LOG-019。

## 下一步

用户授权实施后，从 `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>` 进入 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/SKILL.md</Path>` 的 run 模式：Lead 先在本 README 记录 Execution Context（默认 current），再从 G-BASELINE（T-01、T-02）开始，按 Goal Plan §4 允许 subagent / agent team 派遣。可同时推进 T-07、T-18、T-19 的 D 诊断；G-DESIGN 已完成，不重复创建原型。不授权提交、推送或远程写入。

## 原型评审入口

- 可操作页面：`<Path>{roots.state}/specdev/changes/{change}/prototypes/UI-001/final/index.html</Path>`
- 批准合同：`<Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path>`
- A 发布与本轮例外回执：`<Path>{roots.state}/specdev/changes/{change}/prototypes/UI-001/evidence/publication-receipt.json</Path>`
- 浏览器定向复核：`<Path>{roots.state}/specdev/changes/{change}/prototypes/UI-001/evidence/recheck.json</Path>`

导航改为直接切页按钮，保留 URL 深链接；不大于 480px 容器的 toast 在内容顶部占位。原 Orca 会话及其报告保留为只读历史；本轮当前工件优先。

## 当前范围：Browser 全面暂停（LOG-018）

用户计划后续完整重构浏览器。本 change 不再开发、修复、统一样式、迁移或优化 HUHU Browser/native runtime 及 Agent/Home/宿主集成，也不修复其测试或更新专用构建资产。冻结范围与共享文件处理见 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`、ADR-009。不得由全局 token、Shell、打包、清理或“全量检查失败”间接恢复 Browser 工作；其他一般实施授权不解除暂停。

本轮已按用户批准修订十项审计问题；38 条 AC 有映射，具体实现/生产验收尚未开始。T-07/T-18/T-19 诊断门与 T-37/T-38 上游门继续保留。UI 原型视觉与源码未变，change DESIGN 更新为范围修订版；永久 DESIGN-0002 与历史发布/批准证据不改。该基线为已批准的人工发布例外，不能描述为标准 promotion 工具成功。

下一步仍需生产实施授权；此处“暂停 Browser”不暂停用独立 Chrome/Chromium 验证其他模块 UI。source.md、triage.md 及历史 LOG/原型报告保留原范围用于溯源，执行时以最新 Spec、ADR-009、DESIGN 和票据为准。
