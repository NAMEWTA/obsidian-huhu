---
schema_version: 2
session: "20261105T094057Z"
task: "083-repair-t12-review"
kind: implementation
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-12"
---
## Goal
修081已复现四项T12缺陷，优先P1自定义颜色误重置整个设置。原076完整候选保留，不重启规划/推测扩展。
## Inputs
AGENTS/dev/ui/SpecDev I与适用测试/设计规则；Map28/Goal/Spec/T12、批准DESIGN3/UI002摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。用户medium实现/high审查授权持续。081完整REPORT已释放74输入，四项事实与真实private反例/tmp/huhu-t12-high-review；076candidate60及Root14 unchanged，原manifest ec83c9921b66eee40a538cfb2bedf5b3f5a82c225a099cdc71e91f70f44f21bd。RootIconic oracle2expected已补、settings-iconic11通过；i18n33/5601通过。Root14在/tmp/huhu-t12-shared-final，theme custom API已可用、不要再要求deriveCustomTokens兼容。
## Workspace and Scope
只写T12原writable app/settings/**、icons/ui/styles/**、workbench设置入口与T12 fixture/**，REPORT及/tmp/huhu-t12-review-repair。Root独占词典/theme/shared控件/构建脚本/资产/Evidence/正式状态；新键先具体提案。先保存实际dirty起点/模式，非GitHEAD。无委派/提交/index/worktree/node_modules/用户vault。T05/T07/T09/T16候选不动。
## Acceptance
S01/P1：CustomColors.write recipe嵌套Object.assign的返回值不能当整个ThemeSettings replacement。Reset和Copy-from均只改目标mode的custom颜色，保留另一mode与preset/editor/fonts/所有未改字段；真实SettingsStore持久化验证，不能仅mockhandle。保留原source-color读取；rgba忽略alpha目前只是review未验证观察，可加真实computed SuliWorld颜色copy正常控制，不捏造第五finding或扩大颜色引擎。
S02/P2：真实Iconic领域合法local datetime带秒2026-11-06T12:34:56不可被新HH:mm-only validator禁用。DateField日期+纯文本时间组合保留已有秒/精度/未编辑值、无IANA/epoch转换；原真实compareDatetimes与保存秒/minute正控制、无效raw阻断。
S03/P2：默认editor=follow时searchSettings给Background focusId却实际不存在。索引/结果/跳转要对应实际可达目标，保留conditional分组与能力/真实字段搜索，不能搜索时偷偷持久化改editor模式、添加假目标或空locator；新增当前与custom状态、语言/索引失效、真实SettingsPage精确定位回归。
S04/P2：General真实publish-before-persist失败，memory已false/disk旧时需明确Retry/未保存态，重试保存最新期望值；不能重放toggle recipe又翻回true。用真实Store IO失败→retry→成功、pending中用户改动/关闭反例，保留当前store协议不发明回滚。
按真实反例TDD，既有81 settings/icons与theme41风险不删，scoped types/lint适用通过，fixture仍真实组件（仅--check，Root最终66）。修复足够即冻结完整60+必要新增/删除/模式hash及起点，给Root不可变REPORT，停止写入待high。
## Return
不可覆盖REPORT含聚焦交接/产物与验证/问题与下一步、四finding逐项实际证据/红绿/命令退出/限制、精确源与候选。原始代码日志JSONPNG/hash只/tmp，Root写正式Evidence/state/产物。validate-dispatch return后停止。
