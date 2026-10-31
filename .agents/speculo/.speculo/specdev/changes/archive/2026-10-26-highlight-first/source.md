---
schema_version: 1
artifact: source
change: 2026-10-26-highlight-first
source_type: github-issue
canonical_locator: https://github.com/NAMEWTA/obsidian-huhu/issues/6
captured_at: 2026-10-26T13:23:33.363902+00:00
content_sha256: 1d05348239dadb5cf432ae37ce2620942044f2e8f8b7bd8a6aa1a371f3dabca2
remote_state: open
close_capability: supported
---

# Source: feat(highlights): 将「批注」升级为高亮摘录与笔记卡片（借鉴 HiLighter）

## Capture Metadata

- **Capture method:** GitHub connector fetch_issue + fetch_issue_comments
- **Author:** NAMEWTA
- **Created / updated:** 2026-10-26T12:58:02Z / 2026-10-26T12:58:02Z
- **Labels or classification supplied by source:** none
- **Attachments:** 原始正文中的 URL 引用，不复制附件。
- **Redactions:** none；未保存 API 返回的个人邮件、账户 ID 或认证信息。
- **Pagination / fetched at:** 正文完整；评论跨全部分页返回 0 条，与 Issue comments=0 一致；2026-10-26T13:23:33.363902+00:00。
- **Base / head SHA:** 不适用（Issue）。
- **Supersedes:** 初次来源。
- **Hash method:** 下列 Snapshot JSON 以 UTF-8、键排序、无空格分隔符编码的 SHA-256，包含标题、完整正文、作者、状态、标签、创建/更新时间与全部评论；不包含捕获时间。

## Original Content

## 背景与目标

参考 [PandoraReads/HiLighter](https://github.com/PandoraReads/HiLighter)，把 HUHU 现有以「行/选区批注 + 讨论线程」为中心的功能，迭代为 **Highlight-first（先高亮，后记笔记）** 的阅读摘录系统：

> 划词 → 一键选色高亮（不必先写评论）→ 在侧栏管理摘录卡片 → 随时补充笔记、标签、讨论，并可靠地回到原文。

这是 **HUHU 现有「批注」模块的产品升级，不是并排新增一个互不相干的插件**。保留有用的旧能力（锚点、回复、孤儿重挂、存储恢复），弱化「必须创建讨论线程」的使用门槛。

## 已核对的现状与对标

### HUHU 当前能力（可复用）

- [现有批注文档](https://github.com/NAMEWTA/obsidian-huhu/blob/main/docs/comments.md)：Markdown 行/选区批注、悬停讨论、当前文档/全库侧栏、定位原文；旁路保存在 `.huhu/editor/comments/`，**不修改笔记正文**。
- [锚点算法](https://github.com/NAMEWTA/obsidian-huhu/blob/main/src/modules/comments/core/anchor.ts)：选区原文、哈希、前后文、位置提示及模糊定位；可直接作为高亮锚点基础，但须测试重复文本与编辑后定位。
- [存储模型](https://github.com/NAMEWTA/obsidian-huhu/blob/main/src/modules/comments/core/model.ts)、[持久化](https://github.com/NAMEWTA/obsidian-huhu/blob/main/src/modules/comments/core/store.ts)：当前 `CommentThread` 强制至少一条消息，不能表示「只有高亮、没有笔记」；v2 使用索引、分文件 sidecar、pending 写入恢复，不能在重构中丢失。
- [CodeMirror 装饰](https://github.com/NAMEWTA/obsidian-huhu/blob/main/src/modules/comments/ui/editor/decorations.ts)、[编辑器接入](https://github.com/NAMEWTA/obsidian-huhu/blob/main/src/modules/comments/ui/editor/extension.ts)、[阅读模式](https://github.com/NAMEWTA/obsidian-huhu/blob/main/src/modules/comments/ui/reading.ts)：已有选区标记与阅读模式渲染能力。
- [现有侧栏](https://github.com/NAMEWTA/obsidian-huhu/blob/main/src/modules/comments/ui/panel/CommentsPanel.tsx)：已有当前笔记/全库、状态筛选、位置排序与延迟加载骨架。

### HiLighter 值得借鉴的设计（已阅读 README 与相关源码）

1. **低摩擦划词工具条**：黄/粉/蓝/绿预设颜色，一次点击生成高亮；旁边提供「写笔记」入口；自定义颜色在设置/管理界面维护，避免在划词浮层误触创建颜色（[selection-menu.ts](https://github.com/PandoraReads/HiLighter/blob/main/src/selection/selection-menu.ts)）。
2. **高亮即卡片**：摘录、颜色、笔记、标签、来源路径形成统一条目；侧栏和 Card Studio 支持搜索、颜色/文件/标签筛选、原文顺序、批量操作（[models.ts](https://github.com/PandoraReads/HiLighter/blob/main/src/models.ts)、[grouping.ts](https://github.com/PandoraReads/HiLighter/blob/main/src/studio/grouping.ts)）。
3. **双向联动**：点卡片精确回到原文；修改颜色/删除卡片应即时反映在原文高亮中。定位时尽可能只滚动，不破坏光标或造成 Live Preview 闪烁（[locate.ts](https://github.com/PandoraReads/HiLighter/blob/main/src/locate.ts)）。
4. **多色与主题适配**：统一颜色 ID/语义标签，支持自定义颜色、深浅色模式下的可读对比度（[colors.ts](https://github.com/PandoraReads/HiLighter/blob/main/src/colors.ts)）。
5. **后续扩展思路**：PDF 用页内几何位置 + 文本校验，EPUB 用 CFI；FSRS、AI 翻译/研究、思维导图属后续能力，不应该阻塞 Markdown 核心（[PDF 锚点实现](https://github.com/PandoraReads/HiLighter/blob/main/src/pdf/anchor-math.ts)、[功能总览](https://github.com/PandoraReads/HiLighter/blob/main/docs/README_ZH.md)）。

**不照搬之处**：HiLighter 的 Markdown 采用 `<mark ...>` 原文标记并以 IndexedDB + 单独同步文件管理卡片；HUHU 已有可靠的 vault sidecar、写入恢复与 Git/库级数据路径，**首选保留 HUHU 的非侵入式存储和 CodeMirror/阅读模式装饰**，不要为视觉一致性修改用户笔记、也不要引入第二套相互竞争的数据真源。

## 实施范围与优先级

### P0 — 把「批注」真正改成 Highlight-first（首个可交付版本）

- [ ] **统一数据实体**：支持「仅高亮（无笔记）」、高亮 + 自由笔记、高亮 + 原有讨论，以及旧行级批注；至少包含稳定 ID、来源文件、文本锚点、颜色、笔记/讨论、时间信息，标签可扩展。明确颜色与「open/resolved/orphaned」不是一回事。
- [ ] **划词高亮工具条**：默认四色（黄/粉/蓝/绿），单击立即创建；提供「添加笔记」按钮；可从现有选区命令触发并提供快捷键；浮层不要夺走选区焦点，兼容输入法、移动端和弹出窗口。
- [ ] **原文可见的颜色高亮**：编辑/实时预览和阅读模式一致渲染；点选/悬停可查看卡片并修改颜色、编辑笔记或删除；尊重语法边界（前置元数据/代码块等不可标注区域），跨块无法稳定映射时明确提示，不静默错标。
- [ ] **把现有「批注」侧栏重构为「高亮」侧栏**：当前文档 / 全库切换；卡片至少展示摘录、色条、笔记摘要和来源；点击精确定位原文并短暂定位提示；支持直接编辑笔记、换色、删除。
- [ ] **双向一致**：新建、换色、修改笔记、删除后，正文装饰与当前/全库卡片同步刷新；高亮无需消息也能持久化；切换笔记、关闭重开、插件停用再启用均保持一致。
- [ ] **旧批注兼容/迁移**：现有 v2 数据、回复链、作者、解决状态、行级标记、锚点与「已脱离/重新挂上」能力必须保留；旧行级批注不强制伪装成文字选区高亮。迁移前备份、版本校验、幂等及失败回退；不可静默删除旧批注或覆盖损坏文件。v1 历史数据沿用现有风险提示/备份策略，另行评估，不能假称已支持。
- [ ] **界面与设置收口**：面向用户以「高亮」命名主入口、侧栏、命令与说明；保留旧命令/视图/配置的兼容入口或显式迁移方案，避免断裂；中英双语文案。

### P1 — 将高亮变成真正可管理的摘录库

- [ ] **检索与筛选**：在当前文档/全库按摘录、笔记、标签关键词搜索，按颜色筛选，按原文位置/创建时间/最近修改排序；支持按来源文件、颜色、标签分组。
- [ ] **卡片增强**：独立详情编辑、标签增删、置顶/归档、批量换色/打标签/删除；删除操作有确认或撤销，避免误操作。
- [ ] **自定义颜色与语义**：颜色名称/含义可编辑，设置中集中维护，删除自定义调色板项不能造成历史高亮失色；深色主题对比度、键盘可操作性与移动端布局验收。
- [ ] **导出/互操作**：单卡或按文件批量导出 Markdown（附来源链接、颜色、笔记和标签）；评估 **可选、无破坏性** 识别 Obsidian 原生 `==文字==` / `<mark>`，防止与 HUHU 自身高亮重复计数；导入语义需另行确定。
- [ ] **轻量卡片总览**：先利用现有侧栏/工作台组件；是否独立 Card Studio 作为后续子任务评估，避免首版新造一整套复杂工作区。

### P2 — 单独拆分后续 Issue（不作为本 Issue 首版阻塞项）

- [ ] PDF 页面高亮（几何锚点、重排/缩放稳定性、卡片双向同步）。
- [ ] EPUB 阅读器与 CFI 高亮、阅读进度/书签。
- [ ] 可选 AI 解释/翻译/研究（优先复用 HUHU 已有模块接口，不默认强制绑定外部模型）、FSRS 闪卡、思维导图。

## 技术方案与约束

1. **先定模型，再改 UI**：建议让 highlight 成为一等实体，评论/回复作为可选附属信息，且保留行级旧批注。审视 `core/model.ts`、`core/store.ts`、`services/comments.ts`、`api.ts` 的类型/服务边界，设计新 schema 与迁移步骤；不要只给旧线程加一个 `color` 字段而仍要求至少一条消息。可保留原存储根以降低迁移成本，但必须定义清楚唯一数据真源及版本升级。
2. **锚点安全优先**：复用 HUHU 原文 + 上下文 + 位置提示与模糊定位，新增高亮多色/重叠段的明确渲染规则；重复句、换行、剪切/粘贴、大段插入、文档移动、原文删除后**不得悄悄重新挂到错误位置**，失配进入可手动重挂状态。
3. **性能**：大文件/大量高亮下避免全库同步扫描和按每个装饰段遍历全部高亮的二次复杂度；文档索引、按需读取、增量重绘、列表虚拟化/分页按实际测量选择。优化 editor decorations 的重叠分段策略及 reading postprocessor 重复 DOM 包裹/刷新成本。
4. **数据可靠性**：继承 sidecar 的串行写盘、pending 恢复、失败草稿保留、路径重命名更新、删除策略、多窗口隔离与模块卸载清理；跨设备使用库文件同步机制，避免仅保存在某设备的 IndexedDB。
5. **可维护性与许可**：沿用 HUHU 模块 API、React 组件与 i18n；借鉴交互理念优先于直接复制实现。如引用 HiLighter MIT 源码，按许可证保留原始版权和许可说明并更新第三方声明。

## 验收条件（建议作为 P0 合并门槛）

- [ ] 在普通 Markdown 段落选中一段文字，**不输入评论**点任意颜色，高亮立即出现，侧栏立即新增可定位卡片；重启 Obsidian 后保留。
- [ ] 同一段可换色、加/改笔记、删高亮；原文与卡片实时一致，操作不改写 Markdown 源内容。
- [ ] 在编辑/实时预览/阅读模式查看一致；打开多个编辑窗口、移动/重命名文件后仍能正确定位；旧批注可查看/回复/解决/重挂。
- [ ] 重复文本、相邻/嵌套/交叠高亮、空白选区、代码/前置元数据、原文大幅编辑和删除都有明确且稳定的处理；定位失败时不误跳到别处。
- [ ] v2 批注迁移前后数量、文本、作者、回复历史、状态和锚点不丢失；模拟中断/损坏/写盘失败可恢复或清楚告警，不制造重复条目。
- [ ] 深色/浅色主题色彩可辨；键盘及移动端可完成核心流程；不存在划词菜单反复弹出、焦点丢失或阅读模式重复包裹标记的问题。
- [ ] 测试覆盖锚点/数据迁移/CRUD/列表过滤排序/多窗口清理等；根据改动运行 HUHU 项目要求的测试、lint、build，并更新 `docs/comments.md` / README 与中英界面文案。

## 参考与视觉资料

- HiLighter: https://github.com/PandoraReads/HiLighter （[卡片工作室截图](https://github.com/PandoraReads/HiLighter/blob/main/screenshots/card-studio.png)、[侧栏截图](https://github.com/PandoraReads/HiLighter/blob/main/screenshots/screenshot1.png)）
- HUHU 当前批注: https://github.com/NAMEWTA/obsidian-huhu/blob/main/docs/comments.md
- 上游许可证: [HiLighter MIT](https://github.com/PandoraReads/HiLighter/blob/main/LICENSE)

> **本 Issue 先明确方向与验收标准；暂不改动插件源码。** 建议按 P0 → P1 实现，P2 再分别开独立 Issue；具体持久化 schema/迁移路径在开发前落一份可评审的短设计。

## Source Comments

无（0 条）。

## PR Evidence

不适用。

## Snapshot JSON

```json
{
  "title": "feat(highlights): 将「批注」升级为高亮摘录与笔记卡片（借鉴 HiLighter）",
  "body": "## 背景与目标\n\n参考 [PandoraReads/HiLighter](https://github.com/PandoraReads/HiLighter)，把 HUHU 现有以「行/选区批注 + 讨论线程」为中心的功能，迭代为 **Highlight-first（先高亮，后记笔记）** 的阅读摘录系统：\n\n> 划词 → 一键选色高亮（不必先写评论）→ 在侧栏管理摘录卡片 → 随时补充笔记、标签、讨论，并可靠地回到原文。\n\n这是 **HUHU 现有「批注」模块的产品升级，不是并排新增一个互不相干的插件**。保留有用的旧能力（锚点、回复、孤儿重挂、存储恢复），弱化「必须创建讨论线程」的使用门槛。\n\n## 已核对的现状与对标\n\n### HUHU 当前能力（可复用）\n\n- [现有批注文档](https://github.com/NAMEWTA/obsidian-huhu/blob/main/docs/comments.md)：Markdown 行/选区批注、悬停讨论、当前文档/全库侧栏、定位原文；旁路保存在 `.huhu/editor/comments/`，**不修改笔记正文**。\n- [锚点算法](https://github.com/NAMEWTA/obsidian-huhu/blob/main/src/modules/comments/core/anchor.ts)：选区原文、哈希、前后文、位置提示及模糊定位；可直接作为高亮锚点基础，但须测试重复文本与编辑后定位。\n- [存储模型](https://github.com/NAMEWTA/obsidian-huhu/blob/main/src/modules/comments/core/model.ts)、[持久化](https://github.com/NAMEWTA/obsidian-huhu/blob/main/src/modules/comments/core/store.ts)：当前 `CommentThread` 强制至少一条消息，不能表示「只有高亮、没有笔记」；v2 使用索引、分文件 sidecar、pending 写入恢复，不能在重构中丢失。\n- [CodeMirror 装饰](https://github.com/NAMEWTA/obsidian-huhu/blob/main/src/modules/comments/ui/editor/decorations.ts)、[编辑器接入](https://github.com/NAMEWTA/obsidian-huhu/blob/main/src/modules/comments/ui/editor/extension.ts)、[阅读模式](https://github.com/NAMEWTA/obsidian-huhu/blob/main/src/modules/comments/ui/reading.ts)：已有选区标记与阅读模式渲染能力。\n- [现有侧栏](https://github.com/NAMEWTA/obsidian-huhu/blob/main/src/modules/comments/ui/panel/CommentsPanel.tsx)：已有当前笔记/全库、状态筛选、位置排序与延迟加载骨架。\n\n### HiLighter 值得借鉴的设计（已阅读 README 与相关源码）\n\n1. **低摩擦划词工具条**：黄/粉/蓝/绿预设颜色，一次点击生成高亮；旁边提供「写笔记」入口；自定义颜色在设置/管理界面维护，避免在划词浮层误触创建颜色（[selection-menu.ts](https://github.com/PandoraReads/HiLighter/blob/main/src/selection/selection-menu.ts)）。\n2. **高亮即卡片**：摘录、颜色、笔记、标签、来源路径形成统一条目；侧栏和 Card Studio 支持搜索、颜色/文件/标签筛选、原文顺序、批量操作（[models.ts](https://github.com/PandoraReads/HiLighter/blob/main/src/models.ts)、[grouping.ts](https://github.com/PandoraReads/HiLighter/blob/main/src/studio/grouping.ts)）。\n3. **双向联动**：点卡片精确回到原文；修改颜色/删除卡片应即时反映在原文高亮中。定位时尽可能只滚动，不破坏光标或造成 Live Preview 闪烁（[locate.ts](https://github.com/PandoraReads/HiLighter/blob/main/src/locate.ts)）。\n4. **多色与主题适配**：统一颜色 ID/语义标签，支持自定义颜色、深浅色模式下的可读对比度（[colors.ts](https://github.com/PandoraReads/HiLighter/blob/main/src/colors.ts)）。\n5. **后续扩展思路**：PDF 用页内几何位置 + 文本校验，EPUB 用 CFI；FSRS、AI 翻译/研究、思维导图属后续能力，不应该阻塞 Markdown 核心（[PDF 锚点实现](https://github.com/PandoraReads/HiLighter/blob/main/src/pdf/anchor-math.ts)、[功能总览](https://github.com/PandoraReads/HiLighter/blob/main/docs/README_ZH.md)）。\n\n**不照搬之处**：HiLighter 的 Markdown 采用 `<mark ...>` 原文标记并以 IndexedDB + 单独同步文件管理卡片；HUHU 已有可靠的 vault sidecar、写入恢复与 Git/库级数据路径，**首选保留 HUHU 的非侵入式存储和 CodeMirror/阅读模式装饰**，不要为视觉一致性修改用户笔记、也不要引入第二套相互竞争的数据真源。\n\n## 实施范围与优先级\n\n### P0 — 把「批注」真正改成 Highlight-first（首个可交付版本）\n\n- [ ] **统一数据实体**：支持「仅高亮（无笔记）」、高亮 + 自由笔记、高亮 + 原有讨论，以及旧行级批注；至少包含稳定 ID、来源文件、文本锚点、颜色、笔记/讨论、时间信息，标签可扩展。明确颜色与「open/resolved/orphaned」不是一回事。\n- [ ] **划词高亮工具条**：默认四色（黄/粉/蓝/绿），单击立即创建；提供「添加笔记」按钮；可从现有选区命令触发并提供快捷键；浮层不要夺走选区焦点，兼容输入法、移动端和弹出窗口。\n- [ ] **原文可见的颜色高亮**：编辑/实时预览和阅读模式一致渲染；点选/悬停可查看卡片并修改颜色、编辑笔记或删除；尊重语法边界（前置元数据/代码块等不可标注区域），跨块无法稳定映射时明确提示，不静默错标。\n- [ ] **把现有「批注」侧栏重构为「高亮」侧栏**：当前文档 / 全库切换；卡片至少展示摘录、色条、笔记摘要和来源；点击精确定位原文并短暂定位提示；支持直接编辑笔记、换色、删除。\n- [ ] **双向一致**：新建、换色、修改笔记、删除后，正文装饰与当前/全库卡片同步刷新；高亮无需消息也能持久化；切换笔记、关闭重开、插件停用再启用均保持一致。\n- [ ] **旧批注兼容/迁移**：现有 v2 数据、回复链、作者、解决状态、行级标记、锚点与「已脱离/重新挂上」能力必须保留；旧行级批注不强制伪装成文字选区高亮。迁移前备份、版本校验、幂等及失败回退；不可静默删除旧批注或覆盖损坏文件。v1 历史数据沿用现有风险提示/备份策略，另行评估，不能假称已支持。\n- [ ] **界面与设置收口**：面向用户以「高亮」命名主入口、侧栏、命令与说明；保留旧命令/视图/配置的兼容入口或显式迁移方案，避免断裂；中英双语文案。\n\n### P1 — 将高亮变成真正可管理的摘录库\n\n- [ ] **检索与筛选**：在当前文档/全库按摘录、笔记、标签关键词搜索，按颜色筛选，按原文位置/创建时间/最近修改排序；支持按来源文件、颜色、标签分组。\n- [ ] **卡片增强**：独立详情编辑、标签增删、置顶/归档、批量换色/打标签/删除；删除操作有确认或撤销，避免误操作。\n- [ ] **自定义颜色与语义**：颜色名称/含义可编辑，设置中集中维护，删除自定义调色板项不能造成历史高亮失色；深色主题对比度、键盘可操作性与移动端布局验收。\n- [ ] **导出/互操作**：单卡或按文件批量导出 Markdown（附来源链接、颜色、笔记和标签）；评估 **可选、无破坏性** 识别 Obsidian 原生 `==文字==` / `<mark>`，防止与 HUHU 自身高亮重复计数；导入语义需另行确定。\n- [ ] **轻量卡片总览**：先利用现有侧栏/工作台组件；是否独立 Card Studio 作为后续子任务评估，避免首版新造一整套复杂工作区。\n\n### P2 — 单独拆分后续 Issue（不作为本 Issue 首版阻塞项）\n\n- [ ] PDF 页面高亮（几何锚点、重排/缩放稳定性、卡片双向同步）。\n- [ ] EPUB 阅读器与 CFI 高亮、阅读进度/书签。\n- [ ] 可选 AI 解释/翻译/研究（优先复用 HUHU 已有模块接口，不默认强制绑定外部模型）、FSRS 闪卡、思维导图。\n\n## 技术方案与约束\n\n1. **先定模型，再改 UI**：建议让 highlight 成为一等实体，评论/回复作为可选附属信息，且保留行级旧批注。审视 `core/model.ts`、`core/store.ts`、`services/comments.ts`、`api.ts` 的类型/服务边界，设计新 schema 与迁移步骤；不要只给旧线程加一个 `color` 字段而仍要求至少一条消息。可保留原存储根以降低迁移成本，但必须定义清楚唯一数据真源及版本升级。\n2. **锚点安全优先**：复用 HUHU 原文 + 上下文 + 位置提示与模糊定位，新增高亮多色/重叠段的明确渲染规则；重复句、换行、剪切/粘贴、大段插入、文档移动、原文删除后**不得悄悄重新挂到错误位置**，失配进入可手动重挂状态。\n3. **性能**：大文件/大量高亮下避免全库同步扫描和按每个装饰段遍历全部高亮的二次复杂度；文档索引、按需读取、增量重绘、列表虚拟化/分页按实际测量选择。优化 editor decorations 的重叠分段策略及 reading postprocessor 重复 DOM 包裹/刷新成本。\n4. **数据可靠性**：继承 sidecar 的串行写盘、pending 恢复、失败草稿保留、路径重命名更新、删除策略、多窗口隔离与模块卸载清理；跨设备使用库文件同步机制，避免仅保存在某设备的 IndexedDB。\n5. **可维护性与许可**：沿用 HUHU 模块 API、React 组件与 i18n；借鉴交互理念优先于直接复制实现。如引用 HiLighter MIT 源码，按许可证保留原始版权和许可说明并更新第三方声明。\n\n## 验收条件（建议作为 P0 合并门槛）\n\n- [ ] 在普通 Markdown 段落选中一段文字，**不输入评论**点任意颜色，高亮立即出现，侧栏立即新增可定位卡片；重启 Obsidian 后保留。\n- [ ] 同一段可换色、加/改笔记、删高亮；原文与卡片实时一致，操作不改写 Markdown 源内容。\n- [ ] 在编辑/实时预览/阅读模式查看一致；打开多个编辑窗口、移动/重命名文件后仍能正确定位；旧批注可查看/回复/解决/重挂。\n- [ ] 重复文本、相邻/嵌套/交叠高亮、空白选区、代码/前置元数据、原文大幅编辑和删除都有明确且稳定的处理；定位失败时不误跳到别处。\n- [ ] v2 批注迁移前后数量、文本、作者、回复历史、状态和锚点不丢失；模拟中断/损坏/写盘失败可恢复或清楚告警，不制造重复条目。\n- [ ] 深色/浅色主题色彩可辨；键盘及移动端可完成核心流程；不存在划词菜单反复弹出、焦点丢失或阅读模式重复包裹标记的问题。\n- [ ] 测试覆盖锚点/数据迁移/CRUD/列表过滤排序/多窗口清理等；根据改动运行 HUHU 项目要求的测试、lint、build，并更新 `docs/comments.md` / README 与中英界面文案。\n\n## 参考与视觉资料\n\n- HiLighter: https://github.com/PandoraReads/HiLighter （[卡片工作室截图](https://github.com/PandoraReads/HiLighter/blob/main/screenshots/card-studio.png)、[侧栏截图](https://github.com/PandoraReads/HiLighter/blob/main/screenshots/screenshot1.png)）\n- HUHU 当前批注: https://github.com/NAMEWTA/obsidian-huhu/blob/main/docs/comments.md\n- 上游许可证: [HiLighter MIT](https://github.com/PandoraReads/HiLighter/blob/main/LICENSE)\n\n> **本 Issue 先明确方向与验收标准；暂不改动插件源码。** 建议按 P0 → P1 实现，P2 再分别开独立 Issue；具体持久化 schema/迁移路径在开发前落一份可评审的短设计。",
  "author": "NAMEWTA",
  "state": "open",
  "labels": [],
  "created_at": "2026-10-26T12:58:02Z",
  "updated_at": "2026-10-26T12:58:02Z",
  "comments": []
}
```
