# T-05 reserve 前拒绝的回复结算补充

本补充继承 `T-05-repair-round2-settlement-contract.md`，只处理原生尚未建立本次 InputQueue/ReplySlot 就拒绝 spawn 的路径。GP-019 / Map20、原 C owner、原14路径及当前 repair cycle attempts2 不变；原 Packet、Input 与先前检查输出均不改写。Root 已通过实际 `collaboration.send_message` 将下面的边界交给原实现者继续落实。

1. 在双向协商 `replySettlement=1` 后，`spawn-failed` 可携带顶层可选 literal `replySettled:true`。它只表示该失败请求没有取得 InputQueue/ReplySlot，且没有该 SID 原 owner 的未结算回复需要保留。仅凭 `failure.effect:none` 不足以生成该字段。
2. `reserve()` 的容量拒绝等确实未建立队列的失败可使用该字段。重复 SID 保持 `session-conflict/effect:unknown`，不得因此结束原 owner。`closing` 的 early-return 也必须先证明没有同 SID 的既有 owner；不能因关闭标志存在而把既有请求错误标成最终结算。
3. 已取得 reservation 的 spawn 失败继续使用真实 `reply-close` / `reply-settled` fence。即使失败为 `effect:none`、零输出或本地清理很快，也不能以本字段跳过尚在进行的 teardown、writer 或物理输出清理。
4. Helper 只在已协商能力、严格 typed-none 失败、字段为 literal `true`，且该 SID 未观察到输出的情况下接受此最终结算。缺失、错误类型、未协商或不能证明的组合沿保守的既有 fence 路径。该增量不改变公开 `NativeSpawnFailure` 或 A 的消费接口。
5. 验证应覆盖真实 native 32-slot reserve 容量拒绝经生产 Helper 归还路由；另行证明已取得 reservation 的失败仍等待真实 fence。重复 SID、closing-existing-owner、错误类型、legacy 无能力均需负例。不得用本地 oversize 拒绝或纯 mock 替代真实 reserve 失败。

本文件是实现合同，尚不代表上述修复或验证已经通过。最终冻结输入必须纳入本补充，并重新执行受影响的完整链路及独立双轴审查。
