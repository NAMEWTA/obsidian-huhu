---
schema_version: 2
session: "20261025T043239Z"
task: "072-notes-collaboration-r3-review"
kind: review
change: 2026-10-25-huhu-bot-architecture
ticket: T-07
---

# 笔记与协作候选三：等待槽位测试修复独立复审

## Goal
原未参与实现的 /root/foundation_review 对071测试修复后的完整当前候选作双轴判断。本任务在Root完成071交接、固定候选3并实际派遣后启动；沿原gpt-6-astra/high偏好，不冒称底层attestation、不再委派、不修产品或永久测试。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715；Map16/Goal15及28票55AC、用户代码验收口径不变。AGENTS发现→Map/dev/相关T01/T02/T03/T05/T06/T07/T11/T12→I最终审查与risk/error/test-reliability。

完整读取070最终两轴报告和原始整包race失败/强制合法交错/isolated原条件绿，区分三者含义；读取071最终REPORT、精确diff/红绿/命令/完整当前摘要。原059三项产品finding及068/069修复、Root当前真实集成证据仍按当前字节及影响闭包判断复用，不能改写失败历史。唯一输入为evidence/T-07.md#review-input-notes-r3，文件/来源数和Input-SHA256随Root实际freeze及派遣给出。当前attempts3，候选1/2失败不清零。

## Workspace and Scope
只写本TASK REPORT/log及外部精确副本探针，所有生产/永久测试/合同/正式Evidence/Map/其他报告只读。核对全部选定快照/来源/HEAD/index/mode及唯一实际变化；发现漂移先告知Root。当前修复预期仅native/huhubot/tests/contract/delegation/wait_test.go，若实际更广必须按真范围分析，不能以草案豁免。所有writer已停写才开始，重测试窗口由Root明确独占，无提交推送发布归档。

## Acceptance
独立核验旧测试根因：旧前提要求六parent加root全部waiting，合法四leaf先占槽/末两parent排队时会失败；释放held leaf后生产正常完成。新测试必须用真正同步点安排可证明状态，保留waiting停止producer释放slot、queued不占slot、Resume重新原子取得树限制slot、每根4/Profile8上限、完整CP/真实child结果、13 Run调用/6 Resume/最终slots0及彻底清理。确认070的合法交错和原正常受理的风险均被承接，不能只放宽timeout、删除目标断言、偏离真实Tools/Executor或重试择绿。

沿真实变更补必要独立观察/负向控制；优先证明修复在强制两种合法调度下仍保护原槽位/恢复不变量。生产字节完全未变时，070已通过的三原反例、事务/CP相邻探针、其他race、RootE2E/插件检查可有理由复用；不机械重跑无关平台、迁移或整包矩阵。新test正常/race必须真实执行和Wait，失败保持，不能由071作者自述替代独立判断。完整候选标准/规范两轴分别pass/request-changes，不设finding数量上限；单测试修复不能掩盖当前已知未闭合问题。

原inputs六个文档锚点仍独立基线问题，evidence/067-lead-docs-check.json明确记录；不称全局docs通过。真实模型/Provider、Obsidian、用户目标OS/keyring都user-owned/not-run，不索凭证、不运行旧默认DBus探针。

## Return
REPORT首h2前Session/Task/Status准确；含聚焦交接、产物与验证、问题与下一步，standards-output与specification-output各有Reviewer/Axis/Result/Input-SHA256/Observed独立锚点。每finding给具体路径/触发/实际证据/影响/满足条件，推断与实测区分。完整末次输入无漂移、自有进程全部Wait/停写、亲自return0后真实MESSAGE+FINAL。Root全读后维护状态；不自称T27或全28票完成。
