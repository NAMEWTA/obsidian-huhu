# T-27 HAP 生成器 lint 分类修正回报

Session: 20261025T043239Z
Task: 009-tooling-lint
Status: completed

## 聚焦交接

已将 HAP schema 生成器按 Node 构建工具分类，解决它被插件 TypeScript projectService 接管后报错的问题。唯一生产改动位于 `eslint.config.mts`，沿用现有 `scripts/**` 工具边界并精确列出生成器路径，注释说明理由。完整 `pnpm run lint` 已退出 0，零警告。工程 writer 和子进程已停止；本次 completed 仅表示这项修复候选交回，T-27 的后续集成及正式验收仍由 Lead 管理。

## 产物与验证

- 生产写集：`eslint.config.mts`，只新增注释和 `contracts/hap/v0.1/generate.mjs` 的精确 global ignore。既有 src/插件规则、projectService 配置和其余忽略项原义均保留。
- 源码 SHA-256：`910f79dcf2359611786732378565f115f02e4c2c11524571674351c08ab80e31`。工作区 HEAD/基线为 `33c21e098ef3188cbab5a09f3e0a01fadb787715`，修复保留在未提交工作副本。
- 原始失败回读：`evidence/T-01-logs/lint.log`，唯一错误是生成器不在 TypeScript projectService 项目内；没有修改生成器、TS/Go/schema 或 dev 规则来绕过检查。
- 验证：在仓库根运行完整 `pnpm run lint`，stdout/stderr 保存于本任务 [lint.log](lint.log)，实际进程退出码 0，调用的命令为 `eslint . --max-warnings 0`，无错误或警告。
- 验证：`git diff -- eslint.config.mts` 确认仅两行分类改动；`git diff --check -- eslint.config.mts` 退出 0。
- 未运行：build、Go 或产品运行验证；本次仅改 lint 工具分类，不使这些既有结果失效。未提交、推送、升版本、发布或派遣其他 Agent。

## 问题与下一步

本次修复无未解决问题。Lead 可继续回收独立审查和正式 Evidence；本次没有修改 T-01 的审查冻结输入、其他任务状态或生产文件。报告交回后停止 writer。
