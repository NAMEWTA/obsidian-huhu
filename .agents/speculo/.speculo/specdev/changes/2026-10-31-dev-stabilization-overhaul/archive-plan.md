# 本次收尾：计划与结果

范围：2026-10-31-dev-stabilization-overhaul 的 archive-single 知识维护部分（永久 ADR、context、当前 docs）。不含 change 目录移动与 archive-receipt（由 Lead 执行）、不含 design/（DESIGN 网关另行处理）。
Owner 与依据：Lead host:claude-code/root 授权，执行者为 A 知识沉淀子任务；依据 `evidence/T-45.md`「待 A 网关处理清单」、`evidence/report-legacy-removal.md`、ADR-010/011、LOG-020–029。
结论门：change Outcome 为 completed（LOG-028）；release 工作流 not-applicable，真机项由用户验收（LOG-012）。
授权：用户明确授权在本 change 收尾中修订并沉淀永久 ADR 与 context；禁止 git 写操作（本任务未做）。before-image 即 HEAD 版本，可由 git 恢复；下表给 SHA-256 前 16 位。

## 资产计划与结果

| 资产 | 源/目标 | 动作或无变更依据 | 批准与 before-image | 验证/恢复 |
|---|---|---|---|---|
| change | `changes/2026-10-31-dev-stabilization-overhaul/` | 本任务只新增本文件；移动由 Lead 做，未写 archive-receipt | — | 目标 `changes/archive/2026-10-31-dev-stabilization-overhaul/`；新 ADR/context 的来源链接暂为纯文本，移动后可改为链接 |
| ADR | `adr/2026-10-31-huhu-bot-architecture.md` | 完整替代：状态改 Superseded，指向新 ADR-001；正文保留（含 ADR-027 持久性） | `22da450b2d0eeb6c` → `70da0d2bf2e5` | 回读通过；ADR-001–027 对象（huhubot）已删，无存续消费者 |
| ADR | `adr/2026-10-31-home-cookie-restore-deadline.md` | 完整替代：Superseded by 新 ADR-003（原则）与 ADR-001（网易云删除） | `45c9c93fc9e9f7b2` → `e1d024108648` | 回读通过；“迟到 Cookie 不得登录/计时器属所属窗口”已并入新 ADR-003 |
| ADR | `adr/2026-10-31-unified-browser-versioning-archives.md` | 部分替代：ADR-004、006 标 superseded；ADR-001 的 v1 兼容/迁移条款加 2026-11-04 修订；H1 去“浏览器”；ADR-002/003/005 保留 | `f475baf14b2e25f1` → `f0f999912723` | 回读通过；文件名与编号不变 |
| ADR | `adr/2026-10-31-agent-workbench-refactor.md` | 部分替代：ADR-005 superseded；ADR-008 旧布局保全句修订；ADR-002/003/004/006/007/009 保留 | `b7ca6a00d352bd59` → `c51e9958b6c3` | 回读通过 |
| ADR | `adr/2026-10-31-highlight-first.md` | 修订 ADR-001 迁移句（评论 v1/v2 迁移与备份已删，现行只认 version 3）；其余保留 | `079a38377bfe0509` → `ede165012301` | 核对 `comments/core/store.ts` 仅接受 version 3 |
| ADR | `adr/2026-11-04-dev-stabilization-overhaul.md`（新建） | 毕业 6 条：ADR-001 产品线收缩（change ADR-010）、ADR-002 发布前无兼容义务（change ADR-001+011，含设置只留当前字段、旧数据走无效路径不改写、有效期止于首次正式发布）、ADR-003 可选初始化不入关键路径（change ADR-005）、ADR-004 默认路径固定英文（change ADR-006）、ADR-005 Hook 序号/槽位/收集器策略（LOG-028，从 LOG 提升）、ADR-006 helper 握手必需能力（LOG-029） | 新文件，无 before-image | 回读通过；seq 取 `process.hrtime`、全局槽位随机起点已对照 `hook-spool.ts` 核实 |
| ADR | `adr/INDEX.md` | 重写：增状态列与新条目 | `e53a8789a43c88b7` → `1ce4127b681a` | 回读通过 |
| context | `context/2026-10-31-huhu-bot-architecture.md` | 完整替代：加 Superseded 说明，术语保留 | `f6401dac575f83f3` → `249c1483b584` | 回读通过 |
| context | `context/2026-10-31-unified-browser-versioning-archives.md` | 部分：H1 去“浏览器”；“迁移权威切换”“Staged 关系”适用范围收窄至自定义类型 schema 升级迁移 | `aa48a355ff4ace4b` → `55fcf2774a4a` | 本文件原无浏览器术语；代码确认 `migrations/` 通用机制仍在 |
| context | `context/2026-10-31-agent-workbench-refactor.md` | “共享网页视图”标注已失效，其余术语保留 | `616df87bc9cab64a` → `1e5023cea43e` | 回读通过 |
| context | `context/2026-10-31-highlight-first.md` | 无变更：术语（高亮、摘录卡片、行级批注、脱离）与现行 comments 代码一致 | `b455d3b7cdeb7df3` | — |
| context | `context/2026-11-04-dev-stabilization-overhaul.md`（新建） | 毕业 9 条术语：产品线收缩、预发布旧数据、兼容层、网页快捷卡、启动关键路径、显示名称、稳定身份、运行时名称快照、Hook 发布序号 | 新文件 | 回读通过；未与既有术语冲突 |
| context | `context/INDEX.md` | 重写：增新条目与状态说明 | `bc87d27941fdec4f` → `504e05f2e996` | 回读通过 |
| docs | `docs/architecture.md` | 删“v1 只留在适配边界” | `35cffecce72a6d56` → `7ef44cdea8e0` | 适配器已删（634099e） |
| docs | `docs/data.md` | 邮箱 `inbox` 改为必需（缺失按无效记录）；删“不覆盖旧 workspace.json/旧定义保持未绑定/无空间时网页仍可打开” | `936d5374c9240d66` → `1de6ab8f7a5d` | 对照 `space-service.ts` inbox-invalid |
| docs | `docs/workbench.md` | 布局文件改为 `workbench-v2.json`，删网页恢复 | `1cba71704d11682f` → `25c8cc8c1bce` | 对照 vault-layout.ts 与 data.md |
| docs | `docs/agent-workbench.md` | helper 握手补“缺必需能力同样失败” | `b581a797bb1bbca7` → `5fdd908c7983` | 对照 `helper.ts` |
| docs | `.agents/skills/dev/references/testing.md` | 补 vitest `maxWorkers: '50%'` 的原因（仅 reference，不在 SKILL 摘要绑定内） | `1de0d612bb493a46` → `9b418f8f27b4` | 与 `vitest.config.ts` 一致 |
| DESIGN | — | 本任务不处理，交 DESIGN 网关 | — | revision 3 的 UI 删除范围由 Lead 另行判断 |

## 无晋升候选及依据

- Runner 停止四阶段、检查点维护、依赖传递闭包（change ADR-002/003/004）、Bot Profile 隔离（ADR-007）：对象随 huhubot 删除，反毕业（已失效）。
- 旧目录保护（ADR-008）、Browser 冻结（ADR-009）：被 ADR-011/010 取代的中间决定，留在 change。
- vitest worker 上限：config 注释已是权威，单次事件，只在 testing.md 补一句，不另建 context 经验条目。
- 删除误伤 replaceData 的教训：单次事件，并入新 ADR-002 验证段一句，不独立成条。
- 来源 context 的证据等级、用户真机验收、设计发布例外、合同集成批次、fixture 性能趋势：过程语言，反毕业。

## 执行检查点

A0–A2 范围、授权、before-image 固定（见上表）。A3 现役 docs/ADR/context 维护已完成并逐项回读；`pnpm test:docs` 退出 0（1380 个 Markdown）。A4 不适用。A5 未做删除类清理（失去对象的条目按 supersede 保留）。A6–A8 未执行，归 Lead。

## 恢复与余项

- 所有修改均相对 HEAD，可由 `git diff`/`git checkout` 恢复；本任务无 git 写操作。
- 新 ADR/context 的来源路径为纯文本（目标目录尚不存在会触发 `test:docs` 断链），change 移到 archive 后可改为 Markdown 链接。
- 未处理：`docs/safe-notes-polish.md`（历史报告，含 v1/v2 保险箱升级描述）、`.agents/skills/dev/SKILL.md` 第 79 行“持久化变化：保持格式兼容”与 ADR-002 表面冲突（改 SKILL 会改变绑定摘要）——均交 Lead 决定。
- 工作区另有他人未提交改动（helper.ts、host.ts 等）；握手能力清单因此在 ADR/docs 中不列名。
