# 任务回报

Session: 20261105T094057Z
Task: 014-review-t02-tree-panels
Status: completed

## 聚焦交接

独立 reviewer：native:/root/review_toolchain，未参与 013/Lead 配置实现，未修改源码、依赖、产物或状态，未委派。标准轴 request-changes，规范轴 request-changes；发现 3 项 P2 与 1 项 P3，均已即时通知 Lead。原 16 项 DOM 测试、局部 lint/type 通过，但独立四项压力回归得到 3 failed/1 passed，暴露搜索状态泄漏与行操作键盘拦截。**本 reviewer 释放这五文件及配置的冻结，供 Lead 派发修复**；这是 T-02 子分区审查，不是整票完成验收。

## 产物与验证

### 固定输入与范围

Review mode: working-tree；基线 HEAD：37fcede4210a19bcc2a74809e7fdd301e5717957。Strategy: independent；Risk: high；Independence: required；Mode: native。实现者为 native:/root/implement_t02_tree_panels 与负责配置的 Lead；本 reviewer 未参与实现。

源快照：/tmp/huhu-013-implement-t02-tree-panels/hashes.json 及 snapshot。开始、结束均核对五个实际 SHA256，全部匹配：

| 路径 | SHA256 |
|---|---|
| src/ui/components/tree.tsx | f49eb23996897d4e6f507bc5e256b9644aec2032789cd94ed5601b1b4df663b1 |
| src/ui/components/tree.dom.test.tsx | b8b78476dcdf9c473612d42606171abf8ee99e3fdc1fb51a9663ed8cbc9d0cfc |
| src/ui/components/resizable.tsx | fb07af55b6c07ea42b5c28ac2a6c94a3cfd6da9c7ae19fe1a828e53ac6002d8f |
| src/ui/components/resizable.dom.test.tsx | 03f112fd8fc5d6b77195604b0bd9531b8b0cbe88918b22f4b9b551a905981c5d |
| src/ui/react/use-density.ts | 8254409bc39dc0319725ef76bb31031b16b9a6be9f15aa9a4244199790533a5e |

另冻结 vitest.config.ts 的实际 SHA256 e9572bac00e1ed13e6470825bb2216ec3933b665c502ac6a79290acbc1a0e05b，前后相同。其相对 HEAD 唯一 diff 是删除不存在的 panels v3 browser.development 别名及相应注释，DOM 测试因此使用真实安装包 v4.18.1 正式入口；未用替身替代库。

实际阅读五文件及 config diff、013 TASK/REPORT、T-02、scope ledger、DESIGN revision3 §3–7、spec AC-011/012、调用方及已安装 Headless Tree/TanStack/panels API/事件实现；沿用已读不变的 AGENTS、dev/ui、code-review/risk/working-tree/review-evidence 等合同。标准来源包括许可、架构、测试及实际 lint/type 配置。其他 T-02 写集仍活跃，只读必要上下文；没有全库构建/测试，也未将其瞬时错误归到本分区。

### standards 输出

Reviewer: native:/root/review_toolchain
Result: request-changes

**S-01 · P2 · 行操作捕获阶段阻断子控件自己的键盘。** 定位 src/ui/components/tree.tsx:376–377。actions 容器的 onKeyDownCapture 对所有按键无条件 stopPropagation，事件在到达实际按钮/输入/Radix Trigger 前就被截断。独立回归：F2 进入带 onKeyDown 的 button 后输入 x，回调零次；真实 radix-ui/dropdown-menu Trigger 在 F2 后已获焦点，ArrowDown 仍 closed、没有 menu。原测试只有普通按钮的原生 Enter/click，所以未覆盖复合控件自身事件。

风险：行内菜单、输入等虽然可被聚焦，不能执行正常键盘交互。最小修复需让目标控件先正常处理，再仅隔离树级导航；不能禁止所有目标事件。Headless Tree 在 DOM tree 节点注册 native keydown，单纯把 React capture 改成 React bubble 不足以证明隔离正确，需核对真实事件顺序。增加真实 Radix ArrowDown/Enter、普通子控件 onKeyDown、F2/左右/Escape、树外 Tab 和正常树导航回归，避免捕获层再次吞键。

**S-02 · P3 · 改写 resizable 来源头时删除既有版权及具体来源信息。** 定位 src/ui/components/resizable.tsx:1。HEAD 文件保留 Copyright (c) 2023 shadcn 和原 recipe 路径；新注释只有项目/MIT/文档 URL，没有这些字段或固定 revision。dev licensing 对改编源码要求保留版权、来源路径和固定上游依据；这不是认定依赖许可不兼容或发行通知缺失。最小修复是保留原版权/路径，并据实际采用的 v4 recipe 标明可回读 revision/来源；不要编造上游 commit。现有 NOTICE/全分发许可仍由 Lead 按实际产物核验。

其余标准观察：use-density 稳定绑定实际 element，局部观察祖先 direct childList/data-density，无 Document subtree 扇出；ownerDocument 改变时释放旧 media/observer 并绑定新窗口，卸载清理最新 binding。真实 live nodes 改名/新增独立测试通过，sync loader 按当前 model 取值。panels 包装直接采用 Group/Panel/Separator、groupRef、orientation 和 id-keyed layout；没有 v3 兼容别名。未发现需额外重构的 Fowler 命中。

### specification 输出

Reviewer: native:/root/review_toolchain
Result: request-changes

S-01 同时影响 AC-012 与 DESIGN §7 的键盘可达性；不重复计数。另有两项规范发现：

**V-01 · P2 · 搜索期间操作展开会把强制祖先写入手动状态。** 定位 src/ui/components/tree.tsx:143–153、175。effective expanded 合并 manualExpanded 与 matchedAncestors，但 Headless Tree 的更新基于 effective expanded，changeExpanded 又将整份 next 写回 manual 或 onExpandedChange。独立反例：初始 Docs/Sub 都折叠，search=zeta 自动展开；点 Sub chevron，再清空搜索，Docs 仍 aria-expanded=true，原手动状态未恢复。该问题不只是搜索过程中不允许收起祖先，而是自动状态持久污染清空后的正常树。

依据 DESIGN §5 Tree/UX-ARCH-1“清空搜索后恢复手动展开状态”。最小修复：区分搜索强制项与真实手动状态；基于用户实际展开/收起增量更新 manual，不能把整个合并结果保存。保留搜索前已经手动展开的祖先，不能简单过滤所有 matchedAncestors。受控和非受控路径都要回归，至少包括搜索期间点箭头后清空，以及实际手动展开仍保留。

**V-02 · P2 · 粗指针展开专用点击区仍只有 32px 宽。** 定位 src/ui/components/tree.tsx:338–347。chevron span 固定 w-8（32px），coarse 时仅 rowHeight 变为44，专用展开区域因而是32×44。右侧区域点击会选择行，不能用整行宽度充当展开目标的44px；DESIGN §3.6/§5及 ui 命中要求触控至少44。最小修复：展开命中宽度也随 coarse/--hu-hit 达到44，保持名称与展开分离。当前测试只量行高/虚拟总高，没有测箭头独立区域；Lead 最终生成 CSS 后用真实 browser geometry/坐标点击回归，避免只断言类名。

其余规范观察：叶子不输出 expanded、树一个常规 Tab 入口、名称只选择/箭头展开、方向键/Home/End/typeahead、高亮和无交互搜索清空均有实际用例；密度32/36、coarse44与virtual total/measure同步。panels 的横/纵键盘、Home约束、百分比字符串、数值像素与groupRef用真实库验证，提供的相邻面板几何足以触发实际库键盘逻辑；未将这些 happy-dom 几何替身称为真实拖拽/触屏验收。

### 实际检查

环境：Linux/Node26.11.1/pnpm11.1.3，真实 Headless Tree1.8.0/TanStack Virtual3.14.26/panels4.18.1。过程文件只在 /tmp/huhu-review-t02-tree-panels，唯一仓库写入为本报告。

| 检查 | 结果 |
|---|---|
| 五源文件及config SHA256（前后）、对应 git diff HEAD --check | 退出0，无漂移 |
| pnpm exec vitest run --project dom src/ui/components/tree.dom.test.tsx src/ui/components/resizable.dom.test.tsx | 退出0，2文件/16 tests |
| pnpm exec eslint src/ui/components/tree.tsx src/ui/components/resizable.tsx src/ui/react/use-density.ts --max-warnings 0 | 退出0，无警告 |
| pnpm exec tsc -skipLibCheck -p /tmp/huhu-review-t02-tree-panels/tsconfig.json --pretty false | 退出0；extends真实test config，仅五文件/global.d.ts与必要导入，无ignoreDeprecations、无类型抑制 |
| pnpm exec vitest run --config /tmp/huhu-review-t02-tree-panels/vitest.config.ts | 宿主返回126；4 tests，3 failed/1 passed。搜索清空、子控件keydown和真实Radix Trigger失败；live nodes改名/新增通过 |
| validate-dispatch，stage=dispatch | 退出0，errors=[]/warnings=[] |

独立反例及其配置为 /tmp/huhu-review-t02-tree-panels/repro.dom.test.tsx、vitest.config.ts，复用真实dom项目/setup/依赖，仅改变测试选择，不mock Tree/Headless Tree/Radix/panels。该临时配置有Vite关于未来native configLoader的格式提示，不影响上述实际断言失败；未将提示归到候选代码。触控箭头尺寸发现来自冻结源码确定的区域几何，没有冒称本 reviewer 已跑最终生成CSS浏览器。

## 问题与下一步

三项P2与来源头P3已即时交Lead；原writer可按授权修复本分区，再冻结并独立复审。不要只增加原16项绿色数量；复审需跑本报告可证伪反例及真正触控点击区检查。源码/配置此后漂移会使本报告仅对原候选有效。

未验证：完整T-02组合DOM/视觉/E2E、生成CSS/main.js、真实浏览器拖拽与触控、Obsidian popout、全库lint/type/build。SidePanel folderClick、agent直接v3及navigator/versioning等指定后续票的迁移债务如013报告保留；不要求本分区加兼容层，不把其他并行文件错误算作本分区问题。全票及最终组合验收仍由Lead负责。
