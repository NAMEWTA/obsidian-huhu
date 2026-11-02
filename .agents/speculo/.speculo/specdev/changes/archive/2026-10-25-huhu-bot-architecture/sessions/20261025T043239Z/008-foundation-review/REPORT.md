# T-01 独立双轴审查回报

Session: 20261025T043239Z
Task: 008-foundation-review
Status: completed

## 聚焦交接

独立审查已完成，standards 与 specification 均为 request-changes。发现四项实际问题：硬链接别名绕开崩溃残留 WAL、stdout 背压阻塞 EOF 退出、TS 未完整验证方法结果与 Host 参数、Go 参数解码接受 schema 禁止的字段拼写。只写本任务报告和原始反例日志，未修改被审代码、未再次派遣、未提交。应由 Lead 交原 owner 修复，重新冻结受影响输入并补审后再打开 T-01 完成门。

## 产物与验证

- 固定输入：`evidence/T-01.md#review-input`，Input-SHA256 `17d3dcdf590c840a9716b50a97e4b01f7f81d1b15d02cc433adc07456835be45`。以 JSON.parse 后 JSON.stringify 计算，核对全部 sources 原文/锚点 SHA 与 `resolveReviewScope` 的 working-tree 完整可比较字段。37 个实际文件均纳入，新增文件没有被空 Git diff 遗漏。基线和 HEAD 为 `33c21e098ef3188cbab5a09f3e0a01fadb787715`。
- 实际身份：`native:/root/foundation_review`；由 Lead 派遣的原生 reviewer，未参与 Go、TS、根接缝及修复实现。真实工具身份/派遣事实由 Lead 独立核验；本报告不以自行命名证明独立性。
- 标准来源发现：使用冻结 AGENTS、dev 及 architecture/testing/licensing/build-and-release，读取 code-review 的 source-discovery、working-tree-review、Fowler、risk-review、reviewer-contracts、review-evidence 和错误/测试可靠性规则。范围目录未发现额外 AGENTS/CONTRIBUTING/CODING_STANDARDS/CLAUDE。新增工作副本无本轮提交来源，commit 引用项 not-applicable；显式 Ticket/Spec/ARCHITECTURE/ADR 已找到，当前 docs 导航不能替代 change 行为权威。UI 不在范围，不启动 UI Workflow。
- 审查覆盖：CLI/bootstrap/Profile 三平台锁与权限、SQLite/migration/UoW、Application facade/Host、router/stdio、Go/TS codecs、managed transport、所有 61 个公共方法类型和生成器/schema/methods/golden、全部相关测试以及 ModuleId 唯一 diff。生成类型、schema 成功和已有测试绿均未当作运行时语义证明。
- 自行执行：`GOTOOLCHAIN=go1.26.10 CGO_ENABLED=0 go test ./tests/contract/foundation/... -count=1`（cwd native/huhubot）exit 0，1.492s；`pnpm exec vitest run` 指定本票四个测试文件，exit 0，4 文件/22 tests，23.08s，含真实 TS→Go 进程。
- 自行执行：在外部临时副本运行原 `generate.mjs`，全部 61 methods 生成成功；schema.json、methods.json、golden.json、methods_generated.go 与冻结源码逐字节一致，exit 0。生成路径未触碰工作区文件。
- 自行执行：系统 `python contracts/hap/v0.1/validate.py` 首次因没有 jsonschema 模块 exit 1，未计为通过；回读作者使用的固定 venv 后，`/tmp/huhubot-contract-validator/bin/python contracts/hap/v0.1/validate.py` exit 0，122 method shapes、3 goldens、25 decimal 负向例。
- 新反例：原命令、完整探针源码及原始输出见 [raw-probes.log](raw-probes.log)。Go 二进制由冻结源码 CGO=0 构建；TS 以 esbuild 将生产 connection/codec bundle 到 `/tmp/huhu-foundation-review/`。反例仅操作合成资料，所有子进程均 wait/reap。崩溃时 DB/WAL/SHM 的独立快照保留在 `/tmp/huhu-foundation-review-data-2jmg6fyr/crash-snapshot`，摘要与原路径/alias 回读在日志中；这不是用户数据。
- 已检查无额外 finding：基础 Application 无 SQL/SDK/Wire/宿主依赖；普通连接 attach/shutdown 权限检查、无 ID 通知忽略、hello gate、反向同 ID、坏库/未来库拒绝、受管 env allowlist 均有真实调用和测试依据。Go active 按处理中请求释放，工作槽 32、batch 8、反向 pending 32；TS pending/Host 请求有界，seenServerIds 达 4096 明确关闭而非无限增长；TS 迟到普通响应忽略，Go 反向超时关闭后不继续接收。Fowler 的重复方法目录是维护启发式，本轮不单独制造风格 finding。
- 外部检查边界：Lead 报告完整 build exit 0；已回读 `009-tooling-lint/REPORT.md`，其限定 eslint 分类修正后完整 lint exit 0/零警告；这不是 reviewer 自行执行或对 T-27 工程范围的独立批准。作者 race/vet/跨平台编译只作辅助记录，本轮未重新声称独立运行。macOS/Windows 实机、真实模型与 Obsidian 用户操作未执行，按 LOG-051 由用户后验，不构成本轮代码门阻塞。

<a id="standards-output"></a>

## standards-output

Reviewer: native:/root/foundation_review
Axis: standards
Result: request-changes
Input-SHA256: 17d3dcdf590c840a9716b50a97e4b01f7f81d1b15d02cc433adc07456835be45
Observed: 对固定 37 文件完成风险驱动检查并运行真实进程/生产 TS 反例；以下是行为与恢复风险，非格式或 Fowler 风格偏好。已有 Go 与 TS 套件均通过仍不能覆盖这些反例。

### STD-01 — P1：硬链接别名使用不同 WAL 路径，崩溃后返回旧状态

- **位置：** `native/huhubot/internal/runtime/profile/profile.go:130`（EvalSymlinks 后直接将 realDB 作为 DatabasePath，至 142）；`native/huhubot/internal/adapters/outbound/sqlite/base/store.go:28`（按该路径打开 SQLite）。
- **可达条件与风险：** 同一主 DB 存在受管根内硬链接；先在原路径提交 WAL 事务，进程异常退出，再用 alias 开库。flock 正确按 inode 互斥，却没有使 SQLite 的路径相关 WAL/SHM 共享身份。alias 无原路径 WAL 时成功进入 ready，返回旧状态，后续写入会基于旧状态继续工作。
- **证据：** `raw-probes.log` 的 initial revision=1，fixture 用真实 SQLite 提交 revision=2，原 Runner 的 profile.status 确认 2；SIGKILL 后 alias hello 返回 1，原路径重新 hello 返回 2，Profile ID 完全相同。fixture SQL 只用于制造真实已提交持久状态，未声称 T-01 已提供 revision 更新业务命令。
- **依据：** dev 持久化/恢复选择表、risk-review 的多事实源漂移/兼容恢复检查、error-handling 的已提交事实不得按未提交重试。现有 hardlink 测试只覆盖存活期第二写者拒绝，不能证明退出后的同库恢复。
- **满足条件：** DB 身份策略必须同时保护主库与 WAL/SHM；无法安全归一的硬链接应在进入 SQLite 前稳定拒绝并保留资料，或使用经验证的共同规范路径。增加真实 WAL commit→崩溃→原路径/alias 的恢复反例，证明不会读回旧状态或产生分叉，并保留存活期 INSTANCE_CONFLICT 检查。

### STD-02 — P1：同步 stdout 写阻塞主循环，EOF 无法触发有界收尾

- **位置：** `native/huhubot/internal/adapters/inbound/stdio/server.go:195`、`:215` 同步 `s.write`；`:103`–`:118` 的无缓冲 frames 转交与 `:64` 无截止时间 WriteFrame。
- **可达条件与风险：** 客户端暂不消费 stdout，发送足够合法请求填满返回管道，然后关闭 stdin。主循环停在 write，独立 reader 也停在 frames 转交，不能继续观察/处理 EOF；进程和 DB 锁只能等 stdout 被消费或外部 kill，失去自行收尾保证。hello 前错误响应即可触发，未依赖未来业务。
- **证据：** 默认 Linux stdin/stdout pipe 各 65536 B，900 个请求共 54790 B 全部写入后关闭 stdin；3 秒后进程仍存活，随后仅开始读取 stdout 即 exit 0，共 211390 B 输出。代码路径没有写超时；3 秒观察不是用短预算推断正常慢处理，而与明确阻塞点及解除背压后退出配对。
- **依据：** dev 生命周期资源释放、error-handling 取消与外部工作终止应有完成信号、risk-review 并发 owner/有界资源规则。
- **满足条件：** 所有响应写入（包括 hello/pre-hello/资源超限分支）均有可取消/有界 writer；stdout 慢消费者不能挡住 EOF/关闭处理。真实 OS pipe 反例应在不读取 stdout 时自行退出、释放锁，并验证恢复重开；不能只让测试父进程帮忙 kill 后宣称 Runner 已自行收尾。

### STD-03 — P1：TS 以类型断言代替方法级运行时验证，非法 Host 参数进入执行入口

- **位置：** `src/modules/huhubot/core/protocol/connection.ts:281`（直接 resolve result）、`:306`–`:318`（Host 参数仅局部检查）、`:344`–`:347`（as unknown as HostInvoke/HostReceiptQuery）。
- **可达条件与风险：** peer 发 envelope 合法、业务 DTO 非法的结果或反向请求。普通 result 可把错误 schema、缺失字段和数字 revision 带入客户端；反向请求可把 object content、数字 expectedRevision/resource.revision 和未知字段交给可信 Host，Host 以为已获得类型保障，可能错误处理内容/版本条件。租约检查成功不代表 DTO 已合法。
- **证据：** 生产 HapConnection 实际把 `{schemaVersion:99,state:'not-ready',profile:{revision:9007199254740992}}` resolve 给 service.status；持有效租约的 host.invoke 含 `expectedRevision:42`、`resource.revision:42`、object content 与 unknown 字段，真实 Host callback 收到原值且返回 committed。没有借助编译失败或 mock 掉被审连接实现。
- **依据：** risk-review 公共 API/权限边界与错误事实规则；dev 要求纯协议边界仍应保持正确性。schema 和 TS 类型的存在不能保护外部 JSON，测试夹具只覆盖 envelope 正反例。
- **满足条件：** 根据方法和方向，在任何 resolve/Host invocation 前执行完整运行时 DTO 验证，包括 required、additionalProperties、字面量/enum、decimal、UTC 时间和嵌套结构；错误 result 要拒绝 pending，非法 Host 参数不得调用 Host。覆盖上述负向例及已装配全部方法；未装配方法仍应如实拒绝。

### STD-04 — P2：Go DisallowUnknownFields 不等于 schema 精确字段验证

- **位置：** `native/huhubot/internal/protocol/hap/frame.go:188`–`:198`；生产消费者 `native/huhubot/internal/adapters/inbound/hap/router.go:77` 的 hello DTO 解码。
- **可达条件与风险：** Go encoding/json 对结构字段作不区分大小写匹配，DisallowUnknownFields 仍接受 schema 未定义的字段拼写；基于该 helper 的 wire 边界与公共 schema 出现不同可接受语言，客户端/后续 adapter 兼容检查会得到不同结果。
- **证据：** 真实进程收到 hello params `{"ProtocolVersion":"0.1","Client":{"Name":"case-probe","Version":"1"}}` 成功返回 hello result 并置 ready；公共 schema 要求小写 `protocolVersion/client/name/version` 且 additionalProperties:false，该输入既缺 required 又有未知字段。
- **依据：** risk-review 公共契约兼容与重复规则漂移；代码声明 strict DTO，但验证器的实际语义不足。该 finding 只断言已复现的字段大小写问题，不把生成 Go struct 当作 validator。
- **满足条件：** 在 DTO 解码前按 wire schema 精确校验字段集合、required 与类型，或使用等价严格 validator；共享负向 fixture 同时经过 Go 实际 router 和 schema，错误输入不得完成 hello/产生副作用。

<a id="specification-output"></a>

## specification-output

Reviewer: native:/root/foundation_review
Axis: specification
Result: request-changes
Input-SHA256: 17d3dcdf590c840a9716b50a97e4b01f7f81d1b15d02cc433adc07456835be45
Observed: 依据冻结 T-01 Goal/Behavior/Acceptance/Verification/Execution、Spec §9–11、ARCHITECTURE §3/10–13 与 ADR-003/004/005/021/022 独立判断。61 方法仅定义合同、8 方法实际装配符合本票边界；未将 T-02–28 或用户真实操作缺失当缺陷。下列四项属于本票已有合同。

### SPEC-01 — P1：同一实际 Profile 经 alias 重开不能保持已提交事实

- **位置：** `native/huhubot/internal/runtime/profile/profile.go:130`–`:142`；`native/huhubot/internal/adapters/outbound/sqlite/base/store.go:28`–`:33`。
- **风险/证据：** 合成真实 WAL commit 后崩溃，原路径读 revision=2，硬链接 alias 成功 hello 却读 revision=1；日志保存两次外部回读及崩溃 DB/WAL/SHM 摘要。锁只解决同一时刻第二 writer，没有解决退出后的同库资料身份。
- **依据：** T-01 目标“退出重开仍识别同一数据库”、失败与竞争验收的原数据不变；Spec §10 SQLite 权威及实际 DB 身份；ADR-003/004 的资料恢复和别名不变量，AC-034 的 Profile 身份接缝。不是要求本票实现后续备份业务。
- **满足条件：** 硬链接别名在重开时读取相同最新已提交事实，或在进入 SQLite 前安全明确拒绝而不退回旧状态；真实 crash/reopen 测试同时核对原路径与 alias、存活期锁与资料字节，不能仅修改期望来接受状态分叉。

### SPEC-02 — P1：受管父 pipe EOF 不保证 Runner 自行有界退出

- **位置：** `native/huhubot/internal/adapters/inbound/stdio/server.go:195`、`:215`、`:103`–`:118`。
- **风险/证据：** 真实进程在 stdout pipe 写满时，stdin 已关闭仍停留；只有消费 stdout 才退出。反例完全在 T-01 pre-hello 基础错误路径，无未来用例依赖。
- **依据：** T-01 AC-035 确定关闭行为；Spec §11、ARCHITECTURE §13、ADR-022 要求父 pipe EOF/失联独立进入有界收尾；ARCHITECTURE §11.3 慢消费者有界断开。TS Supervisor 能 kill 不替代 Runner 自行检测/收尾合同。
- **满足条件：** 不读 stdout 的真实父管道 EOF 反例在明确预算内退出并释放 DB 锁；所有同步响应分支遵循同一有界关闭机制，同时保留正常 shutdown/半帧 EOF/协议错误结果。

### SPEC-03 — P1：TS 外部 JSON 尚未按公共方法合同校验

- **位置：** `src/modules/huhubot/core/protocol/connection.ts:281`、`:306`–`:347`。
- **风险/证据：** service.status 的 schemaVersion=99、错误 state、数字 revision 被成功交付；合法租约下非法 nested revision、expectedRevision/content 和未知字段传到 Host 且得到 committed。原始请求及实际 callback/result 均在 raw-probes.log。
- **依据：** ARCHITECTURE §11.1 明文“外部 JSON 必须运行时校验，生成类型不是 validator”；§3.2 HAP 路由 schema 校验；Spec §9 decimal/类型/资源合同；T-01 行为步骤 2–3 与 AC-035 hello/schema/类型一致及双端协议边界。未装配未来业务可以拒绝，当前已装配 service/Host 仍必须满足合同。
- **满足条件：** 对当前普通结果、Host invoke/queryReceipt 参数及 Host 回执落实与版本 schema 等价的运行时验证，非法值在可信消费者前失败；负向例覆盖嵌套 decimal、required、未知字段、enum、UTC 时间和错误形状，不只检查帧 envelope。

### SPEC-04 — P2：Go hello 接受公共 schema 明确禁止的键

- **位置：** `native/huhubot/internal/protocol/hap/frame.go:193`–`:198`，`native/huhubot/internal/adapters/inbound/hap/router.go:77`。
- **风险/证据：** `ProtocolVersion/Client/Name/Version` 大写键构成的 hello 既不满足 schema required，又违反 additionalProperties:false，但真实 Runner 返回成功并完成握手。
- **依据：** Spec §9 版本化公共合同与 schema/hello 一致；ARCHITECTURE §3.2 schema 校验、§11.1 外部 JSON 运行时校验；T-01 AC-035。Go 语言标准库的宽松匹配不是本项目 schema 允许的兼容扩展。
- **满足条件：** schema 和 Go router 对同一负向字节给出一致拒绝，错误 hello 不进入 ready；扩充共享方法级负向夹具，不能仅给 Go DTO 再生成一次类型。

## 问题与下一步

Lead 应把 STD/SPEC-01、02、04 交 Go/合同 owner，把 03 交 TS owner，并协调共享 validator 的唯一事实源；四项修复后重新冻结实际工作副本进行补审。原审查报告和反例保留，不覆盖成 pass。本任务 completed 只表示独立审查交回，T-01 仍未通过代码门。

结束时核验冻结源/37 文件/模式/index/基线未漂移，所有本任务子进程已停止；`validate-dispatch --stage return` 结果见本目录原始日志附录。除本任务 REPORT.md/raw-probes.log 外没有工作区写入。
