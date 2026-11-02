# 编辑器高亮与批注

当前交互与格式见 [高亮指南](../../../../docs/comments.md)。批注存于当前库的旁路文件，从不改写笔记正文；只对 Markdown 运行，没有 PDF 入口。`src/modules/comments/` 的 `core/` 负责模型、锚点与存储，`platform/` 负责文件系统与存储交接，`ui/` 负责编辑器、右侧栏、浮窗和设置。

## 磁盘布局与模型

```text
.huhu/editor/comments/index.json
.huhu/editor/comments/pending.json
.huhu/editor/comments/files/<sha256(路径) 的前 16 位十六进制>.json
.huhu/editor/comments/set-aside/\n.huhu/editor/comments-backups/v2-*/
```

- 对路径字符串计算 SHA-256，取前 16 位十六进制。索引为 `{ version: 3, files: { [path]: { hash, open, total, updatedAt } } }`，全库浏览先读索引，展开笔记后才读对应线程文件。
- 文件为 `{ version: 3, path, threads: CommentThread[] }`。线程有 `kind: 'line' | 'range'`、锚点、状态、消息与创建/更新时间；消息有 `id/author/text/createdAt/editedAt?`。允许纯高亮的 `messages: []`；另有 `color/colorHex/note/tags/pinnedAt/archivedAt`。`CommentStatus` 保留 `open/resolved/orphaned`，线程与消息 id 仍用 `c-…` / `m-…`。
- v1 会被解析并识别为 legacy，保留原文件、提示旧版数据，不作为 v3 线程加载，也不自动迁移；发现旧格式路径时阻止创建和保存 v3 数据，须先将旧数据保存在活动批注目录之外。损坏文件先保存原文到 `set-aside/`，再删除活动路径并记录隔离状态，这不是原子移动；不覆盖成空文件。不能读取或写入的错误向上报告，不能缓存空结果掩盖失败。实现见 `src/modules/comments/core/store.ts`。
- 设置只保存偏好（作者、gutter、颜色、悬停、模糊容差、面板位置等），不保存正文；面板与设置概览见[批注设计](../../../../docs/comments.md)，完整字段、默认值和取值范围由 `src/modules/comments/settings.ts` 负责。

## 锚点与定位

`TextAnchorV2` 保存 `kind/text/textHash/before/after/lineHint/start/end`：`text` 是选区原文或整行文字，前后文各 50 个字符，行号与偏移只是提示或缓存。

`locateAnchor` 依次执行：

1. 缓存范围仍等于 `text` 时直接采用。
2. 精确搜索；重复命中按前后文相似度打分，平分时取靠近 `lineHint` 的位置。
3. 查找 `before` 与 `after` 夹住的区域，长度限于原文的 0.5～2 倍。
4. 在行号提示前后 200 行内做有界编辑距离匹配；默认阈值 0.3，可设 0.1～0.5。行级批注只比较整行。
5. 失败标为 `orphaned`，以后不自动重新挂上；用户显式选择新位置才能重新挂接。

实时编辑由 CodeMirror `ChangeSet.mapPos` 移动位置，保存时刷新原文、上下文与行号；锚定文字全部删除即脱离。初次 `reconcile()` 完成前不应用过期偏移。选区入口仍排除 YAML 前置数据和围栏代码块；阅读高亮跳过 `pre/code/script/style` 和已处理节点。重叠范围保留覆盖它的全部线程 id，供浮窗展示。

### 版本恢复协调

- 跨模块只经 `COMMENTS_DOCUMENT_CHANGES`（`comments/api.ts`）使用 `DocumentChangeParticipant`。`shared/storage/document-mutation.ts` 定义宿主无关的 `operationId/path/before/after/edits/kind?`；versioning 在任何正文事务之前调用 `prepare`，成功读回后调用 `commit`，失败调用 `abort`。只读历史 diff 不安装批注扩展。
- `CommentStore.prepareDocumentChange` 设置按路径隔离的 guard；`applyChanges` 在普通 `mapPos` 之前检查 guard，`reconcile` 也跳过。guard 内只跟随与上一已观察正文衔接的广播，多叶重复或迟到广播不得倒退状态。
- `core/restore-anchors.ts` 使用有界文本 delta 保留未改范围，或采用唯一精确原文。恢复不做模糊匹配；歧义或删除保留线程并标为 orphaned。检查点只保存线程 id、状态、锚点，不保存或回滚消息、回复、作者。
- 显式恢复撤销只在当前锚点与该次恢复记录的预期一致时采用逆向快照；用户手动 reanchor 不得被旧快照覆盖。当前会话至多保留最近 8 个路径的 before/after 对，用于原生编辑器撤销和重做；不能承诺重启后的原生撤销。
- guard 期间创建或重新挂接的锚点记录当时观察到的正文，用该修订映射到最终正文，并从逆向快照候选中排除。rename 先结算已观察偏移再移动旁路；关闭时同步释放已安装 guard，异步 prepare 在 await 前后检查 closed，不得在关闭后重新安装。
- `kind: 'remove'` 专用于撤销恢复副本。prepare 发现任何现存批注即拒绝删除；guard 存续时拒绝新增线程。对应原生 delete 事件保留 remove guard 到 commit，其他笔记删除仍遵守 `deleteWithNote`。
- 恢复正文由 `host/obsidian/document-mutation.ts` 使用公开 `Editor.transaction`、`MarkdownView.save` 或 `Vault.process` 处理；批注模块不能直接替换编辑器，也不宣称与 Obsidian 自动保存或外部程序构成全局原子事务。

## 存储与生命周期

- `pending.json` 保存完整下一份索引、旁路文件与过时路径；启动时先恢复已接受的写入意图，文件、索引和清理都成功后才删除日志。日志重放不是旧格式迁移。
- 变更串行进入 Promise 队列；宿主注入防抖计时器，core 不读取窗口全局。写入失败保留脏修订与草稿并报告，不能先提示已保存。
- 路径重命名或移动同步重写路径哈希、文件与索引；删除笔记按设置一并删除批注（默认）或保留。线程列表变空时清理旁路文件和索引。
- 存储关闭时同步封存新操作，写完已接受操作后才让替代存储加载。App 范围的 `Symbol.for('huhu.editor.comment-store-handoff')` 协调者保留失败的关闭写入供重试，隔离不同库；激活代数防止迟到结果替换新实例。
- 模块通过 `context.editor` 注册扩展与阅读后处理器；停用释放所有编辑器订阅、计时器和浮层 React 根，侧栏叶子保留停用空状态。强制退出前尚未落日志的数据不能保证持久化。

## 界面

- 沿用 `huhu-comments-view`，由 `app/editor-panel/panel-host.tsx` 提供「批注/历史」标签。布局就绪后按 `comments.panelAutoPlaced` 用 `workspace.ensureSideLeaf()` 首次放入右侧栏，图标 `highlighter`；设置可改左侧栏。不贡献工作台图标轨或工作台批注页面。
- 侧栏 React 面板切换当前笔记/全库、全部/未解决/已解决，提供摘录/笔记/标签检索、颜色过滤、文件/颜色/标签分组和排序。`COMMENTS_PANEL.mount(container, documents)` 接收 `EditorContextAccess`，按 `container.ownerDocument.defaultView` 读取源 Markdown leaf 上下文；批注全局 service.path 不得覆盖窗口上下文。历史预览、侧栏焦点或其他窗口切换不清空当前源笔记。通过 `COMMENTS_PANEL` 挂到编辑器面板；其他模块仅经 `api.ts` 读取 `COMMENTS_INDEX` 等服务。
- gutter 行首悬停显示添加按钮，有批注的行显示图标与数量；支持行级与选区批注。阅读模式只显示高亮、行级图标与查看入口。
- 悬停高亮或 gutter 350ms 打开，离开目标和浮窗 300ms 关闭，移入浮窗保留；点击或命令立即打开并固定。未保存编辑/回复不因鼠标离开关闭；Esc 先取消编辑，再关闭。
- 可编辑浮窗使用受控 Radix `Popover` 和虚拟矩形锚点，线程卡片在面板与浮窗共用。正文用 `MarkdownRenderer`，外层加 `huhu-native`；支持查看、编辑、回复、解决/重新打开、删除、跳转与重新挂接。手机用底部 `Sheet`。
- 每个窗口一个 `CommentsOverlay` React 根，编辑器经 `services/overlay.ts` 请求开合；按 `view.dom.ownerDocument` 选 Portal，滚动更新锚点，非固定浮窗在锚点滚出时关闭。
- 表单有 Label 与快捷键说明，Ctrl/Cmd+Enter 提交，IME 组合时不提交；失败保留草稿和重试入口，关闭恢复原焦点。

## 验证

保留 `src/modules/comments/comments.test.ts`、`scripts/verify-comment-storage.ts` 与 `verify-comment-handoff.ts` 的存储和交接覆盖；模型改动同步更新版本、字段及锚点预期。测试不得指向真实库。

- 纯逻辑：行级/选区、重复原文、上下文与模糊匹配边界、失效不自动重挂、笔记正文不变。
- 存储：v3 索引和线程文件、v2 原样备份与迁移、v1 留存、损坏隔离、日志重放、部分提交、并发编辑、重命名、删除策略、关闭失败重试和跨 App 隔离。
- `dom` 项目：悬停开关计时、固定与编辑草稿、IME、键盘、焦点、右侧栏筛选及错误重试。
- 恢复：`core/restore-anchors.test.ts` 覆盖 guard 先于 mapper、重复/迟到广播、精确定位与歧义脱离、显式/原生撤销、消息不回滚、恢复中新增/reanchor、rename/close 与 remove guard；`ui/comments.dom.test.tsx` 验证显式窗口上下文不被全局 path/null 覆盖。
- 真实 Obsidian：CodeMirror/阅读集成、多窗口 Portal、滚动定位、停用再启用与侧栏放置。Node/DOM 测试不能代替宿主验收；选择方法见 [testing.md](testing.md)。

## Highlight-first 增量合同

- `core/catalog.ts` 对 `{path,thread}` 做搜索、分组、排序与 Markdown 投影；UI 没有独立写盘逻辑。`services/export.ts` 只在用户主动导出时在可见 `huhu/` 下新建文档，不改写原文。
- `core/highlight-colors.ts` 定义四个预设色与自定义颜色快照。HTML/Codemirror 装饰通过 `--huhu-highlight-color` 显示颜色；现有 legacy 评论没有指定颜色时使用主题强调色。
- v2 索引迁移：先写入 `.huhu/editor/comments-backups/v2-*/` 并验证，恢复旧 pending 后再用 journal 提交 v3 格式；v1 保持阻止自动写入，损坏数据隔离。严禁无备份删除旧数据。
- 选择工具条提供四色与「添加笔记」，无需提交讨论消息。阅读模式沿用旧后处理器只显示已有高亮；不创建新的阅读模式划词入口。旧的行级批注和讨论命令维持兼容。
- 相关新测试：`src/modules/comments/highlights.test.ts`、`src/modules/comments/core/catalog.test.ts`、`src/modules/comments/ui/comments.dom.test.tsx`。自动化 CI 的 CodeMirror mock 不是实际宿主验收；实测边界见 [实施计划](../../../../docs/highlights-implementation.md)。
