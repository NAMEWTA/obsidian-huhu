# 任务回报

Session: 20261104T095541Z
Task: 079-review-t18
Status: completed

## 聚焦交接

已完成 T-18 冻结候选的独立高风险双轴审查，未参与实现或修复。两轴均为 request-changes：两项 major 分别涉及恢复 journal 的有限写入范围失守、提交后 I/O 故障被误报为未提交；另有一项 minor 为 health 激活包体超过原预算。现有 145 项相关测试、安全回归、类型、lint、架构和 i18n 通过，但新增只读探针实际复现了上述两项行为反例，正式包体门禁失败。请修复并补覆盖后冻结复审；completed 仅表示审查交付，不代表 Ticket 验收通过。

## Review

- Risk: high；Strategy: independent；Independence: required，当前 reviewer 未参与实现或修复。
- Review-Mode: working-tree；Base-SHA / Observed-HEAD 均为 `29644dc5833bb209e6282f84fa71441a5a1b99d4`，current/dev。
- Input-SHA256: `64ca9064a2b2c342f603367fbecff2d5ebf5e244f328ba1b0261641bbb59613e`。TASK 完整读取；起始 sha256sum --check、中途及报告前均为 22/22 匹配。review-scope 显式选择 22 文件，退出 0；未把并行 T-15 UI 改动纳入本票。
- Basis: T-18、072/076 交接、Spec §6/AC-621–623/OOS-007、ADR-006、Map/Goal/CONTEXT、AGENTS.md、dev Skill 及已读未变的 domain-runtime、reviewer-contracts/risk-review。dev 摘要仍为 `d217057f…`。
- 展开风险检查：确认和计划身份、旧哈希与原子 CAS、owner/lease/取消、备份先于修改、恢复 journal 信任边界、提交事实与部分失败、原投影保护、脱敏与预算。沿 HEALTH_REPAIRS → owner contribution/lease → ARCHIVES_REPAIRS → ArchiveRepairService → runtime/RecoveryCommands/Operation codec 跟踪，使用真实自有实现和内存文件端口做反例；未改写生产逻辑或测试。

## Standards Axis

Result: request-changes

### F1 — major：恢复入口信任可修改 journal 的 after，未重验有限修复范围

- 文件:行：`src/modules/archives/services/generic/repair.ts:111`、`src/modules/archives/services/generic/repair.ts:113`。
- 问题：recover 只检查 healthRepair 字符串标记、schema-upgrade 种类和归物类型，然后交给通用 RecoveryCommands.execute。通用执行会核对 journal 自带 afterHash、来源 beforeHash 和 schema，却不验证目标仅纠正三项投影；执行后的 parseBelonging 也不会检查无关字段或自由正文是否改变。journal 中的 after 与 afterHash 可以同时被修改，现有检查仍全部成立。
- 可达前提：一次正常投影修复因源文件写入故障留下待恢复 journal；之后 journal 被编辑或同步成另一个格式有效的版本。源文件和原备份保持不变，beforeHash 仍正确；用户继续该 recoveryId 时，新目标已超出原预览的投影修复。
- 复现：`node /tmp/huhu-079-repair-probe.mjs`。真实 owner.preview/commit 生成恢复事务，故障注入仅阻止第一次源文件写入。然后仅在内存文件端口修改该待恢复 journal 的 owner.after：把 category 从 ORIGINAL 改成 UNRELATED REPLACEMENT，替换自由正文；同步重算 afterHash，保留原 beforeHash、标记、目标 ID/schema 与备份。新 ArchiveRepairService 实例 recover(resume) 实际写入这些无关改动，返回 `committed:true, rechecked:true, status:verified`；探针输出 `originalBodyPreserved:false`。
- 影响：专用有限修复入口可以执行超出批准影响预览的用户内容修改，且复查报成功。保留通用 save/prepareUpgrade 的保护不能覆盖该恢复旁路。
- 建议：恢复前从匹配 beforeHash 的原件/备份重新验证完整历史并推导允许的投影，确认同 schema、历史及所有非投影字节不变，目标必须恰好等于允许的精确 patch。把该验证绑定到实际执行的同一事务/原子边界，防止预检后 journal 再被替换；health 标记不能代替范围证明。任何能恢复 health 事务的通用入口也应遵守此限制。增加“待恢复 journal 改无关字段/正文/历史后拒写”的真实恢复回归。

### F2 — major：源文件已提交但故障后的补读失败，被报告为 committed:false

- 文件:行：`src/modules/archives/services/generic/repair.ts:93`、`src/modules/archives/services/generic/repair.ts:100`；影响汇总：`src/modules/health/core/repair.ts` 的 confirm。
- 问题：observedCommit 直到 RecoveryCommands.execute 完整返回才置为 true。若源文件已原子提交，但 journal 最后写 committed 状态失败，代码依赖再次读取源文件来推断事实；该读取也失败时 catch 直接归为 false。因此已发生的写入会被列为未提交，结果与恢复入口表达不一致。
- 复现：同一探针使用真实 HealthRepairService → ArchiveRepairService → RecoveryCommands 链。正常执行到 journal 写 `state:committed` 的 beforeWrite 时，注入 journal 收尾失败，并让此后的源文件 read 暂时失败；此前源文件写入及 readback 已完成。内存真实字节显示投影从 idle 变为 using、`ownerChanged:true`，但回执为 `committed:false, rechecked:false, status:failed`，整批 `batchStatus:failed`，仍附 recoveryId。
- 影响：AC-623 的逐项已提交/未提交事实错误，调用方可能把已经变更的数据当作完全未执行，误导重试及恢复选择。普通“journal 收尾失败但补读成功”的现有测试未覆盖此故障组合。
- 建议：在 owner 原子提交成功边界保留提交事实，并在恢复执行/异常结果中向上携带；journal 收尾或后续读取失败只应降低复查/收尾状态，不能抹去已确认的提交。若实际提交无法确认，应显式表达待确认恢复状态，不能以读取错误推导未提交。增加该 I/O 故障组合及批量汇总的回归。

### F3 — minor：health 激活闭包超过原包体预算

- 文件:行：`src/modules/health/module.ts:7`、`src/modules/health/module.ts:32`。
- 证据：正式 `pnpm check:bundle` 工具退出 126，原预算明确报告 `health activation 15209 > 10240`，唯一超限为 health。startup 131.6 KB、archives 269.0 KB 及其余模块没有超限；不能将整体门禁记为通过。
- 问题与影响：修复实现由 module.ts 静态导入并立即装配，当前激活路径未满足仓库既有预算门禁。076 将该门禁留给 Lead，本轮已实际运行并确认缺口。
- 建议：分析激活闭包，将适合延后的修复实现放到实际修复操作时加载，同时保留轻量公共服务、结果与生命周期语义；原样重跑预算，保持现有阈值。不要通过提高预算或仅改分析入口消除失败。

## Specification Axis

Result: request-changes

| 合同 | 实际结论 |
|---|---|
| AC-621 | 正常计划→预览→单次确认→备份/CAS→复查链路通过真实 registry/owner 集成；但恢复后不能保证仍只执行已预览的有限投影修复，F1 未关闭。 |
| AC-622 | 已有旧报告哈希、提交前变化、原子 write race、根变化与编辑器脏缓冲回归通过。F1 仍说明恢复 journal 目标本身缺少与原批准范围的绑定，不能据来源 beforeHash 正确签整条恢复链安全。 |
| AC-623 | 常规一项成功一项冲突、备份、重启继续/回退、后续编辑拒绝覆盖通过；提交后 journal 与补读同时失败的组合会把已提交项列为未提交，F2 不满足。 |
| 首批有限修复 / OOS-007 | 正常入口只声明索引重建和归物投影，未看到自动清空坏文件、删除无端点关系、销毁孤儿密文或清理未完成备份的实现；F1 可越过有限写入范围，须修正。 |
| 工程门禁 | 类型/lint/架构/i18n 通过；F3 原包体门禁失败，尚不能集成验收为全绿。 |

## 其他已核对边界

- 计划至多 100 项、五分钟过期，preview 不写来源，confirmation 单次消费；未知 reference、禁用/撤销及预先取消的现有回归通过。health 不保存原文/路径，owner 保管候选；计划与回执白名单、20 批结果副本及敏感哨兵验证通过。
- 正常投影候选从历史推导，调用 parseBelonging 验证完整历史，按 schema storageKey 只 patch status/exitDate/sale；非空历史、未知 YAML 和正文保留回归通过。F1 针对后续恢复目标，并非这些正常预览断言失效。
- entities.ts 和 belongings.ts 的冻结摘要与前轮已验收版本一致；通用 save 的受保护字段检查保留，读取 recovery.ts 确认 prepareUpgrade 仍禁止改变归物受保护投影/历史。未通过删除旧保护来实现正常修复。
- 索引重建只改内存派生状态，前后文件清单/内容摘要核对及失败恢复旧索引路径存在，现有测试证明源文件零写入；没有删除诊断源或待恢复事务。
- 模块通过公开 api.ts 装配，扫描仍只读、按需申请 lease、隔离失败。确认与修复结果发 health 类型 inbox 通知，投递失败不覆盖修复回执；通知 opener/UI 属 T-19，本轮未冒称验证。
- 本票复用本地 runtime/RecoveryCommands/生命周期规则，无新增上游代码改编、外部依赖或许可登记需求。原 scanner 的固定 bz 来源头保留。

## 产物与验证

本次唯一仓库写入为本 REPORT。未修改业务/测试/冻结 TASK/旧报告、正式 Evidence/Ticket/Map/Goal、预算、依赖、main.js/styles.css 或永久知识；未执行 Git 写操作、安装、build/build:css/notices、提交、推送或发版。探针全部在内存文件端口运行，生产编译 write:false，脚本/结果仅留 /tmp；没有临时变异候选源码。

| 亲自执行的命令/检查 | 退出码 / 实际结果 |
|---|---|
| TASK 22 文件 SHA-256，多次 | 0；全部匹配。 |
| `pnpm exec vitest run src/modules/health src/modules/archives test/golden/archives-v2.test.ts test/archive-relation.test.ts` | 0；24 文件、145 测试通过，无快照更新。 |
| `pnpm test:safety-regressions` | 0；现有安全回归通过。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 0。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 0。 |
| `pnpm run lint` | 0；全仓零警告。 |
| `pnpm test:architecture` | 0；1335 模块，无边界/宿主/桌面/barrel/循环违规。 |
| `pnpm check:bundle` | 126（工具返回）；health 15209 > 10240，整体 budget: 1 over，见 F3。 |
| 原 verify-i18n 等价执行（只迁移临时字典至 /tmp、解析现有依赖路径） | 0；33 词典、5440 键，en/zh、占位及字面引用通过，未改断言。 |
| review-scope：working-tree、指定 base、TASK 22 路径 | 0；显式范围/base/head 正确。 |
| `node /tmp/huhu-079-repair-probe.mjs` | 0；最终探针断言确认 F1/F2 反例成立；不是产品修复通过。真实 owner、恢复事务及 health 编排，无自有实现 mock。 |

本地过程材料（纯路径）：

- /tmp/huhu-079-repair-probe.mjs
- /tmp/huhu-079-repair-probe-result.json
- /tmp/huhu-079-verify-i18n.mjs
- /tmp/huhu-079-i18n-dictionaries.cjs

未运行全仓 pnpm test、统一产物构建、真实 Obsidian、真实文件系统故障/重启恢复或 T-19 UI E2E。本票 E2E disposition 为 not-required，内存故障端口证明目标逻辑反例与现有接缝，不冒充真实宿主验收。

## 问题与下一步

无审查环境阻塞，22 个冻结输入未漂移。先修复恢复事务的范围证明及提交事实传递，保留原 CAS/备份与通用字段保护；用上述反例增加真实回归，同时补正常恢复、后续用户编辑拒绝覆盖和逐项汇总验证。处理激活包体后原样重跑门禁，再冻结复审。当前不得将该高风险修复链路记为完成；本报告不修改正式状态或 Evidence。
