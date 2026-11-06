# canonical捕获与Keep editing观测独立窄审

Session: 20261105T094057Z
Task: 168-review-capture-and-click-observation
Status: completed

## 聚焦交接

Reviewer: native:/root/final_ui_contract；sol high；Strategy: independent；Risk: high；Independence: required；Mode: native。本人为164只读reviewer，未参与166/167候选、Root应用或宿主执行，未委派。仅新增本不可覆盖REPORT与/tmp/huhu-final-driver-high，未改产品/QA源/资产、状态/Evidence/index、原报告/包或设计，没有新开Chrome/native/矩阵。

**standards: request-changes；specification: request-changes。** 164 BUILT-CAPTURE-01的三张坏图证据缺口在Root新正式同构建稳定图上已关闭，未发现本次稳定页的持久产品布局故障。167单driver观测候选在本增量范围通过。当前166等待器另有一个P2控制缺口CAPTURE-WAIT-01：非净帧可被计入三帧几何连续性，实际只需两个净帧；采样await返回跨原deadline后仍可能拍摄。Root已接受下一单小hunk修复，故不能将166整个等待合同判通过。

原T04失败因果仍未定，165 fresh1/前5诊断不复现不能改称flake或产品修复；本候选只增加失败当次观测。原第一轮parent JSON/13 child0与父tool迟回收143、第二轮T04第五case失败均按真实边界保留，不混合旧结果制造新的父CLI0。Root仍须第三轮完整原13×66及最终退出收据，本审不裁定T04/T14/Goal通过。

## 产物与验证

### 当前输入与Root真正复跑

166当前唯一QA源scripts/obsidian-acceptance/workbench-probe.mjs：before9382c912bc30dad9c2b193427c2b89dde1ed6f45e5922a0cdb292cd51d6cf310 → after46fcf0555a856ec7388867a3a199963c92ceda551e0a6eb951b94105c653108a，mode0664。Root冻结/tmp/huhu-root-frozen-canonical-capture/ready.patch SHA256 79651ba959b708daffd07951822db31ab110f8f37ac0dab2cbb2af6675bb765e及manifest.json。当前after字节/mode与patch摘要匹配，反向应用到本审独立/tmp副本后before精确还原；逐hunk仅canonical捕获helper/原15s共享deadline接入，无产品源变化。

167未应用正式driver。正式T04 index.mjs仍为before b95e797f213fbd42f445cb1e7610befd3d90b47fb0183b1ee864cfe208665c7a；私有候选/tmp/huhu-shell-click-observation/candidate/scripts/ui-review/fixtures/frontend-redesign/T-04/index.mjs after90b41c9458a57c790c668739bfb589d5477a6d30ba27b47a4e8a4f914050d7b5，mode0664，单源。ready.patch SHA256 d32b632c4523ca70938329ac08a747e73ffb9f2f933d964f880a225692cb1054。独立核manifest、正式before、candidate after/mode、patch及私有reverse-before全部一致；旧第二轮仍running时未改它的输入。

产品输入仍为/tmp/huhu-t14-root-final3-artifacts/plugin：main3d46003c5ba16d0cf0aec286bdac3b5c75ff143d489f29018fe34231cbf0920e、stylesae8a0e9196a784336a4a9dc2ee218b5dc6544fe20b818472e4f16ddc7696dca9、manifest416a808d099711bcfcf4194dfdce167b670e02bcbf22922a141658036692da16。本审逐项计算当前与冻结三产物SHA/mode，2071源清单逐摘要/mode确认productDrift=[]；这是输入完整性校验，不声称2071源新逐行审查。

Root真正重跑receipt为/tmp/huhu-root-final3-native/workbench-stable.receipt.json，SHA256 29c68a2b1c2ecead011acdc0f00253ab3802e6585139eb356930d11211cb41a8。原命令xvfb-run -a -s '-screen 0 1800x1300x24' node scripts/obsidian-acceptance/workbench-probe.mjs /tmp/huhu-root-final3-host-workbench-stable，pluginSource准确为final3，实际exit_code0，31.298秒。它是Root正式执行，不是166 producer私有native-02冒充。新installed-artifacts.json三项expected/installed与上列三资产一致，script SHA是当前46fc…；result.json实际87 rows全passed，48 canonical文件与48 trace逐项存在，末帧closing/finite animations空、scrollX/documentLeft0。

### 三张关闭与最小额外图审

本人实际view_image五张N=/tmp/huhu-root-final3-host-workbench-stable/evidence下现成PNG，复用164其余21图和152/161/163已审未变范围，未再次24全审。

| 图片 | 当前实际观察 | 结论 |
|---|---|---|
| production-ink-390-terminal.png | Sheet完整占leaf x44…390，标题、关闭按钮、控件与输入区可达；不再只有约x208之后的进入中段 | 164该张缺口closed |
| production-ink-390-automations.png | Chrome/页左边完整、无右白Terminal control残影，toolbar/模板正常 | 164该张缺口closed |
| production-ink-390-contacts.png | 标题/People/字段/分页与两边界完整，无整窗左裁或抽屉残影 | 164该张缺口closed |
| production-paper-1440-notifications.png | 无多余二级Panel，toolbar/来源/已读动作仍在 | 无新增捕获回归 |
| production-ink-390-versioning.png | NoRepo创建主/设置次，Clone独立区，窄屏层级正确 | 无新增捕获回归 |

Root实际trace进一步支持动态到稳定的因果，而不是只有新图看起来正常：terminal从page x−248/right98、overlay enter120ms/content enter180ms运行，到14帧约203.4ms后page x44/right390；automations起始closed overlay/content仍在且exit120ms运行，11帧约162.3ms后两者卸载、无残影；contacts随后3帧约32.2ms本就稳定。时间与帧数来自本Root正式trace，不冒用166私有215.4/173ms。原动画未禁用，生产CSS/代码没动。因此此序列的原坏图由捕获时刻未等过渡解释，不能外推所有产品状态或交互已过。

但真实automations末三帧closing长度为[2,0,0]，对应下述净帧计数缺口；图片本身现在完整，不因计数合同问题把它们反称坏图。

### 166等待器独立正负控制与精确反例

当前helper只在canonical捕获处使用，route mounted与stableShot共同使用切换前创建的原15秒deadline；notes同样共享，不新加sleep、不改motion、不等无限spinner；有限动画筛选仍保留workspace/HUHU与finite endTime边界。原87行为/48图名及overflow/focus/hit/restart断言未删。持续closed或moving应失败这一目标正确，具体净帧/deadline接受判据未完全达到合同。

本人wait.mjs直接从**当前正式源**抽出原stableShot，原样在Node VM控制c.evaluate的真实记录/有限模型，未改helper或产品。实际模型结果：

| 控制 | 原helper实际结果 |
|---|---|
| Root真实automations finite-exit逐帧回放 | 11样本后shot1，末三closing=[2,0,0] |
| persistent-closed / persistent-finite-animation / moving-bbox | 各原15秒超时、shots0 |
| stable但documentLeft非零 / page.right越界 | 正确assert失败、shots0 |
| one-invalid-two-clean，几何key一直相同、closing=[1,0,0] | **第三个总样本就shot1，实际只2净帧** |
| 每次evaluate占用受控6秒，第三采样返回时clock18000（同原deadline15000） | **循环开始时尚未过期，await后已经超期仍shot1** |

wait.mjs exit0表示上述观测与模型相符，不代表新合同通过。require-three-clean与require-deadline分别对实际输出要求净3帧/原deadline内拍摄，均真实退出126；精确失败日志在/tmp/huhu-final-driver-high，不能用本地控制脚本绿字抹掉两个红灯。所有模型只驱动原helper的输入/时钟，未用模拟业务证明宿主通过，也未等待真实15秒或新开宿主。

### 167候选的观测与失败边界

逐hunk确认只增createKeepEditingObservation及Keep步骤生命周期：本Doc七类pointer/mouse/click/focus事件、WeakMap节点identity、原目标是否仍选中/connected、active/Alert节点与data-state及dispatch点。只监听已标记Keep editing阶段；最多128 records，多出只计dropped，最终current仍单列。新observer描述不读textContent/value、不留草稿文本或用户内容，字段为节点标识/角色/slot/review/状态/事件坐标。旧click helper原有诊断字段保持原范围，新mark仅复制x/y/hit/scope。

原click仍同一次evaluate定位、相同elementFromPoint assert、mousePressed/mouseReleased与tick；原await waitFor `alert不存在 && activeElement===detailField`及原异常trace/throw、原66计划与预算完全保留。没有重试/强制focus/手动close或产品更改，不能将观测引起的时序差异称修复。observer.mark自身失败使步骤失败，收集/清理失败也不被当成功；原目标错误已存在时finally不会用收集错误覆盖它。

本人复制167有限Node控制到本审/tmp后运行，实际导入候选create函数（仅既有radix import定向正式绝对URL），exit0：同/异target可区分，Alert open→closed→移除、目标断开/更换、draft active身份、300事件后128上限/dropped、无PRIVATE文本、stop后七监听归零/observer disconnect、停止后不再写、部分setup observe抛错仍abort/disconnect。

另本人finally.mjs抽出候选**原Keep try/catch/finally代码**，在六个有限执行控制中验证：成功、click失败、focus等待失败、focus与read双失败、成功但read失败、after-click mark失败。六组每组click恰1、stop恰1、global被delete；原click/focus/mark错误对象不被覆盖；没有原失败时read错误继续抛出并记录cleanup-error，而不是passed。控制数据在finally.json；这是原生命周期/错误传播的Node控制，不声称新候选已在组件运行或T04失效因果已定位。

167候选在本次review范围可供Root在旧父轮结束后应用；源不变、不移动原断言/策略，后续仍需原完整13×66 CLI第三轮与真实父退出，不能只重跑到绿、重用剩余旧children或根据165单次未复现推定flake。

### 本人实际命令与范围

- audit.py：exit0，当前166 after/167 before及candidate/两patch/mode/私有reverse-before匹配，2071源与三产物零漂移，Root安装receipt、87 rows/48canonical/末帧追踪一致。输出audit.json。
- node wait.mjs：exit0（诊断八模型匹配）；净三帧与deadline两个合同检查分别exit126，日志require-three-clean.log / require-deadline.log。
- node observation-control.mjs、node finally.mjs、node --check 167候选：均exit0。未修改原控制或候选文件；临时控制仅写本审/tmp。
- validate-dispatch：dispatch0；return落盘后执行，以真实工具回执为准。末次源/candidate/产物SHA/mode与REPORT回读后停止读写。
- 未执行新Chrome/native/66/858、build、全仓test/lint/类型或用户库/账号/clipboard。其余164/161/163范围准确复用；原产品不因新QA候选就自动得到新的最终passed。

## 问题与下一步

**CAPTURE-WAIT-01 · P2 · 净三稳定帧与原deadline内才可shot的两个接受判据缺口；owner T14/QA；scripts/obsidian-acceptance/workbench-probe.mjs stableShot。**

1. 当前非净帧仍把key写入previous；下一净帧相同key时stableFrames计1、第二净帧计2即shot。Root实际[2,0,0]与纯Node[1,0,0]都证明“卸载后连续三个净稳定帧”尚未实现。最小修法是无效帧清previous并清计数；首次净帧计1、后续同key递增，达到3再接受，不用改报告措辞或改为更低阈值。
2. while只在采样前检查Date.now()<deadline，c.evaluate await返回后可跨deadline，原实现仍可接受并shot。受控同helper在18000>15000仍shot1。最小修法在采样返回后及实际shot前再次检查**同一原deadline**，过期沿现有timeout记录/抛错，不能扩大预算或把越界拍摄写成成功。考虑trace写盘也可能消耗时间，shot前检查必须贴近实际调用；记录要准确区分超时，不能先写假成功。

Root已接受单小hunk修复。仅等待器这项open；164三张PNG稳定性缺口本身closed、167观测候选审查pass，未发现新的持久产品布局缺陷。修复后以纯Node净帧/deadline正负控制和同产品87/48正式复验、新窄审收口，保留166/168历史，不改产品或禁动画。

return校验/回读后停止全部读写，释放当前QA单源、167候选及所有审查冻结。Root继续单写、正式新矩阵与最终状态，不由本审宣布尚未完成轮次通过。
