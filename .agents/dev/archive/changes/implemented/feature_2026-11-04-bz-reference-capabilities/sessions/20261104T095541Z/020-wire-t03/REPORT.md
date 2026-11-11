# 任务回报

Session: 20261104T095541Z
Task: 020-wire-t03
Status: blocked

## 聚焦交接

第二阶段接线候选已经实现：每插件实例独立持有事件端口，经只读 ModuleContext.events 注入，并在插件卸载与宿主启动回滚时释放。新增的真实 main.onload/ModuleRegistry/context 工厂装配测试 3/3 通过，相关反馈 DOM 回归与端口/注册表单元测试均通过。全仓类型与 lint 门禁未通过，诊断均位于本阶段写集以外，故按 blocked 交回，不宣称 T-03 done。本票生产文件定向 lint 通过，原有 dirty 内容保留，Lead 接收后需协调相应文件 owner 修复并重跑全仓门禁，再安排独立审查与正式 Evidence。

## 产物与验证

### 全部修改/新增文件

- 修改 `src/app/main.ts`：新增 DomainEvents 导入、私有实例字段；onload 第一条注册释放回调；真实 createContext 返回 `events: this.domainEvents`；onunload 第一条先关闭事件端口，再执行原有模块/宿主清理。
- 修改 `src/app/contracts/module.ts`：新增 DomainEvents 类型导入与必需的只读字段 `events: Pick<DomainEvents, 'on' | 'emit'>`；模块可以发布/订阅，端口全局 dispose 权限保留在插件 owner，不改其他字段语义。
- 新增 `src/app/main-events.dom.test.tsx`：3 项装配、隔离、生命周期与回滚测试。
- 新增本 REPORT，按 Return 一次写入并回读。

第一阶段的 `src/shared/events/domain-events.ts` 和 `domain-events.test.ts` 未修改，摘要与 014 REPORT 一致。未修改 TASK、Ticket、Map、Goal、README、正式 Evidence、依赖或生成产物；没有任何 Git 写操作、安装/升级、提交、推送或发布。

### 范围、基线与关键决定

- 工作区 `/home/wta/projects/obsidian-huhu`，dev，基线 `29644dc5833bb209e6282f84fa71441a5a1b99d4`；复用 README execution-context，Map plan_revision 3。实现合同、dev Skill 和未变化的既读规则复用；本次完整读取新 TASK、当前 Ticket、dev Skill，并回读前阶段 REPORT、真实入口/契约/注册表/测试与所需 Obsidian、mocking 参考。
- TASK Inputs 的“第二阶段（接线）”明确新增授权 ModuleContext 与构造它的 src/app/** 文件，且明确解禁 main.ts；本次据此执行具体授权，不使用后文保留的通用只读描述否定该阶段授权。新测试就近放在实际装配入口旁。
- main.ts 在本阶段前已有 T-02 改动，先保存只读基线副本，再做本票最小追加；与该副本的差异仅五处接线：导入、字段、onload 注册、context 注入、onunload 关闭。基线副本留本地：/tmp/huhu-t03-wire-baseline-wyf1np4t/main.ts 和 module.ts。未还原/格式化/暂存其他执行者改动。
- onload 注册覆盖启动失败后由宿主回滚清理的路径；onunload 先 dispose 覆盖模块 teardown 期间及之后的晚到 emit。DomainEvents.dispose 本来幂等，所以正常卸载重复清理安全。
- context.events 为必需只读能力，类型只开放 on/emit，模块按 `context.events.on(key, handler, { lifetime: context.lifetime })` 订阅。模块停用/重开沿用真实注册表的 context lifetime 创建/释放，不改服务、贡献点或其他字段语义，不替换 zustand.subscribe/ServiceAccess.watch。
- 本阶段只将已交付端口接入 app，没有新增 bz 代码复制或改编。原来源/版权头继续留在 shared/events/domain-events.ts；第一阶段的来源映射由 Lead 汇总，未越界改 bz.md/NOTICE。

### 装配测试与证明边界

实际运行生产 DashboardPlugin.onload，到真实 ModuleRegistry 激活两个 fixture manifest 的模块工厂，由生产 createContext 交付 ModuleContext。ModuleRegistry、createContext、DomainEvents、模块开关逻辑、ThemeRuntime 和 EditorContextService 均参与真实执行，不 mock 事件端口或注册表。

替身位于测试输入与宿主/磁盘边界：Obsidian Plugin/Component 提供 register/addChild/removeChild/unload；device/content-files/recovery/settings-runtime 的文件初始化以 fixture 替代；MANIFESTS 提供两个最小测试模块。测试在 Obsidian addSettingTab 挂载设置 UI 时抛出固定边界标记，start 明确断言该标记；此时实际 startup 模块已经激活，后续事件订阅与卸载断言在真实生产接线上运行。这是隔离宿主的生产装配验证，不是完整 onload 成功或真实 Obsidian 验收，不把设置 UI、磁盘恢复或宿主实现写成通过。

3 项测试观察：

1. 两插件各激活两个模块，同插件模块收到同一事件端口，不同插件端口不同；互相发布只到各自订阅者。通过真实 setModuleEnabled 关闭模块后不再收到事件；重开获得新 lifetime、同一插件端口，旧订阅不复活。
2. 无 lifetime 的订阅也在 plugin.onunload 后失效，新订阅/emit 不再产生回调；另一个插件仍可收事件。
3. 只执行宿主 Component.unload 回滚、未调用 plugin.onunload，也能由 onload 登记的 owner cleanup 关闭端口。

### TDD 与反向验证

| 切片/命令 | red | green |
|---|---|---|
| `pnpm exec vitest run --project dom src/app/main-events.dom.test.tsx`，真实 context 注入切片 | 126；实际 startup 已创建两个上下文，但 one.events 为 undefined，toBeDefined 失败 | 0；1/1 |
| 同命令，插件卸载切片 | 126；卸载后仍收到 one:after、one:late、new-after-unload，期望只保留卸载前回调与另实例回调 | 0；2/2 |
| 同命令，加入回滚路径与模块重开覆盖 | 无需额外生产变更；覆盖现有接线边界 | 0；3/3 |
| 强制变异：仅临时删除 main.ts 的 `this.register(() => this.domainEvents.dispose());`，执行 `pnpm exec vitest run --project dom src/app/main-events.dom.test.tsx -t 'startup is rolled back'` | 126；received 为 ['after-rollback']，应为 []，实际行为断言失败 | finally 原字节恢复并核对 SHA-256；之后装配/反馈 DOM 8/8 退出 0 |

反向验证恢复摘要为 f7cb0495339c0c269617607ae0299b7b339a897b4ffbb33da2f5c69ec0dd4058。没有残留变异、弱化断言或永久跳过测试。126 是本会话实际 runner 的失败退出码，上表 red 是预期测试证据，不是最终候选测试失败。

### 最终命令与退出码

| 命令 | 退出码 | 结果 |
|---|---|---|
| `pnpm exec vitest run --project dom src/app/main-events.dom.test.tsx` | 0 | 3/3 装配测试通过 |
| `pnpm exec vitest run --project dom src/app/main-events.dom.test.tsx src/host/obsidian/feedback.dom.test.tsx` | 0 | 最终 2 文件、8/8 通过，保护 T-02 main.ts 反馈导出回归 |
| `pnpm exec vitest run src/shared/events src/app/modules/registry.test.ts` | 0 | 2 文件、20/20 通过（事件端口 10、注册表 10） |
| `pnpm test:architecture` | 0 | 1291 modules，无分区/宿主包/桌面边界/桶导入/循环违规 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 126 | 初次为日记文件 5 项写集外错误；复核最终候选时变为 safe test-support 的 TS2339，见下文 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 126 | 与生产检查同样的写集外诊断；未报告本票文件错误 |
| `pnpm run lint` | 126 | 139 problems：21 errors、118 warnings，全部位于 navigator/ui/diary 与 safe/services；没有本票文件诊断 |
| `pnpm exec eslint src/app/main.ts src/app/contracts/module.ts --max-warnings 0` | 0 | 本票生产文件定向 lint 零警告 |
| `git diff --check` | 0 | 已跟踪工作区空白检查通过，不将其他人的修改计入本票 |
| `git diff --no-index --check /dev/null src/app/main-events.dom.test.tsx` | 0 | 新增测试文件空白检查通过 |
| `sha256sum src/app/main.ts src/app/contracts/module.ts src/app/main-events.dom.test.tsx` | 0 | 下述候选摘要 |

注意：通过定向 lint/测试不替代全仓门禁失败，不能据此宣称全部 Acceptance 已满足。

### 全仓门禁未通过的事实

初次两项 tsc 都报告：

- src/modules/navigator/ui/diary/DiaryReader.tsx(44,28)：TS2339，Window 没有 ResizeObserver；(44,44) TS7006，records 隐式 any。
- src/modules/navigator/ui/diary/flip-engine.ts(31,6)、(37,8)、(38,67)：TS18048，renderer 可能 undefined。

复核时上述错误已经由其他并行工作变化而消失，两项 tsc 的最新输出均为：

```text
src/modules/safe/ui/quick-pick.test-support.ts(27,66): error TS2339: Property 'textContent' does not exist on type 'string | DocumentFragment'.
  Property 'textContent' does not exist on type 'string'.
```

全仓 lint 最近一次输出在以下只读路径：

- src/modules/navigator/ui/diary/DiaryReader.tsx：不必要断言与 ResizeObserver 引起的 unsafe 类型/调用诊断。
- src/modules/navigator/ui/diary/flip-engine.ts：prefer-promise-reject-errors。
- src/modules/navigator/ui/diary/page-flip.mjs：no-unused-expressions 等警告及 no-static-styles-assignment 等错误。
- src/modules/safe/services/safe-service.ts(574,15)：no-unsafe-finally。

这些文件均不在本任务写集，没有擅自修复、忽略、提高阈值或运行 --fix。共享工作区其他 writer 仍在变化，报告保留各轮真实诊断，不把旧错误和新错误混写成同一次检查结果。

### 实际应用 dev Skill 规则

1. 规则 2：app 只静态引入纯 shared 端口，契约只作类型导入，未增加跨模块内部导入；真实 architecture 门禁通过。
2. 规则 3：没有引入新的 React/UI 或模块启动闭包；构建/预算由 Lead 串行验证，未运行禁止构建。
3. 规则 4 与 Obsidian 生命周期参考：每个插件独立创建 owner，register 处理启动回滚，onunload 先停止事件再清理模块；真实 context.lifetime 绑定路径经过模块关闭/重开测试。
4. 规则 8：shared 核心保持无宿主依赖；Obsidian Component 只在 app 原装配中使用，契约类型已有宿主边界不变。
5. 规则 9：实际执行全仓 lint 并如实保留失败；定向 lint 通过，未关闭规则、加忽略或改写写集外文件换绿灯。
6. 规则 10/licensing：沿用第一阶段已核对 MIT 的来源与现有版权头，本阶段无新增外部代码复制或依赖；没有复制 GPL 代码。
7. 规则 11：遵守第二阶段具体授权，仅改两个 app 文件及新增就近装配测试/REPORT；冻结 TASK 和正式 Evidence 不改，不提交、推送或发版。
8. testing 选择表：选真实生产入口接缝，先观察缺字段/卸载后残留回调的 red 再实现；验证真实注册表与模块开关，不以 mock 调用次数代替行为；补清理变异反向验证、第一阶段事件与 T-02 反馈回归、双 tsc、架构/lint。
9. 规则 1、5、6、7、12：不改视图/设置语义/数据格式/产品文案/技能事实，不引入对应额外实现；没有 UI 实现变化，不触发 ui 技能。本 REPORT 为中文。

### 候选快照

```text
f7cb0495339c0c269617607ae0299b7b339a897b4ffbb33da2f5c69ec0dd4058  src/app/main.ts
09529be6cd6a1f5892b4848600083c33dceb9e6607c62980b4551fe38dcb1e9a  src/app/contracts/module.ts
5faeafc48c22efaf91157ca9647aebc91f9987c03d6c2462e40279a477a2abd9  src/app/main-events.dom.test.tsx
```

main.ts 摘要覆盖整个最终文件（含已有 T-02 代码）；本阶段实际增量以前述本地基线差异为准，不把文件全部内容归本票。

### 未执行或未验证

- 全仓 tsc 与 lint：已执行但未通过，待对应只读文件 owner 修复后由 Lead 复跑。
- `pnpm run build`、`pnpm check:bundle`、`pnpm check:notices`、UI runner：未执行，owner Lead。
- `pnpm run build:css`、`pnpm notices`：TASK 禁止，本执行者未运行；main.js/styles.css/生成通知未改，重建留给 Lead。
- 独立双轴审查与正式 Evidence/状态：owner Lead 指派 reviewer 并最终维护，本报告不冒称通过。
- 完整 Obsidian 启动、宿主生命周期与设置 UI：本次仅隔离宿主的生产装配测试，未作真机验收；本票无 UI E2E 要求。

## 问题与下一步

接线代码与相关测试候选可供审查；阻塞是 TASK 要求的全仓门禁尚未退出 0，而修复路径超出本票授权。Lead 需协调 navigator 日记与 safe 文件 owner，优先修复最新 safe/ui/quick-pick.test-support.ts 类型错误并复核 lint 输出，再在稳定输入上执行两项 tsc、全仓 lint、独立双轴审查和专属构建/通知检查。没有等待用户交互，没有接管其他 writer 文件；blocked 表示本阶段验收未闭合，不表示丢弃已完成候选。
