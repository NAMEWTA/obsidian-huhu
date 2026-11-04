# 任务回报

Session: 20261031T062046Z
Task: 034-scale-uri
Status: completed

## 聚焦交接

URI修正及红绿检查已在Lead上一条明确补充授权下完成；034持久任务随后落盘，本报告登记同一已完成结果，不再重复修改或运行。029报告保持收到034时的原字节不变；其已包含当时补充授权进展，本文独立列出完整窄修与当前八项摘要。实际特殊字符SQLite连接读正确库且写入被SQLITE_READONLY拒绝，盘符测试仅证明编码，不冒称Windows已实测。候选停写，可接033独立T06复审，本worker未参与T06修复。

## 产物与验证

### 改动和来源

仅`native/huhubot/tests/contract/performance/dependency_scale_fixture_test.go`的观察连接DSN及同文件近邻检查、`docs/e2e/dev-overhaul/storage-scale/README.md`；没有生产/公共API/依赖修改。scaleReadOnlyDSN就地注明借鉴生产base/store.go的sqliteFileURL：反斜杠转正斜杠，Windows drive路径采用opaque URI，Unix采用文件URL，保留字符编码后通过query设置mode=ro；不直接拼接路径为query/fragment。database()使用该helper。

新增TestDependencyScaleReadOnlyDSN创建含空格/#/%的真实临时目录；仅非Windows追加?，避免拿Windows非法文件名伪称Windows测试。先用普通本机路径创建SQLite原库，再经只读URI查询原值；INSERT要求errors.Is(sqlite3.READONLY)，最后原行数仍为1。TestDependencyScaleReadOnlyDSNDriveEncoding覆盖C盘反斜杠、D盘正斜杠、Unix保留字符编码；它不替代目标OS I/O。

### 实际反例与验证

- 旧拼接真实红灯：cwd=native/huhubot，`GOTOOLCHAIN=go1.26.10 GOWORK=off go test ./tests/contract/performance -run '^TestDependencyScaleReadOnlyDSN$' -count=1 -v`退出1；sql.Open报`invalid URL escape "% s"`，未读取正确目标；原输出`/tmp/huhu-029-uri-red.log`。
- 修后同cwd，`GOTOOLCHAIN=go1.26.10 GOWORK=off go test ./tests/contract/performance -run '^TestDependencyScaleReadOnlyDSN' -count=1 -v`退出0，2测试，0.025s；原输出`/tmp/huhu-029-uri-green.log`。均为Linux/Go1.26.10实际执行，未重新命名或覆盖日志。
- 034登记前回读当前fixture和上述原始日志，结果与最终SHA一致；没有新代码变化，复用有效红绿证据而不假称034又执行了一遍。
- 029真实50 Run退出0（3.418s）证明WaitClosed(background)的实际Core收尾；当前只读DSN独立真实库接缝充分，因此没有重复50/100/200。主规模测试和235项生产输入均未变。

### 三次源码关系与原证据

原测量fixture为`829020d006b6800273e15fe6facd7367c7c9aec5bb488c337b28d66111a9e012`；029只收尾检查点为`cf09923338ecc1d328ff5634fbf29fd8dc4975a4cb34d3e1426f42ec520fb81a`；最终URI修正为`eb755c33b3dde1067c7f3267f7fb0f2f13023aafc6f89d91af58daf49fc4b49c`。README保留三者关系；旧规模JSON/log/inputs不改，采样动作/统计定义不变。029报告SHA在本任务登记前后保持`49e3776a6160f436b0a1576ee0ca4e4155a9d9076c7045a32d0a90604a4b474c`。

当前八项候选摘要：

```text
d67c503989a7323ef46d6093af7386e4275f0015ce2fce13decc473340d24b71  docs/e2e/dev-overhaul/storage-scale/README.md
1317aa0817ed2d60597cb63a45eca0d900787c45029b145a711e0417844559e2  docs/e2e/dev-overhaul/storage-scale/inputs.json
da02152e3f614a314cf2f3434444fdf453fe7b929b91c5fc3e9b71372f88b4aa  docs/e2e/dev-overhaul/storage-scale/node-bench.log
bc5a89321ac1f07630e2c2adfc62cac0cd2024b3333d1f0b2bebe70bc07d2f6b  docs/e2e/dev-overhaul/storage-scale/runs-100-200.json
edff60bb596bd7a249330b61ef5d631fb0384cf747acb45470cdd4c25804820a  docs/e2e/dev-overhaul/storage-scale/runs-100-200.log
0742a4728cad4b08dedef4c3052e0dc6960b42f0f418d9d73f9fa635297e3468  docs/e2e/dev-overhaul/storage-scale/runs-50.json
eb755c33b3dde1067c7f3267f7fb0f2f13023aafc6f89d91af58daf49fc4b49c  native/huhubot/tests/contract/performance/dependency_scale_fixture_test.go
28793abeaaed43306d9f964835e44eff04d7ccff2b5806ebaf8a606f410e71ad  native/huhubot/tests/contract/performance/dependency_scale_test.go
```

## 问题与下一步

新增URI风险已在本仓fixture解决，没有留给下游。Windows实际I/O仍未运行且不声明验收；当前scope不要求远程操作。交Lead按八项最终快照验收T09；后续033仅独立审查T06，禁止参与修复。
