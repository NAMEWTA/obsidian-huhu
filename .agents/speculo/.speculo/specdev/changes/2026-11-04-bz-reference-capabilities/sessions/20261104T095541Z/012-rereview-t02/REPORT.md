# 任务回报

Session: 20261104T095541Z
Task: 012-rereview-t02
Status: completed

## 聚焦交接

已完成冻结候选的独立复审，两轴均为 request-changes。F1–F4 的原始反例均已修复，新增回归和原有验收相关测试共 29 项全部通过；但来源去重仍能把其他操作的普通提示合并到已有进度上，造成进度消失，新增 1 项 major finding R1。Lead 新增的 bz 改编登记与文件头、固定来源和实际落点一致。仅写本 REPORT，未修改 TASK、业务文件、生成物或正式状态；下一步应修正 R1、补交错顺序回归并冻结新输入复审，不能据现有绿色测试验收本票。

## Review

- Strategy: independent
- Risk: medium（共享协议的操作身份、异步状态转换与宿主展示生命周期）
- Independence: required
- Reviewer: Codex / 本 TASK 独立审查会话，未参与实现或修复；与 008 初审同一审查者。实际会话关联与独立性回执由 Lead 核验，不虚构 provider/session ID。
- Review mode: working-tree
- Base: 29644dc5833bb209e6282f84fa71441a5a1b99d4
- Input-SHA256: 10edae7f1cac242f4294de27d271d4d9a73c0ed5e30ddc108be204e7f7fe01f9（TASK 提供的整体摘要）
- Scope: 本目录 TASK 的全部 12 项冻结路径；开始、中途及写报告前核对原始字节 SHA-256，均为 12/12 匹配，无输入漂移。
- 对照来源：008-review-t02/REPORT.md、010-repair-t02/REPORT.md；按 TASK 复核 F1–F4，并检查修复触及的共享状态机及宿主适配。

沿用本会话已完整读取的 AGENTS.md、dev/ui Skill、reviewer-contracts、risk-review、domain-runtime 等适用规则，并读取 result-reuse 合同。dev Skill 的当前 SHA-256 为 d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e，与 Ticket 必需绑定一致。回读 Ticket 和当前 Spec 的反馈行为/AC-101–105、ADR-004、CONTEXT、Map/Goal/README 的相关边界；共享写路径继续由 Lead 所有。

比较两轮 TASK 的冻结哈希，以下 7 项与初审逐字节相同：policy.ts、app/main.ts、safe-service.ts、safe 消费者 DOM 测试、RecordEditor.tsx、archives 消费者 DOM 测试、archives/i18n.ts。对原判 pass 部分仅评估此次共享状态机和展示切换是否波及，且重新执行两个真实消费者和双 Document 测试；不声称复用了旧快照的整票通过结论。修改影响链仍为 `createFeedback → FeedbackHost → app renderer / Notice`，未增加模块互访、宿主包依赖、持久化格式或用户文案。

## Standards Axis

Result: request-changes
Reviewer: Codex / 012-rereview-t02
Input-SHA256: 10edae7f1cac242f4294de27d271d4d9a73c0ed5e30ddc108be204e7f7fe01f9

### 原 findings 逐项复核

| 初审项 | 本轮结论 | 证据 |
|---|---|---|
| F1：来源合并串联不同操作、吞掉后续失败 | 原始反例已修复；相关隔离仍有 R1 | 活动项保存 operationKey，只有所属操作沿用 associatedId。新增 3 项 source-coalesced 测试通过，包括两条独立进度、success/failed 两种先结束结果和无中间进度直接结束。此结论不覆盖 R1 的相反交错顺序。 |
| F2：普通开始提示消失后吞掉首个结果 | 已修复 | 抑制条件明确排除 progress/outcome；五种首个终态以及首个进度再转失败共 6 项回归通过。 |
| F3：终态消失、去重窗口过期后复活 | 已修复 | terminalOperations 独立保留操作键和 target；publish 在去重前检查，closeTarget/dispose 清理。五种终态过期后拒绝旧 ID 的进度、提示和结果；新 ID、其他 target/source 可发布，5 项回归通过。未保留正文或动作闭包。 |
| F4：sonner 转 Notice 保留旧进度 | 已修复 | presentNotice 先 remove 同 ID renderer 项；新 DOM 回归实际使用 mountFeedbackRenderer/sonner，确认移除发生在 Notice 创建之前，旧 toast 退出且 Notice 无 progress。原双 Document、迟到 mount 和加载失败回退测试继续通过。 |

### R1 — major：普通提示仍可通过旧去重记录覆盖另一操作的运行进度

- **文件:行：** `src/shared/feedback/index.ts:89`，关联 `:80`、`:106`。
- **问题：** coalescible 仅检查新输入是不是普通提示，没有检查 `match.id` 指向的现有活动是否仍可合并。A 的普通提示升级为进度时沿用原 ID，但旧 source 去重记录仍指向这个 ID。B 使用相同 source/key 发布普通提示时，即便 ownedId 不存在，也会直接采用 match.id，覆盖 A 的 progress、改变该活动的 operationKey，并给原本常驻的进度安装普通提示的消失计时器。
- **可达条件：** 同一个 target/source 的两个操作共用来源去重键；A 先发开始提示再发进度，B 稍后开始。这是共享协议允许的输入，不需要无效类型、重用 operationId 或并发线程。
- **亲自运行的反例：** 内存加载真实 shared 模块，固定 now=1000，注入 Map 展示/计时器，所有输入使用 `source:'archives', target:'main', dedupe:{key:'scan',scope:'source'}`。依次发布 A 普通提示、A 的 `{completed:1,total:100}` 进度、B 普通提示，然后执行生成的普通提示计时回调。实际输出：

```text
before B: [{id:"feedback-1",text:"A scanning",progress:{completed:1,total:100},durationMs:0}]
after B:  [{id:"feedback-1",text:"B starting",durationMs:3000}]
after B informational timer: []
```

- **影响：** A 未结束就失去运行指示；B 的普通提示可以在 3 秒后清除 A 原来的展示实例。A 后续结果也无法替换原进度实例。与 Ticket 的操作身份、只合并普通提示语义，以及 Spec §1 / AC-101 的同一操作原位更新不一致。这是本轮额外覆盖发现，不将其冒称为已证明由修复新引入。
- **建议修正：** 复用 source 去重匹配之前检查目标活动仍是可合并的普通提示，拒绝复用 progress、终态及不符合级别条件的活动；或在活动进入进度/终态时解除指向它的普通提示合并关联。保留现有操作归属检查和进度/终态绕过抑制规则。
- **建议验证：** 在现有 fixture 中新增“A 普通提示 → A progress → B 同来源普通提示”的回归，断言 A 的原 ID、progress 和常驻语义保留，B 独立显示；B 的计时器到时只移除 B，随后 A 终态仍替换 A 的原 ID。当前回归从“A/B 普通提示先合并”出发，没有覆盖这一顺序。

其他适用检查：shared 保持纯协议，host 未导入 React/sonner；app 的动态 UI 装配未变；没有新增跨模块内部导入、文案或持久化变更。架构、类型及零警告 lint 均通过；无新增风格意见。

## Specification Axis

Result: request-changes
Reviewer: Codex / 012-rereview-t02
Input-SHA256: 10edae7f1cac242f4294de27d271d4d9a73c0ed5e30ddc108be204e7f7fe01f9

| 合同 | 判断 | 原始观察 |
|---|---|---|
| AC-101 | request-changes | 100 次进度、F1 的独立失败及 F4 的宿主切换均已通过；R1（major，index.ts:89）证明来源去重仍会夺走进行中操作的展示身份并清除进度。复现及修正条件见标准轴 R1。 |
| AC-102 | pass（本轮验证接缝） | 原回执时序/缺少 committed 时拒绝 success 的测试通过；F2 五种首个结果和 F3 五种不可复活终态回归通过。未发现修复影响结果真实性的新问题。 |
| AC-103 | pass（自动化接缝） | 两个消费者代码和测试未变，本轮重新执行：notifications 为 off 时，真实 SafeService 复制失败与 ArchivesApplication/RecordEditor 保存冲突仍显示必要错误，档案草稿保留。 |
| AC-104 | pass（规定 DOM 接缝） | 双 Document 的真实 sonner、窗口关闭 Portal 清理、shared target close 计时器清理、迟到加载及加载失败回退继续通过；F4 的单项 remove 不卸载整个 renderer。真机边界仍待用户验收。 |
| AC-105 | pass（标记及既有消费者范围） | 脱敏逻辑未变，本轮哨兵及消费者测试通过；新的 terminalOperations 只保留操作身份/target，不复制正文、敏感参数或动作。 |

**范围与写集：** 修复集中在声明的 shared/host 路径和测试；冻结的 app、词典及两业务消费者保持原样，继续只迁移错误路径，没有全量替换旧 Notice。未触及 safe 密码学、存储恢复协议、档案写入协议或新增依赖。原 pass 部分经影响核对和定向回归，没有被无关扩展审查替代。

**来源登记：** `docs/third-party/bz.md:24` 已新增 notice.ts 改编条目，给出固定 d76a087 完整 SHA 的来源、两个实际 shared 落点、采用方式、操作/窗口/回执/隐私适配，以及不采用全局 DOM、偏好和 z-index 的原因；`:5` 也删除了“尚未改编功能”的旧结论。与 index.ts/policy.ts 文件头一致，初审来源登记集成待办已解决。所用上游原文为本会话初审实际读取的固定来源： https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/core/notice.ts 。本轮未变更上游版本，沿用已核验来源；未声称重做全部许可证或 T-11 登记验收。

## 产物与验证

唯一写入产物为本 REPORT.md。没有修改业务文件、TASK、008/010 报告、正式 Evidence/Ticket 状态或共享生成物；没有安装依赖、Git 写操作、提交、推送或发布。

环境为同一 current/dev 工作区，Node v26.11.1、Vitest v5.0.3；unit 为 Node，dom 为 happy-dom。所有检查由本审查者亲自运行：

| 命令 | 退出码 | 观察 |
|---|---:|---|
| `sha256sum`（TASK 全部 12 路径）及 Python stdin 逐文件摘要校验 | 0 | 与本轮 TASK 全部匹配；另外确认 7 项与初审冻结字节一致 |
| `pnpm exec vitest run src/shared/feedback` | 0 | 22 项通过；原有 8 项及修复新增 14 项全部执行 |
| `pnpm exec vitest run --project dom src/host/obsidian/feedback.dom.test.tsx src/modules/safe/services/feedback.dom.test.tsx src/modules/archives/ui/generic/feedback.dom.test.tsx` | 0 | 3 文件 / 7 项通过，包括新 F4、原双 Document 和两个真实消费者 |
| `pnpm test:architecture` | 0 | 1287 模块，无分区、宿主包、桌面边界、桶导入或循环违规 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 0 | 生产类型检查通过 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 0 | 测试类型检查通过 |
| `pnpm run lint` | 0 | 全仓零警告通过 |
| `git diff --check -- src/shared/feedback src/host/obsidian/feedback.ts src/host/obsidian/feedback.dom.test.tsx docs/third-party/bz.md` | 0 | 已跟踪差异无空白错误；新增文件不以此命令代替内容审查 |
| `node` stdin：esbuild `write:false` + VM 执行 R1 | 0 | 断言确认 A progress 被 B 覆盖、生成 3000ms 普通计时器、到时 active 为空；退出 0 表示缺陷反例确认成功，不表示业务通过 |

R1 探针没有写脚本或修改测试文件；固定时钟、注入计时器回调与真实发布顺序在 finding 中列明。修复报告中的历史红灯为实现者报告，本轮没有修改代码去重演其红灯，以上测试绿色和 R1 反例是本轮亲自取得的证据。

未执行或未验证：未运行禁止的 build/build:css/notices，构建产物与包体由 Lead 串行验证；没有全仓 pnpm test、UI runner、全套许可门禁。safe 服务代码与原有 48 项服务单测对应文件未改，本轮未重复跑其全套服务测试，重跑了触及反馈的真实消费者。词典未变，未重复 i18n 门禁。真实 Obsidian、原生窗口/Notice 动画及剪贴板行为按 Spec 留待用户验收；DOM 结果不替代真机结果。

## 问题与下一步

无输入漂移或审查执行阻塞；Status completed 表示复审回报已完成。原 F1–F4 的具体反例可以关闭，来源登记待办也已解决，但 AC-101 的交错隔离仍被 R1 阻断，因此两轴均维持 request-changes。请 Lead 将 R1 交实现者修正并补回归，随后冻结新候选复审；本审查没有实施修复或修改上游合同。
