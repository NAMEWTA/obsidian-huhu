---
schema_version: 2
session: "20261025T043239Z"
task: "144-memory-context-consumers"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-01
---

# 迁移真实短期输入和schema的既有消费者测试

## Goal

由 native:/root/foundation_api_repair 沿原T01/T03运行集成职责维护完整回归实际失败的协议/历史/迁移测试。明确区分新合同要求的测试变化与真实生产问题，不凭测试通过改弱外部行为。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD 33c21e098ef3188cbab5a09f3e0a01fadb787715；Map38/Goal37/LOG126。用户授权全部28票55AC与Agent Team，真实Provider/Obsidian/目标OS后验，无提交推送发布归档，无再委派。按Map→dev/testing→T01/T03/T08/T09/T10/T16实际适用验收，复用115/123短期合同与130/139组件证据。

Root完整Go原红actual1/Wait235.686251、417输入零漂移；evidence/T-14-logs/lead-memory-regression-r1.json、同名normal.log、failures.json。原字节快照/tmp/huhu-lead-memory-regression-r1-cp7q1xak；140/141已Root正式接纳候选，不改旧报告。T09/T10已因本次tests-only维护重开，生产driver只读，原G2历史保持。Map38窗口在 evidence/T-14-logs/regression-window-map38.md。

## Workspace and Scope

仅可写 tests/contract/chat/provenance_test.go；tests/contract/foundation/default_protocol_recovery_test.go、groups_migration_test.go；tests/contract/recovery/migration_test.go；tests/contract/engine/{chat,responses,anthropic}/ 中由原红明确点名的engine_test、checkpoint_test、tools_test、protocol_edges_test、empty_tool_test、question_test、review_intent_test等实际存在的失败文件及必要同包测试helper。全部以 native/huhubot/ 为前缀。不是任意重写三套测试；修改前记录具体失败与文件。API/所有生产/014/锁/其他测试/正式状态只读，新增实际产品问题向Root报路径/owner。自己的144 REPORT/logs/manifest可写。

## Acceptance

1. 初始SOURCE-ONLY：143独占events/Memory Go检查，禁止Go/Node/构建/生成/DB/Vitest；只改闭包外测试源码并可gofmt。先交精确checkpoint/命令清单，Root另授检查窗口；全仓仍由Root。
2. 新extractive Run实际ShortTerm取代重复History/Messages。旧合法历史与来源测试应观察真实ShortTerm的Ref/Text/Use、原来源持久传播，并强化原撤权/endpoint负控不因只看已空旧字段而虚假通过。默认SDK新短期block允许增加消息/item，但原Intent只一次、Persona字面量、opaque/thinking/tool ID/决策顺序/usage/取消/恢复不变。
3. 禁止把固定长度断言简单改为>=或删除。逐项辨识真实初始ShortTerm块，核其绑定和内容，再针对原provider回复/工具结果序列断言；保持旧Input.ShortTerm=nil的legacy兼容测试。review_intent/history_refresh的原SQL夹具若违反新manifest合同，须证明并迁移有效夹具，不能绕过安全校验或接受未解释失败。
4. schema10后更新精确预期版本，并保持真实schema8所有旧列/关系/外键/CP/恢复集合对照；不得将任何结构丢失归为版本预期过期。若原红显示真实生产问题，保留反例向Root请求原owner修复，不改结果来配合。
5. 授窗后仅失败集合与相关整包/必要消费者，实际Go1.26.10固定输入/原输出/exit/Wait/漂移，尽早归窗正式交候选；不扩大race/vet、不运行真实Provider。

## Return

先ACK；source-only阶段明确not-run。最终REPORT首h2前Session: 20261025T043239Z、Task: 144-memory-context-consumers、Status: completed，含聚焦交接/产物与验证/问题与下一步与原红→精确分类→修后证据。亲自validate-dispatch return0后MESSAGE+FINAL；Root负责共同门和正式状态。
