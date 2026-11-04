# 任务回报

Session: 20261104T095541Z
Task: 081-repair-t18
Status: blocked

## 聚焦交接

079 审查 F1/F2/F3 的修复代码与针对性回归已完成，均有先红后绿的实际证据；未宣称 Ticket done。F1 在 runtime 对专用和通用恢复共同建立原件范围证明并绑定原子写；F2 保留确认提交事实，未知结果显式返回 unknown；F3 将修复和扫描实现延后到首次操作，原预算分析 health 激活闭包从 15209 B 降至 6593 B，未改阈值。当前因并行 T-15 写集外的人物页面测试及类型错误，TASK 要求的完整目录/两套类型检查不能全部为 0，因此按 blocked 交回。请 Lead 协调 T-15 完成、固定共享工作副本后复跑失败项，并安排独立复审与其独占集成门禁。

## 产物与验证

### 本次修改/新增文件（共 10 个）

- src/modules/archives/services/generic/repair.ts：从原件重新推导精确候选的共用校验；提交尝试/确认事实；unknown 回执；异步执行前复制输入。
- src/modules/archives/services/generic/runtime.ts：health journal 的只读范围证明、命令 context 内的证明绑定、process 回调内写入限制；提交观察回调携带已确认原文，另区分真实写尝试。
- src/modules/archives/services/generic/repair.test.ts：篡改 category/正文/合法历史，专用及通用继续/回退，预检后替换 journal，双重 I/O 故障、真实批量 unknown 汇总。
- src/modules/health/api.ts：committed 扩为 boolean | 'unknown'，明确 unknown 不能当未提交。
- src/modules/health/core/repair.ts：脱敏保留 unknown；仅 committed === true 可整体 verified，存在未知项归 partial。
- src/modules/health/module.ts：发布轻量扫描、修复 facade。
- src/modules/health/services/lazy-repairs.ts：首次修复操作动态加载实现，保留同步 preview/results 与关闭语义。
- src/modules/health/services/lazy-repairs.test.ts：空闲无 provider 活动、加载中关闭不初始化。
- src/modules/health/services/lazy-scanner.ts：首次 discovery/scan 动态加载扫描实现，保留 admission、取消、进度、订阅和停止语义。
- src/modules/health/services/lazy-scanner.test.ts：加载前取消、立即 running、加载中关闭与晚到订阅清理。

REPORT 按 Return 一次性写入。工作副本交付，无 Git 写入、提交、推送或发版。未修改冻结 TASK、旧 REPORT、正式 Ticket/Evidence/Map/Goal、永久知识、预算、依赖、archives/i18n.ts、archives/ui、src/app/main.ts、main.js/styles.css，也未修改 recovery.ts。其他 dirty 改动保持原样。

### 关键决定及审查项修复

**F1（major）**

- 原来的 health 标记只用于识别事务，不再代替范围证明。读取 health journal 时，从匹配 beforeHash 的原备份（无备份时为尚未修改的原件）解码原始归物，重验 ID、schema、备份路径和根边界，验证完整生命周期，再按当前 schema storageKey 只 patch status/exitDate/sale。
- journal.after 必须与上述重新推导结果逐字节相等，其 afterHash 也必须一致；非投影字段、历史及自由正文不得有任何额外变化。拒绝把迁移文件当作实体来源。
- 在 ArchiveRuntime.read 建立证明，绑定到本次 ArchiveWriteContext；最终 process 回调只接受证明中的精确候选或精确原件（回退）。RecoveryCommands 的专用入口和 application.commands.resumeOperation/rollbackOperation 都经过同一 runtime，实际执行再次读取 journal，因此不是只做 owner 入口的前置检查。
- 新回归验证篡改无关字段、正文、格式合法的生命周期历史后，四个继续/回退入口均拒绝，源字节与写次数不变；预检后替换 journal 也拒绝。既有正常恢复、回退及后续用户编辑保护仍通过。未移除通用 save/prepareUpgrade 的原有保护。

**F2（major）**

- runtime 在成功 CAS 后区分写尝试，并在确认 readback 后向 owner 传递原文证据；owner 仅匹配本候选路径和精确 after，确认提交事实不会被 journal 收尾或补读错误覆盖。观察订阅在 finally 释放，停止时清理。
- 未发生写尝试（例如原子 CAS 拒绝）仍为 committed:false；已确认写入为 true。发生尝试但无法确认结果时为 'unknown'，保留 recoveryId；不能根据读取异常推出 false，也不依赖异常消息猜测是否写入。
- health 的白名单回执/内存结果保留 unknown，存在未知项时批量为 partial，不能称整批成功或完全未执行。T-19 消费者须显式区分 true/false/'unknown'，不能按 truthy 判断。
- 新测试复现 journal committed 收尾失败且后续源 read 全失败：实际字节已变，回执仍 committed:true。真实 HealthRepairService→owner 链同时覆盖 process I/O 与 readback I/O 不确定结果，回执和保留结果为 unknown、整批 partial，并有恢复入口。

**F3（minor）**

- repair 实现放在 LazyHealthRepairs 的首次操作 import 中；仅延后该实现仍为 11703 B，未满足预算，因此也将 scanner 实现延到首次 discovery/scan。module.ts 只静态装配轻量 facade，未改变预算文件或分析入口。
- 实际原脚本 write:false 内存分析最终 health activation=6593 B、deferred=11032 B，低于原 10240 B；所有模块 budget within limits。初始 red=15209 B，退出 126；最终同脚本同原预算退出 0。
- 关闭、加载中取消、同步 results/preview、扫描立即 admission、provider 撤销及真实 shipped registry 修复链路的既有/新增测试通过。没有生成或改写 main.js。

### 实际命令与退出码

环境：/home/wta/projects/obsidian-huhu，共享 dev 工作副本，仓库既有依赖。

| 命令 | 退出码 / 事实 |
|---|---|
| pnpm exec vitest run src/modules/archives/services/generic/repair.test.ts -t 'recovery rejects|confirmed owner commit survives' | **126（修复前 red）**；category/正文恢复越界及提交后补读失败三项真实断言失败。 |
| pnpm exec vitest run src/modules/archives/services/generic/repair.test.ts src/modules/health/services | **0**；最终 3 文件、18 项通过，包含 F1 四个恢复入口及 F2/F3 回归。 |
| pnpm exec vitest run src/modules/health src/modules/archives/services/generic/repair.test.ts src/modules/archives/services/generic/file-changes.test.ts src/modules/archives/contrib/health-repair.integration.test.ts test/golden/archives-v2.test.ts test/golden/archive-relation.test.ts | **0**；11 文件、57 项通过，真实模块/owner 集成、原文件变化行为与黄金样本通过，无快照更新。 |
| pnpm exec vitest run src/modules/health src/modules/archives test/golden/archives-v2.test.ts test/golden/archive-relation.test.ts | 先有 **0**（26 文件、153 项），并行人物票加入新断言后再次运行为 **126**（5 个人物页面失败；其余 155 项通过）。 |
| pnpm exec vitest run src/modules/health src/modules/archives | 最新 **126**；24 文件通过、1 文件失败，155 项通过、1 项失败，另有一条与人物 reload 测试清理关联的 unavailable 未处理拒绝。具体见阻塞。 |
| pnpm test:safety-regressions | **0**；原安全门禁通过，无仓库产物生成。 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json | 初次 **0**；并行修改后最新 **126**，仅 ArchivePage.tsx 三处 TS18048，见阻塞。 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json | 初次 **0**；最新 **126**，相同三处写集外 TS18048，无本次修复文件类型错误。 |
| pnpm run lint | 最新 **0**；先前本票三处 unnecessary assertion/Map 类型错误（126）已修复，未关闭规则。 |
| pnpm exec eslint src/modules/archives/services/generic/repair.ts src/modules/archives/services/generic/runtime.ts src/modules/health/api.ts src/modules/health/core/repair.ts src/modules/health/module.ts src/modules/health/services/lazy-repairs.ts src/modules/health/services/lazy-scanner.ts --max-warnings 0 | **0**；随后全仓 lint 再通过。 |
| pnpm test:architecture | **0**；最新 1338 modules，无边界、宿主、barrel 或循环违规。 |
| node scripts/check-bundle.mjs --budget scripts/bundle-budget.json --enforce | **126→126→0**；15209 B→11703 B→6593 B，原阈值 10240 B 未改；只读内存打包。 |
| node scripts/check-bundle.mjs --budget scripts/bundle-budget.json --enforce --json /tmp/huhu-081-bundle.json | **0**；最终 budget within limits，JSON 仅留系统临时目录。 |

初次 F2 修补曾把 CAS 冲突也保守归 unknown，导致既有“原子写竞态 committed:false”断言失败（126）；之后补足真实 attempt/confirmed 两个观察点，保留该原断言并通过。没有删除、放宽任何既有断言或提高阈值。

本地过程材料仅有 /tmp/huhu-081-bundle.json（纯路径）；没有把过程日志、JSON 或构建产物写入 sessions/evidence。

### 实际应用的 Skill 规则

- dev / 模块与依赖：跨模块仍只经 api.ts；范围证明/原子写位于档案 owner，health 只编排脱敏协议；架构门禁实际通过。
- dev / 懒加载：使用 services 内第二层动态 import，启动/API 不静态导入实现；原预算脚本验证，而非改阈值或改分析入口。
- dev / 生命周期：attempt/commit 观察在 finally 释放；lazy facade 停止后不初始化实现；取消/关闭期间的晚到工作有测试。
- dev / 持久化：复用既有 vault port、队列、备份与事务格式，不直接改文件、不删除坏来源；从原件证明允许的精确 patch，保留原 schema/save/upgrade 保护。
- dev / 验证：以真实内存文件端口制造 journal 篡改与 I/O 故障，先红后绿；加真实 health 批量和既有 registry 回归；不以 mock 调用次数替代恢复行为。
- dev / 文案与许可：本次没有新增用户文案或外部依赖/改编代码；复用既有 en/zh 和内部实现，无新增 bz 署名条目。
- SpecDev I：复用已核验 Ready/Execution Context/写集与既有实现决策，完整读取本次 TASK、079 审查和 dev 技能；只实现修复、返回事实，不写正式状态/Evidence，不接管并行票。

### 未执行，owner Lead

- pnpm run build、build:css、notices 与 main.js/styles.css/许可生成产物。
- 正式 pnpm check:bundle 集成门禁（本票已直接运行原只读脚本和原预算，结果 0）；pnpm check:notices。
- 双轴独立复审、UI runner/真实 Obsidian、正式 Evidence 与 Ticket 推进。T-18 页面与通知 opener 仍为 T-19 范围。

## 问题与下一步

**阻塞只在写集外的共享工作区验收，不能把最新检查记为全绿：**

1. src/modules/archives/ui/person/PersonReadingPage.dom.test.tsx 的 `journal draft and leave guard survive a real reload, read failure and recovery`：Save disabled 预期 true、实为 false；最新目录运行还有清理期 ArchiveError: unavailable 未处理拒绝（runtime readEntry/load 栈）。更早一轮还出现导航后旧确认未取消、卸载对话框和 overview 新断言失败；最新已减少至上述一项。health journal 证明只作用于 migrations 顶层文件读取；这些人物 UI 文件未被本任务修改。
2. src/modules/archives/ui/generic/ArchivePage.tsx:208:107、375:169、375:210：personSnapshot 可能为 undefined，生产和测试 tsc 同报 TS18048。这些路径属于并行 T-15 且 TASK 明确只读，因此未越界修改。

恢复条件：Lead/T-15 完成上述 UI 修复并固定共享输入，复跑完整 health+archives 目录测试和两套 tsc，全部通过后接收本修复候选并独立复审 F1/F2/F3。可复用未失效的本票 57 项定向/18 项修复回归、lint、架构、安全与预算事实。blocked 表示必需验收尚未全过，不表示本票三个修复未实现；不推进正式 done。
