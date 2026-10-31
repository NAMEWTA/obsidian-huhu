---
schema_version: 2
session: "20261025T043239Z"
task: "133-memory-component-review"
kind: review
change: 2026-10-25-huhu-bot-architecture
ticket: T-14
---

# 记忆纯合同、客户端校验与共同Engine的独立审查

## Goal

由未参与本范围实现的原reviewer native:/root/recovery_review，对125/127/130/131/132的固定组件候选分别完成标准轴与规范轴审查。此阶段只接纳组件，不签整个T14、默认Core或数据库联合门。真实实现者为native:/root/foundation_go、native:/root/foundation_client、native:/root/engine_adapter；Root负责合同与验证，不充当独立reviewer。不得再委派或自行修复。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715；Map37 / Goal36 / LOG124。28票55AC与Agent Team授权持续；真实Provider/Obsidian/目标OS用户后验，只要求本轮代码开发及代码层验证；不再索凭证，不提交推送发布归档。

按workspace/catalog、dev/testing/architecture及I双轴、source-discovery、Fowler/risk/error/异步规则，已读未变复用。Root派遣前冻结evidence/T-14.md#review-input-memory-components-r1，唯一scope/sources/exclusions对象的reviewInputDigest为两轴Input-SHA256；完整JSON与字节/模式在evidence/T-14-logs/review-input-memory-components-r1.json和review-freeze-memory-components-r1.json。未有实际派遣与冻结前不得启动检查。

直接规范：原Spec/T01/T08/T14，115 interface-contract、123 short-term-contract、125 R3纯合同及132最小接缝；Map31/33/34/35/36/37精确资源合同。原始作者REPORT/logs与Root125/127/130/131/132回执是验证证据，不代替独立判断。已有G2三协议代码门与121独立审查保持历史；冻结清单提供与其真实工作副本输入的逐文件旧字节及新增路径，避免把未提交HEAD当作实现前版本。

## Workspace and Scope

业务文件、测试、锁、Skill、正式状态和他人交接只读；只可写本133 REPORT/logs/manifests和临时外部探针。主范围为125纯API/typedHAP/schema/generatedTS/fixtures及其合同测试（排除活动SQL执行Hooks、generator与implemented flags）、127+131 TS语义校验、130全部共同Engine实现与测试、132纯manifest helper；只读依赖含实际7目录Engine闭包、TS protocol与配置/锁。精确枚举以固定scope为准，包含新增文件，不能只看git diff。

活动126/128 Store/Grants/预算/传播与停写129 Core/Executor/配置/恢复SQL不在本组件结论内。公共StartRun与foundation测试源码可审但暂不运行，因为整包导入活动Core。六memory implemented flags仍为false是未完成装配阶段的明确边界，后续由原generator owner真实生成后联验；T15两个方法仍false。不得把这些已标明后续工作误报已实现或据此宣称整个T14通过。

相关组件writer已返回并停写后，Root可给唯一Go检查窗；先用实际go list确认api/common/common-protocolcontext/Chat/Responses/Anthropic/httpcall及锁/夹具闭包未进入活动writer，再按具体假设运行有价值的纯组件反例，禁止整个foundation或engine/chat包、Core/SQL、generation、全build。固定Go1.26.10/GOWORKoff/GOEXPERIMENT空/GOFLAGSreadonly/GOPROXYoff；normal CGO0/race CGO1。TS仅实际memory-validation/method-validation/codec/connection闭包；不机械重跑作者全部矩阵。所有进程实际Wait、保存原输出和source/mode漂移。需要扩大闭包先回Root协调。

## Acceptance

1. 依据完整固定候选真实代码给出两轴独立pass/request-changes；不限制finding数量。每项包含可证伪反例、可达入口、影响/严重性、精确文件行号和最小修复/验证建议；实测与静态推断分开。
2. Go/TS/HAP合同对namespace、scope、正decimal、UTF8字节、unpairedUnicode、对象/整页编码、组合provenance和context分页边界一致。非法typed请求/返回在真实边界失败；合法最大值可通过。新方法未装配诚实拒绝，不产生空成功。标准schema不能表达的限制由真正消费者执行，14预编译validators缓存不能绕开后置校验。
3. 纯Memory/ShortTerm binding覆盖namespace、原Intent、refs/hash/顺序、uses/spans/usage、job generation/settings与Targets；真实数据库current资格仍属Store。132 body-free入口只验证metadata，拒携正文；旧完整入口仍验证实际text/hash/UTF8/budget。编码唯一，旧golden/DTO无漂移，Engine与Inspector不能改用metadata入口绕过正文。
4. 普通Engine在首credential/Attempt/HTTP前拒绝坏sealed输入或ShortTerm与旧History/Messages并存；固定Persona→显式Sources→完整requirements→ShortTerm→Memory→当前Intent一次。字段总量边界、actualSDK可见顺序、source作为数据、Targets复制冻结与调用方不被修改。所有协议经同一common入口，不出现单协议fallback。
5. maintenance模式实际空Tools，无Invoke、无delta/sink文本、无公开结果Text，仅私有bounded buffer；严格候选JSON拒未知/重复/大小写替代/null/badUnicode/超限/非法operation/provenance/非服务器target/重复修正。错误/取消/截断不能泄半正文或提交候选；费用Attempt仍按已知事实settle、producer/Body.Close真正结束后Done。后台账户绑定是后续SQL消费者，不把组件夹具当实际证明。
6. Run/Resume/Inspector从相同sealed输入重渲染并比对固定位置/prefix；CP DTO/version/toolseed与历史nil值字节兼容，变更manifest/原Intent/上下文或工具对应不能重算外层hash洗白；坏输入零新IO。旧Chat/Responses/Anthropic真实baseline对照原始字节，不用当前实现自证旧兼容。
7. 125/127/130/131/132红绿中的真正缺失行为、夹具错误、编译失败分清；不得放宽产品断言造绿。现有component与race/vet/TS类型证据只按真实输入复用；共享helper新增后所需最小重新验证或静态影响判断写清。没有默认Core/SQLite/实际账户/最终CLI就明确保留未验边界。

## Return

REPORT首h2前含Session: 20261025T043239Z、Task: 133-memory-component-review、Status。两轴前字面量<a id="standards-output"></a>与<a id="specification-output"></a>；各轴Reviewer: native:/root/recovery_review、Axis、Result、同一Input-SHA256、Observed。包含聚焦交接/产物与验证/问题与下一步、来源与输入核验、全部findings、实际检查及未验边界。

全部产品进程结束后亲自validate-dispatch return actual0，冻结REPORT/工件manifest，原生MESSAGE+FINAL后停写。Root回读维护Evidence；不自行改正式状态，不用组件审查关闭T14/Goal。
