# T-13 repair-1 独立双轴复核

Reviewer: native:/root/review_code
Implementers: native:/root/implement_t01（原实现及 repair-1；以 Lead 实际派遣记录核验）
Mode: native
Input: evidence/T-13-review-input-r2.json
Input-SHA256: 7c39d1e241259e5c96c654fc1a17d0911344a70ac46f397ce056e35d41ac1c59
Observed: 本 reviewer 未参与实现或修复，沿用原独立身份；只读审查源码与来源，唯一持久写入为本报告，未再次派遣。r1 报告原样保留，本报告是新快照的重新判断，未把原 request-changes 改写为 pass。

## 固定范围与复核方法

输入对象经 JSON.parse → JSON.stringify 后计算 UTF-8 SHA256。开头与结束均逐一核验 25 个 working_snapshot 文件的原文字节及模式、27 个 sources 的原文字节；无漂移。HEAD/base 为 `265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`；`git ls-files --stage -z` 与固定 `tracked_diff_command` 的摘要均匹配输入。新增未跟踪文件实际读取，未以 Git tracked diff 代替完整交付快照。全工作区 inventory 包含其他活动 writer，不把其范围外变化混入本票。

与 r1 比较，实际变化/新增的 10 个文件全部重新审查：module.ts、platform/desktop/local-history-protection.ts、locate.ts、local-history-cancellation.test.ts、platform/obsidian/history-capture.ts、history-capture.test.ts、history-lifecycle.test.ts、services/automatic-history.ts、automatic-history.test.ts、local-history-store.ts。其余 15 个文件内容与 r1 完全相同；结合原阅读重新核对调用兼容和本次修复影响，未因只看修复差异遗漏原用户入口、查询/比较与设置消费者。

来源发现沿 r1 的 AGENTS、dev/ui、Spec AC-017、ADR-003、DESIGN PAGE-003、批准记录、原始 Issue 条款及 SRC-010；当前来源字节匹配。r2 已补入 Ticket、Map、批准原型与相关 docs/review 合同，均在固定 sources 内。读取 result-reuse 合同，未复用 r1 的失败结论作为本次通过依据；只复用未变化来源的已读知识，重新审查受影响两轴。新增 locate.ts 同时核对 desktop/host.ts 的原有 locateGit 消费者：可选 signal 维持原调用兼容，发现顺序/单候选 10 秒限制保留，命令转由已有 Git runner 管理取消与子进程生命周期。

## standards-output

Reviewer: native:/root/review_code
Axis: standards
Result: pass
Input-SHA256: 7c39d1e241259e5c96c654fc1a17d0911344a70ac46f397ce056e35d41ac1c59
Observed: 重新审查修复、全部新文件与直接消费者，未发现本固定范围内需要请求修改的新问题；r1 的三项标准轴问题满足本轮代码修复条件。

| r1 finding | 实际修复与回归判断 |
|---|---|
| STD-01：过期 previous / 排队捕获使 rename/delete 后旧身份复活 | `history-capture.ts:50` 在 rename 时立即更新/清除 previous，delete 同时清除 previous 并将旧 TFile 放入 retired 集合，避免仍挂载叶重新采集已删对象。`automatic-history.ts:31`、`:37` 同步取消旧/目标路径的 pending capture，身份迁移排入同一 tail；已进入对象/index 写入的工作随后由迁移退役映射，不发布可再次查询的旧路径。迁移提交后再次增加 revision，消费者能看到完成后的历史。新 lifecycle 测试覆盖普通 rename、隐藏/config 移动、delete/recreate、预检延迟以及对象/index 在途写入。独立内存探针重放 r1 普通 rename 和隐藏移动反例：旧路径保持 0，新路径历史保留 1；同名重建只读到 `['recreated']`；隐藏移动后原可见路径历史保持 0。 |
| STD-02：stop 未取消 Git preflight 且阻塞其他资源清理 | `AutomaticHistory` 的 lifetime → operation signal 传入保护预检；`local-history-protection.ts` 传到 locateGit 和各条 repo.git；`locate.ts` 的发现也走已有可取消 runner，取消不降级为尝试下一个候选。`module.ts:352` 先发起 history stop，立即停止同步时钟/review，并并发等待 restore/service/history 清理结果，避免其余资源依赖慢预检。新增 cancellation 测试使用可控 POSIX 子进程，分别挂起 discover/root/tracked/ignored 四个阶段，断言取消后实际 PID 不再存活；另验证关闭、重新开始、计时器与订阅均不遗留。独立运行全部通过。 |
| STD-03：空采样将未修复的存储错误清成 ready | `automatic-history.ts:86` 将空采样视为无工作，只等待既有 tail，不清除错误；只有实际 capture 验证成功后才进入 ready。错误状态下即使内容散列未变也重新验证；`local-history-store.ts:80` 重新加载 writer，散列相同的对象也读回校验，不以缓存命中假装存储恢复。新增回归明确保留损坏 index 字节及 error，修复索引并成功采样后才清除。独立运行通过。 |

补充检查了 per-path 控制器撤销与监听器清理、只剩部分有效 capture 时的串行处理、取消后的状态恢复、relocate 的异常传播、stop/start 的定时器与订阅、JSON 索引写入与返回值采用。修复没有引入跨模块内部导入、笔记 writer、自动 Git commit、永久知识写入或无关重构。Fowler 启发式未形成需要报告的行为风险；未重复报告工具已经约束的纯格式项。

Findings: []

## specification-output

Reviewer: native:/root/review_code
Axis: specification
Result: pass
Input-SHA256: 7c39d1e241259e5c96c654fc1a17d0911344a70ac46f397ce056e35d41ac1c59
Observed: 按 T-13 实施合同、Spec AC-017、ADR-003 与 DESIGN PAGE-003 分别核对产品闭环与失败语义；r1 的三项规范轴问题已修复，本轮未发现新增规范偏离。

- SPEC-01：普通 rename 保留合法 lineage；隐藏/config 目标和已删除 TFile 不再以旧 previous 或旧排队 capture 重建可见路径。新建同名文件获得独立历史。判断依据是 host adapter → AutomaticHistory → LocalHistoryStore 的实际代码和独立反例执行，非仅检查测试名称。
- SPEC-02：关闭/取消实际到达保护预检和 Git 发现子进程；模块其余同步资源独立开始清理。代码和定向 POSIX 进程测试支持取消合同，未将其扩大为真实 Obsidian 或 Windows taskkill 实机通过。
- SPEC-03：无可采集叶时持续保留未解决错误；实际存储重新验证成功才清除。状态仍由原侧栏、工作台与设置消费者展示，错误状态的 UI 接线没有因修复中断。
- 正常闭环仍是原命令/菜单 → 历史侧栏 → 本地快照查询与按需正文读取 → 比较页；inline 端点不要求 Git。默认关闭、主动开启、设备范围 5 分钟设置、事件触发、内容散列去重、包含未保存 buffer、采样不保存笔记/不提交 Git 的边界保持。B 的捕获时刻与显式刷新仍由原 review 服务维护。无 Git 时恢复按钮禁用是本轮明确安全边界，查询比较可用。
- 设计引用保持 revision 2 / digest `f04a5aabaa7a57dbdaa17cb89ae611d40a7c32fe948317ac641818bd38224b9c` / PAGE-003。修复未改原型或页面布局；继承实际原型与生产组件的既有代码对照，不把原型截图等同实际渲染验收。设置默认 30 天、1024 MiB 保持；T-14 回收未实现不属于本轮通过声明。

Findings: []

## 本轮独立执行与限制

实际执行：

```text
pnpm exec vitest run --no-cache \
  src/modules/versioning/platform/obsidian/history-lifecycle.test.ts \
  src/modules/versioning/platform/desktop/local-history-cancellation.test.ts \
  src/modules/versioning/services/automatic-history.test.ts

Test Files 3 passed (3)
Tests 18 passed (18)
Duration 2.25s
```

另用 Node + esbuild `write:false` 在内存重放 r1 rename/同名重建/隐藏移动反例，调用生产类并使用项目 Obsidian 类桩，得到上述修复结果；未写入额外源码或测试文件。定向测试的受控临时目录/子进程由测试清理，不触碰真实用户库。

作者报告的 22 文件/138 测试、architecture、定向 lint、diffcheck 为上游证据，本 reviewer 未重复整套测试，也未将其当作独立代码判断。全局 TypeScript 检查由 Lead 在跨模块稳定后执行；本 reviewer 未运行或声称全局编译已通过。生成物由 T-32/Lead 管理，本票审查不声明最终 main.js/styles.css 与全 change 一致。

按 SRC-010，真实 Obsidian 主窗/popout、实际未保存 buffer 的宿主事件顺序、Windows/macOS/Linux 实机矩阵、性能、人工视觉/明暗/1440 与 390/键盘焦点均为 user-owned / not-run。受控 POSIX 子进程自动测试只证明本次取消接线与进程结束，不证明完整平台或宿主验收。目录 rename 的真实子文件事件时序仍留给宿主验收；本轮未把单独 TFolder 桩事件当作缺陷。T-14 保留策略及其他活动 browser/archives writer 排除在本次结论外。

Summary-Counts: standards=pass / 0 findings；specification=pass / 0 findings；skipped_axes=none。
Disposition: r2 固定范围双轴代码审查通过；不等于整个 change 完成或真实验收通过。源码、原 r1 报告、Ticket/Map/正式 Evidence 均未改写。已完成本轮审查并停写，交 Lead 核验派遣、固定输入和集成状态。
