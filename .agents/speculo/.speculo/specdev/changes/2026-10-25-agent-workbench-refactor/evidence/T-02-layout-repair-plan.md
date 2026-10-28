# T-02 布局协调最小方案

只读分析阶段已核对 selection probe 原 entry/stdout、workspace-store/SpaceService/WorkspaceService、threeWayMerge/rebaseChanges 及 workspace ops；该阶段未跑测试/构建或改源。Root 随后正式解冻第二集成周期，下面作为实施不变量。

1. bridge 必须观察同 selectedID 的真实 layout 内容变更；Space rename/error 等 layout 字节不变通知不产生 adopt/dirty/write。same-ID 同步不调用恢复用 normalizeWorkspace，不重置 runtime state/unread。
2. 每个 Space（含 undefined/shared）保留一个最小内存 draft：已观察 persisted base、working view、dirty、在途保存快照。切换不能把旧 draft 的未保存/失败编辑丢掉；只更新当前 selected 的可见 store。
3. UI save 携 immutable `{base,value}` 进入同一 SpaceService queue，在执行时与最新 layout 合并，不能把旧全量 value 当最新 base。普通目录/schema/permit/JsonStore 门不动。
4. UI save 在途时，该 draft 暂存新的 persisted 通知，保存结算后再协调：成功以 submitted value 为基线重放本地后发生编辑（复用 rebaseChanges）；失败以原 base 对当前本地与最新 persisted 做并发合并，保留 dirty 并明确拒绝真正冲突。这样不会把自己保存的 ack 与更晚本地 rename 误判为两个独立写者冲突，也不锁 Provider 等待。
5. 布局专用合并只剥离 remote 新增 tab 对树/active 的附带变化（复用 closeTab，保留原 closedTabs）；其余既有字段用严格 threeWayMerge，post-submit 用 rebaseChanges。再经 openTab 把这些新引用放进合并后可见布局，保留本地后来改变的 active tab/group/focus。不能把 generic local-wins 直接套到两棵首 group 不同的树，造成引用在 tabs 里却不可见。
6. 真正既有字段并发冲突抛 DocumentConflict 并保留 local/base/remote，不静默选边或无条件 adopt。flush/drain await 已接纳工作及后续本地编辑，不自动重放失败业务。

精确拟写集（全部已在本次解冻允许范围）：
- services/workspace-store.ts（仅 v2 bridge；v1 保持）
- services/spaces/space-service.ts（base/value 布局 edit 入口，原 updateLayout/类型作用域门不回退）
- services/spaces/layout-merge.ts（新增，唯一布局专用合并）
- services/workspace-store-spaces.test.ts（新增，真实 SpaceService+bridge 的 dirty/在途/失败/无变化通知）
- services/workspace-service-spaces.test.ts（现有，精确 select primary 挂起与相反次序/后续 flush 引用）

先红矩阵：原 select 写挂起→attach→select adopt→append→openPage+flush；逆序 append→select；同 ID clean adopt；dirty page/rename/close+append；UI save 在途前/后 append 与本地后续编辑；真正同字段冲突拒绝/两方保留；无 layout 变化事件零保存。保留前轮两个并发启动、scope/future/EIO/needsRecovery/owner 故障回归。用 deferred 信号精确控制，不靠 sleep/timeout/Provider 全局锁。三 probe 从当前源重打包，新 stdout 独立文件。Root 独占生成物/全门/复审；不重拍 UI 或跑 B22。
