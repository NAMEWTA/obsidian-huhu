# T-01 工具链检查与过渡失败（2026-11-05）

结论：依赖安装及 peer 检查通过；全量类型检查不通过。T-01 仍在实施，本文不是完成证据。

Lead 在 current 工作区负责 package.json、pnpm-lock.yaml、tsconfig.json 与包管理器生成的 pnpm-workspace.yaml；界面源码由 native:/root/implement_t01（gpt-6.1-sol medium）实现。未提交或推送。

## 已执行

- 官方 npm registry 核对目标版本、peer 与许可；安装 React/DOM 19.3.1、types 19.3.0、TypeScript 6.0.3、typescript-eslint 8.72.1、esbuild 0.28.2、Tailwind/CLI 4.3.4、Radix 1.8.1、Headless Tree core/react 1.8.0、panels 4.18.1、grid 2.3.0、virtual 3.14.26、sonner 2.0.8、Lucide 1.69.0。DayPicker/diffs 留相应实施票接入。
- `pnpm install`：退出 0；首次安装有 Node 类型 peer 冲突，改用 `@types/node` 22.20.5 后再次退出 0。
- `pnpm peers check`：退出 0，明确输出 No peer dependency issues found。
- 包管理器自动为选定的 Lucide/panels 精确版本添加 minimumReleaseAgeExclude；仅两个版本，不降低全局策略。该文件是必要共享安装配置，由 Lead 持有。
- TypeScript 6 首次检查被废弃 baseUrl 阻断。扫描 src/scripts/test 的导入，未发现依赖 src 根裸路径的消费者，移除未使用的 baseUrl；显式添加 `types: ["node"]`。依据：https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html 。不使用 ignoreDeprecations 掩盖迁移。

## 全量检查失败归属

`pnpm exec tsc --noEmit --skipLibCheck`：最终本次退出 126。以下是实际诊断分组，不代表相关票已经验收；T-13 前必须清零。

| 路径 | 失败 | 后续责任 |
|---|---|---|
| src/app/main.ts | cycleThemePreset fallback 仍为 default | Lead 协调 T-12 补齐入口写集及迁移 |
| src/app/settings/react/appearance/AppearanceSettings.tsx、swatches.tsx | 旧预设枚举与 deriveCustomTokens | T-12 |
| src/ui/components/resizable.tsx | panels v3 API 已删除 | T-02 |
| src/modules/agent/ui/terminal/TerminalTabView.tsx、workspace/WorkspaceLayout.tsx | panels v3 API 与回调类型 | T-09 |
| src/modules/navigator/ui/NavigatorRoot.tsx | panels order 属性 | T-10 |
| src/modules/versioning/ui/DiffSurface.tsx | panels 回调类型 | T-16 |
| src/modules/navigator/ui/runtime.ts、src/modules/versioning/services/sync-service.ts、src/modules/versioning/ui/sync-presentation.tsx | Obsidian moment 类型在 TS6 下不可调用 | Lead 协调宿主类型适配；不得改变 Git 时间格式语义，尚未解决 |

不得把未迁移消费者失败称为全量通过。当前主题源码仍有活跃 writer，检查仅用于定位集成接缝，正式验收须固定输入后执行。许可生成、包体、构建、真实 UI runner 与独立审查尚未完成。

过程材料仅本地保留：
- /tmp/huhu-frontend-implementation/registry.json
- /tmp/huhu-frontend-implementation/node-types.json
- /tmp/huhu-frontend-implementation/typecheck-initial.log
- /tmp/huhu-frontend-implementation/typecheck-post-config.log
- /tmp/huhu-frontend-implementation/typecheck-node-types.log

## 样式产物检查（同日追加）

主题实现者确认 CSS/Tailwind 输入稳定后，Lead 执行 `pnpm run build:css`，退出 0，生成 styles.css（23 个作者源，1,288,287 字节）；随后 `pnpm test:styles` 退出 0，确认产物匹配；`pnpm run lint:css` 退出 0，22 文件，无新增违规，保留 1 文件的 3 组既有基线。原始日志本地路径：/tmp/huhu-frontend-implementation/build-css.log、test-styles.log、lint-css.log。尚未替代浏览器矩阵、完整构建或独立主题审查。

## 最终令牌修正后的浏览器证据核对

实现者补齐 DESIGN 的 diff/read-body 精确令牌后，Lead 再次执行 build:css 退出 0，styles.css 为 1,288,471 字节（覆盖上文较早产物）。最终浏览器结果本地路径 /tmp/huhu-frontend-redesign/T-01-frozen/result.json：passed，54 cases，0 errors。Lead 逐项核对结果中当前可读输入文件 SHA-256，无漂移；inputDigest 为 865f4d5b0cdb361399141f74ba732ef326de22ebe5a1c180c36e20744a8a8d1a。已目视查看 320px 纸/墨代表截图；不是全部截图人工审阅，也不是真实 Obsidian popout 证明。

002-review-toolchain 和 003-implement-adapters 回执结构校验均退出 0；源码、测试与设计完整双轴审查由 005-review-t01 继续，当前不宣称 T-01 完成。宿主 S-01 修复由 004 独立实施并待审。

## 独立审查发现（修复前，当前不能通过 T-01）

005 high reviewer 已报告并提供实际 Chrome/CLI 反例：
- 跟随宿主主题未检验 accent-text 对 accent-soft：#767676 在白背景为 4.542，但在实际 #E3EEEC 背景仅 3.830。需扩展实际配对检查及整体回退。
- 显式 data-motion=reduce 的 :is(*,::before,::after) 无法匹配伪元素；系统减少动效关闭时伪元素动画/过渡仍为 2s。需正确选择器和真实浏览器反例。
- 颜色守卫允许命名颜色 red 与 color(display-p3 1 0 0)，需解析/检查现代颜色值及反向测试。
- fixture 的 lang 属性和固定双语文字不证明真实语言切换；Dialog 只在末尾单个状态打开不证明主题/强调色/来源浮层矩阵。

故此前 54 个样本 passed 只表示原断言通过，不证明以上合同。T-01 保持 in_progress，修复任务 007 将在 005 最终报告释放冻结后执行；后续须重建、重新冻结、重验并独立复审。Lead 已独立运行 pnpm exec vitest run src/theme，退出 0，8 文件/38 测试；同样不能代替缺失的浏览器断言。

## 宿主修复独立验收回执

004 实现者 native:/root/implement_host_types（gpt-6.1-sol medium）与 006 审查者 native:/root/review_host_types（gpt-6.1-sol high）为实际不同原生子智能体。006 已核对六文件前后摘要并独立复跑 73 项相关测试、局部严格 tsc、五生产文件 ESLint 与架构检查，均通过；标准轴/规范轴 pass，无 findings。修复仅恢复已有宿主结构类型边界与新主题默认 fallback，三处 moment 类型诊断消失。详见本轮 004、006 的不可变 REPORT；真实宿主与 scanner 特殊环境未验证，整库仍有 28 个 appearance/panels 迁移诊断。此结论只覆盖六文件，不代替 T-01 全票验收。

005 最终报告两轴 request-changes，共五项 P2；已派原 medium 实现者执行 007 修复，保持 T-01 in_progress。

## 007 修复候选与复审派遣

007 已停止源码写入并提交不可变 REPORT；Lead 核对其 matrix-settled/result.json 实际为 passed，66 个样本、132 条已打开浮层记录、0 errors，所有当前可读输入摘要匹配 c824624556bb83feac88d0ab5b9d2a32e9a3e19eac7f5c139f00bb0d845fe47b。已目视检查第二 Document 的 320px 英文纸主题浮层稳定截图，不能替代全部人工视觉检查。命名颜色/现代颜色/混合字面量 CLI 反例现在被拒绝，语义颜色正例通过。早期失败矩阵仍保留本地。

007 return 与 008 dispatch 结构校验均退出 0；已派同一独立 high reviewer 复查五项缺陷。当前仅为候选检查结果，尚未完成独立复审，T-01 不推进 done。包含宿主修复的完整 37 文件工作副本快照已由 Lead 生成：/tmp/huhu-frontend-implementation/t01-combined-snapshot.json；原始工件保持本地。最新共享 styles.css 为 1,288,747 字节。
