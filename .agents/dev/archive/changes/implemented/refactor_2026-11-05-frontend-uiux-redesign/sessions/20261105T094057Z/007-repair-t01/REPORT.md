# 任务回报

Session: 20261105T094057Z
Task: 007-repair-t01
Status: completed

## 聚焦交接

已修复独立高审查 005 的 S-01、S-02、S-03、V-01、V-02，交回新的 T-01 候选，正式通过仍由 Lead 及 high 复审决定。生产修改限于宿主强调 soft/text 色对检查与减少动效选择器；守卫改用 Stylelint 的颜色语义规则覆盖具名/现代函数；fixture 改为真实生产 i18n 与每个样本实际打开双 Document Dialog。最终浏览器矩阵通过 66 个样本、132 次已打开浮层检查，实际对比度、safe/unsafe 映射、语言、普通元素与根/后代伪元素的动效均被断言。源码已冻结，不再修改，先前 001/005 REPORT 未改写。

## 产物与验证

### 影响与修改范围

实施前完整回读 005、001 及 repair TASK，沿 applyInterfaceTheme → 语义 alias → accent-soft/selected text、base 动效保护、真实 guard CLI、runner → fixture → Dialog/Portal/useT 调用链核对。沿用 T-01 writable paths、DESIGN revision 3、map revision 6、dev/ui 与 SpecDev I 的既有读取和合同；无审批/状态/所有权变更。

本轮只修改九个文件：

- src/theme/runtime.ts：把 accent-text 对 accent-soft 的真实背景加入验证；透明 soft 先分别合成到 canvas/surface/raised/sunken，再检查 4.5:1。失败时保持整组 HUHU 安全 palette，不写入宿主映射。
- src/theme/runtime.dom.test.tsx：加入 005 的 #767676 对白背景合格、对纸主题 soft 背景不合格反例，断言强调文字与 surface 都不接受宿主值。
- src/theme/token-guard.test.ts：加入 red、color(display-p3 …)、混合中的 red，以及 currentColor/transparent/语义变量正例。
- src/ui/styles/base.css：显式设置 reduce 和系统 media 分支均分别列举根、后代及其 ::before/::after；动画、过渡及平滑滚动关闭。修复过程也检出了原系统分支遗漏根伪元素的同类缺口，一并修复。
- scripts/lint-css.mjs：新 token/桥接范围继续限于原三个文件；使用 Stylelint color-named、color-no-hex 和现代 literal function 禁止清单，覆盖函数混合内字面量，不放宽原 baseline，不扫描/修改未迁移模块。
- scripts/ui-review/run.mjs：矩阵新增明确 safe/unsafe 宿主模式、设置单独减少动效与系统单独减少动效样本；向 fixture 传入现有 capture 接缝，截图名包含宿主模式。
- scripts/ui-review/run.test.mjs：CLI preflight 必须包括 unsafe 宿主与 setting-only reduce 样本。
- scripts/ui-review/fixtures/frontend-redesign/shared/theme.tsx：setLanguage 驱动真实生产 i18n；useT 订阅使按钮、字段、菜单、Dialog/Command/状态文案真实重渲染；真实 Dialog 本身的关闭可访问名称也纳入语言验证。模拟宿主提供已知安全/不安全的实际变量输入。
- scripts/ui-review/fixtures/frontend-redesign/shared/theme.mjs：每个样本在两个 Document 实际打开 Dialog，断言 owner/theme/source/accent、computed foreground/background/boundary/selected soft/primary 对比度及实际 map/fallback；检查普通元素、根和后代 ::before/::after 的实际 animationName/duration、transitionDuration 与 scrollBehavior。等有限入场动画结束后截图，第二 Document 暂时置于可见位置拍摄后还原。

未修改 editor 配色、编辑器独立回归测试、数据 schema/领域服务、依赖、适配器、正式状态或先前 REPORT；styles.css 只由 Lead 重建，没有提交、暂存、推送或发版。

### 红灯与修复证据

所有过程材料仅留在 /tmp/huhu-t01-repair。

| 行为 | 红灯 | 绿灯 |
|---|---|---|
| S-01 soft/background 漏检 | unit-red.log：实际接受 #767676，预期空；本轮 focused 测试 2 failed，命令退出 126 | unit-green.log：同一 focused 命令退出 0，6 tests 通过；最终主题 39 tests 通过；浏览器全 accent/source/Document 的 selected 实际色对也通过 |
| S-03 颜色守卫 | unit-red.log：red 的真实 guard 子进程错误放行；005 的 modern 复现已回读 | guard-cases.json：named、modern、mixed CLI 都非零（此 shell 记录 126）；semantic 退出 0；Vitest 正反例退出 0 |
| S-02 设置独立 reduce | motion-red.html/log：真实 Chrome、系统 no-preference 下仍有 probe/2s，后置断言失败，退出 126 | motion-green.html：动画 none、时长/过渡 0s、systemReduce=false；后置断言退出 0；最终矩阵另覆盖根/后代、before/after 及 system-only |
| V-01 假语言样本 | locale-red/result.json：新断言要求 Save，旧 fixture 实际固定双语，runner 退出 126 | 最终 en/zh 样本都断言实际 Save/保存与生产 Dialog 关闭 Close/关闭；不是只检查 lang 属性 |
| V-02 缺少真实组合 | matrix-red.log：CLI preflight 不含 unsafe 宿主，退出 126 | 最终 66 样本均实际打开两份 Dialog；132 overlay 记录与命名截图 |

扩展运行 matrix-third 达到第 66 个样本时，system-only/root pseudo 断言失败（probe 仍活动），没有把它算通过。补齐 media 根伪元素后 matrix-final 通过 66，但视觉检查发现截图尚在入场 opacity 动画中；随后补上有限动画等待与两帧绘制等待，重新运行 matrix-settled。matrix-first/second 的失败分别来自新检查未合成透明 input 背景、关闭按钮选择器未采用真实 data-slot；已修正 fixture，不改生产组件或放宽阈值。这些失败材料均保留，不以早期绿色替代最终冻结证据。

### 最终实际验证

| 命令 | 实际结果 |
|---|---|
| pnpm exec vitest run src/theme | 退出 0；8 文件、39 tests（theme-final.log），包含未删的 editor regressions |
| pnpm exec eslint src/theme --max-warnings 0 | 退出 0（lint-theme-final.log） |
| pnpm run lint:css | 退出 0（lint-css-final.log）；无新增 CSS 违规/不放宽 baseline |
| node --test scripts/ui-review/run.test.mjs（最终 fixture 字节） | 退出 0；6 tests（cli-settled.log） |
| pnpm test:styles（Lead 最后重建之后） | 退出 0（styles-final.log）；23 来源，1,288,747 bytes |
| node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-01 --matrix redesign --out /tmp/huhu-t01-repair/matrix-settled | 退出 0（matrix-settled.log）；66 cases、132 overlays、errors=[] |
| 实际 Chrome 独立 explicit-reduce probe + 后置断言 | 退出 0；系统 no-preference，伪元素 animation none、duration/transition 0s |
| git diff --check -- 本轮写集 | 退出 0 |

最终矩阵保留七宽度及窄 desktop 叶，另有独立 mobile/coarse 和 200%/CSS320；全纸/墨 × 六 accent × source 的浮层均执行，obsidian 各含 safe/unsafe 输入。两个 Document 的属性、实际宿主变量与是否写入 --hu-surface/--hu-accent-text 均断言，因此不是只记录 data-source。透明 soft 和 input 背景按实际所处 Dialog 背景合成后计算对比度，计算方法独立于生产 contrast helper。

132 个已打开浮层的最小实际对比度：正文 14.073、选中 soft 文字 6.167、输入文字 15.262、控件边界 3.507、主按钮文字 6.014，均高于 7/4.5/4.5/3/4.5 阈值。实际查看了窄英文第二 Document 完整浮层及墨/梅紫/安全宿主中文浮层截图；文字是真实单语翻译，浮层已完成入场而非半透明中间帧。

环境为 Google Chrome 153.0.8010.47、现有 Linux/Node/pnpm。没有重跑无关全仓检查；已登记的 appearance/panels 等全量编译迁移错误尚未在本票消除，本报告不宣称全量 build/lint、真实 Obsidian、最低 WebView 或其他平台通过。iframe 仅证明第二 Document，mobile/zoom 是 Chrome 能力模拟。

### Design Conformance 与 Skill 执行

继续绑定 DESIGN revision 3 / digest 49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66 与 UI-002。本轮落实 §3.4 实际色对/整组回退、§3.6 显式及系统减少动效；没有改变已批准 palette、产品边界或组件选型。dev 的 namespace/模块/数据边界与 ui 的真实控件、作用域、所属 Document、可访问名称和浏览器验收实际应用；沿用 001 的技能绑定，生产源定向 lint、真实 guard 正反例、DOM/浏览器检查记录如上。SpecDev I 的 repair/red-green/固定候选过程执行，正式 Evidence/状态仍由 Lead 负责；没有递归派遣。

### 固定候选

基线 HEAD：37fcede4210a19bcc2a74809e7fdd301e5717957。
九个本轮文件副本与清单：/tmp/huhu-t01-repair/snapshot/manifest.json。
清单摘要：5a9641baceafd76d325f48c6abd956f23402348665b038f7505782e5ddb163dd。
最终浏览器 result：/tmp/huhu-t01-repair/matrix-settled/result.json。
最终 inputDigest：c824624556bb83feac88d0ab5b9d2a32e9a3e19eac7f5c139f00bb0d845fe47b。
写本报告前核对九个文件均无 snapshot drift。本报告不改变源码快照。

## 问题与下一步

五项 finding 的修复候选及真实回归已交付，没有本轮独立检查阻塞。请 Lead 固定组合候选并派发用户要求的 high 复审，核对最终 result/截图与本轮日志后维护正式 Evidence；全量消费者迁移与真实宿主验收继续保持其原归属。源码冻结，之后发现问题交 Lead 单独 repair，不静默改写本候选或旧报告。
