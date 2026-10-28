# 高亮优先的摘录与笔记卡片

Outcome: active

将 HUHU 现有批注模块升级为先高亮、后记笔记的 Markdown 阅读摘录系统。来源为 [#6](https://github.com/NAMEWTA/obsidian-huhu/issues/6)，本次交付分诊、决策访谈、完整 Spec 与一个最佳 UI 原型；未授权生产实现。

## 范围与权威

- 原始请求：[source.md](source.md)（不可变）。
- 分诊与影响分析：[triage.md](triage.md)。
- 决策进度：[design-tree.json](design-tree.json)；讨论与来源：[LOG.md](LOG.md)。
- 当前阶段：Triage 核验完成，进入 Grill 第一轮；回答前不把推荐方案记为共识。
- 本次写集仅为本 change；已有规则、其他 change、插件源码和构建产物不纳入修改。

## 验证

2026-10-26：独立只读探索执行 `pnpm exec vitest run src/modules/comments src/app/workbench/comments-leaf.dom.test.tsx src/app/settings/nav.test.ts`，退出 0，8 个文件、58 项通过。验证现有基线，不证明目标功能已实现。pnpm 自动补齐依赖缓存，受跟踪依赖清单与锁文件未变化。

## 接续

Grill 明确范围与行为并确认共识后，依用户指示继续 Spec → Prototype；最终 HTML 与 DESIGN 形成可审阅结果后集中确认。
