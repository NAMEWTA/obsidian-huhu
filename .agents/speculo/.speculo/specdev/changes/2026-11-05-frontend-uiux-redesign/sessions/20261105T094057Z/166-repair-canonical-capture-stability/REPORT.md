# 166 canonical 捕获稳定修订（dispatch0 / return0）

## 交接

本次证据确认164所指3张Ink390图捕获了实际Sheet进入/退出过渡；在同冻结产品、新库和保留原动画时等待有限过渡结束后，terminal抽屉、automations、contacts的稳定几何与新图均完整。未发现本序列上的持久产品布局缺陷，没有修改产品或隐藏Sheet。

唯一候选为 scripts/obsidian-acceptance/workbench-probe.mjs，冻结于 /tmp/huhu-stable-canonical。ready.patch SHA256 79651ba959b708daffd07951822db31ab110f8f37ac0dab2cbb2af6675bb765e；manifest记录before 9382c912bc30dad9c2b193427c2b89dde1ed6f45e5922a0cdb292cd51d6cf310 → after 46fcf0555a856ec7388867a3a199963c92ceda551e0a6eb951b94105c653108a，mode0664。只写本不可覆盖REPORT与指定/tmp候选；正式脚本、产品、状态、Evidence、旧报告与资产全未改。fresh-vault/cdp的原样本地副本仅作现launcher依赖，不在patch。

## 产物与验证

已读166/164 TASK、当前probe捕获位置、Sheet/DetailPane/Shell相关真实调用；旧捕获在mounted/overflow后立即shot，生产Sheet仍有enter180ms与exit120ms。最小差异是在48张canonical拍摄处调用同文件stableShot：

- 每次真实route切换前保留原15秒ready deadline，mounted等待与新稳定观察共用这个deadline；notes同样共用原15秒预算，没有扩大timeout。
- 通过requestAnimationFrame逐帧观察实际document.getAnimations，只等待workspace/HUHU下运行且endTime有限的动画；不关闭动画、不改motion、不停infinite spinner，也不另加任意sleep。
- 等待实际closed sheet-content/sheet-overlay卸载，再要求连续3帧目标surface、shell/page bbox和文档水平位置一致；检测稳定后页边界与document scrollLeft/scrollX，再沿原runtime.shot拍原文件名。
- 捕获前每帧的真实surface类型/rect、shell/page bbox、closing Sheet文本/rect、有限动画name/state/timing及performance时间写本地capture-stability.json。闭合超时、持续移动或稳定后越界均抛错，不保存为canonical成功。

原87行为、48 canonical（12面×纸墨×1440/390）、source就绪、overflow/focus/hit/panel/module/restart断言保持；没有接管165或重跑9套native/858。

### 真正宿主因果

两次均使用独立xvfb-run -a、新不存在root、私有HOME/profile、port9500；fixture内显式空widgets看板，未访问用户库/账号/剪贴板。固定主产物输入为 /tmp/huhu-t14-root-final3-artifacts/plugin：

- main.js：3d46003c5ba16d0cf0aec286bdac3b5c75ff143d489f29018fe34231cbf0920e。
- styles.css：ae8a0e9196a784336a4a9dc2ee218b5dc6544fe20b818472e4f16ddc7696dca9。
- manifest.json：416a808d099711bcfcf4194dfdce167b670e02bcbf22922a141658036692da16。
- 本地PTY：/tmp/huhu-final-native-binaries/huhu-pty，SHA 0a7b01d5ee7554d8aec7c45c04fd482bd10e8e420847a07d671d7c0ca7c7fa2d。

native-02/evidence/installed-artifacts.json 的expected/installed三资产逐字相同，script SHA与最终after相同。native-01是初次因果诊断；随后仅收紧trace为真正可见surface、notes共用原deadline，native-02对最终候选又实际完整运行。

最终native-02帧证据：

| Ink390目标 | 最初可见动态 | 稳定前实际观察 | 稳定结果 |
| --- | --- | --- | --- |
| terminal | huhu-agent-page、shell/page x=-248/right98；sheet-overlay enter120ms、sheet-content enter180ms运行 | 14帧，约215.4ms | animations=[]；shell/page x44/right390；实际新图抽屉完整左44/right390，无进入中途裁断 |
| automations | huhu-automations；closed sheet-overlay与Terminal controlClose sheet-content仍在；exit120ms运行 | 11帧，约173ms | closing=[]、animations=[]；page x44/right390；新图无右白残影/整窗左裁 |
| contacts | huhu-archives-page；上一步退出已完成 | 3帧，约32.3ms | 无关闭Sheet/动画；page x44/right390；新图左栏、标题、字段与右边界完整 |

已实际view_image原contacts坏图与两轮新terminal/automations/contacts图。最终48条trace全部末帧closing/finite animations为空，scrollX和documentLeft为0；48个原canonical文件名均实际存在。此结论只解释当前捕获序列，不将截图或等待扩大成所有领域/交互/数据状态已验。

### 实际命令与退出

公共环境HUHU_PLUGIN_SOURCE=/tmp/huhu-t14-root-final3-artifacts/plugin，HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian，HUHU_PTY_BINARY=/tmp/huhu-final-native-binaries/huhu-pty，HUHU_ACCEPTANCE_PORT=9500。

| 命令 | 真实结果 |
| --- | --- |
| node --check /tmp/huhu-stable-canonical/scripts/obsidian-acceptance/workbench-probe.mjs | exit0 |
| xvfb-run -a -s '-screen 0 1800x1300x24' node /tmp/huhu-stable-canonical/scripts/obsidian-acceptance/workbench-probe.mjs /tmp/huhu-stable-canonical/native-01 | exit0，87项；48canonical动态trace及图 |
| 同命令，root=/tmp/huhu-stable-canonical/native-02 | exit0，最终脚本87/87，48/48canonical，无failed行，宿主restart前后errors空 |
| node /tmp/huhu-stable-canonical/check-wait.mjs | exit0；直接执行候选原stableShot片段，实际finite-exit采样序列可拍，stuck-closed-sheet/never-stable-bbox两个负模型均15秒超时且shots=0 |
| git apply --check /tmp/huhu-stable-canonical/ready.patch | exit0；未应用 |

控制工具及wait-controls.json只在/tmp，用真实记录的frame数据控制原helper正负判据，不启动另一引擎，不当作真正宿主通过。未build、全仓测试、其它native或矩阵；无新增产品输入，不需要用这些检查重复认证未变产品。两次owned Obsidian均由原runtime.stop正常结束。

## 问题与下一步

当前单QA源候选已冻结，Root可在164释放后应用。Root仍须按任务使用同final3三资产最终正式重跑该87命令，并交high实际复验新24张图；本私有87与新图不冒Root最后正式门，不裁定仍running的其它矩阵或T14/Goal完成。其它9native历史结论的产品输入未改变。

return0。停止所有读写并释放候选、manifest、ready.patch与REPORT；未提交、推送、发版或写状态。
