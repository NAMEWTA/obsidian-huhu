# 任务回报

Session: 20261105T094057Z
Task: 021-review-t02-primitives-repair
Status: completed

## 聚焦交接

独立 reviewer：native:/root/review_host_types；未参与 020 或 012 源码修复，未委派。针对 016 四项 findings 的 high delta 双轴结论均为 **pass（仅 020 四文件修复与覆盖转移范围）**，未发现新的可操作缺陷。29 项 DOM、delta lint、原浏览器反例及真实 CSS 几何均通过；类型检查初次确实被外部 dialog 重复属性阻断，在 022 writer 修复后，同一原语哈希上的生产/测试精确类型检查已独立重跑通过，原失败日志保留。012/016/020 历史保持不可变，本报告释放当前冻结输入给 Lead，不能据此声明完整 T-02 或整体集成 done。

Strategy: independent；Risk: high；Independence: required；Mode: native。实现者为 020-repair-t02-primitives writer（原 012 writer）；reviewer 没有实现、修复或解决本候选冲突。Lead 应依据真实派遣/返回回执核验独立性，本报告不代替父级核验。

## 产物与验证

### 固定输入、来源与范围

基线与 observed HEAD：`37fcede4210a19bcc2a74809e7fdd301e5717957`。020 完整原语快照位于 /tmp/huhu-t02-primitives-repair/frozen；frozen-sha256.json 的 56 个存在文件在审查开始和最终交回前均匹配当前字节，drift=[]。必要上下文 Lead 字典仍为 `352563445a45aef89b5732e511a2067b6c19a544ed96374679b4b9316754ef03`，与 016 相同；共 57 个输入核验无漂移。当前 020 相对原 012/016 冻结候选只改变四路径：

| 文件 | SHA256 |
|---|---|
| src/ui/components/button.dom.test.tsx | e0a3cef5899f9497682912e686fd88fbe227b55bc222b98158764cea4559d820 |
| src/ui/components/button.tsx | 082f2886c667ed32165b83529370a52776a37600b061c0a7f86256b441241dfd |
| src/ui/components/table.tsx | fe76d08cbb15465bcaa8b0d3338287c11361083e7fbbcc1acb022db9f28dd046 |
| src/ui/components/huhu/FormField.dom.test.tsx | 5c1dd4ded29514c8121869c884f4e2fcd4cb7003afb71a304c28e42af9a1c264 |

前后完整哈希清单为 /tmp/huhu-review-t02-primitives-repair/input-sha256.json。明确的 delta 比较为 /tmp/huhu-012-implement-t02-primitives/frozen 的四文件字节对 020 当前冻结字节；原 020 repair.diff 的 SHA256 为 `cf521c490f45bbcbd81ab3bac26feacdbf8d37d3638421f47cb8e82d3bae2c4d`。另以只读 working-tree scope 工具按四个 `--file` 固定当前交付；其 HEAD diff 包含四文件从共同 Git 基线以来的改动，并不冒称仅是 020 delta。完整 scope 为 /tmp/huhu-review-t02-primitives-repair/scope.json：tracked diff SHA256 `f5edae0ae8c60a2512be840fc2e665872b52bf1621ded319eace7eee01b7eae8`，input SHA256 `662103b3e4ce04ad5d0d716d563b86aaaf8b8f9d57798b5d8052110484087a24`，index SHA256 `97e75c6acc512339db7d69b84c17bc9a21b20b21dcd93912ae51b4010ca24495`。

重用 016 已验证且未改变的 AGENTS/dev/ui、批准 DESIGN revision 3（digest `49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66`）、UI-002、Spec AC-011–013、T-02/Map 原子集成和 code-review/Fowler/risk/test-reliability 规则；本轮回读 021 TASK、020 TASK/REPORT、四文件实际 delta、016 findings 与原反例。标准/规范发现与未变化 52 个原语文件的审查结论沿用 016；没有把活跃 modal/tree/fixture 源码纳入本次接收范围，没有新外部借鉴或依赖。

本轮只写本 REPORT 和 /tmp/huhu-review-t02-primitives-repair；未编辑任何源/测试、词典、依赖、Git/index、共享资产或正式状态/Evidence。外部 dialog 的修复来自 022 writer，不由本 reviewer 实施或全面审查。

### 实际执行与结果

环境：Linux、Node v26.11.1、pnpm 11.1.3、Google Chrome 153.0.8010.47。全部输出保留在本 review /tmp，不入库过程日志。

| 命令或检查 | 退出码与真实观察 |
|---|---|
| 020 完整 56 文件 + 未改字典前后哈希 | 0；57 checked，drift=[] |
| `pnpm exec vitest run --project dom src/ui/components/button.dom.test.tsx src/ui/components/huhu/FormField.dom.test.tsx src/ui/components/huhu/Notice.dom.test.tsx src/ui/components/huhu/TaskContent.dom.test.tsx src/ui/components/huhu/PathPicker.dom.test.tsx` | 0；5 files / 29 tests passed，dom.log |
| `pnpm exec eslint src/ui/components/button.tsx src/ui/components/table.tsx --max-warnings 0` | 0；两 delta 生产文件无错误/警告，eslint.log；测试按原仓库策略忽略，未冒称已 lint |
| `git diff --check HEAD -- <四文件>` | 0；diff-check.log |
| 初次 `pnpm exec tsc --noEmit --skipLibCheck -p /tmp/huhu-t02-primitives-repair/scoped-test-types.json` | 126；唯一 dialog.tsx(88,5) TS17001，types.log 原样保留，初次没有通过 |
| 外部修复后 `pnpm exec tsc --noEmit --skipLibCheck -p /tmp/huhu-t02-primitives-repair/scoped-types.json` | 0；types-after-modal.log 为空 |
| 外部修复后 `pnpm exec tsc --noEmit --skipLibCheck -p /tmp/huhu-t02-primitives-repair/scoped-test-types.json` | 0；test-types-after-modal.log 为空 |
| `node /tmp/huhu-review-t02-primitives-repair/browser.mjs` | 0；实际旧反例、两 Document、DOM 状态、原生 form/focus、几何和减少动效断言均满足，browser-result.json，errors=[] |

两个 tsc 配置 extends 原仓库生产/测试 tsconfig，files 为原语精确范围，保留真实传递依赖。初次阻断后收到 Lead 的 022 修复消息才重跑；新 dialog SHA256 观察值为 `daffb18084621853de7c4b2c93f8776ed15663c7813b90c762a0111ec9eda064`。这仅记录类型检查依赖的新输入及通过事实，不是对 022 整体审查背书。

独立浏览器延续 016 的最小实际组件探针，所有新文件在本 review /tmp，直接导入冻结 Button/Table/SegmentedControl，使用真实 React、Radix 和生产 createRadixOwnerDocument/guardedAdapter；先以 metafile 发现最小图入口计数，实际执行包由原摘要/精确计数守卫完成适配，没有测试专用方向键引擎或 node_modules 修改。其 CSS 是 Lead 重建的 1,275,468 字节 styles.css 固定副本，SHA256 `4461839f6f7092b499d41aa57d6ec6e8491f23585f30c8be85b790d8880837d2`；源码/依赖摘要在 browser-inputs.json。没有构建插件或覆盖共享资产。

### 原反例逐项复核

| 原 finding | 独立本轮观察 | 判定 |
|---|---|---|
| STD-01 asChild 丢失 type | 两 Document 的 literal 与 forwarding custom Cancel，wrapper type=button 均不提交（cancelSubmits=0）；wrapper submit 与明确 child submit 合计提交 2 次。Slot 保持子节点明确 type 的优先级。 | 已修复 |
| STD-02 custom native disabled | 自定义组件 disabled=false 不能覆盖父级 disabled/busy；实际 native disabled=true，ref 到实际按钮；focus() 保持 Before，真实 CDP Tab 跳到 After；disabled/busy/anchor 的父子动作计数全为 0。 | 已修复 |
| SPEC-01 表头尺寸 | 当前生成 CSS 下 compact header=36/body=44，comfortable header=36/body=52；没有调用方覆盖。只给 tbody/tfoot 使用列表密度，header h-9 不再被更大的通用 TR 撑开。 | 已修复 |
| SPEC-02 slotted busy 图标 | direct 与 slotted 都有 aria-hidden spinner；baseline/direct/slotted 宽度均为 110.84375px，spinner 中心相对按钮中心 dx=0、dy=0。正常为 spin，系统 reduce 与 data-motion=reduce 时所有三个 busy spinner 的 computed animationName 都为 none。 | 已修复 |

解除 slotted busy 后同一实际元素/有效 ref 保持，spinner 移除，原父/子回调各恢复一次；可访问文字 Save changes 保留，单子元素 Slot 协议不被 Fragment 替代。旋转时 SVG 的 bounding rect 随角度变化，中心几何与布局宽度才是本次断言目标，没有用旋转包围盒误判图标尺寸。

## standards

Reviewer: native:/root/review_host_types
Result: pass（仅 020 delta）
Findings: []

公共 type、原生 disabled 与 forwarding/ref/事件契约的原失败已由真实 form/focus 路径转绿；新增 DOM 测试覆盖 wrapper/child type、disabled/busy 两分支、Tab 跳过、ref、忙碌解除事件恢复及 spinner。生产实现复用 busyContent 与现有 Slot，不新增兼容变体、控件引擎、领域逻辑或生命周期资源；delta 没有新的 Fowler 可证实风险。曾失败的必需类型门已在外部修复后实际重验通过，未通过忽略传递源或更改 tsc 配置制造通过。未变化部分的标准结论沿用 016；本轮不是重新审查所有共享组件或模块调用方。

## specification

Reviewer: native:/root/review_host_types
Result: pass（仅四项修复及本次覆盖转移）
Findings: []

DESIGN §5 的 header36、body 密度和忙碌反馈由实际生成 CSS 证明，§3.6 的减少动效与宽度保持也有真实计算样式/几何证据。Table 保留原 sticky/sunken/字体语义；Button busy 对 direct/slot 等同处理且不改变名称、ref 和 native 行为。没有修改任何批准设计或放宽规范来消除旧 finding。

覆盖转移检查：FormField.dom.test.tsx 唯一删除的行为用例是 raw-unadapted iframe duplicate；主 Document ArrowRight/disabled skip、单次点击、空串和数字/字符串值区分保留，原七项 Button 与五项 PathPicker 风险继续保留。020 保存的 transferred-raw-iframe-test.txt 与 raw-iframe-original-failure.log 和 016 失败事实一致；没有 skip/弱化断言/生产 segmented 修改。SettingsFormControls 的 `2b5456c0bee2564687ec419bb6ba28c1d9ab670db5d45352276e6e68ac822c94` 与 toggle-group 的 `15f1f291d8d34f8a017adf7a84a30a8b022b6533b390350cd14a77d016d08b75` 均未变。

受控选择风险由原 trusted66 的严格真实 CDP 两 Document 证据及本 reviewer 016/021 guarded 实际组件证据承接。021 在两个 Document 再验证 ArrowRight 跳过 disabled 到 Second（value=b、aria-checked=true、tabIndex=0、activeElement=Second），ArrowLeft 恢复 First/value=a/aria/focus；原 trusted fixture 保留第二 Document 不夺父文档焦点的断言。当前维护入口 scripts/ui-review/fixtures/frontend-redesign/T-02/index.mjs 已只读核对仍保留 keyDown/keyUp、左右方向的实际受控值/焦点与 checked/parentStayed 断言，并在 011 扩充 fixture 继续使用。该入口仍由另一 writer 编辑，本轮没有将它冻结或声明其完整 fixture 已通过。

## 问题与下一步

本次 delta 无待修新 finding；016 四项可以在上述固定输入范围内关闭。原始外部 TS17001 阻断与其后实际通过的日志均保留；当前本原语精确生产/测试类型门已解除，不再以旧失败作为当前阻塞。

Lead 回读实际派遣与本报告，接收 repaired candidate 后继续完整 T-02 fixture、两 Document/原生 Obsidian popout、1440/390、长文本/粗指针/overlay 组合及最终 CSS 外观验证。其他 modal/tree/fixture 的独立审查、旧变体消费者迁移账目、全仓 build/lint/types 与最终 main.js/styles.css/包体仍属于原集成门。局部通过不代表完整 T-02、T-14 或整体 change 完成；后续源码或样式输入漂移时只重验受影响证据，不改写旧不可变报告。
