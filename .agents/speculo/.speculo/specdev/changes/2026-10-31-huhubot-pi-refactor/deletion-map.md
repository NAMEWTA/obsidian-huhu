# 旧 Bot 删除与替换闭包

这是未来 T-02/T-23 的清单，不是本轮已删除记录。读取基线 `974105b47e03c108df0f5e0c3fc9606fe4b79aee`。禁止把规划中的路径误写成已实现新路径；未做全仓引用图的部分明确留待发现。

| ID | 对象 / 已确认依据 | 未来动作 | 责任与销账证据 |
|---|---|---|---|
| DEL-01 | native/huhubot，根 AGENTS/dev skill 声明 Go 底座 | 删除 Bot Go/Eino 源码、专属依赖与发行资产 | T-02 枚举引用，T-23 删除，T-24 实包扫描 |
| DEL-02 | contracts/hap/v0.1（根 AGENTS 声明）；旧 core/protocol/connection import（module.ts 已读） | 找全 Bot HAP schema/generator/codec/stdio/client，原子替换消费者 | 不以目录名推定无非Bot消费者；owner 图闭合后删 |
| DEL-03 | src/modules/huhubot/module.ts、manifest.ts、api.ts（已读） | 保留模块标识/工作台接入，整体替换旧 API/装配 | 无 deprecated compatibility alias；消费者清单与类型检查 |
| DEL-04 | platform/desktop/runtime/client-runtime、services/workbench/workbench-client（module.ts imports） | 旧执行链被新 runtime/client 替代 | 不保留 Go fallback；文件全量内容需 T-02 核对 |
| DEL-05 | 旧 chat/agents/groups/memory/tasks/access/approvals/data 页注册（module.ts） | 替换为新 UI；旧路由处理明确不作兼容承诺 | bundle 不含同时活跃新旧UI；共用组件不得误删 |
| DEL-06 | package.json: build:huhu-bot、check:huhu-bot | 用 Pi runtime 资产构建/验证替代 Go 构建 | 聚合 scripts/CI/release 一起改，不能把检查改 skip |
| DEL-07 | test:huhu-bot-tooling → scripts/huhu-bot-build.test.mjs / huhu-bot-notices.test.mjs | 删除仅适用旧工具链的断言，保留有效发行与许可不变量 | 新 runtime 闭包/安装测试真实补齐 |
| DEL-08 | test:huhu-bot-architecture → verify-huhu-bot-architecture.mjs | 更新独立模块/新层次/无旧协议静态守卫 | 不放宽全仓架构规则 |
| DEL-09 | bench:huhu-bot → bench-huhu-bot.mjs | 变更测量对象并保留机器/夹具/原始值 | 不编造前后百分比；说明不可比旧基线 |
| DEL-10 | package/lock/manifest/digest/downloaders/CI/release | 只清理由真实依赖图证明 Bot 专属的项 | T-02 全文搜索与 import/release graph；路径暂未穷尽 |
| DEL-11 | docs、settings、i18n、notices | 替换 Go Runner 安装、HAP、EOF 旧说明；声明新依赖 | en/zh UI 完整；仓库维护文档中文；许可证原文保留 |
| DEL-12 | 原 OS 本地 Bot Profile/旧会话/审批 DB | 不自动读为新格式、不迁移、不自动删除 | T-14 演示独立根与显式清理；旧文件 hash 前后保持 |

## 明确保留清单

`src/modules/agent/`、其 CLI/PTY/runtime、`native/pty-server/` 与 cargo 检查、Browser 模块与其改造、其他业务 public API、通用 secret-protector、workbench、shared UI、存量用户文件全部保留。`generate:pi-profiles` 虽含 Pi 名称，可能服务 CLI agent；没有消费者证据前禁止删除。Browser 的 build/check/native 脚本归 #38，不借 Bot 重构清空全部 native。

## T-02 枚举方式（未来执行命令，不是本轮已跑）

```sh
rg -n 'native/huhubot|huhu-bot|contracts/hap|BotRpc|client-runtime|BOT_RUNTIME' src native scripts contracts .github docs package.json pnpm-lock.yaml
rg -n 'huhubot|huhu-bot|eino|HAP' esbuild.config.mjs scripts .github docs
```

搜索命中不是自动删除授权。逐项分成 Bot-exclusive / shared-owner / data-only / historical-source；历史冻结 Issue/来源文档可以包含旧术语，生产代码和发行闭包不可以。存档资料的历史引用不能让“旧术语零命中”伪门禁误删来源证据。

## T-23 销账格式

每行增加真实 path、消费者、替代 owner、fixed commit、删除/替换 diff、静态守卫、功能回归证据。只有源码、构建脚本、打包资产、发行清单与文档都一致才销账。开发阶段可在单分支逐步替换，但生产发行只能有一个新 Bot 路径；禁止留下隐藏 flag 启用旧 Runner。

## 回退与数据

文档阶段无数据回退。未来发布失败撤回发行包并保留新/旧数据备份，不承诺旧 Runner 能读新数据库，不在新产品内常驻双引擎。显式 downgrade 风险由发行说明记录；新根与旧根严格隔离。
