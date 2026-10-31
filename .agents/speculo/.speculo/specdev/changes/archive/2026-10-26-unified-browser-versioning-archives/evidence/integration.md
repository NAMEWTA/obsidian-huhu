# 本地 PR 整合与验收记录

> 本文件下文记录 PR #4/#5 合并到 `265e65f` 时的历史验证。472 测试、25 宿主场景和构建摘要只属于该历史提交，不是 SRC-010 后续实施工作区的通过证据。当前实施与独立审查见各票 `T-*.md`、固定 review-input 和原始 review-report；最终联合构建尚未执行，真实验收由用户负责。

Session: native:root

## 授权与固定输入

用户明确要求将 PR #4/#5 合并到当前分支；此授权包含必要冲突解决、构建验证和本地 merge commit。工作区/branch/base 的唯一上下文见 [README](../README.md)。已有 `.agents/speculo/.speculo/managed.json` 修改未暂存、未提交、未覆盖；其补丁在本轮结束再次比较。

- 共同 base：33c21e098ef3188cbab5a09f3e0a01fadb787715。
- PR #4 head：b9f389101a178eaba99566ec805a2b44d5e2e01e。
- PR #5 head：206abb5182e55bdce820895c2e71eaafdc97b4e0。
- 先 fast-forward #4，再 merge #5；最终提交：265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa。
- 最终两 parent 恰为上述两个 head；两次 `git merge-base --is-ancestor <head> HEAD` 均退出 0。
- 远端重读 head/body 未漂移，仍 open，#5 仍 Draft；见 [重读记录](pr-recheck.json)。没有 push、远端 main 合并、评论或关闭。

## 冲突与必要整合修复

12 个冲突文件：四份 dev 参考、docs/workbench.md、main.js、styles.css、bundle-budget.json、third-party-notices.mjs、app contracts/module.ts、contracts/workbench.ts、compose-workbench.ts。

保留 browser、versioning、revision-review 的联合注册与来源 leaf/窗口复用；browser-materials 排除规则迁移到 versioning 后保留。许可扫描同时包含主入口、browser Worker/CLI 与 versioning 私有 diff Worker。main/styles 从联合源码重建，预算按联合产物实测 KiB 取整；禁止 eager 区域不变、模块预算保留两 PR 对应值。修正 UI shell 参考的旧浏览器入口说明，以及 PR #5 新锚点规则下 docs/data.md 的恢复链接。

## 本轮实际验证

环境 Linux x64、Node v26.11.1、pnpm 11.1.3；真实宿主为 Obsidian 1.13.7 / Electron 43.3.0，详见 versioning-host-result.json。以下日志均已保存在本目录。

| 命令/入口 | 退出/结果 | 证据 |
|---|---|---|
| pnpm install --frozen-lockfile | 0，锁文件保持冻结 | install.log |
| pnpm run build | 首次 1：选取的旧 styles 需重建；修复后最终 0 | build-final.log |
| pnpm run lint | 0，零警告 | lint.log |
| pnpm exec vitest run src/modules/browser src/modules/versioning src/modules/comments src/app/editor-panel src/app/workbench test/sync test/browser test/release test/documentation --maxWorkers=2 | 0，67 文件、472 测试通过 | tests.log |
| pnpm test:architecture | 0，1223 modules | architecture.log |
| pnpm test:i18n | 0，30 dictionaries、4925 keys | i18n.log |
| pnpm run lint:css | 0，无新增违规 | css.log |
| pnpm test:docs | 初次发现恢复链接不匹配；修正后 0 | docs-final.log |
| pnpm run check:bundle | 0，联合闭包均在预算内 | budget-final.log |
| pnpm run check:notices | 0，107 npm、62 terminal crates、41 browser crates | notices-final.log |
| versioning-history.mjs，一次性 vault、独立 CDP 端口、xvfb | 0，25/25，三组宿主未处理错误均为空 | host-versioning.log、versioning-host-result.json、versioning-host-host-errors.json |
| git diff --check / git diff --cached --check | 0 | 合并前后 Git 核验 |

宿主探针通过 HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian 启动，fixture 未配置 Git 远端。原运行参数的绝对路径已用可复现占位概念代替；按项目 fresh-vault 约定建立新目录即可。宿主自身使用夹具 --no-sandbox；本次未测试浏览器运行时 sandbox，不将两者混同。

main.js 与 styles.css 的最终摘要与 25 场景宿主记录严格匹配，见 [artifact 摘要](versioning-host-artifacts.json)。browser Worker/CLI/native 与 PR #5 固定 head 无差异；这只证明该组件输入未改变，不把原 PR 的 50 宿主/19 原生结果冒充新联合 main.js 的本轮结果。

## 边界、失败与尚待验收

- 已完成本地整合和当前检查，三个 Issue 整体仍未完成。
- 本轮未重新执行 browser 完整运行包/真实 Chromium/Obsidian 场景，未执行 Windows/macOS/最低宿主版本验收，也未跑全仓 test:all；这些不能从定向绿色推出。
- 两个 Rust helper 未在本轮重跑；browser native 源码与固定 PR head 相同，原 CI/实机证据是历史来源。
- 当前 change 的新 UI DESIGN 未形成；本轮未改业务 UI 布局，仅合并两 PR 已有功能与公共注册。
- 独立探索由 source_gap_analysis 原生协作者只读完成，报告已回读；本轮没有启动完整 C 双轴代码审查，不宣称完成独立 code review。
- GitHub CLI 读取退出 126 后使用连接器与固定 Git 对象完成读取；未发起远程写入，不存在未知远程写入结果。
- 待验证项写入 Spec，任何后续生产实现必须按对应 AC 新建实际证据；不会因本地合并自动关闭 Issue。

## 工件验证

Triage、Grill、Spec 三个 stage 均退出 0，0 errors / 0 warnings（允许有效 draft，不表示 UI Ready）。加入本 change 后文档检查退出 0；12 个冻结来源/差异文件摘要全部匹配，原 managed.json 补丁与操作前一致。
