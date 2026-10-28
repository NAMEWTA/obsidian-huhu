# T07 文件、输入与背压只读预查

2026-10-27，native:/root/audit_browser（gpt-6.1-sol/high）回执；T06 初审期间仅阅读，未改源码/工件或运行测试/真实宿主。T07 尚未实施，下列候选先用确定性反例验证，不当作已修复结论。

## 已有链路可复用

- file-service：有界固定副本/SHA256/路径与链接检查、一次性5分钟grant，绑定精确Agent Run或human viewer/epoch；重启不恢复grant。
- Workspace上传接持久操作账本，派发前重验权限；用户文件选择返回后再验lease。
- driver下载按GUID/执行归属关联；CDP screencast ACK独立于查看器。
- Worker→frame-broker→viewer-geometry各层已有一帧in-flight加一个latest的完整帧替换/ACK队列。先补贯穿慢消费者证据，无现成重写理由。
- SpaceViewer只处理当前human canvas键盘，CopySelectionButton仅用户点击触发且返回后重验原Page；可靠中文文本框已存在。

## 候选缺口与实验

1. file-service grant到期仅在读取/摘要前检查；在read barrier推进时钟越过TTL，核验末尾是否仍返回可派发路径。
2. 已完成下载捕获并标completed后，源文件rm/目录sync失败可能改成failed。用临时目录故障确认；提交事实与可重试源清理需要分别表达。
3. text/composing未随lease/hidden/control变化重置，暂停再接管可能残留草稿或组合态。DOM覆盖撤权与旧异步完成不能影响新lease草稿。
4. canvas暂无composition输入通路，native gate明确拒绝Input.imeSetComposition。原位IME为真实能力缺口，不能以现有中文文本框冒充。需贯通组合/取消/光标选区/撤权，并保留可靠文本框；平台实际效果仍用户验收。

预计原票写集足够：file-service/core files与测试、Workspace/composition及调用方、SpaceViewer/DOM/i18n；原位IME需按实际合同贯通contracts/protocol/driver/Worker/native gate和测试。背压以生产Worker→adapter→broker→presenter持续慢消费者负例验证，正确实现复用。T06闭合前不开始这些代码改动。
