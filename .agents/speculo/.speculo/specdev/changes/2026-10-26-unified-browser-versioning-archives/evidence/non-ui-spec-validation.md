# 非 UI 规格与决策文档验收

## 范围与依据

用户确认 round 2 的四项建议，并明确要求先完成 Spec、ADR、Context、Log，UI 后处理。LOG-006–LOG-010 保存逐项回答与共识；设计树 D-001–D-008 均 answered，本轮非 UI consensus。

修改仅限本 change 的 spec.md、ADR.md、LOG.md、CONTEXT.md、contexts/browser.md、contexts/versioning.md、CONTEXT-MAP.md、design-tree.json、README.md、triage.md 与本记录。已有生产合并提交和来源快照不变，未改写永久知识、并行更新的 Speculo 方法文件或其他工作区文件。

## 一致性核对

| 决定 | 原节点/日志 | 决策合同 | 验收 |
|---|---|---|---|
| 显式开启自动历史、含未保存内容、5 分钟/30 天/1 GiB、保护恢复引用 | D-005 / LOG-006 | ADR-003、versioning Context | AC-017、AC-034 |
| Windows x64、macOS ARM64/x64、Linux x64 四组 | D-006 / LOG-007 | ADR-004、Spec 浏览器行为 | AC-012 |
| 档案写入遇原生草稿冲突拒绝，保留表单草稿 | D-007 / LOG-008 | ADR-005、archives Context | AC-020、024–026、033 |
| Cookie/Identity 必需，localStorage/IndexedDB 条件扩展 | D-008 / LOG-009 | ADR-006、browser Context | AC-007 |

既有 AC-001–032 保留编号，新增两个合同细化高风险的原生草稿和保留清理路径。关键数值来自用户采纳，不宣称性能实测。

## 验证

| 检查 | 结果 |
|---|---|
| validate-specdev --stage triage | 退出 0；0 errors / 0 warnings |
| validate-specdev --stage grill | 退出 0；0 errors / 0 warnings |
| validate-specdev --stage spec | 退出 0；0 errors / 0 warnings |
| pnpm test:docs | 首次发现 browser Context 的 ADR-006 章节链接不匹配；修正后退出 0，507 Markdown、408 本地链接通过 |
| 文档语义一致性脚本 | 8 个节点 answered 且 LOG 可解析；6 条 ADR；34 组 AC；四项政策在 Spec/ADR 一致 |
| 原始来源摘要校验 | source-manifest 中所有冻结来源和 PR 差异摘要保持一致 |
| git diff --check | 退出 0 |

验证在本轮文档写入后实际执行。结构校验允许有效的整体 draft；不将其解释为 UI Ready 或产品实现通过。

## 就绪边界

本轮文档更新和非 UI 决策完成；整体 Spec 因包含尚待 UI DESIGN 的页面行为维持 draft / ready_for_tickets=false。change 保持 active，后续产品实现和平台验收没有被标为完成。UI 下一入口为 P，完成后由 S 汇总 Ready。

本轮为纯文档工作，不重新构建插件或重跑产品测试；既有合并验证仍见 integration.md，不能把其结果当作新增未来行为已实现的证据。
