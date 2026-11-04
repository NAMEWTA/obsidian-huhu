# 任务回报

Session: 20261104T095541Z
Task: 065-rereview-t07
Status: completed

## 聚焦交接

T-07 独立复审完成，F1/F2 已关闭，但两轴仍为 request-changes：新增 F3 major，在真实视口高度约束下，窄屏/200% 的详情操作栏被裁切，复制用户名、打开网址及编辑入口不可见且不能直接命中。原样正式 runner 的 48 cases 与新增四账号 exercise 均通过；额外将 fixture 的固定 900px 承载高度改为当前视口可用高度后，原有“操作栏可达”断言立即失败。safe 193 项、安全回归、类型、定向 lint 与正式内存包体门禁通过。仅写本 REPORT；请 Lead 局部修正高度适应并补受限高度验收，再冻结复审，正式状态与产物仍由 Lead 维护。

## Review

- Strategy: independent；Risk: medium；Independence: required。
- Reviewer: 当前承接 065-rereview-t07 的 Codex 会话，未参与本票实现/修复；实际派遣身份由 Lead 核验，不虚构会话 ID。
- Implementers: 原 T-07 实现者及 062-repair-t07、共享路径集成 Lead。
- Mode: working-tree；current/dev；base_sha / observed_head：29644dc5833bb209e6282f84fa71441a5a1b99d4。
- Input-SHA256: 360171e533c73f5ed838a3e3062bb1411f5a80f2e0399bb5508905dfe1f7466a（TASK 给定）。
- TASK、060 审查、062 修复交接全文已读取。8 个冻结输入开始、中途、报告前均匹配；回读时再次校验。review-scope 以 8 个显式 --file 核对范围/base/head，不把其他票 dirty 文件归入本票。

依据 Ticket、Spec §2 / AC-211–214、DESIGN revision 2 / SAFE-WORKSPACE、批准 UI-001 final、Map/Goal/ADR/CONTEXT，以及已读且仍适用的 AGENTS/dev/ui、reviewer-contracts/risk-review、运行/范围/设计/测试合同。AGENTS、dev、ui 摘要与此前完整读取版本一致，分别为 a65261ca…、d217057f…、123781b6…；重算 design digest 匹配 Ticket。

相对 060，仅 EntryList.tsx、SafePage.dom.test.tsx、T-07.mjs、T-07.tsx 四文件改变；其余四个冻结输入相同。实际追踪 SafePage → EntryRows/EntryCards → AccountDetail/AccountRelationLinks → 原服务动作与 SecretInput，并读取页面/卡片/详情/关系源码、相关 DOM 回归和夹具。补充查看 SafeSurface、ReactSurface、PageSlot 的真实承载路径：页面处在工作台有限高度的内容槽位，而非总能占 900 CSS px 的独立长页面。

## Standards Axis

Result: request-changes
Reviewer: 当前 TASK 的独立 Codex reviewer
Input-SHA256: 360171e533c73f5ed838a3e3062bb1411f5a80f2e0399bb5508905dfe1f7466a

### F1 已关闭：更多账号展开全部剩余账号，键盘定位第 4 个稳定 ID

EntryList.tsx 的更多入口不再调用固定首账号的 actions.open，而是局部展开全部 credentials；新显示第 4 个账号获得焦点，再按 Enter 通过 inspectAccount 进入对应稳定双 ID 详情。没有改变平台入口、加密 schema 或服务职责。

亲自执行新增 DOM 用例：先确认第 4 个账号未显示，Enter 激活更多后未误开首账号详情，焦点到第 4 个账号，继续 Enter 后核对其 ID 和专属密码 property，HTML 不含秘密；1 passed / 27 skipped，退出 0。完整 safe 回归也通过。原样浏览器 exercise 实际完成 card-more-fourth-stable-id 并生成 cards-fourth-account 截图，人工查看到 fourth-account 及 c0000005-1111-4111-8111-111111111111。F1 关闭，不以程序打开首账号或单独修改测试规避原反例。

### F2 已关闭：原样 CDP Enter 产生完整浏览器验收

T-07.mjs 的 Enter keyDown 已携带字符 13，仍保留 keyDown/keyUp、真实焦点进入详情和稳定 ID 断言。亲自原样运行正式 runner，48 cases passed、errors=[]，exercise 的四账号、收藏、正反关系、失效诊断、锁定清理、empty/loading/error/locked 均实际完成。不是 --check 预检或补参数的临时 runner 代替正式夹具。

### F3 — major — 视口高度受限时详情操作栏越出裁切区域，主要动作不可见

- 文件:行：src/modules/safe/ui/AccountDetail.tsx:25–29、39–43；关联承载为 src/modules/safe/ui/SafePage.tsx:202、219。检测盲点：scripts/ui-review/fixtures/T-07.mjs:3 固定 height:900px。
- 问题：详情容器 min-h-0 / overflow-hidden，顶部返回区与底部操作区均 shrink-0；窄屏按钮和文字换行后，两区所需总高超过分配的详情高度。中间滚动区缩至仅剩 padding，操作栏继续排到容器之外并被裁切。此时主操作不在可见/可点击区域，不能满足“操作栏始终可达”。
- 可达前提：沿现有 SafeSurface/工作台内容槽位打开，420px 物理宽度、200% 对应 210 CSS px，500 CSS px 的视口高度。原夹具却将 main 固定为 900 CSS px，即便 Emulation 已把视口设为 500px，也给产品额外高度，并用超视口截图掩盖该约束。
- 复现：在 /tmp 复制共享 runner，修正临时脚本资源定位；仅在 fixture 的外部 main 承载样式后追加 `[data-review=safe]{height:calc(100vh - 32px)}`，扣除共享 runner 已有上下 16px body padding。保留全部冻结 TSX/mjs、产品 DOM/CSS、样例数据、严格 adapter、原 verify 与断言；只运行原 420/en/light/2x case。原 T-07.mjs:19 的 actions outside scrolling details remain reachable 断言失败，退出 126。没有增加一个人为更严的产品断言才制造红灯。
- 实际测量（CSS px，主 Document）：

```text
viewport height=500；body.scrollHeight=500
host:      top=16,  bottom=484, height=468
workspace: top=268, bottom=430, height=162
detail:    top=268, bottom=430, height=162
scroll:    top=354, bottom=378, height=24
actions:   top=378, bottom=633, height=255
Copy password: top=391, bottom=449（底部已越过 detail=430）
Copy username: top=457, bottom=517
Open website:  top=525, bottom=569
Edit entry:    top=577, bottom=621
```

- 追加只读 elementFromPoint 测量：复制用户名中心命中 BODY，而非按钮；打开网址、编辑中心在视口外无命中。截图中复制密码仅部分显示，其余三个动作完全不可见；body 高度仍是 500px，没有整体页面滚动空间将其显露。另一 Document 宽 600px、高 900px，操作区 778..847 落在详情 80..848 内，说明是内容区宽高组合约束，不是脚本无法加载或统一样式损坏。
- 人工查看 /tmp/huhu-review-065-t07-height/420-en-light-2x.png，与矩形及命中结果一致。未据此声称密文丢失、秘密泄露或所有键盘补救都不可能；已确认的是该强制验收场景下主要操作被裁切、常规指针无法访问。
- 建议修正：使窄屏/受限高度的实际页面具备可靠纵向滚动或等效自适应，详情内容和全部操作能在有限视口内到达；保留命中尺寸、完整字段/备注、焦点与敏感内容清理。不要只扩大 fixture 高度、缩小字体/按钮、隐藏动作或减弱原断言。将实际视口高度/较矮工作台分屏纳入夹具，并核对操作按钮位于有效裁切范围且可命中。
- 依据与严重性：Spec §2 / AC-212、DESIGN SAFE-WORKSPACE 的长备注可读及操作栏持续可达；在已要求的窄屏/200% 场景中，复制用户名、打开网址和编辑等主要功能入口被隐藏，因此定为 major。
- 归因：这是本次复审新发现，AccountDetail/SafePage 在 060→065 未变，不将其写成 F1 展开修复引入的回归。F1/F2 的关闭仍有效；新增 F3 使整个候选尚不能通过。

本轮唯一待修 finding 为 F3（major）；跨轴引用，不重复计数。

### 其余已核对边界

稳定 entryId/credentialId 选择、重排保留、目标删除后清除、关联/反向引用及失效诊断通过；收藏仍筛选既有 favorite 标签，不写入新字段。详情与编辑保留可选手机号/邮箱、原始备注和 SecretInput 的 property-only 秘密；返回、锁定、隐藏/卸载清除敏感子树回归通过。编辑、联系人、标签、关系、回收站、备份与 T-06 的服务/DOM/格式/密码学回归均在本轮 safe 套件中通过；安全门禁也通过。未发现四文件局部修复改变上述安全/持久化语义。

## Specification Axis

Result: request-changes
Reviewer: 当前 TASK 的独立 Codex reviewer
Input-SHA256: 360171e533c73f5ed838a3e3062bb1411f5a80f2e0399bb5508905dfe1f7466a

| 合同 | 实际结论 |
|---|---|
| AC-211 | 原样矩阵的三段式/窄列表→详情与容器断点通过，无第二套 shell；高度适应需随 F3 一并修正。 |
| AC-212 | request-changes：完整字段、长备注滚动和多账号入口回归通过，F1 已关闭；但实际视口高度约束下操作栏被裁切，F3 未满足持续可达。 |
| AC-213 | pass（已测接缝）：双稳定 ID、跨筛选关系跳转、反向引用与失效诊断通过。 |
| AC-214 | pass（已测格式/服务/DOM）：safe 全量及安全门禁通过，原编辑/备份/回收站/联系人能力未观察到回退；收藏保持标签、schema 不变。 |
| DESIGN SAFE-WORKSPACE / required E2E | 原样 48-case + exercise passed，但补充真实高度反例失败，不能用绿色矩阵覆盖 F3；整体 Design Conformance request-changes。 |

本票修复范围保持局部卡片展开、回归和夹具 Enter，不涉及 core/platform/services、密文格式或第二套数据模型。docs/third-party/bz.md 已有 Lead 追加的 password-vault 三段式交互行，固定 d76a0870329403247917a00c43019e203a2560a4、render.ts/ui.ts、HUHU 多账号/可选字段/双向关系/标签适配登记及源码版权头均存在；该文档不在冻结输入，本轮只核对内容。沿用 060 已核对的上游采用事实，本轮没有新复制或改编，也不冒称重新下载上游。

## Design Conformance

绑定 DESIGN revision 2 / SAFE-WORKSPACE / AC-211–214；重新计算摘要 1e3b5ef5fb4c6ec033ff6a1d9f164a7f3692cc679b71e2d54771c1ea46082c00，与 Ticket 相符。原样矩阵覆盖 420/600/1440、中英、亮暗/用户主题、100%/200%、reduced-motion/coarse 与第二 Document；96 份详情测量中，横向最大溢出为 0、完整字段断言无失败、秘密进入 markup 计数为 0；已测详情控件最低高度 fine=36px、coarse=44px。

原样运行实际截图检查了 420/zh/user-dark/2x、1440/en/dark/1x 和 cards-fourth-account。结构、长备注滚动、稳定第 4 账号和固定操作区在原 900px 夹具内表现符合断言；随后补充高度约束时，现有可达性断言和人工截图同时揭示 F3。

当前仓库 styles.css SHA-256=f2ae6f4e3dd80ffe5f63dde1ced1117fd4bbf7a567c8115d6d477063148d6a25，标准与补充诊断一致，未注入审查专用产品样式。临时脚本仅调整夹具外部承载高度，不修改生产组件、冻结 fixture、共享 runner 或 adapter，未关闭任何原断言；后续副本仅增加矩形/命中只读测量。

标准 runner inputDigest=fea7b010665684ab3adace2f1b3430ad31732158ff65d052d95611474067fed5。高度诊断产品输入相同，但 /tmp 脚本和额外承载高度不包含在共享 runner 原文件摘要内，不能把相同 inputDigest 当作两次完整运行环境完全相同。严格区分标准 passed 与补充诊断 failed。

浏览器为 Google Chrome 153.0.8010.47，实际 React/service/密码学接缝配合内存原生文件/剪贴板/Notice 端口，场景通过 store 灌入辅助数据；不能据此声称新四账号数据的原生保存流程逐一验收。第二 Document 为同源 iframe，不是真实 Obsidian popout。真实宿主、原生剪贴板、IME/触屏和最终产物一致性仍待 Lead/用户验收。

## 产物与验证

唯一仓库写入为本 REPORT。未修改业务、测试、fixture、TASK、旧报告、正式 Evidence/Ticket/Map/Goal、设计/原型、来源登记、依赖或 main.js/styles.css；未安装、执行禁止的 build/build:css/notices、Git 写操作、提交、推送或发布。临时 runner、JSON、截图和内存包体结果只留 /tmp。

| 亲自执行的命令/检查 | 退出码 | 结果 |
|---|---:|---|
| TASK 8 文件 SHA-256，多次 | 0 | 始终匹配，回读再检 |
| pnpm exec vitest run src/modules/safe | 0 | 19 文件 / 193 项通过，含 T-06 与当前工作区 provider 测试；不扩展为 T-17 独立审查 |
| pnpm exec vitest run --project dom src/modules/safe/ui/SafePage.dom.test.tsx -t 'card more accounts' | 0 | 1 passed / 27 skipped；更多→焦点→Enter→第 4 个 ID 与独有密码 property |
| pnpm test:safety-regressions | 0 | 既有安全回归通过，DEP0205 为 Node 弃用提示 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json | 0 | 生产类型通过 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json | 0 | 测试类型通过 |
| pnpm exec eslint src/modules/safe/ui/EntryList.tsx scripts/ui-review/fixtures/T-07.mjs scripts/ui-review/fixtures/T-07.tsx --max-warnings 0 --no-warn-ignored | 0 | 本轮生产/夹具变化定向零警告 |
| node scripts/ui-review/run.mjs --ticket T-07 --matrix standard --out /tmp/huhu-review-065-t07-ui | 0 | 原样 48 cases，errors=[]，全部 exercise 含新四账号收尾通过 |
| node /tmp/huhu-review-065-t07-height-run.mjs --ticket T-07 --matrix standard --out /tmp/huhu-review-065-t07-height | 126 | 只限制夹具承载为视口可用高度，原 1 个窄屏/2x case 的原操作栏断言失败 |
| node /tmp/huhu-review-065-t07-height-probe-run.mjs --ticket T-07 --matrix standard --out /tmp/huhu-review-065-t07-height-probe | 126 | 保留原失败，追加矩形测量，见 F3 |
| node /tmp/huhu-review-065-t07-hit-run.mjs --ticket T-07 --matrix standard --out /tmp/huhu-review-065-t07-hit | 126 | 保留原失败，追加中心点命中与 body 高度测量，见 F3 |
| node scripts/check-bundle.mjs --budget scripts/bundle-budget.json --enforce --json /tmp/huhu-review-065-t07-bundle.json | 0 | 正式全仓内存门禁通过，safe activation=66816 ≤ 68608，startup=134635，output=7095129；未改阈值 |
| design-artifacts.mjs --digest 当前 change DESIGN.md | 0 | 匹配 revision 2 绑定摘要 |
| validate-specdev.mjs --review-scope --repo /home/wta/projects/obsidian-huhu --mode working-tree --base 29644dc5833bb209e6282f84fa71441a5a1b99d4 --file（逐个传 TASK 8 路径） | 0 | 范围/base/head 正确 |
| git diff --check 29644dc5833bb209e6282f84fa71441a5a1b99d4 --（TASK 8 路径） | 0 | 所查差异无空白错误 |

本地关键过程材料（纯路径）：

- /tmp/huhu-review-065-t07-ui/result.json
- /tmp/huhu-review-065-t07-ui/420-zh-user-dark-2x.png
- /tmp/huhu-review-065-t07-ui/1440-en-dark-1x.png
- /tmp/huhu-review-065-t07-ui/cards-fourth-account.png
- /tmp/huhu-review-065-t07-height-run.mjs
- /tmp/huhu-review-065-t07-height/result.json
- /tmp/huhu-review-065-t07-height/420-en-light-2x.png
- /tmp/huhu-review-065-t07-height-probe-run.mjs
- /tmp/huhu-review-065-t07-height-probe/result.json
- /tmp/huhu-review-065-t07-hit-run.mjs
- /tmp/huhu-review-065-t07-hit/result.json
- /tmp/huhu-review-065-t07-bundle.json

未执行全仓 pnpm test、全仓 lint、完整架构/i18n/许可门禁和真实宿主；相对 060 仅四个局部文件变化，采用当前定向检查、完整 safe/安全回归、类型和原样矩阵，架构/词典/来源的适用既有依据按未变输入复用，没有冒称本轮重跑。禁止构建及共享产物由 Lead 保持唯一写入。

## 问题与下一步

冻结输入无漂移，F1/F2 已关闭；F3 是新的有限高度布局失败。请 Lead/实现者修复实际高度约束下的内容/操作可达性，补窄屏/200% 与较矮分屏的真实承载尺寸验收；保留当前 48-case 与四账号回归，重新冻结复审。不要只凭固定 900px 夹具绿色将 AC-212 或 Design Conformance 记通过。本报告不修改正式状态，completed 仅表示独立复审交回。
