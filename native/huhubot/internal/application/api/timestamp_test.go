package api

import (
	"sort"
	"testing"
	"time"
)

// SQL orders persisted instants as text; their strings must sort in time order
// even when the clock (macOS: microseconds) leaves trailing fractional zeros.
func TestTimestampLayoutSortsAsTextInTimeOrder(t *testing.T) {
	base := time.Date(2026, 10, 30, 13, 1, 24, 0, time.UTC)
	instants := []time.Time{base, base.Add(450 * time.Millisecond), base.Add(500 * time.Millisecond), base.Add(500*time.Millisecond + time.Microsecond), base.Add(550 * time.Millisecond), base.Add(time.Second)}
	text := make([]string, len(instants))
	for i, v := range instants {
		text[i] = v.Format(TimestampLayout)
		back, e := time.Parse(time.RFC3339Nano, text[i])
		if e != nil || !back.Equal(v) {
			t.Fatalf("%q does not parse back to %v: %v", text[i], v, e)
		}
	}
	if !sort.StringsAreSorted(text) {
		t.Fatalf("text order differs from time order: %q", text)
	}
	if a, b := base.Add(500*time.Millisecond).Format(time.RFC3339Nano), base.Add(550*time.Millisecond).Format(time.RFC3339Nano); a < b {
		t.Fatal("fixture no longer shows the RFC3339Nano ordering hazard")
	}
}
