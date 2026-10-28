# T-01/T-02 Linux 凭据结果修复后独立双轴复审

Session: 20261025T043239Z
Task: 033-assistant-rereview
Status: completed

## 聚焦交接

本次固定输入的 standards、specification 均为 pass，无新增 finding。024 唯一 P1 经相同取消输入的独立生产 TS→Runner→worker→实际 godbus→受控 Secret Service 复核满足最小条件：取消创建和删除均返回并持久化 failed/PROTECTION_DENIED，正常路径仍成功，不确定效果仍 unknown，同 ref 可核查。024 原 request-changes 和原始失败材料不覆盖。

本次结论覆盖冻结的完整 T-01 维护与 T-02 候选；90 个未变文件及25个未变来源按逐项摘要复用024有效观察，3个变化文件及影响闭包重新审查。仅写本任务报告/原始日志，无生产或测试修改、无委派、无提交。T-27工程接纳、真实模型/用户OS/Obsidian现场不由本报告认证。

## 产物与验证

### 输入、来源与独立性

- 唯一输入 `evidence/T-02.md#review-input-r2`，JSON.stringify SHA256 `886b568a11a1cbe8209412e02b1ee00bcf09b68cdbc2dc5c50f0c8a75b21387b`，93文件/25来源。工作区 `NAMEWTA/bot`，base/HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`。重新核对工作副本字节/模式、范围内index、基线及全部来源全文/锚点摘要，均一致。
- 相对024恰为 `keyring_linux.go`、新增 `secret_service_linux.go`、新增 `credentials_dbus_linux_test.go` 三项变化，另外90项及25来源完全相同。完整读取三文件、024两轴/原始日志与032最终REPORT；032 REPORT 实际SHA `9c5dc278e36df39308fa99d91f13785a472ec927a913265b92bf96e825394985`，与派遣一致。旧019/020/021/029和018/023回读记录按未变输入复用。
- Reviewer `native:/root/foundation_review` 未参与实现，身份由Lead真实派遣；沿原模型偏好，不自行认证底层模型。沿已读AGENTS发现、Map8/Goal7、dev及架构/测试/许可/构建参考、code-review/Fowler/risk/contracts/working-tree/review-evidence/result-reuse、T-01/T-02/T-27相应范围、Spec/ARCH/ADR/LOG-051执行。标准轴和规范轴分别判断，没有把作者测试作为独立结论。

### 隔离修正和历史证据界限

032 已确认早期默认 `dbus-daemon --session` 配置曾尝试激活宿主 Secret Service，是否读取宿主元数据未知。024也使用过默认session配置，所以024关于隔离的概括不能用来保证历史运行绝未触及宿主；本报告保留这一限制，不修改旧日志、不据新结果倒推历史无副作用。未访问或终止现存keyring进程。

本轮独立探针全用显式XML配置，只有唯一临时Unix socket和EXTERNAL认证/消息策略，没有 service目录、standard_session_servicedirs、servicehelper或include。bus及独立探针使用临时HOME/XDG；实际Node binary为绝对路径，避免工具wrapper回读用户配置。每场景在fake服务注册前和结束后检查 ListActivatableNames 仅有 org.freedesktop.DBus，离线Secret Service调用必须 ServiceUnknown；断线场景也重复检查。所有场景daemon children为空、stderr为空，fake/bus/client均Wait，无自动激活子进程。实际服务只保存布尔状态/计数，不保存合成secret。此证据证明本轮边界，不代替真实用户OS保护现场。

### 本次独立执行

完整命令、源文件及原始输出存于本目录 `raw-probes.log`。

| 验证 | 结果 |
| --- | --- |
| 生产binary | cwd native/huhubot，`GOTOOLCHAIN=go1.26.10 CGO_ENABLED=0 go build -mod=readonly -o /tmp/huhu-assistant-rereview/huhubot ./cmd/huhubot`，exit0 |
| 实际生产TS | esbuild打包当前managed.ts，未经替换的private client/Runner/provider/worker全部参与，exit0 |
| 独立外部服务探针 | `python /tmp/huhu-assistant-rereview/probe.py`，最终exit0，14场景、71个Popen子进程全部Wait；每场景验证private回执、Status前真实SQLite、服务实际条目、同ref Status、单一catalog/操作计数、调用方清零、Profile文件及输出无合成secret |
| 当前永久E2E及worker | `go test -mod=readonly -v ./tests/contract/assistant -run 'TestCredentialActualSecretServiceOutcomes\|TestCredentialWorkerExitsWithoutParentSupervisor' -count=1`，实际命令正则使用普通 `|`，exit0，14.109s；12个D-Bus场景及无supervisor半帧/无EOF两项通过 |
| 当前provider资源/故障回归 | 同环境 `go test -mod=readonly ./internal/adapters/outbound/credentials -count=1`，exit0；覆盖private channel、CRT表、supervisor取消/回收、失败脱敏、session-memory及引用保护 |
| 独立无supervisor worker | 当前CLI直接启动：半帧3.021s、完整帧不EOF3.022s自行exit1且stdout/stderr空；实际D-Bus鉴权在唯一隔离socket阻塞，2.025s自行exit0、stdout恰8字节安全OPERATION_TIMEOUT帧、stderr空。三进程全部Wait，无Profile数据 |

探针初次两次未到产品调用即失败：先假定 `/usr/bin/node` 存在，后用了依赖HOME配置的 `/home/wta/.local/bin/node` wrapper。只修正临时探针为实际Node绝对路径，临时bus/fake均已回收，原脚本/输出保留。另原worker探针沿024精确断言鉴权阻塞也应3s exit1，被新实现更早返回安全超时帧打破；回读WithContext和原始输出后，改为验证2s安全帧及3s兜底各自合同。原失败亦保留，这些不是产品缺陷，没有修改生产实现或把产品失败改成通过。

### 原P1及修复影响闭包的实际结果

以下均来自reviewer自建外部服务及真实生产链；表中catalog是在Status前读取，stored由外部服务实际内存条目确定。每场景mode始终protected、catalog仅一条、deleting=0，create/delete计数证明没有自动重放/改ref或fallback。正常控制项先register available再delete。

| 场景 | 操作回执及Status前catalog | 实际stored | 同ref Status |
| --- | --- | --- | --- |
| 原cancel-create（仍20ms异步Completed=true） | failed / PROTECTION_DENIED | false | missing |
| 原cancel-delete（仍20ms异步Completed=true） | failed / PROTECTION_DENIED | true | available |
| success | missing / CREDENTIAL_DELETED | false | missing |
| prompt-success（信号先于Prompt方法返回） | missing / CREDENTIAL_DELETED | false | missing |
| unlock-cancel | failed / PROTECTION_DENIED，Creates=0 | false | failed |
| unlock-success（同步完成信号） | missing / CREDENTIAL_DELETED | false | missing |
| spoof-cancel（错误path和另一unique sender先发伪成功） | failed / PROTECTION_DENIED | false | missing |
| malformed-create（已写入但返回无效item路径） | unknown / PROVIDER_FAILED | true | available |
| malformed-prompt（已写入但成功信号结果类型错误） | unknown / PROVIDER_FAILED | true | available |
| unknown-create（已写入但不返回） | unknown / OPERATION_TIMEOUT | true | available |
| unknown-delete（已删除但不返回） | unknown / OPERATION_TIMEOUT | false | missing |
| disconnect-create（已写入后服务断线） | unknown / OPERATION_TIMEOUT | true | failed，离线不能自动激活替代服务 |
| alias-success（无login枚举，ReadAlias分支） | missing / CREDENTIAL_DELETED | false | missing |
| empty-alias | failed / PROTECTION_UNAVAILABLE，Creates=0 | false | failed |

新生产 `secret_service_linux.go:107–118` 和 `:136–144` 将create/delete交由同一prompt解析；`:252–253` 保留dismissed，`keyring_linux.go:44–45` 转PROTECTION_DENIED。原024两种错误成功及错误持久状态在同一输入下均消除。`:181–206` 的Unlock在取消或未解锁时阻止后续效果；`:215–227` 先订阅后调用Prompt，`:238–255` 验证unique sender/path/name及body类型，避免漏同步信号或接受伪完成。

session/match的清理有50ms时限，连接独占且defer Close；读取secret验证session/parameters/长度，错误清零后通过固定reason传播。未知写入/删除不误报“未发生”，独立已提交效果探针同时覆盖create/delete；外层provider/catalog保持未变语义。新的WithContext让实际D-Bus鉴权提前取消，CLI3s硬退出仍覆盖不能取消的stdin读。没有依赖父supervisor代替worker自身兜底。

方法签名、取消含义和操作特定结果分别与官方 [Prompt](https://specifications.freedesktop.org/secret-service/latest/org.freedesktop.Secret.Prompt.html)、[Service](https://specifications.freedesktop.org/secret-service/latest/org.freedesktop.Secret.Service.html)、[Collection](https://specifications.freedesktop.org/secret-service/latest/org.freedesktop.Secret.Collection.html)、[Item](https://specifications.freedesktop.org/secret-service/latest/org.freedesktop.Secret.Item.html) 核对。新代码是现有adapter内部的窄协议实现；没有新增模块/锁文件，按来源声明及代码比较未见复制旧go-keyring实现。实际读取已锁godbus v5.2.2 LICENSE，为BSD-2-Clause；Windows仍用既有go-keyring/wincred，不能因Linux移除import擅删跨平台notice。正式许可union/根工程产物归T-27另审，本报告不越权批准。

### 完整候选的复用观察

逐项摘要确认后保留024对默认一次/稳定ID/重名、原子命令输入/CAS/重放/修订pin、停用/usage/删除预检/旧代数、正文清除与其他Bot保护、模型未装配明确拒绝且不发资料、Application/Domain隔离的独立判断。SQLite migration/备份/坏库/不兼容恢复、Profile实际身份锁/WAL硬链接保护、stdio背压EOF、唯一schema/六份生成物、双向DTO、finite租约和Unicode/wire字节边界均未变，不机械重跑这些无关探针。

private frame/TS pending/权限与Profile-ref归属、session-memory显式选择/清零/退出失效、Windows CRT/句柄和mac security边界也未变；provider回归重新执行其当前suite，实际Linux链路检查错误/输出/DB无secret及进程回收。本轮没有重新执行全仓build/lint、TS64全套、全Go foundation/assistant、race/vet或五目标实机；旧024有效证据和032/Lead另有回执分别保留，不冒称reviewer新跑。真实模型、Obsidian、用户OS/keyring现场按LOG-051由用户后验，不构成本次代码门阻塞。

<a id="standards-output"></a>

## standards-output

Reviewer: native:/root/foundation_review
Axis: standards
Result: pass
Input-SHA256: 886b568a11a1cbe8209412e02b1ee00bcf09b68cdbc2dc5c50f0c8a75b21387b
Observed: 对冻结93文件按3项真实变化/90项未变及25来源一致重新判断。Linux窄协议client恢复了取消事实，正常成功、Unlock、同步/伪信号、结果类型失败、效果已发生但回执未知均由实际生产链核验；Status前持久状态和实际item一致，没有自动重放/降级。独立进程与真实D-Bus阻塞证明有限结束、固定安全输出和Wait；测试环境显式禁止激活且自行检查。结合024未变完整范围观察，未发现新的正确性、权限、秘密、并发、恢复、资源或Fowler维护性阻断。

Findings: 无。024 STD-01 的原最小满足条件已满足；旧request-changes保留为历史输入结论。此pass只针对固定T-01/T-02代码候选，不代替T-27工程或用户真实环境验收。

<a id="specification-output"></a>

## specification-output

Reviewer: native:/root/foundation_review
Axis: specification
Result: pass
Input-SHA256: 886b568a11a1cbe8209412e02b1ee00bcf09b68cdbc2dc5c50f0c8a75b21387b
Observed: 独立对照T-02 AC-002/003/004/042、T-01 AC-034/035/044/054、Spec身份/模型/原子操作/数据/生命周期、ARCH §13、ADR-014和LOG-051。原取消注册/删除现在可诊断且未伪可用/伪清除；不确定效果保留unknown，同ref核查不自动重试或改保护模式，符合具体平台adapter需实证的要求。仅Linux适配和对应测试变化，身份/修订/删除保护、session-memory及T-01维护合同按未变摘要保留024观察；真实worker兜底仍有限，不把2s安全完成误判为必须3s强退。没有把用户OS现场或未来未装配消费者视为当前缺陷。

Findings: 无。024 SPEC-01 的最小条件在本次实际调用链/Status前SQLite/服务条目三方证据中满足。规范轴独立于标准轴；不把本次pass写成整个change或所有目标OS已验收。

## 问题与下一步

无剩余可证实代码阻断。Lead可回读两轴和raw-probes.log后汇入T-02代码证据并结合自身工程整合决定依赖门；不改写024旧失败，不由reviewer关闭Ticket或批准发布。历史默认session配置的激活限制保持公开，不作无依据的“全部历史未触宿主”声明。

交回前再次核验固定输入一致、确认本任务全部probe已Wait且无活动writer，return结构校验exit0；真实工具输出附raw-probes.log。仅本任务REPORT/日志发生写入，随后停止写入并释放槽位。
