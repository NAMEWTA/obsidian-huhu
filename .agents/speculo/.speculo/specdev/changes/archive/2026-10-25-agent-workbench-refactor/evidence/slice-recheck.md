# 跨票切片验收复核

Reviewer: native:/root/review_runtime_contracts
Requested/accepted model: gpt-6-astra / high（沿原派遣；本次 follow-up 未产生新的模型覆盖）
Mode: 只读定向复核当前未提交规划修订
Scope: Spec §11、Goal GP-002、Map revision 3 §4，以及 T-01/02/03/06/07/08/10 的职责、验收及执行分工。

## 结论

standards: pass；specification: pass（仅本次规划修订范围）。

上轮 `RUNTIME-SPEC-01 / P2` 可以关闭。未发现本次分配范围内仍成立的语义验收循环，未发现五项重分配 AC 的行为被删掉。当前正在实施的 T-01 产品代码、测试结果及是否可宣布 codepass **不在本次审查范围**，本报告不能替代该票独立代码审查。

本次用户明确接手真实端到端，优先于旧 Skill/票据的真实宿主要求；不因旧模板文字重新要求用户批准或阻塞代码工作。

## 关闭上轮 P2 的依据

| AC | 先行票的必需本地贡献 | 完整组合代码责任 | 判断 |
|---|---|---|---|
| AC-002 | T-02:67：Space ID、布局键、持久归属不按 cwd 合并 | T-10:68：同 cwd 两 Space 的邮箱记录，经 CLI/UI 查询隔离 | 原循环解除，身份与邮箱检查均保留 |
| AC-004 | T-02:69：GUI 引导及生产目标解析，不猜 Space | T-07:70：真实 CLI 命令入口的缺目标/同名歧义黑盒 | 原循环解除，GUI 与 CLI 均有责任方 |
| AC-006 | T-03:70：生产运行用例后台创建，可查且不抢焦点 | T-07:68：CLI 调用 T-03 用例创建无 Pane 的 B | CLI 不再阻塞 T-03；生产用例不能推迟 |
| AC-021 | T-06:69：状态来源、unknown、原生待处理入口及不自动审批 | T-08:70：blocked/unknown/不支持能力下普通协作输入拒绝与不重放 | 状态和输入组合两端仍完整 |
| AC-046 | T-02:70：Space/Session 元数据提交失败，不发启动请求，旧数据保留 | T-10:66：通知/ack故障与前序持久化故障证据组合 | 保存失败不成功、不启动和通知失败均保留 |

Map:174–180 明确早票贡献仍为必需检查，不能单独宣称整个 AC 已通过；最终 owner 要回读前序有效证据并运行新增组合。Goal:66 将逐票完成门限定到当前票可产生的生产能力、自动化与审查，明确不要求先实现后继 CLI/邮箱。最终组合 owner 都位于其先行贡献之后，未新增反向 blocked_by。

T-06:79 还专门将普通协作输入 CLI 组合移交 T-08，而保留状态适配器、审批定位和权限保留的自动化，因此没有靠删除旧负例消除循环。

## T-01 完成门的正确解释

T-01 的 AC-057/059 主责任没有移走。`E2E disposition: not-required`（T-01:79）只指 Agent 不执行用户接手的真实端到端，不等于本地验证可省略。Spec:441–443、Goal:112/120/220 的新分工优先。

T-01 宣布本地 codepass 前仍应具备：

- 实际 Agent、Browser 与宿主 native owner 的生产接线完成；不能仅交一个未被消费者使用的租约类。
- 本地自动化覆盖 Browser 请求/租约在 Agent 停用后仍有效、最后 owner 释放才关闭、重复 release/关闭竞争、迟到 acquire/启动、helper crash 的失败传播与清理。
- 未使用 Agent 能力时，生产模块路径不会扫描、下载或启动 helper/Provider/PTY；移动端/非 Agent 页面相关轻量边界有自动化或静态约束证据。
- 原适配消费者回归、适用类型/架构/包体、build/lint 及独立双轴代码审查按实际改动完成；失败不得以人工验收转交为理由跳过。
- 真实 Obsidian、真实 Provider、用户原生审批及五平台实机保持“未运行，交用户”；不妨碍本地代码完成，也不能记成 passed。

T-01:79 已明确无 Space/Agent-off 的完整网页入口、标签及恢复归 T-13，不能把 T-13 尚未交付当成 T-01 依赖。T-01 的 Cookie/native 租约隔离仍须在本地真实生产调用链上自动化验证；无需整套 Obsidian 实机场景。

以上是合同解读与后续验收标准，不是对正在实现代码或已有测试的通过声明。

## 最小文字修正建议（非阻塞，不构成新 P2）

1. **旧主责任摘要：** T-02:40、T-03:40、T-06:40 仍把已移交 AC 写作“主验收责任”；T-07:40、T-08:40、T-10:40 又没有列入新责任。最小修正是统一写“主要代码责任以 frontmatter/Map §4 为准，本地贡献见验收标准”，避免维护第二份 AC 清单。明确的新 Map/checkbox 已消除了行为歧义，故这不是仍存循环。
2. **旧实机场景标题：** Goal:124–128 表头仍称“不可替代的关闭证据”，但其中混有真实宿主/人工审批；Goal:120 已明确这些是人工清单且不阻塞代码。建议把表头改成“本地代码关闭证据与用户人工场景”，或每行在实机句前加“用户待验收：”，避免截取单行派单时丢失 §11 的优先级。
3. **T-01 路线措辞：** T-01:62 的“真实 Cookie 请求与 PTY 并行证明”宜标注“可在本地隔离集成自动化完成；真实 Obsidian 场景见用户清单”。这保持本地集成责任，也避免把它误读成必须先完成整套宿主 E2E。

不建议为上述文案重新拆票、改变当前 serial 或再向用户询问已经明确的验收分工。

## 观察与限制

- 当前工作区已有 Lead 的规划修订与 T-01 实施活动；没有把它误记为干净工作区。
- 本 reviewer 只读取任务指定规划文件和它们的 git diff，没有读取或审查新增 T-01 实现，没有运行测试、构建或校验器。
- 没有修改项目文件，只写本报告 `/tmp/huhu-slice-recheck.md`。
- 已复用上轮读取的适用 review/dev 规则；最新用户分工由 Lead 本次派单及 Spec §11 回读核对。
- 本报告只关闭上述定向规划 finding，不宣称全 change 新快照已完成独立代码审查。

## 当前读取摘要

HEAD（仅定位）：33c21e098ef3188cbab5a09f3e0a01fadb787715。

以下为完成复核时的原字节 SHA256；当前是活动工作区，后续再改动须按影响复核，不能复用上轮旧 Input-SHA256。

| 文件 | SHA256 |
|---|---|
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md` | `baaabd4bc676c2cc969c5d29a2dc90bd49172e2d71dc3c7de2c01153271c34c6` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/goal-plan.md` | `02495cf3489b64f374143828e1a4cfeca4531e2208dd1c33ea742d7cb16524bd` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md` | `6ab8f22aeecef60a8a2ef9419eef808d70e3eea617fd0ad89a7f86e31cf811e9` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/01-native-owner.md` | `aff7d0d08e62b008259c75f9c1a183d209eb26645dc0d44c4d6905490c7d8d73` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/02-space-identities.md` | `18727735afbefd00462210f004aecfc56232891aace9afd3eff48c31db41de64` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/03-managed-runtimes.md` | `2dc79eac1a2890ac81aea23481af81b8a90c3d9f351c76cb811ea7d0f33b56b1` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/06-activity-and-approval.md` | `f74025ac4cc80c340e3e1b75ec3c4a31b7d3dc4aa47a6a15f069a4f21d9c2740` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/07-local-cli.md` | `1d9fc99b4d6f58b39c76c1489862fe97ac5cff8cb1b1678ae3230b33feb33017` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/08-terminal-coordination.md` | `f433a1c0a20ed3c602ac1f6a5916d77f43f93af6fcd559087c190aaa9bed6c51` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/10-passive-inbox.md` | `b3e7055ecc0308c0171ca0b7e73a284cc1800450cc21bdd1f4933b3c77c8602e` |
