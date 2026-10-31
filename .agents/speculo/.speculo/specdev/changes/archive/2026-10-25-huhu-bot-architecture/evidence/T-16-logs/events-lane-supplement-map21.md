# Map21 事件正确性用例等待预算补充

Root已完整回读086 logs/05、06、07实际日志，均实际Wait。相同270真实AppendEvent及业务断言，普通5ms轮询用299ms发完、308ms完成；race+相同轮询发完3262ms、完成3421ms，其中生产者BeginTx累计1372ms（包含获取连接与BEGIN本身），GetRun观察交易累计约945ms；同race仅在真实270 emit完成后读终态，发完2050ms、完成2170ms。均为单次诊断样本，不作稳定性能保证。外部10秒诊断观察不认证原3秒通过；085原红永久保留。

机制已有实际证据：race插桩成本与5ms公开GetRun观察竞争使该270事务用例超出helper3秒，不是永久卡死、旧context污染或Spec吞吐门违约。Spec的3秒属于spawn→ready，T04另有独立800subject/250ms产品投递门，均不变。

Root实际原生授权086的原T04测试owner /root/credential_provider 追加且仅追加 native/huhubot/tests/contract/events/history_test.go、native/huhubot/tests/contract/events/events_test.go：抽出waitTerminalFor(t,run,budget)，原waitTerminal继续3秒；仅来源快照用例第二compactRun的270条等待显式6秒，给观测到的race成本留有限余量，仍用bounded context确保失败终止。说明实际lane与目标行为，全部270/seq274/SQL-History-Snapshot来源一致/坏JSON/撤权断言、其它3秒及800/250ms门保持。无生产优化、无跨Tx缓存、无批提交语义变化、无skip/retry。

与已授权groups/sources_test.go合计3份永久测试文件。依原T04/T13写集和owner，无DAG/行为范围/票数变化；原081报告保持历史，后续086精确替代事件测试字节。顺序验证两个受影响包normal/race；原9包race和未变normal证据按影响复用，失败不择绿。所有进程Wait后正式交回，再由080完成剩余vet/生成/架构，Root独立E2E/build和两轴审查。

测量口径补充：日志ConnectionWait字段包围整个BeginTx，不能把1372ms全部归为纯排队。单观察方式对照足以证明轮询增加这条路径的实际时间；不据此宣称所有增量都已微观归因。
