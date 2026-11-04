# 任务回报

Session: 20261104T095541Z
Task: 094-fix-t05-metadata
Status: completed

## 聚焦交接

已确认渠道校验开放是有意设计，并将旧封闭白名单测试更新为当前合同：格式非法 ID 被拒绝，格式合法的未注册 ID 被接受且原值保留。原测试先实际跑红，更新后 metadata 与投递端定向 18 项通过，shared/automation 44 项、notifications/automations 166 项、两套类型、全仓零警告 lint、安全与架构门禁均通过。未知渠道的 unavailable/不抛错/幂等风险已有真实服务测试承接，本轮无需新增或修改投递实现。completed 仅表示候选交回；正式 Evidence/Ticket 状态、独立审查及集成全量验收由 Lead 处理，不宣称票据 done。

## 产物与验证

### 全部写入

- 修改 `src/shared/automation/metadata.test.ts`，仅替换与新合同冲突的 reject unknown channels 用例：
  - 接受 pager、email、team.v2_channel-1 三种格式合法的未注册 ID，与 in-app 混合时接受并保留渠道原值，覆盖合法数字/点/下划线/连字符。
  - 拒绝空串、大写开头、空格、斜杠、数字开头及非字符串（number/null/undefined/object/array）；每种同时测试单独出现与混入合法渠道的情形，确保 every 校验不会遗漏非法成员。
  - 保留原 in-app/system、动作字段/时间、旧任务 marker 字节与 effect identity 测试及断言。
- 新增本 REPORT。

未修改 metadata.ts、任何其他生产源码或既有投递测试、冻结 TASK、旧报告、正式 Evidence/Ticket/Map/Goal、产物、依赖或其他执行者文件；未安装、执行 Git 写操作、提交、推送或发布。

### 有意设计的依据与风险承接

已完整读取 TASK、当前 T-05 Ticket、Map revision 12 的实施背景/Skill 矩阵，并核对当前 metadata、NotificationChannelRegistry、NotificationService 的真实调用链及相关测试。沿用本会话已读的 SpecDev I/implementation-procedure/execution-preflight/domain-runtime、Spec/ADR/CONTEXT/Goal 及 dev Skill/测试和范围规则；dev 摘要未变。TASK 明确 Ready/授权/Execution Context/依赖由 Lead 核验；实际 HEAD 为 29644dc5833bb209e6282f84fa71441a5a1b99d4，使用 current/dev。

放宽为“语法合法即可读取”是有意的合同变化，不能为旧测试恢复封闭白名单：

- change ADR-005（accepted）明确通知为可扩展基础设施，渠道通过注册贡献，in-app/system 只是首批实现；封闭联合会让每加渠道都修改共享类型并牵动自动化。
- Spec AC-133 明确：测试渠道可投递并记录状态，**未注册渠道报告 unavailable 而不报错**。配置读取阶段不应将当前尚未注册的合法 ID 当作损坏定义，注册可用性属于投递阶段。
- 当前 metadata.isDefinition 使用类型检查及 `^[a-z][a-z0-9._-]*$` 验证语法；NotificationChannelId 为 string，注册器使用对应 ID 格式。NotificationService 在 registered(channel) 为 false 时直接记录 unavailable，未尝试调用缺失渠道。

未知渠道风险由既有测试承接：

`src/modules/notifications/core/channels.test.ts` 的 **an unregistered channel is persisted as unavailable without throwing or replaying its reserved ID**（第 28 行）。它使用真实 NotificationService + NotificationChannelRegistry，内存存储端口，明确断言 send resolves、记录中 not-registered=unavailable；之后注册同 ID 渠道，再发送已保留请求不会重放，而新操作 ID 可以正常投递。该测试本轮定向和整票回归都实际通过，因此不新增重复测试，不改变生产处理。

### 红绿与实际检查

先运行原 metadata 测试，reject unknown channels 在 pager 断言处实际失败：expected true to be false，工具退出码 126，1 failed / 3 passed。然后只更新测试合同，生产实现不动；同 metadata 文件 16 项及渠道端 2 项均通过。旧未知渠道断言是依据当前明确授权替换，非法输入与投递风险分别由更精确的断言承接，没有放宽生产校验、删除无关用例或提高阈值。

| 实际命令/检查 | 退出码 | 结果 |
|---|---:|---|
| `pnpm exec vitest run src/shared/automation/metadata.test.ts`（修改前） | 126 | 复现旧合同测试红灯，1 failed / 3 passed。 |
| `pnpm exec vitest run src/shared/automation/metadata.test.ts src/modules/notifications/core/channels.test.ts` | 0 | 2 文件 / 18 项通过，含 metadata 16 项和真实投递渠道 2 项。 |
| `pnpm exec vitest run src/shared/automation` | 0 | 3 文件 / 44 项通过，保留任务 metadata 相关回归。 |
| `pnpm exec vitest run src/modules/notifications src/modules/automations` | 0 | 25 文件 / 166 项通过，包含非自动化来源、渠道贡献、旧 inbox/幂等、消费者迁移回归。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 0 | 生产类型通过。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 0 | 测试类型通过。 |
| `pnpm run lint` | 0 | 全仓零警告。 |
| `pnpm test:safety-regressions` | 0 | 安全门禁通过；Node DEP0205 为弃用提示。 |
| `pnpm test:architecture` | 0 | 1345 模块，无分区/宿主/桌面/桶文件/循环违规。 |
| `git diff --check -- src/shared/automation/metadata.test.ts` | 0 | 差异无空白错误。 |
| sha256sum 修改文件、只读实现/承接测试、dev Skill | 0 | 快照及 Skill 绑定如下。 |
| validate-dispatch.mjs：当前 scope/session/task、stage dispatch | 0 | errors/warnings 为空。 |

过程日志仅本地：/tmp/huhu-094-ticket.log、/tmp/huhu-094-shared.log、/tmp/huhu-094-safety.log。未将原始日志、代码或过程材料放入 evidence。

### Skill Execution Records

1. dev 分区/范围：修改前核对 shared 元数据读取与 notifications 投递消费者两端，只改 Lead 新授权的测试路径；没有将注册器或宿主依赖引入 shared，无新增导入或模块边界变化，架构门禁通过。
2. dev 数据/兼容：依据 ADR-005/AC-133 保持生产读取语义，保留旧 marker 字节/effect identity、内置渠道和其他动作校验，运行 shared 与通知/自动化完整定向套件；不新增格式、字段或迁移。
3. dev testing：先实际复现原红灯，再按新合同分别覆盖有效/无效输入，核对真实投递端的 unavailable/不抛错/不重放测试；使用现有接缝和真实服务，不以新的 mock 调用断言替代风险承接。
4. dev 9/11：实际两套类型、全仓零警告 lint、安全/架构通过；只写被授权的测试与 REPORT，不构建、不改生成文件、不提交，不碰并行 dirty 文件。
5. 无界面/文案/外部代码变化，未触发 UI 设计流程或新来源采用；无新依赖，原来源与许可登记保持。

dev SHA-256：d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e，与 T-05 绑定一致；复用已完整读取且未变化的 dev Skill。

### AC、快照和未验证项

AC-131/132 的泛化来源/目标/opener 及消费者迁移、AC-133 的渠道贡献/未注册 unavailable、AC-134 的既有持久化/幂等由本轮 notifications/automations 套件回归；本次新增验证聚焦 metadata 读取阶段与 AC-133 的边界，未重做或改写这些生产行为。正式整票验收仍由 Lead 完成。

| 文件 | SHA-256 |
|---|---|
| src/shared/automation/metadata.test.ts（本轮唯一代码改动） | 8965953629f27e1b9d84a378bc22a16517043eb297a83bf6df23be23f0741ee7 |
| src/shared/automation/metadata.ts（只读） | 0dd288d3f542a26ebc04cf0a7cd3d3cbd3bdec62ccdf30b7b2f4000e9c281214 |
| src/modules/notifications/core/channels.test.ts（既有风险承接，未改） | fd6e15370ee0cea3b3216f5ba3cc60b4b56328d476657bf403044ef2a68a4d8f |

- build、build:css、notices、check:bundle、check:notices、UI runner：未执行，owner Lead；本轮纯测试改动不改变插件产物，TASK 禁止执行者写共享产物。
- 全仓 `pnpm test`：未执行，由 Lead 重跑集成全量；本轮已覆盖原失败文件、同目录以及整票通知/自动化与安全门禁。
- 独立双轴复审、正式 Evidence/Ticket 状态和最终验收：owner Lead / reviewer。
- 真实 Obsidian/原生投递：未执行；本次没有改变投递实现。T-05 E2E disposition 为 not-required（界面不变）。

## 问题与下一步

无当前修复或检查阻塞。请 Lead 依上述单文件快照复核更新后的合同及既有投递风险承接，再重跑全量集成测试并维护正式 Evidence/状态；本轮无需修改生产实现，也不恢复封闭渠道白名单。
