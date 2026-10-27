// Package policy contains bounded collaboration rules. Persistence and trusted
// execution identity are supplied by the application, never model arguments.
package policy

import (
	"math"
	"strconv"
)

type Limits struct {
	Depth, Children, RootActive, ProfileActive, Wakeups int
}

var Defaults = Limits{Depth: 3, Children: 32, RootActive: 4, ProfileActive: 8, Wakeups: 8}

func Admit(l Limits, parentDepth, children int, closed bool) string {
	if closed {
		return "TASK_ADMISSION_CLOSED"
	}
	if l.Depth < 0 || l.Children < 0 || l.RootActive < 0 || l.ProfileActive < 0 || l.Wakeups < 0 {
		return "POLICY_NOT_CONFIGURED"
	}
	if parentDepth >= l.Depth {
		return "DELEGATION_DEPTH_LIMIT"
	}
	if children >= l.Children {
		return "DELEGATION_COUNT_LIMIT"
	}
	return ""
}

func Claim(l Limits, rootActive, profileActive int) bool {
	return l.RootActive > 0 && l.ProfileActive > 0 && rootActive < l.RootActive && profileActive < l.ProfileActive
}

// WouldCycle compares execution/thread IDs, not Agent names. The graph is read
// and the new edge inserted in the same transaction by its persistent owner.
func WouldCycle(edges map[string][]string, from, to string) bool {
	if from == to {
		return true
	}
	seen := map[string]bool{}
	queue := []string{to}
	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]
		if current == from {
			return true
		}
		if seen[current] {
			continue
		}
		seen[current] = true
		queue = append(queue, edges[current]...)
	}
	return false
}

func Quantity(s string) (int64, bool) {
	if s == "" || len(s) > 16 || len(s) > 1 && s[0] == '0' {
		return 0, false
	}
	for _, c := range s {
		if c < '0' || c > '9' {
			return 0, false
		}
	}
	n, e := strconv.ParseInt(s, 10, 64)
	return n, e == nil && n <= 9007199254740991
}

func Sum(a, b int64) (int64, bool) {
	if a < 0 || b < 0 || a > math.MaxInt64-b || a+b > 9007199254740991 {
		return 0, false
	}
	return a + b, true
}
