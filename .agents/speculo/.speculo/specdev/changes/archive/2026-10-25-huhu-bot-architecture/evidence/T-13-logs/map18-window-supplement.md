# T13 同一实现窗口补充（Map18 / Goal17）

这是073/074/075真实请求的窄写集补充；三份原TASK及其SHA不变，原派遣仍是Map17/Goal16。28票、55AC与DAG不变，不增加新产品范围，不代表实现或验收通过。

## 实际写集

- 原T01 owner foundation_go 的073任务新增精确文件 `native/huhubot/internal/adapters/outbound/sqlite/base/store.go`。它已在T01原票base目录下，本次明确进入群迁移维护窗口；T13只读，同一Profile生命周期不另起Store。
- T13新增 `src/modules/huhubot/services/groups/**`，唯一作者 foundation_client（075）。生产群发送、成员/协调者CAS与公共History消费者放这里；T04 events继续负责事件订阅与投影。接口仍由073单一owner生成，不增加平行HAP DTO。
- 074拥有013 SQL正文，073拥有注册与生命周期，旧001/002/003/005/006/011/012 SQL冻结。先对齐正文形状再注册；无其他作者写base/store.go。

## 迁移约束与验证

003旧表仅支持direct且成员单主键，013必须真正重建会话及成员表。沿SQLite官方广义ALTER TABLE流程：已有Profile完整DB与所有CP备份先成功，持有Profile锁、Executor/GC尚未启动；固定专用连接，在事务外关闭并验证foreign_keys，事务中create/copy/drop/rename并恢复受影响索引/引用，在提交前读取foreign_key_check确保无违规；提交后重新开启并验证为1，才可释放连接并返回Store。失败或取消必须回滚/关闭，不能返回外键关闭的可用Store。不要在事务内部切换foreign_keys、重命名旧表先行或启用writable_schema。

此临时关闭只针对确需表重建的待迁移步骤，不把后续任意迁移默认置为关闭；正常运行DSN继续foreign_keys=1。新建Profile和旧v7路径均检查，加入失败/外键违规回滚及重开保留数据的合同验证。既有备份机制/文件权限不弱化，既有会话、消息、run、成员、索引和CP引用都保留。Root另有迁移前真实v7闭合Profile（5 runs、10 messages、5 CP）用于独立E2E，尚未迁移。

依据：[SQLite ALTER TABLE](https://www.sqlite.org/lang_altertable.html#making_other_kinds_of_table_schema_changes)、[foreign_keys pragma](https://www.sqlite.org/pragma.html#pragma_foreign_keys)。Root本轮实际查阅官方来源；foreign_keys在事务内无效且是连接设置。

## 群编排与附件语义

接受显式纯编排根：无A pin/claim/model/recipient，根有效授权Sources/Scopes/GrantIDs为空、Members为空；每个实际目标child在同Tx固定真实配置、授权、成员代与user_batch关系。默认child仅A，显式仅B/C；父任务不消费或模型汇总子正文。后代必须继承实际成员祖先约束，公共发布仅明确的user_batch直接child，持久seq和稳定结果去重。

用户主动输入的原Intent与附件派生正文分开：不得为了空编排根而丢失发送时附加来源的修订/originView元数据。保留可追溯的用户消息附件引用，读取时通过真实child证明或独立只读元数据处理，不能虚构A权限或把该元数据当作给模型的Grant。当前授权不再允许某来源时可以过滤对应标签，原用户文字仍保留；模型获取任何历史/附件仍按实际接收成员及当前来源授权过滤。实际API由073和074在既有字段优先的原则下冻结，075消费唯一合同。

成员移除本身不抹掉用户已合法公开的群历史；未公开的Run正文/旧代流立即清理并拒绝迟到。来源Grant撤销、History权限拒绝及Profile/连接变化分别按其真实授权边界使本地缓存失效，不把历史缓存保留解释成撤权正文可以继续显示。服务端持久历史不因客户端清缓存删除。

## 当前状态

Root已实际收到073、074、075原生消息，三者已ACK。接口方向协商不等于最终源码冻结；仍需实际实现摘要、生产端到端消费者与代码验收。重矩阵窗口尚未分配，不并行抢占；真实模型/Obsidian/目标OS仍由用户后验。
