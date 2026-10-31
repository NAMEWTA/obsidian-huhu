# 一次切换与物理删除计划

本轮只写计划，不执行以下删除。源要求：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/source.md</Path> §17–18。精确文件 inventory 由 T-01 在真实 checkout 产出；下面保留源清单，避免把“完全重构”压成几条目录名。

## 当前源清单

| 范围 | 必须处理 |
|---|---|
| `native/browser-runtime/` | 整目录删除：supervisor、独立 Chromium 管理、native cookie reader、对应 Cargo 配置/测试/说明；不保留空目录和失效入口 |
| `src/modules/browser/platform/desktop/runtime/` | 旧 adapter/factory、worker、host-main 监督逻辑、进程协议、bundle 管理和生成文件全部删除/替换；不是新增 backend 分支 |
| 根 `browser-worker.cjs`、`browser-worker.cjs.sha256` | 删除发行/提交产物与所有安装、摘要校验、复制、打包引用 |
| `runtime/worker-digest.generated.json`、`runtime/main-source.generated.json` | 删除旧生成内容与生成路径；需要的新小型固定安全策略重新命名并独立审查，不包裹旧 supervisor |
| `scripts/build-browser-runtime.mjs` | 删除旧构建脚本；新桥如需生成，用准确名称和最小输入实现 |
| `tsconfig.browser-worker.json` | 移除旧 worker 项目及所有构建链引用；普通 TS 检查继续存在 |
| `package.json` 的 `build`/`build:browser`/`check:browser-native`/`accept:browser-native` | 删除 Native/worker 步骤，替换为实际新实现检查；不能留下 `build` 还执行已经删除的 tsconfig/script |
| `scripts/verify-browser-runtime-native.mjs` 及 Native 专属 fixture | 删除旧专项测试并由新 Electron/真实宿主验收接替；保留有意义行为场景，不保留错误架构断言 |
| 旧 `browser-cli.cjs` 及其旧协议摘要/客户端实现 | 删除旧运行时客户端；需要外部接入时重建薄 client，重写 `build-browser-client.mjs`/选项/发布清单，不能兼容旧 RPC |
| `platform/desktop/identity/`、`cookies/` 中旧导入链 | 删除 sealed credential store、source reader、系统浏览器探测、原生解密/SQLite 读取及其专属依赖；后置导入不依赖这套代码 |
| `core/identity` 及导入/staging 模型 | 删除身份种子、封存/套用、导入计划/临时运行时等旧核心概念与 API |
| 旧 persistence、cleanup-jobs、profile/recovery 逻辑 | 删除独立用户目录、进程回收、runtime ownership 恢复等实现；新 Session 删除 tombstone 是新最小合同，不复刻旧状态机 |
| 旧帧 UI/传输 | 删除 BrowserFrame、subscribeFrames、HumanInput 重放、viewer/window/frame 租约、帧序号/压缩/轮询等人工浏览链路 |
| 旧 Agent 操作账本 | 删除只服务于 Native 的 prepare/execute/operation、进程 heartbeat/RunGrant 等协议与存储；保留必要的新授权代次及未知效果结果 |
| 设置/i18n/帮助/命令 | 删除安装运行时、选择 bundle、Linux-only、sealed identity、导入浏览器 profile 等失效入口及中英词条 |
| 构建/CI/发布 | 清理 workflows、安装/卸载、runtime 资产下载、manifest/checksum、缓存键、release 附件、打包复制和平台分发判断 |
| 依赖与许可证 | 删除仅由旧 browser 链使用的依赖、锁文件条目和分发声明；共享依赖/历史来源不得误删，按真实新分发内容重新生成 notices |
| 文档/技能/样本 | 重写当前 browser/data/架构/验收说明和黄金样本；失效运行时文档删除或明确归档历史，不让当前入口继续引导安装旧运行时 |
| `main.js`/`styles.css` 等产物 | 按正常构建重生成，证明旧 runtime 未仍被打包；不得只删 TS 而保留可执行旧产物 |

## 保留、提取与保护

明确保护 native/pty-server、native/huhubot、Go/Eino/HAP、host/desktop/secret-protector、desktopRemote/bundledMain、通用 FileGrant/ModuleServiceLease 和其他模块效果存储。旧 browser 的纯 URL/材料/文件边界可提取，但每项必须有新生产调用方和测试，不保留整个 legacy 目录备用。

inventory 每行必须包含：现有路径及 blob/固定 SHA、删除/重写/保留原因、新 owner/消费者、生产与历史引用、测试替代、生成或发行资产。全局字符串零出现不是完成标准；文档/历史说明可明确例外，但生产 import、动态路径、脚本字符串、生成代码、发布附件不能残留可执行路径。

## 不可交换的切换顺序

1. T-01 冻结宿主可行性、consumer 和 deletion inventory；候选路径存在性逐条确认。
2. 在同一个未合入重构分支打通 T-02–T-11 新纵向链；API 生产者/所有消费者同步。中间提交不构成可发布产品。
3. T-12 集中切换 module/composition/build/CLI/发行链并物理删除旧源码、专属测试与失效 UI/i18n。新固定安全桥采用准确新名称，不包裹旧 supervisor。
4. 适用测试、styles/notices/build/bundle 后重生成 main.js/styles.css/薄 client；比较实际发行包与依赖图，禁止只删 TS 留旧产物。
5. T-13 固定交付 commit 跑全矩阵并明确支持组合；满足整体 Gate 后才申请合并/关闭 Epic。文档 PR 一律 Refs #38。

## 用户磁盘数据

不自动读/迁移旧 v2 profile、sealed identities、操作账本或凭据。升级说明要求旧 runtime 正常停止并完全退出旧宿主，避免两套进程并行；新产品不得启动旧 supervisor 做恢复。首次使用在新 Space 登录。

旧文件默认保留。人工清理说明或未来显式清理动作只针对已证明属于当前 Vault/设备的旧浏览器目录，显示路径范围与风险后确认；不能删除整个 .huhu、Chrome/Firefox profile、别的 Space、userData 或已导出文件。删除新 Session 的 tombstone 与旧数据清理是两个不同流程。

## 恢复与回退

代码可按已审核提交撤回；不启用运行时自动 fallback，不让旧二进制读取新 metadata/Session。出现清理/转换失败保持原数据、诊断与 owner，不以继续删文件“回滚”。构建失败停止集成，保留真实失败和最后可信快照；不降预算/关闭规则获取绿色。

## 许可与文档同步

依赖仅在证明为旧 browser 独占后删除；共享许可不随目录名误删。新适配代码若实质复制外部实现登记 NOTICE/THIRD-PARTY-NOTICES 及固定来源。docs/data、browser、开发规则、技能帮助、验收指引和黄金样本必须一致；历史仅标归档，不被当前入口当操作指南。永久 ADR/context/design 的提升仍走归档网关，本重构不绕过。
