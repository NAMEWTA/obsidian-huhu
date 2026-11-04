# 任务回报

Session: 20261104T095541Z
Task: 023-repair-t03
Status: blocked

## 聚焦交接

R1 的引用保留问题已按先红后绿修复，并新增可执行 V8 回收回归测试：显式退订后，即使 lifetime 继续保存 disposer，原 handler 及其捕获状态也可回收。相关 29 项测试、生产类型检查、事件目录定向类型检查、架构门禁与生产文件定向 lint 全部通过。全仓测试类型检查和 lint 仍分别在写集外的 automations 测试与 notifications 服务失败，因此按 blocked 交回候选，不宣称票据 done。R2 按 TASK 由 Lead 处理，本任务没有改来源文档；Lead 可接收局部修复、协调门禁 owner 后安排复审与正式验收。

## 产物与验证

### 全部修改/新增文件

- 修改 `src/shared/events/domain-events.ts`：订阅记录直接持有原 handler，替换捕获 handler 参数的包装箭头；仅擦除内部存储的 payload 泛型，保留公共键/发布/订阅类型契约。新增一条 Why 注释解释包装闭包与 disposer 共享环境的引用风险。
- 新增 `src/shared/events/retention.test.ts`：实际源码内存 bundle、独立 Node --expose-gc 子进程、WeakRef 正反对照与保留 disposer 的回收断言。
- 新增本 REPORT，按 Return 一次性写入并回读。

没有修改 domain-events.test.ts、main.ts、ModuleContext、main 装配测试、bz.md、NOTICE、TASK、正式 Evidence 或其他项目文件；没有 Git 写操作、依赖安装/升级、构建、提交、推送或发布。

### 关键决定、范围与来源

- 工作区 `/home/wta/projects/obsidian-huhu`，dev，HEAD `29644dc5833bb209e6282f84fa71441a5a1b99d4`。复用既有 README execution-context。Map 已核对至 plan_revision 4，该轮差异为 T-05 消费者写集补充，T-03 授权与验收未变化。
- 完整读取本 TASK、022-review-t03 REPORT 的 R1/R2、当前实现与 dev Skill，回读当前 Ticket 与相关 Map 修订；本会话已读且未变化的 SpecDev 实现/预检/TDD/注释/错误/可靠测试及项目 testing/licensing/architecture 合同复用。
- 沿调用关系核对：on 的 handler 包装箭头捕获原始参数 → off 共享调用环境 → lifetime 保存 off → 即使 subscription.handler 被清空仍保留原始函数。修复直接将 handler 存到 Subscription.handler，不再创建捕获它的内层函数；off 清空该记录后，lifetime 的 off 不再保持该函数可达。
- 内部 handler 类型断言与原来的 payload as T 都是按键分区存储时的泛型擦除；公共 DomainEventKey 的不变性和调用签名均未改变，既有三项负向类型案例继续通过。
- 不改变显式 off、abort、dispose、重复注册、快照派发、异步拒绝与诊断隔离语义，不接管 app 或来源文件。
- 采用的回收探针依据为当前独立 reviewer 的 R1 复现及单变量对照，来源为 sessions/20261104T095541Z/022-review-t03/REPORT.md 的 Standards Axis / R1。没有新增外部源码复制；实现文件头继续保留 yeshimei/bz、完整 d76a087 提交、src/core/domain-bus.ts、MIT、原版权和 HUHU 修改说明。R2 已由 Lead 写入 bz.md，按 TASK 不再修改。

### 红绿与回归测试

新测试使用真实 esbuild `write:false` 将实际 domain-events.ts 在内存打成 ESM，由子进程 data URL 导入。子进程使用宿主现有 Node `--expose-gc`，不改变 Vitest 进程全局 GC 标志，也不写 bundle 文件或安装依赖。

fixture 的 handler 捕获含 1 MB Uint8Array 的状态。活动订阅先经历 12 个 setImmediate/显式 GC 回合，断言 handler 与状态仍存活（正向持有对照）；随后通过 lifetime 保存的同一个 disposer 连续 off 两次，再经历 12 回合，断言 handler 与状态都消失，同时 cleanup 数组仍保存 1 个 disposer、events 仍可用。测试证明引用释放，不以“不再收到回调”替代回收断言。

- Red：`pnpm exec vitest run src/shared/events/retention.test.ts`，退出 126。实际 active 为 handler=true/state=true，retainedDisposers=1；退订后仍为 handler=true/state=true，而断言要求 false/false。失败来自目标引用保留断言，不是夹具、编译或超时。
- Green：相同命令，退出 0，1/1 通过。仅替换实现中的 handler 存储方式，没有放宽断言或清空 lifetime 数组。
- 完整相关回归：5 个文件、29/29 通过（事件原用例 10、新回收用例 1、注册表 10、main 装配 3、反馈回归 5）。

环境：Node v26.11.1，V8 14.6.202.34-node.37。回收证据明确限于实际执行的 V8 环境，不声称所有 JavaScript 引擎具有相同 GC 时机。子进程有 15 秒超时、新用例有 20 秒预算，进程由 execFileSync 等待退出；不使用随机 sleep、永久跳过或 mock 回收结果。

### 命令与退出码

| 命令 | 退出码 | 实际结果 |
|---|---|---|
| `pnpm exec vitest run src/shared/events/retention.test.ts`（修复前） | 126 | 预期 red：退订后 handler/state 仍可达 |
| 同命令（修复后） | 0 | 1/1 回收回归通过 |
| `pnpm exec vitest run src/shared/events src/app/modules/registry.test.ts src/app/main-events.dom.test.tsx src/host/obsidian/feedback.dom.test.tsx` | 0 | 5 文件、29 测试通过 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 0 | 全仓生产类型检查通过 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 126 | 唯一诊断在写集外 automation.test.ts(798,20)，见下文 |
| `pnpm exec tsc --noEmit --skipLibCheck --strict --target es2021 --module esnext --moduleResolution bundler src/shared/events/domain-events.ts src/shared/events/domain-events.test.ts src/shared/events/retention.test.ts` | 0 | 事件实现、原测试/负向类型案例、新测试的定向类型检查通过 |
| `pnpm test:architecture` | 0 | 1297 模块，无分区、宿主包、桌面边界、桶导入或循环违规 |
| `pnpm run lint` | 126 | 唯一诊断在写集外 notifications/core/service.ts(74,26)，1 error、0 warnings |
| `pnpm exec eslint src/shared/events/domain-events.ts --max-warnings 0` | 0 | 本次生产文件零警告 |
| `git diff --check` | 0 | 已跟踪工作区无空白错误，不把其他人的内容计入本次交付 |
| `git diff --no-index --check /dev/null src/shared/events/retention.test.ts` | 0 | 新增测试空白检查通过 |
| `sha256sum src/shared/events/domain-events.ts src/shared/events/retention.test.ts src/shared/events/domain-events.test.ts src/app/main.ts src/app/contracts/module.ts` | 0 | 交付与未改范围摘要如下 |

全仓门禁未通过项：

1. `src/modules/automations/automation.test.ts(798,20)` TS2345：传入值不能赋给 NotificationRequest，展开联合后 source 可能为 `{ kind: "health"; id: string }`，不能赋给此处要求的 SourceRef/automation-run 来源。
2. `src/modules/notifications/core/service.ts(74,26)`：`@typescript-eslint/no-unnecessary-type-assertion`，断言没有改变表达式类型。

两处均在本任务写集之外，未修改、忽略、--fix 或接管。定向类型/lint 通过不替代全仓失败，故保留待验收。

### dev Skill 的实际应用

1. 规则 2：修复保持在 shared，生产文件无新增依赖/导入；真实架构门禁通过。测试中的 Node/esbuild 使用仅用于测试子进程，不进入生产闭包。
2. 规则 3：没有 app/UI/模块加载变化，不新增启动依赖，构建与预算继续归 Lead。
3. 规则 4：修复显式 off 的引用释放，而非只保证停止投递；以 lifetime 长持有 disposer 的真实回收对照验证，原 abort/dispose/重开/异常回归保留。
4. 规则 8：生产核心仍无 Node、Electron、Obsidian 或 DOM 宿主依赖；GC 与进程 API 只在就近测试中使用。
5. 规则 9：实际运行全仓 lint 并保留写集外失败，定向生产 lint 零警告；没有禁用规则或改忽略配置。
6. 规则 10/licensing：原 MIT 来源头、固定提交、版权和修改说明保留；本次为局部原创修复，无新增外部代码复制，未修改 Lead 已完成的 R2 登记。
7. 规则 11：仅修改本票事件文件与自己的 REPORT，不更改 app 共享文件/只读文档，不提交、暂存、推送、发布或生成产物；报告中文。
8. testing 选择表及 TDD：就近回归测试先红后绿，实际运行真实生产实现，子进程 GC 提供正反对照，不弱化旧断言、不提高既有阈值；运行相关回归、生产/测试类型与架构/lint。
9. 规则 1、5、6、7、12：无视图、设置、持久化、产品文案或技能事实变化，没有触发对应额外工作；未触发 UI 技能。

### 候选与未改范围 SHA-256

```text
dddfa2c1c11be4596bb83bf5e2b9bde99b887ba30996f4d3389162418663f232  src/shared/events/domain-events.ts
1622167542f0610920821c9d0e0477b71267187d56d126af5d31a34a401e07ab  src/shared/events/retention.test.ts
294f38f10fd4d4053d74e59f4147b8210f1d43d357426a2bf02acd5c97774228  src/shared/events/domain-events.test.ts
f7cb0495339c0c269617607ae0299b7b339a897b4ffbb33da2f5c69ec0dd4058  src/app/main.ts
09529be6cd6a1f5892b4848600083c33dceb9e6607c62980b4551fe38dcb1e9a  src/app/contracts/module.ts
```

### 未执行或未验证

- 全仓测试类型检查与 lint：已经执行但未通过，待相关 automations/notifications owner 修复后由 Lead 复跑。
- `pnpm run build`、`pnpm check:bundle`、`pnpm check:notices`、UI runner：未执行，owner Lead。
- `pnpm run build:css`、`pnpm notices`：TASK 禁止，未执行；main.js/styles.css/生成通知未改。
- 独立复审、正式 Evidence/Ticket 状态：由 Lead 指派/维护，本执行者不宣称两轴已通过或票据 done。
- 真机宿主与其他引擎 GC：未执行；现有隔离宿主装配回归通过不冒充真实 Obsidian 验收。

## 问题与下一步

R1 修复与回归候选已完成；阻塞仅为 TASK 的全仓测试类型/lint 门禁仍未退出 0，修复路径均超出授权写集。Lead 可先固定上述候选给原 reviewer 复审，并协调 T-05 相关 owner 修复两个门禁诊断，在稳定输入上重跑检查后维护正式 Evidence/状态。R2 已按指令留给 Lead，不另行修改。没有等待交互回答或接管他人文件。
