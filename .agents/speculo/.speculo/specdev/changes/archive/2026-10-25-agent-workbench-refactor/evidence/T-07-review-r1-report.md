# T07 独立双轴审查 R1

本轮结论：两个轴均为 `request-changes`，发现 3 个已复现问题。以下结果只针对固定的 T07 工作副本，不是整个 change 或前序票的重新验收。

实际 Reviewer：`codex:/root/review_t07_r1`。本会话未参与该范围实现，没有派遣其他 Agent，没有修改产品、正式工件或根构建产物。接收任务要求为 gpt-6-astra/high；模型选择及独立派遣凭据由 Root 的真实 spawn 回执核验，本报告不以自报代替该回执。

输入：`.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-07-review-input-round1-complete.md#review-input`。

- Input-SHA256：`7e21cc86a21893389483888b0f263de1175c2a349d7524b83fec7dbba652a0c7`，实际 JSON.parse/JSON.stringify 摘要重算一致。
- working-tree，Git 观察锚 `33c21e098ef3188cbab5a09f3e0a01fadb787715`；通过原 `resolveReviewScope` 重跑相同显式选择，70 路径及其完整 working_snapshot、index、tracked diff 均一致。仅工具允许的范围外 inventory/exclusions 记录不用于产品漂移比较。
- 59 个来源（包含显式锚点段落）全部重算一致；T07 真正增量基线使用 `T-07-dispatch-input.json` 与 `T-07-final-delivery.json/.diff`，未把共享路径中的 T01–06 既有内容重新算作 T07 改动。styles.css 本票未变。
- 最终双 bin 的 SHA256 和 0555 模式在审查前后均匹配。未构建或改写 bin。
- 前后核验分别见 `/tmp/huhu-t07-review-r1-freeze-before.json` 与 `/tmp/huhu-t07-review-r1-freeze.json`；后者 UTC `2026-10-26T03:32:51.720Z`，errors=[]。

## 来源与阅读边界

按根 AGENTS 先读 workspace/catalog，再读 runtime、specdev-c-code-review 权威入口、公共 code-review Skill 及 source-discovery、Fowler、risk-review、reviewer-contracts、review-evidence、working-tree-review。项目标准来自 dev 与 architecture/testing/licensing；配置及其机械检查按冻结来源与实际检查原件核对。没有为纯控制面审查激活 UI 工作流；Ticket 声明 ui_change=false，styles.css 无本票增量。

规范发现：未提交工作副本没有本票 commit/Issue 变更引用，commit-source 分支不适用；调用方明确的当前 Spec、implementation-contracts、T07、GP025/Map26、engineering-packet 和三份 Root 接缝决定已找到。匹配产品说明为 `docs/agent-workbench-cli.md`，用来核对交付说明，不以旧 inputs 或早期方案覆盖现合同。没有缺规范而跳轴。

人工追踪覆盖 CLI grammar/client/discovery → Rust raw codec/IPC/broker/outbox → TS raw codec/frame/helper/NativeHost → ControlEnvironment/Router/Commands/Paging → Controller/SpaceService/WorkspaceService/Sessions。特别追踪同代 lease/私有 handle、注册关闭 ACK、本地 frame 与 native settled、观察取消与迟到结果、重开、首次 routeEnvironment 回入、同步 capture/提交/保留/启动门、scope 与 rename、完整响应计量、页游标、旧通道轮盘兼容。生成器、canonical、共享 fixture、方向接线、required 双 bin 测试入口、CI 构建顺序、许可缓存与 notices 也纳入核对。测试以风险相关断言和原始执行证据为依据；没有声称逐行重跑所有既有回归或穷尽平台状态。

<a id="standards"></a>

## 标准轴

Reviewer: codex:/root/review_t07_r1
Axis: standards
Result: request-changes
Input-SHA256: 7e21cc86a21893389483888b0f263de1175c2a349d7524b83fec7dbba652a0c7
Observed: 固定70路径/59来源前后无漂移；人工追踪上述生产调用链、资源与恢复路径；使用冻结双bin运行2份隔离反例脚本，独立复跑3文件4项required协议/生产闭环测试。标准依据为根AGENTS、dev生命周期/错误与有界性规则、risk-review的契约/资源/恢复检查；Fowler只作启发式，没有把纯格式偏好报作违规。

### STD-01 / P2：发现诊断绕过完整响应上限

- 位置：`native/pty-server/src/control/client.rs:38`–44；关联 `locator.rs:190`–194、`cli.rs:358` 的输出入口。
- 触发：无 instance 的合法 `capabilities --json` 请求，携带较长 target；私有 locator 目录中存在多个合法候选。候选数组只按 RESPONSE_BYTES/2 独立计量，加入原 request 的 target 后直接返回、直接打印，未再计量完整 envelope。
- 已证实：`/tmp/huhu-t07-review-r1-cli-probe.json` 的 `oversize-discovery` 使用三个合法 locator（instanceId/vaultId 各3800 ASCII字符）及五个 target 字段（各2000个“中”）。OS argv/请求均在原限制内；冻结 CLI exit3、TARGET_REQUIRED、effect none，但 stdout **53252 字节**（含换行），JSON正文53251 > 49152。没有启动 helper 或调用任何业务。
- 实际风险：遵守 schema responseBytes 的机器消费者会拒绝本应可恢复的寻址诊断；公开的内存/传输预算对这条失败路径不成立。不是无界分配或权限逃逸的指控。
- 标准依据：风险审查的失败路径与公共契约检查；不能把独立子结构容量当作完整对象容量。
- 最小修复：候选诊断预算从完整 envelope 剩余容量计算，打印前执行统一的 whole-response 计量/校验；装不下时输出仍可分类、完整且有界的容量错误，不截断身份或 JSON。
- 验证条件：保留该长 target + 多候选反例，输出正文≤49152且可被规范 response parser 接受；候选恰好边界/超边界、无候选和正常短输入均覆盖。

### STD-02 / P2：参数超额后不再发现末尾的 --json

- 位置：`native/pty-server/src/bin/huhu.rs:7`–8、19–26。
- 触发：`huhu version` 后接64个独立 `x` 参数，再接 `--json`。`take(65)` 截断了 OS 参数迭代，最后的机器模式标志从未被扫描。
- 已证实：同一冻结 CLI，`late-json` exit2、stdout **0字节**，只在 stderr 给人类错误；仅把 `--json` 移到前面，`early-json` 就得到206字节的 CAPACITY_EXCEEDED/effect none JSON。对照非法UTF8参数仍能在已看到 --json 时正确输出 INVALID_ARGUMENT。
- 实际风险：封装调用者因追加参数导致容量错误时，失去约定的机器错误记录；结果取决于全局标志的位置。未观察到副作用或 panic。
- 标准依据：公共 CLI 契约的错误可解析性、边界输入一致性。
- 最小修复：保留64参数/32768字节的业务接纳限制，但以不保留正文的方式完成机器模式标志扫描；不要为了检测 --json 而放宽参数预算或执行被截断命令。
- 验证条件：--json 在第1、65、66及更后位置的超额请求都返回完整、有界 JSON/exit2/effect none；非法UTF8与字节超限的组合也保留机器输出且不打开 endpoint。

### STD-03 / P2：客户端超时先于 broker，丢失已捕获的恢复身份

- 位置：`native/pty-server/src/control/client.rs:145`–170、173–185；关联 `broker.rs:425`、431–468。
- 触发：terminal.start 已交接，Host 已发布 launch-pending 与新 sessionId/runtimeId，业务仍等待。客户端在发 request **之前**设置 timeoutMs 截止时间，broker 在收到 request **之后**才设置相同长度的截止时间。客户端先自行结束读、关闭 socket，broker 的含 latest progress 的超时回执通常没有机会到达。
- 已证实：`/tmp/huhu-t07-review-r1-timeout-probe.json` 使用冻结真实 CLI/broker，隔离 synthetic Host 依次发送 admitted 和带 `committed-session`/`reserved-runtime` 的 launch-pending/partial；timeoutMs=200。CLI exit6/WAIT_TIMEOUT，却返回 phase failed、target仅原instance/space，无新Session/runtime。之后原call仍正确cancel→late-result→settled→unregister，故不是“自动停止/重放”问题。
- 实际风险：最需要恢复定位的启动超时丢失精确关联；文案要求查询 captured target，但新目标实际未交给调用者。原requestId不提供任务幂等/持久查询能力，用户只能重新枚举猜测新增记录。
- 标准依据：风险审查的恢复路径、异步接口双方时序与真实消费者检查。现有 Rust timeout 用例只断言exit/code/effect=unknown，没有带新target并断言恢复字段，未暴露该问题。
- 最小修复：协调业务观察截止与有界传输收尾预算，使正常超时有机会接收 broker 保存的最新已知目标/阶段；或在现有受限协议中把最新观察可靠交给CLI。仍须有总界限、不重发业务、不阻塞业务责任结算。不能只把测试固定为当前缺失字段。
- 验证条件：真实CLI/broker已收到新target进度后，在业务未完成时超时，stdout仍带该target和launch-pending；迟到结果不重发、不进入下一代，原permit结算；transport确实断开时可保留unknown的准确降级。

标准轴未发现需要报告的其他可证实问题。此结论不证明所有并发排列、平台或真实Provider环境均无缺陷。

<a id="specification"></a>

## 规范轴

Reviewer: codex:/root/review_t07_r1
Axis: specification
Result: request-changes
Input-SHA256: 7e21cc86a21893389483888b0f263de1175c2a349d7524b83fec7dbba652a0c7
Observed: 使用同一固定输入独立对照当前Spec §3.5/§3.10、AC-010/011/012/052/055、implementation-contracts §2–4、T07验收与engineering-packet及Root三份接缝决定；发现以下3项合同缺口。没有把尚未接入的T08及后续能力要求为本票假成功，也没有以自动化代码测试冒充用户实机验收。

### SPEC-01 / P2：whole response 48KiB 合同未覆盖本地发现错误

位置：`native/pty-server/src/control/client.rs:38`–44，`locator.rs:192`。触发、原始证据和实际影响与 STD-01 相同：合法输入得到53251字节JSON正文。规范依据：engineering-packet“页与真实验证入口”要求完整envelope含error/长旧ID计量，canonical `responseBytes=49152`，产品文档“运行响应49152字节”。独立候选数组上限不足以证明完整响应上限。最小修复及满足条件：在最终完整回执上核限，从实际剩余预算生成候选或准确容量错误；长target+候选组合≤49152且通过response解析，保留正常发现行为。

### SPEC-02 / P2：--json 失败输出不满足完整机器记录合同

位置：`native/pty-server/src/bin/huhu.rs:7`–8、19–26。触发、证据同 STD-02：第66个参数的--json被忽略，exit2但stdout为空。规范依据：implementation-contracts §2规定全局--json，§3规定stdout在--json下仅给完整JSON记录；实际派遣明确要求OS参数错误仍给有界可分类JSON/exit/effect，不能空stdout。最小修复及满足条件：拒绝超额业务参数时仍识别全局机器模式，所有位置的--json均输出可分类的none错误，接纳限制不放宽、无endpoint/业务效果。

### SPEC-03 / P2：已知启动阶段/目标在普通超时回执中消失

位置：`native/pty-server/src/control/client.rs:145`–185，`broker.rs:425`、431–468。触发、证据同 STD-03；这是传输反例，不是已运行真实Provider启动的声明。规范依据：Spec §3.3/§3.5“响应丢失保留可查询身份”“字段至少表达目标身份/阶段”，implementation-contracts §3“target在可用时包含session/runtime”“EFFECT_UNKNOWN携已知目标/阶段”，engineering-packet“onReserved发布准确关联/最新已知target phase effect观察”。broker确实保存已知身份，但截止顺序使CLI常规超时无法消费该路径；仅返回unknown不弥补丢失已知target/phase。最小修复及满足条件：在有界观察终止协议中保留已收到的准确target/phase，并用真实双bin timeout回归验证；取消只撤观察、无自动重放、迟到责任不提前返额。

其余本票合同的代码/测试对应关系已追踪，未产生额外规范finding；该固定范围仍因以上3项不能放行。

## 实际验证、复用与限制

本次实际执行：

1. 输入/来源/scope/双bin前后核验：两次exit0，70路径、59来源、errors=[]。
2. 冻结CLI参数与whole-envelope反例：`python3 /tmp/huhu-t07-review-r1-cli-probe.py`；最终脚本exit0，四个子进程的真实exit/stdout/argv/UTC在JSON中。首次运行只在保存JSON时因bytes argv不可序列化失败（exit1），子进程输出已写入自有临时目录；修正的是/tmp证据序列化，未改产品或断言，第二次结果完整保留。此脚本exit0表示成功记录反例，不表示产品合格。
3. 冻结双bin超时反例：`python3 /tmp/huhu-t07-review-r1-timeout-probe.py` exit0；CLI exit6，helper之后实际退出，未留下自有活动进程。Synthetic Host仅发协议进度，无生产业务效果；不把它当作真实业务E2E。
4. required回归：`python3 /tmp/huhu-t07-review-r1-run-regression.py` 所记录的实际Node/Vitest argv；`control-native.test.ts`、`host-control.integration.test.ts`、`test/native/control-protocol.test.ts`，**3文件/4测试通过，0skip，exit0**。生产业务闭环由第一份既有测试负责；未使用synthetic responder替换它。日志 `/tmp/huhu-t07-review-r1-regression.log`。

复用证据已回读原始日志/CAS，未伪称本次重跑：

- i1：66文件555tests，554pass/1fail/0skip。唯一旧activity fixture经最小补协议后，4个Controller文件18tests通过；复用理由及生产输入未变见 `T-07-integration2-verification-reuse.json`。没有声称“再次全555绿色”。
- 当前build、production lint、architecture、i18n、generated --check、Promise guard、final bundle、notices --check的真实成功记录；bundle旧预算失败及精确归因/修订也保留。main.js/styles.css/THIRD-PARTY-NOTICES摘要匹配冻结输入。
- Rust105tests/0ignored、最终双bin生产来源、Windows cross-check与verify helper记录保留并核验。未重新编译Rust；Windows cross-check不是实机ACL/ConPTY验收。
- 六个Bot文档锚点失败仍存在，属范围外旧问题，没有改测试或声称docs全绿。
- 新两份MIT全文与sources.json精确版本、SHA和历史/发布来源区别一致；notices实际100npm/73crates。只核对本地冻结的原文/元数据/摘要，没有给出新的法律意见，也没有把历史正文称作当前crate发布内文件。
- 相似度4GiB OOM与12GiB重跑exit0原件均保留；只看我方片段及数字回读，没有阅读GPL终端源码。
- 对六组Root审计所引用CAS实际重算：integration1 2118项、integration2-build 8562项、activity-fixture 38项、c-final 352项、license-readonly 42项、integration2-similarity 119项，未发现摘要不符。CAS完整性是输入/证据一致性，不代替语义审查。

未运行/不作声明：真实Obsidian、真实账号/Provider、真实用户Vault、五平台实机E2E、Windows高低权限ACL行为、全量新的555项回归、完整重新构建/许可联网抓取。以上平台验收依原用户分工保留；本次3项自动化可复现finding不依赖那些环境。

本报告与checks仅写入/tmp。没有提交、推送、发布、归档或正式Ticket/Goal状态变更。

READ-ONLY SOURCE STOPPED
