# 前端设计修订复核（2026-11-05）

## 结论与范围

已按 LOG-012“你直接帮我修改，按你最新的进行修改就好了”完成本 change 的设计、原型、规格与计划修订。初审 F-01–F-15 已落实为下面的具体修改；不再只保留建议。共 15 张票，新增票仍只有 T-15。生产前端、依赖安装、UI 技能源码未在本轮执行，未提交/推送/发布。

设计/文档结构与原型预览检查通过。**实施 Ready 未通过**：新 UI-002 / DESIGN revision 2 尚未取得绑定新字节的具体确认；旧 UI-001 批准保持历史有效，不能覆盖新版。Spec/Map/Goal/Tickets 因此保留 draft，并非生产失败或本轮未修改。

最终绑定：DESIGN revision 2 digest `e000d334488db1a00881baa90c80be68ef81fb7b32d9185fc1722d57eb071205`；UI-002 prototype digest `ecc446a632150bae08e6aadfa04ff2dac0aa633b6af9a3324eefdba6a9a213e1`。

## 初审问题闭环

| 原问题 | 已落实的修订 | 实施责任与证据接缝 |
|---|---|---|
| F-01 任务领域冲突 | 移除任务 project/priority/tags 与隐含 doing；明确 due/planDate/reminderAt/timezone/relations、状态/日期投影与保存竞态 | DESIGN §6/7；Spec AC-043；T-05；原型任务表单/列表/看板 |
| F-02 Git 功能缺口 | 补齐更改/历史/比较、接入/克隆/远端/作者/暂存/提交/拉取推送、独立笔记比较和条件恢复/撤销；本地历史与恢复检查点区分 | T-10、AC-094/095；versioning 新状态；T-13 修正落后于源码的 docs/sync.md |
| F-03 领域入口混合 | 首页内容收件箱、智能体定向投递、系统通知分离；补齐账号/技能/命令/备份/空间；等待回答只定位终端 | T-08/09/11；AC-082；交互入口检查 |
| F-04 表面遗漏 | 枚举 618 个前端源文件；首页 18 widgets + 14 sections 完整目录；真实模块设置和首次启用/宿主贡献使用明确模板 | frontend-coverage.md / frontend-inventory.json；AC-072/114/125 |
| F-05 写集遗漏/冲突 | 补 agent/comments/versioning/icons 独立 styles，ContentPanel、intro、设备选择、panel-host 与状态入口；共享组件排除日期/日历/analytics 子 owner | 各 Ticket frontmatter 与逐文件 owner 校验 |
| F-06 版本未核实 | 官方 registry 查版本、peer、许可；React/DOM 配对、Tailwind/CLI 同版；TypeScript 7 超出 typescript-eslint 支持范围，选 6.0.3；补升级接缝 | reuse-decision.md；T-01–03/08–10；本轮未宣称生产集成通过 |
| F-07 日期类型冲突 | Date/Range/DateTime 三类值明确；时间控件组合、领域时区/DST 与所属 Document；不自写时区引擎 | DESIGN §7；Spec AC-021–024；T-03 |
| F-08 主题边界 | HUHU root/Portal 作用域；保留正文外观；Tailwind/shadcn 别名桥、ANSI/图表/状态/selection 与颜色例外清单；整对对比度回退 | DESIGN §3.4；T-01/12；主题矩阵与真实宿主仍待生产验证 |
| F-09 尺寸冲突 | 中文最低 12px、明确字号档位、32/44 命中区、树行高/虚拟器一致、微间距例外、统一圆角/阅读字阶与 transform/opacity | DESIGN §3/5；UI-002 CSS；T-01/02 |
| F-10 焦点/层级冲突 | 单 Tab 树入口、ARIA mixed/叶节点规则、模态内 F6、逐层 Esc、无默认全局抢键、嵌套浮层递增 | DESIGN §7；T-02/04；原型键盘检查 |
| F-11 验收矩阵不可执行 | T-01 前置 runner 的独立 suite/matrix；模块票独立 fixtures；320–1440 七档，T-14 仅汇总 | Map 原子集成合同与各票命令；当前未实现的参数明确标注为未来接口 |
| F-12 共享切换与逐票构建矛盾 | 明确不可发布的原子集成单元；自身检查必过，尚未迁移消费者错误如实记账；T-13 清零、T-14 全量门禁 | Map §5；Goal G-CONTRACT/G-MODULES/G-FINAL |
| F-13 技能规则冲突 | T-15 独占完整 ui 技能目录；按最终已确认设计、实际模块验收与代码重构五份源；刷新未执行 T-14 的绑定 | ticket/15-ui-skill-contract.md；AC-124；无循环依赖 |
| F-14 原型虚构能力 | safe 不虚构次数，剪贴板清除带内容所有权条件；health 只真实 scope 与两类 repair；移动能力不可用；恢复不承诺无条件撤销 | T-10/11；AC-104；原型失败/不可用/恢复状态 |
| F-15 证据与状态失真 | 原版保留；新 revision/摘要；实际状态数由浏览器 registry 统计；生产/宿主/具体确认分别保留待执行状态 | README、LOG-012、revision 1 快照与本报告 |

## 实际验证

- 原型 JavaScript 语法检查通过：`node --check .../prototypes/UI-002/final/app.js`，退出 0。
- Chrome：12 页、124 个状态，1440/390 两档共 248 个样本；无运行异常、无页面横向溢出、布尔 ARIA 无非法值；受检中文密集标签无低于 12px。状态切换在稳定渲染后取样。
- 21 项交互检查全部通过，含新建任务/非法日期、嵌套 Esc/F6/焦点、智能体收件箱入口、首页 32 项目录与实际添加演示组件、真实字段搜索、Git 分组、有限修复、错误次数、树 Tab、无二级栏窄屏导航、减少动效。
- 35 个额外布局样本覆盖 320/390/600/820/960/1100/1440 × 首页目录/任务详情/智能体表单/Git 更改/版本设置，无页面溢出与模板对象泄漏。
- 已目视检查首页目录、任务详情、智能体收件箱、Git 更改与设置的桌面/窄屏代表截图；不声称逐张人工审阅全部自动截图。
- 最后的颜色修订将 placeholder/计数/行号/步骤标签改用可读的 fg-3，未改变布局或事件。补验纸/墨 × 6 强调色 × 5 种关键前景背景组合，共 60 个对比度样本，全部达到合同阈值；无需重复未受影响的状态/交互测试。宿主第三方主题仍待生产验证。
- `materialize-prototype.mjs --check .../UI-002/design-system.md`：退出 0，3 个源码块与 final 逐字一致。
- `validate-design-package.mjs --check-preview --conclusion-report .../UI-002/design-system.md`：退出 0，资源/候选/源码/设计摘要一致。
- `validate-specdev.mjs --repo <repo> <change>`：退出 0，0 errors；仅有仓库明确采用 conclusion-report 的提示。
- `pnpm test:docs`：退出 0；`git diff --check`：退出 0。
- 清单审计：618 个源文件都存在、都有相符主 owner 写集；47 个 AC 均有责任票；15 张票依赖无结构错误；原 source 与 UI-001 已入库文件逐字未变。

## 尚未通过的门与验证边界

`ticket-control.mjs --map <map> --repo <repo>` 返回退出 126，结构 errors 为空，只有两项预期设计就绪诊断：UI-002 尚未 ready、DESIGN 尚未 approved；eligible 为空。prototype 就绪 stage 同样不通过。不得为了消除诊断把未确认工件标为 approved。

依据 `.agents/speculo/workflows/specdev/specdev-p-prototype/SKILL.md` 第 5 步的明确规则：“缺少批准保持草案或 blocked。”本次直接修改授权用于落实审查取舍；旧批准快照不重写为新版确认。具体预览与 DESIGN revision 2 单独保留，用户无需重新选择已认可的纸/墨方向。

此原型是离线 DOM 演示，布局与代表状态验证不证明生产 React/DayPicker、真实 Git/PTY、密码学、文件持久化、全部模块字段、真实 Obsidian 多窗口/WebView 或第三方主题都已通过。那些是已补齐合同的实施票与 G-FINAL 责任。纯设计文档任务未运行插件 build/test，也未重建 main.js/styles.css。

本地过程材料：/tmp/huhu-frontend-revision/browser-results.json、interactive-results.json、plan-audit.json、versions.json、contrast-results.json 与代表 PNG；历史初审材料：/tmp/huhu-frontend-audit/。不入库过程 JSON、截图或日志。
