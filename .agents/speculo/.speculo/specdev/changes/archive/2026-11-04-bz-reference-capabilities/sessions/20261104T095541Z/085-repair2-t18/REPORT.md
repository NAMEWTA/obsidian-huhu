# 任务回报

Session: 20261104T095541Z
Task: 085-repair2-t18
Status: completed

## 聚焦交接

第二次修复候选完成，交回 Lead 独立复审，不宣称 Ticket done。F1 改为由 owner 独立持久操作登记识别修复事务，journal 标记不再决定是否证明范围；缺失或不匹配时 fail-closed，并保留合法通用升级。F4 恢复 LazyHealthScanner 对每个订阅者的异常隔离，扫描正常返回和结算 Promise。两项均先复现真实断言失败再修复；最终扩大回归含黄金样本 173 项、类型、lint、架构、安全及只读原预算分析均通过，未越界处理并行 T-15。

## 产物与验证

### 本次修改文件

- src/modules/archives/services/generic/repair.ts：owner 操作登记；登记交叉核对；不依赖 journal 标记的范围证明；未登记归物通用恢复的生命周期保护；专用恢复要求独立登记。
- src/modules/archives/services/generic/runtime.ts：按实际 journal 文件名传入恢复证明；禁止 patch 独立登记文件，保持既有 context/原子 process 范围约束。
- src/modules/archives/services/generic/repair.test.ts：删标记/伪造标记/改写 after、登记异常、全新 runtime 重启、普通升级兼容和登记不可改写回归。
- src/modules/health/services/lazy-scanner.ts：逐个隔离订阅者同步异常。
- src/modules/health/services/lazy-scanner.test.ts：抛错订阅者不截断 scan Promise、后续订阅者及完成通知的回归。

另按 Return 一次性写入本 REPORT。工作副本交付；未修改 TASK、旧报告、正式 Ticket/Evidence/Map/Goal、永久知识、预算或依赖。未改 archives/ui、archives/i18n.ts、recovery.ts、src/app/main.ts、main.js/styles.css。没有 Git 写操作、安装、构建、提交、推送或发布。其他 dirty 文件保持原样。

### F1：从独立 owner 登记决定权限，fail-closed

1. 专用 owner 在 journal 创建之前，以 vault port/writeExact 新建 `{root}/migrations/{operationId}/health-repair.json`。登记 version=1，保存 root、operationId、collectionId、ownerId、schemaRevisionId、owner path、beforeHash、批准的 afterHash 和 backupPath；不保存正文。路径从本次命令的 operationId 生成，既有文件不能覆盖。
2. runtime 读取恢复 journal 时，根据实际 journal 文件名寻找独立登记，核对文件名与 journal.id，严格比较登记与事务所有交叉字段。是否进行修复范围证明由该登记决定，不由 healthRepair 字段是否存在或其字符串内容决定。删除/伪造标记但保留批准候选，仍通过独立登记验证；删除/伪造标记并篡改目标，仍拒绝。
3. 登记存在且损坏/不匹配时拒绝，不回退为普通恢复。登记不存在但 journal 自称 health 时拒绝，不从 journal 自动补登记。登记不存在且 journal 未声明 health 时，对原件为归物的通用恢复按真实 before/after 值重验 status/exitDate/sale/events 全部不变、结果生命周期合法；不能利用删除标记改变受保护字段。合法普通字段修改、schema 升级与回退继续支持。
4. 修复登记匹配后，继续从哈希匹配的原件/备份验证完整历史，重新生成三项投影的精确 patch。目标与批准哈希、重新推导字节都必须相符。证明仍绑定本次命令 context，最终 process 只接受原件或允许候选，既有预检后 journal 替换回归保留。
5. runtime 禁止 patch 登记文件；恢复 owner path 不得指向 migrations 下的 journal、登记或备份，因此通用恢复不能改写自己的 owner 依据。独立记录使用有界 JSON，异常格式拒绝。没有改变通用 prepareUpgrade/save 的既有保护。
6. 新反例覆盖删除标记、伪造标记、保留标记改写 after，通用继续和回退均拒绝越界；已有 category/正文/合法历史/原子替换测试继续通过。登记缺失、损坏或 owner 不匹配也均拒绝且零源写入。重建全新 ArchiveRuntime 后，标记被删或伪造但目标未变，仍凭独立登记正确继续并逐字节回退，证明不是仅靠 activation 内存状态。
7. 普通归物 schema 升级同时修改 category 的正向继续/回退测试通过；既有非归物 application/recovery 故障矩阵通过。无登记的旧 health journal 不会被自动当作已批准修复，需 owner 复核，符合本次 fail-closed 要求。

### F4：恢复消费者故障隔离

LazyHealthScanner.emit 对各监听器单独 try/catch，保持其他监听器、admission、扫描完成和清理通知。scan 的返回 Promise 不再被订阅者同步抛错截断，finally 的通知也不再把消费者错误变成扫描拒绝。没有捕获或弱化真正的 scan API 错误。新增测试令首个监听器抛错，验证 scan 不同步抛错、返回 Promise、正常产出并结算报告、running 清除，后续监听器收到多次更新；Vitest 无未处理拒绝。

### 命令与退出码

环境：/home/wta/projects/obsidian-huhu，共享 dev 工作副本，现有依赖。所有夹具篡改、登记、故障注入均在内存文件端口；未创建实际 vault 用户数据。

| 命令 | 退出码 / 观察 |
|---|---|
| pnpm exec vitest run src/modules/archives/services/generic/repair.test.ts src/modules/health/services/lazy-scanner.test.ts -t 'owner registration prevents|throwing subscribers' | **126（修复前 red）**；删标记通用恢复实际成功导致预期拒绝断言失败；订阅者错误截断 scan 导致不抛错断言失败。其余未选用例仅为 -t 过滤，无永久 skip。 |
| pnpm exec vitest run src/modules/archives/services/generic/repair.test.ts src/modules/health/services/lazy-scanner.test.ts | **0**；最终 2 文件、28 项通过。 |
| pnpm exec vitest run src/modules/archives/services/generic/repair.test.ts src/modules/archives/services/generic/application.test.ts src/modules/health/services/lazy-scanner.test.ts | **0**；3 文件、48 项通过，含通用恢复故障与非修复操作兼容。 |
| pnpm exec vitest run src/modules/health src/modules/archives test/golden/archives-v2.test.ts test/golden/archive-relation.test.ts | **0**；27 文件、173 项通过；黄金样本未更新。 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json | **0**。 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json | **0**；新增测试后最终重跑通过。 |
| pnpm run lint | **0**；全仓零警告，未关闭规则。 |
| pnpm test:architecture | **0**；1338 modules，无边界、宿主、barrel 或循环违规。 |
| pnpm test:safety-regressions | **0**；原安全回归通过。 |
| node scripts/check-bundle.mjs --budget scripts/bundle-budget.json --enforce | **0**；原预算整体 within limits，health 激活约 6.5 KB，保持低于原 10240 B；只读 write:false 内存分析，未写 main.js。 |

没有删除或弱化既有断言、提高既有门禁/预算阈值、修改分析入口。083 已确认关闭的 F2 提交事实与 unknown 回执，以及 F3 按需加载回归均随定向套件继续通过。081 的写集外 UI/类型阻塞不沿用：本轮扩大回归与两套类型检查实际为 0。

### Skill Execution Records

- dev / 模块边界：仍由 archives owner 持有数据权限，health 只通过既有 api.ts 服务编排；没有增加跨模块实现层导入，架构门禁实际通过。
- dev / 持久化：登记在可见 archives 根的迁移目录，使用现有 vault port、原子写和队列；JSON 不进入实体发现索引；原件、备份和历史均保留，不直接用 Node/Electron 或适配器旁路写入。
- dev / 安全与测试：以真实服务/内存文件端口先复现 F1/F4，增加失败封闭、普通恢复兼容及全新 runtime 重启测试；保留 CAS、备份、范围证明和 unknown 事实，不放宽旧测试。
- dev / 生命周期：只隔离订阅者异常，保留扫描 Promise、取消和关闭语义；相关 lazy facade 及真实模块装配测试继续通过。
- dev / 懒加载和预算：不改变装配方式或阈值，以原只读脚本验证新增代码未重开包体问题。
- dev / 文案和许可：无新增用户界面文案、依赖或外部代码改编；不触碰并行词典，无新增 bz 署名登记需求。
- SpecDev I：沿已核验 Ready/Execution Context 和当前冻结 TASK、083 审查实施；复用此前已读未变的运行/测试合同，完整重读本次 TASK 与 dev Skill；只返回实现与检查事实，正式 Evidence/状态由 Lead 维护。

### 未执行，owner Lead

- pnpm run build、build:css、notices 与 main.js/styles.css/许可产物更新。
- 正式 pnpm check:bundle 集成门禁（本次已直接运行原只读脚本及原预算、退出 0）；pnpm check:notices。
- 双轴独立复审、UI runner、真实 Obsidian/真实文件系统故障与恢复验收、正式 Evidence 与 Ticket 状态推进。T-18 本票无 UI，页面及通知 opener 仍归 T-19。

## 问题与下一步

无剩余实现或本轮检查阻塞。completed 只表示第二次修复候选交回；Lead 固定共享工作副本后独立复审 F1 的登记身份/缺失策略和 F4 的异常隔离，再执行独占集成验收。若需要支持旧的无登记 health 事务，应单独由 owner 决定恢复策略，不从可修改 journal 自动追认授权。
