# 任务回报

Session: 20261104T095541Z
Task: 034-repair-t04
Status: blocked

## 聚焦交接

D1、D2 的最小修复与新增回归均已完成并先红后绿。最终 78 项相关测试、生产/测试类型检查、全仓 lint、架构门禁与 10 项工作台生命周期检查均通过；main.ts 未修改。仍保留 026/030 已确认的规模完整性基线失败为待验收，因此按 blocked 交回整票候选，不宣称 T-04 done；本轮修复本身没有新增失败或写集阻塞。Lead 可直接冻结修复候选复审，并继续按原 owner 处理规模与正式 Evidence/状态。

## 产物与验证

### 全部修改文件

- `src/host/obsidian/file-changes.ts`：合并键从 kind/path/oldPath 扩展为 kind/path/oldPath/folder，防止同路径文件删除覆盖目录删除。
- `src/modules/archives/services/generic/file-changes.ts`：目录 rename 与目录 invalidate 一样先失效新路径范围，再按现行 Markdown 发现规则补读；利用既有 runtime.fileDeleted(prefix,true) 的文件依赖前缀失效，同时更新非 Markdown 附件引用者。
- `src/modules/archives/services/generic/file-changes.test.ts`：追加 D1 的完整链路回归和 D2 的库内/库外两项参数化回归，共新增 3 项用例，原有 10 项保留。
- 本 `REPORT.md`，按 Return 一次性写入并回读。

未修改 main.ts、archives/module.ts、runtime.ts、host 原测试、contracts、其他模块文件、来源文档、TASK 或正式 Evidence/状态；没有 Git 写操作、依赖安装/升级、生成产物、提交、推送或发布。保留所有其他 dirty 内容。

### 依据、范围与决定

完整读取本 TASK、030-review-t04 REPORT、当前事件适配/绑定/测试与 dev Skill，回读 runtime 的依赖表与路径处理、定义/实体发布命令、MemoryArchiveFiles 和 Map 修订。复用本会话已读且未变化的 SpecDev 实现/预检/TDD/错误/可靠测试与 dev architecture/testing/licensing 合同。Map 仍为 plan_revision 5；工作区沿用 current/dev 与 README execution-context，基线 29644dc5833bb209e6282f84fa71441a5a1b99d4。

实施前影响范围为上述 host 合并逻辑、archives 绑定与服务测试；只读核对 main、module、runtime 和 schema 命令。实际生产修改各一行，未为了修复做无关重构或修改 T-16 并行涉及的共享入口。

- D1：保留文件系统身份而非扩大队列。相同类型的重复事件仍按原方式合并，目录与文件分别计入容量；最大等待、容量限制、overflow rescan 和顺序策略不变。
- D2：新目录范围也走既有失效机制，先触发其 fileDependents，再清理陈旧索引范围并发现当前 Markdown。旧目录失效仍保留；不新增二进制解析，不改变数据格式或定义发布协议。
- 沿用已核对的 bz 固定来源与当前文件头，未新增第三方源码复制。host 文件原有仓库、SHA d76a0870329403247917a00c43019e203a2560a4、src/core/obsidian-adapter.ts、MIT、`Copyright (c) 2026 叫我包仔` 与 HUHU 修改说明保留。若 Lead 更新原来源条目，可补充“目录/文件身份参与合并、新目录前缀也失效附件依赖”；本轮不改 bz.md/NOTICE。

### D1 红绿事实

新回归使用真实 EntityCommands 建立已索引实体，关闭测试端口的直接 runtime 回调，经真实 FileChanges → DomainEvents → binding → ArchiveRuntime 执行：

```text
delete(TFolder(parent)) → create(TFile(parent)) → delete(TFile(parent))
```

三事件在同一批次，底层实体已实际从 MemoryArchiveFiles 删除。断言实体不再索引，并断言批次同时保留 folder=true 与 folder=false 的两条 delete。

- Red：`pnpm exec vitest run src/modules/archives/services/generic/file-changes.test.ts -t 'directory deletion survives'`，退出 126。真实索引仍含已删除 person-a，toBeUndefined 失败；不是夹具/编译问题。
- Green：修复合并键后，`pnpm exec vitest run src/host/obsidian/file-changes src/modules/archives/services/generic/file-changes.test.ts`，退出 0，16/16 通过。

### D2 红绿事实

新回归通过真实 DefinitionCommands 发布带 file 字段的类型、真实 EntityCommands 创建分别引用 old/image.png 与 new/image.png 的两个档案。开始时 old 存在、新路径缺失，先断言旧引用无 missing-file、新引用有 missing-file。移动二进制测试文件后只发送一个目录 rename，不补子文件事件。

参数化覆盖 `huhu/archives/assets` 与 `outside/assets` 两个前缀。最终断言旧引用变为 missing-file，新引用的 missing-file 消失，且 image.png 没有进入档案解析索引。

- Red：`pnpm exec vitest run src/modules/archives/services/generic/file-changes.test.ts -t 'directory rename invalidates old and new'`，退出 126。库内、库外两项都在新引用诊断仍为 true 的行为断言失败；旧引用诊断已正确变化，证明缺口确在新范围失效。
- Green：新目录范围也失效后，完整相关回归退出 0，78/78 通过，包含这两项案例。

所有新增预期来自目录/附件实际状态与审查反例；没有删弱原断言、补发事件制造绿灯、提高阈值或永久跳过。测试替身仅为宿主事件源/文件 IO，事件适配、业务发布、解析索引和命令链真实运行。

### 实际命令与退出码

| 命令 | 退出码 | 观察 |
|---|---|---|
| D1 定向 Vitest（上文） | 126 | 修复前目标断言 red |
| D1 后 host+service 定向 Vitest（上文） | 0 | 16/16 green |
| D2 定向 Vitest（上文） | 126 | 修复前库内/库外两个目标断言 red |
| `pnpm exec vitest run src/host/obsidian/file-changes src/modules/archives test/golden/archives-v2.test.ts test/golden/archive-relation.test.ts src/app/main-events.dom.test.tsx src/host/obsidian/feedback.dom.test.tsx` | 0 | 最终 13 文件、78/78 通过；服务测试由 10 增至 13，其余既有用例保持 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 0 | 生产类型通过 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 0 | 测试类型通过 |
| `pnpm test:architecture` | 0 | 1300 模块，无分区/宿主包/桌面边界/桶导入/循环违规 |
| `pnpm run lint` | 0 | 全仓零警告通过 |
| `git diff --check` | 0 | 已跟踪工作区空白检查通过，不将其他人的内容归本票 |
| `git diff --no-index --check /dev/null src/modules/archives/services/generic/file-changes.test.ts` | 0 | 整个未跟踪测试文件空白检查通过 |
| 下述内存生命周期脚本 | 0 | 同一原入口的 10/10 node:test 场景通过 |
| `sha256sum` 本轮三文件及 main/module/runtime | 0 | 候选与未改范围摘要如下 |

`pnpm test:workbench-lifecycle` 的包装会写 scripts/tmp，故按原脚本/参数内存编译执行，不写仓库外集文件。实际命令为 `node --input-type=module` heredoc，内容：

```js
import { build } from 'esbuild';
import Module from 'node:module';
const result = await build({entryPoints:['scripts/verify-workbench-lifecycle.ts'],bundle:true,platform:'node',format:'cjs',write:false,logLevel:'warning'});
const entry = new Module('/tmp/huhu-t04-lifecycle-memory.cjs');
entry.filename = '/tmp/huhu-t04-lifecycle-memory.cjs';
entry.paths = Module._nodeModulePaths(process.cwd());
entry._compile(result.outputFiles[0].text, entry.filename);
```

该文件名只是内存模块 locator，没有落盘；没有改 node:test 断言或跳过条件。

### 规模基线与未验证项

- `accept:archives-v2-scale`：本轮未重复运行。026 已实际取得候选失败与仅替换为 HEAD runtime 的同断言失败对照；030 又记录 Lead 在未修改 HEAD 干净副本确认相同 first.isComplete 失败，接受为现有基线。此次只改 host 事件合并与绑定，规模脚本、runtime、index 与规模入口的输入闭包未变化，复用该未通过证据，保留规模待验收；不宣称完整性能无退化。
- 两个修复反例独立于规模基线，本轮已用实际红绿证明修正。上述已通过检查不替代完整规模验收，因此整票仍以 blocked/待验收交回，而不将已知规模问题归因于修复。
- `pnpm run build`、`pnpm check:bundle`、`pnpm check:notices`、UI runner：未执行，owner Lead。
- `pnpm run build:css`、`pnpm notices`：TASK 禁止，未运行；main.js/styles.css/生成通知未修改。
- 双轴独立复审、来源映射维护、正式 Evidence/状态：由 Lead 指派/维护，不冒称两轴 pass 或票据 done。
- 真实 Obsidian 同步仍按原 Spec 为用户验收；内存事件/文件 IO 不冒充真机。

### dev Skill 实际应用

1. 规则 2：修复留在 host 与 archives/services，沿既有公共事件边界通信，无新跨模块内部导入；架构门禁实际通过。
2. 规则 3：无启动导入或模块懒加载变化，main.ts 不动；预算与构建留给 Lead。
3. 规则 4：保持原有 listener/timer/lifetime/dispose 语义，现有卸载、晚到读取与代际回归全部保留并通过；未为两项路径问题引入新的异步资源。
4. 规则 6：仅重算失效索引与依赖诊断，仍由原命令写数据；无持久格式、目录或恢复协议变化，黄金样本通过。
5. 规则 8：无新增生产 Node/Electron/DOM 依赖，宿主替身仅在测试边界。
6. 规则 9：实际执行全仓 lint 零警告通过，未加忽略、关规则、--fix 他人文件或提高阈值。
7. 规则 10/licensing：既有 MIT 固定来源头与原版权保留，本轮没有新增第三方复制或依赖，不改只读来源登记。
8. 规则 11：仅写两个实现文件、就近服务测试和自己的 REPORT，不动并行共享 main、TASK、正式 Evidence/状态或其他 dirty 文件，不执行 Git 写操作/安装/提交/推送/发布；报告中文。
9. testing/TDD：D1 与 D2 各自先红后绿，真实 adapter/事件端口/索引与定义/实体命令参与；运行完整相关回归、双 tsc、lint/架构、生命周期，对未失效的规模基线证据不机械重跑。
10. 规则 1、5、7、12：无视图/设置语义/产品文案或技能事实变动，不触发额外实现；没有 UI 变动，不触发 ui 技能。

### SHA-256

```text
10bfc511a428a1cb6ca677f617cd9ee17fb1ac7f833a46c6fea865061d8103ed  src/host/obsidian/file-changes.ts
29534dcff8d9b1d3def1823b69a647be353e61ad28d3bf46610b7d6406fc1f9a  src/modules/archives/services/generic/file-changes.ts
565c474a170fa080c64d9208bc67274c2bb9d27629d6a738a7d9d7b03e720313  src/modules/archives/services/generic/file-changes.test.ts
309c026af2fea1f3dfd3b0c8ee34204d5af15a589626654b46ad907cae053b57  src/modules/archives/services/generic/runtime.ts
ba79fcd6c216e1c9bf7a612040fc9578c099f75abebf61a115bb301df41c15e4  src/app/main.ts
3399fec7dd55e4459d918e509a8b9a388a40d1c267f9885cd6c04a7b77c34188  src/modules/archives/module.ts
```

后三文件与本轮开始相同，没有修改。

## 问题与下一步

本轮 D1/D2 修复候选已完成，无新增修复阻塞或失败检查。原规模基线验收仍未闭合，故保留 blocked；Lead 可立即将三文件新摘要交原 reviewer 复审，再按原规模 owner 处理待验收项并执行其专属构建门禁。没有等待交互回答、弱化规模断言或扩大写集。
