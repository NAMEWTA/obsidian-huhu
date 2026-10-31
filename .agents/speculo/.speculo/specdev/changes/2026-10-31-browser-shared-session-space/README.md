# #38 浏览器共享 Session Space：文档与原型交付

**Outcome：active；本次范围：仅规划、设计与离线原型；产品实施未授权。**

| 项目 | 当前事实 |
|---|---|
| 仓库 / 目标分支 | NAMEWTA/obsidian-huhu / dev |
| 读取基线 | `974105b47e03c108df0f5e0c3fc9606fe4b79aee`，2026-10-31 从 GitHub dev 获取；交付前复核见 delivery/remote-receipt.json |
| 来源 | Issue #38 完整正文、0 条评论；本轮用户要求先文档后实施 |
| 设计基线 | DESIGN-0002；digest `1aa986e5c576aef9e590e473695941c8ad7812570df100b7edfe2d21f421f9cb` |
| 指定视觉参考 | stabilization-overhaul / prototypes/UI-001；保留圆角、字号、留白、侧栏、控件和动效规则 |
| 现在交付 | 来源、分诊、设计树、上下文/ADR、规格、复用研究、13 票、总计划、离线原型及校验记录 |
| 尚未交付 | GitHub 远程 PR；现有连接只读、容器无法解析 GitHub；没有远程分支/commit/PR 回执 |
| 不宣称 | 产品已重构、宿主门禁已通过、三平台支持已验证、用户已批准设计、官方 SpecDev validator 已通过 |

## 阅读路径

1. 产品与取舍：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/triage.md</Path> → <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/CONTEXT.md</Path> → <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/ADR.md</Path> → <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/spec.md</Path>。
2. 架构与复用：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/baseline-and-impact.md</Path>、<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/reuse-analysis.md</Path>、<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/architecture.md</Path>、<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/api-contract.md</Path>。
3. 设计与原型：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/DESIGN.md</Path>；离线入口 <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/prototypes/UI-001/final/index.html</Path>；三个同风格布局比较 <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/prototypes/UI-001/comparison/index.html</Path>。
4. 实施准备：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/tickets-map.md</Path> → <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/goal-plan.md</Path>；验收见 <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/acceptance-matrix.md</Path>，清理见 <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/migration-and-deletion.md</Path>。
5. 实际交付状态：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/validation/report.md</Path>、<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/delivery/PR-body.md</Path>、<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/delivery/remote-receipt.json</Path>。

## 工作流应用记录与状态

| 顺序 | Work / mode | 本轮工件 | 停止位置 |
|---|---|---|---|
| 1 | specdev-t-triage / intake | source、triage、用户来源快照 | 来源已冻结；实机 verification pending |
| 2 | specdev-g-grill-with-docs | design-tree、LOG、CONTEXT、ADR | 复用 Issue 已明确决定；新设计整体确认待用户，不标 consensus |
| 3 | specdev-p-prototype（补充） | DESIGN 与 UI-001 | 用户指定参考；生成同体系三个布局；approval pending |
| 4 | specdev-s-spec | spec、验收矩阵 | 完整草案；ready_for_tickets=false，未假装执行门禁关闭 |
| 5 | specdev-t-tickets | map、13 张 future draft 票 | 完整拆分，不是 Ready 实施队列 |
| 6 | specdev-p-goal-plan / plan | Goal v8 | 跨票顺序/所有权/恢复完整；ready_for_execution=false；未 run |

入口均位于 `.agents/speculo/workflows/specdev/`，固定到读取基线；详细来源和实际应用见 LOG。读取 skill 不等于通过它的所有完成门；本文明确保留用户确认、官方验证和宿主证据缺口。

## Execution Context

当前工作区是本轮生成的 **add-only 文档工件目录，不是已 checkout 的 dev 仓库**。通过 GitHub 连接器读取固定 SHA 源码；没有安装项目依赖、改生产源文件、构建插件或执行真实 Obsidian。文档补丁只增加本 change，未改另一 change 或永久知识。

后续实施获准后：先读取最新 dev 和来源漂移，用一个真实 change 工作区；由 Lead 记录实际 checkout/branch、commit 或未提交快照及 writer。默认 current，用户未要求时不创建多 worktree；按 DAG 无冲突票才并行。不能把本地文档目录当成已经执行过的代码工作区。

## 本轮评审问题与接续

唯一需要用户本轮确认的是：是否接受推荐 A 布局与 DESIGN 中的浏览器交互增量；B/C 仅改变信息布局，均沿用同一视觉语言。见 <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/review-request.md</Path>。无需重新确认个人 Space 禁止 Agent、Cookie 导入后置、无兼容等 Issue 已定事项。

P0 中唯一生产表面、支持组合和清理 API 是可发现事实，必须由未来 T-01 实测，不能让用户凭感觉回答。设计确认不等于实施授权。远程提交缺口见 delivery，保留可应用补丁，不伪造 PR。
