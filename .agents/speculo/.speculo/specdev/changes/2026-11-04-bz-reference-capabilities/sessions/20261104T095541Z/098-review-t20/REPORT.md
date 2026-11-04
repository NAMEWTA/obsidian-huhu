# 任务回报

Session: 20261104T095541Z
Task: 098-review-t20
Status: completed

## 聚焦交接

完成 T-20 文档与整体验收候选的独立双轴审查，两轴均为 request-changes，共 3 项 minor。确认一处用户文档事实错误、当前文档门禁仍失败，以及生成产物的 NOTICE 横幅未同步；具体见下文。全部 18 个 bz 署名文件有精确登记，许可/通知清单核对通过；本人另用当前输入重跑八张 UI 票，共 384 组合全部通过。未修改业务文件、冻结 TASK、状态工件或产物，仅写本 REPORT；Lead 修正并重新冻结后复核。

## 审查身份与固定输入

- Reviewer：当前 Codex；未参与本票实现或修复，未委派。Risk: medium；Independence: independent；Strategy: 按文档增量逐项抽查源码 owner 与恢复/隐私边界，独立核对来源/许可和汇总证据，不用文档链接门禁代替行为事实核查。
- 完整读取 098 TASK、T-20、097 REPORT、相关文档增量与新增 health 正文、来源登记/清单和 NOTICE 的变更部分；对照 Spec AC-001/901/902/903、Map/ADR/CONTEXT/Goal Plan。复用本会话已读且适用的 reviewer-contracts/risk-review、domain-runtime、AGENTS、dev 及测试/文档/许可规则；AGENTS/dev 哈希未变。本轮未实现界面，不启用 UI 修改流程。
- 工作区 /home/wta/projects/obsidian-huhu，branch dev，HEAD/base 29644dc5833bb209e6282f84fa71441a5a1b99d4。Input-SHA256：56abc4548a58042a229433ac95ba1839e1742781fc7f14db03c1eb9f5017f8cd。11 个冻结文件在开始、途中、写报告前逐项 SHA-256 匹配，回读后复核。累计 base diff 含前票的已有署名/说明，不把全部累计变化归因于 097。
- LOG.md、源码、main.js 和 UI 结果为任务允许读取的旁证，未改写。当前 main.js SHA-256 73e539c7a9ab3b049252cd9296fb13e38866a30afae243b8061ed077342a970f；styles.css SHA-256 aca17819c7481c8db966f261d0da1dd265c77cf94e56871f0c4b09f339431ec3。

## Standards Axis

Result: request-changes

### F1 — minor：把分卷目标容量误写为“每卷最多 50 篇”

- 位置：docs/navigator.md:249；依据 src/modules/navigator/core/diary-volumes.ts:24、:47，及 ui/diary/DiaryReader.tsx:43。
- 问题：阅读器确实传入容量 50，但 splitVolumes 的合同明确是目标容量，优先保留月份边界，小于容量的整个月不会硬切。因此实际单卷可以超过 50。用户文档的硬上限声明与当前实现及已有测试不符。
- 复现：按倒序生成 2026-02-28 至 2026-01-01 的 59 个日记日期，调用 `splitVolumes(dates, 50)`，实际得到单卷 `[{start:0,end:59}]`，卷内 59 篇。本人物理执行 Node/esbuild 内存探针确认；既有 diary-volumes.test.ts 也明确断言容量 3 可产生 4 篇卷，5 项测试通过。
- 建议：将文字改为目标约 50 篇、优先按月份边界分卷，可能超过目标；保持当前已验收算法，不为迎合错误说明改变业务实现。

### F3 — minor：当前 main.js 横幅仍含旧 bz 采用声明，与冻结 NOTICE 不一致

- 位置：main.js:484；对应 NOTICE:388 与 scripts/esbuild-options.mjs 的 NOTICE banner 输入。
- 问题：冻结 NOTICE 已改为 HUHU 包含登记的改编/交互复刻，但当前 main.js 的 bz 段仍声称初始来源登记未包含 bz 实现。产物未包含本票修改后的手写署名输入，不能以此前 build 退出 0 认定本次 NOTICE 已集成。这是生成物与来源输入一致性问题，不声称 MIT 全文或版权缺失。
- 复现：读取 main.js 的 bz 横幅，仍有 `No bz implementation code is included by the initial source-register change.`；当前 NOTICE 则为 `HUHU includes the selected adaptations and interaction recreations documented in that register` 所在段。按生成器实际仅规范化 CRLF 的规则检查，当前 NOTICE 全文不是 main.js 横幅的子串，差异落在这段更正文案。
- 建议：由 Lead 在最终 NOTICE 固定后串行重建 main.js 并回读核对该横幅；不手改生成文件。本 reviewer 遵守 TASK 禁止构建的限制，仅报告差异。

其余标准轴观察：维护文档保持中文，许可原文/版权保留英文原文。新增能力沿既有主题文档补充，数据归属和恢复说明没有引入第二份人物、物品或日记主库；扫描只读、有限修复、预期哈希、部分提交、未保存编辑器及恢复限制有对应 owner 实现。没有发现本票借文档扩张未实现的 AI/信封/海报导出能力。来源与许可核对结果见后文。

## Specification Axis

Result: request-changes

### F2 — minor：当前 test:docs 仍被 LOG-025 中未转义选择器阻塞

- 位置：.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/LOG.md:370。
- 合同：AC-901 的必需 `pnpm test:docs`；TASK 虽说明旧 REPORT 问题已处理，但本轮实际门禁尚非绿色。
- 复现：本人执行 `pnpm test:docs`，工具返回 126，底层校验失败；唯一报告是 LOG.md 的 unresolved reference link。LOG-025 的问题描述行已使用代码格式，但“事实与来源”行把同一个选择器 `[data-person-id][aria-busy=true]` 写在普通引号内，再次被识别为 Markdown 引用链接。
- 建议：由 Lead 对 LOG-025 该字面量做最小代码格式转义，保持事件事实和旧审查结论不变，然后重跑原文档门禁。不要过滤文件或弱化校验脚本。本路径不在冻结输入，也不在本 reviewer 写集，未修改。

AC 逐项结论：

| 合同 | 本轮判断 |
|---|---|
| AC-001 来源与许可 | 18/18 bz 署名文件有精确登记，固定提交/路径/MIT/版权/适配说明对应；许可原文、清单及 NOTICE 源已保留。生成横幅一致性尚有 F3。 |
| AC-901 整体门禁 | 未满足最终整体通过条件：本轮 test:docs 实际失败 F2，且 NOTICE 源/产物不同步 F3。Lead 提供的其他门禁通过与 native 既有基线失败信息按原性质保留，不冒称本人重跑或当前全部绿色。 |
| AC-902 当前实现文档 | safe、contacts、navigator、data、architecture 和新增 health 六份要求文档全部覆盖，索引亦已更新；F1 是确认的实现事实偏差，需更正。 |
| AC-903 UI 汇总 | 本人使用当前源码/样式重新运行 T-06/07/09/10/12/13/15/19，八票各 48 组合、合计 384，全通过且浏览器 errors 为空；运行后逐一核对其输入图与当前文件无漂移。宿主表现仍按文档标为待用户验收。 |

源码抽查包括：QuickPick 只搜索标题/网址/用户名、结果不携带密码、无结果生成；SafePage 的 favorite 标签和稳定账号详情；人物真实概览/纪事/显式升级与恢复草稿区分；归物事件、条件撤销和年度统计；日记 begin 不写文件、保存准备模板后追加、冲突保留、搜索 partial/complete 与文件失效；health 默认启用、贡献发现不主动激活、按需租约与预算/取消、五分钟新鲜度/计划、锁定保险箱零读取、只检查密文外层、脱敏定位、内存完整报告与持久通知摘要区别；archives owner 的 health-repair.json 登记及哈希保护恢复。除 F1 外未发现这些新增说明与当前对应实现不符。

## 来源与许可终核

- `rg -l yeshimei/bz src` 当前列出 18 文件，全部回读署名头并在 bz.md 找到精确实际路径；完整固定 SHA、MIT、原版权和 HUHU 适配边界均在。覆盖 feedback 2、domain-events 1、file-changes 1、safe UI 3、archives 6、navigator 3、health 2。新增宿主适配、人物 render.ts、年度报告与体检 UI 登记均已覆盖，不以目录名泛指替代实际落点。
- docs/third-party/licenses/sources.json 的 11 个条目逐一核对本地原文 SHA-256，全匹配。通过 gh api 从固定 bz 提交只读取得 LICENSE，与保留的 bz-MIT.txt 逐字节相同，摘要 9fdaddcce3609e5ccec46c1841c61a2e559db82b866394e214dd933e18ddacbb；完整 bz MIT 亦在 NOTICE。
- page-flip.mjs 保留独立 StPageFlip 2.0.7 固定来源、MIT 与 Copyright (c) 2020 Nodlik；NOTICE、references.md 和 bz.md 均保留独立采用说明，不将其归为 bz 许可或 npm 运行时依赖。没有为本票改原许可全文。
- 原始来源：https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/LICENSE；page-flip 固定来源 https://github.com/Nodlik/StPageFlip/tree/ab30ecc1d9f6d98de1a99b8e296469382f41c120。本轮不新增外部采用或实现研究。

## 产物与验证

| 本人执行的命令/检查 | 退出码 | 实际结果 |
|---|---:|---|
| pnpm test:docs | 126 | 校验脚本断言失败，唯一错误 LOG.md:370，见 F2；不将 TASK 所述早先退出 0 作为本轮通过 |
| pnpm test:license-texts | 0 | 3 项许可选择/缺失/摘要正反测试通过 |
| pnpm check:notices | 0 | 当前生成通知清单有效：106 npm packages、73 terminal crates；未写生成文件 |
| pnpm exec vitest run src/modules/navigator/core/diary-volumes.test.ts | 0 | 1 文件、5 项通过；证明现有分卷行为，不能证明文档硬上限成立 |
| Node/esbuild 分卷探针，write:false | 0 | 59 个跨月日期、容量 50，单卷 59，复现 F1 |
| git diff --check -- 本票 11 个冻结路径 | 0 | 无空白错误 |
| bz 署名/登记及 pinned license 摘要核对 | 0 | 18/18 来源覆盖，11/11 本地许可摘要匹配；bz 远端原文匹配 |
| python /tmp/huhu-review-098-ui-matrix.py | 0 | 调用八张票的原始正式 runner，384 组合通过；不修改 fixture、组件或样式 |

UI 调用均为 `node scripts/ui-review/run.mjs --ticket <票号> --matrix standard --out /tmp/huhu-review-098-ui/<票号>`：

| 票 | 状态/组合/错误 | 本轮 inputDigest |
|---|---|---|
| T-06 | passed / 48 / 0 | 55a687a7b7702fabfb1907f7aea5e159f21b0e99226aa140a0ef2aa637cd3380 |
| T-07 | passed / 48 / 0 | 8c23e428c2edc820739ce7f095b61e7544c91dc8636e0265e8acd410f5e1d6b8 |
| T-09 | passed / 48 / 0 | cdfcf6b7c05a4a7d4d38b69624b947a2c306fc08e2e23e0edb6d8b3153793a65 |
| T-10 | passed / 48 / 0 | 03daacb8af29bbf9e784e43103c9544078f8213332ad9a8f5a766335e8bce7c3 |
| T-12 | passed / 48 / 0 | 7228f044d696f54d8e0434aacc8ca652fa741b42ecad0e894828d3c8adbaf0fb |
| T-13 | passed / 48 / 0 | 1293496cb3240eb900bd13015cb4800cc47e3a71fc86ce2c4fd6088a09204c13 |
| T-15 | passed / 48 / 0 | c3bcd97752a7af8771db257d06bbbc25a86d44d1e6c9a8860986fe9523d0c675 |
| T-19 | passed / 48 / 0 | 6334676b0cdb55fd17e31c68ba4994251035ad2d154c17571dd7fd54b63d69b9 |

本地过程材料仅纯路径定位：/tmp/huhu-review-098-ui/summary.json、/tmp/huhu-review-098-ui/<票号>/result.json、同目录截图与各票 .log；未写入 evidence。原始 runner 使用真实 React/Canvas、当前生成样式和 Obsidian ASAR app.css，文件端口为内存；第二 document 是 iframe。384 是票级组合数，不重复计算跨票回归或声称覆盖真实 Obsidian/popout/设备/剪贴板。

## Skill 与未验证边界

dev：沿真实入口、owner、调用方和数据路径核对文档；区分只读索引/报告与持久事务/通知，核对来源、许可与生成物输入；遵守测试选择表，只执行不写仓库的检查和定向浏览器验证。没有运行会写独占产物的 build/build:css/notices，也未安装依赖或执行 Git 写操作。校验脚本临时清单和许可测试夹具仅在系统临时目录，UI 材料仅在 /tmp。

Lead 提供整体 build/lint/architecture/i18n/styles/bundle/safety/workbench 门禁退出 0，以及全量 pnpm test 的 568/573 文件、6 个 native host-editor/control 用例在未改 HEAD 副本同样失败的基线对照。本轮没有重跑或独立复制验证这些整体命令，不将既有 native 失败列为本票新引入缺陷，也不擅自豁免 AC-901 的最终验收记录。纯文档审查不修改业务实现来消除基线失败；宿主表现继续待用户验收。

## 问题与下一步

Lead 一次处理 F1–F3：更正容量文字，最小转义 LOG 字面量并重跑 docs 门禁，在最终 NOTICE 固定后串行重建并核对横幅，再重新冻结复核。源码、UI 当前矩阵与来源/许可的通过证据可复用；只有相关输入变化或新失败才扩大检查。本 REPORT completed 仅表示独立审查交回，两轴尚未批准候选。
