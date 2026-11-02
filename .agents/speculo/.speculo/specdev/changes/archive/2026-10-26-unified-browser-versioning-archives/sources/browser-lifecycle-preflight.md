# T06 生命周期只读预查

2026-10-27，native:/root/audit_browser（gpt-6.1-sol/high）回执，T05 初审期间仅阅读，未写源码或运行测试/真实宿主。T06 尚未开始；下列缺口须由确定性反例及原合同确认，不能当成已修复或完整审查结论。

## 已有链路

- browser 独立模块，Agent 为可选消费者；模块 dispose 失败保留归属，personal 拒绝 Agent Run。
- native 独立控制通道、control_pending、同一 writer 锁及 gate 单调 epoch/同 session down-up/大小上限；Workspace 接管立即撤销旧 Run 并等 native ACK。迟到 observe/operation/batch/父连接结果已有过滤。
- SpaceViewer 在 hidden/pagehide/卸载释放 viewer，ownerDocument 改变使用新 viewer/windowId，旧帧/document/viewport/epoch 均检查。
- 启动恢复目录为 stopped，不恢复旧 Run/租约；重开保留原 Page ID、URL/profile，不重新导入 seed。停止、取消启动、删除失败归属与重试已有回归。

## 待 T06 实际验证的缺口

1. 部分页恢复失败后，Workspace 保留失败 Page 且其余页可 ready，但尚无按原 Page ID 重试单页入口。预计涉及 workspace/API/实际 UI/文案。三页第二页失败时，重试应只创建第二页，第一/第三页继续 live。
2. host-main 收 native ACK 后以 void rpc(control) 通知 Worker 就返回，cdp 未保存 dispatch sequence。需按接管合同核验 native revoke 与 Worker 收敛是否缺完整交接屏障；有界回执不得阻塞独立 native revoke。注入 Worker control barrier/failure 后，不可在未满足合同的情况下宣布 human，也不能授予双方输入。
3. startSpace 中 reclaim/start 位于现有内部 try 前，直接失败可能残留 starting。分别注入失败，按已确认或未知归属投影 faulted/quarantined，保留旧 profile/desiredPages。
4. stopSpace 异步尾部未比较捕获的 intent/runtime。先验证双 stop 与新 start 交错是否能覆盖新 runtime，再作最小修复。
5. 人工租约续期依赖 frames.has(viewerId)。核验 popout 丢失且 pagehide/unmount 未送达时是否有真实宿主生命周期撤销；普通关闭测试不能证明该窗口。

预期均在原 T06 写集；独立审查中的 T05 finding 优先修复，T05 闭合前不得开始这些代码改动。未来实际源位置可能变化，以当时源码和完整 Issue1/AC003004008 为准。
