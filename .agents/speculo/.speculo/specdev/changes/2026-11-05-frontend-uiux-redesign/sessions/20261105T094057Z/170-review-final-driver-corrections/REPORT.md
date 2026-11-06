# 最终driver判据修正独立关闭

Session: 20261105T094057Z
Task: 170-review-final-driver-corrections
Status: completed

## 聚焦交接

Reviewer: native:/root/final_ui_contract；sol high；Strategy: independent；Risk: high；Independence: required；Mode: native。本人为168只读reviewer，未参与169候选、167/169应用或Root宿主执行，未委派。仅写本不可覆盖REPORT与/tmp/huhu-final-corrections-high；未改产品/QA/资产、状态/Evidence/index、旧报告或候选，没有新开Chrome/native/矩阵。

**standards: pass；specification: pass；Findings: []。168 CAPTURE-WAIT-01两个子缺口均closed。** 当前helper只有连续三个净且几何相同的frame才拍；采样返回后及shot开始前仍用原deadline，过期沿原timeout，不扩大15秒。Root同产品新正式87/48真实exit0，48条trace末三帧均净且几何一致；三张原Ink390图已实际查看，完整稳定。164 BUILT-CAPTURE-01保持closed。167实际driver字节/mode等同168已审候选，观测scope复用，不称修复产品。

当前第三轮完整原13×66 CLI仍运行，不混合旧child、不提前称整体pass。第二轮实际CLI126、12子票各passed66、T04执行5项且第五项失败、797汇总保留；原失败因果仍未定，不能由一次再跑绿推定flake。Root最终第三轮、AC902/全16状态与G-FINAL/Goal裁定独立待验。

## 产物与验证

### 两个真实应用源与不变产品

| 源/包 | SHA256 / mode |
|---|---|
| workbench-probe before（168审查输入） | 46fcf0555a856ec7388867a3a199963c92ceda551e0a6eb951b94105c653108a / 0664 |
| workbench-probe当前after | 39a26cd4b8bbaaf2e7e1bfa99b2db2f3988bf28e78f5782833e431c82b41c86c / 0664 |
| 169 ready.patch | 3c75ac664f81e22564ef19e92f4cfae341a81a70e09866e2e71c884968b2e716 |
| T04 index.mjs当前已应用after | 90b41c9458a57c790c668739bfb589d5477a6d30ba27b47a4e8a4f914050d7b5 / 0664 |
| 167已审ready.patch | d32b632c4523ca70938329ac08a747e73ffb9f2f933d964f880a225692cb1054 |

读取Root冻结/tmp/huhu-root-frozen-clean-capture与/tmp/huhu-root-frozen-shell-click-observation的manifest/patch，核当前两源SHA/mode。169 patch当前after在私有/tmp反向应用，before摘要精确还原；逐hunk只有本helper三处判据。167当前正式文件逐字等同原/tmp候选，且SHA/mode/patch等于168原已审输入；未重跑其观察器或借此声称产品修复，128上限/无草稿文本/原失败throw/finally abort-disconnect-delete范围准确复用168。

最终产品/tmp/huhu-t14-root-final4-artifacts三产物与final3完全相同：main3d46003c5ba16d0cf0aec286bdac3b5c75ff143d489f29018fe34231cbf0920e，stylesae8a0e9196a784336a4a9dc2ee218b5dc6544fe20b818472e4f16ddc7696dca9，manifest416a808d099711bcfcf4194dfdce167b670e02bcbf22922a141658036692da16。独立比较final3/final4资产与source-manifest相同，逐项核当前2071源、三资产及44 QA的SHA/mode无漂移；两冻结plugin三文件也匹配。不是重新逐行审查2071源。

delivery-manifest有4640条，本审读取清单/计数/SHA（e3854ac37ad031ee9d9c07ad697d12f0c5954d761b57e11d38a5035870cd31bb），不冒称再次逐字验证全部4640交付文件；按本TASK只需逐条Source manifest/资产/QA核验，Root持有全交付冻结与最终状态。原4802工程测试固定产品输入的范围可复用，不重跑工程门。

### 原helper独立14个正负控制

本人check-wait.mjs从**当前正式源**原样提取stableShot，Node VM仅提供受控frame/时间和shot/写盘端口；不改helper、不以模型替代真正宿主。与168相同反例现在均正确拒绝提前拍摄：

| 控制 | 当前实际结果 |
|---|---|
| 净3 | 第3样本shot1 |
| 无效→净1→净2（有限序列随后结束） | shots0 |
| 无效→净1→净2→净3 | 第4样本shot1 |
| 净1→净2→无效→净1→净2 | shots0 |
| 动画无效帧后重新净3 | 第6样本shot1 |
| 几何A两帧→B两帧 | shots0 |
| 几何A两帧→B三帧 | 第5样本shot1 |
| 第3采样恰到15000ms / 跨到18000ms | 两者shots0、原timeout且timedOut trace |
| 净3在14997ms，trace写盘再用3ms | pre-shot原deadline拦住，shots0；最终超时trace正确 |
| shot在14700ms开始、RPC在15700ms完成 | shot1，符合只限制开始时刻，不擅加RPC完成预算 |
| 永久closed / 永久有限动画 / 永久moving | 各15000ms原timeout、shots0 |

合计14控制exit0，controls.json保留真实输出。有限序列结束模型故意抛controlled-sequence-end来证明第三净帧前shots0，不称宿主正常完成。模型时钟不执行长sleep；没有修改阈值或扩时。无效帧清previous后，原stableFrames>=2仍正确对应第一次净帧建立基线、第二计1、第三计2；不要求人为把阈值字面改3。采样后检查与贴近shot的第二检查共用同原deadline；写盘耗尽预算时pop临时trace项再写timedOut，不产生canonical拍摄成功。

原87行为/48图名、route-ready与notes共享15s、finite动画筛选/rAF/真实动画、field/overflow/focus/restart断言没改。代码没有sleep、禁动画、force focus或产品逻辑变化；168不稳定frame与跨期两个合同缺口由真实判据变化闭合，而非修改历史或改口。

### Root当前真正宿主87/48与三张实际图

receipt=/tmp/huhu-root-final4-checks/workbench-stable.receipt.json，SHA256 3875273c1262cc87e7c82321f7528be3f10e0ecaca095e80c661d6f4980e7959。原命令xvfb-run -a -s '-screen 0 1800x1300x24' node scripts/obsidian-acceptance/workbench-probe.mjs /tmp/huhu-root-final4-host-workbench-stable；实际exit_code0，29.54秒。HUHU_PLUGIN_SOURCE仍为final3/plugin，其三资产已独立证明等同final4，因此不是错输入；新installed-artifacts.json的expected/installed三项匹配且scriptSHA为当前39a26…。

新evidence/result.json实际87 rows全部passed；capture-stability.json实际48条，每条canonical PNG存在，最后三采样closing=[]、finite animations=[]，surface/shell/page bbox及水平位置key完全相同，最后scrollX/documentLeft0。没有只信passed字符串；本次Root新trace确实按修正的净三帧停止，非旧[2,0,0]冒用。

本人用view_image实际看当前新N=/tmp/huhu-root-final4-host-workbench-stable/evidence下三图：

| 当前图 | 实际图/Root trace | 关闭状态 |
|---|---|---|
| production-ink-390-terminal.png | Sheet占leaf x44…390、标题/关闭/控件/输入区完整；13采样约199.5ms，末3净且稳定 | closed |
| production-ink-390-automations.png | Chrome/页两边完整、无右白Terminal control残影，模板/toolbar正常；12采样约171.9ms，末3净且稳定 | closed |
| production-ink-390-contacts.png | 标题/People/字段/分页完整，无整窗左裁；3采样约33.1ms，末3净且稳定 | closed |

这三图只证明当前捕获序列稳定，不能推定所有领域/交互/原失败已修。其余164已审21张及168额外代表图、原152/161/163未变页面和修复范围复用；没有再做24/96全图审。三当前PNG SHA保存在audit.json。

### 本人实际命令与限制

- node /tmp/huhu-final-corrections-high/check-wait.mjs：exit0，14个原helper正负控制，输出controls.json。
- python3 /tmp/huhu-final-corrections-high/audit.py：exit0；两源真实应用摘要/patch与169 reverse-before、2071源/三资产/QA44、final3/final4一致性、真实Root receipt/安装SHA/87/48/末3净frame、三PNG存在均通过，errors=[]。输出audit.json，末次snapshot用于核固定输入无漂移。
- node --check scripts/obsidian-acceptance/workbench-probe.mjs；node --check scripts/ui-review/fixtures/frontend-redesign/T-04/index.mjs：均exit0。
- validate-dispatch：dispatch0；return在REPORT落盘后执行，以实际工具回执为准；回读后停止。
- 没有本人新native/Chrome、66/858、build、全仓test/lint/type，也没有读取用户真实vault/clipboard/账号。Root的新87并非本人执行；第三正式矩阵仍running，旧失败/143不被此处的scope pass覆盖，167仍只是观测变化。

## 问题与下一步

168 CAPTURE-WAIT-01的净帧与截止时间两个子项均closed；164 BUILT-CAPTURE-01三图保持closed；167实际应用与168已审候选完全一致，本增量无新finding。当前QA判据/图证据与产品输入均满足本次最小关闭范围。

Root继续当前第三轮完整13×66原CLI、实际父退出收据与全部必要最终状态；若再失败，保留167新增的当次轨迹先定位，不把观测增量称产品修复或一次绿称flake。本审不提前宣布AC902、全T14/G-FINAL或Goal完成。return校验/回读后停止全部读写并释放两QA源/资产及全部审查冻结。
