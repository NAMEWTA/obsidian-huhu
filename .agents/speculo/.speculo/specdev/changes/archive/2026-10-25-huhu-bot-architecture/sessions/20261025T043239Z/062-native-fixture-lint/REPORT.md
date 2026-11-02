# 原生集成夹具 lint 范围候选

Session: 20261025T043239Z
Task: 062-native-fixture-lint
Status: completed

## 聚焦交接

062已完成唯一 `eslint.config.mts` 修改并停写：沿既有scripts/test工具约定，仅将两个Go合同使用的Node/Obsidian受控夹具列入明确排除，并附实际原因。原生/src目录没有新增宽泛排除，生产connection.ts、obsidian-host.ts的全部有效规则、parser/projectService与globals保持一致。本作者仅验证配置范围，不运行全仓lint或声称被排除夹具的行为已通过；Root接续唯一全lint重跑。T27完整工程/发行资产及真实操作仍未完成。

工作区 `/home/wta/orca/workspaces/obsidian-huhu/bot`、branch `NAMEWTA/bot`、HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`；Map16/Goal15、LOG082。TASK SHA `133e8a97ba484e6b520f7f758e81013e08dda30a9d9ba5b290aad9a7ad1da8b4` 已核验。按已读AGENTS/I及dev对应testing/build规则执行，不再委派、提交、推送、发布或写正式状态。

## 产物与验证

### 原失败与实际调用

完整读取Root [lead-lint-r2.log](../../../evidence/T-07-logs/lead-lint-r2.log)：`pnpm run lint` / `eslint . --max-warnings 0` 仅两个projectService parsing错误，脚本诊断exit1；Root实际工具返回126/已Wait。两文件不在插件tsconfig项目，现有allowDefaultProject也不匹配。该原失败不是作者重复执行或覆盖的日志。

实际回读两份MJS及 `native/huhubot/tests/contract/effect-reconcile/host_ts_test.go`：Go读取host-fixture.mjs，将 `__REPO__` 替换成真实repo位置后写临时source，再用esbuild按Node22/CJS打包，obsidian别名指向obsidian-fixture.mjs。生产HAP/Host类来自src，夹具只控制外部边界，不是插件生产TS入口；因此沿原scripts/**、test/**和*.test.ts范围处理。没有改夹具、tsconfig、API、锁或生产规则。

### 精确差异

只在现有globalIgnores中新增两条完整路径和两行理由：

- `native/huhubot/tests/contract/effect-reconcile/host-fixture.mjs`
- `native/huhubot/tests/contract/effect-reconcile/obsidian-fixture.mjs`

[change.patch](change.patch) 是相对本TASK起始真实内容的完整差异；[eslint.before.mts.txt](eslint.before.mts.txt) 保留旧字节。验证时移除上述精确新增块后，与原配置完整字节相同；没有更改allowDefaultProject、其他ignore或任何rule。

| 配置 | SHA256 |
|---|---|
| 修改前 eslint.config.mts | `910f79dcf2359611786732378565f115f02e4c2c11524571674351c08ab80e31` |
| 修改后 eslint.config.mts | `8919409df0b5c8b8f385873bc5deba54d556c200366207b15e3583c2597eb5c3` |

### 实际范围检查

使用真实 `node --input-type=module` 执行ESLint API：`new ESLint()`、`isPathIgnored(path)`、`calculateConfigForFile(path)`。修改前后独立加载配置，完整保存两个生产文件的rules、parserOptions、globals及parser meta；随后deepEqual并验证精确配置差异。实际退出0，见 [scope-validation.json](scope-validation.json)、[before-effective-scope.json](before-effective-scope.json)、[after-effective-scope.json](after-effective-scope.json)。

| 路径 | 修改前ignored | 修改后ignored | 说明 |
|---|---|---|---|
| 两个精确MJS夹具 | false | true | 与既有测试工具分类一致，calculateConfigForFile返回undefined；不是行为检查结论 |
| `src/modules/huhubot/core/protocol/connection.ts` | false | false | 有效配置存在，全部生产规则/语言配置逐项相同 |
| `src/modules/huhubot/services/host-write/obsidian-host.ts` | false | false | 同上，未放宽Host生产规则 |
| 同目录虚拟 `neighbor-fixture.mjs`、native/huhubot下虚拟 `production-neighbor.mjs` | false | false | 仅查询配置，不创建文件；证明不是目录级排除 |

`git diff --check -- eslint.config.mts` 与保护摘要核对实际exit0，见 [final-freeze-check.log](final-freeze-check.log)。[final-inputs.json](final-inputs.json) 固定旧/新配置和保护来源，manifest SHA `c921e2a0900ad95421b83d496c8cc08aa9387624484e0a8ef15c701638b8d32c`；两夹具、两生产文件、两个tsconfig、main.js/styles.css与package/lock均保持开始字节。

没有对ignored文件运行lint后以退出0冒称通过，没有关闭生产规则。未重复Go合同、Host、TS151测试或build；Root已绿的原同输入行为证据继续保留，相关fixture和生产源码未变。全仓lint未在本作者处重跑，最终结果由Root记录。

## 问题与下一步

无越界需求或未处理配置问题；自有ESLint API/读取/摘要命令均已等待退出，未启动Go/TS产品进程或后台writer。Root现在可在冻结新配置上运行唯一全仓lint；本completed只是候选交回，不代替该实际全lint结果或独立验收，也不标T27 done。

交回结构命令 `node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs --repo /home/wta/orca/workspaces/obsidian-huhu/bot --scope-root .agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture --session 20261025T043239Z --task 062-native-fixture-lint --stage return` 的真实输出及exit保存 [return-check.log](return-check.log)。
