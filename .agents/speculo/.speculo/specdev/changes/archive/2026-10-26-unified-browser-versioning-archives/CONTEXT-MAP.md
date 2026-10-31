# 领域关系

| 领域 | 拥有的状态 | 对外边界 |
|---|---|---|
| [browser](contexts/browser.md) | Space/Page/Run、控制租约、身份、文件、运行进程 | Agent 是可选消费者；个人空间与任务空间隔离 |
| [versioning](contexts/versioning.md) | 版本查询、比较会话、检查点、恢复回执与同步 hold | 正文写入经宿主适配；受管档案经 archives 预检，包含原生草稿冲突检查 |
| [archives](CONTEXT.md) | 类型/字段/表单/实体/关系、定义修订和迁移事实 | 主资料归 archives；home 任务通过稳定引用关联 |

此图只说明来源和用户决定已确认的领域边界，实际现状与实现缺口由 spec/triage 负责；未写永久 context。
