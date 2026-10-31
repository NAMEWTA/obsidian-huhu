# T-15 独立双轴代码审查

Reviewer: native:/root/review_code
Implementers: native:/root/implement_t01
Mode: native
Input: evidence/T-15-review-input.json
Input-SHA256: 25796a0e057684f0d6de544f6b826872109de2605fb65f9ccf1b940dc84af011
Observed: 本 reviewer 未参与 T-15 实现或修复；只读审查，唯一新持久写入为本报告。未再次派遣，未改源码、正式状态、前序报告或产物。

## 固定范围与来源发现

对完整输入对象 JSON.parse 后 JSON.stringify 的 UTF-8 字节计算 SHA256。开始与结束均核验 9 个 working_snapshot 文件内容/模式、35 个 sources 原文字节，无漂移。HEAD/base 为 `265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`；stage index 和固定 tracked_diff_command 摘要匹配。前序状态对照 T-13 r2、T-14 r3 联合快照；未把前序已实现内容重记为 T-15 新交付，也未仅以新 diff 较小跳过完整规范。

9 个交付文件均实际读取，包括宿主脚本。沿 GitWorkbench 三模式 → HistoryQueryService/RevisionReader/GitRepo、NoteHistoryPanel → NoteReviewService → NoteReviewPage/DiffSurface、RestoreService → CheckpointStore/DocumentMutationCoordinator → comments participant/同步 gate 检查直接消费者。补读未变的 diff-editors.ts、diff.css、review-page.tsx 和语义测试，判断实际交互与安全边界。

本轮为 working-tree，无新增 commit，commit message Issue/PR 来源发现不适用。显式 T-15、Spec AC-013–016、ADR、DESIGN PAGE-003、批准原型、Issue #2 全文、SRC-010 和 Map 均可回读；适用标准仍为 AGENTS、dev/ui 及对应架构、设置/i18n、Obsidian API、测试、无障碍和公共风险/错误恢复审查合同。Issue §7.2 是本票核心比较交互合同；T-16 的 IN 为精确按块与 F 条件扩展，不接收下列三项核心缺口。Spec 明确原始条款补足 AC 分组，不能以已有 PR 的 A–D 声明或原型未展示而丢弃这些条款。

## standards-output

Reviewer: native:/root/review_code
Axis: standards
Result: pass
Input-SHA256: 25796a0e057684f0d6de544f6b826872109de2605fb65f9ccf1b940dc84af011
Observed: 已审查实际新增行为、调用方及失败/恢复边界，未发现新实现的正确性、数据安全或项目硬性工程规则缺陷。规范缺失单独记录于下一轴，不以标准轴通过代替功能完成。

- DiffSurface 根据实际容器宽度自动选择 stacked/side-by-side；manualLayout 不再被后续 resize 覆盖。新布局不调用 documents.capture 或 NoteReviewService.refreshCurrent。
- GitWorkbench 将手动布局持有在三模式共同父层；各 AsyncDiffSurface 即使因查询 loading 卸载，也能从该值恢复。NoteReviewPage 同样在比较表面上层持有 preferredLayout，连续选历史/刷新造成的 loading 不丢手动布局。初始无偏好仍能按容器自适应。
- 新确认框三条步骤通过 t()、en/zh 接入，内容与真实服务顺序相符；没有以文案替代 checkpoint/revalidate/apply 的服务调用。宿主脚本只补第三种布局的检查，不在本轮执行。
- 新 UI 没有改变 restore 候选端点、目标路径或 immutable B 的归属；取消与迟到查询的 controller/token/identity 防护保留。模块、Node、Portal 和只读 CM 的既有职责未被新代码绕过。

Findings: []

## specification-output

Reviewer: native:/root/review_code
Axis: specification
Result: request-changes
Input-SHA256: 25796a0e057684f0d6de544f6b826872109de2605fb65f9ccf1b940dc84af011
Observed: 新增窄屏默认、手动布局与确认步骤成立；完整 Issue #2 §7.2 仍有 3 项核心交互缺失。它们是本票整合验收中的既有缺口，不是要求无关新功能。

### SPEC-01 — P2：通用比较表面缺少“交换两端”

- 位置：`src/modules/versioning/ui/DiffSurface.tsx:133`（完整比较工具栏）；直接消费者 `GitWorkbench.tsx:431`、`:885`、`:988` 以及 `history/NoteReviewPage.tsx:311`。
- 可达前提/影响：从更改、提交历史、分支比较或笔记历史打开比较，工具栏只有三布局、换行、折叠、上一处/下一处及可选关闭；没有交换方向动作，也没有相应端点/展示方向状态。用户无法按源文要求将当前 A/B 反向查看。分支下拉重新选择两个版本不能代替所有入口通用的交换，且笔记历史 B 必须保持首次捕获。
- 实际证据：已阅读完整 DiffSurface props/状态/事件与各消费者，检索 versioning 没有交换处理或词典键。以实际组件进行受控静态渲染，工具栏 accessible labels 为 Revision comparison、Comparison controls、Comparison layout、Wrap long lines、Collapse unchanged lines、Previous change、Next change；无交换入口。该渲染只证明控件结构，不是视觉验收。
- 依据：Issue #2 §7.2 明确“统一提供版本标签、交换两端……比较语义不随视觉布局改变”；T-15/Spec AC-013–014 的核心比较整合由原始条款补足。T-16 未将其列入后续扩展。
- 满足条件：在三个布局及实际核心入口提供可访问、双语的交换动作，交换当前已固定的呈现/方向，不重捕 B、不重新解析可变 HEAD 来改变原快照。**不得交换 RestoreService 的授权目标、原 source leaf 或恢复候选语义**；尤其反向展示后“恢复到当前笔记”仍须明确恢复哪份历史原文。验证两次交换可还原、布局/加载转换后方向与内容对应，原笔记/HEAD/index 不变、capture 次数不增加，并覆盖恢复/副本安全负例。

### SPEC-02 — P2：左右比较的同步滚动不能按用户选择开关

- 位置：`src/modules/versioning/ui/DiffSurface.tsx:133`（工具栏及设置状态）；依赖 `ui/diff-editors.ts:235`（MergeView 装配）、`:290`（唯一显式 scroll-sync 装配）。
- 可达前提/影响：进入左右对照后没有同步滚动开关，adapter options 也不接受该偏好；既有 MergeView/外层滚动行为被固定。用户无法按合同关闭同步以分别查看两个相距较远的位置，或显式重新开启联动。上下 adapter 的同步同样固定开启，不能作为左右开关的替代。
- 证据：完整工具栏/adapter 参数与事件已追踪；显式 syncScroll 只在 stacked 分支直接安装，未见可切换状态、订阅或菜单动作。此结论不是从截图猜测行为。
- 依据：Issue #2 §7.2 对“左右对照”明确要求“同步滚动可切换”；本票三布局核心整合不能仅证明存在两个 CM editor 就视为满足。
- 满足条件：接入真实左右同步开关，明确当前状态、键盘名称与 en/zh；关闭时两端可独立滚动，开启时使用对应块/锚点映射并避免递归滚动。验证布局切换/loading 后偏好与监听器清理符合生命周期，不改变 A/B 内容、来源捕获或恢复授权。

### SPEC-03 — P2：上下比较比例固定，缺少可调整分隔控件

- 位置：`src/modules/versioning/ui/DiffSurface.tsx:238`（固定 editor 挂载）；未变依赖 `ui/diff-editors.ts:267`（创建两个 section）、`styles/diff.css:10`（两行固定 1fr/1fr）。
- 可达前提/影响：用户选 stacked 后始终只有两个等高网格行；没有 divider、拖动/键盘处理或比例状态。窄屏默认现在也使用 stacked，但用户仍无法给较长的一侧更多可用高度。
- 证据：adapter 创建两个 pane 后直接安装滚动同步，未创建可调 separator；CSS 明确固定 `grid-template-rows: minmax(0, 1fr) minmax(0, 1fr)`，无变量/受控比例入口。
- 依据：Issue #2 §7.2 的“上下对照”要求“两个完整视图、可调整比例”；T-15 的三布局整合与 PAGE-003 对此不能以存在两个独立正文视口替代。
- 满足条件：复用项目既有 resizable 组件或等价批准机制，加入有上下界的比例调整、可访问分隔语义/键盘支持；在不同宽度和短高度下两端保持可用。切换布局或选择新版本不应重采 B，保持版本和差异锚点；通过 DOM/逻辑回归验证操作与生命周期，真实拖动/视觉留给用户验收。

Findings: [SPEC-01, SPEC-02, SPEC-03]

## 完整 AC 回路核对

| 合同 | 实际入口/实现与已核查证据 |
|---|---|
| AC-013：三模式、root/merge/rename/MM/特殊路径 | ChangesWorkspace 的 changeComparison 分离 index→worktree、HEAD/empty→index、empty→untracked；HistoryWorkspace 保持提交/文件独立导航并将明确 parent 交给 commitComparison；CompareWorkspace 两端固定 OID。HistoryQueryService/GitRepo/RevisionReader 使用历史路径、显式根提交空端点、指定 merge parent、literal 参数和不可变对象。临时 Git 语义用例覆盖 rename 分页/路径、root、merge、SHA-256、特殊字节路径及 HEAD/index 无变化。三项规范缺口见上，不因这些后端正确而豁免。 |
| AC-014：原 leaf/buffer、固定 B、迟到请求及三布局 | NoteReviewService 仅首次新会话与显式 refreshCurrent 调用来源 capture；连续换版本复用 buffer；requests AbortController 与 session identity 阻止迟到覆盖。NoteHistoryPanel materialize 后仍校验选择 token/文档身份。AsyncDiffSurface 切 identity 立即移除旧正文并 abort；独立测试覆盖布局持有、刷新、取消、来源关闭和多窗口分离。真实主窗/popout 事件时序未运行。 |
| AC-015：预览/取消只读、检查点、重校验、失败 | NoteReviewPage prepare/cancel 管理未提交计划，确认才 apply。RestoreService 的 gate/lease/document-exclusive 内先保存原 buffer/磁盘/目标对象及 prepared journal，再重校验正文/身份/HEAD/index，持久 applying 后应用；之后读回正文/磁盘、提交批注协作、持久 verified receipt。DocumentMutationCoordinator 在原生事务/保存或 Vault.process callback 再检查身份/多叶/generation；测试覆盖新编辑、ABA、文件替换、检查点失败、保存失败/未知结果与重启不重放。 |
| AC-016：恢复/撤销/副本/批注/同步 hold | 原生协调器用最小 textEdits，comments 通过公开 participant prepare/commit/abort 一次映射；消息不回滚、歧义锚点保持待定位。undo 检查 after/actualDisk 与新内容；copy 创建不覆盖，已编辑/新增批注时拒绝旧删除。restoreGate 保留 HEAD/index、持久 hold，显式确认才解除；测试覆盖原文未保存、CRLF/LF、多叶、copy/undo 与 comments removal guard。 |

已批准 DESIGN 的窄屏默认上下优先于原 Issue §6 的“建议窄屏行内”，本轮 stacked 默认不构成偏离；§7.2 的三个明确交互要求则没有被该建议或批准设计取消。T-16 的按块/F、T-27 的受管档案恢复 owner、T-32 的当前产品文档/生成物联合维护保持各自归属；本报告不把这些后续票宣称已完成。

## 本轮独立执行与未验证项

实际执行定向核心/消费者回归：

```text
pnpm exec vitest run --no-cache \
  src/modules/versioning/ui/diff.dom.test.tsx \
  src/modules/versioning/ui/sync.dom.test.tsx \
  src/modules/versioning/ui/history/NoteReviewPage.dom.test.tsx \
  src/modules/versioning/ui/history/local-history.dom.test.tsx \
  src/modules/versioning/services/note-review.test.ts \
  src/modules/versioning/services/restore-service.test.ts \
  test/sync/git-history.test.ts \
  src/host/obsidian/document-mutation.test.ts \
  src/modules/comments/core/restore-anchors.test.ts

Test Files 9 passed (9)
Tests 89 passed (89)
Duration 4.64s
```

另运行 `node --check scripts/obsidian-acceptance/versioning-history.mjs`，exit 0；**未执行宿主脚本、Chrome 或真实 Obsidian**。静态控件渲染通过 Node + esbuild write:false 与受控 Portal/Tooltip provider 完成，不落源码文件、不测实际样式；初次未补齐 provider 的渲染尝试报环境要求，补齐后得到上述结构，不将环境错误当产品缺陷。测试绿色不覆盖所缺三项交互，也不替代完整代码审查。

作者 26 文件/181 测试、测试类型/定向 lint 为上游记录。本 reviewer 未重复全量类型/构建；Lead 转述 T-19 补齐 contacts.saving 后全局 i18n exit 0（5,057 keys），属于域外作者证据，不写作自己的执行。全局 architecture 与产物集成不据本报告宣称通过。

按 SRC-010，真实主窗/popout、平台实机、人工视觉/明暗/1440 与 390/触屏/键盘焦点和性能测量保持 **user-owned / not-run**；原 25 宿主场景在本轮未执行，不以历史截图/旧构建证据或 DOM 结果宣称本轮实机通过。

Summary-Counts: standards=pass / 0 findings；specification=request-changes / 3 findings；skipped_axes=none。
Disposition: 新实现的标准轴通过，完整核心比较规范仍需原 owner 补齐上述三项后重新冻结补审；已完成本轮审查并停写，不更新正式状态。
