# 任务回报

Session: 20261105T094057Z
Task: 046-review-t04-shared-seams
Status: completed

## 聚焦交接

独立reviewer：native:/root/review_toolchain，既有gpt-6.1-sol high；未参与本12路径实现，未委派。standards **request-changes**；specification **request-changes**。确认1项P1真实helper参数错位和1项P2异步启动卸载后继续激活。两项已即时发Lead并获接收；本次独立4项回归3失败/1通过，原unit12、main/metrics/detail17、lint和architecture通过，不能掩盖上述反例。

12路径前后无漂移。**明确释放Root本次12路径冻结供批量修复。** 仅写本REPORT和 /tmp/huhu-review-t04-shared，无业务源/资产/配置/依赖/Git/index/正式状态/Evidence修改。045保持独立不可变；041实际Shell/044日期native工作不纳入本次结论，不宣布T04或Goal完成。

## 产物与验证

### 精确输入与范围

Review mode: source-files；Risk: high；Independence: required；Strategy: independent；Mode: native。observed HEAD37fcede4210a19bcc2a74809e7fdd301e5717957。精确12路径来自 /tmp/huhu-t04-shared-final/manifest.json，SHA **3147c683d17788c72ac17b639778d127d687a6bd4fc06b414ae0d738b7daf8de**；开始逐字匹配当前和frozen/，私有副本source-before/保存全部12文件。结束drift=[]，记录before-verification.json、final-verification.json。

范围为main及其事件测试、三个workbench contracts及state测试、compose及测试、workbench-leaf、use-leaf-metrics及测试、DetailPane。已读046 TASK、当前T04/Map15/批准DESIGN3及既有AGENTS/dev/ui/SpecDev审查合同，并沿调用追踪Shell canonical state/focusLeafState、content/new-note及真实host opener、DeviceChoice/Intro生命周期、Provider ownerDocument/Visibility与DetailPane生产者合同。Root main/metrics/details为固定源，041/044实际UI/fixture及其他图外写入不要求全局冻结。

S-01的实际callee src/app/content/new-note.ts额外固定到私有content-opener.ts，SHA **76b128969eb86e3a73ed2bbfdea1637e85bd8ea43ae67022bef309fd215c86f4**，结束仍匹配。它是当前真实接口上下文，不使用旧mock声明代替。8个生产源的tsc实际传递依赖会进入尚未迁移模块；如下如实分离scope诊断和图外诊断，不把全局错误当本票全部通过。

### standards 输出

Reviewer: native:/root/review_toolchain
Result: request-changes

**S-01 · P1 · 内容贡献把Window传到fragment参数，创建/选择文件均运行时报错。**

定位src/app/workbench/compose-workbench.ts:54、64。当前真实openInNativeTab签名为 `(app,path,fragment?:string,owner?:Window)`；两个调用却传 `(app,path,ownerWindow)`。TSC各报TS2345：Window不能赋给string。这是冻结范围内的真实自有诊断，不能归入旧consumer迁移账目。

独立实际边界反例保留真实composeWorkbench、contentPanel与new-note.openInNativeTab，仅stub最后的外部host openNoteAt及文件创建/host数据；create和select两动作都在new-note.ts:43以 `TypeError: fragment?.startsWith is not a function` 拒绝，host opener未完成。创建路径已先createHuhuNote，之后才失败，用户会得到新文件但无法按预期打开。原compose测试将open mock为unknown[]，只验证Promise/参数传递，恰好容许错误的第三参并制造绿色。

证据 /tmp/huhu-review-t04-shared/compose-counter.dom.test.tsx、compose-counter.log、independent-final.log；真实类型诊断types.log。最小修复两个调用在第三参显式undefined、第四参传ownerWindow，并以真实new-note helper + 外部openNoteAt stub替换该边界的宽泛mock；保持Promise pending、失败传播及原有fragment调用方合同。

**S-02 · P2 · device阶段以后的pending启动在插件卸载后仍可恢复并激活模块。**

定位src/app/main.ts:181–192及后续初始化。当前取消检查只在initializeDevice结束后执行一次；content模块lazy import、refresh、recovery、loadSettings等后续await边界没有owner/liveness守卫。插件卸载会关闭现有资源，但不能阻止之后才恢复的onload继续创建新资源。

独立反例复用main-events的真实main/registry与同类外部host mocks，仅将managedContent.refresh接到Promise gate：onload确已等待refresh，执行onunload()+host unload，再resolve gate。实际继续经过recovery/settings并激活两个真实fixture模块，最终到达host settings mount sentinel；期望正常停止、lateContexts=0，实际lateContexts=2并返回sentinel错误。初次修复的晚device请求控制仍通过，不能推出整个启动期已受保护。

证据main-counter.dom.test.tsx、main-counter.log及independent-final.log。最小修复要覆盖相关启动await的恢复边界及迟到取得资源的释放，取消后不再初始化/注册/通知；不能仅再加一次device检查。保留活跃启动时的真实失败传播和资源对称清理，不引入平行启动引擎。Lead已接收本实际gate反例用于现有main-events回归。

### specification 输出

Reviewer: native:/root/review_toolchain
Result: request-changes

S-01违反实际内容贡献的ownerWindow与可用Promise动作合同；S-02违反本任务明确要求“卸载后停止pending初始化”的owner生命周期。两轴同一问题不重复计数。

其余固定源未发现需额外修复的具体问题：

- canonical huhu-workbench-ui/1按未知/旧schema整体default，不读取旧target/focus/panelWidth/pages外层字段。Leaf初始、setState、Shell re-export、focusLeafState均使用同一normalizer；mode及路由恢复一致。模块section为长度≤128的受限opaque ID，resource/focus有独立边界，不在shell解释模块语义。
- safe的route去除section/resource/focus，page状态为空；normalizer最多100页，页面状态只保留界定keys，嵌套深度/数组/对象/文本有界，过滤非有限数值与原型/显式secret字段；运行时页保存再按contribution.stateKeys投影。focusLeafState发新mode/pageViews envelope，无旧focus外层reader。没有为状态迁移恢复旧UI别名。
- 内容动作已正确保持async Promise直到native open完成，create失败向UI caller拒绝且不继续open；问题是S-01的真实签名错位，不能用这三个旧绿色mock测试证明真实打开成功。
- DeviceChoice调用方提供同一个必需AbortSignal、注册owner abort，并在lazy import前后检查；原晚device及活动dialog中卸载控制通过。Intro.cancel注册到plugin cleanup，onUserEnable deferred callback和late acknowledgement经nativeClosed守卫；这些是main组合/host wiring证明，真实DeviceChoice/Intro rendering、IME/焦点和生命周期由041另验。
- useLeafMetrics从所属Document取Observer，优先显式logical element，再找完整data-huhu-leaf/workspace-leaf-content而非main窄区；隐藏断订阅/恢复重测，旧effect的active flag防止排队RO覆盖新owner。本人补充实际DOM跨Document append/adoption后更新OwnerDocumentContext的控制通过：选择新realm Observer/980宽，旧callback不覆盖；hidden cleanup、resume580、unmount disconnect均正确。该DOM rect接缝不冒充实际像素或原生窗口迁移。
- DetailPane小于600时inline style使用传入leafWidth，不再把wide Document的100%当580叶宽；中宽360/max440、inline的leaf>=960且main>=1000不变。稳定host/portal/选区/草稿/滚动路径未改，原7项通过；没有新trap/provider/私有持久状态。实际像素/Esc/adoption仍属041，Lead反馈580实际通过仅作工作上下文，未列为本人native执行。

### 实际命令、结果与限制

| 检查 | 实际结果 |
|---|---|
| 12源manifest/current/frozen开始与结束SHA、限定git diff HEAD --check | 退出0；drift=[]；final-verification.json |
| TMPDIR=/tmp/huhu-review-t04-shared pnpm exec vitest run --project unit src/app/contracts/workbench-state.test.ts src/app/workbench/compose-workbench.test.ts | 退出0；2文件12 tests；unit.log |
| 同project dom，选择main-events/use-leaf-metrics/DetailPane三文件 | 退出0；17 tests（main7+metrics3+detail7）；dom.log |
| 同目录私有vitest.config.mts独立反例 | 宿主退出126；3文件4 tests，3失败/1通过：create/select真实helper和late初始化失败，metrics adoption/cleanup通过；independent-final.log |
| pnpm exec eslint 本范围8生产源 --max-warnings 0 | 退出0，零警告；lint.log |
| pnpm exec tsc -p /tmp/huhu-review-t04-shared/tsconfig.json --pretty false | 宿主退出126；真实8源+声明及传递依赖共543诊断，**本范围2项均S-01**、图外541项；types.log/type-summary.json。未类型抑制，未称全局通过 |
| pnpm test:architecture | 退出0；1364 modules，无zone/host-package/desktop/barrel/cycle违规；architecture.log |
| validate-dispatch stage=dispatch | 退出0，errors=[]/warnings=[] |

类型检查采用项目真实生产config，仅设置noEmit/既定skipLibCheck及实际声明入口。图外诊断包含旧Button/Badge变体、旧尺寸、主题export等，保持原子集成账目；本报告没有证明每条图外诊断都为既有，也没有要求本次迁移这些模块。S-01有确切自有文件、真实callee及runtime失败，不以图外数量掩盖。

私有测试复用仓库dom配置/setup和真实main/registry/helper；只隔离host/文件系统边界，未在仓库写测试。新main counter初次私有复制漏转两处dynamic import路径，suite未收集；修正私有绝对路径后才得到实际产品red，初次日志initial-counter-import.log保留，不计为缺陷。正式17项及unit12未改断言。未跑共享build/main.js、完整native矩阵或对041/044诊断fixture做修复。

## 问题与下一步

两项已交Lead接收；当前冻结明确释放。请批量修复内容opener两个参数位及完整启动await生命周期，纳入本实际helper/gate反例后重新冻结复审。保留已通过的取消/Intro wiring、canonical state、metrics stale callback与DetailPane身份控制。

045跨根浮层源码审查保持独立；实际Shell/日期/DeviceChoice/Intro、ownerDocument迁移与真实像素/命中/Esc由各owner继续。T04最终组合native、Root矩阵、Obsidian主窗/popout与全局旧consumer/生产bundle/notices等门按原账本处理，本报告不宣布全票或Goal完成。
