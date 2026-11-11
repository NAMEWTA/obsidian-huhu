# 154 合法空 intent alias 的共同 wire 合同修复

Session: 20261025T043239Z
Task: 154-context-alias-wire
Status: completed

## 聚焦交接

已修唯一 generator 并真实重建 schema：readable context 的 intent_alias 必须显式保留空 text，非 alias 的显示正文仍非空；私有 MemoryBody、请求正文与附件/redacted隔离保持。没有修改生产TS语义、Go纯API、Memory Store、模型输入或sealed前缀。共享生成输出、六个实际变更文件及全部自有检查输入均已冻结；所有自有进程真实结束并Wait，限定Go窗已原生归还Root。completed仅表示本修复候选交回，151原request-changes结论、T14完整代码门和Root最终真实producer/物理CLI回读均不在本报告自动关闭。

## 产物与验证

### 真实来源与改动

151原probe使用真实aliasQuestionFixture及Memory.Get取得1条空alias，typed通过、1572B真实结果被wire拒绝；原REPORT、alias-probe_test.go、alias-wire.log仅只读，SHA/mode记在00-read-preparation.json（历史日志已清理：`logs/00-read-preparation.json`），没有覆盖原红。本任务的Node/HAP回归验证真实生产消费者，但受控typed MemoryAPI不冒称是该SQL producer；Root已明确最终物理CLI由其执行，不为形式在本窗口启动Core。

| 实际变更 | 最终SHA256 / mode |
|---|---|
| contracts/hap/v0.1/generate.mjs | `9e60e03d3e37da01079db8547ecceedd1bab2a90949107f52d21170be6bea6c4` / 0600 |
| contracts/hap/v0.1/schema.json | `4e3bd077dd784b5d9a51a87fc5088627c423093c0174f0c4605584a639a227f5` / 0600 |
| native/huhubot/internal/protocol/hap/schema_generated.json | 与公开schema完全同字节同mode |
| contracts/hap/v0.1/fixtures/methods.json | `7d0630888d5d1df796dcf5bc16ba5d8667661860e2cf4cf86b4e534ec5011e48` / 0600 |
| src/modules/huhubot/core/protocol/memory-validation.test.ts | `92a69b4e577d6d336b46d437cf8b110ffb6270a9caff46c0d9d50f0b1a10dcb1` / 0664 |
| native/huhubot/internal/adapters/inbound/hap/context_alias_test.go | `123269a8b203f0202a0aa01ea5dc74e4a146253c495b668b56a73d480f53312b` / 0664 |

generator仅在有partCount的readable context专支覆盖text下界，并加representation条件：alias的text const空串，非alias minLength1。既有非attachment required text/contentHash/displaySlice/partCount、attachment禁止text、redacted不带正文均保留。06-generation-semantic-diff.json（历史日志已清理：`logs/06-generation-semantic-diff.json`）逐JSON路径证明仅memory.get/list四份readable entry各改变text.minLength和追加条件两处，共8路径；其余schema路径完全未变。72方法/144方法validator不变；原302共享样本前缀完全不变，新加1个空alias正控及10个负控，共313样本，不是313个tests。

### 实际生成与保护文件

05-generator.json（历史日志已清理：`logs/05-generator.json`）：`node contracts/hap/v0.1/generate.mjs` actual exit0/Wait，0.842s；调用原generator，并通过PATH限定绝对Go1.26.10同目录gofmt，GOTOOLCHAIN=local、GOWORK=off、GOEXPERIMENT空、GOFLAGS=-mod=readonly、GOPROXY=off。没有手改生成schema或镜像。

Root额外授权原generator对golden.json同字节重建；脚本前后硬断言SHA及mode相同，否则停止。最终以下文件bytes/mode均未变：

- golden.json：`458a7a49654f29a29f95fffac4044b10496aa9f84e46bce758c67305811bf0f0` / 0600。
- methods.json：`1de08db017684d228fd02002fc2e4a47358f6330825d64da582e3172ceb7816b` / 0600；目录、可用性与T15未装配标志未变。
- methods_generated.go：`cbfeab29e5dad9f4eef8d17e7ead5c0abde7b6e41651bc29030681f155487049` / 0600。
- api.ts：`78948204281914149059429b3e0250143e41efa73642d985c2e31e544cfa0a17` / 0600。
- 生产method-validation.ts：`3a3df3d382823db09d80685c3fa9d2c9bcd879a0e6664fac6c50bac29249fc90` / 0600。

### 红绿与类型检查

- [03-alias-ts-red.log](logs/03-alias-ts-red.log)保留首轮原始失败。除空alias被拒和非空alias被放行的真实产品红外，该轮badNamespace夹具浅拷贝误改共享namespace，导致最后正常Unicode正控失败；只把该负控改成structuredClone，生产/生成仍未变，再跑[04-alias-ts-red-stable.log](logs/04-alias-ts-red-stable.log)：两新tests真实红，actual exit126/Wait，1.371s，源/mode漂移`[]`。空alias在公共MethodValidation和真实HapConnection/BotClient帧消费者被拒；非空duplicate alias被错误放行。没有把夹具错误冒充第三项产品缺陷。
- [08-alias-ts-green.log](logs/08-alias-ts-green.log)：直接installed Vitest限定memory-validation/method-validation/codec/connection四文件，**4 files / 81 tests通过，exit0/Wait，3.606s，漂移`[]`**。包括原79 tests、313共享样本、144 cache边界、249642B合法大context页、Unicode/来源/epoch等既有门。新增合法空alias在真实公共BotClient帧路径resolve且ready，text/来源hash/片段元数据保持不变，finally close；没有mock validator。
- 新负控明确保留：非空alias、空非alias、缺text、坏displaySlice/partCount/hash格式/namespace、超过4096 UTF8 bytes的正文、redacted带正文、空MemoryBody、空memory.correct请求。hash匹配原文与当前资格仍是原可信reader职责，不从显示片段text计算或覆盖Source.Hash。
- 09-test-types.json（历史日志已清理：`logs/09-test-types.json`）：`node node_modules/typescript/bin/tsc --skipLibCheck -p tsconfig.test.json` actual exit0/Wait，17.176s，漂移`[]`。只改schema/测试，没有类型签名变化；未机械重跑生产tsc、全lint/build或插件产物。

### 限定Go闭包与分层结果

先按Root的metadata-only许可执行绝对Go version/list，随后取得明确限定Go验证窗。新增HAP测试source-only完成并gofmt后再次实际go list；13-go-list-final.json（历史日志已清理：`logs/13-go-list-final.json`）、14-go-final-inputs.json（历史日志已清理：`logs/14-go-final-inputs.json`）确认154 packages，本仓仅application/api、protocol/hap、adapters/inbound/hap三目录。实际35份本仓Go/测试/embed输入，加go.mod/go.sum和4个运行fixture/受保护合同共41项；没有SQLite、bootstrap、Executor或153/155活动writer输入。TestSharedMethodWireFixtures运行时实际读取methods fixture，schema/catalog/golden也按Root要求固定保护。

15-go-hap-tests.json（历史日志已清理：`logs/15-go-hap-tests.json`）：绝对Go1.26.10 `go test -p=1 -count=1 -v ./internal/protocol/hap ./internal/adapters/inbound/hap`，GOTOOLCHAIN=local/GOWORK=off/GOEXPERIMENT空/GOFLAGS=-mod=readonly/GOPROXY=off/CGO_ENABLED=0，actual exit0/Wait，0.806s，41输入漂移`[]`。protocol包诚实为no test files；inbound实际5 top/40 sub通过，另有313共享wire样本循环，不能将其虚增为313个Go tests。原metadata/UTF8/最大页消费者仍绿。

| 永久HAP控制 | typed API | wire | 真实Router |
|---|---|---|---|
| 空alias | 通过 | 通过 | 成功 |
| 非空alias / 空非alias | 通过 | 拒绝 | INVALID_APPLICATION_RESULT |
| 缺text / partCount0 / 坏hash格式 | 拒绝 | 拒绝 | INVALID_APPLICATION_RESULT |
| text空但slice长度1 | 拒绝 | 可通过结构schema | INVALID_APPLICATION_RESULT |

测试复用受控MemoryAPI返回值与真实hello/Router；typed与wire互补层次明确，未修改纯API去制造一致表象。空alias在Go实际JSON中保留pointer text空串及0..0/PartCount1；非空私有正文门由共享样本及Node消费者保留。最终真实Memory.Get producer/stdio/物理CLI由Root继续证明；本作者未执行或冒称该Core链已通过。

### 冻结与交回

[source-manifest.json](source-manifest.json)固定六自有变更与1647个Node输入、41个Go闭包/合同输入，去重并加generator源后共1686项，bytes/mode tree `38382ca33bc9e72dceecb7807f30432b0d8b4fa361ca7bdcc184feabcd457161`，最终漂移`[]`。既有153/155的Memory/Execution Go写入不属于这两闭包；初期只读追踪文件按当时摘要保留，不假称它们是本次运行输入。所有自有source/test/generator已停写、进程已Wait，Go窗已立即归还Root；后续只写本目录报告与交回工件。结构return实际结果见17-return.json（历史日志已清理：`logs/17-return.json`），不替代行为检查或独立复审。

## 问题与下一步

本候选无遗留本地失败。Root负责实际producer最终CLI、新联合冻结输入与独立复审及必要打包；本任务未运行Core/Foundation/数据库、混合CLI、真实Provider/Obsidian/目标OS或全插件lint/build。151/F1/F2与152/153/155事项不在本票冒称关闭，旧报告/红灯未改。没有改Go纯API/Store/Runtime/Engine/DDL/锁、填重复Intent、改正文/hash/身份或放宽私有非空门；没有索凭证、提交推送发布归档或启动Goal。全部产品进程已结束，继续保持停写。
