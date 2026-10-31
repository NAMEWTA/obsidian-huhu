---
schema_version: 3
artifact: triage
change: 2026-10-26-highlight-first
mode: intake
disposition: needs-info
verification: passed
remote_actions: []
source: <Path>{roots.state}/specdev/changes/2026-10-26-highlight-first/source.md</Path>
classification: feature
risk: high
route: specdev/grill-with-docs
ready_for_implementation: false
updated_at: 2026-10-26T13:24:00Z
---

# Triage：批注升级为高亮摘录

## 当前判定

- **影响：** 当前批注所有入口、编辑与阅读渲染、侧栏、数据格式与旧数据恢复。P0 目标成立，尚未实现。
- **紧急度：** normal；无线上事故证据。
- **来源完整性：** 正文完整、评论 0 条，完整分页由 connector 保证，与 comments=0 一致。快照见 source.md。
- **重复核对：** 已检查 active/archive 来源及当前 change 标题，无同 locator 或相似批注升级 change；永久 ADR/context 目录不存在，无既往拒绝证据。未做仓库所有远程 Issue 的穷举，不声称全库去重。
- **事实依据：** 本地 HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`；工作区既有规则改动未纳入本任务。`docs/comments.md`、`core/model.ts`、`core/store.ts`、`services/comments.ts` 与 editor/reading/navigation 已核验。

## 未知项

- **可发现事实：** 既有模型/恢复、调用方、测试和参考项目；代码已完成独立探索，详细依据归 LOG 研究条目。
- **需要用户决定：** 完整 Spec 首版范围、阅读模式能否新建、重复/重叠规则，见 design-tree 第一轮。
- **低影响实现细节：** 局部函数与组件拆分、去重索引实现、增量渲染数据结构，遵循既有模块边界。

## 实施简报

- **现状与目标：** `CommentThread.messages` 的归一化与服务成功判定都依赖非空消息；当前选区创建必须写批注。目标是零消息也可保存的摘录卡片。行级批注、回复作者/解决状态、孤儿重挂与串行 pending 恢复均复用。
- **核验：** 定向测试命令和 58 项通过见 README。静态发现 `ui/navigation.ts` 强制 source、设置选区及焦点，与低扰动回原文目标有差距；阅读装饰存在逐线程定位/包裹、编辑装饰按分段遍历所有范围的成本。新行为与迁移尚无运行证据。
- **方向：** 单一实体、唯一 vault sidecar 真源，保留 `.huhu/editor/comments/` 的归属及恢复能力；新格式须支持空笔记/零讨论，先备份和验证再升级。保留旧命令/视图/config ID 的可解析入口。只借鉴 HiLighter 交互，不引入其原文 `<mark>`、IndexedDB 同步真源或 AI/FSRS/阅读器依赖。
- **预期影响：** `core/model.ts`、`core/store.ts`、`core/anchor.ts`、`services/comments.ts`、`api.ts`、editor selection/decorations/extension、`ui/reading.ts`、`core/reading.ts`、navigation、panel、popover/thread、settings/i18n、module/manifest；直接消费者包括 `src/app/workbench/comments-leaf.ts` 与设置导航。后续实现需按真实接口核对消费者；此清单不授权本次改源码。
- **文档影响：** 后续生产实现须更新 `docs/comments.md`、README 双语相关段落及数据/设置说明；当前只在 change 描述目标，避免把提案写成已交付事实。
- **验收：** 零评论创建→正文与卡片一致→换色/笔记/删除→重开保留且 Markdown 字节不变；迁移内容/作者/回复/状态/锚点不丢失；不确定定位进入脱离而非错挂；错误保留有效数据和可恢复草稿。完整 AC 交 Spec。
- **风险：** v2 迁移与中断恢复、重复文本误挂、重叠渲染、同段字符排序、弹出窗口/触摸选区/输入法、多设备文件冲突。没有声称跨设备并发编辑自动无冲突。

## 路由

下一 Work：`.agents/speculo/workflows/specdev/specdev-g-grill-with-docs/SKILL.md`。先关闭行为取舍并确认共识，再按用户顺序形成 Spec 与单一 HTML 设计包。

## 打标回执

未请求标签、评论、关闭或其他远程写入；`remote_actions` 为空，Issue 保持 open。`verification: passed` 仅表示目标与差距已有事实支持，不表示新功能通过验收或获实施授权。
