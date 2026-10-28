# 大队列恢复领取夹具

这里的两个 Profile 全部来自本包受控 Engine、公开 Application API、真实
Executor/SQLite：分别公开受理 4/6 个根，每根真实委派 32 次；限制固定为
`3/32/1/5/8`。五个真实 producer 固定第六树从未领取。没有真实用户、密钥、
外部账号、Provider 请求或 Obsidian 数据，也没有手写 SQL 业务状态。

普通测试仍执行完整公开构造、真实 Close/Done、重开和目标消费。`-race`
只将高密度构造替换为本目录的不可变完整 Profile 输入：逐项验证摘要、复制到
独立临时目录，再执行真实 Recover、资格查询、Cancel、CAS Resume、原31/32个
孩子消费及其它闭门树、身份、唯一性、pin/slot断言。目标没有跳过；这不宣称
高密度构造已在 race 下测试通过，也不改变生产两分钟执行上下文。

## 重新生成

在仓库根执行：

```sh
cd native/huhubot
HUHU_GENERATE_CLAIM_FIXTURES=1 GOTOOLCHAIN=go1.26.10 CGO_ENABLED=1 go test -mod=readonly -p 1 ./tests/contract/chat -run '^TestClaimPassesClosedRecoveryPagesWithoutChangingOtherTrees$' -count=1 -timeout=240s -v
```

该命令必须是普通模式，不能加 `-race`。没有这个显式环境变量时，测试不会
重写仓库里的夹具。每个 case 在真实 Close/Done 后、任何 Recover 前打包整个
Profile；只有该 case 随后的完整消费、全部断言与 Core/DB 清理通过，才发布 archive，最后
发布 manifest。生成阶段的这四份预期资产写入与后续冻结验证的漂移分开核对。

每个 `4-trees/`、`6-trees/` 含：

- `profile.tar.gz`：真实关闭后的完整 Profile，包括 DB 和所有存在的旁路文件。
- `manifest.json`：原根/Run ID、实际阶段/slot、持久限制、Profile/epoch/schema、
  每个文件摘要、archive 摘要及生成生产/测试代码的来源摘要。来源计算排除
  自产 manifest/archive，避免循环。历史来源摘要不会被伪称为未来代码版本。

没有清理原 pin、重置回执或补丁修改 Run、恢复树、检查点。当前构造本来不含
CP，生成时明确核对该事实；其它审批/恢复测试另行覆盖真实完整 CP。

## 停滞与完成边界

目标只观察 worker 启动前固定的原31/32个 eligible Run。仅这些 ID 首次进入
持久 `succeeded` 可刷新六秒停滞钟；轮询、Engine 进入、重复行、父状态变化
和额外 Run 都不能刷新。另有90秒绝对总预算。失败/取消立即失败；最终必须
当前完整读到原 ID 全部 succeeded 且原父成功。孩子与父的两次读取间允许合法
提交交错，累计历史成功集合只用于停滞时钟，不代替最终当前状态。

旧前页遮蔽零进度仍在六秒失败；正常构造的源摘要、旧源同语义有效红及后续
normal/race 的实际输出由对应实施会话保存，不将固定输入当成并发构造证据。
