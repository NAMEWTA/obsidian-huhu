# 任务回报

Session: 20261104T095541Z
Task: 071-rereview-t17
Status: completed

## 聚焦交接

T-17 独立复审完成，标准轴与规范轴均为 pass，F1 已关闭，无新增待修 finding。周期模板检查已复用正常日记创建使用的模板解析器，原短名称/无扩展名误报反例消失，真正缺失的引用仍报告诊断。亲自执行相关回归 78 文件/797 项、定向模板测试、两套类型、定向 lint、架构及原预算门禁，全部通过；只读、锁定、取消与按需加载边界未发现回退。仅写本 REPORT，completed 表示复审候选交回；正式 Evidence/Ticket、统一产物及宿主验收仍由 Lead 处理。

## Review

- Strategy: independent；Risk: medium；Independence: required。
- Reviewer: 当前承接 071-rereview-t17 的 Codex 会话，未参与本票实现或修复；实际派遣身份由 Lead 核验，不虚构会话 ID。
- Implementers: 原 T-17 实现者、066-repair-t17 与共享 module.ts 集成 Lead。
- Mode: working-tree；current/dev；base_sha / observed_head：29644dc5833bb209e6282f84fa71441a5a1b99d4。
- Input-SHA256: 2b326c63b19cf25d23c55a60d2881cd4f65a767fd8723956cf32effcbcf7eae0（TASK 给定）。
- TASK、064 审查、066 修复交接全文已读。14 个冻结输入开始、中途及报告前均匹配，回读时再次检查；review-scope 明确指定这 14 个路径及 base/head，没有将其他票 dirty 文件并入本票。

依据 T-17、Spec §6 / AC-611/612 与相关只读/脱敏边界、Map 总体背景、ADR-001/002/006、CONTEXT/Goal，以及已读且仍适用的 AGENTS、dev、reviewer-contracts/risk-review、SpecDev 运行/范围/测试合同。AGENTS 与 dev 摘要仍与先前完整读取版本一致，分别为 a65261ca…、d217057f…；本票无 UI，未引入 ui 工作流或视觉验收要求。

相对 064，仅 navigator/contrib/health-scan.ts、health.test.ts、navigator/module.ts 三文件改变，其余 11 个冻结文件相同。读取冻结 provider/测试与三个 module.ts，模块差异区分 T-03/T-06/T-11 等其他票既有接线；追踪 owner module → health 公共贡献/服务 → scanner lease/AbortSignal → owner 只读检查，并对照 navigator 的正常 template 解析调用方。

## Standards Axis

Result: pass
Reviewer: 当前 TASK 的独立 Codex reviewer
Input-SHA256: 2b326c63b19cf25d23c55a60d2881cd4f65a767fd8723956cf32effcbcf7eae0

无待修 blocker、major 或 minor。

### F1 已关闭：模板名称使用 owner 正常解析规则

health-scan.ts 的 owner 分支现在调用 resolveTemplateFile(app, [templateFolder, coreTemplatesFolder(app)], name)。与 ui/runtime.ts 的 journal.template(period, date) 使用相同函数和目录顺序：规范化名称、补 .md、先查原路径、再查 navigator 模板目录、最后回退启用的核心 Templates 目录；周期及文件夹模板引用共用该判断。module.ts 只向延后检查器传入 app/settings，没有在注册或 permission 时解析模板。

亲自运行当前 health.test.ts 的全部 10 项：六组正常引用、真正缺失的负例、惰性 owner 输入、取消和路径检查通过。正例同时覆盖周期与文件夹规则：Daily + Templates、Templates/Daily、Daily.md + Templates、完整路径，以及核心 CoreTemplates 目录和 navigator 目录未命中后的核心回退。缺失的 Missing 仍产生 dangling-reference，owner token 能定位；模板正文与 Vault 写入计数均为零，不是跳过模板检查换取绿色。

另独立复用 064 的原生产代码/memoryVault 探针：仅按本次 owner 输入签名将 files 参数换成 app，并将原“误报存在”断言改为修复后的预期，结果写到新的 /tmp 路径，未改旧探针或业务文件。原四组数据与真实 resolveTemplateFile 对照结果如下：

| 配置名称 | navigator 模板目录 | 正常解析 | 当前 provider 诊断 | 正文读/写 |
|---|---|---|---|---|
| Daily | Templates | Templates/Daily.md | 无 | 0 / 0 |
| Templates/Daily | 空 | Templates/Daily.md | 无 | 0 / 0 |
| Daily.md | Templates | Templates/Daily.md | 无 | 0 / 0 |
| Templates/Daily.md | 空 | Templates/Daily.md | 无 | 0 / 0 |

探针退出 0。原前三组误报全部消失，完整路径对照仍正常；不是把修复交接或其先红后绿记录冒称本轮亲自执行。

### 只读、安全与生命周期复核

- archives 继续只映射 owner catalog 的解析、重复 ID、缺端点、未来格式及修订分支诊断；归物复用 parseBelonging 校验投影。真实内存档案和 registry 扫描回归验证源字节保持、写 API 与设置保存零调用，不删除同步待复核关系或执行纠正。
- 报告只有结构化 code、级别、数量及随机 64 位十六进制 token；路径/实体 ID 留在 owner resolver，dispose 清理定位表。正文、物品名、账号名与模板正文哨兵不进入报告。
- safe 的扫描端口仅有 state/stat/read，无解密、解锁或写入方法。locked 的 permission 与直接 scan 都不 stat/read；stat 后锁定、取消及读取返回后的权限复核保留，容器存在、字节上限、外层 format/version 诊断通过。元信息检查不宣称密文认证成功。
- navigator 解析只获取文件身份，不读取正文、不调用/执行模板或创建日记。settings 的周期和文件夹规则先经 owner 正常归一化，检查器不另建模板规则或改配置。
- 动态分片读取实时 batchSize/remainingItems，不跨 yield 预取下一页；不完整 owner 查询保持 incomplete。scanner 的 lease 撤销/AbortSignal 隔离及迟到结果防护与 provider 取消测试通过，禁用后 unavailable、失效通知/订阅清理的真实 registry 回归保持。
- navigator/safe scanner 实现仍在 scan 时 import()；注册/permission 不枚举路径、解析模板或访问密文。safe 桌面动作的延后代理继续传递 owner Window、vaultRoot、参数和返回值，实际原生 actions/服务回归在完整命令中通过；未修改原生导出验证或复制清理职责。
- 跨模块生产引用仅经 health/api.ts，架构门禁通过；没有新增依赖、存储/schema、产品文案、后台定时扫描或 repair 入口。

### 包体与兼容边界

正式内存门禁在原 scripts/bundle-budget.json 下通过，没有调整阈值：startup=134636 ≤ 135168；archives activation=261217 ≤ 337920；navigator activation=203757 ≤ 203776；safe activation=66816 ≤ 68608；output=7095240。navigator 当前余量为 19 bytes，是本次工作副本的实测值；不将通过扩大为未来修改也有足够余量。

修复只把模板解析依赖放入延后 health-scan.ts，module.ts 未静态引入该实现。既有 safe/T-06/T-07、navigator 日记/模板与 health scanner 测试通过；不把这些回归结果扩展为其他票全部 UI 或真实宿主验收。

## Specification Axis

Result: pass
Reviewer: 当前 TASK 的独立 Codex reviewer
Input-SHA256: 2b326c63b19cf25d23c55a60d2881cd4f65a767fd8723956cf32effcbcf7eae0

| 合同或范围 | 本轮结论 |
|---|---|
| AC-611 | pass：真实 archives provider/registry 接缝报告重复 ID 与关系端点缺失，以脱敏 token 保留 owner 定位；源字节不变、写 API 零调用，不直接删除关系。 |
| AC-612 | pass：真实归物投影不一致返回 projection-mismatch，定位到具体记录，不执行修复；owner 不完整查询不假装全绿。 |
| Ticket IN：archives 解析/修订分支 | pass：坏格式、未来版本、分支修订真实夹具诊断与零写入回归通过。 |
| Ticket IN：周期路径与模板引用 | pass：规范路径/非法日期、六种正常名称解析、真正缺失、取消与注册惰性通过；F1 关闭。 |
| Ticket IN：safe 容器、locked | pass（已测模块/registry 接缝）：锁定不读，不尝试解密；存在/大小/外层版本检查与禁用后的 unavailable 保持。 |
| 只读/隐私/懒加载与预算 | pass：797 项相关回归、独立模板零读写探针、架构与原预算通过。 |
| OUT：修复 | 未发现越界：本票无 repair、索引重建、日记创建、解锁或迁移操作。 |

本票新增检查复用现有 owner 规则与 T-16 API；本次三文件修复复用仓库自己的模板解析器，没有新增外部代码复制、运行依赖或来源登记事项。沿用既有 scanner 的来源登记和声明，不为已明确的本地修复重开上游研究，也不冒称本轮重新获取 bz 源码。

## 产物与验证

唯一仓库写入为本 REPORT。未修改业务/测试、TASK、旧报告、正式 Evidence/Ticket/Map/Goal、设计、来源登记、预算、依赖或 main.js/styles.css；未安装、执行禁止的 build/build:css/notices、Git 写操作、提交、推送或发布。探针与包体结果仅留 /tmp，未入库过程材料。

| 亲自执行的命令/检查 | 退出码 | 实际结果 |
|---|---:|---|
| TASK 14 文件 SHA-256，多次 | 0 | 全部匹配，回读再核对 |
| pnpm exec vitest run src/modules/archives/contrib src/modules/navigator src/modules/safe src/modules/health | 0 | 78 文件 / 797 项通过，含真实 provider/registry、navigator 模板、safe 服务/原生 actions 与 health scanner 回归 |
| pnpm exec vitest run src/modules/navigator/contrib/health.test.ts | 0 | 1 文件 / 10 项通过，含六组正常解析和真正缺失的反例 |
| node /tmp/huhu-review-071-t17-template-probe.mjs | 0 | 原四组模板反例/对照均无误报，正常解析相同，正文读取/写入均零 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json | 0 | 生产类型通过 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json | 0 | 测试类型通过 |
| pnpm exec eslint src/modules/navigator/contrib/health-scan.ts src/modules/navigator/contrib/health.test.ts src/modules/navigator/module.ts --max-warnings 0 --no-warn-ignored | 0 | 本轮修复定向零警告；测试另由类型/Vitest 检查 |
| pnpm test:architecture | 0 | 1327 模块，无分区/宿主/桌面/barrel/循环违规 |
| node scripts/check-bundle.mjs --budget scripts/bundle-budget.json --enforce --json /tmp/huhu-review-071-t17-bundle.json | 0 | 原正式预算 within limits，具体字节见上，无产物写入 |
| validate-specdev.mjs --review-scope --repo /home/wta/projects/obsidian-huhu --mode working-tree --base 29644dc5833bb209e6282f84fa71441a5a1b99d4 --file（逐个传 TASK 14 路径） | 0 | 范围/base/head 正确 |
| git diff --check 29644dc5833bb209e6282f84fa71441a5a1b99d4 --（TASK 14 路径） | 0 | 所查差异无空白错误 |

本地过程材料（纯路径）：

- /tmp/huhu-review-071-t17-template-probe.mjs
- /tmp/huhu-review-071-t17-template-probe.json
- /tmp/huhu-review-071-t17-bundle.json

完整测试中的 YAML 未知标签及集合键警告来自已有模板安全夹具，相关测试通过；不把它们误记为 lint 告警。首次定位曾尝试不存在的 health/services 路径，随后通过 rg --files 定位真实 health/core/scanner.ts 并读取；该定位错误不作为产品 finding 或验证结果。

未执行全仓 pnpm test、全仓 lint、额外 i18n/许可/完整安全脚本或禁止的统一构建；相对 064 只有三处模板解析修复，采用当前相关完整回归、类型、定向 lint、架构和原预算检查，未冒称额外门禁本轮执行。本票无产品 UI，E2E disposition 为 not-required，无需浏览器视觉矩阵。真实 Obsidian 的文件系统/模块启停与原生交互、最终产物一致性仍待 Lead/用户验收，不以 memoryVault/registry 接缝代替宿主验收。

## 问题与下一步

无未关闭 finding 或冻结输入阻塞，F1 已闭合，预算仍达标。Lead 可据本报告继续本票正式验收并维护 Evidence/Ticket 与统一产物；真实宿主边界保持明确的待用户验收。本报告不修改正式状态，completed 只表示复审交回。
