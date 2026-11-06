# 任务回报

Session: 20261105T094057Z
Task: 049-review-t04-startup-cancel
Status: completed

## 聚焦交接

独立 reviewer：native:/root/review_t04_startup（gpt-6.1-sol high），未参与实现、未委派。限定本次启动取消修订，standards **pass**；specification **pass**，无新增阻塞 finding。047 S-01 的停止后 recovery/settings 拒绝已关闭：真实 recovery-start 在取消后不发 Notice，main 正常结束；活动恢复失败仍恰好一个 Notice 并传播原错误。独立 9 项、仓库 main 15 项均通过，本范围类型诊断与生产 lint 均为 0；全局类型仍有图外迁移诊断，不能称全局通过。结束 13 路径无漂移，**明确释放本次 Root 13 路径冻结**；全票/native/产物门仍由 Lead 验收，不声明 T-04 或 Goal 完成。

## 产物与验证

### 固定范围及方法

Review mode: source-files；Risk: high；Independence: required；Strategy: independent。observed HEAD 为 `37fcede4210a19bcc2a74809e7fdd301e5717957`。读取 TASK、AGENTS/workspace/catalog、dev/ui、测试/Obsidian 生命周期规则、SpecDev C/I 和双轴/风险/错误/可靠性合同；规范源按顺序定位为本次显式 T-04、Map revision 16、Spec、批准 DESIGN revision 3 及 047 TASK/REPORT，source-files 不从 commit 推断外部来源。DESIGN 仍绑定 DESIGN-0002，change digest `49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66`；本次不变更布局、schema 或设计。标准源为 AGENTS、dev/ui 参考及真实 lint/TS/Vitest 配置；来源字节摘要保存于私有 sources-manifest.json。

精确 13 路径及 SHA 来自 `/tmp/huhu-t04-startup-final/manifest.json`，manifest SHA256 **09d07131573037f5832759fd9f1216b4d7713c81faf10b018a629d9957f6b241**。独立开始/结束逐文件同时比对当前源码及 frozen/，两次 drift=[]；公共 source-files scope validator 也退出 0。私有 manifest.json、before-verification.json、final-verification.json、source-scope.json 保存明细。

相对 047 的 12 源快照，仅 main.ts、main-events.dom.test.tsx 改变，并新增真实只读 callee recovery-start.ts 进入冻结范围。其当前 SHA 分别为 `e4f6cff3e846c6bcaeff850d5e19d0d4c9dfdbf0a5c5ea81a70cec24976896e0`、`f7680bf2240ddc8d9f2e7b5bebf3d5ebda725079a8d0d99febb722d67fabb1a0`、`d9fa64e48a8463225bc2bac9af79b002fb2870b243eaf8e4ee588c32df8cd679`。recovery-start 的旧字节来自 047 独立冻结 callee；三项 delta 均保存在私有目录。其余 10 源/测试字节未变，046/047 已关闭 opener、成功晚返回、state、metrics、DetailPane 结论保持原范围和限制，不把旧 request-changes 报告改写为 pass，也不重复未受影响的宽矩阵。

影响链沿实际 main.onload → recovery.startRecovery → RecoveryHost.recoverBeforeStart/Notice、loadSettings → loadSettingsRuntime/returned store.dispose、afterSettings → host.register 检查。正式源码只读；写集仅本不可变 REPORT 与 `/tmp/huhu-review-t04-startup-cancel`。无源码、资产、配置、依赖、索引、正式状态/Evidence 或 Git 写入，无安装、worktree、提交、推送、发布。

### standards 输出

Reviewer: native:/root/review_t04_startup
Result: pass
Findings: []

047 的剩余问题已在真实产生副作用的边界修复。main 将后续启动纳入同一个错误出口；只有 owner signal 已 abort 或 nativeClosed 时结束，活跃 owner 仍 `throw error`。原 content Notice 的活跃失败分支保持；原成功 await 后检查、晚到 SettingsRuntime 的 dispose 和模块激活前存活检查保持。

实际 recovery-start 必需接收 AbortSignal，在创建 recovery host 前检查，在已开始的 recoverBeforeStart 完成后检查，catch 内在注册词典/创建 Notice 前再检查。已开始的领域恢复仍被 await，没有把 signal 传给事务，也没有提前 return 冒称其终止；RecoveryHost/recovery-transaction、gate 和文件协议未改。活动失败保留原始异常对象及单次原生 Notice；取消后的 AbortError 由 main 的 closed-owner 出口接住。

独立复跑 047 原反例未 mock main 或 recovery-start：只隔离外部 recovery host 端口及 Obsidian Notice 终端。停止后实际 recovery reject 现在零 Notice、onload resolve；活动时同一 reject 得到同一异常且一个 Notice；迟到 settings factory reject 也正常结束。新增真实 wrapper 晚成功控制明确等到领域 gate 完成、completed=true，随后无 settings、contexts 或 Notice；预取消控制证明 recovery 根本未开始。active settings factory rejection 仍拒绝原错误，防止扩大 catch 后静默吞掉活动失败。

另在实际 afterSettings → host.register 链增加 active/stopped 同步拒绝配对：活动传播原错误；注册端口触发 owner unload 后错误正常结束、已赋值 settings store dispose 一次、没有模块 context。仓库原 paused-await 成功/失败 registration 控制也保留。它们验证组合和资源归属，未声称真实 Obsidian Settings UI 已验收。

### specification 输出

Reviewer: native:/root/review_t04_startup
Result: pass
Findings: []

本次符合 T-04/Map16 的“启动拒绝路径的界面取消边界”：取消后的恢复成功/失败不产生晚 Notice、不继续激活、不使 onload 失败；迟到 settings 成功返回仍由 loadSettings dispose，迟到 factory/registration 拒绝被 closed-owner 出口收束；活动恢复错误保留提示和原拒绝。实际调用只有 main 传入该必需 signal，测试调用也同步适配，未发现遗留无参消费者。

15 项 main 回归保留 shared domain event 隔离/卸载、host rollback、device signal/lazy 请求、content refresh 晚成功、recovery/settings/registration 晚成功、真实恢复活动/停止拒绝、settings/registration 晚拒绝、deferred enable 与 Intro.cancel/未确认不记已读。源检查未发现删除这些 guards 或引入并行取消引擎。未修改 UI token、持久 schema、领域恢复协议或业务数据。

### 实际命令和结果

以下日志、配置和测试均在 `/tmp/huhu-review-t04-startup-cancel`：

| 检查 | 实际结果 |
|---|---|
| 当前/frozen 13 路径开始与结束 SHA；source-files review-scope | 均退出 0，drift=[]；source-scope.json、before/final-verification.json |
| `git diff HEAD --check -- <13 paths>` | 退出 0；diff-check.log；仅已跟踪 diff 格式检查，不冒称完整未跟踪历史比较 |
| `TMPDIR=/tmp/huhu-review-t04-startup-cancel pnpm exec vitest run --config /tmp/huhu-review-t04-startup-cancel/vitest.config.mts` | 退出 0，2 文件 9 项全过；independent-final.log。047 原三反例原断言不变，新控制六项；首次 7 项也全过后才补 registration 控制 |
| `TMPDIR=/tmp/huhu-review-t04-startup-cancel pnpm exec vitest run --project dom src/app/main-events.dom.test.tsx` | 退出 0，15 项全过；main-events.log |
| `pnpm exec eslint src/app/main.ts src/app/recovery-start.ts --max-warnings 0` | 退出 0，零警告；lint.log |
| `pnpm exec tsc -p /tmp/huhu-review-t04-startup-cancel/tsconfig.json --pretty false` | 宿主退出 126；真实 9 生产入口、项目声明及传递依赖，541 诊断均图外，精确 13 路径 own0；types.log/type-summary.json |
| validate-dispatch `stage=dispatch` | 退出 0，errors=[]、warnings=[] |

私有配置复用实际 dom 项目、React/setup、真实 main/registry/recovery-start；原反例不 mock Notice 产生代码，新 registration 控制也使用实际 afterSettings。Notice mock 只记录原生出口，不能证明实际外观/聚焦。Root 共享全量日志 `/tmp/huhu-t04-startup-reject-types.log` 和 `/tmp/huhu-t04-startup-test-types.log` 分别含 548/556 类型诊断，本次三增量路径均无诊断；它们是读取的补充输入，不记为本人执行，也不写成 global green。本次精确入口的 541 与原 047 同入口图外数一致，未抑制诊断或要求本轮迁移图外 consumer。

## 问题与下一步

本次无新增阻塞 finding；047 S-01 在限定候选上关闭，046/047 原报告和红灯材料保持不可变。现明确释放 13 路径冻结，交 Lead 回读报告并整合本票证据。

未运行真实 Obsidian 主窗/popout、DeviceChoice/Intro 原生渲染/焦点、完整 Shell/日期矩阵、全局 build/budget/notices 或产物重建；这些由 041、048 与 Lead 按原票和全局集成门继续，不能以本次 host mock/DOM 结果替代。T-04 整体验收及 Goal 状态不由本报告推进。
