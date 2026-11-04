# 任务回报

Session: 20261104T095541Z
Task: 064-review-t17
Status: completed

## 聚焦交接

已完成 T-17 冻结候选的独立双轴审查，未参与实现或修复，未修改业务文件。标准轴与规范轴均为 request-changes，保留一个 minor finding：周期模板检查直接查询原始配置字符串，导致正常模板解析器可以找到的模板被误报为失效引用。AC-611/612、只读与锁定边界、模块接线、取消/禁用及原预算门禁的已有验收均通过本轮相关检查。下一步由实现者复用正常模板解析语义补充回归，再交新冻结候选复审；completed 仅表示本次审查已交付，不代表 Ticket 验收完成。

## 审查范围与方法

- Risk: medium；Independence: 独立、只读，未参与本票实现或修复。Strategy: 单 reviewer 完成双轴，沿真实 owner API、registry/lease、scanner、原生动作调用链与测试核查，并用内存编译的生产代码探针复现反例。
- Basis: TASK、T-17、053/059 实现 REPORT、Spec §6 与 AC-611/612、NFR-001/002、ADR-001/002/003/006、CONTEXT、Tickets Map 总体背景、Goal Plan，以及 AGENTS.md、dev Skill、SpecDev domain-runtime、reviewer-contracts/risk-review 合同。无 UI 改动，不引入 UI 验收流程。
- Review-Mode: working-tree；Base-SHA 与 Observed-HEAD 均为 `29644dc5833bb209e6282f84fa71441a5a1b99d4`。review-scope 工具显式选择 TASK 的 14 个文件，退出 0；完整读取这些文件，module.ts 对比 base 并区分其他票已验收的接线，只复核本票波及。
- Input-SHA256: `ca7d835a1469d7eef36b830f83e3815ffb2cf40d23f3bd654acc7554fec179d2`。起始 sha256sum --check 及写报告前复核均为 14/14 匹配。
- 影响链：三个 owner module → HEALTH_PROVIDERS/服务键 → health 公共 API/lease → owner 检查；archives 复用 catalog/query 与 parseBelonging，navigator/safe 在 scan 时加载实现；safe 桌面动作经 deferredSafeActions 延后委托，继续由 SafeService 负责会话、复制清理与导出前置检查。
- 本票新增实现复用仓库现有 owner 规则与 T-16 API，没有新增 bz 源码复制或改编，未发现需要追加的来源登记。固定上游设计来源继续由既有 T-16 scanner 文件头和 docs/third-party/bz.md 承接；本次 finding 的依据为本地模板解析实现，不依赖推测的上游行为。

## Standards Axis

Result: request-changes

### F1 — minor：模板引用检查没有沿用既有模板名称解析规则

- 位置：`src/modules/navigator/contrib/health-scan.ts:15`、`src/modules/navigator/contrib/health-scan.ts:16`；正常行为依据：`src/modules/navigator/platform/templates.ts:13`，以及 `src/modules/navigator/ui/runtime.ts:260`。
- 问题：provider 通过 `periodic.template(period)`（未传日期）取得原始模板名称，再直接执行 `getFileByPath(path)`。正常周期创建路径会经 resolveTemplateFile 补 `.md`，依次查找原路径、导航器模板目录及核心 Templates 目录；未传日期的 journal.template 则不会执行这一步解析。因此配置合法短名称或无扩展名路径时，实际使用正常，体检却返回 dangling-reference。文件夹模板字符串也进入同一直接查询路径。
- 可达前提与影响：库内存在 `Templates/Daily.md`，模板目录配置为 `Templates`，日记模板配置为 `Daily`。正常解析得到上述文件；provider 查询 `Daily` 返回空，从而把有效引用标成警告，报告不能准确反映配置健康情况。需要改写健康配置来消除误报，属于功能正确性问题。
- 实测证据：`node /tmp/huhu-064-provider-probe.mjs` 使用真实 createPeriodicHealth、resolveTemplateFile 与 memoryVault，保持仓库输入不变。以下三组均正常解析为 `Templates/Daily.md`，但 provider 都报 dangling-reference：`Daily` + 模板目录 `Templates`；`Templates/Daily` + 空模板目录；`Daily.md` + 模板目录 `Templates`。对照组 `Templates/Daily.md` + 空模板目录无诊断。四组读取正文与写入次数均为 0。
- 建议：通过 owner 的只读解析端口复用既有 resolveTemplateFile 语义，包含 `.md`、模板目录与核心 Templates 目录，不要复制一套直接路径存在性规则；继续只解析文件身份，不读取或执行模板。增加短名称、无扩展名、两类模板目录、完整路径和真正缺失模板的回归，并保持扫描时按需加载及原预算。

其余已检查边界未发现新增可操作问题：

- archives 仅映射 owner catalog 的解析、重复 ID、端点及修订诊断；报告引用为随机 64 位十六进制字符串，路径/id 仅留在 owner 内存 resolver。真实夹具验证源字节与写 API 不变，没有删除同步待复核关系。
- 归物复用 parseBelonging 校验生命周期及投影，分片读取实时 budget，不跨 yield 查询下一页；不完整 owner 查询保留 incomplete，不以被排除的坏记录得到假通过。
- safe 锁定时 permission/direct scan 均无 stat/read；加载/错误不可用，扫描端口没有解密/解锁/迁移/写入能力。stat 后锁定、取消、同步读取边界、存在/大小/外层版本诊断和报告脱敏均有通过的实际回归。
- scanner 使用 lease 撤销与 AbortSignal 隔离失效/取消结果；safe registry 集成验证 idle 不发现、激活后发现、禁用后 unavailable、失效通知及订阅清理。archives registry 集成验证真实贡献发现与完整扫描零写入。
- navigator/safe 实际检查实现保持动态加载，注册与 permission 不枚举路径、配置或访问密文。deferredSafeActions 保留 owner Window、vaultRoot、全部参数/返回值，原生路径校验未改；SafeService 的复制晚到清理、导出检查等相关回归通过。
- 跨模块生产导入仅经 health/api.ts；无新增自然语言文案、依赖、数据根、schema、修复入口或定时后台扫描。

## Specification Axis

Result: request-changes

| 合同或范围 | 实际结论 |
|---|---|
| AC-611 | 通过：重复 ID、缺失关系端点返回带 owner 可解析 token 的脱敏诊断；真实源字节与写入记录不变，不直接删除关系。 |
| AC-612 | 通过：归物投影与生命周期不一致返回 projection-mismatch，定位到具体 owner 记录；不执行纠正。 |
| Ticket IN：archives 解析、修订分支 | 通过：坏格式、未来版本和分叉修订有真实档案夹具覆盖，只读诊断。 |
| Ticket IN：周期日记路径与模板引用 | 部分满足：规范路径、非法日期、真正缺失模板、取消及惰性端口测试通过；F1 误报合法模板，尚不满足完整范围。 |
| Ticket IN：safe 元信息、locked | 通过已运行的单元与 registry 接缝；只检查容器存在/大小/外层版本，不认证密文或解密，锁定不读取。 |
| OUT：修复 | 未发现越界：无 repair、重建索引、写入、解锁或迁移操作。 |
| NFR-001/002 与原预算 | 架构、内存包体门禁及脱敏哨兵/零写入测试通过；未提高阈值。 |

规范轴 request-changes 来自 Ticket 明确包含的周期模板检查与 Spec §6，不把 AC-611/612 已通过误写为失败，也不因这两个 AC 通过而忽略其余 IN 范围。

## 产物与验证

本次唯一仓库写入为本 REPORT。未执行业务修改、Git 写操作、安装依赖或 build/build:css/notices。正式 check:bundle 使用内存构建，不改 main.js/styles.css；其他本地探针与结果仅留 /tmp。

| 命令 | 退出码 / 实际结果 |
|---|---|
| `pnpm exec vitest run src/modules/archives/contrib src/modules/navigator src/modules/safe src/modules/health` | 0；78 文件、790 测试通过，覆盖 provider、真实 registry、navigator、safe、health 与原生 actions 测试。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 0。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 0。 |
| `pnpm run lint` | 0；零警告。 |
| `pnpm test:architecture` | 0；1327 模块，无分区、宿主、桌面、barrel 或循环违规。 |
| `pnpm check:bundle` | 0；budget within limits。startup 131.5 KB；activation archives 255.1 KB、navigator 199.0 KB、safe 65.3 KB；延后页/扫描及动作保持动态边界。未修改预算。 |
| `pnpm test:safety-regressions` | 0；安全回归通过。 |
| review-scope：working-tree、指定 base 与 TASK 14 文件 | 0；范围、base/head 确认。 |
| `node /tmp/huhu-064-provider-probe.mjs` | 0；确认三个合法模板名称误报及完整路径对照组，通过探针内的复现结果断言；不是生产修复通过。 |

本地过程材料（纯路径）：

- /tmp/huhu-064-provider-probe.mjs
- /tmp/huhu-064-provider-probe-result.json

测试输出中的 YAML 未知标签警告来自正常模板安全回归夹具，相关测试均通过；不将这类运行警告冒充 lint 告警。

未验证项：未运行真实 Obsidian、原生剪贴板/窗口与文件选择器手工验收，也未重建统一产物；这些宿主与产物边界保留给 Lead 集成/用户验收。UI E2E 按本票 not-required，不将其升级为阻塞。未运行全仓 pnpm test，也未宣称全仓通过。

## 问题与下一步

无审查环境阻塞，14 个冻结输入未漂移。实现者修正 F1，补与实际模板解析一致的正反例，并重跑 provider 回归、相关类型/lint 和原包体门禁；navigator 预算余量较小，应继续保持扫描时加载。修复后需新冻结快照复审；本报告不修改 Ticket、正式 Evidence 或其他任务材料。
