---
schema_version: 2
session: "20261105T094057Z"
task: "159-repair-capture-identity"
kind: implement
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-14"
---
## Goal
sol medium修最终截图留存身份缺口，在已需新一轮源输入验收时让每case/状态有唯一可追溯文件名，不改页面/断言。
## Inputs
AGENTS/dev/ui/testing、Map57/Goal/T14，152已完成：原完整matrix858 parent passed（/tmp/huhu-t14-root-matrix-final），但T09/T12专用capture使用sample.id未定义→undefined覆盖，T11专用状态图缺theme分量跨theme覆盖。所有66唯一主PNG和原assert仍有效，Root不因该限制单独重跑858；因4项已确认产品/视觉修复本来需新输入轮，顺带最小修工具留存。145工具review原范围保留。
## Workspace and Scope
repo全只读，仅本REPORT+/tmp/huhu-capture-identity；候选限中央run.mjs、integration/index.mjs、integration/integration.test.mjs（必要run.test.mjs先列），及Root专管T11/index.mjs。T09/T12 driver只读，给现有sample.id生成唯一值即可，无需逐票重写。Root单写应用，不动产品/预算/父66矩阵/测试断言/状态/Evidence/index/旧报告，不build/正式66/858/native/委派。
## Acceptance
在fixture.configure/verify及capture之前为每runtime sample分配稳定唯一id，直接复用原主PNG文件名的已有全部维度表达（width/lang/theme/accent/source/host/density/uiSize/mobile/zoom），主PNG命名保持原样，不造重复matrix/新命名框架。Parent非check校验sample.id非空、唯一且对应主PNG basename（已有planned66不必改，check仍0cases/preflight）；有意义Node正负测ID缺失/重复/PNG不一致，不只源码字符串匹配。T11 exercise专用capture给已有theme/width/state/name正确身份分量防覆写，保原真实ThemeRuntime/断言/状态与Root所有权，不删除任何状态。T09/T12原capture因新sample.id自然唯一，必要一组实际小型component verify/capture可由Root后做，不单独重复858。语法/定向Node测试实际0，before/afterSHA/mode/ready.patch/manifest独占冻结；对输入不变的145结论有界复用，不称旧result是新driver输入。
## Return
不可覆盖三节REPORT，真实差异/命令退出/留存正负与未验；return0停写释放，不判T14通过。
