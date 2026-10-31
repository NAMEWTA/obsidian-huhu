---
schema_version: 1
artifact: source
change: 2026-10-31-browser-shared-session-space
source_type: conversation
canonical_locator: null
captured_at: '2026-10-31'
content_sha256: 22000f49c742d50e7730cd81edde54432be93a661e7d515a79878cddd03d340b
remote_state: not-applicable
close_capability: not-applicable
---

# 用户本轮授权原文

.agents/speculo/workflows/specdev/specdev-g-grill-with-docs/SKILL.md
.agents/speculo/workflows/specdev/specdev-p-goal-plan/SKILL.md
.agents/speculo/workflows/specdev/specdev-s-spec/SKILL.md
.agents/speculo/workflows/specdev/specdev-t-tickets/SKILL.md
.agents/speculo/workflows/specdev/specdev-t-triage/SKILL.md

请你 基于最新的dev分支，分别按相关顺序激活以上的这些 skill，并为我全面解决我给你的这个 issue https://github.com/NAMEWTA/obsidian-huhu/issues/38 。

具体步骤如下：
1. 形成相关文档：文档全面形成之后，如果有相关的问题，你可以直接问我。
2. 提交 PR：在全面形成文档以及具体的原型之后，将这一批的文档和原型一起提一个完整的 PR。
3. 注意一下关于圆形的部分，请你认真全面地去学习我另一个change .agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/prototypes/UI-001 关于原型的设计，进行复刻，因为我整体的UI会和另一个change保持一致 。
注意，关键是认真去读取我提的这个 issue 相关的那些内容，认真去识别这些内容。如果有相关的内容或功能，你的第一要务应该是先去 GitHub 上进行搜寻，看有没有相似的。如果能直接复用或仿造，就直接复用仿造，不要重复造轮子。注意一下，我现在的第一要务就是你激活以上 skill，帮我形成完整的文档。先不需要进行实施、去编写代码，你帮我形成完整的文档，然后提交 PR 就可以了。

## 授权解释

允许：形成文档、离线交互原型、一个面向 dev 的文档原型 PR。禁止推导为产品实现、数据清理、合并、部署或关闭 Epic 的授权。原型 HTML/CSS/JS 仅在 change 内作为设计工件。
