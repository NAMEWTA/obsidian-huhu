# T-01 Go 底座审查修复回执

Session: 20261025T043239Z
Task: 011-foundation-go-repair
Status: completed

## 聚焦交接

STD/SPEC-01、02、04 已按原反例建立真实红灯回归，并完成对应 Go 修复和代码层验证。`completed` 只表示本派遣候选交回，T-01 仍需 Lead 独立补审；008 原报告与原始反例未改写。Go/contracts 源码现已冻结，T-27 正基于新运行依赖与源码重算 notices/资产。STD/SPEC-03 由 foundation_client 的012负责；本分片提供同一 schema 与共享159方法样本，不代替其回执。

## 产物与验证

作者为原 `/root/foundation_go` 的续执行；Lead 回传原派遣为 gpt-6.1-sol/xhigh，本工具未独立认证底层模型。工作区/基线沿用 TASK，无再派遣、Git提交、推送、发布。只写获准 Go/native、contracts 与本任务回执日志，未写 TS、根工程资产、正式状态或 Evidence。

### STD/SPEC-01：硬链接与 WAL 事实

根因是 flock 只统一主 DB inode，SQLite 的 WAL/SHM 仍依赖文件路径；hardlink alias 可以在崩溃后跳过原路径已提交 WAL，读回旧页。依据 [SQLite 官方损坏机制说明](https://www.sqlite.org/howtocorrupt.html)，实现选择 TASK/Lead 允许的安全拒绝路径，不猜测 canonical hardlink、不删除或复制 sidecar。

`runtime/profile` 在拿到实际身份锁、解析symlink和验证私有权限之后、进入 SQLite 之前，检查DB link count必须为1。Linux/macOS查fd stat.Nlink，Windows查NumberOfLinks；多链接稳定返回 CAPABILITY_DENIED / PROFILE_DB_HARDLINK_UNSAFE。存活期第二写者仍先在inode锁返回 INSTANCE_CONFLICT；正常symlink解析到同一真实路径与sidecars。TS owner已获此精确 startup reason 接缝通知。

新 `TestCrashWALHardlinkCannotReadStaleState` 实际执行：独立子进程用真实SQLite提交revision=2并保持WAL连接→创建一次性alias→SIGKILL→回读非空DB/WAL/SHM→alias及原路径都在SQLite之前拒绝→逐字节确认三文件不变→只移除合成alias hardlink（不动sidecar）→原路径重开仍revision=2。旧存活期原路径/symlink/hardlink双进程竞争测试保留；其释放后重开步骤先解除合成alias，符合新安全策略，不以接受旧revision改变期望。

### STD/SPEC-02：stdout 背压与 EOF

根因是hello/pre-hello/资源拒绝直接同步写stdout，输出管道满时主循环和reader的frames交付互相等待，EOF没有入口。所有输出现在经同一个writer：active+queued最多32帧、累计最多2×(1MiB+4)=2,097,160B，单次排队与写完成总等待1s，超限/超时关闭连接。单一物理writer避免并发字节交错；等待者同时监听closed，响应分支、反向请求和协议错误共用此机制。

继承的非pollable OS fd连Close也可能在活动syscall后等待，关闭路径先发布closed，再异步关闭kernel handles，不使生命周期等被阻塞的stdout；Runner进程退出最终释放句柄，普通pollable测试连接即时结束。应用worker等待会因closed/context撤销终结，不依赖父进程kill才能释放DB。

新 `TestRealStdoutBackpressureEOFReleasesProfile` 复用原900个合法pre-hello请求，真实Runner的stdout全程不读，父stdin写入后关闭；Runner在3s预算内自行退出，再用真实bootstrap成功重开同Profile证明锁释放。测试仅在失败清理时kill；绿色路径不调用kill、不以drain stdout解锁。原真实父stdin保持打开的shutdown、半帧EOF、脱敏错误、双向Host关联也全部继续通过。

### STD/SPEC-04：精确运行时 schema

新增 `protocol/hap/schema.go`，采用 [santhosh-tekuri/jsonschema/v6 v6.0.3](https://github.com/santhosh-tekuri/jsonschema/tree/b0fc661f4939578bc429f408c18202573dbafcc4)，Apache-2.0，2026-06-28模块元数据；固定Sum/许可SHA与实际依赖见 validation-sources.json、modules.jsonl、runtime-deps.jsonl。新实际runtime传递依赖x/text v0.42.0为BSD-3-Clause；regexp2只用于上游测试，未进入生产编译闭包。已通知T-27接纳真实许可/锁定，未手改通知。

`contracts/hap/v0.1/schema.json` 仍为唯一合同。生成器只新增同字节 `schema_generated.json` 供Go embed；新增测试校对副本与公开源相同。Go编译器固定Draft2020，显式AssertFormat，禁止外部URL/file loader；全122 params/result缓存有限。DTO解码前严格验证envelope与已装配方法参数，应用结果及Host反向params/receipt也验证，吞掉含instance值的validator原错误，只返回静态失败原因。DisallowUnknownFields保留作解码防线，已不冒充完整schema验证。

精确验证覆盖大小写keys、required、additionalProperties、嵌套类型、enum/const、十进制字符串以及date-time+Z$。UTC offset不被接受，2026-02-30等不存在日期被拒绝；不是只看尾部Z。hello的schemaVersion=1和limits常量不变，只有参数和结果都验证成功才设置ready。错误hello仍受HELLO_REQUIRED门，失效应用hello结果也不能进入ready；其余53个未来方法继续不宣告/不假成功。

新增共享 `fixtures/methods.json`：122个方法输入/结果正向、37负向，共159；保留uppercase hello、review的非法status与Host参数，另覆盖数字revision/epoch、错误enum、未知/缺失字段、UTC offset与真实日期。Go实际router消费已装配方法负向输入并验证无shutdown/Host附着副作用。TS owner报告同159样本在Ajv端一致通过，其实现结果由012负责。

独立Python检查曾暴露其可选date-time checker未安装、format实际仅annotation；已在validate.py明确缺checker即失败，并固定工具依赖rfc3339-validator0.1.4。安装后JSON Schema2020-12独立检查159case全部与Go一致；这个工具修正没有放松任何日期期望。

### 实际红绿与验证

- `red-regressions.log`：三个原Go反例均红，exit1：hardlink alias得到nil error、stdout不读/EOF3s仍活、大写字段hello成功。源码就是后续绿色回归，不用另一个模拟入口。
- `GOTOOLCHAIN=go1.26.10 go -C native/huhubot test ./tests/contract/foundation/... -count=1 -v`：exit0，5.518s，见green-foundation.log。
- `... test -race ./tests/contract/foundation/... -count=1 -v`：exit0，31.888s，无race，见green-race.log；包括真实WAL crash、背压与Go strict输入/结果。最终新增的纯schema副本一致性检查另以targeted suite exit0验证，不改变生产代码或并发行为。
- `... test ./... -count=1`：exit0，foundation5.394s，green-all.log；`go vet ./...` exit0。
- `... GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -o /tmp/huhubot-repair-windows.exe ./cmd/huhubot`：exit0，编译而非真机运行声明。
- `/tmp/huhubot-contract-validator/bin/python contracts/hap/v0.1/validate.py`：exit0，122 method shapes+3 frame goldens+25 decimal negatives+159共享methodcases；schema-validation.log、schema-tool-requirements.txt。
- `pnpm test:huhu-bot-architecture`：exit0，4个Application生产文件检查，无SQL/SDK/Wire/host泄漏。
- 普通（非race）1MiB帧 n100 decode p50=21.47394ms/p95=28.129288ms（green-foundation.log），含新增完整envelope schema解析；race数字不作产品性能指标。1MiB/batch8容量仍冻结，不宣称产品SLA。

源码快照在 `source-sha256.json`，排除T-27自有dist；保留旧008输入/失败证据，不把旧快照换名成通过。完整工程构建/五目标资产/通知由T-27在最终共享窗口执行，本分片不重复或越权写根产物。

## 问题与下一步

本分片无已知待修复项，需Lead独立补审三项finding并合并012的TS验证。新的hardlink拒绝会使原路径与alias都保持受限，直到多链接消除；这是保留WAL事实的显式安全策略，产品不会擅自删除资料。macOS/Windows文件锁/ACL/真实stdout现场、真实Provider与Obsidian未运行，按LOG-051列用户后验，不冒充通过。所有本分片writer、suite和合成子进程已结束，Go/contracts保持冻结；未标Ticket done。
