# T24 档案与 home 引用只读预查

2026-10-27，native:/root/implement_t01（gpt-6.1-sol/high）回执；未写生产文件或运行宿主。T24 尚未开始，最终通用详情/路由须等待 T23。以下为当前源码事实与未来最小接缝，不是完成证据。

- ProjectStore 当前唯一创建入口为 ProjectSection，ProjectBoard 复用实例。projects.ts 拥有任务、里程碑、工作笔记、归档和正文写入，继续复用；不能把档案主文件标为 type:project 后交 home 编辑。home/api.ts 尚无项目执行引用服务，需要公开稳定引用解析/打开/回跳。
- 项目选择、pin 依赖 path，ProjectBoard 关联资料 fields.files 写裸路径；ProjectStore.connect 的 rename 只触发重读，没有修复旧选择或关联路径。新档案引用以 entityId 为身份、path 为提示，普通附件沿 rename/link 机制更新。缺件、歧义、模块关闭保留引用并诊断，不按同名猜测或重建。
- archives/core/resources 与 application.resources 是内部列表，api 尚无供 home 消费的分类快照。应公开实体主文件、定义、关系、迁移材料、普通附件分类，消费者不解析中文目录名。
- BoardStore.recentFiles 和 RecentWidget 均调用 recent-doc-policy，快捷输入 recent 也间接消费。当前仅排除旧个人/企业三段式主文件和格式说明，新类型/定义/关系可漏入。两处真实入口应统一消费 owner 分类，保留普通附件/笔记可见。
- reminders-source 与 application.saveReminder 仍依赖旧 index。通用实体应接 owner 解析/写入，保留 source.kind=contacts、automation definition ID 与原 reminders 区域 codec。现 AUTOMATION_SOURCES 已分派保存/回跳，不另造系统。
- 通用详情为 ArchiveWorkspace→ArchiveEntityForm，RecordDetail 只覆盖 legacy。相关任务入口须接 T23 最终详情并保留草稿离开门，双向只经公开API，不能跨模块导入内部 store。

写集补核：home/services/home-host 装配、board-store/recent-doc-policy/RecentWidget 两个 recent 消费者；当前 ArchiveWorkspace/ArchiveEntityForm/contacts-presentation 通用详情及相关测试。archives/module.ts 原同时可写/只读须消除冲突。Lead 在 Map revision 8 补入已确认路径；进入实际票时仍按 T23 最新入口复核，不为写集做无关重构。

验证重点：任务只改 home 文件，档案主资料不双写；移动/重命名后仍回跳，缺件不偷偷创建；两处最近文档分类一致；旧提醒保存/执行身份不变。T23 需先交稳定 entityId 路由、缺件诊断和动态详情。
