---
schema_version: 8
artifact: goal-plan
change: 2026-10-31-huhubot-pi-refactor
status: draft
modes:
- high-assurance
- reference-conformance
- release-coordination
orchestration: lead-directed
lead: issue-39-change-lead
integration_attempt_limit: 3
ticket_execution: auto
ready_for_execution: false
---

# Goal Plan：Huhu Bot 单 change 完整编排

## 1. Outcome and Authority

### Outcome

整体Outcome唯一在README；本Goal规划Issue #39的完整实施顺序，本轮只交文档和原型。真实成功是Pi唯一harness、安全业务交付、完整个人与协作能力、统一UI、单生产路径、全部验收证据。仅SDK可import/聊天成功/流程图/截图/删Go目录均是假完成。

### Non-goals

本轮生产实现、隐式授权、自动旧数据迁移/删除、旧协议兼容、第二runtime/scheduler/browser、远程Web/IM/移动Bot、未经请求的merge/部署/改Issue。

### Authoritative Inputs

用户最新请求控制本轮授权；Issue冻结原文控制目标；ADR/CONTEXT控制架构语义；Spec控制行为；Ticket控制本票合同；源代码/实测控制事实；DESIGN控制经批准视觉意图。研究来源与限制在reuse-map，不把参考项目成熟度写成已证明。

## 2. Execution Graph

完整DAG以Tickets frontmatter为权威，导航tickets-map。技术主链：T-01/02/03→T-04→T-05→T-06→T-07→T-08/09；个人能力T-11/12/13/14；协作T-15/16/17；Browser T-18外部依赖，Automation T-19，MCP T-20/21；T-22整合→T-23删除→T-24发行。此为依赖关键链，不是未经估时的工期“关键路径”结论。

### Waves and Ownership

下表由依赖拓扑计算，仅是候选。资源/API/schema/工作区冲突会收窄实际批次；不意味着同Wave全部并行。

| Wave | 候选 Ticket | 共同开始条件 | 集成边界 |
|---|---|---|---|
| W00 | T-01, T-02, T-03 | 原票blocked_by满足、单票DoR、授权及局部Gate | Lead串行核验共享资源与正式Evidence |
| W01 | T-04 | 原票blocked_by满足、单票DoR、授权及局部Gate | Lead串行核验共享资源与正式Evidence |
| W02 | T-05 | 原票blocked_by满足、单票DoR、授权及局部Gate | Lead串行核验共享资源与正式Evidence |
| W03 | T-06 | 原票blocked_by满足、单票DoR、授权及局部Gate | Lead串行核验共享资源与正式Evidence |
| W04 | T-07 | 原票blocked_by满足、单票DoR、授权及局部Gate | Lead串行核验共享资源与正式Evidence |
| W05 | T-08, T-10, T-11 | 原票blocked_by满足、单票DoR、授权及局部Gate | Lead串行核验共享资源与正式Evidence |
| W06 | T-09, T-12, T-13, T-18 | 原票blocked_by满足、单票DoR、授权及局部Gate | Lead串行核验共享资源与正式Evidence |
| W07 | T-14, T-15, T-19, T-20 | 原票blocked_by满足、单票DoR、授权及局部Gate | Lead串行核验共享资源与正式Evidence |
| W08 | T-16, T-21 | 原票blocked_by满足、单票DoR、授权及局部Gate | Lead串行核验共享资源与正式Evidence |
| W09 | T-17 | 原票blocked_by满足、单票DoR、授权及局部Gate | Lead串行核验共享资源与正式Evidence |
| W10 | T-22 | 原票blocked_by满足、单票DoR、授权及局部Gate | Lead串行核验共享资源与正式Evidence |
| W11 | T-23 | 原票blocked_by满足、单票DoR、授权及局部Gate | Lead串行核验共享资源与正式Evidence |
| W12 | T-24 | 原票blocked_by满足、单票DoR、授权及局部Gate | Lead串行核验共享资源与正式Evidence |

### Ticket Quick Reference

票入口由tickets-map导航；证据只在evidence/T-NN.md，尚未执行不预建成功报告。当前票状态不缓存在Goal中。

## 3. Gates and Completion Evidence

| Gate | 开启条件 | 关闭证据 | 阻塞范围 / 失败恢复 |
|---|---|---|---|
| G0 规划与授权 | 来源/设计/范围可读 | 本轮原型确认、正式validator/plan review、未来明确实现授权与工作区 | 无授权不执行任何实现票；PR文档可独立评审 |
| G1 P0宿主与合同 | T-01/T-02；设计由T-03独立 | 真实Node/ABI/utilityProcess/SDK/assets矩阵；引用/许可清单；单一路径ADR | Runtime依赖闭包；失败回Grill不fallbackGo |
| G2 只读基础 | T-04/05/06 | startup、native session、branch、abort、serial、generation、reconnect/recovery | 可继续安全设计，不提前开写工具 |
| G3 安全交付A | T-07/08/09/10按范围 | hostile dispatch、approval/race/budget、notes/Todo/archives真实receipt | 所有副作用依赖；unknown先对账 |
| G4 个人能力 | T-11/12/13/14 | profile/credentials/Skill/facts/forget/backup与恢复 | 相关UI/协作scope；保护失败不明文落盘 |
| G5 协作C | T-15/16/17 | root quotas、wait活性、Mailbox、review、三图真实引用 | 协作整体；失败不伪根成功 |
| G6 跨模块B/D与MCP | T-18/19/20/21，#38真实门 | 同Space/Page；occurrence幂等；外部标准MCP读+批准写 | #38只阻断T18闭包；mock不关闭门 |
| G7 单路径发行 | T-22/23/24 + G1–G6 | A01–A28、工程/性能/平台/许可/删除/非Bot回归实证 | 任一必须项not-run不得Done/Close；发布失败保全数据 |

### Overall Definition of Done

按Issue §21全部八项与spec28合同，源码/构建/发行/文档一致，无旧链路、无隐藏fallback、无越权副作用、无伪造完成。文档PR不满足产品DoD，当前不得关闭Epic。

### Contract Coverage

AC-001–AC-028在spec中唯一，责任与接缝在tickets-map/acceptance-plan。本Goal只管理跨票门，不重复28条或缓存通过状态。

## 4. Execution and Integration Protocol

执行入口：真正授权后由Lead和执行者调用specdev-i-implement及适用project skills，不把“已读SKILL”当执行验收。

### Lead Orchestration

唯一角色issue-39-change-lead，执行前绑定真实session/恢复locator；当前没有在运行的执行团队。ticket_execution=auto只是策略候选；已读取项目config.json；其中未声明票数或实现者人数限制，不捏造数字。integration_attempt_limit=3是模板默认候选；相同输入/同方法/无新证据的重复失败不消耗三次来假装进展，而是立即阻断升级。

任务执行者只返回候选patch/checkpoint/命令结果，不能成为第二状态或集成owner。动态派单在执行时按能力/模型/环境决定，不预分配供应商；只读研究不被误算为实施票。

### Workspace and Verification

本change工作区策略current，实际事实在README Execution Context；当前只有生成工件目录而非完整dev clone。未来在确认dev与干净目标分支后绑定实际checkout。所有执行者同一change工作区，细分写集；Git index/共享schema/API/root依赖/全局E2E串行。每票冻结真实commit或文件snapshot，并在同工作区测，不假造candidate checkout。

共享owner：T-04负责public API/模块装配初始合同，T-07负责安全/控制schema，T-23负责最终production build/removal。因T-05首先需要基础ledger，T-07需继承并精化该合同，必须串行；新增依赖若需早于T-23集成，Lead先重划集中写集到实际当前票并递增plan_revision，不绕依赖执行未来票。

### Authorization Matrix

| 动作 | 本轮状态 | 条件 |
|---|---|---|
| change文档/静态原型/本地验证 | allowed | 只在本change写集 |
| 生产实现/P0代码spike | not-authorized | 用户另行明确实现授权 |
| 创建额外worktree | not-requested | current默认，不按票增加 |
| 文档commit/push/PR→dev | requested-but-capability-blocked | 当前connector无write，未执行；PUBLISH说明 |
| merge/父分支更新/部署/版本提升 | not-authorized | 不从PR授权继承 |
| 用户旧数据清理/导入 | not-authorized | 未来运行中逐次精确确认 |
| 改相邻Issue/关闭#39 | not-authorized | 文档PR仅Refs |

## 5. Constraints, Risk and Recovery

技术不变量参ADR，不能偷放宽SDK工具/默认资源、预算、旧协议兼容、用户数据保全。全量引用图、当前config限制、skill hash、正式validators、原型批准与P0实测均为可见缺口，不隐藏在“实现细节”。

### Release Sequence

单分支逐纵切实施→固定发布候选→T23删除生产闭包→T24实机/恢复/非Bot回归→再次检查dev/source/UI/Browser合同漂移→按Delivery授权发布。没有运行时旧新共存的兼容窗口；旧磁盘数据保留为不可自动导入的独立历史。失败撤回发行包不等于旧Runner可读新格式。

### Deviation / Resume

依赖/API/schema/recipient/安全/产品行为变化先回所属Spec/ADR/Design；只影响局部实现可在票内记录。恢复先看真实Git/锁/owner/generation与最后可信Evidence；unknown effects和未知远程副作用先对账，禁止换ID重做。无新证据不重试同一失败方法。

## 6. Current Status and Pending Gates

本Goal为draft / ready_for_execution=false。当前唯一工作是文档原型交付；产品G1–G7未关闭，P0未执行，UI等待新确认，正式工作流校验未跑，PR未创建。这里不缓存各票进度。

## Assumptions

低影响：中文维护文档、静态原型无外部网络依赖、延续既有信息架构槽位。高影响条件不作假设：实际支持宿主/ABI、SQLite根路径、MCP版本/钩子完整性、跨模块API可用性均必须有证据；未满足不执行受影响票。

## Execution Policy Source

用户要求完整文档/原型、一个PR、不实施；对应sources/user-request.md。工作区current/auto/默认3次集成复盘来自所读Goal模板及单change规则，真实config仍需发布前核查。无明确max_parallel_tickets或implementation人数限制，不自行填固定数字；实际执行先读取完整config，限制更严时从严。
