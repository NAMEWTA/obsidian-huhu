# T-16 修复候选交接

Session: 20261105T094057Z
Task: 073-repair-t16-review
Status: completed

## 聚焦交接

已修复070分配给本worker的ST-01、ST-02、SP-01至SP-05，源码冻结等待独立high审查；本报告不宣告T-16正式完成。Root继续拥有ST-03 NOTICE、shared路径、状态/Evidence、生产资产和最终真实宿主矩阵。没有委派、提交、暂存、推送、工作区Git写命令、用户vault写入或node_modules写入。

使用dev/ui及SpecDev I，继承Map23、Goal、Spec AC-092/094–099、T-16的精确写集与已批准DESIGN revision 3/UI-002（digest 49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66）。沿068实际实现与070反例修复，没有更换引擎、自写diff/conflict parser、改变恢复持久格式或放宽ordinary conflict gate。用户授权与恢复预检由073 TASK/Root派遣绑定，正式状态由Root核验。

## 产物与验证

### 候选范围

完整冻结清单：/tmp/huhu-t16-repair/candidate-manifest.json；SHA256=1ed4f94698fe617db4df16401596d0aa3f3249e699b97e5c121d6906a084731b。68项覆盖068全部67 owned（含5删除）及本轮新增ui/review-repairs.dom.test.tsx；保留068原始baseline和本轮repairStart，不能用HEAD代表dirty起点。本轮实际12路径变化，精确清单/tmp/huhu-t16-repair/changed-paths.json；源码备份/tmp/huhu-t16-repair/baseline，真实起点/tmp/huhu-t16-repair/start.json。readonly api.ts、core/hunk-restore.ts SHA与068声明完全相同。冻结后停止源码写入。

本轮修改：core/restore.ts；services/{restore-service.ts,restore-service.test.ts,sync-service.ts}；ui/{GitWorkbench.tsx,review-repairs.dom.test.tsx,history/NoteHistoryPanel.tsx,diff/CompareEndpoints.tsx,diff/GitHunkControls.tsx,diff/MultiDiffView.tsx,diff/owner-pool.tsx}；test/sync/git-hunks.test.ts。没有改shared、资产、票据、Map或Evidence。Root补入两对summary/unknownStats词典，本轮仅消费。

### Finding逐项关闭证据

- ST-01：MultiDiffView持有当前viewer根，仅在该根查hunk header；layout effect维护identity/visible，迟到RAF同时检查当前身份、可见及isConnected，切换/卸载取消RAF。同Document两viewer反例改为断言第二页操作只聚焦第二页，通过。
- ST-02：CompareWorkspace与MultiDiffView订阅useVisible，隐藏abort当前读取；pin后、每文件开始、读取后和parse后检查signal，不继续下一文件。隐藏保留已就绪viewer/滚动与折叠状态，恢复同identity重新读取；ResizeObserver按visible释放，DiffOwner隐藏时终止本owner高亮池、恢复时重建。DOM覆盖初始隐藏不读取、进行中隐藏abort、迟到返回不读下一文件、显示后恢复、ready viewer节点保留与卸载abort。原parser取消单元继续通过；DOM替身不证明宿主Worker/滚动像素。
- SP-01：GitHunkControls显示missing↔text恢复并复用原prepare/确认/apply链；indexId绑定实际index读取，区分empty参考与真实缺失index身份。GitHunkRestoreProof的indexText/worktreeText用null表示缺失，空字符串仍为现存空文件，nullable仅为运行输入，不改变receipt schema。RestoreService先按既有raw proof核候选，再以原RestorePlan.afterText=null精确删除，缺失目标允许创建，仍有原checkpoint/receipt/条件undo。新增new/deleted/empty三单元和三真实TEMP Git gate→RestoreService→receipt→undo，验证HEAD/index不改、实际删除/创建/空文件与撤销结果；DOM实际点击恢复验证nullable proof及确认/apply。
- SP-02：SyncService在原串行队列内按当前Git status验证rename源/目标与操作侧；stage以实际index源路径核对与写入，unstage以目标index写入，原端点ref重新resolve并核路径/身份，仍校验HEAD、raw proof、candidate和worktree。原Git binary patch/OID CAS不变。真实staged rename取消暂存、已暂存rename上的unstaged内容暂存各选择一个内容块，验证rename、未选块、其它路径、100755模式、HEAD/worktree保留，以及过期proof与伪造端点路径拒绝。没有用隐藏按钮规避rename。
- SP-03：history和compare模式复用同一HistoryWorkspace，保留提交图、来源行、筛选与所选提交，仅右侧切比较；Git历史A/B/工作树按钮受控aria-pressed，并映射反向偏好的实际角色。笔记历史行及当前快照A/B补aria-pressed。DOM连续A→另一B→重复B验证原行仍连接、焦点留在按下按钮且pressed正确；真实宿主焦点仍交Root。
- SP-04：CompareEndpoints保留引用输入，新增danger/success soft的A/B角色胶囊，加载后显示已固定commit短OID。真实compareFiles聚合文件数和加减；任何unknown/binary行数显示?并明确提示，不伪造0。identity切换立即清旧汇总，显示加载/错误。DOM验证总计、角色、loading清旧数据及unknown统计。
- SP-05：CompareWorkspace从pair与跨入口swapped偏好生成唯一有效A/B，pin/list/stats/逐文件读取均使用该方向；MultiDiffView不再对已经定向的输入另反转。端点栏和diff toolbar两个交换入口更新同一偏好，编辑引用与历史行选择也映射至相同实际角色。DOM验证两个交换入口、预先反向偏好、rename old/new路径和B=WORKTREE的领域请求与汇总。原单文件DiffSurface仍把呈现方向与原始写proof分开，原风险测试保留。

### 实际检查

所有过程材料仅留/tmp/huhu-t16-repair。以下Vitest使用--config /tmp/huhu-t16-high-review/vitest.config.mts（继承仓库配置，只改cacheDir）。

| 命令/范围 | 实际结果 | 本地日志 |
| --- | --- | --- |
| vitest run --project unit src/modules/versioning/core src/modules/versioning/services src/modules/versioning/ui src/modules/versioning/platform/desktop/system-files.test.ts | 退出0，13文件93测试 | unit-all.log |
| vitest run --project dom src/modules/versioning | 最终退出0，9文件64测试 | dom-final.log |
| vitest run --project native-integration test/sync | 退出0，5文件92测试 | native-all.log |
| 最后窄路径校验后vitest --project native-integration test/sync/git-hunks.test.ts | 退出0，7测试，含伪造rename端点拒绝 | native-final-hunks.log |
| tsc --noEmit --skipLibCheck -p /tmp/huhu-t16-repair/tsconfig.json | 最终退出0；覆盖源与新增测试的局部图 | types-final.log |
| eslint 9个本轮生产TS/TSX路径 --max-warnings 0 | 最终退出0、零诊断 | lint-final.log |
| prettier --write 本轮12路径 | 退出0 | format*.log |
| node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-16 --matrix redesign --check --out /tmp/huhu-t16-repair/fixture-check | 退出0，status=preflight；fixture直接消费真实组件，无需另改副本 | fixture-check.log、fixture-check/result.json |
| validate-dispatch --stage dispatch 对073 | 退出0，errors=[] | 工具回执 |

070已有真实反例作为修复输入，并在/tmp/red-project独立源码副本上回放本轮正向测试、覆盖回068冻结起点，不改工作区获取red。red-dom最终退出126，7项分别因原aria缺失、new/deleted无restore、hidden读取、跨叶焦点、swap角色不变、隐藏未abort而失败；red-native退出126，staged rename因invalid hunk comparison失败，new/deleted恢复因原实现不接受null proof在prepare抛错，empty例通过（3 failed/1 passed，其余按-t未选）。这些失败是修复前对照，不是候选验证失败。red材料为red-dom.log/red-native.log与两个临时config。

首次临时red config因/tmp缺vitest解析入口启动失败，已仅在/tmp补node_modules软链接后完成上述对照，不把启动失败当产品red。首次scoped types发现新增测试mock漏signal类型，修正后通过。首次lint发现render写ref，改layout effect后通过；同次还列出3个按仓库默认忽略的测试文件warning，最终仅对适用production路径执行，不宣称测试被lint。没有删除、跳过或放宽既有风险断言。

## 问题与下一步

本候选交给Root独立high双轴审查；Root继续生成并核对main.js/styles.css、完整build/bundle/notices、最终生产UI矩阵、可信命中与真实Obsidian多叶/popout/隐藏恢复。局部类型/DOM/TEMP Git和fixture preflight不等于这些宿主或生产门通过。ST-03由Root修复并另行登记，本报告不代验中央NOTICE图。回收校验在本不可变REPORT落盘后执行，真实退出码以工具回执/最终交回为准。
