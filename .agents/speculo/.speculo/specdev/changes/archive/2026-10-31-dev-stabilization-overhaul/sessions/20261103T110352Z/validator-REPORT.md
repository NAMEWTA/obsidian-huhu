# SpecDev 校验器：结论报告证据模式（validator-REPORT）

## 改动文件（均在 .agents/speculo/workflows/specdev 下）
- common/tools/evidence-mode.mjs（新）：读取模式声明；结论报告、取消原因、Design Conformance 校验。
- common/tools/validate-specdev.mjs：激活模式后跳过 9 章节/Acceptance Verification/执行记录/Skill 记录/冻结评审；done 票改验结论报告；cancelled 票验原因；多票时验 final-review 结论报告；Direct Spec 同理；不支持父 Implementation。
- common/tools/execution-validation.mjs、execution-context.mjs：模式下跳过执行记录；base_sha 非 Git 对象且有 History-Rewrite 时降级为 warning，否则仍报错。
- common/tools/design-artifacts.mjs：`--conclusion-report`；Design Conformance 允许 `不适用：原因`；archived 阶段自动读取模式。
- specdev-p-prototype/scripts/validate-design-package.mjs：模式下不要求 browser_evidence（approval 与摘要绑定检查保留）。
- common/tools/tests/evidence-mode.test.mjs（新，7 个用例）。
- 规则文字：common/rules/change-completion.md、common/skills/code-review/references/review-evidence.md、common/tools/README.md。

## 在 change README 需写的声明（置于正文，围栏代码块内无效）
```
Evidence-Mode: conclusion-report
Evidence-Basis: AGENTS.md「SpecDev evidence 入库规则」；LOG-026
History-Rewrite: 仓库历史已重写，base_sha 86c500556db1d64865c4cc7f1aff1dd83de071fa 不再是 Git 对象
```
未声明的 change 行为不变（真实 change 未改时仍为 356 错误）。

## 测试
- `node --test common/tools/tests/`：83 通过 / 0 失败（含新增 7 例）。
- `node validate-specdev.mjs --self-check`：0 error，退出码 0。

## 模拟（临时副本，加声明后）archive-ready：35 错误 + 2 warning（均为真实问题，校验器无需再改）
Warning：模式提示；base_sha 不可达但已声明 History-Rewrite。
由 Lead 修 change 文件：
1. 缺 `## 结论` 段（旧形态，需改写成结论报告）：T-01 T-02 T-03 T-04 T-06 T-09 T-14 T-15 T-16 T-17 T-18 T-23。
2. 验证段缺反引号命令与结果/退出码：T-01 T-03 T-04 T-06 T-09 T-14 T-15 T-16 T-17 T-18 T-23 T-38。
3. `Result` 不是 passed（现为 partial）：T-12 T-13 T-20 T-42 T-44 T-46。
4. T-46 验收映射未提 AC-403、AC-404。
5. Spec 的 AC-406 未被任何 Ticket 覆盖（或在 tickets-map 标 deferred）。
6. T-40（UI 票）缺 `## Design Conformance`（可写 `不适用：原因`）。
7. 多票需 `evidence/final-review.md`（含 `## 结论`/Result: passed 等），现不存在。
（T-19 的取消原因已被现有票正文满足，无需处理。）
