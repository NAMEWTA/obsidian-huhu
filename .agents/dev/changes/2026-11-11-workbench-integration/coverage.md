# 模块与原合同对照

核对基线 `9fe1c9f` 及本次工作树。注册表是 `src/app/manifests.ts` 的 12 个模块，不把模块数量等同于工作台页面数量。本表表示源码路径与验证范围，不表示逐行审计了全部源文件。

## 工作台功能图

| 模块 | 用户入口与前端 | 状态／数据与边界 | 本次处理 |
|---|---|---|---|
| home | dashboard、卡片、记录、收件箱 | BoardStore；可见记录与隐藏看板分离；任务经 task API | 沿用现有布局；全量回归及 shell 宿主探针 |
| task | 任务工作台、日历关联 | 独立任务领域；可见 tasks.json；档案引用使用稳定 ID | 不回归旧 Home 任务所有权；回归测试 |
| comments | Markdown 选区、高亮／历史共享右栏、卡片和浮层 | CommentStore v3、pending、锚点；不改笔记正文 | 共享 Markdown renderer；修复全库导出只含已加载卡片 |
| navigator | 内容树、普通笔记、周期日志 | vault API；IndexedDB 只作缓存 | 保留宿主笔记渲染及懒加载；回归测试 |
| archives | 类型树、列表卡片、详情、定义／表单／关系设计器、恢复 | ArchiveRuntime、应用命令、v2 Markdown、定义 DAG、草稿及写入保护 | 类型显示字段、时间、Markdown 详情；拒绝通用恢复破坏身份 |
| agent | 终端、标签页、账号、技能、看板与统计 | NativeHost 租约、PTY、CLI 与状态 Hook | 不重写终端；原生与全量回归；复用已有 UI |
| icons | 图标设置、文件图标贡献 | 现有资源与许可索引 | 不引入图标系统；回归测试 |
| notifications | 收件箱、渠道、来源打开器 | NOTIFICATION_INBOX/CHANNELS/OPENERS | 反馈与持久通知仍分离；回归测试 |
| automations | 定义、预检、执行记录 | 独立调度／设备归属；公开 composer | 不改变账号和执行权限；回归测试 |
| versioning | Git 更改／历史／比较、右侧笔记历史、revision-review | HistoryQuery、固定 buffer、RestoreService、CheckpointStore、自动历史及保留策略 | 受管记录恢复拒绝；保持只读 diff；定向及宿主验收 |
| safe | 保险箱、笔记、解锁 | 认证密文，独立存储，不放进普通历史 | 不改加密和解锁合同；回归测试 |
| health | 体检、诊断、修复预览 | provider/owner，按需只读租用，有限修复 | 不扩大修复写集；回归测试 |

壳层由 `src/shell/ShellRoot.tsx`、`panel/SidePanel.tsx`、`host/workbench-pages.ts` 和 app 的 compose-workbench 管理。共用 ReactSurface、DesignScope、所属窗口 Portal、HU token、Button/Dialog/Popover/Notice/日期族。没有复制第二套页面框架。

## 原高亮需求

| 原范围 | 当前代码与结果分类 |
|---|---|
| P0 仅高亮、四色、独立笔记、旧讨论、锚点与重挂 | 已有 v3 model/store/service、selection、ThreadCard、reading。保留原文不变及重复文本安全测试 |
| P0 阅读模式创建 | 后续明确选择不新增；已有显示和查看管理继续保留 |
| P0 v2 迁移、v1 兼容 | 被 2026-11-04 发布前删除兼容决定替代。仅接受 v3，不能恢复旧迁移逻辑 |
| P1 搜索、筛选、分组、批量、颜色、导出 | 已有 catalog/panel/export；本次补齐折叠全库导出和失败阻断 |
| P1 原生 == / mark 导入 | 条件扩展，未实现；不自动扫描、不改正文 |
| P2 PDF、EPUB、AI、FSRS、导图 | 来源明确后续范围，未实现，不宣称本次交付 |

完整原文与访谈保留在 [高亮来源](sources/2026-10-26-highlight-first/README.md)。

## 原 36 组合同与 32 张票

| 原 AC／票 | 当前处置与证据入口 |
|---|---|
| AC-001／T-01 | 三种宿主 View 和模块装配继续有效；browser 同时注册要求被删除决定替代 |
| AC-002／T-01 | versioning core/excludes 与私有恢复保护已有测试；可见档案不误排除 |
| AC-003～012／T-02～12、T-31 | browser 产品线已删除。原来源和平台研究保留，不重新实施 |
| AC-013～016／T-15 | history-query、note-review、restore-service、Git 与 DOM 回归。真实宿主结果单列，旧 25 场景不是本次证据 |
| AC-017／T-13、16 | 自动 buffer 历史及精确按块恢复已有代码／测试；F 可选增强不能据此全项标完成 |
| AC-018～020／T-17～19 | 类型／字段 codec、多表单、定义发布、冲突草稿、保真 Markdown 已有实现；本次字段显示配置写入同一类型修订 |
| AC-021／T-20 | 独立关系事实、双向查询与约束已有 services/generic/relation-commands 及测试 |
| AC-022／T-22、28 | 定义 DAG 和分叉阻断、设计器 heads 发布已有实现；复杂逐字段分叉编辑仍须单独验收 |
| AC-023～025／T-17、21、22 | v1 兼容／迁移被替代；v2 自定义 schema 升级、恢复回滚仍由 recovery 负责。不能把两者混为已完成 |
| AC-026／T-27 | 本次补齐受管记录通用恢复拒绝，包括副本。只读比较保留；未提供档案专用历史覆盖事务 |
| AC-027／T-25 | 可见定义／实体／关系／恢复材料支持重建；归档不是硬删除。硬删除事务和复制向导未完成 |
| AC-028／T-24 | ARCHIVE_RESOURCES 和 task 关联已有公开 API；任务已从 Home 独立，旧所有权描述不再成立 |
| AC-029／T-26 | 增量索引已有；保留 accept-archives-v2-scale 脚本。本次不把旧基准当作当前实测 |
| AC-030／T-29、30 | CSV 导入、Lookup/Rollup、局部图谱未实现。资源附件导入不等于 CSV 实体导入 |
| AC-031／T-23、32 | 统一 UI/窗口/主题合同沿用当前设计系统；本次宿主矩阵见 evidence |
| AC-032／T-32 | 构建、lint、架构、i18n、样式、许可、产物漂移及测试均记录实际结果；CI 由 6 收敛为 3 |
| AC-033／T-18、21、27 | 结构写入沿用 captureClean/assertClean 多叶保护；通用历史不再绕过 owner |
| AC-034／T-14 | retention/checkpoint 的保护对象、配额暂停、强制检查点已有测试 |
| AC-035／T-23 | 动态类型／实例树、类型总览、实例详情已有 workbench/UI；不恢复硬编码个人企业模型 |
| AC-036／T-23 | 本次补齐类型 displayFields，共享列表卡片投影；新记录创建时间持久化，旧记录未知，更新时间来自文件 mtime |

## 整合完整性与下一步

102 个来源文件全部移动，原始身份、正文和回执保留。`source-manifest.json` 保存原路径、目标路径、原始 SHA-256 和迁移后 SHA-256；仅修改需要重定位的有效相对链接。旧原型、旧归档报告和执行模型是历史，不是现行规范。

本次不能将旧 36 组合同整体标为完成。剩余产品项包括 CSV／派生字段／图谱、专用受管历史恢复、硬删除／复制、设计器重启草稿及未覆盖平台实机。统一 change 保持 active，后续从本表接续，不再各维护一份互相冲突的执行计划。
