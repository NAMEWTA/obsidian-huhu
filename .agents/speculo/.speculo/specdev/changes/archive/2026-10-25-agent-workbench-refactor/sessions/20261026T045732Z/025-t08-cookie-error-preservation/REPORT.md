# 任务回报

Session: 20261026T045732Z
Task: 025-t08-cookie-error-preservation
Status: completed

## 聚焦交接

**SOURCE STOPPED：2026-10-26T14:56:57.761961Z。**已完成 F7 三路径候选；原 `nativeCookieReader` 在同次 request/release 双失败时返回 `AggregateError`，`errors` 顺序为两份原对象，`cause` 是原读取错误，message 保留读取诊断。仅一方失败仍抛其原对象；成功仍返回原结果对象。每次已取得的 lease 恰一次 release，等待清理结算后才返回，原 lifetime/request signal 监听在所有路径移除。

本报告只交实现候选。Root 拥有恢复周期1 attempt3、产物/消费者组合、完整91路径独立 R5 与正式状态。当前任务没有把 T08、T09 或整个 Goal 改为完成，没有提交/推送/发布/归档，也没有递归派遣。

### 范围与设计

按原 workspace 和 gpt-6.1-sol/xhigh 身份执行。TASK SHA256 `bc9a1bcaddc428c92fe92fc1b1c6c50953fc92d3e37622519f03feaeac2f607c`；GP032/Map33、allocation-r6 SHA256 `33d0217ef8c2840a4d74dc8686ee8eb02bda7dd21eb040b509ac7ba794c19f05`。Root preflight manifest SHA256 `85d8b6ac72c78a1d28868cdafbd6104ec49ac5c3d494f9e10224905494f5a86e` 已校验并完整保存到本次 tmp。

完整回读 TASK、cookie-failure packet/replan/r6；沿 Map→dev→当前 Ticket/Goal 与 specdev-i-implement 权威入口，应用 codebase-design、design-it-twice、TDD、error-handling、test-reliability。dev/testing 的生命周期/原消费者边界落实在实际测试和类型/lint中；没有 UI/DESIGN 改动。旧五个未来共享路径警告沿 Root 串行调度处理，不扩张授权。

比较三条局部路线：原 finally 会覆盖读取错误；忽略 release 错误会回退 F6；采用原函数内显式双结果，既不增加公共 API/生命周期管理器，又保留完整事实。内部判别联合不以错误值真假判断，所以抛 `undefined/null` 的读取也不会变为成功。release 失败且读取失败时才聚合；没有自动重读、重复释放或提前返回。acquire 未成功时仍只走外层监听清理，没有无主 lease 释放。

生产改动全部位于 `src/shared/native/cookies.ts`，Host、Helper、共享 host、Rust、协议和原017 pair 均未修改；原外层 readCookieRows 文件清理问题也未扩写。最终 `scope-final.json` 对 Root 冻结2148条记录比较，恰3条差异、`outsideThreePaths: []`。

| 路径 | before SHA256 / mode | after SHA256 / mode |
| --- | --- | --- |
| `src/shared/native/cookies.ts` | `f1bf22a532da8df23916e719929f61ffd37f12221ce25f7b3ec31f155fba3ad9` / 0600 | `981889f28f14057d0859d9b7954cfb5f450c190a9b4bc431f81648557859dfc6` / 0600 |
| `src/shared/native/cookies.test.ts` | 不存在 | `0624fd47006c6ece74d5e2a4462510670214320431d0f93676e32b6f10ab11cc` / 0664 |
| `src/host/desktop/native/host.integration.test.ts` | `c254468ddb4f96c6cc7ebf810aa0b9eb4cdd2c3277e62599eb899dc2e99aa1a1` / 0600 | `9ad12e8a5e600176fbc92b7cb2c78762a4093c9c884d4b1d5e959decc15a372e` / 0600 |

原字节、最终字节、精确增量分别在 `three-paths-before.json`、`three-paths-after.json`、`three-paths.diff` 和 CAS；停写回执为 `source-stopped.json`。原两个文件 mode 未变，新测试是本次新增。

## 产物与验证

证据根：`/tmp/huhu-t08-cookie-repair-20261026T144105Z`。

### 原入口红绿和故障事实

1. **001 单位目标红（exit1）**：正常 import 生产 nativeCookieReader，经 NativeHostAccess 边界提供两份不同原错误；读取与释放各一次。实际只收到 cleanup Error，`toBeInstanceOf(AggregateError)` 失败，证明原 finally 覆盖。
2. **002 真 native 目标红（exit1）**：正常 import 生产 reader→NativeHost→PtyHelper，运行指定017二进制。Cookie 准入后才释放旧 PTY owner，并只替换自己的 endpoint；没有 mock request/回包。真实 cookies-result 的 rid 为 `23ffbbd0-5a37-4ce3-bf31-f60ffba93390`，读取缺失 SQLite 报错；公开结果仍只有 NativeShutdownError，目标聚合断言失败。fixture 的原 socket/sentinel/PID/退出及最终自有清理记录保留在 `native-dual-niAOqS`。
3. 最小生产修复后，**003** 单位双失败已通过；native 已返回 AggregateError，但夹具错误地要求早先 termination fence 与后续 outcome 完全相等，因 `stdioClosed:false/true` 不同而失败。保留原件，**不把它算新的产品红或通过**。修正仅区分两个真实不可变快照：最终 public outcome 仍严格要求 exited/code1/forcedfalse/stdioClosedtrue；termination 保留其真实退出事实，不改 F6 producer 或把 exit1 变成功。
4. **004** 双目标绿；后续加入单失败、取消/监听、等待释放矩阵和 fixture 失败清理，**010 最终两文件14/14通过，无 skip**。原 SQLite exclusive lock→Agent release→Cookie 继续成功→最后 helper 被回收用例保留，原断言未删/放宽。

单位12项覆盖成功原结果、仅读取失败原对象（含 undefined/null）、仅 cleanup 原对象、双失败原对象顺序/cause/message、acquire 失败、两类初始 abort、两类读取中 abort + cleanup 失败、acquire 中 abort。显式 barrier 观察 release 未结算时 reader 仍 pending；监听添加/移除对应原 listener，成功后原 signal 的迟到 abort 不再传播。次数只是伴随断言，主要观察结果、原对象和清理完成。

### 最终真实 Cookie 链

最终010对应 `native-dual-RUfZIi`：

- 原 fixture 根 `/tmp/huhu-t08-cookie-repair-ygclbL`，mode0700；自有 missing-cookie-snapshot.sqlite，没有真实 Cookie/账号数据。
- 同次原 cookies-result `rid=d4372bb8-e512-4fe7-90ef-c030b86a0b01`，error 为 `unable to open database file: /tmp/huhu-t08-cookie-repair-ygclbL/missing-cookie-snapshot.sqlite`；完整 frame 保存。
- 公开 `AggregateError.errors[0].message` 与该原回包 error 相同，`cause===errors[0]`、第二错误是原 NativeShutdownError，关系在内存严格断言并记录。单位边界另以两份预先持有的原对象证明 identity 不变。
- cleanup outcome 为 `{state:'exited',code:1,signal:null,forced:false,stdioClosed:true}`，diagnostic 保留 `editor service shutdown incomplete: control identity changed`。更早 termination 快照的 stdioClosed 为 false，原件分别保存。
- 初代 helper PID474024、原 PTY PID、原 socket path/dev/ino、替代 sentinel path/dev/ino/content 均在删除前保存。sentinel 前后身份/内容完全相同，证明 native 未删替代实体；先观察真实 exit1、PID gone 与公开失败，之后才删除自有 fixture。
- 旧 helper 明确退出后没有自动重启。下一次**显式** cookies acquire 才产生 helper PID474054，最后 release 正常 exit0；两个进程都已回收。没有重读原 request，没有用外部清理充当产品成功。

017 pair 只读复用：`/tmp/huhu-t08-native-shutdown-linux-20261026T115900Z/huhu-pty`，31,119,408B / 0555 / SHA256 `950b1832947eaa287ef9c03499e9574a61ee7b7c4845a31ff422a350ce3af843`；同目录 `huhu`，15,428,448B / 0555 / SHA256 `63db57114503eaedf757c6c087eef8c0c268d393dc86b58035de51c67fdacd74`。未构建 Rust、写 Cargo target/缓存或替换 pair。这里是 Linux controlled Node endpoint + 真 native/SQLite 消费链，不是官方 Pi 或用户宿主/平台 E2E。

### 实际命令

每个 `commands/<编号>/` 有 exact argv/cwd、UTC起止、exit、raw SHA、环境覆盖及输入前后快照；完整正文见 command receipt。所有测试/类型/lint执行均列入编号，不把只读发现、编辑与宿主工具读取伪列为 runner 命令。

| 编号 | 实际作用与结果 |
| --- | --- |
| 001 | reader 单位双失败目标红，exit1，真实目标断言失败 |
| 002 | 017 pair 真实双失败目标红，exit1，真实目标断言失败 |
| 003 | 修复后一次夹具快照等值断言失败，exit1；保留，不算通过 |
| 004 | 两个双失败目标通过，exit0；名称筛选的原用例未执行 |
| 005 | 两文件14项通过，exit0 |
| 006 | 标准 TypeScript CLI：`--noEmit --incremental false --skipLibCheck -p tsconfig.json`，exit0 |
| 007 | 标准 TypeScript CLI：同 flags、`-p tsconfig.test.json`，exit0 |
| 008 | ESLint `src/shared/native/cookies.ts --max-warnings 0`，exit0、零警告 |
| 009 | 单位 barrier 失败清理调整后，两文件14项通过，exit0 |
| 010 | 最终 fixture 清理调整后，两文件14项通过，exit0，0 skip |
| 011 | 最终 `tsconfig.test.json` 类型，exit0；生产源与006/008相同 |
| 012 | 原件/工具/进程与自有 fixture 归档清理，exit0 |

测试由绝对 Node `/home/wta/.volta/tools/image/node/26.11.1/bin/node` 执行仓库 Vitest CLI，正常读取原 `vitest.config.ts` 的项目/别名/setup；仅在 tmp config 增加原文件字节读取观察及 tmp cacheDir。没有改生产装配、Mock Host/Helper 或替换 native 回包。`HUHU_TEST_PTY_BINARY` 显式指向017；HOME/USERPROFILE/TMPDIR 隔离，移除 NODE_OPTIONS/NODE_PATH/XDG_RUNTIME_DIR，原 SQLite fixture 与新短0700 runtime 各自独占。每条命令有180s外层预算，实际未触发；没有用超时杀进程制造红灯。

### 编译输入与资源

- Vitest tmp observer 在 load 时保存实际提供给编译器的原字节/CAS，最终010为45个实际输入；`compile-loads.jsonl` 与 `compile-index.json` 可核查。类型/lint使用标准 CLI 和只观察 readFileSync 返回值的 tmp preload，不改读结果/错误；006捕获2472、011捕获3547个不同输入，008为4900个不同输入。保存时间是实际读取时，不是结束后用新源码补证。
- `tool-inputs.json` 保存所用 Node摘要、Vitest/TS/ESLint入口/版本文件、原配置、锁文件和本次 recorder/observer；Node内建/OS库不冒称完整字节审计。preflight 全量输入、关键源前后快照、实际编译输入与工具来源分别保留，不把 HEAD 当本次未提交候选。
- `r4-provenance.json` 保存旧021探针5份只读原件及摘要；旧 stdout SHA256 `4fefb3179704925b0198da99acc33cc5823681ba413a314d6c00009b4f6b7317` 已核对。未覆盖任何旧 REPORT/evidence/tmp。
- 6组 native 观察均记录创建、root mode、同次回包、错误和 cleanup；最终与中间有效绿均无 fixture 清理错误，002/003保留其真实测试断言错误。`native-observation-index.json` 与 `cleanup-final.json` 确认六个自有根、endpoint/renamed socket 不存在，全部已记录 helper PID absent，没有要求外部进程清理，没有删除旧 tmp。原 isolate-home 在本次隔离 TMPDIR 下创建的目录也随自身/本次 tmp 清理收束，没有扩写 isolate-home.ts。
- 一次行政读取在009尚在运行时提前找 cleanup.json 得到 FileNotFound；009本身随后14项正常通过，结算后重新只读索引已覆盖该 fixture。不是产品红、也未通过修改断言掩盖失败。

REPORT 原子落盘后才运行 return checker，实际结果另存独立 raw/receipt；这里不预填尚未执行的通过。return 仅检验交接结构，不认证产品验收。

## 问题与下一步

本三路径候选没有已知未完成修复。Root可在此停写输入上进行 attempt3 真实构建/全lint/bundle和 Cookie/Browser 受影响消费者组合，再固定完整91路径交独立 R5；不要求本任务重跑未变 F1–F6、全 native、CLI/Chrome。所有正式状态与产物仍归 Root。

真实 Obsidian、Provider、OS IME 与五平台未运行，沿原合同由用户验收。没有真实 Cookie、账号、Vault 或用户资料读写。**SOURCE STOPPED。**
