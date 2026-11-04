# 任务回报

Session: 20261104T095541Z
Task: 008-review-t02
Status: completed

## 聚焦交接

已完成 T-02 冻结候选的独立双轴审查；标准轴和规范轴均为 request-changes。确认 3 项 major、1 项 minor：来源去重串联不同操作、提示过期后吞掉首个终态、终态过期后晚到进度复活，以及 sonner 转 Notice 时保留旧进度。现有 62 项定向测试及架构、i18n、lint、生产与测试类型检查均通过，但没有覆盖这些反例。仅新增本 REPORT；TASK、业务源码、生成物、Git 状态与其他执行者的修改均未改写。下一步由 Lead 将 findings 交实现者修复，再冻结新输入复审；completed 仅表示审查候选交回，不表示 Ticket 验收通过。

## Review

- Strategy: independent
- Risk: medium（沿用 Ticket；重点展开共享公共协议、异步回执、窗口生命周期和敏感输出风险）
- Independence: required（用户与 TASK 明确要求）
- Reviewer: Codex，本 TASK 的独立审查会话；未参与被审实现，也未实施修复。
- Implementers: Ticket 声明 owner 为 herdr:impl2；app 与词典等共享路径由 Lead 所有。实际派遣、会话身份与独立性回执由 Lead 核验，本报告不伪造会话 ID。
- Review mode: working-tree，审查 TASK 列出的 11 文件当前字节；已跟踪部分对照 `git diff 29644dc5833bb209e6282f84fa71441a5a1b99d4 -- <files>`，新增文件完整读取。
- Base: 29644dc5833bb209e6282f84fa71441a5a1b99d4
- Input-SHA256: a1b2d122f8f8d76527eb245a9d15c40b66bac3d36ff013c4da5ed607174ef6e7（沿用 TASK 提供的整体摘要，不冒称重新推导了未提供的摘要对象）
- 输入校验：开始、审查中途和写报告前均运行 `sha256sum`，以下 11 项全部匹配，未发现冻结输入漂移。

```text
41957fbae54e59343ab97cc521635de71f291ad42c75bffb4b75e5242bfd2622  src/shared/feedback/index.ts
f6c2d8a1da42474fbb0590b65f7d801c2252d00e4002e0443ab0e1f8eea6db54  src/shared/feedback/policy.ts
39ff8a30449096f071af1c01141b04b006a94a96434d7a9da2dc0f9b56d75c9b  src/shared/feedback/feedback.test.ts
9b480a99abf63f55c69ed5db5a780ffd8329e082921c8a9ea5f815f308c5e89b  src/host/obsidian/feedback.ts
390022b6942353f21ee0299cba4d86fda6f5d49ec304090310ded391f218cdcf  src/host/obsidian/feedback.dom.test.tsx
2ec252e098efec5a989b8fac77e60f22ad8acb3d02ff9cbc0f8fac878e140931  src/modules/safe/services/feedback.dom.test.tsx
5734d3a81abbc9da2bc3bbf8cc0648fea267912b4417b1d04544027d84c2eaad  src/modules/archives/ui/generic/feedback.dom.test.tsx
79d1573eb42c9dbbbc74fc539df0dc316bc5e26122e4de46e306ba8f5809fc67  src/app/main.ts
d358a0895bd8846a70da0ba6f0709d55311a2cb97c0522a134ceca3a99530fc1  src/modules/safe/services/safe-service.ts
56de422c4eb1772b09819e04e5556dc972a15c0845c8f352211be46c654dda3e  src/modules/archives/ui/generic/RecordEditor.tsx
3ac30f2ff6d1840314cadbc7eb486b780e54dc113385f50bce4208a4aa01f533  src/modules/archives/i18n.ts
```

### 来源、影响与边界

规范来源按 TASK 显式指定的 Ticket → Spec → ADR/CONTEXT → Tickets Map/Goal Plan/README 回读；本轮是工作副本文件快照，不用 commit message 推定需求。标准来源为根 AGENTS.md、dev 及其 architecture、obsidian-api、settings-and-i18n、testing 参考，展示边界同时核对 ui Skill；仓库未发现另一个适用的 AGENTS.md、CONTRIBUTING.md 或独立编码标准文件。方法来源包括 reviewer-contracts、risk-review、source-discovery、fowler-smells、review-evidence、working-tree-review、domain-runtime、变更范围合同与错误/测试可靠性合同；无纯风格 finding。

影响链为 `main.onload → FeedbackHost.bind/close/dispose → createFeedback → sonner/Notice`，真实消费者为 `SafeService.copy` 和 `RecordEditor.save`；追踪了安全模块现有 copy 调用方、词典注册、Toaster、Portal 上下文和测试配置。冻结源码的新增业务接入只触及错误报告；没有改 safe 密码学、持久化格式或 archives 写入协议，也没有全量替换旧 Notice。app/main.ts 与 archives/i18n.ts 是已声明的 Lead 共享落点，不因其出现在冻结输入中判为越界。Ticket 的 ui_change=false，本票复用现有 sonner，没有审查或批准九页功能 DESIGN。

外部来源通过只读 GitHub Contents API 读取了固定提交的 notice.ts： https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/core/notice.ts 。核对借鉴点为同键合并、30 秒抑制窗口、进度转结果及按字数停留；HUHU 的窗口/操作身份和回执合同以本地 Spec 为准。文件头已有固定 SHA、MIT、署名与适配说明。浏览器抓取该 raw URL 失败后，`gh api 'repos/yeshimei/bz/contents/src/core/notice.ts?ref=d76a0870329403247917a00c43019e203a2560a4' --jq .content | base64 --decode` 成功取得源码；未执行外部代码。

## Standards Axis

Result: request-changes
Reviewer: Codex / 008-review-t02
Input-SHA256: a1b2d122f8f8d76527eb245a9d15c40b66bac3d36ff013c4da5ed607174ef6e7

### F1 — major：来源合并把不同操作永久绑定到同一活动，后结束操作的失败被吞掉

- 位置：`src/shared/feedback/index.ts:82`、`:84`、`:97`。
- 问题：A/B 使用同一 source 去重键发布普通提示后，两个 operation key 都记录到同一 id。后续 progress/outcome 虽改用 operation 去重键，却仍优先取旧的 operations 映射。A 一旦成为终态，B 的失败会在 `previous?.view.outcome` 提前返回；不同操作的终态因此互相抑制。
- 已运行反例：同一 target/source，依次 publish A 普通提示、B 普通提示（均 `dedupe: {key:'scan',scope:'source'}`）、A success（带 committed 回执）、B failed。注入 Map 展示端与时钟，实际最后只剩 `[{id:'feedback-1',text:'A saved',outcome:'success'}]`，完全没有 `B failed`。将 A/B 都设为同文案失败也会只保留先到的一项。
- 影响：正常共享 API 调用就能隐藏真实失败；与“progress 和终态保留操作身份”的接口注释及 AC-101 不符。
- 建议修正：把普通提示的合并展示关联与每个操作的生命周期身份分开；进入进度/终态时不得继承其他操作的终态锁。新增“先合并提示，随后各自进度/结果”的回归用例，验证失败数和操作身份，而非仅测试初始 publish 就是 failed。

### F2 — major：普通提示自动消失后，首次失败终态被默认去重窗口压掉

- 位置：`src/shared/feedback/index.ts:81`（关联 `:66`、`:98`）。
- 问题：即使调用方没有传 dedupe，也会建立默认 30 秒 operation recent 项。普通提示到时 dismiss 会删除 operations；之后首个终态会命中 recent 中已消失的 id，被无条件 return。结果消息受到了本应只用于重复提示的抑制。
- 已运行反例：t=0 发布 `{operationId:'save-1',source:'archives',target:'main',message:{key:'saving'}}`，不传 progress/dedupe；t=3000 执行其定时回调；t=4000 对相同操作发布 `outcome:'failed'`、文案 `save failed`。实际 active 为 `[]`；首个失败从未调用 present。success/partial/cancelled/locked 同样受此分支影响。
- 影响：持续数秒的操作只要先发普通开始提示，就可能完全没有结束反馈，违反 AC-102。
- 建议修正：重复展示抑制与操作状态转换分别判断；首个进度/终态不能因为先前普通提示已经关闭而被丢弃。用可控时钟覆盖“普通提示过期之后、30 秒之内收到首个终态”。

### F3 — minor：终态只保存在活动提示里，过期后晚到进度会复活为常驻活动

- 位置：`src/shared/feedback/index.ts:66`、`:76`、`:84`。
- 问题：终态只靠活动 view 拦截晚到更新。提示消失后 operations 被删，recent 30 秒过期后也被删，同一个 operationId 的晚到进度被当作新活动；progress 的 duration 为 0，之后没有终态便常驻。
- 已运行反例：同一操作先发送进度，再发送 failed；执行终态展示定时回调；把注入时钟推进至 31000，再发送该操作的晚到 progress。实际新建 `feedback-2`，`progress:{completed:2,total:10}`、`durationMs:0`，已失败的操作重新表现为运行中。
- 影响：错误状态倒退及残留运行指示。现有“late progress cannot undo a terminal result”测试只在终态提示仍活动时验证。
- 建议修正：终态记录与展示寿命分离，在操作生命周期结束前拒绝晚到 progress；若需要回收状态，明确定义可验证的关闭/遗忘边界，重试使用新的 operationId。补终态定时消失和去重窗口过期之后的晚到回调测试。

### F4 — major：工作台关闭后转 Notice，旧 sonner 进度仍保留

- 位置：`src/host/obsidian/feedback.ts:97`–`:99`。
- 问题：操作已由 renderer 展示后，若同一窗口的最后一个 `.huhu-workbench-view` 被关闭，下一次更新会进入 presentNotice；此分支没有 remove 既有 renderer 项。renderer 根挂在 body，关闭工作台本身不会卸载它，故同一操作出现原进度和新结果两份展示。
- 已运行反例：happy-dom Window 中放工作台节点，注入记录 present/remove 的 renderer 和真实 DOM Notice 端口；publish A progress，等待 renderer.present 的完成信号，然后删除工作台节点，再 publish A failed。实际旧 renderer 仍有 `{text:'progress',progress:{completed:1,total:10}}`，同时 Document 中新增 Notice `failed`。此反例执行真实 shared/host 代码，renderer 为注入端口；不是原生 Obsidian 的视觉验收。
- 影响：用户可同时看到已失败操作仍在运行；同一操作不再只有一个实例，也没有原位替换进度，违反 AC-101。
- 建议修正：为活动项明确维护唯一展示端；切换到 Notice 前移除已有 sonner 项，或在活动生命周期内固定展示端并正确完成终态。补“同一 Window 保持打开、关闭最后一个工作台、随后收到结果”的 host DOM 测试，并断言旧端确已 remove。

## Specification Axis

Result: request-changes
Reviewer: Codex / 008-review-t02
Input-SHA256: a1b2d122f8f8d76527eb245a9d15c40b66bac3d36ff013c4da5ed607174ef6e7

| 合同 | 判断 | 原始观察与依据 |
|---|---|---|
| AC-101 | request-changes | 单操作 100 次进度和直接终态测试通过；F1（major，index.ts:82）证明先合并的不同操作会吞掉后一个失败，F4（major，host feedback.ts:97）证明切换展示端后保留旧进度。复现与修正建议见各 finding。 |
| AC-102 | request-changes | owner Promise 提交之前不报成功、无 committed 回执拒绝 success、四种非成功终态的直接 publish 测试通过；F2（major，index.ts:81）证明首次终态可能完全不呈现，F3（minor，index.ts:66/76）证明终态可倒退。复现与修正建议见各 finding。 |
| AC-103 | pass（自动化接缝） | 真正创建 SafeService 并模拟剪贴板失败，以及真正 ArchivesApplication/RecordEditor 保存冲突；两者都先以 ModuleRegistry 将 notifications 保持 off，错误仍可见，档案草稿保留。safe 按 Ticket 约定覆盖“复制失败”，未扩展迁移全部写入错误。 |
| AC-104 | pass（规定 DOM 接缝） | 现有真实 sonner 测试通过：两个 Document 分别渲染、关闭一个后清除该 Portal、另一个保留；shared 单测验证 target close 释放注入定时器；迟到 UI mount 与 UI loader 失败均有覆盖。原生窗口关闭/动画计时器未做真机验证，保持待用户验收。 |
| AC-105 | pass（标记与现有消费者范围） | 敏感参数在进入 translator 之前替换，整条敏感消息使用 publicMessage 且去掉 actions；safe/archives 实际失败测试验证秘密哨兵不进入反馈。新反馈路径不传播原始 exception.message，也未新增通知投递或日志输出。 |

范围核对：shared 纯协议和时长策略、host 双展示端、app 生命周期注入及两个错误消费者均已落地；notifications 不构成其运行依赖。未新增全量迁移、密码学/格式更改或不相关重构。四项实现缺口使本票不能按 AC-101/102 验收通过。

来源登记的集成观察：当前 `docs/third-party/bz.md` 尚只有 notice.ts“全局 DOM 容器未采用”条目，未登记新 shared/feedback 两文件的“改编”落点；正文仍称尚未改编功能实现。该文档不在本轮冻结 11 文件内，故不将其列为冻结源码 finding；Lead 合并时仍须按 Ticket 执行约束和 AC-001 补齐实际采用行，不能把本次局部审查视为来源登记已通过。

## 产物与验证

唯一写入产物：本 REPORT.md。未运行 build、build:css、notices；未安装依赖，未修改业务文件、生成物、Ticket/Evidence 或 TASK，未执行 Git 写操作。

环境：仓库 current/dev；Node v26.11.1；Vitest v5.0.3，unit 为 Node、dom 为 happy-dom；命令均从仓库根运行。

| 实际命令/检查 | 退出码 | 结果 |
|---|---:|---|
| `pnpm exec vitest run src/shared/feedback` | 0 | 1 文件，8 测试通过 |
| `pnpm exec vitest run --project dom src/host/obsidian/feedback.dom.test.tsx src/modules/safe/services/feedback.dom.test.tsx src/modules/archives/ui/generic/feedback.dom.test.tsx` | 0 | 3 文件，6 测试通过；包括真实 sonner 双 Document 和两消费者 |
| `pnpm exec vitest run src/modules/safe/services/safe-service.test.ts` | 0 | 1 文件，48 测试通过 |
| `pnpm test:architecture` | 0 | 1287 模块，无分区/宿主包/桌面边界/桶导入/循环违规 |
| `pnpm test:i18n` | 0 | 32 词典，5293 键，双语占位符及字面量引用通过 |
| `pnpm run lint` | 0 | 零警告通过 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 0 | 生产类型检查通过 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 0 | 测试类型检查通过 |
| `sha256sum`（TASK 全部 11 路径，开始/中途/报告前） | 0 | 每项与 TASK 一致 |
| `node` stdin：esbuild `write:false` + VM，执行 F1、F3 的真实 shared 模块反例 | 0 | 捕获被吞失败及终态复活；退出 0 表示反例观察成功，不表示实现通过 |
| `node` stdin：同样内存加载 shared，执行 F2 可控时钟反例 | 0 | t=4s 首个 failed 的活动列表为空 |
| `node` stdin：内存加载 host/shared + happy-dom，执行 F4 展示端反例 | 0 | renderer 仍保留旧 progress，同时出现失败 Notice |

反例没有添加测试文件或缓存脚本；复现所需调用顺序、时钟、输入与实际输出已在 findings 中列明。F4 最初的临时探针因只等待固定数量 microtask、尚未等待 renderer 就绪而未复现，退出 1；随后改为等待 present 完成信号，重新执行后退出 0 并稳定观察到上述重叠。这是探针同步修正，没有改动被测代码或将初始化失败计作业务反例。

未完成或未验证：构建及 main.js/styles.css 一致性、包体预算由 Lead 在修复后串行核验；未运行全量 pnpm test。真实 Obsidian 启动、窗口和剪贴板表现按 Spec 留待用户验收；DOM 结果不替代真机结果。本轮未把非冻结来源登记文档做成完整 AC-001 许可验收。

## 问题与下一步

无审查输入或执行阻塞；冻结输入未变化。Lead 应安排修复 F1–F4，并补来源登记集成项；修复后重新冻结受影响文件、补上述反例回归，再进行独立双轴复审。原有测试绿色不足以覆盖已确认的状态转换缺口，本候选维持 request-changes。
