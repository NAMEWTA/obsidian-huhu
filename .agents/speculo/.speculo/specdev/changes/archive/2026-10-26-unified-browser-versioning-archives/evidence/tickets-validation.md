# 原型封板与 Tickets 验证

本次输入：DESIGN revision 2、UI-001 修订2、完整 Spec/ADR 和32张票；输出是原型确认与计划，未运行生产实现验收。

| 检查 | 结果 | 边界 |
|---|---|---|
| validate-design-package --check-ready | pass | 固定用户记录、规范基线摘要、物化一致、原型资源与既有真实浏览器证据有效；不代表宿主通过 |
| validate-specdev --stage prototype --prototype-id UI-001 | pass，0 errors / 0 warnings | 当前批准页面已封板 |
| validate-specdev --stage tickets | pass，0 errors / 0 warnings | 32票、36/36 AC、DAG、路径、Skill 与设计引用有效；允许明确 draft 扩展票 |
| ticket-control --map | 只读分析成功；frontier=[] | source Spec not Ready；owner未分配；依赖尚未完成。不能称为全计划可执行 |
| 逐票合同核对 | pass；4票设计前置保留 | 正常/失败/回归、步骤、真实源定位和 Skill 摘要，详见 ticket-contract-checks.json |
| pnpm test:docs | pass：551 Markdown / 446 local links / 827 external links（未抓取外链） | 文档链接/锚点检查，不触发插件构建 |

原型运行文件与浏览器185断言的输入未变，本次只修批准绑定及计划文档，不重复跑浏览器。原 preview-binding 保留，固定 approval-sealed 明确记录 baseline 字节SHA与规范designDigest的表示纠正；源内容未变。

没有运行本轮插件 build/lint/全量测试或四平台验收，因为未改生产源码。已有联合构建、472测试和25宿主场景仍是 integration.md 中的历史输入证据，未冒充本次 Tickets 实施成果。

完整调度结果见 ticket-control.json；计划质量与已修复问题见 ticket-planning-review.md。4张未展示 UI 票不 Ready，整个 Spec 保留 draft；后续先完成对应具体设计，再更新 Spec/绑定和派发。
