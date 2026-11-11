# 任务回报

Session: 20261104T095541Z
Task: 014-implement-t03
Status: completed

## 聚焦交接

本阶段已交付实例作用域的类型化事件端口及 10 项就近测试，不宣称 T-03 done。遵守 TASK 的分阶段约束，本任务没有修改 `src/app/main.ts` 或 app contracts；生产接线片段列于下文，供 T-02 结束后另派接线任务。AC-111 的端口行为与 AC-112 的多实例隔离已通过单元验证，类型检查、架构门禁与 lint 全部退出码 0。独立双轴审查、生产装配验证、构建和正式 Evidence/状态仍由 Lead 接收并维护。

## 产物与验证

### 全部新增/修改文件

- 新增 `src/shared/events/domain-events.ts`：`DomainEventKey<T>`、`domainEventKey<T>()`、`EventSubscriptionOptions` 与 `DomainEvents`。
- 新增 `src/shared/events/domain-events.test.ts`：10 项行为/类型合同测试。
- 新增本 `REPORT.md`，按 Return 一次性写入并回读。

没有修改其他文件，没有安装依赖或执行任何 Git 写操作。工作区仍为 `/home/wta/projects/obsidian-huhu`，分支 `dev`，HEAD `29644dc5833bb209e6282f84fa71441a5a1b99d4`；沿用 README execution-context，Map 已核对至 plan_revision 3。开始时已有 NOTICE、docs、main.ts、safe、archives、navigator 及反馈实现等 dirty 内容，保持原样；本次候选仅上述两个事件源码/测试文件与本报告。

### 关键设计与行为

- 每次 `new DomainEvents()` 创建自己的 Map；没有模块级可变订阅表或单例。事件键是可由所属域 `api.ts` 导出的常量，通过 symbol 标识身份，名称相同的不同键互不串扰。
- 键的泛型标记保持 payload 类型不变性，发布者与订阅者不能通过推断联合类型绕过契约。三个 `@ts-expect-error` 负向类型案例由真实测试 tsconfig 检查，防止错误 ID 类型、错误订阅 payload 和不兼容键赋值被接受。
- `on(key, handler, { signal, lifetime })` 返回幂等退订函数。lifetime 使用与 Obsidian Component.register 相容的结构接口，shared 不导入宿主包或 app contracts。已中止的 signal 与已 dispose 端口不建立订阅；同一 handler 的多次订阅独立释放。
- `emit` 同步按订阅记录快照扇出，不等待异步业务；新增订阅从下次 emit 开始。退订、abort 或 dispose 立即取消尚未调用的订阅，与 bz 快照中的旧 handler 仍调用有所区别：避免中止/卸载后继续执行旧订阅。
- 同步异常与异步拒绝都被隔离。可选诊断回调只收到静态键名，不收到 payload 或异常原文，诊断回调自身的同步/异步失败也被隔离。没有全局日志或原文日志输出。
- `dispose` 终止端口，解除 abort 监听，清除 handler，并且幂等；它不会取消已经进入 handler 的业务异步任务。晚到拒绝仍被观察，不成为未处理拒绝。业务回环与异步任务取消由订阅者负责，公共注释明确该边界。
- payload 的内容约束由领域声明与调用者承担：只传 ID、版本/哈希、operationId、原因；端口是失效提示，不是持久化或事务通道。未宣称可对任意 payload 做运行时秘密检测。

### 来源与 Lead 待汇总登记

实际读取固定上游：
https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/core/domain-bus.ts

读取方式为只读 `gh api 'repos/yeshimei/bz/contents/src/core/domain-bus.ts?ref=d76a0870329403247917a00c43019e203a2560a4' --jq .content | base64 --decode`。该来源由 Ticket 明确指定，沿用 ADR-003/ADR-004 的选择，没有新增运行依赖或重新比较替代方案。

请 Lead 将以下条目汇总至 `docs/third-party/bz.md`（该文件不在本阶段写集）：

| 上游 SHA/路径 | 虎虎落点 | 方式 | 偏离原因 | 验证 |
|---|---|---|---|---|
| d76a0870329403247917a00c43019e203a2560a4 / src/core/domain-bus.ts | src/shared/events/domain-events.ts | 改编 | 继承快照遍历、空通道回收、幂等退订与单订阅异常隔离；改为实例持有、类型化 symbol 键、独立订阅所有权，增加 AbortSignal/lifetime/dispose、异步拒绝及安全诊断隔离；移除原始异常日志；中止立即使未调用记录失效 | 10 项 Vitest、双 tsc、architecture、lint 通过 |

实现文件头已包含 yeshimei/bz、完整固定提交、上游原路径、MIT、`Copyright (c) 2026 叫我包仔` 与修改说明。测试为本次自行编写，没有复制上游测试。既有 bz 许可文件与 NOTICE 本任务未修改。

### main.ts 所需最小接线（本阶段仅建议片段，未写入）

当前只读位置：`src/app/main.ts` 导入区约第 45 行；`DashboardPlugin` 类的 `documents` 字段附近约第 99 行；`onload()` 开头约第 143 行。以符号锚点为准，T-02 后行号可能变化。

1. 在导入区加入：

```ts
import { DomainEvents } from '../shared/events/domain-events';
```

2. 在 `export default class DashboardPlugin extends Plugin` 内、`documents!: EditorContextService;` 后加入实例字段：

```ts
readonly domainEvents = new DomainEvents();
```

3. 在 `async onload(): Promise<void>` 开头、初始化 `this.documents` 前登记插件生命周期清理：

```ts
this.register(() => this.domainEvents.dispose());
```

这三处是创建/释放每插件实例端口的最小 main.ts 接线，不需要静态加载任何模块/UI，也不替换 zustand.subscribe 或 ServiceAccess.watch。消费方使用同一个实例的 `domainEvents`，并把其 `context.lifetime` 传给 `on` 的 options。当前 `ModuleContext` 没有事件字段，本任务没有添加字段或通过类型断言偷渡；若后续希望经 ModuleContext 全域注入，需由 Lead 给相应 contracts 与装配路径明确授权后完成，不能把上述创建/释放片段当成已完成所有消费者接线。

### 实际应用项目 dev Skill

完整读取并实际应用 `.agents/skills/dev/SKILL.md`；testing、licensing、architecture 参考与先前已读的未变化执行合同复用，TDD/注释/错误/测试可靠性分支本次读取。

1. 规则 2：生产代码置于 shared，无 app/contracts、模块内部、宿主或外部包导入；类型导入边界同样遵守，真实 architecture 门禁通过。
2. 规则 3：实现不引入 React、Radix、模块实现或其他懒加载内容；main.ts 接线仅返回候选片段，构建/包体留给 Lead。
3. 规则 4：提供幂等退订与终端 dispose；AbortSignal/lifetime 绑定释放 handler 和 abort 监听；测试覆盖关闭、重复释放与派发期间中止。
4. 规则 8：shared 不使用 Obsidian、Node、Electron、DOM 窗口/元素或其他宿主依赖；AbortSignal 为既有可移植取消契约，lifetime 采用结构类型。
5. 规则 9：真实 `pnpm run lint` 零警告通过，未关闭规则或添加 ESLint 例外；最终测试补强后又运行 events 目录 ESLint。
6. 规则 10 与 licensing：仅改编已核对 MIT 的 bz 事件核心，文件头保留完整来源/版权/变更说明；来源映射返回 Lead，未越界写 bz.md 或 NOTICE。
7. 规则 11：只写本阶段授权路径，冻结 TASK 未改；不提交、暂存、推送、发版或生成共享产物。没有界面改动，未触发 ui 技能。
8. “完成之前”与 testing 选择表：使用就近 Vitest 公共接口测试、生产/测试 tsc、架构与 lint；没有放宽断言、移除既有测试或提高阈值。异步用显式 Promise 与微任务观察，不使用随机延时。
9. 规则 1、5、6、7、12：无视图/设置/持久化/产品文案或技能事实改动，因此没有新增对应实现与镜像文档；英文仅用于源码公共合同注释与测试名，REPORT 用中文。

### TDD 与反向验证事实

同一公共接缝是新端口的 on/emit/dispose：

| 切片/命令 | red 退出码与现象 | green |
|---|---|---|
| `pnpm exec vitest run src/shared/events`，首个投递/隔离测试 | 126；空实现导致 received 为 []，应为 ['one'] | 0；1/1 |
| 同命令，生命周期切片 | 126；退订不幂等及取消/lifetime 未绑定，received 为 ['cancelled','lifetime']，应为 ['replacement'] | 0；2/2 |
| 同命令，异常隔离切片 | 126；同步 SECRET 异常逃逸 emit，not.toThrow 断言失败 | 0；3/3 |
| 同命令，补齐边界与类型契约 | 无新增生产调整；验证既有接缝边界 | 0；10/10 |
| 强制变异：临时移除 `Promise.resolve(subscription.handler(payload))` 后的 `.catch(() => this.reportFailure(key.name))`；`pnpm exec vitest run src/shared/events -t 'late async failures'` | 126；预期诊断 ['archives:changed'] 实际 []，同时出现 1 个未处理拒绝；有效行为失败，不是编译/夹具错误 | finally 原字节恢复，SHA-256 与变异前相同；随后完整目录 10/10、退出 0 |

反向验证只在自己的源码文件临时改动，恢复与 hash 核对在 finally 中执行；没有留下变异或过程文件。上表 126 为当前实际 runner 返回值，均为有意观测的 red，不是最终检查失败。

### 最终适用检查

| 命令 | 退出码 | 观察 |
|---|---|---|
| `pnpm exec vitest run src/shared/events` | 0 | 最终 10/10，通过且无未处理拒绝 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 0 | 生产类型检查通过 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 0 | 测试与负向类型案例通过；最后一次测试补强后再跑仍为 0 |
| `pnpm test:architecture` | 0 | 1288 modules；无分区、宿主包、桌面边界、桶导入或循环违规 |
| `pnpm run lint` | 0 | 全仓 eslint，零警告 |
| `pnpm exec eslint src/shared/events --max-warnings 0` | 0 | 最终本票源码/测试零警告 |
| `git diff --check` | 0 | 已跟踪工作区差异无空白错误；不把他人内容算作本票交付 |
| `git diff --no-index --check /dev/null src/shared/events/domain-events.ts` | 0 | 新增源码空白检查通过 |
| `git diff --no-index --check /dev/null src/shared/events/domain-events.test.ts` | 0 | 新增测试空白检查通过 |
| `sha256sum src/shared/events/domain-events.ts src/shared/events/domain-events.test.ts` | 0 | 下述候选快照 |

```text
bedf99faeefd0a3f0f226d39960f65219530442c9a1dd111a3b95be002058f93  src/shared/events/domain-events.ts
294f38f10fd4d4053d74e59f4147b8210f1d43d357426a2bf02acd5c97774228  src/shared/events/domain-events.test.ts
```

### 未验证项与归属

- main.ts 生产创建/销毁接线：按 TASK 明确延期，owner Lead；上文片段未落地，AC-112 的真实插件装配部分不宣称通过。
- app contracts/消费模块注入与真实模块生命周期场景：本阶段未实现；结构兼容与端口生命周期已单测，生产注入后再验证。
- `pnpm run build`、`pnpm check:bundle`、`pnpm check:notices`、UI runner：未执行，owner Lead；无 UI 的本票 E2E disposition 为 not-required。
- `pnpm run build:css`、`pnpm notices`：TASK 禁止，没有运行；main.js/styles.css/生成通知未改，重建由 Lead 串行安排。
- 独立双轴审查：未执行，owner Lead 指派另一 reviewer；本报告不冒充审查通过，也不写正式 Evidence 或更新 Ticket。
- 来源条目追加到 bz.md：由 Lead 汇总上述映射，本阶段没有修改该只读文件。

## 问题与下一步

本阶段无实现阻塞。完整票的 app 装配由 TASK 有意拆到后续任务，不因此越界修改 T-02 独占的 main.ts。Lead 回读两个候选文件与摘要，安排独立审查、更新来源映射；T-02 完成后另派接线并执行生产装配/构建检查，再维护正式 Evidence 与 Ticket 状态。completed 仅表示本阶段候选交回。
