# T-05 round2 复审后的窄修复 Packet

沿用户全18票 Agent Team 与代码层验收授权、GP-019/Map20、原 T05 合同及 repair-round1-packet 的准确诊断/有限资源接缝。原整合 attempts3 和当前修复周期 attempts2 均保留；本次不重置周期。两项新确定反例来自原独立 reviewer，同范围修复不需新增产品决定。T06 实施仍锁定；Root 仅编排、验收和维护正式记录/产物。

## 输入与写权

权威报告 `T-05-review-round2.md` SHA256 `7bebb705e65be69b02d7cd509371ba657e9eba52c65b82f3ffd5353cc0fc249f`，Root 审计 `T-05-review-round2-root-audit.json` SHA256 `43917faf2209caad985f44629b15bd8f579d430a577056f7542d27840700ffed`。原冻结输入为 `T-05-review-input-round2.md#review-input`，Input-SHA256 `be9cc7f307e0651cc0eb009862a93a337fd89b93dfd6251102dfacbec07ac96c`。原探针与全部失败保留，不覆盖或倒写。

唯一产品 writer 为原 C `codex:/root/implement_t01`，沿实际 gpt-6.1-sol/xhigh 身份。精确14路径及当前字节在 `T-05-repair-round2-input.json`，实际 followup_task 成功后才解锁。A/B 源、main.js、styles.css、预算及其他路径继续 STOP；C 独占本轮 cargo/target。未列文件只读。无提交、推送、PR、发版、归档、真实账号或用户进程操作。

## 两项必须闭合的行为

1. **STD/SPEC-R2-01：所有已经产生且成功准入的同 SID 操作结果有序送达。** 未 reservation 的 input/resize none/closed、none/capacity 等也不能被后来入队的 numeric exit 越过。保留普通 control 容量、reserved receipt 的独立预算、物理 write 后返还及未知 SID 防洪。必须用真实 `Outbox.new/run` 的物理 writer 屏障覆盖所有轮转相位、未预留的 closed/capacity/resize、兄弟 SID 和预算返还。不能只测 cfg(test) channel shortcut。原手工错序消费者探针证明后果；如果 producer 已证明顺序不可达，不要求强改已 settled 的 unknown 来使旧错序探针变绿。不得等待尚未产生的 writer 结果阻塞 exit。
2. **STD/SPEC-R2-02：exit 后产生的 claimed reply 失败仍准确到达原 Session。** 明确有限生命周期 fence/结算协议，同时处理 PtyHelper 的 SID 退休与 NativeHost released owner 退休。保留 captured generation/SID/owner 直到真实晚 I/O 可结算，或在明确边界给出准确的最终未知。禁止无界 tombstone、跨 SID/新 generation 污染、提前将 claimed 假称 write-failed、重复 stop 或 reply 重放。numeric exit/master close 不能等待 writer 而形成依赖死锁；实际资源仍沿有限槽上限和原关闭流程归还。通过生产 Helper→Host→Sessions→Session 消费链验证 confirmed+exit 先于真实故障、owner release、兄弟 SID，以及正常成功、断链和最终退休。只改已有 packet FIFO 不足以闭合此项。

若需要新增 wire lifecycle 字段/能力，C 先交具体 shape、兼容边界和有限性说明给 Root。C 所属内部 native/host 接缝可在本范围修复；若改变 A 消费的公开合同或需要第15条路径，必须停止该分支先报告 Root，不自行复制临时 DTO/扩大写集。原 Session typed replyFailure 接缝及 A/B reset/resize/可见诊断保持。

## 检查、产物与交回

先保存有意义生产反例的红灯，再修复并给定向绿灯。原 reviewer 两条负例是已存在红灯；新物理调度和生命周期屏障需有自身可证伪观察。所有实际命令记录 argv、cwd、UTC、exit、原日志及相关源/配置 SHA；装配/类型失败与产品红灯区分。不能随机重跑压力直到绿，不能调低原工作量或将失败探针删除。

C 完成受影响 TS/真实 native 局部检查与全 native 检查，交一个新名字、mode0555 的不可变 Linux helper，附实际12份 Rust/Cargo 源快照、构建命令和 SHA；旧 helper 原样保留。Windows 交叉检查不得写成真实 Windows。不要运行全局 build/架构/Promise/i18n/Chrome；这些由 Root 在所有相关源停止后按输入闭包执行，所有全局门顺序运行。

交回 `/tmp/huhu-t05-repair-r2-c-handoff.md`、`-source.json`、`-checks.json`，明确 SOURCE STOPPED 和未验证边界。Root 回读修复、审计原件、重建受影响产物和组合，以当前修复周期 attempt3 记录整合，再冻结 round3 交原独立 reviewer。现有20项 Chrome 若48实际输入闭包不变可复用；如变则运行受影响验证。原压力 attempt2 的原因仍未知，新的通过不能追认根因。
