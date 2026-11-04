# 任务回报

Session: 20261104T095541Z
Task: 047-repair-t08
Status: completed

## 聚焦交接

已按 045-review-t08 的 B1/B2/B3 完成修复，各有实际红绿验证。安装时发布默认记录模板，使真实通用页面的新建流程能直接保存 active 归物；生命周期追加保留完整旧行及用户扩展列；物品与历史状态使用独立双语标签。保留专用 transition、预期哈希、幂等、三方合并及用户定义不覆盖的保护。候选已完成本票非构建验证，正式独立复审、Evidence 与票据状态仍由 Lead 处理。

## 产物与验证

### 实际修改与新增文件

修改：

- `src/modules/archives/core/belongings/preset.ts`：设置 defaultTemplateId；定义使用领域初始化器生成默认值的 BELONGING_TEMPLATE；主状态和历史状态列改用 belongingStatus 标签。
- `src/modules/archives/services/generic/belongings.ts`：通过原 DefinitionCommands 发布缺失默认模板，仍跳过已有修订。
- `src/modules/archives/core/belongings/lifecycle.ts`：验证已知字段后深拷贝完整历史行，不再裁剪为固定列后持久化。
- `src/modules/archives/core/belongings/model.ts`：历史 values 类型允许扩展列，sale 按实际 schema 为可选字段。
- `src/modules/archives/core/belongings/statistics.ts`：历史行缺省 sale 时按未知回收处理，持久历史不补写 null。
- `src/modules/archives/core/schema/labels.ts`：注册归物专用 belongingStatus 标签。
- `src/modules/archives/i18n.ts`：新增 `archives.preset.belongingStatus` 的 en='Status'、zh='状态'，不改变任职关系原文案。
- `src/modules/archives/services/generic/belongings.test.ts`：新增自定义历史列/缺省 sale 在修订与返库后完整保留，以及用户默认模板不被重新安装覆盖的回归。

新增：

- `src/modules/archives/services/generic/belongings.dom.test.tsx`：真实 ArchivePage → RecordEditor → commands.create 创建 active 归物；实际已发布默认表单的主状态与历史状态列 en/zh 标签和只读断言。外部存储边界复用 memoryArchives，业务组件、定义发布、实体命令、序列化及统计均为真实实现。

以上 9 文件为本次修复写集；其他 dirty 文件保留原样。未修改 TASK、旧 REPORT、正式 Evidence/Ticket/Map/Goal、通用 UI、api.ts、main.ts、来源登记、构建产物或依赖，未执行 Git 写操作。

### 修复决定与观察

- B1 / AC-301：采用现有记录模板接缝，避免修改写集外的编辑器。默认模板由 initialBelongingValues({}) 产生 using/空出离日/null 售价/空历史；通用页面按 type.defaultTemplateId 读取默认值，因此在 RecordEditor 前置 validateValues 前已有必填状态。模板通过原定义发布流程安装，已有模板仍不覆盖。新增测试从页面点击 New archive，填写名称并点击 Save as active，等待真实提交和导航，然后通过公开查询确认一条 using 物品。服务端仍拒绝伪造状态，默认表单仍只读生命周期字段。
- B2 / AC-302、AC-313：解析器继续严格校验已知状态、日期、金额、指纹与投影；校验后保留完整旧行副本，追加命令只新增事件。类型契约反映合法自定义列和可省略的 sale，计算层用 `sale ?? null` 表达未知，避免为计算方便改变持久历史。服务测试真实发布带 customNote 的 schema，转卖后外部写入合法扩展值并省略可选 sale，再依次修订出离日期与返库；断言旧行深相等、历史长度递增、公开查询仍含 USER-HISTORY-NOTE。
- B3：归物主状态与历史状态列同时使用 belongingStatus；原 `archives.preset.status` 仍为 Employment status/任职状态。真实 ValueForm 在 en 和 zh 下各渲染两个正确命名、禁用的状态控件，并确认没有任职文案。
- 没有改变物品 Markdown 版本、统计金额算法、事件端口或未知列的 schema 校验规则；没有关闭任何检查或放宽断言。

### 红绿事实

| 切片 | 实际命令 | Red | Green |
| --- | --- | --- | --- |
| B1 | `pnpm exec vitest run --project dom src/modules/archives/services/generic/belongings.dom.test.tsx`（当时仅 B1 一项） | 126：类型 count=0，期望 1；页面实际报 required-field · Status · status | 0：默认模板发布后 1 项通过，实际创建 using 物品 |
| B2 | `pnpm exec vitest run src/modules/archives/services/generic/belongings.test.ts -t 'exit correction and return'` | 126：旧行 customNote 丢失，同时缺省 sale 被补写 null | 0：修订及返库后旧行完整保留，1 项通过 |
| B3 | `pnpm exec vitest run --project dom src/modules/archives/services/generic/belongings.dom.test.tsx -t 'status labels'` | 126：en/zh 两项正确名称的状态控件均为 0，期望 2 | 0：主状态/历史状态 en/zh 两项通过 |

如实记录准备和中间失败：B1 初次测试误读不存在的 catalog.entities，改用实际 CatalogType.count 后重新得到上表有效红灯。B3 起初将外层必填星号当作 combobox 名称的一部分，修改定位器后曾暂时恢复两处旧 labelKey，取得上表有效红灯，再恢复修复并转绿；未改词典原任职键、未弱化行为断言。B2 首次完整类型检查因 Record<string, unknown> 直接断言 BelongingEvent 而退出 126，改为保留完整行且明确已校验 rowId/values 的结构后两套类型均通过。中间整组回归因上述 B3 定位器失败退出 126；最终重跑通过。早期创建测试过早清理造成一次草稿清理 unavailable 警告，新增等待提交后导航完成后最终整组运行无该警告。

### 最终检查

环境：/home/wta/projects/obsidian-huhu，共享 change 工作区，branch dev；复用 TASK 指定基线及 Lead 已核验的执行上下文。

| 命令 | 退出码 | 实际结果 |
| --- | --- | --- |
| `pnpm exec vitest run src/modules/archives test/golden/archives-v2.test.ts test/golden/archive-relation.test.ts src/app/main-events.dom.test.tsx src/host/obsidian/feedback.dom.test.tsx` | 0 | 16 文件、97 项通过，含新增 DOM/服务及既有并发、统计、编辑、恢复、事件回归 |
| `pnpm exec vitest run src/modules/archives/core test/golden/archives-v2.test.ts` | 0 | 5 文件、28 项通过，含统计纯函数及两项黄金测试 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 0 | 生产类型检查通过 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 0 | 测试类型检查通过 |
| `pnpm run lint` | 0 | 最终全库零警告 |
| `pnpm test:architecture` | 0 | 1318 模块，无分区、宿主包、桌面边界、barrel 或循环违规 |
| `node --input-type=module` 执行下述原 i18n 脚本的内存等价检查 | 0 | 33 词典、5350 键，en/zh 键、占位符和引用匹配 |
| `git diff --check -- src/modules/archives/core src/modules/archives/services src/modules/archives/i18n.ts` | 0 | 无空白错误 |

未直接运行会写 scripts/tmp 的 test:i18n；实际内存等价检查保留原脚本全部断言，执行体如下：

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

黄金样本：没有执行 -u，没有修改 golden 测试或快照；两项格式回归保持原字节通过。新增默认模板为定义发布产物，不修改既有记录格式。

### dev Skill 实际应用记录

- 分区/模块边界：默认值及历史保留在 core，模板发布在 services；不改跨模块入口，不引入宿主依赖；架构门禁通过。
- 懒加载：未给 api.ts/启动代码添加实现导入，修复沿既有归物与档案模块闭包加载。
- 持久化/数据归属：继续使用同一档案主记录、现有定义发布及 vault/process 写入；校验与保存保留扩展列和可选值的存在语义，无新增数据根或迁移协议。
- 生命周期：不新增生产监听器或计时器；DOM 测试清理 React/语言状态和 runtime，并等待真实创建流程结束。
- i18n：归物词典新增专用 en/zh 键并注册合法标签，保持任职关系词义；既有 t()/displayLabel 渲染链由双语 DOM 断言覆盖。
- 测试规则：各 finding 先取得目标行为失败再修复；使用真实公共命令、页面与序列化，不 mock 自有业务，不删旧断言；运行核心、服务、DOM、黄金样本、类型及零警告门禁。
- 来源/许可证：未新增外部复制或改编；保留先前模型与统计文件的固定 bz SHA/MIT/版权及修改说明，不碰 Lead 的 docs/third-party/bz.md。本次为 HUHU 本地协议兼容修复，无新增来源登记条目。
- 范围/构建：只写指定 9 文件和本 REPORT；禁止的 Git、构建、生成、依赖安装及正式状态写入均未执行。无 UI 实现/样式修改，DOM 仅验证预设对既有界面的功能影响。

### 未执行或未验证

- `pnpm run build`、`pnpm check:bundle`、`pnpm check:notices`、UI runner：未执行，owner Lead；未执行 build:css/notices。
- 真实 Obsidian、移动端、全仓 pnpm test、规模验收：未执行；本修复不声明这些边界已通过。
- 独立双轴复审、来源冻结与正式 Evidence/Ticket 更新：owner Lead。本次不将前 reviewer 的来源冻结漂移作为修复阻塞，也未修改来源文件。

## 问题与下一步

无阻塞问题。Lead 可冻结本轮候选及当前来源登记，针对 B1/B2/B3 重新独立审查，并执行统一构建、预算与许可门禁后维护正式状态。completed 仅表示修复候选交回。
