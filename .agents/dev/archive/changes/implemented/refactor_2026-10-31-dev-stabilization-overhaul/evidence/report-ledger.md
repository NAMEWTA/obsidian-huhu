# #41 统一账本（替代已删除的 docs/e2e/dev-overhaul/ledger.md）

Lead: host:claude-code/root。生成：2026-11-04，HEAD a1e0031 之上的 T-38 验收快照。`docs/e2e` 按 LOG-025 不重建；票级细节见各 `evidence/T-xx.md`（纯文本路径）。

AC-311 于 2026-11-04 经用户授权的 Windows CI 例外运行后关闭。

状态取值：passed / passed（宿主部分待用户真机验收）/ CI 待统一处理（用户 2026-11-04 指示 CI/CD 之后统一解决）/ withdrawn（OOS-008、ADR-011）/ cancelled（负责票取消，不作通过结论）。

## 统计（46 条 AC）

| 状态 | 数量 | AC |
|---|---|---|
| passed | 27 | 001, 002, 191, 192, 201, 221, 231, 241, 262, 271, 311, 312, 321, 331, 332, 352, 353, 401, 402, 403, 404, 405, 407, 408, 901, 902, 903 |
| passed（宿主部分待用户真机验收） | 5 | 163, 202, 211, 251, 351 |
| withdrawn | 7 | 161, 162, 281, 282, 291, 293, 406 |
| cancelled | 7 | 261, 283, 284, 292, 301, 341, 342 |

## 逐条

| AC | 负责票 | 状态 | 证据 | 命令摘要 |
|---|---|---|---|---|
| AC-001 | T-01、T-38 | passed | evidence/T-01.md；本文件 | 账本由本文件承接 |
| AC-002 | T-01 | passed | evidence/T-01.md | 基线测试与构建退出码已记录 |
| AC-161、AC-162 | T-14 | withdrawn | evidence/T-14.md、evidence/T-42.md | 网易云音乐随 T-42 删除（D-018） |
| AC-163 | T-20 | passed（实机预算待用户） | evidence/T-20.md | 本地 small/large 采样 0；CI run 41629791194 三平台 success |
| AC-191、AC-192 | T-16 | passed | evidence/T-16.md；T-34/T-38 修正遗留中文夹具 | i18n、vault-layout、docs 测试 0 |
| AC-201、AC-202 | T-25 | passed（202 宿主待用户） | evidence/T-25.md | UI runner 48 例；agent DOM 293 例 |
| AC-211 | T-26、T-35 | passed（宿主 tooltip 待用户） | evidence/T-26.md、evidence/T-35.md | aria-labelledby DOM 断言；UI runner 48 例 |
| AC-221 | T-15、T-26 | passed | evidence/T-15.md、evidence/T-26.md | test:weather-mapping、test:dashboard-isolation 0 |
| AC-231、AC-241 | T-17、T-31 | passed | evidence/T-17.md、evidence/T-31.md | automations/notifications 156 例；T-31 UI runner 48 例（Lead 复跑） |
| AC-251 | T-18 | passed（宿主分屏待用户） | evidence/T-18.md | workspace 模型测试 |
| AC-261 | T-19 | cancelled | evidence/T-19.md | 用户结束未复现问题跟进，不宣称通过 |
| AC-262 | T-28 | passed | evidence/T-28.md | UI runner 48 例；test:task 0 |
| AC-271 | T-03 | passed | evidence/T-03.md | check:notices、test:docs、test:license-texts 0 |
| AC-281、AC-282、AC-291 | T-04、T-06、T-09 | withdrawn | 各票 evidence | huhubot 删除（OOS-008） |
| AC-283、AC-284、AC-292、AC-301、AC-341、AC-342 | T-05、T-07、T-08、T-10 | cancelled | 各票 evidence | 负责票随 huhubot 删除取消 |
| AC-293 | T-11 | withdrawn | evidence/T-11.md | ADR-011 |
| AC-311 | T-12、T-13 | passed | evidence/T-12.md、evidence/T-13.md（AC-311 关闭） | Linux 20 轮 96/96 有序；Windows run 41752095795 连续两次 20/20（每轮 96/96、无顺序违例） |
| AC-312 | T-13 | passed | evidence/T-13.md | hooks 10 文件 85 例 |
| AC-321 | T-22 | passed | evidence/T-22.md | 决定表；stop-native 本机 64 次未复现，记为未复现非已修复 |
| AC-331 | T-02、T-37 | passed | evidence/T-37.md | check:bundle within limits，阈值未改 |
| AC-332 | T-21 | passed | evidence/T-21.md | 压缩等价测试；hook 真实进程与 20 轮测量通过 |
| AC-351 | T-23–T-35（T-33 取消） | passed（宿主全状态待用户） | 各 UI 票 evidence | 各票独立 Chrome 标准矩阵 48 例 |
| AC-352 | T-23、T-24 | passed | evidence/T-23.md、evidence/T-24.md | 对比度/命中区/焦点断言 |
| AC-353 | T-36 | passed | evidence/T-36.md | --db-* 为 0；lint:css、check:styles 0 |
| AC-401 | T-39 | passed | evidence/T-39.md | inventory 未分类 0 |
| AC-402、AC-403、AC-404 | T-40、T-42、T-43、T-46 | passed | evidence/T-46.md | 单元测试 + 隔离临时库真实 Obsidian（Linux/Xvfb）8 项断言 |
| AC-405 | T-40、T-41、T-44 | passed | evidence/T-44.md、evidence/T-46.md | pnpm build 不含 Browser；workflow 无 Go；残留检索 0 |
| AC-406 | — | withdrawn | — | ADR-011 |
| AC-407 | T-45 | passed | evidence/T-45.md | test:docs 0；永久 ADR/context 修订清单已交 A |
| AC-408 | T-46 | passed | evidence/T-46.md | 全量检查 0；新库截图在 temp/dev-overhaul/T-46/acceptance/（本地） |
| AC-901、AC-902、AC-903 | T-38 | passed | evidence/T-38.md | 见 T-38 |

## 未验收项（不填成通过）

- release 工作流：运行即发版，发版未授权，对本 change not-applicable（见 evidence/T-38.md「release 工作流与 CI 前置检查」）；其前置 lint/terminal 检查在 dev 推送上运行。
- 待用户真机验收：AC-163 实际启动预算、AC-202/211/251/351 宿主内表现；Windows/macOS 实机。
