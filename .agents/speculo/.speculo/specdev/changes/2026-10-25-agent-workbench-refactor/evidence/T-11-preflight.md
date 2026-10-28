# T-11 本 Vault 历史：只读实施前预检

基线：`/home/wta/orca/workspaces/obsidian-huhu/terminal`；派遣 HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`；GP-013 / Map14。本报告不是 Ticket 实施、审查或验收。Root 已报告 T-03 SOURCE STOPPED 并进入独立 review；下列 SHA 是当前工作副本时点观察，不是冻结。读取明细、完整文件字节 SHA/UTC 在 `/tmp/huhu-t11-source-observation.json`（69 项，SHA256 `c79dab94986316a2b2749b89e7f288d70745e1d2423dfe1c189ee0b6f1661a84`）。

## 已有生产链及可复用事实

- `Controller`（`services/controller.ts:256–274,343`）创建默认 **account** 的 `historyStore`；另建 `vault` 的 `workspaceHistoryStore`，目前供 WorkspaceUsage 使用。`ui/history/SessionHistoryPanel.tsx:175–212` 订阅前者，默认 vault 是读完后的行过滤；搜索还包含 firstPrompt/turns。`ui/AgentWorkspacePage.tsx:124,171` 也直接 refresh/store-find，拖放后调用 resumeAt。因此只改 native 查询或抽屉标签不能交付当前 Vault 投影。
- `platform/history/service.ts:94–103,192,249–286` 已有分 scope 的 `index.sqlite` / `workspace-index.sqlite`、独立设备 `history.json`、按消费者取消的共享读、连接 revision 和有界页缓存。六 Provider 的 managed/system 根由现有账号 owner 解析，系统路径没有变成任意文件读取器。`desktop/history/scan.ts` 是另一个仅 Claude/Codex/Gemini 的扫描器；其当前调用检索仅见自身测试，不能把它称为六 Provider 的现行主链。
- helper 的 `agent_data.rs` 已只读解析六格式、校验真实目录/来源/sidecar、WAL 分批提交、读写分连接，`data.rs` 在 worker 处理历史并支持请求取消。OpenCode 在读取消息前先查 session 元数据及 cwd（`:1099–1135`）。但 Gemini JSON 在最终归属判断前反序列化消息；JSONL 在逐条 consume 后才检查当前 cwd（`:1009–1090`）。这是摄入前分类需要补齐的**静态接缝**，本轮未运行外库泄漏反例，不能声称已复现污染。
- `HistoryStore:31–84` 遍历全部 offset 页，再以并发 4 读取每条正文及原始 details；没有跨页 revision 约束。native `query:514–580` 有事务内过滤、100 条 LIMIT 和 revision，但 offset 不绑定同一跨请求快照。UI 虚拟化不限制前述全量正文读取。`desktop/history/details.ts:24–41` 还会读取原始全文以提取元数据。
- 自有 title/tags/favorite/archived 独立于 SQLite，可复用提交失败反馈；目前不是含完整 provenance、注释正文及 missing/partial/unsupported 状态的来源记录库。查询会排除失效来源，Store 重建 rows 不再显示该行；仅 metadata 尚存不等于用户能继续查到孤立标注。`SessionRecord` 目前只有可选 Provider/accountId/nativeId/transcriptPath；fresh 运行的 hook 身份先进入 `TerminalSession.setActivity:349–356` 和可见 pane 的恢复元数据（WorkspaceService:473–480），不能据此假定所有后台运行已有持久完整 native 绑定。

## 最小实施顺序与前序必须留下的接缝

1. T-09 完成后，以现有 Controller 装配一个当前 Vault 历史用例；注入全 Space（含归档）持久 Session 绑定和稳定身份，不从当前 UI 选中 Space 或 cwd 合并。先冻结供 T-12 共用的完整 source ref / locator / provenance codec、来源状态及能力；不是另造运行 owner。
2. native scan 先按 HUHU 精确绑定 → 可验证 Vault 内 canonical cwd → 显式导入的精确来源判定，再解析/入库正文。库外 Space grant 只授权该 Space 的绑定 Session，不授权同账号的全部历史；保持 grant 撤销、物理改向与来源路径复核。元数据无法可靠判定的格式保留未归属，不全文兜底。限定归属探测/单页/preview 的资源量和取消点，并以 fixture 实测具体限值。
3. 查询只搜标题/元数据并在分页前执行 Provider/Space/时间/归档筛选；页有一致水位或明确 refresh-required。只预览所选行才读有界正文，旧查询/隐藏或关闭预览取消自身读，不能取消其他消费者。HUHU 标注与来源状态在可重建缓存之外持久保存，损坏/轮转/缺失按来源局部降级且保留自有事实。
4. T-06 必须提供带 runtime fencing 的真实 native ID/locator 来源证据，不能为六 Provider 编造同等 hook 能力。T-07 的 history route/capabilities、T-09 的面板布局是**未来接缝，尚无本轮可引用真实签名**。T-11 交付 GUI 与 CLI list/preview 同用例，不能只建孤立新 store。历史只取得 T-01 history lease；允许所需 helper，禁止 PTY/Provider spawn。

## 精确写集缺口及 owner

- **明确入口缺口：** `src/modules/agent/services/controller.ts`、就近 `controller-history.test.ts` 不在 T-11 当前写集；需要完成 Vault 装配、传入绑定和原路径替换。已有 `platform/desktop/server/native-history.test.ts` 也不在只含 agent-data-client.ts 的写集，应补入，以覆盖真实 NativeHistory 根、取消和装配。
- **接线后再精确确认：** 当前 `src/modules/agent/ui/AgentWorkspacePage.tsx` 及其 DOM 用例在 `ui/history/**` 之外；若 T-09 未将 refresh/drag-resolve 封装，分页后不能继续只在已加载 rows 中找引用，须授权该窄接线。SpaceService 已公开 store 可读，不应先扩整个 spaces 目录；若完整绑定要写进严格校验的 SessionRecord，则补 `services/spaces/records.ts`、`space-service.ts` 及其定向测试，由记录 owner 单写；若采用 history-owned 绑定登记则在现有 history 写集闭合并与 T-15/16 明确交接。
- `WorkspaceUsageStore` 目前按 workspaceHistoryStore 全行聚合。不要使分页后用量变成“当前已加载页”的总计；可保持现有独立聚合接缝。只有实际调整该依赖时才补 `services/workspace-usage-store.ts` / `.test.ts`。新存储名称若进入统一路径常量，才精确补 `src/shared/storage/vault-layout.ts`；不要提前凭空定文件名。
- 互斥拆分可为 A：core/history、NativeHistory、native 解析/查询/来源登记与 TS 契约；B：HistoryStore、抽屉及 DOM（等 A DTO 冻结后）。Controller/i18n/共享 schema 只给一个实际 writer，Root 仍独占生成物。native 与 TS 字段由单一契约/对照测试固定。

## 可执行验证接缝与未决边界

可复用但本轮**未执行**：history-store.test.ts（分页/取消/vault scope）、desktop/server/native-history.test.ts（六来源与共享取消）、scope.test.ts（编码/路径）、Rust agent_data::tests 中 canonical/alias、cancel、六格式/未知 usage、OpenCode 只读/child 排除、companion 更新、metadata-before-pagination、WAL reader、sidecar/link/权限样本。扩展 fixture：不同 Vault 混合账号/同 nativeID 不同来源；正文放在归属字段之前；外部绑定精确白名单及撤销；来源消失后标注仍可检索；扫描中翻页不静默重行漏行；预览取消/大文件有界；真实 NativeHost history 请求保持零 PTY spawn。DOM harness 可验证标题、筛选、只读、部分失败、键盘/focus-return，不能代替主题/窄屏/多窗口实机。

需在实施前冻结的是工程格式（完整 ref、来源能力、分页失效语义），不是新增产品决定。T-15 接收旧 account 标注隔离映射与格式版本；T-16 接收自有标注/绑定/来源 provenance 的 codec 和严格 drain，不导出 SQLite 缓存、原生全文或凭据。复用 reference-notes R-01/R-02 的运行/显示分离与现有 HUHU 索引，不引入 Wave 存储栈、不使用 Herdr 自动重启；R-04 仅复用既有终端边界。本轮没有新增陌生依赖或外部研究，也未复制外部/GPL 代码。

未运行测试、类型检查、lint、build、helper、Provider、Obsidian 或 native 可执行文件；无 Git/源码/正式记录/用户数据操作。真实六 Provider 及 Windows/macOS/Linux 适配、宿主主题/视口/输入由后票自动化及用户实机分工分别验收，本报告不提供 pass/skip。**READ-ONLY STOPPED**。
