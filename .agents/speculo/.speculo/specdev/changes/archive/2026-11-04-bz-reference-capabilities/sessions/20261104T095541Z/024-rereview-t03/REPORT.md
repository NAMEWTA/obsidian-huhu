# 任务回报

Session: 20261104T095541Z
Task: 024-rereview-t03
Status: completed

## 聚焦交接

已完成 T-03 独立复审，标准轴与规范轴均为 pass，022 报告中的 R1/R2 均已解决，未发现新增可操作问题。亲自运行 29 项相关回归，并用上一轮 R1 的独立回收探针确认：显式 off 后捕获状态可回收，lifetime 仍保留 disposer。定向类型检查、生产文件 lint、架构及文档门禁均通过。只写本 REPORT；正式 Evidence、Ticket 状态、全仓门禁及产物集成仍由 Lead 验收。

## 范围与独立性

- Strategy: independent；Risk: medium；Independence: required。
- Reviewer: 当前承接 `024-rereview-t03` 的 Codex 会话，曾执行 022 的只读审查，未参与本票实现、接线或修复；真实派遣身份由 Lead 核验，不虚构 session ID。
- Implementers: 014-implement-t03、020-wire-t03、023-repair-t03 的实现/修复会话，以及负责来源登记的 Lead。本 reviewer 不在实现者之列。
- Mode: working-tree；base/observed HEAD 均为 `29644dc5833bb209e6282f84fa71441a5a1b99d4`。
- Input-SHA256: `dae7c08b90a54071f8b2882d679b5485dcb291f2ca7c65640218ff2d1ace045a`（冻结 TASK 标识）。
- 六个固定输入：`src/shared/events/domain-events.ts`、`domain-events.test.ts`、`src/app/contracts/module.ts`、`src/app/main.ts`、`src/app/main-events.dom.test.tsx`、`docs/third-party/bz.md`。开始及检查后逐字节摘要均匹配 TASK，回读报告时再次核对。
- 只读 review-scope 以指定 base 和六个 `--file` 核对当前快照。完整读取修复后的端口、来源登记与 023 修复 REPORT；原事件测试、契约、main 及装配测试与 022 摘要相同，结合本轮回归重新核对。main.ts 的 T-02 反馈装配不作为 T-03 新增实现审查。

附加验证参考：新增 `src/shared/events/retention.test.ts` 未列入本 TASK 六文件清单；本次完整读取并运行它，其原字节摘要与 023 REPORT 给出的 `1622167542f0610920821c9d0e0477b71267187d56d126af5d31a34a401e07ab` 一致。它作为回收验证依据单独记录，不冒称已列入 TASK 冻结输入；registry 与 feedback 测试同样作为回归依据。Lead 汇总完整交付快照时应包含该新增回收测试。本次没有修改 TASK 或另建冻结工件。

规范依据为当前 T-03 Ticket、Spec §1/§7 与 AC-111/112/001、ADR-003/004、CONTEXT、Map、Goal Plan、README Execution Context，以及当前 TASK 的复审范围；逐条对照本会话已读的 022 原 findings。标准依据为已读且仍适用的 AGENTS.md、dev Skill 与 architecture/testing/licensing/obsidian-api/module-authoring 参考，以及 SpecDev 审查、风险、范围、来源、错误、可靠测试与结果复用规则。没有生产 UI 变更，ui 视觉验收不适用。

影响核对沿用真实链路：插件实例创建 DomainEvents → ModuleContext 注入 on/emit → 模块订阅并向 lifetime 登记 off → 显式退订/中止/模块清理解除订阅 → 插件卸载及启动回滚关闭端口。修复只改变记录持有 handler 的方式，不改变 app 装配或其他字段；新增来源映射由 Lead 集成。唯一可写路径为本 REPORT，其他票的 dirty 内容保持原样。

## Standards Axis

Result: pass
Reviewer: 当前 TASK 的独立 Codex reviewer
Input-SHA256: dae7c08b90a54071f8b2882d679b5485dcb291f2ca7c65640218ff2d1ace045a

Findings: 无新增或未解决的可操作问题。

- **R1 已解决。** `src/shared/events/domain-events.ts:47` 直接把原 handler 存入订阅记录，不再创建捕获 on 参数的包装闭包。off 第 53 行清空记录后，lifetime 保存的 off 不再经共享环境保留 handler。内部泛型擦除局限于记录存储，公开键的不变性、on/emit 签名和负向类型案例保持不变。
- 本次重新执行 022 的独立观察方法：Node `v26.11.1`、V8 `14.6.202.34-node.37`，`node --expose-gc --input-type=module`、esbuild `write:false` 内存加载真实源码；捕获含 1 MB Uint8Array 的状态，off 后保留 lifetime cleanup，跨 12 个 setImmediate/显式 GC 回合。实际输出 `retainedCapturedState:false`、`lifetimeDisposers:1`，旧症状不再出现，未靠清空 lifetime 数组消除引用。
- 新回收测试还提供活动订阅正向对照：handler/state 均存活；同一 disposer 连续调用两次后两者均可回收，cleanup 数组仍有一项。测试使用独立 Node 子进程、真实源码内存 bundle，未 mock 回收结果或泄漏 GC 标志到 Vitest 主进程。证据限于实际执行的 V8 环境，不声称所有引擎具有相同回收时机。
- 原有 10 项事件测试及真实 app/registry 回归仍通过：同名不同键和不同实例隔离、独立重复注册、幂等 off、预中止/派发中 abort、快照增删订阅、dispose、同步异常、异步拒绝、晚到拒绝与诊断 sink 自身失败均维持原语义。未弱化断言或原有类型约束。
- 生产代码仍无新增宿主依赖、全局订阅表、监听器、计时器、设置、持久化或面向用户文案；app 懒加载边界与插件唯一 dispose 所有权不变。

## Specification Axis

Result: pass
Reviewer: 当前 TASK 的独立 Codex reviewer
Input-SHA256: dae7c08b90a54071f8b2882d679b5485dcb291f2ca7c65640218ff2d1ace045a

Findings: 无新增或未解决的可操作问题。

| 合同或原 finding | 本轮结论与依据 |
|---|---|
| R1 退订引用释放 | 已解决；独立旧探针与新增活动/退订对照均确认 handler 捕获状态不再被 disposer 保留 |
| AC-111 | 原 10 项行为/类型测试重新通过，覆盖幂等退订、AbortSignal/lifetime 绑定与同步/异步失败隔离；修复未改变投递语义 |
| AC-112 | main/registry 实际装配回归通过；同插件模块共享一端口，两插件实例隔离，模块关闭/重开释放旧订阅，插件卸载与宿主回滚关闭端口；无 module-level Map |
| R2 来源登记 | 已解决；`docs/third-party/bz.md:25` 映射固定 d76a087 的 src/core/domain-bus.ts 到 src/shared/events/domain-events.ts，方式为改编，说明全局字符串总线改为实例类型端口、AbortSignal/lifetime、异常隔离及 ModuleContext 注入，并指向实际事件与装配测试 |
| IN/OUT 与范围 | 保持事件原语及 app 最小接线；未替换 zustand.subscribe/ServiceAccess.watch，不含 UI、数据格式或模块行为重构。源码头的项目、完整提交、MIT、原版权、上游路径和修改说明仍在 |

R2 内容与本会话上一轮实际读取的 [固定上游 domain-bus.ts](https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/core/domain-bus.ts) 一致：保留快照/幂等退订/单订阅异常隔离，明确改为实例 Map、类型化键和受生命周期管理的端口。本次没有更换上游版本，也没有把原 MIT 许可或其他票的采用边界重新解释。

本次 pass 限于冻结 T-03 候选及其来源登记义务，不代表整个 change 的 AC-001、page-flip 或最终集成已经关闭。main 测试在 settings UI 边界停止，证明真实接线与清理接缝，不宣称完整 onload 成功或真实 Obsidian 验收。

## 产物与验证

环境：`/home/wta/projects/obsidian-huhu` 的 dev 当前工作区；未安装或升级依赖。

| 命令或检查 | 退出码 | 实际结果 |
|---|---:|---|
| 对 TASK 六文件执行 `sha256sum`，检查后 Python 原字节摘要断言 | 0 | 6/6 匹配冻结输入；附加回收测试与 023 交接摘要一致 |
| `node .agents/speculo/workflows/specdev/common/tools/validate-specdev.mjs --review-scope --repo /home/wta/projects/obsidian-huhu --mode working-tree --base 29644dc5833bb209e6282f84fa71441a5a1b99d4`，对六个冻结输入各传 `--file` | 0 | 当前 scope 与 TASK 一致，未用 HEAD 冒充未提交内容 |
| `pnpm exec vitest run src/shared/events src/app/modules/registry.test.ts src/app/main-events.dom.test.tsx src/host/obsidian/feedback.dom.test.tsx` | 0 | 5 文件、29 测试通过：事件原 10、回收 1、注册表 10、main 装配 3、反馈回归 5 |
| `pnpm exec tsc --noEmit --skipLibCheck --strict --target es2021 --module esnext --moduleResolution bundler src/shared/events/domain-events.ts src/shared/events/domain-events.test.ts` | 0 | 事件端口及负向 payload 类型案例通过 |
| 同上，追加 `src/shared/events/retention.test.ts` 为检查根文件 | 0 | 新增回收测试的定向类型检查也通过 |
| `pnpm exec eslint src/shared/events/domain-events.ts src/app/contracts/module.ts src/app/main.ts --max-warnings 0` | 0 | 本票生产文件零警告，未改规则或 ignore |
| `pnpm test:architecture` | 0 | 1297 模块，无分区、宿主包、桌面边界、barrel 或循环违规 |
| `pnpm test:docs` | 0 | 1409 Markdown、1586 本地链接；1246 外部链接未由该门禁抓取 |
| `git diff --check 29644dc5833bb209e6282f84fa71441a5a1b99d4 -- src/app/main.ts src/app/contracts/module.ts docs/third-party/bz.md` | 0 | 已跟踪差异无空白错误 |
| `node --expose-gc --input-type=module`，内存加载真实端口并执行 022 R1 原观察方法 | 0 | 捕获状态可回收，lifetime 仍保存 1 个 disposer |

未验证：全仓生产/测试 tsc、全仓 lint、构建、包体、产物/通知集成及真实 Obsidian 未在本轮执行。023 REPORT 记录的写集外 automations/notifications 门禁诊断未由本 reviewer 复跑或接管，不声称这些全仓门禁已经通过；Lead 应在稳定整体输入上核定。没有运行 build/build:css/notices 写入，没有 Git 写操作、推送、发布或正式 Evidence/状态更新。无生产 UI 的本票不要求 UI E2E。

## 问题与下一步

无剩余审查 finding 或本次执行阻塞。Lead 可回读本报告并核验冻结输入、真实派遣与附加回收测试依据后，将两轴 pass 写回 T-03 Evidence，再处理整体门禁与产物集成；完整交付快照包含新增 retention.test.ts。旧 022 报告保留原 request-changes 结论，不改写历史。
