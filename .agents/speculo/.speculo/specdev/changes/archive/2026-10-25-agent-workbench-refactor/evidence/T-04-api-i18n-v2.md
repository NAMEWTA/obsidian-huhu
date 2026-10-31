# T-04 API i18n v2（增量）

DTO/四方法不变。经Root精确授权新增11个双语枚举键。

src/modules/agent/i18n.ts SHA256 1ea76a30cb2314c9559460e3b09f1a9e8b108f1490dd52912e069e3a63def665

- `agent.managed.rootRunning`: "Root running", / "根进程运行中",
- `agent.managed.rootExited`: "Root exited", / "根进程已退出",
- `agent.managed.rootUnknown`: "Root not verified", / "根进程未核实",
- `agent.managed.rootNotStarted`: "Not started", / "尚未启动",
- `agent.managed.cleanupPending`: "Cleanup pending", / "等待清理",
- `agent.managed.cleanupConfirmed`: "Cleanup confirmed", / "清理已核实",
- `agent.managed.cleanupPartial`: "Cleanup incomplete", / "清理未完成",
- `agent.managed.cleanupUnknown`: "Cleanup not verified", / "清理未核实",
- `agent.managed.outputDrained`: "Output drained", / "输出已排空",
- `agent.managed.outputTruncated`: "Output truncated", / "输出已截断",
- `agent.managed.outputUnknown`: "Output not verified", / "输出未核实",
