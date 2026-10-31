# 高亮摘录单一真源术语

类型：domain-terms

适用范围：2026-10-26-highlight-first 的已采纳领域合同；目标与实际实现分别判断。

来源：[CONTEXT.md](../changes/archive/2026-10-26-highlight-first/CONTEXT.md)，SHA-256 `c086496cb1cbfad736c6244a217fb61f2d2e5ddc6f4119f32dc54381dff227df`；关联[决策](../adr/2026-10-31-highlight-first.md)。提升日期：2026-10-31；网关 owner：specdev/archive-and-consolidate，codex:/root。

**高亮**：锚定 Markdown 文本选区、带颜色的摘录实体，可以没有笔记和讨论，用户无需先提交评论。
_Avoid_: 必须包含首条消息的线程

**摘录卡片**：高亮或旧行级批注在侧栏中的统一管理表达，包含来源与锚点；卡片不是第二份独立数据。
_Avoid_: 与正文高亮分别保存的卡片

**行级批注**：锚定整行的旧能力，保留行标记与讨论，不伪装为文字选区高亮。
_Avoid_: 无选区高亮

**脱离**：锚点无法可靠回到原文的状态，保留摘录与附属信息，由用户确认重新挂接。
_Avoid_: 已删除、已解决
