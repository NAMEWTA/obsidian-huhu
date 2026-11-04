# 任务回报

Session: 20261104T095541Z
Task: 073-rereview2-t07
Status: completed

## 聚焦交接

T-07 第二次独立复审完成，两轴均为 pass，F3 已关闭，F1/F2 未回退，无本票待修 finding。亲自原样执行正式 runner 的 48-case 矩阵与完整 exercise，并原样重跑 065 的受限高度反例脚本，均通过；四个动作逐一滚动后完整可见、中心可命中，无 hidden 祖先平移。safe 193 项、生产类型、定向 lint 与原包体门禁通过；全仓测试类型检查在范围外新增 person-journal.test.ts 报错，作为集成事项交 Lead，未冒称全仓绿色。仅写本 REPORT，completed 表示复审交回，正式 Evidence/Ticket、统一产物及宿主验收仍由 Lead 处理。

## Review

- Strategy: independent；Risk: medium；Independence: required。
- Reviewer: 当前承接 073-rereview2-t07 的 Codex 会话，未参与本票实现或修复；实际派遣身份由 Lead 核验，不虚构会话 ID。
- Implementers: 原 T-07 实现者、062-repair-t07、068-repair2-t07 及共享路径集成 Lead。
- Mode: working-tree；current/dev；base_sha / observed_head：29644dc5833bb209e6282f84fa71441a5a1b99d4。
- Input-SHA256: 78ef0e8fe3def2ba5e2e528472c14bba9c3f38591e1c5f4547913506608de4b1（TASK 给定）。
- TASK、068 修复交接全文已读，复用此前完整读取的 060/065 报告。8 个冻结输入开始、中途、报告前均匹配，回读再次检查；review-scope 明确选择 8 个路径与指定 base/head，不扩大到其他票 dirty 文件。

依据已读且仍适用的 Ticket、Spec §2 / AC-211–214、DESIGN revision 2 / SAFE-WORKSPACE、批准 UI-001 final、Map/Goal/ADR/CONTEXT，以及 AGENTS/dev/ui、reviewer-contracts/risk-review、运行/范围/设计/测试合同。AGENTS、dev、ui 摘要与既有已读版本一致，分别为 a65261ca…、d217057f…、123781b6…；design digest 重新核对匹配 Ticket。

相对 065 仅 SafePage.tsx、AccountDetail.tsx 和 T-07.mjs 三文件改变，其他五文件完全相同。重新读取布局与完整夹具，沿工作台有限高度槽位 → SafePage → workspace → AccountDetail 主体/操作区复核；选择、稳定 ID、关系、编辑及服务/秘密清理链沿用前轮已读源码，并以本轮回归检查。

## Standards Axis

Result: pass
Reviewer: 当前 TASK 的独立 Codex reviewer
Input-SHA256: 78ef0e8fe3def2ba5e2e528472c14bba9c3f38591e1c5f4547913506608de4b1

无待修 blocker、major 或 minor。以下为前序 findings 的关闭证据。

### F3 已关闭：实际视口及短分屏内全部操作可通过正常滚动访问

SafePage 改用 overflow-y-auto，workspace 保留 min-h-64 / shrink-0；窄屏返回区进入详情主体滚动区，不再额外占不可收缩头部。操作栏仍独立于详情正文，但限制 max-h-40 并允许 overflow-y-auto；保留原文字、字段、动作与命中尺寸，没有靠缩小控件或隐藏入口消除反例。

正式 fixture 已从固定 900px 改为 `calc(100dvh - 32px)`，与共享 runner 的 body padding 对应。保留原几何、字段、长备注、键盘、秘密和复制断言，追加逐动作的完整可见区域/中心命中检查；可见区域计算包含 viewport 与所有 overflow 裁切祖先，并拒绝 scrollIntoView 暗中平移 hidden/clip 祖先造成的假通过。

亲自原样运行当前共享 runner：48 cases passed、errors=[]。384 次逐动作检查均完整落在当时有效可见区域内、hit=true、hiddenScrolled=false，矩阵根横向最大溢出为 0，coarse 动作最低高度为 44px。exercise 额外限制承载为最多 320px，在两个 Document 上逐动作检查通过并实际截图。

按 TASK 要求，另原样重跑 /tmp/huhu-review-065-t07-height-run.mjs，输出写入新的 /tmp 目录，未修改旧脚本。该脚本仍使用原 420/en/light/2x，即 210×500 CSS 视口，并以 `calc(100vh - 32px)` 限制承载；原 verify 与旧高度失败断言均保留。原 065 退出 126 的反例，本轮退出 0，后续完整 exercise 也完成。

同一反例当前几何（CSS px，主 Document，滚动检查后）：

```text
host:      top=16,  bottom=484, height=468
workspace: top=229, bottom=485, height=256
detail:    top=229, bottom=485, height=256
scroll:    top=230, bottom=324, height=94
actions:   top=324, bottom=484, height=160
```

不再出现 162px 详情中容纳 255px 固定操作区并向外裁切的情况。每个动作在各自滚动到位时的独立测量：

| 动作 | 按钮 top..bottom | 有效纵向可见区 | 高度 | 中心命中 / hidden 平移 |
|---|---|---|---:|---|
| Copy password | 346..404 | 334..484 | 58 | true / false |
| Copy username | 412..472 | 334..484 | 60 | true / false |
| Open website | 424..484 | 325..484 | 60 | true / false |
| Edit entry | 440..484 | 325..484 | 44 | true / false |

同一旧反例运行中的 320px 主承载检查也通过，四动作分别为 278..336、276..336、276..336、292..336，均完整落在各自有效区域内且中心命中，无 hidden 祖先平移。不是要求四个换行按钮始终同时全部显示，也不把最终截图里已滚出栏顶的其他动作当作仍不可达；结论来自逐按钮完整区域与命中事实。

人工查看旧反例当前截图、该反例中的 constrained-height-actions、正式矩阵宽屏暗色及第 4 账号详情。受限高度下现在存在实际页面/栏内滚动，未再观察到 F3 的不可访问裁切。该证据来自真实 React/service 组件，不以 068 的隔离 CSS 布局或 --check 预检替代。

### F1/F2 保持关闭

EntryList 与原四账号 DOM 回归未变；本轮 safe 全量通过。正式 exercise 实际完成 card-more-fourth-stable-id，更多仍展开剩余账号，Enter 进入第 4 个稳定 ID，没有回到固定首账号。

当前 fixture 的 Enter keyDown 仍携带字符 13，保留真实 focus/keydown/keyup 与详情断言；原样矩阵及收尾完成，未用程序 click 替代键盘验收。result.interactions 包含 constrained-height-actions-visible-and-hit、card-more-fourth-stable-id、favorite-tag、relation-and-backlink-stable-ids、invalid-target-diagnostic、lock-clears-detail、empty-loading-error-locked。

### 其余风险与范围

没有生产导入、词典、密文 schema、服务或持久化变化。稳定双 ID、跨筛选关联/反向引用、失效诊断、收藏标签及删除/重排选择保持；完整字段/长备注、返回/隐藏/锁定/卸载的 SecretInput property 清空与敏感子树清理回归通过。原编辑、回收站、备份、标签/联系人及 T-06 套件在本轮 safe 193 项中通过，未发现布局修复引入这些行为的回退。

本轮生产类型、变化文件定向 lint、正式内存包体门禁通过。全仓测试类型检查的范围外错误见下方集成事项，不能写成全仓检查均通过。

## Specification Axis

Result: pass
Reviewer: 当前 TASK 的独立 Codex reviewer
Input-SHA256: 78ef0e8fe3def2ba5e2e528472c14bba9c3f38591e1c5f4547913506608de4b1

| 合同 | 本轮结论 |
|---|---|
| AC-211 | pass（已测 UI 接缝）：原样矩阵按所属容器宽度呈现三段式或列表→详情；有限高度由真实可滚动区域承载，无第二套 shell。 |
| AC-212 | pass：完整手机号/邮箱/账号 ID、长备注与操作区断言通过；原 F3 210×500 视口和 320px 承载反例转绿，四动作逐一完整可见/可命中；F1 多账号入口保持。 |
| AC-213 | pass：正向关系、反向引用、跨筛选双稳定 ID 跳转和失效目标诊断在正式 exercise 与 DOM 回归中保持。 |
| AC-214 | pass（已测服务/格式/DOM）：safe 193 项通过，原关系/标签/联系人/回收站/备份/密码学行为未观察到回退；收藏仍为现有标签，schema 未变。 |
| DESIGN SAFE-WORKSPACE / required E2E | pass（自动化可验范围）：实际视口高度的原样 48-case 矩阵、320px 收尾与独立旧反例通过，F1/F2/F3 均已关闭；原生宿主边界仍待用户验收。 |

本票修复仅为授权 UI 的高度/滚动适应及专用夹具，不改变密码本数据模型、动作语义或第二套 shell。既有固定 bz SHA、render.ts/ui.ts、MIT/版权头与 docs/third-party/bz.md 的三段式映射沿用已核对事实；没有新外部复制或改编，本轮不声称重新下载上游。

## Design Conformance

绑定 DESIGN revision 2 / SAFE-WORKSPACE / AC-211–214，重新计算 digest=1e3b5ef5fb4c6ec033ff6a1d9f164a7f3692cc679b71e2d54771c1ea46082c00，与 Ticket 相符。default、empty、loading、error、detail、relations、invalid-relation、locked 及原编辑/备份路径保持；返回入口移入正文滚动区和过高操作栏正常滚动，是为有限槽位满足原设计可达要求的局部适配，没有改设计消除 finding。

Google Chrome 153.0.8010.47 原样矩阵覆盖 420/600/1440、en/zh、亮暗/用户主题、100%/200%、reduced-motion/coarse、第二 Document。正式 48-case 与旧反例的一例均记录 errors=[]，全部收尾实际完成。人工查看：旧反例 420-en-light-2x.png、其 constrained-height-actions.png、正式 1440-en-dark-1x.png 与 cards-fourth-account.png。

使用 Lead 仓库 styles.css，SHA-256=f2ae6f4e3dd80ffe5f63dde1ced1117fd4bbf7a567c8115d6d477063148d6a25，与 065 相同。没有生成或注入修复产品样式。原样标准与旧诊断的产品输入摘要均为 e1dde708884981262f133749d09457e33512b74beef7ff8d9f5b50ac68972f56；该摘要不涵盖 /tmp 自定义 runner 自身及其外部承载样式，不冒称完整脚本哈希。旧诊断额外承载高度与当前正式 fixture 在此桌面场景等效，仍完整保留旧失败检查。

真实组件/服务和内存文件/剪贴板端口参与执行，辅助场景通过 store 灌入数据；不据此声称新增四账号的原生保存流程逐一验收。第二 Document 为同源 iframe，真实 Obsidian popout、原生剪贴板、IME/触屏及最终产物一致性仍待 Lead/用户验收。

## 范围外集成事项

pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json 退出 126，唯一输出为 src/modules/archives/services/generic/person-journal.test.ts:69:27：string | undefined 不能传入 string，发生在 f.files.text.get(plan.owner.backupPath)。该文件当前是未跟踪的并行档案测试，不在本 TASK 8 个冻结输入中；T-07 三个布局/夹具改动不涉及其 API/类型。读取该文件时内容仍对应错误，摘要 cd99b5a7e1f976fb70860f87c91094b1c0ed4c9d9f1b070d33795f26119d1762，未改写或把问题归因本票，也没有无新输入依据地反复重跑。

此项交 Lead/对应 owner 修复并重跑全仓测试类型检查。本报告的 pass 仅覆盖 T-07 冻结候选，不代表全仓类型门禁已绿色；不把范围外错误隐去，也不扩写本票业务修复。

## 产物与验证

唯一仓库写入为本 REPORT。未修改业务/测试/fixture、TASK、前序报告、正式 Evidence/Ticket/Map/Goal、设计/原型、来源登记、依赖或 main.js/styles.css；未安装、执行禁止的 build/build:css/notices、Git 写操作、提交、推送或发布。临时脚本/JSON/截图只留 /tmp。

| 亲自执行的命令/检查 | 退出码 | 结果 |
|---|---:|---|
| TASK 8 文件 SHA-256，多次 | 0 | 始终匹配，回读再检 |
| pnpm exec vitest run src/modules/safe | 0 | 19 文件 / 193 项通过，包含 F1、秘密清理与 T-06 回归；不扩展为其他票独立审查 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json | 0 | 生产类型通过 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json | 126 | 范围外 person-journal.test.ts:69 错误，见集成事项 |
| pnpm exec eslint src/modules/safe/ui/SafePage.tsx src/modules/safe/ui/AccountDetail.tsx scripts/ui-review/fixtures/T-07.mjs --max-warnings 0 --no-warn-ignored | 0 | 本轮变化文件定向零警告 |
| node scripts/ui-review/run.mjs --ticket T-07 --matrix standard --out /tmp/huhu-review-073-t07-ui | 0 | 原样 48 cases、逐动作 384 次检查、320px 收尾和全部原 exercise 通过 |
| node /tmp/huhu-review-065-t07-height-run.mjs --ticket T-07 --matrix standard --out /tmp/huhu-review-073-t07-height | 0 | 原样旧反例脚本，1 个 210×500 CSS case + 全部当前 verify/exercise 通过 |
| node scripts/check-bundle.mjs --budget scripts/bundle-budget.json --enforce --json /tmp/huhu-review-073-t07-bundle.json | 0 | 原正式全仓预算 within limits；safe activation=66816 ≤ 68608、startup=134636、output=7100495，未改阈值 |
| design-artifacts.mjs --digest 当前 change DESIGN.md | 0 | 匹配 revision 2 绑定摘要 |
| validate-specdev.mjs --review-scope --repo /home/wta/projects/obsidian-huhu --mode working-tree --base 29644dc5833bb209e6282f84fa71441a5a1b99d4 --file（逐个传 TASK 8 路径） | 0 | 范围/base/head 正确 |
| git diff --check 29644dc5833bb209e6282f84fa71441a5a1b99d4 --（TASK 8 路径） | 0 | 所查差异无空白错误 |

本地关键过程材料（纯路径）：

- /tmp/huhu-review-073-t07-ui/result.json
- /tmp/huhu-review-073-t07-ui/1440-en-dark-1x.png
- /tmp/huhu-review-073-t07-ui/cards-fourth-account.png
- /tmp/huhu-review-073-t07-height/result.json
- /tmp/huhu-review-073-t07-height/420-en-light-2x.png
- /tmp/huhu-review-073-t07-height/constrained-height-actions.png
- /tmp/huhu-review-065-t07-height-run.mjs
- /tmp/huhu-review-073-t07-bundle.json

未执行全仓 pnpm test、全仓 lint、完整架构/i18n/许可/安全脚本或禁止构建。相对 065 仅三处布局/夹具变化，无新生产导入/词典/schema，采用本轮 safe 全量、必要类型/lint、原样矩阵、旧反例与正式包体检查；065 的安全回归与其他适用既有依据按未变边界复用，没有冒称本轮重跑。真实宿主和统一产物由 Lead 保持后续验收。

## 问题与下一步

T-07 冻结候选无未关闭 finding 或输入漂移，F1/F2/F3 均已关闭。Lead 可继续本票正式验收；同时处理范围外 person-journal 测试类型错误，不能将本票 pass 写成全仓类型门禁通过。真实宿主边界保留待用户验收，本报告不修改正式状态。
