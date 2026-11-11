# 进度与证据

## 固定基线

- 开始时 `main@9fe1c9f`，工作树干净。
- 审查并快进现有远端 `8436afd`，复用 CI 精简、完整测试去重和发布门禁调整。随后移除一次性 node_modules artifact 上传。
- 仅本地命令与 CDP 可用，无独立子代理。审查按规格／工程两个角度顺序执行，不宣称独立多模型。
- 上游研究复核 HiLighter（MIT）、JSON Forms（MIT）、Pierre diffs（Apache-2.0）；优先保留已安装栈。实际新复用来自现有 Margin Comments 改编 renderer，继续保留署名和许可，不复制 HiLighter 的正文 mark／IndexedDB 数据层。

## 检查记录

| 对象 | 命令／证据 | 结果 |
|---|---|---|
| 基线源码类型 | `pnpm exec tsc -noEmit -skipLibCheck`，`/tmp/huhu-baseline-types.log` | 通过 |
| 基线全量 | `pnpm test`，`/tmp/huhu-baseline-tests.log` | 619 文件通过、6 失败、9 跳过；4780 项通过、15 失败、52 跳过。原生变量缺失及计时失败，须按正确前提复测 |
| 新增行为 | `/tmp/huhu-target-tests.log` | 4 文件、55 项通过，包括加载全库再导出、Markdown 迟到渲染隔离、类型配置持久化、受管恢复拒绝 |
| 档案投影 | `/tmp/huhu-presentation.log` | 2 项通过；首次夹具误用 phone，改为既有 phones 字符串数组后通过 |
| 跨模块定向 | `/tmp/huhu-integrated-tests.log` | 85 文件、561 项通过，覆盖 archives/comments/versioning/editor-panel/shell |
| 架构 | `pnpm test:architecture`，`/tmp/huhu-architecture.log` | 1406 模块，无层级、宿主依赖、桌面隔离或循环违规 |
| 构建 | `pnpm build`，`/tmp/huhu-build-final.log` | 通过；后续源码变化需重跑 |
| 包预算 | `/tmp/huhu-bundle.log` | 首次恢复策略静态引入 YAML 使 versioning 激活超限。已改按恢复操作懒加载，不放宽预算，待重跑 |
| 文档 | `pnpm test:docs` | 基线发现退役技能链接和安装包锚点错误；修复实际引用，不排除目录或放松规则 |

## 迁移与偏差

两份输入共 102 文件已集中至 sources，原路径及哈希写入 source-manifest。现役知识中的入链仅随移动修正，未改写历史 ADR 决定。技能参考只修链接，未写入项目资料。

## 最终验证（2026-11-11）

| 检查 | 当前结果 | 本地原始记录 |
|---|---|---|
| 完整 `pnpm test:all`，显式传入本机 helper/CLI | 43 组全部通过；Vitest 635 文件通过、3 跳过，4824 项通过、41 跳过 | `/tmp/huhu-all-final.log` |
| `pnpm build` | 源码／测试类型、CSS、生产包通过 | `/tmp/huhu-build-final2.log` |
| `pnpm lint` | 零警告通过 | `/tmp/huhu-delivery-lint.log` |
| `pnpm lint:css` | 通过 | `/tmp/huhu-lintcss.log` |
| `pnpm check:bundle` | 所有预算通过，versioning 激活 190.5 KB，未提高预算 | `/tmp/huhu-bundle-verified.log` |
| `pnpm check:notices` | 130 npm 包、73 terminal crates 许可检查通过 | `/tmp/huhu-notices-verified.log` |
| `pnpm check:native` | Rust 测试通过 | `/tmp/huhu-cargo-final.log` |
| 真实 Obsidian 历史 | 25 项通过，含恢复、取消、撤销、Git 不变、多叶、重启和弹出窗口 | `/tmp/huhu-delivery-history-20261111/evidence/` |
| 真实 Obsidian 全工作台 | 87 项通过，含实际页面、paper/ink、1440/390、键盘、设置、模块开关和重启 | `/tmp/huhu-delivery-shell-20261111/evidence/` |
| 真实 Obsidian 新档案链路 | 10 项通过，含鼠标发布配置、列表卡片、Markdown 与链接、窄屏、重启 | `/tmp/huhu-delivery-archives-20261111/evidence/` |
| 来源迁移 | 102 文件的原始 Git SHA-256 与迁移后 SHA-256 全部核对通过 | `source-manifest.json` |

最终宿主结果和安装摘要保存于 [验证报告](verification/host-results.json)，已逐文件与当前制品比较。可见结果见 [档案详情](verification/archive-detail.png) 和 [窄屏暗色卡片](verification/archive-ink-390.png)。未使用内部 setter 代替验收操作；只有档案夹具建立调用生产命令 owner，后续发布、切布局、详情、链接均由实际渲染控件完成。

最终产物 SHA-256：

- `main.js`：`fa8fdf22a2fcc8b567d0fe46f1764830df6bba2a67f35dccac7597d76be24f11`
- `styles.css`：`ae8a0e9196a784336a4a9dc2ee218b5dc6544fe20b818472e4f16ddc7696dca9`，内容未变化。
- `manifest.json`：`6002379a86e414dcd8e8eba2a4310844bc8032df95444c412a1e6ff16d429a6d`，版本未变化。

## 失败与修复证据

- 首次测试缺少原生环境变量，不是产品失败。后续显式绑定 `native/pty-server/target/debug/huhu-pty` 和 `huhu`，原生集成通过。
- Linux 650ms 清理断言可重复失败，主机约 650～700 个进程。census 读取使用 FileHandle Promise，父进程查找每行遍历所有行，额外暂停放大成本。改用 callback readFile 包装、PID→birth Map、跳过 PF_KTHREAD 和删除安静扫描的多余 pause；不减少扫描数、不缩短 200ms 安静窗口、不放宽 650ms 截止。局部三轮各 6 项和最终全量均通过。PF_KTHREAD 值由本机 `/usr/src/linux-headers-7.0.0-42/include/linux/sched.h` 的 `0x00200000` 核对。
- 诊断性微测量交错各 5 次，callback 对 Promise census 在同一约 659 进程工作负载中读取同样行数；只用于定位 I/O 包装开销，不据此声称整体插件加速。端到端结论仅为原清理断言通过。
- 旧 UI 脚本仍用已删除主题、xs 尺寸和宿主动效 token，出现 50 个样式差异及尺寸断言失败。改为现役 HU/真实组件后，样式及双 Document 运行时完整通过。
- 新档案宿主探针首轮点击发生在滚动动画中，第二轮窄屏保留 Obsidian 文件栏造成可用区域不足。分别等待布局并关闭夹具的原生侧栏后重跑，未修改产品来绕过探针。
- `git diff --check` 的 main.js 警告来自生成包内嵌第三方文本；作者文件检查通过，不手工修改生成包。

## 交付边界

[复核报告](review.md) 分开列规格、工程与剩余项。统一资料和本轮整改已验证，但旧扩展产品目标尚未全部实现，因此不把整个 change 归档为 implemented。当前授权是推送 main，不包括发版、升版本或关闭 Issue。提交及远端结果由本 change 的 Git 历史与最终交付回复记录。
