---
schema_version: 2
session: "20261025T043239Z"
task: "077-groups-review"
kind: review
change: 2026-10-25-huhu-bot-architecture
ticket: T-13
---

# 群聊及共同底座的独立双轴审查

## Goal
原未参与实现的 /root/foundation_review 对 T13 和原 T01/T02/T03/T04/T05/T06/T07/T11/T12 共同维护的完整固定候选，分别作标准轴与规范轴判断。此文件仅准备；Root 接纳 073/074/075 真实完整交接、固定当前输入并实际派遣后才启动。沿既有 gpt-6-astra/high 偏好，不再委派，不修生产与永久测试。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715；Map19/Goal18，28票55AC不变。AGENTS发现→dev→T13及实际维护票→I最终审查、risk/error/test-reliability。LOG051与用户最新确认仅要求代码交付及适用自动化，真实模型/Obsidian/目标OS由用户后验，不索凭证。

完整读取073/074/075最终REPORT、Root真实交接/集成/构建回执与对应原始红绿；输入是evidence/T-13.md#review-input-groups-r1，实际Input-SHA256/文件和来源数随Root freeze派遣。map18-window、stdio-delivery、managed-startup、private-provenance及effect-owner-reconciliation补充为当前已锁定接缝。072候选3是先前底座历史门，只有摘要和影响闭包仍相容才复用，不称旧证据认证新增群行为。

## Workspace and Scope
只写自己的TASK目录REPORT/log与外部精确副本探针。生产、永久测试、协议、正式Evidence/Map和他人报告只读；无提交/推送/发版/归档。审查冻结范围含完整实际产品及新增群调用路径，不以文件owner限制找缺陷；扩散到未启用未来票时区分当前真实可达风险与未来实现需求。核对全部固定文件/规范/HEAD/index，漂移立即告知Root。重检查由Root明确独占，所有子进程必须完成Wait，失败保留；不用真实keyring/DBus账户探针。

## Acceptance
从公开BotClient/HAP/Facade/同Executor消费者两端核验：普通无@只A；明确@B/C只B/C，A无模型/Grant/allowlist也可合法批量；任一无效目标或缺权整批无Run/消息/回执/pin/费用部分提交；一根意图及可信user_batch事实；配置pin、预算、深度3/累计32/并发4与8/wakes8不变，编排根无模型输入/费用/假授权。

公共transcript持久seq按实际发布事务定序、child稳定结果去重；根事件seq不混用；新成员none/明确同群有界历史，私聊/私有thread隔离；协调者CAS与活动根（含waiting/blocked/interrupted）互斥。成员移除/rejoin代数与取消提交、实际Attempt.Dispatch、结果发表、真实物理writer fence贯穿零source及temporary再委派，另一群/私聊同Bot不受影响。

重点证伪私有贡献闭包：B私下读C结果/AgentMessage后，全量(AgentID,incarnation,historyRevision)持久union并同Tx提升Run.revision；包括完整CP恢复及正在运行的tasks.get/list直接读正文。启动时旧ToolExecution可被安全识别，但末门必须检查DB当前全量Group/source/Grant/derived。纯编排root不消费正文所以保持emptyMembers；公开历史已合法发布不因原作者移除而删除，却仍受Source撤权约束。真实TS Run proof仅严格更高revision扩充，同revision冲突与旧revision正确处理；未知新贡献者撤销也使整个Session未公开Run缓存/pending页失效并由实际Snapshot/runs.get重锚，不假取消其他有效Run或删公开transcript。

用户意图文字与附件展示metadata分离：根没有来源权限不等于丢标签；模型History不能借展示附件获得正文，server-onlyDeliverySubject实际验证所有序列化标签。单个stdio batch同subject多个响应需要并集所有完整附件身份，不能first-only或nil吞后续；超限拒绝，取消/部分frame隔离保持。已受理精确命令重试回同回执；busy旧CAS不静默变新命令，草稿保留。

独立核查Map19精确效果维护：成员/来源撤销后，真正owned Profile/Run的无正文Effects.Get/Reconcile可继续核查unknown；保留foreign principal/Profile拒绝、当前Host lease/workspace/connection/指纹、命令CAS与幂等。内部EffectDispatch/Preview绝不作为用户结果；Approvals.Get/List仍按正文权限拒绝，Run终态不复开、只QueryReceipt不重Invoke。检查失败草稿不公开、已接受partial仍保留、发布前撤deliver body-free终结且pin/slot清理；真实用户waiting补充与问答CP恢复须按目标pin/完整成员来源证明继续，撤权不能使根永久waiting。

013实际旧v7迁移：SQLite专用连接在事务外关闭FK，完整DB+CP备份先于变更，同Tx建/copy/drop/rename及FK检查，rollback不半升级，归还连接前FK必须on；旧SQL冻结，旧数据/CP恢复集可回读。旧库先存孤儿FK会被完整备份前置拒绝，不冒充迁移内生FK错误。真实startup安全reason仅窄allowlist，未知stderr/路径/正文不泄漏。共享API仍71方法/142验证器；以实际冻结样本数和hash为准，SQL版本不等于wire版本。

独立验证按实际风险选择可证伪窗口，不重复无影响整包矩阵或真实平台操作；原红绿必须保留并区分产品失败、测试夹具编译/工具选择失败。联合normal曾实际暴露direct single/batch scope拒绝reason不一致；074仅修正groups/access.go一行reason，原测试/资格谓词均未改，须核对最终联合输入和两次normal记录，不把第一次失败删除。Root受控Engine/合成Vault链证明代码接缝，不能冒充真实Provider/Obsidian。旧原始input六处docs锚点和全局计划校验已知诊断单独保留，不称全局绿。两轴各自pass/request-changes，不限制finding数量，给真实触发、路径、影响与修复/验证条件。

## Return
REPORT位置为本TASK同目录REPORT.md；首h2前Session/Task/Status准确，聚焦交接、实际产物/命令/exit/环境/未验证与问题。standards-output及specification-output独立锚点各含Reviewer/Axis/Result/Input-SHA256/Observed。实测、推断、未验证分开。末次完整输入无漂移、全部自有进程Wait/停写，亲自return0后真实MESSAGE+FINAL；Root全读后才维护状态。不得自称T16、T27或全28票完成。
