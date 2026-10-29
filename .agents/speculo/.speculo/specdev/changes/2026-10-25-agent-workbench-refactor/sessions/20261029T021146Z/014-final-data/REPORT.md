# 任务回报

Session: 20261029T021146Z
Task: 014-final-data
Status: completed

## 聚焦交接

本轮数据支持审查两轴通过；009 的 S10/P09（G-S02）跨重载旧写覆盖和 S11（G-S01）合法包预检原型污染均已关闭，原 S01–S09 / P01–P08 没有在本候选重新出现。已独立核验456个冻结路径和20项来源，生产公开接缝的定向回归、原型污染原始反例及保留租约故障实验均完成。retainLease 线索得到实证区分：不可恢复错误后的保留租约会阻止仅重开插件，完整进程重启才以磁盘 journal 收敛；这与当前明确的进程/Obsidian 重启恢复合同一致，不凭保守 fail-closed 边界新增缺陷。下一步由012整体审查者合并本范围结论；本报告不代替真实宿主或整个交付的最终验收。

## 产物与验证

<a id="standards-output"></a>
Reviewer: codex:/root/review_data
Axis: standards
Result: pass
Input-SHA256: ad85880384c79e07d781e6b18ac4fa97a9585bce88009432d825b4f295c476e7
Observed: 456路径及20来源摘要全部匹配；真实adapter稳定carrier覆盖factory重建与模块reload的startup/settled/run准入，旧尾部收束后恢复成功；合法包预检与导入不再污染原型。定向200测试、影响闭包10测试、独立2项实验均exit0，本支持范围无未关闭medium以上发现。

### 独立身份与冻结输入

审查者仍为 codex:/root/review_data、Astra/high，未参与被审实现；没有递归派遣。实际实现者包含原 Codex/Claude 及实现子agent、用户提交、当前 Lead 和 repair_native/workbench/data；011/010报告只作为导航，未以实现者自评替代源码和回执。继续使用 common code-review Skill 的 source-discovery、Fowler、risk、reviewer-contracts、review-evidence，以及项目 dev 的持久化、模块边界与测试规则；复用已完整读取且未变的 Spec/DESIGN/ADR/合同，复读本轮 TASK、review-input、011修复报告及与本数据范围相交的010记录变更。

工作区 current `/home/wta/orca/workspaces/obsidian-huhu/terminal`，分支 NAMEWTA/terminal；base 33c21e098ef3188cbab5a09f3e0a01fadb787715，实际 HEAD 78102da2811953e72fe317cd08cd91311d9cac0d。`/tmp/huhu-014-final-data/verify.mjs` 对 working_snapshot 的所有现有文件字节/删除状态和20个来源（含Goal五段明确锚点）重新计算 SHA256，初次及结束复核均 errors=[]。Input 摘要按 JSON.parse→JSON.stringify 计算，与TASK一致，不使用格式化文件字节摘要。

本次逐项比较009和014冻结快照，复用未变数据路径的有效先前审查；新影响闭包重点为 settings-codec、recovery transaction/contracts、write queue、app factory/startup/settled、对应真实业务包与生命周期测试、文档恢复边界及记录codec新增 neverStarted 的备份兼容。历史UI/native来源修复的完整结论由013/012负责，本报告只核对其与业务数据、来源保存的交点。

### S10 / P09 / G-S02：关闭

- 稳定身份现有真实落点：`src/shared/storage/write-queue.ts:50` 的 queue 通过 `Symbol.for('huhu.storage.write-queue')` 附在底层 adapter；`:66` 将普通对象形式的 recovery state 挂到同一个 queue 的第二个全局Symbol。新模块实例会从旧 queue 读取同一 carrier，不依赖模块 WeakMap、class instanceof 或新模块缓存。
- 桌面私有存储旧包装 `src/host/private-storage.ts:29` 已转发底层 queue；`src/app/recovery.ts:120` 新增 recovery wrapper 转发。正常App的 FileSystemAdapter/虚拟adapter 路径均由此落到相同实际 carrier，工厂仍返回不同包装对象，未用“当前模块缓存工厂”掩盖重载问题。
- `recovery-transaction.ts:159` 的 recoverPending 在读journal前检查并占有共享 lease；`:198` 提供加载准入；`:251` 的 run 使用同一 state。`RecoveryHost.settled()` 同时检查自身 gate 与共享隔离；recoverBeforeStart 遇到仍在收束的 RECOVERY_PENDING 保持可重试，而不会误设为永久不可恢复门。
- `:258` 的 lease 覆盖真实 operation、迟到 adapter/owner等待及cleanup。正常成功返回还等待清理，取消仍有界返回；最终 owner release 完成前不放行新操作。原有取消、迟到quiesce/stage、迟到prepared journal、提交点后不再取消和无timer拒绝回归全部保留。
- 独立回读并运行 `test/agent-backup/recovery-lifecycle.test.ts`：沿原009公开接缝使用真实 AutomationService.load→setExecutionEnabled(false)→shutdown、真实owner drain和真实createRecoveryHost；只用barrier挂起一次runtime主写。工厂重建与vi.resetModules两分支都证明 startup、settled、offline runImport、run 在尾部未完时拒绝；不同真实adapter仍可工作；释放旧写并完成cleanup后同一个新host可启动、导入 retained-result，旧host也settled且结果不再消失。测试不使用sleep、假recovery.run或私有状态重写。
- `src/app/recovery.test.ts` 追加的正常final-release barrier与已有不可恢复gate错误优先级回归通过。由此关闭原009实际可达的迟到shutdown覆盖，而非只证明同storage对象的小范围隔离。

### S11 / G-S01：关闭

`src/modules/agent/core/backup/settings-codec.ts:21` 的 ownRecord 将输入的自有可枚举项复制到 null-prototype 字典；portable顶层、group、provider row、quick command，以及merge的base/current/rows/existing均不再使用继承属性作为可写对象。`:135`–`:141` 对动态provider键的读取指向独立记录并使用Object.hasOwn；`__proto__`、constructor、prototype 可保留为安全的自有数据，不会通过继承别名取得 Object.prototype。

正式 roundtrip 测试以有效摘要包走 buildPackage→serialize→inspectPackage→preflightImport→runImport，比较原型属性描述符、设置句柄、磁盘mutation，并验证正常账号/本机Shell/字体仍正确；多种reserved key与继承字段回归通过。另将007原始公开预检反例原样复制到本任务/tmp，独立重新执行；它原来失败的“Object.prototype不增加enabled”断言现通过，普通预检没有原型污染。没有仅依靠禁止单个键、放宽格式校验或绕过真实导入路径。

### 原发现逐项保持关闭

| 原编号 | 当前依据及新影响检查 |
|---|---|
| S01 / P01 | 导入仍先调用portable白名单codec；本机shell/env/路径/参数/授权字段不能被有效摘要恶意包替换。新ownRecord只收紧键读取；合法字段往返、嵌套类型与本机字段保留回归通过。 |
| S02 / P02 | merge仍比较原/新有效权限，manual→inherit不会借目标global yolo升权；当前units和真实往返通过。新无原型字典不改变有效权限判断。 |
| S03 / P03 | exporter主缺失读取有效backup、backup-only设备枚举保持；真实Space owner往返与离线设置设备回归通过。无效已存在集合仍拒绝，未换成空数组。 |
| S04 / P04 | rebaseRecords仍只重绑定业务owner/Vault/grant，不递归改写native来源device；不同来源设备同native id的完整引用回归通过。记录codec新增neverStarted保持可选向后兼容，原生来源tuple没有被删除或改属；records测试拒绝该证明与已有lastAttempt矛盾。 |
| S05 / P05 | AutomationService整个save/remove/source更新已接纳生命周期计数不变，preflight/quiesce/drain均检查；四个定义barrier及BUSY回归通过。 |
| S06 / P06 | progress绑定目标device、严格步骤路径、存在性与摘要；全缺失/伪marker/部分删除/后来编辑和最终报告回归通过。 |
| S07 / P07 | 所有实际读取（含缺失primary/fallback）与设备/定义枚举清单复读不变；外部新增设备、section、定义和既有内容漂移均拒绝回归通过。双读没有被当成跨进程强锁。 |
| S08 / P08 | held/disposed在recipe/内存/notify之前拒绝，drainPending不临时开放写入；settings storage/persisted-listener barrier通过。 |
| S09 | 正式fixture继续使用automationDocuments.encode，生产decoder未放宽；roundtrip/failure及Root最后timer依赖注入后的legacy-browser测试通过。 |
| S10 / P09 | 原跨重载绕过已关闭，理由与实证见上；保留不可恢复错误的进程重启边界见下。 |
| S11 | 合法包原型污染关闭；既有007反例重新执行green，正式覆盖预检及实际导入。 |

### retainLease 线索的实证和判定

`recovery-transaction.ts:260` 对 closeFailed 所标记的 retainLease 不删除state.lease，即使该Promise已经resolved。独立 `/tmp/huhu-014-final-data/retained.test.ts` 用真实生产工厂执行一项恢复，只在done journal写注入一次临时错误：run准确返回UNRECOVERABLE、owner没有release、journal停在committed。显式等待共享lease完成后，用vi.resetModules及同adapter重建host，recoverBeforeStart仍返回RECOVERY_PENDING；这不是仍有迟到IO，也不能描述为“所有尾部完成都会自动解封”。

同实验随后仅复制完整磁盘字节到无live carrier的新adapter，模拟完整进程重启后不存在旧owner/queue内存的边界；recoverBeforeStart得到rolled-forward，数据为new、journal=done，settled成功。该实验只证明公开接缝的两类生命周期结果，不冒充真实Obsidian重启E2E。

不列为medium缺陷的依据：closeFailed属于提交/journal/cleanup无法确认时保持关闭的分支，Spec §3.8及合同§6要求无法确定时保持恢复门；现有 `docs/data.md`「失败与恢复」明确进程终止后启动恢复并使用“重启Obsidian”，未保证所有不可恢复故障仅重开插件即可解封。保留shared carrier防止旧owner在同进程下不明状态被新实例绕过，完整进程重启可按durable journal收敛，满足当前合同。普通取消且cleanup成功与此不同，真实生命周期回归已证明它在尾部结束后无需完整进程重启即可继续。报告明确这项边界，不把它的短错误文字earlier-operation-unsettled当成还有真实IO的证明；无须为通过而修改原合同或放松隔离。

### 实际命令、回执和原件

1. `node /tmp/huhu-014-final-data/verify.mjs`：exit0；`verify.log`记录456路径、20来源、errors=[]，结束复核再次一致。`git rev-parse HEAD` / `git branch --show-current` exit0且与冻结上下文一致。
2. `pnpm exec vitest run --config /tmp/huhu-014-final-data/focused.config.mjs`：exit0，12文件200测试通过，原始 `focused.log`。运行时配置范围为write-queue、recovery transaction/app、Space recovery owner、legacy-migration/browser、四个agent-backup测试文件、settings store、automation backup；cache在本任务/tmp，未build。
3. 为补齐记录codec新影响及剩余旧layout迁移，配置追加两个include后执行 `pnpm exec vitest run --config /tmp/huhu-014-final-data/focused.config.mjs test/agent-migrations/legacy-layout.test.ts src/modules/agent/services/spaces/records.test.ts`：exit0，2文件10测试通过；`closure.log`。这不是重跑全量或把上一命令数字变更为最终配置的执行数。
4. `pnpm exec vitest run --config /tmp/huhu-014-final-data/probes.config.mjs`：exit0，2文件2实验通过；`probes.log`。脚本为 `prototype-public.test.ts`（007原始公开反例重跑）及 `retained.test.ts`（本轮独立故障与重启语义实验）。正式测试与/tmp实验均只有内存/临时存储，没有操作真实库/账号。
5. 只读核对Root `evidence/final-checks/results.json`、`vitest-candidate3.log`：候选3全量已结束，exit0，513文件通过/4跳过，4889测试通过/42跳过。此命令由Root执行，本reviewer未重跑全量；更早失败原件没有被这个结果删除。Root的构建、native/helper、Chrome及其余门禁由整体owner合并，不冒称本reviewer执行。

上述runner测试数量包含原failure复用roundtrip helper的重复注册，不声称等量独立产品场景。未执行真实Obsidian/Provider/五平台验收，未build、未跑共享cargo、未生成或修改根产物。用户负责的真实宿主验证按Spec §11保留，不因分工本身判定缺陷。

## 问题与下一步

<a id="specification-output"></a>
Reviewer: codex:/root/review_data
Axis: specification
Result: pass
Input-SHA256: ad85880384c79e07d781e6b18ac4fa97a9585bce88009432d825b4f295c476e7
Observed: 本数据支持范围内Spec3.8、AC-050/051、NFR-001及跨owner合同6的原发现全部关闭；真实旧writer跨factory/reload隔离与无副作用预检已获验证，保留不可恢复门后的完整进程journal恢复亦通过公开接缝实验。未发现新的明确规范缺口，真实宿主验收仍按Spec11由用户完成。

本轮无未关闭medium以上发现，也无需另列的low缺陷；retainLease行为作为已验证的恢复边界如上完整保留。两轴pass仅覆盖本任务分配的数据/迁移/备份/恢复/相连自动化与旧消费者范围；由012结合其他支持报告形成整个交付结论。没有等待用户新增产品决定的阻塞。

唯一仓库写入为本REPORT，采用同目录临时文件无覆盖落盘并回读；脚本、配置、日志仅在 `/tmp/huhu-014-final-data/`。没有改生产、正式Evidence/TASK/Map/Goal、Git index、提交、推送或发布。completed仅表示审查报告交回，不自行把Ticket或业务验收改为完成。
