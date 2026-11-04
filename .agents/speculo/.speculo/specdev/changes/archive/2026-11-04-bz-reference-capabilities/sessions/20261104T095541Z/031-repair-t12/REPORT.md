# 任务回报

Session: 20261104T095541Z
Task: 031-repair-t12
Status: completed

## 聚焦交接

已按 028 审查逐项复现并修复 R1–R4，候选交回 Lead，不宣称 Ticket done。日记现在订阅周期服务失效通知，取消旧动画并失效列表/正文缓存，拒绝晚到旧结果，打开原文前再核对当前路径；真实双根目录用例通过。fixture 补齐双文档宿主接缝与 iframe 就绪等待，窄容器通过既有命中 token 达到 44px；最终 Chrome 实跑 48 个矩阵 case 与交互均通过。页面专用词典已延迟加载，navigator 激活大小从 205520 B 降至 203236 B，低于既定 203776 B；整仓包体仍因并行 safe 票超限失败，未越权修复或提高阈值。

## 产物与验证

### 本轮全部修改/新增文件

- src/modules/navigator/ui/diary/DiaryReader.tsx：订阅 periodic.subscribe；以同步 epoch/stale 标记封闭配置变更到 React 提交之间的身份窗口；清理旧列表、缓存及动画，旧列表/正文结果不回填；open 前比较实时 inspect.path 与展示 entry.path。窄容器在页面根设置现有 --nd-hit-size=44px token，Input 去掉压回 36px 的 min-h 工具类；页面模块加载时注册专用词典。
- src/modules/navigator/ui/diary/DiaryReader.dom.test.tsx：新增实时 inspect 路径不一致时拒绝 open，以及失效后丢弃晚到正文、重读并在卸载释放订阅的两项回归；原有八项断言保留。
- src/modules/navigator/ui/diary/route.dom.test.tsx：真实内存 Vault 预置第二根同日期笔记，暴露已有 settings 句柄的根目录更新动作；新增真实配置切换后显示与打开同一新路径、旧正文消失和零写入回归；原有两项不变。
- src/modules/navigator/i18n.ts：页面专用 22 组 en/zh 键移出同步激活词典，保留图标轨实际需要的 navigator.diary.title。
- src/modules/navigator/ui/diary/i18n.ts（新增）：原有 22 组页面词典，文案及占位符不变，随 DiaryReader 加载。
- src/modules/navigator/ui/diary/i18n.test.ts（新增）：专用词典 en/zh 键、非空文案与占位符一致性，以及 eager 只保留日记标题的回归。现有语言门禁不发现此子目录，故以此实际测试补齐覆盖，未修改门禁脚本或测试全局词典加载器。
- scripts/ui-review/fixtures/T-12.tsx：挂载前等待 iframe 的实际文档就绪，为两份文档各自的 HTMLElement.prototype 提供最小 createDiv；保留真实 Portal/React 组件。inspect 按日期返回正确文件，配合生产身份核验。
- scripts/ui-review/fixtures/T-12.mjs：保留尺寸、溢出与状态断言；加强方向键后实际日期的等待断言，打开原文核对对应日期、create:false 和内存 Vault 零写入。
- 本 REPORT.md：一次性交回事实。

未改 module.ts/manifest、app/shell 路由、API、core、services、公共组件/样式、package/lock、NOTICE、sources.json、预算、main.js/styles.css、正式 Evidence/Ticket、旧 REPORT 或冻结 TASK。未改 docs/third-party/bz.md，已只读确认 Lead 的 R5 条目包含 bookPanelHTML → DiaryReader.tsx、固定 d76a087、采用方式及偏离。没有新增上游复制，既有文件头署名、MIT 与嵌入 page-flip 副本原样保留。

### R1–R4 红→绿与关键决定

| Finding | 红灯 | 修复与绿灯 |
| --- | --- | --- |
| R1 major | 真实 route 用例切换 periodicRoot 后找不到 Different root body，仍显示旧根正文；3 项中仅新增项失败，退出 126 | 服务通知同步增加 epoch 并标为 stale，清空旧身份投影，中止旧动画，重新 list/read；旧异步结果通过 epoch 与 effect active 双重校验丢弃。open 额外比较实时 inspect 的 status/path，避免展示旧文件却打开另一文件。真实新根正文、路径和无写入断言通过 |
| R2 major | 原样 runner 0 case，createDiv 缺失，退出 126；首次补接缝又发现 iframe body 尚未就绪，仍 0 case，退出 126 | 在 iframe 实际 load 完成后安装两个 realm 的最小宿主扩展，再挂载真实组件；最终 runner 48 case、0 浏览器运行时错误，通过 |
| R3 minor | R2 接缝修好后 runner 首个 case 的 Month index 高 36px，退出 126；仅修按钮后，Input 仍 36px，退出 126 | 在已测量宽度 <600 的页面根赋值既有 --nd-hit-size token，供共享高优先级规则消费；移除 Input 固定 min-h 覆盖。没有 !important、全局规则或共享组件改版。最终 main 的 32 个窄 case、other 的 48 个窄 case，所有受测按钮/input 最小高度均为 44px |
| R4 major | pnpm check:bundle：navigator activation 205520 >203776，超 1744，退出 126（同时存在另票 safe 超限） | 页面词典随 UI 模块按需注册，标题保留 eager；现有页面/引擎动态边界未改。正式 check-bundle 内存分析得 navigator=203236，低于 203776，余量 540；未改 scripts/bundle-budget.json。整仓 enforce 仍因 safe 单项失败，如实保留 |

服务失效清除的是已失效的文件身份投影；用户主动重试且无 owner 失效时，原有“保留有效正文、持续错误和重试”行为仍由既有测试承接。配置/文件变化期间停止新的旧身份正文读取；底层 list API 无 AbortSignal 的限制不变，只丢弃过期结果，未声称取消既有内部扫描。依然仅调用周期服务 open(create:false)，不建第二份数据源。

R3 使用的是既有 CSS 自定义属性，不注入新的 CSS 规则。现有宽度测量决定 narrow；属性位于本页根，后代 Button/Input 消费项目命中规则，不影响其他页面、Portal 或全局样式。R4 的注册发生在按需加载的 DiaryReader 模块，而非 navigator 同步模块，符合本 TASK 对页面专用词典延迟的明确要求；生产图标轨标题继续可用。

### 实际命令与退出码

| 命令/检查 | 退出码 | 结果 |
| --- | --- | --- |
| pnpm exec vitest run --project dom src/modules/navigator/ui/diary/route.dom.test.tsx（R1 修复前） | 126 | 1 失败、2 通过，新增真实根目录变化回归红灯 |
| pnpm exec vitest run --project dom src/modules/navigator/ui/diary（R1 修复后） | 0 | 当时 11 项通过 |
| pnpm exec vitest run src/modules/navigator/ui/diary（新增并发/词典回归后） | 0 | 3 文件、14 项通过 |
| pnpm exec vitest run src/modules/navigator | 0 | 最终 52 文件、553 测试通过；原有 YAML 异常标签夹具警告不影响结果 |
| pnpm exec vitest run --project dom src/modules/navigator | 0 | 最终 10 文件、108 项通过，含宽窄/回退/1000 条/真实引擎取消/真实路由与本次失效回归 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json | 0 | 生产类型通过 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json | 0 | 测试类型通过 |
| pnpm exec eslint src/modules/navigator/ui/diary src/modules/navigator/i18n.ts scripts/ui-review/fixtures/T-12.tsx scripts/ui-review/fixtures/T-12.mjs --max-warnings 0 --no-warn-ignored | 0 | 定向 lint 通过 |
| pnpm exec eslint src/modules/navigator/ui/diary src/modules/navigator/i18n.ts src/modules/navigator/module.ts src/modules/navigator/module.test.ts scripts/ui-review/fixtures/T-12.tsx scripts/ui-review/fixtures/T-12.mjs --max-warnings 0 --no-warn-ignored | 0 | 最终扩大到相关加载器，零警告；沿用配置对忽略文件的处理，未关闭规则 |
| pnpm test:architecture | 0 | 1300 模块，无分区、宿主包、桌面边界、barrel、循环违规 |
| pnpm test:i18n | 0 | 32 个标准词典、5315 键；另 22 个延迟键由 i18n.test.ts 覆盖双语与占位符，未删除文案 |
| pnpm test:license-texts | 0 | 3 项通过 |
| pnpm check:bundle（修复前） | 126 | navigator 与 safe 超限，具体数值见上 |
| pnpm check:bundle（修复后） | 126 | navigator 已在预算内；仅 safe activation 471074 >68608，属于并行票，未修改 |
| node scripts/check-bundle.mjs --budget scripts/bundle-budget.json --json /tmp/huhu-031-t12-bundle.json | 0 | write:false 正式内存分析；未带 enforce，仅输出真实数据，不将退出 0 冒充整仓预算通过 |
| node --input-type=module：读取上述 JSON 与原预算，assert(report.modules.navigator.activation <= budget.moduleActivationBytes.navigator) | 0 | 203236 <=203776，margin 540 |
| node scripts/ui-review/run.mjs --ticket T-12 --matrix standard --out /tmp/huhu-031-t12-red | 126 | 修复前 createDiv，0 case |
| 同命令，--out /tmp/huhu-031-t12-hit-red | 126 | 中间稿 iframe body 未就绪，0 case，随后修正真实就绪等待 |
| 同命令，--out /tmp/huhu-031-t12-hit-red2 | 126 | 接缝修好，首个 case 暴露按钮 36px |
| 同命令，--out /tmp/huhu-031-t12-green | 126 | 按钮已修好，首个 case 继续暴露 input 36px |
| 同命令，--out /tmp/huhu-031-t12-green2 | 0 | 48 case 与原交互通过 |
| 同命令，--out /tmp/huhu-031-t12-final | 0 | 加强键盘日期/原文身份断言后最终复跑：48 case、0 errors，全部交互通过 |
| node --check scripts/ui-review/fixtures/T-12.mjs | 0 | fixture 脚本语法通过 |
| node .agents/speculo/workflows/specdev/common/tools/design-artifacts.mjs --digest .agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/DESIGN.md | 0 | digest 1e3b5ef5fb4c6ec033ff6a1d9f164a7f3692cc679b71e2d54771c1ea46082c00，不漂移 |
| git diff --check -- src/modules/navigator/i18n.ts src/modules/navigator/ui/diary scripts/ui-review/fixtures/T-12.tsx scripts/ui-review/fixtures/T-12.mjs | 0 | 已跟踪差异无空白错误 |

### Design Conformance 候选与浏览器边界

页面 DIARY-READER，DESIGN revision 2，digest 1e3b5ef5fb4c6ec033ff6a1d9f164a7f3692cc679b71e2d54771c1ea46082c00，AC-411–414。继承原版式、语义 token、共享控件和 bounded pages；本轮只修身份失效、宿主接缝、批准命中尺寸和按需词典，没有重新选择风格。

最终实际浏览器为 Google Chrome 153.0.8010.47。48 个 case 覆盖 420/600/1440、en/zh、light/dark/user-light/user-dark、1x/2x，2x 同时 reduced-motion/coarse pointer；每 case 观察主文档与 iframe 所属容器，校验单/双页、有界节点、长文本无横向溢出、输入 label 及控件命中尺寸。交互覆盖 month-index、calendar 空日期、keyboard-reduced-motion 的实际下一页日期、打开同日原文且 create:false/零写入、hidden 无页、error、loading、unmount。default/next-page/calendar/month-index/empty-date/fallback/hidden/error/loading 状态中，fallback 引擎失败由实际 DOM 测试承接，浏览器矩阵没有伪造引擎加载失败。

亲自查看了窄屏英文亮色及宽屏中文暗色截图，确认单页/双页结构、长文本换行与 44px 控件呈现。过程材料仅在本地：/tmp/huhu-031-t12-final/result.json 及同目录截图；预算分析 /tmp/huhu-031-t12-bundle.json。不放入 evidence，不把这些过程材料当作正式 Evidence。runner 使用仓库现有 Lead-owned styles.css，SHA-256 fb27176b7000e27bfbd526d884c4d106dee26e66d5534d4fca4d741026eb7eb8，本执行者未构建或改写它。本轮无需新增 CSS 工具类产物；正式 Lead 重建后的最终产物矩阵仍须由 Lead 再验，不能把本轮执行冒称为 Lead 已重建/已验收。

原先已披露的正文纯文本投影、按年范围、底层 list 无 AbortSignal 的差异不变；Markdown 富文本/图片分页、真实 Obsidian/触屏/多窗口仍不在本执行者已验证结论内。没有新增 T-13 搜索/写作功能。

### Skill Execution Records

完整读取并应用 dev/ui；Work/预检、域运行、Map/Spec/ADR/CONTEXT/Goal 与批准设计沿用本会话已读且适用的合同，本轮冻结 TASK 和 028 review 完整读取。项目 Skill 绑定 dev d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e、ui 123781b61a8bd3b40af9ff6161b1dc981c446f13c2ef3b2f49995630cd2f2c44。

| 实际规则 | 本轮应用 |
| --- | --- |
| dev 1/2、ui 页面归属 | 保留既有 ReactSurface/工作台页面，不新增 ViewType；不跨模块内部导入，架构通过 |
| dev 3 | 页面 22 组词典与注册移至动态 UI 闭包，标题留给导航；使用正式包体算法验证，不拿 external 模拟替代预算 |
| dev 4、ui 1/2 | 订阅 owner 失效并返回解绑，epoch 防止旧异步结果回填；通知时中止翻页；卸载、隐藏与真实引擎清理回归通过 |
| dev 5/6、ui 状态归属 | 沿用 settings 和周期文件身份，不新增设置/数据格式；真实配置更新和 Vault 写 API spy 验证浏览零写入 |
| dev 7 | 所有既有文案仍 t()、en/zh；专用词典实际加载与独立一致性测试承接，标准语言门禁通过 |
| dev 8/9 | 生产代码不引入 Node/Electron；最终定向 lint/类型通过，没有关闭规则、放宽断言或接管其他票 |
| dev 范围/许可 | 仅写授权路径，不改预算/生成产物/旧回报；无依赖安装、无新复制外部代码，保持原署名和许可，R5 只读确认 |
| ui 3 | 每个文档在自己的 HTMLElement prototype 安装 fixture 接缝，等待实际 iframe 文档；不替换真实 Portal adapter |
| ui 4/5 | 复用 Button/Input/DesignScope 与已有命中 token，属性只在本页根传递；不写全局样式、不使用 !important 或新色值 |
| ui 6/7/8 | 保留真实语义控件/标签/措辞，浏览器实际量测窄容器 44px；强化方向键日期断言，reduced-motion 和原文身份验证通过 |
| 验证/设计 | 每项 finding 先有实际红灯再修复；运行实际 Chrome 矩阵与查看截图，不以 mock/预检代替；正式独立审查与构建仍归 Lead |

### 本轮源码摘要（SHA-256）

- DiaryReader.tsx：156c3eff2f936d11dbaf5dfcaa296c30c8881d08bb9f5525347517993e4fe8dd
- DiaryReader.dom.test.tsx：b5a86477c9a3b1f1f2772da9475c5f2b4b718b8400cb11a0cdc50e816e45b694
- route.dom.test.tsx：a7930c849d6fe0a83039366f463c3e87a46b3d6a56b530d6df12155b29eaa304
- ui/diary/i18n.ts：80e9524b810a60c8efb4c2c5f1a7964887f48c1766cefcdea1bff8e4ec7ad014
- ui/diary/i18n.test.ts：8bf8731c69c7f2b180d4db6ca4be1749123e76f882b94b515e136368081f4d27
- navigator/i18n.ts：34426b374bff636c7eb840d48ed4c8ab98252564cd313d6ec8b6089181295355
- fixtures/T-12.tsx：971b10d171b2cddae2b6c235f077c4033b2594d9acb0e94c2f3ae11c960f02c5
- fixtures/T-12.mjs：fb321bc2f88a55062d1953a99824c004246382cc4ed300102449bf08441f53a5
- 只读预算 scripts/bundle-budget.json：3f493b4d96748d19edba72f1fef18c96d27f305a2cc59aa8a4df0520488aea55；无本轮差异。

## 问题与下一步

本轮无自身未修复 finding/写集阻塞；completed 仅为修复候选交回。整仓 pnpm check:bundle 尚未通过，唯一失败为 safe activation 471074 >68608，由并行 safe owner/Lead 处理；未隐瞒、跳过或改阈值换绿灯。navigator 的正式预算已单独以原预算断言通过，余量 540 B，后续共享输入变化应重新检查。

pnpm run build、pnpm run build:css、pnpm check:notices：“未执行，owner Lead”；本轮已按修复 Inputs 特别允许执行内存 check:bundle 与实际 UI runner，上述不是未执行项。Lead 仍须串行构建最终产物、重跑最终 UI 矩阵/全仓包体/全仓 lint，并安排真正独立双轴复审，之后才写正式 Evidence/Ticket 状态。未提交、未推送、未发版，不等待交互回答。
