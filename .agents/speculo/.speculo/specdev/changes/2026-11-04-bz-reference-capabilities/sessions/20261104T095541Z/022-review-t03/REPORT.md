# 任务回报

Session: 20261104T095541Z
Task: 022-review-t03
Status: completed

## 聚焦交接

已完成 T-03 独立双轴审查，两轴均为 request-changes，共两项 minor：绑定 lifetime 的退订函数仍通过闭包保留原 handler，以及实际 bz 事件核心改编缺少来源登记。亲自执行的 28 项定向测试、事件核心类型检查、生产文件定向 lint 和架构门禁均通过；额外 V8 回收探针复现了现有用例未覆盖的引用保留。六个冻结文件始终匹配 TASK。仅写本 REPORT，未修改任何业务/测试文件或正式状态；completed 表示审查报告交回，不表示候选验收通过。

## 审查范围与依据

- Strategy: independent；Risk: medium；Independence: required（用户及当前 TASK）。
- Reviewer: 当前承接 `022-review-t03` 的 Codex 会话；未参与本票实现、接线或修复，真实派遣身份由 Lead 核验，不虚构 session ID。
- Implementers: 014-implement-t03、020-wire-t03 的实现会话；来源文档共享集成由 Lead 负责。
- Mode: working-tree；base/observed HEAD 均为 `29644dc5833bb209e6282f84fa71441a5a1b99d4`。
- Input-SHA256: `384b40e018813af3ee9ca681e3399683e16c4e81c676c6c9cff9952acd932e80`（冻结 TASK 标识）。
- 六个固定输入为 `src/shared/events/domain-events.ts`、`domain-events.test.ts`、`src/app/contracts/module.ts`、`src/app/main.ts`、`src/app/main-events.dom.test.tsx`、`src/app/modules/registry.test.ts`。开始与检查后/写报告前核对原字节 SHA-256，全部匹配；报告回读时再核对。
- 只读 review-scope 以指定 base 和六个 `--file` 核对实际快照。读取新端口及全部对应测试、契约与接线 diff；main.ts 仅审本票的导入、实例字段、onload 释放登记、context 注入、onunload 关闭，不将已验收的 T-02 反馈装配当成本票差异。registry.test.ts 为冻结回归输入，不声称它有本票新增差异。

规范来源为当前 Ticket、Spec §1/§7、AC-111/112/001、ADR-003/004、CONTEXT、Map、Goal Plan 与 README Execution Context；完整读取两份实现 REPORT，并核对 020 TASK 的第二阶段具体授权。其明确允许最小修改 ModuleContext 及构造路径，因此未把 Ticket/通用段保留的 contracts 只读描述误判为接线越界。标准来源为本会话已读且仍适用的 AGENTS.md、dev Skill 及 architecture/testing/licensing/obsidian-api/module-authoring 参考，以及 SpecDev 审查、风险、来源、范围、错误与可靠测试规则。本票没有生产 UI 变更，ui 视觉验收不适用。

影响链核对：DashboardPlugin 实例字段创建端口 → ModuleRegistry 的真实 createContext 注入 → 模块通过 on/emit 使用 → Component lifetime 保存 cleanup → 模块停用时 releaseContext 卸载 lifetime；插件 onload 登记回滚清理，onunload 先 dispose 端口。读取 registry 实现和原有测试，核对停用/重开、卸载、回滚与异常路径；bz.md 作为必需来源登记只读检查，不属于本 reviewer 写集。唯一写入为本 REPORT。

## Standards Axis

Result: request-changes
Reviewer: 当前 TASK 的独立 Codex reviewer
Input-SHA256: 384b40e018813af3ee9ca681e3399683e16c4e81c676c6c9cff9952acd932e80

### R1 — minor — 显式退订后 lifetime 保存的 disposer 仍保留原 handler

- 位置：`src/shared/events/domain-events.ts:46`，关联第 50–61 行的 off 闭包与 lifetime.register。
- 问题：subscription.handler 的包装箭头捕获 on 的原始 handler 参数；同一调用创建的 off 闭包共享该词法环境。off 虽将 subscription.handler 设为 undefined 并移出 channel，但 lifetime 继续保存 off，因此原 handler 及其闭包状态仍可达。实际投递会停止，问题是引用/内存没有随显式退订释放。长寿命模块中反复建立再关闭短期订阅，旧页面、模型或大对象可累积到整个 lifetime 被释放。
- 亲自复现：Node `v26.11.1`、V8 `14.6.202.34-node.37`，使用 `node --expose-gc --input-type=module` 和 esbuild `write:false` 在内存加载冻结实现。lifetime 只把 off 保存到数组；handler 捕获一个对象（含 1 MB Uint8Array），在安装作用域结束前执行 off。之后跨 12 个 setImmediate 回合显式 GC，WeakRef 仍可解引用；清空 lifetime 的 cleanup 数组后以同样方法回收，对象消失。bus 仍持有时也可复现，说明不是活动通道仍在投递。
- 最小观察核心（DomainEvents/domainEventKey 来自真实源码的内存 bundle）：

```js
const events = new DomainEvents();
const key = domainEventKey('review:retention');
const cleanups = [];
let weak;
(() => {
  const captured = { sentinel: 'state', large: new Uint8Array(1_000_000) };
  weak = new WeakRef(captured);
  const handler = () => { if (captured.sentinel === 'never') throw Error(); };
  const off = events.on(key, handler, {
    lifetime: { register(fn) { cleanups.push(fn); } },
  });
  off();
})();
for (let i = 0; i < 12; i++) {
  await new Promise(resolve => setImmediate(resolve));
  global.gc();
}
console.log(Boolean(weak.deref())); // 当前冻结实现为 true
```

- 因果对照：仅在内存源码中把第 46 行的 wrapper 改为记录直接持有 handler，保持 off、bus、lifetime cleanup 数组和 GC 接缝不变，结果为 false。输出依次为 `Frozen production ... true`、`In-memory control ... false`。没有把这个对照写入业务文件，也未把它交付为修复；这是当前 V8 下的可复现保留图证据，不声称所有 JS 引擎都具有相同回收时机。
- 建议修正：避免 off 共享仍保存原始 handler 的环境，例如将包装器/退订闭包隔离，使清空订阅记录后，lifetime 保存的幂等 disposer 不再保留 handler。保留 abort/off/dispose 和重复订阅现有语义，并用持有/释放对照核验修复，避免仅以“不再收到回调”当成引用释放证明。
- 依据：dev 生命周期与资源归属规则，以及端口自身的释放承诺。该问题不等同于回调退订失效；AC-111 的“不再接收”用例目前确实通过。

其余标准观察：每个 DomainEvents 实例持有独立 Map，symbol 键不会因同名而串扰；快照扇出期间 off/abort/dispose 能阻止尚未调用的记录，新增订阅延后到下次 emit；同步异常、异步拒绝与诊断 sink 自身错误均被隔离。payload 类型的不变性由三项负向编译案例验证。诊断仅接收键名，没有转发原异常或 payload；实际 domain 的敏感字段约束仍由其 api.ts 定义与调用方负责，本票没有虚构运行时秘密检测能力。

## Specification Axis

Result: request-changes
Reviewer: 当前 TASK 的独立 Codex reviewer
Input-SHA256: 384b40e018813af3ee9ca681e3399683e16c4e81c676c6c9cff9952acd932e80

AC-111 的现有行为接缝通过：幂等 off、已中止 signal、派发中中止/退订、独立注册、lifetime 清理、同步/异步失败隔离、dispose 与晚到拒绝均有实际测试。AC-112 的端口及生产接线接缝通过：两个插件/Vault 上下文端口不同，同插件模块共享同一端口；真实 setModuleEnabled 停用/重开释放旧订阅；插件卸载清除无 lifetime 的订阅，启动回滚也执行 owner cleanup，没有 module-level 订阅表。

main 装配测试替身位于 Obsidian Plugin/Component、磁盘初始化及 fixture manifests 边界；真实 main.onload、ModuleRegistry、createContext 和 DomainEvents 实际运行。测试按设计停在 settings UI 挂载边界，不构成完整 onload 成功或真实 Obsidian 验收。IN 为事件原语与 app 装配，OUT 的 zustand.subscribe/ServiceAccess.watch 未被替换。

### R2 — minor — 实际事件核心改编未进入要求的 bz 来源登记

- 位置：`src/shared/events/domain-events.ts:1`；对应缺失处为 `docs/third-party/bz.md:16` 的逐项登记表。
- 问题与证据：新端口文件已明确署名改编固定 bz `src/core/domain-bus.ts`，但当前 bz.md 无该上游路径或 HUHU `domain-events.ts` 的映射。014 REPORT 已给出待 Lead 汇总条目，020 REPORT 继续将其交由 Lead；写本报告前再检查仍未落实。
- 复现：`rg -n 'src/core/domain-bus\.ts|domain-events\.ts' docs/third-party/bz.md` 无命中；对照新端口文件头及 Ticket「行为与范围」「执行约束」。本次通过 Contents API 实际读取的 [固定 bz domain-bus.ts](https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/core/domain-bus.ts) 确认采用点为订阅快照、空通道回收、幂等 off 与单订阅异常隔离。
- 影响与依据：Ticket 明确要求复制部分在 bz.md 登记，Spec/Map AC-001 要求实际采用的路径、方式、落点与偏离原因。实现 REPORT 中的未来汇总要求不能替代当前来源登记。MIT 原文与文件头版权已有保留，本 finding 指项目来源映射缺失，不声称许可证全文缺失。
- 建议修正：由 Lead 补充固定 SHA、上游 src/core/domain-bus.ts → src/shared/events/domain-events.ts、方式改编，以及实例 Map、symbol 类型键、独立订阅记录、即时中止、AbortSignal/lifetime/dispose、异步拒绝和安全诊断等偏离与实际验证。源登记不在实现者本阶段写集，由 Lead 集成后重新核对；本 reviewer 不越权修改。

唯一 findings 总数：minor 2，major 0，blocker 0。标准轴 R1；规范轴 R2。规范轴 request-changes 来自本票强制来源登记未闭合，没有将通过的 AC-111/112 行为测试记成失败，也未把整个 change 的 AC-001/page-flip 验收扩大为本票义务。

## 产物与验证

环境为 `/home/wta/projects/obsidian-huhu` 的 dev 当前工作区。按冻结 TASK 仅做本票定向检查，不接管其他在制票的 safe/diary 诊断，不运行全仓 tsc/lint 来制造无关阻塞。

| 命令或检查 | 退出码 | 实际结果 |
|---|---:|---|
| TASK 六文件 `sha256sum`，检查后及写报告前 Python 原字节摘要断言 | 0 | 6/6 匹配冻结输入 |
| `node .agents/speculo/workflows/specdev/common/tools/validate-specdev.mjs --review-scope --repo /home/wta/projects/obsidian-huhu --mode working-tree --base 29644dc5833bb209e6282f84fa71441a5a1b99d4`，对六输入各传 `--file` | 0 | 固定范围与 TASK 一致；main 的 T-02 部分按明确范围排除 |
| `pnpm exec vitest run src/shared/events src/app/modules/registry.test.ts src/app/main-events.dom.test.tsx src/host/obsidian/feedback.dom.test.tsx` | 0 | 4 文件、28 测试通过：事件 10、注册表 10、main 装配 3、反馈回归 5；无未处理拒绝 |
| `pnpm exec tsc --noEmit --skipLibCheck --strict --target es2021 --module esnext --moduleResolution bundler src/shared/events/domain-events.ts src/shared/events/domain-events.test.ts` | 0 | 事件端口与负向 payload 类型案例通过；这不是全仓/app 完整类型检查 |
| 初次对六个冻结输入执行 `pnpm exec eslint ... --max-warnings 0` | 126 | 三个测试文件被仓库既有配置忽略，产生 3 条 ignored warning、0 errors；不是本票代码诊断 |
| `pnpm exec eslint src/shared/events/domain-events.ts src/app/contracts/module.ts src/app/main.ts --max-warnings 0` | 0 | 按仓库 lint 适用范围检查本票生产文件，零警告；没有禁用规则或改 ignore |
| `pnpm test:architecture` | 0 | 1296 模块，无分区、宿主包、桌面边界、barrel 或循环违规 |
| `git diff --check 29644dc5833bb209e6282f84fa71441a5a1b99d4 -- src/app/main.ts src/app/contracts/module.ts src/app/modules/registry.test.ts` | 0 | 已跟踪差异无空白错误 |
| `gh api repos/yeshimei/bz/contents/src/core/domain-bus.ts?ref=d76a0870329403247917a00c43019e203a2560a4` | 0 | 解码并完整读取固定上游源码 |
| 两个 `node --expose-gc --input-type=module` 内存探针 | 0 | 成功观察 R1 引用保留；清空 cleanup 与移除 wrapper 的独立对照均可释放。退出 0 表示复现成功，不表示候选无问题 |

探针只在内存用 esbuild `write:false` 加载源码或构造单变量对照，没有改写冻结源码、保存临时测试、运行变异文件或安装依赖。没有 Git 写操作、构建、build:css、notices 写入、推送、发布或正式 Evidence/状态更新。

未验证：全仓 tsc/lint 按 TASK 排除其他在制票影响，不宣称其已通过；构建、包体、产物/通知集成与真实 Obsidian 验收未执行，仍归 Lead。无 UI 的本票不要求 UI E2E；内存宿主的装配测试不冒充真机。

## 问题与下一步

审查执行已完成，没有需要用户补充的阻塞。Lead 可将 R1 交回事件端口 owner 局部修复，并完成 R2 的来源映射集成；随后重新冻结受影响候选进行复审。当前两轴 request-changes 保留，不改正式 Ticket/Evidence，也不以其他在制票门禁变化覆盖本次结论。
