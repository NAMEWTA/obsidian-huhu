---
schema_version: 3
artifact: triage
change: 2026-10-31-dev-stabilization-overhaul
mode: intake
disposition: ready-for-human
verification: pending
remote_actions: []
source: <Path>{roots.state}/specdev/changes/{change}/source.md</Path>
classification: mixed
risk: high
route: specdev/grill-with-docs
ready_for_implementation: false
updated_at: 2026-11-02T03:20:00Z
---

# Triage: dev 稳定化、性能修复、全界面统一与产品线收缩（#41）

## 当前判定

- **来源：** `source.md` 为 Issue #41 的冻结快照（维护者即仓库 OWNER 发布），是本 change 的唯一需求来源。
- **影响：** 两条主线。稳定化与修复主线跨 Windows Hook 发布链、首页与天气异步生命周期、可见功能缺陷、失败诊断、全插件 UI 统一、包体预算与来源文档；删除主线整体删除 Browser、huhubot（含 superbot 方向）、Home 网页嵌入分区与网易云音乐，触及插件入口、原生运行时、合同、构建发行链、CI、测试与文档。涉及用户资料目录与发布门禁，事故半径大。
- **紧急度：** scheduled。没有已观察到的数据丢失；删除主线的风险在于残留入口、构建断裂与当前格式功能回归；旧数据保留不再是验收责任（ADR-011）。
- **请求是否成立：** 成立。未发现重复 change 或既往拒绝；本 change 已在执行中，票号与验收条目沿用（见 tickets-map.md）。
- **当前证据：** 已完成票的固定 commit、命令与退出码见各 `evidence/T-xx.md` 与 `docs/e2e/dev-overhaul/ledger.md`。删除主线的命中范围见 `removal-inventory.md` 初稿（规划期只读检索，T-39 在实施前逐文件确认）。

## 未知项

- **可发现事实：** Windows CI 是否真正执行到 32×3 Hook 用例（T-12）；启动与规模采样在三平台的结果（T-20）；`workspace-service-stop-native` 偶发失败结论（T-22）；包体结构减重后的余量（T-37）；删除主线逐文件盘点结果，以及用户主动保存看板时是否丢弃旧网页分区配置（T-39）。
- **需要用户决定：** 无。D-001 至 D-021 均已形成决定（D-021 网页快捷卡保留已于 2026-11-02 确认）；删除主线开工仍需用户明确授权。
- **低影响实现细节：** 诊断字段命名、fixture 目录组织、各删除票内的提交切分。

## 路由

- **下一 Work：** 保留票按 `goal-plan.md` 推进；删除主线获授权后从 T-39 开始按 T-39 → T-46 顺序执行。
- **理由：** 规格、票据与设计合同均已就绪（spec `ready`、DESIGN revision 3 `approved`），无需再次访谈；单一 change 同时承载两条主线，避免出现第二套进度真相。

## 实施简报

- **现状与目标：** 目标与范围见 `source.md`（#41 §1–§2）；验收以 `spec.md` 的验收合同为准，账本编号沿用 `docs/e2e/dev-overhaul/ledger.md`。
- **核验：** 本轮只更新规划文档；未运行生产构建或测试，因此 verification=pending。已完成票的核验结论以各自 Evidence 为准。
- **范围与实现方向：** 稳定化主线按 #41 W0、W3–W8 与 tickets-map 的批次推进；删除主线按 #41 R1–R8（T-39–T-46）推进。不包含新增 Agent 业务能力；不换技术栈、不改插件 id、不重写终端或编辑器；不为已删除功能保留占位或兼容分支。
- **验收：** 以 `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>` 的验收合同为准，对应 #41 §3。
- **风险：** 删除主线遗漏入口或产物会造成构建断裂；未正式发布的旧目录、旧配置和旧会话不要求保留或兼容（ADR-011）；当前有效数据写入与权限安全继续验证。UI 与删除工作分批进行，包体预算由 T-37/T-38 收口。

## 打标回执

未请求。`<Path>.agents/speculo/config.json</Path>` 没有 `github.labels` 映射，即使请求也会阻塞远程打标；本地分析不受影响。本分诊未对 #41 执行评论、标签或关闭操作。
