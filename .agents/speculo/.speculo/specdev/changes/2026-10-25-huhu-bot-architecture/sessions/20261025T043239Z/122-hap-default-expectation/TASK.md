---
schema_version: 2
session: "20261025T043239Z"
task: "122-hap-default-expectation"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-02
---

# 默认三协议 HAP 测试预期维护

## Goal

由原 T02 owner native:/root/credential_provider修复hap_test.go一处过期未装配预期，保留strict DTO与秘密拒绝。只维护测试，不让生产退回旧状态，不再委派。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715，Map30/Goal29。完整28票55AC及Agent Team授权持续，真实Provider/Obsidian/目标OS由用户后验，无提交推送发布归档。沿workspace/catalog、dev/testing、I已读未变规则；110/114历史源与报告保持。

Root已实际运行原TestAssistantHAPStrictDTOAndNoSecretSurface，exit1、实际Wait1.946400363秒，输入2032/SHA9579090bfcdb20ab0053d944979653dc861c047e54cb8d4ed5e1c638e4a85c26，漂移[]。原结果和完整日志在evidence/T-02-logs/hap-default-after-three-protocols-r1.{json,log}；字节快照/tmp/huhu-lead-anthropic-r1-lq1wawl_，完整清单见evidence/T-10-logs/lead-anthropic-e2e-r1.json。可以复用这条有效红，不为形式重跑相同断言。原日志未解引用fault，实际值仍须观察。

## Workspace and Scope

唯一可写产品路径 native/huhubot/tests/contract/assistant/hap_test.go，限末段过期预期及必要错误诊断；本122 REPORT/logs与临时外部观察overlay可写。其他测试、API/HAP/生产/凭证/SQL/锁、正式Evidence/Map/Goal、原报告只读。

Root实际派遣并交回唯一Go窗口后再运行。117/118/119/120生产全停写；固定GOTOOLCHAIN=go1.26.10/GOWORKoff/GOEXPERIMENT空/CGO0/GOFLAGS=-mod=readonly。保存完整before、精确差异、所有Go输入与实际日志/Wait。无全module/race、插件build或真实Provider请求。

## Acceptance

1. 回读并保留Root有效原红；以不改变生产或预期的临时观察overlay/诊断，确认实际安全fault。CREDENTIAL_MISSING只是源码支持的假设，不能把假设当实测。
2. 只迁移默认已装配Responses缺凭证的末段预期；严格未知字段、大小写、CAS、secret/apiKey拒绝、公开返回不含sentinel等原合同保留。不得弱化到任意错误即通过。
3. 运行整个tests/contract/assistant包一次，含显式Chat-only selector两个负控。之前已出现三处同类默认预期遗漏，故本次整包具有新风险依据。若另有失败先报Root精确源/原因，不能自行扩写集。
4. 所有命令实际Wait，保存exit和输入SHA/漂移；结束立即归还Go窗口并停止产品写入。Root生产E2E r1不覆盖或冒称新字节；测试不进入CLI编译闭包的证明由Root决定复用。共同审查和正式接纳仍待Root，不宣布T02/T10或Goal完成。

## Return

REPORT首h2前有Session/Task/Status，三必需h2精确为聚焦交接、产物与验证、问题与下一步。含before/diff、单文件SHA、实际检查与输入清单、工件manifest。亲自validate-dispatch return0，原生MESSAGE+FINAL后停写；不改110/114历史。
