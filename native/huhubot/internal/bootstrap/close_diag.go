package bootstrap

// TEMPORARY Windows CI diagnostic for EXECUTOR_STOP_TIMEOUT; removed with the fix.

import (
	"fmt"
	"os"
	"runtime"
	"sync"
	"time"
)

var drainStages sync.Map

func (c *Core) drainStage(stage string) {
	drainStages.Store(c, fmt.Sprintf("%s at %s", stage, time.Now().Format("15:04:05.000")))
}

func (c *Core) reportCloseTimeout() {
	if os.Getenv("HUHU_BOT_CLOSE_DIAG") == "" {
		return
	}
	stage, _ := drainStages.Load(c)
	buf := make([]byte, 2<<20)
	n := runtime.Stack(buf, true)
	fmt.Fprintf(os.Stderr, "HUHU_BOT_CLOSE_DIAG now=%s stage=%v\n%s\nHUHU_BOT_CLOSE_DIAG end\n", time.Now().Format("15:04:05.000"), stage, buf[:n])
}
