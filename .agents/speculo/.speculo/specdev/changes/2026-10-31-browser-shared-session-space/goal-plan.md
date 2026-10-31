---
schema_version: 8
artifact: goal-plan
change: 2026-10-31-browser-shared-session-space
status: draft
modes:
- high-assurance
- reference-conformance
- release-coordination
orchestration: lead-directed
lead: issue-38-docs-prototype-session
integration_attempt_limit: 3
ticket_execution: auto
ready_for_execution: false
---

# Goal Plan：单一共享浏览器替换

## 1. Outcome and Authority

本轮 Outcome：形成可评审完整文档和离线原型，交付一个指向 dev 的文档 PR（远程工具阻塞，未完成）。后续产品 Outcome：一个 Space 一套 Session，同一 pageId 人/Agent 共享同一 guest；旧链完全退出。只有渲染 webview、仅 Cookie 相同、mock 全绿、写了很多票、或 PR 已合并都不是产品完成。

非目标：本轮实施、合并、关闭 Issue、迁移/清理真实用户数据；不重写 #36 Bot 引擎或 #37 全局 Shell。

权威顺序：用户最新明确决定 → 本 change ADR/CONTEXT → 适用永久知识（冲突回 owner）→ Spec 外部合同 → Ticket 局部执行 → 实际固定代码/环境事实。DESIGN-0002 是视觉基线，当前 DESIGN 为增量草案；研究来源在 reuse-analysis，不因借鉴而把第三方行为自动升级合同。

## 2. Execution Graph and Waves

DAG 直接读取 tickets-map 和各票 frontmatter，不复制状态。

| Wave | Ticket | 门槛 / 汇合 |
|---|---|---|
| W0 | T-01 | 实施/探针授权 + 一次性 Vault；关闭 G-HOST |
| W1 | T-02 → T-03 | 同 Space 的真实人工浏览/唯一页/窗口归属；关闭 G-HUMAN |
| W2 | T-04 → T-05 | 可信交接/最终 fence/结构化动作；关闭 G-CONTROL |
| W3 | T-06 → T-07 → T-08 → T-09；T-10 按前置 | 认证、文件、材料、内部/既有外部消费者；关闭 G-INTEGRATION |
| W4 | T-11 → T-12 | 删除恢复、全链切换与物理删除；关闭 G-CUTOVER |
| W5 | T-13 | 固定交付 commit 的全部实机矩阵；关闭 G-RELEASE |

关键路径含宿主→人工→页→控制→driver→权限→文件→材料/消费者→删除/切换→最终验收。并行仅在 API 与精确资源 claims 稳定且无语义冲突后由 Lead 决定，不为提高并发预造第二工作区。

## 3. Gates and Completion Evidence

| Gate | 开启条件 | 关闭证据 | 阻塞范围 | 失败恢复 |
|---|---|---|---|---|
| G-DESIGN | 用户看到本次 HTML/合同 | D-013 真实确认并绑定内容摘要；官方原型校验 | 依赖新 UI 的 Ready | 保留草案与反馈，改后重新验证，不伪造批准 |
| G-HOST | T-01 获准 | F01–F12、支持版本组合、唯一 surface、consumer/deletion inventory | 后续产品实施 | 改测另一表面或阻断；绝不 Native fallback |
| G-HUMAN | T-02/03 固定输入 | 隔离/完整重启/同页/窗口/原生输入 | 控制与集成 | 保留证据，回实际 owner 修复 |
| G-CONTROL | T-04/05 | 同 guest 四段交接、竞态撤权、未知效果、ref、个人拒绝 | Agent 相关消费者 | 拒绝执行，不放宽 fence 或重放未知 |
| G-INTEGRATION | T-06–10 | 认证/文件/材料与一个真实 Agent + 既有 CLI 闭环 | 最终切换 | 回收准确消费者范围，拒绝旧 adapter 兼容 |
| G-CUTOVER | T-11/12 | 清理故障恢复、旧源码/产物/发行清单清零（历史说明例外） | 合入新产品 | 构建保持失败，修真正依赖；数据默认保留 |
| G-RELEASE | T-13 | B01–B40/F01–F12、跨平台与预算/许可/产物一致 | 宣称完成/关闭 Epic | 未测项不勾通过；条件不满足停止发布 |

本轮交付门与产品门分开：文档可以完成生成并评审；远程 PR 必须有真实 URL/base/head/文件清单回读才算已提交。用户未批准新原型与未有真实 P0 时 ready_for_execution 必须 false。

## 4. Execution and Integration Protocol

执行入口：获准后读取 specdev-i-implement/SKILL.md 与项目 dev/ui 及适用参考；Goal 本轮只 plan。Lead 唯一负责正式状态、Evidence、公共接口整合和最终判卷。执行者只交候选快照与真实结果，不自写第二套状态。默认 ticket_execution:auto，未规定人数/票数上限，不凭票数 invent agent 限制；当前没有团队或独立审查运行事实。

工作区唯一事实由 README Execution Context 持有。本轮为本地文档目录，不冒充 git checkout。未来使用一个真实 change workspace，固定 commit 或未提交摘要执行；Git index/共享接口/全局验证串行，所有执行者复用同一选择。

| 动作 | 当前授权/状态 | 范围 |
|---|---|---|
| 文档/原型写入与离线验证 | allowed | 本 change；不改产品与永久知识 |
| 文档 commit/push/PR | 用户 allowed；工具 blocked | 一个新分支 → dev，一个 PR；不谎称已提交 |
| 产品/宿主探针实现 | not-authorized | 等明确后续授权；本轮不执行 |
| Merge/Issue close/release | not-authorized | 无自动关闭关键字 |
| 用户数据删除/迁移 | not-authorized | 不能从“无兼容”推导 |
| 新 worktree/清理他人分支 | not-requested | 不执行 |

执行时 dispatch 必须带原 Ticket、最新固定来源、精确写集、必需 skill hash、资源 owner、当前 Gate 和 evidence 目标。Lead 核验输出，按风险执行双轴审查与 E2E；没有独立审查能力时如实标记，不自称独立通过。

## 5. Constraints, Risk and Recovery

不可协商：同一真实 guest；不共享 defaultSession；不保留旧 runtime；不放宽网页安全；不混淆 unknown/未执行；不误删终端/Bot/通用服务 lease；用户旧数据不静默删除；原型不作为实际宿主证据。

发行顺序见 migration-and-deletion。失败最多三次集成尝试后 Lead 停止盲修并复盘证据/范围/根因，保留真实状态；该上限不是跳过门禁许可。变更 API/风险/数据/范围/验收时回 Spec/ADR 的真正 owner，而不是在 Goal 偷改。源 Issue、dev 或设计基线漂移时新增来源快照，失效内容重审，保留既有证据而不覆盖历史。

## 6. Progress and Decisions

当前：文档与离线原型工作；G-DESIGN 待用户，G-HOST 未运行；无任何产品 Gate 通过。Ticket 具体状态只回原票。本次 remote PR 工具阻断记录在 delivery/remote-receipt.json。

下一步：集中评审 DESIGN/推荐 A；在真实可写仓库应用补丁、运行官方 SpecDev 检查、固定最新 dev 并提交文档 PR。实施仍需要新的明确授权。恢复从 README → Goal → 当前票 → 原证据开始，不能只从摘要/百分比继续。

## Assumptions and Execution Policy Source

低影响假设：离线原型示例内容完全虚构，所有网络/文件/授权效果仅内存模拟。高影响未知（宿主、支持组合、surface、UI批准）明确保持门禁打开，不使用假设绕过。

策略来自本轮用户来源和 SpecDev Goal v8 模板；默认 auto、单 Lead、3 次集成尝试。未指定并发人数，故不填固定人数；未授予产品实现，故不 run。
