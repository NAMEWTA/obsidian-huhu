---
schema_version: 2
session: "20261026T045732Z"
task: "019-t08-full-review-r3"
kind: "review"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-08"
---

## Goal

Lead codex:/root；沿原未参与实现的 codex:/root/review_t08_native、用户指定 gpt-6-astra/high 执行T08第三轮完整独立两轴复核。016 F5普通EOF socket残留已由017修复，Root恢复周期1第一次组合已完成。判断完整87路径standards/specification，不仅勾选F5，不限制finding数量；不修复、不递归派遣。

## Inputs

同一repo /home/wta/orca/workspaces/obsidian-huhu/terminal；change .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor。GP029/Map30，T08 in_progress，恢复周期1 attempts1，旧周期attempts3及实际blocked检查点保留。HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715，branch NAMEWTA/terminal。原完整18票Agent Team授权持续，Root负责代码验收，真实Obsidian/Provider/OS IME/五平台由用户完成。没有提交/推送/发布/归档授权。

规范化输入 evidence/T-08-review-input-round3.md#review-input：文件SHA 13f7ca5999fc6e8c8d80f36afcb1d894ec9ff439fe41ff34931123f204d7b2db；唯一JSON对象 **reviewInputDigest 630404fbe847c70e44e8ddd58585adb8454e285485538394908ef3025bb5f6d2**，含87路径真实scope及79实际来源。两轴Input-SHA256只用630404fbe847c70e44e8ddd58585adb8454e285485538394908ef3025bb5f6d2，不用Markdown或语义包SHA。完整语义包 evidence/T-08-review-input-r3.json SHA 3cf998b47e027ee153d6a5b9440a907ce705c7a6f98a5de3b3476cc09665b40d：87路径、74本票变化、源码diff1053345B、生成物diff12561423B，真实T08初始工作副本已包含T01–07。HEAD/index仅作Git观察锚，不能把更早同文件改动归T08。

沿用已实际读过且未变的common code-review及source-discovery/fowler-smells/risk-review/working-tree-review/reviewer-contracts/review-evidence/result-reuse，dev/ui与实际架构、测试、许可、构建、设计系统、shell、动效可访问性。Spec/implementation-contracts、DESIGN revision1 PAGE001/003、AC013–018/021/030/061仍为合同。所有业务必须显式Space，旧交互先选、后台缺配置失败的全消费者接线由T14/T15承担；不按cwd/焦点猜Space。

016原报告SHA30cc865bade17ba4c7cfa9b9b39201c785e2cfa7ac3131d070fb1e6f539d8a15，Root audit SHA5da903f71ad84795f1e6668b6067073953c778c2524f7ea6db9d694207625a6f；原probe及失败均只读。此前F1–F4已关闭；相对R2产品仅六个native路径变动。未改A34/B15/Root5及其余C，可在实际核输入/消费者后明确复用016结论。**009旧native shutdown结论与旧bin消费者结果不能关闭F5**，新native源与bin需要新判断。完整87范围仍由本轮给出两轴结论。

017 REPORT sessions/20261026T045732Z/017-t08-native-shutdown-repair/REPORT.md SHA f63bc15d76b2c22e894a842af6925c20d98ee66afd765360384016ede40ffa71。Root接收 evidence/T-08-native-shutdown-root-audit.json SHA8208166c77847cdb8ffc5cdf4e5e978210926aacc5d72f9072efdb99f5249929，实际29命令回执、26生产/8测试输入、88 registry归档与8369实际解包文件核对；142最终顶层执行（嵌套session_tree不重计）、Linux build、Windows GNU交叉检查、六文件fmt通过。139记录PID/7根gone。旧自然EOF12代累积死socket红与新pair12代全0绿原件分开；替代endpoint/cap保留外来实体并准确exit1。仅交叉检查不称Windows运行。

修复由原Service持有listener JoinHandle与实际close结果；Sessions原8秒共同截止包含runtime try_lock观察，不增第二个8秒；join及显式own-inode remove结果才是物理完成，is_finished本身不是完成保证。原stdout writer独立最多5秒尾部flush未变。Root在候选审读发现持runtime锁阻塞预算和先采空/后取锁TOCTOU，017分别有真实锁持有30ms/200ms红与确定性stale-empty红→绿。最终listener在runtime同临界区重新检查entries为空；入场持锁覆盖注册，shutdown不会无限等runtime mutex；超时不清句柄或责任、不报成功。main失败打印诊断并exit1。检查这些机制及跨owner/并发/异常副作用，不以测试数量替代语义。

Root恢复组合 evidence/T-08-root-recovery1-audit.json SHA7d9df52e99c1b6bb6b21de52cb636ee615475f5ed9b9fa4e79a31b39b7fa75ee；真实3文件5项全过，无源漂移。唯一新增官方夹具/tmp/huhu-t08-a-stage2-native-2P6YOY，完整官方Pi CLI +生产业务/Control/Host/helper，对受控loopback SSE，中文多行/steer/终端结果通过；无真实Provider。Pi/Jiti1295当前文件逐字节匹配原冻结，输入编译闭包/manifest/raw保留。F1同helper三SID均释放，7记录PID与control locator gone；Root短runtime外部清理前只有空目录、无文件/socket，之后仅清自身tests/runtime。记录pre-command根集合及唯一新根关联，不伪造直接outer-runner标签。

Root最终manifest evidence/T-08-root-recovery1-final-input.json SHA88b1deb5c8c7eb1fc900cb9e0ad960ffb5a1d7b47be2aa959876d8732fd012b3：2150输入/2072产品，写集外[]。其余TS/UI/build/lint/Chrome15/预算等按 evidence/T-08-recovery1-verification-reuse.json 影响闭包复用。main6667083B SHA4d334fcc1e21ebe9d3d58086cf2c9137e374b5da71e305bd8974e02ba74de63d、styles1422357B、预算阈值均未变。此前六个Bot文档锚点失败、原fixture模式失败与更早测量失败均保留，不称全绿。新017失败包括正常红例与缺cargo checksum夹具采集失败，均如实存raw。

## Workspace and Scope

review_mode: working-tree；87路径以语义包files及canonical scope为准。实现者codex:/root、/root/implement_t01、/root/implement_t08_business、/root/implement_t08_profile、/root/prepare_t08_full_cli；你保持独立。所有产品writer SOURCE STOPPED，正式来源冻结。

仅写本019 REPORT及新/tmp/huhu-t08-full-review-r3-*取证文件。产品、正式状态/规范、旧TASK/REPORT/probe、Git/index、node_modules、Cargo target及已有bin只读。不要重跑全仓/全native；必要可证伪窄probe可复制旧016到全新路径，完整记录实际source/tool/argv/UTC/exit/raw/资源清理。普通EOF测试不得用Root事后删除冒作产品清理。XDG根短且0700，不放宽保护。无真实账号/Vault/Provider/Obsidian动作。

新只读pair /tmp/huhu-t08-native-shutdown-linux-20261026T115900Z/huhu-pty SHA950b1832947eaa287ef9c03499e9574a61ee7b7c4845a31ff422a350ce3af843（31119408B，0555），同目录huhu SHA63db57114503eaedf757c6c087eef8c0c268d393dc86b58035de51c67fdacd74（15428448B，0555）。producer.json SHA5d82fd3794c4109fbd02151e5d41e69adb67310bbff667c0dc03f40ac626f7c3，0444。旧pair f99ec6/923ac2保持原位只读。

## Acceptance

先标准轴再规范轴，完整87范围独立给pass/request-changes。新F5须代码/真实EOF/错误清理/原统一截止/在途enroll与binding责任语义闭合，并重估调用者main/session/Unix/Windows旧控制listener语义。F1–F4及完整输入身份、并发、取消、真实producer、有界协议、GUI焦点/状态/设计、生成产物需按实际变化和消费者影响明确复用，不只返回F5一条。每finding含severity、真实项目路径/行、可达前提、用户影响、规范/AC与满足条件；无上限，不修复。

最后复核87当前路径/模式、79canonical来源、HEAD/index与scope。scope仅excluded_paths/inventory_sha256/input_sha256因行政证据增长可归属变化，其他字段相同。无需重复逐字阅读所有历史CAS；需完整审新变化及有效复用边界。

## Return

原子写本task REPORT.md，Session/Task/Status有效，并有“聚焦交接”“产物与验证”“问题与下一步”。两轴分别有standards/specification锚点及唯一字段：

Reviewer: codex:/root/review_t08_native
Axis: standards 或 specification（各自本轴）
Result: pass 或 request-changes（实际结论）
Input-SHA256: 630404fbe847c70e44e8ddd58585adb8454e285485538394908ef3025bb5f6d2
Observed: 本轴实际证据/观察，不能只写格式校验通过。

source-discovery、复用理由、旧finding处置、probe原件、当前无漂移及未验证边界可回读；写后实际return结构检查存raw再通知Root。Root唯一维护状态和最终接收，不宣称整个Goal完成。
