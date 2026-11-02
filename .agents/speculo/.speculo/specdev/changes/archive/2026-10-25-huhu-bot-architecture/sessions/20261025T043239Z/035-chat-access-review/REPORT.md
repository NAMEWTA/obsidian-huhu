# T01/T02维护与T03/T05联合候选独立双轴审查

Session: 20261025T043239Z
Task: 035-chat-access-review
Status: completed

## 聚焦交接

标准轴 **request-changes**；规范轴 **request-changes**。完整固定候选中确认三项 P2：后台笔记捕获缺少异步读后的对象身份复核；原文范围坐标上限与捕获容量不一致；Grant 的幂等摘要错误包含传输 commandId。三个实际反例、正常对照和原始错误均保留，未实施修复。

Reviewer 为实际受派的 `native:/root/foundation_review`，未参与该候选实现或修复，未再委派。沿用派单的 gpt-6-astra/high 偏好，仅记录偏好，不声称底层模型 attestation。唯一输入为 `evidence/T-03.md#review-input-r1`，SHA256 `2a43d12b56b6e68c676ef89348295bbacc5ad3e496d5599e0fece0846968401d`；131 实际文件、36 规范来源，HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`。开始及结束以真实 `scope.scope_paths` 重新计算工作副本、index、mode、baseline 与来源 anchor 摘要，未漂移；没有使用不存在的 requested_files 属性扩大范围。

与033输入逐项比较，63项新建/变化，68项完全相同；033的既有观察只用于摘要相同且本次影响闭包未推翻的部分。完整回读026、027、028最终报告及相关原始反例/终态日志；027报告实际摘要为 `96a6442e99a7156d882faeb6a3e1483c5b37775d304807296a69df9635939988`。本轮覆盖新共享接缝，没有把033通过或作者套件全绿当作当前结论。

## 产物与验证

全部独立命令、输入核验程序、临时探针原文、原始输出见 [raw-probes.log](raw-probes.log)。生产源码、永久测试和正式状态均未改；Go独立探针仅添加到外部临时module，其中99个冻结native文件与当前源码逐字节相同。TS探针bundle来自当前真实 ObsidianSources/HostReadService；只替换外部 Obsidian 类、Vault/editor 对象，不替换应用逻辑。Go探针调用真实 bootstrap/Facade/SQLite，仅Host和Engine是受控外部边界。

| 独立实际验证 | 结果及边界 |
| --- | --- |
| `go test -mod=readonly ./tests/contract/chat ./tests/contract/access ./tests/contract/foundation -count=1`，Go1.26.10/CGO0 | exit0；chat1.621s、access2.664s、foundation9.258s。包括真实TS↔Go子进程、实际SQLite满盘和崩溃窗口。 |
| `pnpm exec vitest run src/modules/huhubot` | exit0，11文件78 tests，27.23s，包含实际Runner；没有把循环fixture数量额外计成测试数。 |
| 独立对象替换、范围边界、Grant重试探针 | 三项缺陷均复现；观察性断言exit0表示稳定复现，不表示产品满足合同。 |
| 独立三代派生来源探针 | exit0；合法三轮收到0/2/4条历史，三个Run均保存effective source；撤销read后三代助手正文全被过滤，第四轮Engine只收到两个无来源用户意图。 |
| 唯一schema验证、隔离重生成 | exit0；126 method shapes、3 frame goldens、25 decimal negatives、174 shared method cases；六份生成输出逐字节一致。 |
| `verify-huhu-bot-architecture.mjs` | exit0，24个生产文件，未发现application/domain跨入SQL/宿主/adapter实现。 |
| Root全量build/lint/Lead E2E | 已回读实际日志，均exit0；这是Lead证据，不冒称reviewer再次全仓运行。 |

回读后核查的关键影响闭包：

- **受理、幂等和持久性：** 两入口身份注入→同一Facade→同库事务，receipt先于busy/CAS，Run/用户消息/pin/首事件/占用一起提交。实际事件失败回滚和SQLITE_FULL窗口检查持久状态；accepted扫描及进程在commit后wake前exit23重开只执行一次。Finalize失败没有伪造终态或零usage。Grant单独摘要出现STD-03所述分歧。
- **配置、历史和授权：** 受理固定model/persona pin，真实Usage含active Run及related Session，删除预览/执行复核在同库中完成。历史用户read与模型read+send分开；当前endpoint/recipient/Grant/parent交集和真实Run自己的pin均被检查。合法派生历史携带effective provenance，最后MarkRunning事务以及Finalize再次复核当前Grant。独立三代传递验证没有发现洗掉来源的路径。
- **生命周期：** core执行上下文不属于短HAP请求，client EOF不撤销已受理Run；core关闭取消并join；重开preparing/running变interrupted而不自动重付费调用。队列128、执行并发2，Host请求/TS pending/重复ID/缓存/不可取消Vault任务有明确上限。Vault任务超时后仍占用底层配额，直到底层真正settle；迟到正文、lease切换和disposed结果被拒绝。未重跑没有受影响的旧默认D-Bus配置。
- **资料与搜索：** 捕获原窗口未保存编辑内容；显式source/scope registry隔离路径；scope搜索读前后检查对象/path/stat；UTF16 offset与UTF8输出字节预算分开，surrogate切分、excerpt/hash/范围/cursor篡改及scope扩大拒绝。source范围与schema的接缝出现STD-02，captureNote自身的registry复核遗漏出现STD-01。
- **共享维护与可维护性：** T01唯一schema同时生成Go/TS消费物，严格双向校验仍启用；迁移003/005注册实际Version3/4且旧迁移保留；T02密钥/锁依赖未变化，沿033有效边界观察复用。按Fowler检查责任分离、重复策略、数据丛与错误处理，没有仅凭长函数或格式提出阻断；Grant复制摘要逻辑已导致可观察的语义差异，属于实际缺陷。

最初范围探针将完整 `Error.message` 与纯reason比较，断言设置错误，原失败日志与脚本保留；只将断言改为结构化 `error.data.reason` 后重跑，正常/失败边界本身未改变。它不是修复前后的产品红绿。没有将作者中间fixture错误或schema工具缺依赖算为行为失败。

<a id="standards-output"></a>

## standards-output

Reviewer: native:/root/foundation_review
Axis: standards
Result: request-changes
Input-SHA256: 2a43d12b56b6e68c676ef89348295bbacc5ad3e496d5599e0fece0846968401d
Observed: 按完整131文件与36固定来源核对正确性、权限、竞争、故障恢复、资源和维护性。三个可证伪假设得到真实消费者反例；其余适用影响闭包的观察如上。以下均为实际行为问题，不是格式或启发式建议。

### STD-01 / P2：captureNote在Vault.read后没有复核原对象仍是registry中的文件

位置：`src/modules/huhubot/platform/obsidian/sources/sources.ts:158–164`，主要遗漏在162–164行。入口152行的validFile只在异步任务前验证对象；之后仅比原TFile的path/mtime/size，没有检查 `vault.getAbstractFileByPath(fileVersion.path) === file`。后台显式文件在read等待期间被删后同路径新建，旧TFile字段可保持不变；按路径进行的在途读取可能返回替换文件正文，该正文就被赋予本次选择的opaque source并缓存。

独立正常对照返回 `ORIGINAL_ALLOWED_BODY` 且registry仍是原对象；只在read等待中更换registry对象后，实际capture仍成功，实际HostReadService.read返回 `REPLACEMENT_PRIVATE_BODY`，registryStillOriginal=false。使用一次性受控Vault边界，未声称在用户Obsidian里复现；生产异步检查及实际返回路径均未mock。影响是被选择对象的身份与捕获正文不一致，可能把替换内容交给后续已授权消费者。

最小满足条件：在后台读取的实际异步边界核对原文件对象身份与原版本，替换/删除/移动后拒绝且不缓存/返回正文；正常未变对象仍可读，已同步捕获的明确编辑器快照仍保持既有语义。复验保留同路径新对象、mtime/size相同的反例，不能只测旧对象path变动；scope搜索既有复核也应保持。

### STD-02 / P2：可成功捕获的短选区被131072原文坐标上限拒绝

位置：`contracts/hap/v0.1/generate.mjs:82`。统一bound把start/end与正文maxBytes混用131072最大值；实际capture允许1MiB原文（`sources.ts:6,124`）并保留原文UTF16坐标（143–149行）。因此本来只需要返回一个字节的合法选区也可能无法通过共同合同。

独立实际captureSelection→HostReadService.read，`maxBytes:1`：131072字节ASCII原文末尾的range[131071,131072]返回Z；仅增加一个前缀字符，原文131073字节、range[131072,131073]仍捕获成功，却被61行参数校验拒绝为INVALID_HOST_PARAMS。远小于1MiB，所选正文只有Z。相同生成约束覆盖runs.start sourceRefs、host.read/search的source/range及搜索结果；Go消费者 `protocol/hap/schema.go:89`、`adapters/inbound/stdio/server.go:338,401,411` 与TS消费者都使用该合同，不能只放行某一个Host服务。

最小满足条件：唯一生成器的原文坐标界限与捕获的合法容量/UTF16语义一致，Go及TS共同消费可传递131073等有效坐标；保留非整数、越界及surrogate拒绝。不得以放宽host.read/search单次65536字节预算解决坐标问题。原边界与1MiB内靠后短选区均需正常对照。

### STD-03 / P2：Grant把新的传输尝试ID误认为新的业务输入

位置：`native/huhubot/internal/application/access/grants/service.go:58–61,99,109`；SQLite比对在 `adapters/outbound/sqlite/grants/store.go:94–98`。digest直接hash完整command，包含commandId；相同候选的 `application/execution/commands/validation.go:25–30` 明确将commandId作为传输attempt并从intent hash排除，既有Assistant也进行归一化。Grants路径因重复摘要策略产生不一致。

真实Facade/SQLite分别完成Create和Revoke后，原commandId精确重放返回原Grant ID/receipt ID；仅更换commandId而保留相同principal/profile/method/key/epoch/CAS与所有业务参数，两者均返回 `IDEMPOTENCY_CONFLICT: IDEMPOTENCY_INPUT_MISMATCH`。数据库只有原Grant的一次撤销与一份create/一份revoke receipt，并不是实际重复效果。影响为重连/重新生成传输attempt时无法恢复同一授权操作结果，甚至已经成功撤销也向重试方报告冲突。

最小满足条件：两种Grant命令摘要与既有intent/attempt分离一致；不同commandId、相同业务输入/key恢复同一对象/回执且不重复更新；真正改业务输入仍冲突，旧epoch及CAS边界不放宽。不能改用新key绕过失败。

<a id="specification-output"></a>

## specification-output

Reviewer: native:/root/foundation_review
Axis: specification
Result: request-changes
Input-SHA256: 2a43d12b56b6e68c676ef89348295bbacc5ad3e496d5599e0fece0846968401d
Observed: 独立对照T03原子单聊与持久执行、T05 AC-022/024/054和来源/租约/授权交集，连同T01/T02维护及Spec §6/8/9、ARCH事务合同、ADR与LOG-051。合法历史read/send分离、派生来源、最终准入、未知usage及中断恢复已有实际代码证据；下列三项使当前代码交付仍未满足本范围合同。

### SPEC-01 / P2：明确附加项的原对象身份未在后台读取结束时固定

T05目标与AC-024、Spec §6要求origin/revision/hash绑定本次明确资料，切页或宿主对象变化不能换掉该资料。`sources.ts:158–164` 对同路径替换只检查已脱离registry的旧TFile字段，导致本次capture把替换正文保存为合法SourceSnapshot；独立HostReadService实际返回替换哨兵，正常原对象对照通过。这里不是用户真实OS验收缺失，而是产品检查窗口遗漏。

最小满足条件是原对象被替换后捕获拒绝、没有可读新snapshot/正文；未替换正常。保留同路径/相同stat对象替换输入，并保持scope搜索和编辑器快照合同。

### SPEC-02 / P2：明确合法短选区在捕获后无法由共同Host合同消费

T05行为范围明确提供选择/读取/搜索与修订快照，T01维护要求唯一wire合同和真实消费者一致。`generate.mjs:82` 将坐标固定131072，而 `sources.ts:6,124,143–149` 接纳1MiB内原文的原始UTF16位置；实际1字节选区在131072/131073边界由可读变为INVALID_HOST_PARAMS，破坏捕获→Host消费链，未到任何模型或用户操作环节。

最小满足条件是合法原文坐标在生成合同、Go和TS中一致可消费；保持65536字节单次输出、完整hash与surrogate约束。生成fixture全绿不能替代这组实际捕获反例。

### SPEC-03 / P2：Grant未保持共享幂等意图合同

T05 AC-054要求同一用例/DB决定幂等，ARCH事务合同规定principal/method/idempotencyKey同输入恢复原receipt，Spec普通命令分开携带commandId和idempotencyKey；当前共享commands.Hash明确attempt与intent分离。`grants/service.go:58–61,99,109` 单独把commandId计入业务摘要，真实Create/Revoke在仅换attempt时均报冲突，与同候选Session/Run/Assistant重放语义不同。正常原commandId重放、数据库原对象及两份receipt已验证。

最小满足条件是同业务输入/key可跨commandId恢复原操作结果；真正异输入仍冲突，不能依赖更换key、删除receipt或忽略CAS实现通过。两种方法都须复验。

## 问题与下一步

三项缺陷应由原owner在新受控窗口最小修复，重新冻结后复核实际影响闭包及上述正常/失败对照。当前两个轴均不能通过；没有数量截断，也没有因已有三项而停止其他适用风险审查。报告仅交回代码审查，不修改Ticket状态或批准发布。

真实Provider/目标OS/keyring/Obsidian窗口/用户Vault为user-owned/not-run；LOG-051已明确不构成本轮代码门阻塞。T04事件续读、T06审批、T08协议Engine、T16恢复操作、T20模块/UI属于后续范围；当前生产Engine安全返回ADAPTER_NOT_ASSEMBLED，不把它判作本票缺陷。T27工程/许可及ignored发行资产由其独立流程接纳，本报告不证明旧dist来自当前源码。

末次固定输入一致；独立命令均已退出并由exec/Run/CombinedOutput Wait，异步Vault探针promise释放、service.dispose清理。最终进程检查和return结构校验实际回执追加至raw-probes.log；仅本REPORT/原始日志落盘。完成后停止全部写入，再以真实工具消息交回Root。
