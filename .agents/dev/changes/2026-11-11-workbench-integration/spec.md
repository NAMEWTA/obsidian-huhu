# 当前规格与统一设计

## 权威与范围

最新用户授权覆盖实施、验证和推送 main。原始 Issue、访谈、原型、票据与归档回执作为来源保留，不采用过期模型配置、分支、只写计划或浏览器恢复要求。现役删除决定见 [发布前收缩](../../notes/decisions/2026-11-04-dev-stabilization-overhaul.md)。未实现的扩展能力不能因整理资料被标成已交付。

## 工作台契约

所有模块继续通过 manifests 和公开 api 装配。shell 拥有图标轨、导航、页面和路由；模块拥有领域状态，UI 仅订阅与发出命令。维持三种宿主叶子，禁止给每项功能新造工作区。新弹层使用所属 Document 的既有 Portal，保存失败保留草稿，取消不写业务数据。

| 用户行为 | 当前整改成功条件 | 主要入口 |
|---|---|---|
| 在类型设计器选择显示字段 | 发布为类型定义的可携带设置；列表和卡片使用同一投影，切类型不串配置；隐藏不删记录值 | DefinitionStudio、ArchivePage、validateDefinition |
| 查看记录时间 | 新实体保存创建时间，更新通过现有 modified 元数据；旧记录无创建证据显示未知，不以本次打开时间伪造 | EntityCommands、markdown codec、ArchivePage |
| 打开 Markdown 字段 | 使用 Obsidian 自带 renderer，内部链接以来源档案路径解析；卸载清理，迟到渲染不能污染新内容 | 公用 MarkdownContent、RecordValues |
| 管理高亮 | 当前笔记与全库使用同一 sidecar 服务；全库导出不能只导出碰巧已加载的卡片；加载失败不能伪报完整导出 | CommentsPanel、comments service |
| 查看历史与恢复 | 沿用固定 buffer、左右／上下两种 diff 布局、强制检查点、并发重校验、锚点参与者；档案不安全恢复必须拒绝 | NoteHistoryPanel、NoteReviewPage、RestoreService |
| 日常提交 | 一次 Linux Node 24 全量检查，无高亮重复 workflow、无 task 测试重复运行；发布仍验证五平台 helper | lint.yml、terminal-build.yml、release.yml |

## 结构选择

### 显示配置

方案 A 把配置写进设备 settings，改动小但复制可见档案目录后丢失。方案 B 把可选 `displayFields` 放到已有类型定义，沿用不可变修订、分叉检查和发布预览。采用 B，不新增设置数据库。默认前五个非归档字段，名称始终保留；自定义 view 继续优先使用其显式 columns。创建／更新时间是独立只读元数据，默认两种布局均显示，不伪装成可编辑业务字段。

### Markdown

不引入新的解析器，也不跨模块导入 comments 私有组件。抽取通用 React MarkdownContent，复用原 CommentBody 的 Obsidian renderer、链接与 Component 生命周期，再让高亮和档案消费；保留来源署名。每次渲染使用独立 DOM 容器，异步结果不能写进下一次渲染容器。仅 UI 层渲染，codec 继续保存原字符串。

### CI

复用远端已存在精简提交，删除不再服务交付的 node_modules 上传；保留构建、产物一致性、lint、Rust、完整测试、许可与发布门禁。性能测量脚本仍可按需运行，不在日常矩阵复制完整构建。

## 验证与非承诺

定向 DOM/服务测试覆盖字段隐藏不丢值、创建时间重开、Markdown 生命周期、全库导出及失败。全量现有测试作为跨模块回归。真实 Obsidian 验证使用仓库现有 fresh-vault/CDP，不接触真实库。Linux 宿主结果不能代表 Windows/macOS/移动端、系统 IME 和真实多设备同步。CSV、Lookup/Rollup、局部图谱等旧扩展若未实际实现，继续在 coverage 中列缺口，不通过删掉来源宣称闭合。
