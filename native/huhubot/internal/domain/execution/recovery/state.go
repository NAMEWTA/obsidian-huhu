// Package recovery defines the independent recovery admission state machine.
package recovery

// Open only after an explicit, revalidated resume. Inspection never executes.
func Open(state string) bool { return state == "resuming" }

func Terminal(status string) bool {
	return status == "succeeded" || status == "failed" || status == "canceled"
}
