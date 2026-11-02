# 档案恢复 owner 只读接缝预查

2026-10-27，原生 `/root/implement_t01`（gpt-6.1-sol/high）回执，由 Lead 保存。T27 尚未开始，T20 仍在实施，后续以稳定源码重新核验。本记录不是接口设计批准、生产实现或验收证据，未运行真实宿主。

## 当前基础与缺口

- versioning `RestoreService` 已有单文件 prepare→checkpoint→revalidate→apply→verify→receipt→undo，保留 HEAD/index、持久 sync hold、检查点失败拒写。
- `DocumentChangeParticipant` 当前只接 comments，在 apply 时保护批注，不能单独承担档案初次 prepare 预检。
- archives `vault-files.ts` 已有 captureEditors/提交点复查/原生草稿拒写，共享 coordinator 有 captureClean/assertClean。versioning 允许恢复未保存普通笔记；档案路径需要另加严格 clean 门，不能改变普通笔记既有行为。
- 当前 archives/api.ts 仅 catalog/query/commands，versioning/module.ts 尚未装配档案恢复 owner。仓库路径限制不等于 AC026 预检完成。

## 后续需覆盖的真实接缝

通过 archives 公开 API 提供 owner 校验，输入含操作、最终目标路径、before/after、undo 来源；覆盖 whole/hunk/copy/undo。prepare 取得固定证明，apply 在 archives 串行范围内及最终提交点复查模块/root、身份、定义、关系、迁移状态、所有受影响原生叶。停用、替换或依赖漂移拒写。owner 计划身份、支持范围和实际回执应进入 receipt，undo 重新校验。

单文件支持不能冒充跨文件恢复：迁移 owner 回退须同时处理实体、迁移关系、清单和可携带回执并比较当前 hash；无法安全支持的操作明确拒绝，不把 owner 单独恢复成 v1。最终支持范围仍按 Spec/原文验收，不能以此预查删减合同。owner 缺席时仍应识别自定义 root、定义/关系/迁移及内容带档案标识的副本并拒绝受管覆盖，不能当普通 Markdown 写。

## 等待 T20–22 提供的稳定事实

- T20：关系 ID、定义修订、端点/context、基数/重复/时间约束、候选正文合法性与依赖证明；复用领域校验，不在服务层复制另一套。
- T21：migrationId、源 hash、稳定映射、预期关系集合、owner CAS、完成/回退回执及中断步骤的可读权威状态。
- T22：staged/active、缺件不完整、完成后 owner 删除、v1 回流冲突、tombstone、定义双头的统一判定；缓存或隐藏日志不是唯一依据。

## 进入实施前的写集复核

versioning 当前写集覆盖主要服务与历史 UI。archives/module.ts、core/catalog.ts、core/relation-store.ts 和未来迁移实现尚不在 T27 写集；若前序未公开足够领域 owner 方法，Lead 需补实际最小路径，不能为迁就写集复制规则。最终提交 guard 若需扩共享 DocumentMutationPort，也须先补共享契约及测试路径。当前仅记录缺口，未提前扩大活动票范围。

home 外部项目正文仍属 home，不因恢复任务顺带改写；档案恢复核对引用与缺件诊断。以上均待前置票冻结后确认。
