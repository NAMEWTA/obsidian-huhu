# 任务回报

Session: 20261104T095541Z
Task: 083-rereview-t18
Status: completed

## 聚焦交接

已完成 T-18 修复候选的独立高风险复审，两轴均为 request-changes。原 F2 的提交事实和 F3 的包体问题可关闭；原 F1 的带标记篡改反例已拒绝，但删除标记后通用恢复仍可越过范围证明，因此 F1 尚未关闭。另发现懒加载扫描 facade 丢失订阅者异常隔离的 minor 回归。当前相关 160 项测试、类型、lint、架构、安全和原预算门禁均通过；这些绿色不替代两个实际探针反例的修复。请修正后重新冻结复审，completed 仅表示本次审查已交付。

## Review

- Risk: high；Strategy: independent；Independence: required，当前 reviewer 未参与实现或修复。
- Review-Mode: working-tree；Base-SHA / Observed-HEAD 均为 `29644dc5833bb209e6282f84fa71441a5a1b99d4`，current/dev。
- Input-SHA256: `dbb95667788cdd09f6d6141a5b304456805ca1434b1f9708312879374d28ee21`。完整读取 TASK；起始 sha256sum --check、中途及报告前均为 27/27 匹配。review-scope 显式选择 27 路径，退出 0。
- 对照 079 摘要，修复改变 health api/core repair/module 和 archives runtime/repair/test，并新增四个 lazy facade 源码/测试；本次还把既有 recovery.ts 纳入冻结范围。读取 081 交接，复用 079 已读且未变的 Ticket、Spec AC-621–623/§6、ADR/Map/Goal/CONTEXT、dev 与审查合同；dev 摘要仍为 `d217057f…`。
- 重点追踪 runtime journal 读取→原件证明→context→process、专用和通用恢复、尝试/确认提交观察、unknown 回执与结果汇总、首次加载/取消/关闭/订阅。重放原探针输入，额外覆盖可删标记及新 facade 边界；所有故障与篡改仅在内存夹具，不修改业务源码。

## Standards Axis

Result: request-changes

### F1 — major（未关闭）：删除 journal 标记可使通用恢复跳过范围证明

- 文件:行：`src/modules/archives/services/generic/repair.ts:130`；调用点 `src/modules/archives/services/generic/runtime.ts:416`；执行入口 `src/modules/archives/services/generic/recovery.ts` 的 execute。
- 修复有效部分：保留 healthRepair 标记时，原 F1 的 category/正文篡改现在报 invalid-repair，源字节不变；新测试还覆盖合法历史篡改、专用/通用继续与回退及预检后替换。
- 剩余问题：证明是否执行，仍由同一可修改 journal 内的 `healthRepair` 属性决定。该属性不存在时直接返回 undefined，runtime 不绑定任何范围证明；通用 resumeOperation 不要求该标记，也没有恢复阶段的归物受保护字段对比。因此仅删除标记即可恢复旧旁路。
- 复现：`node /tmp/huhu-083-repair-probe.mjs` 从原 079 探针重编译当前生产代码。正常 owner 修复因首次源写失败留下事务；修改 journal.after 的 category 与自由正文、重算 afterHash，保留原 beforeHash/schema/目标/备份。先调用专用 recover，实际得到 invalid-repair 且源不变；随后只再删除 operation.healthRepair，调用真实 `application.commands.resumeOperation({operationId})`，返回 committed:true，源 category 变成 UNRELATED REPLACEMENT，`originalBodyPreserved:false`。
- 影响：仍可把原本只允许投影纠正的恢复目标变为无关用户内容写入；保护不能依赖数据文件中可删改的分类标记。当前新回归始终保留标记，未覆盖此变体。
- 建议：在实际通用恢复边界，依据原件/备份、schema 与 before/after 的实际差异重验归物升级保护；涉及投影改变时必须满足有限修复的精确范围证明，不以 healthRepair 是否存在来选择是否保护。继续保留合法通用升级能力；增加删标记、改标记、通用继续/回退及原子执行前替换的拒写回归。

### F4 — minor（新增）：LazyHealthScanner 的订阅通知可打断 scan 并丢失返回 Promise

- 文件:行：`src/modules/health/services/lazy-scanner.ts:41`；触发点 `src/modules/health/services/lazy-scanner.ts:35`、`src/modules/health/services/lazy-scanner.ts:33`。
- 问题：新 facade 的 emit 直接调用监听器，没有原 HealthScanService.emit 的逐项异常隔离。scan 已创建并启动 this.work 后同步 emit；一名订阅者抛错会在返回 Promise 前向外抛出，而后台扫描继续。finally 再通知时也会令内部 work 拒绝，调用方没有拿到该 Promise，存在未处理拒绝风险，其他监听器也无法收到更新。
- 复现：同一只读探针创建真实 LazyHealthScanner，订阅一个抛出 consumer-listener-failed 的监听器，再调用 scan。观察 `returnedPromise:false`、同步和内部异步错误均为该异常，但 `reportCreated:true`。相同端口/监听器使用原 HealthScanService 的对照运行无错误且正常产出报告；探针显式接住内部 work，仅用于避免诊断自身泄漏拒绝。
- 影响：预算修复新增的 facade 改变了原扫描服务对消费者故障的隔离行为，订阅者错误会被误当作扫描调用失败。
- 建议：在 facade emit 中逐个隔离监听器异常，保留其他订阅者、admission、完成与清理通知；增加首个监听器抛错、后续监听器仍收到更新、scan 正常返回/结算的回归。无需修改业务扫描结果或吞掉真正的扫描错误。

### 原 F2 / F3 关闭证据

| 前轮项 | 实际复核 | 结论 |
|---|---|---|
| F2：已提交被误报为 false | 原双重 I/O 故障输入重放后，源已变、回执 committed:true / rechecked:false，批量为 partial。新增真实测试另覆盖 process/readback 结果不确定时 committed:'unknown'；API、白名单、保留结果与汇总均显式区分 true/false/unknown。原子 CAS 拒绝仍保留 false，未放宽断言。 | closed |
| F3：health 激活超限 | 本轮亲跑正式 `pnpm check:bundle` 退出 0，原预算整体 within limits；health activation 6.4 KB、deferred 10.8 KB。扫描/修复实现位于 services 的第二层动态 import，无阈值或分析入口改动。首次取消与加载中关闭测试通过。 | closed；新 facade 的 F4 另计 |

## Specification Axis

Result: request-changes

| 合同 | 本轮结论 |
|---|---|
| AC-621 / 有限修复范围 | 正常预览、显式单次确认、owner CAS、备份、复查与恢复链路测试通过；F1 删标记的通用恢复仍执行越界目标，不能签整条有限修复链通过。 |
| AC-622 | 旧来源哈希、提交竞态、根变化和脏编辑器保护回归通过；带标记 journal 篡改已被拒绝。F1 仍缺少不依赖可修改标记的恢复范围证明。 |
| AC-623 | 原提交事实丢失反例已修复，已确认 true 与未知 unknown 均保留，批量正确为 partial；原正常部分成功/冲突、恢复入口、后续编辑拒绝回退覆盖测试通过。 |
| OOS-007 / 旧保护 | 未移除通用 save/prepareUpgrade 的归物字段保护，未新增清空坏文件、删无端点关系、毁密文或清理未完成备份的入口；F1 仍是恢复旁路，须关闭。 |

F4 属标准轴的扫描服务回归；规范轴 request-changes 的直接原因是 F1 未关闭。没有因 F1 保留而否定 F2/F3 已取得的修复事实。

## 回归与影响核查

- 证明从匹配 beforeHash 的备份/原件推导精确 patch，带标记的候选保留 schema、历史、非投影字段与正文；证明绑定本次 context 并在 process 内检查精确原件/候选。F1 是识别条件缺口，不是这些带标记校验全部无效。
- attempt/confirmed 观察在 finally 释放，停止时清理；确认 readback 后的提交事实不再依赖后续补读。unknown 不能成为 verified，实际 health/owner 测试覆盖 retained results 与 recoveryId。
- public facade 仍提供同步 results/preview；扫描 admission 立即可见，首次加载前取消、加载中关闭、lease 撤销与真实 registry 服务装配测试通过。原有通知/脱敏与只读扫描回归保持。
- 081 报告中的写集外人物页面测试和两套类型阻塞在本次工作区重跑时已不再出现：本轮测试和类型均退出 0，不沿用旧 blocked 状态；也未越界修复那些文件。
- 没有新增产品文案、外部依赖或 bz 改编，health/i18n 与 079 冻结摘要一致；复用相应已核对的词典/来源事实，不宣称本轮重跑了 i18n 或许可门禁。UI/通知 opener 属 T-19，不在本票验证结论中。

## 产物与验证

本次唯一仓库写入为本 REPORT。未改业务/测试/冻结 TASK/旧报告、正式 Evidence/Ticket/Map/Goal、预算、依赖、main.js/styles.css 或永久知识；未执行 Git 写操作、安装、build/build:css/notices、提交、推送或发布。新探针从原 079 脚本复制到 /tmp，保持原文件与输入源码不变，只调整复审期望并加入边界探针；内存 esbuild write:false，不运行旧的预编译候选。

| 命令/检查 | 退出码 / 实际结果 |
|---|---|
| TASK 27 文件 SHA-256，多次 | 0；全部匹配。 |
| `pnpm exec vitest run src/modules/health src/modules/archives test/golden/archives-v2.test.ts test/archive-relation.test.ts` | 0；26 文件、160 测试通过，无快照更新。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 0。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 0。 |
| `pnpm run lint` | 0；全仓零警告。 |
| `pnpm test:architecture` | 0；1338 模块，无违规。 |
| `pnpm test:safety-regressions` | 0；现有安全回归通过。 |
| `pnpm check:bundle` | 0；原预算整体通过，health 激活 6.4 KB，见 F3 关闭记录。 |
| review-scope：working-tree、指定 base、TASK 27 路径 | 0；显式范围/base/head 正确。 |
| `node /tmp/huhu-083-repair-probe.mjs` | 0；断言确认原带标记 F1 被拒绝、F2 已保留 true/partial；同时实际复现删标记恢复旁路及新 facade 订阅异常，包含原核心扫描器对照。不是产品全部通过。 |

本地过程材料（纯路径）：

- /tmp/huhu-083-repair-probe.mjs
- /tmp/huhu-083-repair-probe-result.json
- /tmp/huhu-079-repair-probe.mjs（未改的原输入脚本）

未运行全仓 pnpm test、统一产物重建、真实 Obsidian、真实文件系统故障/重启恢复或 T-19 UI E2E。本票 E2E disposition 为 not-required；内存文件端口验证实际命令逻辑，不能冒充真实宿主验收。

## 问题与下一步

无审查环境阻塞，27 个冻结输入未漂移。F1 仍是高风险未关闭项；修复通用恢复的实际差异约束，并补删标记回归，保持原件/备份、CAS 与通用升级保护。修复 F4 的通知隔离后重跑相关恢复和 lazy facade 测试及原预算，再冻结复审；本报告不修改正式状态或 Evidence。
