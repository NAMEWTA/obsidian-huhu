# 默认 HAP 模型测试预期维护

Map30/Goal29仅重开T02的tests/contract/assistant/hap_test.go，由原credential_provider修正默认Responses已装配后的过期未装配断言；生产/API/凭证/锁及110/114测试只读。Root原单例实际exit1/Wait1.946400363秒，固定2032输入且无漂移；先观察实际fault，再最小迁移预期，保留strict DTO/秘密拒绝，并运行assistant整包覆盖同类默认消费者。原Responses及本轮Root Anthropic E2E历史证据保留，最终共同输入包含这项测试维护。全部28票55AC、DAG与用户现场后验不变。

原断言以默认Core的openai-responses为ADAPTER_NOT_ASSEMBLED，未指定credentialRef。Root实际原红发生hap_test.go:59，编译与strict DTO前段通过；原日志只打印指针，实际安全fault须由122在不修改生产的条件下观察。预期CREDENTIAL_MISSING仅为待验证假设。显式Chat-only selector的未装配负控保持。

唯一产品测试写集：<Path>native/huhubot/tests/contract/assistant/hap_test.go</Path>。122独占Go窗口后先保留before与实际fault，再只改此过期预期及必要诊断；一次assistant全包检查合理覆盖已连续发现的默认装配消费者遗漏。不要求全module/race/build。117/118/119/120全部生产停写，Root E2E r1既有2032输入和不可变快照保留，不覆写r1结果。
