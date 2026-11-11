# 任务回报

Session: 20261105T094057Z
Task: 033-review-t02-live-owner-repair
Status: completed

## 聚焦交接

Reviewer: native:/root/review_t02_live_owner，gpt-6.1-sol high；未参与030实现，未委派。Strategy: independent；Risk: high；Independence: required；Mode: native。

标准轴 **pass**；规范轴 **pass**。本次未发现新的需修复问题。028五个原source反例、025既有生命周期控制和030实际父先退出/子Presence后退出路径均通过独立定向检查。通过仅适用于030这次owner/回焦增量，不宣布T-02、全产品或Goal完成。

已向Lead释放两条fixture输入供后续单独整合；此次结论仍绑定其冻结副本。现在释放其余23条生产/测试冻结输入。本次唯一仓库写入为本REPORT，过程材料在 /tmp/huhu-review-t02-live-owner-repair；未修改源码、资产、配置、依赖、Git、正式Ticket或Evidence。

## 产物与验证

### 输入与范围

HEAD：37fcede4210a19bcc2a74809e7fdd301e5717957。

030冻结清单25路径：/tmp/huhu-t02-live-owner-repair/frozen/manifest.json，原digest df799c9213927dbf1b361788b108d8ff029cb595951bed055f0e9b4305d95f51。进入审查时逐一重算25条实际字节SHA全部一致，已复制到本人过程目录。结束时23条生产/测试再算全部一致；fixture两条已在私有复制和native输入核验后，经Lead协调排除后续fixture专属集成改动。

相对026冻结生产/测试，实质delta仅 src/ui/react/modal-layer.tsx 与 src/ui/react/modal-regressions.dom.test.tsx；dirty-modal.tsx及其他21条生产/测试未变。两个稳定SHA分别为：

- modal-layer.tsx：af75f56bffb3ab8621e692912508a5aeb530e44bc4cef27e81085a94ee438251
- modal-regressions.dom.test.tsx：c2df802e39a9704f30c56b8808efd606d5948543ed8ec12e4dcdbebef7bb81bd

另运行公共working-tree scope工具限定23路径，退出0；input_sha256 3e2f1f614e44b59864b876c183452ef862e7e2d7f10ca2b398ee33111b8ba6b6，完整结果在本人scope.json。该scope描述选定文件相对HEAD的实际交付，不伪称030仅有两文件的历史commit diff；其他票源码、生成资产和审查材料不纳入本次增量结论。

已读取AGENTS、workspace/catalog、dev/ui及相关DOM/测试/焦点规则、SpecDev I/code-review/独立审查与复用规则、change README/Map/T-02/Spec、批准DESIGN3相关§5/§7、028 TASK/REPORT及原反例、030 TASK和最终不可变REPORT。规范来源为显式工作副本合同，不涉及远程Issue/PR或commit message来源。DESIGN revision3绑定digest 49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66；旧视觉规则冲突按批准设计及T-04前优先级处理。源码、依赖适配器、lint/type/Vitest配置来源摘要另存source-inputs.json。

### standards 输出

Reviewer: native:/root/review_t02_live_owner
Axis: standards
Result: pass

1. **存活owner与合法焦点目标分开。** liveOwner忽略背景aria-hidden，但保留连接、实际CSS可见、hidden/inert/禁用祖先判断；restoreFocus同时检查ownerDocument。available仍严格过滤真实source/F6/候选的aria-hidden，不因028修复允许隐藏source聚焦。实际五项原反例独立重跑均转绿：Dialog/Sheet Keep Editing、Esc和普通嵌套Dialog均在真实Scope退出及排队microtask之后返回准确原source。
2. **真实退出顺序正确处理。** stack.contents只保留已附着Content，ref移除时删除；恢复只收集同Document栈、相同逻辑owner且已closed但仍连接的Content。父Scope先退出时，子确认仍可能隐藏opener，因此在所有已收集Scope的真实退出事件完成后才restoreNow。没有猜测sleep、全局焦点调度器、第二套Tab trap或放松可见性；Radix继续拥有trap。独立60项包含真实Presence动画保持子Content、父先退出且source仍隐藏、触发animationend后等待实际Scope事件的控制。
3. **取消和清理有界。** 每逻辑owner最多一项pending；新同owner恢复请求先清理旧监听。完成事件为once，cleanup删除全部监听及匹配Map项；owner卸载/迁移清理和最终二次ownerDocument/liveOwner判断共同防止旧回调抢焦点。最终执行前重验新顶层modal及当前合法焦点意图。新增独立两例在真实父退出后观察旧listener引用：同owner新恢复请求确实移除旧监听且最终新source获焦；owner卸载也移除旧监听。均通过。没有用仅Entry组件卸载便一律禁回焦的办法，条件Dialog卸载而页面存活控制仍通过。
4. **跨Document负控制有效。** 030 adopted-owner测试是在实际父Scope退出已经排队、子确认还连接且隐藏source之后，将整个owner容器adopt进iframe，再结束子动画。当前独立运行绿色；本人回读queued-document-red.log，临时撤去deferred Document守卫时，新Document被错误聚焦到Other first，说明不是直接helper的空控制。该负控制由030执行；本人未改生产源码复现mutation。
5. **内部事件假设已核对。** 安装FocusScope源码确实在effect清理的所属窗口timeout中向保留container分发focusScope.autoFocusOnUnmount，即使DOM已断开；分发后才清理自身handler和scope栈。因此等待监听在adapter回调之前/之后注册都以microtask收束最终结果。此为内部依赖约定而非公共稳定API。现有guard绑定完整原源SHA 52da53d1da1626ab3bde726e5195e1f5062a6f170755131991225517dc980957及图数量1，并在生产/fixture打包使用相同转换；未来依赖字节变化会拒绝原guard，必须重审事件与生命周期。当前实际调用方没有额外forceMount生命周期；本次没有发现已使用路径中的不匹配。

沿调用方检查Dialog/Sheet/AlertDialog、dirty confirmation、DetailPane与ref组合，确认用户onCloseAutoFocus的preventDefault顺序保留，dirty实际父关闭仍由父负责恢复。unchanged ref/StrictMode、IME/canClose、DetailPane草稿/选区/滚动/实例/leaf阈值由本次60项和原审查控制承接，不借本增量复审扩大为全组件视觉批准。

### specification 输出

Reviewer: native:/root/review_t02_live_owner
Axis: specification
Result: pass

增量满足AC-013及DESIGN3 §7：子层取消后准确返回父层原控制；父实际关闭时在退出栈完成后返回原opener；来源已移除时落到所属区域合理fallback；整个owner销毁或跨Document迁移时不抢其他区域焦点。原025空display:contents fallback、inline真实discard最终source、整owner销毁、新source移除但owner存活、条件Dialog组件卸载全部在本人原24项中保持绿色。

### source-bound native证据与几何

本人读取并重算030 native-final/result.json的2260项输入：2259个物理文件全部匹配；ASAR app.css按runner相同header/entry偏移提取后匹配SHA f612f1e8f36486fa57f3b8bd45f0c848409d5b168002e757a13c6d286a7b4c41。JSON.stringify(inputs)摘要匹配6514fa7a3fd82cd885e6d9c117317e44cb50071a842901b3f03d0adcf0bb0758，drift=[]。本人native-input-check.json和native-result.json保留核验事实。styles.css当前SHA仍为52208d87949d86a28d1a247441edb3709cd859d0a57e9fe1722368271d7b94c8。

已比较desktop-probe与原runner：差异为临时位置的绝对imports/root及单例矩阵过滤，未替换生产imports、适配器、交互和产品期望。最终原生结果passed/errors=[]：单一390/zh/ink/desktop/1x矩阵样本，另明确CDP设置normal/reduce并通过motion:system，8组语言×Document×motion交互、40条精确nested source、12条DetailPane保留、4条owner销毁记录。exactNestedReturns在每次Keep Editing/Esc/ordinary nested close之前挂真实Scope事件，等microtask与有限实际animation.finished后断言严格source身份；并非仅parent.contains。普通脏父Dialog实际discard同样等待Scope并检查dirty-trigger；Sheet完整子树退出控制覆盖实际parent close，不将开始关闭视为已settled。

回读早期browser-exit-trace失败：direct unmount顺序显示父dialog-content先于alert-dialog-content，父恢复时source的SECTION仍aria-hidden，最终误落无关控制。最终源码在DOM真实退出顺序控制绿色，原生normal/reduce矩阵也绿色；没有把早期失败或宽泛回焦当成功。

本人同时查看main/second最终截图及fixture几何断言。主Document viewport390/Dialog358；secondary viewport375、inner375、iframe375/Dialog343，DPR1/body zoom1，符合min(512,viewport−32)。二者截图与读数吻合，未用截图物理像素修改产品宽度。该局部几何检查不代表全视口/缩放验收；旧011截图无同步读数的历史原因不在此臆断。

本次未重新启动浏览器，仅独立核验固定原生证据、完整输入、实际测试代码、trace与截图；它不是本人或Lead最终66例E2E，也不是Obsidian浮窗。

### 实际命令与结果

| 检查 | 实际结果 |
|---|---|
| TMPDIR=/tmp/huhu-review-t02-live-owner-repair pnpm exec vitest run --project dom，Dialog/Sheet/DetailPane/modal-layer/modal-regressions/foundation/prompt七文件 | 退出0，60 passed；focused.log |
| 同TMPDIR，vitest --config本人临时配置，逐字复制028三文件原24项 | 退出0，24 passed；originals-final.log |
| 同配置再加入本人pending-cleanup两项 | 退出0，4文件26 passed；extended.log |
| pnpm exec tsc --noEmit --skipLibCheck -p本人tsconfig.prod.json --pretty false | 退出0；types-prod.log，限定生产checkpoint及global.d.ts |
| 同上，本人tsconfig.json继承真实测试config | 退出0；types-test.log，限定23路径及global.d.ts |
| pnpm exec eslint src/ui/react/modal-layer.tsx --max-warnings 0 | 退出0，零警告；lint-prod.log |
| git diff HEAD --check -- 23条生产/测试路径 | 退出0；diff-check.log |
| 公共validate-specdev --review-scope --mode working-tree --base37fcede… --file逐一23路径 | 退出0；scope.json |
| 前后实际SHA及native输入/ASAR摘要 | 全匹配；before.json、final-verification.json、native-input-check.json |

保留两次工具启动事实：临时Vitest配置首次退出126，因/tmp缺少vitest模块解析；只在本人/tmp创建node_modules链接指向既有仓库依赖后正常重跑，未修改依赖。首次将测试文件一并交给eslint退出126，原因是仓库明确忽略该测试文件产生warning；随后只检查生产文件并通过。测试本身由真实test tsc和Vitest验证，没有关闭lint规则或修改忽略配置。

## 问题与下一步

本增量无阻塞finding，冻结已释放。保留未来Radix升级时对内部退出事件的重新审查要求；不要将当前guard源摘要通过等同无限期兼容承诺。

剩余门继续由Lead按原计划执行：031 joined修复单独审查、冻结后fixture整合及原66例组合E2E、全库消费者迁移与完整lint/type/build和产物一致性、真实Obsidian主窗/浮窗与G-FINAL。本报告不批准这些尚未完成的门。
