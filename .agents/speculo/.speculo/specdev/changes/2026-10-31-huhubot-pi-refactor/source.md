---
schema_version: 1
artifact: source
change: 2026-10-31-huhubot-pi-refactor
source_type: github-issue
canonical_locator: https://github.com/NAMEWTA/obsidian-huhu/issues/39
captured_at: '2026-10-31'
content_sha256: 056f0a002c4b155a59344de0abbedc52014eea84b859a38c2bd2bca317da7fae
source_body: sources/issue-39-body.md
comments_count: 0
close_capability: unsupported
remote_state: open
---

# 来源冻结：Issue #39

| 元数据 | 捕获值 |
|---|---|
| 标题 | [Epic / 虎虎 BOT 全量重构] 以 Pi SDK 替换 Go/Eino/HAP：独立模块、原生 JSONL、个人 Agent 协作与全新 UI |
| 作者 / 状态 / 标签 | NAMEWTA / open / 无 |
| created_at / updated_at | 2026-10-31T10:38:34Z / 2026-10-31T10:38:34Z |
| 基线 | `974105b47e03c108df0f5e0c3fc9606fe4b79aee`（dev，读取时 head） |
| 正文 | 完整 0–21 节及原始参考链接：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/sources/issue-39-body.md</Path> |
| 全部可见评论 | 捕获时 0 条；交付末尾再读取，结果见 evidence/source-check.json |
| 持久化格式 | 从 GitHub 返回正文转录，UTF-8、LF，末尾换行；hash 指本地冻结文件，不冒充 GitHub 原始 JSON 的 byte hash |
| SHA-256 | `056f0a002c4b155a59344de0abbedc52014eea84b859a38c2bd2bca317da7fae` |
| Redactions | 无秘密/令牌/Cookie；不保存认证信息。正文中的示意路径保留。 |

## 用户最新授权（优先于 Issue 中未来实施授权）

本轮只形成完整文档及具体原型，再提交一个 PR；不实施生产功能、不修改业务代码。UI 复刻另一 change 的 UI-001。五个指定 Work 按依赖顺序使用。用户允许文档后提出真实问题；Issue 已确定的技术栈、整体替换、不保留兼容、独立模块、Pi 唯一 harness 不重复询问。

完整原请求另存 sources/user-request.md：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/sources/user-request.md</Path>。后续来源发生漂移时新建 sources/SRC-002.md，不覆盖本快照。本 source 不是“已实现”的证明。
