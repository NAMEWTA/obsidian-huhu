---
schema_version: 2
session: "20261031T062046Z"
task: "035-hook-ci-bootstrap"
kind: implementation
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-12
---

## Goal
native:/root/baseline（Astra low）补齐T12首次远程验证的具体候选，本地改workflow与中文说明，绝不远程执行。现workflow未注册于默认分支，GitHub官方workflow_dispatch要求default branch存在，不能承诺推临时分支后直接dispatch。原20轮测量与测试源码冻结。

## Inputs
Ticket12、Map17、024报告、当前workflow和driver、execution-boundaries。官方来源 https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch 。Lead已只读查询远端workflows：不存在hook-windows。保持原AC311，Windows未执行不验收。

## Workspace and Scope
current/dev/base86c500556db1d64865c4cc7f1aff1dd83de071fa。只写.github/workflows/hook-windows.yml、docs/e2e/dev-overhaul/hook/README.md、docs/e2e/dev-overhaul/hook/artifacts-sha256.json（若原格式包含workflow需更新对应摘要），本REPORT。测试源码/driver/所有历史测量只读；不要改变原20轮结果。Git仅只读，不提交/推送/dispatch，不递归代理，不改正式Ticket/Evidence。

## Acceptance
采用限定专用临时分支codex/dev-overhaul-hook-validation的push触发作为首次启动，并保留workflow_dispatch；push情况下rounds明确20，manual范围维持1..100由driver校验，job最小contents read。没有default/dev分支触发扩张，没有PR触发。检查现有远端其他workflow触发条件，精确说明该临时分支push会额外触发哪些任务以及怎么约束；若会不可控触发广泛job先报告，不悄悄改别的workflow。先真实检查并报告计划，再本地编辑。中文README保留原官方引用与三个待上传文件（workflow、hook-spool.test.ts、measurement driver）、基于base的临时branch策略、20轮输出及20min资源上限、artifacts14days、Windows未验收。Lead审查后向用户确认具体远程写入/CI，不提前请求用户授权。静态YAML与表达式校验；由于仅workflow/docs变更不重跑20轮或生产构建。避免把临时分支准备等同实际成功运行。

## Return
标准REPORT列实际修改摘要、完整检查、远端潜在任务/确切审批方案及限制，候选停写。

### Lead追加决策：隔离远端验证提交

实际发现base lint workflow匹配全部push并运行Browser专项构建，不得用触发后取消规避。授权在OS临时目录/tmp/huhu-hook-ci-bootstrap/lint.yml准备基于固定base的remote-only覆盖文件：仅为现有lint job增加精确排除refs/heads/codex/dev-overhaul-hook-validation的if条件（有原条件就逻辑合并），其余字节/触发保持。本仓.github/workflows/lint.yml继续只读，不作为生产提交改动。此准备文件与正式3文件形成明确4文件远程测试commit候选；记录base和各SHA、解释该overlay只存在专用远程分支、不合入dev/default。检查全部job实际skip，该push不启动Browser任务。若其他push任务或worker原语有变化再次报告。授权仅本地可审查准备，远程创建branch/commit和CI必须最后由用户确认。
