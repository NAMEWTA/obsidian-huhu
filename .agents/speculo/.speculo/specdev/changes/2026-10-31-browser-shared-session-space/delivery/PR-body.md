# PR 草案：docs(browser): 规划共享 Session Space 重构与 UI-001 原型（#38）

Refs #38

> 文档与原型 PR，不实现产品、不合并旧链切换、不关闭 Epic。当前文件只是待提交正文；尚无远程 PR URL。创建后必须补实际 branch/head/files 回读证据。

## 基线与范围

- 目标分支 dev；读取及交付前复核均为 `974105b47e03c108df0f5e0c3fc9606fe4b79aee`。
- 所有改动只新增 `.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/`，不改 src/native/package.json、永久 design/ADR/context 或另一个 change。
- 使用 T-triage → G → 补充 Prototype → S draft → T future tickets → P plan；未进入实施。
- Issue 全文冻结、0 评论；完整 B01–B40 → AC-001–040 → 13 张票，F01–F12 单独作为宿主门禁。

## 内容

来源与分诊、CONTEXT/ADR/LOG/design-tree、Spec、设计规范、现状影响、GitHub 优先复用、目标架构/公共契约、删除清单/数据保护、逐项验收、13 个 future draft Ticket、Map 和 Goal v8。

UI-001 继承 stabilization-overhaul 的 DESIGN-0002：圆角 6/8/12/14，36px 控件，52/280/44 workbench 基线。A/B/C 只是信息布局差异，推荐 A。原型包含同页草稿交接、个人 Space 拒绝/转换、权限、下载、材料、未知结果、清理失败、宿主不可用和 owner 窗口路径；所有数据虚构、无网络/磁盘/Electron。

## 复用与取舍

优先保留 HUHU 现有服务边界/窄宿主桥/材料贡献点。研究 Surfing 固定 commit 的 isolated-world、真实输入与本地 HTTP 防护模式；添加 HUHU 自身最终 fence/ref/授权边界，拒绝整仓搬入、全局 bearer、核心 Web Viewer 私有对象及任意 evaluate。Min 仅作交互对照，不引入独立运行时。

## 本轮真实验证

33 项离线浏览器交互/布局检查通过，0 脚本或 console error、0 外部网络请求；Node --check 通过；本地文档检查、源块物化/文件哈希、DAG/合同覆盖见 validation。截图在 prototypes/UI-001/evidence/screenshots。

## 明确未完成

官方 SpecDev/schema/stage/设计摘要工具未运行；独立设计审查未运行；用户 D-013 未批准。Spec/Tickets/Goal 保持 draft/ready=false，Skill SHA-256 与精确资源 claims 等 DoR 缺口有明文说明。不得当作已进入 Ready 的实施队列。

F01–F12、B01–B40、真实 Obsidian 三平台/安装器/IME/Portal/性能、项目 lint/build/测试均未运行。这些不能用离线原型代替。本轮未改生产代码，无新依赖和实际数据迁移/清理。

## 评审重点

推荐 A 是否符合用户指定另一 change 的整体 UI；Issue 的同一 guest、个人限制、撤权迟到结果、unknown、清理恢复与旧链物理删除是否完整；T-01 补精确消费者/写集后再开启实施。一个文档 PR，不根据 13 张 future draft 票拆成 13 个 PR。
