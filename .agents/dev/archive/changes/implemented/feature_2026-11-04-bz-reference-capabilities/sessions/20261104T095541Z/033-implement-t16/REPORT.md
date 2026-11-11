# 任务回报

Session: 20261104T095541Z
Task: 033-implement-t16
Status: blocked

## 聚焦交接

已完成授权写集内的 health 模块、provider/lease 契约、手动只读扫描、分片限并发、取消与错误隔离、脱敏内存报告和新鲜度候选。health 自身 13 项测试通过，含真实 ModuleRegistry 装配、fixture 写 API spy、锁定/禁用、卸载/重开和迟到结果隔离；最终相关回归为 10 文件 / 54 测试，两组类型检查、lint 和指定门禁均通过。仍有真实的范围阻塞：模块标题在启动词典中未登记，启动探针返回键名；补齐启动词典、测试词典入口和模块预算均需要本 TASK 写集外路径。未越界修改，未改 main.ts、TASK 或正式状态/Evidence；请 Lead 补接或扩大相应写集后再冻结独立审查，不将本候选宣称为 Ticket done。

## 产物与验证

### 全部修改/新增文件

修改两个已授权共享文件：

- `src/app/contracts/module.ts`：仅向 ModuleId/MODULE_IDS 加 health，保留前轮 T-03 已有的 DomainEvents/ModuleContext.events 改动。
- `src/app/manifests.ts`：导入并登记 healthManifest。

新增八个业务/测试文件：

- `src/modules/health/api.ts`：HEALTH_SCANNER、HEALTH_PROVIDERS、HEALTH_INVALIDATED，以及 provider/只读 check、权限、分片、进度、报告与状态契约。
- `src/modules/health/core/scanner.ts`：实例作用域扫描编排、选定检查的按需服务租约、并发/预算、AbortSignal、错误隔离、报告脱敏与内存快照。
- `src/modules/health/core/scanner.test.ts`：12 项测试，覆盖零写入、取消、缓存、权限、错误/清理异常、租约撤销、并发、预算、脱敏及迟到结果。
- `src/modules/health/manifest.ts`：桌面/移动均支持，layout-ready 只装配，不扫描；发布 HEALTH_SCANNER，动态导入 module。
- `src/modules/health/module.ts`：绑定设置、收集当前贡献、服务获取、窗口让出、手动扫描/取消命令、T-02 安全反馈、失效事件和卸载清理。
- `src/modules/health/settings.ts`：health 命名空间，默认并发 2、分片 100、每检查上限 10000 项/1000 诊断、新鲜度 5 分钟；模式限制取值范围。
- `src/modules/health/i18n.ts`：16 对 en/zh 键，module 加载时注册；标题/描述仍待移至启动词典，见 B1。
- `src/modules/health/module.test.ts`：真实 ModuleRegistry、SettingsStore、DomainEvents 和内存 Vault 的端到端装配/只读/权限/禁用/重开测试。

另新增本 REPORT。未修改本 TASK、前序报告、正式 Ticket/Map/Goal/Evidence、notifications/api、具体 provider、其他票代码或依赖。未安装、构建、生成 notices、执行 Git 写操作、提交、推送或发版。没有页面、设置页、样式或工作台路由变更；这些属于 T-19。

### 关键决定与下游契约

1. **只读边界：** health 核心没有 App、文件系统或写服务，只接收 provider 元数据和 read-only HealthCheck 租约。permission 必须先于 scan；locked 不触发 scan，也不要求解锁/解密。provider 激活及扫描不得初始化落盘、迁移、修复或发网络请求；T-17 必须逐个用其真实 owner 证明这些约束，本票 fixture 不代替具体 provider 验收。
2. **贡献与按需获取：** HEALTH_PROVIDERS 的值为 `readonly HealthProvider[]`，每个 descriptor 带稳定 id、scope 和所属 owner 的 `ServiceKey<HealthCheck>`。模块只收集 `{activate:false}` 的当前贡献，过滤服务 owner 与贡献模块不一致的项；只为选定且已广告的检查 acquire 服务。显式请求的缺失/禁用 ID 得到 unavailable，不计为 pass；没有检查时报告 skipped、complete=false。
3. **发现范围限制：** 当前 ModuleRegistry 只发布已激活模块的贡献，因此本 API 明示默认扫描“当前广告的检查”，不是宣称扫描所有未加载模块。闲置模块没有 descriptor 时不会为发现它而激活；T-17/T-19 若要求初次扫描自动发现 idle safe 等检查，应由 Lead 明确无副作用元数据装配方式，不能改成 collect({activate:true}) 悄悄启动全部 owner。已激活 safe 的 locked 检查通过 permission 报 locked；从未广告的检查按显式 ID 报 unavailable。
4. **编排：** AsyncIterable 按 slice 提交真实 checked/excluded/total；限制并发、每片数量、每检查总量/片数和诊断数量，每片让出所属窗口。订阅进度给出已结束/总 provider 数与各检查的实际累计数量，未知 total 不伪造完成比例。扫描只在显式 service.scan 或命令触发，拒绝重叠 admission。
5. **失败与取消：** 全局信号、手动取消、卸载和 lease.revoked 都进入实际等待路径。异常降为固定 check-failed，不传播原始错误；单检查失败和清理异常不阻断其他检查。扫描取消后 complete=false，保留已核实进度；等待被取消时观察后续 Promise，迟到结果不能回写报告。提供者仍拥有其后台工作和资源的清理责任，必须响应 signal；编排不能强杀任意不合作的第三方代码。
6. **报告与隐私：** 只保留检查 ID、范围、时间、状态、数量、枚举诊断码和可选 owner 不透明 token；不接受正文、账号名、路径、任意 detail/title/error 字段。reference 仅接受 64 位小写十六进制 token，协议禁止其编码原文或使用未加盐的秘密哈希。异常原文及额外字段的哨兵测试通过，报告/快照是副本，调用者不能改 owner 状态。
7. **新鲜度与生命周期：** 报告只存该 activation 的内存，关闭重开不恢复旧报告。Vault 变化、贡献变化和 HEALTH_INVALIDATED 均保守失效；扫描中失效保留到最终报告；读取快照时按完成时间判断过期，不建立常驻过期计时器。模块清理 Vault/事件/贡献订阅、扫描控制器和让出计时器；命令由 context.commands 管理。
8. **反馈与通知：** 手动命令只在真实内存报告结算后发送终态反馈，失败使用固定双语键，不记录异常原文。详细进度由 HEALTH_SCANNER 的订阅快照提供，T-19 负责页面展示。本票没有向持久 inbox 发送扫描报告，以保持零写入；health 通知/opener 的页面接线留给后续票，未改通知协议。

### AC 对应事实

| AC | 本轮实际验证 |
|---|---|
| AC-601 | 核心与真实模块装配在包含损坏 JSON/YAML、未来版本、缺失文件的内存 fixture 上扫描；挂载 Vault create/process/createFolder、adapter write/writeBinary/mkdir/remove/copy/rename/process 及设置持久化 spy，均无调用，坏文件原始字节保持。fixture check 仅作为 provider 边界验证编排，不声称已实现 T-17 的格式解析器。 |
| AC-602 | 手动/外部取消、卸载、lease 撤销和迟到结果均有断言；取消/预算/覆盖未完不会变成全绿；单 provider 异常及清理异常隔离，其他检查继续完成。 |
| AC-603 | 权限 locked 时不调用 scan；显式缺失/禁用检查报 unavailable；真实 registry 禁用提供者后不扫描、无关 on-demand safe 保持 idle；未调用解密接口。具体 safe provider 的真实容器/解密行为仍由 T-17 验证。 |

### 实际命令与退出码

环境为 README execution-context 指定 current/dev，基线 29644dc5833bb209e6282f84fa71441a5a1b99d4；Node v26.11.1、Vitest v5.0.3。生产与测试类型检查均带 -skipLibCheck，未改第三方声明或阈值。

| 命令 | 退出码 | 实际观察 |
|---|---:|---|
| `pnpm exec vitest run src/modules/health/core/scanner.test.ts` | 126 → 0 | 第一切片红灯为 sections=[]，预期真实检查结果；实现只读流程后 1 项通过。 |
| 同上，取消切片 | 126 → 0 | 红灯为实际 pass、预期 cancelled；接入 cancel 控制器后 2 项通过。 |
| 同上，新鲜度切片 | 126 → 0 | 红灯为 invalidate 后 stale=false；实现失效后 3 项通过。 |
| `pnpm exec vitest run src/modules/health`，目录失败切片 | 126 → 0 | 7/8 通过、目录失败错误落成 skipped；修正为脱敏 error/complete=false 后 8 项通过。 |
| 同上，清理异常切片 | 126 → 0 | provider.return 同步异常原先中断整体；隔离并观察清理结果后最终 2 文件 / 13 项通过。 |
| `pnpm exec vitest run src/modules/health src/app/modules/registry.test.ts` | 0 | 追加卸载等测试后 3 文件 / 22 项通过（之后又增加一项清理异常测试，最终由下行覆盖）。 |
| `pnpm exec vitest run src/modules/health src/app/modules/registry.test.ts src/shared/settings/store.test.ts src/modules/notifications` | 0 | 最终 10 文件 / 54 项通过；较早一次为 53 项，以最终输入为准。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 0 | 最终生产类型检查通过。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 0 | 最终测试类型检查通过。 |
| `pnpm run lint` | 0 | 最终全仓零警告通过；未关闭规则。 |
| `pnpm test:architecture` | 0 | 1306 模块，无边界/宿主/桌面/桶文件/循环违规。其后仅修复同一核心的清理逻辑，没有新增导入或宿主依赖。 |
| `pnpm test:i18n` | 0 | 33 词典 / 5331 键，双语与引用通过；静态门禁不覆盖启动前注册，B1 探针另列。 |
| `pnpm test:workbench-entry` | 0 | 3 项通过，没有新增视图或 ribbon owner。 |
| `pnpm test:safety-regressions` | 0 | 现有安全门禁通过，Node DEP0205 仅为弃用提示。 |
| `git diff --check -- src/app/contracts/module.ts src/app/manifests.ts src/modules/health` | 0 | 共享已跟踪差异无空白问题；新增文件另经类型/lint/测试核对。 |
| `sha256sum .agents/skills/dev/SKILL.md` | 0 | d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e，匹配 required binding。 |
| `node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs --repo /home/wta/projects/obsidian-huhu --scope-root .agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities --session 20261104T095541Z --task 033-implement-t16 --stage dispatch` | 0 | errors/warnings 均为空。 |
| Node stdin，esbuild write:false + VM 启动词典探针（下方 B1） | 126 | 真实未通过：启动 t 返回 health.title/health.description；不是 i18n 已接线成功。 |

实施中真实类型失败及修正：首轮生产 tsc 为 126，Vault.on 的联合事件名无法匹配重载，改成四个明确事件调用；首轮测试 tsc 同为 126，另外指出异构 spy 数组的 push 类型，改为一次构造数组。新增 registry 测试后一次测试 tsc 为 126，指出最小 ModuleContext fixture 需明确经 unknown 转换；仅调整测试边界并最终通过。上述编译失败不计为行为红灯。

### 来源与复用

通过 `gh api repos/yeshimei/bz/contents/<path>?ref=d76a0870329403247917a00c43019e203a2560a4 --jq .content | base64 -d` 实际读取三份固定提交文件，均完成退出 0：

- https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/checkup/run.ts ：采用分阶段只读、逐片让出、取消、逐检查错误隔离和内存缓存思路；没有迁入其修复函数、全局缓存或原始异常文案。
- https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/checkup/files.ts ：核对直读文件避免 repository 默认初始化写入的设计，未复制其路径清单或 reader 实现。
- https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/checkup/checks-orphans.ts ：核对检查与修复分离及循环取消边界，未移植具体检查或包含正文/名称的诊断。

本地 bz-MIT.txt 的版权行为 Copyright (c) 2026 叫我包仔，与 TASK 一致。`core/scanner.ts` 已在文件头保留仓库、完整固定 SHA、上游路径、MIT、原版权和 HUHU 修改说明；其余文件为仓库契约下的新装配/测试，不复制上游源码。请 Lead 将此对应关系汇总至 docs/third-party/bz.md；该路径不在本票写集。没有新增依赖。

### Skill Execution Records

采用 SpecDev I、dev；复用本会话已完整读取且仍适用的 Work、implementation-procedure、execution-preflight、domain-runtime、TDD、错误、测试可靠性与范围合同。完整读取本 TASK/Ticket，复核 Map revision 5、Goal 的本票导航和已读 Spec §6/AC-601–603、ADR-006/CONTEXT；T-05 正式 Evidence 已 passed。dev 重新完整读取并核验绑定摘要，补读 module-authoring、settings-and-i18n、architecture、obsidian-api、testing、licensing 和 research-and-reuse 合同。

1. dev 规则 1：无 UI 页、视图类型、样式或工作台路由变更；T-19 继续拥有页面。
2. 规则 2、8：核心只依赖本模块 API/契约与纯数据，生产跨模块访问仅通过 API/ServiceKey，窗口计时器在模块装配边界；架构门禁通过。
3. 规则 3：manifest/API 只含数据/键，实际扫描只在动态加载的模块内，启用不扫描，不进入启动读库闭包；预算接线缺口 B2 保留。
4. 规则 4：清理 AbortSignal、Vault/领域/贡献订阅和让出计时器，真实 registry 验证关闭、重开、旧服务拒绝以及旧回调不再失效快照；迟到 provider 不回写。
5. 规则 5：使用 context.settings.bind('health', healthSettings)，不新增平铺设置、不调用 saveData、不在扫描时持久化；SettingsStore spy 为零。
6. 规则 6：报告只保存在内存，不新增存储根、不读写插件目录、不迁写坏文件、不借初始化修复数据；写 API spy 与原字节断言均通过。
7. 规则 7：所有新增产品文案有 en/zh，命令使用 t/nameKey，错误反馈使用固定键；B1 据实保留为 blocked，未用模块副作用偷渡启动注册。
8. 规则 9：修复自身重载/fixture 类型问题，最终类型与零警告 lint 通过，没有抑制规则、删测试或提高阈值。
9. 规则 11 与 testing：修改前列出真实影响文件，按行为取得红绿事实及真实 registry/存储边界证据；没有越界、构建或 Git 写入。
10. 许可/复用规则：先读指定固定上游与现有 owner 接口；不迁移不适配的全局路径、修复和敏感文本；文件头署名并返回 Lead 汇总项。

### 最终交付快照

| 路径 | SHA-256 |
|---|---|
| src/app/contracts/module.ts | 48a26a9bac15fb2ce5d7bd1f15028625577d1d420b3fb8fb35d1ec81d12348f6 |
| src/app/manifests.ts | f48baadaac00eb80de65be91bc1ce04349a9ad8705e50ade9357dcc2ab350891 |
| src/modules/health/api.ts | b3843db5c7e961eef3f41487c482b0ccf7884c6cbd988056175338ea003f1d9e |
| src/modules/health/manifest.ts | 46303a09e0423696db0faccd1b4090ecd43286e02812af20b5b2d10d94710350 |
| src/modules/health/module.ts | 7ceef2ff7422be71e5cee3b497079a2fecbce498d3609f79b4130992193f5ce3 |
| src/modules/health/settings.ts | 95ddc7ebe8e60e3c176309e2f83d2513785884eaea79165c82b9a2abbb40f567 |
| src/modules/health/i18n.ts | 7194f5ff71f7e472ad8abeece8cf0373f2de979e97d8bcddf547732124545d3b |
| src/modules/health/core/scanner.ts | 629179d2323b317e3c60a029fc72e444c8d8adf2c78caa21d4231b2796aa6c4b |
| src/modules/health/core/scanner.test.ts | 5942f0834fa0aef041cc14df75bda1c56b89674685a73ab657a52a5a540d1ff4 |
| src/modules/health/module.test.ts | a1929b374faa225a303abaa7811c5ed28da589e2ac4de997e7533f432abd5464 |

main.ts 未修改，开始及结束均为 ba79fcd6c216e1c9bf7a612040fc9578c099f75abebf61a115bb301df41c15e4。Git 显示其 dirty 是此前冻结候选，不归本轮；没有 main.ts 接线片段需求。

### 未执行或未验证

- build、build:css、notices：未执行，owner Lead，TASK 禁止改写产物。
- check:bundle、check:notices、UI runner：未执行，owner Lead。
- 独立双轴审查、正式 Evidence/Ticket 状态：owner Lead / 另一 reviewer。
- T-17 的实际 archives/periodic/safe provider、真实解密与容器检查、T-18 修复、T-19 页面/通知：未实现，属于后续票。
- 原生 Obsidian、移动端、宿主内表现：待用户验收；测试边界不代替真机。
- 未运行全仓 pnpm test；实际验证范围如命令表。

## 问题与下一步

### B1 — 启动词典接线越出写集（已复现）

dev 入口 `.agents/skills/dev/SKILL.md` 的“添加模块/文案”分支要求读取 module-authoring 和 settings-and-i18n；后者明确要求：“如果启动代码读取的键放在模块词典里，把它移到启动词典（否则模块加载前启动代码会显示键本身）。”真实消费者是 `src/app/settings/react/GeneralSettings.tsx` 的 `t(manifest.titleKey/descriptionKey)`。health 被关闭或尚未 layout-ready 时模块词典尚未注册，因此当前会显示 health.title/health.description 键名；不能用静态 test:i18n 通过掩盖这个缺陷。

实际无写入探针：Node stdin 使用 esbuild `{bundle:true,write:false}` 打包 shared/i18n/runtime，VM 中 setLanguage('en') 后读取两键并断言不是键名，输出 `{"title":"health.title","description":"health.description"}`，随后断言失败、退出 126。没有把探针文件写入仓库。

最小接线由 Lead 在 `src/shared/i18n/huhu.ts`（或合适启动词典）登记下列键，并同步移除模块词典中的重复标题/描述；该路径不在本 TASK 写集，执行者未改：

```text
en: health.title = Data health
en: health.description = Read-only data checks and diagnostic reports.
zh: health.title = 数据体检
zh: health.description = 只读检查数据并生成诊断报告。
```

### B2 — 新模块测试词典与预算登记需要 Lead

`.agents/skills/dev/references/module-authoring.md` 的“添加模块”步骤 5/7 要求：把 i18n 加入 `scripts/module-strings.ts`，并在 `scripts/bundle-budget.json` 的 moduleActivationBytes 登记新模块。这两个路径同样只读。当前 health 测试经真实 manifest.load 注册了词典，test:i18n 也自动扫描新词典，所以这些通过结果不能证明公共测试词典入口已补；包体检查尚未执行，缺省没有 health 预算不能冒充预算通过。

Lead 应补入 `messages as health` 的测试注册，并在串行构建实测后为 health 设定有依据的激活预算，不猜阈值、不提高旧预算换绿灯。来源登记 docs/third-party/bz.md 也请由 Lead 汇总上述精确对应；稳定模块目录事实由其文档 owner 随集成更新。

恢复条件：Lead 完成上述最小接线，或通过新 TASK 授权相应路径；随后复跑启动词典探针和受影响门禁、冻结本候选并独立双轴审查，再执行共享构建。核心与模块装配可供审查，但本轮因 B1/B2 以 blocked 交回，不等待交互、不擅自扩大写集。
