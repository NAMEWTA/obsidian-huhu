# T21 显式迁移只读预查

2026-10-27，native:/root/audit_archives（gpt-6.1-sol/high）回执。T20 初审期间只读，未改源码或工件、未运行真实库迁移；T21 尚未开始，以下需在 T20 修复闭合后按实际源码确认。依据为本 change Issue3 的旧档案迁移/回退协议、方向规则及 T21/AC023024033。

## 当前可复用接缝

v1 persist/markdown 已拒绝 v2 外层标识，legacy-adapter 保留基本字段旧 codec。manual-<index> 是解析位置，不是永久关系身份；须固定原字节/hash/分区/行位置，不能拿已补齐链接的索引投影冒充原来源。application.save、旧 forms/deleteRow 仍可改 inline，命令门和真实 UI 迁移入口必须同时接入，基本字段保持可写。

T20 relation-store 有稳定 ID/operationId/requestHash、读回与原生门，但没有 migration provenance/staged 权威解析，普通 createRelation 会立即进入查询，不能直接用于迁移。vault-files 的全叶捕获及 process/create 最终同步检查可复用；T20 扫描竞态待独立审查修复，不当作已完成前提。catalog 已排除迁移记录/迁移恢复目录，实际可见清单、备份、完成/回退回执仍需实现。

## 最小恢复协议候选

1. 只读预检原字节，列缺/重 ID、歧义链接、坏表、手工行、提醒、定义依赖及写入范围；异常 owner 拒迁，合法项可分批。
2. 用户确认后保存可见 manifest/备份，固定 migrationId/operationId、源 raw/hash、owner、定义修订、端点及每行 relationId/路径；重试复用计划。
3. 内部计划绑定端口写 staged 关系并读回，staged 与用户 draft 分开，不参与关系查询/约束；只迁移原存储行，不迁移反向投影。
4. 重验关系、定义、端点和原生叶，在 owner.process 内 CAS 源 hash，改为 v2 标识并保存 migrationId/预期关系集合；保留 ID/路径/正文/附件/提醒。
5. owner 已提交是事实，回执失败后核验恢复，不另写一组关系；缺件诊断为不完整，不作零条。
6. 回退比较 owner/迁移关系/依赖集合当前 hash；新改动保留并拒覆盖，显式回退回执改变权威。单独把 owner 恢复 v1 不等于完整回退。

## 实施时必须核对的兼容点

- person/company 目前为虚拟 v1 定义，普通 catalog 发布禁止这些 ID。迁移预设/别名需显式绑定定义，不能破坏已有关系端点约束与基本字段路由。
- v1 createdAt 可 null，当前 v2 parser 要求真实时间；不可用迁移时刻伪造未知创建时间。
- reminders-source 与 saveReminder 仍依赖 legacy index；迁移预设须保留已有提醒的 list/save/open，避免投影消失，广泛动态引用仍由 T24 负责。
- leader 映射 owner→对方，report 映射对方→owner；自定义称谓保留原文/provenance，不猜反向。空 keyRole 等旧值明确映射，不静默套预设默认值。

原 archives/** 与 golden 写集预计足够：迁移 model/store/codec/UI、catalog/legacy/relation 适配、application/API/services、旧 forms/detail/presentation、settings/workspace、提醒适配及 i18n/测试。暂不需要新增宿主能力；T22 的全面同步乱序/分叉/冲突处置不整体搬入 T21。此记录不代替正式实施前影响分析或验收。
