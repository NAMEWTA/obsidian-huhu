# 任务回报

Session: 20261104T095541Z
Task: 010-repair-t02
Status: completed

## 聚焦交接

已按独立审查 008-review-t02 修复 F1、F2、F3、F4，每项均先新增回归并在未修正该 finding 的代码上观察真实断言红灯，再修正为绿灯。本轮新增 15 个测试用例；最终 shared/safe 单测 70 项、宿主与消费者 DOM 测试 7 项通过，生产/测试类型、架构、i18n、全仓零警告 lint 均通过。仅修改下述 4 个既有候选文件，原候选其余 7 个文件经 SHA-256 比对保持不变。completed 只表示修复候选交回，Ticket 状态、正式 Evidence、独立复审和最终验收仍由 Lead 负责。

## 产物与验证

### 本轮实际写集

- `src/shared/feedback/index.ts`：记录展示项的所属操作；首次进度/终态绕过去重展示抑制；终态记录与展示寿命分离，明确生命周期及清理边界。
- `src/shared/feedback/feedback.test.ts`：保留原 8 项测试，新增 F1 的 3 项、F2 的 6 项、F3 的 5 项回归，合计 22 项。
- `src/host/obsidian/feedback.ts`：Notice 展示前移除同 ID 的旧 renderer 项，保持唯一活动展示端。
- `src/host/obsidian/feedback.dom.test.tsx`：保留原 4 项测试，新增 F4 的真实 sonner→Notice 切换回归，合计 5 项。
- 本任务 `REPORT.md`：一次写入的修复事实回执。

没有修改 TASK、原实现 REPORT、审查 REPORT、Ticket/Map/Goal、正式 Evidence、构建产物、只读 sonner 组件或写集外文件。没有安装依赖、执行 Git 写操作、提交、推送或发版。工作区沿用 current `/home/wta/projects/obsidian-huhu`、dev、基线 `29644dc5833bb209e6282f84fa71441a5a1b99d4`；其他执行者的 dirty 改动保持原样。

### Finding → 回归 → 修正

| Finding | 新增测试名与位置 | 红灯事实 | 修正位置与绿色结果 |
|---|---|---|---|
| F1 major：来源合并串联不同操作并吞掉后续失败 | `source-coalesced operations keep independent progress and results after the first %s`（success/failed 两例，`src/shared/feedback/feedback.test.ts:112`）；`source-coalesced ordinary messages can finish independently without intermediate progress`（`:129`） | 旧代码中独立进度仍只有 1 项；无中间进度时 A success 后 B failed 被吞，实际只有 success。3 例均失败。 | `src/shared/feedback/index.ts:56`、`:88`、`:102`：活动项保存 operationKey；仅所属操作可以沿用该活动项进入进度/终态，来源合并只共享普通提示展示。修正后 3 例通过，验证不同结果/同文案失败均有两个独立 ID。 |
| F2 major：开始提示过期后吞掉首次终态 | `first %s result survives the expiry of its ordinary start message`（五种终态，`feedback.test.ts:139`）；`first progress after its start message expires still appears and is replaced by its result`（`:151`） | 可控时钟令普通开始提示到时消失，在默认 30 秒窗内发送首次结果/进度；旧代码 6 例活动列表均为空。 | `src/shared/feedback/index.ts:85`：展示重复抑制只作用于普通提示，不拦截进度或终态转换。修正后 6 例通过；重新显示的进度也被同 ID 失败结果替换。 |
| F3 minor：终态消失后晚到进度复活 | `expired %s remains terminal after the dedupe window; retry needs a new operation ID`（五种终态，`feedback.test.ts:163`） | 终态提示定时消失、时钟推进到 61000 后，旧代码把晚到消息重新呈现；5 例均因活动数为 1 而不是 0 失败。 | `src/shared/feedback/index.ts:15`、`:59`、`:77`、`:105`、`:116`、`:122`：终态 ID 记录独立于活动展示/去重缓存保留，直到所属 target 关闭或运行时 dispose 才清除；重试使用新 operationId。修正后 5 例通过，迟到进度/普通提示/终态均不复活；新 ID、不同 target/source 不受影响。 |
| F4 major：转为 Notice 后残留 sonner 旧进度 | `closing the last workbench removes the old sonner progress before showing its result in Notice`（`src/host/obsidian/feedback.dom.test.tsx:126`） | 使用真实 app mountFeedbackRenderer/sonner，等待进度渲染后移除最后一个工作台，再发送 failed。旧代码在创建 Notice 前没有调用旧端 remove，断言 false≠true。 | `src/host/obsidian/feedback.ts:120`：presentNotice 先调用同 ID 的 renderer.remove，再创建/更新 Notice；只移除该项，不卸载其他活动。修正后测试确认移除先于 Notice、旧 sonner 节点退出、唯一 Notice 保留最终错误且没有进度条。 |

### 关键决定与保持的行为

- 分开普通提示的合并展示归属与操作身份，不通过关闭来源去重来掩盖 F1。原有时间窗、256 条近期展示记录上限、字数时长策略均未提高或放宽。
- 首个状态转换不受已经消失的普通提示抑制；已有 committed 回执要求保持，未引入提前成功提示。
- 终态记录只保留操作键与 target，不保留正文、参数或动作闭包；回收边界明确为 target close / runtime dispose。终态 ID 在所属 target/source 生命周期内不复用，重试必须换 ID，接口注释已经说明。
- host 保留现有窗口绑定、动态 UI 加载、加载失败回退、Native Notice 的所属 Document 和清理流程，只在 Notice 路径补上旧项移除。
- 没有修改审查已通过的两个消费者接入、隐私转换、app 生命周期装配或双语文案。原候选其余 7 文件（policy.ts、app/main.ts、safe service/测试、RecordEditor、archives 消费者测试与 i18n）全部与审查快照 SHA-256 一致。

### 实际命令与退出码

失败退出码 126 为终端工具实际返回值；红灯均来自行为断言，不是编译、夹具或环境失败。

| 命令 | 退出码 | 实际结果 |
|---|---:|---|
| `pnpm exec vitest run src/shared/feedback -t 'source-coalesced'` | 126 | F1 红：3 例失败，8 例未选择。 |
| `pnpm exec vitest run src/shared/feedback`（F1 修正后） | 0 | 11 tests 通过。 |
| `pnpm exec vitest run src/shared/feedback -t 'expires\|expiry'`（实际筛选参数为 `expires` 与 `expiry` 的正则或） | 126 | F2 红：6 例失败，1 例既有测试通过，10 例未选择。 |
| `pnpm exec vitest run src/shared/feedback`（F2 修正后） | 0 | 17 tests 通过。 |
| `pnpm exec vitest run src/shared/feedback -t 'remains terminal'` | 126 | F3 红：5 例失败，17 例未选择。 |
| `pnpm exec vitest run src/shared/feedback`（F3 修正后、以及最终类型修正后） | 0 | 两次均为 22 tests 通过。 |
| `pnpm exec vitest run --project dom src/host/obsidian/feedback.dom.test.tsx -t 'closing the last workbench'` | 126 | F4 红：1 例失败，4 例未选择。 |
| `pnpm exec vitest run --project dom src/host/obsidian/feedback.dom.test.tsx` | 0 | F4 修正后 5 tests 通过。 |
| `pnpm exec vitest run src/shared/feedback src/modules/safe/services/safe-service.test.ts` | 0 | 2 files / 70 tests 通过：shared 22 + safe service 48。 |
| `pnpm exec vitest run --project dom src/host/obsidian/feedback.dom.test.tsx src/modules/safe/services/feedback.dom.test.tsx src/modules/archives/ui/generic/feedback.dom.test.tsx` | 0 | 3 files / 7 tests 通过，涵盖真实 sonner 双 Document、迟到加载、加载失败回退和 notifications 禁用时两个真实消费者。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 初次 126；最终 0 | 首次发现新增 coalescible 条件未使 input.dedupe 在类型上收窄；改为保存可合并的 dedupe 对象并直接访问它后通过。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 初次 126；最终 0 | 同一类型收窄问题修正后通过。未弱化类型或使用非空断言绕过。 |
| `pnpm test:architecture` | 0 | 1287 modules，无边界、宿主包、桌面、桶文件或循环违规。 |
| `pnpm test:i18n` | 0 | 32 dictionaries / 5293 keys，通过。 |
| `pnpm run lint` | 0 | 全仓零警告。 |
| `pnpm exec eslint src/shared/feedback/index.ts --max-warnings 0` | 0 | 最后类型收窄修正所在文件再次通过。 |
| `git diff --check -- src/shared/feedback src/host/obsidian/feedback.ts src/host/obsidian/feedback.dom.test.tsx` | 0 | 无空白差错。 |
| Python stdin：逐文件 SHA-256 比对原候选其余 7 路径 | 0 | 全部匹配原审查快照，未动通过路径的原实现文件。 |

F2 的实际 shell 命令为 `pnpm exec vitest run src/shared/feedback -t 'expires|expiry'`；表格中的反斜线只用于 Markdown 表格分隔符转义，不是传给 runner 的字符。所有既有测试及断言保留，没有跳过既有测试或提高阈值；上述 skip 仅来自红灯定位时的 `-t` 选择，最终完整选定套件全部执行。

### Skill Execution Records

本轮完整回读并执行 SpecDev I、implementation-procedure、execution-preflight 和项目 dev 技能；复用同会话已读取且仍适用的运行/测试/错误/范围合同。实际应用的项目规则：

1. dev 规则 2、8：修正保持在 shared 纯逻辑与 host 适配；没有新增跨区导入、宿主全局或 Node/Electron 依赖，架构门禁通过。
2. dev 规则 3：不修改 app 的动态导入和现有懒加载；app/main.ts 与审查快照逐字一致，未引入启动 UI 依赖。
3. dev 规则 4：终态记录明确随 target close/dispose 清除；F3 验证迟到回调和重试隔离，原窗口/插件清理用例继续通过；F4 仅移除目标项，保留其他活动。
4. dev 规则 6：不触及 safe 密码学、密文、档案命令、存储路径或数据格式；safe service 48 项与真实档案消费者回归通过。
5. dev 规则 7：没有新增或修改面向用户文案，沿用所属词典和 t；两个消费者及词典未改，i18n 门禁通过。
6. dev 规则 9：全仓 lint 零警告，最后源码修正另经定向 ESLint；未关闭规则。
7. dev 规则 11 及 testing 选择表：只做四项 findings 的最小修正，逐项红→绿；不改 TASK/正式状态/其他写集，不安装依赖、不执行禁用构建、不做 Git 写操作。按共享状态机与宿主适配风险运行单元、DOM、消费者、类型和架构检查。

继续保留 index.ts 原有 bz 固定 SHA、MIT、原路径、版权和修改说明。本轮修正依据本地审查与 Spec，未新增复制外部代码或依赖；沿用先前实际读取的来源：https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/core/notice.ts 。来源登记仍由 Lead 汇总到不在本写集的 `docs/third-party/bz.md`。

### 候选快照

以下为交回前四个修复文件的实际 SHA-256，之后停止业务写入：

```text
064db49dff438de8b108afe83dd72f615545d106b0ab90a7b2e06fa440f7f4b3  src/shared/feedback/index.ts
b61a484e9e69c471f7cc82c0b2aecf00c85435ac0ef6cc2a06b4561cb6be55b6  src/shared/feedback/feedback.test.ts
60a101626d4e8aa40bca4d7201c19f341bf25b3fe39179a08b881a1d2975e2e7  src/host/obsidian/feedback.ts
98422d07986dac53b6e93773d9e9911027c4deeec55703de29daef514b47125f  src/host/obsidian/feedback.dom.test.tsx
```

### 未执行 / 未验证

- `pnpm run build`、`pnpm run build:css`、`pnpm notices`：未执行，owner Lead；TASK 禁止执行者改写共享产物。
- `pnpm check:bundle`、`pnpm check:notices`、UI runner：未执行，owner Lead。
- 双轴独立复审、正式 Evidence、Ticket 状态与最终验收：未执行，owner Lead / 另一 reviewer。
- 真实 Obsidian、原生 Notice、真实弹出窗口及桌面剪贴板：仍待宿主验收；DOM 与系统边界替身结果不替代真机表现。
- 未运行全仓 pnpm test，也未重跑未触及的档案/保险箱全量格式套件；本轮实际回归范围见上表。未修改其数据/消费者实现。

## 问题与下一步

无实现阻塞，F1–F4 均有可回读红绿证据及修正候选。请 Lead 按新快照安排独立双轴复审、维护正式 Evidence/状态、补充 bz 来源登记，并串行完成构建和产物/包体检查。此报告不宣称 Ticket done 或独立审查已通过。
