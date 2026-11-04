# 任务回报

Session: 20261104T095541Z
Task: 016-rereview2-t02
Status: completed

## 聚焦交接

已完成 T-02 第二次独立复审，标准轴与规范轴均为 pass，未发现新的可操作问题。R1 原始反例及同类交错、升级状态和到期路径已修复，F1–F4 的回归均未回退。本轮亲自运行 60 项定向测试、生产/测试类型检查及修改文件的零警告 ESLint；另以真实 shared 模块验证原 R1 和三个操作的全部 1,680 种有序交错，均通过。仅新增本 REPORT，未修改任何业务文件、TASK、既有报告或正式状态。下一步由 Lead 核验回报、串行处理构建/产物及最终验收；本报告不把 DOM 验证写成宿主真机已通过，也不代替 Ticket 的正式完成判定。

## Review

- Strategy: independent
- Risk: medium
- Independence: required
- Reviewer: Codex / 本 TASK 独立审查会话；与 008、012 同一审查者，未参与任何被审业务实现或修复。实际派遣/会话关联由 Lead 核验，本报告不编造 provider/session ID。
- Review mode: working-tree
- Base: 29644dc5833bb209e6282f84fa71441a5a1b99d4
- Input-SHA256: 0e70e4b6440f350dbd0a5d17643d1eb462b6baceb45a1884f05564162bcb1a97（TASK 提供的整体摘要）
- 固定范围：本目录 TASK 列出的 11 个文件。开始运行 sha256sum，并于中途和写报告前逐文件校验，全部匹配，未观察到冻结输入漂移。
- 对照输入：本 session 的 008-review-t02/REPORT.md、012-rereview-t02/REPORT.md，以及本轮完整读取的 013-repair2-t02/REPORT.md。

与 012 的冻结清单比较，本轮仅 index.ts 与 feedback.test.ts 改变，其余 9 项原字节相同。新 runtime 的 SHA-256 为 74676661c0bf539b8f4dd063696d48746d94ac29de3230bd32c7e72f6a1aa75f；测试为 bba4b656136d26714a5a3c7b9a7bcef27e9fefbcee66494cc776d3cbb56c7c49。原 22 项测试的完整前缀摘要仍为 b61a484e9e69c471f7cc82c0b2aecf00c85435ac0ef6cc2a06b4561cb6be55b6，已亲自核验，未删除或弱化旧断言。

沿用本会话已读的 dev/ui、reviewer-contracts、risk-review、domain-runtime、result-reuse 及范围/错误/测试可靠性合同。AGENTS.md、dev 和 ui 的 SHA-256 与上一轮工具记录一致；dev 仍为 Ticket 绑定的 d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e。权威规范继续为当前 Ticket、Spec §1 / AC-101–105、ADR-004、CONTEXT 与 Map/Goal/README 的职责和写集约束；本轮回读反馈行为、验收表及宿主待用户验收边界，没有建立新流程或扩大写入授权。

## Standards Axis

Result: pass
Reviewer: Codex / 016-rereview2-t02
Input-SHA256: 0e70e4b6440f350dbd0a5d17643d1eb462b6baceb45a1884f05564162bcb1a97
Findings: 无。

### R1 与同类路径

`src/shared/feedback/index.ts:89`–`:92` 在复用匹配 ID 前检查当前活动仍是普通提示，排除 progress、outcome 和 error。`:110`–`:113` 在展示升级为上述状态时解除指向该 ID 的旧去重关联，再记录当前状态自己的键。两处措施分别防止覆盖活动进度，以及升级项消失后旧来源记录继续压掉新操作提示。原 ownedId 归属、首次进度/终态绕过抑制、committed 回执与终态历史仍保留。

已检查并实际验证：

- 精确 R1：A 普通提示 → A progress → B 同来源普通提示；A 原 ID、进度和 durationMs=0 保留，B 单独显示。B 到期只移除 B，A 成功回执仍替换 A 原 ID。
- 两操作各自 start→progress→result 的全部 20 种有序交错；每次发布后维护独立进度、终态及稳定 ID。
- 普通提示升级为不确定进度、error 或五种终态后，另一操作的来源提示独立呈现。
- error/success/failed 的展示到期后，旧来源关联不再压掉新操作的首次提示；普通提示自身的合并和时间窗仍有原测试保护。
- 额外独立探针：三个操作共用来源去重键，穷举各自 start→progress→result 的全部 1,680 种有序交错。包含确定/不确定进度和 success/failed/partial 三种结果；每次发布后核验所有已进入进度/结果的操作保持各自 ID、内容和状态，最终三项结果并存，closeTarget 后活动与定时器均清空。探针以内存 esbuild write:false / VM 执行真实 shared 模块，没有写测试文件。

### F1–F4 保全

| 原问题 | 本轮确认 |
|---|---|
| F1：来源合并吞掉另一操作结果 | 3 项 source-coalesced 回归通过；操作归属检查未回退，R1 与多操作交错验证补齐反向顺序。 |
| F2：开始提示消失后首个转换被抑制 | 五种首个终态及首个进度再转失败的 6 项回归通过；转换排除条件未改。 |
| F3：终态到期后晚到进度复活 | 五种终态过期、旧 ID 拒绝、新 ID 与其他 source/target 可用的回归通过；terminalOperations 保留及 close/dispose 清理未改。 |
| F4：sonner 转 Notice 残留旧进度 | host/app 代码和 DOM 测试字节未变；本轮再次运行真实 sonner 切换测试通过，Notice 前旧项 remove，旧 toast 退出。 |

修正只涉及 shared 纯策略及就近测试，没有新增导入、宿主全局、Node/Electron、跨模块访问、异步写入、持久化或用户文案。原 host/app 生命周期和两真实消费者保持原样；重新运行双 Document、加载/卸载、回退与消费者测试，未见受影响的回归。未因命名或风格偏好产生 finding；通过表示当前审查范围未发现可操作问题，不表示所有外部环境均已验证。

## Specification Axis

Result: pass
Reviewer: Codex / 016-rereview2-t02
Input-SHA256: 0e70e4b6440f350dbd0a5d17643d1eb462b6baceb45a1884f05564162bcb1a97
Findings: 无。

| 合同 | 判断 | 本轮证据与边界 |
|---|---|---|
| AC-101 | pass | 100 次进度同实例、终态替换、不同失败不合并的原测试通过；R1 的计时隔离、20 种两操作交错、状态升级/过期用例和独立 1,680 种三操作交错均通过；F4 的真实 sonner→Notice 测试通过。 |
| AC-102 | pass | owner Promise 提交回执前不报成功、无 committed 时拒绝 success、四种非成功结果、F2 首次转换及 F3 终态不可复活的原回归全部执行并通过。 |
| AC-103 | pass（规定自动化接缝） | notifications 为 off 时，真实 SafeService 复制失败和 ArchivesApplication/RecordEditor 保存冲突仍展示错误；敏感内容不进入提示，档案草稿保留。消费者代码未变。 |
| AC-104 | pass（规定 DOM 接缝） | 真实 sonner 双 Document 隔离、关闭目标 Portal、shared 定时器清理、迟到 UI mount 和加载失败回退继续通过；额外探针逐个 target 清理也通过。原生窗口与 Notice 动画仍待用户验收。 |
| AC-105 | pass（标记与现有消费者范围） | 参数/整条消息隐私哨兵和两消费者泄漏检查通过；本轮没有改动翻译/脱敏，也未新增通知、日志或携带秘密的运行时记录。 |

范围保持 Ticket IN/REUSE/OUT：shared 纯协议与策略、host sonner/Notice、app 生命周期和两个错误路径接入成立，没有全量迁移旧 Notice、修改 safe 密码学/格式或档案写入协议。两项实际修复文件均在声明的 shared 写集内，9 项未改文件只评估此次修改的波及面并做定向回归。

本轮没有新增外部复用或上游版本；保留先前已核验的固定来源与文件头署名：https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/core/notice.ts 。bz 登记在上一轮已确认补齐，本次 docs 文件不在冻结输入内，不重新宣称整份来源登记或全部 AC-001 许可门禁通过。

## 产物与验证

唯一写入产物：本 REPORT.md。未改业务文件、TASK、既有 REPORT、Evidence/Ticket/Map/Goal、依赖或生成物；未运行 Git 写操作、提交、推送、发布及任何禁用构建命令。

环境：current/dev，Node v26.11.1，Vitest v5.0.3；unit 为 Node、dom 为 happy-dom，均从仓库根执行。

| 亲自执行的命令/检查 | 退出码 | 观察 |
|---|---:|---|
| `sha256sum`（TASK 全部 11 路径）与 Python stdin 原始字节校验 | 0 | 11/11 与 TASK 一致；确认 9 项与 012 一致、原 22 项测试完整前缀未改 |
| `pnpm exec vitest run src/shared/feedback` | 0 | 1 文件 / 53 项全部通过，含原 22 项和新 31 项 |
| `pnpm exec vitest run --project dom src/host/obsidian/feedback.dom.test.tsx src/modules/safe/services/feedback.dom.test.tsx src/modules/archives/ui/generic/feedback.dom.test.tsx` | 0 | 3 文件 / 7 项全部通过 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 0 | 生产类型检查通过 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 0 | 测试类型检查通过 |
| `pnpm exec eslint src/shared/feedback/index.ts --max-warnings 0` | 0 | 唯一改变的生产文件零警告通过 |
| `node` stdin：esbuild write:false + VM + assert，执行原 R1 及 1,680 种三操作有序交错 | 0 | 原 ID、状态、计时隔离与 target 清理全部断言通过，无文件写入 |

探针输出摘要：`Original R1: original progress id survives B expiry and receives committed result`；`Three operations start/progress/result: all 1680 ordered interleavings passed`。013 报告里的历史红灯是实现者证据，本轮未修改业务文件重演旧版本；本报告的通过依据是本轮真实代码阅读、绿色回归及独立探针。

未运行或未验证：禁止的 build/build:css/notices 未执行，构建/样式产物与包体由 Lead 串行核验；未运行全仓 pnpm test、全套许可门禁或 UI runner。本轮没有导入、词典、样式、装配变化，未重复全仓架构/i18n/lint，沿用前轮相应检查作为背景并对唯一改变的生产文件重新做 ESLint；没有把这些未重跑项声称为本轮执行。未改动的 safe 服务全套测试未重复运行，重新执行了与反馈相关的真实消费者。原生 Obsidian 启动、多窗口、剪贴板和 Notice 动画按 Spec 保持待用户验收，DOM 测试不能替代真机结果。

## 问题与下一步

无审查阻塞或未处理 finding。R1 和 F1–F4 可在本轮冻结输入上关闭；该局部候选的独立双轴审查通过。Lead 可据实际派遣/回报核验并写正式 Evidence/状态，继续其负责的共享构建、产物与整体验收；本报告不修改这些状态，也不宣称整个 change 已完成。
