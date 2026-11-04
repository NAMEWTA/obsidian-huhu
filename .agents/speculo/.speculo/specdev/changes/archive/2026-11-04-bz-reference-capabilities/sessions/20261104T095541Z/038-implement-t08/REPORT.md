# 任务回报

Session: 20261104T095541Z
Task: 038-implement-t08
Status: completed

## 聚焦交接

已实现 T-08 候选：归物预设发布、同实体生命周期 table、哈希保护与 operationId 幂等迁移、纯十进制统计及历史回放、公共查询/命令和归物变更事件。复用档案定义发布、实体 save 三方合并与原子 process 写入，没有新增独立归物存储。生命周期四个投影字段只允许专门迁移命令修改，通用编辑及升级路径保留这一不变量。适用非构建检查最终通过；completed 仅表示候选交回，正式 Evidence、双轴独立审查及票据状态由 Lead 处理。

## 产物与验证

### 本任务实际新增/修改的全部文件

新增：

- `src/modules/archives/core/belongings/model.ts`：公共领域类型、明确的未知值与币种统计契约。
- `src/modules/archives/core/belongings/decimal.ts`：BigInt 十进制加减和六位小数日均舍入。
- `src/modules/archives/core/belongings/statistics.ts`：有效持有周期、已实现回收、币种分栏和月末事件回放。
- `src/modules/archives/core/belongings/statistics.test.ts`：精度、未知/零、跨年、负值、未知购入价的回收分栏。
- `src/modules/archives/core/belongings/lifecycle.ts`：初始值、历史/投影校验及追加式状态迁移。
- `src/modules/archives/core/belongings/lifecycle.test.ts`：首次离场、日期修订、返库、非法日期/币种及周期边界。
- `src/modules/archives/core/belongings/preset.ts`：物品类型及带稳定 rowId 的生命周期表字段。
- `src/modules/archives/services/generic/belongings.ts`：显式安装、查询和迁移服务。
- `src/modules/archives/services/generic/belongings.test.ts`：真实内存档案端口上的 9 项服务测试。
- `test/golden/__snapshots__/archives-v2.test.ts.snap`：新增归物 Markdown 格式样本。

修改：

- `src/modules/archives/api.ts`：归物类型、命令/查询接口、类型 ID、`BELONGINGS_CHANGED` 键。
- `src/modules/archives/core/schema/labels.ts`：归物预设标签注册。
- `src/modules/archives/core/schema/presets.ts`：导出预设；归物默认表单的生命周期字段只读。
- `src/modules/archives/i18n.ts`：归物所需 19 对 en/zh 标签；保留已有 `archives.saveFailed` 等其他任务内容。
- `src/modules/archives/services/generic/application.ts`：在现有公共服务上接入归物查询/命令。
- `src/modules/archives/services/generic/entities.ts`：初始状态校验、专用 transition、排队内重复检查、严格预期哈希与通用编辑保护。
- `src/modules/archives/services/generic/recovery.ts`：升级不能绕过生命周期迁移命令，升级后仍校验投影。
- `src/modules/archives/services/generic/file-changes.ts`：在 T-04 已有提交订阅上追加归物 ID/hash 事件发布。
- `test/golden/archives-v2.test.ts`：追加归物读写回环与快照断言，未修改既有样本断言。

以上代码均留在共享工作副本。未执行 Git 写操作；未修改 TASK、Ticket、正式 Evidence、main.ts、module.ts、UI 或构建产物。`runtime.ts`、其他 archives UI/测试及仓库其他 dirty 文件来自先前任务或其他执行者，不计入本任务修改清单。

### 关键决定与验收对应

- AC-301：安装显式调用 `commands.belongings.install()`，经 DefinitionCommands 发布缺失定义及默认表单；不加入旧初始化预设列表、不覆盖现有定义/表单。用户修改定义的安装测试验证零覆盖写入。查询返回图片、规格、备注、凭证及人物/企业 ID 等字段；这些数据仍由通用档案格式承载。
- AC-302：四态使用稳定英文 ID；首次离场日期默认当地今天，可显式指定；离场态互换保留出离日期与已知回收，返库追加记录并开始新持有周期。修改离场日期追加修订事件，不重写旧行。有效事件日 `date` 与持有截止日 `exitDate` 分开，校验事件顺序及当前周期边界。
- AC-303：operationId 同时为稳定 rowId；事件携带命令指纹。相同请求并发重试在命令队列内再次检查，至多追加一次；同 ID 不同负载拒绝；过期哈希及 read/process 之间外部改写拒绝，不覆盖新内容。
- AC-304：金额不转换成浮点 Number，不同币种无跨币种总额。未知售价使净成本/日均未知，0 售价为已知值；月精度或未知购入日不输出精确天数；零天与负值显式标注。日均按净成本除有效持有日、六位小数四舍五入（中点远离零）。购入价未知时仍保留已知回收的币种分栏，并以 unknownPurchases 标示净成本未知。
- AC-305：每个月末独立重放有效事件，忽略今天的状态投影。测试覆盖 2025 年转卖、2026 年返库后重算去年趋势，回收不会重复累计。
- AC-313：通用 save 仍使用原三方合并；未变更的生命周期字段从 dirtyFields 排除，独立分类修改保留新生命周期行，原始未知 YAML 与自由 Markdown 字节保留；同字段竞争仍报 field-conflict。创建、通用 save 和定义升级不能伪造生命周期投影。
- 领域事件沿已有 `bindArchiveFileChanges(runtime, context.events, context.lifetime)` 接缝，在本地真实提交后发出 ID/hash 失效事件；失败不发布。未引入全局事件实例或额外监听资源。

### 实际应用的 dev Skill 规则

- 分区与导入：统计/状态变换在 core，I/O 和排队在 services；公共契约经 archives/api.ts，事件端口来自 shared；架构门禁验证通过。
- 懒加载：api.ts 只增加类型与键/常量，不静态加载归物实现；归物服务随既有 ArchivesApplication 加载。
- 生命周期：复用 T-04 的 lifetime 管理提交订阅与事件端口，未新建全局监听器；事件测试显式清理订阅并 dispose。
- 数据归属：物品及历史仍在同一可见档案实体，走已有 vault/process、定义修订、校验及三方合并；没有新增 JSON 数据库、设置根或自动记账。
- i18n：新增预设和状态标签同时提供 en/zh，使用既有 displayLabel/t() 和受限标签注册机制；未向启动词典添加业务文案。
- 宿主边界：新增 core 纯函数不导入 Obsidian、Node 或 Electron；沿已有服务端口复用宿主操作。
- 质量验证：按 testing.md 选择核心、服务、黄金样本与受影响 DOM/事件回归，执行类型、lint、架构、词典门禁；未降低断言或阈值。新行为先以统计/生命周期/安装空实现和并发重试等测试得到红色结果，再逐步实现转绿；已知回收在未知购入价下丢失也经红绿回归修复。
- 外部许可：固定 bz 提交，只借鉴业务模型/计算理念，改为档案 table 与精确金额；在改编文件头记录上游、提交、路径、版权与修改说明。未安装依赖或改写 GPL 代码。
- 范围与产物：只编辑授权写集；用户禁止的构建、Git 写、状态归档均未执行。构建及发行声明集成交给 Lead。

### 验证命令与实际结果

最终结果（Linux，共享 change 工作区）：

| 命令 | 退出码 | 结果 |
| --- | --- | --- |
| `pnpm exec vitest run src/modules/archives/core` | 0 | 4 文件、26 测试通过 |
| `pnpm exec vitest run test/golden/archives-v2.test.ts` | 0 | 1 文件、2 测试通过 |
| `pnpm exec vitest run src/modules/archives/core src/modules/archives/services/generic/belongings.test.ts test/golden/archives-v2.test.ts` | 0 | 6 文件、37 测试通过 |
| `pnpm exec vitest run src/modules/archives/services/generic/belongings.test.ts` | 0 | 9 项服务测试通过 |
| `pnpm exec vitest run src/modules/archives test/golden/archives-v2.test.ts test/golden/archive-relation.test.ts src/app/main-events.dom.test.tsx src/host/obsidian/feedback.dom.test.tsx` | 0 | 最终 15 文件、92 测试通过 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 0 | 生产类型检查通过 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 0 | 测试类型检查通过 |
| `pnpm run lint` | 0 | 最终全库零警告通过 |
| `pnpm test:architecture` | 0 | 1316 模块，无分区/宿主/桌面/循环等违规 |
| `node --input-type=module` 执行下述 i18n 等价检查 | 0 | 33 词典、5350 键，语言键、占位符和字面引用通过 |
| `git diff --check -- src/modules/archives/core src/modules/archives/services src/modules/archives/api.ts src/modules/archives/i18n.ts test/golden/archives-v2.test.ts` | 0 | 无空白错误 |

为遵守写集，未直接运行会写 `scripts/tmp/i18n-dictionaries.cjs` 的 test:i18n；使用原脚本、只将打包结果保留内存的等价命令：

```js
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
let code = fs.readFileSync('scripts/verify-i18n.mjs', 'utf8');
code = code.replace('import.meta.url', JSON.stringify(pathToFileURL(process.cwd() + '/scripts/verify-i18n.mjs').href));
for (const name of ['esbuild', 'typescript']) code = code.replace("'" + name + "'", JSON.stringify(import.meta.resolve(name)));
code = code.replace('await build({ stdin:', 'const bundle = await build({ write: false, stdin:');
code = code.replace('const modules = require(outfile);', 'const modules = (() => { const module = { exports: {} }; new Function("exports", "require", "module", bundle.outputFiles[0].text)(module.exports, require, module); return module.exports; })();');
await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
```

过程中非最终结果如实记录：统计/生命周期/预设空实现、并发重复写及未知购入价回收测试曾退出 126（红色），实现后已转绿；新增测试曾误写 merge-conflict 和 DefinitionPublication.revisionId，改为既有 field-conflict 与 revision.revisionId 后通过。首次类型/lint 检查发现 recovery.ts 缺失 equal 导入，修复后通过。一次全库 lint 在并行修改的 DiaryReader.tsx 第 63 行报 3 个错误（126），本执行者未修改该越界文件，最终重跑全库已为 0。一次定向 eslint 把默认忽略的黄金测试文件显式传入而产生 ignored-file 警告（126），未改规则，最终使用标准全库 lint 得到 0。首次内存 i18n 执行未解析 data URL 的裸包导入（126），补为绝对模块 URL 后等价门禁为 0。

黄金样本更新命令 `pnpm exec vitest run src/modules/archives/core/belongings src/modules/archives/services/generic/belongings.test.ts test/golden/archives-v2.test.ts -u` 用于生成新增快照；最终无 `-u` 的格式门禁已通过。差异仅新增归物样本：金额字符串 `12345678901234567890.0100`、0 售价 `0.00`、月精度购入日、嵌套生命周期 rowId/金额/命令指纹。原有税务 inline snapshot 未变，没有格式版本升级或旧样本重写。

### 上游来源与署名交接

固定源：https://github.com/yeshimei/bz/tree/d76a0870329403247917a00c43019e203a2560a4 。实际只读检视 `src/belongings/types.ts`、`src/belongings/shared.ts`、`src/belongings/report.ts`，许可 MIT，原版权 `Copyright (c) 2026 叫我包仔`。

- `core/belongings/model.ts` 文件头：types.ts/shared.ts 的业务模型改编；HUHU 改为档案实体、稳定状态 ID、table 历史与十进制币种列。
- `core/belongings/statistics.ts` 文件头：shared.ts/report.ts 的业务计算理念改编；HUHU 重新实现精确十进制、未知值、持有周期与事件回放，未复制浮点、币种符号或 DOM 报告实现。
- Lead 请将上述两个条目汇总到 `docs/third-party/bz.md`（本任务不拥有该文件）。

### 未执行及边界

- `pnpm run build`、`pnpm check:bundle`、`pnpm check:notices`、UI runner：未执行，owner Lead。未执行 build:css/notices 写操作。
- 双轴独立审查、正式 Evidence/Ticket 更新：owner Lead；本报告不代替正式验收。
- 本票无 UI，不声明真实 Obsidian 或年度报告界面验收；后续界面票使用本票公开命令/查询与纯统计接缝。
- 无新增规模策略或依赖，未重跑已知基线失败的 archives-v2-scale；本票适用核心/服务/格式验收均已通过。

## 问题与下一步

无阻塞问题。Lead 可对当前候选运行独立审查、统一构建/预算/许可检查并补齐署名集成；随后按正式验收合同维护 Evidence 与状态。
