---
schema_version: 2
session: "20261026T045732Z"
task: "009-t08-native-review"
kind: "review"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-08"
---

## Goal

Lead codex:/root；你是全新、未参与T08实现的独立审查者，按用户Goal §4指定 gpt-6-astra/high，只读审查已停写的C33完整T08原生/共享协议候选，分别返回standards与specification两轴。此为同票分块审查，不是整票审查或AC关闭；A32/B15仍实施，后续Root还会冻结全T08组合并补整体独立审查。禁止实现/修复和再次派遣。

## Inputs

唯一项目根 /home/wta/orca/workspaces/obsidian-huhu/terminal；change .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor。按workspace/catalog发现，读取实际 .agents/speculo/workflows/specdev/common/skills/code-review/SKILL.md，及source-discovery、fowler-smells、reviewer-contracts、risk-review、working-tree-review、review-evidence与适用error-handling/test-reliability。项目dev与architecture/testing/licensing实际入口必读；共享schema有UI消费者但本次不审查未停写UI实现。GP026/Map27，T01–07 done，T08 in_progress。实际HEAD 33c21e098ef3188cbab5a09f3e0a01fadb787715，branch NAMEWTA/terminal，无提交授权。

冻结输入 evidence/T-08-native-review-input.json，SHA256 0a614ba600141c092c0b999f163e03a2435d49eb716acbeeaed25d41921b022b。该input列33条完整文件、27处T08增量、415897B语义diff、每条实施前与最终原字节、模式、权威规范与标准原件。实际语义基线为T-08-dispatch-input.json里的T08开始工作副本，已含T01–07；HEAD只记录Git/index来源，不可把HEAD→当前差异冒充T08范围。working-tree-scope.json为实际validate-specdev --review-scope固定结果，请核对scope/excluded_paths及输入摘要；根产物、A/B活跃实现、旧任务和报告均按input exclusions排除。

C007正式回报 sessions/20261026T045732Z/007-t08-native-editor/REPORT.md；此前C002共享端口回报 sessions/20261026T045732Z/002-t08-protocol-stage1/REPORT.md。Root完整回收 evidence/T-08-c-stage2-root-audit.json SHA256 2e06d6888c9091683c6e699529b7eae86c769e7be43dc351f0411d3d2a7e2df0，33活源/39命令/2812输入描述/268独立对象已核；C002审计在input.spec_sources。报告和tests是证据，不替代你的语义审查。

权威外部合同是spec.md、implementation-contracts.md、T08、Goal §4/Spec §11。工程边界见input固定的editor-transaction、launch-identity-environment、progress-receipt与engineering-packet。原生editor只在Linux明确双协商时可用；其他平台/Provider仍人工/raw，能力unsupported准确。runtimeId是运行身份，editorId另行生成；original root/PID/birth/SID/TTY/peer/physical Node+entry核验，Pi可改process.title。不是fresh全artifact重hash，不宣称OS检查与JS提交原子、原argv仍可读、任意同像exec、CLOEXEC或恶意同账号隔离。

input.consumer_context是A/B在同一只读捕获窗口内两次核hash一致的21份实际消费源，仅供接口追踪，必须读snapshot原件，不读后来变化的live消费者。它不是最终整合候选。B现正修native Binding创建前spawn-none无editorId而本地enrollment仍pending的跨owner收束；严格最终reply fence才可释放，已有native Binding仍需真实editor-closed。此已知B整合工作不等于C自动无缺陷，你仍须独立判断C合同及反例。

## Workspace and Scope

review_mode: working-tree。C33唯一writer codex:/root/implement_t01已正式SOURCE STOPPED，原C33活源必须与input.after一致。整个T08的实现者包括codex:/root、/root/implement_t01、/root/implement_t08_business、/root/implement_t08_profile、/root/prepare_t08_full_cli；你不得是其中任何身份。仅你本次REPORT和新建 /tmp/huhu-t08-native-review-* 允许写；其余产品/规范/Evidence、Git/index、node_modules、根main/styles/notices/budget、旧/tmp证据和既有Cargo target全部只读。

可复用不可变 /tmp/huhu-t08-c-stage2-linux-20261026T080715Z/huhu-pty（f99ec633e2201d66ccd67605c65c709d6b25c443ec71978feff897fb27d315ca）和huhu（923ac2d6fbc4f472537c73236040a487b8d991e4226aec81d5ebda488e995eee）；producer SHA56585e57c763749a70a07bccc04bc5ed60b63eec2d2adb88f68f6ecc2c15e2aa。若有明确假设，可用隔离/tmp小probe验证并保存命令/原输出/输入SHA；不重复全仓/全native测试，不覆盖共享target或复制大量工具/依赖。空间约数GiB，复用已保全CAS和bin。不得运行真实Obsidian/账号/Vault/Provider；用户自验这些E2E。

完整C33范围如下：
- `src/shared/native/control-schema.json`
- `scripts/generate-control-protocol.mjs`
- `src/shared/native/control-wire.generated.ts`
- `src/shared/native/control-wire.ts`
- `src/shared/native/control-wire.test.ts`
- `test/fixtures/native/control-v1.json`
- `test/native/control-protocol.test.ts`
- `src/shared/native/host.ts`
- `src/shared/native/input.ts`
- `src/shared/native/input.test.ts`
- `native/pty-server/src/lib.rs`
- `native/pty-server/src/main.rs`
- `native/pty-server/src/frame.rs`
- `native/pty-server/src/session.rs`
- `native/pty-server/src/outbox.rs`
- `native/pty-server/src/foreground.rs`
- `native/pty-server/src/editor.rs`
- `native/pty-server/src/control/mod.rs`
- `native/pty-server/src/control/wire_generated.rs`
- `native/pty-server/src/control/codec.rs`
- `native/pty-server/src/control/cli.rs`
- `native/pty-server/src/control/client.rs`
- `native/pty-server/src/control/broker.rs`
- `native/pty-server/src/control/ipc.rs`
- `native/pty-server/src/control/unix.rs`
- `native/pty-server/src/control/windows.rs`
- `native/pty-server/src/control/locator.rs`
- `native/pty-server/tests/control_protocol.rs`
- `native/pty-server/tests/control.rs`
- `native/pty-server/tests/control_outbox.rs`
- `native/pty-server/tests/stdio.rs`
- `native/pty-server/tests/foreground.rs`
- `native/pty-server/tests/editor.rs`

## Acceptance

先核scope完整、实际before/after、语义diff、标准/规范发现与独立性。以可证伪反例检查全部适用安全/并发/生命周期/有界性/兼容/恢复风险，不设finding数量上限。重点：canonical TS/Rust/embedded grammar同权威且role/identity/UTF8/frame总量有限；原InputQueue单writer/全局与SID额度/observer32分离；queued取消none、dispatched unknown不提前返额、真app结果与本地发送/worker/原root fence、metadata/output/Session物理退场不同；readonly/query/stop、parser reply/ACK、其它SID/Cookie活性；fresh物理PATH/link/entry与TTY/peer验证、异步工作锁外/实际join、cap替代实体不误删与失败retiring；CLI Ctrl-C原socket有限观察、不续期/重连/重放；可信completed receipt不可被后续错误/目标改写；unsupported平台保持普通启动。

最终native顶层131、TS122、types/lint/精确fmt/generation/helper verify为真实通过；Windows仅--tests交叉检查，有unsupported stub dead-code warnings，不是实机。session_tree子测试另1pass/5filtered不能重复计数。原行为红与fixture失败区分见C报告。审查既有证据是否覆盖声明，缺证据与确定代码缺陷分开；不要把A/B尚在实现的UI/完整官方链作为C33已完成或缺失整票全部行为来判定。

分别返回 standards: pass|request-changes 与 specification: pass|request-changes，不跳过规范轴。Finding含severity、精确项目路径/行或代码块、可达前提、具体影响、来源依据和满足条件/验证方向；不实施修复，不因偏好要求无关重构。无finding也说明已读范围与真实边界，不称全T08/全Goal通过。结尾重核C33源无漂移；消费者活源变化不改变固定context，但跨接口风险留待全组合复审。

## Return

按协调report-template，原子且不覆盖地写入 /home/wta/orca/workspaces/obsidian-huhu/terminal/.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/sessions/20261026T045732Z/009-t08-native-review/REPORT.md，首部Session/Task/Status，固定input SHA、实际独立身份/模型、先standards后specification、来源发现、检查/限制、最终scope核对。报告完成后通过原生通道通知Root；只Root维护正式状态，不修改TASK，不猜session-locator。发现需确认输入先消息Root，保持已授权独立阅读继续。
