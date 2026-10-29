# T-05 快速退出先于启动回执的接收修复

沿用户全18票代码交付、Agent Team 和原 C 模型授权，GP-019/Map20不变。本 Packet 是前一修复周期达到 attempts3 后的实质恢复输入，不删除、覆写或追认前一周期。前次第3轮 build 已exit0、无漂移；Root源码核对发现下列新竞争，生产消费探针随后确认，故未继续该候选的组合测试。旧独立两轴仍为request-changes。

## 新事实与恢复依据

在 `Running.spawning` 期间收到最终 `replySettled` 时，Host暂存 `spawnSettled=true`；随后成功的 `spawnSession` 却无条件清掉它。原生 `spawn_inner` 先启动monitor、后返回main发送high lane的spawned，故短命运行的退出与结算可以先于启动回执。Root已回读这条静态生产链；新探针实跑真实Helper→Host，注入confirmed→exit→实际reply-close→reply-settled→spawned，Helper路由已0，Host却以timeout拒绝释放。探针exit126、log SHA256 5a2c2127adbc517d496114fea0c3d0b2dd6edf68cb0de1d7ec06a89b7708f366；没有运行真实child或新增Rust相位实验。

这是此前仅围绕spawn失败路径保留结算字段所遗漏的**成功接收与提前终结竞争**。下一轮改变为同时覆盖成功、none失败、unknown失败、release中和normal-live的接收状态，而非重复压力测试、更换Agent或放宽断言。固定输入及59份原件见 `T-05-fast-exit-repair-input.json`（SHA256 959d36f484044019e5f1156c27eb121539c34025b1c2c6874b4e78b1e42eaf0d）。原周期attempts3完整保留；本补修周期经实际派遣后从implementation计，下一次Root组合为attempt1。

## 唯一写集与不变量

原 C `codex:/root/implement_t01`（实际gpt-6.1-sol/xhigh）仅在实际followup成功后恢复这三路径：

- `src/host/desktop/native/host.ts`
- `src/host/desktop/native/helper-stream.test.ts`
- `src/host/desktop/native/host.test.ts`

其他源码、Rust/cargo/target、helper、A/B源、正式状态、预算及产物保持STOP。不改新wire、不增加资源额度、不新增公共接口或依赖。沿既有settlement/reserve补充合同，成功接收必须保留已经被当前captured SID确认的numeric exit与最终结算，完成原释放/退休；尚无退出的提前事件不能让普通运行成为已结束。release中已最终结束的SID不得再发无意义end或向新SID操作。原none失败、raw ACK、late fault、generation隔离和Browser sibling保持。

## 可证伪回归与交回

原/tmp发现探针原样保留。它在spawn成功后调用end来建立观测时限，正确退休后该额外调用可能合法报closed；不能因此强行保留已退休路由或要求旧脚本全部变绿。新repo回归将首次stop放在退出前，或使用独立的有界释放观察，先在冻结候选上得到有意义红灯，再修复为绿。至少覆盖：成功接收保留已numericExit的结算；正常live提前事件不能释放；release中成功回执不重复end；none与unknown失败不混淆；Browser兄弟路由继续可用。

保留每次实际命令的源码/配置、UTC、exit和原日志，最终跑受影响Helper/Host测试及类型/lint，不跑全局build/Chrome。不覆写原 `repair-r2-c-{source,checks,handoff}`、旧探针或helper。交回新的 `/tmp/huhu-t05-fast-exit-c-{handoff.md,source.json,checks.json}`，明确SOURCE STOPPED。Root随后固定新输入、重建受影响产物并做完整组合与Chrome、相关静态门、相似度增量，再冻结round3独立双轴审查；T06实施继续等待。
