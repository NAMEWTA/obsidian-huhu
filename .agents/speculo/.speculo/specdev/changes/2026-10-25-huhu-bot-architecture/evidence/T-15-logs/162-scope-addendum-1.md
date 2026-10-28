# 162 精确入口补充

Root确认162请求，T04原writable_paths已包含internal/application/execution/events/**。在当前TASK162目标内额外允许native/huhubot/internal/application/execution/events/service.go的WithDelivery validKind仅增加memory_proposal；其余行为保持。该公共业务入口是既有物理门必经处，不把adapter实现误当完整入口。新增文件纳入162源清单，仍source-only，无Go/DB；不改冻结TASK。
