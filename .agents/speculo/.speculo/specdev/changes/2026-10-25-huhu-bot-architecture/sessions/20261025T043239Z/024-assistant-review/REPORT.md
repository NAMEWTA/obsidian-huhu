# T-02 完整交付与 T-01 共享维护独立双轴审查

Session: 20261025T043239Z
Task: 024-assistant-review
Status: completed

## 聚焦交接

固定输入的标准轴、规范轴均为 request-changes。发现一项 P1：Linux Secret Service 的用户取消提示被实际依赖忽略，生产凭据通道因此将取消注册报告为 available、将取消删除报告为 CREDENTIAL_DELETED，且把错误结果写入 SQLite。两轴分别列出同一事实的工程风险和合同违反，不累计为两项独立缺陷。其他已审接缝未发现新的可证实阻断。

本报告覆盖完整 T-02 交付和真实变化的 T-01 共享底座，不仅复核 029 的 worker 修复。未修改生产或测试源码、未委派、未提交；所有独立探针只使用临时 Profile、合成秘密和隔离 D-Bus。真实用户 keyring、Provider、Obsidian 与其他 OS 现场操作仍由用户后验，其未执行不构成本 finding。

## 产物与验证

### 固定输入与独立性

- 唯一输入为 `evidence/T-02.md#review-input-r1`，JSON.stringify SHA256 `55d6e1f6d1963e68e80e479172dcd4fef110a93a3630dd07fdd4e0a00ce43f8d`。91 个工作副本文件、25 个规范/标准来源；base/HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`，branch `NAMEWTA/bot`。已重算来源全文/锚点、工作副本字节及模式、范围内 index 和基线，未发现冻结输入漂移。
- Reviewer 为 `native:/root/foundation_review`，未参与被审实现。实际任务由 Lead 的工具派遣；模型偏好沿原派遣记录，本报告不自行认证底层模型。作者报告是定位与修复背景，不代替本次独立观察。
- 按 workspace/catalog/runtime 发现、AGENTS、dev 与适用架构/测试/许可/构建参考、code-review 及 source-discovery、working-tree-review、Fowler、risk-review、reviewer-contracts、review-evidence、result-reuse 执行。018 的 20 项来源与当前相同，复用已完整读取的规则；新增 T-02 五锚点完整读取。回读当前 Map、T-01/T-02/T-27 对应范围、Spec/ARCH/ADR、LOG-051，以及 019/020/021/029 完整 REPORT、018/023 双轴。没有以本次结论批准 T-27。
- 对照 018 冻结快照，当前 65 项变化或新增，26 项逐项相同。完整检查 T-02 Application/Domain/ports、SQLite store/catalog/migration、HAP、TS API/AssistantClient、private frame/client/channel、managed transport、worker/supervisor、各 OS adapter 和相关测试；重新检查 CLI/bootstrap、基础 SQLite 与共享 schema/generator 的真实变化。生成物通过唯一生成源和全量字节比较核验，不把生成 JSON 的机械篇幅作为手写逻辑审查。
- 未变的 Profile 身份/硬链接保护、HAP framing/DTO validator、连接有限租约及资源集合上界等，按逐项摘要相同条件复用 018 及其引用的 014 独立证据。发生变化的 CLI、SQLite、router、managed transport、合同输出不直接继承旧 pass。

### 本次实际执行与原始材料

完整命令、探针源、反例输出和最终校验保存在本目录 `raw-probes.log`。可复跑源亦随日志内嵌，不依赖临时目录长期存在。

| 验证 | 实际结果 |
| --- | --- |
| 当前 Go 生产 binary | `GOTOOLCHAIN=go1.26.10 CGO_ENABLED=0 go build -mod=readonly -o /tmp/huhu-assistant-review/huhubot ./cmd/huhubot`，cwd native/huhubot，exit0 |
| Go credentials、assistant、foundation | 同环境 `go test -mod=readonly ./internal/adapters/outbound/credentials ./tests/contract/assistant/... ./tests/contract/foundation/... -count=1`，三包 exit0，8.679s / 15.408s / 11.081s |
| TS 全 Bot 模块 | `pnpm exec vitest run src/modules/huhubot`，exit0，9 文件、64 tests，34.38s |
| schema 与生成源 | 临时副本执行 `generate.mjs`，61 methods、169 method cases；六份生成输出与工作副本逐字节相等。独立 Python validator exit0，122 shapes、3 frame goldens、25 decimal negatives、169 shared cases |
| 独立实际公共客户端 | 生产 AssistantClient + managed transport → 实际 Go/SQLite，临时探针 exit0：默认 Bot 仅一次、重名不同稳定 ID、原输入重放一致、同 key 异输入冲突、两个 CAS 仅一个成功、绑定凭据/引用删除保护、未装配模型拒绝、停用/预检/删除、其他 Bot 保留、旧命令代数拒绝、正文/秘密哨兵不残留 DB/WAL/SHM、重开 session-memory 缺失 |
| 独立 worker 资源边界 | 实际 CLI 单独启动、无 supervisor：半帧、完整帧但 stdin 不 EOF、实际 keyring 已连接隔离 socket 后 D-Bus 鉴权不响应，分别 3.023 / 3.022 / 3.029 秒自行 exit1；stdout/stderr 均 0，不生成 Profile 数据，全部 wait/reap |
| Linux 取消语义 | 生产 TS→Runner→private pipes→实际 worker→实际 go-keyring/godbus→隔离 Secret Service。取消创建和取消删除均复现错误成功回执；补充第二次运行在 status 前直接查询真实 SQLite，确认错误状态已落库。详见两轴 finding |

Linux 取消探针未替换生产 backend：临时复制 Go module 仅用于编译外部 D-Bus 服务模拟器，生产 binary 来自冻结源码；真实依赖完整参与。模拟器只控制 Secret Service 的有效响应/取消信号，用本机独立 dbus-daemon，不接触用户桌面总线。最初日志与补充 catalog 查询的第二次日志都保留。后一次 status 会更新持久状态，因此明确区分 `CATALOG_BEFORE_STATUS` 和核查后的 `PERSISTED_SAFE_STATE`。

### 完整风险覆盖与边界

| 接缝 | 独立判断与证据 |
| --- | --- |
| 身份、配置、原子命令 | 默认创建和 SQLite 事务、稳定 ID、命令输入指纹/范围/TTL、expectedRevision、不可变 Persona/Model revision 与 pin 入口完整回读；当前 Go 合同测试及公共 TS→Go 探针覆盖成功、冲突和重放。未来 Run 的实际装配仍属后续票，当前 pin/admission port 的合同与调用者测试不冒称完整运行引擎交付 |
| 停用、删除与资料 | usage/admission port、删除预检 token/修订、活动引用与 credential guard、删除旧正文/历史回执/受管备份/命令代数路径已检查；suite 真实 SQLite 证明 pinned 引用保护，独立公共探针证明其他 Bot 保留及已删正文哨兵不在 DB 文件族。未装配上下文分类保持明确 unavailable，未虚构零引用 |
| 密钥边界 | 公共 HAP/DTO 不提供 secret；private 匿名 pipe 版本/长度/元数据校验、profile/ref 归属、注册保留与删除 guard、session-memory 复制/清零/退出失效、环境 allowlist、无自动继承 SDK/CLI 凭据均检查。独立实际调用确认调用方字节清零和 session 重启失效；OS 取消语义存在下述 P1 |
| 跨平台实现 | Windows CRT 32/64 表边界、私有句柄复制/释放代码与合成测试；mac security 的输入先验上界、绝对命令/私有 stdin、有限输出、取消 kill/wait 和失败脱敏；Linux/Windows 同步 keyring 的隔离进程模型均回读。本机执行的是 Linux 和合成边界，不把交叉编译/合成测试写成真实 Windows/macOS 通过 |
| 生命周期与资源 | private channel 并发/帧限额/超时/EOF、TS pending/timeout/close、supervisor 有界输出和取消 kill/wait；CLI 在打开 Profile 前分派 worker，独立 3s 硬退出覆盖不能由 context 打断的 read 与实际同步 D-Bus。单独 worker 探针没有 supervisor，不宣称模拟了真实父进程 SIGKILL；它直接验证退出不依赖 supervisor。未知写入/删除保持 unknown，不自动重放的常规分支有 suite 证据，但不能弥补取消被错误归为成功 |
| T-01 共享维护 | 002 迁移注册、先备份后事务、schema1 升级/失败恢复和不兼容保护、坏库/硬链接/WAL/慢 stdout EOF 等由当前 foundation/assistant 套件运行；按摘要复用旧独立持久 WAL 与 alias 两路径证据。有限租约、四普通字段 Unicode 与 wire UTF-8 byte 独立边界保持；schema 仍单源，当前新增 DTO/goldens 实际重生成/验证 |
| 架构与维护性 | Application/Domain 不依赖 SQL/SDK/Obsidian；各入口经相同用例与 ownership ports，TS 服务无平行业务库，模型 probe 未装配时明确拒绝且不发送资料。按 Fowler 检查实际改动，未发现应升级为阻断的重复权威或无根据抽象；没有提出纯风格 finding |

Lead 已报告全量 build/lint、真实 TS→Go 等检查通过；本报告不将其列为 reviewer 自行执行。未新增全仓 build、race/vet 或真实其他 OS/模型/Obsidian 操作；本次通过项的适用范围仅如上所述。真实现场后验按 LOG-051 不阻塞代码门，已复现的取消语义缺陷则属于代码门。

<a id="standards-output"></a>

## standards-output

Reviewer: native:/root/foundation_review
Axis: standards
Result: request-changes
Input-SHA256: 55d6e1f6d1963e68e80e479172dcd4fef110a93a3630dd07fdd4e0a00ce43f8d
Observed: 在冻结 91 文件上审查完整 T-02 与 T-01 真实维护接缝，结合生产调用链、真实 SQLite、独立 worker 和实际 Linux D-Bus 依赖反例重新判断。身份/事务/秘密传输/常规故障与资源回收的已测边界通过，worker 3s 硬退出修复有效；Linux OS adapter 丢失用户取消事实，导致错误成功和错误持久状态，构成一项 P1。无以测试全绿覆盖已知反例的结论。

### STD-01 — P1：Linux keyring 取消创建/删除仍报告并持久化成功

**位置：** `native/huhubot/internal/adapters/outbound/credentials/keyring_linux.go:40`、`:42`、`:48–49`；传播到 `provider.go:171–175`、`:259–263`、`:305–308` 及 registration.Delete 的 FinishDelete。

**触发与根因：** Secret Service 在创建/删除需要提示时发送 `Prompt.Completed(dismissed=true, ...)`。锁定的 go-keyring v0.2.8 在 `secret_service/secret_service.go:176`、`:251` 调用 `handlePrompt` 却丢弃 dismissed；`:211–213` 明确把 true 与 nil error 一起返回。Linux adapter 将 Set/Delete 的 nil error 直接翻译为成功，没有保留提示取消事实。该信号意味着操作取消，属于有效的正常协议结果，并非必须以 D-Bus method error 表达。[Secret Service Prompt 官方规范](https://specifications.freedesktop.org/secret-service/latest/prompts.html)。

**实际反例：** 隔离服务在 create 提示取消且不写入时，生产 TS register 返回 `{mode:"protected",state:"available"}`，status 前真实 SQLite 同样为 available；同 ref status 随即返回 missing/CREDENTIAL_MISSING。另一案例先真实 register 成功，再在 delete 提示取消且保留条目时，生产 TS delete 返回 missing/CREDENTIAL_DELETED，status 前 SQLite 同样记作已删除；同 ref status 随即恢复 available。完整两次输出、服务标记、TS/Go/Python 源见 raw-probes.log，所有子进程均回收。

**影响：** 用户取消保护操作后仍被告知凭据可用或已删除；后者留下仍有效的秘密却显示已清除。错误不只发生在 UI 投影，还经过 worker/private receipt 和 durable catalog。已有单测用显式错误 reason 模拟拒绝，没有覆盖实际依赖以成功返回取消信号的分支。一次后续核查能够纠正状态不等于原回执可以声称成功。

**最小满足条件：** Linux 真实适配路径必须识别并保留创建、删除的取消结果；不得仅以库的 nil error 断言已写入/已删除。已知取消给出安全拒绝/取消状态，效果不能确认时保留 unknown；不自动 fallback、重放或换 ref 绕过。增加通过实际 worker/实际 D-Bus 库的取消创建、取消删除和正常成功对照，核对 private 回执、status 前 catalog 以及存储是否保留；不得只修改期待值掩盖虚假成功。其他 OS、会话内存、归属/引用保护和现有 unknown 语义保持。

<a id="specification-output"></a>

## specification-output

Reviewer: native:/root/foundation_review
Axis: specification
Result: request-changes
Input-SHA256: 55d6e1f6d1963e68e80e479172dcd4fef110a93a3630dd07fdd4e0a00ce43f8d
Observed: 独立对照 T-02 AC-002/003/004/042、T-01 AC-034/035/044/054，Spec 身份/模型/原子合同/数据/生命周期、ARCH §13、ADR-014 和 LOG-051。默认与稳定身份、修订/CAS/pin 接缝、停用删除/引用保护、session-memory 显式模式、未装配模型明确不可用、T-01 schema 与恢复边界在当前范围内满足已验证合同；protected 凭据取消被记为完成，违反真实状态与具体平台适配验证要求，不能批准完整 T-02。没有把未来消费者缺失或用户现场后验变成缺陷。

### SPEC-01 — P1：protected 操作取消被标成完成，违反凭据状态和删除真实性合同

**位置与触发：** `native/huhubot/internal/adapters/outbound/credentials/keyring_linux.go:40–49` 对 Set/Delete nil error 的映射，以及 `provider.go:171–175`、`:259–263` 和 catalog 更新。Linux Secret Service 用 Completed.dismissed=true 通知取消注册/删除时，实际锁定依赖不产生 error，当前实现便返回并落库 available 或 CREDENTIAL_DELETED。该协议分支已通过真实 TS→Runner→worker→go-keyring/godbus 与隔离服务复现；取消创建后 status 为 missing，取消删除后 status 为 available，原始证据见 raw-probes.log。

**合同依据与影响：** T-02 行为/验证要求保护服务失败和取消可诊断、秘密不伪持久成功；AC-042 的明确凭据模式必须表达真实状态。Spec §10 对凭据清除及不能显示清除完成却仍保留有效状态的要求、§11 对保护能力和原生行为的要求适用此边界。ARCH §13 明确具体平台 adapter 的约束必须验证，引用库不构成证明；ADR-014 同样要求平台凭据语义可核验。取消删除后仍有原秘密却得到 CREDENTIAL_DELETED，取消创建无条目却得到 available，均是当前代码的合同违反，不是尚未执行真实用户 OS 验收的泛化风险。

**最小满足条件：** 在当前实际 Linux provider 路径恢复取消的可观测语义，使安全回执与持久 catalog 不声称未完成的注册/删除已成功；可确认取消必须明确失败/拒绝，无法确认外部效果则保留 unknown 并允许同 ref 核查，不自动重放或换模式。实际 D-Bus/worker 对照需同时证明取消创建未伪可用、取消删除未伪清除、正常路径仍成功；保持 API 无 secret、session-memory 显式选择和跨 Profile/共享引用保护。修复后按新输入重新独立判断，不能凭单个替身测试或全套绿直接消除此项。

## 问题与下一步

本轮仅一项已证实 P1，已向 Lead 真实工具消息交接。Lead 应交原 owner 修复上述两种取消分支，再冻结新输入复审；不得把 024 的 request-changes 覆盖为通过或提前批准 T-02 依赖门。018 旧通过只按摘要相同条件保留，不批准新增凭据逻辑。T-27 资产发布范围由 Lead 协调，本报告不修改其状态。

最终固定输入、return 结构校验和本任务子进程确认记录在 raw-probes.log；该结构校验不替代独立结论。全部探针已 wait/reap、临时 Profile 已清理，结束后停止写入并交回 Lead。只写本任务 REPORT 和原始日志，没有任何生产修复。
