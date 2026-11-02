# 任务回报

Session: 20261031T062046Z
Task: 015-docs-archive-links
Status: completed

## 聚焦交接

T03 文档门检查器修复候选已交回，四文件全部停写。归档增加一层后，旧正文中的相对引用不能直接从现位置解析；现在先查现位置，仅在真实匹配的移动收据证明原位置时回退。全部历史正文、receipt、reference map 和 T04 冻结的27项均未修改。completed 只表示候选交回，Lead 负责双轴验收。

## 产物与验证

### 范围与依据

current/dev，base HEAD 86c500556db1d64865c4cc7f1aff1dd83de071fa。只改 TASK 的四文件及本 REPORT，没有 Git 写入、递归派遣、依赖安装、插件构建或生成物写入。复用已读 dev/testing、SpecDev 实现和 research/source 合同，读取当前 policy/checker/tests 与真实 archive-receipt/reference-map；已有本地实现和收据足够解释问题，没有新增外部代码或许可推断。

- `scripts/documentation-policy.mjs`：增加纯收据原位置解析；只接受当前 SpecDev changes/archive/<id> 下文件，明确对象移动段中唯一且匹配的 Change、Source、Target、Result:moved。增加 Lead 后续明确批准的顶层 `contracts/hap/v<数字版本>/*.md` 分类。
- `scripts/verify-docs.mjs`：先按现位置和已有 file:line 规则解析；缺件才尝试上述收据证明的原位置，且旧 Source 必须不存在。收据必须真实普通文件且不越界，候选目标必须真实存在且 realpath 在仓库内。已有目标即使锚点错误也不回退；fallback 仍执行同一锚点检查。保留 exact colon filename 优先、正整数 file:line 语义与原 gitignored 日志策略，没有归档忽略名单。
- `test/release/documentation-policy.test.ts`：覆盖合法移动、无/错/重复字段、主动文档/路径穿越、限定合同分类。
- `test/release/documentation-checker.test.ts`：真实临时仓库中跑完整检查器，覆盖有效原位置+file:line、无收据/不合法收据、旧 Source 仍存在、真实缺件、坏锚点、当前位置优先、越界路径、逃逸 symlink、主动文档断链及合同文档断链。所有负向断言实际执行，没有 skip。临时仓库 git init 是原测试 fixture 的既有行为，没有修改共享仓库 Git 状态。

### 红灯与范围追加

首次 `pnpm test:docs` 退出126（包管理入口），内部 Node/lifecycle 退出1；原始日志 `/tmp/huhu-t03-docs-red.log`。实际为13项：TASK所列12处归档断链，以及本轮T04新增 `contracts/hap/v0.1/shutdown.md` 未分类。原12处是8个普通路径及4个 file:line，旧历史文件没有修改。

向 Lead 报告第13项后，Lead 明确批准在现有policy接缝为 `contracts/hap/v<数字版本>/*.md` 顶层文档归为 contract-doc，继续严格链接/锚点检查；没有扩大成所有 contracts 忽略。对应正负例通过，未修改T04合同正文。归档修正无需依赖 archive-reference-map 白名单，未把“归档已移动”冒充协议 sealed 或历史验收通过。

### 实际命令与结果

环境：Linux、Node26.11.1、pnpm11.1.3。独立检查按工具编排并行运行；没有额外重型Go或插件构建。

| 命令 | 实际结果 |
|---|---|
| 初轮 `pnpm test:docs` | 126/内部1；上文13项真红灯 |
| 修后 `pnpm test:docs` | 0；1646 Markdown、2072 local links、1308 external links；外链未请求fetch；`/tmp/huhu-t03-docs-green.log` |
| `pnpm exec vitest run test/release/documentation-policy.test.ts test/release/documentation-checker.test.ts` | 0；2文件17测试，3.18s；`/tmp/huhu-t03-docs-tests.log` |
| `pnpm test:license-texts` | 0；3测试，无跳过；`/tmp/huhu-t03-license.log` |
| `pnpm check:notices` | 0；112 npm、73 terminal crates、41 browser crates、52 Go runtime/modules；`/tmp/huhu-t03-notices.log` |
| `pnpm run lint` | 0，零警告；`/tmp/huhu-t03-lint.log` |
| 四文件 `git diff --check` | 0 |

## 问题与下一步

无已知残余阻塞；交 Lead 验收。未运行插件构建，TASK明确无需；未执行Windows/macOS、外链网络可达性或归档协议sealed核验，不将其写成通过。早期003来源许可未核实边界及旧文档门失败保留，当前license/notices通过只说明本次工具检查事实，不回写旧报告。只对具有本仓库明确移动收据的当前布局支持原位置回退，无收据的历史不会被猜测恢复。

### 停写候选摘要

```text
ba308c302a07956deeaeab4440535a8fd9d673d14610c447e288ba96e1816a7b  scripts/documentation-policy.mjs
1efd8c26789801c725efb4324ac49b1c2ba26a0b7245828d15eb941a5f1fed02  scripts/verify-docs.mjs
66538bf3ae12685bb9fe6f31718b2e00852df9912759c8e553696bb700ceedf5  test/release/documentation-policy.test.ts
a19ef11b761b1fafc3d9ba334572fccba349ed25e89ea42a279d868c7f7406f1  test/release/documentation-checker.test.ts
```
