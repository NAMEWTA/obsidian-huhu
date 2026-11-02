# 任务回报

Session: 20261029T021146Z
Task: 009-final-data
Status: completed

## 聚焦交接

<a id="standards-output"></a>
Reviewer: codex:/root/review_data
Axis: standards
Result: request-changes
Input-SHA256: 69e01201a2aa5f8cf6d0435c41714811ccb45e6b9d8921a21c42e0fe6b4e8583
Observed: 已逐字节核验453个冻结路径及20项来源，全部匹配；旧S01至S09已在本候选关闭，但生产工厂重建RecoveryHost绕过尚未收束的旧writer隔离，独立确定性barrier反例已证明新导入历史被旧shutdown写回覆盖。

本轮为 GP-045 / Map42 的独立最终数据复核，审查者仍为 Astra / high，未参与任何被审生产实现。旧 S01–S09 / P01–P08 的修复与 Root 最后迁移夹具补正均得到实际代码及定向测试支持；P09 的超时/取消能力已实现，但生命周期隔离尚未满足合同，升为高风险保留。报告只对本数据/迁移/备份/自动化及相连旧消费者范围作两轴判断，不代替 007 全交付结论。交回前另收到007 reviewer的合法包预检原型污染反例，已回读脚本、日志并核对实际合并代码，见S11。下一步由 Lead 授权实现者修复真实 host 重建边界与原型键处理，再冻结新输入独立复核；本轮没有修改生产文件、正式 Evidence、Git 或产物。

### S10（high）重建生产 RecoveryHost 可绕过未收束的恢复租约，旧写入覆盖新恢复

**位置**：`src/shared/storage/recovery-transaction.ts:186`、`:236`，相连工厂 `src/app/recovery.ts:95`、`:117`，启动门 `src/app/recovery.ts:51`。

`recoveryLeases` 是模块局部、按 `RecoveryStorage` 对象身份索引的 WeakMap。取消时 `runRecoveryTransaction` 返回有界结果并保留原 storage 的租约，这对同一个 host 有效；但 `recoveryStorage(app)` 每次返回新包装对象，`createRecoveryHost(app)` 每次构造新 host。同一个 App、同一个底层 vault adapter 已足够绕过检查，无须不同 Vault 或多个真实设备。`recoverBeforeStart()` 仅检查磁盘 journal；在 drain 阶段取消尚无 journal，所以新 host 的启动门也不会挡住该旧写入。RecoveryHost 的直接替换写没有进入 JsonStore 的共享 write queue，离线 owner 也不排空那个队列。

**真实生产调用链与满足条件**：

1. 自动化模块已加载、历史为空且无活动任务。用户关闭自动化时，`src/app/modules/registry.ts:236` 的 deactivate 在 `await instance.dispose(reason)` 结束之后才 releaseContext，因此异步 shutdown 尚未结束时恢复 owner 仍注册。`src/modules/automations/module.ts:217` → `src/modules/automations/services/runtime.ts:271` → `AutomationService.setExecutionEnabled(false)` / `shutdown()` 是实际停用路径；`core/service.ts:945` 即使无运行仍提交历史。
2. adapter 的该次主文件写迟迟未完成。此前已计算出的空历史内容停在 JsonStore 主写中，定义/运行 BUSY 为空。此时备份恢复进入真实 owner drain，用户取消或达到有界超时。旧 host 后续恢复正确返回 RECOVERY_PENDING，但旧写仍存活。
3. 用户卸载并重新启用插件：`src/app/main.ts:258` 的同步 onunload 不等待异步清理；`registry.ts:214` 的 disposeNow 对 active 模块也不等待，对已经 disposing 的模块直接跳过。新 onload 的 `main.ts:110` → `recovery-start.ts:14` 重新创建 host。自动化开关已关闭，新实例不加载其 JsonStore；备份导入按 `services/backup/owners.ts:11` 的 offline owner 处理该文件，因此不会因同 key 的 JsonStore.load 队列而等待旧写。
4. 新 host 从合法业务包导入含一条历史结果的 automation-runtime，返回 done，回读该历史确实存在。之后旧 adapter 写完成，主文件恢复为空 runs，新导入的有效历史从正常读取路径消失。`.backup` 可能仍留有数据不改变主文件及成功回执被破坏的事实。

**独立实证**：`/tmp/huhu-009-final-data/late-writer.test.ts` 使用真实 `createRecoveryHost`、`AutomationService`、`automationRecoveryOwners`、`buildPackage`、`runImport`，只以内存 adapter 的 Promise barrier 控制一次物理主写，owner drain 包装只发出进入信号并调用原实现。最后版本先执行真实停用路径的 `setExecutionEnabled(false)`，随后挂起 `shutdown()`；没有 sleep、私有字段改写、假的 recovery.run 或手工模拟恢复写。断言顺序为旧 host CANCELLED、同 host RECOVERY_PENDING、新 factory host 导入 done 且 retained-result 存在、释放旧写后 runs=[]；1/1 通过。这是公共生产接缝的可控故障实验，不冒称已经在真实 Obsidian 中重现热重载。

**通过条件**：同一实际底层存储/App 的重建或插件热重载不得在旧写入/cleanup 尚未收束时开始另一恢复；隔离必须在旧实例异步尾部与新实例之间真实共享，单纯缓存一个当前模块中的包装对象或 WeakMap 不足以证明跨模块重载。也可采用等价的可验证 fencing/排空方式，但不能把有界取消改回无限等待或把旧写丢弃。以现有反例验证新恢复被准确拒绝/等待至安全状态，或旧写被可靠阻止；旧尾部收束后恢复可正常执行且导入历史保持。这里要求的是已存在同 App 生命周期接缝，不要求另建跨机器锁架构。

### S11（high，与007交叉核验）合法包的只读预检污染全局 Object.prototype

位置：`src/modules/agent/core/backup/settings-codec.ts:133`。portable codec 用 Object.fromEntries 保留合法JSON自有的 `__proto__` provider key；merge 的 `rows[id]` 是继承属性读取，普通对象上的该 key 返回 Object.prototype。随后 AGENT_ENTRY 写入直接修改全局原型，不需要导入提交或持久写。

007 的独立原件 `/tmp/huhu-007-final-overall/prototype-public.test.ts` 走 buildPackage → serializePackage → inspectPackage → 真实 World / preflightImport。合法摘要包的 `agent.agents.agents.__proto__` 携 enabled=true、accountId=review-polluted、permissionMode=manual；日志 `/tmp/huhu-007-final-overall/prototype-public.log` 明确 no error、mutations=0，却出现 Object.prototype 自有 enabled，普通空对象继承 accountId/permissionMode。安全断言失败，原执行者回执 exit126。本reviewer已读取原脚本/日志并逐行核对该输入没有被import提前拒绝，未重复执行，原始实验归属007，整体合并不得重复计数。

满足条件：导入codec所有键控对象必须只读取自身项且不能通过危险原型键修改运行时原型；真实只读预检应无内存/持久副作用。增加公开包边界回归，确保预检及实际导入前后 Object.prototype 不变且正常provider配置仍可往返。S01原“任意本机字段覆盖”场景已修复不等于整个新codec可判安全。

## 产物与验证

<a id="specification-output"></a>
Reviewer: codex:/root/review_data
Axis: specification
Result: request-changes
Input-SHA256: 69e01201a2aa5f8cf6d0435c41714811ccb45e6b9d8921a21c42e0fe6b4e8583
Observed: Spec3.8、AC-050/051及implementation-contracts第6节要求停止旧writer并避免旧写队列覆盖恢复结果；S10实证违反该保证。P01至P08原场景已关闭，P09仅有界等待部分满足；另核实007的预检原型污染也违反只读预检及无副作用保证。

### P09（high，保留）有界取消后仍须隔离真实旧 writer

规范依据为 Spec §3.8 / AC-050 / AC-051、NFR-001，及 `implementation-contracts.md` §6「活动与一致性」：冻结/排空有界、失败保留有效数据；所有参与 owner 停写后才共同快照；内存、写队列与 JsonStore 基线同步采用，防止旧写回覆盖恢复结果。新代码已经满足默认 30 秒/最大 120 秒提交前预算、AbortSignal、缺 timer fail-closed、迟到 quiesce/stage 不提交、迟到 prepared journal 收束、提交点后完成原子事务。缺口只保留 S10 已实证的旧 writer 生命周期隔离，不重复计数为多个独立缺陷。用户看到新导入 done 后旧 shutdown 又清空主文件，不能以“same RecoveryStorage 限定”或作者报告中的边界声明豁免。

规范轴另保留与S11相同的高风险：合法包的只读inspect/preflight不应修改全局运行状态，见Spec §3.8与合同§6的inspect/preflight和无副作用边界；以该公开回归无污染为满足条件。原实验由007持有，此处不拆成第二根因。

### 上轮发现逐项关闭记录

| 原发现 | 本候选结论与独立依据 |
|---|---|
| S01 / P01 | 关闭。`settings-codec.ts:105` 让导入也经过递归 portable allowlist；标量、枚举、数组/map 类型受控，现有本机配置保留。已读 roundtrip 的合法摘要恶意包回归（`:373`），定向运行通过，覆盖 shell/env/参数/授权与非法嵌套内容。 |
| S02 / P02 | 关闭。`settings-codec.ts:134` 比较原/新有效权限，inherit 解析真实 global；units `:131` 的 manual→inherit/global yolo 及降低权限回归通过。没有仅按字面 rank(inherit) 放行。 |
| S03 / P03 | 关闭。`export.ts:186` 主文件不存在时读 backup 并执行同一有效性校验；设备设置 `.json.backup` 纳入发现。roundtrip `:401` 用真实 SpaceService 从 backup-only 加载并往返，`:482` 验证离线设备枚举；通过。无法解析的现存主文件仍明确拒绝，不静默导出空集合。 |
| S04 / P04 | 关闭。`records.ts:84` 仅重绑定记录 owner、Vault、授权；不再递归改写 session.nativeImport.deviceId。roundtrip `:102` 保留完整来源 tuple，`:462` 验证两个来源设备相同 native id 的引用不被合并；通过。 |
| S05 / P05 | 关闭。`service.ts:270` / `:314` 在 save/remove 全异步生命周期计数，finally 才减；`:162` / `:179` / `:185` 分别覆盖 quiesce/preflight/drain。四种 saved/source save/remove barrier 与稳定 BUSY 错误回归通过，已接纳定义操作不会在冻结后部分写入再失败。 |
| S06 / P06 | 关闭。`import.ts:111` 进度 key 绑定目标设备；`:182` 要求步骤路径与计划精确匹配；loadProgress 核对存在性和摘要。failure `:568`–`:607` 及后续步骤夹具覆盖全缺失/部分删除/已修改、伪 marker、目标设备变化和最终报告收敛，通过。 |
| S07 / P07 | 关闭。`export.ts:162` 记录包括缺失 primary/fallback 的全部读取，`:169` 记录所有实际设备/定义目录清单；复读内容与排序后的 files/folders。新增设备、原缺失 section、新定义及既有外部内容变化回归通过。保证限定为真实观测到的漂移拒绝，没有将双读冒充跨进程强锁。 |
| S08 / P08 | 关闭。`store.ts:141` / `:166` 在 recipe/内存变更/notify 前拒绝 held/disposed；`:123` drainPending 不临时解除 held。store `:192`、`:211` 的 storage/persisted-listener barrier 及冻结更新/touch 回归通过。 |
| S09 | 关闭。`test/agent-backup/fixtures.ts:241` 使用真实 `automationDocuments.encode`，没有删 decoder 或放宽生产校验。正式 roundtrip/failure 回归通过；旧 19 项无效夹具失败不再存在。 |
| P09 | 部分修复后保留，severity 提升为 high：正式 recovery tests `:417` 起覆盖同对象 lease、never-settle 取消、迟到 quiesce/stage、prepared journal、提交后取消与无 timer；这些测试通过。新 S10 从真实工厂/生命周期证明其尚未覆盖的重建绕过。 |

### 审查范围、方法和输入

- 使用 common code-review Skill，source-discovery、Fowler、risk、reviewer-contracts、review-evidence 及 dev 的持久化/模块边界/测试规则；复用本审查者 003 已完整读取的规范/设计/ADR与实现上下文，复读本轮 TASK、review-input、003/006 报告、当前 §3.8/合同§6及关键代码。003 的 request-changes 和旧未完成 123 均未作为 pass。
- 冻结基线 33c21e098ef3188cbab5a09f3e0a01fadb787715；observed HEAD 78102da2811953e72fe317cd08cd91311d9cac0d。`verify.mjs` 对453项 working_snapshot 的现有字节/删除状态和20来源（含5个规范锚点）计算 SHA256，全部匹配；Input 摘要严格使用 JSON.parse 后 JSON.stringify，不使用格式化文件字节。
- 本轮覆盖备份格式/设置codec/重绑定/源枚举/分步导入、恢复状态机/生产 host/启动与卸载路径、SettingsStore/AutomationService 与离线 owner，及原迁移与浏览器旧消费者的相关回归；额外检查了 JsonStore per-path write queue 与 private storage 转发身份，排除“新 settings load 会先排空”的错误反例。正常同 host 动作确实固定 storage，Space 自有物理 owner 也有独立 fencing；这些事实不能替代自动化关闭后的离线恢复隔离。
- 另排除了 prepared rollback 随意覆盖后来普通写入的猜测：现有 prepared-origin digest 检查保留 foreign edit。`RecoveryHost.settled()` 只等待有界返回仍值得与 S10 一并检查，但本报告不在未独立证明额外数据损失时另列一个 finding。

### 实际命令、结果与原件

1. `node /tmp/huhu-009-final-data/verify.mjs`，exit 0；`verify.log` 记录 input digest、453路径、20来源、errors=[]。
2. `pnpm exec vitest run --config /tmp/huhu-009-final-data/focused.config.mjs`，exit 0；`focused.log`：9 文件187测试通过。配置只运行 recovery-transaction、app recovery、Space recovery owner、legacy-migration、agent-backup 三文件、settings store、automation backup；cache/setup 均隔离且不build。187为测试运行数，failure复用roundtrip helper会带入重复注册，不称为187个独立产品场景。
3. `pnpm exec vitest run --config /tmp/huhu-009-final-data/vitest.config.mjs`，最后版本 exit 0；`late-writer.log`：1 文件1测试通过，即缺陷反例成立。最后源码使用真实停用→shutdown且完全由barrier推进；更早 clearHistory/短延时探索版本没有作为生产可达性依据。供实现者转正式回归的准确脚本为 `/tmp/huhu-009-final-data/late-writer.test.ts`。
4. Root 最后 `test/agent-migrations/legacy-browser.test.ts` 改动已逐行核对：beforeEach 注册 host timer、afterEach 还原；两个真实迁移/SpaceService/Browser layout 断言完整保留，未放宽。`pnpm exec vitest run --config /tmp/huhu-009-final-data/focused.config.mjs test/agent-migrations/legacy-browser.test.ts`，exit0，1文件2测试通过；原始日志 `/tmp/huhu-009-final-data/legacy-browser.log`。
5. 只读核对 Root `evidence/final-checks/results.json` 和 `vitest.log`：最终全量确已结束，exit0，512文件通过/4跳过，4873测试通过/42跳过；前次失败日志仍保留。该全量由Root执行，并非本reviewer重跑。它没有覆盖 S10，因此不能替代本次缺陷结论。

未运行真实 Obsidian 热重载、真实 Provider/账号或五平台 E2E；以上为注入故障的生产公开接缝测试。没有重跑全量、构建/native/lint/UI浏览器；Root的这些门禁和用户的真实宿主验收各自保留责任范围，不因分工本身新增缺陷。

## 问题与下一步

两轴均 request-changes，仍阻塞本数据范围通过的是 S10 / P09 的同底层存储生命周期隔离，以及S11所引用007实证的预检原型污染。Lead 已通过原生消息收到反例与生产链，计划让实现者处理稳定 host/隔离，不由审查者修复。修复后应冻结新的真实输入，至少重跑确定性反例、取消/超时/迟到quiesce/prepared/commit门槛和原数据回归，确认旧尾部收束后可继续恢复。没有待用户决定的新产品问题，没有提交/推送/发布请求。

本报告按当前冻结输入一次性交回；其completed仅表示独立审查任务完成，不表示业务可验收或Ticket已done。唯一仓库写入为本REPORT，反例、配置与日志仅在指定/tmp目录。
