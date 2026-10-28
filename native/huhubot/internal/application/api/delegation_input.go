package api

import (
	"strings"
	"unicode/utf8"
)

// DelegationInput is the accepted execution input read from this Run's durable
// task relationship. Task already includes explicitly selected context; it does
// not contain the target Agent's private conversation. Root chats have no value.
type DelegationInput struct {
	DelegationID   string
	Task           string
	Constraints    []string
	ExpectedOutput string
}

// ValidDelegationInput preserves the two admission bounds: the original task
// and requirements were validated together before context materialization;
// materialized Task can then occupy 128 KiB independently of the requirements.
// Their combined maximum is 200 KiB. Rechecking a new 128 KiB aggregate here
// would reject previously valid accepted work.
func ValidDelegationInput(in DelegationInput) bool {
	if in.DelegationID == "" || !utf8.ValidString(in.DelegationID) || !utf8.ValidString(in.Task) || strings.TrimSpace(in.Task) == "" || len(in.Task) > 128*1024 || !utf8.ValidString(in.ExpectedOutput) || len(in.ExpectedOutput) > 8192 || len(in.Constraints) > 32 {
		return false
	}
	for _, constraint := range in.Constraints {
		if !utf8.ValidString(constraint) || strings.TrimSpace(constraint) == "" || len(constraint) > 2048 {
			return false
		}
	}
	return true
}
