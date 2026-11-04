# 任务回报

Session: 20261104T095541Z
Task: 061-review-t09
Status: completed

## 聚焦交接

完成 T-09 独立双轴审查，两轴均为 request-changes，保留两项 minor：窄屏常规指针下的按钮未达到批准设计与现有夹具要求的 44px；夹具的 CDP Enter 事件不能激活原生按钮，exercise 中途超时。归物统计、真实路由、条件补偿及通用编辑器回归通过，未发现新的领域数据覆盖问题。原样 required UI runner 另在共享适配器图数量校验处编译失败，零 case；诊断运行不能替代这个失败门禁。仅写本 REPORT，不改业务、TASK、正式 Evidence 或状态；下一步由 Lead 处理本票局部修复和共享验证入口，再冻结复审。

## Review

- Strategy: independent；Risk: medium；Independence: required。
- Reviewer: 当前承接 061-review-t09 的 Codex 会话，未参与本票实现或修复；实际派遣身份由 Lead 核验，不虚构会话 ID。
- Implementers: 054-implement-t09、056-implement-t09-r2 及共享路径集成 Lead。
- Mode: working-tree；current/dev；base_sha / observed_head：29644dc5833bb209e6282f84fa71441a5a1b99d4。
- Input-SHA256: 9f43a52358baee6bb0ed4c25612b79ba18019b1c66909f06198371e0cc8b67c8（TASK 给定）。
- 冻结 TASK 已完整读取，19 个输入开始、中途、报告前全部匹配；回读时再次校验。review-scope 确认 19 个显式路径与指定 base/head，没有扩大到工作区全部 dirty 文件。

本轮读取 Ticket、054/056 交接、Spec §3 与 AC-311/312、ADR/CONTEXT、Map 总体背景、Goal 成功/范围、DESIGN BELONGINGS 与批准 UI-001 final 对应结构、T-08 已验收 Evidence；按已读且仍适用的运行、范围、设计和测试合同执行。重新读取 dev/ui、reviewer-contracts/risk-review；AGENTS/dev/ui 摘要分别与既有已读版本 a65261ca…、d217057f…、123781b6… 一致。适用风险展开到幂等、CAS、五分钟有效期、原子 updater 重验、返库周期恢复和保留历史，不重开 T-08 已验收领域需求。

沿 module 页面入口 → GenericArchivesSurface/ArchivesContent → BelongingsPage → application.query/commands → BelongingsService/EntityCommands → runtime.patch 追踪。审查冻结源码与已跟踪差异，读取相关领域/DOM/服务测试、共享 Button、DesignScope、命中尺寸 CSS 和 UI adapter guard；依赖文件仅用于解释事实，不在本轮写集内。

## Standards Axis

Result: request-changes
Reviewer: 当前 TASK 的独立 Codex reviewer
Input-SHA256: 9f43a52358baee6bb0ed4c25612b79ba18019b1c66909f06198371e0cc8b67c8

### R1 — minor — 窄屏按钮的 min-h-11 被 DesignScope 规则覆盖

- 文件:行：src/modules/archives/ui/belongings/BelongingsPage.tsx:132、158、163；承载位置 src/modules/archives/ui/generic/workbench-page.tsx:44。
- 问题：页面给按钮加 min-h-11，但在真实 DesignScope 下，高特异性的共享规则将普通 Button 的 min-height 设为 var(--nd-hit-size)，常规指针时实际是 32px。结果在 420px 窄屏，新增按钮高 37px、四态按钮高 39px、多张短标题卡片链接高 32px；没有达到批准 DESIGN 的 narrow 44px 和本票夹具已有的 43.9px 断言。Input/Select 同时可达 44px，故不是截图缩放或整个页面 transform 造成的测量误差。
- 复现：原样 runner 先被共享编译校验挡住。保持全部冻结产品文件、fixture、宿主 app.css 和仓库 styles.css 不变，在 /tmp 的 runner 副本仅绕过生产整图文件数量断言以诊断子图；保留依赖源哈希、精确转换与全部 fixture 断言。运行 420/en/light/1x，第一个 case 在 T-09.mjs:14 失败：main: labelled 44px control {name: Add item in archive, height:37}，退出 126。
- 直接证据：额外只读 getComputedStyle 观察到该按钮 class 含 min-h-11，但 minHeight=32px、computedHeight=37px、transform=none；状态按钮 minHeight=32px / height=39px。两个 Document 都可复现。人工查看默认窄屏截图，与测量一致。相关共享 CSS 位于 src/ui/styles/base.css:99，本文说明级联来源，不要求 reviewer 修改共享文件。
- 建议修正：在归物实际承载区域使窄屏命中尺寸令牌/样式真正达到 44px，或由 Lead 做经过影响分析的共享修正；保留完整文字、换行与当前设计，不通过降低断言阈值、仅改为 coarse 测试或增加隐藏文字规避。修复后以相同 420/fine/1x 场景检查真实矩形，再跑完整矩阵。
- 依据：批准 DESIGN 的 control_narrow=44px、BELONGINGS 及 ui 命中目标合同。局部可用性与设计一致性 minor，不声称控件不能点击或出现数据损坏。

### R2 — minor — fixture 的 Enter 注入缺少原生激活所需事件，exercise 无法收尾

- 文件:行：scripts/ui-review/fixtures/T-09.mjs:42–45。
- 问题：对主 Document 的原生卡片按钮 focus 后，夹具只发送 keyDown/keyUp 的 key/code/virtual-key，没有回车文本/字符事件。在当前 Chrome 153.0.8010.47 中，事件到达按钮，却不触发默认 click；因此一直等不到主 Document 详情，后续迁移、补偿、冲突、错误/加载与空态均未执行。
- 复现：临时诊断 runner 保留原 fixture，限定 2x/coarse（这些布局断言实际通过），跑完 24 cases 后 exercise 退出 126，错误 Timed out: keyboard reachable detail。随后只重放末个矩阵 case 加原 exercise，同样失败。
- 事件证据：仅添加观察监听，main 的 focusin、keydown Enter、keyup Enter 均落在正确卡片按钮上，main.hasFocus=true，但没有 main.click；other 已通过原有程序点击进入详情。排除了选择器不存在、未聚焦或两个 Document 都未加载的解释。
- 单变量诊断：保留产品、fixture 源码与全部断言，只在 /tmp 的 CDP 发送代理对 Enter keyDown 补 text 和 unmodifiedText 为回车。实际观察到 native click，随后原 exercise 全部执行成功，interactions 包括 no-results-clear、detail-reduced-motion、dated-transition、resold-discarded-returned、owner-undo、stale-undo-conflict、read-error-loading，并完成 empty/unmount；退出 0、errors=[]。这是事件输入诊断，不是冻结 fixture 已修好或原样门禁通过。
- 建议修正：让夹具发送能代表真实 Enter 的完整 CDP 输入，保留原生按钮默认行为及详情断言；不要为测试在产品按钮补重复按键业务处理，也不要以程序 click 替代键盘验收。修复后重跑原样 runner，确认实际进入详情并执行所有收尾状态。
- 依据：Ticket required 组件 E2E 和 Goal 禁止未运行必需流程即宣称成功的合同。测试/证据缺陷 minor，不据此判定产品真实键盘操作失效。

两项 finding 跨轴引用，不重复计数；无已确认的本票 major/blocker。

### 领域和工程边界复核

- KPI、四态数量与卡片/详情净成本、持有天数、日均成本来自一次 query 的 statistics.summary/items/currencies；页面筛选排序不另算金额。币种分栏、未知售价区别于零、月精度、负净成本与十进制行为回归通过。
- 条件补偿绑定实体 ID、原 operationId 和迁移后哈希；重放按 fingerprint 识别，写入复用 runtime.command/patch。原子 updater 再验资格和原字节，外部修改与排队竞态拒绝覆盖。
- 补偿追加 undoOf 行，不删除原迁移，恢复旧 status/exitDate/sale；parse 与统计重放保留返库前周期及扩展字段。T-08 默认表单、未知历史列、通用表单三方合并和黄金样本未回退。
- 另亲自做实际 owner 探针：在文件端口 beforeProcess 才将 Date.now 推至五分钟后，undo 拒绝，写入数不增；恢复时钟后重建 application/owner，旧资格仍拒绝且零写入。探针最终退出 0，未改业务源或测试。
- 页面浏览零隐式写入，安装显式执行；卸载释放订阅/ResizeObserver，AbortSignal 抑制晚到 UI 更新；完整通用编辑器及离开 guard 接线保留。读取失败保留上次物品、持久页面错误及恢复由真实 DOM 回归覆盖。
- 生产/测试类型、定向 lint、架构与 i18n 检查通过。未新增依赖、启动同步 UI、跨模块内部访问或第二套物品存储。

## Specification Axis

Result: request-changes
Reviewer: 当前 TASK 的独立 Codex reviewer
Input-SHA256: 9f43a52358baee6bb0ed4c25612b79ba18019b1c66909f06198371e0cc8b67c8

| 合同 | 结论与证据 |
|---|---|
| AC-311 | 行为/DOM 接缝通过：真实入口呈现专属 KPI、四态筛选、卡片、详情及完整编辑入口；统计来源一致。但 required Design Conformance 尚不通过，R1 的窄屏命中尺寸和完整原样 UI runner 仍需修复。 |
| AC-312 | 实际领域与 DOM 接缝通过：撤销恢复；其他位置修改后明确冲突、零覆盖；返库补偿、幂等、过期和提交竞态回归通过。临时正确回车诊断也完成真实 owner 撤销/冲突。原冻结 exercise 被 R2 中断，不能记完整浏览器验收通过。 |
| T-08 回归 / AC-313 接缝 | 默认创建、扩展历史保留、状态投影保护、通用编辑三方合并及原子冲突回归保持；本轮不重新定义已验收的 T-08 范围。 |
| BELONGINGS / required E2E | request-changes：R1/R2 以及下面共享 runner 前置问题未关闭；24 个 coarse 布局 case 不等于 48-case 标准矩阵绿色。 |

实现范围在本票扩展写集内：页面、路由、summary 与条件补偿；年度报告仍属 T-10。archives 是唯一数据权威，没有独立 belongings.json、直接回滚旧文件或 UI 旁路写盘。词典 en/zh 成对；来源头保留固定 bz SHA、原始路径、MIT 与 Copyright，docs/third-party/bz.md 已有页面落点、owner 补偿和存储适配说明。

## Design Conformance

页面 BELONGINGS、DESIGN revision 2，重新计算 digest=1e3b5ef5fb4c6ec033ff6a1d9f164a7f3692cc679b71e2d54771c1ea46082c00，与 Ticket design_ref 相符。对照批准的 KPI→四态→搜索/年份/排序→卡片→详情层级、日期确认、rowId 历史、金额边界与撤销/冲突状态；没有修改设计或原型消除差异。

本轮原样 runner 没有进入浏览器矩阵，见集成事项 I1。为了继续独立检查，在 /tmp 副本中仅取消 radix adapter 的整图数量 onEnd 检查，原 onLoad 依赖哈希与精确文本转换仍执行；没有改产品 DOM、CSS、fixture 或其断言。该副本 1x 首例确认 R1，2x/coarse 的 24 个布局 case（420/600/1440，en/zh，亮暗/用户主题，两个 Document）原断言通过，随后原 exercise 因 R2 失败。24 cases 内默认/详情/迁移表单均测量，输入最小实际内容宽度=117 CSS px，仍高于现有 100px 阈值，无横向溢出。

人工查看 420/en/light/1x 默认、420/en/light/2x 迁移表单、1440/zh/dark/2x，以及补回车诊断中的 undo/conflict 截图。长中英文、日期/币种分栏与状态文案在已检查场景可读；这些局部观察不能消除 R1 或为未执行的完整标准矩阵背书。

样式使用 Lead 仓库 styles.css，SHA-256=f2ae6f4e3dd80ffe5f63dde1ced1117fd4bbf7a567c8115d6d477063148d6a25，诊断期间保持一致。标准 runner SHA-256=3d321901c744cf59f4fc3a872d917db0d18d639368fde50188301de2dd130ff1。诊断结果的产品输入 inputDigest=2bc8918621a0ebfeda86397d654aea20395cc0136c360c525e5fdad77517b263；共享 runner 的摘要不包含 /tmp 代理/诊断代码自身，不把它冒称完整诊断脚本哈希。

## 共享集成事项（独立于两项本票 findings）

### I1：原样 required UI runner 编译失败，不能沿用“Lead 亲跑”表述推定通过

执行 node scripts/ui-review/run.mjs --ticket T-09 --matrix standard --out /tmp/huhu-review-061-t09-ui，退出 126，cases=[]。scripts/ui-adapter-guard.mjs:29–36 把生产完整依赖图的固定数量用于此 fixture 子图：roving-focus/menu 各 expected 1、actual 0；focus-scope/focus-guards/dismissable-layer 各 expected 2、actual 1，共五项。Lead 的 temp/ui-review/T-09/result.json 也记录相同编译失败、零 case，不能当作成功凭据。

这些共享文件不在 19 个冻结输入内，未作为本票产品缺陷计数，也未擅自修复。建议 Lead 为 fixture 使用经过核对的图范围/manifest 或等效严格入口，保留已到达依赖的源哈希和精确转换校验，且继续保证生产完整构建的 fail-closed 防护。不能把本轮跳过数量检查的诊断副本作为正式解决方案；修好共享入口后必须重跑原样 required 矩阵及 exercise。

### I2：本轮全仓包体失败仅为范围外 safe 超限

正式内存 check-bundle 退出 126，唯一超限为 safe activation=69460 > 68608；archives activation=261217 ≤ 337920，startup=134635 ≤ 135168。这是并行工作区集成事项，不归因 T-09，不调整预算，也不把全仓门禁写成通过。归 Lead/对应模块 owner 处理。

## 产物与验证

唯一仓库写入为本 REPORT。未修改业务/测试/fixture、冻结 TASK、前序报告、正式 Evidence/Ticket/Map/Goal、设计、来源登记、依赖或 main.js/styles.css；未安装、执行禁止的 build/build:css/notices、Git 写操作、提交、推送或发布。/tmp 的脚本、JSON、截图和编译文件均为本地过程材料。

| 亲自执行的命令/检查 | 退出码 | 结果 |
|---|---:|---|
| TASK 19 文件 SHA-256，多次 | 0 | 全部匹配，回读再检 |
| pnpm exec vitest run src/modules/archives test/golden/archives-v2.test.ts test/archive-relation.test.ts | 0 | 16 文件 / 102 项通过，无快照更新 |
| pnpm exec vitest run --project dom src/modules/archives | 0 | 5 文件 / 18 项通过 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json | 0 | 通过 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json | 0 | 通过 |
| pnpm exec eslint（19 路径中的生产文件、belongings 目录及 T-09 两夹具）--max-warnings 0 --no-warn-ignored | 0 | 定向零警告；测试另由类型/Vitest 验证 |
| pnpm test:architecture | 0 | 1326 模块，无分区/宿主/桌面/barrel/循环违规 |
| node /tmp/huhu-review-061-t09-i18n.mjs | 0 | 原 verify-i18n 等价执行，仅将词典临时产物迁至 /tmp；33 词典 / 5411 键、占位与引用通过 |
| node scripts/ui-review/run.mjs --ticket T-09 --matrix standard --out /tmp/huhu-review-061-t09-ui | 126 | 原样，编译失败，0 cases；I1 |
| node /tmp/huhu-review-061-t09-diagnostic-run.mjs --ticket T-09 --matrix standard --out /tmp/huhu-review-061-t09-diagnostic | 126 | 仅绕过整图数量断言，1x 首例现有 44px 断言失败；R1 |
| node /tmp/huhu-review-061-t09-style-run.mjs --ticket T-09 --matrix standard --out /tmp/huhu-review-061-t09-style | 126 | 同例追加只读 computed style 测量；R1 |
| node /tmp/huhu-review-061-t09-coarse-run.mjs --ticket T-09 --matrix standard --out /tmp/huhu-review-061-t09-coarse | 126 | 24 个 2x/coarse 布局 case 通过，原 exercise 的 Enter 详情超时；R2 |
| node /tmp/huhu-review-061-t09-key-run.mjs --ticket T-09 --matrix standard --out /tmp/huhu-review-061-t09-key | 126 | 1 个末例＋原 exercise，观察 Enter 到达但未产生 click；R2 |
| node /tmp/huhu-review-061-t09-enter-diagnostic-run.mjs --ticket T-09 --matrix standard --out /tmp/huhu-review-061-t09-enter-diagnostic | 0 | 同 1 例，只补回车文本输入，原 exercise 完整通过；诊断，不替代正式门禁 |
| node /tmp/huhu-review-061-t09-undo-probe.mjs | 最终 0 | 实际写入 updater 才过期、owner 重建均拒绝，零写入；首次 ESM bundle 因 YAML 动态 require 不支持而退出 126，补 Node createRequire 兼容后才运行探针，不是业务红灯 |
| node scripts/check-bundle.mjs --budget scripts/bundle-budget.json --enforce --json /tmp/huhu-review-061-t09-bundle.json | 126 | archives 通过、仅 safe 超限，见 I2 |
| design-artifacts.mjs --digest 当前 change DESIGN.md | 0 | 匹配 revision 2 绑定摘要 |
| validate-specdev.mjs --review-scope --repo /home/wta/projects/obsidian-huhu --mode working-tree --base 29644dc5833bb209e6282f84fa71441a5a1b99d4 --file（逐个传 TASK 19 路径） | 0 | 范围/base/head 正确 |
| git diff --check 29644dc5833bb209e6282f84fa71441a5a1b99d4 --（TASK 19 路径） | 0 | 所查差异无空白错误 |

定向 eslint 的实际范围：src/modules/archives/ui/belongings、ui/generic/workbench-page.tsx、services/generic/belongings.ts、services/generic/entities.ts、services/generic/workbench.ts、core/belongings、api.ts、i18n.ts，以及 scripts/ui-review/fixtures/T-09.mjs/T-09.tsx；前述相对 archives 片段均以 src/modules/archives 为根。

来源核对：通过 gh api 只读获取固定提交的 src/belongings/layouts/poster/render.ts，退出 0，实际查看 hero/KPI/chips/年份与排序/卡片结构，确认采用维度与来源登记相符。原始来源：https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/belongings/layouts/poster/render.ts 。界面流程来源头另保留 https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/belongings/ui.ts ，本轮没有新改编或复制上游代码。

本地关键材料（纯路径）：

- /tmp/huhu-review-061-t09-ui/result.json
- /tmp/huhu-review-061-t09-diagnostic/result.json
- /tmp/huhu-review-061-t09-diagnostic/420-en-light-1x.png
- /tmp/huhu-review-061-t09-style/result.json
- /tmp/huhu-review-061-t09-coarse/result.json
- /tmp/huhu-review-061-t09-coarse/420-en-light-2x.png
- /tmp/huhu-review-061-t09-coarse/1440-zh-dark-2x.png
- /tmp/huhu-review-061-t09-key/result.json
- /tmp/huhu-review-061-t09-enter-diagnostic/result.json
- /tmp/huhu-review-061-t09-enter-diagnostic/undo.png
- /tmp/huhu-review-061-t09-enter-diagnostic/conflict.png
- /tmp/huhu-review-061-t09-undo-probe.mjs
- /tmp/huhu-review-061-t09-bundle.json
- /tmp/huhu-review-061-t09-bz-render.ts

未执行全仓 pnpm test、全仓 lint、禁止的仓库构建/样式构建/notices 和真实 Obsidian。真实宿主路由、原生日期控件交互、真实 popout/触屏/IME 与最终生成产物一致性仍待 Lead/用户验收；iframe 仅辅助 Document，文件端口替代真实 vault，不冒称宿主集成通过。

## 问题与下一步

冻结输入无漂移，独立审查已交回。Lead 应局部修正 R1/R2，并处理 I1 的严格 fixture 构建入口；保持原断言，执行原样 48-case standard 矩阵及完整 exercise 后重新冻结复审。I2 的范围外 safe 包体失败另交对应 owner。正式 Evidence/Ticket 不应在上述问题关闭前记本票完整设计验收通过，本报告不修改任何正式状态。
