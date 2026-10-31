---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-20
title: "启动与规模采样脚本及 CI 趋势"
status: in_progress
kind: feature
planning_depth: standard
planning_depth_reason: "新增可复跑测量基础设施与大库 fixture 生成"
ready: true
risk: medium
blocked_by: ["T-01"]
contract_ids: ["AC-163"]
owner: "native:/root/sources"
expected_changes: ["<Path>scripts/perf/</Path>", "<Path>.github/workflows/perf-sampling.yml</Path>"]
writable_paths: ["<Path>scripts/perf/**</Path>", "<Path>.github/workflows/perf-sampling.yml</Path>", "<Path>docs/e2e/dev-overhaul/perf/**</Path>"]
read_only_paths: ["<Path>package.json</Path>","<Path>scripts/obsidian-acceptance/</Path>","<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>","<Path>src/modules/browser/**</Path>","<Path>native/browser-runtime/**</Path>"]
shared_paths: []
shared_path_owners: []
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---

# Ticket T-20: 启动与规模采样脚本及 CI 趋势

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-20.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

沉淀可复跑的独立 fixture 采样脚本，记录 stub 宿主下的非 Browser 模块激活、本地页面可交互、输入到新画面、任务提交到投影、查询/滚动、内存与长任务，区分冷/热进程。真实插件/Obsidian 激活与原 300ms/250ms 预算属于用户真机验收，不从 fixture 推断。来源：#37 W7.7–W7.11；Spec AC-163。

## 行为与范围

IN：脚本与虚构大库 fixture 生成器（≥1 万篇笔记及批注、档案、任务、版本历史）；三平台 runner 趋势采样；保留原 300ms/250ms 场景并确认口径。OUT：实机预算结论（用户真机验收）；把共享 runner 耗时直接作为硬门禁。

## 验收标准

- [ ] `AC-163`：脚本在三平台 runner 可运行并输出采样表；实机部分标为用户真机验收。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 脚本 | node | `node scripts/perf/sample.mjs --fixture small --runs 5 --out docs/e2e/dev-overhaul/perf/small`；同命令 `--fixture large --runs 20` | 产出表格 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-20.md</Path>` |
| CI | GitHub Actions | `perf-sampling.yml` | 三平台 job 有记录 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-20.md</Path>` |

- **E2E disposition：** not-required：测量基础设施。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

fixture 与样板不进入生产包；不用真实用户材料。

**证据失效：** base/head 变化触及本票写集、上游 ADR/Spec 对应条目修订、或绑定 Skill 摘要变化时，本票已有验证需重跑。

## 未决事项与风险

无

### 未决问题

无。

## 本轮范围与共享执行约束（LOG-017、LOG-018）

必读 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`：Browser 及其集成面冻结，优先于本票宽目录写集；shared_paths 仅由声明的 Lead owner 串行写入。构建、全量验证及共享组件变更遵守该文件，不通过修复浏览器解除其他票的阻塞。本轮只更新计划，生产实现和 Git/远程动作尚未授权。

## 可执行采样合同

计划新增 `<Path>scripts/perf/sample.mjs</Path>`、fixture 生成器和生产模块适配器；这些入口尚未实现。Node 端以现有 Obsidian stub/内存 vault 加载真实非 Browser 服务，Chromium 端挂载真实组件，边界 mock 显式列在结果；不启动 Obsidian、HUHU Browser 或外网。三平台 CI 使用 setup-node/pnpm，Chromium 路径由环境配置并在 job 开始核验，不能用 happy-dom 冒充像素/帧测量。

测量起止：模块 activate 调用至返回（标记 fixture_activate）；页面挂载至首个可操作控件下一帧（fixture_interactive）；input/submit 事件至真实组件投影匹配预期后的 requestAnimationFrame（input_to_frame/task_projection）；查询调用至结果返回、scroll 事件至下一帧。cold 每轮新进程/新 fixture，warm 在同进程预热后采样。JS heap/longtask API 不支持时输出 unavailable 与原因，不填 0。Browser/WebPanel 不进入采样清单。

输出 JSON + CSV：源快照摘要、OS/Node/Chromium 版本、fixture 参数/种子/笔记数、scenario、measurement_kind、起止标记、轮次原始值、单位、p50/p95、错误及超时数、能力缺口。small 为固定 100 篇，large 至少 10000 篇并包含批注/档案/任务/版本历史；300ms/250ms 仅作原场景标签，不作共享 runner 硬阈值。CI 三平台使用同一 seed/场景并上传原始值。正常路径验证计时顺序与结果；故意挂起用例验证超时记为失败；重复运行验证 fixture 和口径稳定。

AC-163 的 agent 部分只承诺上述 fixture 趋势；真实 Obsidian 激活/首屏及设备预算由用户自行验收且 agent 不跟踪。缺少浏览器执行环境或三平台日志时不得填通过。
