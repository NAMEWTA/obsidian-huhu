# 任务回报

Session: 20261104T095541Z
Task: 107-review-scale-t04
Status: completed

## 聚焦交接

本次规模验收复审两轴均为 pass，无可操作 findings。独立重放旧夹具，确认失败来自过期的 schema revision 引用；修复沿用生产 presetRevisionId，未改变产品索引完整性判定。亲自在当前工作区运行规模验收退出 0，并在 HEAD 副本使用字节相同的修复脚本对照运行，全部原断言通过。性能证据支持两种内存 IO 规模下未见规模性退化，不构成统计等价或真实宿主性能证明；T-04 正式 Evidence 与状态由 Lead 处理。

## Standards Axis

Result: pass

Findings: 无。

- 冻结脚本相对 base 29644dc5833bb209e6282f84fa71441a5a1b99d4 仅增加 presetRevisionId 导入，并替换实体、关系的两个 schemaRevisionId 表达式（scripts/accept-archives-v2-scale.ts:7、:36、:60）。以 HEAD 原文执行恰好三个预期替换后，与冻结文件逐字相等；没有产品代码修改或无关重构。
- 当前与 HEAD 的 presetRevisionId 均生成 v2，bootstrap 使用该 helper 生成对应定义；修复复用已有单一来源，没有再写死版本。memoryArchives 等待 ensureLoaded；query 的 isComplete 要求加载结束且无诊断，limit=50 只限制返回页。未发现应通过等待、分页调整或放宽产品完整性规则修复的缺陷。
- 原总数、isComplete、搜索命中、不新增读取、增量属性更新、关系数 10、增量读取 <=2 等断言全部保留（脚本:85–109）；规模、50 次查询、计时区间、百分位、GC 和堆增量逻辑逐字未变。原脚本没有数值型耗时或堆内存通过阈值，本次也未新增或放宽阈值。
- 应用 dev 审查规则，检查脚本到测试端口、初始化、schema 与索引的调用关系。本次无新增生产依赖、模块互访、数据格式、用户文案或 UI；不触发 UI 实现验收，也无新增外部代码复用与许可事项。

## Specification Axis

Result: pass

Findings: 无。

本次结论限于 TASK 明确冻结的规模验收修复，不替代 T-04 全部 AC-121–AC-124 的事件适配、生命周期及宿主验收。四项复审要求均有证据：旧夹具红灯定位到失效 revision；最小差异证明未削弱验收；当前工作区实际命令通过；106 的对照数据与本次独立样本支持限定范围的“未见规模性退化”。没有将全量读取、完整性问题或数据缺失隐藏在性能结论中。

## 产物与验证

### 冻结与根因

冻结文件 SHA-256：08083589029ca9ec2ccf2fb9f983f91782db950ab9c65c81f68ab1191fdd4d7d。
Input-SHA256（TASK）：d13185c087afc3cde635c8a3034046d1750a30dd25f900859999293ddb4424dc。
开始、审查中及写报告前均核对匹配；回读后再次核对。

从实际 HEAD 原脚本构建 /tmp 诊断副本，仅在原 first.isComplete 断言前增加状态输出，未移除任何断言。运行输出 ready=true、loading=false、total=1000、complete=false、diagnostics=6000，前五条均为 missing-definition / preset-type-person-v1，随后原断言失败。旧夹具为 1000 实体与 5000 关系写入 v1 revision，而初始化的定义是 v2；该证据与生产完整性契约一致。修复后的两种规模全部通过，说明此处无需更改产品 query/index。

### 独立规模对照

环境：Node v26.11.1、Linux、12th Gen Intel Core i7-12700。当前与基线串行运行，未同时运行本次其他重型检查。基线复用 106 留存的 /tmp/huhu-106-head-b10_xooz，核对其中 presets.ts、generic/index.ts、generic/runtime.ts 与实际 git show HEAD 对应内容相同；修复脚本与冻结文件字节及摘要相同。使用既有依赖，不安装。

下表为本次亲跑每侧各一次的观测；时间单位 ms，堆单位 bytes。查询百分位是每次脚本内部 50 次测量的结果。

| 指标 | 1000 实体 HEAD | 1000 实体 当前 | 5000 实体 HEAD | 5000 实体 当前 |
| --- | ---: | ---: | ---: | ---: |
| 关系数 | 5000 | 5000 | 25000 | 25000 |
| 文件数 / 冷读次数 | 6023 / 6023 | 6023 / 6023 | 30023 / 30023 | 30023 / 30023 |
| 冷索引 | 1454.96 | 1431.45 | 6628.11 | 6763.18 |
| 首次查询 | 127.42 | 115.28 | 629.73 | 577.03 |
| 查询 P50 / P95 | 1.27 / 1.81 | 1.19 / 2.21 | 7.64 / 9.62 | 7.59 / 8.66 |
| 重复查询 P50 / P95 | 0.02 / 0.05 | 0.01 / 0.06 | 0.03 / 0.11 | 0.03 / 0.07 |
| 增量更新 | 1.28 | 1.04 | 1.57 | 1.56 |
| 增量读取次数 | 1 | 1 | 1 | 1 |
| GC 后堆增量 | 8193064 | 8182016 | 35244744 | 35251744 |

5000 规模冷索引当前比本次 HEAD 样本高约 2.04%，其他耗时有升有降，不能表述成每项更快。两侧读取次数相同，堆增量相近，未见额外全量读取或内存量级增长。

### 106 报告证据复核

完整读取 106-scale-fix-t04/REPORT.md，读取其三轮 HEAD 及当前第 2、3 轮本地原始日志，重新计算三轮 HEAD 各指标中位数，与报告表一致；当前第 2、3 轮原始值也与其表和范围相容。当前第 1 轮仅留在原工具输出中，本次没有独立回取，因此不声称已重新统计其当前三轮全部中位数。另以上述亲跑的两侧样本补充验证。

106 如实披露 5000 规模冷索引中位数 +2.14%、首次查询 +0.56%、查询 P95 -3.39%，1000 规模 P95 与增量更新有所上升；冷索引范围重叠，读取次数完全一致，堆增量相近。结合本次复跑，足以支持其谨慎结论：在该脚本覆盖的内存 IO 规模中未见规模性退化。小样本、共享机器及缺少真实宿主 IO 使其不能支持严格统计等价、真实 Vault/磁盘/UI 时延或高频事件吞吐结论；106 已说明这些限制。

### 亲自执行的命令与结果

| 命令 / 检查 | 退出码与结果 |
| --- | --- |
| pnpm accept:archives-v2-scale（当前工作区） | 0；两种规模全部原断言通过，指标见上表。 |
| pnpm --config.verify-deps-before-run=false accept:archives-v2-scale（上述 HEAD 副本） | 0；执行相同 package script，禁用自动依赖核验以复用既有依赖，未安装。 |
| node /tmp/huhu-review-107-old-scale-build.mjs | 0；读取 HEAD 原文，仅添加诊断输出，esbuild 写入 /tmp。 |
| node --expose-gc /tmp/huhu-review-107-old-scale.cjs | 预期红灯；工具返回 126，子进程 1；原完整性断言失败，状态及 missing-definition 证据如上。 |
| git diff --check -- scripts/accept-archives-v2-scale.ts | 0。 |
| Python 逐字差异断言、HEAD 关键源文件对照、两侧脚本摘要核对及日志中位数重算 | 0；结果如上。 |
| sha256sum scripts/accept-archives-v2-scale.ts | 0；与 TASK 冻结摘要相同。 |
| git check-ignore scripts/tmp/accept-archives-v2-scale.cjs | 0；验收自动生成的过程文件受忽略。 |

本次唯一手工仓库写入为本 REPORT；TASK 点名验收按现有命令自动生成被忽略的 scripts/tmp/accept-archives-v2-scale.cjs，未手工编辑或纳入交付。未修改业务文件、TASK、正式 Evidence 或状态文件，未执行 Git 写操作、安装、构建、推送或发版。

本地过程材料（纯路径）：/tmp/huhu-review-107-old-scale-build.mjs；/tmp/huhu-review-107-old-scale.cjs；/tmp/huhu-106-head-b10_xooz；/tmp/huhu-106-baseline-1.log；/tmp/huhu-106-baseline-2.log；/tmp/huhu-106-baseline-3.log；/tmp/huhu-106-current-2.log；/tmp/huhu-106-current-3.log。

未重复运行全套 vitest、类型检查、lint 或插件构建；本次只审查冻结的规模脚本，亲跑定向验收即所需验证。106 的其他测试结果仅作为交接背景，不冒充本次亲跑。真实 Obsidian/Vault、磁盘与 UI 性能未验证；无本次范围内未完成项。

## 问题与下一步

无阻塞或修正请求。Lead 可将本次双轴 pass 与 106 修复证据汇合后，按自己的验收维护 T-04 Evidence 和状态；completed 仅表示本审查候选交回。
