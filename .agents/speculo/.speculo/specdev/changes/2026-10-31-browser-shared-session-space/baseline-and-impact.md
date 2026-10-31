# 固定基线与变更影响

规划基线 `974105b47e03c108df0f5e0c3fc9606fe4b79aee`。Issue 历史基线 `2670440678e5819a680024978b5feb2491ce7a35` 到本次 dev 的 compare 显示 ahead 2；变化位于 .agents 的工作流/设计/原型文档，未显示产品 src/package 构建代码变化。因此 Issue 的产品观察仍有参考价值，但本轮仍实际读取下列关键入口，不能将 Issue 抄写当全库审计。

## 实际读取证据

| 路径 | Git blob SHA（不是 SHA-256） | 读取范围 | 用途 |
|---|---|---|---|
| `AGENTS.md` | 固定 commit 链接为准；未在此单独固化 blob | 完整 | 文档中文、纯文档不强制构建、只做请求范围；https://github.com/NAMEWTA/obsidian-huhu/blob/974105b47e03c108df0f5e0c3fc9606fe4b79aee/AGENTS.md |
| `.agents/skills/dev/SKILL.md` | 固定 commit 链接为准；未在此单独固化 blob | 完整 | desktop 边界、数据规则与 minAppVersion；https://github.com/NAMEWTA/obsidian-huhu/blob/974105b47e03c108df0f5e0c3fc9606fe4b79aee/.agents/skills/dev/SKILL.md |
| `.agents/skills/ui/SKILL.md` | 固定 commit 链接为准；未在此单独固化 blob | 完整 | ReactSurface/Portal/控件/作用域；https://github.com/NAMEWTA/obsidian-huhu/blob/974105b47e03c108df0f5e0c3fc9606fe4b79aee/.agents/skills/ui/SKILL.md |
| `src/modules/browser/api.ts` | 固定 commit 链接为准；未在此单独固化 blob | 完整 | 旧能力与材料边界；https://github.com/NAMEWTA/obsidian-huhu/blob/974105b47e03c108df0f5e0c3fc9606fe4b79aee/src/modules/browser/api.ts |
| `src/modules/browser/module.ts` | `b27bf83263af4cb7a7f1b7d8f3667b09977750cc` | 完整 | lazy 页面/desktop、贡献点 activate:false；https://github.com/NAMEWTA/obsidian-huhu/blob/974105b47e03c108df0f5e0c3fc9606fe4b79aee/src/modules/browser/module.ts |
| `src/modules/browser/platform/desktop/composition.ts` | `b14909653af420987483c19581cfe850f3227c2b` | 1–180 行 | v2 根、runtimeFactory、identity/native reader、文件装配；https://github.com/NAMEWTA/obsidian-huhu/blob/974105b47e03c108df0f5e0c3fc9606fe4b79aee/src/modules/browser/platform/desktop/composition.ts |
| `src/host/desktop/electron-main.ts` | 固定 commit 链接为准；未在此单独固化 blob | 完整 | 固定 bundledMain 与 @electron/remote 窄桥；https://github.com/NAMEWTA/obsidian-huhu/blob/974105b47e03c108df0f5e0c3fc9606fe4b79aee/src/host/desktop/electron-main.ts |

## 已确认差异与边界

源代码当前仍是旧 Native factory 装配，不存在已被本轮证明完成的新 Session runtime。当前 metadata/身份/清理复杂度支持整体替换而非新增 backend 分支。BROWSER_MATERIAL_CONSUMERS 与 activate:false 值得保留；host bridge 是通用能力不可删；ModuleServiceLease 与 browser 旧控制租约不是同一对象。

用户指定 UI-001 final/index.html、styles.css（前 240 行）、app.js（前 75 行）与 DESIGN-0002 已读取。它包含 gallery/list/safe/home/bot/terminal 设计而非浏览器；本次新增浏览器交互但复用其视觉规则。没有把参考所有 659 行 JS 冒充已逐行审计。

## 下一阶段必须补的事实

1. 在真实 dev checkout 用 `git grep -n -E 'BROWSER_|BrowserWorkspace|BrowserAgentAccess|subscribeFrames|renderViewer|RunGrant|ControlLease|copyAgentConnection' -- src native scripts contracts` 列调用方；这些是计划命令，本轮未运行。
2. 使用实际仓库树核对 API/模块/CLI/HAP/测试/构建/发布/生成物；排除同名其他模块字段，形成每项“消费者→旧方法→新方法→负责票→验证”表。T-09/T-12 写集在此之前保持候选。
3. 核对永久 ADR/context 与 archived change 的相关来源及旧浏览器决策，记录被 Issue 明确取代的合同，保留历史原件，不假定全部归档已查。
4. 核对 package.json、测试参考与既有 acceptance 脚本；新增命令只有实际创建并运行后才可作为 evidence。

## 其他 change 的协调点

#37 拥有全局 shell、设计规则、生命周期、包体治理；本 change 只加浏览器内容与实际集成，不改永久设计。#36 拥有 Bot Go/Eino/HAP；相关 wire 变动先协调其 owner。公共 API / composition / module / i18n 是集中集成资源，不能让不同票因文件不同就并发改同一语义。项目源、外部 SDK 与用户数据不是规划文件可授权删除的对象。
