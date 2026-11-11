---
schema_version: 2
session: "20261025T043239Z"
task: "032-credential-result-repair"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-02
---

# T02凭证实际结果修复

## Goal
修复024完整独立报告中归属凭证adapter/provider的确认问题，保留已冻结旧输入及所有失败。当前TASK仅准备；必须root收到024完整报告并正式派遣后才允许writer，不提前打断独立审查。

## Inputs
项目/home/wta/orca/workspaces/obsidian-huhu/bot，branchNAMEWTA/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715，Map8/Goal7，用户LOG051完整代码交付。沿Map→dev/相关架构/测试/许可→T02→I修复/执行/风险规则；完整读024两轴REPORT和原始反例、020/029报告，不把原先通过套件覆盖新反例。024输入evidence/T-02.md#review-input-r1，SHA55d6e1f6d1963e68e80e479172dcd4fef110a93a3630dd07fdd4e0a00ce43f8d，根冻结91源码/25来源。

## Workspace and Scope
原credential_provider仅可写native/huhubot/internal/adapters/outbound/credentials/**及tests/contract/assistant/credentials*、本TASK日志/REPORT。CLI/bootstrap/API/schema/SQLite/Go锁/TS/根工程和正式状态只读；必要共享修复向root提交精确路径，由原owner维护，不另造API/进程/业务库。旧020/029/024报告和冻结输入不改。禁止真实keyring/秘密/模型/Vault操作，使用隔离D-Bus/受控Secret Service和固定哨兵。不得再委派/提交/推送/发布。

当前已证实P1：Linux go-keyring v0.2.8的Set/Delete不报告Prompt.Completed dismissed=true，实际TS→Runner→worker调用取消create时误报protected/available，取消delete时误报missing/CREDENTIAL_DELETED，随后的真实Status与之矛盾。先复现024原反例作为行为红灯，检查官方固定Secret Service/库源码及完整错误/副作用语义，比较最小修复方案再实施；不得只改测试预期或用一概成功/自动fallback掩盖未知。所有成功回执必须有真实结果依据；中止/丢回执/超时保持安全可核查状态，不自动重放或换ref，不泄漏秘密。

任何复制/改编库或Secret Service源码、import/依赖变化需准确记来源commit/文件/许可，并在写共享锁前请求root/原019owner；同步025使真实各目标GoFiles和完整notice匹配。Linux实码修复不假称真实三OS验收，也不削弱worker独立3s硬退出或supervisor2.5s kill/wait。

## Acceptance
按024完整finding逐项红→绿与同输入故障回归。至少隔离服务下prompt取消create/delete、正常create/delete、查无/拒绝/断线/结果未知、既有共享ref引用保护与同refStatus一致；使用真实生产CLI/worker调用链，记录服务端实际item与回执前后，证明取消操作不误报完成。测试本身有有界超时、kill/wait/清理，不能接触真实session bus。相关provider/CLI/race/vet和跨平台编译按变动选择；如CI需辅助工具由T27协调，不私自改变工作流。保留HAP/argv/env/log/DB秘密隔离与原worker退出边界，现有关键断言不放宽。

## Return
REPORT首个h2前 Session: 20261025T043239Z、Task: 032-credential-result-repair、Status: completed；h2聚焦交接、产物与验证、问题与下一步。逐finding给原触发/修复/实际命令exit/观察、准确路径与最终hash、来源/依赖变动和未运行项。所有测试及服务进程退出、生产/test停写后validate-dispatch return0并原生工具回报root；completed仅候选，须新冻结独立复审/工程产物/Lead验收。
