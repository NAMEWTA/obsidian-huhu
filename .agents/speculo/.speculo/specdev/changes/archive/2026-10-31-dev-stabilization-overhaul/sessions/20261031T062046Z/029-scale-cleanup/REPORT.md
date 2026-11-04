# 任务回报

Session: 20261031T062046Z
Task: 029-scale-cleanup
Status: completed

## 聚焦交接

修正T09 fixture清理owner及Lead追加授权的只读URI风险：RequestStop后直接WaitClosed(background)，不再因6秒观察超时放行TempDir删除。真实50 Run五阶段与Core收尾通过，结构字段与原50完全一致；100/200未重跑，原测量JSON/log/inputs全部未改。特殊字符真实SQLite探针红转绿，README区分原测量、收尾检查点与最终URI修正摘要；候选停写交Lead。

## 产物与验证

- 静态风险证据：原fixture的Cleanup中WithTimeout(6s)→WaitClosed返回ctx错误→t.Error→Cleanup返回，而t.TempDir的清理随后执行。t.Error不等待Core，故实际WAL同步慢于6秒时目录可提前删除；这是控制流发现，没有编造行为红灯。
- 最小修复：删掉本地6秒observer context，使用core.WaitClosed(context.Background())，保留整体go test时限及Core终态错误的t.Error。T04 WaitClosed等待closed后返回真实closeErr，故失败也在收敛后报告。没有固定sleep、更大observer期限、镜像测试或生产修改。
- 原测量fixture SHA：829020d006b6800273e15fe6facd7367c7c9aec5bb488c337b28d66111a9e012。主测量测试28793abeaaed43306d9f964835e44eff04d7ccff2b5806ebaf8a606f410e71ad不变。旧021报告保留历史，不覆盖原摘要。
- 首次命令误从仓库根运行Go测试，退出1“cannot find main module”，未进入测试；日志/tmp/huhu-029-scale50.log。没有创建根go.mod。随后修正cwd到native/huhubot。
- 实际命令：`GOTOOLCHAIN=go1.26.10 GOWORK=off go test ./tests/contract/performance -run 'DependencyScale/runs-50$' -count=1 -v`，退出0，3.418s，Linux/Go1.26.10；完整日志/tmp/huhu-029-scale50-module.log。
- Python对比该次五阶段与原runs-50.json：runs、dependencyRows、relations、directSelectedInputs、effectiveInputRefs、omittedAuthorized全部相同，退出0。最终依赖7550行。WAL/时间/内存是本次不同观察，不覆盖原证据。
- 与bundle确认025真实Go已结束后占用约3秒窗口，结束已通知释放。100/200采样路径和235项生产输入未变，收尾在阶段采样之后，按TASK复用原结果；无全量Go/规模重测。

### 同任务追加授权：只读URI修正

Lead确认新增fixture风险应在本票处理后，仅在同一fixture追加scaleReadOnlyDSN及两个近邻测试；无生产改动。编码逻辑借鉴base/store.go sqliteFileURL，来源注释就地保留；Windows用opaque盘符并统一斜杠，Unix用file URL，保留字符转义后通过url.Values设置mode=ro。实际database()使用该helper。

- 真实红灯：先添加含合法特殊字符临时目录与SQLite读写探针，旧拼接在sql.Open报`invalid URL escape "% s"`；`GOTOOLCHAIN=go1.26.10 GOWORK=off go test ./tests/contract/performance -run '^TestDependencyScaleReadOnlyDSN$' -count=1 -v`退出1，日志/tmp/huhu-029-uri-red.log。这是真实SQLite入口失败，不是字符串镜像断言。
- 修后：`GOTOOLCHAIN=go1.26.10 GOWORK=off go test ./tests/contract/performance -run '^TestDependencyScaleReadOnlyDSN' -count=1 -v`退出0，2测试，0.025s，日志/tmp/huhu-029-uri-green.log。真实创建原库，再经readonly URI读出original；INSERT明确errors.Is(SQLITE_READONLY)，原行数仍1。Linux目录包含空格/#/%/?，Windows分支只用其合法的空格/#/%；盘符编码表覆盖反斜杠C盘、斜杠D盘与Unix，但不是Windows实际I/O证据。
- 只收尾修正SHA为cf09923338ecc1d328ff5634fbf29fd8dc4975a4cb34d3e1426f42ec520fb81a；原测量SHA仍保留，最终SHA如下。主规模测试、旧JSON/log/inputs不变；这次仅验证URI接缝，复用刚才真实50收尾结果，不重跑100/200。

当前停写摘要：

```text
eb755c33b3dde1067c7f3267f7fb0f2f13023aafc6f89d91af58daf49fc4b49c  native/huhubot/tests/contract/performance/dependency_scale_fixture_test.go
d67c503989a7323ef46d6093af7386e4275f0015ce2fce13decc473340d24b71  docs/e2e/dev-overhaul/storage-scale/README.md
```

## 问题与下一步

清理归属与新增fixture URI风险均已修正并交回；未把本次可修问题留给下游。没有Windows实际I/O证据，不宣称跨平台验收。Lead可将最终fixture/README摘要作为029增量验收，原测量证据保留历史结果；没有产品或原始测量数据写入。
