# UI-001 / change DESIGN revision 2 范围修订批准

记录时间：2026-10-31T05:58:57.301Z
来源：本会话用户明确接受上一轮十项审计建议：“非常棒，全部按你的建议来。”同一请求要求：“关于浏览器这部分，我需要你完全暂停相关的开发和修复。因为我之后会对浏览器进行完整的重构……避免触碰到浏览器相关的内容。”

本次只落实上述明确指令：Browser 及其 Agent/Home/宿主/native/构建集成冻结；统一停止合同集成批次、token 迁移顺序、UI 文件/词典/来源/产物责任、独立组件验证、EOF 诊断、fixture 性能测量与现行状态。视觉方向、token 数值、六页交互、候选、HTML/CSS/JS 均未改变，不声称用户逐字审核过生成的哈希。生产实现和 Git/远程动作未获授权。

- change：2026-10-31-dev-stabilization-overhaul
- change DESIGN revision：2
- change designDigest：566034f112192e7d062540a1ce9051674b061d0475e61bf2a794825aad46f77b
- 基线：DESIGN-0002
- baseline designDigest：ef5e5080f6c1a8f967397af72fca0050820b9ad4d9a4f57451be3a63ab55b2b1
- prototype digest：879ff0e8a5cfb47851e78f3a175003310a79a779058eed401782eec306f3e2c2
- HTML SHA-256：aa3d7e4b0e33aff4363dc242840ea1943c7e7bd01b3f565d0e6b98fe62a1eb66
- 原 revision 1 文档：evidence/change-design-revision-1.md
- 原 revision 1 文档 SHA-256：92c1c5e8598ff67c3f62ca614625a308fcbcab931ef6bf763e027be7d5347176
- 原批准：evidence/approval.md（原字节保留）

原浏览器截图与检查仍绑定相同 prototype digest，因此复用于未变化的原型；它们不证明生产 UI 或 Browser 功能已验收。本次未重跑原型交互，也没有更新证据日期来冒充新运行。当前范围合同在 DESIGN.md，执行边界在 change 的 execution-boundaries.md。

DESIGN-0002 的标准 promotion 预检曾因 active change 拒绝，随后按用户已批准的实施前发布指令人工发布；本次接受审计建议同时确认按例外表述并保留既有记录。此次没有再次写入永久 DESIGN、revision 或 INDEX，没有改变历史 publication 回执。
