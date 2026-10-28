# T-15/T-16 真实 owner 与最小恢复合同

只读工程核对；独立 reviewer `/root/review_data_and_delivery`，本轮派遣模型 gpt-6-astra/high。2026-10-25。仅写本报告，未实施、未改项目、未运行 build 或产品测试。沿用已读取的 AGENTS、dev Skill 与 architecture/testing 规则。原始审查输入 SHA256 为 `a1d03ba025c1a456c439f4248cce90197815720b6c9e0d5021862e7a03dda0a4`；这是前轮冻结输入的身份，不代表当前实施工作区快照。下列行号来自本轮实际回读；T-01 实施进行中，后续实现前需回读受影响文件。

结论：完整工作台业务备份跨越 agent、app settings、automations、notifications、未来 shared-workspace 五类持久 owner。已有 automation run/invocation 就是业务结果与幂等凭据，保留原结构即可；无需新增 Run 平台或数据库。单纯扩大 T-16 写集仍不足，必须写明“关 admission、排空、共同快照、暂存、可恢复提交、刷新 live baseline”的行为合同。真实宿主端到端按用户决定交接，下面所列验收可由自动化完成。

## 1. 真实持久 owner 清单

表中 `<device>` 是现有设备身份；新 Space/Session/mailbox 文件名不是已有事实，由 T-02/T-10 定稿后纳入同一 owner 清单。不得从目录名字猜内容完整性。

| Owner / 数据 | 实际持久位置及依据 | 现有接缝与补充要求 |
|---|---|---|
| app settings 的 agent namespace | `src/modules/agent/settings.ts:5` 注册 device scope；`src/app/settings/runtime.ts:54` 至 64 用 `.huhu/config/settings.json` 与 `.huhu/config/devices/<device>.json` 的 JsonStore 承载所有 namespace | `SettingsStore` 是唯一文件 owner。只导出/导入 agent namespace，不能用整个设备文件覆盖 browser/app 等其他设置。当前 get/update/subscribe/flush 无受控导入接口；`src/shared/settings/store.ts:69` 的 load 只替换 raw/persisted，而 `:83` 已绑定 namespace 有缓存，不能 reload 文件后放任旧缓存重写。 |
| agent 旧工作台布局 | `.huhu/terminal-agent/<device>/workspace.json`，`src/modules/agent/services/workspace-store.ts:8` 至 18 | store、ready、flush、dispose（:64）。flush 的 catch 仅 report、保留 dirty 后 resolve（:26–44），不是可靠停写成功凭据。布局包含旧 browser/page tabs；T-13 拆出的 shared-workspace 是新的独立 owner，应导出它拥有的布局部分，不能要求已禁用的 agent 激活才能取得。 |
| 新工作台 Space/Session 与 Session mailbox | T-02/T-10 所有权与最终版本化格式；本轮没有将未来路径冒充当前实现 | inbox ack 是 mailbox owner 的业务记录；它与 notifications 的 read/receipts 不同，必须分别往返。读取/导出不启动 runtime、不扫描 Provider 原生日志。 |
| agent 历史标注 | `.huhu/terminal-agent/<device>/history.json`，`src/modules/agent/platform/history/service.ts:95` 至 106 | `NativeHistory.update` 排入 tail（:175–185）；metadata/raw tuple key 与 alias 映射需一起保全（:159–174），不能按 sessionId 单字段合并不同 account。当前公共历史视图不是完整 metadata 快照。增纯数据 codec/owner 入口，避免导出为取标注而启动 native history 扫描。 |
| agent automation-session 引用登记 | `.huhu/terminal-agent/<device>/automation-sessions.json`，`src/modules/agent/services/agent-runtime.ts:129` 至 147 | registry 是原生会话来源引用，不是结果正文。键包含 agent/session/accountKey（:540–552）。dispose 返回 void，最终 persist 是 fire-and-forget（:554–561），须有 awaitable 严格 drain。 |
| agent 自有使用统计 | `.huhu/terminal-agent/<device>/stats.json` 和 `workspace-stats.json`，`src/modules/agent/platform/stats-store.ts:4` 至 16 | 启动次数、工作时长、daily/byAgent 是自有累计值，不是可以任意丢弃的 SQLite 查询缓存。`services/stats-service.ts:94` 至 107 的 flush 也吞错；dispose 会结算活跃工作时长（:109–115）。快照不得因此虚构停止事件；旧不可归属统计保留 provenance/隔离报告，不强并进某个 Space。 |
| automations 运行/调用/结果 | `.huhu/automation/<device>/runtime.json`，`src/modules/automations/services/runtime.ts:120` 至 125；`core/service.ts:28` 的 state 为 definitions/runs/cursors | 完整保存现有 `AutomationRun`：invocation.request/receipt、definition 快照、retryOf、taskDelivery、timeline、precheckResult、message/error、output/usage、session/source、notificationAttempted（`src/shared/automation/types.ts:99` 至 121）。`api.ts:44` 至 61 只公开 UI、activeRuns、invoke/receipt，无完整备份 owner API。 |
| notifications 可见记录、已读与幂等回执 | `.huhu/notifications/<device>/inbox.json`，`src/modules/notifications/module.ts:25`；`core/service.ts:15` 至 19 的 records + receipts | `api.ts:32` 只暴露 records/unread/send。`clearRead` 删除 records 而保留 receipts（service:145–150）；仅导出 records 会丢去重墓碑。`send` 先持久预占后对外发送（:94–129），两者都必须纳入快照。不能把 notification read 当作 Session mailbox ack。 |
| 自动化定义文档（范围须明确） | `.huhu/automation/definitions/<name>-<id>/操作.md`，`core/documents.ts:61` 至 64；root 见 `src/shared/storage/vault-layout.ts:43` | `MarkdownAutomationDefinitions` 是公开仓储的真实实现，`platform/definitions.ts:25` 至 49 提供 list/save/remove/shutdown；内部 `domain/automations.json` 是 MarkdownCollectionStorage 的逻辑键，不是可以额外打包的真实 JSON 文件。若包承诺恢复可编辑自动化定义，必须调用这个 owner；仅恢复运行历史时保留 run.definition/source 即可，不顺着来源遍历 dashboard/普通笔记。 |

边界：原生 Provider transcript/account home/凭证、helper/CLI、活动 PTY/锁/endpoint、history SQLite 索引不作为业务文件恢复。网页 tab 的 URL/profile 引用/布局由 shared-workspace 保存；浏览器 cookies、IndexedDB、缓存及下载目录不因此成为备份范围。`src/modules/browser/platform/store.ts:15` 至 30 的 `.huhu/browser/<device>/state.json` 还有权限等浏览器 owner 数据，不能整目录附带复制。普通 `huhu/` 用户笔记和自动化 SourceRef 指向的外部文档保留引用、不递归打包。若结果确有附件路径，需要 owner 枚举明确的自有附件集合或报告缺项，不把任意路径当附件读取。

## 2. 当前 API 不能直接替代恢复合同的原因

1. **flush 不等于停止新写。** `SettingsStore` 的 handle.update 在 schedule 前已更新内存并通知（`src/shared/settings/store.ts:133–139`）；只锁磁盘队列会允许内存漂移。JsonStore 的 per-file queue 与 flush 保证单文件串行/错误传播（`src/shared/json-store.ts:53–91,113–116`），不保证跨 owner 一致快照，也不阻止下一次 admission。workspace/stats 自己捕获了写入失败，不能当导出成功依据。
2. **停用/卸载含业务副作用。** `AutomationService.setExecutionEnabled(false)` 关闭后会停止 active runs/launches（`core/service.ts:106–135`），shutdown 会 abort/cancel 并写 interrupted（:814–833）。通知 shutdown 封死对象且 dispose adapter（`notifications/core/service.ts:163–169`）。普通导出不能悄悄用这些方法代替可恢复短期门禁。
3. **正常 load 会改业务并发消息。** automation load 将 active run 改 interrupted、清空 message，再 refresh 并 publish（`core/service.ts:151–168`）。publish 检查 notificationAttempted 后发送并回写（:763–766）；运行通知 id 正是 run.id（`services/runtime.ts:139–154`）。恢复应采用专用无副作用 adopt/reload，不能复用该 load。只在当次导入暂时关闭通知也不够：重启仍可能补发 imported run 未发送的通知。
4. **恢复不能使用普通追加路径。** automation commit 会每个 automation 保留最多 100 条非 active run（`core/service.ts:778–809`），而 invoke 对同 invocationId 校验 request 并返回现有 receipt（:345–353）。导入必须先验证并保全包里实际存在的历史与 receipt，不能通过逐条 invoke 或会提前裁剪的普通 mutation 恢复；不承诺恢复导出前已被正常 retention 删除的记录。
5. **启动顺序必须有恢复门。** `src/app/main.ts:55–62` 初始化设备后会刷新 managedContent 并 loadSettings，后续才激活模块。如果一次多 owner 切换只完成半数文件便崩溃，必须在加载这些业务 owner 前完成 journal 恢复或拒绝业务启动，否则旧内存/半新文件立即被使用。设备身份本身不随导入覆盖。

## 3. 建议最小 public 合同（局部能力，不是新平台）

建议在 shared 定义纯 TS 数据协议，每个模块在自己的 `api.ts` 发布受控备份 owner；app/现有 service registry 注入 owner，不允许 agent services 越界 import automations/notifications core。禁用模块提供离线 codec/adapter，可读数据且不激活 scheduler、Provider 或 native runtime。shared-workspace 按其 shell/app 既有公开接缝注册。

每个 owner 至少提供以下语义；函数名供实现选择，但行为必须写入 T-15/T-16：

- **preflight/inspect**：只读列出真实版本、数据集合、活动写入/工作、可接受的源到目标身份映射、冲突、缺项；严格区分不存在与损坏/不可读。合法路径来自 owner 白名单，不能由包指定任意目标路径。
- **quiesce(operationId, purpose)**：先原子关所有相关新 admission（UI/CLI/后台/自动化/完成回调等），再返回独占 token；期间 admission 明确 BUSY/失败，不静默丢写。必须说明已接收操作如何完成，以及失败如何撤销门禁。活动运行如何处理见下节决策，不能隐式 stop。
- **drain(token)**：await 所有已接收 transitions/launch completion/metadata/stat/settings/notifications writes；任一持久失败 reject。外部通知提交后回调也属于排空/隔离的边界；不能遗漏迟到 callback。锁只管本进程时，应对外部文件修订摘要变化中止提交，不能声称跨进程互斥已解决。
- **snapshot(token)**：所有参与 owner 都关门并 drain 后，取得脱离 live 对象的版本化内容、计数、引用和 hash。同一快照点包含 automations runs 与对应 notifications receipts；不逐个解锁后再读下个 owner。对原生来源只输出引用/缺项。
- **stageRestore(token, section, mapping)**：严格验证 schema/容量/身份/引用/源摘要，在隔离 staging 中生成完整 owner 目标；不改 live 数据、不调用 invoke/publish、不重新授权目录。合并设置仅更新 agent namespace；不覆盖其他 namespace。
- **commit + adopt/reload(token, committedRevision, effectsDisabled)**：app 级小型 coordinator 按 T-15 recovery journal 管理所有参与文件的恢复副本、提交阶段与摘要；每 owner 重新建立内存对象、baseline、JsonStore 缓存和订阅视图。提交期间 reader 不观察半旧半新，所有 adopt 成功后才开放写入。恢复不能启动模型、定时任务、外部通知、浏览器导航或执行用户脚本。
- **release / abort**：正常结束恢复 admission；commit 失败先保证全部回旧版本或全部恢复到新版本，再开放。未能确定状态时保持恢复门，给出可回读报告而不是宣布成功。重启依据 journal 幂等处理。operation token 过期/重复 release 必须无破坏性。

数据散布 `.huhu/config/devices/`、`.huhu/terminal-agent/`、`.huhu/automation/`、`.huhu/notifications/`，一次目录 rename 不能同时切换这些真实路径。建议复用 T-15 的 journal + 每 owner staging/旧副本 + 启动门，提供应用可观察的事务一致性；不要求数据库或迁移全部 owner 到新目录。若采用 generation pointer，须承认它需要所有读写 owner 改用该 pointer，不能只改备份代码。

## 4. Root 需在 Spec/合同明确的行为决定

这些是实现所需的局部语义，不要求把工程细节再问用户；Root 可在已有授权下选定并写明。

1. **“完整”的集合**：至少工作台/标注/mailbox/settings/自有统计/automation run-invocation-result/相关 notification receipts。建议通知 records 仅取工作台/这些 runs 关联部分，关联 receipt 必须保留；若选择整个 notifications inbox，应明说会包含其他业务通知。定义文档是否也恢复必须明确，不能仅凭 runtime.definitions 缓存宣称所有独立定义完整。来源笔记不纳入。
2. **活动时策略**：v1 最小安全实现可在迁移/导入遇到活动 owned runtime/action 时拒绝并列出需用户先停止的工作；不要自动停进程。导出选择可证明的短暂停 admission/drain 一致快照，或明确 BUSY；不能把未 drain 的内存/磁盘拼成成功包。对不会结束的 live completion writer，须选择有界冻结且缓冲晚到事件，或 BUSY，不能无限等待。
3. **身份与覆盖策略**：源 device id 作为 provenance，不替换当前 device identity；Space/Session/account/source tuple 映射显式验证。建议 v1 只导入空目标或完全相同摘要的幂等重试；不同内容碰撞在写前拒绝，不自作合并。多设备全部导出还是当前设备需在清单声明；若只当前设备，不称整个 Vault 全量。
4. **恢复不重放副作用**：Imported 历史的 pending/running/unknown 保存原始来源事实，并以非活动恢复状态呈现，不复活 runtime；禁止导入后和下一次启动补执行 schedule/重发消息。明确持久化的“已恢复、禁止自动补发”标记或已有 receipt 合法转换规则，不能临时关闭一次开关，更不能把未发送伪称 sent。保留原 run/invocation 主结构；可在现有 owner 恢复元数据保存必要 provenance/抑制状态。
5. **设置/授权边界**：agent 设置有 `overrides.env`（`core/terminal/settings.ts:29–32`）、per-agent env（`core/launch/types.ts:9–18`）、accounts/skillDirectories/YOLO 确认。无凭证包必须明确结构化 env 凭据如何排除/报告；不能整份 namespace 盲拷。保留用户 permissionMode 配置与目标机器有效授权应分开处理，避免无声降级或自动授予；外部目录与源路径重新核对。普通用户 quick-command 文本属于业务内容，不应靠猜测内容任意删改。

## 5. T-15/T-16 应补的精确源码写集

以下是最小职责映射建议；新增路径标“拟新增”，实现者可在同 owner 内选择邻近文件，但应先在票上落定。两个票是串行依赖，共享路径统一由 Lead 记录唯一 writer，不另开并发实现。

**T-15：负责一次性迁移、门禁与可恢复切换公共接缝。** 在当前 migrations/workspace/history/UI/docs 写集之外加入：

- `src/shared/storage/recovery-contracts.ts`、`src/shared/storage/recovery-transaction.ts` 及对应 `.test.ts`（拟新增；只含纯协议/journal 状态机，不接管业务 schema）。
- `src/app/main.ts`、`src/app/settings/runtime.ts`、`src/app/settings/runtime.test.ts`、`src/shared/settings/store.ts`、`src/shared/settings/store.test.ts`：启动恢复门、namespace 级受控恢复与 live baseline。app 协调装配可放 `src/app/recovery.ts` / `src/app/recovery.test.ts`（拟新增）。
- `src/modules/agent/api.ts`、`src/modules/agent/module.ts`、`src/modules/agent/platform/history/service.ts`、`src/modules/agent/services/agent-runtime.ts`、`src/modules/agent/services/stats-service.ts`、`src/modules/agent/platform/stats-store.ts`：真实 writer 参与、严格 drain、旧元数据路径核验。既有 `workspace-store*.ts`/`history-store*.ts` 不覆盖这些文件。
- T-02/T-10 已定稿的实际新 Space/Session/mailbox store 文件、T-13 `src/shell/shared-workspace/**`：按最终 owner 接入，不能仅挂 migrations 子目录就认为能停所有 writer。
- `test/agent-migrations/**`（已有计划）；新增测试具体名在实现时记录，执行命令必须实际包含这个目录。

T-15 不负责改变 automation 运行语义；先提供供 T-16 注册其他 owner 的通用恢复门即可。T-15 迁移包含哪些 owner，就必须在本票完成其门禁，不能借 T-16 的未来实现保证当下安全。

**T-16：负责业务包、完整 owner 快照与无副作用恢复。** 除原 backup/UI/docs 路径，加入：

- 上述 shared recovery 协议、app coordinator/main/settings 及 agent owner 实际文件（共享修改面；主要为注册/接线/最终格式清单）。`src/modules/agent/settings.ts`、`src/modules/agent/core/terminal/settings.ts`、`src/modules/agent/core/launch/types.ts` 仅当需要安全导出/授权字段 schema 时列入，优先独立 codec 避免无关重构。
- `src/modules/automations/api.ts`、`src/modules/automations/module.ts`、`src/modules/automations/services/runtime.ts`、`src/modules/automations/core/service.ts`；`src/modules/automations/core/invocations.test.ts`、`src/modules/automations/automation.test.ts`，拟新增 `src/modules/automations/core/backup.test.ts`。公开 owner 门禁、完整 runtime 快照、静默 adopt，保留既有 run/invocation 类型。
- `src/modules/notifications/api.ts`、`src/modules/notifications/module.ts`、`src/modules/notifications/core/service.ts`、`src/modules/notifications/core/service.test.ts`：records + receipts owner 接缝与不重放证明。
- 若选中定义文档：`src/modules/automations/core/documents.ts`、`src/modules/automations/platform/definitions.ts` 及各自 `.test.ts`；不要把整个 `src/modules/**` 或用户笔记根列为 writable。
- `test/agent-backup/**`（已有计划）；文档 `docs/data.md`/`docs/agent-workbench.md` 明列范围、活动策略、恢复限制。i18n 仅在对应 owner 新增对用户错误时列入；已有 Agent settings 入口可统一展示错误，不要求新增其他 UI。

## 6. 必须自动化覆盖的验收

这些都是可用内存/故障注入 TextStorage、fake clock、stub dispatch/notification adapter 验证的行为，不依赖真实 Provider E2E；实现前不存在的测试须由对应票提供，不能以旧 JsonStore 测试代替。

| 票 / 用例 | 必须观察到的结果 |
|---|---|
| T-15 门禁竞态 | 各 UI/CLI/后台入口在 gate 前已接收的写入全部 drain；gate 后明确拒绝或按约定缓冲；没有部分内存更新；旧 writer 在迁移提交后拒写。 |
| T-15 严格错误 | workspace/stats/registry/settings/history 各注入 write/verify/flush 失败；流程不能报成功，不落空对象，旧有效值可回读。 |
| T-15 崩溃矩阵 | 在保存 journal、每个旧副本、每个暂存/目标替换、每个 adopt、最终清理前后中断；用全新实例模拟重启，业务读取前恢复至完整旧版或完整新版。重复恢复幂等，无混合 owner。 |
| T-15 缓存重载 | 恢复后更新单个设置/标注/布局，其他新恢复值不被旧 baseline 覆盖；非 agent settings namespace 字节/语义不变。 |
| T-16 多 owner 往返 | fixture 含两账户同 sessionId、两 Space 同 cwd、完整来源 tuple、标注/alias、mailbox ack、旧/新布局、自有 stats、run.output/error/timeline/taskDelivery、invocation request/receipt；比较业务字段/计数/引用，不只 hash ZIP。 |
| T-16 notification 墓碑 | 发送后 markRead/clearRead，导出/导入，records 缺失但 receipts 存在；再次相同 id 不发送；pending 的恢复按约定 unknown/受抑制，adapter 调用数为 0。 |
| T-16 联动快照 | 在 automation 完成、notify 预占/回写边界插入 barrier；导出只能得到某个一致切面；恢复不能造成“新 run + 旧 receipt”导致重复通知。 |
| T-16 no effects 含重启 | 导入后的即时 adopt 和重建全部 services 的启动都断言 dispatch/spawn/invoke execution/native scan/schedule action/notification send 为 0；保留未曾 notificationAttempted 的 imported run 负例，不能只测已发送记录。 |
| T-16 invocation 幂等 | 同 invocationId + 相同 request 返回保全的 receipt 且不新执行；同 id 不同 request 按原逻辑冲突；retryOf/taskDelivery effectKey/target/source 引用不丢。 |
| T-16 retention | 导出包含存储当前实际所有记录；staging/adopt 不先调用普通 commit 裁剪。若格式需要 normal retention，明确时点并验证导入成功报告不隐瞒被裁剪记录；不宣称恢复源库早已删掉的历史。 |
| T-16 scope/security | 损坏/不支持版本/路径穿越/绝对路径/重复目标/ID 冲突/目录撤权/磁盘满在写 live 前拒绝或按 journal 恢复；不访问 account home/transcript/user note；env 凭据和活动 endpoint/lock 不出现在包。 |
| T-16 禁用 owner | agent/automation/notifications 未激活仍可按约定离线导出，或明确 unavailable 而不是 silently-empty；快照不得为读取数据启动 scheduler/native helper。 |
| T-16 动态与外部写 | 快照开始后被外部 writer 改源摘要、迟到通知回调、用户取消；不吞掉更新，不混入另一代，不成功覆盖冲突数据，gate 可安全恢复。 |

建议 T-15 明写 `pnpm exec vitest run test/agent-migrations src/shared/settings/store.test.ts src/app/settings/runtime.test.ts`，并包含新增 recovery 测试实际路径；T-16 明写 `pnpm exec vitest run test/agent-backup src/modules/automations/core/invocations.test.ts src/modules/automations/automation.test.ts src/modules/notifications/core/service.test.ts`，加上新增 owner backup 测试。这些命令是拟交付后的验证入口，本次未执行，不能记通过。源码类型/构建/lint 由实施者按 testing Skill 在串行构建窗口完成；真实双库/目录授权/Provider 端到端保留给用户。

## 7. 核对限度

以上基于真实源码静态读取与公开 API 核对；没有验证一个尚不存在的恢复实现，没有模拟实际磁盘/宿主崩溃，也未验证五平台 filesystem 原子性。包格式、新 owner 文件名及 Root 尚未确定的范围/活动策略是待落定合同，不作为既有事实。建议不引入新运行领域模型、不扩大到无关笔记；必要的恢复 journal/owner 门禁是 T-15/T-16 现有承诺的工程闭环。
