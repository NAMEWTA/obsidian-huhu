package bootstrap

// TEMPORARY diagnostic (remove before the final head): records drain phase
// timings and, only when Close exceeds its bound, prints them with a full
// goroutine dump to stderr so CI shows where shutdown was waiting.

import (
	"fmt"
	"os"
	"runtime/pprof"
	"strings"
	"sync"
	"time"
)

type stopDiag struct {
	mu     sync.Mutex
	start  time.Time
	phases []string
}

var stopDiags sync.Map // *Core -> *stopDiag

func (c *Core) diagPhase(name string) {
	v, _ := stopDiags.LoadOrStore(c, &stopDiag{start: time.Now()})
	d := v.(*stopDiag)
	d.mu.Lock()
	d.phases = append(d.phases, fmt.Sprintf("%s@%dms", name, time.Since(d.start).Milliseconds()))
	d.mu.Unlock()
}

func (c *Core) diagTimeout() {
	v, _ := stopDiags.Load(c)
	var phases string
	if d, ok := v.(*stopDiag); ok {
		d.mu.Lock()
		phases = strings.Join(d.phases, " ")
		d.mu.Unlock()
	}
	var b strings.Builder
	_ = pprof.Lookup("goroutine").WriteTo(&b, 2)
	fmt.Fprintf(os.Stderr, "HUHU-STOP-DIAG phases: %s\nHUHU-STOP-DIAG goroutines:\n%s\nHUHU-STOP-DIAG end\n", phases, b.String())
}
