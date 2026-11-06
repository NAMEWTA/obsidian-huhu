# Git 接入次按钮局部修正候选

Session: 20261105T094057Z
Task: 157-repair-versioning-primary
Status: completed

## 聚焦交接

实施者native:/root/cleanup_final；按157及Root单写合同实施，无委派。正式仓库仅本REPORT；未写源/样式/产物/状态/Evidence/index或原报告，无提交、用户vault/账号/clipboard及真实宿主操作。精确候选仅src/modules/versioning/ui/sync-presentation.tsx，noRepo同一actions组中Create repository保primary，Open settings显式variant=secondary。只增加这一prop；保原handler、busy/disabled、错误及Git初始化/clone语义，不改core/services。

## 产物与验证

真实before来自当前正式源，候选位于/tmp/huhu-versioning-primary/tree；独占冻结包每源含before/after SHA256/mode，冻结时源before匹配：

- /tmp/huhu-versioning-primary/ready.patch SHA256 dd30b8eb170d70a5326aa481171f21b509b6bffe6f4fac556756b377fded39ef。
- /tmp/huhu-versioning-primary/ready-manifest.json SHA256 21a40ee61f79aca3aac7024ecffacf482f8f49c9850e5b0e4fc52e08dd768589。

已读实际Button的默认primary/secondary生产变体，次操作显式选择已存在variant，不新增样式组件或文案。实际候选检查：

- node node_modules/vitest/vitest.mjs run src/modules/versioning/ui/sync.dom.test.tsx：0，1文件8项，tests.log。
- node node_modules/eslint/bin/eslint.js src/modules/versioning/ui/sync-presentation.tsx --max-warnings 0：0，lint.log。
- node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-16 --matrix redesign --out /tmp/huhu-versioning-primary/preflight --check：0，preflight.log；真实fixture编译图含候选源，status=preflight、0浏览器组合，不称矩阵通过。
- 正式根git apply --check --whitespace=error /tmp/huhu-versioning-primary/ready.patch：0，未应用。

低影响外观prop不加镜像单测，复用既有有意义渲染/流程回归。未运行类型全仓或生成资产。

## 问题与下一步

交Root与其余局部修正批量应用后看最终接入截图和既定矩阵。未运行正式66/858、真实Git接入宿主、Obsidian/popout或其它产品E2E；不是独立review，不裁定T16或T14通过。return0；return校验后停止157全部读写，继续158。
