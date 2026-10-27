# 凭证 worker 独立退出时限修复候选

Session: 20261025T043239Z
Task: 029-credential-worker-repair
Status: completed

## 聚焦交接

029 精确回归测试已完成并再次停写；019 已在原 owner 窗口仅修改 CLI 内部 worker 分支，当前候选通过实际红→绿及受影响回归、race、vet。所有本任务实际 worker/Runner/probe 均已 Wait/退出，测试 pipe 与临时 binary 已清理。本 completed 只表示交回代码候选，正式状态与独立审查仍归 Lead。

唯一工作区 `/home/wta/orca/workspaces/obsidian-huhu/bot`，branch `NAMEWTA/bot`，HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`。029 仅修改 `native/huhubot/tests/contract/assistant/credentials_cli_test.go` 并写本任务报告/日志；没有写生产 CLI、凭证生产代码、API、schema、locks、TS、构建或正式 Evidence，没有派遣/提交/推送/发布。旧020 REPORT 保留原字节，SHA-256 仍为 `04e8aa3344c3324ab59c56bd549313f57aa96bf1b46fa66ab3a4f7feb891fc6b`。

## 产物与验证

### 缺口、边界和修复

旧 `RunWorker` 的 2 秒 context 不能打断普通 `io.Reader` 或 Linux/Windows 同步 keyring。在主 Runner/supervisor 存活时，外层 2.5 秒 kill+wait 能回收；主 Runner 强制退出后，独立 worker 没有自行终止的硬保证。019 最早的实际 probe 已回读：[08-worker-deadline-probe-red.log](../019-assistant-implementation/evidence/08-worker-deadline-probe-red.log)，半帧 stdin 保持打开 3.4 秒后仍存活，随后 kill/Wait，stdout/stderr 为0。

029 新测试 `TestCredentialWorkerExitsWithoutParentSupervisor` 从实际产品 binary、精确 `--credential-worker=stdio-v1` 进入，不创建 Provider Supervisor。两条输入分别是 1 字节半帧、完整合法 register 帧但 stdin 始终不 EOF；后者携固定哨兵 secret，但都停在 OS backend 之前，所以不会访问真实 keyring。测试有 4 秒行为上限、6 秒兜底 context，并对所有分支取消/关闭/Wait，断言自动 exit 1、没有输出、没有 Profile/DB/运行目录副作用。

019 在 `cmd/huhubot/main.go` 独占修改：内部 worker 分支创建 3 秒 context，使用 `context.AfterFunc` 做固定 `os.Exit(1)` 硬退出；正常返回先停止 watchdog，再 cancel。此分支没有打开 Profile/DB，避免独立 worker 因无 context 的 I/O 或 OS 调用无限存活。不改变 provider/wire/API/namespace 或秘密传输；外层2.5秒supervisor与未知结果合同保留。

### 实际红→绿

1. 生产修复前运行 `go test -mod=readonly -v ./tests/contract/assistant -run 'TestCredentialWorkerExitsWithoutParentSupervisor/partial-frame' -count=1`，exit 1。实际 worker 超过4秒仍未退出，目标断言失败；`elapsed=4.002042662s, forced-by-test=true, waited=true, stdout=0 stderr=0`，测试取消后已 Wait。[原始红灯](logs/01-independent-worker-red.log)。此失败来自缺失独立终止行为，不是编译或 fixture setup。
2. 将该红灯原生回告019后，019才修改唯一 CLI 分支。测试和输入未改，运行 `go test -mod=readonly -v ./tests/contract/assistant -run TestCredentialWorkerExitsWithoutParentSupervisor -count=1`，exit 0。半帧 `3.008036028s`、完整帧不EOF `3.009658084s` 自行退出；两者 `forced-by-test=false, waited=true, stdout=0 stderr=0`，无 Profile/DB 副作用。[原始绿灯](logs/02-independent-worker-green.log)。
3. 未删除/跳过/放宽行为断言。两个子用例在最终受影响回归中再次通过（约3.01秒），其余已冻结用例保持。

### 最终受影响检查

以下 cwd 均为 `native/huhubot/`，Go1.26.10，实际 Linux/amd64，命令真实 exit 0：

| 命令 | 结果 | 原始日志 |
| --- | --- | --- |
| `go test -mod=readonly -v ./internal/adapters/outbound/credentials ./tests/contract/assistant -run 'TestCredential\|TestSupervisor\|TestProtected\|TestPrivate\|TestSecurity\|TestWorker\|TestDirect\|TestSession\|TestClosed\|TestLinux\|TestLibuv' -count=1` | credentials 8.325s；assistant CLI 11.473s | [03-affected-regression.log](logs/03-affected-regression.log) |
| 上述命令去 `-v`、加 `-race` | credentials 16.148s；assistant CLI 12.399s | [04-affected-race.log](logs/04-affected-race.log) |
| `go vet -mod=readonly ./cmd/huhubot ./internal/adapters/outbound/credentials ./tests/contract/assistant` | 无诊断 | [05-affected-vet.log](logs/05-affected-vet.log) |

回归实际保留正常受控 worker Register/Resolve/Delete、无 HAP 取秘密、argv/env 隔离、已就绪阻塞 worker 的取消/deadline kill+Wait、崩溃/回执丢失 unknown、同 ref Status reconciliation、真实引用删除阻挡、内存清理/重开失效，以及 private frame/EOF/半帧/慢消费者/8在途关闭和实际 Runner 退出。OS边界使用既有隔离可执行程序替身，不把纯 callback 通过当作进程终止证据。

CLI 五目标交叉编译由019负责，本任务没有重复编译或把旧020的修复前 crossbuild冒充本次结果；由 Lead 回读019的新结果。TS/HAP字节合同没有变化，未重复全插件 build 或无关界面验收。

### 冻结摘要与规则

[affected-input.sha256](logs/affected-input.sha256) 逐项固定测试、CLI、worker、worker测试、go.mod/sum、旧020报告与本TASK，manifest SHA-256 `e4a9bd0b50e55fd82b979afb05919f8835aefe046a48b507008844eabc1b9a2f`。

- 本次唯一修改测试 SHA-256：`d1899ff4260a0286803e31f980745e8d6143d2cd4d32fa0eb007e7dfed931404`。
- 019 修复后 main.go SHA-256：`7e141fcc3662257193f402f1a25af7353cdef3e3692b08266c9731b554f7d28f`。
- worker.go 未改：`4715d95e8a60434a3d2adcf4221af40b0eda32857d5a21e71aeade929338a0a8`。

完整回读029 TASK、旧020 REPORT、当前 CLI/worker，复用 Map8/Goal7、I 和 dev/architecture/testing/licensing 的未变化规则。按真实 CLI seam先红后绿，立即登记资源清理并实际等待进程结束；未改变公共合同或其他 owner 路径。真实来源与旧失败保持原字节，没有覆盖旧报告制造通过。

## 问题与下一步

本任务没有残留失败、后台 probe 或活动 writer。029 测试及019 CLI再次冻结，交 Lead 合并进新的联合固定审查输入；020旧候选中不具备独立 hard timeout 的生命周期证据由本修复补充，旧报告保留历史。

真实 Linux Secret Service、Windows CredMan、macOS Keychain 的现场保护、实际 Electron/libuv/Windows管道及模型/Obsidian操作仍为 user-owned / not-run。本次实际 Linux CLI进程退出证据不冒充其他OS现场，也没有读取真实OS凭证。新代码跨目标编译和正式独立审查仍由原 owner/Lead 回收，不由029自认证。
