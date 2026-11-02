# 高亮摘录架构决定

以下 accepted 条目来自 Issue 明确约束，仅表示本 change 下游合同，不表示已实现或永久知识已更新。

## ADR-001: 复用批注模块与唯一 vault sidecar 真源

**Status:** accepted
**Source:** source.md「技术方案与约束」1、4；LOG-001、LOG-003 R-006
**Supersedes:** none

### Decision

升级现有 comments 模块，保留 .huhu/editor/comments/ 作为业务数据归属；摘录与可选笔记/讨论属于同一实体。编辑器与阅读标记、卡片都是同一数据的投影，不修改 Markdown 正文，也不增加 IndexedDB 业务真源。

### Context / Trade-off / Consequences

HiLighter 的划词→卡片交互可借鉴，但其 [IndexedDB + 同步文件](https://github.com/PandoraReads/HiLighter/blob/8d4af89890e69d627d89c251022b8b787926cd83/README.md#-data-sync) 与 HUHU 已有串行 sidecar/pending 恢复边界不同。保留真源可以复用文件重命名、卸载 drain 和 vault 同步；实体升级仍需要新格式与可恢复迁移，不能仅添加颜色。

### Verification / Migration

所有 CRUD 保证 Markdown 字节不变；沿用 App 级实例交接与串行写入。迁移先备份并验证，失败保留旧数据且不静默覆盖；v1 继续单独提示，不宣称已兼容。精确新数据与迁移合同在 Grill 后续轮次关闭，再由 Spec 定义验收。
