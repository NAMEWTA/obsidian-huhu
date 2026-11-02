# Runner 停止观察合同

`service.shutdown` 仅接受已经完成 hello 的 managed owner。`waitMs` 为 0–30000 的整数，省略时为 0；它只限制本次观察，不取消清理。首次调用同步关闭准入并请求取消；后续调用观察同一个停止 owner，不启动第二次清理。普通业务在停止期间拒绝，新停止观察仍可达且不读取已经关闭的数据库。

结果中的四种事实独立：

- `requested`：停止请求已接收，进程准入已关闭。
- `executionDrained`：执行器、检查、Probe、内存任务、真实模型生产者及其结算已收敛。
- `persistenceComplete`：WAL 同步及数据库关闭成功完成。
- `profileReleased`：Profile 句柄成功确认释放。失败时 false 表示未确认，不允许调用方假定可重开。

`finished` 表示资源清理过程已结束，不代表成功。`failures` 是固定原因列表，不携带路径、凭据或原始错误。同步失败后仍可能完成其他资源清理，因而 `persistenceComplete: false`、`profileReleased: true`、`finished: true` 是有效失败结果，不能渲染为正常停止。

观察期限结束时返回已知事实；调用方保留 stopping 状态和进程所有权，再次调用观察。不能因期限结束或首个响应而强杀或打开同一 Profile。最终结果和所有已受理的在途响应写出后关闭正常 HAP；进程退出和停止成功仍是两个不同事实。EOF、信号或传输失败不撤销 Runner 的清理责任；CLI 等待实际清理，清理失败使用非零退出码和固定原因诊断。强杀后的恢复由宿主明确处理，不能冒充正常持久化完成。

Go 调用方使用 `RequestStop()` 与 `WaitStopped(ctx)` 获取快照及等待错误；`Close()` 是不附带固定期限的资源清理等待。`Done()` 只在实际清理结束后关闭，最终错误仍必须检查。协议类型源为 `src/modules/huhubot/api.ts` 的 BotMethodMap，通过本目录 `generate.mjs` 同步 schema、Go 类型与正反例。
