# 原T04事件夹具写入顺序的精确维护

Map20/Goal19与原T16行为不变，仅开放原T04 Go owner `/root/credential_provider` 两个测试路径：`native/huhubot/tests/contract/events/events_test.go`、`native/huhubot/tests/contract/events/delivery_test.go`。生产events/executor/SQLite实现不开放写权，080/082各自路径仍归原owner。

首轮全module normal真实失败在private Run的原3s终态等待；当时没有记录Run状态，不能声称已确证该历史事故的错误码。081原样单次及外部只加诊断的30次均未复现，保留为观察，不当修复。随后在外部overlay以同一输入只改变独立SQL synthetic append的提交时点：MarkRunning读事务前提交通过；权限SELECT后、UPDATE前提交真实得到`sqlite3: database is locked`，Run停在preparing/revision2/原claim，事件只有accepted/preparing/外部delta，原3s失败。两组实际Wait，原始14-events-controlled-before/during日志及探针保留。这证明夹具跨连接写入可造成同类挂起；与首轮事故的关联仍是推断。

最小修正：fixture明确记录原Options.ExecutorPaused；运行真实Executor的sourceRun先用既有3s waitTerminal等模型Run终结，再附加原synthetic delta。暂停Executor的fixture仍直接附加，原来源/权限/消息/JSON/270事件与SnapshotSeq274断言、3s期限均保持。所有已存在断言不删除、门限不提升；修复对象是夹具自身第二writer顺序，不为过测改生产规则。

原作者先定向回放此真实输入并保留失败/绿与差异，停写后由080统一重冻、回归events/foundation normal并接risk race/vet。已通过且源码/测试未受影响的包按原输入复用，Root后续独立代码验收与双轴审查不省略。不能把新fixture通过等同于外部任意SQLite writer已被产品支持。
