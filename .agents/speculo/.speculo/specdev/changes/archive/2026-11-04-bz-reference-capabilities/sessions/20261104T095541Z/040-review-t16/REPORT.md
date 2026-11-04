# 任务回报

Session: 20261104T095541Z
Task: 040-review-t16
Status: completed

## 聚焦交接

已完成 T-16 冻结候选的独立审查，两轴均为 request-changes，确认两项 minor：实际读取可越过 maxItems 预算，且缺少 health 扫描器的 bz 来源映射。54 项相关测试、安全回归、架构、i18n、工作台入口及最终两套类型检查和 lint 通过，不能覆盖上述两个缺口。启动词典与 health 激活预算已实际核验，033 的 B1/B2 接线问题不再成立。本次仅写本 REPORT，未改业务文件或正式状态；下一步由 Lead 分配最小修复、补来源登记并冻结复审。

## Review

- Strategy: independent；Risk: high；Independence: required。
- Reviewer: Codex / 040-review-t16；未参与本票实现或修复，不编造 provider/session ID。
- Review mode: working-tree；base_sha 与 observed_head 均为 `29644dc5833bb209e6282f84fa71441a5a1b99d4`。
- Input-SHA256: `438c131d4456eea1bcd3b0b9f7ea7fb74d8c66be66eb8080b9dfffd082aec9cd`（TASK 给定）。
- 范围：TASK 全部 13 个路径。开始用 sha256sum、中途及报告前按原始字节 SHA-256 核对，均 13/13 匹配，无冻结输入漂移；review-scope 工具确认相同范围与 base/head。
- 完整读取 TASK、Ticket、033/039 交接和 health 八个实现/测试文件；对照共享登记文件的基线差异。ModuleContext.events 属已验收 T-03，本轮仅审 ModuleId 增量；预算删除新增 health 项后与基线 JSON 深度相等。

依据为 Spec §6/AC-601–603、ADR-006、Map/Goal 的 T-16→T-17/T-18/T-19 边界、AGENTS.md、dev Skill、reviewer-contracts、risk-review 和已读运行/范围/测试合同。追踪 manifest→ModuleRegistry→真实 health module→provider 收集/服务租约→HealthScanService，并检查设置、反馈、失效订阅、取消/卸载、脱敏和内存快照。没有页面或 CSS 变更，不扩大 UI 验收矩阵。

## Standards Axis

Result: request-changes

### H1 — minor：在拉取下一片之后才判断预算，实际读取超限且未计入进度

- **文件:行：** `src/modules/health/core/scanner.ts:134`、`:143`；相关契约 `src/modules/health/api.ts:28`（HealthScanContext）。
- **问题：** iterator.next() 会先执行 provider 的实际读取，随后才检查 section.checked + value.checked 是否超过 maxItems。预算耗尽后仍会请求下一片；提供给 provider 的上下文只有固定 batchSize，没有剩余项数预算。被拒绝的这片已经读取，但不累计到 checked，因此 maxItems 只是接受结果的阈值，不能约束实际扫描工作量。
- **亲自运行的复现：** Node stdin 以 esbuild write:false 在内存加载真实 HealthScanService 与 memoryVault（obsidian 仅别名为宿主桩）。fixture 有 10 个 JSON 文件；合规 async generator 每片按 batchSize 逐个调用真实 fixture adapter.read，先检查 signal，再 yield `{checked:2,total:10}`。配置 concurrency=1、batchSize=2、maxItems=2、maxIssues=10。实际输出为：

```text
{"maxItems":2,"batchSize":2,"fixtureReads":4,"fixtureWrites":0,"checked":2,"status":"incomplete"}
```

- **影响与边界：** 不涉及写入，也没有把超限报告标绿；问题是资源预算和真实进度。正常遵守分片/取消契约的 provider 也会多做一片读取，报告隐藏这部分工作；batchSize 大于剩余预算时同样缺乏预先限制。现有预算测试只断言 incomplete 和已接受计数，没有检查真实读取次数。
- **建议修正：** 在发起下一片前阻止已耗尽的扫描，并通过只读上下文/拉取协议传递剩余预算或限制当前片大小，使 provider 能在读取前遵守上限。预算耗尽仍应明确 incomplete，不为了判定 done 再读取额外数据。补真实读取次数回归，覆盖刚好用尽、余数不足一片和 maxItems 小于 batchSize；保留取消与清理行为。

### H2 — minor：改编扫描器没有进入逐项来源登记

- **文件:行：** `src/modules/health/core/scanner.ts:1`；缺失接收位置 `docs/third-party/bz.md:16` 的逐项登记表。
- **问题与证据：** scanner 文件头声明设计改编自固定 SHA 的 bz/src/checkup/run.ts；033/039 也明确采用分阶段扫描、逐片让出、取消、错误隔离和内存缓存。当前 bz.md 的完整登记表没有 `src/checkup/run.ts` 或 `src/modules/health/core/scanner.ts`。报告前再次全文查找，两项仍均缺失。
- **依据与影响：** Ticket 执行约束、Spec §7/AC-001 及 dev licensing 要求具体改编在文件头署名并登记 SHA/上游路径/落点/方式/偏离。现有文件头和 MIT 原文已在，不是许可证缺失；缺的是可审计的对应关系。实现交接“请 Lead 汇总”并不等于当前候选已完成登记。
- **建议修正：** 由 Lead/文档 owner 在 bz.md 追加对应条目，说明改为实例、贡献/租约、结构化脱敏报告，未采用上游修复函数、全局缓存和原始异常文案，并引用实际验证。无须执行 notices 生成或让 reviewer 越界改文档。

### 其他已核验边界

- permission 先于 scan；locked/unavailable 不调用 scan；只为选定且已广告的检查申请租约，未知 ID 显示 unavailable。默认发现仅当前活动贡献，不暗中激活 idle owner；具体 provider 的完整发现与零副作用激活仍由 T-17 证明。
- 取消、外部信号、卸载和 lease.revoked 均进入等待路径，迟到片段不回写；单检查异常及清理异常被隔离。报告与快照复制，字段只接收枚举码、计数及受约束的不透明 reference，异常原文不进入结果。
- 核心没有 App/写 API；真实 ModuleRegistry 集成和 fixture 写 API spy 为零，坏文件字节保持。此证据针对本票编排，不冒充生产 archives/safe provider 已通过。
- activate 只装配，不自动扫描；报告保存在该 activation 的内存，重开不复用旧报告；Vault/领域/贡献失效与过期标记有覆盖，监听和让出计时器随模块清理。
- 未发现需另报的 major/blocker；H1/H2 不能被现有绿色门禁替代。

## Specification Axis

Result: request-changes

| 合同 | 结论与实际边界 |
|---|---|
| AC-601 | pass（编排集成接缝）。损坏 JSON/YAML、缺失及未来版本 fixture 扫描没有 Vault/adapter/设置写入，原始字节不变；具体生产 provider 属 T-17。 |
| AC-602 | pass（已测接缝）。手动/外部取消、卸载、租约撤销及迟到结果不变成全绿；单 provider 抛错/清理异常不阻止其他检查出结果。 |
| AC-603 | pass（契约/模块接缝）。locked 不调用 scan，显式请求禁用/缺失检查为 unavailable，不按通过处理；无关 idle 模块未激活。真实 safe 检查/解密边界由 T-17 验收。 |
| Ticket IN / Spec §6 预算、真实进度 | request-changes：H1 证明预算不能限制真实读取量，并且丢弃的超限片未反映在计数中。 |
| Ticket 执行约束 / Spec §7、AC-001 | request-changes：H2 的来源映射尚未完成。 |

范围符合模块登记、provider 契约与只读编排；未实现具体 provider、修复、页面或持久通知，不把这些后续票的交付要求强加到本票。预算文件仅新增 health=10240，其他阈值/理由未变；启动词典中英文标题与描述可在 health 未加载时解析，测试词典入口包含 health。

## 产物与验证

唯一写入产物为本 REPORT。未改 TASK、业务文件、第三方登记、正式 Ticket/Evidence/Map/Goal、依赖或生成物；未执行 Git 写操作、安装、提交、推送或发布。

| 亲自执行的命令/检查 | 退出码 | 实际观察 |
|---|---:|---|
| `sha256sum -c -`（13 路径）及 Python 原始字节复核 | 0 | 冻结输入持续匹配。 |
| `pnpm exec vitest run src/modules/health src/app/modules/registry.test.ts src/shared/settings/store.test.ts src/modules/notifications` | 0 | 10 文件、54 项通过，含 health 自身 13 项。 |
| `pnpm test:safety-regressions` | 0 | 安全门禁通过；Node DEP0205 为弃用提示。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 首次 126；复跑 0 | 首次仅范围外 archives/services/generic/recovery.ts:71 缺少 equal；并行代码补齐导入后复跑通过。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 首次 126；复跑 0 | 同一范围外错误，更新后通过。 |
| `pnpm run lint` | 首次 126；复跑 0 | 首次同一 recovery.ts:71 no-unsafe-call（子进程 exit 1），相关输入更新后零警告通过；未修改该文件。 |
| `pnpm test:architecture` | 0 | 1316 模块，无分区/宿主/桌面/桶文件/循环违规。 |
| `pnpm test:i18n` | 0 | 33 词典、5350 键，插值与引用检查通过。 |
| `pnpm test:workbench-entry` | 0 | 3 项通过。 |
| Node stdin：真实 scanner 预算反例 | 0 | 断言确认 4 次 fixture 读取、0 次写入、报告 checked=2/incomplete；0 表示反例确认成功。另一个纯 provider 计数探针得到同样结果。 |
| Node stdin：生产 esbuild write:false/metafile 激活闭包与启动词典探针 | 0 | health 激活 9630 字节 ≤ 10240；eager 无 health module/core/services/platform；未加载 health 时 en/zh 标题与描述均正确。 |
| Node JSON 对照固定 base 预算 | 0 | 删除新增 health 项后与基线深度相等。 |
| `validate-specdev.mjs --review-scope --repo /home/wta/projects/obsidian-huhu --mode working-tree --base 29644dc5833bb209e6282f84fa71441a5a1b99d4 --file <逐个传入 TASK 13 路径>` | 0 | 固定点与范围解析成功。 |
| `git diff --check 29644dc5833bb209e6282f84fa71441a5a1b99d4 -- <TASK 13 路径>` | 0 | 已跟踪差异空白检查通过，新增文件另经直接读取/type/lint/测试。 |
| `gh api repos/yeshimei/bz/contents/src/checkup/run.ts?ref=d76a0870329403247917a00c43019e203a2560a4 --jq .content` 后 base64 解码 | 0 | 只读核对固定来源的扫描/取消/错误隔离/内存缓存设计，未执行上游代码。 |

实际来源：[bz 固定提交的 checkup/run.ts](https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/checkup/run.ts)。HUHU 的 provider/lease、预算与脱敏是本地适配，不能用上游存在代替本地验收。

所有诊断探针均经内存编译执行，未创建仓库探针、日志或产物；/tmp 下的模块名仅用于 CommonJS 内存 locator。未运行禁止的 build/build:css/notices，也未运行完整 check:bundle、全仓 pnpm test、完整许可/文档门禁或 UI runner。定向激活测量不宣称其他模块或总包体预算通过；共享产物和完整集成由 Lead 处理。真实 Obsidian/移动端、实际 provider 与后续页面仍未验收；本票 E2E disposition 为 not-required。

## 问题与下一步

无独立审查执行或冻结输入阻塞；Status completed 表示本次审查已交付。请 Lead 修复 H1 并补真实读取次数回归，协调来源 owner 处理 H2，再冻结候选复审；保留生产 provider 与共享构建等后续验收边界，不将本报告或现有测试绿色当作整票完成。
