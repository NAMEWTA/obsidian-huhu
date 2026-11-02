# 任务回报

Session: 20261026T045732Z  
Task: 038-t10-inbox-ui-plan  
Status: completed

## 聚焦交接

038只读计划完成，**T10未激活，未写产品或正式规划**。推荐在原PAGE-003右工具内并列“控制/通知”，沿既有312px外盒与<600 Dialog，history仍互斥；复用原TerminalControlPanel，不把邮箱目标或状态接入终端输入/运行/焦点链。

pending/unknown发送观察由**AgentController所拥有的activation级inbox facade**有界保留，按真实leaf/presentation token隔离，InboxPanel只订阅和显式核对。关闭抽屉、切history、隐藏页面、宽窄重挂载不丢身份/正文；叶子真正关闭只解除展示，未结算或unknown仍留待核对记录，新叶子可显式查看原消息并核对。它没有重发、恢复运行或自动执行。Root已认可32条/1MiB候选界限，并明确每view只限制一条仍在执行的in-flight；unknown不永久锁死发送入口，用户明确写另一封才生成新ID。

附件复用真实 `PathPicker` + `vaultPathItems` 的metadata展示接缝，构建/校验/open由A的认证Vault来源adapter负责；不能复用会读正文并paste的MaterialPicker。A facade与canonical API尚未实现或冻结，下文均是候选数据/操作要求，不冒充实际接口。Root据本报告合并其持久owner计划、T09审查结果后再定精确T10写集/DoR。

## 产物与验证

证据根 **R** = `/tmp/huhu-t10-inbox-ui-plan-7x1brpid`。只写本REPORT与新R；所有产品、031/035/Root原件、Spec/Ticket/Map/Goal、原型/永久知识与Git/index只读。未运行测试、构建、Chrome/helper、PTY、Provider、真实账号或用户Vault；未递归派遣，未提交推送发布归档。请求模型沿原Sol/xhigh；本worker不探测或伪造独立模型回执。

### 1. 真正输入与证据边界

- TASK完整读回并核SHA `14a83b6e8374dc258a05a9d05aec3985f8981f0676143bd3bf87225ec734a89c`。Root指定入口 `/tmp/huhu-t10-root-ui-plan-dk_ysk2i/inputs.json` SHA `a4dc5dcad07c6b34b34b235d2e395cbbeb344e34adc244b7eccf49edc22bcb24`，5项原件逐项重算SHA保存R/root-inputs.json及CAS。
- 产品只从T09最终冻结manifest取源：`5b5ad8baa7b79c8aefd7d0dc416a4fac0a894e07aea0286cce295c624ed004f4`，HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715 / NAMEWTA/terminal；语义包 `cba59899a76f1c1b2b87bb5501d9bd744361690e88b90c8e2a8b89a1ffacca82` 提供Spec/合同/DESIGN/批准原件；草稿r2 `9d79d4e8a6234642c75dc9bb72bc2c7f3e6e42f2f3a63714ec1dd90af8feff38` 和033预审Root audit原件已读。
- Bootstrap workspace/catalog/dev/ui及既读未变规则复用；本准备不激活implement或预填Skill passed记录。规范为Spec §3.6、AC-002/023/024/025/046，DESIGN revision1/PAGE-003/AC-061，批准digest `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`。不重新选模板，不改原型，不把缺实现当bug。
- R/selected-input-manifest.json保存实际选中27份唯一path+SHA输入、原模式/bytes/原snapshot/本地CAS/只读source view，CAS errors=[]。所有下述行号指这些冻结字节。少量当前只读rg用来定位真实路径，不作为T09最终API结论；结论均回到snapshot。
- R/read.py、inputs.jsonl与source目录是静态来源工具/轨迹。R/commands/001–003有实际argv/cwd/UTC/exit/stdout/stderr；此前bootstrap/静态读取未全经过捕获器，不补造原raw/开始时间。两批猜错 `.ts`/记录目录的静态读取分别KeyError，随后按冻结path-index更正，部分输出保留owner-picker-full.txt/compose-control-full.txt；它们不是测试红灯或产品问题。无纯逻辑行为探针或未来实现代码。

### 2. 真实UI/生命周期起点

| 冻结真实源 | 事实与实施含义 |
| --- | --- |
| `src/modules/agent/ui/AgentWorkspacePage.tsx:303` | 仅page.control && !history && visible挂载；narrowControl两支为不同Dialog/aside父节点，跨分支会重挂载控制内容。关闭、history、隐藏也卸载。InboxPanel useState会丢原发送身份。 |
| 同文件`:431`、`:478–501` | AgentWorkspacePage类拥有独立view；createAgentPage载入saved，订阅view→context.changed，abort解除订阅；binding.getState只导出agentControl/agentHistory/agentHistoryWidth。React直接挂载还有localView fallback，但都不等于activation业务owner。 |
| `services/workspace-view.ts:7` | 原store仅control/history/historyWidth/jump；保存history优先、首开control=true、width240–480。可以放工具开闭/标签，不能把未知发送只塞在此或正文加入序列化。 |
| `src/app/workbench/compose-workbench.ts:84` + `agent-contribution.test.ts:49` | terminal stateKeys只有上述3项；真实测试已经证明selectedRuntime/prompt/token被清掉，并实际createWorkspaceView恢复。新增工具标签必须同步这一真实白名单和测试。 |
| `ui/workspace/WorkspaceToolbar.tsx:77–111` | control/history由原viewStore互斥动作，toolbar不拥有控制target；通知按钮/计数可在此加，消息到达只更新订阅计数。 |
| `ui/control/TerminalControlPanel.tsx:57–123` | selection/body/result/AbortController是工具实例局部状态，目标来自managed runtime且valid要求connected。适用终端控制，不能拿这个selector筛邮箱收件人；保留原组件和其关闭观察取消。 |
| `services/controller.ts:109/151/202–224` | 明确one instance per module activation；constructor先建SpaceService与WorkspaceService。邮箱薄facade可在同constructor接原spaces及认证Vault adapter，不能再建writer/Session/Control运行管理器。 |
| 同文件`:1362–1444`；`module.ts:245–259` | 模块dispose先关闭准入/清理各owner，writer在原settlement尾部；module先移除controller引用再等待旧实例dispose。新facade须按原生命周期关闭UI观察/准入，保留原SpaceService在途I/O收束，不能提前dispose共享writer或让旧Promise更新新activation。 |
| `src/shell/host/workbench-pages.ts:83/127/182–191`；`src/ui/react/surface.tsx:29` | PageCreate拿到真实owner leaf；隐藏一般只setVisible(false)，关闭entry abort后onClose实际unmount。可用leaf对象身份和page presentation token隔离，不能用当前选Space/同名标题或单个全局selectedRecipient。 |

### 3. 最小上层owner比较与选择

| 方案 | 覆盖与决定 |
| --- | --- |
| InboxPanel useState/ref | 不能跨抽屉关闭、history、Dialog/aside重挂载；不选。 |
| AgentWorkspace的上层useState或既有viewStore | 可跨工具子树切换，但实际Page onClose/新surface失去状态；把正文塞进view getState会泄露到Shell持久化；不作为发送观察权威。viewStore只做展示开闭和标签。 |
| controller activation inbox facade内有界presentation registry | 复用已批准A facade的生命周期，不新增持久writer；跨子树和Page解绑保留观察，多leaf隔离，统一typed结果采用。**选此方案**。 |

候选结构不是已冻结API：A facade的presentation子部件持有WeakMap<真实leaf对象, per-leaf view state>；每次PageCreate/真实AgentWorkspacePage实例绑定不序列化的presentation token。强引用的有界observation记录只保存token、业务messageId、原Vault/Space/Session、原正文/refs/source、结果与诊断，不保存DOM/HTMLElement/AbortController到Shell state。不得用runtimeId、cwd、全局activeLeaf字符串当目标隔离键。相同业务messageId的两个失败尝试也不能互相覆盖，可用本地attempt token作为登记key，wire requestId仍只是相关性。

原始接线位置建议：AgentController constructor在原SpaceService已创建后构造facade/来源adapter/presentation；createAgentPage创建本leaf presentation binding并把store/只读端口交给页面/InboxPanel，signal abort或Page onClose仅解除该展示监听、取消其可取消只读观察并把未结算/unknown标记为已关闭展示。drawer关闭/history/宽窄切换仅让consumer卸载，不销毁registry；不要在InboxPanel cleanup里删除record或把pending改none。现有TerminalControlPanel不迁入这个registry、不复用其terminalControl路径。

**有界与闭叶找回：** activation内建议最多32条发送观察且合计1MiB（包括完整UTF-8/JSON身份、正文、引用、诊断）；A/Root正式固定同一常量，在接纳前容量拒绝/effect none，未知记录不能被TTL、关闭/换Space、LRU或自动成功推断淘汰。每view最多一条真实尚未结算的in-flight防重入；已经结束但effect unknown则转为待核对记录、释放in-flight门。用户明确“写另一封新消息”后可建立独立新草稿并在发送前生成新messageId，旧unknown仍可查；不复制旧正文自动发送，也不因一条unknown永久冻结所有发送。

真实leaf关闭后，原请求仍由原A owner结算，registry继续按固定attempt更新。新leaf的通知页可显式打开“待核对发送”摘要（原messageId/收件人/原显示已关闭/状态），用户选择后只读显示原正文与核对动作；不自动把旧attempt塞进该leaf新发送表单、不接管运行或重建请求。仍在执行的pending显示等待结算；已结束unknown允许显式零写核对。关闭新叶也不删旧记录。确认已保存/明确none的结果可显式收起；unknown的保留与新发送容量可见。没有调度、重发按钮、后台重试或自动恢复，所以不是Outbox。模块停用/崩溃后不承诺未保存草稿持久化；关闭准入、旧epoch隔离及原在途writer收束仍须准确，不把内存清除称磁盘回滚。

### 4. 工具开闭、计数、键盘与焦点

推荐保留原control布尔作为“右工具已打开”的兼容状态，另加候选 `tool: 'control' | 'inbox'`（具体命名等A/Root最终合同），序列化只增加 `agentTool`。旧saved仍默认control；非法枚举回control；history=true仍压过control。不要新增互相矛盾的三个open布尔。getState和compose stateKeys一起增选中工具键，正文、messageId、attempt、receiver tuple、source refs、诊断、Promise、presentation token均不进入stateKeys。页面show(control)显式选择control，show(history)关闭右工具；不必须新建feature或更改Shell导航/WorkbenchTarget类型。

WorkspaceTools用现有Radix Tabs/List/Trigger/TabsContent做控制/通知切换，作为原312px aside或<600 Dialog内的薄内容外框。Control页嵌现TerminalControlPanel，通知页嵌InboxPanel；可在原各面板标题上方放一个紧凑Tabs行，原control标题/close/业务逻辑不重写。用户离开control页按原卸载清理观察；新消息到达和read/ack不修改tool/control/history、终端目标或Space，因此不会暗改T08显式target。消息通知只广播读模型/计数，不调用workspace.selectSpace/focus/attach、controller.show/open、spawn/paste/prompt。

toolbar增加Bell入口，明确打开inbox并history=false；原控制按钮切回control，history按钮关闭右工具；关闭后保留所选tool，重开回同页。显示当前Vault未确认计数并把scope写进aria-label/title；数据未加载/源未知显示原因或“未知”，不能编成0。read成功仅本视图显示“已查看/尚未确认”，只有ack改变持久确认/相应计数；不增加read-time写入或复用终端completion seen。闭叶待核对发送数量与收到的未确认数量分开显示，避免把未保存attempt称收件箱消息。

沿已有min44 toolbar、桌面至少32/窄屏44命中和ownerDocument portal；Radix工具Tabs用左右箭头/Home/End、Esc关闭外层Dialog，内部表单composition不提交。原Dialog focus return门（原trigger、doc/Space/target代次、blur、visible、alive、connected）复用并适用于Bell，异步消息/核对完成只更新文本，不focus、不回跳Space。工具切换不建新全局快捷键；200%时Tabs、长ID和表单内部滚动且按钮可达。

### 5. A/B需要提供的最小真实数据/操作与采用点

下列是语义承诺，不是已有方法签名；Root应先等A真实export/故障测试，再解锁U/B消费者。

- 按当前认证Vault给只读持久Session/Space元数据与加载/错误/freshness：稳定spaceId/sessionId、名称、Provider/kind、归档状态、来源是否仍存在。来自原SpaceService records.sessions/spaces，不能用sessions.list()/connected runtimes作准入或收件人全集。收件人范围明确“当前Space/本Vault全部Space”；同cwd/重名仍列完整身份。停止/后台/detached/disconnected可收；归档send禁用并给原因，历史read/ack仍按消息原目标可访问。目标记录缺失也保留消息原tuple/正文和准确诊断，不静默换当前Session。
- 有界list摘要/稳定cursor/high-water、显式read完整消息/refs状态、独立ack及重复already-acked/none、基于原消息身份的零写fresh-primary核对、被动订阅/未确认统计。UI普通read/list/开闭/切标签不调用ack；原messageId和scope/hint不一致必须拒绝，read/ack不经过active runtime gate。
- send接纳前固定完整业务messageId/原target/body/refs/source；所有后续失败、取消、断链都保留它。A先在presentation登记原attempt，再调用原领域facade；UI组件卸载只detach display。A typed结果固定record-saved/ack-saved/completed、拒绝none、或effect unknown，并保留错误code/details/nextAction；成功后的订阅/来源观察失败附诊断，不覆盖已保存事实。B canonical/CLI映射同一facts，不把领域收据伪装pty-written/adapter-applied。
- unknown显式核对等待原在途写结算，从已验证primary返回fresh结果，不用旧缓存缺失冒充权威not-found。采用时校验activation epoch/attempt与原完整payload：相同messageId但原target/正文/refs/source不同是冲突，不能据“ID存在”宣布本次已保存。核对失败保留unknown/原正文，fresh not-found也只是该次快照事实，不自动恢复send或允许盲重发。确认原消息已保存后只更新展示事实，不再次write。
- 发送观察/presentation注册表的生命周期与容量、只读snapshot/subscribe、显式新草稿/查看旧attempt/核对动作均由A做真实上层port；U不另建writer或拿terminalControl假造inbox handler。ack unknown也保留原messageId/确认动作诊断，read新鲜ack字段再判断，不把read当再次ack。

### 6. 原Vault metadata picker/引用与打开接缝

已实际读 `src/ui/components/huhu/PathPicker.tsx:47–115`：组件纯展示、caller供items，支持kind=file/allowCreate=false，键盘/IME与Popover focus已有实现；`src/shared/vault-path.ts:90–98` 的vaultPathItems只遍历getAllLoadedFiles，给path/kind，不读正文。`PathPicker.dom.test.tsx`已有只接受存在文件、拒绝traversal、中文键盘选择。最小复用为A来源adapter从本认证Vault枚举并过滤metadata，UI传入PathPicker，显式选中后A重核并构建typed vault-file引用。

这里**不能把通用normalizeVaultPath当安全validator**：其`:15/20`会把反斜杠和前导分隔形式归一化，现测试还接受`/./Archive//2026/`。这是共享路径输入既有UX，不改它；T10 raw typed引用由A先拒绝absolute/drive/../反斜杠/NUL/其它逃逸、核当前vaultId及真实TFile/有限stat，再构造规范相对path。picker items的存在不等于send时仍有效，A send前与explicit open前重核；不能把Session cwd grant当Vault文件权限。

metadata version只承诺mtime/size等有限可观察事实，不读正文算hash或承诺内容未变。保存后缺失/已变/当前不可用时read仍保留消息及原引用，显示unavailable/changed，UI不改原version或替换路径；explicit open通过A再核权限/身份/TFile/版本后交真实Vault opener，失败准确返回，不任意shell.openPath或Node fs。必要Vault metadata事件订阅按facade activation清理，不让InboxPanel自己枚举全机文件。

`ui/terminal/material-picker.ts:18–22`会取editor.getValue或vault.cachedRead，再attachMaterials；`services/session-material.ts`会show/open/paste并筛选running Agent。两条都不适用，保持只读不改。`src/shared/vault-path.ts`、`src/ui/components/huhu/PathPicker.tsx`及其既有测试也仅复用，当前证据不需要修改公共组件。

### 7. 最小精确路径候选与唯一writer

以下为**待Root纳入正式T10 allocation/DoR**的候选，不是本038写权；NEW名为建议落点，接口/文件名未被假称已存在。当前T10泛化写集没有覆盖compose/workspace-view/Toolbar/脚本等必要接缝，须Root正式补精确名单后派遣，不按方法让Root与U同时编辑。

U独占候选14路径：

| 精确路径 | 状态与用途 |
| --- | --- |
| `src/modules/agent/ui/AgentWorkspacePage.tsx` | existing：统一右工具312px/<600 Dialog接线、传入每leaf presentation、show/getState及焦点返回；不改终端控制业务 |
| `src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx` | existing：真实父级关闭/历史/宽窄/多Document/闭叶unknown生命周期组合 |
| `src/modules/agent/ui/workspace/WorkspaceToolbar.tsx` | existing：显式通知按钮+本Vault已知计数；到达只更新计数，不开工具/切目标 |
| `src/modules/agent/ui/workspace/WorkspaceToolbar.dom.test.tsx` | existing：计数/按钮/历史互斥及原工具行为 |
| `src/modules/agent/ui/workspace/WorkspaceTools.tsx` | NEW candidate：轻量控制/通知Tabs及公共工具外框；已有TerminalControlPanel完整嵌入，不复制发送/等待 |
| `src/modules/agent/ui/inbox/InboxPanel.tsx` | NEW candidate：显式收件人、列表/read/ack/发送观察、闭叶待核对展示与metadata PathPicker |
| `src/modules/agent/ui/inbox/InboxPanel.dom.test.tsx` | NEW candidate：真实A facade+SpaceService外部磁盘/宿主端口fixture，覆盖正常/错误/零运行副作用 |
| `src/modules/agent/services/workspace-view.ts` | existing; U-only proposed：仅开闭/selected tool标签状态；绝不存正文/发送结果 |
| `src/modules/agent/services/workspace-view.test.ts` | existing; U-only proposed：老saved兼容、默认control、history优先及tool枚举校验 |
| `src/app/workbench/compose-workbench.ts` | existing; U-only proposed：仅terminal stateKeys追加选中标签键，不引模块内部/正文 |
| `src/app/workbench/agent-contribution.test.ts` | existing; U-only proposed：真实contribution→cleanPageState→view恢复，私密正文/目标/ID仍剔除 |
| `src/modules/agent/i18n.ts` | existing：唯一en/zh文案writer，A/B给实际key后集中维护 |
| `docs/agent-workbench.md` | existing：邮箱和确认语义、引用边界、unknown核对/闭叶保留/不自动重发 |
| `scripts/obsidian-acceptance/agent-workbench-panels.mjs` | existing：复用已校准生产UI runner，新增inbox suite/状态；未来实现，不运行本任务 |

A独占与U的接线边界候选：

| 精确路径 | 状态与用途 |
| --- | --- |
| `src/modules/agent/services/controller.ts` | existing：唯一装配inbox facade、metadata来源adapter、activation epoch与有界presentation registry；唯一dispose/quiesce接线 |
| `src/modules/agent/services/inbox/service.ts` | NEW candidate：原SpaceService薄facade；真实typed结果/订阅/recipient metadata/显式核对 |
| `src/modules/agent/services/inbox/presentation.ts` | NEW candidate：activation内leaf隔离的草稿/发送观察；32条/1MiB候选上界；无调度或重发 |
| `src/modules/agent/services/inbox/presentation.test.ts` | NEW candidate：pending与unknown、多leaf/闭leaf/容量/晚到Promise/新消息ID、零自动发送 |
| `src/modules/agent/platform/vault/inbox-sources.ts` | NEW candidate：当前Vault metadata枚举/typed引用构建、send/read/open重新校验；不读正文 |
| `src/modules/agent/platform/vault/inbox-sources.test.ts` | NEW candidate：真实adapter+受控Vault metadata端口，不存在/变化/逃逸/读取计数0 |
| `src/modules/agent/services/controller-inbox.test.ts` | NEW candidate：真实controller装配、激活关闭/新epoch隔离；不重复物理writer |

原SpaceService、records、core邮箱类型/容量/新鲜读取/物理writer故障测试仍由Root的A持久owner计划统一列名；不由U补业务实现。controller仅A写，Root只在A return后统一回读/整合，不与A/U并写。无必要改module.ts：当前lazy pages→createAgentPage和controller activate/dispose已提供生命周期。

B独占canonical与薄接线落点仍是 `src/shared/native/control-schema.json`、`src/shared/native/control-wire.generated.ts`、`native/pty-server/src/control/wire_generated.rs`、`native/pty-server/src/control/cli.rs`、`src/modules/agent/services/control/commands.ts`、`src/modules/agent/services/control/paging.ts`、`src/modules/agent/services/control/router.ts` 和各自Root正式指定测试；这里不声明尚未列出的测试或方法已经可写。B不写UI/controller或SpaceService；U不写canonical/help/生成物。Root独占main.js/styles.css/预算/许可与正式状态。U如只用现有Button/Tabs及min-h-8/min-h-11等类，无自定义CSS必要；样式实际生成仍由Root，若后续确需agent.css新增规则先补精确范围。

### 8. 未来验证矩阵（本038全部未运行）

| 场景 | 真实消费者/预期证据 |
| --- | --- |
| 正常、空、加载、错误、计数 | InboxPanel.dom +真实A facade/SpaceService，外部存储/宿主端口受控；list摘要只在explicit read后展示正文，未知count不伪0；到达只更新计数。 |
| read/ack/分页 | 同recipient list/read不触writer/ack；explicit ack→确认事实，重复ack零写；new append/ack与原paging合同结合A/B测试，不由UI复制cursor逻辑。 |
| 同cwd双Space/重复名/停止归档 | 真持久records产生两独立tuple，send精确原归属；停止/后台/detached可收、归档send拒收但已有read/ack可查；spawn/paste/prompt/attach/focus计数0。 |
| primary后失败unknown→关闭/历史/宽窄 | A磁盘端口制造实际已写但readback失败；同原AgentWorkspace/WorkspaceTools/InboxPanel生命周期，ID/body/target不丢，显式核对同ID只读；发送调用次数1，没有自动重试。 |
| pending与unknown区别 | deferred控制仍未结算Promise，防同view二次in-flight；后续unknown保留为待核对，用户明确新消息产生不同ID，原unknown仍在，入口不永久冻结。 |
| 多leaf/闭leaf | 两真实context.leaf + ownerDocument，A/B草稿/receiver互不覆盖；A关闭后新leaf显式查看原record，不触发重发或运行；晚到A成功只写原attempt，不能改B表单/终端焦点；activation结束无旧callback污染新实例。 |
| 容量 | 32观察/1MiB边界按真实编码预算，不能接纳时capacity/none且旧unknown完整；关闭/换Space不淘汰，显式核对后状态可处理，不靠TTL测试凑绿。 |
| Vault引用 | 真实A adapter+受控Vault metadata port接PathPicker，列项/选择/发送read正文计数0；rename/delete/stat改变、路径逃逸、不同vaultId、open前变化准确失败并保留原消息；不调用MaterialPicker。 |
| 工具/恢复/焦点 | 原AgentWorkspacePage.dom扩组装；Toolbar.dom测到达不改view/selected；真实agent-contribution.test测agentTool白名单/closed保持/旧saved/history优先，prompt/body/ID/target剔除；iframe Dialog Esc/Tab、blur/隐藏/换Space/leafclose后不抢焦点。 |

最小测试落点为表中U现有Page/Toolbar/view/contribution与新InboxPanel.dom，A presentation/source/controller组合测试；无需为纯Tabs胶水另建镜像测试。默认公开Vitest配置，真实TerminalTabView/Host/Panel保留；只隔离设备文件/宿主等外部边界，沿035做法，不靠临时Electron alias。待实际实现建立真实红/绿与source hash，不把上述未来路径名当覆盖。

**Chrome建议复用现有 `agent-workbench-panels.mjs`** 的实际生产装配、独占profile/server、样式hash门、动画稳定、原PNG与边界/DPR/scroll/focus校准，不复制另一套约千行runner。可增加显式inbox suite选项（当前尚未实现），import真实AgentWorkspace/WorkspaceTools/InboxPanel与A真实facade/SpaceService；metadata Vault adapter通过受控App.vault端口/真实vaultPathItems装配，不能只给UI静态options mock。primary后失败由同A持久owner故障端口制造，非测试复制邮箱实现。

未来生产Chrome覆盖1440/1200/800/390/480与599/600/959/960、亮暗/长中文/长ID、空加载错误、count、read/ack、unknown重挂载/闭leaf、多Document焦点、真实200%profile与reduced-motion；保留实际消费closure/逐轮drift与原PNG/资源清理。Root先冻结真实生产输入并生成styles，最后统一需要的T09/inbox suites，避免为静态整理重复全库/Chrome。受控Chrome仍不代表真实Obsidian/Provider/OS IME/五平台E2E，后者按用户分工。

## 问题与下一步

没有需再问用户的产品决定。Root已在本038消息中接受activation facade、闭叶只读核对、32/1MiB候选及pending/unknown区别；下一步只需把本候选与Root A持久owner计划合并，在T09最终审查完成后重核最终输入、正式补T10精确写集与DoR，A先交真实API/故障证据，U/B再消费。API/候选文件名未冻结时不提前实施或用同名mock开路。

只读return结构校验在报告落盘后实际执行，TASK/REPORT SHA及stdout/stderr/exit保留 `R/delivery/return.*`；其结果以原件为准，不证明T10行为通过。本准备无浏览器/server/helper/监听资源需清理，所有临时材料仅静态证据。

SOURCE READ ONLY / SOURCE STOPPED（仅038只读研究收束，不宣称T09审查通过或Root全局工作停止）。
