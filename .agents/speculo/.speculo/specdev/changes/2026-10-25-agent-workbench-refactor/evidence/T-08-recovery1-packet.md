# T-08 恢复周期1：原生 editor 服务关闭

原Lead codex:/root沿用户完整18票Goal及Agent Team授权恢复。GP029 / Map30；workspace与HEAD不变。真实Obsidian、Provider、OS IME及五平台实机仍由用户验收；不提交、推送、发布、归档。模型沿原Sol/xhigh实施、独立Astra/high审查。本Packet形成实质恢复方案后才重置本周期计数，不因换Agent清除失败。

## 事实、共同模式与路线改变

原周期三次整合及两次整票审查原件不变。011的F1–F4已由016独立确认关闭；当前唯一F5由正常退出五代实测产生：无cap替换、每代ordinary fences与editor-closed已完成，helper进程已gone，私有0700 runtime根累计四个ECONNREFUSED socket。原报告及Root接收见T-08-review-r2-report.md和T-08-review-r2-root-audit.json。

共同失败模式是局部成功/进程结束未覆盖全部物理资源owner。F1为Host binding最后会合，现已修；F5为native service线程未参与最后退出。现源码enroll丢弃listener JoinHandle、shutdown只设置closing，Sessions.end_all仅等待session表，main最终process::exit可能先于Listener::drop。此前Root整合删除自己runtime目录只能清测试资源，不能证明native清理。

本轮实质改变：在原Service/Sessions/main生命周期内把listener实际结束和它持有inode的安全删除纳入有限关闭观察，并用真实helper EOF、多代相同runtime根及活跃editor关闭回归证明；增加未完成/异常清理的准确收束证据。保留所有binding、operation/frame/output、root/termination责任及F1 join。不得以sleep、宽泛删目录、删外来inode、提前返额、长超时或隐藏异常替代修复。用户行为、Spec/DESIGN、Space寻址及协议语义不改变，不增加新服务或依赖。

## 唯一写入

当前总集仍87路径，allocation-r3保留历史A34/B15/C33/Root5。原C已STOP；本次由codex:/root/prepare_t08_full_cli（既有Sol/xhigh）仅接管下列C子集，A/B其余源与根产物继续STOP：

- native/pty-server/src/editor.rs
- native/pty-server/src/session.rs
- native/pty-server/src/main.rs
- native/pty-server/src/control/unix.rs
- native/pty-server/src/control/windows.rs
- native/pty-server/tests/editor.rs
- native/pty-server/tests/stdio.rs

仅在真实新TASK投递后解锁。先比较最小“保留线程并有界观察结束”和显式停止/完成通知两种办法，按所有权/关闭预算选择；不得建立第二清理owner。所需范围外文件先报告Root。平台ipc若需显式返回安全unlink结果，应保持原同inode保护，Windows不支持editor的现状不改变。

## 实施与验证

先从当前源和原immutable bin保留能击穿旧退出路径的目标red；新增回归必须在产品删除/fixture删目录之前观察自己的endpoint/cap与记录PID。至少涵盖session已结束再EOF、活跃editor中EOF、同runtime多代正常结束，以及自己路径被替换时不删外来实体且关闭有限/残留可辨。受控调度测试明确其边界，普通无注入真实helper回归不可缺。不得把采集exit0当产品green。

最小修复后执行受影响Rust测试及全部native测试（关闭影响全helper），cargo fmt检查、Linux双bin真实build和现有Windows交叉check；缓存允许原现有CARGO_TARGET_DIR，旧immutable bin不覆盖，最终复制至新的只读bin根并保存source/command/tool/依赖/SHA。若平台工具缺失如实保留边界，不安装未知依赖。Host原F1/控制和完整官方Pi业务链由Root最终选择新bin再执行；未变TS/UI/构建产物/预算/Chrome证据按源及消费者闭包复用，不机械重跑。

保存每条实际命令argv/cwd/UTC/exit/raw，原输入字节和输出漂移，区分行为red、fixture错误和预期生成。Root回收REPORT与实际源后冻结完整87路径的新R3输入，交原未实施Astra两轴复核。新源及新bin使原native关闭检查失效；未变canonical/共享TS、A/B业务/UI的局部结论可以有界复用。独立完整review不是只验证F5一个断言。

## 恢复计数和停止条件

原blocked checkpoint/attempts3完整字节见T-08-recovery1-preplan.json。Lead已记录新输入、机制改变、验证缺口及唯一owner，现在恢复in_progress并从本周期0计；首次新候选整合才增加到1。有效上限仍3。无新证据时不重复派遣或仅换人。正式状态/工件/根产物仅Root写；T09–18仍依赖当前票完成，整个Goal继续active。
