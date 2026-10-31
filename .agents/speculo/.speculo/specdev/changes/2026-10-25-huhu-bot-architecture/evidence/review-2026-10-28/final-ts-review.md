# TS / desktop / UI 最终独立复审（含真实视觉修复）

- Reviewer：`native:/root/review_runtime`；实际独立派遣身份未变，未参与任何实现。仅 /tmp 报告、只读overlay与临时测试，无项目源码/测试/标准修改。
- Implementers：Lead `native:/root`、`native:/root/review_frontend`、`native:/root/review_data`。
- **最终固定输入**：`final-ts-input-host-closure.json`，**136 files / 12 sources**，canonical JSON.stringify SHA256 **`a79e0f7b56911cc2cb9aeffeb8ab3a4bae8e52b2b821fce2f656c7a10c890e15`**。
- 开始与结束核对全部136路径/bytes/SHA256及12项标准/规范来源，**0 drift**。原accepted135输入（8747ecd7...56422）已通过的逐项源码判断保存在 `final-ts-review-pre-visual.md`；本轮只复核其12文件必要差异，新增settings-page.dom.test.tsx。
- Go482（caac63...0349）未变，不重跑Go；保持 `final-go-review.md` 的双轴pass。此前TS15真实Memory反例、实际native/MethodValidation证据与不变源码的判断仍有效，不以此代替本轮视觉/Settings检查。

## standards

**result: pass**

**findings: []**

本轮没有确认仍需修复的标准问题：

- Groups/Access/Data/Settings裸checkbox换成已有Checkbox primitive；Group历史none/range不再用被appearance:none隐藏的裸radio，复用项目canonical SegmentedControl。检查了checked、onCheckedChange、aria-label/htmlFor及禁用语义，原选择/授权参数未改变。
- Agent/Group行堆叠、Chat草稿status换行、Memory长名称/空态、Data390 header均为局部类/组件级调整；Data.css仅移除不再适用的nativecheckbox规则，未改shared CSS或全局控件。
- Memory名称优先真实Bot name，同名用确定的唯一ID后缀，临时执行者用已授权childRunId（不足时subjectID），namespace值与命令身份不变，完整title保留。
- Settings使用唯一field ID和同一Checkbox。预算初读未完成/配置pending时字段禁用，关闭清旧budget，迟到旧client值不能发布；无预算时可Refresh，已有草稿重读须明确丢弃确认。没有自动抬CAS版本覆盖未审服务器变更。
- API、runtime、services、权限/消息/记忆正文逻辑均与accepted135保持相同字节；本轮新增逻辑限Settings本地read/loading/confirm状态。预算调整依据最终实测产物，有具体原因，未扩大依赖或关闭规则。

## specification

**result: pass**

**findings: []**

本轮视觉/Settings问题闭合：

| 本轮问题 | 实际复核 |
|---|---|
| checkbox/radio没有可见选择状态 | 复用现有控件；真实Group390深色图的两Bot勾选与历史None背景清楚，Access操作勾选及Data未选框、Settings暂停框可见。DOM角色/checked断言通过。 |
| 窄屏行撑挤/状态截断/长ID | 局部container堆叠与wrap；Data标题在390单独一行，大屏恢复原row；独立读图未见先前重叠/横向截断。 |
| Memory同名/临时范围难辨 | DOM同名/temporary区分、选准确namespace回归通过；值未重写为名称，正文/工作线程权限不变。 |
| Settings初读覆盖新编辑 | 原独立受控pending-read反例由红转绿：当前连接budget未到时input不能编辑；加载后可用；保存pending同样锁定。 |
| Settings明确CAS冲突无恢复 | 保留草稿直到用户确认，取消不读不丢草稿；确认真实get，再用新revision保存；3个Settings正式DOM测试通过。 |

此前TS01~15、Go/TS14补充的闭合事实继续见下方保留的accepted记录；没有使用旧未通过或旧截图宣称最终通过。

## 本轮独立验证与真实证据读取

1. `reviewer-ts-visual-consumers.log`：7个受影响DOM文件、39tests，exit0，7.06s；覆盖Chat/Agent/Group/Memory/Access/Data/Settings交互与既有权限/草稿/重连/导入路径。
2. `reviewer-ts-visual-settings-overlay.log`：原独立初读窗口overlay，1新增测试，exit0，1.19s。该反例此前在未修预算读窗口上红灯，不是仅检查实现者声明。
3. 独立回读真实Host证据：`/tmp/huhu-bot-host-20261028-final-reviewed/evidence/huhu-bot-integration.json`，passed=true，60条render记录，errors/hookErrors=[]。该Host流程由Lead/implementer执行，**不冒充本reviewer亲自执行**。本reviewer另外亲自运行的真实native+TS Memory/Data流程已在accepted记录区分。
4. 通过view_image独立人工读7张最终原图：Data390 light、Groups390 dark、Settings-budget390 light、Access390 dark、Agent1440 light、Memory390 dark、Chat390 light。确认本轮已指出的不可见控件、范围选择、布局和长字段问题在这些截图内闭合；没有把overflow=0当成人工视觉检查。
5. 对照Host JSON核实当前workspace三产物SHA256完全相同：main **44c4daa30901a8fd7dda12d58764bda0c5049d7213c4842e054ddfa7a99c3216**；styles **7e2852172ffb40ea2d59ce25bb6a2f4fe39ab65d3a2f880033a7428c6e2e3355**；native **4702fe5b8b9bbe75bd856f804d34f153ed034d94412cb53eec71be387a5db7e6**。
6. 136文件及12sources结束再查0 drift；不重复不变Go/全套工程测试。Lead的55files/374tests、build/lint/CSS/architecture/i18n/budgetgate回执由Lead维护。

## 未验证与边界

- source/记录视图pass不表示真实Provider模型执行、活动任务写审批与unknown回收全过程、原生系统导入/导出选择器、全部OS、真实mobile已实测。
- 60张矩阵由implementer执行并逐图读完；本reviewer独立读的是上面7张最终原图，并核对完整JSON/产物摘要，不把他人的60张人工验收冒充本人全读。
- 没有提交、推送、升版、发布、归档或修改历史transcript。通过仅限本次精确固定范围及上述实际证据。

---

## accepted135范围的既有独立事实（本轮总结果以上文为准）

## standards

**result: pass**

**findings: []**

已追踪 app注册/路由 → module懒激活 → desktop runtime/managed transport/Host → workbench services → UI实际consumer。当前没有确认仍需修复的标准问题。

- 设置与service发现不启动Runner；页面/显式连接才启动。平台Node/原生文件行为留在desktop/Obsidian adapter；UI不直读SQLite、不直接往Profile写artifact，上传由Go的portable.stage owner处理。
- executable先按固定发布来源/目标/版本/摘要和受保护本机receipt建立信任；不回退PATH。受控环境allowlist不继承Provider/CLI密钥。Vault本机Profile绑定含canonical位置，复制Vault不自动继承有效Profile。
- runtime同时处理pending launch、Host注册、closed HAP与exited process不同生命周期；stop先关闭transport并abort，重连不发布closed句柄或在旧Profile锁释放前启动第二个进程。Host同lease续期维持缓存身份，过期/失配失败关闭。
- 私密投影遵循共享permissionRevision与各自generation：Approval、Task children/effects、Memory及其本地proposal/correction、Data、history和events。Data首次直接打开也独立绑定close，不依赖先进入Chat。迟到read/action不会在撤权或关闭后恢复旧正文。
- Group每次已提交Session及时通知共享owner；membership请求前和finally失效，unknown期间再读取的正文在结算时再次清理。Access撤权及Profile/Session删除同样覆盖前/后/失败，保留原命令/token；只有真实成功才标记完成或reset身份。
- CommandAttempt保留不可变输入/key，内部错误/取消/后置清理失败不被当作“必定未提交”。原请求可精确重试；create/save字段在待定时有明确锁定/放弃流程。冲突恢复必须用户确认后真实读取最新修订，没有偷偷提高CAS版本覆盖服务器变更。
- 新界面沿现有设计系统与工作台宿主，文案通过t/useT及en/zh词典；导入面板区分copy候选与已有目标，歧义不暴露可用的覆盖选项。预算调整记录旧产物基线、实测字节、懒加载边界与原因，未见新增运行依赖或用关闭规则规避检查。

## specification

**result: pass**

**findings: []**

通过适用于135文件代码/合同消费范围，**不等于全部真实模型、真实宿主故障组合或发行OS已实机验收**。已确认先前可达问题在当前输入中闭合：

| Finding | 当前代码与独立验证 |
|---|---|
| TS-01 草稿被旧send吞掉 | capture thread+version位于session/grant await前，成功仅处理原版本；pending read/grant时新编辑保留。 |
| TS-02 群附加资料无法送达 | group grant包含read/send/deliver，绑定明确Agent与完整model recipient；主区显示实际接收方。Go对应admission已另审。 |
| TS-03a 私密副本未撤权/复活 | 各consumer统一清正文并abort/generation；Data-first loaded与late-list、Group部分commit/unknown再填充、Access unknown、删除cleanup失败都覆盖。最终原独立反例绿。 |
| TS-03b 旧会话审批串页 | InlineApproval按client/Profile/approval身份重建，读/resolve有generation，切Session不展示旧效果预览。 |
| TS-04 uncertain新建重复身份 | Agent/group/direct Session及导入/撤权保留原command/key；明确拒绝才释放，unknown有原请求重试。独立lost receipt反例现仅1个持久意图。 |
| TS-05 保存途中编辑丢失 | 表单在保存/测试/凭证/unknown期间禁用，旧成功不吞新输入。 |
| TS-06 Task漏中页效果 | 从seq0分页至初始head，受限并发读取effect；500events中seq100的效果被发现。 |
| TS-07 子完成/晚usage不刷新 | 消费真实delegation.completed与所有新facts，按metadataSeq/usage刷新；有界保留终态观察，覆盖同状态晚settlement/reconcile。 |
| TS-08 restricted清理页进不去 | 启动先status，pending跳过Host；Data先读cleanup而不请求被拒业务列表；重试后显式恢复Host，无新进程。 |
| TS-09 实际上下文内层cursor遗漏 | 按Run/namespace/revision读memory.get context内页，part索引去重，撤权停止迟到页。 |
| TS-10 Agent删除无入口 | 停用后提供预检、关系阻塞与明确确认，提交具体token/revision，unknown保留确切命令。 |
| TS-11 Access只看前100 | agents/grants独立分页，后页撤权同样清所有私密consumer。 |
| TS-12 revision conflict死循环 | 明确保留草稿直至用户确认丢弃；真正get新Agent/Session后重置base/durable；DOM验证rev3冲突→取消不丢草稿→确认读取→expected4成功。 |
| TS-13 closed client冒充重连成功 | start仅复用ready；旧exit barrier前不返回closed、不spawn第二个；释放后得到全新ready client，stop仍可关闭。 |
| TS-14 导入映射与歧义 | required API/HAP字段贯穿固定token；UI展示copy候选/全部已有目标，按导入身份合并单一选择，歧义keep/replace禁用、copy可行。Go写前同样拒歧义；64KiB预览超限显示缩小选择/处理重名的下一步。 |
| TS-15 实际Memory查询/上下文首屏不可达 | closed。所有memory.list为50；初次私有目录不发无scope context。Session只允许真实Agent成员；任务线程由已授权Delegation实际namespace+childRunId选入，临时/非成员直接get精确Run，不依赖随followup变化的thread subject。Session list metadata空entries→用户Inspect get首屏；首屏按Run/namespace/revision/manifest接受服务器canonical work_thread scope，后续parts严格锁scope。真实native catalog/Data与双向schema反例通过。 |
| Host probe补充的Chat重连 | history effect依赖online，恢复后重读同Session并清旧HOST_UNAVAILABLE投影；最终实际DOM回归通过。 |

TS14涉及的Go/HAP已独立重新冻结482文件，canonical SHA256 `caac63f228eda48db11bf0b471396b69d2c3f664f0a7f4acdc5fa9d603de0349`；`final-go-review.md`明确纠正先前遗漏后两轴pass。不是复用原481无映射范围的过度结论。

## 独立执行的验证

1. **新accepted范围的Memory/数据/任务consumer**：`reviewer-ts-accepted-memory-consumers.log`，6files/39tests，exit0，4.69s。覆盖合法分页、metadata-only目录、显式首屏、canonical委派scope、多part及generation、临时任务Run路径、删除cleanup失败保留token、Task授权元数据传播与清除。
2. **独立双向实际schema反例**：`reviewer-ts-accepted-memory-wire.log`，2files/2新增overlay，exit0，1.73s。对每个memory.list/get请求和响应都执行真实MethodValidation；global/private初次目录、Data分页50；Session过滤metadata→get真实work_thread→后续part同ID合并。没有让fake list直接返回完整正文绕开真实合同。
3. **真实新native binary + 实际TS clients**：`reviewer-ts-accepted-native-memory.log`，重bundle当前launchManagedBotSession/HapConnection/MemoryClient/DataClient，启动全新OS临时Profile，实际global/private catalog、成员Session scoped context catalog、Data初次初始化均ready，0 Provider calls；进程/Profile已清理。已额外核对binary实际SHA256与sidecar相符，源码输入树SHA256 **059656e0eca6b33e5b958cf773bc42c93f5e6623cab372f9d6143ebf0bdf2716**与当前Go/合同一致。此测试没有非空模型Run，不冒充已用真实Provider测完整上下文正文。
4. **原独立反例再次在accepted源码执行**：`reviewer-ts-accepted-original-overlays.log`，4files/5新增overlay，exit0。Agent冲突确认、Group部分commit/unknown再填充、Data-first close、runtime exit barrier，均保持绿。没有修改仓库测试。
5. **旧新建/事件窗口反例重bundle当前代码**：`reviewer-ts-accepted-admission.log`，exit0。lost direct Session receipt仍仅1身份且原key相同；500events完整遍历0/128/256/384并读到effect-middle。受控fake只用于请求/投影逻辑，不替代Go持久化证明。
6. **不重复的既有验证**：135 delivery时独立10files/54tests（reviewer-ts-delivery-consumers.log）及初132项时16files/106tests（reviewer-ts-final-targeted.log）。与accepted比较后，只重跑变化consumer及风险相连反例；不把数量相加冒充无重复总数。
7. 结束135项、12项标准/规范sources再次核对0 drift。Lead当前完整Go、54files/370tests、types/lint/build/native/真实Host回执由Lead维护；本报告不冒充本reviewer亲自执行全部工程/Obsidian检查。

## 未验证与交付边界

- 真实三协议Provider endpoint/model、全部Obsidian多leaf/窗口故障、OS Keyring及其余发行平台/架构没有本reviewer实机证据。Source pass、DOM/fixture、交叉编译不能替代这些后验验收。
- main.js/styles.css/native binaries不在135项source snapshot中。已独立验证本机native与当前Go输入树一致；插件主产物、其余平台、真实Obsidian操作回执仍由Lead保留。本报告不以旧wire binary冒充TS14后成功。
- 两次全量Vitest曾分别遇到worker teardown与临时空间导致native编译失败；即使断言通过，也不能把失败进程写成全套exit0。最终必要检查以Lead当前有效回执为准；本reviewer的定向独立检查已如上全部exit0。
- 未提交、推送、升版、发布或归档，未修改历史provider transcript。
