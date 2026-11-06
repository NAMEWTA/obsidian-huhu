# 任务回报

Session: 20261105T094057Z
Task: 025-review-t02-modal-repair
Status: completed

## 聚焦交接

独立 reviewer：native:/root/review_toolchain，gpt-6.1-sol high。标准轴 **request-changes**，规范轴 **request-changes**。019原五项反例已修复；本次另验证3项P2焦点生命周期缺陷，分别为无可用目标的contents区域终止回退、inline dirty discard的子确认延迟回调覆盖opener、整个owner卸载后的延迟回调抢走其他root焦点。三项须分别修复，不能以等待更久或只断言首次正确焦点代替。

23路径冻结SHA前后相符。原范围41项DOM测试、局部生产/测试类型检查和lint通过；独立19项回归15通过/4失败，四失败对应三根因。无源码、配置、产物、Git或状态修改，未委派。**本 reviewer 明确释放本次23路径冻结，供Lead派发修复。** 本报告完成审查任务，不宣布T-02或Goal完成。

## 产物与验证

### 固定输入与方法

Review mode: working-tree；Strategy: independent；Risk: high；Independence: required；Mode: native。基线HEAD为37fcede4210a19bcc2a74809e7fdd301e5717957。本reviewer未参与022/024实现，按真实冻结消息开展复审。

精确输入由 /tmp/huhu-t02-detail-metrics/frozen/manifest.json 绑定，23文件，digest 49c0145b1adfae0c0a30566d3814ad1a989c3286ae97e9b42743106c7d1edfcc。开始和结束实际逐文件SHA256全匹配；相应git diff HEAD --check退出0。最终记录 /tmp/huhu-review-t02-modal-repair/final-input-check.json。相对019，重点审查Dialog/Sheet/AlertDialog的ref组合、compose-refs、modal-layer、DetailPane稳定host、gallery及新增回归；未改动部分沿用019已做源审查，未重跑无关分区。021 primitives和017 tree不合并为本人执行结果。

已读019原REPORT/反例、022及024 TASK/REPORT/快照、T-02、Map revision11补充leaf合同、批准DESIGN revision3 §4/7及AGENTS/dev/ui/code-review合同。验证源码和公开行为两轴；重点覆盖React19清理、来源消失/owner卸载、顶层F6、跨呈现编辑器身份及实际异步关闭。没有为了Fowler审查引入无关重构建议。

T02 fixture/**仍由011编写，不属于冻结23文件。Lead转交的deep-tenth结果仅用作下面具体实际浏览器反例和已记录几何事实，不能作为全套绿色验收。

### 019五项复核

| 原发现 | 本次结论与证据 |
|---|---|
| S-01 重复aria-label | 已修复；Button仅保留正确属性，生产与测试scoped tsc均退出0 |
| S-02 gallery height动画类型 | 已改fade；未恢复height兼容分支；scoped tsc退出0 |
| S-03 React19 callback ref cleanup | 三Content使用稳定组合ref；独立原三反例通过；本范围回归覆盖StrictMode每attachment一次cleanup、传统callback(null)、对象ref清空；未见另造资源管理器 |
| S-04 隐藏焦点候选 | 原hidden fallback/F6隐藏祖先反例通过；新增现有回归验证hidden/inert/aria-hidden/CSS/disabled ancestor、隐藏source和无可用控制区域。原错误选择已改正；下述三个关闭归属/回退漏洞仍阻止整体焦点合同通过 |
| V-01 resize丢草稿 | 已修复；原反例仅补必需leafWidth1100，仍断言真实aside→Sheet和unsaved值；新增回归验证双向切换、同一编辑器/本地状态/非受控值/selection/scroll/list节点、实际discard一次卸载 |

原019过程反例未改写。适配副本为 /tmp/huhu-review-t02-modal-repair/original-repro.dom.test.tsx；仅在原DetailPane调用补leafWidth1100并加入切换前complementary/无dialog、切换后dialog/无complementary断言，防止undefined使测试始终走Sheet。该副本9项全部通过。

### standards 输出

Reviewer: native:/root/review_toolchain
Result: request-changes

**S-01 · P2 · 空的display:contents preferredRegion使回退过早结束，焦点留在body。**

定位src/ui/react/modal-layer.tsx:200–209（结合focusRegion:175–185）。restoreFocus只在全局备用扫描中排除contents；preferredRegion只要available就被选中。该区域若无可用控制，focusRegion又拒绝聚焦contents，因此既不聚焦也不继续寻找存活所属区域。生产src/ui/styles/base.css:11明确将.huhu-portal-root设为display:contents。

独立集成反例：leaf1100/main999打开dirty DetailPane，点关闭进入确认，main变1100实际切为aside，再Esc取消确认。原Sheet关闭按钮已移除、preferredRegion为PortalRoot；确认退出后即使等待到1000ms以上，焦点仍在body，存活详情字段不获得焦点。配对纯helper反例使用同一真实Providers：restoreFocus(document,null,空contents PortalRoot)保持body；仅将preferredRegion换成存活主HUHU区域即正确聚焦其中按钮。这个同步对照排除动画/超时因素。

最小要求：候选区域没有可用目标且自身不可聚焦时继续**所属存活区域**的合理回退；不要把“找到available容器”当作“已成功恢复焦点”，也不要借修复扩大到其他owner。保留Radix的Tab/trap职责。

**S-02 · P2 · inline DetailPane实际discard后，子确认的延迟closeAutoFocus覆盖已正确恢复的opener。**

定位src/ui/react/dirty-modal.tsx:43–56、src/ui/react/modal-layer.tsx:232–239，关联src/ui/components/huhu/DetailPane.tsx:105–117。inline使用modal=false；ModalLayer将父context透传，独立inline详情的确认因此没有模态parent id。discard同时关闭确认及详情，详情先恢复真实opener；确认随后执行Radix FocusScope卸载事件，源X已消失，现有仅parent-id检查不能识别其owner已关闭，便回退到HUHU首个控件。

独立反例在页面先放Unrelated first control，再放Distinct opener。leaf1100/main1100打开真实aside，关闭并放弃；直接监听实际alertdialog的focusScope.autoFocusOnUnmount，等事件及排队microtask完成后，最终焦点为Unrelated first control。相同leaf580真实Sheet控制通过。原正向关闭测试opener恰为首控件，单纯waitFor首次opener会掩盖此错误；本反例不依赖任意sleep。

实际浏览器也存在同一失败：/tmp/huhu-t02-implementation/deep-tenth/result.json，status=failed，inputDigest b536c571fa368615d33bd3f4fa19e26b20ebce9054089a571fea9153f379d284，errors为Timed out: detail actual close focus。detailCloseFailure显示最终active为data-review=hit-probe“创建”，opener仍为data-review=detail-trigger“详情”，trace先md按钮后icon-sm按钮；Lead确认该opener仍连接且可见。本人独立DOM反例得到同一最终目标错误，而非仅采信writer假说。该浏览器bundle所列15个与23路径重叠输入的SHA全部匹配当前冻结值，检查记录在 /tmp/huhu-review-t02-modal-repair/browser-scoped-check.json。

最小要求：父owner已经真正关闭时，dirty子确认不得再执行覆盖父级恢复的默认关闭回调；父仍打开的继续编辑/Esc取消必须照常返回父内容。可在dirty确认边界阻止过期restore，但需验证嵌套modal、inline以及实际延迟卸载，不应笼统禁用确认的全部回焦。

**S-03 · P2 · 整个owner已卸载时，root modal的延迟关闭回调会抢走另一个存活HUHU root的焦点。**

定位src/ui/react/modal-layer.tsx:232–239及200–209。root entry.parent为null，owner是否仍存活没有保护；source和preferredRegion已断开后仍在整个Document扫描.huhu-ui并聚焦首项。关闭一个Obsidian leaf/root后，稍后到达的回调因此能改变另一个leaf中已有效聚焦的控制。

独立生产关闭事件反例：两个真实TestProviders同Document；第一个通过真实DialogTrigger打开Dialog并删除trigger，随后整体卸载第一个root。在其真实FocusScope卸载事件发出前，第二个root的Already focused按钮已被focus且即时断言正确；等待真实关闭事件和microtask后，焦点被改为第二root的Other first。测试应用生产PortalRoot display:contents规则，不以happy-dom把PortalRoot当普通方盒的差异造假。配对控制只关闭Dialog、保留第一个HUHU区域：同样trigger已消失，最终正确落到Own visible fallback；故修复不能一律禁止“source被移除”的正常局部回退。

最小要求：使已销毁owner的延迟回调失效，尊重其他存活owner已建立的有效焦点；保持原owner存活但source移除时的合理回退。不要把修复范围变成新的全局焦点调度器。

### specification 输出

Reviewer: native:/root/review_toolchain
Result: request-changes

S-01/S-02/S-03均违反DESIGN §7的合理关闭回焦和所属Document/存活区域边界，同一缺陷不另计数。DetailPane草稿保留与leaf/main展示合同本身通过本次源码和局部验证：必需leafWidth:number独立于ResizeObserver观测main；inline仅leaf>=960且main>=1000；leaf620/main568为360/max440的Sheet，leaf580为fullwidth。没有隐藏alias或缺失新允许调用参数。真实browser details记录620/568→360、580/528→580，以及宽叶回迁，same/draft/selection/focus/scroll/mounts通过；仅引用这些具体记录，不把failed deep-tenth标成整体通过。

稳定host使用同一createPortal目标及key，物理重挂host不会重挂编辑器。独立inline ownerDocument真实DOM adoption保持同一input/unsaved及mount一次；这证明该局部路径，不证明跨realm的生产Radix trap。独立F6从稳定host编辑器出发仍被顶层Sheet消费、阻止冒泡且移动到同层下一项，未复现“逻辑Portal绕过F6”的猜想，不列发现。

其余沿用且本次原9反例确认的合同：canClose三入口veto不dispose、owner移除释放一次；实际Command IME Enter不执行、组合结束普通Enter执行；StrictMode嵌套Document栈独立、toast层恢复；普通dirty Esc/取消/outside、确认失败保留/重试等在41项中通过。源码未添加第二套Tab trap或global native keydown监听。

### 实际检查

过程材料仅 /tmp/huhu-review-t02-modal-repair；唯一仓库写入为本REPORT，旧报告保持原样。

| 检查 | 实际结果 |
|---|---|
| 23文件SHA前后及git diff HEAD --check | 退出0，全部匹配，无冻结漂移 |
| pnpm exec vitest run --project dom，选择Dialog/Sheet/DetailPane/modal-layer/foundation/prompt/modal-regressions七文件 | 退出0；7文件41 tests通过 |
| pnpm exec tsc --noEmit --skipLibCheck -p /tmp/huhu-review-t02-modal-repair/tsconfig.json --pretty false | 退出0；真实test config限定23路径及global.d.ts，无类型抑制 |
| 同上，tsconfig.prod.json | 退出0；真实production config限定生产路径及global.d.ts |
| pnpm exec eslint <manifest全部生产路径> --max-warnings 0 | 退出0，零警告 |
| TMPDIR=/tmp/huhu-review-t02-modal-repair pnpm exec vitest run --config /tmp/huhu-review-t02-modal-repair/vitest.config.mts | 宿主退出126；2文件19 tests，15 passed/4 failed；原9全部通过；两项contents反例、inline settled discard及owner卸载失败 |
| deep-tenth浏览器结果与冻结源交叉核验 | 15个重叠源hash一致；这是failed结果中的具体反例，非最终matrix通过 |
| validate-dispatch stage=dispatch | 退出0，errors=[]/warnings=[] |

新增独立用例在 /tmp/huhu-review-t02-modal-repair/stable-host.dom.test.tsx，结果日志 /tmp/huhu-review-t02-modal-repair/review-final-test.log。配置复用仓库真实DOM项目/setup/React19/Radix/cmdk，只改测试选择；未mock被审组件或关闭/focus helper。尺寸控制仅限现有ResizeObserver/clientWidth测试接缝；延迟关闭用真实生产FocusScope事件完成信号。

## 问题与下一步

三项P2及配对控制已发Lead，冻结已释放。最小修复应分别处理空preferred区域回退、父关闭后的确认回焦、owner销毁后的过期回调；重新冻结后独立复审，需等待真实closeAutoFocus结束才断言最终目标。保留当前原41项和原9项绿色，增加上述反例，不能通过删回焦/改期望/隐藏失败完成修复。

最终组合fixture、打包生产adapter浏览器、两Document实际trap/inert/嵌套Portal、实际CSS几何与视觉、Obsidian主窗/浮窗、全库lint/type/build及产物一致性仍由Lead集成后验收。本次没有扩大为全库构建，也未把其他仍写入分区的问题归给这23文件；除上述具体browser记录外不声明最终真实浏览器验收通过。
