---
schema_version: 2
session: "20261105T094057Z"
task: "077-repair-t06-recovery-native"
kind: implementation
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-06"
---
## Goal
只关闭075真实残留R01偏移恢复草稿和Root已证实的native动画采样时机，不重复实现完整档案。
## Inputs
AGENTS/workspace/catalog、dev/ui/适用测试规则、SpecDev I，Map24/Goal/Spec/T06、批准DESIGN3/UI002。用户medium实现/high审查/16票授权持续，设计摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66不变。074候选40项已冻结，/tmp/huhu-t06-repair/frozen-manifest.json SHA9a1e70c55271d567357aafc086629f25257bc39a6ccfd41f471508fac1899e12；075已释放。完整075 REPORT及/tmp/huhu-t06-shared-repair-review/offset-recovery.log和对应真实test是R01证据：RecordEditor真实保存stamp2026-11-01T01:30:05.120+，再restore真实FormSession后重新把+迁入time。局部state修复只覆盖原地编辑，恢复分解仍完整offset正则。
Rootnative320fine/非reduce在/tmp/huhu-t06-lead-repair-full/result.json首例width expected280 got275.89；私有/tmp/huhu-t06-animation-diagnostic/run.log已实证computedWidth280但rect272.56/scale.973442/animation running，await真实p.getAnimations().finished后rect280/transformnone。这是驱动时机，不放宽最终尺寸断言。390coarse/reducedMotion两Doc现已pass。
## Workspace and Scope
仅T06 writable范围内的FieldRenderer.tsx及有关offset DOM回归（已有074测试可改、需要时新增相邻测试）、T06 fixture/index.mjs；不可覆盖REPORT和/tmp/huhu-t06-final-repair。其余模块/共享/词典/资产/领域codec/schema只读。保留现有脏/staged/HEAD，不委派/提交/改index/worktree/node_modules/用户vault。Root另修075 R02 host promise。保存精确本轮起点/候选模式哈希；不能把HEAD当dirty起点。
## Acceptance
R01用真实Application+RecordEditor+commands.drafts/restore的075反例做红绿；支持不完整offset前缀+/-/小时/冒号时原部分身份，保留秒/小数/Z/外部reset与现有恢复值格式。不新增数据schema、时区/epoch转换或自写日期引擎；识别原始ISO分隔时最小修改，不把全片段parser换成兼容层。确认恢复后无效值仍阻止旧合法保存，正常控制不变。
Native fixture在读取popover/MonthField rect、命中或键盘之前按实际所属Document等待有限动画完成（Web Animations API），关闭/取消安全、无无限sleep，不禁用产品动画。保留280/312、叶子范围、实际click父iframe命中与日期/焦点断言，不能把动画问题改成宽松尺寸阈值。复用既有runner，worker只--check，不跑全66；Root后跑最终矩阵。原档案50DOM/3paging及必要offset新增回归、生产lint/types范围通过；已知全局迁移债独立记账。完成即冻结并交回，无推测扩展。
## Return
不可覆盖REPORT含聚焦交接/产物与验证/问题与下一步、实际红绿/命令退出/限制/精确新增删除/候选。过程代码日志JSONPNG仅/tmp，正式Evidence/state/资产归Root。validate-dispatch return后停止写入等待high。
