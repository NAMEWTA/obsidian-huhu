---
schema_version: 3
artifact: triage
change: 2026-10-31-browser-shared-session-space
mode: intake
disposition: needs-triage
verification: pending
remote_actions: []
source: <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/source.md</Path>
classification: mixed
risk: high
route: specdev/grill-with-docs
ready_for_implementation: false
updated_at: '2026-10-31'
---

# Triage：浏览器完整替换的规划摄入

## 当前判定

影响：浏览器架构、会话数据、网页权限、Agent 接管、CLI/Bot 消费者、跨平台运行与发行链；不是局部 UI bug。紧急度：normal（未提供生产事故证据）。本轮请求是 documentation + design；后续产品为 refactor + feature + investigation。

已读源码确认旧 API 含 runtime 安装、identity 与帧输入，desktop composition 仍装配 Native factory；不是“已经有新 Electron 实现”的重复需求。当前 active change 只有总收口，职责相邻但不等同。已浏览 archive 文件目录，未完成全部归档正文和永久 ADR 逐条重复核验；不宣称全历史无重复，T-01 要补这一事实检索。用户明确要求新浏览器工作与总收口并行保持设计一致，不覆盖其所有权。

## 未知项

- 可发现事实：宿主版本/桥/表面/输入/存储与清理能力；完整消费者调用图、归档冲突和三平台结果。生产者为 T-01，不能用 Electron 网页文档代替。
- 用户决定：新浏览器具体原型的集中确认；并非重问 Issue 已定政策。
- 低影响细节：测试文件命名、局部函数拆分、容器布局微调；受既有合同约束由实现者决定。

## 路由

按 intake → G → 补充 Prototype → S draft → T future drafts → P plan。G/P 缺确认不伪装共识；独立可形成的完整规划继续交付。实现入口保持关闭。

## 实施简报

现状与目标、风险和可观察结果分别由 <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/baseline-and-impact.md</Path>、<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/spec.md</Path>、<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/acceptance-matrix.md</Path> 拥有。当前核验仅 GitHub 固定源码读取、文档与离线 UI；未运行宿主、构建、产品测试。T-01 产出 probe evidence 后才能确定表面、精确写集及支持范围；后续 ticket DoR 逐票重审。

无兼容意味着删除旧源码/协议，不意味着删除磁盘上的旧用户内容。#37 仍负责全局设计/包体，#36 仍负责 Bot 引擎/HAP；本 change 的跨模块写范围必须由实际消费者引用和契约评审收窄。

## 打标回执

未请求修改 Issue 标签、关闭或合并；remote_actions 为空。用户请求 PR，但工具无写入接口，未执行远程写动作，详见 <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/delivery/remote-receipt.json</Path>。
