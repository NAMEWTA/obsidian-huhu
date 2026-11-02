package events_test

import (
	"bytes"
	"runtime"
	"testing"
)

// logProjectStacks is failure-only evidence for the Windows Runner, where a
// Profile connection has been held past the 30s liveness and 3s stop bounds:
// it shows which goroutine holds it. Only goroutines with this module's frames
// are kept, and the log is bounded.
func logProjectStacks(t *testing.T) {
	t.Helper()
	buf := make([]byte, 8<<20)
	buf = buf[:runtime.Stack(buf, true)]
	var out bytes.Buffer
	for _, g := range bytes.Split(buf, []byte("\n\n")) {
		if bytes.Contains(g, []byte("obsidian-huhu/native/huhubot/internal")) && out.Len() < 256<<10 {
			out.Write(g)
			out.WriteString("\n\n")
		}
	}
	t.Logf("project goroutines at failure:\n%s", out.Bytes())
}
