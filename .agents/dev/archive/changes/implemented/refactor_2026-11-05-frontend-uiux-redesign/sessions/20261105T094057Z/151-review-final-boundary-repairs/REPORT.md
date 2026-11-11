# 详情焦点与原生计时判据独立窄审

Session: 20261105T094057Z
Task: 151-review-final-boundary-repairs
Status: completed

## 聚焦交接

Reviewer: native:/root/final_ui_contract；sol high；Strategy: independent；Risk: high；Independence: required；Mode: native。本人是148只读reviewer，未参与147/150候选或Root合入，未委派。只新增本不可覆盖REPORT与/tmp/huhu-final-boundary-repairs-high过程，没有改三源、其它产品/脚本、产物、状态、Evidence、index或旧报告。

**standards: pass；specification: pass；Findings: []。** 148 NATIVE-01关闭；147确定的Sheet旧focus trap清理前恢复inline焦点缺口，在三源固定范围内达到解除条件。独立当前DOM39/39通过、旧DetailPane单测试有界红；最终Safe原片段正确30秒绿、18秒早清/旧owner/50秒晚清均红。没有重新运行真正宿主或858，不能据此宣布T14/G-FINAL或所有终端平台通过。

三源与五个必要上下文始末hash/mode drift=[]。return0与REPORT回读后停止读写并释放全部冻结；Root可继续最终构建及统一宿主验收。

## 产物与验证

### 输入、差异与复用边界

Review-mode: source-files。规范为151 TASK、147/150原始报告、148 NATIVE-01、Map56/Goal/T02/T09/T14、批准DESIGN3/UI002；标准沿已读未变AGENTS/dev/ui/testing及独立双轴/risk/reuse合同。149 outline已独立通过的范围不重新打开；148其它八probe未变风险结论按原边界复用。这里没有PR/commit比较，不以HEAD代替dirty before。

两份Root冻结patch均逐hunk阅读，当前三源SHA/mode与其manifest after及apply.json逐项一致：

| 文件 | before → 当前after SHA256 | mode |
| --- | --- | --- |
| src/ui/components/huhu/DetailPane.tsx | 830288ba2de1a98a3b62c966d872a78159be20eb1f5df9034bf89d7b935c0075 → 2289e57aaa4f0d90e0e504e5b593d9140643ee0b9dc846849deecbc319e4775e | 0664 |
| src/ui/components/huhu/DetailPane.dom.test.tsx | 47d1d2de8df5d58bf9e9eec3790678f3e212a70444fd080f5a8adcc7d85f626e → 0b729121a1136026beb96ff0fcdb4ba8a144b2ab170756399366e8e26ab9ae68 | 0664 |
| scripts/ui-review/fixtures/frontend-redesign/integration/host-boundaries.mjs | dfd1b94662851caffc7c1919b7f015f71eab8902de6973734318b6ef4e4c1ef2 → 823accb9723511e412b444f10dadd23aba5153b2b31aab786966b641e396a2a8 | 0644 |

DetailPane patch SHA256 3d94c4b75122083b2b958121188d9a14fdb8498f8a103aa8f338ce1b8e5182f3；timer patch SHA256 08179e6b6882e40fa9b3ff476930d749340cacc482ebec7902c407b097c5f944。实际八输入清单/tmp/huhu-final-boundary-repairs-high/start.json SHA256 df16087b0e7e0cb95688a7880d33d7a6b4ff1576817292837eafe258092ab37a；结束end-audit.json drift=[]。五个上下文是Sheet、Tabs、modal-layer、dirty-modal和modal-regressions测试，不冻结Root正在重建的main/styles或全产品。

### standards 输出

Reviewer: native:/root/final_ui_contract；Result: pass；Findings: []。

**DetailPane是真正生产者的最小修复。** target ref只搬持久host与恢复scroll，移除该提交阶段的同步focusEditor；inline焦点恢复移到useEffect，在旧Sheet passive cleanup之后执行；进入Sheet仍由原onOpenAutoFocus在新scope中处理。没有加sleep、计时器、重试、禁用trap或关闭默认control，T09消费者/xterm/PTY/helper未改。

leaf≥960且main≥1000、leaf<600全宽、同portal child、retain focus/input selection/scroll与真正close卸载均不变；dirty-close仍沿原Sheet/dirty-modal单链。remember只保留原host内部活动焦点，外部active不成为恢复目标；新增effect仅open且inline及其依赖变化时运行，不按每次render、持续计时或全局事件抢焦点。实际现有dirty discard/来源恢复、嵌套层、owner卸载/新focus等modal回归通过；没有据此推断未测试平台的所有跨窗口竞争均通过。

**新增回归能失败且有界。** 使用真实Sheet和Radix Tabs，捕获focusout listener清理顺序；只在旧错误focus发生时记录并阻断该次调用，防止测试进程进入无限递归，未替换库trap。本人独立私有loader仅将DetailPane.tsx原路径的load结果替换为冻结before原字节，当前新增测试保持不变；旧源SHA独立核为830288…0075。运行单测试实际退出126，unexpectedFocus得到["BUTTON"]而期望[]，对应提交阶段早于trap清理；不是构建失败或任意timeout。当前正式源同测试及全部原DetailPane/modal回归39/39，实际退出0。新测试没有只断言代码字符串或为当前实现写一个永远绿的模拟。

**150仅修驱动判据。** 原15秒recopy与first-copy+31秒nonce保留不变；第二次await copy后记录secondCopiedAt，29秒处要求nonce仍在且完成观测未过30秒，错过pre-deadline观测直接失败。清空elapsed改为从第二次copy完成计量，29500–32000ms；500ms限定copy完成观测与生产timer起点差异、2秒为原生调度/CDP轮询上界，未改CLIPBOARD_CLEAR_MS或注入宿主clipboard。until剩余等待收紧至second+32秒，没有扩大原20秒窗口。所有实际时间进入结果详情，其余隔离、modal/反馈、lock/hidden/migrate/close/restart逐字保持。

### specification 输出

Reviewer: native:/root/final_ui_contract；Result: pass；Findings: []。

**147确定性反例有对应关闭证据。** 回读owner-red-01/evidence/focus-owner.json，旧trap的sheet-content断开，保留WorkspaceTools焦点已在inline ASIDE；结合原paused栈与本次独立before红/after绿，根因定位在ref恢复焦点早于旧scope清理，未误归JumpPalette、xterm或PTY。修复保留DESIGN3的同child、草稿/滚动、焦点/模态与默认control语义，不通过改布局条件或删除动作换绿。

本人回读147候选真实native结果与installed receipt：candidate-green-02的原terminal脚本7行全true/errors=[]，candidate-axes-01的1session往返/2session/重开/恢复输入/新echo等10行全true/errors=[]；两次expected/installed main均9b281b1bf0c781809eaac219a1a65faa8eed96e2618c504478c15aec08a735fd，原terminal脚本SHA ea90580a…642c，扩展脚本SHA a89cc20b…9c2。候选main实际文件亦匹配9b281…35fd，当前DetailPane源与该147冻结候选after相同。这是已回读作者原生证据的有界采用，不是本人重跑；147所记baseline c9a47与唯一生产差异、默认control=false单变量对照保留其原来源。Root新正式构建仍须重新绑定产物并运行，不能用私有9b281候选替代最终正式组合。

**148 NATIVE-01 closed。** 本人沿自己的148控制工具，直接动态提取当前最终host-boundaries中const copiedAt至clear check原片段，仅把旧反例预期改为应拒绝，未采用150作者测试实现或重写断言。纯Node模型不启动宿主、不读写系统clipboard、不改产品timer；提供模型clock/state只为判据可证伪，不冒称真实timer通过。

| 精确原片段控制 | 本次结果 |
| --- | --- |
| 正确second-copy后30秒清 | pass；first45000ms、second30000ms；29秒nonce预检true |
| second-copy后18秒早清 | fail；first44000ms，29秒nonce预检false |
| 旧owner在first30秒清 | fail；first31000ms旧owner检查false |
| second-copy后50秒晚清 | timeout fail；first47000ms，即second32000ms |

正确模型仍可通过，148原18秒假绿反例现在被实际新增断言拒绝；没有以删旧owner负控、变大timeout或新fake原生实现关闭finding。真实30秒Xvfb运行仍由Root完成，29500–32000ms只是明示的观测/调度容差，不代表允许18秒产品timer。

### 实际命令与结果

| 检查 | 实际结果 |
| --- | --- |
| validate-dispatch.mjs完整repo/scope-root/session/--task 151-review-final-boundary-repairs --stage dispatch | 0，errors=[]、warnings=[] |
| pnpm exec vitest run --project dom src/ui/components/huhu/DetailPane.dom.test.tsx src/ui/react/modal-regressions.dom.test.tsx | 0，2文件39/39；dom-current.log |
| pnpm exec vitest run --config /tmp/huhu-final-boundary-repairs-high/vitest-before.config.mjs --project dom src/ui/components/huhu/DetailPane.dom.test.tsx -t 'Sheet to inline transfers retained Tabs focus' | 126，预期旧红；1failed/7skipped，准确["BUTTON"]顺序断言；dom-before.log |
| node /tmp/huhu-final-boundary-repairs-high/timer-predicate.mjs | 0，以上四正负观察符合预期；timer-predicate-result.json |
| 三源afterSHA/mode、before源SHA、八输入始末audit | 0，均匹配；drift=[] |

dispatch公共参数为--repo /home/wta/projects/obsidian-huhu --scope-root .agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign --session 20261105T094057Z；return使用相同参数、同task和--stage return，写后实际执行并回读。此结构校验不能替代语义、身份核验或Root正式验收。

未运行build/lint/types、真实native/Chrome、正式66/858；Root同步build写main/styles不影响三源冻结。本次DOM证明真实组件调用顺序、状态与回归，不证明实际像素或独立Obsidian renderer；私有原生成功的已验轴与主机构建限制如上，不扩大到Windows/macOS/popout或全部终端。148其余八probe不因此变成最终同构建运行通过。

## 问题与下一步

无新增finding，NATIVE-01关闭，147该确定性focus循环在精确修复范围内闭合。Root可接受这三源并继续最终产物冻结、真实Safe30秒/recopy与terminal默认control宿主运行及整体门禁，保留任何未运行/失败项。本人不更新票据、Evidence或Gate，不宣布T14/G-FINAL完成。

本报告回读与return0后停止全部读写并释放八输入冻结；原147/148/150失败和诊断报告保留不变。
