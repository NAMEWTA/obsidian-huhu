# 任务回报

Session: 20261031T062046Z
Task: 021-dependency-scale
Status: completed

## 聚焦交接

T09改前规模夹具与证据已完成并停写，生产模型未改。真实50/100/200总Run各覆盖链式、分支委派、共享来源、多来源、撤权五阶段；最终memory_dependencies分别为7550、41400、108963行。50定向已有效通过，按Lead指示完成022只读审查后仅继续100/200，避免无理由重跑。两条规模命令与既有pnpm bench:huhu-bot均退出0；Lead可验收后让T10复用此夹具收紧结构合同，不能将本票视为模型优化已完成。

## 产物与验证

### 范围和已有实现预检

遵循021 TASK、Ticket09、Map16、Spec AC291、ADR004、dev/testing和execution-boundaries；先向Lead报告现有接缝及影响范围，再实施。现performance只测100次1KB wire帧；既有scripts/bench-huhu-bot.mjs是Node JSON回环，不能当依赖图测量。实际复用private-memory/bootstrap/production API测试接缝，SQL只读采样；没有新增依赖、改生产模型、改脚本或根配置。T16写集继续冻结；没有Git写入、远程操作、真实宿主或递归派遣。

本次8个文件：

- `native/huhubot/tests/contract/performance/dependency_scale_test.go`：真实混合负载、硬断言、逐阶段测量和可选JSON输出。
- `native/huhubot/tests/contract/performance/dependency_scale_fixture_test.go`：适配本仓private-memory fixture的生命周期与公共API助手，原使用处注明本地来源。
- `docs/e2e/dev-overhaul/storage-scale/README.md`：中文方法、15阶段基线表、复跑步骤、计量边界。
- 同目录`runs-50.json`：首轮50的工具控制台阶段JSON逐项保存，注明保存来源，不伪造原始日志文件。
- 同目录`runs-100-200.json`、`runs-100-200.log`：后两规模由夹具直接输出的JSON和完整Go日志。
- 同目录`node-bench.log`：原Node bench输出。
- 同目录`inputs.json`：实际235项内部生产Go/SQL及go.mod/go.sum SHA256，说明工作树生产输入不等于base原字节。

### 真实机制与替身边界

`bootstrap.OpenWithOptions`启动真实生产Core/executor/SQLite。Assistant/CreateSession/StartRun/agents.delegate/Memory.Correct/Memory.Forget/Events.WithDelivery全部走生产API；没有SQL插入造图、替身闭包或重写依赖算法。Engine只替代外部模型返回固定虚构文本并调用生产委派工具；读取真实EngineInput进行观测。每个规模独立Profile，N/2链式Run、3N/10父子分支Run、N/10共享源Run、N/10多源Run，最后撤权不加Run；总计三规模350个真实Run。所有数据与session-memory凭据虚构，maintenance token预算0避免自动维护Run混入，但completion outbox/job仍真实产生。

结构硬断言：每阶段实际execution_runs与engine身份精确数；N/5子Run；每共享Run召回1来源、每多源Run召回3来源；撤权前共享Run可交付、撤权后全部MEMORY_FORGOTTEN、独立多源Run仍可交付；依赖与输入结构量非零。T10应保持这些行为，再收紧存储行/直接边增长，时间不作为正确性阈值。

### 实际执行

环境：Ubuntu26.04.1 LTS、Linux7.0.0-38-generic x86_64、i7-12700、可见8CPU、MemTotal31765032kB；Go1.26.10/GOWORK=off/CGO_ENABLED=1，Node26.11.1、pnpm11.1.3。base/HEAD沿用86c500556db1d64865c4cc7f1aff1dd83de071fa，实际生产输入以inputs.json为准。

| 命令（Go命令cwd=native/huhubot） | 真实结果 |
|---|---|
| `GOTOOLCHAIN=go1.26.10 GOWORK=off go test ./tests/contract/performance -run 'DependencyScale/runs-50$' -count=1 -v` | 初次编译退出1：Agent.Model不能直接作ModelBindingDraft；在新测试中显式转换，重试退出0，包耗时3.320s，五阶段全部通过 |
| `HUHU_DEPENDENCY_SCALE_OUTPUT=/home/wta/projects/obsidian-huhu/docs/e2e/dev-overhaul/storage-scale/runs-100-200.json GOTOOLCHAIN=go1.26.10 GOWORK=off go test ./tests/contract/performance -run 'DependencyScale/runs-(100\|200)$' -count=1 -v` | 退出0，129.369s；100约29.77s、200约99.58s，十阶段通过；stdout/stderr保存runs-100-200.log |
| `pnpm bench:huhu-bot` | 退出0；samples100/history100，p50=0.03924ms，p95=0.083132ms，provider=not-run |
| 两个新Go文件`gofmt -l` | 退出0，无未格式化文件 |
| Python本地证据核对 | 退出0；15阶段relations总数与dependencyRows相等、WAL差值一致；100/200日志与JSON逐项一致；README本地链接存在、文本无尾随空白；235项生产输入摘要未漂移 |

没有运行新的全量Go、插件构建或全仓lint；此次仅Go测试和测量文档，go test包含默认适用vet，未改TS/产物。两组命令共同覆盖默认TestDependencyScale的三个子用例，不把拆开运行伪称一次未执行的全规模命令。50通过后夹具源码摘要始终未变。

与bundle协调后才开始：T06所有重型命令已退出；恢复100/200时再次通知窗口，bundle确认其023仅TS控制，无Go负载。100/200结束后已通知释放。Node JSON bench约0.39秒短暂与100阶段早期重叠，时间观测有该限制；未与其他Go构建/真实runner并跑。

### 基线与计量口径

完整15阶段及分组/耗时/Heap/RSS/WAL表在storage-scale/README.md，全部原始字段在两个JSON。核心累计结构表：

| N | chain | branch | shared | multiple | revocation | 最终直接选入上下文 | 最终有效输入refs |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 50 | 7350 | 7430 | 7470 | 7550 | 7550 | 600 | 670 |
| 100 | 41000 | 41160 | 41240 | 41400 | 41400 | 1620 | 2590 |
| 200 | 108163 | 108483 | 108643 | 108963 | 108963 | 3095 | 7337 |

“直接选入上下文”是每个实际EngineInput的ShortTerm/Memory Ref去重数量之和，不是DB direct边数或完整图入度；排除隐式当前intent、委派envelope与完成后聚合的子结果。“有效输入refs”是生产Lineage.Derived长度之和，非自算闭包。另列持久化owner_kind/relation真实分组，不能把origin名称误当direct。200规模最终context_entry:effective86691、run/message各7337、private_result40、job:origin7558；直接输入3095与实际依赖108963的区别可供T10定位重复存储，不是无限规模复杂度证明。

WAL是stat前后有符号文件大小差+5ms采样峰值，checkpoint回收会使差值为负；不冒称累计写入量、写放大或fsync次数。HeapAlloc/RSS是5ms采样整个Go测试进程的观察峰，包含测试器开销与前一规模残留，可能漏峰；非Linux的RSS不可用记0。stage elapsed只计动作和采样器结束等待，不含初始化与阶段后SQL查询；只观察无性能阈值。实际短期窗口/128来源上限使200链出现累计2055省略量，未隐藏饱和。单次样本、受控模型、Linux本机，不代表真实provider/其他OS/Obsidian性能。

### 停写摘要

```text
cdca73d9946270c8580cd0cc236aede0147d805ae35267c70fec8a0ef835679c  docs/e2e/dev-overhaul/storage-scale/README.md
1317aa0817ed2d60597cb63a45eca0d900787c45029b145a711e0417844559e2  docs/e2e/dev-overhaul/storage-scale/inputs.json
da02152e3f614a314cf2f3434444fdf453fe7b929b91c5fc3e9b71372f88b4aa  docs/e2e/dev-overhaul/storage-scale/node-bench.log
bc5a89321ac1f07630e2c2adfc62cac0cd2024b3333d1f0b2bebe70bc07d2f6b  docs/e2e/dev-overhaul/storage-scale/runs-100-200.json
edff60bb596bd7a249330b61ef5d631fb0384cf747acb45470cdd4c25804820a  docs/e2e/dev-overhaul/storage-scale/runs-100-200.log
0742a4728cad4b08dedef4c3052e0dc6960b42f0f418d9d73f9fa635297e3468  docs/e2e/dev-overhaul/storage-scale/runs-50.json
829020d006b6800273e15fe6facd7367c7c9aec5bb488c337b28d66111a9e012  native/huhubot/tests/contract/performance/dependency_scale_fixture_test.go
28793abeaaed43306d9f964835e44eff04d7ccff2b5806ebaf8a606f410e71ad  native/huhubot/tests/contract/performance/dependency_scale_test.go
```

## 问题与下一步

没有本票尚未执行的必需测量；候选停写交Lead验收。E2E not-required（测试测量基础设施）；未声称Windows/macOS、真实Obsidian或模型已优化。T10应复跑同一输入模式与断言接缝，另存改后结果并比较结构量；保持当前改前原证据，不先改模型让基线消失。T06修复审查与T16复审不在本票完成声明内。
