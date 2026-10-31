# T-05 第三轮独立双轴审查

原独立 reviewer `codex:/root/review_t05` 继续，沿实际初始 gpt-6-astra/high 身份；不递归派遣、不实施修复。实际交付者为 codex:/root、/root/prepare_t03、/root/prepare_t05_screen、/root/implement_t01，均 SOURCE STOPPED。current workspace与HEAD/base仍为README所述33c21e098ef3188cbab5a09f3e0a01fadb787715；GP019/Map20，T05 in_progress/快速退出补修attempt3，原周期和全部失败保留。

唯一审查输入：`T-05-review-input-round3.md#review-input`，Input-SHA256 `a1e5c84108745f14a691df405b416e695e4c168f971e864cebe51983ce6c2a13`。完整对象亦在`/tmp/huhu-t05-review-round3-input.json`，49当前交付原字节在`/tmp/huhu-t05-review-round3-source`，相对T04增量`/tmp/huhu-t05-review-round3-increment.diff`，相对你的round2增量`/tmp/huhu-t05-review-round3-repair.diff`和`repair-files.json`。57来源应重新核SHA；前序94未变文件复用记录在T-05-reused-prior-round3.json，完整前序115字节来源T-05-prior-delivery.json。新纳入host.test.ts是本轮实际改变，不能从审查中漏掉。

调用已读code-review Skill及working-tree/risk/review-evidence合同。可复用已确认不变范围的原分析，必须沿完整最终交付核查新增/受影响路径、真实消费者与恢复；两轴独立按standards再specification返回，不限制有效finding数量。

本轮重点输入：round2两个反例（无预留输入结果次序、claimed reply失败晚于exit仍须到达captured Session）、两份settlement合同、fast-exit/owner-drain/capacity修复Packet及input均已进入57来源。native未预留结果先于同SID exit；协商replySettlement围栏；typed-none只对未产生I/O的pre-reservation失败成立；reserved但零输出失败仍真实结算；Host快退出spawn收养状态与多owner并发release观察均有新回归。请独立检查未覆盖交错，不能仅按测试数量推导通过。

Root实际结果：最终v8 1948输入不漂移、30文件227测试0skip通过；同68364efe0e253ed9662814f596a904680476e918d2c4fd86207b9c0849417e91固定Linux helper，0555/26357552B，producer receipt10361f0b…和12源在原证据。最终生产build/Chrome20/lint/Promise/architecture/bundle通过且v8只变测试准备屏障；该测试额外scoped types/lint与完整4项通过。Root审计T-05-capacity-root-attempt3-audit.json，前轮原件T-05-owner-drain-root-attempt2-audit.json。真实压力34次stop/reuse、5×6MB慢stdout、200000B abandon、32实际spawn后的容量拒绝、3000行双observer、Browser Cookie与原sessions.e2e均保留生产接缝。native74用例/verify与Windows GNU交叉检查只对未变producer复用，不称Windows运行。

原尝试失败必须保留：旧压力primary不全、原4秒填充失败原因仍未知；一次readonly probe未复现。最终capacity仅按单一4秒总deadline逐SID等待真实spawn后再准备下一SID，没有放宽32/第33拒绝、原业务或cleanup断言。不要把修fixture推成生产根因。

可运行有意义的针对性只读验证，既有通过检查在输入无变时复用。新临时反例仅写`/tmp/huhu-t05-review-round3-*`，不得修改repo源码/正式工件/main/styles/budget/依赖或共享target，不覆盖原报告。若需Rust构建只用独立/tmp target，不能覆盖固定helper。真实命令先冻结实际源/config/exe并保存argv/cwd/UTC/exit/原日志，所有临时子进程限自有scope并清理。不得把装配失败称行为红灯，不通过删断言/改timeout造绿色。无Obsidian、Provider账号、用户Vault或五平台真实E2E；用户负责这些验收。无提交/推送/PR/发布/归档。

返回`/tmp/huhu-t05-review-round3.md`，独立anchors `standards`、`specification`分别含Reviewer/Axis/Result/Input-SHA256/Observed与可定位findings、关闭旧finding的依据及限制。若有验证另存实际checks/source-observation与原日志，最终声明SOURCE STOPPED。Root负责真实回收、审计和正式状态，不自行改票done。
