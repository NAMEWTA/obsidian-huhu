---
schema_version: 2
session: "20261025T043239Z"
task: "136-memory-ts-review-repair"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-01
---

# 修复合法context页与来源epoch客户端校验

## Goal

原TS owner native:/root/foundation_client修复F-133-02及F-133-01的TS hostLeaseEpoch同族遗漏；131已完成报告/源历史保留。只维护原两TS文件。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715；Map37 / Goal36。28票55AC与团队授权持续；真实模型/Obsidian/目标OS用户后验，当前只做代码开发/代码层检查；不索凭证，不提交推送发布归档，不再委派。

按Map→dev/testing→T01/T14及I/TDD、Unicode/错误/真实消费者规则。133独立双轴request-changes，正式REPORT SHA875f1e58db2e2e0ad14e044db3f21361eecf35b7b0c7e91609060d91a8381179，原Input 6619727eaa9258e3fd26820b22c9dc82fed23b9cc59d4748f2979022276b0c2d，Root已全文回读/47工件与1719文件模式核验并接纳finding；evidence/133-lead-return.json和evidence/T-14-logs/component-review-repair-window.json为处置。133已原生MESSAGE+FINAL并全部停写/Wait，旧报告不得修改。115/123/125R3权威合同保持，不通过收紧/放宽产品预算掩盖实现错误。

当前method-validation.ts SHAee7b25aa3cba3e6a7a968b84691fe0cb741d2b8a05f696a2db627bc119e952b5，memory-validation.test.ts SHA93a5ac2293deb6feefbc0224e5ba561ef59e5d77ef96da638ffb0be99a7782af。133 logs/09首次红、10三预算真实BotClient/HapConnection对照：243882整包通过ready；249642整包合法（entry249443，最大sourceID434 B、3×32 scope IDs、含Go HTML转义）被误拒closed；266922整体超限正确拒绝。125R3仅规定context.get整体262144，没有entry245760。当前producer把ExplicitSources放一attachment的静态路径已追踪，SQL端到端尚未运行。

## Workspace and Scope

仅src/modules/huhubot/core/protocol/{method-validation.ts,memory-validation.test.ts}及自己的136报告/logs/manifest可写。api.ts/schema/fixtures/generator/其他TS测试/Go/SQL/锁/主产物/正式状态均只读，131/133旧报告不改。

## Acceptance

1. 去掉context entry误加的普通MemoryObject245760上限，保留context.get整个262144、text slice4096、来源数量/字符串/Unicode/分页等原门。普通object240KiB与MemoryPage整包256KiB且单object240KiB不变；不能提高整个页上限或改变Go编码计数来迎合样本。
2. hostLeaseEpoch在Memory嵌套SourceSnapshot/SourceScope中须是canonical 1..MaxInt64，与source当前受理一致；补positiveDecimals或同等精确语义，0/前导零/Max+1拒绝，1/Max保留。不要改变非Memory方法的原Decimal语义、零usage合法性。Go nested输出门由135负责。
3. 自己新增永久回归，先当前生产实现的真实行为红，再修复；复用133实际三预算数据/场景但不要只断言内部helper。真实BotClient→HapConnection/codec受控帧证明合法大context页resolve且ready，整体超额仍明确拒绝/closed并清理连接；source/scopes epoch合法/非法正反控和已有namespaceRevision边界保持。
4. 依据Map34当前独立TS/Go资源合同，你可在Root显式派遣后运行限定4文件(memory-validation/method-validation/codec/connection)及必要测试类型检查；Go写入不是该Node闭包输入，schema/API TS/配置/锁仍冻结。固定真实输入与实际exit/Wait/source drift，既有75测试按受影响范围复验，不重跑不变生产tsc无意义矩阵。全lint/build/generation/混合CLI由Root/T27后续协调；不得运行Go。

## Return

先原生ACK。结束时停写自有产品、实际Wait全部进程；REPORT首h2前Session: 20261025T043239Z、Task: 136-memory-ts-review-repair、Status；包含聚焦交接/产物与验证/问题与下一步，真实首次红/修复绿、输入/source drift/每命令exit和Wait、完整工件manifest、未验边界。亲自validate-dispatch return actual0后MESSAGE+FINAL，Root回读并新输入独立复审，不改133原结论或正式状态。
