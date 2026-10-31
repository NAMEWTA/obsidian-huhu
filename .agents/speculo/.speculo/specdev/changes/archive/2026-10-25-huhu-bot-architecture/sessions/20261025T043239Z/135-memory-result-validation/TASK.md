---
schema_version: 2
session: "20261025T043239Z"
task: "135-memory-result-validation"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-01
---

# 修复记忆typed结果编码前校验

## Goal

原API owner native:/root/foundation_go修复F-133-01的Go部分；134运行任务继续停写，不能借本任务回到Core或改schema。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715；Map37 / Goal36。28票55AC与团队授权持续；真实模型/Obsidian/目标OS用户后验，当前只做代码开发/代码层检查；不索凭证，不提交推送发布归档，不再委派。

按Map→dev/testing→T01/T14及I/TDD、Unicode/错误/真实消费者规则。133独立双轴request-changes，正式REPORT SHA875f1e58db2e2e0ad14e044db3f21361eecf35b7b0c7e91609060d91a8381179，原Input 6619727eaa9258e3fd26820b22c9dc82fed23b9cc59d4748f2979022276b0c2d，Root已全文回读/47工件与1719文件模式核验并接纳finding；evidence/133-lead-return.json和evidence/T-14-logs/component-review-repair-window.json为处置。133已原生MESSAGE+FINAL并全部停写/Wait，旧报告不得修改。115/123/125R3权威合同保持，不通过收紧/放宽产品预算掩盖实现错误。

当前memory.go SHA855d2374f3b77d90cee7a884046f3743d588b5399d7b9979fb7104b4ce528346，context.go SHAdc8403b6abb23b74d49e8b7230385464f31964c35b8c06b0e3ff68fad6f3cb69。133 logs/03、05是真实纯API/公开hello→Router→fakeMemoryAPI的4反控失败，08真实客户端接收其字节；正常来源受理已拦住所测超长ID/越界revision，故本任务修typed输出防御合同，不声称正常用户绕过权限。原probe与具体同族静态范围见REPORT F01。

## Workspace and Scope

仅native/huhubot/internal/application/api/{memory,context}.go、确有必要的新memory_result_validation.go、新memory_result_validation_test.go，以及internal/adapters/inbound/hap/memory_result_validation_test.go可写。其余API/HAP生产、132manifest_test、common/drivers/Core/SQL/locks/generator/schema/fixtures/TS均只读。自己的135报告/logs/manifest可写；129/132/133/134交接保持。

## Acceptance

1. 对本来可输出的Memory/context typed DTO，在encoding/json Marshal之前检查所有实际输出字符串为合法UTF8；不能Marshal后再找已被替换的字节。按原DTO合同校验嵌套SourceSnapshot/SourceScope、scopeResourceIds、optional IDs、revision/hostLeaseEpoch及可选metadata。共用纯helper使body/context等分支不漏检；不引入SQL/SDK/wire依赖、循环或当前授权判断。
2. 覆盖133同族范围：Body.JobID/userCreatorAgentID、candidate/job Reason、MemoryJobRun Reason/Usage、eligible=true settings Reason、context view/entry Reason/SourceRefs/可选元数据。区分schema已有enum/required/range职责与UTF8/字节/Decimal语义，不机械给全部字符串512上限或把所有数字变正数；合法零用量、optional空值按原DTO序列化合同保留。Source当前资格/权限仍由真正Store检查。TS hostLeaseEpoch由136同族修复，勿改TS。
3. 先在当前真实生产入口保存作者永久回归的行为红（可复用133反例事实但自己实际运行），再最小修复；正常512-byte IDs、MaxInt64 revision/epoch、普通Unicode和零usage继续通过。513-byte、多字节/非法GoUTF8、越界正数、Scopes及可选metadata反控必须在真实Router发送前失败，不靠Client断连兜底。pureapi与纯HAP测试可用显式fakeMemoryAPI，仅证明输出门，不冒称SQLproducer。
4. 132完整/manifest canonical编码与旧golden、DTO/wire形状及MemoryPage/context整体预算不变，F02合法context整包249642 B不能被Go新增单entry245760限制误拒。无需生成wire、改变schema或扩大Scope。应用/API边界无外部依赖。
5. 初始写入/Go检查必须等Root明确告知128全Core Go窗口已结束。其后你独占纯api/typedHAP Go窗口，136独立TS/Node可以同时检查，schema/fixtures/locks均冻结。先固定真正输入并go list证明仅api+HAP/protocol等纯闭包，无Core/SQL；只定向tests/vet及必要旧helper消费者控制，不机械重复旧全矩阵。Go1.26.10/GOWORKoff/GOEXPERIMENT空/GOFLAGSreadonly/GOPROXYoff，normalCGO0；保存所有actualexit/Wait/drift。禁止foundation整个包/全build/Node/generation。

## Return

先原生ACK。结束时停写自有产品、实际Wait全部进程；REPORT首h2前Session: 20261025T043239Z、Task: 135-memory-result-validation、Status；包含聚焦交接/产物与验证/问题与下一步，真实首次红/修复绿、输入/source drift/每命令exit和Wait、完整工件manifest、未验边界。亲自validate-dispatch return actual0后MESSAGE+FINAL，Root回读并新输入独立复审，不改133原结论或正式状态。
