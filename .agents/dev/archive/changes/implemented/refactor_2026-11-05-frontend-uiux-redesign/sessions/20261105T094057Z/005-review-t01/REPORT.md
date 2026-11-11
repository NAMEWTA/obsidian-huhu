# 任务回报

Session: 20261105T094057Z
Task: 005-review-t01
Status: completed

## 聚焦交接

独立 reviewer：native:/root/review_toolchain，未参与当前候选实现，未改源码、安装依赖、重建共享产物或递归委派。标准轴和规范轴均为 request-changes，共五项 P2：宿主强调文字的实际 soft 背景漏检、显式减少动效漏掉伪元素、颜色守卫可被具名颜色和现代函数绕过，以及 runner 的语言和浮层矩阵验证缺口。当前浏览器证据确实匹配最终冻结字节并通过 54 个用例；这些用例的断言不足以排除已复现的问题。候选现已交回，**本 reviewer 释放冻结供 Lead 派发修复；修复后须重新固定输入并复审受影响范围**，本报告不可改写为修复后通过证据。

## 产物与验证

### 输入、身份与适用边界

- Review mode: working-tree；基线及观察 HEAD：37fcede4210a19bcc2a74809e7fdd301e5717957。
- Strategy: independent；Risk: high；Independence: required；Mode: native；Reviewer: native:/root/review_toolchain。当前候选由 Lead、001-implement-t01、003-implement-adapters 实施；本 reviewer 均未参与。
- 原 30 文件快照：/tmp/huhu-frontend-implementation/review-t01-snapshot.json，input_sha256 为 64c013bbcdd3e7709bb57f34a0936200467562c38c8021f4ab900ac0eb4e7689。开始核对所有现存字节，无漂移。
- Lead 后续单独补入已恢复的 editor-presets.test.ts，最终 31 文件快照：/tmp/huhu-frontend-implementation/review-t01-snapshot-with-editor-tests.json，input_sha256 为 0e81e8fb63b47029943f97b1543c7400a6b7490f9964f80f188889d1e71c9732。结束核对 31 文件全部 SHA256，与快照一致；git diff HEAD --check 对该文件集退出 0。
- 实际审查 diff 为 `git diff HEAD -- <快照全部路径>`，新增 fixture/token guard/editor tests 另读实际字节；没有把 HEAD 冒充工作副本。snapshot 的 excluded_paths 已读取；活跃 host moment/app-main 修复、change 工件不在本次源码审查内。
- 当前有效浏览器证据为 /tmp/huhu-frontend-redesign/T-01-frozen/result.json，inputDigest 865f4d5b0cdb361399141f74ba732ef326de22ebe5a1c180c36e20744a8a8d1a，passed、54 cases、errors=[]。独立逐一核对全部可访问文件输入 SHA256，均匹配当前字节。T-01-delivery/早期矩阵不作为最终候选证据。

TASK 的 dispatch 结构已调用 validate-dispatch.mjs 的 validateDispatch 核对：errors=[]、warnings=[]，退出 0。该检查仅验证 TASK/目录结构，实际身份和派遣仍由 Lead 依真实工具回执核验。

标准来源：根 AGENTS、dev/ui Skills、相关 build/licensing/testing、theme/motion-a11y/design-system 约束、tsconfig 与 lint/stylelint 配置；同时应用 code-review 的 reviewer/source-discovery/Fowler/risk/review-evidence/working-tree 合同。规范来源：T-01、spec AC-001–004、DESIGN revision 3 §3/§7、tickets-map revision 6、reuse-decision、001/002/003 报告。DESIGN 明确替换的旧 UI token/宿主全局配色/动效规则不作为反向兼容要求。提交引用对本次未提交范围不适用；没有外部可变 Issue 充当唯一规范。

### standards 输出

Reviewer: native:/root/review_toolchain
Result: request-changes

**S-01 · P2 · 宿主强调文字漏检真实 soft 背景。** 定位 `src/theme/runtime.ts:68–81`；调用链为 `applyInterfaceTheme` → `--hu-accent-text` → tokens.css 的 `--accent-foreground`/`--sidebar-accent-foreground`，实际选中背景为 `--hu-accent-soft`。当前只检查 accent-text 对 canvas/surface/raised/sunken，随后接受宿主映射；没有检查 accent-text 对未一起映射的 accent-soft。

真实 Chrome 加载当前 styles.css、打包当前生产 applyInterfaceTheme 的反例：宿主四背景均 #ffffff，normal=#111111，muted=#444444，accent=#24575a，accent-fg=#ffffff，text-accent=#767676；source=obsidian/preset=paper。运行时实际接受并写入全部映射；text-accent 对白色为 4.542:1，但对 HUHU accent-soft #E3EEEC 只有 **3.830:1**。选中控件/行文字因此低于 4.5:1，违背 DESIGN §3.4 的实际色对合同。复现源码与 HTML 仅在 /tmp/huhu-t01-high-review/host-pair.ts、host-pair.html。

最小修复：把实际使用的 soft/text 色对纳入对比度检查（含透明 soft 背景的合成值），不安全时让相关前景/背景成对回退；至少增加该反例的生产 runtime 回归，并核对全部强调色与所属 Portal 的计算结果。不能单独接受前景映射再保留冲突的 soft 背景。

**S-02 · P2 · 设置开启减少动效没有覆盖伪元素。** 定位 `src/ui/styles/base.css:83–84`。`:is(*,::before,::after)` 不能令伪元素参与匹配；它实际只处理普通元素。系统 media 分支另列 ::before/::after，因此系统减少动效可生效，但仅开启 HUHU 设置、系统维持 no-preference 时不同。

真实 Chrome 加载当前产物，在 `.huhu-ui[data-motion="reduce"]` 内为子元素 ::before 设置 2s transform animation/transition；计算值仍是 animationName=probe、animationDuration=2s、transitionDuration=2s，systemReduce=false。证据仅在 /tmp/huhu-t01-high-review/motion.html。该最小压力夹具检验新全局保护规则，没有宣称目前某个既有产品伪元素正在旋转。最小修复：如系统分支一样分别列出根/后代及 ::before/::after 选择器，关闭动画、过渡与平滑滚动；新增只开设置、不启用系统 media 的计算样式反例。

**S-03 · P2 · 颜色守卫仍允许新增第二套字面量配色。** 定位 `scripts/lint-css.mjs:11–16`。正则只拦 hex、rgb/rgba/hsl/hsla/oklch/oklab；`color:red; background:color(display-p3 1 0 0)` 经真实 `--check-token-file` 实测退出 0，输出 token guard: passed。现有全局 stylelint 也没有具名颜色或 color() 检查，因此新桥/基础样式里可引入这些颜色却仍通过本票守卫。反例文件仅在 /tmp/huhu-t01-high-review/named-colors.css。

最小修复：按颜色值语义覆盖具名颜色、现代色彩函数及混合中的字面量；保留 transparent/currentColor、语义 var 引用和 DESIGN 白名单。至少给 red、color(display-p3 …)、允许的语义值各一个真实守卫正反例。不要为了修复扩大到修改尚未迁移模块或放宽 baseline。

未发现 adapter 本次改动破坏 fail-closed 合同：fixture 工厂要求完整精确计数表；生产默认计数不受 fixture 改动影响；审核源哈希仍必需，expected-zero 也不会禁用哈希验证。删除过期哈希、物理图去重及保留生产图失败均有报告和独立执行对应。Fowler 启发式未发现需额外重构的问题。

### specification 输出

Reviewer: native:/root/review_toolchain
Result: request-changes

S-01 违反 AC-003/DESIGN §3.4，S-02 违反 AC-004/DESIGN §3.6，S-03 未实现本票 token 守卫的禁止第二色盘合同；同一缺陷不重复计数。另有两个独立验证缺口：

**V-01 · P2 · en/zh 矩阵没有实际切换生产语言。** 定位 `scripts/ui-review/fixtures/frontend-redesign/shared/theme.tsx:87–99` 及固定双语文本。configure 只设置 documentElement.lang，没有调用真实 setLanguage；fixture 的保存/菜单/浮层等主要文字也始终是双语常量。因此两套语言样本没有验证翻译后的真实组件文案、重渲染与溢出，不能宣称已覆盖生产语言切换。最小修复：驱动真实 i18n 并让至少关键 fixture 内容及生产控件可观察文案随语言切换，断言 en/zh 实际文字不同且仍符合布局；可保留专门的双语长文案压力样本，但不能用它替代 locale 样本。

**V-02 · P2 · 主题/来源/强调色的浮层矩阵未实际执行。** 定位 `scripts/ui-review/fixtures/frontend-redesign/shared/theme.mjs:7–25`。54 个 matrix case 仅检查根与空 Portal 的属性和 token；真正 Dialog 只在全部 cases 结束后的最终 paper/teal/huhu 样本中打开一次/Document，且断言硬编码 paper。DESIGN §3.4 明确要求 paper/ink × 6 accent × 宿主来源 × overlay 状态；当前没有墨主题或宿主映射下的已打开浮层证据，也没有计算实际对比度的断言，S-01 就能穿过现有绿色结果。

最小修复：在完整主题/强调色/来源组合里实际打开浮层并检查所属 Document、主题来源及实际前景背景/边界色对；两个 Document 都验证，截图名称可识别配置。宿主来源至少包含一个已知安全的真实映射和一个触发回退的输入，断言实际映射/回退结果，而非只有 data-source。保留原 desktop 窄叶与独立 mobile 能力样本。该合同不要求在本票实现 T-02 的全部 overlay 栈产品功能。

其余规范观察：tokens 的纸/墨、六强调色、明确字号/行高、density、阅读 17/1.95、focus、diff 比例与 DESIGN §3 一致；根/Portal 只写 HUHU 属性/变量，编辑器 CSS 文件未修改，新的独立 editor-presets.test.ts 恢复了原有笔记对比度覆盖。settings schema 对旧 UI preset 回默认而非建立兼容层，显式编辑器方案/字体/正文设置仍分离。T-02 精确控件尺寸、T-08 --db 调用方、T-12 外观页和最终仓库零旧配色不在本次票范围，未把这些后续工作列为当前 defects。

### 实际验证与视觉观察

环境：Linux、Node26.11.1、pnpm11.1.3；使用已安装 Chrome。所有新测试过程文件仅在 /tmp/huhu-t01-high-review。

| 检查 | 实际观察 |
|---|---|
| validateDispatch，stage=dispatch | 退出 0；无 errors/warnings |
| 开始 30 文件、结束 31 文件的实际 SHA256 核对 | 退出 0；全部匹配对应冻结快照 |
| git diff HEAD --check -- 最终31路径 | 退出 0 |
| TMPDIR=/tmp/huhu-t01-high-review pnpm exec vitest run src/theme --reporter=dot | 退出 0；8 文件/38 tests，包括恢复的 editor-presets |
| TMPDIR=/tmp/huhu-t01-high-review node --test scripts/ui-review/run.test.mjs | 退出 0；6 tests |
| TMPDIR=/tmp/huhu-t01-high-review node scripts/verify-ui-adapters.mjs | 退出 126；54 focused 正反例通过；随后生产图仍报已登记的 AppearanceSettings deriveCustomTokens 与 agent panels v3 导出五项错误，没有被伪装成通过 |
| 两个真实 Chrome --headless=new --dump-dom 压力探针 | 各退出 0；实际输出确认 S-01/S-02 的违规计算值，退出码不是通过验收 |
| node scripts/lint-css.mjs --check-token-file /tmp/huhu-t01-high-review/named-colors.css | 退出 0；证明 S-03 的错误放行 |
| 已有 T-01-frozen result 及全部可读 input hashes | passed/54/errors=[]，字节匹配；未重跑无变化的整套浏览器矩阵 |

独立查看 320-en-ink-teal-huhu-compact-14-desktop-1x.png 与 960-zh-paper-plum-obsidian-comfortable-15-desktop-1x.png：页面容纳在视口内，基础纸/墨层次与文字可读；宽窄图均是固定双语夹具，不能据此推导 locale 成功。缩放样本通过 640 物理宽度/320 CSS px 与 deviceScaleFactor=2 模拟，证明对应有效 CSS 视口布局，未实际操作浏览器 UI 缩放。第二 Document 是同源 iframe，不能推导真实 Obsidian popout；mobile/touch 仍是 Chrome 模拟能力。原型只作设计参考，本次图片来自当前生产组件与最终 styles.css。

### 复用与未验证

002 报告中不变的四工具链文件仍匹配，复用其 package/lock/peer/license 局部结论；moment S-01 修复属于独立 006 审查，不能在此消除。003 的源码比较/observed graph已回读，独立重跑了其真实正反守卫；完整生产图门仍失败。001 的 54-case passed 与“只有真实控件 fixture、不是完整设置页/宿主验收”的限制成立，但不支持更强的语言/全浮层/全部实际色对已验收声明。

未执行：依赖安装、共享 build/styles/notices 写入、全量 lint、frozen-lockfile 新克隆/其他平台、真实 Obsidian、多宿主主题/最低 WebView 能力、最终 bundle/notices 一致性。生产 build 不能在已知导出失败下宣称通过；T-01 全票通过还要求本报告缺陷修复及 excluded host 修复单独 verified。

## 问题与下一步

五项发现已即时发给 Lead；Lead 已接受 runtime 对比度、减少动效和 runner 缺口为 must-fix，颜色守卫补充发现亦已通知。由 Lead 分配原 owner 或修复 writer，保持已批准设计及既有领域行为，修复完成后重建必要产物并形成新的完整冻结候选。复审重点是上述可证伪反例、真实语言切换、实际已打开浮层与 safe/unsafe 宿主矩阵；不靠增加绿色 case 数量替代这些断言。

本报告 completed 仅表示独立审查候选交回；标准/规范均 request-changes，T-01 仍待修复验收。
