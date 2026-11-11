# 任务回报

Session: 20261105T094057Z
Task: 002-review-toolchain
Status: completed

## 聚焦交接

独立 reviewer：native:/root/review_toolchain；未参与本次实现，未委派、安装、修改源码或共享构建产物。按 dev 与 code-review 执行两轴审查，范围仅为 TASK 指定的四个冻结文件；这是工具链局部审查，不是 T-01 完成验收。标准轴 request-changes：TypeScript 6 升级尚需解决 Obsidian moment 宿主声明接缝；规范轴在四文件版本选择与配置范围内 pass，完整集成仍待验收。建议沿用现有 datetime 结构类型边界并适配三个调用点，保留原 Git 时间格式和 Moment locale 行为。

## 产物与验证

### 固定输入

Review mode: working-tree；基线及观察 HEAD 均为 `37fcede4210a19bcc2a74809e7fdd301e5717957`；实际比较 `git diff HEAD -- package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json`。开始、结束的原始 SHA256 均匹配 TASK：

| 文件 | SHA256 |
|---|---|
| package.json | 99e2be3b1e34758bb8f828038178d0ecf03218de19cfb6c94322472d7f6043cf |
| pnpm-lock.yaml | 62adfcdcae53dac34441a6eb4f238b79df7dc671480c237ef7bbdaad3eeaf1f0 |
| pnpm-workspace.yaml | a8442bdabc8600c61cedb88a89dbdf98554e501d0c5734936eb38aae5a732c3e |
| tsconfig.json | 2b323ecfbe324c241f074285345c99393ad111b1b6b80584d0683d0b8a83c60c |

Risk: high；Independence: required；Strategy: independent；Mode: native。实现者来自 TASK/原证据：Lead 持有这四个文件；主题与 adapter writer 均在本局部范围之外。本报告交由 Lead 从实际派遣事实核验身份与独立性。

规范发现：提交引用/外部 source.md 对未提交局部快照不适用；显式提供的 T-01、spec.md、reuse-decision.md、report-t01-toolchain.md 均已回读；补查 tickets-map 的原子集成合同与 T-02 的消费者范围。标准发现：根 AGENTS、dev Skill、build-and-release/licensing/testing、tsconfig.test.json、eslint.config.mts、包清单及锁文件已核对；未发现 CONTRIBUTING/CODING_STANDARDS。应用 code-review 的 reviewer/source-discovery/Fowler/risk/review-evidence/working-tree 合同。未审活跃主题源码或 adapter 最终候选，不作完整 UI/设计符合性结论。

### standards 输出

Reviewer: native:/root/review_toolchain
Result: request-changes

**S-01，P1：补齐 TS6 对 Obsidian moment 的宿主类型适配。** 定位 `package.json:94` 的 TypeScript 6.0.3 升级；受影响消费者为 `src/modules/navigator/ui/runtime.ts:80`、`src/modules/versioning/services/sync-service.ts:361`、`src/modules/versioning/ui/sync-presentation.tsx:249`。官方 Obsidian 1.13.1 声明第 8 行使用 `import * as Moment from 'moment'`，第 4561 行导出 `typeof Moment`；TS6 强制启用 esModuleInterop 后 namespace 不再可调用。本次独立 tsc 明确复现 TS2345/TS2349；skipLibCheck 不能修复消费者错误。该问题已由 Lead 记账，本报告确认根因与最小修复，不将其称为未发现的新问题。

最小建议（未实施）：

1. `src/host/obsidian/datetime.ts` 的既有 `MomentLike` 增加 `fromNow(): string`，保留既有单次 `unknown` 结构类型断言。
2. sync-service 用 `nowMoment().format(settings.commitDateFormat || 'YYYY-MM-DD HH:mm:ss')` 替换原调用；sync-presentation 用 `momentOf(last.at).fromNow()`。仅改导入/类型边界，不改格式、参数、locale、时区或领域逻辑。
3. navigator runtime 的宿主装配点按已有 `MomentApi` 结构合同转换后注册：`registerMoment(moment as unknown as MomentApi)`；不把宿主类型带进 core。

满足条件：上述消费者及受影响测试通过类型/lint 检查；Git 自定义 format、relative time、导航器严格解析/locale 行为保持。需要随结构类型扩展核对现有测试替身。不得设置 esModuleInterop false、ignoreDeprecations、any 或在运行时访问 `moment.default`。依据：[TypeScript 6 的 interop 变更](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html#deprecated---esmoduleinterop-false-and---allowsyntheticdefaultimports-false) 与已有 datetime.ts 的 scanner 防护注释。

备选探针 `moment as unknown as typeof moment.default` 在当前安装环境可调用并满足 MomentApi，但它重新依赖传递声明，因此不优先替换仓库现有结构类型边界。真实 moment 2.29.4 是函数且 `.default` 为 undefined，类型查询不能被误写成运行时取 default。

其余检查未发现四文件本身额外的标准缺陷：删除未使用 baseUrl 符合 TS6 迁移；显式 node types 符合 TS6 的 types 默认改变；改动未加入任何全局 peer 忽略或任意版本放宽。Fowler 最低启发式在该配置范围未命中可证实的问题。

### specification 输出

Reviewer: native:/root/review_toolchain
Result: pass（仅四文件版本选择与配置）

依赖选择符合 reuse-decision.md：React/DOM 配对 19.3.1、React types 19.3.0、TS6.0.3/TS-eslint8.72.1、esbuild0.28.2、Tailwind/CLI4.3.4、Radix1.8.1、Headless Tree1.8.0、panels4.18.1、grid2.3.0、virtual3.14.26、sonner2.0.8、Lucide1.69.0。DayPicker/diffs 及 merge 删除按批准分票留后续票，不是这四文件的遗漏。

官方 registry 精确版本元数据独立复核了全部 18 个升级直接包：React DOM peer ^19.3.1、TS-eslint 的 TypeScript >=4.8.4 <6.1.0、各 UI React19 peer 均吻合；所查 engine 没有与 CI Node22/24 冲突。直接包许可为 MIT、ISC 或 Apache-2.0，未发现禁止许可；这不替代全依赖图、生成 notices 与最终打包许可核验。例：[React DOM 元数据](https://registry.npmjs.org/react-dom/19.3.1)、[TS-eslint 元数据](https://registry.npmjs.org/typescript-eslint/8.72.1)。

`pnpm-workspace.yaml:6–8` 仅排除 Lucide1.69.0 与 panels4.18.1 两个准确版本，不降低全局 release-age 门槛；官方 registry 显示分别发布于 2026-11-05T06:12:23.066Z 与 2026-11-05T00:43:04.047Z，均为所查 latest，解释了当日显式选型所需例外。[Lucide registry](https://registry.npmjs.org/lucide-react)、[panels registry](https://registry.npmjs.org/react-resizable-panels)。锁文件 importer 与包清单的全部 dependencies/devDependencies specifier 一致；没有安装来伪证 frozen-lockfile 成功。

### 实际检查

环境：Linux；Node v26.11.1；pnpm11.1.3。当前环境不是 CI Node22/24，也不是真实 Obsidian。

| 检查 | 退出码与观察 |
|---|---|
| 四文件 sha256sum（前后）及 git rev-parse HEAD | 0；与冻结候选一致 |
| pnpm peers check | 0；No peer dependency issues found |
| pnpm exec tsc --noEmit --skipLibCheck | 126；复现已登记的 theme/panels/moment 接缝，未将失败写成通过 |
| node /tmp/huhu-toolchain-review/check.mjs | 0；锁 importer 匹配，官方 18 包元数据复核，真实 moment 静态方法/自定义 format/fromNow 存在；custom format 输出 git 2026/11/05 13:07:09 +08:00 |
| moment-probe.ts 的严格 tsc 临时探针 | 0；typeof moment.default 仅作类型查询时可恢复 callable，满足 navigator MomentApi 与 format/fromNow |
| structural-probe.ts 的严格 tsc 临时探针 | 0；既有 MomentLike + fromNow 与 MomentApi 结构断言能覆盖三个失败调用形状 |
| TMPDIR=/tmp/huhu-toolchain-review pnpm run test:ui-adapters | 126；Radix menu/select/roving-focus 与 sonner 的 unreviewed source 阻断。Lead 已说明由独立的 003 writer 处理；未重复深审活跃源码 |

两个临时 tsc 命令均使用 `--ignoreConfig --noEmit --skipLibCheck --strict --module ESNext --moduleResolution bundler --target ES2021 --types node --typeRoots /home/wta/projects/obsidian-huhu/node_modules/@types` 并分别指定 /tmp 下探针；ignoreConfig 是避免 CLI 文件输入误套当前 tsconfig 的选项，不是 ignoreDeprecations。过程文件仅在 /tmp/huhu-toolchain-review；本报告是唯一仓库写入。

## 问题与下一步

Lead 接手 S-01 的精确宿主边界适配；adapter writer 完成后另行冻结审查。panels v3→v4 的导出、order、layout/resize 回调与尺寸单位迁移仍属于 T-02/T-09/T-10/T-16，未按本次局部审查提前豁免。主题消费者仍由其后续票负责，当前 tsc 不是可发布基线。

未验证：修复后的整库与测试类型检查、零警告 lint、frozen-lockfile 全新安装、Node22/24/Windows、最终 adapter 候选、Tailwind 最低 Electron/移动 WebView 能力、生产 build/产物一致性、包体、生成 notices/check:notices、真实 DOM/Portal/多窗口与 Obsidian runner。没有执行共享 build、notice 写入或依赖安装；所有这些集成门仍由 Lead 按票与最终验收合同完成。
