Session: 20261105T094057Z
Task: 101-review-t07-t11-final
Status: completed

## 聚焦交接

独立high窄审完成。T-07：standards=request-changes、specification=request-changes；原093导航取消finding已关闭，新增确认一项P2真实编辑器来源回焦缺陷。T-11：standards=pass、specification=pass，仅指099及Root测试IO/driver补充的本次源码窄审；097未变结论继续有效，Root正式native矩阵尚未通过，不能据此标T11完成。

Reviewer: native:/root/review_t11；Strategy independent；Risk high；Independence required；Mode native。原实现/修复参与者native:/root/implement_t07、native:/root/repair_t07、native:/root/implement_t11、native:/root/repair_t11、native:/root；本reviewer未参与其源码修复。本次未委派，未写source、fixture、产物、state、Evidence、Git/index或实际用户数据，唯一仓库写入为本不可覆盖报告，过程只在/tmp/huhu-t07-t11-final-high。

范围与来源：读取实际093/096/099 REPORT，复用093、097未变完整结论；本次阅读096增量与真实调用方、099两文件增量、Root stage/菜单/cleanup/诊断补充及必要焦点生产代码。dev/ui及其motion-a11y、Spec/T07/T11、Map38/Goal、DESIGN3/UI002继续适用（designDigest 49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66），没有重开设计或领域审查。工作副本review，不以HEAD代替实际交付。

固定union105 manifest SHA256=2a8a8c6b866d938cec40aced3023970667f243e4d00a65ffbda8c52d4a309aea。开始/结束核对全部字节及mode：104项与该manifest相同，所有产品source无漂移；唯一差异T11/index.mjs由Root工具消息明确授权补充target/actual outerHTML与assert消息，菜单/cleanup语义和原命中断言未变。原manifest该文件SHA2153f6f20ae0979083bd7a494b18551549c75fee56baa26f0a02cf1d1c2f2a5b，本次实际始末SHA7dcfe365491760b10933430cc2dc656af69c35b36b9d5aaaeb539caf7a55ed74、mode664；T07可变driver本次始末实际仍匹配。未静默把差异忽略为零漂移。输入与原文摘要只在/tmp/huhu-t07-t11-final-high/review-input.json，Input-SHA256=819891b21ad8522bd59b3d6399ec97f363636f57f9d7148ad0fb90e7e1c35f65。

## 产物与验证

### T-07 standards output

Reviewer: native:/root/review_t11
Result: request-changes

原S01/V01关闭：workbench-page.navigate把此次AbortSignal传到Presentation.navigate，Presentation在dirty guard await后、副作用前检查该signal与既有lifetime/closed。原093私有真实binding→surface→生产EditorView→DiscardDialog的abort/未abort配对直接2/2绿；未abort正常导航，abort不改原target。没有用mock canClose代替真实决定。096相邻navigation.dom.test.tsx与完整automations套件也通过。

**F1 · P2 · clean编辑器关闭后丢失仍存活的实际Edit来源。**

定位：src/modules/automations/ui/AutomationsPage.tsx:170–175的异步openEditor、同文件:526–544的RetainedEditorDialog装配；src/modules/automations/ui/editor/RetainedEditorDialog.tsx:52–79；关联EditorView.tsx:132–139和共享modal-layer的来源捕获/恢复。不是096的signal修复回归，是本次必须归因的真实native失败，原093报告明确尚未认证此宿主/像素边界。

独立单控制使用实际生产fixture组件、生成styles.css及Obsidian app.css，在Chrome153、320px桌面窄叶、touch emulation开启，真实CDP鼠标/触摸/键盘事件。分别运行三个clean editor控制：mouse、touch、先明确focus来源再touch。每次Edit notify automation确实被触发、编辑器打开、Esc只关闭编辑器；原Edit按钮仍isConnected=true。三次结束activeElement均为Workbench navigation按钮，精确Edit来源恢复0/3。

事件证据排除了“touch原生不focus”解释：mouse和touch均有该Edit按钮的focusin，随后click时activeElement就是Edit notify automation；prefocused-touch对照在触发前已经是同一Edit按钮，结果仍丢失。原Rootdriver期待正确实体，不是等错按钮。最简初次clean editor已复现，无需先dirty/discard/hidden的完整前序，也无需运行全矩阵。

已证实的是产品的实体来源恢复失败。源码没有在openEditor的guard前保存实际opener，RetainedEditorDialog没有显式承接实体来源，EditorView又会自行focus内容；共享层依赖其捕获时点，可能已错过调用来源。后半句是机制推断，未伪称内部entry.source已被仪器读取。无需为确定该P2修改生产代码或杜撰touch语义。

影响：键盘及触摸用户关闭编辑器后跳回工作台导航，丢失当前实体位置；来源节点仍存活，不满足允许合理fallback的前提。

最小满足条件：在实际打开请求处保持正确实体来源，并通过现有共享恢复API在真实关闭后恢复；真正hide/owner销毁、嵌套guard和晚到请求继续遵守各自边界，不新建focus/trap引擎。补同一来源mouse/touch及先focus配对，保留Root精确回焦断言；生产修复后重跑该单控制，再由Root继续其矩阵。本reviewer不实施修复。

### T-07 specification output

Reviewer: native:/root/review_t11
Result: request-changes

096满足原093 await之后的导航身份保证，原finding关闭。其余093已读能力/日期/草稿/生命周期结论仅在未变输入范围复用。

F1违反DESIGN §7“关闭按栈恢复焦点，来源已卸载时才允许同区域后备”和ui/references/motion-a11y.md:31“关闭后恢复真实来源”；来源未卸载，却回工作台导航。新证据使本票真实回焦验收不能通过。标准/规范各自保留该结论，不把DOM通过代替native控制。

### T-11 standards output

Reviewer: native:/root/review_t11
Result: pass

- 099仅在列表预览比较notificationBody(record)!==record.title，精确相等才省略；无trim，详情/搜索/语言/投递/时间未删改。相邻DOM新增控制直接验证Different尾空格的span.textContent；完整原automation.test.ts仍保留zh/en/zh、structured/free text、Exact reminder次数1、Different尾空格、Open、投递及完整时间断言。本次4/4及跨票164/164实跑通过。
- 096对旧SSR测试的迁移使用文件级happy-dom、真实HuhuProviders/createRoot并实际点击详情；修复provider前置而保留业务断言，finally卸载根、恢复临时createDiv/act环境。不是把原检查删掉或换为只断字符串常量。
- Root quick-pick.test-support改为每fixture递增唯一stage ID，满足真实CipherRepository.commit先stage主密文、再嵌套写backup的端口语义；publish/discard/真实读回校验都保留，未改服务或crypto。独立重跑原真实mutation→lock→unlock控制1/1绿，主/backup都为字符串且不同，重新解锁可读ISO deletedAt；没有将测试数据字段误断言当产品finding。
- T11 driver增加真实role=menuitem选择、补exercise调用真实uiReview.dispose并检查两Document无dialog/portal/safe detail/quick残留；未删除原20状态、命中或交互断言。Root后续HTML诊断只加可观察上下文，原point.hit断言保留。T07两赋值加void只避免CDP返回DOM对象，未减少检查。

### T-11 specification output

Reviewer: native:/root/review_t11
Result: pass

099保留原精确去重与用户空白文本合同，无领域能力扩大；Root测试端口修正不改变密文格式/事务，driver补充不冒充新增产品能力。097四项已关闭结论在未变source内继续有效。这里的pass只认证明确修复及测试/driver语义，非T11全部native/Obsidian验收通过。

### 实际命令与材料

| 实际执行 | 结果 | 本地原材料 |
|---|---|---|
| 原093配置：pnpm exec vitest run --config /tmp/huhu-t07-high-review/vitest.config.mts --maxWorkers 1 | 退出0；2/2导航配对通过 | /tmp/huhu-t07-t11-final-high/navigation-original.log |
| pnpm exec vitest run src/modules/automations --maxWorkers 2 | 退出0；23文件164/164通过 | automations.log |
| pnpm exec vitest run --project dom src/modules/notifications/ui/InboxPanel.dom.test.tsx | 退出0；4/4通过 | inbox.log |
| pnpm exec vitest run --config /tmp/huhu-native-fixture-repair/vitest.config.ts | 退出0；真实stage mutation/reopen 1/1通过 | stage.log |
| pnpm exec tsc -p /tmp/huhu-t07-navigation-repair/tsconfig.json | 退出0；限定真实依赖图，无诊断 | types.log |
| pnpm exec eslint src/modules/automations/ui/automation-presentation.tsx src/modules/automations/ui/workbench-page.ts src/modules/notifications/ui/InboxPanel.tsx --max-warnings 0 | 退出0，零警告 | lint.log |
| node /tmp/huhu-t07-t11-final-high/focus-runner.mjs --suite frontend-redesign --ticket T-07 --matrix redesign --out /tmp/huhu-t07-t11-final-high/native-focus | 退出0，观察性probe完成；三种来源恢复均失败，不能把进程0称为UI通过 | native-focus/result.json的focusControl、native-focus/focus-control.png、native-focus.log |
| 开始/结束105 SHA+mode核对 | 退出0；104原摘要相同，唯一Root明示T11诊断补充，始末均稳定 | start-snapshot.json、final-snapshot.json、final-drift.json |

除完整写出的路径外，材料均位于/tmp/huhu-t07-t11-final-high。native私有runner复用生产fixture的真实编译与Chrome/CDP初始化，只跳过原矩阵verify/exercise、替换为单focus控制；没有改源码/断言求绿。它记录焦点与原生事件而不对精确来源作pass断言，所以result.status=passed仅表示采样成功；F1明确来自其0/3恢复结果及Root原timeout，不借进程0掩盖缺陷。未运行全66、真实Obsidian/popout、用户vault、系统clipboard；iframe仍非原生popout。

Root原/tmp/huhu-t11-cleanup-native/result.json已回读，单390控制passed且有cleanup回执。Root正式/tmp/huhu-t11-lead-final/result.json当前failed；/tmp/huhu-t11-hit320-diagnostic/result.json记录Next page被data-state=closed的sheet-overlay挡住，不能把单390或本次source通过扩成全矩阵绿。该检查仍归Root，不在本次擅自删改driver；可保留命中断言，等待实际关闭overlay退出后再执行下一动作以区分退出动效/driver节奏与产品缺陷。此为原始诊断观察及最小下一步，不是已完成归因的第二个产品finding。

## 问题与下一步

1. Root按F1执行最小T07来源回焦修复，继续保留精确实体断言；不得仅把touch断言删掉或宣称浏览器不focus。096导航取消及099精确去重可保留。
2. T11继续Root当前关闭overlay/命中诊断和正式矩阵；当前报告不标两票或Goal完成。未变189领域证据继续复用，不扩查未变crypto/扫描引擎。
3. 报告回读并运行return结构校验后释放105 union产品冻结；允许的driver差异已明示。reviewer返回后停止写入，正式Evidence/状态/修复由Root持有。

### 返回前Root驱动补充回执

原报告写入及return0后，Root明确消息确认T11/index.mjs再次仅加等待当前Document closed sheet-overlay的实际animation.finished，再等两RAF；原point.hit断言与菜单/cleanup均保留。该Root追加不改产品source，不要求等待其后续矩阵。实际返回时该driver SHA256为 09f6a277f24f160d10d4f206e7f08e7d062bbf9f602ea9e3475e039c58acba25（mode664）。前文Input-SHA与始末snapshot绑定的是此前诊断版本，保留不改写；此处明示最新driver输入，不伪称后续单320控制已由本reviewer运行。其源语义已回读，所增加的是实际退出动画等待，不是延长超时或删除命中检查。T07 F1及其他产品输入/两票源码结论不受此driver补充影响。
