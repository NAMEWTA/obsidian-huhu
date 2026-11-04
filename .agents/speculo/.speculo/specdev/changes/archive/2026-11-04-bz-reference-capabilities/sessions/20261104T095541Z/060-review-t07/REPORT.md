# 任务回报

Session: 20261104T095541Z
Task: 060-review-t07
Status: completed

## 聚焦交接

已完成 T-07 冻结候选的独立双轴审查，未参与实现或修复，未修改业务文件。标准轴与规范轴均为 request-changes，发现两个可复现的 minor 问题：卡片的更多账号入口退化，以及必需 UI runner 的 Enter 输入不完整。单元、DOM、类型与静态门禁通过；补全 Enter 字符的内存诊断通过全部 48 组矩阵及交互，但不能替代冻结夹具的正式失败结果。请实现者修复两项后，由 Lead 重跑正式 UI 验收并发起复审；本报告 completed 仅表示审查交付完成。

## 审查范围与方法

- Risk: medium；Independence: 独立、只读；Strategy: 同一 reviewer 完成两轴，沿入口、调用方、状态和回归测试核查，并用真实 React/service 浏览器夹具复现边界。
- Basis: TASK、T-07、Spec AC-211–214、ADR、CONTEXT、Goal Plan、Tickets Map、DESIGN revision 2 的 SAFE-WORKSPACE 与 UI-001 final，以及 AGENTS.md、dev/ui Skill、reviewer-contracts/risk-review 合同。
- Review-Mode: working-tree；Base-SHA 与 Observed-HEAD 均为 `29644dc5833bb209e6282f84fa71441a5a1b99d4`。使用 review-scope 工具显式选择 TASK 的 8 个文件，退出 0；已跟踪文件比较 base diff，新增文件按完整快照检查，不将其他票的 dirty 内容算入本票改动。
- Input-SHA256: `7b75e2753e0682a0d66b968cac17a949b087a0945ae6090029de93f41f8a49d5`。开始、诊断后与写报告前，8 个文件内容均匹配 TASK 哈希。
- 影响链：SafePage 的原编辑入口改为账号详情 → EntryRows/EntryCards 的选择与更多账号动作 → AccountDetail → AccountRelationLinks；编辑仍经 EntryDialog，复制/锁定/备份沿用现有 service。未发现本票修改 schema、密码学或持久化协议；新词典在页面导入链内，未向模块激活图增加详情页导入。
- 固定上游：通过 GitHub Contents API 读取 yeshimei/bz 的 `d76a0870329403247917a00c43019e203a2560a4` / `src/password-vault/render.ts`，对照 deskHTML、platDetailShellHtml、acctCardHtml。AccountDetail 文件头与当前 `docs/third-party/bz.md` 已含本票采用映射，不另报来源登记问题。

## Standards Axis

Result: request-changes

### F1 — minor：卡片“更多账号”被重定向到第一个账号

- 位置：`src/modules/safe/ui/EntryList.tsx:113`；调用链 `src/modules/safe/ui/SafePage.tsx:162`。
- 问题：卡片仍只渲染前三个账号，“另有 N 个账号”继续调用 `actions.open(entry)`；本票已将 open 从打开完整编辑器改成定位 `credentials[0]`。详情没有账号选择器，因此该入口不再展示其承诺的剩余账号。原调用点未随语义变更调整。
- 复现与证据：在真实 T-07 浏览器夹具内，仅向内存条目增加第 3、4 个账号并切换 cards。可见账号为原第 1、2 个和 `review-extra-3`，按钮显示“另有 1 个账号”；点击后详情 ID 为原第 1 个 `c0000001-1111-4111-8111-111111111111`，不含 `review-extra-4`，详情内无账号选择入口。用户需返回切换列表或进入编辑器才能处理余下账号。
- 建议：让更多账号动作展开完整账号列表，或打开可选择全部账号的视图；不要将其接到固定首账号的导航。增加至少 4 账号的卡片回归，验证点击后第 4 个账号能按稳定 ID 进入详情。

### F2 — minor：正式 UI runner 在首例键盘导航前置步骤停止

- 位置：`scripts/ui-review/fixtures/T-07.mjs:9`。
- 问题：CDP Enter keyDown 未提供回车字符；当前 Chrome 153 收到 keydown/keyup，但没有生成原生 button click，随后等待详情超时，必需矩阵与 exercise 均无法执行。
- 复现与证据：原样执行 `node scripts/ui-review/run.mjs --ticket T-07 --matrix standard --out /tmp/huhu-060-t07-ui-review`，工具退出 126，结果为 failed / 1 case，错误 `Timed out: keyboard opens account details`。Lead 的 `temp/ui-review/T-07/result.json` 同样失败。事件探针确认目标 button 已获焦点、收到两次键盘事件且未被 preventDefault，但未收到 click；bringToFront/window.focus 后仍失败。
- 定位验证：保持冻结文件不变，仅在内存 runner 的 CDP 代理为 Enter keyDown 补 `text: String.fromCharCode(13)`，保留原断言，48 组矩阵与 exercise 均通过。这支持夹具输入问题，不能据原超时断定产品不支持键盘。
- 建议：完整发送 Enter 字符（如 `text: '\r'`）并保留真实键盘断言，修复后原样重跑正式 runner。不要以 `.click()` 替换该验收，也不要将诊断运行直接记作正式通过。

其余已检查边界未发现新增可操作问题：稳定双 ID 导航及删失目标检查、重排选择保留、页面隐藏/锁定/卸载时敏感子树清理、SecretInput 属性赋值及清空、显式复制、旧编辑/回收站/备份路径、模块边界与双语文案。

## Specification Axis

Result: request-changes

| 验收 | 实际结论 |
|---|---|
| AC-211 | 三段式与窄容器详情替换列表已在补全键盘输入的 48 组诊断中验证；正式必需 E2E 仍被 F2 阻断，不能签为完成。 |
| AC-212 | 完整手机号/邮箱/账号 ID、长备注滚动与独立操作栏通过 DOM 和诊断矩阵；4 账号卡片场景触发 F1，剩余账号不能由更多入口进入详情，需补齐。 |
| AC-213 | DOM 与浏览器诊断验证关联、反向引用、双稳定 ID、跨筛选导航及失效诊断通过，未观察到错跳。 |
| AC-214 | safe 全量与安全回归通过；收藏仅筛选现有 favorite 标签，无新增收藏字段；编辑、联系人、关系、标签、回收站、备份及 T-06 套件未发现本票回归。 |

Design Conformance：对照 revision 2 的 SAFE-WORKSPACE 与 final safe()，范围/标签、条目与账号、详情与关系的顺序及语义 token 一致；查看了 1440 暗色和 420/200% 中文自定义暗色等实际截图。诊断矩阵覆盖 420/600/1440、中英、亮暗及 user-light/user-dark、100%/200%、第二 Document，并检查容器断点、长备注换行滚动、按钮尺寸、复制、减少动效及秘密不进入 HTML。上述观察不消除 F1，也不替代 F2 修复后的正式必需验收；无 schema 或第二套 shell 越界发现。

## 产物与验证

本次唯一仓库写入为本 REPORT。未执行 Git 写操作、安装依赖、build/build:css/notices；诊断脚本、原始结果和截图仅在本地 /tmp。

| 命令或步骤 | 退出码 / 实际结果 |
|---|---|
| `pnpm exec vitest run src/modules/safe` | 0；18 文件、190 测试通过，含 T-06 回归。 |
| `pnpm exec vitest run --project dom src/modules/safe` | 0；7 文件、48 测试通过。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 0。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 0。 |
| `pnpm run lint` | 0；无警告。 |
| `pnpm test:architecture` | 0；1326 模块，无边界/循环违规。 |
| `pnpm test:i18n` | 0；33 词典、5411 键。 |
| `pnpm test:safety-regressions` | 0。 |
| `pnpm check:notices` | 0；106 npm 包、73 terminal crates 的通知清单为当前状态。 |
| review-scope：working-tree、指定 base 与 TASK 8 文件 | 0；显式范围与输入匹配。 |
| 原样 T-07 UI runner（命令见 F2） | 126（工具返回值）；failed，1 case，键盘进入详情超时。 |
| `node /tmp/huhu-060-enter-probe.mjs` | 0；补全 Enter 字符的诊断：48 cases passed，errors 空，收藏/关系与反向跳转/失效目标/锁定清理/空加载错误锁定状态交互通过；同一探针复现 F1。 |

原始材料（纯本地路径）：

- /tmp/huhu-060-t07-ui-review/result.json
- /tmp/huhu-060-t07-ui-review/420-en-light-1x.png
- /tmp/huhu-060-probe.mjs
- /tmp/huhu-060-t07-diagnostic/result.json
- /tmp/huhu-060-enter-probe.mjs
- /tmp/huhu-060-t07-enter-diagnostic/result.json
- /tmp/huhu-060-t07-enter-diagnostic/1440-en-dark-1x.png
- /tmp/huhu-060-t07-enter-diagnostic/420-zh-user-dark-2x.png
- /tmp/huhu-060-bz-render.ts

未验证项：真实 Obsidian 端到端未运行；浏览器使用真实生产组件与 service、内存原生端口及同源 iframe，后者不等同真实 popout。生产构建和产物一致性由 Lead 串行处理，本审查未运行禁用的构建命令，也未将交接中的包体测量冒充本轮实测。

## 问题与下一步

无审查环境阻塞，冻结输入未漂移。实现者修正 F1 并补多账号回归，修正 F2 后由 Lead 原样重跑正式矩阵和交互；保留已有秘密清理与格式回归。修复需新冻结快照后复审，本报告不修改 Ticket 状态或正式 Evidence，也不宣称 T-07 已验收。
