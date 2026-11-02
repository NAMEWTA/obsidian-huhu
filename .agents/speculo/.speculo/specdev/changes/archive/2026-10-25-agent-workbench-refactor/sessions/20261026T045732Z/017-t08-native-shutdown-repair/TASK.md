---
schema_version: 2
session: "20261026T045732Z"
task: "017-t08-native-shutdown-repair"
kind: "implementation"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-08"
---

## Goal

Lead codex:/root，沿既有Sol/xhigh身份。本任务只修016整票R2的新F5：正常helper EOF未等editor listener退出，留下无服务socket inode。原F1–F4已独立关闭。用户完整18票Goal授权含本修复，无需再次确认；不递归派遣。正式工件、状态、根产物与最终验收仅Root拥有。

## Inputs

项目 /home/wta/orca/workspaces/obsidian-huhu/terminal；change .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor。当前GP029/Map30、T08恢复周期1 in_progress、attempts0；旧周期attempts3与真实blocked检查点完整保留。

按I和Map→dev→T08→Goal实际读取，复用已读未变错误/资源/并发/TDD/test-reliability规则；本轮无UI改动。核心合同 evidence/T-08-recovery1-packet.md SHA9999200cf1b2590d84ab1357b2aa055237bfca5e124c2c39f9640e5e82bada67；精确allocation-r3 SHA bc61d993df11f88c6abb39f0f90a4ad4b86399d324de0d5184c45f46447eefcb。修复前完整2144输入/2072产品 /tmp/huhu-t08-root-recovery1-preflight2-inputs.json SHA 3b3274ac380bc9a8a266a478b6cb2f4d249903270e8b4e2781576f63c52a0064。

016原报告 sessions/20261026T045732Z/016-t08-full-review-r2/REPORT.md SHA30cc865bade17ba4c7cfa9b9b39201c785e2cfa7ac3131d070fb1e6f539d8a15；Root接收evidence/T-08-review-r2-root-audit.json SHA5da903f71ad84795f1e6668b6067073953c778c2524f7ea6db9d694207625a6f。原probe /tmp/huhu-t08-full-review-r2-astra/socket-cleanup.ts及.stdout、cleanup-r2.json、return原件只读；无cap替换5代累计1/1/2/3/4个死socket，所有PIDgone。采集exit0不等于cleanup通过。

原C007已STOP；它的handoff /tmp/huhu-t08-c-stage2-handoff.md 与 source/checks/producer可按REPORT导航读回。原immutable bin /tmp/huhu-t08-c-stage2-linux-20261026T080715Z/{huhu-pty,huhu}只读，SHA分别f99ec633e2201d66ccd67605c65c709d6b25c443ec71978feff897fb27d315ca、923ac2d6fbc4f472537c73236040a487b8d991e4226aec81d5ebda488e995eee。可独占复用原Cargo缓存 /tmp/huhu-t08-c-stage1-target；不是覆盖旧最终bin。原Windows已有命令 cargo check --locked --manifest-path native/pty-server/Cargo.toml --target-dir /tmp/huhu-t08-c-stage1-target --target x86_64-pc-windows-gnu --tests。

## Workspace and Scope

唯一允许写产品（原C33中窄接管）共7路径：
- native/pty-server/src/editor.rs
- native/pty-server/src/session.rs
- native/pty-server/src/main.rs
- native/pty-server/src/control/unix.rs
- native/pty-server/src/control/windows.rs
- native/pty-server/tests/editor.rs
- native/pty-server/tests/stdio.rs

另允许本017 REPORT、新/tmp/huhu-t08-native-shutdown-*证据/测试资源/最终只读bin和上述既有Cargo target缓存。原014 Host三路径现在STOP；其他TS/UI/native源、依赖与锁、所有旧bin/报告/证据、正式规范/Map/Goal/Ticket/Evidence及node_modules不可写。任何新增路径先交Root，不先写后补。不要全仓格式化或清共享临时目录。

## Acceptance

先保留能击穿当前生产source/bin的目标红灯，再比较最小保留线程并有界join与显式停止完成通知两种实现，选择原owner内更小的正确路径。把listener实际结束与自己inode安全清理纳入现有有限退出；不能无限join，也不能用固定sleep推测完成、宽泛删除runtime或删外来替代实体。若异常/超时，准确暴露未完成/残留边界；正常退出应在既有预算内结束且无旧endpoint累积。

真实helper回归涵盖session已自然结束再EOF、活动editor中EOF、同0700短runtime根多代正常退出；观察发生在fixture删除资源之前。覆盖自身endpoint被替换时不误删其他inode及有限异常收束；如用受控线程时序，明确证明的层次，保留普通无注入真实probe。不得改变原binding/operation/frame/output、root/termination及cap ownership责任；queued none、dispatch unknown不提前返额；F1 Host join不回退。

定向红绿后运行受影响Rust+全部native测试、适用fmt、Linux双bin build与Windows交叉check。只格式化自己的实际修改路径，可使用rustfmt --config skip_children=true。保存真实argv/cwd/UTC/exit/raw、输入/tool/config/依赖字节摘要和前后漂移。最终双bin从真实build复制到全新目录，0555，producer保存源列表与命令关联。旧bin不得覆盖或改模式。无新增外部研究/依赖需求，复用原明确许可设计。

Root之后用新pair重验Host/F1/control/官方完整Pi业务链；你无需重跑UI/Chrome/TS build/lint或相同官方包研究。只在自己的隔离资源上确认进程/监听/文件收束，失败fixture保存观测后方可按归属安全删除；不要把删除后空目录说成产品通过。真实Provider/Obsidian/五平台仍未验。

## Return

完整报告原子写本017 REPORT，精确Session/Task/Status，含“聚焦交接”“产物与验证”“问题与下一步”。给出设计选择、精确产品diff/前像/最终源、原行为red/最终green全部命令、实际native测试数/过滤/平台边界、最终只读pair与producer、资源观测/残留和失效范围。声明SOURCE STOPPED后跑return结构检查并通知Root；不自行标T08完成或独立审查通过。
