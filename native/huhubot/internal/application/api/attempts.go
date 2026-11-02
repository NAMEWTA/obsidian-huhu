package api

import "context"

// ModelAttempts is the only admission route for an actual provider HTTP attempt.
// Reservations never perform network I/O. Dispatch commits its fence before the
// callback starts outside SQL; callers settle only after the producer has ended.
type AttemptRequest struct {
	LogicalCallID              string
	RetryOfAttemptID           string
	InputEstimate, OutputBound string
	Purpose, AccountID         string
}
type AttemptReservation struct{ ID, RunID, RootRunID, Revision string }
type AttemptObservation struct {
	Knowledge                 string // known, estimate, unknown
	InputTokens, OutputTokens string
	ProducerEnded             bool
}
type AttemptReceipt struct{ ID, State, Knowledge, InputTokens, OutputTokens string }
type ModelAttempts interface {
	Reserve(context.Context, AttemptRequest) (AttemptReservation, error)
	Dispatch(context.Context, AttemptReservation, func(context.Context) error) error
	Settle(context.Context, AttemptReservation, AttemptObservation) (AttemptReceipt, error)
	AbortUnsent(context.Context, AttemptReservation) error
}
type AttemptBinder interface {
	BindAttempts(context.Context, ToolExecution) (ModelAttempts, error)
}

// ExecutionLimits are visible policy limits, separate from HTTP producer slots.
type ExecutionLimits struct {
	MaxDepth        int `json:"maxDepth"`
	MaxChildren     int `json:"maxChildren"`
	RootChildren    int `json:"rootChildren"`
	ProfileChildren int `json:"profileChildren"`
	MaxWakes        int `json:"maxWakes"`
}

// ValidExecutionLimits permits explicit lower bounds while preserving Spec's
// hard maxima. The all-zero construction option is resolved to defaults first.
func ValidExecutionLimits(l ExecutionLimits) bool {
	return l.MaxDepth >= 0 && l.MaxDepth <= 3 && l.MaxChildren >= 0 && l.MaxChildren <= 32 && l.RootChildren >= 0 && l.RootChildren <= 4 && l.ProfileChildren >= 0 && l.ProfileChildren <= 8 && l.MaxWakes >= 0 && l.MaxWakes <= 8
}

type BudgetPolicy struct {
	RootTokenLimit        string `json:"rootTokenLimit"`
	ProfileTokenLimit     string `json:"profileTokenLimit"`
	MaintenanceTokenLimit string `json:"maintenanceTokenLimit"`
	Paused                bool   `json:"paused"`
}
type BudgetQuery struct {
	ProfileID string `json:"profileId"`
	RunID     string `json:"runId,omitempty"`
}
type BudgetSettings struct {
	RootRunID      string          `json:"rootRunId,omitempty"`
	AccountID      string          `json:"accountId,omitempty"`
	RootTokenLimit string          `json:"rootTokenLimit,omitempty"`
	ReservedTokens string          `json:"reservedTokens,omitempty"`
	ChargedTokens  string          `json:"chargedTokens,omitempty"`
	Knowledge      string          `json:"knowledge,omitempty"`
	Revision       string          `json:"revision"`
	Policy         BudgetPolicy    `json:"policy"`
	Limits         ExecutionLimits `json:"limits"`
}
type BudgetConfigure struct {
	CommandMeta
	Policy BudgetPolicy `json:"policy"`
}
