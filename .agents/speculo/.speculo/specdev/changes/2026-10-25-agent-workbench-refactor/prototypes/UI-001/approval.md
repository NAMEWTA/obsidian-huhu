# UI-001 完整确认快照

Source: 本会话用户答复：发布这 6 条基线并完成封板（推荐）
Confirmed-at: 2026-10-25T03:13:11.528Z

## 用户决定与范围

用户先明确指定本 change 的 prototypes/UI-001/final，答复“这个方案非常的好，就用这个吧”，要求更新该 change 的所有相关文档。原 UI 选择记录保持在 approval-ui.md。

随后向用户明确展示基线候选与永久目标，问题为：A 方案已采用，change 文档已对齐，原型预览检查已通过；是否将已拟好的 6 条公共设计规则（现有布局、主题、共享控件、响应式、焦点、动效）发布到 .agents/speculo/.speculo/specdev/design/DESIGN.md 及其版本快照/索引，以完成 P/S 正式封板。用户答复：

> 发布这 6 条基线并完成封板（推荐）

本确认绑定当前 final/交互、change DESIGN revision 1、完整 comparison/final 原型资源及 DESIGN-0001 候选；发布范围仅 DS-001–DS-006 的既有 HUHU 工作台设计意图。原设计文档与 UI Skill owner 不变。不包含生产实现、提交、推送、发版或整个 change 归档。

## 不变摘要与目标

- change DESIGN designDigest：f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab
- prototype_ref.digest / 完整原型摘要：b8bcf55791eabb1d620c990e2aaaad49f7ccec9ab6a0f557e65ba3baa12fe1af
- baseline.digest / DESIGN-0001 designDigest：ebaca5f2f15fe081bf393c892f8b6583d4f2c6ad12cd92cb55068005fe83a331
- candidate_sha256 / 基线完整字节：50f0d924ee393fddca02d4765bd2d7bb49ba70f5e9f3bbf08ac20456b1cd651f
- current_sha256 预期：absent
- final HTML 字节 SHA-256：c44923a86fb41e3818b4d292bff6d2618bdeb3a87d46812a391aa368510903da
- final HTML：prototypes/UI-001/final/index.html
- 包：prototypes/UI-001/design-system.md
- 候选：prototypes/UI-001/baseline-draft.md
- 正式 current：.agents/speculo/.speculo/specdev/design/DESIGN.md
- 不可变快照：.agents/speculo/.speculo/specdev/design/revisions/DESIGN-0001.md
- 索引：.agents/speculo/.speculo/specdev/design/INDEX.md

## 验证前置

materialize --check 与 check-preview 已退出 0；8 个必需浏览器 case、40 个 DESIGN 页面状态有回读证据，13 张当前截图已打开核对。具体记录与原型摘要一致。公开基线根在发布准备时不存在；按 expect-absent 进行 CAS。发布后回读字节和规范摘要，再登记同一确认并执行 ready/Spec 门，不能以本记录替代网关事实回执。
