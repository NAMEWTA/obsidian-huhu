---
schema_version: 2
session: "20261025T043239Z"
task: "020-credential-provider"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-02
---

# T-02 完整代码实现切片

## Goal
负责完整Go系统凭证provider、受管私有凭证通道和有界内部worker；仅在Lead放行T01并收到019冻结的API/装配合同后启用生产writer。无需真实用户keyring即可完成代码与故障验证，不能用一个session-memory stub冒充各OS provider。

## Inputs
工作区 /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，实施基线 33c21e098ef3188cbab5a09f3e0a01fadb787715。用户完整实现授权及代码层交付口径见 LOG-047/050/051；真实模型、OS keyring/Obsidian用户操作留 user-owned，不索取真实秘密。Map8 → 当前 dev 与 architecture/testing/licensing/build-and-release → T-02 → Spec/ARCH/ADR 的本票范围；阅读 I implementation-procedure/execution-preflight 与适用风险/TDD规则，复用不变部分。完整读 sessions/20261025T043239Z/010-assistant-preflight/REPORT.md 与 evidence/credential-interface-research.md，预检已有固定官方源码/许可证/可行性探针，不从零猜 Windows fd 或直接复制不明代码。先比较两种实现/失败边界，再采用已有预检的窄接口、有界 worker 与独立匿名管道。T-01共享合同只有原owner在Lead窗口维护；该维护属于新输入，旧T01快照保留历史，受影响测试/审查重新覆盖。全部生产实现由执行者完成，Lead只编排/集成/正式状态。

## Workspace and Scope
唯一生产写集 native/huhubot/internal/adapters/outbound/credentials/**；测试为该目录*_test.go及tests/contract/assistant/credentials*（与019助手测试不重叠）；可以本TASK保存私有协议golden/探针。api/schema/gomod/cmd/bootstrap/SQLite/TS/根工程全部只读，通过精确请求由019原T01 owner维护。先与019/021约定现有010私有协议，消息回传接口名、数据形状/错误、生命周期，不各造另一种协议；019收到请求后独占共享API/入口。

010候选受管fd3请求/fd4回执，u32BE+v1/op/metaLength+metadata+rawsecret，body16KiB/meta2KiB/secret2KiB、最多8在途/3sdeadline；严格长度/UTF8/required/未知字段/profile/ref/op/tail检查。仅managed可信入口，HAP不承载秘密、不加listener/凭证文件/env/argv；无parent get-secret，Go内部Resolver供模型消费者。Windows需解析固定libuv CRT table并验证count/bounds/flags/handle/pipe/dup/inherit，不能os.NewFile(3)；Unix检验pipe/socket。未知ABI failclosed保留无密钥草稿。

Linux/Windows考虑go-keyring0.2.8同步库放一次性受限内部worker：独立匿名pipe、受控绝对本binary、固定service/profile/ref namespace、supervisor deadline kill+wait、无任意keychain查询/无DeleteAll；worker flags无秘密。mac自有bounded security -i adapter，长度/escaping在Start前检查，secret只stdin，CommandContext/WaitDelay/close/kill/wait，禁止采用上游先spawn后长度检查缺口；可复用worker统一有界生命周期。不能goroutine包不可取消阻塞后假报清理。系统必要DBUS_SESSION_BUS_ADDRESS/XDG_RUNTIME_DIR由021显式allowlist，provider/CLI API_KEY仍不继承。

保护缺失/锁定/拒绝/异常用安全模式/状态/稳定reason，无OS原错、secret/hash回执。protected写超时可能提交必须unknown，同refstatus核查，不谎称失败后自动持久/内存成功；session-memory明确选择、退出失效、可变buffer尽力清零不承诺JS/Go字符串绝对擦除。持久ref/归属/引用由019真实DB catalog port提供，不由adapter打开业务SQL；Delete先检查引用/归属，不删除别的profile秘密。

## Acceptance
覆盖protected成功、missing、locked/unavailable、denied、timeout unknown、status核查、delete引用阻挡、session-memory重开消失/close清理。用可控OS backend与真实隔离子进程验证supervisor无hang/reap、privatechannel半帧/超长/错误profile/无managed/EOF/慢消费者；Windows table合成32/64bit边界及目标crosscompile；mac stub外部程序先验长度、挂起/提前关闭的close/kill/wait。固定哨兵证明argv/env/stdout业务HAP/stderr/DB/receipt无秘密；内部worker安全pipe可传必要secret但无日志。与019/021联合真实TS→Go匿名pipe用session-memory验证，不触碰真实凭证服务。陌生API先核验固定官方来源许可。跑定向、关键生命周期race/vet/跨编译，保留真实红绿失败，不以skip为pass。

## Return
不得改正式 Ticket/Map/Goal/Evidence、其他TASK、根 package/lock/build/notices/current文档；不得提交/推送/发布或再派遣。只写本TASK报告/原始日志/hash及明确生产写集。首个h2前 Session: 20261025T043239Z、Task: 020-credential-provider、Status: completed；必需h2聚焦交接、产物与验证、问题与下一步。列采用方案、真实消费者、文件、红绿/失败与恢复、命令/exit/观察、源码/输入hash、未验证项和依赖接缝；completed仅候选返回。最终validate-dispatch return0、所有子进程结束、生产writer停写后通知root。需要超出写集先向Lead给精确路径/必要性，不写平行入口。
