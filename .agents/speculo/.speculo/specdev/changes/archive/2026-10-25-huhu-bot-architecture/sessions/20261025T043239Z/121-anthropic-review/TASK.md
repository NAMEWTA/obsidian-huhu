---
schema_version: 2
session: "20261025T043239Z"
task: "121-anthropic-review"
kind: review
change: 2026-10-25-huhu-bot-architecture
ticket: T-10
---

# Anthropic 与必要共享维护的独立审查

## Goal

由未参与实现的原 reviewer native:/root/recovery_review，沿已接纳的 Responses 基线审查最终 Anthropic 候选及实际影响闭包，分别给出标准轴和规范轴结论。审查真实代码和行为，不以作者通过结论代替独立判断，不实施修复、不再委派。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715，Map30/Goal29。完整28票55AC与团队授权持续；用户明确只要求本轮代码开发与代码层总验收，真实模型、Obsidian和目标系统操作由用户后验，不索凭证或冒称现场通过。

按 workspace/catalog、dev/testing/licensing、I 双轴审查及风险/异步/错误规则执行，已读未变规则复用。Root 实际派遣前冻结 evidence/T-10.md#review-input-anthropic-r1；唯一 scope/sources/exclusions JSON 的 reviewInputDigest 是两轴共同 Input-SHA256。对应 JSON 与文件字节/模式清单位于 evidence/T-10-logs/review-input-anthropic-r1.json 和 review-freeze-anthropic-r1.json。TASK 为不变指令，不在派发后回填候选摘要。

直接来源：105 固定 SDK 研究及 A01–A18、Map29 采用合同；117/118/119/120/122 原始 REPORT、测试与 Root lead-return；Root 新构建本地 E2E和Map30测试维护合同；122仅测试字节变更时回读Root精确复用证明。基线是 evidence/T-09-logs/code-gate-responses-r1.json 及 review-freeze-responses-r1.json，原112双轴与116仅显示修正保留。Chat、Responses、common/httpcall 未变化的证据按字节和可达风险复用，不把旧生产者覆盖自动当成 Anthropic 已验证。

## Workspace and Scope

业务文件、测试、锁、Skill、正式状态和他人报告只读；仅本121 REPORT/logs及临时外部探针可写。范围含第三协议完整链：Anthropic 六生产文件及合同测试、common 精确 identity/Registry 新tuple、Core 第三driver装配与依赖锁、默认恢复/Probe/构造清理消费者、五目标实际许可闭包与现行说明，以及122默认HAP测试过期预期的最小迁移。公共 API/SQL/HAP/TS、旧Chat与Responses不扩展协议细节。

只有 Root 亲自派遣并给出候选冻结和唯一Go窗口后才能运行产品检查；之前准备不等于开工。固定 Go1.26.10 / GOWORK off / GOEXPERIMENT空 / GOFLAGS=-mod=readonly，normal CGO0、race CGO1。选择有价值的真实正常、失败与恢复反例，实际Wait，保留原输出和输入漂移检查；不机械重跑旧全套。发现问题交Root与原owner，审查者不改生产。无真实外部Provider、Vault/keyring、提交、推送、发布或归档。

## Acceptance

1. 两轴独立 pass/request-changes，不限制finding数量。发现给可证伪假设、实际入口、影响、文件行号、严重性和修复/验证建议；实测、静态判断与未验边界分开。
2. 只使用固定 anthropic-sdk-go v1.56.0 公开 Messages.NewStreaming/Models.Get，显式 endpoint/model/key/client、WithoutEnvironmentDefaults、retry0。无环境认证、云fallback、redirect、第二Engine或自动重发。原实际序列化请求进入同一 Attempts；Probe 单 metadata GET，严格路径/model ID，未知能力空数组。
3. content_block 按index重组、完整起止和type匹配、顺序及重复ID校验正确；thinking文本与迟到signature、redacted、空thinking、原tool_use ID及字段presence完整保存并回放。相同text delta不得误去重；紧凑工具Index不得使用原content index。未知执行语义、hosted工具、坏UTF8/JSON、错误第二工具、未完整流必须在首Invoke前拒绝。
4. terminal完整性、工具资格与费用知识分开。message_start/message_delta使用实际presence累计覆盖；缺失/null/部分/溢出不得当known0，合法0有效，cache创建/读取各计一次，output已含thinking。已知错误终结费用仍结算，不进入工具；缺终结和断流保守计费。已知stop_sequence等受控兼容不可冒称产品新增配置或续跑。
5. 完整有序blocks与共同消息投影、可信原Intent、轮数、工具及结果对应；Generate/纯Inspector/Resume共用语义验证，重算外壳hash无法洗白损坏。完整编码后1MiB限制成立。批准/拒绝/重启沿原CP、effect和decision，净化tool_result且保留原tool_use_id；当前资格/授权/预算重查，不能靠CP恢复旧权限。opaque/审批凭证不泄入公开历史或错误。
6. 真正SDK/原Body.Read与Close、回调、计时器结束后才ProducerEnded；HTTP错误隐藏body、Do后取消、取消晚工具、最后finished ACK、SQL结算失败保留原attempt/worker并真实join，Done不能提前。旧共享helper证据可复用，Anthropic具体路径仍需实际控制及必要race。
7. 默认Core/selector/Engine/Probe/Inspector/Broker使用同一精确身份。第三构造失败排空实际旧两个driver；Registry失败排空三个。正常Stop同步禁止新请求，等待实际调用后释放Provider/DB/Profile。原Chat/Responses与显式fake保持；session-memory重开真实missing，119纯Inspector metadata模拟不等于恢复secret，受控resolver正控亦需标清。
8. 120五目标实际cmd编译图与新增SDK及辅助模块许可一致，Anthropic自身内置Go JSON的BSD义务单独保留；不以整个require表替代运行闭包。NOTICE横幅是否改变决定是否需要插件重建；最终平台发行资产仍归T27后续。Root独立新构建CLI/私有凭证管道/生产TS HAP Host/真实SDK loopback E2E核对HTTP与物理写次数、usage/effect/producer/pin/slot、自然子进程退出与无漂移，受控Vault不是现场验收。

## Return

REPORT首h2前必须有 Session: 20261025T043239Z、Task: 121-anthropic-review、Status。两轴章节前分别写字面量 `<a id="standards-output"></a>` 与 `<a id="specification-output"></a>`；各节有 Reviewer: native:/root/recovery_review、Axis、Result、相同正式 Input-SHA256、Observed。保留聚焦交接、产物与验证、问题与下一步，列全部发现、原始探针及正常对照、源码/模式核验、引用与未验边界。

所有实际进程、SDK与body等待结束后亲自 validate-dispatch return0，冻结完整REPORT/manifest，原生 MESSAGE+FINAL 后停写。Root全文回读并维护正式状态；当前不自行完成T10/T27或Goal。
