# T-01 独立双轴补审回报

Session: 20261025T043239Z
Task: 014-foundation-rereview
Status: completed

## 聚焦交接

已独立复核 r2 固定快照，008 的四项原反例均已修复；新检查确认两项剩余边界问题，因此本轮 standards、specification 仍分别为 request-changes。剩余问题是 schema 通过的闰秒时间在 JS 期限比较中变成 NaN 而放过过期 Host 租约，以及四处普通方法字段的 schema 字符长度与 Go 字节长度检查不一致。只有本任务报告/原始日志被写入工作区，未改实现、未派遣、未提交。应交原 owner 修复这两处，保留本报告后重新冻结补审，不把原四项已通过改写成全部票通过。

## 产物与验证

- **固定输入：** `evidence/T-01.md#review-input-r2`，JSON.stringify(input) SHA256 `ee51e36e7794d30222814f98efd735ee4892730afef7f436283b29716cbd70c3`。45 个 working_snapshot 文件、字节/模式、基线/HEAD/index 与全部 sources 原文/锚点均通过独立核验；基线 `33c21e098ef3188cbab5a09f3e0a01fadb787715`。原 008 输入/报告/日志未覆盖。
- **真实身份：** `native:/root/foundation_review`，仍未参与实现。Lead 用实际 followup-task 续派独立审查；模型偏好沿原派遣记录，本 reviewer 不自行认证底层模型。实现者仍为冻结输入列出的 Go/TS/Lead/根接缝 owner。
- **来源与范围：** 完整回读 008 两轴/反例、011/012 修复报告及后续已就绪的 013 工程报告。复用已读且摘要未变的 AGENTS、dev/适用 refs、code-review 风险/证据/双轴合同及 T-01/Spec/ARCH/ADR；按 result-reuse 对新输入重新判断两轴，不复用旧 request-changes 为 pass。无本轮新增 commit 来源；显式规范存在，UI 不适用，范围目录无额外 AGENTS/编码标准。检查覆盖整个基础交付及新增 schema/validator、Go 依赖、package/lock；未改变的边界代码结合原审查和当前接缝重新核对。
- **执行验证：** `GOTOOLCHAIN=go1.26.10 CGO_ENABLED=0 go test ./tests/contract/foundation/... -count=1`（cwd native/huhubot）exit 0，5.667s；`pnpm exec vitest run src/modules/huhubot` exit 0，5 文件/39 tests，18.59s。现有测试绿未取代下面的独立反例。
- **生成与独立 schema：** 在外部临时副本执行原 `generate.mjs`，61 methods/159 cases 生成成功；公开 schema、methods、frame golden、method golden、Go DTO、Go embedded schema 共六份产物逐字节一致。`/tmp/huhubot-contract-validator/bin/python contracts/hap/v0.1/validate.py` exit 0，122 method shapes、3 frame goldens、25 decimal negatives、159 method cases。
- **新增依赖与资源审查：** TS Ajv 8.20.0/formats 3.0.1 精确 pin，lock importer/snapshot 一致，没有升级旧传递版本；Go jsonschema/v6 6.0.3 与 x/text 0.42.0 固定。TS validator 固定版本最多 122 缓存、按需编译、无 coercion/remove/default；Go once 缓存固定 schema，外部 loader 禁止，错误文本不泄露实例值。无 SQL/Wire/宿主依赖进入 Application；唯一 schema 的同字节 embed 被生成一致性检查锁定。package 新增脚本均指向已有 T-27 入口，脚本实现/许可通知本身由另一个工程审查负责。
- **输出/生命周期审查：** 单 writer 约束实际写序，queued+active 32 帧/约 2 MiB，排队到写完成有 1s 期限；超时关闭先发布 closed，当前 CLI 进程终止释放可能阻塞的 inherited fd。原健康、shutdown、反向 pending、错误帧、父 EOF 与拒绝分支都共用 writer。Go active/pending 和 TS pending/reverse/seenServerIds 均有明确边界；未发现新的无界集合。异步 close 不被表述为所有宿主 FD 场景已现场验证。
- **原反例独立重放：** 见 [raw-probes.log](raw-probes.log)，完整命令、探针源码和输出均保留。二进制由当前冻结 Go 源构建，TS bundle 来自当前生产 connection/codec/method-validation。所有数据在一次性目录，退出均 wait/reap；未用作者测试替代重放。
- **工程回执边界：** Lead 回传当前输入的全量 build/lint 均 exit 0（`evidence/T-01-logs/build-r2.log`、`lint-r2.log`）；013 回执的五目标资产/许可/本机 smoke 只是回读辅助，不属于 reviewer 自行运行或对 T-27 的独立批准。本轮未重复 race/vet/其他 OS 真机；此前作者通过与交叉编译不冒充现场验证。真实模型/Obsidian/用户目标 OS 仍按 LOG-051 由用户后验，不作代码门阻塞。

### 原四项处置

| 原 finding | 本轮实际观察 | 判断 |
|---|---|---|
| STD/SPEC-01 硬链接 WAL 分叉 | 原路径真实提交 revision=2 后 SIGKILL；alias 和原路径均在进入 SQLite 前返回 PROFILE_DB_HARDLINK_UNSAFE；DB/WAL/SHM SHA256 全部不变；仅移除合成 alias 后原路径恢复同 Profile/revision=2 | 原反例已修复；接受显式安全拒绝路径，不要求猜测硬链接 canonical path |
| STD/SPEC-02 stdout 背压 EOF | 与原反例相同 900 请求/54790 B，stdout 全程不读；Runner 约 1.067s 自行 exit 1；随后真实进程能重开相同 Profile，锁已释放；绿色路径无 drain/父 kill | 原反例已修复；exit 1 如实表达传输慢消费者失败 |
| STD/SPEC-03 TS DTO 验证缺失 | 原非法 service.status 被 INVALID_METHOD_RESULT 拒绝并 closed；原非法 Host 参数 callback 次数=0，返回 INVALID_HOST_PARAMS；新39 tests另覆盖回执、出站、hello/lease invalid DTO | 原反例已修复；下面 R2-01 是新日期消费边界 |
| STD/SPEC-04 Go 大小写键宽松 | 原大写 hello 返回 INVALID_METHOD_PARAMS，下一 health 仍 HELLO_REQUIRED；随后合法 hello 可正常完成 | 原反例已修复；下面 R2-02 是合法 Unicode 长度的另一接缝 |

<a id="standards-output"></a>

## standards-output

Reviewer: native:/root/foundation_review
Axis: standards
Result: request-changes
Input-SHA256: ee51e36e7794d30222814f98efd735ee4892730afef7f436283b29716cbd70c3
Observed: 对 r2 工作副本独立复核原四项修复，并检查新增 runtime validator 的实际消费者、资源和依赖；确认两个带对照的剩余反例。以下均为具体行为风险，不是格式或 Fowler 风格偏好。

### STD-R2-01 — P2：schema 合法但 Date.parse 不支持的期限使过期租约失效检查放行

- **位置：** `src/modules/huhubot/core/protocol/connection.ts:247`–`:248` 安装 schema 通过的租约，`:287` 仅比较 `Date.parse(lease.expiresAt) <= Date.now()`；对应 validator 为 `core/protocol/method-validation.ts:34`–`:45`。
- **可达条件/风险：** 对端返回 `expiresAt: "2016-12-31T23:59:60Z"` 的 Host lease。Ajv full date-time 接受有效 RFC3339 闰秒，但 JS Date.parse 返回 NaN；NaN 与 now 的比较为 false，已过期 lease 被当成仍有效，Host invoke/queryReceipt 可进入可信 callback。当前 Go 正常发行路径用普通 time.Format 不会生成闰秒，这限定了触发前提，但客户端面对合同允许的外部值仍不能据此放弃期限保护；本次修复删掉了原先有限数值检查。
- **原始证据：** raw-probes.log：`EXPIRED_LEAP_SCHEMA_VALID true DATE_PARSE NaN`，真实生产 HapConnection 安装该租约后 `EXPIRED_LEAP_HOST_CALLS 1`，回复 committed。单变量对照仅把秒改为 59，`ORDINARY_EXPIRED_NEGATIVE_CONTROL 0` 且返回 CAPABILITY_DENIED/INVALID_HOST_LEASE。未 mock 掉被审期限判断。
- **依据：** risk-review 权限/公共 API 边界；error-handling 失败后状态保证。结构校验成功不等于供业务期限使用的数值可比较，解析失败必须保守拒绝。
- **最小满足条件：** 安装租约及调用 Host 前对期限解析结果执行 finite/有效性检查，或使用支持所允许 UTC 时间的严格解析器并安全比较；不能让 NaN 走“未过期”分支。保留普通过期、闰秒过期、合法未来三类实际连接反例，证明错误/过期值不调用 Host。若协议主动收窄时间子集，同步唯一 schema/双端 fixture，勿只在某端隐式接受另一种范围。

### STD-R2-02 — P2：四处手写字节长度与 schema 的字符长度冲突

- **位置：** `native/huhubot/internal/adapters/inbound/hap/router.go:66` 的 client.name/client.version `len`；`native/huhubot/internal/application/api/service.go:68` 的 workspaceId 及 `:73` 的 capabilities 每项 `len`；`contracts/hap/v0.1/generate.mjs:70`–`:73` 生成相应 `maxLength:128`。
- **可达条件/风险：** 这些字段含多字节 Unicode，字符数 ≤128 而 UTF-8 字节数 >128。公开 JSON Schema maxLength 与 Ajv 按 Unicode 字符计，Go `len(string)` 按字节计；客户端接受并发送的合法方法 DTO 在真实 Runner 被第二套长度规则拒绝。中文等客户端名称会比等长 ASCII 名称更早无法握手；同类规则也影响 Host 注册，不是只修 hello 一处即可一致。
- **证据：** 50 个 ASCII x 的 hello 成功；50 个“测”（50 code points/150 UTF-8 B）的 client.name 与 client.version 均通过生产 TS schema validator，却被真实 Runner INVALID_HELLO 拒绝。分别把同值用于合法连接 host.attach 的 workspaceId、capabilities[0]，schema 都通过，Go 分别 INVALID_HOST_LEASE、INVALID_HOST_CAPABILITIES。四处均已实际复现，见 raw-probes.log。
- **依据：** risk-review 公共契约/兼容与重复规则漂移，Fowler“可能的 Duplicated Code”在这里有实际消费者分歧支撑，而非单纯建议去重。wire request ID/method 的既有 128 UTF-8 bytes 规则是另一个明确合同，不应为修复普通 DTO 字段而放松。
- **最小满足条件：** 明确这四个字段的长度单位并让公开 schema、TS、Go 应用检查同义；若仍定义 maxLength128 字符，Go 使用相同 Unicode 计数；如需字节上限，必须在唯一合同与两端实际校验中明确表达。补 ASCII/中文/补充平面字符的边界对照，覆盖这四处并保留 wire ID/method 的 UTF-8 字节上限。

<a id="specification-output"></a>

## specification-output

Reviewer: native:/root/foundation_review
Axis: specification
Result: request-changes
Input-SHA256: ee51e36e7794d30222814f98efd735ee4892730afef7f436283b29716cbd70c3
Observed: 按冻结 T-01/Spec/ARCH/ADR 重新判断全部基础票交付；61方法仅定义合同、8方法实际装配与无UI/模型范围保持一致。原四项满足其明确验收条件，但当前日期期限与双端字段长度仍不满足已承诺的公共合同；未把未来票或用户现场验收当作缺陷。

### SPEC-R2-01 — P2：Host 租约的格式验证尚不能确保到期拒绝

- **位置：** `src/modules/huhubot/core/protocol/connection.ts:247`、`:287`。
- **风险/证据：** `2016-12-31T23:59:60Z` 通过版本 schema，JS Date.parse 变为 NaN，实际 Host callback 被调用并回复 committed；正常过去时间秒=59 的对照被正确拒绝。普通 Go 当前不会产生这种时间，问题是外部公共合同允许的输入到客户端业务消费之间存在缺口。
- **依据：** Spec §9 的 UTC RFC3339/Host 能力租约合同；ARCHITECTURE §11.1 外部 JSON 运行时校验、§12.1 租约能力与连接约束；T-01 已实现 Host 接缝及 AC-035/AC-054。引入 schema 验证不能削弱原有有效期限防线。
- **满足条件：** schema 通过但无法安全解析的时间仍须明确拒绝；过期值绝不取得 Host 派发资格。实际连接回归覆盖该闰秒、普通过期和未来有效期限，必要的时间子集调整同时更新唯一合同与两端验证。

### SPEC-R2-02 — P2：公共 schema 与真实 Go 对普通 DTO 文本长度的接受范围不同

- **位置：** `contracts/hap/v0.1/generate.mjs:70`–`:73`；`native/huhubot/internal/adapters/inbound/hap/router.go:66`；`native/huhubot/internal/application/api/service.go:68`、`:73`。
- **风险/证据：** client.name、client.version、workspaceId、capabilities 每项的 maxLength128 在 schema/TS 按字符理解，Go len 按字节。50中文字符在四处均是 schema 合法、真实 Go 拒绝；50ASCII的hello对照成功。
- **依据：** T-01 步骤2–3 的唯一版本化 DTO/schema 与真实 TS/Go 接缝；AC-035 要求 hello 与 schema/类型一致；Spec §9、ARCHITECTURE §11.1 公共序列化合同。wire ID/method 的128 UTF-8 bytes不构成把其他文本字段 maxLength 默认为 bytes 的授权。
- **满足条件：** 四处普通字段的声明和实际长度策略一致，边界测试同时经过生产 validator 与真实 router/application；保留独立 wire ID/method 的字节合同，不通过放宽其限制解决文本计数分歧。

## 问题与下一步

两项证据及最小满足条件已完整交回。Lead 可将 R2-01 交 TS owner，将 R2-02 交 Go/合同 owner（与 TS validator 协调），修复后按新字节重新冻结；旧008四项已修复的证据可按受影响范围保留，本014的 request-changes 不可改写为 pass。

结束前再次核对45文件/全部来源/基线/index无漂移，并运行 validate-dispatch return；结果附于 raw-probes.log。所有本任务测试、Runner和探针子进程已停止，无工作区生产文件修改。真实Provider/Obsidian/用户OS现场仍保留用户后验，不构成本轮代码门的新增阻塞。
