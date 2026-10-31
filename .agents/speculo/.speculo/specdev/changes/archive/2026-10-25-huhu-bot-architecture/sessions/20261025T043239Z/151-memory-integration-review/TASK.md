---
schema_version: 2
session: "20261025T043239Z"
task: "151-memory-integration-review"
kind: review
change: 2026-10-25-huhu-bot-architecture
ticket: T-14
---

# 私有记忆与全部真实消费者的独立集成审查

## Goal

由未参与实现的 native:/root/memory_integration_review 对 T14 及本轮维护的既有消费者完成标准轴、规范轴独立审查。范围是 G2 已验收候选之后的完整私有记忆集成，包含运行、权限、费用、恢复、持久化、三协议、TS/HAP、显示查询和全部本轮测试维护；不再只审纯组件。不得自行修复或再次派遣，正式状态和最终 E2E 归 Root。

实际实现及修复者包括 native:/root/foundation_go、native:/root/foundation_client、native:/root/foundation_research、native:/root/credential_provider、native:/root/engine_adapter、native:/root/foundation_api_repair、native:/root/memory_access_repair 和 native:/root。Root 仅组织最终验证，不能代替独立 reviewer。

## Inputs

repo `/home/wta/orca/workspaces/obsidian-huhu/bot`；branch `NAMEWTA/bot`；HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`；Map39 / Goal38 / LOG128。用户授权完整28票55AC及 Agent Team，当前验收只要求代码层面；真实 Provider、Obsidian、目标 OS 操作 user-owned/not-run。禁止请求凭证、提交、推送、发布、归档或改永久知识。

从 workspace/catalog、Map 对应 Skill 矩阵开始，调用真实 dev、I 的 code-review 能力及 source-discovery、Fowler、risk-review、working-tree、review-evidence；源码/标准按实际适用范围回读，不重复无影响的机械检查。独立审查明确使用 `gpt-6-astra / high`，实际原生派遣才算开始。

Root 在派遣前冻结 `evidence/T-14.md#review-input-memory-full-r1`，完整对象另存 `evidence/T-14-logs/review-input-memory-full-r1.json`，字节/mode/主差异为 `review-freeze-memory-full-r1.json`。同一 scope/sources/exclusions 对象的 reviewInputDigest 是两轴 Input-SHA256。未收到真实冻结摘要和派遣不得开始产品检查。Git HEAD 是真实原始基线，但大部分新模块未提交；必须阅读新增实际文件。额外 `review-baseline-memory-full-r1.json/.zip` 已逐文件核对2063份 G2 原字节/mode，既有真实快照为 `/tmp/huhu-lead-anthropic-r1-lq1wawl_`；这是历史工作副本，不伪造为 Git commit。

权威规范为 Spec、ARCHITECTURE、ADR、T14行为/验收/验证，相关T01/03/04/05/06/08/09/10/11/12/13/16合同，115 `interface-contract.md`、123 `short-term-contract.md`、146 `resume-inbox-contract.md`。Map31–39精确窗口与作者报告仅解释职责和证据，不代替行为判断。

历史133两轴 request-changes 及139两轴 pass 均保留；136/137修复的typed返回和页预算可按真实输入影响复用，不能把纯组件通过直接当完整T14结论。Root额外修了TS空白判定为 Unicode White_Space 正则，并已做全部Unicode标量等价与lint/build；这条未在139范围的新差异应纳入审查。

## Workspace and Scope

产品、测试、锁、Skill、正式Evidence/状态与他人交接均只读。仅写本151的 REPORT、logs、manifest及 `/tmp` 独立探针。固定scope列出的完整源码/消费者可以阅读；聚焦 G2 后新增与改变路径，并追踪调用者与受影响未改依赖。当前所有作者已停写才能冻结并派遣；发现字节漂移立即告知 Root。

重点作者链：125/127/130/131/132/136/137公共合同、TS与Engine；126实际私有Store与Hooks；128/138真实Grants/预算/传播；129/134/140默认Core与运行/恢复；141物理stdio最后读门；143祖先依赖性能；144/145原测试迁移；146持久ResumeInbox；147三个SDK消费者；148/149问答alias恢复；150原协作补充消费者。逐任务 REPORT/manifest 与 Root `*-lead-return.json` 可回读，禁止把作者总结等同独立证明。

T15 global Propose/Resolve、UI和后续T17–28尚未进入本阶段实现；其显式未装配状态不构成本T14遗漏，也不能声称整体Goal已完成。原G2已通过部分按真实输入和影响复用，不能因范围内含旧模块把整库从零重审；全部新集成风险和受影响旧合同仍需判断。

初始 Go 窗口由 Root 持有，Root 运行完整共同回归及实际 CLI E2E 时你可做只读审查、离线源码与已有证据核验。需运行有价值反例时先提出具体假设、包/输入闭包和资源，等 Root 明确授予独占窗口再启动；不要机械重跑作者全矩阵。Go 固定绝对路径1.26.10，GOTOOLCHAIN local、GOWORK off、GOEXPERIMENT空、GOFLAGS readonly、GOPROXY off；normal CGO0、race CGO1。所有子进程实际 Wait、保留原输出和source/mode漂移。独立临时测试不能写产品树。

## Acceptance

1. 两轴分别给 pass/request-changes，不限finding数量。每项有可证伪反例、可达入口、影响/严重性、精确文件行、最小修复/验证；实测、静态推断、未验证边界分清。
2. 固定初始 ShortTerm/Memory 的真实内容、线程/Agent隔离、来源revision/hash、Manifest及BindingDigest一致。Intent alias、摘录、working summary不冒称全量已投递；当前来源资格、Host/Grant/接收方read+send在读取与物理外发前仍有效；A不能借B更宽权限或把祖先洗成授权。
3. SQLite/真实Core接入不是空接口：首Run seal、恢复hydrate、History/消息资格、自动维护任务generation/Target head/固定条目、pause/forget/correct/迟到结果、atomic receipt/index/dependency invalidation覆盖正常、失败、竞争与重启。私有维护无全局提升、temporary无隐式继承、聊天成功不依赖维护成功。
4. 同Executor的maintenance使用独立预算purpose/Run与实际Attempts；重复job/租约/取消/停止/host离线/未知usage不会重复收费或提早释放producer、slot、pin。事务部分失败不产生假持久成功；原schema8升级10、旧数据和CP兼容保持。
5. 146/147恢复补充包只承载Claim时合格候选，SaveResume同事务重查并持久后才发模型；已有RecoveryDecision不吸入晚到inbox。首sealed前缀不变、固定pending工具位置、连续两次等待/重启仅投递一次。question答案按实际WaitForIDs与SQL answer身份receipt去重，同文不同ID不丢；lineage及相同hash不当成投递证明。packet上界、历史冲突、当前撤权和坏输入在HTTP前失败且body-free。
6. 149 nil/empty 修复仅放宽可选显示span的等价编码；模型Spans非nil、非空span、原ShortTerm完整性、来源body/namespace/permission保持严格。原waiting-user三Run两次Resume与新增两Run资源证据不能混为同树证明。Root新物理CLI消费链单独核对其实际SQL清理与SDK可见数据。
7. 143祖先算法保持128边界/cycle/身份冲突和稳定顺序；评估真实800来源及50Run证据适用范围，250ms门不是仅mock证明。页大小、编码前Unicode/metadata、合法最大页和typed HAP最后投递门同族边界一致，不用额外TS限额拒合法服务端结果。
8. 测试维护不能删真实失败或把全部红归成夹具：Root完整r1、145三类红、146非法恢复红、147真实三SDK红、148/149实际Claim拒绝全部保留。144原CP/opaque/工具顺序、150原CP/权限/来源/幂等与资源断言保持。closed canceled历史wait edge不再可调度的范围与后续purge责任明确，不把历史行数与活跃资源混淆。
9. Root提供当前完整Go/必要race/vet/架构tooling、生产TS lint/build及生产TS→物理HAP→默认CLI→真实SDK本地HTTP→真实SQLite证据。可以指出实际缺口；未运行真实外部模型/Obsidian/目标OS是用户明确后验，不成为索要凭证或停止代码任务的理由。现有旧E2E只在实际依赖未变时复用。

## Return

REPORT首h2前包含 Session: 20261025T043239Z、Task: 151-memory-integration-review、Status。分别用字面锚点 `<a id="standards-output"></a>` 与 `<a id="specification-output"></a>`，每轴包含 Reviewer: native:/root/memory_integration_review、Axis、Result、同一Input-SHA256、Observed。包含聚焦交接/产物与验证/问题与下一步、全部来源发现、风险覆盖与findings、实际检查与未验边界。

全部自有进程结束后亲自运行 validate-dispatch return，保留实际退出/Wait及原输出；冻结 REPORT/工件manifest，原生MESSAGE+FINAL后停写。Root回读后维护正式Evidence和当前T14代码门，随后按DAG继续T15–28；本任务不关闭Goal。
