# T06 恢复草稿与 native 动画采样修复

Session: 20261105T094057Z
Task: 077-repair-t06-recovery-native
Status: completed

## 聚焦交接
仅修075 R01和Root已证实的fixture动画采样时机；未重复实施档案。原始ISO分解正则现在也识别可辨识的未完成正负偏移前缀，真实保存草稿后恢复不再把偏移迁入time；原codec仍阻止非法值保存。fixture在所属Document等待有限Web Animations finished，取消使用allSettled安全结束，10秒上限失败并清理timer；不禁用产品动画，不放宽280/312、叶子范围、父iframe实际命中和键盘断言。三文件及完整40项T06候选已冻结，停止写入，交Root进行high独立审查和最终浏览器矩阵。

## 产物与验证
本轮真实dirty起点（不是HEAD）：/tmp/huhu-t06-final-repair/before/，逐项模式与SHA在before-manifest.json；HEAD和原始Git状态分别在head.txt、git-status-before.txt。完整候选：/tmp/huhu-t06-final-repair/frozen/；frozen-manifest.json SHA256 935e287139909231a6ea959e99e04e331c6c796435851bebdc580f5ebe29fda7。40项中仅本轮三项变化，其余37项逐字节/模式与074冻结候选一致；无新增/删除路径、未操作index/提交/资产/共享/词典/用户vault。

精确相对起点增删（numstat及patch在私有目录）：
- src/modules/archives/ui/generic/FieldRenderer.tsx：+1/-1；只扩展原后缀正则，未替换parser、schema或codec。
- src/modules/archives/ui/generic/offset-draft.dom.test.tsx：+90/-1；真实Application/RecordEditor/commands.drafts链，六种partial（+、-、+0、-04、+05:、-04:0）和三种完整偏移，保留秒/小数；非法恢复阻断旧值保存及合法/partial外部reset。
- scripts/ui-review/fixtures/frontend-redesign/T-06/index.mjs：+9/-1；Document有限动画等待，覆盖读取date rect/键盘以及所有实际click（含Month）。

实际命令与结果（日志在/tmp/huhu-t06-final-repair）：

| 命令 | 退出/观察 |
| --- | --- |
| pnpm exec vitest run --config /tmp/huhu-t06-shared-repair-review/vitest.config.mts /tmp/huhu-t06-shared-repair-review/offset-recovery.dom.test.tsx（生产修复前） | 126；075真实反例同样失败，original-red.log |
| pnpm exec vitest run --project dom src/modules/archives/ui/generic/offset-draft.dom.test.tsx（修复前） | 126；6种partial分段失败、7控制通过，expanded-red.log |
| 同075原始反例（修复后） | 0；1测试通过，original-green.log |
| pnpm exec vitest run --project dom src/modules/archives（最终） | 0；13文件62测试通过，archives-dom-final.log；原53测试+新增9参数用例 |
| pnpm exec vitest run src/modules/archives/services/generic/workbench.test.ts | 0；3测试通过，paging.log |
| pnpm exec eslint --max-warnings 0 src/modules/archives/ui/generic/FieldRenderer.tsx | 0；零警告，lint.log |
| pnpm exec tsc --skipLibCheck -p /tmp/huhu-t06-final-repair/tsconfig.json（最终） | 0；限定改变生产源/相邻测试的真实导入图，types-final.log为空；不是全仓类型结论 |
| node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-06 --matrix redesign --out /tmp/huhu-t06-final-repair/preflight --check | 0；生产fixture预检，preflight.log；不冒充浏览器矩阵 |
| node --check scripts/ui-review/fixtures/frontend-redesign/T-06/index.mjs | 0 |

新增测试最初的错误提示唯一性选择器碰到表单整体/字段同时alert，已按实际界面改为在恢复editor中断言存在invalid-value alert；所有早期失败日志保留，最终62通过。未删除或放宽分段、持久值和保存阻断断言。

## Design Conformance
继承DESIGN revision 3、digest 49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66，archives / UX-ARCH-1–3及UI-002。本轮无版式/主题变化；仅保持既有字段片段身份与真实动效完成后采样，DOM证据不证明像素/命中。Root诊断的原native320fine动画红灯是fixture修改依据；本执行者仅跑--check，修后真实动效、双Document最终矩阵待Root。

## 问题与下一步
本轮定向检查全部通过；高强度独立审查、最终native矩阵及全量build/lint/产物由Root负责。全局既有共享组件消费者迁移债不归因本轮；没有声称全仓构建通过。075 R02 host promise由Root另修。本任务未改正式Evidence/state/永久知识；REPORT一次写入后保持不可变。
