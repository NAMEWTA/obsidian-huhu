# T08 原生编辑器事务：Root 接缝决定

本决定解释已授权 Spec §3.4、AC-013/014/015/017 与 implementation-contracts §2–4，不增加产品权限或提前解锁 T08。T07 独立 R2 仍在执行；全部仓库产品源保持停止。既有等待/输入草案继续适用。

## 选定路径

普通 Agent prompt 的“原生文本 + 提交”由真实原 editor 的一次完整 bracketed paste 与一次原生 Enter 完成，允许正文通过受认证本地应用事务到达。Spec 没有规定正文必须逐字节经过 PTY stdin；此方案保留原 editor、原提交回调与 working 时原 steer 行为，不调用模型 API 代替 TUI。HUHU 不自行替换 editor，不清空已有草稿，不静默关闭第三方扩展，不额外发 Enter。原 raw terminal.send-text/send-keys 继续沿原 PTY 输入路径。

前台门采用同一已捕获物理 slot 的本次 fresh OS 观察，加同 runtime/source/binding 的最终应用 gate。无法证明原进程、运行代次、默认 editor、焦点、正常输入模式或严格空草稿时拒绝。已知权限、登录、selector、overlay、autocomplete 等非普通提交状态拒绝。实际观察到前台变化必须拒绝。POSIX 检查与稍后 JS 回调不具有原子性，不作提交纳秒的 OS 前台保证；正文不走 stdin，避免把正文误送给接替 stdin 的其他前台程序。同账号恶意干预和未观测同像 exec 不属于沙箱保证。

AC-014 的保证是一笔正文与一次提交不可被另一个输入回调插入，不拼成第三条命令。保持原 NativeInputQueue 的有界 user-action 持槽与排队；最终 editor 两步在一个无 await 的 JS 同步段执行。完整体接收、取消/期限检查在该同步段之前。不能把这提升为任意跨通路字节的应用消费 FIFO、TUI 任务顺序、单 turn 归属或模型成功。

## 第一条受支持分支

候选只覆盖可核验的官方 Pi 1.4.0 artifact 与实际入口闭包，用户已经明确设置 --no-extensions/-ne 且只载入 HUHU 扩展。当前 catalog、用户参数和已有 Provider 入口不因本决定自动改变。未匹配 recipe 的 Provider/版本/启动包装保持可解释 unsupported/unknown 与原始终端操作；Spec §2 明确第一条真实协作可从一个 Provider 开始，后续 Codex/Claude 产品实机验收仍保留版本和能力限制，不宣称所有版本同能力。

选择复用当前 helper 的非阻塞本机 IPC，增加 purpose 分离的应用角色；不是第二个 daemon/PTY writer。扩展绑定、正文与结果复用原 slot/输入预算/取消和结算责任。握手不能继承普通 CLI 凭据来取得任意 editor 权限；实际 root/recipe/source/epoch 校验与令牌交付由该角色的唯一实现者落到真实接口。单运行一份当前绑定、单 SID 一笔 claimed 事务；所有连接、pending、正文/编码副本和回执必须有独立可核验上限。parser replies/ACK、stdout drain、query/stop保留池和其他 SID/Browser 必须保持活性。

没有证明 callback 不可能迟到时，未知事务不得仅凭超时删状态返还原 user-action 槽；撤销绑定并保持有限 retiring/BUSY 至实际收束。取消未 claim 项必须无迟到输入；已经 dispatch 的取消不能许诺跨进程瞬时零副作用。应用回执使用 adapter-applied 等独立事实，不把它写成 PTY written。成功仅表示输入操作完成。

## 尚需实际验收

实际 bundled loader/Jiti 的类身份、真正 InteractiveMode 默认槽位、startup 和 working 原分支、空白/草稿/焦点/权限/reload/partial paste/IME，以及接入真实 helper 后的持槽、取消和 liveness，都是实施验收项。此前 loader 缺 jiti 的 exit1 和 component-only 测试不证明它们已经通过。最终交付必须有真实可成功的支持分支，不能用全拒绝冒充完成。

来源已由 Root 完整回读并保存：T-08-a-control-plan-root-audit.json、T-08-b-supported-plan-root-audit.json、T-08-c-foreground-plan-root-audit.json；原官方包与先前实验沿 T-08-b-readiness-root-audit.json。当前只对 B 发出新的 /tmp 隔离 producer test-observation 准备；仓库产品写入仍未授权给 T08。
