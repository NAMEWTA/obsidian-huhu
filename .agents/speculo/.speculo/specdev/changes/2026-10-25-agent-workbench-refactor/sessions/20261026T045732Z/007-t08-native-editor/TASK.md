---
schema_version: 2
session: "20261026T045732Z"
task: "007-t08-native-editor"
kind: "implementation"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-08"
---

## Goal

Lead codex:/root；沿原002实施身份与用户指定gpt-6.1-sol/xhigh，完成C33中原生editor/foreground/输入持槽实现。用户授权完整18票Agent Team和最终代码验收；真实Obsidian/Provider/五平台由用户执行。不要再派Agent，不提交/推送/发布/归档，不操作真实库/账号。完成仅是T08候选交回。

## Inputs

唯一工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`、branch NAMEWTA/terminal、HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715。沿GP026/Map27、当前T08、已通过T01–07与原002真实规则；先核workspace/catalog与Map→dev/testing/licensing→T08→Goal§4，复用未变I procedure/preflight/TDD/coordination。原002 SOURCE STOPPED/REPORT及Root审计、stage2输入SHA在派单消息给出，不能把原始T07bin或过去研究当成当前原生验收。

读evidence/T-08-engineering-packet.md、T-08-editor-transaction-decision.md、T-08-launch-identity-environment-decision.md、T-08-progress-receipt-decision.md，及当前实际canonical/shared/strict codec。原T-08-c-editor-port-plan.md仅保留历史候选，其中spawn三元identity已被runtimeId＋注册后T06 join替代，独立fixture/新增adapter文件等超出当前84路径的旧建议未获采用。sourceInstance与实际AdapterStart来源相同；真实Pi process.title改写cmdline已被观察，不能用原argv仍在/proc作为永远失败的支持门。



冻结接缝输入：`/home/wta/orca/workspaces/obsidian-huhu/terminal/.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-08-stage2-input.json`，SHA `592f39ae5e435e4d090e0b2ebdccb2733bfde6b1977ce29ec588dabcc2a01ed3`；C阶段Root验收SHA `86a0f8723dce15f022fb5a41663433aef199c214d5686c9e9f4fb238f07a60fd`。本次REPORT唯一目标为 `/home/wta/orca/workspaces/obsidian-huhu/terminal/.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/sessions/20261026T045732Z/007-t08-native-editor/REPORT.md`。

## Workspace and Scope

产品写集只限原T-08-write-allocation.json的C数组33条路径，Root落盘时展开。本阶段解锁原生runtime/editor/foreground/session/main/outbox/IPC及其测试，仍不解锁B Host/helper/扩展或A业务/UI。原002 shared/API现在由B实际消费：不要默默改signature/grammar/额度；确需变更先通知Root，协调受影响consumer和重新固定输入。内部窄修仍在C写集。Root独占正式工件与根产物。

仅另写自己REPORT和新 `/tmp/huhu-t08-c-stage2-*`；为控制磁盘占用，cargo可复用自己独占的stage1 target；原002若有要保全的bin先以只读新路径保存并记SHA，后续仍交独立不可变T08双bin。不覆盖T07任何immutable双bin、旧研究或其他writer target。无package/lock/Cargo依赖变更；缺写集先报Root。禁止根build/全局插件检查和Git index操作。

随现Sessions.reserve/SpawnTicket取得原32物理slot后enrollment，单运行私有0600 cap文件只向原child注入文件路径；endpoint/secret与CLI角色隔离，复用同helper非阻塞IPC设施，不依赖control注册。绑定与preparing/closing/retiring计在原slot，authenticated32、未认证小池、metadata/lifecycle/receipt/正文/各副本按canonical上限实作；文件O_EXCL/O_NOFOLLOW、捕获实体清理、失败不删除新文件、不泄secret。

Linux核真实peer PID/UID、原root PID/birth/会话/TTY/exe与捕获recipe的Node/entry物理身份；在每次claim后、锁外、dispatch前做本次fresh前台观察。Pi正常process.title不会破坏该正例；原始entry只能由捕获spawn recipe及实际连接寿命形成已说明的保证，不能声称fresh cmdline、全artifact rehash、未测CLOEXEC或任意同像exec被证明。Windows等缺可靠前台证据准确unsupported，不用crosscheck冒充实机。实际观察到source/root/foreground/recipe变化拒绝，未知不猜。

同一个NativeInputQueue/UserAction/InputBudget里新增editor动作，正文复用kind4分片，完整commit后排队。claim时只占原SID user-action槽，等待JS不持全局锁、不堵唯一PTY writer/reader；parser reply、ACK/stdout drain、query-stop保留池、其他SID/Cookie持续活跃。不是第二PTY writer或独立无界输入queue。

未claim取消由原owner证明none且不能迟到；已dispatch取消/期限/断链撤绑定准入，finished unknown但原槽/字节保持有限retiring直至实际app结果与本地fence/收束，不能timeout删表返额。app partial不是PTYwritten，adapter-applied只表示输入操作，不是模型成功。numeric exit/master close不等JS，reply-settled也不冒充editor物理结算。generation关闭不向新helper重放。所有计费/释放包括失败、重复、错源/旧op、cap文件失败、迟到callback和close的可观察实证。当前四个新业务operation的available仍为false；A完成实际handlers后由Root协调你同步单源available和生成物，不提前把native机制当业务可用。



本次精确产品写集（唯一C writer）：

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

真实稳定接缝目标red→green、TS/Rust同fixture、角色/目的/方向/字节/重复键/UTF8/旧绑定反例；原队列FIFO、queued取消、dispatch未知占槽、最终迟到/关闭/原root结束的回收、实际native parser reply/第二SID/Cookie/query-stop活性。定向cargo tests、scoped fmt、Windows crosscheck（注明仅编译）与helper验证按实际影响执行；原整个crate fmt已知无关差异不冒称修复本票范围外文件。

可用可控Node app探针验证OS物理身份/协议状态，但必须明确不是官方Pi支持证明。B负责实际官方CLI/default editor/app producer正例；交付当前真实T08不可变helper/huhu双bin、精确SHA与构建源输入，让B及Root运行组合。Root最终执行代码整体验收、完整CLI业务链、插件build/lint/必要回归与独立两轴review。保全失败及原日志，不能用skip/filtered或旧binary声明新行为通过。磁盘近期仅余8.3GiB；source快照复用按SHA保存的immutable对象，不重复复制大型工具，不未经核验删历史。

## Return

原生collaboration发给/root，最终一次性写本Task目录REPORT.md，含真实接口/生命周期、33路径实际改动SHA、收据argv/UTC/exit/raw log/前后source、固定双bin、未验证平台及SOURCE STOPPED。不改Task/Root正式工件/其他报告，不猜session-locator。API需要同步时在动手前发Root，完整候选真实停止后再由Root接受，不自行把T08 done。
