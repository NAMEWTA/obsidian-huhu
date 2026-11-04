# 任务回报

Session: 20261104T095541Z
Task: 032-rereview-t05
Status: completed

## 聚焦交接

已独立复审 T-05 的冻结候选，标准轴与规范轴均为 pass。原 027 报告中的 minor N1 已修复：source-only 的 automation-run 通知不能打开，直接调用 opener 也会拒绝，失败不会将通知标为已读。旧 SourceRef、无 kind 的旧 target，以及正常自动化通知的打开行为保持兼容。本次仅写本 REPORT；未修改业务文件、TASK、正式 Evidence 或票状态，候选交由 Lead 验收。

## 审查范围与输入

- 模式：working-tree；base_sha 与 observed_head 均为 `29644dc5833bb209e6282f84fa71441a5a1b99d4`。
- Input-SHA256：`3df0a3bcfb9149ffc28256d1f4d99ca74c30e7731c8be60e0037b0abd91b270a`。
- TASK 列出的 22 个输入在开始、验证后及写报告前均与冻结哈希匹配；审查期间未发现输入漂移。review-scope 工具确认这 22 个路径为本次范围，未将其他票的工作区变动并入结论。
- 对照 027 的冻结清单，仅 `src/modules/automations/services/runtime.ts` 与 `src/modules/automations/services/notification-runtime.test.ts` 改变，与 029 修复交接相符。
- 依据当前 Ticket、Spec AC-131–134、ADR-005、Map/Goal Plan、AGENTS.md、dev/ui Skill 与高风险审查合同，对修复及通知渠道、opener、持久幂等、撤销和卸载接缝进行检查。本次修复沿用现有 HUHU 实现，未新增外部实现或依赖。

## Standards Axis

Result: pass

### 原 finding N1：已关闭

- 原严重度：minor；位置：`src/modules/automations/services/runtime.ts:104`。
- 修复行为：`canOpen` 排除仅有 `{ kind: 'automation-run', id: 'run-only' }` 而无 target 的记录；`open` 在 target 缺失时抛出 `AutomationError('sourceMissing')`，不再正常返回。health 记录仍由自己的 opener 负责。
- 调用链：`src/modules/notifications/core/openers.ts:16` 找不到可用 opener 时拒绝；`src/modules/notifications/core/service.ts:179` 只有打开成功后才调用 `markRead`。直接绕过路由调用 runtime opener 同样会拒绝。
- 可复现证据：`src/modules/automations/services/notification-runtime.test.ts:48` 经真实 runtime、opener 路由和 NotificationService 验证 `canOpen=false`、两条打开路径均拒绝、无导航或来源打开副作用、内存与落盘 read 均为 false、unread 仍为 1。随后旧 SourceRef 和旧 target 均成功打开，内存与落盘 read 为 `[false,true,true]`。
- 该方案符合原 finding 提出的“不能打开时明确拒绝并保留未读”修正路径；无需从 source.id 猜测导航目标。

### 回归与高风险接缝

- 正常自动化生产者仍同时发送带 kind 的 source/target，保留运行时名称、内容快照及详情导航。
- 渠道按实例注册/撤销，旧投递回调受注册身份约束；贡献刷新和卸载有 generation/disposed 防护。本次修复没有扩大这些生命周期的写入或回调范围。
- 持久化先预留 receipt 再投递；重复 ID、重启与清理已读后的幂等性仍成立，pending 恢复为 unknown 后不重放；未注册渠道落为 unavailable。
- 模块生产实现经 api.ts 互访，shared automation 不保留旧渠道枚举别名或反向依赖；新增展示状态具备 en/zh，错误展示不直接泄露异常原文。
- 当前未发现需修正的 blocker、major 或 minor finding。

## Specification Axis

Result: pass

| 合同 | 复核结论与证据 |
|---|---|
| AC-131 | pass。真实自动化 runtime 测试验证名称快照、通知正文、泛化 source/target、打开运行详情及已读；notification-names 与自动化/通知套件及安全回归通过。N1 的拒绝路径未影响正常生产者。 |
| AC-132 | pass。health source/target 无需 automationId/runId；按 kind 选择贡献 opener，自动化 opener 不接管 health；opener 与 InboxPanel DOM 测试覆盖来源目标呈现及打开路由。 |
| AC-133 | pass。测试渠道收到一次投递并持久保存 sent，撤销后不可用；未知渠道保存 unavailable 且请求不抛错，同一 ID 后续注册渠道也不补发。 |
| AC-134 | pass。既有 inbox 路径及 records/receipts 格式保留；旧记录读入与追加、并发重复 ID、重启和清理已读后的 receipt 均有测试。修复测试额外验证旧 SourceRef、无 kind 的旧 target 打开兼容。 |

范围符合通知协议泛化、渠道贡献点与现有 automations 消费者迁移；未加入外部通知渠道实现，未保留旧类型别名。复审修复位于票的 services 写集内，未引入其他业务范围。

## 产物与验证

以下命令均由本次复审亲自运行，退出码均为 0：

| 命令 | 实际结果 |
|---|---|
| `pnpm exec vitest run src/modules/notifications src/modules/automations test/automations/notification-names.test.ts` | 26 个测试文件、174 项测试全部通过，含 N1 及旧记录打开回归。 |
| `pnpm test:safety-regressions` | 全部门禁通过，含 DST、自动化会话、看板冲突与恢复、任务边界及旧 UI Promise 观察回归。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 通过。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 通过。 |
| `pnpm run lint` | 通过，无 lint 错误或警告。 |
| `pnpm test:architecture` | 1299 个模块，无分区、host-package、desktop-only、barrel 或循环依赖违规。 |
| `pnpm test:i18n` | 32 个词典、5337 个键，插值及字面引用检查通过。 |
| `node .agents/speculo/workflows/specdev/common/tools/validate-specdev.mjs --review-scope --repo /home/wta/projects/obsidian-huhu --mode working-tree --base 29644dc5833bb209e6282f84fa71441a5a1b99d4 --file <逐个传入 TASK 的 22 个冻结路径>` | 范围解析成功，base/head 与上述值一致。 |
| `git diff --check 29644dc5833bb209e6282f84fa71441a5a1b99d4 -- <TASK 的 22 个冻结路径>` | 通过。 |

验证限制：未运行构建、CSS 构建或 notices 生成；产物与整体验收仍由 Lead 串行处理。未执行 Obsidian 真机、真实系统通知权限或移动端验收；本票 E2E disposition 为 not-required，本报告不将宿主体验写为已通过。安全回归中的 Node API 弃用提示不影响退出码。

## 问题与下一步

无当前阻塞或待修复 finding。Lead 可接收本次双轴 pass 结论，继续本票正式验收与共享产物集成；本 REPORT 不代写 Ticket/Evidence 状态。
