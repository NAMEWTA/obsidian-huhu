# 任务回报

Session: 20261104T095541Z
Task: 028-review-t12
Status: completed

## 聚焦交接

已完成 T-12 独立双轴审查，两轴均为 request-changes，共 3 项 major、2 项 minor。问题为日记根目录改变后显示与打开的文件不同、UI runner 夹具缺少宿主 DOM 接缝、窄容器按钮未达到批准尺寸、navigator 激活预算超限及 bz 页面采用登记缺失。32 项原有定向测试和额外的真实引擎自然完成探针通过；另一个真实路由反例复现了文件身份问题。仅写本 REPORT，未修改业务文件、测试、设计或构建产物；completed 表示审查交回，不表示候选通过。

## 范围与方法

- Strategy: independent；Risk: high；Independence: required。
- Reviewer: 当前承接 `028-review-t12` 的 Codex 会话，未参与本票实现、接线或修复；实际派遣身份由 Lead 核验，不虚构 session ID。
- Implementers: 017-implement-t12、025-implement-t12-route 的实现会话，以及共享路径集成的 Lead。
- Mode: working-tree；base/observed HEAD 均为 `29644dc5833bb209e6282f84fa71441a5a1b99d4`。
- Input-SHA256: `bfd53109190dd7ae49b91b6c4800bd15b7faa3c526a88c21b714f31de290a1f4`（冻结 TASK 标识）。
- 对 TASK 的 17 个固定输入执行 sha256sum 核对并在审查中重复断言，始终匹配。只读 review-scope 用指定 base 和全部 17 个 `--file` 核对实际快照；新增源码与测试读取当前内容，跟踪文件按 base diff 阅读。报告回读时再次核对。
- main/module 中已验收的 T-11 批量列表只复核波及，未重开原票。其余并行任务不作为本票修复范围；safe 的包体超限单独排除归因。

规范来源为当前 Ticket、Spec §4/§7、AC-411–414/AC-001、ADR-002/003、CONTEXT、Map、Goal Plan、README Execution Context；完整读取两份实现交接。应用本会话已读且仍适用的 dev Skill，并完整读取 ui Skill、动效/无障碍、shell、设计系统和 SpecDev design-contract。读取 change DESIGN 的 DIARY-READER 状态/规则、UI-001 final 的 reader/CSS 结构及引用的 DESIGN-0002 基线；重算 DESIGN digest 为 `1e3b5ef5fb4c6ec033ff6a1d9f164a7f3692cc679b71e2d54771c1ea46082c00`，匹配 Ticket revision 2。

影响链：工作台 feature/图标轨 → modulePage → navigator 的 diary 懒加载器 → DiarySurface/DiaryReader → 现有 periodic.list/open 和注入的 Vault.read；翻页 → flip-engine 动态 import → 嵌入 page-flip；样式 → 共享 DesignScope/Button/生成工具类；来源 → 文件头、NOTICE、bz.md。针对文件身份、失效/取消、帧与监听释放、启动闭包、预算、许可、可访问尺寸和必需 UI 验证逐项寻找反例。唯一仓库写入为本 REPORT。

## Standards Axis

Result: request-changes
Reviewer: 当前 TASK 的独立 Codex reviewer
Input-SHA256: bfd53109190dd7ae49b91b6c4800bd15b7faa3c526a88c21b714f31de290a1f4

### R1 — major — 日记根目录变化后，“打开原文”打开另一份文件

- 位置：`src/modules/navigator/ui/diary/DiaryReader.tsx:55` 的列表 effect、第 67–88 行正文缓存，以及第 112 行 open。
- 问题：页面从未订阅 DiaryPort 已提供的 periodic.subscribe。列表、旧路径与正文缓存不会因周期根目录变更而失效；但 open 按日期调用实时 periodic.open，会使用新的根目录。因此可显示旧目录正文，同时把“打开原文”导向新目录的同日期文件。
- 亲自复现：通过 Vitest 内存 transform 在现有 route.dom.test.tsx 的真实 fixture 增加第二根目录的同日期笔记，并只向测试暴露现有 settings 句柄。生产 composeWorkbench/module/runtime/periodic/open 均未替换。先打开 Notes/Journal 的 2026-11-04 并读到 `Fourth day full body`，将 periodicRoot 改为 Different，再点击 Open original。实际观察为：

```text
opened = Different/daily/2026/11/2026-11-04.md
oldBodyStillVisible = true
```

- 反例断言确认真实 openFile 收到 Different 的 TFile，随后因旧正文仍在而失败；1 个探针失败、2 个原有用例仅按名称筛选未选，退出码 126。不是 fixture/编译错误或 timeout。补充笔记预置在内存 Vault，根目录变化通过真实 settings.update，未改写仓库测试。
- 建议修正：订阅所属 journal 的失效通知，配置/文件身份变化时取消旧读取、刷新列表并失效正文缓存；在当前展示 entry.path 与实时 inspect 解析路径不一致时，先禁用/重新定位“打开原文”，不能打开另一份文件却继续展示旧正文。补两根同日期、不同正文的真实路由回归。
- 依据：AC-411 与 DESIGN 要求打开同一周期笔记；页面状态须跟随数据 owner，不能把旧快照与实时写/打开接口混用。

### R2 — major — 本票浏览器夹具没有提供必需的 createDiv 接缝

- 位置：`scripts/ui-review/fixtures/T-12.tsx:15` 创建 docs 及随后 ContainerProviders 挂载处。
- 问题：浏览器主文档和 iframe 均没有安装 Obsidian 的 HTMLElement.createDiv，而真实 Portal adapter 需要 doc.body.createDiv。Vitest 的 scripts/dom-setup.ts 提供了该扩展，所以 DOM 测试通过；独立 Chrome runner 不会加载这个测试 setup。
- 亲自复现：`node scripts/ui-review/run.mjs --ticket T-12 --matrix standard --out /tmp/huhu-review-028-t12-ui`，Chrome 153.0.8010.47。两个文档均抛出 `TypeError: doc.body.createDiv is not a function`，堆栈为 acquirePortalRoot → provider subscription；最终 `Timed out: fixture ready`，0 个矩阵 case，退出码 126。
- 建议修正：在两份文档挂载前提供与其他 ui-review fixture 一致的最小宿主 DOM 扩展，保留真实 Portal/组件实现，再运行完整矩阵及交互。内存编译或 --check preflight 不能替代浏览器执行。
- 依据：本票 required UI runner / Design Conformance 门禁。此项为可修复的夹具缺陷，不是 Chrome 或 Obsidian 环境缺失，也不是页面在真实 Obsidian 中必然抛该错误。

### R3 — minor — 窄容器按钮仍为 36px，批准要求为 44px

- 位置：`src/modules/navigator/ui/diary/DiaryReader.tsx:113` 的 actionClass 及使用它的按钮。
- 问题：`@max-[600px]:min-h-11` 未能覆盖共享 DesignScope 对 Button 的更高优先级 min-height 规则。当前 fine-pointer 的窄容器内，月份、跳转、原文、重试、前后页按钮都仅 36px 高。日期 input 在新工具类下能达到 44px，不能证明按钮也满足要求。
- 亲自复现：先仅在内存给本票 fixture 的两个文档补 createDiv，原样 runner 随即在第一个 420/en/light/1x case 报 accessible target height 36。为排除工作区 styles.css 尚待 Lead 重建的影响，又只在 /tmp 编译当前 Tailwind、应用现有 scopeTailwind 并拼接作者源；以这份审查用样式重复控制运行，仍失败。main 容器宽 373px、iframe 容器宽 538px，按钮均高 36px，input 高 44px。冻结源文件和 styles.css 未改。
- 建议修正：通过本页的容器级命中尺寸 token/项目支持的组合，使窄容器 Button 实际达到 44px；不要仅增加会被共享规则覆盖的工具类，也不要以 !important 或全局改版规避。修复后用浏览器计算尺寸验证两个文档和矩阵。
- 依据：DESIGN revision 2 的 control_narrow=44px、基线命中尺寸和本票 fixture 自身断言。该失败在新生成样式的对照中仍存在，不能仅归为产物未构建。

其余标准检查：未发现 page-flip 常驻 rAF 或全局 CSS 注入残留；生产适配仅动态加载，使用所属 Document/Window，useMouseEvents=false 不建立 legacy touch/mouse 交互路径。原有真实引擎取消/隐藏测试通过；额外内存探针在非零几何夹具下驱动自然完成，确认帧队列归零、临时 DOM 移除、对应 resize listener 被注销。有限 320ms 驱动及 abort 清理没有因此判成缺陷。

## Specification Axis

Result: request-changes
Reviewer: 当前 TASK 的独立 Codex reviewer
Input-SHA256: bfd53109190dd7ae49b91b6c4800bd15b7faa3c526a88c21b714f31de290a1f4

- AC-411：正常路由、日期/月索引、按钮/键盘、恢复与同文件打开的原用例通过；R1 的真实配置变更反例使“同一周期笔记”保证不成立。
- AC-412：宽/窄、减少动效与引擎加载失败的行为测试通过；完整视觉/键盘矩阵未通过 R2，批准尺寸还存在 R3，不能声明 Design Conformance 已完成。
- AC-414：1,000 条 fixture 的有限页面/正文预取、隐藏清理与真实引擎取消测试通过，额外自然完成清理通过。既有 list 无 AbortSignal 的在途扫描仅丢弃结果限制已披露，未把它伪称为真正取消底层读取。
- IN/OUT：已接入 navigator 拥有的工作台页面，保存有界 date 状态；没有新增 Obsidian ViewType、写作/搜索、加密日记或另一份日记数据源。T-11 的列表接线仍由其既有 owner 提供。

### R4 — major — 本票增量使 navigator 激活闭包超过既定预算

- 位置：`src/modules/navigator/i18n.ts:5` 新增 diary 键及 `src/modules/navigator/module.ts:64` 的页面加载器；预算依据为 `scripts/bundle-budget.json` 的 navigator moduleActivationBytes。
- 亲自复现：`pnpm check:bundle` 从当前源码内存构建，navigator activation 为 205520 bytes，预算 203776，超出 1744，退出码 126。同次还报告 safe 超限，该项属于其他在制票，不作为 T-12 finding。
- 归因对照：使用同一 pluginBuildOptions、write:false 和 check-bundle 相同的可达图算法，仅在内存移除 T-12 的 pages loader 与 navigator.diary 新词典行，保留 T-11 列表及其余当前工作区不动。当前值 205520，对照 202927，增量 2593；对照在预算内。对照只用于归因，不是可交付修复，不曾写回文件或修改阈值。
- 建议修正：减少本票同步激活闭包，例如保留导航实际需要的标题键，把其余页面专用词典随页面按需加载；重新验证真实预算及功能。若确需调整预算，须按上游合同说明差异与理由，不能静默提高阈值或用 packages:external 的局部分包数字代替正式检查。
- 依据：AC-413、NFR-001/003 与 Ticket 正式包体门禁。引擎/页面本身保持动态边界，不代表激活字节预算也自动通过。

### R5 — minor — bz 阅读页的实际采用映射仍未登记

- 位置：`src/modules/navigator/ui/diary/DiaryReader.tsx:1`；对应缺失处为 `docs/third-party/bz.md:16` 的逐项登记表。
- 证据：文件头明确采用固定 bz src/diary/render.ts:bookPanelHTML，017 REPORT 也给出待 Lead 汇总的映射，但当前 bz.md 没有 DiaryReader.tsx 或该阅读页条目。审查末次读取仍缺失。已有分卷/反馈/事件条目不能替代阅读页采用范围。
- 复现：核对组件头与 `rg -n 'DiaryReader|diary/render|bookPanelHTML' docs/third-party/bz.md`，无对应命中。
- 建议修正：由 Lead 登记完整 d76a087、上游 render.ts:bookPanelHTML → DiaryReader.tsx、采用方式、React/token/周期身份/年范围/有界预取等偏离及实际验证。既有 bz 原 MIT 全文无需重复生成。
- 依据：本票执行约束及 AC-001 的逐项来源义务。此项不是声称 StPageFlip 许可缺失：已从 page-flip 2.0.7 原 npm 包读取 LICENSE，确认完整原文均包含在 vendor 文件和 NOTICE 中；sources.json 不是为无 npm 运行依赖的每个嵌入副本强制新建空许可覆盖条目。

唯一 findings：major 3（R1/R2/R4），minor 2（R3/R5），blocker 0；跨轴引用不重复计数。

## Design Conformance 与浏览器证据边界

设计引用有效：revision 2、DIARY-READER、digest 与 Ticket 一致。已对照批准的双页/单页、月份/日期入口、同笔记、空日期、错误/隐藏/回退行为，并实际查看 Chrome 窄屏截图。正文采用保留换行的原文文本，未实现 Markdown 富文本/图片分页，这是两份实现 REPORT 已披露的差异，本报告没有把未核定的全部视觉一致性写成通过。

原候选 runner 为 0 case 失败；内存宿主 shim 对照进入 1 case 后暴露尺寸问题；宿主 shim 加 /tmp 新样式的对照仍在同一 case 失败。因此没有完成宽/窄、亮/暗、中/英、缩放与交互全矩阵，也不把对照等同于修复后的候选通过。后续须在修复后的真实 fixture 和 Lead 构建产物上重跑。

本地过程证据（纯路径，未入库）：

- /tmp/huhu-review-028-t12-ui/result.json、failure.png
- /tmp/huhu-review-028-t12-ui-shim-control/result.json、420-en-light-1x.png
- /tmp/huhu-review-028-t12-ui-fresh-css-control/result.json、420-en-light-1x.png
- /tmp/huhu-review-028-styles.css、/tmp/huhu-review-028-tailwind.raw.css

## 产物与验证

环境为当前 dev 工作区 `/home/wta/projects/obsidian-huhu`；浏览器为 Google Chrome 153.0.8010.47。未安装依赖、改 node_modules、提交或发版。

| 命令/检查 | 退出码 | 实际结果 |
|---|---:|---|
| TASK 17 文件 sha256sum 校验及中途 Python 原字节断言 | 0 | 17/17 始终匹配 |
| review-scope：指定 base、working-tree、对 17 输入各传 --file | 0 | 固定范围与 TASK 一致 |
| `pnpm exec vitest run src/modules/navigator/ui/diary src/modules/navigator/module.test.ts src/modules/navigator/core/diary-volumes.test.ts src/modules/navigator/services/periodic-batch.dom.test.tsx` | 0 | 5 文件、32 测试通过 |
| R1 内存 Vitest 真实路由探针 | 126 | 1 项目标行为断言失败；实际新根文件已打开，旧正文仍显示 |
| 真实引擎自然完成内存 Vitest 探针 | 0 | 1 项通过；8 原有项仅按名称未选，验证帧/DOM/resize 清理 |
| 两套 `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` / `tsconfig.test.json` | 均 0 | 生产和测试类型通过 |
| 对本票 diary 五个生产 TS/TSX、vendor mjs、module/i18n、三个 app/shell 注册文件运行 eslint --max-warnings 0 | 0 | 定向生产 lint 零警告 |
| `pnpm test:architecture` | 0 | 1299 模块，无分区/宿主包/桌面边界/barrel/循环违规 |
| `pnpm test:i18n` | 0 | 32 词典、5337 键，引用与占位符匹配 |
| `pnpm test:license-texts` | 0 | 3/3 通过 |
| `pnpm check:notices` | 0 | 生成通知一致：106 npm packages、73 terminal crates |
| `pnpm check:bundle` | 126 | navigator 超预算 1744 bytes；safe 的另票超限单独排除归因 |
| 内存 T-12 移除对照的 bundle 分析 | 0 | navigator 205520 → 202927；本票增量 2593，未改阈值 |
| 原样 `node scripts/ui-review/run.mjs --ticket T-12 --matrix standard --out /tmp/huhu-review-028-t12-ui` | 126 | createDiv 接缝缺失，0 case |
| 内存宿主 shim 浏览器对照；同对照加 /tmp 新样式 | 均 126 | 均进入首个窄屏 case，因按钮高 36 而非 44 失败 |
| DESIGN `design-artifacts.mjs --digest` | 0 | 1e3b5ef5…46082c00，匹配绑定 |
| 原 npm 包许可读取与包含性核对 | 0 | package/LICENSE 完整原文同时保留在 page-flip.mjs、NOTICE |

原包来源为 https://registry.npmjs.org/page-flip/-/page-flip-2.0.7.tgz，固定项目提交为 https://github.com/Nodlik/StPageFlip/tree/ab30ecc1d9f6d98de1a99b8e296469382f41c120。原包模块包含 rAF 调度；冻结副本的 start 不再建立 idle loop，动画由适配器有限驱动。单凭 check:notices 通过不能替代这项嵌入许可与生命周期核对。

所有额外 Vitest 用例经内存 transform 执行，bundle 对照 write:false。浏览器对照仅在内存补宿主接缝；审查用 Tailwind/scoped/拼接样式均输出 /tmp，未调用禁止的 build/build:css/notices，也未改 Lead 的 main.js/styles.css/字体或 build 目录文件。没有把对照当作已落地修复。

未验证：正式插件构建与生成产物集成、修复后的完整 UI 矩阵、真实 Obsidian/触屏/多窗口与完整富文本设计差异仍未通过本轮验收。当前缺陷不以这些边界为由隐藏；原有通过项也不代替失败的预算与浏览器门禁。

## 问题与下一步

审查执行已完成。Lead 应将 R1/R2/R3/R4 分别交由阅读页/验证夹具/激活加载 owner 局部修复，完成 R5 来源集成；保持其他票和冻结 TASK 不动，重新冻结后复审。正式 Evidence/Ticket、共享构建及最终验收由 Lead 维护；本报告不更新这些状态。
