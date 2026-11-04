# 任务回报

Session: 20261104T095541Z
Task: 036-rereview-t04
Status: completed

## 聚焦交接

已完成 T-04 冻结候选的独立复审，标准轴与规范轴均为 pass，原 030 报告中的 D1、D2 均关闭。亲自运行的 13 个文件、78 项相关测试及 10 项工作台生命周期场景通过；最终两套类型检查、lint、架构检查也通过。规模脚本 first.isComplete 的既有失败沿用 TASK 明示的基线事实，完整规模/性能仍待验收，不因本次双轴 pass 宣称整票完成。本次只写本 REPORT，交由 Lead 回读并处理正式 Evidence、状态与后续集成。

## Review

- Strategy: independent；Risk: high；Independence: required。
- Reviewer: Codex / 036-rereview-t04；未参与本票实现或修复，不编造会话或 provider ID。
- Review mode: working-tree；base_sha 与 observed_head 均为 `29644dc5833bb209e6282f84fa71441a5a1b99d4`。
- Input-SHA256: `32eac26c5b593fb2842aa45365cb728e360efbfe284095377928730e27f5b032`（TASK 给定）。
- 范围：TASK 全部 7 个冻结路径。开始用 sha256sum 核对，中途及报告前按原始字节 SHA-256 复核，均 7/7 匹配；未发现冻结输入漂移。review-scope 工具确认了相同范围与 base/head。
- 对照 030 的冻结清单，仅 host/file-changes.ts、archives/services/generic/file-changes.ts 及其服务测试改变，与 034 修复交接一致；runtime.ts、app/main.ts、archives/module.ts 及 host 原测试未变。

### 依据与影响范围

完整读取本 TASK、原 030 报告与 034 修复交接，按 Ticket、Spec §1/AC-121–124、ADR-004、Map/Goal、AGENTS.md、dev Skill、reviewer-contracts 与 risk-review 审查。适用的运行、范围、测试和生命周期合同沿用本会话已读规则；本次无 UI 变更，不新增视觉验收要求。

追踪链路为 `main.onload → FileChanges → 实例 DomainEvents → archives/module → bindArchiveFileChanges → ArchiveRuntime/index`；同时核对 runtime 的 fileDependents、文件版本与 epoch、rescan/dispose、提交后失效和私有草稿失效。生产修复仅改变合并键和目录 rename 新范围失效，未新增资源、写数据协议、依赖或其他模块监听迁移。

来源沿用文件头及原 030 的固定来源核对：`https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/core/obsidian-adapter.ts`。当前头部仍保留 SHA、MIT、原路径与版权；本轮没有重新获取外部源码，也没有新增复制内容。来源登记汇总仍由 Lead 负责，不改非冻结文档。

## Standards Axis

Result: pass

### D1 — 原 major：已关闭

- 位置：`src/host/obsidian/file-changes.ts:68`。
- 合并键现在为 `[kind,path,oldPath,folder]`，同路径的目录 delete 与文件 delete 不再覆盖。原有同身份去重、容量上限、最大等待和溢出 rescan 保持。
- 实际通过的回归：`src/modules/archives/services/generic/file-changes.test.ts:188`。用真实 EntityCommands 建立档案，关闭测试文件端口的直接 runtime 回调，删除实际文件后经真实 FileChanges → DomainEvents → binding → ArchiveRuntime 执行同批次 `delete(TFolder) → create(TFile) → delete(TFile)`。
- 断言同时检查批次保留 folder=true/false 两种 delete，以及已删除子实体不再索引。测试依赖业务最终状态，没有补发目录事件来掩盖原反例。原问题在本次候选上不再复现。

### D2 — 原 minor：已关闭

- 位置：`src/modules/archives/services/generic/file-changes.ts:19`。
- 目录 rename 先按旧范围失效，再对新范围调用 `fileDeleted(path,true)`。runtime 的该方法会按前缀标记 fileDependents，随后绑定按既有规则发现当前 Markdown；附件本身不会进入档案解析索引。
- 实际通过的回归：`src/modules/archives/services/generic/file-changes.test.ts:216`，参数化覆盖 `huhu/archives/assets` 与 `outside/assets`。真实 DefinitionCommands 发布 file 字段类型，真实 EntityCommands 创建引用旧/新附件路径的两条档案，移动附件后只发送一个目录 rename。
- 前置断言确认旧引用正常、新引用 missing-file；事件处理后旧引用变为 missing-file、新引用诊断清除，并确认 image.png 没有索引条目。覆盖了两个路径范围与实际诊断变化，原新范围盲点已补齐。

### 其他风险复核

- 目录新范围的清理沿用版本 bump、dirty 处理和后续发现机制；metadata 仍只是失效提示，实际解析直接读取原文。
- 原监听/timer 清理、部分订阅失败清理、raw/metadata 分离、最大等待、溢出重扫及晚到读取跨 rescan/dispose 的用例均保留并通过。
- 可见写入仍在验证提交后发布路径失效；草稿失败或 abort 后不发布正文/失效。新增修复未改变这些边界。
- app 每实例拥有 adapter；卸载先停 adapter/事件端口，archives 订阅绑定 lifetime。分区、模块公共边界和懒加载未因本次修复改变。
- 当前未发现新的 blocker、major 或 minor finding。此结论限定于冻结范围，不代表全工作区或宿主真机已验收。

## Specification Axis

Result: pass

| 合同 | 结论与证据 |
|---|---|
| AC-121 | pass（服务接缝）。目录移入/移出、md↔txt、真实 adapter 链路保持通过；D2 库内/库外用例证明目录 rename 旧、新范围的附件依赖均正确更新。 |
| AC-122 | pass（服务接缝）。raw modify 先于 metadata 时读取新 frontmatter，后到 metadata 不回退到旧 cachedRead；runtime 仍有版本、路径与 epoch 校验。 |
| AC-123 | pass。modify 风暴合并、最大等待、容量溢出 rescan 通过；D1 证明目录/文件同路径复用不再吞掉目录 delete，真实索引移除已删除子实体。 |
| AC-124 | pass（自动化接缝）。监听与 timer 释放、部分初始化失败、旧读跨 dispose/rescan 及错误代际回归通过；同一生命周期入口的 10 个场景通过。真实宿主同步仍待用户验收。 |

范围符合 archives 首个接入及 OOS-008，未迁移其他模块监听。本轮修复在 host/file-changes 与 archives/services 写集内；main/module 等共享入口保持冻结内容，未扩大实现范围。

### 保留的规模待验收

TASK 明确既有规模脚本在 HEAD 也失败；原 030 与 034 报告保留 first.isComplete 失败。本次没有重跑会写 scripts/tmp 的 pnpm 规模包装，也没有删弱断言或宣称完整 1000/5000 数据规模、性能无退化。修复未修改 runtime、规模入口或索引实现，沿用已提供的基线结论；规模验收仍由 Lead/原 owner 处置。这不是本次发现的新缺陷，也不因 D1/D2 关闭而消失。

## 产物与验证

唯一写入产物为本 REPORT；未修改业务文件、TASK、正式 Ticket/Evidence/Map/Goal、依赖、生成物，未执行 Git 写操作、提交、推送或发布。

| 亲自执行的命令/检查 | 退出码 | 实际结果 |
|---|---:|---|
| `sha256sum -c -`（TASK 7 路径）及后续 Python 原始字节复核 | 0 | 7/7 匹配。 |
| `pnpm exec vitest run src/host/obsidian/file-changes src/modules/archives test/golden/archives-v2.test.ts test/golden/archive-relation.test.ts src/app/main-events.dom.test.tsx src/host/obsidian/feedback.dom.test.tsx` | 0 | 13 文件、78 项通过，含 host 5、binding 13 及黄金样本/main/反馈回归。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 首次 126；复跑 0 | 首次仅 health/module.ts:52 的 Vault.on 联合事件类型重载错误；范围外并行代码更新后复跑通过。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 首次 126；复跑 0 | 首次 health/core/scanner.test.ts:54 mock 类型错误及上述 module.ts 错误；相关代码更新后复跑通过。未修改这些文件。 |
| `pnpm run lint` | 0 | 全仓零警告通过。 |
| `pnpm test:architecture` | 0 | 1306 模块，无分区、host-package、desktop-only、barrel 或循环违规。 |
| `node --input-type=module` 内存编译并执行 `scripts/verify-workbench-lifecycle.ts` | 0 | 原入口 10/10 node:test 场景通过。 |
| `validate-specdev.mjs --review-scope --repo /home/wta/projects/obsidian-huhu --mode working-tree --base 29644dc5833bb209e6282f84fa71441a5a1b99d4 --file <逐个传入 TASK 7 路径>` | 0 | base/head 与范围确认成功。 |
| `git diff --check 29644dc5833bb209e6282f84fa71441a5a1b99d4 -- <TASK 7 路径>` | 0 | 已跟踪差异空白检查通过，新增文件另经直接读取及测试/type/lint 覆盖。 |

生命周期执行使用 esbuild `bundle:true, platform:'node', format:'cjs', write:false`，再以 CommonJS Module `_compile` 运行；`/tmp/huhu-t04-rereview-lifecycle-memory.cjs` 仅为内存模块 locator，未落盘。未运行会生成 scripts/tmp 文件的 pnpm 包装。

未验证：规模全量结果、真实 Obsidian 文件同步/目录事件；未执行 build、build:css、notices、全仓 pnpm test 或 UI runner。构建产物、包体和来源登记集成由 Lead 按原边界处理；E2E disposition 为 not-required，不以服务测试冒充真机验收。范围外类型复跑通过仅表示该次工作区检查结果，未将其他票纳入本票审查结论。

## 问题与下一步

无本次复审执行阻塞或待修复 finding。Lead 可接收 D1/D2 已关闭及双轴 pass，继续正式 Evidence、规模基线处置与共享产物集成；整票保持必要的待验收项，Status completed 仅表示本次审查回报已交付。
