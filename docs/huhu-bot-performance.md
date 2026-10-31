# HUHU Bot 固定负载测量

`native/huhubot/tests/contract/performance` 只测可复现的本地协议与诊断边界，不调用真实 Provider，也不把本地结果写成网络 p95 承诺。

```sh
cd native/huhubot
GOTOOLCHAIN=local go test ./tests/contract/performance/... -count=1
cd ../..
node scripts/bench-huhu-bot.mjs
```

脚本输出包含运行环境、样本数、历史长度和 p50/p95。Runner 的 stdio 写队列固定为 32 帧，并受字节上限约束；慢消费者会收到受控错误并关闭连接。真实 Provider、Obsidian 和目标系统测量由产品验收脚本负责，未设置 `HUHUBOT_PROVIDER_ENDPOINT` 时不会发起网络请求。
