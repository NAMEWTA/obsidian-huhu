# 任务回报

Session: 20261105T094057Z
Task: 123-repair-analytics-dates
Status: completed

## 聚焦交接

已完成私有最小候选，未合入 workspace。仓库生产源码、测试、fixture、styles/assets 全程只读；唯一仓库写入是本不可变 REPORT。Root 为共享源码唯一合入者，本候选冻结供其核验。未委派、未提交、不操作浏览器或真实用户库。

实际风险为共享 AnalyticsRangeControl 的两个 Input type=date，Home Expense/Pomodoro 等统计使用同一入口。PipelineCard 的 TextField/date 已适配 DateField，本任务未改。候选仅将原两个输入替换为公开 required DateRangeField；完整合法的 from/to 原子回写原 state.custom.start/end，clear 的 null/null 不回写，因此不会变成无界筛选。非法、倒序、required 空值均由原 DateRangeField 验证与禁用 Apply，取消不提交。本次不增加验证器、范围算法、日期公共 API 或词典；原 useAnalyticsRange、analyticsRange、方向按钮与其它 Analytics export 保持原样。可访问名称复用 analytics.custom。

T-08 fixture 保留原 43 个状态和 32 项权威注册，增加第 44 个 analytics-custom。该状态渲染实际 AnalyticsRangeControl + useAnalyticsRange；native verify 在两个 owner Document 中用既有可信 CDP 点击打开 DateRangeField 弹层，再执行现有 nativeDates/嵌套按钮/页面溢出断言并截图。没有模拟范围算法，也未运行此新增 native 状态。

## 产物与验证

所有候选、镜像、补丁和过程记录在本地 /tmp/huhu-analytics-date-repair，不入 evidence。before/ 和 before.json 保存实际 dirty 开始源；status-before.txt 记录原工作区。proposed/ 保存完整 4 文件候选，workspace/ 是独立私有镜像，node_modules 只读引用原依赖，Vite cache 指向私有路径。私有生产文件与测试使用真实公共组件和 hook，没有向原仓库覆盖文件。

交付 analytics-dates.patch（git apply --check 退出 0）及 changes.json（3 修改、1 新增），每文件完整 before/after SHA256/mode；原 3 文件当前 hash/mode 与 before 无漂移，新测试仍未在仓库创建。修改文件与候选 SHA256：

- src/ui/components/huhu/analytics/Analytics.tsx：5249b3c53ed4b16698b76d955a13eeefd6bc418dd7e09c737fef3b19941fe117 → 31c2a39e7223331b2c2fa0936548be68fd729b06ac0625411afee138b385e5f3。
- scripts/ui-review/fixtures/frontend-redesign/T-08/index.tsx：7f609e753974b4c544bccfe30756b92fc3135c46da4c00aa54294e2f6c5ecb7d → 824abd741b66ebff8109b8b45c0219fbea1eb3a1a7127aeca137da51cb32eb75。
- scripts/ui-review/fixtures/frontend-redesign/T-08/index.mjs：979a998b82f3af6adefe9cab74e31ff19f081d4b3cf50a080ecdd6ef8bf14e06 → aa4bdfac1a280569db25232ff35372e18849da42798aaeab7f7e32700bdd6078。
- 新增 src/ui/components/huhu/analytics/Analytics.dom.test.tsx：dd029a79a9638ce2f593f95bc2ddbf8bc233f73d799bf164fbe21a574c890022。

4 个候选文件实际 mode 均为 0o664，3 个已有文件 before mode 也为 0o664；patch 使用 Git 标准新文件模式 100644，Root 应按清单核对应用后的实际权限。

changes.json SHA256：1eec1e27e2dc6b67b247b4fb59efef33d2dba843c1edc39beea8d451d3a968e5。
analytics-dates.patch SHA256：c06a3937a6580dc1815e009c7835629c9705ad2da70a6384ad429a77ca4c4179。
7 个只读生产者/算法/词典/registry 上下文清单 context-manifest.json SHA256：325eae662d92e8077e5ef589c27e2d6b977bf182aa033b9a990a365e79fcf826。freeze.json 记录声明状态保留检查；它不是 native 挂载证明。

实际命令和结果：

- ANALYTICS_BEFORE=1 pnpm exec vitest run --config /tmp/huhu-analytics-date-repair/vitest.config.ts -t 'custom analytics uses'：退出 126，1 失败、8 跳过；私有 load overlay 载入原 Analytics，断言原生日期数应为 0，实际为 2（red.log、red-exit.json），证明目标红灯。
- pnpm exec vitest run --config /tmp/huhu-analytics-date-repair/vitest.config.ts：最终退出 0，1 文件 9/9 通过（green-final.log）。覆盖非原生、5 组非法/倒序/缺任一端/两端皆空和 Enter/Cancel 恢复、有效完整范围的原子提交及含端点筛选和前一跨度、clear 不产生无界范围、month previous/next 和 week/all 切换。日期时钟固定，仅复用原算法预期，无域 mock。
- pnpm exec tsc -p /tmp/huhu-analytics-date-repair/tsconfig.json --pretty false：最终退出 0（types-final.log），私有图含实际候选、相邻测试、T-08 TSX fixture 与仓库声明。中途发现测试 getByRole 的无效 exact 参数，已改为精确正则；首次镜像搭建缺父目录及 Vite 真实路径解析错误均为私有验证设置问题，修正为独立文件副本后获得上述实际红绿。
- pnpm exec eslint --stdin --stdin-filename src/ui/components/huhu/analytics/Analytics.tsx --max-warnings 0，stdin 为私有候选：退出 0，零警告（lint-final.log）。新增测试按仓库格式配置格式化；不为格式顺手重排原 Analytics 其它 export 或既有 fixture。
- node --check /tmp/huhu-analytics-date-repair/proposed/scripts/ui-review/fixtures/frontend-redesign/T-08/index.mjs：退出 0。
- node /tmp/huhu-analytics-date-repair/workspace/scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-08 --matrix redesign --check --out /tmp/huhu-analytics-date-repair/fixture-final：退出 0，preflight、0 matrix cases（fixture-final.log、fixture-final/result.json）。在私有根编译候选并记录输入 hash，未启动 Chrome；复制的 styles.css 只供只读预检输入，不作为样式重建或新像素证据。

## 问题与下一步

无已知实现阻塞。ready.json 及本报告写入后不再覆盖；Root 先核对 before/after SHA/mode、上下文和 patch，再自行应用并做独立 high 及 T-08 新增 custom 弹层实际 native 验证。当前只证明私有候选通过，不宣称 workspace 已合入、像素/44px 命中或 32/44 状态已 native 通过。

未运行 Chrome/66、全仓测试、构建、样式生成、Obsidian host；未动并行正式 66 的源码或资产，不改 state/Evidence/index。Root 正在进行的其它票验收不受本候选写入影响。
