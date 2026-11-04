# 任务回报

Session: 20261104T095541Z
Task: 106-scale-fix-t04
Status: completed

## 聚焦交接

已诊断并修复规模验收脚本的过期 schema revision 夹具，未发现需要修改产品 query/index 的完整性缺陷。当前工作区与 /tmp 的 HEAD 29644dc 导出副本，使用字节相同的修复脚本各运行三次，全部通过。文件事件、archives/黄金样本、生命周期、类型与 lint 检查通过；所有既有断言、规模和测量逻辑保留。候选交回 Lead 做独立双轴复审及正式 Evidence/状态验收，不宣称 T-04 done。

## 产物与验证

### 根因与最小修复

首次执行未改脚本，实际失败于 first.isComplete === true。随后只在 /tmp 的诊断副本，在原断言前打印 runtime.ready/loading、total 和 diagnostics：ready=true、loading=false、total=1000，诊断共 6000 条，前五条均为 missing-definition，detail 为 preset-type-person-v1。memoryArchives 已 await runtime.ensureLoaded()；加载流程结束才清除 loading，并等待 flushEvents，因此额外 sleep 或重复等待不是根因修复。

脚本为 1000 个实体和 5000 条关系写死 preset-*-v1；当前及 HEAD 29644dc 的 presetRevisionId() 都返回 preset-*-v2，initialize/bootstrap 写入的也是这些 v2 定义。query 的 limit=50 只限制返回页，total 仍为完整匹配数量，isComplete 则要求 !loading 且无 diagnostics，不表示“当前页是否含全部结果”。因此这里的 false 正确暴露了无匹配 schema 的无效夹具，不是分页或首次加载竞态。

唯一手工修改的仓库源码：scripts/accept-archives-v2-scale.ts。

- 在既有 presets 导入中增加 presetRevisionId。
- 实体与关系的 schemaRevisionId 改用 presetRevisionId(PERSON.id) / presetRevisionId(relation.id)。
- 没有修改 core/generic、runtime、host 适配、module.ts 或 main.ts；未新增产品行为或无关重构，不需要为不存在的产品缺陷补单测。原验收脚本自身的完整性断言即本次回归接缝。

修改前沿脚本 → memoryArchives → ensureLoaded/bootstrap → ArchiveIndex.query/diagnostics 和 presets 定位真实调用关系，并预告仅修改脚本、验证相关服务及事件生命周期。逐字对照 HEAD 脚本，确认最终差异恰为上述导入和两个 revision 表达式；isComplete、total、查询不增加读取、关系数 10、增量读取 <=2、1000/5000 规模与 50 次查询均未变化。原脚本未设数值型耗时或堆内存通过阈值，只输出测量；本次没有增加、删除或提高任何阈值。

最终脚本 SHA-256：08083589029ca9ec2ccf2fb9f983f91782db950ab9c65c81f68ab1191fdd4d7d。工作区脚本与基线副本脚本 SHA-256 一致。

### 基线对照与规模指标

通过只读 git archive 导出完整 HEAD 29644dc5833bb209e6282f84fa71441a5a1b99d4 到 /tmp/huhu-106-head-b10_xooz，套用同一脚本修复；没有创建 Git worktree 或进行 Git 写操作。基线仅链接当前已有 node_modules，不安装依赖。环境均为 Node v26.11.1、Linux、Intel Core i7-12700；当前工作区和基线的规模运行串行，重复轮次交替，规模测量期间未并行启动本次测试或 lint。

每侧各三次全部退出 0。下表为逐项三次中位数，时间单位 ms；query/repeated 的 P50/P95 是每轮脚本输出的对应百分位再取三轮中位数，不冒充合并后的总体百分位。

| 指标 | 1000 实体：HEAD | 1000 实体：当前 | 5000 实体：HEAD | 5000 实体：当前 |
| --- | ---: | ---: | ---: | ---: |
| 关系数 | 5000 | 5000 | 25000 | 25000 |
| 文件数 / 冷读次数 | 6023 / 6023 | 6023 / 6023 | 30023 / 30023 | 30023 / 30023 |
| 冷索引 | 1470.80 | 1462.74 | 6586.74 | 6727.38 |
| 首次查询 | 119.63 | 118.38 | 592.39 | 595.69 |
| 查询 P50 / P95 | 1.17 / 1.83 | 1.19 / 2.12 | 7.54 / 9.44 | 7.39 / 9.12 |
| 重复查询 P50 / P95 | 0.01 / 0.05 | 0.01 / 0.06 | 0.03 / 0.08 | 0.03 / 0.08 |
| 单实体增量更新 | 1.06 | 1.22 | 1.46 | 1.46 |
| 增量读取次数 | 1 | 1 | 1 | 1 |
| GC 后 heapDeltaBytes | 8188432 | 8180112 | 35269952 | 35257752 |

5000 规模冷索引中位数当前高约 2.14%，首次查询高约 0.56%；查询 P95 则低约 3.39%。1000 规模查询 P95 多 0.29ms、增量更新多 0.16ms，如实保留，不能声称每个耗时都下降。三轮冷索引范围：1000 为 HEAD 1435.46–1590.02 / 当前 1435.23–1472.98；5000 为 HEAD 6574.49–6697.19 / 当前 6589.18–7047.50。两侧耗时范围存在重叠，读取次数完全一致，堆增量差分别约 -0.10% / -0.035%，重复查询和增量更新仍维持相同量级。

结论限于本脚本覆盖的规模和内存 IO：未见额外全量读取、内存量级增长或规模性性能退化，全部原行为断言通过；这些小样本耗时差值不能作为严格统计等价证明，也不能推断真实 Vault/磁盘/UI 时延或宿主高频事件吞吐。T-04 事件适配行为另由文件事件及 archives 服务测试承接。

### 实际命令与退出码

| 命令 / 步骤 | 退出码与观察 |
| --- | --- |
| pnpm accept:archives-v2-scale（修复前） | 工具返回 126，pnpm 子命令 1；first.isComplete false，红灯。 |
| pnpm exec esbuild /tmp/huhu-106-diagnose.ts --bundle --platform=node --format=cjs --outfile=/tmp/huhu-106-diagnose.cjs --alias:obsidian=./scripts/obsidian-stub.ts --log-level=warning | 0；诊断副本只增加原断言前的状态/诊断输出。 |
| node --expose-gc /tmp/huhu-106-diagnose.cjs | 工具返回 126；上述 ready/loading/6000 条 missing-definition 证据后原断言仍失败。 |
| pnpm accept:archives-v2-scale（修复后，当前工作区三次） | 三次均 0；两种规模全部原断言通过。 |
| git archive 29644dc5833bb209e6282f84fa71441a5a1b99d4（Python 流式解包至 /tmp，复制修复脚本并链接已有依赖） | 0；未更改工作区、分支或 index。 |
| pnpm accept:archives-v2-scale（基线副本首次启动尝试） | 126；pnpm 自动依赖状态核验转入 install，并在无 TTY 的模块目录移除确认前中止，未执行安装/升级。随后禁用自动依赖核验复用既有依赖；未以 CI=true 强行执行 install。 |
| pnpm --config.verify-deps-before-run=false accept:archives-v2-scale（/tmp 基线副本三次） | 三次均 0，执行同一个 package script、同一现有 esbuild/node，指标如上。 |
| pnpm exec vitest run src/host/obsidian/file-changes | 0；1 文件 5 项通过，覆盖事件适配时序/失效/清理。 |
| pnpm exec vitest run src/modules/archives test/golden/archives-v2.test.ts test/golden/archive-relation.test.ts | 0；22 文件 156 项全部通过，包含当前 archives 服务、核心、DOM 与黄金样本。 |
| pnpm test:workbench-lifecycle | 0；10 项通过，包含关闭、模块禁用和异步迟到清理。 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json | 0。 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json | 0。 |
| pnpm run lint | 0，零警告。 |
| git diff --check -- scripts/accept-archives-v2-scale.ts | 0。 |
| 最小差异及两份脚本字节一致性 Python 断言；sha256sum 两份脚本 | 0；只允许预期三个替换，摘要一致。 |

任务明确点名的 accept 与 workbench-lifecycle package scripts 按现有方式生成被忽略的 scripts/tmp/*.cjs 过程文件，未作为交付源码或 Evidence 入库；未手工编辑这些文件。脚本约定输出经 git check-ignore 确认为忽略。package.json/pnpm-lock.yaml 未改，未修改依赖、build/、main.js 或 styles.css。

本地过程材料（仅路径）：/tmp/huhu-106-diagnose.ts；/tmp/huhu-106-diagnose.cjs；/tmp/huhu-106-baseline-path；/tmp/huhu-106-head-b10_xooz；/tmp/huhu-106-current-2.log；/tmp/huhu-106-current-3.log；/tmp/huhu-106-baseline-1.log；/tmp/huhu-106-baseline-2.log；/tmp/huhu-106-baseline-3.log。当前第 1 次成功运行的完整指标由实际工具输出保留，后两次及基线三次另保留本地日志；报告不另建日志附件或正式 Evidence。

### Skill Execution Records

- dev：修改前检查真实调用方和索引完整性契约；使用已有 presetRevisionId 单一来源，避免再写死另一个版本号。仅修改脚本，不改生产模块分层/api.ts/懒加载，不向 core 引入 Node/宿主依赖，不改变数据格式、存储路径或产品文案。
- dev：保留所有现有测试与验收断言，以原脚本红灯、诊断和原脚本绿灯证明修复，不以放宽完整性判定、分页参数、读次数或规模换取通过。按测试选择表运行 archives/黄金样本、文件事件、生命周期、类型和零警告 lint。
- SpecDev I：完整读取本次冻结 TASK、Ticket、必需 dev Skill 与执行入口；复用已读未变的运行/TDD/范围合同及 Lead 已核验的 Ready/授权/workspace/依赖事实，读取 plan_revision 15 的本次扩大写集。只交修复候选和事实；未修改 TASK、Spec、ADR、设计、Ticket、Map、Goal 或正式 Evidence，独立双轴审查由 Lead 安排。
- 外部复用：本次没有新增 bz 代码复制或改编，无新的许可登记项；直接复用仓库自身 preset helper。

### 未执行与验证边界

pnpm run build、pnpm run build:css、pnpm check:bundle、pnpm check:notices、UI runner 未执行，owner Lead；本次只改验收脚本，不改变插件生产打包输入或 UI。真实 Obsidian/Vault 同步、真实磁盘与渲染时延未验证；本票 E2E disposition 为 not-required，宿主同步按用户验收安排。计时来自共享机器的三轮串行内存测试，环境可能有其他执行者负载，不将通过断言表述成所有性能指标严格无差异。

## 问题与下一步

无实现阻塞。Lead 回读单文件差异、规模对照及命令事实，安排独立双轴复审后维护正式 T-04 Evidence 与状态。此次修复既有规模脚本夹具，不应通过修改索引完整性逻辑掩盖缺失 schema。
