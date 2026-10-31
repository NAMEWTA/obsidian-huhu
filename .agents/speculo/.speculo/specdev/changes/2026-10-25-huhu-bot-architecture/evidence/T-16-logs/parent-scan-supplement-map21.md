# Map21等待父任务扫描的精确联合修复

Root已实际接纳089只读诊断，REPORT SHA256 `abf2fb2d24d1dd20305b306ca092436abdff5f2cbddd7782272dfbd1065abe29`，回执evidence/089-lead-return.json。原083固定输入上128个公开根实际产生129个等待父任务；目标唯一叶公开取消后已ready，仍被前128项遮蔽，仅取消一个无关前根即可让同一父任务完成且Engine调用不增加。此处不是未验证的静态疑点。Map21/Goal20、28票55AC、原DAG、用户现场后验边界和原owner保持。

## 精确写集与时序

- 088原foundation_go持有T03 `execution/children.go`中adapter-only `TreeControl.ReadyParentInTx`签名及必要游标/返回类型、`execution/executor.go`消费与提交后发布、`execution/store.go`私有游标，以及原chat回归。相对根均为native/huhubot/internal/adapters/outbound/sqlite/。T03其余写集仍按088TASK及claim-scan补充，不能写T12。
- 090原credential_provider仅持有T12 `usage/waits.go`、`usage/finalize.go`现有等待父候选/消费链，和native/huhubot/tests/contract/collaboration-policy/内窄永久回归。游标由T03持有，不在usage另建独立提交时序或平行选择器；其余生产只读。
- 双方先确认唯一内部合同。088当前定向race实际退出/Wait后，Root原生授予联合源码窗口；签名切换阶段不运行检查。双方落地、停写并给精确源摘要后，Root授予单一检查窗口。每个文件只有原owner写入，不因编译暂时不一致授权另一方代改。

## 内部合同

采用adapter-only `execution.ParentCursor{CreatedAt, RunID string}`和`ParentReady{RunID string, Result *api.EngineResult, Next ParentCursor}`；既有唯一`ReadyParentInTx(ctx,tx,after ParentCursor) (ParentReady,error)`实现与唯一Claim消费者一起切换，不保留闲置旧路径。公共Application/HAP、schema、迁移、依赖与限额不变。

每次最多扫描128项，稳定按created_at/run_id越过已检查候选；未ready、恢复闭门或slot暂满不得永久重复同一前缀。Next是实际检查进度：提前选中时停在该项，短页完全耗尽才回卷；资格与权限不是游标缓存。等待关系、当前身份/恢复/取消/Grant、slot与消费均保持在同一SQL事务。T03只在真正commit成功后发布parentAfter；SQL错误、commit失败或最终领取拒绝必须回滚父结果/来源/slot，不能返回无Work却提交消费。保留088已实际红绿验证的最后Claim门及整事务回滚。

## 验证与状态

089原始失败和单动作控制保持；090将该公开构造固化，修复后只取消目标叶就能完成原父/根，127个无关前根继续等待、原结果/partial唯一、无额外模型或Host Invoke。分页回卷/当前资格与提交失败的受影响边界由两owner按实际闭包组合验证，不机械重复旧矩阵。Root拥有最终固定输入E2E与独立双轴审查；本补充和派遣准备均不表示实现或T16/G1已通过。
