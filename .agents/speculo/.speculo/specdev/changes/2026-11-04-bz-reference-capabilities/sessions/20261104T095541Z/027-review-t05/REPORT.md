# 任务回报

Session: 20261104T095541Z
Task: 027-review-t05
Status: completed

## 聚焦交接

已完成 T-05 冻结候选的独立双轴审查：标准轴 request-changes，规范轴 pass（AC-131–134 的规定自动化接缝）。确认 1 项 minor：新协议允许只有 automation-run 来源而无 target 的记录，但实际 opener 会声称可打开、无导航地成功返回，并令 inbox 持久标记已读。通知/自动化 173 项测试及安全、架构、i18n、全仓零警告 lint 通过；两组类型检查受冻结范围外 T-04 文件的错误影响，不能称为全仓类型检查已通过。仅写本 REPORT，未改 TASK、业务文件、正式状态、生成物或 Git。下一步由 Lead 处理 N1 并协调外票类型错误及共享构建；completed 只表示审查报告交回，不表示 Ticket done。

## Review

- Strategy: independent
- Risk: high（共享公共协议与已发布 inbox 数据的同票迁移，DEC-001）
- Independence: required
- Reviewer: Codex / 本 TASK 独立审查会话，未参与 T-05 实现或修复；实际派遣/身份关联由 Lead 核验，不编造 provider/session ID。
- Implementers: Ticket 声明 herdr:impl2；共享路径按 Ticket 由 Lead 所有。
- Review mode: working-tree
- Base: 29644dc5833bb209e6282f84fa71441a5a1b99d4
- Input-SHA256: b13b59793865502e09d07575745ce85a3df4957b9ffb0b9d97fd87e19434aedd（TASK 提供的整体摘要）
- 固定范围：本目录 TASK 列出的全部 22 个文件，含新增文件。开始、中途及写报告前逐项核对原始字节 SHA-256，均为 22/22 匹配，无冻结输入漂移。已跟踪部分对照 `git diff 29644dc -- <selected files>`，新增 channels/openers/测试直接读全文；未把 HEAD 当作脏工作副本。

### 来源与影响范围

完整读取 TASK、当前 Ticket、018 blocked 交接与 021 实现交接。沿用本会话已读取且适用的 AGENTS.md、dev/ui、domain-runtime、reviewer-contracts、范围/错误/测试可靠性合同，并重新展开 risk-review；额外读取模块编写规则。AGENTS/dev/ui 摘要与此前工具记录一致，dev SHA-256 为 Ticket 绑定的 d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e。

规范来源为显式 Ticket、Spec §1 / AC-131–134 / DEC-001、ADR-005、CONTEXT，以及 Map/Goal 的共享合同和交付边界；本轮没有用提交说明推定未声明需求。018 的必要消费者越界已由 Ticket/Map 补入 metadata.ts 与 core/actions/definition.ts 写集；shared/automation/types.ts 的冻结候选为 Lead 共享落点，不将这次已声明迁移判为越界。

实际影响链：自动化定义解析/保存 → AutomationService 结束回调 → runtime 通知快照 → NotificationService 的 receipts 预留与投递 → 渠道注册表/原生适配；打开路径为通知中心或系统通知 → 类型化 opener → 实际来源/笔记/运行导航 → 已读提交。另检查真实 ModuleRegistry 的贡献收集、发布、撤销和 dispose 顺序，以及只读的 automations module/manifest、home 消费者、通知名称快照和 UI 测试配置。

本轮复用仓库自己的 inbox、原生投递和 T-02 反馈接口，没有采用新的 bz 实现或依赖，不需要新造上游对比结论、复制署名条目或外部渠道实现。

## Standards Axis

Result: request-changes
Reviewer: Codex / 027-review-t05
Input-SHA256: b13b59793865502e09d07575745ce85a3df4957b9ffb0b9d97fd87e19434aedd

### N1 — minor：有效的 source-only automation-run 记录会“打开成功”但没有导航，并被标记已读

- **文件:行：** `src/modules/automations/services/runtime.ts:106`、`:110`；输入合同见 `src/modules/notifications/api.ts:48`，已读提交见 `src/modules/notifications/core/service.ts:179`–`:181`。
- **问题：** 新请求合同允许 `{source:{kind:'automation-run',id:'run-only'}}` 且 target 缺省。canOpen 因 source 存在返回 true；open 跳过旧 SourceRef 的 sources.open 分支，然后在无 target 时正常 return。上层把这次无动作当成成功，执行 markRead。通知中心因而展示可用“打开”操作，点击却只清除未读状态。
- **亲自运行的复现：** 内存打包真实 createAutomationRuntime、memoryVault 和 NotificationService；仅设备 ID、Obsidian/宿主边界采用与现有测试同类替身，实际核心/运行时/inbox 未 stub。以 notifications 请求发送：

```ts
{
  id: 'source-only', title: 'Run result', body: 'Finished', channels: [],
  source: { kind: 'automation-run', id: 'run-only' }
}
```

实际 `inbox.canOpen(record)` 为 true；调用 `inbox.open(record)` 后 shell 导航调用数为 0，内存与持久 JSON 的 read 均变为 true：

```text
before open: {"canOpen":true,"read":false}
after open: {"navigation":[],"read":true,"storedRead":true}
```

- **影响与严重度：** 对公开 API 允许的边界输入产生误导操作及错误已读。当前自动化生产者总会附带 target，因此其现有正常路径和 AC-131 的端到端回归没有失败；据此标为 minor，不夸大为所有自动化通知不可用。
- **建议修正：** 对 source.kind=automation-run 且缺 target 的情况，要么用 source.id 打开对应运行，要么让 canOpen 返回 false，且 open 在没有可执行目标时拒绝而非成功返回，防止系统点击等直接 open 路径仍标记已读。保留旧 SourceRef 和旧无 kind target 的实际数据兼容，不靠撤销旧文件支持来消除反例。
- **建议验证：** 在真实 notification-runtime/inbox 集成中加入上述 source-only 请求。断言发生真实导航后才已读；或不可打开且直接 open 明确拒绝、read 与持久 read 均不变。现有新增 runtime 测试只覆盖生产者总是附带完整 target 的正常情况。

### 高风险检查的其他观察

- **契约与真实入口：** 渠道贡献点由 notifications/api 拥有，模块实际 collect/watch 并装配到注册表；不是仅在测试中存在的辅助接口。内置 in-app/system 经同一注册表投递；provider 禁用和 inbox 重开测试使用真实 ModuleRegistry。
- **数据与恢复：** inbox 路径与 recovery owner 未变；先提交 pending receipts 再产生投递副作用，清除可见记录不清 receipts。load 的 pending→unknown、恢复 hold、drain 和重载行为保留；旧记录与新 health 追加有真实 JSON 断言。
- **并发与生命周期：** 发送串行化维持幂等；贡献撤销幂等，旧回调检查注册 entry 身份，generation/disposed 防止迟到 collect 重新装配。原生通知对象在内置 owner dispose 时解绑/关闭，外部渠道的资源由提供模块负责。额外受控探针验证异步投递 pending 预留、撤销后同 ID 重注册、旧 open/failed 回调隔离和后续新请求投递。
- **失败与隐私：** 未注册渠道持久为 unavailable 且正常结算；已注册但不可用仍按旧语义 failed。渠道拒绝/异常不把原始错误当公开文案；新 UI/模块/系统点击失败走固定双语安全文案。自动化通知保留 admission 名称/正文快照和既有敏感输出过滤。额外探针验证 canOpen 抛错不会阻断同类的后续有效 opener。
- **兼容与边界：** `rg` 核对 NotificationChannelId 的唯一导出已在 notifications/api，shared 原导出/重导出别名及旧 createNotificationDelivery 入口均不再使用。shared 只存 string[] 数据，没有反向依赖模块；旧 SourceRef 与缺 kind target 是数据读取兼容，不是旧渠道类型别名。
- **界面与文案：** 沿用通知中心布局、按钮和详情，只增加目标分支及 unavailable 文案；4 对词典键齐全，DOM/i18n 通过。未变更页面体系、样式或设计方案；未做真机视觉验收。

未发现其他可操作 finding；不将风格意见、未请求的外部渠道或无关票的错误计入 T-05 findings。

## Specification Axis

Result: pass
Reviewer: Codex / 027-review-t05
Input-SHA256: b13b59793865502e09d07575745ce85a3df4957b9ffb0b9d97fd87e19434aedd

本轴按 Ticket 指定 AC-131–134 的可观察结果判定。四项规定接缝均通过；标准轴 N1 是另外确认的有效 API 边界缺陷，本轴 pass 不撤销它，也不表示整个候选可以结束实施。

| 合同 | 结论 | 亲自核对的证据 |
|---|---|---|
| AC-131 | pass（规定自动化接缝） | 真实 runtime + AutomationService + Markdown 定义仓库 + NotificationService 集成通过；新增生产者发 automation-run 来源/目标，run.id 幂等 ID 保持。原名称快照套件覆盖重命名、删除、历史缺 metadata、主动提醒正文与私密哨兵；安全回归通过。当前生产者始终附带 target，N1 的 source-only 分支另列。 |
| AC-132 | pass | health 记录无 runId/automationId，经自己的 kind opener 打开 reportId 并提交已读；宽泛的自动化 opener 不抢占。health 详情 DOM、模块贡献生命周期及额外 opener 异常隔离探针通过。 |
| AC-133 | pass | 真实贡献渠道收到请求且 receipts 持久为 sent，重载/撤销不重复；未注册 ID 为 unavailable、send 不抛错，后来注册不重放旧 ID；真实模块 collect/watch 装配与提供者撤销通过。 |
| AC-134 | pass | 既有无 kind 的 inbox 记录可读；追加 health 后旧 title/body/target/read/createdAt/receipts 保持，重复旧/新 ID 不重投。路径仍为 `.huhu/notifications/<device-id>/inbox.json`，关闭重开后 read 与去重保持。 |

IN/OUT 与 DEC-001 核对通过：同票完成新请求、opener、渠道贡献点、两个内置实现、自动化发送端及旧渠道类型消费者迁移；没有保留旧渠道类型别名、引入外部投递渠道、health 实现、额外依赖或新存储根。metadata.ts 的渠道校验放宽为稳定 ID，同时仍拒绝空值/非字符串/非法字符；home 只读消费者和现有 JSON 数据契约未被越界修改。

## 产物与验证

唯一写入产物为本 REPORT.md。未修改业务源码、TASK、018/021 报告、正式 Evidence/Ticket 状态、依赖、main.js/styles.css 或其他执行者文件；未安装、提交、推送、发布或执行 Git 写操作。

环境：current/dev；Node v26.11.1、Vitest v5.0.3；unit 为 Node，dom 为 happy-dom。所有下列命令和探针均由本审查者执行。

| 实际命令/检查 | 退出码 | 观察 |
|---|---:|---|
| Python stdin：TASK 22 文件 SHA-256 校验（开始/中途/报告前） | 0 | 每项与 TASK 一致，无冻结输入漂移 |
| `pnpm exec vitest run src/modules/notifications src/modules/automations test/automations/notification-names.test.ts` | 0 | 26 文件 / 173 测试通过；包含通知 DOM 项目，未把它们重复累加为独立新测试 |
| `pnpm exec vitest run --project dom src/modules/notifications` | 0 | 单独复核 1 文件 / 3 DOM 测试通过 |
| `pnpm test:safety-regressions` | 0 | 所有子门禁通过；Node DEP0205 为弃用提示，不是失败 |
| `pnpm test:architecture` | 0 | 1299 模块，无分区、宿主包、桌面边界、桶导入或循环违规 |
| `pnpm test:i18n` | 0 | 32 词典 / 5337 键、占位符与引用通过 |
| `pnpm run lint` | 0 | 全仓零警告通过 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 126 | 未通过；冻结范围外 T-04 的两项诊断，详见下文 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 126 | 未通过；同两项范围外诊断 |
| `git diff --check -- src/modules/notifications src/modules/automations/services src/modules/automations/core/actions/definition.ts src/shared/automation/types.ts src/shared/automation/metadata.ts` | 0 | 已跟踪差异无空白错误；新增文件另外直接读取并经测试/type/lint 观察 |
| `node` stdin：esbuild write:false / VM 执行真实 registry/service/openers 的异步与恢复边界探针 | 0 | pending 先预留、旧回调隔离、撤销重注册、新发送、health 打开/已读、unavailable 与重载幂等均通过 |
| `node` stdin：真实 automation runtime 的 source-only opener 探针 | 0 | 确认 canOpen=true、open 正常返回、导航为空 |
| `node` stdin：真实 runtime + NotificationService 的 N1 持久已读反例 | 0 | 确认导航为空却持久 read=true；退出 0 表示反例确认成功，不表示业务通过 |

### 类型检查的实际未通过项

```text
src/host/obsidian/file-changes.ts(46,25): TS2769
Argument of type '"create" | "delete" | "modify"' is not assignable to parameter of type '"rename"'.
src/modules/archives/services/generic/file-changes.ts(13,26): TS7030
Not all code paths return a value.
```

这两个路径均不在本轮 22 文件冻结输入中，属于并行 T-04 波及面；工具没有报告本票文件的类型诊断。本审查没有修复、排除、抑制或改写这些文件，也不将类型检查失败伪装成通过。全仓类型/构建验收仍为待验收，需要 Lead 协调其 owner 修正后重新核验；这与本轮发现 N1 是两件独立事项。

未执行或未验证：禁止的 build/build:css/notices 未执行，共享产物一致性和包体由 Lead 串行负责；未运行全仓 pnpm test、许可门禁或独立 UI runner。原生 Obsidian Notice、系统通知权限/点击及移动端宿主按 Spec 保持待用户验收；边界替身和 DOM 不代替真机。没有新增外部代码研究或声称其他 Ticket 已验收完成。

## 问题与下一步

无冻结输入或独立审查执行阻塞，Status completed 表示报告交付完成。Lead 应将 N1 交实现者修正并补 source-only 集成回归，之后冻结新输入复审；同时协调范围外 T-04 类型错误，保留全仓类型/构建待验收状态。本候选因标准轴 N1 仍为 request-changes；规范轴的四项自动化接缝通过不能替代该修正，也不能代替正式 Evidence、Ticket 状态或整个 change 的集成验收。
