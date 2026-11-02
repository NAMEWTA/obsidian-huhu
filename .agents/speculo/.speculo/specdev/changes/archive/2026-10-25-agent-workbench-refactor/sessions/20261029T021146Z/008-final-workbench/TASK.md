---
schema_version: 2
session: 20261029T021146Z
task: 008-final-workbench
kind: review
change: 2026-10-25-agent-workbench-refactor
---

## Goal
Lead codex:/root，GP-045 / Map42，工作台/历史最终独立复核。你仍是原生独立Astra/high reviewer，未参与被审实现，禁止修复或递归派遣。逐项独立核对WB-S01..05/P01..03/L01的生产修复与root最后类型/fixture补正，并保留跨边界审查。明确评估旧opaque row.key三元组在同账号同native ID不同locator时是否真的违反现行Spec/来源契约：它未更换持久格式，准入/owner/OpenCode owned摘要已完整；不要仅因作者报告风险就通过或判错，须用准确触发/反例和实际consumer判断。

## Inputs
同目录review-input.json是唯一新冻结输入，Input-SHA256: 69e01201a2aa5f8cf6d0435c41714811ccb45e6b9d8921a21c42e0fe6b4e8583，453路径，base 33c21e098ef3188cbab5a09f3e0a01fadb787715，observed HEAD 78102da2811953e72fe317cd08cd91311d9cac0d。先核验原始字节与来源摘要；JSON.parse→JSON.stringify摘要。公共code-review Skill与source-discovery/Fowler/risk/reviewer-contracts/review-evidence适用；项目dev/ui按实际范围使用。初始报告../002-final-workbench/REPORT.md，修复报告../005-repair-workbench/REPORT.md，Lead最终整合事实见evidence/final-review.md。37恢复源码、Root额外协议/类型/夹具/harness修复均为真实实现；实际实现者包括旧Codex/Claude及其实现者（原T01–18 Evidence）、用户提交、当前codex:/root和repair_native/workbench/data，reviewer均未参与。当前全量最终Vitest仍在跑，build/types、bundle、release helper/CLI smoke均exit0，原native/lint/CSS/arch/i18n/promises/safety/notice等通过；文档只剩另change6个既有锚点，所有实际检查从final-checks/results.json与原日志核对，不能冒称尚未结束项目通过。

## Workspace and Scope
工作区/home/wta/orca/workspaces/obsidian-huhu/terminal，current/NAMEWTA/terminal。全部产品源与根产物已停写；你只可写本REPORT及/tmp/huhu-008-final-workbench/，其他仓库文件只读，不build、不改Git、不触碰真实用户库/账号/Provider。可运行必要定向反例，但不要全量测试或共享native build（Lead占有；必要可用CARGO_TARGET_DIR隔离）。如产品源/规范漂移立即通知Lead。真实宿主、Provider、五平台E2E依Spec11由用户，不当成已经通过，也不单因这项分工判代码缺陷。

## Acceptance
两轴分别pass或request-changes，medium+及明确规范缺口必须定位severity/file:line/场景/依据/满足条件，low单列，不限制数量。原始所有finding逐项给出关闭或保留的代码/测试依据。记录实际覆盖、真实命令/exit与未运行项。支持报告只交对应范围两轴；007对整个最终交付形成两轴。规范来源包含完整spec/DESIGN/ADR/implementation-contracts、Map及Goal稳定合同；不引用旧未完成123为pass。受控Chrome最终证据在final-ui/results.json，实际production组件+fixture ports、非真实Obsidian；窄屏history新截图/原生Tab/Escape/取消0启动受控检查由Lead运行。

## Return
准确.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/sessions/20261029T021146Z/008-final-workbench/REPORT.md，一次性同目录临时文件不覆盖落盘并回读。必须采用 .agents/speculo/references/coordination/report-template.md 的三个唯一H2：`## 聚焦交接`、`## 产物与验证`、`## 问题与下一步`，首部Session/Task/Status。另分别有显式`<a id="standards-output"></a>`与`<a id="specification-output"></a>`，各自独立H2下只放一套纯文本字段：Reviewer: codex:/root/review_workbench；Axis: standards或specification；Result: pass或request-changes；Input-SHA256: 69e01201a2aa5f8cf6d0435c41714811ccb45e6b9d8921a21c42e0fe6b4e8583；Observed: 真实观察。字段值不要反引号/强调，不把两个轴放在同一个锚点，避免重复字段。完整findings可放各轴H3。所有标题和字段均按真实结果生成；通过原生消息向Lead交回，不修改TASK/正式Evidence/状态。
