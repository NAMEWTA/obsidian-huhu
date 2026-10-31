# 收尾计划与归档回执

范围：archive-batch 中固定对象 `2026-10-29-home-cookie-restore-deadline`，整批仅包含授权列出的五个 change。
执行 owner：codex:/root；历史 owner 与未登记项见 archive-approval.md。
原 Outcome：active（保持原字节，不补造 completed/cancelled）。
授权：用户本轮明确要求直接归档，遗留问题由其另开 change 统一处理；原话与摘要见下方 Approval。

## 四类资产与设计

| 资产 | 动作与依据 | 验证/恢复 |
|---|---|---|
| change | 整体移动到 changes/archive/2026-10-29-home-cookie-restore-deadline；原工件保留 | 完整性清单验证所有文件、权限及链接；同文件系统无覆盖移动 |
| ADR | 提升到 adr/2026-10-31-home-cookie-restore-deadline.md；保留原理由、来源与实现限定 | 新文件无覆盖创建，源字节摘要可回读；无既有 ADR 被替代 |
| context | 无独立术语候选；时限规则已由 ADR 承接 | 索引与来源逐项回读；无旧定义被覆盖 |
| 当前 docs | 更新现役文档中指向本批对象的路径，并在 docs/architecture.md 增加知识导航 | 编辑前文件已保留到本批首对象 archive-docs-before.json；仅引用变更 |
| DESIGN | 不发布新 revision；既有 DESIGN-0001 继续 approved-intent | 本批页面特有规则、未完成候选留在来源；没有新增具备通用性与逐规则生产验收的候选，不把代码完成等同 implemented |

## A0–A5 检查与明确例外

归档前已固定 HEAD 505d51b195d901a3305a79b216128c98b712b29b，工作区初始干净。知识 store 未发现 pending/lock；未创建或接管任何实现 writer。历史 writer 停止证据、旧执行状态和外部 Issue/PR 结果不因本次归档而被认证。本轮未发现 delivery.md/publish.md 独立账本；原始 Issue/PR 引用保留，未请求远程动作。

`archive-ready` 实际退出 126，完整输出保存在 [archive-preflight.json](archive-preflight.json)。用户明确指示优先于 Skill 中的完成前置门；本次仅执行其要求的材料封存与知识提升。缺失验收、结构缺口、摘要/工作区漂移、未结束目标以及来源 Issue 均留作后继 change 的输入，不新增虚假的 passed、取消记录或 owner。

归档层级改变的外部相对引用：0 处；归档前既有缺件引用：0 处。历史正文不改写，实际回读路径见 archive-reference-map.json；本次不宣称历史全量链接检查通过。

## 遗留与后继

由用户另建统一修复 change，引用原 spec、Ticket/Evidence、LOG、诊断和本次 archive-preflight.json；不在本轮创建新 change 或修改产品代码。工作台实机/Provider/五平台验收、Bot真实模型/宿主验收、统一整合未完票据与四平台验收、高亮未闭合访谈/规格和首页形式完成证据均按原文保留。

恢复：知识文件为本次新增，可由其源摘要重建；原 change 整体保留。移动一旦成功只从目标恢复检查，不覆盖目标、不重复移动或声称整体事务回滚。

<a id="archive-2026-10-29-home-cookie-restore-deadline"></a>
## 对象移动结果

Change: 2026-10-29-home-cookie-restore-deadline
Owner: not-recorded-in-source
Operation: 2026-10-31-user-directed-five-change-archive
Approval: change:archive-approval.md
Approval-SHA256: f3956b415fb630a4b94470d73b54dc1792cfaa3d1b7390b47c852de2b30b6fb3
Source: changes/2026-10-29-home-cookie-restore-deadline
Target: changes/archive/2026-10-29-home-cookie-restore-deadline
Result: moved
Integrity: change:archive-integrity.json
Integrity-SHA256: f1a3122047cb42c0d60f10e78210793e9e577b0da5dd1aa7b29cd6b2cb3f9b96
Time: 2026-10-31T02:39:48.631161+00:00

## A6–A8 实际结果

同文件系统 Linux renameat2(RENAME_NOREPLACE) 无覆盖整体移动完成；源不存在，唯一目标存在，完整性清单所有文件、目录权限、字节与链接逐项匹配。

标准 archived 退出 126；archived --sealed 退出 126。原完成/owner 门未通过，Result 保持 moved，不宣称协议 verified/sealed。用户要求的目录归档与知识提升已执行；协议例外按本轮批准保留。

```text
Summary: 1 error(s), 0 warning(s)
ERROR: closure-evidence-missing: /home/wta/projects/obsidian-huhu/.agents/speculo/.speculo/specdev/changes/archive/2026-10-29-home-cookie-restore-deadline/README.md: active change cannot be in the sealed archive

--sealed:
Summary: 1 error(s), 0 warning(s)
ERROR: closure-evidence-missing: /home/wta/projects/obsidian-huhu/.agents/speculo/.speculo/specdev/changes/archive/2026-10-29-home-cookie-restore-deadline/README.md: active change cannot be in the sealed archive

```

最终回读：整批 3,466 个清单条目再次核验一致；3,057 个原受跟踪文件与 HEAD 原始 Git blob 逐项一致；永久 ADR/context 本地 Markdown 引用全部可达；三份现役文档 git diff --check 通过。产品代码与构建产物无修改，纯文档及目录操作未运行插件构建/测试。标准门失败与历史链接映射保持原记录，不宣称协议 sealed。
