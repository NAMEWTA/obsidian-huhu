# T-01 独立最终补审回报

Session: 20261025T043239Z
Task: 018-foundation-final-review
Status: completed

## 聚焦交接

018 固定输入的 standards、specification 分别为 pass，无新增 finding。014 两项缺陷经独立生产连接/真实进程反例确认修复；008 原四项的未变证据保留，实际受本轮影响的 TS DTO 与 Go hello 接缝也重新验证。未修改生产代码、未派遣、未提交，只写本任务报告和原始日志。候选交回 Lead 结合工程检查和整合证据决定 T-01 状态，本报告不自行关闭 Ticket，也不批准 T-27 范围。

## 产物与验证

### 固定输入、独立性与覆盖

- 唯一输入 `evidence/T-01.md#review-input-r3`，JSON.stringify SHA256 `b7f73d8917e9f859cc10e9e0111437a2d9e94977baf847a99452137f2feb8723`。基线/HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`；46 个工作副本文件、原始字节/模式、范围内 index 和全部规范/标准来源均独立重验。工具源码与最终检查输出保存在 raw-probes.log。
- Reviewer 为 `native:/root/foundation_review`，仍未参与任何被审实现；Lead 通过真实 followup task 续派，实际派遣/实现者身份由 Lead 核验。本报告不自行认证底层模型；模型偏好沿原派遣记录。实现者包括 Go/TS owner、Lead 与根工程接缝 owner，未把作者报告当独立结论。
- 完整回读 014 两轴、016/017 修复报告，以及 008 原两轴/原反例；011/012/013 报告沿上一轮已完整回读记录。复用已读且全部来源摘要相同的 AGENTS、dev/适用架构/测试/许可/构建参考、T-01/Spec/ARCH/ADR；按 code-review 及 source-discovery、working-tree-review、Fowler、risk-review、reviewer-contracts、review-evidence、result-reuse 重新作两轴判断。无新 commit 来源；显式规范存在，UI 不适用，未发现新增目录规则。
- 与 r2 快照逐项比较，40 个文件完全相同；变化为 router.go、service.go、connection.ts 三份生产文件，connection.test.ts、runner.test.ts 及新增 unicode_test.go 三份测试。完整读取变化文件/接缝；对未变部分保留原独立观察，不把原 request-changes 改写成 pass。当前两轴是新输入的新结论。
- 未变观察涵盖 Profile 受管根/身份锁/权限/恢复、SQLite/migration/UoW、stdio 有界 writer/EOF、Application 无 SQL/Wire/宿主依赖、managed transport 环境白名单/回收、唯一 schema 与生成物、固定版本 validator/依赖缓存资源、全部61方法合同和仅8方法装配。新修复没有新增依赖、schema、生成器或对外方法，没有放宽 capabilities 数量/唯一性/身份权限。

### 本轮独立执行

| 检查 | 实际结果 |
| --- | --- |
| 当前 Go 源构建 | `GOTOOLCHAIN=go1.26.10 CGO_ENABLED=0 go build -o /tmp/huhu-foundation-final-review/huhubot ./cmd/huhubot`，cwd native/huhubot，exit0 |
| foundation 全套 | 同环境 `go test ./tests/contract/foundation/... -count=1`，exit0，7.635s |
| TS 全模块 | `pnpm exec vitest run src/modules/huhubot`，exit0，5 文件/46 tests，25.60s；含生产 managed transport 到真实 Go 的 Unicode 注册/握手与拒绝联调 |
| TS 独立生产反例 | esbuild bundle 当前 connection/codec/method-validation；`node /tmp/huhu-foundation-final-review/probes.cjs` exit0，完整输出见 raw-probes.log |
| Go 独立真实进程反例 | `python /tmp/huhu-foundation-final-review/probes.py` 最终 exit0；37 个真实子进程全部 wait/reap，临时 Profile 全部清理 |

Go 探针初始两次曾因 reviewer 对既有 framing 错误 code/reason 的假设不准中断；原源码/原输出完整保留，分别是预期 -32600 而实际 -32700/INVALID_ID，以及预期 INVALID_METHOD 而实际 INVALID_ENVELOPE。回读既有 frame.go/server.go 后只修正临时探针断言，未改产品；最终验证128通过、129拒绝及既有实际 reason。没有把探针断言错误计作产品红灯或隐藏失败。

### 两项修复的独立观察

| 014 finding | 当前生产接缝与证据 | 处置 |
| --- | --- | --- |
| STD/SPEC-R2-01 期限解析 NaN 放行 | `connection.ts:55` 的 activeHostLease 要求 finite 且严格晚于 now，`:257` 安装前失败则 reject/finish，`:302` 每次 Host 派发前复验。原闰秒 `2016-12-31T23:59:60Z` 仍 schema 合法/Date.parse NaN，但安装失败、连接closed、两个 Host callback均0、timer0；普通过去59秒同样拒绝。2099未来租约 invoke/queryReceipt 都成功；取得公开 lease DTO后再设闰秒/普通过去值，两方法均 CAPABILITY_DENIED/INVALID_HOST_LEASE、callback不增加、timer0。已运行套件还覆盖严格相等到期点拒绝。 | 满足原最小条件；没有收窄唯一 RFC3339 schema，只拒绝不可安全比较的调用资格 |
| STD/SPEC-R2-02 四字段字符/字节不一致 | `router.go:67` 对 client.name/version、`service.go:69` workspaceId和`:74` 每项capability使用 RuneCountInString。独立 TS validator 与真实 Go 均验证 x/测/😀 三类 × 四字段 ×128/129：128全部成功、129全部拒绝。Go错误hello仍HELLO_REQUIRED且合法hello可恢复；错误attach保持未注册；合法attach返回原文本且detach成功。 | 四处均与 schema maxLength128 同义；不只修 hello |

独立 Go/TS 各另跑 x/测/😀 × wire id/method ×128/129 UTF-8 bytes 共12边界：128通过 envelope，129拒绝。普通字段128个😀为512字节可接受，与 wire 限制明确区分。真实 TS→Go套件验证前置 TS 拒绝129，不假称这些请求已穿过客户端到达服务器；独立 Python实际发129到Go补足服务端拒绝证据。

### 原四项及未变证据

| 008 finding | 当前复核方式/观察 |
| --- | --- |
| 硬链接 WAL 分叉 | Profile锁/SQLite相关文件及崩溃夹具摘要与014相同，复用014原始真实WAL commit→SIGKILL→alias与原路径均拒绝且DB/WAL/SHM不变→移除合成alias后revision2恢复证据；本轮全suite仍覆盖该边界，不机械重造无关崩溃 |
| stdout 背压阻塞EOF | stdio writer/CLI相关文件与014相同，复用014无人读取stdout、900请求/54790B后约1.067s自行exit1且同Profile可重开的原始证据；本轮foundation仍包含慢消费者/恢复回归 |
| TS DTO校验缺失 | 本轮独立当前connection重新发原非法Host nested revision/content/unknown，callback不增加且INVALID_HOST_PARAMS；非法service.status再次INVALID_METHOD_RESULT并closed/timer0；全suite的完整双向schema检查仍绿 |
| Go大小写键宽松 | 本轮当前真实Runner重新发原大写hello，INVALID_METHOD_PARAMS；后续health仍HELLO_REQUIRED；再发合法hello成功。Unicode修改未绕过schema、未提前置ready |

唯一schema、generator、六份生成物、package/lock和Go module/sum与014逐字节相同，保留014临时副本生成一致性和独立Python schema验证的观察（61方法/122shape/159method cases/3frame golden/25decimal negatives），本轮不宣称重新运行这些命令。资源队列、pending/reverse/seenServerIds上界、迟到响应策略及失败关闭路径没有改变；期限失败还单独确认timer/listener连接关闭及不调用Host。

### 验证边界

本轮自行运行的是上述代码检查与Linux合成进程。Lead另已回传r3全量build/lint exit0、真实TS→Go runner 9/9、WAL/EOF/Unicode/wire边界全部0，日志为 evidence/T-01-logs/{build-r3,lint-r3,lead-e2e-runner-r3,lead-e2e-boundaries-r3}.log；这些是Lead回执，不冒称reviewer新跑。T-27许可/五目标构建与其他Lead整合归各自范围，本报告不独立批准。未新跑race/vet/其他OS实机；无并发/依赖模型变化，保留此前证据边界。真实模型、Obsidian与用户目标OS操作仍按LOG-051由用户后验，不构成本轮代码门阻塞。

<a id="standards-output"></a>

## standards-output

Reviewer: native:/root/foundation_review
Axis: standards
Result: pass
Input-SHA256: b7f73d8917e9f859cc10e9e0111437a2d9e94977baf847a99452137f2feb8723
Observed: 对冻结46文件按实际变化与风险重新判断，完整检查三份生产/三份测试改动，并按摘要相同条件保留40份未变文件的原独立观察。有限期限判断同时覆盖安装和两个Host消费入口，错误值在可信callback前失败且清理资源；四普通文本字段使用与schema相同的Unicode计数，wire字节合同独立保持。原008受影响的DTO/hello反例重新转绿，未变Profile/WAL/stdio恢复证据仍适用。全suite及独立生产反例一致，未发现新的正确性、权限、恢复、资源或维护性阻断；无仅凭Fowler启发式制造的风格finding。

Findings: 无。014 STD-R2-01、STD-R2-02满足最小修复条件；008原四项已在014修复且本轮未退化。此pass仅针对冻结T-01范围，不覆盖T-27工程范围或未来53个未装配方法。

<a id="specification-output"></a>

## specification-output

Reviewer: native:/root/foundation_review
Axis: specification
Result: pass
Input-SHA256: b7f73d8917e9f859cc10e9e0111437a2d9e94977baf847a99452137f2feb8723
Observed: 依据冻结T-01 Goal/Behavior/Acceptance/Verification/Execution、Spec §9–11、ARCHITECTURE §3/10–13与ADR-003/004/005/021/022独立判断。AC-035的hello/schema/公共类型接缝对四字段Unicode边界一致，wire128 UTF-8 bytes仍独立实施；AC-054及Host租约合同对无法比较、已过期和恰好到期均拒绝，未来有效期限能正常派发invoke/queryReceipt，未把格式验证当权限依据。AC-034的Profile身份/恢复与父EOF自行有界退出使用未变生产实现及已验证证据；公共61方法合同、8方法实际装配、不提供未来业务成功占位符合本票范围。没有将用户现场后验或T-02–28缺失当本票缺陷。

Findings: 无。014 SPEC-R2-01、SPEC-R2-02满足原验收条件，008原四项合同缺口的修复仍成立。标准轴结论没有替代本轴判断；本pass不代替Lead的整合检查与正式Ticket投影。

## 问题与下一步

无剩余已证实阻断或新增finding。Lead可回读本报告和完整反例后汇入T-01代码层证据，并在自身整合检查完成后决定依赖门。旧008/014的request-changes及失败原文保留，不覆盖为pass。

结束前已再次核对固定输入；一次全仓inventory扫描碰到并行范围外写入而被工具保护性拒绝，原命令重试后46文件/来源/index/模式/基线全部匹配，没有冻结范围漂移。return结构校验和最终进程确认附于raw-probes.log；本任务所有Runner/探针/测试进程均已结束。只写018报告和日志，随后停止写入并交回释放槽位。
