# T09 实施工程合同

GP033 / Map34；T08最终代码与独立R5已实际完成。本Packet将已核012/013/018准备落实为工程路线，外部行为/设计仍以原Spec/DESIGN为权威，不改其批准记录。当前尚未派遣T09产品写入；实际DoR和分阶段TASK为入口。旧准备/反例不冒称本票实现通过。

## 依据与路线选择

以原Spec §3.1–3.5、AC009/061、DESIGN revision1 PAGE001/003为权威。012真实协议/CLI与开源机制核验、013生产UI接缝、018真实store/merge探针已由Root回读。018 Root audit SHA5918365d3a45edddae16232cc16aa2546ec2dafe9e3abb02b3cc1f0d1714a347；原012/013联合audit ec26fa7eb1bbde94a6405656794b71e0f45d5198cf4230256e9920cf2f86239c。准备实验不当作T09验收。

选择在原ResumeInfo加可选paneId；不修改runtime叶键，不新增Pane数据库、缓存writer、daemon或Session多显示owner。选择原SpaceWorkspaceStore提供read/edit局部端口；不用records.layouts/updateLayout绕过已缓存的dirty草稿。此前012/Root初稿“load先获writer补ID再公布”的建议由018反例否定，正式实施不得采用。

## Pane身份与兼容

新显示在明确接纳布局mutation时分配一次有界opaque ID，默认pn1.UUID；不要把随机分配塞入metadata/normalize/render/query。已存在的有效非UUID opaque ID原样保留；ID不是凭据。

旧合法活动叶缺字段时只在读描述中派生 `lp1.` + canonical无padding base64url(UTF8(JSON.stringify([kind, owningSpaceId, persistedTabId, persistedLeafKey])))。Space kind='space'，shared采用不同kind且Space空。材料来自原布局owner和真实可达持久叶，不从当前UI/cwd/标题/分组顺序/PID推断；不把normalized合成restored叶冒作持久事实。四元组保持原Unicode/大小写，不截断、不折叠、不弱哈希。编码前做有界长度检查，UTF8 JSON≤3069B则完整ID≤4096；3070B拒绝并保留可诊断数据。

兼容ID不进入clean draft.view，更不能当磁盘base。首次获准GUI/CLI布局编辑、restore或同视图runtime替换，先把保留叶的相同兼容ID物化到真实candidate，再做变换；原base仍是原磁盘。非法显式ID不能因normalizer剥字段而误当缺字段生成别名；应在原源读取/规范化边界保留可诊断事实。超长/畸形/重复引用准确capacity/ambiguous/unaddressable，不清空全图、不任选目标。可靠原Session/显示引用的明确编辑可准入短新ID，query不触发它。

重排、整Tab移动、resize、切Space保持ID；本票不新增跨Tab Pane搬移。close立即移出活动索引，closedTabs只作历史；reopen克隆显示并为每叶新分配ID，原ID不得复活。相同Session重复/并发attach幂等，不能靠创建第二个xterm/input/size owner解决。活动索引按每Space唯一真值来源（缓存草稿优先）检索；跨Space相同ID的不同引用为TARGET_AMBIGUOUS，不靠hint挑一个。未在有界预算内核对唯一性不得报unique/not-found。

## 原布局owner的读写与效果

WorkspaceStore可选提供readLayout/editLayout或同义端口；createSpaceWorkspaceStore实现，旧v1 store无该端口时Pane命令明确unavailable。保留version2 Space records/version1 WorkspaceState；本票不接管T15旧writer迁移。

readLayout等待原ready后，缓存Space返回真实draft.view及revision/dirty/pending/conflict；未缓存Space临时规范化/描述，不ensureDraft、不扩Map、不选Space、不取lease、不写盘或mint ID。revision随实际本地编辑/remote采用改变，查询本身不增长；分页不能只用records对象revision忽略GUI未保存编辑。

editLayout只编辑明确的一个Space：等待该Space已有pending结算，协调remote/conflict，在最新真实view上重核原Pane/Session/runtime/scope/原signal与deadline，再一次接纳candidate。保留已有dirty编辑，先物化旧ID再transform。当前Space发布原store，非当前只发布该draft/revision，不临时切Space。只save这一Space，复用原SpaceService.saveLayout、writer lease与merge；不全局flush让无关Space冲突拖住命令。dispose仍排空所有已接纳保存。

| 真实阶段 | 必须报告的effect |
|---|---|
| 本次candidate尚未发布，原等待被取消/超时 | none；原GUI pending可继续，但本次transform不得迟到执行 |
| 已发布，尚能证明未开始磁盘写 | partial，layoutPublished=true、persisted=false |
| 原owner写在途，确认未知 | unknown，保留原tuple与已发布事实，不重放/回滚 |
| saveLayout已确认且owner一致采用 | completed；后续观察取消不能抹去已确认写入 |
| 已确认写入但后续rebase/呈现失败 | partial、persisted=true及实际版本，保留冲突双方 |
| 保存失败而不能证明primary未变 | unknown，保留草稿和恢复事实 |

在saveLayout成功点即记录persisted，不等可能失败的rebase后才记录。原afterSubmit机制保留在途期间更晚GUI编辑，不能整图覆盖。所有晚到save由原owner收束，不能留下无人消费的continuation；不把一般异常统一映射成“未发生”，也不伪造T08输入receipt。

## 六操作与真实消费链

canonical描述→原Rust CLI/broker→NativeHost/Router→薄ControlCommands→同WorkspaceService→同SpaceWorkspaceStore。A先交真实类型与端口，B/U再消费，禁止各造同名DTO/模拟store。

| 操作 | 外部行为与捕获边界 |
|---|---|
| pane.list | 默认冻结调用Space，显式Space按原scope；增加既有limit/cursor分页，以完整49152B envelope计量。返回有界Pane身份/Space/tab/persistent Session/可选runtime、显示/焦点/实际位置和比例事实。旧cursor遇布局revision变化准确stale。 |
| pane.attach | 原Session归属的显示引用，已有引用幂等；live只接回原runtime，stopped/restored只放恢复记录，pending明确拒绝/等待状态，无隐式spawn。CLI attach只附加引用，输入焦点另用pane.focus；GUI既有显式定位行为保持。跨Space不迁移归属、不改控制target。 |
| pane.focus | 捕获原Pane及可选runtime，必要时选择归属Space/tab/叶；走同ForegroundIntent和原request id。live成功需实际presentManagedFocus→commitFocus→consumed；commitPresentation返回true本身不够。沿原1000ms呈现期限且不超过原操作期限，取消/替换/blur/关闭/新视图终止该次观察，不重放。已选布局而无实际呈现只能partial；stopped记录不得假称有终端输入焦点或自动启动。 |
| pane.split | 显式既有第三Session插在源Pane旁，保留原输入焦点；同Space，拒绝重复显示/源目标相同/超过4叶。不能调用会启动新Shell的GUI splitPane shortcut。分别捕获源Pane显示runtime及插入Session/runtime，不能在延迟提交时跟随新代。 |
| pane.resize | 稳定Pane当前最近父split；ratio表示目标叶所在子树的份额，second转为1-ratio。公开范围0.15–0.85，canonical/help/实际GUI一致，非法值拒绝不静默clamp；无父split准确无效果。 |
| pane.close | 原ownerdetach/fold并确认保存，绝不stop/archive/delete Session。旧ID失效，后台原PID/屏幕仍活；再附加/重新打开产生新显示ID。 |

明确pane/session选择不附带调用者默认Space造成伪冲突；仅pane.list缺显式Space时补环境hint。split的--runtime若使用，应校验插入Session的代次；源Pane代次由捕获引用独立锁定。响应不得把源Pane ID和另一个Session拼成虚假单一对象：top-level target给源Pane完整原身份，data明确列insertedPane/Session及实际变更；文档与测试固定该语义。attach返回新/既有Pane完整身份。其他pane操作可选runtime约束对应源Pane。

## 生产UI与设计验收

保留原Shell 600/960容器档位、52px rail、220–500可调侧栏、组/Tab拖拽/pin/color/快捷键；不把原型232px变成新固定宽度。原工作区补Space身份与44工具栏；Pane header至少34高，桌面关闭命中≥32、窄屏≥44，长名不挤掉操作。低宽度分屏上下呈现只影响展示，不改持久direction/ratio，跨档恢复原模型。

保留T08控制312px外盒/<600 Dialog、状态保存、取消/继续等待/读屏与全部修复。显式target和焦点分开：跨Space后保留目标就展示真实scope/选择项/Provider和原tuple；失效则明确禁发/重选，不显示新Space首项却发送旧对象。状态需文字和准确原因，不以unknown冒充idle。

DOM与Chrome必须装配真实TerminalTabView/WorkspaceLayout及原服务，不沿用只mock终端叶的旧Layout两测试当覆盖。覆盖loading/noSpace/empty/error/background/detached/disconnected/stopped/restored、长中文/重名、关闭最后叶仍运行、原键盘/菜单/Dialog焦点返回、ownerDocument/blur/晚到请求不抢焦点。

Chrome采用真实生产导入与明确受控端口：1440/1200/800/390/480及599/600/959/960，关键亮暗状态；真实pointer拖拽回读同树；200%独占profile校准outer/inner/DPR/CSSzoom，实际reduced-motion匹配；原PNG尺寸与左右边界/scroll/focus校准。先等待真实动画稳定，不全局禁动效。所有浏览器/server/PID/profile资源归属与清理要可回读。真实Obsidian/Provider/OS IME/五平台仍由用户完成，不当自动化pass。

## 分工与验证

A14/B18/U20/Root4共56精确路径见T-09-write-allocation.json；实际分阶段派遣前未开启写入。A只管布局owner/身份/领域用例；B只管协议/CLI薄adapter/真实native组合；U独占生产UI、i18n和新Chrome脚本；Root独占正式状态和main/styles/budget/notices；共享TS/Rust wire生成物由B唯一writer通过原生成器产生。A/B需要文案先发key清单给U，不能自己改i18n。同文件不按方法并行。controller/SpaceService/records/merge算法、Host/helper/editor/codec/generator/终端内核/Shell及依赖锁均保持只读；确有必要先由Root补精确路径。

先A稳定生产API与关键红绿，B第一阶段只在分配的前10个协议/CLI/fixture/说明路径做不相交canonical解析，availability保持false；依赖A接口后才接adapter与U展示，整个消费者闭合才激活六命令。Root最后同源构建与统一代码验收；不能把某组自报当整票通过。

关键测试：无writer重复load/list/reload、兼容编码3069/3070/Unicode/伪ID/重复、query不引synthetic冲突、原dirty Space与CLI同owner、取消前none/晚保存unknown/确认后partial、并发attach去重、第三C不重复B、ratio嵌套second、close/reopen/runtime换代身份、实际consumed焦点、全envelope分页与revision。真实CLI须同NativeHost+生产Workspace/store：六命令双向GUI回读、关Pane后原PID仍活且stop明确可用。无需Pi模型验证纯布局。根产物按真实归因和原预算门；独立两轴覆盖完整本票最终写集。
