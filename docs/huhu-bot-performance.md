# HUHU Bot 固定负载测量

`native/huhubot/tests/contract/performance` 只测可复现的本地协议与诊断边界，不调用真实 Provider，也不把本地结果写成网络 p95 承诺。

```sh
cd native/huhubot
GOTOOLCHAIN=local go test ./tests/contract/performance/... -count=1
cd ../..
node scripts/bench-huhu-bot.mjs
```

脚本输出包含运行环境、样本数、历史长度和 p50/p95。Runner 的 stdio 写队列固定为 32 帧，并受字节上限约束；慢消费者会收到受控错误并关闭连接。真实 Provider、Obsidian 和目标系统测量由产品验收脚本负责，未设置 `HUHUBOT_PROVIDER_ENDPOINT` 时不会发起网络请求。

SQLite 维护候选及 Windows 固定矩阵的存储测量说明原在 `docs/e2e/dev-overhaul/storage/README.md`，该目录已于 2026-11-02 删除，需要时从 git 历史（提交 ffac3a0d 及之前）查阅。生产默认仍为 4,096,000 字节软高水位、单 owner 异步 TRUNCATE；长 reader 阻塞后续事务，不提高阈值，已准入单事务仍可越阈值。阈值限制追加准入，不能限定一次 checkpoint/fsync 的耗时。矩阵按连接等待、COMMIT、FULL、checkpoint、关闭 sync 分项，Windows 尚待实际执行；本机原语测量不能代替真实 executor 规模收益或 Windows 验收。
