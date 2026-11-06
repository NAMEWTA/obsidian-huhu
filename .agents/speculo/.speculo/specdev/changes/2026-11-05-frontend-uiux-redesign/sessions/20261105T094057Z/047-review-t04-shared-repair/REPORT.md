# 任务回报

Session: 20261105T094057Z
Task: 047-review-t04-shared-repair
Status: completed

## 聚焦交接

独立reviewer：native:/root/review_toolchain，既有gpt-6.1-sol high；未参与Root修复，未委派。standards **request-changes**；specification **request-changes**。046 S01已关闭，S02原late-success反例已关闭；但迟到reject仍绕过取消检查，真实recovery-start在owner卸载后发送native错误Notice，确认剩余1项P2。新增active失败配对控制正常报告，不建议一律吞错误。

原046三个反例现全部绿，repo unit12/DOM21/lint绿；独立新增取消reject控制两红、active配对绿，合计本次独立6项4过2失败。本范围生产类型诊断0，传递图外仍有541项，不能宣称全局类型通过。**明确释放本次12路径冻结供Lead继续修复剩余错误路径。** 只写本REPORT及 /tmp/huhu-review-t04-shared-repair；无源/资产/依赖/配置/Git/状态/Evidence改动，不宣布T04/Goal完成。

## 产物与验证

### 固定候选及独立方法

Review mode: source-files；Risk: high；Independence: required；Strategy: independent；Mode: native。observed HEAD37fcede4210a19bcc2a74809e7fdd301e5717957。已读047 TASK、046原REPORT/反例、原12源快照与新快照、实际修复delta及新paused-await测试；沿用T04/Map15/DESIGN3、AGENTS/dev/ui/SpecDev审查合同。041/044 native工作与图外实现不要求全局冻结，未重复其采集。

精确12路径 /tmp/huhu-t04-shared-repair-final/manifest.json，实际SHA **e4c83749c4e6ba1b42415c453f04daa7c5b3db70117b54b69969185959b64722**；开始/结束逐文件核验全部匹配当前字节。相对046只变main.ts/main-events.dom.test.tsx、compose-workbench.ts/compose-workbench.test.ts；其余8源/测试字节不变。记录manifest.json、before-verification.json、final-verification.json。tracked限定diff-check退出0，不用它冒称未跟踪文件的历史diff。

剩余问题的真实callee src/app/recovery-start.ts作为必要只读上下文，已固定私有recovery-start-context.ts，SHA **db7c2ecaf66f2df2a80b3d59e3e8801359dd31eeef3a442fdbdb5887572075a4**。未改此图外源；后续若修复Notice生成边界，须由Lead协调相应源/快照范围。

### standards 输出

Reviewer: native:/root/review_toolchain
Result: request-changes

**S-01 · P2 · 停止后的迟到reject仍传播，真实recovery wrapper还会先发native错误Notice。**

定位src/app/main.ts的 `await recovery.startRecovery` / `await this.loadSettings` 及loadSettings内部await；关联src/app/recovery-start.ts的catch→registerMessages/new Notice/throw。新startupClosed检查放在成功await之后；rejected Promise会直接跳过后置检查。content和device catch已处理取消，其余相关失败路径尚未完整处理。

独立真实边界反例保留实际main和实际recovery-start，仅stub外部RecoveryHost.recoverBeforeStart为可控Promise及native Notice宿主端口：onload等到recovery，onunload()+host unload后reject。实际记录一条“HUHU stopped to protect your data…”native Notice，onload返回原late recovery failure；期望停止后无Notice且不再将取消后的启动报错向外传播。不是仅用一个mock startRecovery推导其副作用。

配对控制在owner仍active时同一reject：准确产生一次Notice并传播同一错误，测试通过。另一最小控制将settings factory等候后卸载再reject，也仍穿透loadSettings/onload；没有返回runtime owner可供成功分支清理，说明迟到owner dispose成功控制不能覆盖rejection分支。

证据 /tmp/huhu-review-t04-shared-repair/late-recovery.dom.test.tsx、late-recovery.log和independent-final.log。最终新增三项：stopped recovery红、stopped settings红、active recovery绿；同一取消错误路径根因只计一项P2。

最小修复需同时处理main的停止后错误出口和**实际Notice产生边界**：传播owner存活/取消信息，使已停止owner不再展示迟到UI错误；正常活跃恢复失败仍必须报告/拒绝。仅在main外层catch吞错误不能收回callee已发出的Notice；也不能为凑绿一律忽略recovery错误或改变恢复事务/数据保护语义。保留成功晚返回settings owner的dispose及已通过的late-context guards。

### specification 输出

Reviewer: native:/root/review_toolchain
Result: request-changes

同一S-01违反047明确的“No late … native error notices … after stop”和取消生命周期合同，不重复计数。046两项原发现的复核如下：

| 原发现/合同 | 本次结果 |
|---|---|
| 046 S01 opener参数错位 | 已关闭。两调用均undefined第三参、ownerWindow第四参；原真实helper create/select两反例均通过，自有TS2345消失 |
| 真实helper测试边界 | repo compose测试保留实际createHuhuNote/openInNativeTab，只stub vault及最终openNoteAt；owner Window、pending Promise和create拒绝传播均通过，无unknown[] opener替身 |
| 046 S02 content refresh late成功继续激活 | 原独立gate反例已通过：卸载后resolve不进入settings/模块，lateContexts0，正常停止 |
| 新recovery/settings/registration成功暂停控制 | main-events新增三阶段resolve控制通过，无late contexts；晚settings返回的owner明确dispose一次、不赋给plugin.runtime；recovery阶段未产生settings owner则dispose0 |
| 停止后的reject | 尚未通过，如S-01；现有新增暂停控制只resolve，不覆盖真实callee迟到失败Notice |

源码逐await检查确认：content import/refresh、recovery import/start、loadSettings、afterSettings、applyModuleFlags、links import之后及deferred-layout callback新增成功路径guard；device lazy import前后AbortSignal和Intro.cancel/late acknowledgement边界保持。loadSettings只在active时赋runtime/setLanguage，迟到成功返回先dispose。因此已关闭原晚成功/新晚owner泄漏路径，不将本次剩余reject缺陷误写成这些修复未生效。

046不变8源继续沿用其审查：唯一新schema envelope、旧schema整体default、safe状态剥离、bounded page state/opaque section、focusLeafState与Leaf/Shell一致、显式logical leaf/Document observer、hidden pause/resume/stale callback guard、DetailPane leafWidth窄Sheet及编辑器身份。相应unit、metrics/detail回归本次仍通过；无新trap/provider/持久状态。041实际像素/迁移/Esc与044日期native独立，不由DOM rect控制代替。

### 实际检查

| 检查 | 实际结果 |
|---|---|
| 12源manifest/current/frozen前后SHA、限定diff-check | 退出0，drift=[]；仅4路径delta |
| 私有原046 main/compose countertests，不改原目录 | 退出0；3项全过；original-countertests.log |
| TMPDIR=/tmp/huhu-review-t04-shared-repair pnpm exec vitest run --config 同目录vitest.config.mts（加入新reject控制） | 宿主退出126；3文件6 tests，4 passed/2 failed；independent-final.log |
| pnpm exec vitest run --project unit，workbench-state及compose两文件 | 退出0；12 tests；unit.log |
| project dom，main-events/use-leaf-metrics/DetailPane三文件 | 退出0；21 tests（main11/metrics3/detail7）；dom.log |
| pnpm exec eslint src/app/main.ts src/app/workbench/compose-workbench.ts --max-warnings 0 | 退出0，零警告；lint.log |
| pnpm exec tsc -p /tmp/huhu-review-t04-shared-repair/tsconfig.json --pretty false | 宿主退出126；精确8生产入口+声明及真实传递依赖，541项均图外，**12路径own0**；types.log/type-summary.json |
| validate-dispatch stage=dispatch | 退出0，errors=[]/warnings=[] |

Root提供的全prod548/own0是更广入口检查；本人沿046精确入口复跑得到541/own0，二者入口不同，均不是global green。本次不抑制诊断，也不因计数差异要求本次迁移图外consumer。无新增模块依赖/zone变化，046实际architecture1364模块通过证据复用，不为计数重复全仓扫描。

所有私有测试均复用实际dom项目/setup/React/registry/helper，只有外部host/文件系统/恢复端口被隔离；新recover失败控制没有mock掉recovery-start的Notice catch。本次未做native采集、共享构建/产物写入或源修复。046原REPORT及其red材料保持不变；本次三项原反例的绿保存在新目录。

## 问题与下一步

S01原P1与S02原late-success已关闭；剩余停止后reject/Notice P2已即时发Lead。现释放冻结；请补取消错误出口及真实Notice边界，保留active-error配对控制、晚runtime dispose及原11项main行为后重新冻结复审。

041/044可继续各自实际native；本文不替代T04完整fixture/Root矩阵、Obsidian主窗/popout、全局旧consumer/生产build/budget/notices门，也不宣布T04或Goal完成。
