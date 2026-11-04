# 任务回报

Session: 20261104T095541Z
Task: 035-rereview-t12
Status: completed

## 聚焦交接

已完成 T-12 独立复审，标准轴与规范轴均为 pass；028 报告的 R1–R5 均已关闭，未发现新的可操作 findings。亲自执行的 36 项定向测试与 Chrome 48 项矩阵通过，navigator 激活体积为 203236 bytes，低于原预算 203776 bytes。正式 `pnpm check:bundle` 仍退出 126，唯一超限项为其他票的 safe 模块，不能将全局门禁记为通过。仅写本 REPORT，未改业务文件、TASK、正式 Evidence、Ticket、构建产物或 Git 状态；completed 表示复审交回，最终业务验收由 Lead 负责。

## 范围与方法

- Strategy: independent；Risk: high；Independence: required。
- Reviewer: 当前承接 035-rereview-t12 的 Codex 会话，未参与实现或修复；不虚构宿主会话 ID。
- Implementers: 017-implement-t12、025-implement-t12-route、031-repair-t12 及共享路径集成 Lead。
- Mode: working-tree；base: 29644dc5833bb209e6282f84fa71441a5a1b99d4。
- Input-SHA256: d8ac2cfe41b39029478f62cb72acb396a9c56bcf80c5a6d83f04c6781a3f43c8。
- TASK 全文已读。20 个冻结文件在开始、中途、报告写入前核对均匹配；回读报告时再次核对。未把其他执行者的无关 dirty 改动纳入本票。

按 reviewer-contracts、risk-review、domain-runtime 进行双轴复审；复用本会话已读且仍适用的 AGENTS/dev/ui 规则，结合当前 Ticket、Spec AC-411–414/AC-001/NFR-001/003、Map、ADR、CONTEXT、Goal Plan 与批准设计检查。完整读取 028 审查和 031 修复交接，对实际修复重新执行验证，不以修复者自报替代实测。

影响链覆盖工作台导航与 date 状态 → navigator diary 懒加载 → DiaryReader → periodic.list/inspect/open 与只读 Vault.read → flip-engine/page-flip，以及词典、尺寸 token、浏览器夹具和许可登记。重点复核文件身份、异步失效、隐藏/卸载、有限预取、加载边界、预算、双语和来源。

## Standards Axis

Result: pass
Reviewer: 当前 TASK 的独立 Codex reviewer
Input-SHA256: d8ac2cfe41b39029478f62cb72acb396a9c56bcf80c5a6d83f04c6781a3f43c8

Findings: 无新增 blocker、major 或 minor。

| 原 finding | 复核证据与结论 |
|---|---|
| R1：根目录切换后正文与打开文件不一致（major） | 已修复。DiaryReader.tsx:61 订阅 periodic 失效，立即递增 epoch、取消翻页并清空列表/正文缓存；列表与正文异步结果均校验 generation 和 effect 存活状态。第 129 行额外核对实时 inspect.path 与展示 entry.path，避免打开身份不匹配的文件。真实 route 回归通过 settings.update 从 Notes/Journal 切至 Different，旧正文消失、新正文出现、openFile 收到新根同日期 TFile，写 API spy 为零；迟到旧正文和退订测试也通过。 |
| R2：浏览器夹具缺失 createDiv（major） | 已修复。T-12.tsx:15 起等待 iframe 文档就绪，并在主文档/第二文档各自 HTMLElement 原型安装最小 createDiv 接缝，再挂载真实 ContainerProviders/DiaryReader。本轮原样运行 runner，无额外内存 shim，48 cases 通过、errors 为空。 |
| R3：窄屏按钮仅 36px（minor） | 已修复。DiaryReader.tsx:133 在窄容器设置既有 --nd-hit-size 为 44px，不改全局规则。Chrome 矩阵对两个文档逐个测量 button/input，窄容器最小高度均为 44px；截图也已人工查看。 |

生命周期与安全复核：失效后的在途结果不会回灌旧缓存，卸载释放订阅，隐藏/窄屏/reduced-motion 会中止动画；引擎失败回退保留按钮和键盘。缓存仅保留当前位置所需的有限正文，React 文本节点不执行正文 HTML。没有增加写作、第二份日记存储或跨模块实现直连。

flip-engine、page-flip、route 接线、NOTICE 和 sources.json 与 028 冻结快照逐字节相同；原审查的自然完成/resize 释放探针和原包许可比对结论在这些输入上继续有效。本轮另亲自重跑真实引擎 abort/隐藏、规模和路由测试，并读查有限 320ms 驱动及 ownerDocument/ownerWindow 清理。未把未重跑的自然完成探针记作本轮新执行。

## Specification Axis

Result: pass
Reviewer: 当前 TASK 的独立 Codex reviewer
Input-SHA256: d8ac2cfe41b39029478f62cb72acb396a9c56bcf80c5a6d83f04c6781a3f43c8

| 合同 | 本轮结论 |
|---|---|
| AC-411 | pass。宽容器双页、前后页/方向键、月份、日历跳日及打开同一现有周期笔记均有 DOM/真实路由与浏览器证据；新增根目录切换反例现已通过。空日期浏览不创建文件。 |
| AC-412 | pass。窄容器单页、reduced-motion 跳过引擎、引擎加载失败后的无动画回退通过；浏览器验证键盘实际改变日期，日期输入内方向键不劫持为翻页。 |
| AC-413、R4 | 本票修复通过。页面仍由 modulePage 动态加载，引擎仍通过动态 import 加载；22 个页面专用双语键移至 diary/i18n.ts，仅导航标题保留在激活词典。正式内存构建测得 navigator activation 203236 bytes，预算 203776，余量 540；原失败值 205520，减少 2284。启动闭包 133986 bytes/106 inputs，低于 135168，未包含 diary UI 或 page-flip。预算文件 SHA-256 为 3f493b4d96748d19edba72f1fef18c96d27f305a2cc59aa8a4df0520488aea55，与修复交接一致，无放宽阈值。全局门禁仍有下述 safe 失败，整体 change 的 AC-413 门禁须由 Lead 保留待处理。 |
| AC-414 | pass。1,000 条 fixture 的页面数不超过 2、每位置正文读取不超过 4；隐藏时页面归零、停止追加预取。真实引擎取消和隐藏测试确认待执行 rAF 归零、临时 DOM 清除。列表端口没有 AbortSignal，已有底层在途 list 不会被真正中断；本页隔离并丢弃失效结果，不将这一点宣称为底层取消。 |
| AC-001、R5 | pass。bz.md:26–27 已补阅读页和独立 page-flip 来源。读取固定 bz 提交 render.ts 的 bookPanelHTML，确认书桌/书本/StPageFlip/月历来源描述与实际上游结构相符；对应 DiaryReader 文件头、React/token 重写、周期笔记身份及排除贴纸/信封/撕页/字体的说明准确。StPageFlip 独立固定提交/2.0.7/MIT、嵌入修补、动态加载、去 idle rAF/CSS 注入及所属文档窗口修改与代码相符；完整许可和 NOTICE 输入与原审查一致。 |

R4、R5 关闭。IN/OUT 与写集检查未发现偏离：仍为 navigator 工作台页面，date 状态有界，打开 owner 的同一周期笔记，没有新 ViewType、搜索写作或加密日记实现。本轮不修改任何共享路径。

来源核对：固定 bz 原始文件为 https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/diary/render.ts （本轮通过 gh Contents API 只读获取，bookPanelHTML 第 596 行起）。独立引擎固定来源为 https://github.com/Nodlik/StPageFlip/tree/ab30ecc1d9f6d98de1a99b8e296469382f41c120 ，原包为 https://registry.npmjs.org/page-flip/-/page-flip-2.0.7.tgz；本轮原包许可比对复用 028 对同哈希 vendor/NOTICE 的证据，未声称重新下载原包。

## Design Conformance

设计绑定：change DESIGN revision 2，DIARY-READER，digest 1e3b5ef5fb4c6ec033ff6a1d9f164a7f3692cc679b71e2d54771c1ea46082c00；本轮重算匹配 Ticket。已对照 DESIGN、UI-001 final/design-system 与 DESIGN-0002 的相关布局、命中尺寸、状态、语义 token 和动效规则。

真实 Chrome 153.0.8010.47 标准矩阵 48 cases 通过，覆盖宽/窄、亮/暗、中/英、缩放和第二文档；运行了月份、空日期零创建、键盘/reduced-motion、打开原文、隐藏、错误/加载/卸载交互。原样使用当前 fixture 与 styles.css，未替换业务实现或注入绕过尺寸的审查补丁。两个文档的窄容器控件最小高度均为 44px，无横向溢出，页面数有界。

人工查看 420-en-light-1x 与 1440-zh-dark-1x 截图：窄屏单页与工具栏换行、宽屏双页、文本换行和明暗 token 表现符合已核验规则。此结论限于本次组件矩阵；没有宣称逐像素一致或真实 Obsidian 真机通过。正文继续以保留换行的原文文本显示，未实现 Markdown 富文本/图片分页；这是原审查和实现交接已披露、此次未改变的范围边界。

## 产物与验证

仅产物：本 REPORT。命令均在指定工作区运行，未安装依赖、运行禁止的 build/build:css/notices，未执行 Git 写操作。

| 亲自执行的命令/检查 | 退出码 | 结果 |
|---|---:|---|
| TASK 冻结输入 SHA-256 核对 | 0 | 20/20 匹配，审查中重复核对 |
| pnpm exec vitest run src/modules/navigator/ui/diary src/modules/navigator/module.test.ts src/modules/navigator/core/diary-volumes.test.ts src/modules/navigator/services/periodic-batch.dom.test.tsx | 0 | 6 文件、36 测试通过（含新增词典、根目录切换、迟到正文回归） |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json | 0 | 生产类型通过 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json | 0 | 测试类型通过 |
| pnpm exec eslint src/modules/navigator/ui/diary src/modules/navigator/i18n.ts src/modules/navigator/module.ts src/app/contracts/workbench.ts src/app/workbench/compose-workbench.ts src/shell/navigation-state.ts scripts/ui-review/fixtures/T-12.tsx scripts/ui-review/fixtures/T-12.mjs --max-warnings 0 --no-warn-ignored | 0 | 定向 lint 零警告 |
| pnpm test:architecture | 0 | 1303 模块，无分区/宿主包/桌面边界/barrel/循环违规 |
| pnpm test:i18n | 0 | 32 词典、5315 键一致；懒加载的 22 个 diary 键另由 i18n.test.ts 验证双语、占位符及仅标题留在激活词典 |
| pnpm test:license-texts | 0 | 3 测试通过 |
| pnpm check:notices | 0 | 106 npm packages、73 terminal crates 的通知一致 |
| pnpm check:bundle | 126 | navigator 在预算内；仅 safe activation 471074 > 68608，超 402466 bytes，属其他票；全局失败如实保留 |
| node scripts/check-bundle.mjs --budget scripts/bundle-budget.json --json /tmp/huhu-review-035-t12-bundle.json | 0 | 补充导出精确字节数据；此命令未带 --enforce，退出 0 不代表全局预算通过 |
| node scripts/ui-review/run.mjs --ticket T-12 --matrix standard --out /tmp/huhu-review-035-t12-ui | 0 | Google Chrome 153.0.8010.47，48 cases、errors=[] |
| DESIGN design-artifacts --digest | 0 | 与 Ticket revision 2 digest 一致 |
| git diff --check -- src/modules/navigator/ui/diary src/modules/navigator/i18n.ts scripts/ui-review/fixtures/T-12.tsx scripts/ui-review/fixtures/T-12.mjs | 0 | 所查差异无空白错误 |
| 固定提交 gh Contents API 来源读取与 bookPanelHTML 检查 | 0 | 阅读页采用映射准确 |

本地过程材料（纯路径，不入库）：

- /tmp/huhu-review-035-t12-bundle.json
- /tmp/huhu-review-035-t12-ui/result.json
- /tmp/huhu-review-035-t12-ui/420-en-light-1x.png
- /tmp/huhu-review-035-t12-ui/1440-zh-dark-1x.png

未验证：正式插件构建/最终生成产物集成、真实 Obsidian 启动/触屏/真实弹出窗口；这些不以组件 iframe 验证冒充。全量 lint/全量测试未运行，采用本票风险相关定向验证。真实宿主项目按 Spec 保留待用户验收；生成产物及全局包体失败由 Lead 集成处理。

## 问题与下一步

T-12 本轮无待修复 finding，R1–R5 全部关闭。Lead 可据本报告推进 T-12 候选验收，同时继续处理 safe 的全局预算失败并执行自己负责的串行构建/产物集成；不能将本报告的 scoped pass 转写成全 change 门禁全部通过。本报告不更新正式 Evidence、Ticket 或 change 状态。
