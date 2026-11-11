# T-14 汇总入口独立工具审查

Session: 20261105T094057Z
Task: 145-review-integration-entry
Status: completed

## 聚焦交接

Reviewer: native:/root/cleanup_high；既有sol high独立角色，未参与143候选、Root应用或修复，未委派。Strategy: independent；Risk: high（最终验收工具与证据错误传播）；Independence: required；Mode: native。Implementers: native:/root/integration_final、native:/root。**standards: pass；specification: pass；Findings: []。** 结论仅覆盖冻结四路径的汇总/校验工具，不代表13生产fixture或整个T14已经通过。

Root已实际回收Node session5460退出0（20/20）及T14 --check session12903退出0（13children、0cases）。本人进一步逐项核当前输入、13原始子结果、17项定向Node/CLI及5组父调度正负控制，没有重新编译13生产图、运行正式858或浏览器/native。Root另有原生产owner待处置的native问题，不在此工具审查中归因或裁定。**本REPORT与return校验后停止全部读写，释放四路径审查冻结**，Root修复生产问题后再运行原正式矩阵。

## 产物与验证

### 固定范围、来源与摘要

Review mode: working-tree；比较Root已应用的143实际before/after四路径，不以当前HEAD冒作最初dirty基线。读取145 TASK、143 REPORT、132最终收敛方案、T14/Map53/Goal/Spec AC901–903与批准DESIGN3/UI002。标准沿用AGENTS、dev/ui/testing、code-review双轴/独立性/风险/证据合同；本轮触及测试工具，不改设计、产品、原模块fixture或永久知识。

冻结manifest：/tmp/huhu-root-frozen-integration-entry/manifest.json；patch SHA256 da072300353bbb8444a7238256644882f4818b289b2816f340fef329ff69a8a7。本人四路径当前SHA/mode全部匹配Root manifest，mode均0664：

| 路径 | after SHA256 |
|---|---|
| scripts/ui-review/run.mjs | 71f952cbea5a7cb4bfb6d6222eb61015ceb1e336d8fba0536ce49df9405efaea |
| scripts/ui-review/run.test.mjs | 8e1ce360790323efb29270f2faeda757de415a25e6d707f8116b62238d7211d9 |
| scripts/ui-review/fixtures/frontend-redesign/integration/index.mjs | 6399ba2bff9ffea0b41753e22f3824a6932138148f1aacde78cdf3f1f0e3e696 |
| scripts/ui-review/fixtures/frontend-redesign/integration/integration.test.mjs | 4b884650f625fa0a9adc80cdf1b90bca5c2bf43fd722b25c277d41476cc3f27e |

当前main.js/styles.css/manifest.json也与/tmp/huhu-t14-final-artifacts/manifest.json逐项匹配：main SHA c9a47f6a7a765a6fa78bcad8318e90f909d16d4411eea346d1cfebffcea5b7d1；styles SHA e5bc1f3ab5c0e1fa8e0299b4378497617e0a3039a5d1083c09c6cebd42c470a8；manifest SHA416a808d099711bcfcf4194dfdce167b670e02bcbf22922a141658036692da16。原staged raw SHA4258d835a7e5cf5c845a981d441a37baa14fb4c834097f83aedeb34e0fb653ec不变；本人未写index或产物。

### standards 输出

Reviewer: native:/root/cleanup_high
Result: pass
Findings: []

中央runner仅frontend-redesign/T14在普通fixture import/build前分派integration；legacy与其它redesign路径保持原matrix/adapterCounts/Node/Electron stub、startup、verify/exercise、捕获失败与cleanup。waitFor仅因保留顶层export移到分支前，未改变截止/异常语义。唯一逐样本新增是实际matchMedia五个布尔值记录；headless pointer:none能够保留，不把计划pointer:fine标签冒充真实fine。

entries为T01–T12与T16固定13项，无T13/T14/T15递归。生产入口白名单与真实预检编译图一一核对。每child是原Node CLI，环境移除继承HUHU_CDP_URL；原runner在各自进程拥有独立mkdtemp、Chrome profile与port0。T09仍走其既有精确Electron stub，未把同realm函数并发或新renderer当隔离。默认并发2、仅1/2/3有效，调度保留索引和每个失败，无隐式重试。fresh子输出目录与wx日志不复用旧result；即使一项失败也收齐其余回执。

父验证实际退出码/信号/错误、ticket/suite/matrix/status、errors=[]、精确66计划及逐样本计划字段、cases完整、sample.failure、原assertions数组、实际media和截图存在/PNG头。T11原verify直接Node assert且assertions可空，未擅改其原断言要求。完整性失败、输入缺失/重复、生产入口缺失、SHA/inputDigest不符、共享样式/host不一致均不能绿。任意校验异常沿schedule/顶层catch进入父errors，最终failed设置exitCode1；不以最后一个child或passed字符串替代整体结论。

当前源码输入全部逐项计算SHA，ASAR按header/offset抽取app.css字节，最终再核所有已收集输入及integration入口自身，能发现早期child验证后的持续漂移。PNG头检查是文件边界验证，不是像素、完整PNG解码或视觉审查；现有child由真实Chrome输出截图，正式运行后仍由Root检查实际产物与设计差异。

### specification 输出

Reviewer: native:/root/cleanup_high
Result: pass
Findings: []

满足132最后收敛及本次工具合同：没有提取/重造产品runner主体，没有空T14 TSX或12同realm模拟页；固定13原CLI各自保留原66，正式父总数必须858。每child保留原result/日志/实际source图和inputDigest，父保存相应定位/计数/媒体/错误及汇总输入。12产品页的生产覆盖来自其原fixture，而不是T04假Page或本轮Node控制。

--check原样透传，只能接受13个preflight/0cases，父最多preflight；不允许check结果充作E2E passed。Root当前预检结果为13项完整preflight、errors=[]、0实际case；本人逐个回读真实child JSON、比对父child摘要、原计划、必需生产入口和当前SHA。父4374个实际输入全匹配，整体digest **16404e3e20d733a9287f5be474402b415b8f742ce84369c8beb87ae11c1b2074**；ASAR app.css SHA f612f1e8f36486fa57f3b8bd45f0c848409d5b168002e757a13c6d286a7b4c41；共享styles仍为本报告冻结SHA。预检只是能够编译相应真实图，不证明运行858、原verify/exercise或真正宿主已通过。

### 本人实际验证

过程全部/tmp/huhu-integration-entry-high；仓库唯一新写为本不可覆盖REPORT。

| 实际命令/检查 | 结果 |
|---|---|
| `node --test scripts/ui-review/fixtures/frontend-redesign/integration/integration.test.mjs` | 退出0，13/13；node-tests.log；含矩阵缺失/漂移、child失败、SHA/共享图、check、PNG边界、真实child CLI环境/退出码和ASAR解析 |
| `node --test --test-name-pattern='redesign T14 delegates\|rejects unknown\|rejects fixture path\|suite and matrix names' scripts/ui-review/run.test.mjs` | 退出0，4/4，无产品编译；cli-tests.log；中央原CLI隔离/错误参数/T14委托 |
| `node /tmp/huhu-integration-entry-high/verify-preflight.mjs` | 退出0；四源SHA/mode、13真实child、4374当前输入/ASAR/父子摘要均一致；verified-preflight.json |
| `node /tmp/huhu-integration-entry-high/parent-flow.mjs` | 退出0，5组完整父调度控制；parent-flow.json；控制输入均显式/tmp合成Node夹具，不是生产浏览器结果 |
| Root冻结main/styles/manifest逐项核对及原staged raw复核 | 退出0，摘要/模式匹配，无写入 |
| 145 dispatch/return结构校验 | 均退出0；dispatch.json/return.json |

5组父控制均真正启动13个独立Node child且未编译生产：有效preflight→父preflight/exit0；T07缺result、坏JSON、真实exit9、缺生产入口但重算digest分别→父failed/exit1；各组仍收齐13child，继承CDP均为空。该配对证明汇总错误不会被其它child成功掩盖；静态控制内容不冒充产品截图、原断言或正式矩阵。Root本轮Node20/20和实际13图preflight的原exit0已由Root回收工具session明确确认，未只凭日志文件存在推断。

## 问题与下一步

本工具范围没有新增已验证finding，四路径可以交Root继续使用。Root先处理原生产owner的native失败，再在冻结最终输入后执行正式858与原整体验收；任何生产/样式/driver变化后应重新核受影响预检与最终SHA。当前未运行正式858、browser verify/exercise、真实Obsidian/popout/PTY或用户库，未给T14/GFINAL通过结论。未提交、推送或修改产品。

**return0后停止全部读写并释放四源审查冻结。**
