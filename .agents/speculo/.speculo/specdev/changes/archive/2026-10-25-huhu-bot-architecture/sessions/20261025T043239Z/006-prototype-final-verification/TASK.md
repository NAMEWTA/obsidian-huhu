---
schema_version: 2
session: "20261025T043239Z"
task: "006-prototype-final-verification"
kind: verification
change: 2026-10-25-huhu-bot-architecture
---

# 任务简报

## Goal
Lead 已修复 repair-1 发现的导航搜索框和两个新建按钮 coarse pointer 尺寸；完成最终独立技术复测。用户 LOG-050 要先完成代码、相关真实模型验收留给用户；不要请求新的界面选择或把技术复测冒充新摘要的人类批准。

## Inputs
继续既有 P/UI 验证；读前任务003 REPORT、当前源码。修复只有 coarse media 增加 .list-heading button min-width44px 与 .search-box input min-height44px；canonical源码块已同步、materialize --check通过。旧批准/绑定仍不变。新digest自行算。

## Workspace and Scope
同一workspace和base，源码只读。仅写 prototypes/UI-001/evidence/repair-2/ 和本任务REPORT，不覆盖旧运行。适配003脚本输出路径，原检查范围与断言不降低。可复用前轮明确未失效的观察但不可伪造成新运行；希望全套复跑以冻结新摘要。所有状态/Evidence/批准归Lead，不再次派遣。

## Acceptance
重点 search/新建Bot/新建群44×44，发送按钮、未保存提醒/焦点回归、无溢出；真实浏览器/zoom/键盘，所有true有实际依据。报告是否全部技术检查pass，明确HTML人类确认仍仅原摘要，不能fake Ready。运行后关闭所有进程/writer。

## Return
本目录REPORT.md，Session/Task/Status、源码摘要、实际结果/命令/截图位置与未验证项。collaboration报告Lead，停止写入。
