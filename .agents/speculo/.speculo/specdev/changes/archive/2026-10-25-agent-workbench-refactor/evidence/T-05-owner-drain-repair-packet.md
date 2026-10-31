# T05 同代多个租约释放的收束修复

GP019/Map20、同一workspace/HEAD/用户授权与C原Sol/xhigh身份保持。仍是快速退出补修周期，Root attempt1 原组合223项中222pass/1fail完整保留，下一轮为attempt2，不重置周期。T06实施继续等待。

Root已核收唯一真实probe并固定原输入；仅实际followup成功后开启以下写集：

- src/host/desktop/native/host.ts
- src/host/desktop/native/host.test.ts
- src/host/desktop/native/helper-stream.test.ts

其余源、Rust/Cargo/target、helper68364、原sessions.e2e.test.ts、旧probe/记录、A/B源、正式工件、预算和产物STOP。没有新wire/公共接口/资源额度/观察时限/行为范围。

## 受控新事实

原完整组合在missing executable后并发释放PTY+History，SID2 cleanup timeout；其余真实压力/容量场景通过。新/tmp原用例副本保留原断言/时限，只增加有界双向控制帧、Helper→Host事件、primary与sessions.dispose/native.dispose分别记录。同68364 helper上唯一probe实际18:32:33–44Z exit126，原主体无primary；Host在18:32:34.483提前closed、原生SID2 reply-settled于.499才到，原sessions.dispose在10s后拒绝。extra native.dispose另为fulfilled。Root回读实际probe/报告/receipt与完整关键事件链，并独立核对Sessions并发release和Host every(released)闸。probe log SHA5c57c6de6536ed757971de865ae5053c9842f256b6d474ae004125f1ef9c9b4a；源观测199f54799b9747523d9b691ae38f08aaf988b0e9f610d7f03c1ac342ad49dee7。原报告行号勘误为Host476/Helper901，不改原件。不能把本次trace倒填成原Root组合的事件。

## 需保持的不变量

释放开始同步撤准入；它不等于该owner已完成其释放观察。单个已释放的History/Cookie owner先结束，不能关闭仍在等待合法numeric/cleanup/raw ACK/最终reply fence的其他released PTY owner。最后一代正常shutdown必须等待同代各释放观察已结算或其既有有界失败；不能await自身造成循环，也不能无界等候外部writer。

保留原10s截止时间、typed none/unknown、late ACK/fault/fence与captured SID/generation身份；timeout不假称cleanup或释放共享中的实际owner。Browser仍活跃时不关闭helper；startup取消/失败、transport断线、显式NativeHost.dispose的既有强制清理与错误报告保持。重复release返回同一Promise，helper shutdown最多一次；新owner不得被旧release迟到动作关闭。提前退出先于spawned的刚修三路径行为不得回退。

## 验证与交回

先加真实Host/Helper消费的确定性红灯，明确多owner已released但其中一个最终fence仍被控制屏障扣住；保留原none/capacity/live矩阵，补释放完成/超时/其他owner存活的负向控制。只修有证据的关闭闸；通过对应完整Host/Helper套件、scoped类型/lint，并用原不改动的sessions.e2e.test.ts与同68364 helper验证真实错误启动路径。不得重跑完整Root组合、cargo、Chrome或global build。

新交回 `/tmp/huhu-t05-owner-drain-c-{handoff.md,source.json,checks.json}`；前后源、每命令执行前输入/UTC/exit/原日志、失败与未验证项如实保留，不覆写fast-exit-c。清楚区分原probe与新repo红灯、目标green与最后完整套件。SOURCE STOPPED后Root固定新源进行attempt2重建、受影响验证、Chrome和独立两轴；任何未获授权新路径/接口/超范围问题先停对应分支并回Root。

固定输入：`T-05-owner-drain-repair-input.json` SHA256 `807d37d36537dbb387b7044cc239f604202968fec8627142de32368106321b66`，1948当前输入无漂移、59份probe输入及原件已保全。Root原attempt1审计`T-05-fast-exit-root-attempt1-audit.json` SHA584181e54e65929ac8b70f42814d91d6b5b402a8514670c831734c443d6a5369，3913份保全映射errors空。
