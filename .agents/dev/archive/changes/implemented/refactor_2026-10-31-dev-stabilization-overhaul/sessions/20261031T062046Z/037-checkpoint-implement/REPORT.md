# 任务回报

Session: 20261031T062046Z
Task: 037-checkpoint-implement
Status: completed

## 聚焦交接

T05 本地实现与 Windows 可审查候选完成，20 项候选（19 个文件加摘要清单）停写交独立审查和 Lead。**不是 T05 done**：AC-284 Windows runner 尚未运行；Lead-owned 全 Go/bench 尚待本候选最终验收。未更改 Ticket/Evidence/Map、T04 core、purge 生产、T09 八项历史数据、TS/wire、其他工作流；未提交、推送或调用远程 CI。

最小计划已先发 Lead，随后按 Map19/D01 实施。Lead 明确接受 Store 寿命内的内存清除债务、不新增持久化表，且失败仍继续 sync/close；已按该决定落实。使用 dev skill，复用 027 已读研究合同与官方来源，本轮再次核对 testing、正式 TASK/Ticket 与实际调用方。

## 产物与验证

### 生产机制与真实边界

- `base/maintenance.go`：每 Store 一个 owner goroutine，wake 容量 1，唯一 timer 100ms 重试，共用 MaxOpenConns(1)；固定 32 个在途/等待准入名额，超额直接拒绝。busy 时通知不能绕开 timer；不动态增大水位。
- `WithinTx`、`WithinDurableTx` 和 portable 的 `BeginForPrincipal`、`BeginImport` 统一持有 `Transaction` lease。成功 COMMIT 后只登记必要 erasure generation、恢复 NORMAL、释放连接、合并唤醒；维护不改变成功结果、不重跑 work。FULL 设置/还连接前 NORMAL 恢复/恢复失败 ErrBadConn 沿用，六屏障 AST 与真实状态测试通过。
- 得到唯一连接后检查真实 WAL 4,096,000 字节软高水位；达到后释放连接再等待 owner，不能饿死维护。单个已准入事务能越界；其后连续普通/FULL 请求在 work 前阻挡且真实 WAL 大小不再增加。没有固定字节硬上限/VFS wrapper。reader 永不释放会降低可用性并阻塞需要最终写入的停止，这是 D01 的明确边界。
- `EraseWAL` 登记独立 generation 并等待一次实际尝试/清除完成；caller 取消只结束观察。TRUNCATE 必须 busy/frames/checkpointed 全零，仍返回 retryable cleanup-pending。普通成功仅完成 checkpoint 开始时捕获的 generation，不能吞掉其后的新债务。
- assistant `agents.delete` 原入口先删除目标 agent 关联配置/receipt，保留 tombstone、增加 epoch，再执行忽略返回值的 best-effort TRUNCATE。本次把该入口切到 `WithinErasingTx`，在提交仍被 Store active 生命周期覆盖时登记义务，消除提交后 Close 抢先收尾的空窗；失败在 `MaintenanceStatus` 可见、持续重试。实际删除范围仍是原 SQL 所删行，不是所有私密信息。没有跨进程债务标记；崩溃后重开不恢复这份内存义务，原 best-effort 的跨崩溃边界不能冒称已解决。purge 自身持久 cleanup-pending 机制保持，相关真实回归通过。
- Close once 封准入并唤醒等待者，join 在途，再停 timer/join worker，必要时最终 TRUNCATE；无论该步骤或 sync 失败都继续真实 WAL sync/db.Close，join 错误并供重复 Close 返回。Core 停 producer 时维护继续服务；新增真实 Core 测试证明 pinned reader 下 observer 到期不释放 Profile，reader 释放后最终写入/停止完成。

### 测量程序及安全触发

新增 opt-in `storage_measurement_test.go`：18 项串行模式/阈值/reader 矩阵，真实 SQLite 原语与生产 opener/driver，32×24×8KiB 受限负载，每四笔 FULL；WALHook 只读记录实际页数。显式记录 admission、conn、begin、work、commit、FULL 设置/恢复、checkpoint、Close sync/total；嵌套区间不相加。生产调度器另由机制测试验证，矩阵不是其端到端吞吐。Windows allocation 使用既有 x/sys + FILE_STANDARD_INFO，Linux/macOS 使用 stat blocks，错误不伪装成 0 或逻辑长度。

恢复 fixture 只 Kill 自己直接启动的测试子进程并 Wait，子进程提交 64 行后 ready；父进程重新 Open/读取验证。它证明进程崩溃重放，不证明断电 NORMAL 无丢失。退出/清理归属在父进程，20s ready/60s child/180s 整体上限，不杀无关进程。

新 workflow 只有 `workflow_dispatch` 和精确临时分支 `codex/dev-overhaul-storage-validation` push；一台 windows-latest，Go1.26.10/GOWORK=off，contents:read、固定 github.sha、无持久凭据、20min、artifact 14 天。沿 T12 035 已核实首次默认分支注册限制准备此分支，不改其他 workflow。远程操作仍需 Lead 针对实际提交 SHA/精确分支/该 workflow/artifact/清理范围取得授权。本轮没有 push/dispatch。

### 实际命令与结果

Go 命令 cwd 均为 `native/huhubot`，统一 `GOTOOLCHAIN=go1.26.10 GOWORK=off`。

1. `go test ./internal/adapters/outbound/sqlite/base ./internal/adapters/outbound/sqlite/portable ./internal/adapters/outbound/sqlite/assistant -count=1 -timeout=90s`，0；初轮 base 0.544s，两个消费者当时尚未新增窄测试。新窄测试后同三包 `-timeout=45s`，0（0.683/0.226/0.298s）。不把首轮无测试冒充消费者验证。
2. `go test ./internal/adapters/outbound/sqlite/base ./internal/adapters/outbound/sqlite/portable ./internal/adapters/outbound/sqlite/assistant ./internal/adapters/outbound/sqlite/purge ./internal/bootstrap ./tests/contract/foundation -count=1 -timeout=120s`，0：0.785/0.368/0.320/0.136/5.057/14.436s。
3. `go test -race ./internal/adapters/outbound/sqlite/base ./internal/adapters/outbound/sqlite/portable ./internal/adapters/outbound/sqlite/assistant -count=1 -timeout=90s`，0：5.486/2.014/1.943s。随后新增取消 EraseWAL 观察者测试，再定向 base race 同参数，0，6.283s；生产未在上述六包通过后再改动。
4. `HUHUBOT_STORAGE_MEASURE=/home/wta/projects/obsidian-huhu/docs/e2e/dev-overhaul/storage/linux-candidate-matrix.json go test ./internal/adapters/outbound/sqlite/base -run '^TestStorageCandidateMatrix$' -count=1 -timeout=180s -v`，初版0（4.960s）；补 OS allocation 字段后最终0（5.218s），完整结果/原始 log 固定于本目录。18项全部通过，恢复64行，RecoveryNS=3,841,223。最终运行末段与 Node architecture/tooling 小型校验有本机负载重叠，未并行另一 Go 重测；只用于程序可用性，不据此选择性能赢家。
5. `GOOS=windows GOARCH=amd64 go test -c -o /tmp/huhu-storage-base-windows.test.exe ./internal/adapters/outbound/sqlite/base`，最终0；是交叉编译，不是 Windows I/O 实测。
6. 根目录 `pnpm test:huhu-bot-architecture`，0，77 生产文件；`pnpm test:huhu-bot-tooling`，0，24 测试；`pnpm test:docs`，0，1703 Markdown/2134 local links（外链 fetch 未请求）；`git diff --check` 定向候选，0。
7. Node `yaml` 解析并 assert 仅 push/workflow_dispatch、唯一专用分支、contents:read、windows-latest、20min，0。初次 Python YAML 验证因没有 PyYAML 失败，改用仓库既有 yaml，不安装依赖。

真实机制断言包括：checkpoint hook 受控 held 时 COMMIT 已返回；500 次通知只占一个 wake；Close 未提前 sync/结束；维护 I/O + sync 双失败仍关闭 DB且保留两错误；32 名额上限；取消 EraseWAL observer 不消灭 owner；5MB 单笔后普通/FULL连续请求不入 work且文件不增；portable 两入口阻挡/拒绝后归还 lease；assistant pinned canary、逻辑删除、释放后实际 DB/WAL canary 消失；Core lock 直到最终维护和写入完成。

没有把新测试在旧生产代码上跑出行为红灯：旧同步 post-COMMIT checkpoint/增长 backoff 是只读代码基线，新回归直接验证相反机制。开发中实际失败另如实记录：一次从 module cwd 使用仓库相对路径编辑脚本导致 FileNotFound，继而新增 AllocationError 尚未声明导致矩阵编译失败；修正 cwd/字段后最终矩阵通过。一次只读 rg 使用错误相对路径无匹配；以上不是产品测试失败，也未隐藏为绿灯。未为制造红灯回滚/改写冻结生产历史。

### 来源与许可证

复用 027 的 SQLite 官方 WAL/checkpoint/journal_size_limit 与 ncruces v0.35.6 MIT API 调研；具体链接保留在实现及存储 README。新增 Windows 分配查询实际查阅 Microsoft FILE_STANDARD_INFO 与 GetFileInformationByHandleEx 官方定义（文档2024-02-22），使用既有 x/sys binding，无复制第三方实现、无新依赖。初次猜测 fileapi URL 返回404，随后从官方结构页真实链接打开 winbase 正确地址并在使用处保留。本轮 dev/testing 选择避免无关 TS 构建，Lead 拥有最终全 Go 与 bench 验收。

### 精确固定输入

`docs/e2e/dev-overhaul/storage/candidate-inputs.json` 列出19项逐文件 SHA-256；清单本身 SHA-256：`cae8037ab852a7baeec07ef201ad8a13be0690be791d8ff915ac939c7ed5293b`。与清单合计20项候选；本 REPORT 不纳入其自身摘要。base/HEAD 为 `86c500556db1d64865c4cc7f1aff1dd83de071fa`。

关键生产摘要：

- base/store.go：`90e6347ae8776016a69b26cf25b0e471cd4bfb6070336350ccce5bdbb3e9de4b`
- base/maintenance.go：`60a9b1da249acbeaf445f8e20f990e56a61042c0e258bf4d0af4af698357149d`
- base/erasure.go：`ef8624bf0a51e535fbaf5e38ee3b6cddcba64c7c35223e6f9a2dd1c2989fd384`
- portable/store.go：`683a5a0033b607c39bb40c81a4f7d70a975f13598ea88412316b1d12f07a3551`
- assistant/store.go：`38d5ed8e191edd3956c45733a8b8bd57490df7ee8f0839a7eb66f511e44dabec`

## 问题与下一步

候选停写交独立双轴 review；Lead 再执行正式全 Go/bench，不能把本轮定向与原语矩阵代替最终 E2E。Windows AC-284 仍待实际授权/运行/检查 artifact；当前4MiB/TRUNCATE不声称是Windows优化后的最优值。内存 assistant 清除债务的跨崩溃限制、永久 reader 可用性边界、已准入单事务越软阈值全部保留，未用文案抹掉。
