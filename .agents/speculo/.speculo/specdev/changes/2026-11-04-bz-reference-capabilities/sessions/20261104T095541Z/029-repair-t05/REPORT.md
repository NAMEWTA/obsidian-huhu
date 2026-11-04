# 任务回报

Session: 20261104T095541Z
Task: 029-repair-t05
Status: completed

## 聚焦交接

已修复 027-review-t05 的 N1：只有 automation-run source、没有 target 的通知不再被自动化 opener 声称可打开，直接调用 open 也明确拒绝，不提交已读。新增真实 runtime、类型路由与 inbox 集成回归，验证无导航、内存及持久 read 均不变，同时确认旧 SourceRef 与无 kind 的旧 target 仍能打开并持久标记已读。先红后绿，最终 26 文件 / 174 测试、两组类型检查、零警告 lint、安全回归与架构检查均通过。completed 仅表示修复候选交回，独立复审、正式 Evidence、Ticket 状态与共享构建仍由 Lead 接收处理。

## 产物与验证

### 本轮全部修改与新增文件

- 修改 `src/modules/automations/services/runtime.ts`：canOpen 只接受可执行的自动化 target 或旧 SourceRef，不把 automation-run 来源标识单独视为导航目标；无目标及 health 误调用均抛出既有 AutomationError('sourceMissing')，避免无动作成功返回。
- 修改 `src/modules/automations/services/notification-runtime.test.ts`：保留原生产者集成测试与全部断言，追加 N1 回归及旧记录打开兼容断言。
- 新增本 REPORT.md。

本轮仅改上述两个业务文件和本报告。已有 T-05 改动及其他执行者的 dirty 文件保持原样；相对 Git 基线的完整 diff 包含前轮候选，不能都归为本轮修改。未修改冻结 TASK、前序报告、正式 Ticket/Map/Goal/Evidence、home 只读消费者、共享类型、生成物或依赖；未执行 Git 写操作、提交、推送或发版。

### 关键决定与影响范围

选择“canOpen=false 且 open 拒绝”的修复方案，保留公开请求协议和持久数据形态。来源标识允许记录被保存，不必因此承诺可导航；沿用既有 target 的导航语义，避免仅凭 source.id 猜测缺失目标的打开行为，也避免收紧协议牵动其他来源与旧数据。原生产者始终附带完整 target，其运行、来源及笔记打开逻辑不变；旧 SourceRef 和无 kind 的旧 target 继续支持。

实际检查调用链为 runtime.opener → createNotificationOpeners → NotificationService.open → markRead。router 通过 canOpen 拒绝 source-only 记录；绕过 router 直接调用 runtime.opener.open 同样拒绝。已读仍只在 opener 成功之后提交，无需修改通知核心、渠道或存储协议。错误复用已有双语 sourceMissing 文案，不新增公开原始异常或词典键。

回归使用真实 createAutomationRuntime、AutomationService、Markdown 定义仓库、createNotificationOpeners、NotificationService 和内存 Vault。设备 ID、Obsidian 宿主及 shell/贡献提供者边界沿用既有测试方式；没有 mock 被测业务逻辑。断言实际导航目标、公开 inbox 状态和适配器读回的持久 JSON，不只观察 mock 次数；finally 等待 shutdown 并释放登记的 Vault 回调。

### 实际命令与退出码

环境：同一 current 工作区 `/home/wta/projects/obsidian-huhu`，branch dev，README execution-context 基线 29644dc5833bb209e6282f84fa71441a5a1b99d4；Node v26.11.1、Vitest v5.0.3。

| 命令 | 退出码 | 实际观察 |
|---|---:|---|
| `pnpm exec vitest run src/modules/automations/services/notification-runtime.test.ts`（修复前，新增测试后） | 126 | 有效红灯：source-only 的 inbox.canOpen 实际 true，预期 false；原生产者测试通过。 |
| 同上（生产修复后） | 0 | 1 文件 / 2 测试通过，覆盖直接 opener/inbox 拒绝、持久未读及旧目标打开。随后补齐旧 SourceRef 夹具的必需 path，最终完整套件覆盖最终输入。 |
| `pnpm exec vitest run src/modules/notifications src/modules/automations test/automations/notification-names.test.ts` | 0 | 最终 26 文件 / 174 测试通过，包含通知 DOM 和名称快照，不重复累计。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 0 | 生产类型检查通过。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 0 | 测试类型检查通过。 |
| `pnpm run lint` | 0 | 全仓零警告通过，未关闭规则。 |
| `pnpm test:safety-regressions` | 0 | 安全门禁全部通过；Node DEP0205 为弃用提示。 |
| `pnpm test:architecture` | 0 | 1299 模块，无分区、宿主包、桌面、桶文件或循环违规。 |
| `git diff --check -- src/modules/automations/services/runtime.ts src/modules/automations/services/notification-runtime.test.ts` | 0 | 选定差异无空白错误，新增测试文件另经测试、类型及 lint 检查。 |
| `sha256sum .agents/skills/dev/SKILL.md` | 0 | d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e，与 Ticket required 绑定一致。 |
| `node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs --repo /home/wta/projects/obsidian-huhu --scope-root .agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities --session 20261104T095541Z --task 029-repair-t05 --stage dispatch` | 0 | errors/warnings 均为空，任务目录未占用 REPORT。 |

未删除或弱化原测试、未提高阈值。定向红灯来自目标断言，不是编译、夹具初始化或超时。审查时的两项 T-04 范围外类型错误本轮检查中未再出现；没有修改其文件或声称其票已验收。

AC 回归对应：AC-131 由真实 runtime 集成、名称快照和安全门禁覆盖，N1 新增“不导航不已读”边界；AC-132 由原 health opener/详情测试覆盖；AC-133 由贡献渠道、unavailable 和真实模块生命周期测试覆盖；AC-134 由旧 inbox 读取、追加、去重/恢复测试及本轮旧导航兼容断言覆盖。全部在上述最终套件实际执行，不将既有报告通过事实当作本轮重跑结果。

### 固定交付快照

| 文件 | SHA-256 |
|---|---|
| `src/modules/automations/services/runtime.ts` | db164fda0449d0a2ad7deff1e76e9e5046c809ff072730e3ca0f8f43c3196379 |
| `src/modules/automations/services/notification-runtime.test.ts` | e510c212d3f4d0128b4b2df91c8817c896a406c1fb015e96304c3dd72e393114 |

### Skill Execution Records

完整读取本 TASK、指定实现 Work、implementation-procedure、execution-preflight、dev 技能及当前 Ticket/Map/Spec/ADR/CONTEXT/Goal、027 审查和 021 交接；沿用当前明确根与 Lead 已核验的授权、依赖和执行上下文，不另建 Change、工作区或正式状态。

1. dev 规则 2、3、8：追踪真实 opener 路由与已读提交链；仅修改既有 service 和就近测试，没有新增生产导入、反向依赖、启动同步闭包或宿主包；架构检查通过。
2. dev 规则 4：测试为 runtime/inbox 和回调登记 finally 清理，等待实际 shutdown；没有新增生产计时器或监听器。
3. dev 规则 6：保持 inbox 路径、receipts、数据形态和恢复 owner；新增断言读回持久 read，旧 SourceRef 与 target 导航继续可用。
4. dev 规则 7：复用 AutomationError 与已有 t() 双语 sourceMissing 键，不添加硬编码产品文案，不输出 source 原文。
5. dev 规则 9：实际运行全仓 lint、两组类型检查并通过，没有规则豁免、类型抑制或测试削弱。
6. dev 规则 11 与 testing 选择表：修改前列明两个文件和验证范围；按 N1 先红后绿，执行通知/自动化、名称快照、安全和架构门禁；遵守写集、无 Git 写入和 Lead 独占构建边界。

本轮没有 UI/DOM/样式实现变更、没有外部研究缺口、复制/改编 bz 代码或新增依赖；使用仓库既有实现，不新增署名/许可条目。

### 未执行或未验证

- `pnpm run build`、`pnpm run build:css`、`pnpm notices`：未执行，owner Lead，TASK 禁止改写共享产物。
- `pnpm check:bundle`、`pnpm check:notices`、UI runner：未执行，owner Lead。
- 独立双轴复审、正式 Evidence、Ticket 状态及最终验收：owner Lead / 另一 reviewer；本执行者不宣称独立审查通过或 Ticket done。
- 真实 Obsidian、系统通知权限/点击、移动端宿主：待用户验收；内存/系统边界测试不代替真机。
- 未运行全仓 pnpm test；没有词典或 UI 变更，未单独重跑 i18n 与 UI runner。

## 问题与下一步

无本轮实现阻塞。请 Lead 以本报告快照冻结修复候选，安排 N1 独立复审，再串行执行共享构建与适用产物检查，并维护正式 Evidence 和状态。本报告的 completed 仅代表授权范围的候选交回。
