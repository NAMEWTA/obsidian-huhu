# T07 R1 原生CLI局部修复

继续原用户全18票实施授权、原C gpt-6.1-sol/xhigh。Root为编排及唯一正式状态/根生成物writer。GP025/Map26、工作区 /home/wta/orca/workspaces/obsidian-huhu/terminal、branch NAMEWTA/terminal、HEAD 33c21e098ef3188cbab5a09f3e0a01fadb787715 不变。T07 in_progress，T01–06 done，T08仅只读准备。无提交、push、release、归档。读取/复用 I权威入口、dev/testing/licensing/当前Map/T07/Spec/implementation-contracts及原engineering packet；同合同局部repair不激活新流程或新Goal。

## 固定输入与实际发现

change=.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor。
独立 codex:/root/review_t07_r1，两轴 request-changes，固定输入SHA 7e21cc86a21893389483888b0f263de1175c2a349d7524b83fec7dbba652a0c7。
必读 evidence/T-07-review-r1-report.md 与 checks；Root保全并重核70路径/59来源/双bin无漂移，audit T-07-review-r1-root-audit.json SHA31169f616442a93ec1fe74b60a416647d62fdb7d12782d48cb9054337bbebd1e。
原始可复现反例：/tmp/huhu-t07-review-r1-cli-probe.py/.json 与 timeout-probe.py/.json；只能读取，不覆盖；自有新目录运行适配版本。它们是传输/CLI反例，不是Provider E2E。原最终双bin目录 /tmp/huhu-t07-c-linux-final-20261026T021652Z 保持0555且不改。

## 唯一解冻产品路径（原C30内7条）
- native/pty-server/src/bin/huhu.rs
- native/pty-server/src/control/client.rs
- native/pty-server/src/control/cli.rs
- native/pty-server/src/control/locator.rs
- native/pty-server/src/control/broker.rs
- native/pty-server/tests/control.rs
- native/pty-server/tests/control_protocol.rs

必要时可在上述生产模块内加单元用例。所有其他C23、A/B、Root4及正式.agents保持STOP；无需改变依赖、canonical/生成器、helper协议、队列/预算或文档路线。若确需改额外路径或公开新字段，先给具体证据与候选，等Root正式分配。允许自有/tmp证据和同源Cargo build/test产物，禁止覆盖已有immutable binary目录。T08 readonly foreground plan已接收，本次仅T07repair，不夹入T08。

## 必须修复的外部行为

1. STD/SPEC01：合法长target+多候选的发现诊断必须完整JSON正文≤49152且通过现有response parser。以完整envelope剩余容量计量/统一最终runtime响应防线；不足时可准确CAPACITY_EXCEEDED且effect none，不能截短身份、部分JSON或静默截掉候选冒充完整。正常/无候选/边界仍正确。离线schema的单独1MiB合同保留，不误套48KiB到schema/help/version非runtime输出。
2. STD/SPEC02：继续64参数/32768字节接纳上限；超出后不保留参数正文但继续扫描所有OS参数中的全局--json。第1/65/66及更后位置、非法UTF8与字节超额组合都给完整有界机器错误exit2/effect none，绝不执行被截断业务/打开endpoint。避免无意义的新无限副本，不能靠提高上限解决。
3. STD/SPEC03：客户端正常观察超时应有机会收到broker已经保存的最新target/phase。协调观察deadline和有限传输收尾，避免client从request写前计同一长度而必先退出。优先沿现有request timeout和HANDSHAKE_MS有限budget，不引入新常驻worker、第二协议或progress无限流；解释总deadline与每阶段预算，保留Ctrl-C及时撤观察、transport真断开时准确unknown、不可重发、late result/settled/permit责任。时间上限不是任意scheduler绝对交付保证；必须实际正例得到committed-session/reserved-runtime/launch-pending。不能把测试固定为当前缺字段或无界延长。

## 验证与交付

先将真实反例锁成永久回归，并实跑red（现冻结bin可以作为原始red来源，但新测试仍需确认能失败于现行为）；按窄行为改后实际green。测试用事件/协议确定性同步，不靠长sleep或重试掩盖。保留候选枚举、OS非法参数、boundary、真实CLI/broker新target timeout、late settlement/no replay、cancel/disconnect/关闭同代等受影响路径。运行完整cargo test --locked（原普通105含子fixture）、cargo fmt --check、当前Windows crosscheck（仅编译声明），最终同源双bin构建复制新唯一0555目录并保存producer源/命令/UTC/hash。原helper verify沿testing规则运行。Root会以新双bin跑required生产TS闭环；你可做定向验证但不运行全局pnpm/build/lint/notices或改根产物。

最终返回 /tmp/huhu-t07-c-review-r1-repair-handoff.md、source.json、checks.json、diff。包含精确7条实际前后与全部C30当前清单、所有Rust/Cargo构建输入/工具、原始每条命令真实argv/UTC/exit/log/inputs/prepost drift、新双bin来源、失败原因与清理状态、未运行项。不能以自报pass代替原件。最后 SOURCE STOPPED。Root当前integration attempts2；候选回来后才计第3次，不重置历史。

## 冻结权威摘要
.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/goal-plan.md: a32b42cbf438f3c31797cf24427125149599599529becf9481efc02bd71b0949
.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md: 8f90103f902deb70ac84c5db45f44b94bab1d128373ea873e29ea4dcbfccdee3
.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/07-local-cli.md: 9d81eb7480ab6eac3d385f68269b85d9fd9929f1961d5e680575ad38525d341b
.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md: d204c7a0b3178a60ddeb291a8153f79cb8e3864427c5317b7660832182d12618
.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md: f13ca8cf0ef1185065e7c6d4e537a787f50ac813678aec428e498c0a8f03e397
.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-07-write-allocation.json: a0b9f4865a81a7f91e158b7c9f79855da00443c7e947e54a30131f76144cfe95
