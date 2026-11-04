# 任务回报

Session: 20261104T095541Z
Task: 021-implement-t05-r2
Status: completed

## 聚焦交接

T-05 候选已在原 current 工作区完成：通知请求具有 automation-run/health 来源与目标，新增 NOTIFICATION_CHANNELS 渠道贡献点，in-app/system 迁为内置渠道，自动化发送端和全部旧渠道类型消费者已迁移。没有保留 shared/automation 的 NotificationChannelId 导出或重导出别名；旧 inbox 读取、幂等回执、已读与既有投递状态语义保留。最终 26 文件、173 项 notifications/automations 与名称快照测试通过，类型、lint、安全回归、架构及 i18n 门禁均通过。completed 仅表示候选交回，尚待 Lead 冻结、独立双轴审查、共享构建和最终验收；未修改正式状态/Evidence。

## 产物与验证

### 全部修改/新增文件

修改的 14 个既有文件：

- `src/modules/notifications/api.ts`：渠道 ID 的唯一 owner、新渠道贡献点/协议、来源与目标判别类型、health 目标、unavailable 投递状态。
- `src/modules/notifications/core/ports.ts`：增加注册状态查询，区分未注册与已注册但不可投递。
- `src/modules/notifications/core/service.ts`：未注册渠道记录 unavailable；保留先持久预留再投递、恢复、已读和幂等逻辑；正文呈现函数只声明实际读取的 body/presentation 字段。
- `src/modules/notifications/core/service.test.ts`：追加旧 inbox 与新 health 记录混合追加/去重回归，原断言保留。
- `src/modules/notifications/module.ts`：装配内置渠道、动态贡献点、按来源类型选择 opener；处理撤销、迟到贡献收集与卸载；错误反馈使用 T-02 公共入口。
- `src/modules/notifications/platform/delivery.ts`：将原 in-app/system 分为两个内置渠道，保留内容/事件，增加 Native Notice 与系统 Notification 释放及安全错误反馈。
- `src/modules/notifications/ui/InboxPanel.tsx`：按目标类型显示报告 ID 或自动化/运行 ID；未知渠道显示其 ID，unavailable 使用本地化文案；布局不变。
- `src/modules/notifications/ui/InboxPanel.dom.test.tsx`：追加 health 详情与 unavailable 展示回归，既有测试不变。
- `src/modules/notifications/ui/notification-presentation.tsx`：操作失败显示固定双语安全文案，避免新来源 opener 的原始异常进入公开界面。
- `src/modules/notifications/i18n.ts`：新增 operationFailed、deliveryUnavailable、reportId、targetNameGeneric，en/zh 成对。
- `src/modules/automations/services/runtime.ts`：生产者发送 automation-run 来源/目标，原 SourceRef 放在目标中；保留名称/正文快照及来源、笔记和运行跳转；拒绝接管 health 记录。
- `src/modules/automations/core/actions/definition.ts`：渠道类型改从 notifications/api 导入。
- `src/shared/automation/types.ts`：删除旧 NotificationChannelId 导出；定义中的渠道保持 JSON 字符串数组，不反向依赖模块。
- `src/shared/automation/metadata.ts`：删除旧枚举导入/白名单，校验可扩展稳定渠道 ID，仍拒绝空值、非字符串和非法字符。

新增的 8 个文件：

- `src/modules/notifications/core/channels.ts`：实例作用域渠道注册表，注册/撤销、可用性、投递及晚到回调隔离。
- `src/modules/notifications/core/channels.test.ts`：贡献渠道投递/重载/幂等和未注册 unavailable 两项测试。
- `src/modules/notifications/core/openers.ts`：按来源类型解析当前活动 opener，缺失 opener 不把操作伪装成打开成功。
- `src/modules/notifications/core/openers.test.ts`：health 无自动化 ID 的真实 inbox 打开/已读回归。
- `src/modules/notifications/core/module-lifecycle.test.ts`：真实 ModuleRegistry + notifications 模块的贡献装配、提供者禁用、晚到事件、inbox 禁用/重开与去重测试。
- `src/modules/notifications/platform/delivery.test.ts`：真实内置投递实现对接 Native Notice/Notification 系统边界替身，验证原内容/事件和释放。
- `src/modules/automations/core/notification-channels.test.ts`：定义可保存贡献渠道 ID，且不接纳无效值。
- `src/modules/automations/services/notification-runtime.test.ts`：真实 runtime、AutomationService、Markdown 定义仓库、内存 Vault 与真实 NotificationService 的生产者迁移集成测试。

另新增本 REPORT。没有修改 TASK、前序 REPORT、正式 Evidence、Ticket/Map/Goal、home 只读消费者、automations 的 module/manifest、UI 夹具、T-02 反馈实现或生成物。没有安装依赖或执行 Git 写操作、提交、推送、发版；其他执行者的 package/lockfile、app、safe、navigator 等 dirty 改动保持原样。

### 关键决定

- NotificationChannelId 归 notifications/api，使用稳定字符串 ID；注册表和自动化元数据均要求 `[a-z][a-z0-9._-]*`。shared 的自动化定义只存字符串，符合 shared 不依赖模块的边界。没有旧导出别名，`rg` 核对旧消费者已迁移。
- 新自动化生产者总是发送 `source.kind='automation-run'`、`target.kind='automation-run'`，并继续使用 run.id 作为幂等 ID。health 来源只需其 report ID，不需要 runId/automationId；类型约束将两种来源与对应目标关联。
- 现有 inbox 中没有 kind 的目标和原 SourceRef 继续按自动化历史快照解释；不迁写旧 title/body/read/createdAt/receipts。可选历史字段用于 AC-134 的实际数据兼容，不是恢复旧渠道类型别名。
- opener 按类型过滤后再检查 canOpen，名称解析也来自同一匹配贡献。未声明 kind 的既有 automations module 包装贡献归 automation-run，其实际 runtime opener 已显式迁移；health 不会被该包装贡献误接管。
- in-app/system 是 notifications 自己拥有的两个内置渠道，经同一注册表投递；外部贡献由提供模块拥有资源释放。撤销是幂等的，旧注册的晚到 open/failed 回调不会污染新注册或已关闭 inbox。
- 仅未注册渠道新增 unavailable 状态，send 正常结算并持久记录。已注册但设备不支持的 system 仍按旧行为记 failed；sent/failed/unknown/pending 的既有语义不改。预留回执继续先于外部副作用；后来注册渠道不会重放已预留的旧 ID。
- 动态贡献收集有 generation/disposed 检查；只收集活动提供者，不因打开记录而启动模块。禁用 notifications 后旧实例拒绝新发送，重开读取旧回执而不重复投递。
- 用户操作失败通过 `reportOperationFailure` 使用固定资源键，不把新来源 opener 的原始异常送入 UI/新增日志。自动化原有私密错误/参数过滤和主动提醒正文快照保持。
- 通知详情沿用原布局/组件，只适配不同目标字段与新状态。没有引入外部渠道、health 模块实现、新依赖或新持久化根。

### AC 对应测试事实

| AC | 实际证据 |
|---|---|
| AC-131 | 真实 notification-runtime 集成执行自动化、保存定义、投递到真实 inbox，检查新来源/目标、名称快照、主动提醒正文、运行跳转和已读；原 automations 套件及 readonly `test/automations/notification-names.test.ts` 的重命名、删除、重放、原文哨兵和历史正文回归全部通过；安全回归通过。 |
| AC-132 | openers.test 中 health 记录不携带运行/自动化 ID，来自自身 kind 的 opener 打开 reportId 并标记已读，宽泛的自动化 opener 不会抢占；真实模块生命周期与 health DOM 详情继续覆盖组装和显示。 |
| AC-133 | channels.test 注册测试渠道，检查真实存储回执和重载不重复；未注册 ID 为 unavailable、不抛错，之后注册不会重放旧 ID；真实 ModuleRegistry 测试确认 NOTIFICATION_CHANNELS 被实际收集并随提供者撤销。 |
| AC-134 | service.test 读取已有 inbox 的旧记录，追加 health 后旧 title/body/target/read/createdAt/receipts 仍逐字段相同；重复旧/新 ID 均不重复投递；module-lifecycle 在关闭/重开后也保持已读和幂等；原 inbox 恢复/hold/unknown/清理回执测试保留并通过。 |

### 实际验证命令与退出码

最终通过的门禁：

| 命令 | 退出码 | 结果 |
|---|---:|---|
| `pnpm exec vitest run src/modules/notifications src/modules/automations test/automations/notification-names.test.ts` | 0 | 最终 26 files / 173 tests 通过，包含 9 项新增回归、原通知/自动化套件及只读名称快照测试。较早同命令也分别通过 23 files/168 tests、24 files/171 tests；以最终输入为准。 |
| `pnpm exec vitest run --project dom src/modules/notifications` | 0 | 1 file / 3 tests，原交互及 health/unavailable 详情通过。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 0 | 最终生产类型检查通过。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 0 | 最终测试类型检查通过。 |
| `pnpm run lint` | 0 | 最终全仓零警告。 |
| `pnpm test:safety-regressions` | 0 | 现有安全门禁全部通过，输出有 Node DEP0205 提示，没有失败。 |
| `pnpm test:architecture` | 0 | 1297 modules，无分区/宿主/桌面/桶文件/循环违规。 |
| `pnpm test:i18n` | 0 | 32 dictionaries / 5337 keys，双语占位符及引用通过。 |
| `git diff --check -- src/modules/notifications src/modules/automations/services src/modules/automations/core/actions/definition.ts src/shared/automation/types.ts src/shared/automation/metadata.ts` | 0 | 选定已跟踪差异无空白错误；新文件内容另由类型、lint、测试核对。 |
| `sha256sum .agents/skills/dev/SKILL.md` | 0 | d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e，与必需绑定一致。 |

开发中的红绿切片与定向检查：

- `pnpm exec vitest run src/modules/notifications/core/channels.test.ts`：初始 **126**，已注册渠道 available 仍为 false；实现注册表后 **0 / 1 test**。追加未注册渠道用例后再次 **126**，实际 failed 而不是 unavailable；实现状态区分后在完整 core 套件 **0**，最终包含 2 项渠道测试。
- `pnpm exec vitest run src/modules/automations/core/notification-channels.test.ts`：初始 **126**，贡献渠道被旧白名单拒绝；迁移类型/验证后，与渠道测试组合命令 `pnpm exec vitest run src/modules/automations/core/notification-channels.test.ts src/modules/notifications/core/channels.test.ts` 为 **0 / 2 tests**。
- `pnpm exec vitest run src/modules/notifications/core/openers.test.ts`：初始 **126**，health 记录不可打开；实现按类型解析后 **0 / 1 test**。
- `pnpm exec vitest run src/modules/notifications/core`：渠道与 opener 实现后 **0 / 3 files、14 tests**；之后新增测试由最终完整套件覆盖。
- `pnpm exec vitest run src/modules/notifications/core/module-lifecycle.test.ts`：**0 / 1 test**。受控移除 activate 中的首次 refreshChannels 后，同命令 **126**，真实模块中贡献渠道 available=false；恢复后 **0**，module.ts SHA-256 与变异前完全一致。
- `pnpm exec vitest run src/modules/notifications/platform/delivery.test.ts`：**0 / 1 test**，Native Notice/Notification 替身仅位于系统边界，实际使用真实投递实现与注册表。
- `pnpm exec vitest run src/modules/automations/services/notification-runtime.test.ts`：**0 / 1 test**。受控把实际 runtime 的新来源退回旧 snapshot.source 后，同命令 **126**，真实执行所得来源为 undefined；恢复后 **0**，runtime.ts SHA-256 与变异前完全一致。
- `pnpm exec vitest run src/modules/notifications/core/service.test.ts --project dom src/modules/notifications/ui/InboxPanel.dom.test.tsx`：**0 / 1 file、3 tests**。此命令带 dom 项目筛选，只执行 DOM 文件；service 单测由最终完整套件执行，不冒称该次两文件都运行。

其他失败与处置：

- 最初的无写入 TypeScript 内存探针预期 UI-review 夹具出现 TS2345，但断言未成立，退出 **126**；确认该 scripts/*.tsx 夹具不在生产 tsconfig 的检查文件集合内，没有把未确认的推测升级为范围阻塞，也没有修改夹具。
- 最早生产类型基线曾 **126**，指出并行 safe 任务的 `quick-pick.test-support.ts` 类型错误；未修改该文件，后来最终全仓检查为 **0**。
- 实施中一次生产类型检查 **126**，指出尚未适配的 InboxPanel 自动化 ID 可空访问；完成 health 分支收窄后 **0**。
- 一次测试类型检查 **126**，旧自动化测试把泛型记录与单独的 presentation 组合后传给正文函数，触发完整请求的来源约束；将 `notificationBody` 的输入精确为它实际读取的 `Pick<NotificationRequest, 'body' | 'presentation'>`，保留严格发送协议和原测试不动，最终 **0**。
- 首次全仓 lint **126**，指出渠道 ID 泛化为 string 后旧 `Object.keys` 类型断言已多余；删除该多余断言后最终 lint **0**。没有关闭规则、使用类型抑制或弱化既有断言。

没有删除原测试或提高阈值。上述 126 均为终端工具实际返回值；受控变异的失败来自预期业务断言，探针/中间类型错误没有计为产品红灯。

### Skill Execution Records

使用 SpecDev I 和 dev Skill，复用本会话已完整读取的 implementation-procedure、execution-preflight、domain-runtime、变更范围、架构、TDD、错误/资源及测试合同；dev 摘要与本票绑定一致。实际执行：

1. dev 规则 2：先追踪所有旧渠道类型消费者和通知调用链；按续派写集迁移 metadata 与 core action，shared 只留字符串数据合同，模块之间只经 notifications/api 访问，架构门禁通过。
2. dev 规则 3：渠道/Openers 的 API 只含类型和贡献键；实际模块仍经 manifest 懒加载，UI 加载路径不动，没有新增启动 UI 依赖。
3. dev 规则 4：贡献注册具有幂等撤销，收集结果有 generation/disposed 防护；模块禁用封闭发送，Native 对象释放，晚到回调隔离；真实注册表/模块生命周期及原生边界测试通过。
4. dev 规则 6：通知路径仍由 notificationInboxPath 生成，恢复 owner 与 receipts 协议保留；以旧 inbox 混合追加、恢复与重载回归证明没有数据搬迁或旧快照覆写。
5. dev 规则 7：新增 4 对通知模块词典键并通过 t 使用；模块继续注册自己的词典，i18n 门禁通过。
6. dev 规则 8：没有添加 Node/Electron 或 shared 宿主依赖；Native 对象仍在 platform，界面仍在 ui，服务/核心不导入 React。
7. dev 规则 9：修正真实 lint/类型发现，最终全仓零警告，没有规则豁免。
8. dev 规则 11 与 testing 选择表：只修改声明写集，逐行为取得红绿与真实消费者证据，完成指定安全/架构/类型门禁；不安装、不改构建产物、不做 Git 写操作。
9. ui 规则实际应用：InboxPanel 只增加目标判别和新状态文案，保留原布局、语义按钮、组件和所属窗口上下文；DOM 验证详情与操作，没有另建页面、样式或设计系统。

本轮没有复制/改编新的 bz 源码、没有引入外部包或外部通知渠道；复用的是仓库自身的 Native 投递、inbox 和 T-02 反馈 API，因此没有新的 bz 文件署名/许可登记条目。

### 未执行 / 未验证

- `pnpm run build`、`pnpm run build:css`、`pnpm notices`：未执行，owner Lead，TASK 禁止执行者改写共享产物。
- `pnpm check:bundle`、`pnpm check:notices`、UI runner：未执行，owner Lead。
- 双轴独立审查、正式 Evidence、Ticket 状态和最终验收：未执行，owner Lead / 另一 reviewer。
- 真实 Obsidian Native Notice、系统通知权限/点击、移动端宿主表现：仍待宿主验收；系统边界替身与 DOM 不替代真机。
- 未运行全仓 pnpm test；实际范围为最终命令表及安全回归。没有声称 health 模块或任何外部投递渠道已实现。

## 问题与下一步

018 的两个必要类型消费者越界问题已在新增授权内解决，本轮没有未解除的实现阻塞。请 Lead 按本候选实际 22 个文件冻结输入、安排独立双轴审查，再串行完成构建/产物/包体检查并写正式 Evidence 与状态。本报告不宣称 Ticket done、已提交或独立审查通过。
