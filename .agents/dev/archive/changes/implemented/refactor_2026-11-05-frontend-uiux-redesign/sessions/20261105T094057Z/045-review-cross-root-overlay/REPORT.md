# 任务回报

Session: 20261105T094057Z
Task: 045-review-cross-root-overlay
Status: completed

## 聚焦交接

独立reviewer：native:/root/review_toolchain，既有gpt-6.1-sol high；未参与043候选实现，未委派。standards **pass**；specification **pass**，仅指本次私有7源码候选及可静态/DOM验证的owner/layer合同。未发现阻塞源码缺陷，已及时通知Lead可集成；本人未实际应用patch。原始Shell反例按私有before字节独立复现31<40，候选48项及本人两个补充控制共50项通过，真实TS host及ESLint诊断0。

**真实浏览器门仍未通过，不以源码pass替代。** 043 native baseline与candidate均Timeout Menu，无法提供native红绿；Root实际T04 fixture必须补可信source/menu hit、两级Esc、精确source回焦及两Document等实际证据。本文不宣布T04/Goal完成、提交/推送/发版，也没有写共享源/配置/资产/Git/状态。

## 产物与验证

### 固定输入与后续集成观察

Review mode: source-files/private patch；Risk: high；Independence: required；Strategy: independent；Mode: native。observed HEAD37fcede4210a19bcc2a74809e7fdd301e5717957。已读043/045 TASK、043最终REPORT、真实Shell反例、私有before/candidate/frozen清单、完整补丁/测试/TS host、当前modal/Popover等上下文及既有AGENTS/dev/ui/SpecDev独立双轴和DESIGN3层级/生命周期合同。044日期、Root main/metrics及其他图外写入不纳入本次审查。

候选为 /tmp/huhu-cross-root-overlay-proposal/reviewable.patch，SHA **27fed5c23f294d72ed13acd222b8cbd4a09955f4ed670689dc81adfa6582acbc**，7源加建议测试；frozen-manifest.json SHA **d629deae01c4a6ac86ddad6e8195830a1364aa2e4ceb8a71e940d8b00caffa0d**。开始逐项确认当前7源等于before-sha256.json、私有candidate等于candidate-sha256.json，git apply --check通过但未应用。私有before/candidate、补丁/清单/控制及配置副本保存 /tmp/huhu-review-cross-root-overlay。

候选7源：

| 路径 | SHA256 |
|---|---|
| src/ui/react/modal-layer.tsx | 575ce1d21bfbd618e7669a962a77d10eb03b4fd94f5b37fc767f55301fc11185 |
| src/ui/components/dropdown-menu.tsx | 2d335bf64fc985df0b1e8be4f0cd36c29bc106380371b3755687dfe726e8ee5f |
| src/ui/components/popover.tsx | a8d711b6b5f2f0891a0888927005623aca42ed896be0e6cd4c178802c553b0ee |
| src/ui/components/tooltip.tsx | fa75bda20756bbd790c5f2a6ecc9ab864804fb4f8ef8b61510c3bdeff9352bb1 |
| src/ui/components/context-menu.tsx | adb93dc0ff26b5605f09f1ce23a5efdb79211e18359b97f66aed415fd090e1a4 |
| src/ui/components/hover-card.tsx | 9fb21ec17650e6bbdf6e1e0c501434c63468f66563a6f8c723986a59c798ec37 |
| src/ui/components/select.tsx | 5d8e90b5dec37d8dc3cc0b03f2ae96c148c4f1231856043a7f99bbca7d6432fc |

private candidate/patch结束未变。源码许可消息发Lead后，最终观察共享7源已全等于上述候选，已及时告知Lead；这是后续集成状态，**不声称baseline整程未变**。before固定副本仍可重复原始red，未依赖已集成共享源冒充baseline。记录before-verification.json及final-verification.json；Root其他写集不要求冻结。本文只释放本次私有候选审查，不授予任何额外共享改动范围。

### standards 输出

Reviewer: native:/root/review_toolchain
Result: pass

无actionable源码finding。候选复用同Document既有modal stack，以不可见template实际DOM锚点找到确实包含它、同Document且存活的modal content，再按该entry的stack index推导层级。没有将同Document所有popup提升到全局最高modal之上，也没有Shell私有z覆盖、DOM observer、全局监听或第二focus/trap引擎。

FloatingContext与Modal Context分开后，保留同owner已有floating ancestry，更深的新Modal Context可重置到其真实entry。六个Radix Root包装都保持原控制端口、children/Portal和Radix生命周期；ContextMenu的原modal=false不变。setContent只在真实身份变化时修改contents并通知现有store；相同node不重复notify。callback ref、订阅和既有modal effect仍对称清理，未改F6、Tab/trap、restore判据或pending-restore清理协议。

本人独立重跑原实际Shell测试及六入口/配对控制：physical Sheet40→popup41；普通ownerless popup31不越过无关Sheet40；低owner popup41仍低于后来无关Sheet50；同根Sheet40/Popover41/Tooltip42；hidden/detached owner经显式重新打开不获physical晋升；两个Document独立；真正owner React root卸载后portal清理。原始Shell测试还确认首Esc只关菜单、Sheet保留。它的DOM几何替身不是可信命中证明，未作native结论。

本人补充两个真实组件控制通过：

- 独立保留React根中的Popover+Tooltip在跨根Sheet中仍41/42；StrictMode和三次重渲染不替换已有content节点，未出现跨render更新/最大深度警告。
- 将包含独立根的物理Sheet content通过标准append跨Document自动adopt，而consumer仍明确使用旧Document；旧Document的popup回31，不能借异Documentcontent获owner。物理移回并重新打开后恢复41。此为sameDocument拒绝/恢复控制，不冒称整个ContainerProviders迁移的native验证。

既有modal-layer与modal-regressions36项原样通过，涵盖StrictMode栈、React19 ref清理、dirty、取消/真正父关闭回焦、owner销毁、来源移除与条件式Dialog卸载等原风险。Fowler启发式未发现需扩张为无关重构的具体问题。

### specification 输出

Reviewer: native:/root/review_toolchain
Result: pass

候选源层面满足本任务定义的所属owner层级合同，保留DESIGN3内外层、同Document与生命周期边界；不把无关最高modal当owner。原独立导航根在NavSheet中的31<40问题已通过真实Shell DOM反例闭环。retain ancestry、无关31、较低owner41<上层50和六入口均有实际控制，未只测某个Dropdown的class字符串。

适用边界必须保留：层级在Root/锚点渲染、既有stack和content注册通知时重新计算，没有承诺监测不触发任何render/store变化的任意第三方静默DOM搬移/隐藏。只有Trigger单独被Portal而Root锚点留在外部的结构也不属于已证案例。实际Shell把整个保留导航根移入Sheet的结构已覆盖；若后续真实调用需要额外生命周期，须在该真实边界定位，不能据此默认加全局观察器/关闭引擎。

这里的specification pass只覆盖私有候选源码合同，不认证实际T04页面或必需浏览器门。043 native-red/result.json与native-green/result.json均status=failed、Error: Timeout Menu（runtime errors=[]并不等于交互通过），本人读取确认。未将旧source-bound结果当当前全部输入证明，也没有修理该私有fixture来制造绿灯。

### 实际检查

新输出仅 /tmp/huhu-review-cross-root-overlay；唯一仓库写入为本REPORT。

| 检查 | 实际结果 |
|---|---|
| 开始before7/候选7/patch/manifest SHA与git apply --check | 退出0；精确匹配、可应用；未应用补丁 |
| TMPDIR=/tmp/huhu-review-cross-root-overlay pnpm exec vitest run --config 同目录vitest.config.mjs（初次原候选集） | 退出0；4文件48 tests；candidate.log |
| 同命令加入本人extra-controls | 最终退出0；5文件50 tests；final-tests.log |
| OVERLAY_BASELINE=1，同配置，仅src/shell/cross-root-overlay.dom.test.tsx | 宿主退出126；1失败，准确expected31>40失败；baseline-shell.log；配置读取私有before，故不受Lead后续集成影响 |
| node 同目录check-private.mjs | 退出0；真实TypeScript compilerHost原模块ID读取7候选，diagnostics0；按原生产路径lintText errors/warnings0；static.log/types.log/lint.log |
| 结束私有候选/补丁/manifest及共享源现状核验 | 私有无漂移；共享7源已逐项等于候选，显式记录后续集成，未再运行会因已集成而无意义的apply检查 |
| validate-dispatch stage=dispatch | 退出0；errors=[]/warnings=[] |

Vite只读load替换7源保留原始模块ID及真实React/Radix/依赖；TS host也以原模块路径读私有文本。未建立worktree、安装包、mock生产组件或改共享测试。建议测试的语义与私有controls一致，已审读完整test.patch；新最终输出使用这些实际controls及原Shell/原modal测试，没有改断言来凑数。

补充adoption控制首次使用happy-dom的显式adoptNode往返，因其实现把ownerDocument定义为不可重定义属性而在返程报错，继而造成测试清理错误；该私有harness失败保留initial-extra-harness.log。仅将私有操作改为标准跨Document append自动adoption后，ownerDocument真实改变、同点负/正控制和清理均通过。该失败不列为生产缺陷，也不冒称其初次通过。未新增浏览器采集；两次已失败native门继续显式保留。

## 问题与下一步

源码审查允许集成的结论已提前通知Lead，最终无阻塞源码finding；候选审查完成并释放。本reviewer没有应用补丁，Lead可据精确候选继续实际T04 fixture集成。

必需待验证：生产NavSheet内可信source打开→menu item真实elementFromPoint与可信点击、menu41>Sheet40、首Esc仅关menu并精确返回source、次Esc关Sheet；至少两个Document；保留ownerless31和低owner41<无关上层50。043双timeout不能跳过该门，也不能以50项DOM/源码pass替代。真实Obsidian主窗/popout、完整T04/Lead矩阵及Goal状态按原计划处理，本文不声明完成。
