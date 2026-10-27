# HUHU 高亮摘录：参考研究、实施计划与验收

> 对应需求 [Issue #6](https://github.com/NAMEWTA/obsidian-huhu/issues/6)；实施分支 `NAMEWTA/6`。本文描述实现取舍与测试目标；真实 Obsidian 桌面/移动端验收及最终 CI 结果以 PR 检查为准。

## 1. 研究对象与定位

- HUHU 原实现：[批注文档](comments.md)、[`core/anchor.ts`](../src/modules/comments/core/anchor.ts)、[`core/store.ts`](../src/modules/comments/core/store.ts)、[`ui/editor/decorations.ts`](../src/modules/comments/ui/editor/decorations.ts)、[`ui/reading.ts`](../src/modules/comments/ui/reading.ts)、[`CommentsPanel.tsx`](../src/modules/comments/ui/panel/CommentsPanel.tsx)。它提供侧栏与浮窗、行/选区批注、讨论、作者/回复、解决、脱离重挂、上下文锚点及旁路持久化。旧 `CommentThread` 要求至少一条消息，因此无法仅划色。
- 对标开源：[PandoraReads/HiLighter](https://github.com/PandoraReads/HiLighter)（研究时 README 2.6.x）。重点阅读 [划词工具条](https://github.com/PandoraReads/HiLighter/blob/main/src/selection/selection-menu.ts)、[颜色模型](https://github.com/PandoraReads/HiLighter/blob/main/src/colors.ts)、[数据模型](https://github.com/PandoraReads/HiLighter/blob/main/src/models.ts)、[卡片分组/筛选](https://github.com/PandoraReads/HiLighter/blob/main/src/studio/grouping.ts)、[定位](https://github.com/PandoraReads/HiLighter/blob/main/src/locate.ts)、[PDF 锚点](https://github.com/PandoraReads/HiLighter/blob/main/src/pdf/anchor-math.ts)、[同步协议](https://github.com/PandoraReads/HiLighter/blob/main/src/sync/merge.ts)。
- HiLighter 优点：点颜色即生成卡片；四色与自定义颜色、快捷笔记、源文定位；侧栏/全屏管理、搜索/标签/批量；PDF/EPUB 独立锚点；AI 与 FSRS 扩展。局限于 HUHU 场景的是：其 Markdown `<mark>` 修改正文，卡片以每设备 IndexedDB 为主并通过 JSON 同步；原文排序有行号粒度风险，其 PDF/EPUB 的锚点依赖不同渲染器。HUHU 已有可靠 vault sidecar，不应硬搬其数据层或新的大型依赖。
- 上游根目录 [LICENSE](https://github.com/PandoraReads/HiLighter/blob/main/LICENSE) 为 MIT（其 package.json 对许可证的声明不一致），**本实现只借鉴产品概念，代码自行编写**，不复制上游源文件或静态素材。

## 2. 产品决策（保留用户已有分支的确认）

1. **P0 + P1 同一迭代**：不仅支持高亮，还支持摘录检索、分组、标签、批量、颜色自定义、导出；P2 的 PDF/EPUB、Agent AI、FSRS、思维导图不混入这次 Markdown 交付。
2. **阅读模式只保留已有查看和管理**；不新增阅读模式划词创建，创建来自 Markdown 源码/实时预览编辑器。
3. **同范围一张卡**：再次选同一字符区间更新颜色，不新增卡；交叠与嵌套是独立卡，装饰保留所有关联 ID，主色优先最新创建项，弹层列出完整卡片。
4. **高亮不是讨论状态**：颜色、自由笔记、标签、置顶、归档与旧评论消息相互独立；旧行级批注仍以行图标呈现。
5. **存储真源唯一**：不改写用户 Markdown，不另建 IndexedDB 业务库；保留 `.huhu/editor/comments/`、现有命令 ID/侧栏类型以及旧 v2 作者/回复/解决/重挂语义。
6. **原生 `==文字==` / `<mark>`**：本次不执行自动扫描/导入，避免重复计数和改写源文；这是待单独明确契约的互操作，不应在此隐藏启用。

## 3. 技术架构

```text
Markdown Editor (CodeMirror)       Reading mode (existing view-only)
       | selection + color               | mark display/click
       +---------------+------------------+
                       |
                comments runtime
                   service / store
                       |
                  Annotation
    id, kind, anchor, color, note, messages,
    tags, pinnedAt, archivedAt, timestamps
                       |
         .huhu/editor/comments/ (v3)
          index.json / pending.json
             files/<hash>.json
                       |
  side panel / popover / Markdown export (projections)
```

### 为什么保留旁路存储

对编辑器而言，色彩是 decoration，不是正文 `<mark>`；对阅读模式而言，颜色是 postprocessor 画出来的投影。重启、换色、删除卡片不会修改 Markdown 字节，用户已有 Git 同步、重命名、外部编辑、Undo 和主题样式都不用处理人为插入的 HTML 节点。唯一业务真源是 vault sidecar；UI 不能自己另存一份卡片。

### v2 → v3 迁移

- 新模型允许 `messages: []` 且必须有范围 `color`，旧行级讨论依然允许完整 messages。
- 第一次打开旧索引前，先把索引、被索引的 sidecar、pending 和可枚举的旧目录内容复制到 `.huhu/editor/comments-backups/v2-.../`，逐文件回读验证；备份不自动删除。
- 旧 pending 按旧恢复合同重放，经索引验证后，将每个旧文件转换成 v3：保留 ID、作者、消息顺序/时间、锚点、status；旧 range 标为 `legacy` 颜色，旧 line 保持行形态；再通过现有 pending journal 提交。
- 重启遇到 v3 pending 先重放，避免半途替换破坏索引；v1 继续只提示不迁移。损坏文件必须保留并提示；不能用空索引掩盖失败。对 v2/v3 并存、同步冲突与校验失败保持故障可观察，不假称具备自动多设备无冲突合并。
- 风险：目录级备份不是文件系统原子快照；若同时有外部设备修改，会存在冲突，应保留两份数据并人工比对。迁移与并发故障测试、真实库恢复前必须单独备份。

### 锚点、性能与边界

继续使用原文 + 哈希 + 50 字上下文 + offset/行号提示，文档变化借助 `ChangeSet.mapPos`；失败为 orphaned 并支持明确重挂，卡片点击先重新验证，拒绝无依据的行号跳转。编辑器分段改用端点排序与扫描，避免为每一段扫描全部范围。搜索在当前文档或全库已加载的 sidecar 内运行，普通全库浏览保留按需展开模式；确需跨库搜索时再按索引读取，避免默认加载全部正文。导出单卡/文件/选中结果到用户 vault 下独立 Markdown 文件，先验证路径、拒绝覆盖原文件。

## 4. 详细实施计划与交付工件

| 阶段 | 改动范围 | 质量门槛 |
|---|---|---|
| A. 冻结现状与研究 | 上游源码、HUHU 现有调用方与存储协议、分支已存在决策 | 保留分支既有历史，不重置/清空他人工作 |
| B. 领域实体与迁移 | `core/model.ts`、`core/store.ts`、`services/comments.ts`、`platform/vault-fs.ts` | 仅高亮、v2 备份迁移、写入失败重试、旧消息完整保留 |
| C. 低摩擦编辑 | 选区浮层、四色/自定义色、独立笔记、CodeMirror/阅读 mark、重叠范围与定位 | 不修改正文，光标/IME 不被抢占；已有阅读行为不回退 |
| D. 卡片管理 | `ThreadCard`、`CommentsPanel`、catalog、settings、export | 搜索/按文件颜色标签分组、排序、置顶归档、批量、Markdown 导出 |
| E. 稳定性与验收 | `*.test.ts`、`*.dom.test.tsx`、构建产物、双语文案、文档 | 类型检查、定向与回归测试、lint/CSS、bundle、真实 Obsidian 接缝 |
| F. GitHub 交付 | 在 `NAMEWTA/6` 基础上提交，PR → `main` | PR 关联 #6，列实际检查结果与未验收风险，不自动合并/发布 |

## 5. 验收清单与风险

- [ ] 四色按钮无需正文评论即可保存；同范围换色、交叠范围独立卡片；关闭重开不丢卡，Markdown 字节一致。
- [ ] 卡片换色、笔记、标签、置顶、归档、删除和原文效果双向一致；弹层草稿写盘失败不冒充成功。
- [ ] 旧作者/首条消息/全部回复及解决/重挂状态能从 v2 恢复；v1 不误迁移；备份前/中/后异常能被感知。
- [ ] 当前/全库搜索筛选、颜色/文件/标签分组、原文字符位置排序、批量勾选和导出准确。
- [ ] 深浅色、移动端、不同窗口、CodeMirror/阅读模式、键盘和输入法有实际宿主验证证据。
- [ ] `pnpm run build:css`、`pnpm run build`、定向 Vitest、`pnpm run lint`、`pnpm run lint:css`、仓库完整 CI 通过，`main.js/styles.css` 与本分支源码相同。

测试与构建成功**不等价**于真实 Obsidian 多窗口、阅读渲染、移动端、跨设备同时改写都已实测。PR 应将无法在 CI 中执行的宿主验收明示为待验收，不虚构通过记录。
