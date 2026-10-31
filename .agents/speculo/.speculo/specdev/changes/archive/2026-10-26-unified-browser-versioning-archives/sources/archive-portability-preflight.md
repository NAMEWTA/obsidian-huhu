# T25 可携带性与删除生命周期只读预查

2026-10-27，native:/root/implement_t01（既有 gpt-6.1-sol/high Agent）实际回执。基于 T21 repair 活动代码；T22/T23/T24 尚未稳定，实施前必须重验。未写代码、运行性能或读取用户资料。此记录不启动 T25，不改变 Map9。

## 可见闭包与实际入口

可见目录应带实体正文，类型/表单/关系定义及全部不可变修订与 current 指针，关系事实，迁移清单和完成/回退事实，原始备份，已收纳附件，以及 T23 最终展示配置。目录外项目笔记仅携带引用，目标缺失应诊断，不能自动复制或重建。

`ContactsApplication.reload()/rebuild()`、`ArchiveRepository.catalog()/snapshot()`、`RelationRepository`、`ArchiveFormStore` 已从 Vault 文件扫描，本次读取的领域实现没有将隐藏索引作为业务权威。现有 `archives-v2.test.ts` 的重新实例化仅证明同目录，未证明独立 vault、不同 root 和完整迁移闭包。

`application.importResources()` 只向单个 legacy 实体目录逐项添加附件，不能冒充整个档案恢复入口。未找到既有档案 bundle exporter；home `board-backups.ts` 是专属隐藏恢复快照，不适合直接复用。无需为可携带性另造 ZIP 产品，应先证明复制可见目录后经既有 scanner 重建。

## 具体风险与未定依赖

- `migration-model.ts` 的 plan 保存 root、ownerPath、backupPath、依赖路径；`migration-authority.ts` 与 `migration-store.ts` 要求 root/path 匹配，plan hash 覆盖路径。换 vault 但保持相对目录、迁到新 root 必须分别验证；后者不能只改设置或替换字符串，需要受控路径解释或搬迁事实并保留原依据。
- legacy `deletion()/remove()` 已有关系、附件和原生叶预检，最终为 trashFolder。通用默认归档和完整硬删影响入口尚未确定，应沿 T22 tombstone/迁移权威、T24 提醒和外部引用复用，不能连删共享附件或让旧关系复活。
- 预计 core catalog/relation/migration、application/resources/files、api/services 与 Vault adapter 在 T25 写集内。若 T23/T24 未预接默认归档、显式硬删和影响展示，T25 当前缺 UI/i18n/DOM 测试写集；前置完成后按实际消费者补齐，不能只交无人调用的命令。
- T22 权威状态、T23 展示配置存储、T24 引用接口尚未确定，不预设接口。

## 后续自动验证

用两个独立临时 Vault/application，仅复制可见文件，不复制隐藏数据；分别验证同 root、新 root、缓存删除重建、未完成迁移、缺定义/关系/备份、实体附件移动、提醒 ID、外部引用缺失、归档身份保留、硬删预检后漂移及共享附件保留。真实迁移、宿主和性能仍由用户负责。
