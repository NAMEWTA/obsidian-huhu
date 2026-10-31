# 任务回报

Session: 20261026T045732Z  
Task: 023-t08-shutdown-result-continuation  
Status: completed

## 聚焦交接

F6 关闭结果传递候选完成，全部产品 SOURCE STOPPED。生产 Helper 的进程退出事实、stdio 完成与关闭成功现在分开；异常通过最后 lease.release/Host.dispose 可观察，重复调用保留同次结算。已确认 helper gone 的失败允许下一次明确 acquire，未确认退出继续阻止第二 helper；迟到物理退出只结算原代，不自动重启。真实 Host→PtyHelper→原017 immutable helper 的原异常已从020目标红转绿，正常 EOF 仍绿。

本023接续020未完成检查点，不覆盖020 TASK/REPORT/tmp。当前GP031/Map32、r5总88路径、唯一修复11路径；恢复周期1 attempts1、下次Root整合2，旧周期3保持。本候选不代表T08/Goal完成或独立R4通过；Root负责最终产物/消费者/官方Pi组合与独立审查。

## 产物与验证

证据根 `/tmp/huhu-t08-shutdown-continuation-eb066`（R），0700、短于原生XDG的50字节限制。R/meta.json保留本023十一条前像/模式，R/input.json原样保留Root preflight SHA `d632d63372c6e45c0b01f204dd3ea1b0c649e0055e08744b4882bcf4d72c3dbc`。当前TASK SHA `f82343cea2b90b19fb5b6689a5b7e7353be8af348d5bcc481ff0af7d44786120`；r5 allocation SHA `88978ec8a462ca88a426c8bfe8e98591aa6346739779edc916b49ae181e140a7`；原F6 packet SHA `b6d9c9fa5eae76d755babee02aef54667ecb3b89be832d972f99ec5f2320e14e`。已回读020 TASK/REPORT、正式补scope及当前Map/dev/T08/Goal，沿I/dev的TDD、并发/错误/资源/test-reliability约束实际实施；本轮无UI改动，无额外依赖研究需求。

020 REPORT SHA `9dcf9a31e5e413259ed842971fb8454fa42771413f9b4de624f09f7a85f4abea`、原R `/tmp/huhu-t08-shutdown-result-0ee4bbc8` 全部只读。020 002是改源前真实目标红：native exit1/identity changed但release与host.dispose均resolved，sentinel原文保留，目标断言实际exit1；020 003是旧正常fake缺close导致75秒外层TERM（143/timed_out），004是helper.test --bail1首项5秒超时（1，余项未完成）。它们没有被新候选通过抹掉。Root的真实Node ENOENT事件观察也作为事实输入：无pid不代表stdio已close。

### 最小设计与准确公共接口

比较了增加 NativeTransport 观察字段与沿原dispose返回 typed不可变错误两种方案。采用后者，继续由原PtyHelper/Generation拥有进程与关闭责任，不新增管理器、协议字段或重复closed事件。

`src/shared/native/host.ts` 新导出：

- `NativeHelperTermination`：只读 `state: exited | not-started | unconfirmed`，以及 `code:number|null`、`signal:string|null`、`forced:boolean`、`stdioClosed:boolean`、`diagnostic:string`。exited/not-started只证明原helper进程不存在，不证明清理成功。forced表示本地升级终止已请求，不推断因果；diagnostic是Helper观察时最后至多4000个字符串单元，恢复决策不解析它。
- `NativeShutdownError`：`outcome`复制后Object.freeze；`termination`是原owner的永不reject物理fence，可能在关闭观察超时之后才确认退出。已返回错误的outcome保持原观察，不被迟到成功反改。Host仅依state决定原代能否退休，不凭alive、timeout或错误文案猜进程gone。

`NativeTransport.dispose`、lease.release、Host.dispose原签名未变，拒绝语义现在兑现：

1. Helper先缓存同次dispose Promise，再立即关闭admission；仍沿原writer flush/EOF。物理terminated不reject，因此原editor收束不因关闭失败漏掉。正常code0、无signal、未升级且真实stdio close后才成功；未启动进程也必须观察真实close才能完成正常清理。
2. 非零、signal、升级终止、未知exit结果准确拒绝。exit与close之间的stderr仍能进入最后有界诊断。原4s升级/随后1s观察预算保持；已exit但stdio不close时不kill已gone进程，5s返回state=exited/stdioClosed=false的失败。error无pid只结算not-started物理fence，不伪造stdioClosed。
3. Host保存generation.closing及最近关闭结果。最后owner才关helper，其他Cookie/history owner可继续。已gone失败仍向原调用者reject，但原代退休；下一次明确acquire可新建。unconfirmed时保留原代，acquire拒绝且不启动第二helper；同fence迟到gone后仅退休原代，未来显式acquire才启动。所有旧代回调均受原generation身份检查，不能清新代。
4. Helper/lease/Host重复关闭观察同次Promise/同次错误，不重复EOF/kill/业务输入。Host在已退休失败代之后dispose仍保留该关闭错误；明确新generation才开始新的关闭结果责任。
5. startup/握手原始错误与cleanup错误通过AggregateError保留；NativeReleaseError.outcomes及其原stop cause与最后shutdown错误也同时保留。Host.dispose使用allSettled保存所有owner结果，避免finally覆盖。没有吞掉异常或把所有stderr警告当失败。

### 原operation/frame责任的新红绿

008新增保护测试实际5秒超时红：原物理退出先到，`finishEditorOperation(pending,error)`因尚有local frames返回，随后frame回调重试却丢了该物理错误，nativeDone又不会再到，导致settled永久悬挂。010/016最终绿的窄修是在PendingEditor缓存实际 `terminationError`，继续等同一frames集合清空后重试；不提前归还任何额度。

最终测试明确观察：dispose已撤admission时operation count仍1，bytes仍等于原UTF8正文长度，local frames仍>0；实际物理exit且原frame回调结算后bytes/count归零，settled准确reject transport-lost。已经确认的finished仍为原adapter-applied/completed，未被settled错误改成unknown。原本地callback/drain两序、native operation settled、queued none、unknown迟到settlement和F1 ordinary/editor close会合回归保持。物理fence与公开dispose成功没有混为一谈。

### 实际命令与结果

每条 `R/commands/<label>.receipt.json` 保存真实argv/cwd/UTC/exit/raw、前后递归导入闭包/CAS、工具摘要及显式双bin/env。无NODE_OPTIONS/LD_PRELOAD；直接绝对Node入口。选择性`-t`未运行项与完整最终套件分开记录。

| 命令 | 实际结果与用途 |
| --- | --- |
| 001-no-pid-stdio-red | exit1，1红/29未选；020中间候选把无pid error当stdio完成，新确定性断言实红。 |
| 002-stdio-fixture-corrections | exit1，81绿/28红；正常fake补close后，原协议拒绝/断连的exit1现在应被dispose观察，旧收尾还期待fulfilled，原件保留。 |
| 003-helper-shutdown-matrix | exit0，8绿/29未选；正常、非0、signal、未知code、强杀、未退出、stdio未close、startup双错及重复结果。 |
| 004-owner-and-existing-regression | exit1，120绿/1红；新增history活性测试错误期待fixture返回[]，真实既有request路径返回cookie rows。仅修该错误期望，未改fixture或业务路由。 |
| 005-real-host-and-helper-green | exit0，4文件74项；真实普通EOF、替代端点失败、下一明确generation、原F1三SID、helper与Host矩阵。 |
| 006-scoped-types | exit0；生产/测试及实际类型依赖，沿项目skipLibCheck。 |
| 007-owned-eslint | exit1；八个测试文件被仓库既有ignore规则跳过的警告，无生产error。原件保留；后续按项目规则只lint三条生产路径，不改ignore、不关闭规则。 |
| 008-physical-editor-fence | exit1，1红/7未选；上述物理exit早于local frame结算时的真实保护红。 |
| 009-production-eslint | exit0，三生产文件零警告。 |
| 010-physical-editor-fence-green | exit0，1绿/7未选；缓存物理结算事实后settled可收束。 |
| 011-production-probe-build | exit0；实际esbuild onLoad10输入/CAS/metafile/工具与生产bundle摘要。 |
| 012-production-host-proof | exit0；直接Node执行新bundle→实际Host/Helper→原017bin，release及host.dispose均reject准确typed exit1，sentinel原文保留。 |
| 013-final-targeted-regression | exit0，8文件127项，无skip；新fence测试及全部定向回归。 |
| 014-final-scoped-types、015-final-production-eslint | 全exit0。 |
| 016-final-fence-and-regression | exit0，最终8文件127项，无skip；补显式退出前bytes/frames断言后完整重验。 |
| 017-final-test-types | exit0，最终十一条生产/测试类型闭包。 |
| 018-final-input-resource-audit | exit0；2144输入/2072产品只有本023分配内9条变化，F6完整合计10条；3588前后快照项/实际build10输入可回读，无运行时源漂移。 |

完整016涵盖 helper.test.ts全部7项、helper-control、helper-stream、helper-editor、host-control、host、host-editor.integration、lazy-host八文件。新增helper.test.ts严格只有两处normal finish补exit(0,null)→close(0,null)，审计要求当前字节恰等于原件作此两处替换；七项原风险/断言保持。其它协议错误/断连fixture继续exit1，收尾更新为精确NativeShutdownError.outcome断言，没有改成0或通用catch吞错。Root另负责Browser module/Sessions/Controller的既有消费侧回归，本轮没有重复这些或扩大写集。

### 真实生产证据、输入与资源

真实integration在普通EOF与endpoint替换两个分支中均先收到原Session exit/reply-settled和editor关闭；替换仅发生于自身短0700 runtime的已知端点。替代分支实际code1/signal=null/forced=false/stdioClosed=true，sentinel的dev/ino/正文保持；原lease重复release仍同错，之后明确acquire产生第二helper，旧lease错误与旧回调不影响新owner，下一helper正常EOF。正常分支明确检查端点ENOENT。原F1同helper连续三SID在最终suite也执行，原binding全部退休。

`build/production/input-manifest.json` 捕获实际onLoad10份编译内容，非当前源追补；bundle SHA `a8548d5a77953f2f84ee8922d368b0cac39abd271c5c3ce14af6bdb5d274278b`。012把同一新生产bundle独立执行，观察native实际exit1、bounded stderr、两个公开关闭拒绝和sentinel；不是替代app或伪造result。测试仅受控Node应用，不冒称官方Pi/Provider验收。旧020同源机制反例仍是原红，未回填新值。

`R/final-audit.json` SHA `c990543c0da260d2a667e4093811e12cdab9ae78de492e0125b64e0f9a25de50`：记录29个真实helper/root PID均不存在，R无socket且/proc/net/unix无所属listener。异常fixture先保存inode/正文/结果，再只删自身已记录替代和original实体；清理后空目录没有被冒充产品成功。自身scratch HOME/jiti目录先记录路径/dev/ino/文件SHA并存CAS，再只清本次R/tmp；所有旧根/失败/bin只读。只声明已记录自身资源，不声称审计其他进程。

017 immutable pair全程复用且SHA/0555未变：huhu-pty `950b1832947eaa287ef9c03499e9574a61ee7b7c4845a31ff422a350ce3af843`，huhu `63db57114503eaedf757c6c087eef8c0c268d393dc86b58035de51c67fdacd74`，位于 `/tmp/huhu-t08-native-shutdown-linux-20261026T115900Z`。无Rust/Cargo缓存写入、全native重测、根build或main/styles/预算改动。

`R/complete-f6.diff` 相对020前F6原像，含三生产及七测试；下表给出完整F6前后SHA和模式，023自己的中间前像另在meta/audit。shared/native/host.ts在020已变、本023未再改；lazy-host.test.ts未变但已运行。

| 路径 | F6 before SHA256 | final SHA256 | mode |
| --- | --- | --- | --- |
| src/host/desktop/native/host.ts | `82338f7b1c909a6854562398f15c7cfe859f5ad8767ff36dc4d334706a7e5b9b` | `0a074028fb378baa504938eae797266f185400ba339919e67482c0c589c8636b` | 0600 |
| src/host/desktop/native/helper.ts | `2a2fb89d75dd1d7221b7d80c6fd2a439b6763e7784265709686442dc8dfd92b1` | `f90dacdf91ac102fb939f9db184c765b55d0b2aded49d78b59ca3c7392b46824` | 0600 |
| src/host/desktop/native/host.test.ts | `e830331ac13858af44baa77c6f1359cdfd07ba3b1d727c89a0577da9449d96b0` | `8e09aecbe4ec4cefb8d5b59033ed9e1690b4527bbd27ece17de7f44d49739ab3` | 0600 |
| src/host/desktop/native/helper-stream.test.ts | `e4567c686d0b1ed8bc118c4c04454bfa6f2a0d2b56251f981b451bb3e77feb59` | `b3767930b24e275b830163e1b903756891b5054ad65780460a8351ccea40a684` | 0600 |
| src/host/desktop/native/helper-control.test.ts | `b63f6966704ebcfa5b7c0fc369bbb99b72ab88b29e9a34fb8357653f5c9e5ab6` | `eb3736128e8342a3445443a16b1409bb3507f9920891631c8289e88742cd9536` | 0600 |
| src/host/desktop/native/helper-editor.test.ts | `01c0e01e20a7b766e414d88b102273a6ad3d3c31f386285f5f42fb57b84a4172` | `8b6057ba3cf7a1b328d6a1b93598b77cb671ceb384842d3104cc1b867f9c76ea` | 0600 |
| src/host/desktop/native/host-control.test.ts | `f21450e2f2540d14fb978c8023403ccd60e5a0950e37e2aa86899512e175d321` | `b7fff4bc55039debf559cfdb824c640e785de2a6b7f069f051d0afca95c9964a` | 0600 |
| src/host/desktop/native/host-editor.integration.test.ts | `014e64871d9d9814b3da52033ed841304bcf8658924e3337342918651c76d275` | `39194fc4e1e0e700b1a12d5f019f31a6eaa1cc71958e140dcd9f0fa61c315382` | 0600 |
| src/shared/native/host.ts | `06bf869aabf694373a3bfdfce1696e2303fe2c4a1cc250b0cf65d50922c8bea7` | `55550d57db87996a0c885f7e96d6675ad6274161f971613f526267126f712c1f` | 0600 |
| src/shared/native/lazy-host.test.ts | `d40a9be14c351d4ea19cedb8fa1926c3a82cb2eade1d32f7638962d36a01f990` | `d40a9be14c351d4ea19cedb8fa1926c3a82cb2eade1d32f7638962d36a01f990` | 0600 |
| src/host/desktop/native/helper.test.ts | `b077bccb0f4a5e4196c59bc5dd1415662b13fedb6b50d054236f7cb377004ae3` | `697736d79cdc4e1a572623af42dd4677a8297ea43f48e265b27c32eabccfab36` | 0600 |

## 问题与下一步

本023分配内无剩余实现或必需定向检查。Root取得候选后执行原消费侧、根build/真实预算增量归因、完整官方Pi组合及完整独立R4；真实Obsidian/Provider/OS IME/五平台仍未验。公开shutdown失败为本机生命周期结果，不等于agent输入未发生，也不自动重试任何输入或重新定位新运行。

本REPORT原子写后实际运行return validator，单独保存019-return-structure及delivery-receipt；不在写报告前预填通过。020检查点/所有原红保留，当前候选不改变正式Ticket/Goal状态或整合次数。

SOURCE STOPPED — 原11路径全部停止，等待Root接收，不自行开始其它任务。
