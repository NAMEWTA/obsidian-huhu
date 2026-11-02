# 浏览器历史档案边界术语

类型：domain-terms

适用范围：2026-10-26-unified-browser-versioning-archives 的已采纳领域合同；目标与实际实现分别判断。

来源：[CONTEXT.md](../changes/archive/2026-10-26-unified-browser-versioning-archives/CONTEXT.md)，SHA-256 `6ba88e49da0322ece7f3089cae2d5095dba48c603592f4088e8a9c54c364ec84`；关联[决策](../adr/2026-10-31-unified-browser-versioning-archives.md)。提升日期：2026-10-31；网关 owner：specdev/archive-and-consolidate，codex:/root。

**ArchiveTypeDefinition（档案类型定义）**：规定一类实体的字段与约束，个人、企业是预设类型，项目等用户类型使用同一内核。
_Avoid_: 把类型等同于固定业务页面。

**FieldDefinition（字段定义）**：字段的身份、数据语义、存储键与校验规则。fieldId 是引用身份，storageKey 是稳定可读存储键，label 是可改显示名称。
_Avoid_: 用 label 或字段位置作为永久身份。

**FormTemplate（表单模板）**：引用类型字段，定义填写时的分组、顺序、显隐与只读展示；不另存一份字段值。
_Avoid_: 把切换表单理解为复制或替换实体。

**RecordTemplate（创建模板）**：新建实体时的默认值和正文骨架；模板修改不追溯覆盖已存在内容。
_Avoid_: 持续同步到所有实体的默认值。

**EntityRecord（实体记录）**：有稳定 entityId 的具体对象或业务事项；标题和文件路径变化不改变其身份。
_Avoid_: 通过同名自动判断为同一个实体。

**RelationTypeDefinition（关系类型定义）**：规定关系端点、方向、基数、属性与适用规则。
_Avoid_: 任意两端 ID 数组即完整关系模型。

**RelationRecord（关系记录）**：有全局稳定 relationId 的关联事实，独立文件是唯一可写真源；两端列表是查询投影。
_Avoid_: 每个端点各自拥有一份可写关系副本。

**ViewDefinition（视图定义）**：保存查询与展示配置，引用实体、字段和关系，不拥有业务内容副本。
_Avoid_: 视图文件就是实体数据库。

**定义修订**：以 revisionId、parentRevisionIds 和语义 contentHash 标识的不可变定义版本；displayVersion 仅用于显示。
_Avoid_: 用时间戳或整数最大值消除并发分叉。

**迁移权威切换**：关系预写与核验后，按源 hash 校验切换 owner 到 v2，并用可携带迁移事实说明哪份关系表示有效。
_Avoid_: 仅靠本机缓存或隐藏日志确定新旧真源。

**Staged 关系**：迁移已生成、但对应 owner 尚未完成权威切换的关系记录；不与旧内嵌关系重复计数。
_Avoid_: 文件存在就视为已激活关系。

**迁移不完整**：v2 owner 的预期关系未全部到达或无法核验；查询必须表达不完整，不能把缺件解释为零关系。
_Avoid_: 缺件等同空结果。

**受管档案恢复**：涉及档案内容、关系、定义或迁移事实的历史覆盖，必须通过 archives owner 预检；不安全或未支持时拒绝覆盖，仍可只读比较。依据 [ADR-002](../changes/archive/2026-10-26-unified-browser-versioning-archives/ADR.md#adr-002-受管档案历史覆盖由档案-owner-预检)。
_Avoid_: 任意单文件 Markdown 覆盖即完整档案回退。

**原生草稿冲突**：受影响原生编辑叶与磁盘内容不一致，或多个编辑叶之间存在分歧；它阻止档案结构化写入，且不能通过自动保存或丢弃正文消除。依据 [ADR-005](../changes/archive/2026-10-26-unified-browser-versioning-archives/ADR.md#adr-005-档案结构化写入不代替用户提交原生草稿)。
_Avoid_: 字段合并成功即可以覆盖任意原生 buffer。


**档案类型树与总览**：类型为树父节点、实例为子节点；单击类型打开该类型的实例列表或卡片，单击实例进入详情。新增类型沿用相同交互。来源 [SRC-007](../changes/archive/2026-10-26-unified-browser-versioning-archives/sources/SRC-007.md)，行为验收 AC-035。
_Avoid_: 类型点击直接进入某个实例，或把所有实例与类型混成同级导航。

**类型显示字段**：从该类型字段中勾选列表/卡片显示项，引用同一字段值；所有类型默认显示创建时间、更新时间。显示字段、表单可见字段和筛选记录条件分别承担职责。来源 [SRC-007](../changes/archive/2026-10-26-unified-browser-versioning-archives/sources/SRC-007.md)，AC-036。
_Avoid_: 未勾选显示意味着删除字段值，或显示配置意味着过滤掉记录。
