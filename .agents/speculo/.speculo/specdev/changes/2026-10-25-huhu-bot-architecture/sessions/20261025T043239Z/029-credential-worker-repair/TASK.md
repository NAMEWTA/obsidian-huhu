---
schema_version: 2
session: "20261025T043239Z"
task: "029-credential-worker-repair"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-02
---

# 凭证 worker 独立退出时限回归

## Goal
补齐共同冻结后019发现的实际生命周期缺口：RunWorker 的 context 无法打断同步 keyring 调用或 io.Reader；Runner 被强制终止后 worker 仍须在独立有界期限退出。旧020结果保留，不改写原报告。root 已授权此精确修复窗口，无需额外用户确认。

## Inputs
沿020已读 Map8/Goal7、I、dev/架构/测试/许可、原 T01/T02 和 LOG051 用户代码验收口径。完整读020 REPORT和当前 cmd/huhubot/main.go、credentials/worker.go。实际工作区 /home/wta/orca/workspaces/obsidian-huhu/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715。原共享owner019只改固定内部worker CLI分支，先与你确认测试红灯后实施3s硬退出；不扩大公共接口、不碰真实OS keyring。

## Workspace and Scope
本任务由原credential_provider负责测试，仅可改 native/huhubot/tests/contract/assistant/credentials*、必要的 native/huhubot/internal/adapters/outbound/credentials/*_test.go，以及本TASK报告/日志。生产 CLI 只由019在原019 TASK窗口写；本任务其他生产目录/API/schema/locks/TS/根工程只读。先用实际产品binary的半帧/完整帧但stdin不EOF或可控阻塞OS替身证明旧实现超过独立deadline仍存活，测试需有自己的清理上限避免泄漏；旧失败原样保留。与019协作后证明相同调用自动退出、无secret输出、没有Profile/DB副作用。可控OS替身必须实际路径，不把纯mock callback当进程退出证据。

## Acceptance
覆盖实际worker无需存活父Supervisor仍有界退出；正常worker/现有Supervisor取消、unknown状态和私有通道回归不变。跑受影响实际CLI/provider定向测试与必要race/vet，019负责CLI跨目标编译；不重复无变化的全插件build。保留实际命令/exit/源码摘要、首个可证实red与最终green。所有进程Wait/退出后停写。若证明新的生产风险超范围先给root精确请求。

## Return
不改正式Ticket/Map/Goal/Evidence、原020报告、他人TASK，不提交/推送/发布或再委派。REPORT首个h2前 Session: 20261025T043239Z、Task: 029-credential-worker-repair、Status: completed；h2聚焦交接、产物与验证、问题与下一步。写明实际红绿证据、边界/未实测目标OS、最终hash与所有进程清理。validate-dispatch return0，真实工具消息交回root。
