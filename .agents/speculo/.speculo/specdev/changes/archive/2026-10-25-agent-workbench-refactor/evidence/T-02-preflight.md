# T-02 只读预检与最小实施路线

日期：2026-10-25。执行者：`/root/prepare_t02`。范围：准备，不是实施或 T-01 审查。

## 当前结论

T-02 可以继续复用现有 React、Zustand、JsonStore、设备映射、布局操作与 xterm；无需新增数据库、helper 能力或 npm/Rust 依赖。但当前票的写集缺少真正的创建服务和主空态组件。解锁前应由 Lead 修订 Ticket/Map 的路径与相关 Skill 引用摘要，再冻结 T-01 验收后的真实输入。

本轮没有修改项目文件、正式状态或 Evidence，没有创建 worktree，没有运行构建/测试。只新增本 `/tmp` 报告。只读观察时分支 `NAMEWTA/terminal`，HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`；T-01 正在写当前工作副本，这不是 T-02 的固定源码基线。

本报告形成期间，Root 传达了最新用户决定：**“必须绑定 Space，旧入口先要求用户选择”**。所有受管运行最终都需要显式稳定 Space；不存在独立业务运行的豁免。交互旧入口先选择并冻结 ID；后台自动化无持久有效绑定时拒绝并提示配置，不能按 cwd 或焦点猜。Root 正在更新原权威工件；本报告以这条新决定修正以下端口建议，不能把尚在写入的合同当固定摘要。

实施仍须等 Root 明确解锁、T-01 done 且其有效 Evidence 可回读。T-01 的 controller/module/native 变化只作为即将交接的依赖，不对其瞬时差异做审查。

## 已消费的合同

- 根 AGENTS；workspace roots；catalog；Speculo 运行指南；I 权威入口、activation/domain-runtime/execution-policy/preflight/implementation-procedure、design-contract、coordination 合同。
- 完整 Map revision 3；T-02；Spec §3.1–3.2、3.5、3.8、3.10、§4–7、§11；implementation-contracts；ADR-001/002/003/008/009；CONTEXT；README Execution Context；Goal GP-002 的执行/验收分工。
- dev/ui 入口和本票绑定的 architecture/licensing/testing/design-system/shell/motion-a11y；按真实触发补读 module-authoring/settings-and-i18n/obsidian-api/skill-maintenance。
- approved DESIGN revision 1，digest `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`；固定 DESIGN-0001；UI-001/A 的设计说明与批准。没有更改获批原型或永久设计。
- reference-notes 的 R-01/R-03，以及现成 HUHU 存储机制。R-01 活动/Apache-2.0 与 R-03 活动/逐文件 ISC 证据已在该 change 的 reference-sources.json 固定，本轮复用其机制研究，不重新读取未知第三方终端源码。

验收边界按新合同执行：T-02 完整承担 AC-001、003、053 和 PAGE-001 的局部 AC-061；提供 AC-002 的身份/布局/归属切片、AC-004 的 GUI/公共解析切片、AC-046 的元数据失败切片。AC-002/046 的邮箱组合归 T-10，AC-004 的 CLI 黑盒归 T-07。真实 Obsidian、Provider、目录选择器、双宿主、五平台实机由用户验收；Agent 仍需完成生产实现、自动化和构建，不能仅交付接口。

## 现有代码的实际接缝

| 位置 | 事实 | 对 T-02 的影响 |
|---|---|---|
| `core/workspace/model.ts` | WorkspaceState 是 version 1 的 tabs/groups/layout/closedTabs；没有 Space；ResumeInfo 只有 cwd/Provider/account/native 引用 | cwd、tab 或 runtime 都不能冒充持久 Session/Space；需增加独立业务模型 |
| `services/workspace-store.ts:15` | 固定写 `.huhu/terminal-agent/<device>/workspace.json`；500ms 防抖 | 新格式必须走独立文件/版本化子结构，不能直接覆盖 v1 |
| `workspace-store.ts:39,46` | flush 的 catch 只 report 后 resolve；ready 也 catch/report | `await persistence.ready/flush()` 当前不证明保存成功；不能据其放行进程 |
| `services/workspace-service.ts:128` | newTerminal/newAgent 等 ready 后直接 launch，再 attach 更新内存 | 生产先启动后存盘；只新增独立 SpaceRepository 测试不能修复真实入口 |
| `workspace-service.ts:354,425` | splitPane/restore 也直接 launch；restore 替换 pane/session id | 新业务入口需统一经过持久 Session 提交和目录/owner 校验，旧恢复兼容另保留 |
| `services/controller.ts:155` | controller 装配 WorkspaceStore/Service，并提供 shell/agent/resume 端口 | 这是注入 SpaceRepository、desktop directory/owner 端口的最窄现成入口；必须在 T-01 稳定后重读 |
| `controller.ts:499` | start 还有直接 `sessions.create` 路径；newShell/newAgent/QuickCommand 有不同入口 | 不可仅在 Sidebar 表单加保护；需明确新格式交互用例的统一入口，旧自动化语义由 T-14 承接 |
| `services/terminal/sessions.ts` | create 生成新的 `terminal-UUID` 并设置 HUHU_SESSION_ID；当前 TerminalSession 是一次运行对象 | T-02 先建独立持久 Session ID；本票不把新持久 ID 等同已有 runtime ID，不提前实现 T-03 的完整运行代次系统 |
| `core/workspace/ops.ts:241` | normalizeWorkspace 的 ResumeInfo 是白名单重建 | 如果在 ResumeInfo 加持久引用，必须同步 normalizer；否则重启会丢身份 |
| `shared/storage/vault-identity.ts` | version 1 逻辑 vaultId、盐化 host fingerprint、设备映射；复制库保留 vaultId，同主机复制还会保留 deviceId | 它不提供物理目录绑定或跨进程唯一 writer；保留其 schema 即可，没有必要修改其只读源 |
| `shared/storage/write-queue.ts` | 队列挂在同一个 adapter 对象的 Symbol 上 | 只串行本进程/同 adapter；两个 Obsidian 实例不能靠它互斥 |
| `shared/json-store.ts` | 校验、备份、readback、并发三路合并、损坏输入保全已存在 | 可直接用于新业务文件，但调用方必须等待 commit、采用返回值并传播失败；业务冲突仍需明确诊断 |
| `platform/desktop/history/canonical-cwd.ts` | realpath + 内库判定，只允许 Vault 内目录 | 可借真实目录核验思路；不能直接作为授权库外目录的执行校验器 |
| `host/desktop/huhu-paths.ts` | 解析 vault 别名，禁止 .huhu 受管树内 symlink | 用于业务存储安全；不能替代用户 cwd grant |
| `ui/sidebar/AgentSidebar.tsx` | 现有 Sidebar 只列 tabs，按状态/Provider 分组 | 可在其上部加入 Space 导航/新建/重命名，保留既有过滤、菜单和页签入口 |
| `ui/workspace/WorkspaceLayout.tsx:145` | 主空态只有“新建终端”，且 TabStrip 的 + 仍能建终端 | 无 Space 必须改为显式建/选 Space，并保留网页入口；空 Space 与无 Space 要分别呈现 |
| `ui/create/Omnibox.tsx` | 所有 Shell/Agent 菜单动作调用 WorkspaceService；pending/error/IME 处理已有 | 复用，不另造创建体系；无 Space 时引导创建/选择，服务端仍拒绝缺目标 |

目录选择器实情：全仓只有 Browser 的 `chooseCookieFile` 与 Safe 的 `showOpenDialog` 文件选择先例，没有现成 Agent `pickDirectory`。可借它们的所属窗口 Electron 适配模式，在本模块 desktop/spaces 下新增 `properties: ['openDirectory']` 的窄端口；不能跨模块导入 Browser/Safe 私有实现。UI 不读 fs、不从文本路径自行 mint grant。

## 推荐的最小生产路线

### 1. 新记录与旧布局展开并存

新增一个 versioned envelope，建议位于 `.huhu/terminal-agent/<device>/workbench-v2.json`（最终命名由 Lead 记录，路径常量进入 vault-layout）。单文件保存 Space/Session 基础与以 spaceId 为键的设备布局/当前选择；这是一次文件提交，不能声称多个文件原子事务。

最低业务字段：

- Space：随机稳定 id、vaultId、名称、directory binding、archived、创建/更新时间。
- Session：随机稳定 id、spaceId、kind、title、启动配置引用、可选完整 native reference。Provider/account 引用可保存，环境变量/凭证不保存。
- Directory binding：内库相对目录，或本机确认的 grantId；grant 保存本设备与当前物理 Vault/真实目录绑定。名称和 cwd 从不参与身份去重。
- 布局：`Record<spaceId, WorkspaceState>`。共享网页/board/usage 的旧路径保持既有承载，不能给浏览器造 Agent Session 或强制先建 Space。
- runtime→持久 Session 的关联与当前 owner lease 属于内存/本机运行状态；不得在加载时恢复为活动运行。

强校验未知版本/损坏主件；有有效 backup 才恢复，保留 corrupt 原件；没有可恢复输入时显示错误并阻止写/启动。不要先 normalize 成空对象再覆盖。

T-02 不实施旧格式迁移：v1 workspace.json 原件保留，不能把旧 tags/groups 自动变成默认 Space。新模式只在隔离新格式 fixture/测试 Vault 验证。生产装配需显式区分新业务记录路径和 legacy compatibility 路径，保证新布局不会经原自动订阅又写回 v1 文件；这点比“文件名是 v2”更重要。最终旧用户转换与 writer 切换由 T-15 完成。

### 2. 可等待的业务提交

Space/Session 创建与 rename 采用 `await repository.commit` 后再发布新持久状态/成功结果；失败保留有效旧状态与用户草稿，错误可见。不要改变全仓 JsonStore 或把旧布局的 report-only 行为假装成可靠提交。

新格式的真实交互启动入口调用同一用例：精确解析 Space → 校验 owner/目录 → 构造并提交持久 Session → 再校验 owner/目录 → 调用 launch。失败时无 launch。启动失败时 Session 仍可定位并带失败结果；不得把已创建外部进程和磁盘更新称为事务回滚。

既有 `WorkspaceService.newTerminal/newAgent` 是必接入口；split/restart 等走相同新格式边界。旧历史继续和自动化的消费者接线分别归 T-12/T-14；它们也必须满足显式 Space，不能保留无 Space 的运行例外。本票先提供同一选择/解析/校验端口，不提前做完全部旧消费者。controller 的其他直达 spawn 调用需在稳定输入上逐个标注归属，不能留下从新 Space UI 绕过提交的路径。

### 3. 物理 owner 与目录 grant

将物理身份与逻辑身份分开：当前逻辑 vaultId/deviceId 来自现有 initializeVaultIdentity；desktop 端口取得 realpath + directory stat identity，并创建本次 instanceId/nonce。owner 键必须由物理目录确定，不能仅使用 vaultId，也不能因目录别名生成第二个 owner。锁/活动 owner 信息落本机私有运行目录，不能放可携带业务包。

本轮追加工程比较后，Lead 已选择实际 TS 写进程持有的 loopback TCP 排他监听，详见文末“单 writer 原语最终工程决策”。此前 mkdir/exclusive-file 候选不采用：不能只凭残留文件安全证明原实例已结束，也不能让正常崩溃永久堵用。不要按年龄/mtime/PID 自动抢锁。T-07 后续可复用业务 owner 身份生成 locator；本票的排他端口没有业务协议，不能当 CLI/活动 gateway。

grant 由本机目录选择成功且用户确认后建立；取消时零 grant/Space 写入、零启动。内库文本只接受规范相对路径，拒绝 traversal/绝对路径/跨盘隐式转换；规范化后用真实目录关系判断，禁止字符串前缀判断。外部路径文本只能查找已有 grant，不能自授予。启动前 realpath/stat 要与 grant 的设备、物理 Vault、真实目录身份一致；symlink/junction 改目标、目录删除后重建、设备/库路径绑定变更、显式 revoke 均拒绝并要求重新确认。最终传给进程的是核验后的 canonical cwd。

该校验不是 OS sandbox，也不承诺抵抗恶意同账号进程在最终检查后替换目录。测试应验证普通受控替换和授权失效边界，不虚构文件系统事务。

### 4. GUI 和公共解析

沿 A 方案给 Sidebar 加 Space 列表与新建按钮；create Dialog 先名称、再内库目录或本机选择/确认外部目录；重命名持久 ID 不变。显示完整名称 title/详情，长名 truncate 不挤压菜单。选择 Space 只切显示布局，不结束进程、不按 cwd 合并。

主空态分 no-spaces/loading/error/empty-space；无 Space 保留创建空间与网页入口，空 Space 提供终端创建；有 writer conflict 或目录失效时持久展示原因与处理动作，不能只 toast。每个按钮用现有 Button/Dialog/Input/Select 等，en/zh、Label/错误关联、IME、Esc/焦点返回、32/44px 点击区域、容器响应式都沿现有组件。

公共 resolver 从稳定 ID 精确定位；缺上下文返回 TARGET_REQUIRED，名称命中多个返回 TARGET_AMBIGUOUS 并携候选 ID/Space，不选第一个。只有显式稳定目标才允许同 Vault 跨 Space；跨 Vault/失效 owner 明确拒绝。CLI envelope/黑盒路由留 T-07，本票测试这个真实公共服务接缝。

### 5. 为旧入口提供的复用端口（按最新用户决定）

建议在 `core/space` 定义数据/结果类型，在 `services/spaces` 定义实现与端口，controller 提供本模块唯一实例：

- 只读 `listSpaces` / `resolveSpace`：请求显式带 stable spaceId 或有界发现条件；返回带 vaultId/deviceId/spaceId 的不可变目标快照。缺失、归档/删除、过期物理绑定、同名歧义分别可判定。不能“只有一个就选它”，也不能匹配 cwd 自动认领。
- 交互 `selectSpace`：用户从现存 Space 明确选择，或先显式创建再选择；返回 stable spaceId，取消返回准确 cancelled。打开选择器只读，不 launch；不能静默建默认 Space。选择器复用同一生产 Space 列表和 A/Dialog 组件，不在每个旧调用者各造 picker。
- 执行 `requireSpace`：接收已经冻结的 spaceId，重新检查当前 Vault、owner、目录/grant 与对象有效性，产生可用于 Session 提交/launch 的目标。异步对话框/权限确认期间当前选中 Space 改变，不改变这次已冻结 ID；真正执行前失效则失败，不能换到新焦点。
- 后台调用不允许弹出 picker：T-14 消费者必须传配置中明确保存的有效 stable spaceId；没有绑定、绑定删除/归档、外库或 grant 过期时返回目标/授权错误并提示配置。持久化绑定只由用户配置写入；本票只提供解析/验证能力，后续票负责修改自动化配置和入口。
- 跨模块公开只经 `agent/api.ts`；建议 T-02 先交付模块内生产 `SpaceSelectionPort` 与 resolver，T-14 在接具体消费者时投影到公开服务，避免本票先新增整套跨模块服务注册。如果 Root 要求 T-02 同时公开 service key，则需**提前**追加 `src/modules/agent/api.ts`、`manifest.ts`、`module.ts` 及其真实测试写集；不能跨模块导入 `services/spaces`。

ControllerDialogs 目前由 module 注入 confirm/prepare，适合扩展懒 `selectSpace` 回调；如果选择该接线，`module.ts` 是真实新增写集，不应让 services 静态导入 UI。更小替代是在现有工作区页面/Sidebar 托管 picker，通过独立服务端口请求并完成选择；页面不在时拒绝交互请求并引导打开工作台。两种都不能自动取当前焦点替代用户选择；最终由 Lead 选定并冻结一种，避免同时存在两个 picker owner。

本票应新增端口合同测试：无 Space 不 launch；只一个 Space 也不隐式绑定；选择取消不写/不启动；选择 A 后焦点切 B 仍返回并使用 A；A 在选择后删除/归档则执行拒绝；后台缺/过期绑定不弹 GUI；同名不取首个。T-14 再对 Home、Browser、快捷命令、PromptRunner/Dispatch/自动化真实调用者逐个补接线和回归。

## 写集修订建议（须由 Lead 先处理）

现有授权目录足以新增：`core/space/**`、`services/spaces/**`、`platform/desktop/spaces/**` 的模型/repository/resolver/directory/owner 及测试，以及 Sidebar/create/i18n、workspace-store、controller、docs/data。无须新增独立模块、修改 native/pty-server、package.json 或 vault identity schema。

推荐路线真实需要增加以下精确路径，而非扩大成整个 agent/**：

| 路径 | 为什么必需 |
|---|---|
| `src/modules/agent/services/workspace-service.ts` | 原有 GUI 创建/split/restore 真入口；接入先持久再 launch、Space 切换与归属 |
| `src/modules/agent/services/workspace-service.test.ts` | 对真实服务验证写失败零启动、持久身份与旧风险承接 |
| `src/modules/agent/core/workspace/model.ts` | 在 ResumeInfo/显示引用中保留持久 Space/Session 关联，避免拿 runtime ID 作业务 ID |
| `src/modules/agent/core/workspace/ops.ts` | normalizer 白名单必须承接新增引用，否则重启即丢失 |
| `src/modules/agent/core/workspace/ops.test.ts` | 持久引用往返/损坏引用与原布局风险回归 |
| `src/modules/agent/ui/workspace/WorkspaceLayout.tsx` | 真实 PAGE-001 无 Space/空 Space/加载/错误与网页入口 |
| `src/modules/agent/ui/workspace/WorkspaceLayout.dom.test.tsx` | 对生产主空态交互验证，而非只测新增表单 |
| `src/shared/storage/vault-layout.ts` | dev 硬规则要求新增持久化路径常量统一 owner |

如果实施采用独立 layout→Session 映射并能在生产重启路径证明不丢引用，可不改 workspace model/ops；上表是更窄、易回读的推荐路线，不要求双份映射。

以下是确定接口后才可能需要的窄补充，不应现在泛化授权：`ui/workspace/page-tabs.fixture.tsx`（若新 constructor/Sidebar 依赖影响现成 fixture）；`ui/AgentWorkspacePage.tsx` 与其 DOM 测试（只有全局新建快捷键需要主组件托管创建对话框时）；`services/controller-native.test.ts`（否则生产装配测试可放已授权 services/spaces 下）；`services/launch/launcher.ts`（仅当决定复用同一 resume cwd 校验，不能为了 T-02 提前改 T-12 的完整原生恢复）。

需要同步的规则事实：新持久化名称与“身份提交立即、布局防抖”的差别由 `.agents/skills/dev/references/architecture.md` 拥有；其事实发生变化时，应加入精确写集并更新绑定摘要。新增适用参考 module-authoring/settings-and-i18n/obsidian-api 可由 Lead 纳入当前绑定；无需改 dev/ui 入口或永久 ADR/context。docs/data 只记已实际实现的本票切片，不提前宣称 CLI/邮箱已交付。

`vault-identity.ts` 同时出现在 writable wildcard 与 read_only_paths 中；本路线不改它，避免碰此歧义。若后续确实需要更改，必须先由 Lead 消除路径合同冲突，不能凭 wildcard 覆盖只读项。

## 自动化接缝与 red/green 顺序

1. Space repository 真存储字节：新建为空无 launch；两个同 cwd/同名不同 id；rename id 不变；保存、关闭/重开后 layout/session 归属不合并。用生产 JsonStore + TextStorage 故障端口，不把 Mock 调用次数作为唯一证据。
2. 失败保存：backup 写失败、primary 中途写坏、readback mismatch、磁盘只读/满、坏 JSON、未知版本、无效 backup。断言原有效字节/恢复副本保留、无伪成功、无 launch、新记录不发布；重试不会重复创建持久 ID。
3. 真实服务顺序：暂停 commit Promise 后发 newTerminal/newAgent，证明 launch 尚未开始；commit reject 后进程创建次数为零；成功 launch 收到 canonical cwd 和可回读的持久 Session。dispose/重复提交竞争保留原服务相邻风险。
4. 公共解析：零 Space、未指定当前 Space、同名歧义、显式 ID、同 Vault 跨 Space、外 Vault、删除/过期目标；错误带稳定 code 与候选，未发生副作用。
5. Directory adapter 真临时目录：相邻前缀、`..`、绝对/UNC/盘符规则；有效库内目录；明确外部 grant；取消；symlink/junction 重指；原目录删除重建；revoke；复制同 vaultId/deviceId 至不同物理路径；物理绑定更换。Node fs 用临时目录，不接触真实 Vault/HOME。
6. Owner adapter 真跨进程竞争：两个子进程同时 claim 同一物理 fixture，至多一个能写；第二个保留 owner conflict；别名同目录仍冲突；不同物理目录即使复制逻辑 ID也不得路由原 owner。token 替换/损坏/权限失败/过期锁不误删，release 后正确实例可重新 claim。测试需要子进程生命周期与有界清理，不能只用两次同进程 Promise 模拟跨宿主。
7. 生产组件 DOM：通过 Sidebar 新建/取消/重命名/选择；无 Space 主空态的 Create 与 Browser；错误保留草稿、loading 禁止提交；长名可访问；键盘打开、Tab、Enter/IME、Esc 与焦点返回。新增 Space UI 使用真实 repository/服务和存储 fixture，原生 chooser 作为窄外部端口替身；不 Mock 掉整个 Space 服务然后宣称持久化完成。

实施后建议命令：定向 Space/owner/directory tests + workspace-store/service + workspace ops + vault-identity；相应 DOM tests；`pnpm test:architecture`、`pnpm test:i18n`、`pnpm test:docs`；按 TSX 类变化生成样式并跑 lint:css/test:styles；Lead 独占 `pnpm run build`、`pnpm run lint`、check:bundle 并保留产物。这里全是未来选择，本轮没有运行，也不要求重复 T-01 的未失效证据。

用户人工交接：真实宿主创建空 Space（进程数不变）、同 cwd 两 Space、外部目录选择/取消/重指、关闭重开身份、第二宿主 owner conflict、宽/窄/明暗/200%/键盘。保持“未运行”直至用户提供实机结果；不会因这一分工阻塞已约定的 Agent 代码完成。

## 额外官方研究与未确定项

为核对跨进程锁风险，只查询官方 GitHub/Node 文档；没有引入或复制第三方代码。本轮对新增锁依赖的结论是**不准入**，不是认定任何库已满足维护/兼容门。

- [proper-lockfile 官方 README](https://github.com/moxystudio/node-proper-lockfile) 描述 mkdir + mtime lease，并说明人工移除锁/不同 stale 参数可能破坏互斥；适合比较机制，不能直接照搬自动过期接管。
- [官方 LICENSE](https://raw.githubusercontent.com/moxystudio/node-proper-lockfile/master/LICENSE) 为 MIT；[package.json](https://raw.githubusercontent.com/moxystudio/node-proper-lockfile/master/package.json) 是 4.1.2，依赖 graceful-fs/retry/signal-exit。浮动 master 仅用于候选排查，未作为固定实现输入。
- [官方 Issue #121](https://github.com/moxystudio/node-proper-lockfile/issues/121) 于 2025-09-20 提出 stale reclaim 竞态，2026-07-04 有第三方评论声称复现；这是公开风险线索，未在 HUHU 复现、未核验该评论所推销 fork，不将其说成 HUHU 缺陷或采用该 fork。
- [npm/lockfile 官方仓库](https://github.com/npm/lockfile) 已于 2021-08-11 归档（ISC），不满足用户的近两年活跃要求，不采用。
- [Node v22 fs 官方文档](https://nodejs.org/docs/latest-v22.x/api/fs.html#fspromisesmkdirpath-options) 作为既有宿主基础 API 对照；最终只用 minAppVersion 对应 Electron/Node 已支持的 fs 能力，不根据当前最新 v26 文档引入新 API。
- GitHub commits/API 入口经 web 工具读取失败，故 proper-lockfile 的近两年实际 commit/release 活动**尚未证明**；没有拿 Issue 活动当维护 commit 证据。Herdr 一个猜测的 workspace 源码路径返回 404，本轮没有将其当已读来源。既有 R-01/R-03 的合格固定研究继续有效。

owner primitive 已在下方由 Lead 确定为 loopback TCP；不需要磁盘旧锁回收。Windows 物理目录 stat 标识与 junction、实际 Node/libuv 的端口互斥行为仍需代码测试/用户实机补证。本轮不准入自动抢回的锁库。

## 解锁条件与交给 Root 的高风险缺口

1. T-01 验收完成并停写；Root 冻结本票真实基线与 writer，重读 controller/module 的实际交接接口。
2. 先补 workspace-service、主空态和必要模型/normalizer/路径常量写集；不让实现者跨越票据路径。
3. 明确新文件与旧 v1 writer 的隔离方案；绝不能新状态选中后又被旧订阅保存到 workspace.json。
4. owner 必须真实跨进程，grant 必须绑定真实目录；现有 adapter 队列与逻辑 vaultId 都不能冒充这两项能力。
5. 完整生产创建入口证明保存失败不 launch；服务 mock/单独 repository 通过不足以满足本票。
6. 按 GP-002/Spec §11 做代码完成判定，保留人工 E2E 未运行；不要提前要求 T-07 CLI/T-10 邮箱，亦不要跳过 T-02 局部生产 UI 自动化。

## 单 writer 原语最终工程决策（Root 已选择；仍未解锁实施）

Root 后续明确选择：**由实际 TS 写进程持有 `127.0.0.1` 的确定端口监听，作为 HUHU 参与实例互斥；不提供控制服务、不启动 helper、不使用 reusePort/cluster 共享；占用或碰撞报明确冲突，不换端口；不用 PID/mtime 抢锁。** 这个工程决定替代上文早期 owner 候选，不增加产品需求。

### 比较与采用理由

| 候选 | 崩溃与互斥边界 | 结论 |
|---|---|---|
| mkdir / `open('wx')` + owner 文件 | 残留实体不会随进程退出消失；mtime/PID 不足以安全判断；并发 stale reclaim 易误删新 owner | 不采用，不引入复杂文件租约平台 |
| Unix socket / Windows pipe 独占 | Windows pipe 可随内核句柄退出；Unix pathname 残留仍需安全清理，macOS 无 Linux abstract namespace；单靠 connect-refused+unlink 不是原子 reclaim | 不作为五平台统一最小原语；未来 CLI IPC 仍按 T-07 正式合同 |
| Rust `File::try_lock` / OS 文件锁 | 本机工具链支持标准库锁（1.89 起稳定）；handle 关闭/进程退出释放，残留文件不是残留锁 | 原语本身可靠且无新依赖；但 helper 持锁、TS 直接写有 fencing 缺口，需再把新存储 I/O 经过持锁 helper，改动更广，本票不选 |
| 直接 libc/windows-sys | 现有依赖足够提供 Unix flock、Windows LockFileEx；后者可能需 Cargo feature 扩展 | 标准库已有封装，无需新增 unsafe OS 调用；同样不能解决“锁在 helper、writer 在 TS” |
| TS 同进程 loopback TCP listener | kernel 管句柄，TS 崩溃自动回收；无残留文件；普通参与实例同地址同端口不能都 listen | 采用；利用 Spec 的非恶意同账号沙箱边界，碰撞保守拒写 |

Native 方案的具体 fencing 风险：helper 被杀会释放它的 OS 锁，而 TS 的已发磁盘写可能仍完成；新实例此时可能已取得锁。仅在 TS 收到 closed 时检查 token 不能撤销已发 I/O。若未来必须用 native 强锁，应该让 native 只提供受限字节存储端口，TS 继续拥有 schema/JsonStore/用例；不能只加 `acquire('owner')` 就宣称严格安全。本次 TCP 把锁放回实际 TS writer，无需新增 native capability、协议或 Cargo 修改。

### 真实物理键与端口

1. 从宿主取得当前 Vault root，先 realpath，再 `stat(canonicalRoot, { bigint: true })` 并要求目录；使用字符串形式的 `dev`、`ino`，不要先转 Number 损失精度。
2. 互斥 key 可编码为固定协议 namespace + stable deviceId + dev/ino；canonicalRoot 另保存为路径绑定证据。不能仅按逻辑 vaultId、cwd、库名或字符串前缀；不要把 instanceId、plugin version、随机盐放进 key，否则竞争者会获得不同端口。
3. 同目录的 symlink/junction、Windows 大小写/长路径写法应经 realpath/stat 得到同一物理对象。用 dev/ino 作为物理身份而不把 canonicalRoot 拼进互斥 identity，还能让同 inode 的路径别名/移动路径保守保持同一锁。Windows libuv 把 volume serial 与 FileId 投影到这两个 stat 字段，见官方来源；无法取得可靠目录身份时拒绝写模式，不能悄悄退回 raw path。
4. 确定且跨进程一致的 hash 将 key 映射到一个固定、有界、非特权端口范围；编码、hash、范围统一一个函数和固定 fixture。范围只影响碰撞概率，不能保证无碰撞。不同物理目录或其他程序碰巧占用也报 OWNER_CONFLICT，不探测下一个端口、不 connect 后猜 owner、不覆盖任何 locator/业务记录。
5. 必须显式 bind IPv4 `127.0.0.1`，不能用省略 host、`0.0.0.0`、`::` 或有 DNS/双栈差别的 `localhost`。等待真正 `listening` 事件才算取得 lease；构造 server 或 bind 已提交都不算成功。
6. 每次写入/启动前重查本次 lease generation、device 与目录真实身份，路径换目标/目录重建时拒绝。归档或关闭显示不等于释放 writer；只有业务 owner 停止接纳、完成排空后释放。

### Windows/Unix 语义的准确表述

- Node `exclusive: true` 只保证不共享 cluster handle，**不是** Windows `SO_EXCLUSIVEADDRUSE`，也不是认证凭据。
- 官方 libuv v1.51.0 Windows TCP 源既不设置 SO_REUSEADDR，也不设置 SO_EXCLUSIVEADDRUSE；同一具体地址、同用户、默认 socket 选项的两个参与实例会发生 INUSE。Microsoft 同时说明同账号第二方主动使用 SO_REUSEADDR 可以改变复用行为。因此只承诺遵循同一实现的 HUHU 参与实例互斥，不承诺抵抗恶意同账号进程、端口抢占或任意原生 socket 参数。
- Unix libuv 设置 SO_REUSEADDR，并只在显式请求时设置 SO_REUSEPORT；不能把前者误写成活跃 listener 共享。实现不启用 reusePort，且只在 listen 成功后授予 lease；两个参与实例的真实竞争测试必须验证这一点。
- 实际验收记录 Node/Electron/libuv 版本。上述官方固定版本是机制核对，不能冒充已经验证每个 Obsidian 平台的二进制。

### 写入门禁与释放顺序

建议状态为 acquiring → held → closing → closed，异常则 failed。一个服务只持一个 listener/promise，重复 acquisition 共用本次获取而不是另开监听。

新业务写入先取得本次 generation 的 admission permit。进入 closing 时同步关闭新 admission，已接收的 commit 仍允许完成；drain 必须等待业务队列、底层 write、backup、readback 和已排队的布局保存全部结算，再关闭 listener 并等待 close 完成。不能先 socket.close 再 flush，也不能让任意调用者的 AbortSignal 直接释放正在使用的共同 writer。

门禁覆盖所有变更字节的路径，包括 TextStorage.mkdir/write、JsonStore 的 backup/corrupt 恢复写入和临时文件，不仅覆盖最终 primary commit。JsonStore.load 在坏主件+有效备份时会写 corrupt 副本；因此只读查询阶段不能直接调用一个可写恢复端口并绕过 owner。可先只读验证并展示可恢复状态，在首次明确 mutation/恢复动作取得同一 lease 后再用 JsonStore 完成保全和提交。

listener error/非预期 close 立即将 generation 标 failed：新 mutation、write、关联 spawn 都拒绝，排队而未开始的动作不执行；正在等待的动作得到准确错误。已发出的 I/O 可能已完成，不能将 close 描述为磁盘回滚；这部分标记效果未知、保留旧数据/恢复材料，等待其结算，不自动获取新 lease 重放。每次 await 返回后再核对 permit，失效时不发布成功状态、不继续启动进程。

listener 不解析任何请求，不返回业务信息。收到连接立即 RST/destroy，不读取正文、不握持长连接；使用有界连接数并清理 sockets。调用 unref，让它不成为 Obsidian 退出后的保活设施。Node 的 resetAndDestroy 在当前最低宿主支持时可用于立即断开；否则降级 destroy 仅处理连接，不改变锁的所有权。没有调用者需要连接这个端口。

崩溃恢复完全依赖 OS 回收 listener；没有残留磁盘锁、mtime 或 PID 探测。如果 OS 尚未回收或别的程序已占用，重开得到明确冲突并可稍后重新尝试原端口；不改端口、不自动重试业务 mutation。正常单独崩溃并等子进程退出后应可重新获得原端口，这是必测路径。

### 对 Map/Spec 的影响与最小路径

该方案完全不启动 helper：只读查询、新建空 Space、首次渲染均无需 Provider/PTY/native 进程。排他监听只在需要新业务写入时懒取得；“Agent 开启但从未使用无副作用”与 Map 的“Space 读取不带 helper”保持。它是 loopback OS 互斥句柄，没有 HTTP/CLI 控制面；T-07 的 Unix socket/Windows pipe 访问合同不被替换。

建议实现与测试均放已授权的 `src/modules/agent/platform/desktop/spaces/`，例如 `writer-owner.ts`、`writer-owner.test.ts`、`writer-owner.fixture.ts`。纯物理绑定/端口编码可以同目录独立测试；业务 permit/drain 放 `services/spaces/`，由 controller 注入。无新增 Cargo、native/shared-native 路径、依赖或数据库；除原报告列明的生产接线写集外，不为锁扩大全模块权限。`docs/data.md` 与 dev architecture owner 事实应准确说明本机排他 listener，不写成已发行控制服务。

### 必需自动化与重启证明（未来执行，本轮均未运行）

1. **真实两进程争用**：临时 Vault，用生产 owner 实现构建临时测试入口并 spawn 两个 Node 子进程，同时 claim；恰一方 listening，另一方 OWNER_CONFLICT；失败方业务文件与 locator 零写入。
2. **目录别名一致**：真实 root、symlink/junction、相同根的不同路径写法产出相同 key/port；一个已持锁时其他别名拒绝。复制相同 logical vaultId/deviceId 到不同物理目录不能定位原实例；哈希偶遇碰撞只保守冲突。
3. **外部端口占用**：普通 Node listener 预占确定端口；owner 获取失败，文件字节、主件/backup 和调用 launch 均不变；禁止换端口。占用方关闭后显式重试才可成功。
4. **真正 SIGKILL 后重启**：持锁子进程通过 IPC 通知 parent 已 listening，parent 强制终止并等待 exit；新子进程从同 key 获原端口，读取原记录，不创建默认 Space、不启动 PTY、不删任何 lock 文件。Windows 用 Node child 的强制终止等价路径，并在人工结果记录真实 OS 语义。
5. **排空后释放**：真实 owner + 可暂停的 storage write/readback；调用 dispose 后新 action 立即拒绝，但第二进程在暂停期间仍冲突；放行已接收提交并结算后，第二进程才可取得。write 失败也必须在 I/O 全部结算后关闭，不能靠吞错 flush 提前释放。
6. **异常 close/error**：分别在取得 permit 前、排队中、commit await 中注入非预期关闭；所有后续写/launch 拒绝，旧 generation 不复活。已发 I/O 的 case 断言准确失败/未知并保留恢复数据，不断言不可能保证的“零字节落盘”。
7. **目录/设备变更**：取得锁后替换 root、重指 junction、改变 device 绑定；下次写前拒绝，不发布新成功状态或 spawn；不静默改 key/port。
8. **无服务/无保活**：连接排他端口只能被立即关闭，任意字节不能触发查询/写入；慢连接不积累。仅打开查询/空态无 helper 调用；拥有 listener 的子进程在无其他工作时可正常退出，子进程/PTY 不继承排他句柄。

这些测试在 Linux 当前环境可执行部分形成自动化证据；Windows/macOS 的相同生产夹具和版本信息交用户验收，不能用 Linux 通过证明五平台。

### 本次官方来源

- Herdr 本地固定源码已核对 HEAD=`2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01`，根 Apache-2.0；只读 [plugin_registry.rs](https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/persist/plugin_registry.rs)、[plugin_installations.rs](https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/plugin_installations.rs) 见到标准库 lock/try_lock/共享 handle lease；[ipc.rs](https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/ipc.rs) 的 pathname 清理不移植为强互斥证明。未读 vendor/GPL，未复制代码。
- Wave 固定 `97e560027f494d20fed347b2d6b72b6bcb3e50e0` 的 [POSIX lock](https://github.com/wavetermdev/waveterm/blob/97e560027f494d20fed347b2d6b72b6bcb3e50e0/pkg/wavebase/wavebase-posix.go) 使用 Flock， [Windows lock](https://github.com/wavetermdev/waveterm/blob/97e560027f494d20fed347b2d6b72b6bcb3e50e0/pkg/wavebase/wavebase-win.go) 使用 filemutex；[server main](https://github.com/wavetermdev/waveterm/blob/97e560027f494d20fed347b2d6b72b6bcb3e50e0/cmd/server/main-server.go) 在业务初始化前 acquire、退出 close，并监听 stdin 关闭。以上文件带 Apache-2.0 标记；只借进程 owner 机制，不引入 Go 依赖/数据库。
- [Rust File::try_lock](https://doc.rust-lang.org/std/fs/struct.File.html#method.try_lock)：官方稳定版本与 OS 映射核对；本机 rustc=1.99.0，CI 已使用 stable。 [Microsoft LockFileEx](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-lockfileex) 与 [Apple flock](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/flock.2.html) 用于比较，未采用 native 改动。
- [Node net](https://nodejs.org/docs/latest-v22.x/api/net.html#serverlistenoptions-callback)、[libuv Windows TCP v1.51.0](https://github.com/libuv/libuv/blob/v1.51.0/src/win/tcp.c#L256)、[libuv Unix TCP](https://github.com/libuv/libuv/blob/v1.51.0/src/unix/tcp.c#L143)、[Microsoft socket reuse](https://learn.microsoft.com/en-us/windows/win32/winsock/using-so-reuseaddr-and-so-exclusiveaddruse) 核对 exclusive/reuse 的实际语义；[libuv Windows fs](https://github.com/libuv/libuv/blob/v1.51.0/src/win/fs.c#L1712) 核对 stat 物理字段。仅机制参考，不新增或改编这些源码。


