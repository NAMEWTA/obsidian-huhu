---
schema_version: 2
session: "20261031T062046Z"
task: "014-default-paths-implement"
kind: implementation
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-16
---

## Goal
Astra low实现T16已批准完整默认路径/内置显示合同，Lead负责验收。先完成013独立复审，再进行本票生产。

## Inputs
Map revision11、当前Ticket16与Evidence T16-D01完整名称表、012预检、dev/ui Skill及testing/settings/i18n/storage参考、spec AC191/192/902、ADR006/008、execution-boundaries。名称表已由Lead先置记录，无需再询问用户。

## Workspace and Scope
唯一current dev /home/wta/projects/obsidian-huhu，base86c500556db1d64865c4cc7f1aff1dd83de071fa。当前Ticket精确写集；档案common.tsx作为统一显示helper接缝可用，禁止复制多套翻译判断。Home词典/shared生成物、Evidence、Ticket、ledger归Lead。无Git/递归代理/Browser/真实Obsidian。012及013REPORT只读，当前结果仅写本REPORT。

## Acceptance
名称表与实际路径单表一致；保留原用户文件与自定义标题语义，不碰旧中文树。隐藏automations/core/documents与backup transforms显式原未命名fallback，避免共享huhuName改变隐藏输出；不改变操作.md。CSV导出使用无覆盖create与唯一目标、考虑create竞态。新档案内置定义用稳定机器id/翻译元数据，revision不随语言变化；旧无元数据label原样，用户编辑label清键，字段/类型/选项/关系显示一致且路径不依赖译文。标签键严格校验有效范围，不能把任意用户字符串当i18n键。仅显示/编辑接缝，不改布局。

真实临时目录vault覆盖en/zh新库、切语言/重建服务、用户中文/空格/自定义根、同名文件与目录、旧中文目录不读写且字节不变。新增行为测试和相关路径/档案/Home/Nav/版本/导出测试、i18n/architecture/测试类型；docs必需门由T03修，实际失败如实记录。全量/共享构建由Lead协调，当前main超3234B不可抬预算。新增路径缺口先消息，其他已批准接缝直接实施。

## Return
coordination/report-template.md，真实源码路径/命令退出码/红绿/残余/输入摘要，停写后独立高风险双轴审查。先说明实际metadata方案与兼容边界再写，无需额外许可。
