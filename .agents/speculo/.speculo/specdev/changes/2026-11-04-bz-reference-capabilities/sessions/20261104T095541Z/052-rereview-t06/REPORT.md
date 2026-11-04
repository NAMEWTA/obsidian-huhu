# 任务回报

Session: 20261104T095541Z
Task: 052-rereview-t06
Status: completed

## 聚焦交接

已完成 T-06 独立复审，两轴均为 request-changes，保留 1 项 minor：Q1 的横向收缩已修复，但换行后的长结果被纵向压缩，文字越出按钮并与相邻结果重叠；Q1 尚未完整关闭。Q2 已关闭，原样浏览器矩阵 48 cases 及新增 exercise 均执行成功。safe 178 项、既有安全回归、两套类型、定向 lint 和正式内存包体门禁通过；新增纵向包含性诊断明确失败，不能以原矩阵绿色覆盖截图和几何事实。仅写本 REPORT，未修改业务文件、TASK、正式状态或产物；completed 表示复审交回，下一步由 Lead 局部修复并重新冻结。

## Review

- Strategy: independent；Risk: high；Independence: required。
- Reviewer: 当前承接 052-rereview-t06 的 Codex 会话，未参与实现或修复；实际派遣身份由 Lead 核验，不虚构会话 ID。
- Implementers: 019-implement-t06、044-implement-t06-cont、050-repair-t06 及共享路径集成 Lead。
- Mode: working-tree；base_sha / observed_head 均为 29644dc5833bb209e6282f84fa71441a5a1b99d4，current/dev。
- Input-SHA256: 0dee07f7db18641dcaff5d9c3f1e4abac981540f1bdde9e52660b6456fe5737a（TASK 给定）。
- TASK 全文、Ticket、048 审查及 050 修复交接已完整读取。全部 13 个冻结输入开始、中途、报告前均匹配，回读时再次校验；review-scope 确认指定 working-tree 范围、base/head 与 13 个 --file。

依据当前 Spec §2 / AC-201–204、DESIGN revision 2 / SAFE-QUICK、UI-001 final、Map/Goal 的范围，以及 AGENTS/dev/ui、reviewer-contracts/risk-review 和已读运行/范围/测试合同。AGENTS/dev/ui 摘要与已读版本相同；重算 DESIGN digest 匹配 design_ref，回读 SAFE-QUICK 状态/行为与原型 quick 结构，沿用已读 DESIGN-0002 基线。

相对 048 快照，仅 QuickPick.tsx 和 T-06.mjs 改变，其余 11 个冻结输入相同。复核真实模块命令 → 二级懒加载 → 所属 Document 的 Radix modal → QuickPick → SafeService → 加密仓库/剪贴板及代际取消链；读取当前组件、loader/dialog、fixture、服务差异和相关测试。没有为布局复审重开已验收 T-02 反馈或其他功能票。

## Standards Axis

Result: request-changes
Reviewer: 当前 TASK 的独立 Codex reviewer
Input-SHA256: 0dee07f7db18641dcaff5d9c3f1e4abac981540f1bdde9e52660b6456fe5737a

### Q1-R1 — minor — 长文本换行后结果轨道纵向压缩，文字越出按钮并重叠

- 文件:行：src/modules/safe/ui/QuickPick.tsx:118–119；夹具检测缺口在 scripts/ui-review/fixtures/T-06.mjs:17–21 的 resultWidths 检查。
- 问题：min-w-0、可收缩单列和 overflow-wrap:anywhere 已使横向文字换行，但 max-h-72 的 grid 列表仍把三条结果行压进约 288px。结果按钮高度约 91px，长平台标题自身已高 252px；文字子项在按钮中居中后上下越界，首行标题上半部分被列表裁掉，并与第二/第三条结果的文字相交。用户仍无法可靠辨认完整平台与账号，Q1 的可读性修复不完整。
- 正常入口：亲自运行原样 runner，48 cases 全通过。420/en/light/2x（CSS viewport=210px、reduced-motion）中 modal 宽 178px，横向检查确实成功：首按钮 clientWidth=scrollWidth=113，标题和账号均 clientWidth=scrollWidth=81；这证明横向问题已修复，不证明结果行能容纳换行后的高度。
- 人工证据：查看 /tmp/huhu-review-052-t06-ui/420-en-light-2x.png，结果文字在列表底部重叠。随后以共享 runner 的 /tmp 副本复现同一个 case，保留全部原 verify，完成后追加只读矩形测量和“文字须落在所属结果按钮内”的失败断言，未改生产组件、fixture、样式或输入数据。
- 实际测量（CSS px）：

```text
main list: clientHeight=288, scrollHeight=292
row 1: top=400, bottom=490.671875, height=90.671875
       clientHeight=91, scrollHeight=193
       title: top=297.84375, bottom=549.84375, height=252
       username: top=553.84375, bottom=592.84375, height=39
row 2: top=498.671875, bottom=589.34375, height=90.671875
       title: top=396.515625, bottom=648.515625, height=252
```

- 首行标题明显越出自身按钮，并覆盖第二行区域；第二行同样越界。另一 Document 宽 600px，对应标题高 42px，仍被其约 82px 的按钮正常容纳。不是仅把可滚动列表未同时显示全部结果误判为缺陷，问题在于每条结果的内容已经跨越所属按钮边界。
- 诊断执行退出码 126，result.status=failed，1 个目标 case；原 verify 均完成，失败原因为新增纵向包含性断言，不是编译、接口、超时或主线程异常。标准运行与诊断使用相同 styles.css（SHA-256 见下），没有把旧样式当成修复后候选。
- 建议修正：在当前组件内让结果轨道按完整内容增高，例如显式设置 grid-auto-rows 的内容尺寸或采用等效纵向列表；保留整体列表 max-height 与垂直滚动、横向收缩、44px 命中及键盘/账号身份语义。fixture 继续保留现有横向断言，并补文字位于自身按钮内、相邻结果文字不相交的窄屏/200% 检查，不能通过裁切/省略完整文本规避。
- 依据与严重性：ui 与 DESIGN 的长文本、窄屏/200% 可辨认要求，AC-202 的可用选择界面。确认为局部可用性 minor；没有据此声称秘密泄露或实际复制了错误账号。

本轮唯一待修 finding 为上述 1 项 minor，属于 Q1 的修复不完整；跨轴引用不重复计数。无新增 major/blocker。

### Q2 已关闭：exercise 接口及浏览器收尾实际执行

fixture 现导出实际 async exercise；原样 runner 的 48 cases 后正常执行生成状态、锁定关闭、另一个独立 fixture 实例仍在、最终两个 picker 都关闭的断言与截图，result.interactions 为 generated-secret-lock-close、independent-document-session、both-pickers-closed，runtime errors=[]。不再有 fixture.exercise is not a function；不是 --check 预检或空函数替代执行。

这里第二 Document 对应独立 safe fixture/service 实例，只证明测试中的实例隔离；不将其写成同一真实 Vault 多窗口的锁定行为已通过。

### 高风险行为复核

13 个输入中服务、命令、加密/剪贴板相关测试等 11 文件与 048 相同；本轮重新运行 safe 全量和安全回归。先解锁后搜索、每账号结果、仅平台/URL/用户名检索、不检索密码/备注、IME 与 229、方向键/焦点和 Enter 显式复制继续通过。

显式生成仍为 12 位四类字符，动作前不生成、无持久发布/自动复制，SecretInput 不把秘密写入 HTML value 属性，卸载清理实际 property。锁定、关闭、禁用、重复命令、晚到 unlock/native copy、排队取消、取消后的条件清理和晚到反馈抑制有真实回归；关闭 picker 不误锁其他已解锁界面。30 秒仅指纹仍匹配才清理，外部改变的剪贴板保留。未发现布局改动引入这些行为的回归，但它们不能替代 Q1-R1 的视觉失败。

## Specification Axis

Result: request-changes
Reviewer: 当前 TASK 的独立 Codex reviewer
Input-SHA256: 0dee07f7db18641dcaff5d9c3f1e4abac981540f1bdde9e52660b6456fe5737a

| 合同 | 本轮结论 |
|---|---|
| AC-201 | pass（模块/DOM 接缝）。真实命令先解锁后进入账号搜索；未配置时有明确入口提示。 |
| AC-202 | 行为回归通过：标题/URL/账号检索、每账号结果、上下/焦点/Enter、IME/229、30 秒条件清理。设计/可用性 request-changes：Q1-R1 的窄屏长结果纵向重叠仍不可辨认。 |
| AC-203 | pass。无结果时显式生成，12 位四类字符、不保存/覆盖/自动复制，秘密不进入 markup，关闭清理。 |
| AC-204 | pass（已测模块/服务/组件接缝）。锁定、禁用、关闭及迟到解密/复制回调清理通过；新增浏览器收尾也实际完成。真实系统剪贴板和宿主多窗口仍保留用户验收。 |
| DESIGN SAFE-QUICK / required E2E | request-changes。指定 runner 原样 passed、Q2 关闭，但人工截图和额外纵向诊断确认 Q1 未完整修复；不能宣称完整 Design Conformance。 |

范围保持命令取密、解锁、搜索、显式生成/复制及取消，不新增收藏字段、加密/存储格式或无解锁生成。来源登记现有固定 bz quick-pick.ts/render.ts → QuickPick/dialog/loader 条目仍在，文件头固定 SHA/MIT/版权保留；本轮没有新外部代码，沿用 048 已核对的原始来源事实，不声称重新下载上游。

## Design Conformance

绑定 DESIGN revision 2 / SAFE-QUICK / AC-201–204。实际 design-artifacts digest 为 1e3b5ef5fb4c6ec033ff6a1d9f164a7f3692cc679b71e2d54771c1ea46082c00，与 Ticket 相符。对照批准的 default/locked/loading/no-results/generated/copied/closed/error、解锁/显式复制/放弃关闭与长文本/命中尺寸规则；原型任务页到命令 Radix modal 的既有适配未变。

原样 Chrome 153.0.8010.47 标准矩阵 48 cases 覆盖 420/600/1440、en/zh、亮暗/用户主题、1x/2x、reduced-motion/coarse 与第二 Document；保留逐场景解锁、IME、键盘、生成、错误/成功、loading/closed、Tab/Esc，并执行新增 exercise。288 个结果按钮及其标题/账号文字块的最大横向 scrollWidth-clientWidth 均为 0；coarse case 控件高度达到 44px。

已人工查看 420-en-light-2x.png 和 1440-zh-dark-1x.png；窄屏截图揭示原夹具没有检查的纵向重叠。追加诊断使用相同生产输入与仓库样式，因此保留 Q1-R1。没有重写设计、隐藏文本或降低断言使候选通过。

本轮使用 Lead 已重建的仓库 styles.css，输入 SHA-256 为 33d36871ce32f911b64aa5e29978f93a21fbebe9e56db70b36c579701f8f5865。没有生成新的审查 CSS，也没有改动仓库样式。第二 Document 为 iframe，真实 Obsidian popout、原生剪贴板、输入法/触屏仍待原用户验收；不把这些边界当作忽略当前视觉缺陷的理由。

## 产物与验证

唯一仓库写入为本 REPORT。未修改业务/测试/fixture、TASK、原报告、正式 Evidence/Ticket/Map/Goal、设计/来源登记、依赖、node_modules 或 main.js/styles.css；未安装、执行禁止的 build/build:css/notices、Git 写操作、提交、推送或发布。

| 亲自执行的命令/检查 | 退出码 | 结果 |
|---|---:|---|
| TASK 13 路径原字节 SHA-256，多次 | 0 | 始终匹配，报告回读再次校验 |
| pnpm exec vitest run src/modules/safe | 0 | 17 文件 / 178 项通过，包含真实服务/WebCrypto/命令/DOM 回归 |
| pnpm test:safety-regressions | 0 | 既有安全门禁通过；Node DEP0205 为弃用提示 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json | 0 | 生产类型通过 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json | 0 | 测试类型通过 |
| pnpm exec eslint src/modules/safe/ui/QuickPick.tsx scripts/ui-review/fixtures/T-06.mjs --max-warnings 0 --no-warn-ignored | 0 | 本次两个变化文件定向 lint 零警告 |
| node scripts/ui-review/run.mjs --ticket T-06 --matrix standard --out /tmp/huhu-review-052-t06-ui | 0 | 48 cases、runtime errors=[]，新增 exercise 收尾成功；没有纵向包含性断言 |
| node /tmp/huhu-review-052-t06-vertical-run.mjs --ticket T-06 --matrix standard --out /tmp/huhu-review-052-t06-vertical | 126 | 1 个 420/en/light/2x case，原 verify 成功后新增纵向诊断失败；完整测量见 Q1-R1 |
| node scripts/check-bundle.mjs --budget scripts/bundle-budget.json --enforce --json /tmp/huhu-review-052-t06-bundle.json | 0 | 正式内存门禁通过；safe activation=68601 ≤ 68608，余量 7 bytes；startup=134641，output=7056008，未改阈值 |
| design-artifacts.mjs --digest 当前 change DESIGN.md | 0 | 匹配 revision 2 绑定摘要 |
| validate-specdev --review-scope --repo /home/wta/projects/obsidian-huhu --mode working-tree --base 29644dc5833bb209e6282f84fa71441a5a1b99d4 --file（逐个传 TASK 13 路径） | 0 | 固定范围/base/head 正确 |
| git diff --check 29644dc5833bb209e6282f84fa71441a5a1b99d4 --（TASK 13 路径） | 0 | 所查已跟踪差异无空白错误；新增文件另经读取/类型/lint/浏览器检查 |

标准 runner inputDigest：056502644b51d0a8f1a930733c85371a44070dda77de03718e82370c879c5d01。纵向诊断的产品输入与标准运行相同；其 /tmp 副本额外代码未纳入共享 runner 原文件的摘要，不把该摘要当成诊断脚本自身完整哈希。

额外 runner 仅在 /tmp，调整资源/root 定位及矩阵为一个目标 case，并在原 verify 后增加只读 getBoundingClientRect/clientHeight/scrollHeight 测量和失败断言。没有修改生产 DOM/CSS/组件/fixture，也没有关闭原断言。失败 result.json 和截图均在本地，未入库过程材料。

本地过程材料（纯路径）：

- /tmp/huhu-review-052-t06-ui/result.json
- /tmp/huhu-review-052-t06-ui/420-en-light-2x.png
- /tmp/huhu-review-052-t06-ui/1440-zh-dark-1x.png
- /tmp/huhu-review-052-t06-vertical/result.json
- /tmp/huhu-review-052-t06-vertical/420-en-light-2x.png
- /tmp/huhu-review-052-t06-vertical-run.mjs
- /tmp/huhu-review-052-t06-bundle.json

未执行全仓 pnpm test、全库 lint、完整架构/i18n/许可/文档门禁、禁止的仓库构建与真实宿主。因仅两个布局/夹具文件相对 048 改变，采用本轮直接验证、safe 全量/安全回归及必要类型/包体检查；没有把 048/050 的额外门禁冒称本轮执行。原生系统剪贴板、真实输入法/触屏与 Obsidian 多窗口保持待用户验收。

## 问题与下一步

审查执行无冻结输入阻塞，Q2 已关闭；Q1 需完成结果行纵向内容保留并加强相应夹具，再冻结复审。Lead 维护正式 Evidence/Ticket 与共享产物，不能只据现有 48-case passed 将 SAFE-QUICK 设计门禁记为通过。本报告不修改任何正式状态。
