# 任务回报

Session: 20261105T094057Z
Task: 008-review-t01-repair
Status: completed

## 聚焦交接

独立 reviewer：native:/root/review_toolchain；未参与 007 修复、未修改源码或生成产物、未委派。标准轴 pass，规范轴 pass（本轮修复及已核验不变的 005 范围）；005 的 S-01/S-02/S-03/V-01/V-02 均关闭，未发现新的可定位缺陷。实际重跑原 unsafe/safe 宿主、显式/系统减少动效和真实颜色守卫反例；最终浏览器证据字节匹配，并有真实语言与 132 个已打开浮层的计算色对记录。**本 reviewer 释放冻结候选供 Lead 后续接收或实施**；这不表示整库构建、所有后续消费者或真实 Obsidian 已验收。

## 产物与验证

### 固定输入与复用

Review mode: working-tree；基线/观察 HEAD：37fcede4210a19bcc2a74809e7fdd301e5717957。Strategy: independent；Risk: high；Independence: required；Mode: native。007 的实际实现者为修复 writer；本 reviewer 只审查，与 001/003/004/007 实现者均不同。Lead 负责从真实派遣/返回事实核验身份。

九文件精确候选：/tmp/huhu-t01-repair/snapshot/manifest.json，digest 5a9641baceafd76d325f48c6abd956f23402348665b038f7505782e5ddb163dd。开始和结束均逐一重算实际 SHA256，与清单完全一致。路径为 runtime.ts、runtime.dom.test.tsx、token-guard.test.ts、base.css、lint-css.mjs、run.mjs、run.test.mjs、共享 theme.tsx/theme.mjs fixture；实际 diff 与最终完整源码均审阅。

与 005 的最终 31 文件快照比较：除这九个修复文件及 Lead 重建的 styles.css，其余原审查文件全部哈希未变。因此复用 005 对不变 token/settings/editor/adapter/toolchain 源码的观察，不改写 005 原始 request-changes。最终 styles.css 的 SHA256 为 f041f63f119c79283714c092350a7db6ce17fc0704eb8a9780255030f2629a13；它虽不在九文件 source manifest，已由浏览器 inputs 独立绑定并核对。

浏览器权威结果：/tmp/huhu-t01-repair/matrix-settled/result.json，inputDigest c824624556bb83feac88d0ab5b9d2a32e9a3e19eac7f5c139f00bb0d845fe47b。全部可访问文件输入 SHA256 与当前字节匹配；passed、66 cases、132 overlays、errors=[]。旧 matrix-final/005 的 54-case 结果不作为本轮最终证据。

继续应用已读且不变的根 AGENTS、dev/ui、code-review 与相关测试/主题/动效/风险/证据合同；回读 005、007、T-01、DESIGN/spec 的 AC-001–004 与 §3、当前 map revision 7。map revision 7 只补 T-02 写集，未改变本票门槛。006 的宿主类型 pass 已回读，但它是不同执行者、不同六文件输入的独立审查，未并入本报告身份或检查声明。

TASK dispatch 结构实际校验通过，errors=[]、warnings=[]；结构检查不代替真实派遣、授权或业务完成事实。

### standards 输出

Reviewer: native:/root/review_toolchain
Result: pass
New findings: []

**S-01 closed。** runtime 现在先将实际 soft 色与各候选背景合成，再检查 accent-text 4.5:1；失败不写入整组宿主映射。独立打包生产 applyInterfaceTheme，真实 Chrome 重跑 005 四白背景/normal#111111/muted#444444/accent#24575a/accent-fg#ffffff/text-accent#767676：mappedAccent 与 mappedSurface 均为空，原错误放行被阻止。随后同一 root 改 text-accent=#111111，成功写入 #111111/#ffffff，证明没有靠一律关闭宿主映射制造绿色。新 DOM 回归直接检验外部输入及整组结果，未降低阈值；ink 的透明 soft 合成也由完整浏览器组合覆盖。

**S-02 closed。** base.css 的设置和系统分支均显式列出根、后代与各自 ::before/::after，使用 animation:none、transition:none、scroll-behavior:auto。独立 Chrome 压力夹具检验根/子元素及 before/after 共六个位置：系统 no-preference + data-motion=reduce，以及系统 reduce + data-motion=system 两个独立路径均为 none/0s/0s/auto。修复没有只把时长 token 置零，也补齐了系统分支的根伪元素。

**S-03 closed。** 新守卫使用已有 Stylelint 的颜色规则与现代函数限制，继续只审原三个 token/桥文件，不放宽 baseline。独立执行真实 CLI：red、color(display-p3 …)、color-mix 内嵌 red 均退出 1；currentColor/transparent/语义 var 与完全由 var 构成的 color-mix 均退出 0。负例不再依赖单一 hex 正则；现有语义混合仍可用。完整 lint:css 通过，说明修复并非靠禁止现有安全语义表达式。

新测试沿真实 CLI/生产函数和浏览器计算样式验证行为，旧 editor regressions 未动。改动未引入 any、抑制检查、依赖、领域逻辑、持久化格式或兼容 UI 分支；没有需要额外重构的 Fowler 命中。

### specification 输出

Reviewer: native:/root/review_toolchain
Result: pass（007 修复范围与核验不变的 005 范围）
New findings: []

S-01/S-02/S-03 分别满足原 AC-003、AC-004 与 token 守卫修复条件；以下验证缺口亦关闭：

**V-01 closed。** fixture 使用真实 setLanguage 和 useT；configure 驱动生产 i18n，按钮、字段、菜单、Command、Dialog 文本实际重渲染。每例断言实际 Save/保存，真实共享 Dialog 的关闭名称为 Close/关闭。浏览器记录共有 28 个 Close 与 104 个关闭，截图也显示单语文案；不再只是修改 html lang 或始终双语。

**V-02 closed。** 每例在两个所属 Document 实际打开 Dialog，校验 owner/theme/source/accent、实际前景背景和边界色。独立枚举结果：paper/ink × 六 accent × huhu，以及 obsidian safe/unsafe 的组合无缺失；66 例均有 main/second 两条 overlay 记录，合计 132。safe 明确断言实际写入宿主 surface/accent-text，unsafe 明确断言整组未映射。透明 soft 与 input 背景由 fixture 独立合成，WCAG 算法不调用生产 contrast helper，阈值未放宽。

132 个浮层计算结果的独立最小值为：正文 14.073:1，selected soft 文字 6.167:1，输入文字 15.262:1，控件边界 3.507:1，主按钮文字 6.014:1，分别高于 7/4.5/4.5/3/4.5。矩阵保留七宽度、窄 desktop、独立 mobile/coarse、CSS320/200% 模拟、13/14/15 字号与设置/系统独立减少动效。普通元素及根/后代伪元素的动效检查有正常 2s 活动状态作为对照，不能因探针未运行而虚假通过。

独立查看最终 settled 截图：overlay-320-en-paper-teal-huhu-none-compact-14-desktop-1x-second.png，以及 overlay-960-zh-ink-plum-obsidian-safe-comfortable-15-desktop-1x-main.png。浮层文字和控件清晰、视口内完整，英/中文案不同，背景遮罩与纸/墨层次合理。第二 Document 截图已将 iframe 暂时置于可见位置；截屏前等待有限动画完成及两帧绘制，避免先前半透明入场帧。没有用原型图冒充实现证据。

### 实际检查

环境：Linux、Node26.11.1、pnpm11.1.3，已安装 Chrome。过程文件只写 /tmp/huhu-t01-repair-review；唯一仓库写入为本报告。

| 检查 | 实际结果 |
|---|---|
| 九文件 SHA256（前后）及其 git diff HEAD --check | 退出 0，全部匹配 manifest |
| 005 不变文件哈希、最终 browser inputs 哈希、组合完整性与 132 条对比度统计 | 退出 0，无漂移/缺失 |
| TMPDIR=/tmp/huhu-t01-repair-review pnpm exec vitest run src/theme/runtime.dom.test.tsx src/theme/token-guard.test.ts --reporter=dot | 退出 0；2 文件/6 tests |
| TMPDIR=/tmp/huhu-t01-repair-review node --test scripts/ui-review/run.test.mjs | 退出 0；6 tests |
| pnpm exec eslint src/theme/runtime.ts --max-warnings 0 | 退出 0，无警告 |
| pnpm run lint:css | 退出 0；22 文件，仅原有 1 文件/3 baseline 规则组，无新增违规 |
| 真实 guard 五个独立 CLI probe | named/modern/mixed 各 1，semantic/mix-semantic 各 0，全部符合预期 |
| 当前 runtime 打包到 /tmp 后，真实 Chrome --dump-dom 的 unsafe/safe probe | 退出 0；unsafe 未映射、safe 正常映射 |
| 真实 Chrome 显式 reduce 和 --force-prefers-reduced-motion 两次 probe | 各退出 0；六位置均 none/0s/0s/auto |
| validate-dispatch，stage=dispatch | 退出 0，无错误/警告 |

未重复执行输入无关的完整主题/editor/adapter 测试、全量类型检查或完整浏览器矩阵。前者按不变源码核验复用，最终矩阵则逐字节绑定当前候选后审阅实际结果、断言与截图；本报告没有把它称为 reviewer 亲自重跑 66 例。

## 问题与下一步

本轮无未关闭 finding；Lead 可在核验真实派遣及本报告后接收五项修复。旧 005 报告保留其当时结论，本报告只对本次精确候选成立。若九文件、styles.css 或被绑定的 fixture/browser 输入再变，重新判断受影响证据，不直接沿用本次 pass。

仍未验证：真实 Obsidian/popout、移动 WebView、其他平台/Node22/24、全库 build/lint/测试类型、生产 main.js/包体/notices 一致性。第二 Document 是 iframe，mobile/zoom 是 Chrome 模拟。已记账 appearance/panels 消费者迁移失败不因本次局部 pass 消失；006 仅关闭独立宿主类型修复，完整 T-01 状态及最终集成门由 Lead 按当前原子集成合同负责。
