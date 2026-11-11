# 唯一 final 的实际 UI 消费者映射

只读准备，全部页面/组件名中的新增项均为后续建议，不是已实现代码。`P=src/modules/huhubot/`，共享组件均在 `src/ui/components/`，React 宿主在 `src/ui/react/`。T20–25未激活；121冻结产品输入 `2a649a6cf8959681c6dc87f5dc59151f3895c8c7938eab5e98e9ab36a2c2c1b4` 是Root声明，本任务只核自己列出的来源SHA，不冒充完整冻结树验证。

## 设计权威与示例边界

- 唯一入口 `prototypes/UI-001/final/index.html`，candidate-a；DESIGN revision2，design_ref digest `aa62a53b30d0ca32f03a5580be8ce5b4921b9c3c1767793b9173eadfde92dc6e`，baseline DESIGN-0001 `ebaca5f2f15fe081bf393c892f8b6583d4f2c6ad12cd92cb55068005fe83a331`，原 prototype digest `3c93a0c085cf3458148befdeb29ff445fe444601861c3bacb8dc9e421706444b`，确认 record_digest `29a16e6190948b8e1444028afa4673c835c944b359a8092cab2809af5a1cb46c`。逐页 design_ref/AC 继承六页；不另选方案。
- bindings.json 的历史 `design-approved-browser-pending` 与确认快照只覆盖原摘要；当前final含后续repair，repair-2记录的技术源码摘要 `96374764bb60e419652b926087a06683eea3c263b9ff98df14a2127812fa6310` 不是新的人工批准。原确认、当前字节SHA和实际目录摘要分别存sources.json；不改绑定，不请求用户重复确认，也不将repair记录冒充本次视觉/宿主通过。
- final HTML:12–19 的场景工具条、app.js:23–39 的bots/state、timer模拟回复/批准成功、fake-model-test/mock-reconcile、globalConfirmed/profileCleared都是离线示例。只继承布局、动作意图、异常态和焦点规则，不复制它们为业务store；不把示例两份笔记、四个Bot、三任务计数写死到产品。
- 生产使用HUHU语义tokens、现有字体与共享组件；不复制原型`:root`/裸z-index/静态hex主题、innerHTML图标或另一套resize/dialog/shell。叶子宽≥960内联、600–959覆盖、<600合并抽屉，阅读宽760、侧栏220–500/default280沿批准合同，任务详情非常驻右栏。

## 六页映射

| 页/批准区域及原型源 | 主要任务、状态 | 当前实际客户端/方法（不是页面实现） | 可复用组件与新增组合落点 |
| --- | --- | --- | --- |
| **BOT-CHAT** `workbench/huhubot/chat`；HTML:24–46 rail/directory/header；app.js:41–77 renderDirectory/messages/composer/chatView | 持久Bot/群目录、搜索、单聊/群公共记录、来源chips、稳定@、协作摘要；normal/empty/loading/error/offline/permission/recovery/long。 | `AssistantClient.listAgents`→agents.list；sessions.list/get/create/history；runs.start/get/subscribe/cancel；群用GroupClient.setDraft/send/retrySend/refreshHistory/loadMoreHistory/watchRun，mentions.selectMention/resolveMentionTargets。EventClient投影与持久VisibleMessage分开，public seq独立排序；来源用工厂sources.captureNote/Selection/openSource。 | Button/Input/Textarea/Command/Popover/Badge/StatusDot/EmptyState/Skeleton/ScrollArea/DropdownMenu；目录行、ChatThread/Composer/SourceChips/CollaborationSummary为T21 `ui/chat/**`,`ui/directory/**`,`services/presentation/**`组合。名册不塞temporary；长名省略仍可访问全名，空目录≠搜索无结果。 |
| **BOT-TASKS** `.../tasks`；app.js:51–56 taskRows/card，:78–80 taskBoard，:181–194 task-detail/cancel/resume/reconcile | 父子关系、发起者/执行者/已有或临时、结果回投、审批与根/子树取消；approval/running/completed/canceled/unknown/temporary，部分结果与送达分开。 | 已知RunID用runs.get+collaboration.list({runId})/get，TaskOutcome.result/partial/effectsUnresolved/usage；approvals.list/get/resolve；effects.get/reconcile；collaboration.cancel({id,expectedRevision,scope}) 或 runs.cancel；RecoveryClient.inspect/resume/retry，服务端RecoveryStatus.revision/generation/完整affectedRunIds。 | Card/Badge/StatusDot/Collapsible/Accordion/ScrollArea/Dialog/ConfirmDialog/RelativeTime；T23 `ui/tasks/**`,`ui/approvals/**`。复用diff `<pre>`语义，审批显示真实target/tool/content/sourceRefs/expiresAt/revision；“批准受理”不显示已保存，拒绝Approval不擅自把整Run设canceled。 |
| **BOT-AGENT** `.../agent`；app.js:89–92 agentView，:157–164 create/edit/group/model/disable | 持久配置、persona/职责修订、模型协议/endpoint/model/credential状态、停用/群成员与协调者；normal/creating/editing/disabled、CAS冲突保输入。 | AssistantClient create/get/update/disable/bindModel/listModels/testModel/deletePreview/delete；agents.isDefault识别默认身份。ModelBindingDraft有protocol/providerId/modelId/endpoint/capabilities/credentialRef；三协议enum已在共享API。DesktopCredentialClient仅私有register/status/delete，UI不读取秘密。群create/member/CAS/historyScope/coordinator用sessions+GroupClient。 | Dialog/SettingsSection/SettingsRow/Input/Textarea/Select/Checkbox/Switch/Badge/ConfirmDialog；T22 `ui/agents/**`,`ui/groups/**`。原型只选协议的简表不是完整生产form：persona/实际模型ID/endpoint/凭证模式必须显式，不能从label捏造配置；打开表单不Probe。重新启用缺口见G2。 |
| **BOT-MEMORY** `.../memory`；app.js:81–88 memoryView，:195–204 scope/auto/source/correct/forget/global | owner切换、private/global/short三入口，来源/修订/自动或人工/pin；空态/冲突/暂停额度原因/global pending确认。 | 当前memory八方法全部未装配，旧MemoryItem仅text/SourceRef等不够正式UI。115已被Root接纳的**实施路线**提供namespace(agent/temporary/global)、scope(profile/session/work_thread)、settings enabled/eligible/reason、item/candidate/job/proposal、不可变revisionID及CAS；尚未进入API。123 §6已收口候选以同memory.get/list Kind=context、ID=RunID投影已seal实际输入，状态pending/sealed/redacted/legacy_untracked并对entry分页；正式接口仍未生成/装配，没有可用查询。 | SegmentedControl/Select/SettingsSwitchRow/SettingsBadge/Badge/Dialog/ConfirmDialog/EmptyState；T24 `ui/memory/**`。本轮上下文必须按Run+thread选定真实输入，不拿sessions.history或示例“任务+两份资料”替身。global修正/忘记也必须走proposal增改删确认，不直接调用private写。 |
| **BOT-ACCESS** `.../access`；app.js:93 accessView，:168–171 attachments/grant/revoke | 明确附加、额外folder/vault范围、精确模型接收方、撤权、审批说明；attached/grant/denied。 | sources.captureSelection/Note/Folder/Vault产opaque scope handle；grants.list/create/revoke+当前Agent.model.revision/endpoint/protocol等构造GrantRecipient；operations read/search/send/summarize/memory/delegate/deliver按实际意图。temporary配置用collaboration.configurationHash和typed recipient proof，不拿sponsor当授权。 | Dialog/Command/Checkbox/Select/SettingsRow/Badge/ConfirmDialog；T23 `ui/access/**`。folder/vault不预选，不把原型“允许当前团队OpenAI/Anthropic”单checkbox当无限授权。SourceSnapshot显示title/revision/originView，范围/接收方变更需新合法Grant。 |
| **BOT-DATA** `.../data`；app.js:94 dataView，:205–209 delete-session/profile | 会话/Profile区别、精确预检、独立记忆保留、正文restricted/retained/purged、未知效果核查、portable预览；preflight/retained/purged/error。 | sessions.deletePreview/delete、profile.deletePreview/delete、portable.export/importPreview/import目前均false。agents.deletePreview/delete是已装配的不同对象能力，不能拿它们充当会话清除。预留DeletionPreview仅token/revision/expiry/categories；完整T17–19数据/备份/恢复/导出交付尚未实施。 | AlertDialog/ConfirmDialog/Checkbox/Table/ScrollArea/Progress/EmptyState；T25 `ui/data/**`。按后端token/CAS/真实保留项刷新，不在客户端删目录、清缓存就toast成功；不能声称删除Vault成果、用户导出或Provider远端。完整Profile清除未知效果门禁由后端决定。 |

shared组件复用≠现有领域组件：BotDirectoryRow、Composer、TaskRelation、ApprovalPreviewView、MemoryScopeView、DataPreflight等均待后续票编写。当前没有 `P/ui/`、manifest/module/settings/i18n/runtime/binary安装器；也没有Bot WorkbenchFeature/route/Service provider。拥有方法/类型不表示已拥有用户可达页面。

## 可用性、兼容差异与窄请求

可调用事实由当前methods.json方向+implemented及运行hello capabilities共同确定。host.prepareWrite/checkWrite/invoke/queryReceipt/read/search是**server→client反向方法**：目录implemented=false不代表Host服务不存在，也不能用普通client.call点击执行；T20注册真实Host并attach，T23只走public approvals/effects。models.test=true也只表示已装配方法，不表示用户endpoint/凭证可用。原型approval/completed/unknown是展示scenario，不能cast为Run.status：实际waiting_approval/succeeded与Effect.unknown_outcome分别投影；interrupted不等于RecoveryStatus.ready，审批拒绝也不等于根取消。所有revision/seq/budget Decimal按原字符串处理，不转Number。

| 编号/实际位置 | 已知差异或缺口 | 最小原owner请求/未来消费方式 |
| --- | --- | --- |
| **G1 当前运行定位**：api.ts Session:194–206只有revision/kind/member/coordinator，无activeRunId；BotMethodMap无runs.list。原型banner/send/task-header以state.run推断。 | sessions.history的可见message.runId可打开已知Run，但不能可靠代替当前active Run元数据。SESSION_BUSY时要保草稿并可去当前任务，不能从“最后消息”或本地state猜。 | T01/T03/T13后续提供同权限范围内、body-free且与Session修订一致的当前active Run标识/状态或等价owned查询；T21/T23仅渲染该事实，整体任务目录若需要分页须原owner定合同。已知receipt Run路径可先做，不阻塞所有页面。 |
| **G2 重新启用**：AgentDraft无enabled，只有agents.disable；AssistantClient没有enable。原型app.js:164直接b.enabled=!b.enabled。 | outbound/sqlite/assistant/store.go:335–360的update/models.bind更新revision/persona/model，不会把enabled改1。UI不能toast“已启用”或偷偷update当前draft当enable。 | T01/T02后续冻结最小CAS/idempotent enable语义（唯一签名由owner定），保留稳定ID/配置/历史，回读真实enabled；T22禁用未提供动作并显示原因。 |
| **G3 群恢复显示流**：GroupClient:55–61私有EventClient，watchRun:166–174无reanchor；RecoveryClient需真实reanchor入口。 | 另建空EventClient会no-op，独立恢复链不证明群展示流接好。 | 原T13提供Session/ownedRun限定的公开转发，或明确唯一EventClient注入/退租所有权；保留当前group tuple/revision、sticky拒绝、history与sibling隔离。T20持controller，T23按钮只发明确动作，不私取字段。084列了两局部选择。 |
| **G4 单聊/多叶子呈现服务**：GroupClient只接group Session；无DirectClient/全目录presentation；BOT_CLIENT只有键。 | 当前App registry只activation provide/deactivation withdraw；旧具体BotClient租约不会因重连自动指向新连接。 | T20与T01冻结唯一runtime服务/发布策略；T21 presentation用已有sessions/runs接口组合单聊，不复制Go执行器。按Profile+Session保持草稿和原未决command，页面只订阅，不为每叶子新建Runner。无需为简单单聊另造wire方法。 |
| **G5 长期记忆形状**：当前memory.list(scope private/global,ownerId)/get→MemoryItem与115 namespace/kind/Settings/MemoryPage差异。 | 旧八方法从未implemented；旧SourceRef可选字段、correct/pin/forget无必需headCAS，不能满足来源/冲突/forgotten stub/默认开启但eligible=false。 | T01按已接纳115唯一生成替换预留形状；T14六方法先真实，T15两方法/全局proposal后续真实。T24按真实capability逐分支显示，不写兼容假store，不沿099默认off旧建议。 |
| **G6 本轮实际上下文**：123 short-term-contract.md §6为已收口但未实施候选，当前共享API无manifest查询；History有限页不是压缩实现。 | 必须可区分当前Intent/合法history选择/explicit sources/long-term recalled entries/工作摘要，按实际已消费输入显示hash/来源与截断；不可截provenance或泄露其他Bot私聊。 | 沿123唯一草稿的同memory.get/list Kind=context（不新增wire方法），get ID=实际RunID、list namespace+scope(session/work_thread)；sealed才显示真实Entries与来源，pending不是空输入，legacy_untracked不回填历史，redacted无旧Text/hash/标签；get限量entry页与NextCursor、原对象hash/摘录不同；每Text展示片段≤4096 UTF8 bytes，UI按ID+PartIndex合并，同entry ContentHash不冒充Source.Ref.Hash，DisplaySlice不是原文权限坐标。temporary走实际任务namespace，orchestration无A模型输入；late effective与初始表分开。T01/T03/T14装配后T24才消费，124不冻结新DTO。 |
| **G7 预检与导出交付**：上述七个data方法false，ArtifactRef仅artifactId/mediaType/size。 | 当前没有删除失败恢复状态、完整备份范围与artifact下载/导入实际字节的TS接缝。 | T17–19/T01定义真实预检token/CAS/保留原因/恢复与artifact显式交付Port，T25接真实文件选择和预览；不能拿ref做虚构下载链接或自动合并。 |
| **G8 Host/安装/权限通知**：factory只setHost不attach，leaseChanged只连read/write；managed只接受已验证absolute binary。 | 安装/Profile选择/Status投影/Host租约timer/Grant变更清投影尚未模块化；新lease会废旧source proof。 | T20使用launchManagedBotSession+registerObsidianNoteHost并明确attach/失效通知；安装校验/staging、EOF后备、当前lease与T19维护接口由owner实际组合。T21/T23不得本地延长lease或复活旧正文。 |

T14–19不是被本预检接纳；115路线被接纳也不是实现。G1–G8都是后续既有票内的消费者请求，非新增票/全局重规划。未实现动作显示明确不可用/待装配，不造空成功，不在普通打开页时Probe/发模型请求。

## Shell/模块与状态归属

1. T20补module manifest+MODULE_IDS+MANIFESTS+app schema/feature映射/compose-workbench/导航允许项；当前ModuleId类型已有huhubot但列表未有。on-demand + desktop true/mobile false，manifest/API只含数据/键；module.load、pages、settingsPage逐级import()，API/启动不拉SDK/React/Go。BOT_CLIENT共享键/API由T01；具体runtime由T20；根资产、预算、词典总登记、build产物由T27受控窗口。
2. 使用ModuleContext.lifetime/services/settings；peek/watch状态不隐式激活，用户打开才acquire/activate。项目ModuleRegistry按owner撤租约，模块失效不拖CLI agent/其他模块。T20不可跨agent私有目录借PTY安装器、账号、Controller或终端历史。
3. 页面用PageCreate→ReactSurface，Shell已有modulePage负责activate和lazy page load；UI `createPortal` 到所属navigationEl，单叶子一个React根。ownerDocument由ContainerProviders/useContainerDocument随DOM adoption转移，Dialog/Popover/Command/Toaster用共享PortalContainer；不可top-level window/document或document.body私建弹层。
4. 使用useVisible处理隐藏页面**本地订阅/刷新**，恢复重新read当前事实；EventClient本身没有可见性hook，不能假定setVisible自动停tail。隐藏保root+inert，close只unmount/退页面subscription；GroupClient/RecoveryClient按模块命令生命周期留存，不能关闭一个叶子就dispose所有共享流或丢uncertain原key。仅route/selected ID/scroll等明确有界stateKeys入叶子状态；不把凭证、完整来源正文、业务消息/CP/审批凭据塞getState/TS持久store。
5. 同Profile/epoch重连保原GroupClient和RecoveryClient，先换实际投影连接再setClient，新连接不自动StartRun/resume；Profile/epoch变化拒旧命令并清旧正文缓存。Grant/来源撤销清实际权限依赖投影，成员remove保已有合法public History，未知新增贡献者仍按旧规则先失效再锚定。原draft文本/tokens与CommandMeta独立保留，不能靠重新生成key消除不确定。
6. 模块disable/unload停止新动作/重连，分别处理Host writes.drained、controller.drained、Go service.shutdown ACK/实际drain和managed.exited。ACK≠连接closed≠Host实际settle≠child close；首await前建EOF/TERM/KILL后备，不依赖Obsidian等待async unload。页面关闭不cancel Run，unknown效果不自动重写。
7. t()/useT与本模块en/zh词典分片随module注册，scripts/module-strings.ts/T27窗口配合；machine reason映射明确下一步并脱敏，不直接把SDK body/路径/secret输出toast。CSS/Tailwind只用tokens，32px desktop/44px coarse、focus-visible、reduced motion沿共享层，原型场景工具条不进入产品。

## 文件分离与正式顺序（不改变现有DAG）

| 票/owner | 可分离实施文件与共享接点 |
| --- | --- |
| T20 | 原票module/manifest/settings/i18n、services/runtime/**、desktop/runtime/binary/**；Root先给MODULE_IDS/注册与service API精确窗口。消费T19后才正式集成；最先以真实ModuleRegistry consumer检验冷启动/移动/卸载，不把空页面叫可用产品。 |
| T21 | `ui/workbench-page.ts`,`ui/BotWorkbenchPage.tsx`,`ui/chat/**`,`ui/directory/**`,`services/presentation/**`,`styles/chat.css`,`i18n/chat.ts`；先一条真实目录→Session→send→已知Run→持久History路径，随后群B/C token/附件。目录/共享路由插槽只T21维护。 |
| T22 | `ui/agents/**`,`ui/groups/**`,`styles/agent.css`,`i18n/agent.ts`；接T21插槽，独立表单/模型/群成员CAS测试，G2先回T01/T02，不争写presentation或runtime。 |
| T23 | `ui/tasks/**`,`ui/access/**`,`ui/approvals/**`,`styles/tasks.css`,`i18n/tasks.ts`,`i18n/access.ts`；接T21内联摘要与task入口，先已知Run的真实审批/unknown/recovery，再owned目录；G1/G3各回owner。 |
| T24 | `ui/memory/**`,`styles/memory.css`,`i18n/memory.ts`；T14/15+123正式唯一合同后接入，先private与settings真实切片，再global/short分支；其余入口可明确不可用，不等全部页面才证明private主路径。 |
| T25 | `ui/data/**`,`styles/data.css`,`i18n/data.ts`；T17–19真实backend后接预检/范围/失败恢复/portable，不写清库逻辑。 |

公用ui组件、app/shell/API/schema/构建登记均只读依赖，需要改变先给Root/原owner窄请求；本预检不把所有目录分给自己。未就绪的后端分支不能以Mock结论替代真实集成，DOM受控backend仅验证UI行为，正式候选仍需真实TS→HAP→Go受控边界。

## 最小代码层检查切片（本次全部 not-run）

| 切片/未来owner | 关键反例和应观测结果 |
| --- | --- |
| T20 runtime/module | 未打开无spawn/HTTP/UI初始化，mobile不import Node；两叶子同一进程，关闭一页/隐藏不取消Run；activation失败/加载中unload不晚发布，其他模块活跃；EOF/credential EOF/TERM/KILL全部实际Wait，Host未settle占位仍保留。 |
| T21 composer/mentions | Enter发送、Shift+Enter换行、composition start/end与native229不误发；pending @选择未决阻发送，用户明确当普通文本后不是token；同名按ID选择，删改token或停用/非成员整批拒并保文本/tokens/原command；SESSION_BUSY/旧CAS/断流保草稿与显式retry，双击只一个业务意图。 |
| T21 transcript/权限 | seq字符串BigInt>2^53、重复/倒序/expired cursor用实际reducer；stream不是saved。A/B和两群切换、先C后B真实public顺序；撤Grant后旧页/迟到response/已公开派生body清理，普通用户文字与合法public记录不一概删。 |
| T22表单 | name/persona/model/endpoint/credential来源完整；同revision竞争保存一胜、失败保输入；Escape/取消/关闭三条dirty确认+继续编辑/放弃/焦点回触发器；普通打开不Probe，显式test是实际最小元数据请求，missing/failed/unknown分开；enable未装配不得toast成功。 |
| T23审批/恢复 | 过期preview/revision/effect/source变更拒绝不写；批准返回后不先画committed；reject不隐式cancel根；unknown只effects.reconcile且当前CAS，committed/reconciled/failed_no_effect区分。recover ready只显示、点击完整affected范围/原CAS/gen，失联uncertain同key、dispose/晚页不复活兄弟。 |
| T23权限 | 默认只有明确附加；folder/vault不预选；recipient tuple不同endpoint/model revision需新授权；撤权通知真实Group/Event投影清理，不能直接读Vault凑界面成功。 |
| T24记忆/本轮 | owner/namespace/scope切换不串body；enabled默认true但eligible=false维护HTTP0；pin/headCAS冲突保输入，forget后迟到job不复活，global pending未确认不显示生效；本轮manifest实际hash/来源/截断对照Engine输入，普通History有而实际未消费项不得显示已消费。 |
| T25数据 | 预检token过期/范围或revision改变先重新预检；unknown只删正文并列最小保留，Profile门禁不提前purged；部分失败受限页和明确下一步；artifact损坏/ID冲突可预览且不自动运行/授权，Vault成果与用户导出不被误删。 |
| 六页DOM/可达性 | 1440/800/390叶子宽、长中英、200%字号/zoom、明暗与reduce motion；共享Dialog焦点约束/Escape/回焦、ownerDocument adoption/Portal引用释放、F6和方向/Home/End、aria-label/error关联/role=status polite，token逐字不直播读屏；无横溢出/额外任务墙/第二状态栏。 |

这些是后续已授权开发的可执行验收设计，本124没有运行任何DOM/浏览器/Go/Runner/模型/网络检查。真实Obsidian多窗口、系统IME/触屏/读屏、Provider及目标OS仍按用户后验，不把离线原型或mock当现场通过。
