# 任务回报

Session: 20261026T045732Z  
Task: 032-t09-pane-adapter  
Status: completed

## 聚焦交接

032 T09 B第二阶段候选已完成，B18产品SOURCE STOPPED。沿原gpt-6.1-sol/xhigh、同current workspace执行；未递归派遣。冻结TASK SHA256 `7a63d93a05cb9242152a44c94853063c2897c4b825ef10b95e08bd97393d5695`，Root实际B2 dispatch0及输入manifest `cc5b28983dbf275dc65737186f3e28ad1012510ea37d7ae701b1f3658e023dab`作为派遣事实。原029/017工件和报告均未覆盖。

六项Pane命令现接入原WorkspaceService.panes及同一布局owner，canonical/CONTROL_HANDLERS/真实help同步启用，其他未实现命令仍unavailable。新增控制适配未复制布局DTO/store、未使用GUI新建Shell入口；未写A/U/Root、Host/helper/editor、codec/generator、SpaceService/records或依赖锁。18条分配路径中13条实际变化，5条按原实现复用。未根plugin build、提交、推送或改正式Ticket/Goal/Evidence。

最终验收组合：032原定向9文件195/195；A最终STOP后037仅重验消费A的4文件31/31，038针对types0。完整native016为147次顶层执行全绿（排除session_tree子进程额外打印的1 passed）；017新Linux bins0、019 WindowsGNU all-targets compile check0。独立审查、Root统一build/lint/styles/预算与整票状态仍由Root负责；本报告不是T09整票或真实宿主E2E通过声明。

## 产物与验证

### 范围与冻结字节

证据根R=`/tmp/huhu-t09-pane-adapter-qy887yk8`。before.json保留实际执行前18条（新测试不存在）；after.json和candidate.diff绑定本候选。after SHA `9c1de479477aa49a419768c430057ae99f65e4c29e6c0522136b8bef57a49dfc`；收尾逐条SHA检查保持不变。模式取现场stat，未沿用历史报告中的模式。

| 路径 | before SHA256 | after SHA256 | mode |
| --- | --- | --- | --- |
| `src/shared/native/control-schema.json` | `f91efa05b4e5617d8674dfdb32b8c8ffc21df5b84d94a3c5fbf274d61389024e` | `c56ca20576632d858052e9b97888dca304b795ccc0ebd18956b70ac070b54a9f` | `0o600 → 0o600` |
| `src/shared/native/control-wire.generated.ts` | `d2ef2ab83a43c8e35f2625ba9545c66262d3370635370df108ec617bf9254f91` | `ff18c457a03a3eaf4c04d36405f3f2f85a64eebd927fed78c0d708264f53d835` | `0o600 → 0o600` |
| `src/shared/native/control-wire.test.ts` | `8fe1eadf34846a488b71164519d482d8d09ec5c517e48836de9c099036758e57` | `6e10176e7e240ee5451c044f83bf196b0d94bff9690bcdc1f23c9fb11c42678c` | `0o600 → 0o600` |
| `native/pty-server/src/control/wire_generated.rs` | `45d71c617c9c0f037ae9bc2218a7c87aaebd81333f2606aaaa3e7a6e8ca0337f` | `9b444ee7224f0e159c437a05fb97b3344358b3b3cfb0af9e65380b0fc00d5936` | `0o600 → 0o600` |
| `native/pty-server/src/control/cli.rs` | `01cd9206980ac8b3be6fd5b865832bb08e2f8573bac6fecdf4e96c554c4d23e1` | `01cd9206980ac8b3be6fd5b865832bb08e2f8573bac6fecdf4e96c554c4d23e1` | `0o600 → 0o600` |
| `native/pty-server/tests/control.rs` | `d6b8d141099be1d798033f85bf18cc200da7e5d090ceed5e76e12c5295f7a98e` | `03abbd535007219b415be12f283a68ecb984fe0c906d9a743d8be68e15534ca6` | `0o600 → 0o600` |
| `native/pty-server/tests/control_protocol.rs` | `4653e8fbba516ffa6bd580dfb5d8274a6cff12670206bbe801077b9387deba00` | `4653e8fbba516ffa6bd580dfb5d8274a6cff12670206bbe801077b9387deba00` | `0o600 → 0o600` |
| `test/fixtures/native/control-v1.json` | `0005ce7103c24a80a67e1992bd6e9642b574de1932d9953f3b656a91b0c3f8de` | `0005ce7103c24a80a67e1992bd6e9642b574de1932d9953f3b656a91b0c3f8de` | `0o600 → 0o600` |
| `test/native/control-protocol.test.ts` | `989ec78827f7fec0bed7b23ca5b35667ad63cf4d3a617d6e72f23fe826a06992` | `8c28967ed22e63833cd4e7c26fc8e60eed34ad337a224b12de3ec102d5efc1d8` | `0o600 → 0o600` |
| `docs/agent-workbench-cli.md` | `a869f298548ec61ea2d7b154aa568c35cbca636fb6caf29863a675d2bf954ebe` | `e656c8b1805378e6b1f565259bda2db4891391adac06e1e42ca4fd7f57bb06c6` | `0o600 → 0o600` |
| `src/modules/agent/services/control/commands.ts` | `f3be6061aad02297f122d738db24d1f1da2d6d9587050645b042449b3e0132ac` | `09b398d1e42170ac3b9b06ccd24b70fbcb431e5f31689db7041151b192dd0568` | `0o600 → 0o600` |
| `src/modules/agent/services/control/commands.test.ts` | `32b0a7c4b1a8a713a4aefb98824a73fb8eae8b006b29b63bde9049c1882d9dc9` | `4f9a660ff0cb4889a7a553d91a17c0f3a72b768332c8dc8a42e002c776335d28` | `0o600 → 0o600` |
| `src/modules/agent/services/control/paging.ts` | `4241524eeef4946396af0b22914425d2314b44f0b6e1a789370afbc11591c680` | `4241524eeef4946396af0b22914425d2314b44f0b6e1a789370afbc11591c680` | `0o600 → 0o600` |
| `src/modules/agent/services/control/paging.test.ts` | `fa84f33c53e9ed18e3da41ba2195000e1f8273dc470345e8d06c42e70b170a8a` | `fa84f33c53e9ed18e3da41ba2195000e1f8273dc470345e8d06c42e70b170a8a` | `0o600 → 0o600` |
| `src/modules/agent/services/control/router.ts` | `f20bd3a448f4dc6d8b0b139d51a5305ca6ebe89df372095befd0ce36e7bb685b` | `939cb2f903990d3503603e55c28132ea78fcc22b17f8818b7d6bea6f9e2dfc68` | `0o600 → 0o600` |
| `src/modules/agent/services/control/router.test.ts` | `64f6ccf2ad7fd4a4e58ab5ef7007843753a6686f7190ae9b71dab4d71967df8d` | `310a30180c03151a5e091096d19c0eaf6664d9712bd2534ab8eed67cbd9e044e` | `0o600 → 0o600` |
| `src/modules/agent/services/control/router-foreground.dom.test.tsx` | `edada82390045a3ff32b4d13ff791a99cef2a0d9def59e4a42ed7d04608a6cf9` | `1f001aa3c108acada000993d693e98991e0312dd55a4d15d68337a03fb558b4f` | `0o600 → 0o600` |
| `src/modules/agent/services/control/control-panels-native.test.ts` | `ABSENT` | `3809bcf017a80aae03c42a2120328c34fb6e843f403cf48784fc763acf86cf26` | `ABSENT → 0o664` |

### 真实接线与机器语义

- `commands.ts`的capturePane只调用真实WorkspacePanes。capture/captureSession在ACK/forward同步栈分别捕获源Pane及插入Session；captureFocus在scope等待前取得一次性原ForegroundIntent。原signal及performance.now绝对deadline原样传入，不Date转换、不重置排队时间。pane.list只在缺显式Space时冻结当前调用Space，其余显式目标不补cwd/UI焦点/调用者Session/runtime。CLI沿029既有明确参数规则。
- split请求的session/runtime是插入C，source B的runtime独立捕获。响应top target始终源B完整vault/instance/space/pane/session/可选runtime；data.insertedPane单列C。attach返回实际新/既有Pane完整tuple；close后的回执仍指原Pane。Router在实际attach结果后刷新为prepared.target，不拼接源Pane与插入Session。
- mutation data只返回layoutPublished、persisted、revision、pane/insertedPane身份tuple、可选focused/focusRequestId与有界diagnostic，不重复无界标题/内部布局材料。preflight在作用前预算完整success及failure envelope：已有attach最坏4096B opaque ID按JSON双转义计量，源及插入tuple分开，包含错误/诊断与相关target。40000B异常scope预算负例在零publication/write时拒绝；长合法ID与标题的真实列表另验证。
- 原domain effect照传：写在途取消保留unknown/layoutPublished=true/persisted=false，不重放；后续实际保存仍由原owner收束。已确认focus consumed后的abort/error保留completed/focused=true/原tuple。typed PaneCommandError/SpaceError映射实际code及现有本地化message，reason有界256；一般后续诊断为SOURCE_UNAVAILABLE/post-effect-observation，不能用EFFECT_UNKNOWN错误码覆盖已确认effect。ok=false可以伴随effect=completed，客户端必须读取原事实，不能因有error自动重试。无伪造T08输入receipt。
- 原ControlPaging.ts/paging.test.ts未修改，复用16-token/10s有界位置栅栏；query key包含原scope/Space/operation/limit，revision直接来自原WorkspacePanes真实布局。GUI未保存编辑同样使旧cursor stale；跨Space/limit查询拒绝。完整49152B回包按target/cursor缩页，行不裁剪；单行本身能装而完整envelope不能装也准确capacity。
- 直接Router覆盖C0/DEL、超长、unknown、跨Space、stale runtime、重复ID与捕获后关闭/重新附加：均拒绝且无本次写/stop。合法字面Unicode/大小写、4096B ID保留。原持久3069B tuple实际派生精确4096B lp1 ID，cold query前后cached=false/snapshot相同、无writer/write/Pane UUID；同lp1可由原owner关闭，进程仍活。3070/raw损坏等原owner风险由A最终验证，本B不复制身份算法。

### 生产DOM与真实CLI

DOM使用真实TerminalTabView/TerminalHost、WorkspaceService、SpaceWorkspaceStore、SpaceService和Router。仅复用既有TerminalView受控设备renderer端口；没有mock掉presentManagedFocus、commitFocus、consumed或业务owner。正例断言真实activeElement、唯一原request id、原目标tuple及committed→consumed；blur/cancel/原deadline到期拒绝晚聚焦；生产叶consumed后同步abort不能覆写结果。另以原presentation owner注入post-consumption observer异常，专门验证adapter错误映射；这个注入用例不冒称生产叶呈现证明。

新control-panels-native.test.ts通过真实NativeHost/PtyHelper→ControlEnvironment→Rust CLI/broker→Router/ControlCommands→原WorkspaceService/SpaceWorkspaceStore/SpaceService。使用本次新immutable pair、磁盘/宿主隔离端口与受控直接Node进程，无Provider/Pi/账号。每轮保留cli-launches/results、summary、cleanup JSONL，含完整argv/cwd/UTC/CLI pid、helper pid、路由及响应，UTF8用有界Buffer数组在结束时解码。

最终037原件目录 `R/native-business-037-final-A`：同cwd两Space的route来自A，显式attach/split仍准确指B与第三C；重复/并发attach只一个显示owner；second .15对应模型 .85；GUI resize .3立即由CLI同树读到。无renderer的native focus实际已选择叶并确认保存，返回partial/focused=false及诊断；没有称输入聚焦成功，其成功路径由真实生产叶DOM证明。close后原C的真实PID依然存活，terminal.read仍见PANE_ORIGINAL_PID输出；明确terminal.stop后PID消失。最终cleanup五项fulfilled、errors=[]、helperAlive=false。

### 最终A/U消费与历史边界

A公开018签名全程不变；其最终a14-after.json SHA `f77c7d5c87ac4bc9400a4802eb790664d6b7637ee78a2e0ac689f33b82e83757`保存在R/a14-final-input.json。032/033发生时A仍active；034保留其当时真实消费字节及后续workspace-service.ts/pane-identity.ts漂移。没有用新源追补冒充旧运行。A STOP后037再消费实际最终源并与14路径manifest逐条核对；038另跑针对types。Root可复用稳定native/协议检查，只对最终A/UI受影响闭包继续整合。

最终实际运行消费的A六源：

| A路径 | 实际SHA256 |
| --- | --- |
| `src/modules/agent/core/workspace/model.ts` | `c9b3b96f8847b8dd349ed6aabcfeb71e3226f653ec78d857d2c712a8d9698390` |
| `src/modules/agent/core/workspace/ops.ts` | `b9542c02b602d88622b02b504e6a8688930c9a2b4869ef6983758481ecd31a31` |
| `src/modules/agent/services/workspace-service.ts` | `d300219eaa45a1214a33256b059cbaefea39b19c8c6e37f20fc95ecc89c93917` |
| `src/modules/agent/core/workspace/pane-identity.ts` | `474c970c5e8a8506c7ef226920921ab84f7d1c3ccc07ddec3dd8c0d184a7fef6` |
| `src/modules/agent/services/workspace-service-panes.ts` | `44b9d099b6ad403f7f83509ebebe7f1ad252566420ff58e30fb8d21a696b6310` |
| `src/modules/agent/services/workspace-store.ts` | `5530cf719ad7a74a7b10084535ed40eb522a48f7568b734cde8d16b54635c921` |

实际U生产消费：

| U路径 | 实际SHA256 |
| --- | --- |
| `src/modules/agent/i18n.ts` | `9de547d9dd03300f33ed4b4e49d5b379019b59888b024fe01c8bd0888ee665d4` |
| `src/modules/agent/ui/terminal/TerminalTabView.tsx` | `47799f959fc6e06fe92069525241a84529924a4efd808941d0a11eb451a5ba70` |

最终消费清单R/final-consumed-inputs.json SHA `b447bfc341dbdc0cca28ad14a9eecb1e41095a7c4b5daeb21b0a93be26496e36`。最终合并127个Vite实际transform路径，037独立121个，038类型文件524个；早期共享vitest-inputs.jsonl仅作为历史aggregate，032/037有独立按command标记的原记录。native-consumed.json SHA `1d5289faf488b752a4458b63dcb53a4a1007aa2e16bcff5dab31e26824bb357a`：777条Cargo实际dep-source路径、143份dep-info、172份fingerprint、62份锁定registry archive（逐项校验Cargo.lock checksum）及9份SQLite C输入；保存Linux/Windows build输出。源码CAS尽量复用已存在快照，工具只记录实际物理路径/SHA/版本，不额外复制大工具二进制。这不是内核/系统动态库镜像，也不把Root整个构建闭包当成我的定向消费。

### 命令、红绿与失败原件

全部实际argv/cwd/UTC/退出码/raw SHA在R/commands/<编号>.receipt.json与raw.log。完整最终测试无选择性skip；定向-t中未运行项单独保留，不计作通过。关键顺序：

| 编号 | 实际结果与含义 |
| --- | --- |
| 001→002 | 真实owner Pane adapter首红CAPABILITY_UNAVAILABLE→接原API后单项绿。 |
| 003/004→007 | direct Router负例原断言误把所有坏Unicode统一成同一code；实际unpaired surrogate不能在失败target序列化，原最小整DTO回capacity，普通超长合法UTF16由domain INVALID_ARGUMENT拒绝。夹具改准确预期，未放宽wire或身份门。 |
| 005/006→007 | DOM夹具每次settings.get产生新对象引发React更新循环；改稳定snapshot。随后async act内等待阻碍effect/30ms窗口短于原poll，改原RTL waitFor/准确期限观察；保留两轮raw，不当产品红绿。007生产叶正反例绿。 |
| 008→009 | 原Obsidian声明错误沿项目标准skipLibCheck；同时修我新增success-envelope类型不含unknown的实际编译错误。009 types0。 |
| 010→011/012 | availability先真实red(true期望/false实值)，在实际handler+生产叶闭合后同步启用并生成；012六文件171/171。 |
| 013→014→016 | 隔离HOME使PATH的Node/Volta wrapper discovery失败；显式HUHU_TEST_NODE后，既有editor fixture temp_dir()/hue-UUID被长TMPDIR推过原XDG长度门而fallback。仅将TMPDIR设/tmp，使原独占hue-UUID/0700<50B；未改冻结C/editor源或断言。016完整native147顶层全部0。 |
| 015/026/028 | in-flight取消unknown、作用前整包预算、dirty revision/cursor、真实整envelope缩页/单行边界、cold legacy owner正反例均绿。 |
| 017/019 | 新Linux bins build0；WindowsGNU --all-targets cargo check0（仅编译）。原foreground.rs dead_code平台warning原样保留，无零warning声明。 |
| 018/021/022→025 | native首轮真实focus为partial，夹具误期none；修准确事实后暴露新测试漏import vi（021运行/022类型红）；补实际import。025全CLI链绿，清理成立。 |
| 023→024 | 真正产品红：已consumed+observer error被B映射EFFECT_UNKNOWN而强制unknown。修Pane诊断映射保留原effect，真实owner绿。 |
| 027/029/030/031 | 新测试types0；定向ESLint0警告；仅B分配文件格式化；Rust改动测试格式check0。 |
| 032/033/035/036 | 9文件195/195，针对types0，最终生产ESLint --max-warnings0，generator --check逐字节一致。 |
| 037/038 | A最终STOP后只重验受影响4文件31/31及针对types0，最终消费与A manifest匹配。 |
| 034/039 | 完整归档/native producer、最终消费和自有资源清理0。 |

### 新native pair与清理

新同源不可变pair，不使用017/029历史路径：

| 文件 | SHA256 | 字节/模式 |
| --- | --- | --- |
| `/tmp/huhu-t09-pane-adapter-qy887yk8/immutable-pair-linux/huhu` | `494fdd5f1d7ccf569dd6fb838a66c540dd45c6b751868186dd4d3e6ee673fb06` | `1971944` / `0o555` |
| `/tmp/huhu-t09-pane-adapter-qy887yk8/immutable-pair-linux/huhu-pty` | `98b145281484232acd33806a28670a0e2bb47e842c4b339574602b5138ba662f` | `7888320` / `0o555` |

producer=`R/immutable-pair-linux/producer.json`，SHA `f6b4a13c07e05542a69d38ed2ca450d0f5b3480c5434ed2a47f0b438eebab5d5`，0444；明确记录011生成、016完整test、017 --bins、019 WindowsGNU check真实回执、native输入/锁/工具。profile为dev/unoptimized、DEV/TEST_DEBUG=0、jobs2、offline/locked、stable Linux toolchain；不是release优化构建。Linux pair物理字节在后继CLI执行前按精确路径/SHA预检，完整保存新producer。

统一自有R/cargo-target在dep-info/源/producer保存后删除；原Cargo registry cache/src/index仅只读symlink，未改旧target/旧pair/旧证据。Root确认的短/tmp测试运行条件修正有原前后fixture清单。最后扫描记录所有原命令process groups、own pair/target exe及受控Node唯一argv/cwd，无自有存活进程；short runtime新建0700后移除，最终hue-*未新增残留；隔离HOME/scratch已清。真实finally收束与新pair正常退出证据在各轮cleanup，不把强杀当关闭成功。
R/cleanup.json SHA `c3319e6e0d053ac7ff3932bd0d4884f79f2ad63517eda3b8c5f0a9a2004cfc44`；实际自有target文件删除 `287817271`B，收尾可用空间 `1440677888`B（Root并行构建会继续变化）。R/final-audit.json SHA `dcd6aeb4392a6af2c861ecc35f783ee4b1b4f0a2bc32a17e9739a6ccd080133d`。

## 问题与下一步

B18保持SOURCE STOPPED，无本范围未修复测试红灯。失败历史均保留，final源/命令/模式/输入/工具可回读。REPORT原子落盘后执行实际return结构校验，原回执与delivery-receipt.json/index另存R，不覆盖历史回执。

Root继续统一插件build/lint/架构/样式/预算、最终生产UI/Chrome影响核验和未参与实现的Astra两轴审查，再决定T09正式状态。DOM不证明真实canvas；U已交真实TerminalView/xterm Chrome证据由Root按影响复用。native的无renderer focus只证明准确partial，不宣称实际输入聚焦。未运行真实Obsidian/账号/Provider/Pi/OS IME或五平台宿主E2E，按原合同由用户完成。
