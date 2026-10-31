# 发布交接：一个文档与原型 PR

## 当前事实

用户授权文档/原型PR→dev；当前GitHub connector仅提供GET/read，插件搜索未取得写动作，Browser为Chat只读，容器clone失败于DNS。未发生远程写入，因此没有可报告的PR URL。发布不是后台任务。

## 在具备写入能力的完整仓库中执行

1. 读取当前dev与Issue正文/全部评论，比较 `974105b47e03c108df0f5e0c3fc9606fe4b79aee`、Issue updated_at、DESIGN-0002 digest与#38公共合同。先搜活动/归档change的canonical locator；已有#39 change时恢复原owner，不能新建重复状态根。发生漂移新增sources/SRC-002并更新受影响文档，不覆写冻结source。
2. 确认工作区干净、无同名新change；在最新dev创建单个分支 `docs/issue-39-huhubot-pi-refactor`。补丁只新增本change；不要直接覆盖用户未提交文件。
3. `git apply --check` 后应用随包补丁，或复制ZIP中的 `.agents/` 相对目录；确认diff只落本change。
4. 按五个Work运行其原生阶段validator，ticket-control的map只读检查，以及设计包验证；补充精确source/skill hashes/配置与dedup事实。原型未用户确认时保持draft，这不是通过伪批准来修validator错误的理由。修真实格式错误，保留真实阻塞。
5. 复跑包内文档/浏览器补充自检并回读生成报告；全仓docs check按实际范围执行。纯文档不要求构建插件；不得谎称构建/宿主门通过。
6. 只stage本change，检查patch和敏感数据，提交并push此分支，创建target dev的**一个文档评审PR**，正文用PR-DRAFT.md，`Refs #39`而非`Closes #39`。新UI与技术条件未确认时可用draft PR明确评审状态。
7. 远程create超时先按head/base/稳定marker查询，确认是否已存在，禁止盲目重复create。成功后读取真实PR URL/base/head/文件列表，再记录Delivery回执。不要自动merge、删分支或关Issue。

## 命令示例（本轮未执行）

以下在具备认证的用户仓库运行，先确认第1–5步。补丁路径替换为实际下载路径；gh不是本环境已提供的工具。

```sh
git fetch origin dev
git switch -c docs/issue-39-huhubot-pi-refactor origin/dev
git apply --check /path/to/huhubot-issue39-docs.patch
git apply /path/to/huhubot-issue39-docs.patch
# 在此运行正式工作流与适用验证；修复后继续。
git add -- .agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor
git diff --cached --check
git diff --cached --stat
git commit -m "docs(huhubot): 补全 Pi 重构文档与统一 UI 原型"
git push -u origin docs/issue-39-huhubot-pi-refactor
gh pr create --base dev --head docs/issue-39-huhubot-pi-refactor --draft \
  --title "docs(huhubot): Issue #39 Pi 重构规格与统一 UI 原型" \
  --body-file .agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/PR-DRAFT.md
```

请求创建PR前再次搜索同head/base，避免同名分支或已创建PR的重复操作。没有真实回执时完成状态只能写“未发布/待核对”。
