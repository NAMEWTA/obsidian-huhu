# Work 使用记录与边界

固定入口版本：`974105b47e03c108df0f5e0c3fc9606fe4b79aee`。不是安装新的SpecDev，也不改全局config/永久memory。

| 顺序 | 入口 | 本次输入/实际操作 | 输出 | 未通过的门 |
|---|---|---|---|---|
| 1 | specdev-t-triage | 读Issue全文/metadata、最新dev、活动change；冻结来源和授权 | source/triage | archive精确去重及正式validator待完整环境 |
| 2 | specdev-g-grill-with-docs | 读决策/错误/设计合同、核对源码、GitHub复用；不重复问已决定事项 | LOG/CONTEXT/ADR/design-tree/reuse | 未取得新HTML确认，不标consensus |
| 3 | specdev-s-spec | 产品故事、范围、28行为接缝、UI合同草案 | spec/architecture/data/API/security/integrations | UI/P0条件未闭，ready_for_tickets=false |
| 4 | specdev-t-tickets | 读template/schema/plan-quality方法，拆完整24票、DAG、覆盖与写集 | ticket/tickets-map/acceptance | skills精确hash绑定、DoR、正式工具未关闭 |
| 5 | specdev-p-goal-plan | single-change/full template；读票DAG与授权，编排Gate/共享owner/恢复 | goal-plan(plan-only) | ready_for_execution=false，无实现授权 |

辅助阅读：workspace roots、根AGENTS、dev/ui project skills、domain-runtime、activation-and-memory、artifact-contract、design-contract、intake-protocol、interview-procedure、error-handling、research skill、plan-quality-review入口、source/triage/ticket/design-tree schemas、Spec/Ticket/Map/Goal模板。

研究helper的decision/questions/stop_condition/caller/target在reuse-map；没有新research状态根。原型是本次用户显式要求的设计证据，基线不改，批准不伪造。项目dev/ui规则只应用到本轮文档/原型适用范围；未来生产执行方法必须在I实际调用。

尚未读取或运行的完整工具链/条件性reference不声称全部完成；本包是可评审完整规划草案，不是所有Work完成标准已通过的证明。正式状态保持draft/pending。

## 原型支持Work与项目配置复核

补充读取specdev-p-prototype、design-system模板、change-design/design-package schema、设计库INDEX/style-index；使用其分工、3候选、具名源码、真实浏览器、批准边界。P的正式工具、完整研究模板闭包与ready门没有运行，原型包保持blocked；不能把本文当作六个Work均完整通过。

再次读取项目config.json，language=zh-CN、root_override=null、confirm_before_external_write=true；未声明ticket或实现者并发限额。用户本轮已明确请求一个文档PR，但工具仅读，未发生外部写入。
