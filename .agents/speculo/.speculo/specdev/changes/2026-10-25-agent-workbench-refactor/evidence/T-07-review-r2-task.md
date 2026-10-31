# T07 独立双轴复审 R2

交给原独立 reviewer `/root/review_t07_r1`，保持实际 gpt-6-astra/high 身份。你未参与本票实现，R1 的独立性持续有效。所有产品 writer 已 SOURCE STOPPED；只读复审，输出仅 /tmp。不修复、不写正式状态、不递归派遣、不使用真实账号/Vault、不提交或发布。沿原 R1 任务的标准轴与规范轴完整范围；可以复用字节未变的真实阅读/验证，不能只机械确认三处改动而漏掉当前行为的相互影响。

实际 workspace：`/home/wta/orca/workspaces/obsidian-huhu/terminal`。
Change：`.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor`，下称 C。

当前唯一权威输入 `C/evidence/T-07-review-input-round2.md#review-input`，Input-SHA256 **80e66f4ab3e1f859f3e13bd529b90b92c76f787d7d0a92c812c92bc72202d0d8**。70 路径、69 sources；请实际重算并核前后漂移。HEAD 仍 33c21e098ef3188cbab5a09f3e0a01fadb787715；真正 T07 工作副本增量仍以 `T-07-dispatch-input.json` 为基线，不把 T01–06 旧未提交改动归给本票。当前最终交付 `T-07-final-delivery-integration3.json` SHA bc3194a4a81aed973788cd0a5e7a7dbd36f9422d05c658f7c308253baf8285d6；70 选择/68 本票实际变化，无范围外改动。其完整差异与 CAS 在该文件。原 R1 结论和所有失败原件保留。

当前冻结全部产品/工具：`C/evidence/T-07-root-integration3-final-input.json` SHA 924cf7daa793a7998d5f6c7a1132ce5d3d661afafa391bda15d55ed7c0dc923e。相对 i2 仅 5 条 Rust 产品源变化：native/pty-server/src/bin/huhu.rs、src/control/{client,locator,broker}.rs、tests/control.rs。完整 C30/实际 7 路径授权/前后摘要和 17 条原执行命令见 `T-07-c-review-r1-repair-root-audit.json` SHA 1da3b3260cfc9247811b49ae730a3d31cdc928217a61bc8c06add71917e699a3；便于阅读的原 handoff `/tmp/huhu-t07-c-review-r1-repair-handoff.md` 与 `.diff`/`-source.json`/`-checks.json` 都保存在该 audit 的原件 CAS。

必须复核的 R1 与 Root 同链修复：

1. whole runtime response 实际预算先扣除完整 target/error/envelope，然后限定整候选数组；最终 invoke 再核总长。不截 IDs 或候选来假装完整。exact 49152/+1、原长中文 target/多 locator、空候选真实边界都有回归；offline schema 独立预算不误伤。
2. 参数独立 OS 数量/累计字节饱和计数，拒绝后只扫描输出模式不保留更多正文；非法 UTF8 不造成计数漏掉。第 1/65/66/71 个位置 --json、64/65 数量及 32768/32769 字节边界需回读；未开 locator/endpoint。
3. request write 独立 H=2s，完整写完才开始 T+H response 窗口；broker 观察期限仍 T，没有进度续命/自动重发。正常超时保留最新 session/runtime/launch-pending，mutation effect unknown，迟到回执收束。网络分层最多 T+4H 的有限 IO 预算不是任意 scheduler 或同步文件系统的绝对墙钟保证。
4. Root 在同路径发现并真实红绿复核：forward 的只读 query 超时和 closing 曾误报 unknown/EFFECT_UNKNOWN；现在从既有 descriptor transport=query 导出 none，WAIT_TIMEOUT exit6 / WAIT_CANCELLED exit130；mutating 仍 unknown。依据/原收据在 `T-07-review-r1-query-effect-decision.md` SHA e604e5b1adc0c7cff4cc4879f53fb0e1ffb5708734bb30ece8eadb2771a8f9a6。T08 的 readOnly/wait 字段尚未实现，不能要求其提前混入本票。

当前可执行不可变双 bin：目录 `/tmp/huhu-t07-c-review-r1-linux-final-20261026T035611Z`，两者 0555。
- huhu-pty：SHA d5bca2651893ac7a6337af1ed68587c876206d034c1f8ddea9c7d98c2ae22ba4，29758424B。
- huhu：SHA 74a7941aab96e71602a9a573ea1c3315331464d08acfd2b1177957783f544f1e，13966464B。
- 同目录名 `-producer.json` SHA d38d55c029bb0fdf9fc5f02bd0d21d767f5e33fc279227e2ae454d2a9920ba40，实际同源 build --locked --bins、30 Rust/Cargo 输入及前后无漂移；复制时 verify pending 的状态之后由原 final-verify 成功收据补足。不得改/覆盖 bin 或用旧 bin替代当前验收。

最终当前源码完整 cargo test：111 顶层 /0 ignored，通过；嵌套树 fixture 那一次不双算。Windows --tests 交叉检查、7 路径 rustfmt、helper verify 通过。全 cargo fmt exit1 的三个未改输入格式差异如实保留：generated wire（T07 新增但本次未变）、两个与 HEAD 相同 inherited_fds 文件；不称全 fmt 绿，不扩大修复。一次复制前元数据计数错误也保留，不冒称行为 red。

Root 新 bin required 3 文件/4 项真实生产调用链通过/0 skip，见 `T-07-integration3-root-audit.json` SHA 4201ed3d433502f629b2756747c570ca1cd020832d2adb71e680cdfcf0a81206。同份 audit 包括只对新改 5 文件的数字相似度实际 run exit0，原参考输入未变；我方 6 处常规标准库/断言读回见 `T-07-integration3-similarity-readback.json`。不要读 GPL 原文或复制外部终端实现。

精确验证复用 `T-07-integration3-verification-reuse.json` SHA 9cda292ec138b335e21fe94a143549f6c4cdce0646e07e520596a9c70760cb85：JS/配置/依赖/根产物均未变，保留原 i1 554 pass + 唯一旧 fake 的 i2 18 项修复回归；不是新跑一次全555绿。原 build/lint/architecture/i18n/generator/bundle/notices 证据有效；6 个无关 Bot 文档旧锚点仍区分。真实 Provider/Obsidian/五平台由用户验收，未运行。

如果需要新反例，用隔离 fixture 与上述新 bin，记录实际 argv/cwd/UTC/执行前输入/exit/raw log/前后漂移；可复用已有仍有效命令，不为形式重复全套。不要运行构建/修改根产物。原 R1 探针脚本不能覆盖旧路径，须生成独立 r2 路径。报告输出固定 `/tmp/huhu-t07-review-r2-report.md` 和 `/tmp/huhu-t07-review-r2-checks.json`。两段明确 `<a id="standards"></a>` / `<a id="specification"></a>`，各包含 Reviewer: codex:/root/review_t07_r1、Axis、Result: pass|request-changes、当前 Input-SHA256、Observed、全部具体 findings/未验证项。输出实际工具证据与自报边界，READ-ONLY SOURCE STOPPED。T07 status 仍 in_progress；代码 AC 勾选不替代你的独立结论。
