package grants

import (
	"context"
	"database/sql"
	"time"

	access "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/access/context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	policy "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/access/grants"
)

const DeliveryLifetime = 250 * time.Millisecond

// WithReadFence serializes actual delivery with Grant mutation commits. fn must
// stop physical I/O before returning; SQL transactions must close before I/O.
func (s *Store) WithReadFence(ctx context.Context, fn func(context.Context) error) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	case s.deliveryGate <- struct{}{}:
	}
	defer func() { <-s.deliveryGate }()
	if e := ctx.Err(); e != nil {
		return e
	}
	permit, cancel := context.WithTimeout(ctx, DeliveryLifetime)
	defer cancel()
	if e := fn(permit); e != nil {
		return e
	}
	return permit.Err()
}

// ReadDeadlineInTx selects valid read coverage, rather than treating a clock
// increment or an unrelated expiring grant as the current authorization fact.
func (s *Store) ReadDeadlineInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, in api.RunAccessInput) (time.Time, error) {
	return s.readDeadlineInTx(ctx, tx, id, in, false, nil)
}

// ReadDeadlineBatchInTx verifies transaction-constant Profile metadata once.
// Each exact input still receives all current validation, recipient, Grant,
// parent and wall-clock expiry checks. Nothing survives this transaction.
func (s *Store) ReadDeadlineBatchInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profileID string, inputs []api.RunAccessInput) (time.Time, error) {
	if !id.Valid() {
		return time.Time{}, api.Denied("IDENTITY_REQUIRED")
	}
	if len(inputs) == 0 || len(inputs) > 800 {
		return time.Time{}, api.Invalid("INVALID_EVENT_DELIVERY")
	}
	if _, e := metadata(ctx, tx, profileID); e != nil {
		return time.Time{}, e
	}
	facts, e := loadReadFacts(ctx, tx, id, profileID, inputs)
	if e != nil {
		return time.Time{}, e
	}
	until := time.Now().Add(DeliveryLifetime)
	for _, in := range inputs {
		if e := ctx.Err(); e != nil {
			return time.Time{}, e
		}
		if in.ProfileID != profileID {
			return time.Time{}, api.Denied("PROFILE_MISMATCH")
		}
		required, e := s.readSourcesDeadlineInTx(ctx, tx, id, in, true, facts)
		if e != nil {
			return time.Time{}, e
		}
		if required.Before(until) {
			until = required
		}
	}
	subjects := []MemorySubject{}
	seen := map[MemorySubject]bool{}
	for _, in := range inputs {
		subject := memoryInputSubject(in)
		if !seen[subject] {
			subjects = append(subjects, subject)
			seen[subject] = true
		}
	}
	memory, e := s.readMemoryFactsInTx(ctx, tx, id, profileID, subjects)
	if e != nil {
		return time.Time{}, e
	}
	ctx, e = memoryBatchRows(ctx, tx, id, profileID, memory)
	if e != nil {
		return time.Time{}, e
	}
	for _, in := range inputs {
		required, e := s.checkInputMemoryInTx(ctx, tx, id, in, []string{"read"}, &memory)
		if e != nil {
			return time.Time{}, e
		}
		if required.Before(until) {
			until = required
		}
	}
	return until, nil
}

func (s *Store) readDeadlineInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, in api.RunAccessInput, profileChecked bool, facts *readFacts) (time.Time, error) {
	until, e := s.readSourcesDeadlineInTx(ctx, tx, id, in, profileChecked, facts)
	if e != nil {
		return time.Time{}, e
	}
	memory, e := s.checkInputMemoryInTx(ctx, tx, id, in, []string{"read"}, nil)
	if e != nil {
		return time.Time{}, e
	}
	if memory.Before(until) {
		until = memory
	}
	return until, nil
}

// Memory objects are a separate subject family; they must never be interpreted
// as Run IDs. All ancestors are read in one bounded batch in this same Tx.
func (s *Store) ReadMemoryDeadlineBatchInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile string, subjects []MemorySubject) (time.Time, error) {
	if !id.Valid() {
		return time.Time{}, api.Denied("IDENTITY_REQUIRED")
	}
	if len(subjects) == 0 || len(subjects) > 800 {
		return time.Time{}, api.Invalid("INVALID_EVENT_DELIVERY")
	}
	for _, subject := range subjects {
		if !memorySubjectValid(subject) {
			return time.Time{}, api.Invalid("INVALID_EVENT_DELIVERY")
		}
	}
	if _, e := metadata(ctx, tx, profile); e != nil {
		return time.Time{}, e
	}
	facts, e := s.readMemoryFactsInTx(ctx, tx, id, profile, subjects)
	if e != nil {
		return time.Time{}, e
	}
	ctx, e = memoryBatchRows(ctx, tx, id, profile, facts)
	if e != nil {
		return time.Time{}, e
	}
	until := time.Now().Add(DeliveryLifetime)
	for _, req := range facts.Requirements {
		deadline, e := s.checkMemoryRequirementInTx(ctx, tx, id, profile, "", req, []string{"read"})
		if e != nil {
			return time.Time{}, e
		}
		if deadline.Before(until) {
			until = deadline
		}
	}
	return until, nil
}

func (s *Store) readSourcesDeadlineInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, in api.RunAccessInput, profileChecked bool, facts *readFacts) (time.Time, error) {
	if e := s.checkSourcesInTx(ctx, tx, id, in, []string{"read"}, profileChecked, facts); e != nil {
		return time.Time{}, e
	}
	deadline := time.Now().Add(DeliveryLifetime)
	if len(in.Sources)+len(in.Scopes) == 0 {
		return deadline, nil
	}
	gs := make([]api.Grant, 0, len(in.GrantIDs))
	var inherited map[string]bool
	if in.ParentScope != nil {
		var e error
		inherited, e = s.delegatedInTx(ctx, tx, id, in, []string{"read"})
		if e != nil {
			return time.Time{}, e
		}
	}
	maintenance, e := s.maintenanceGrantsInTx(ctx, tx, id, in, []string{"read"}, facts)
	if e != nil {
		return time.Time{}, e
	}
	for key := range maintenance {
		if inherited == nil {
			inherited = map[string]bool{}
		}
		inherited[key] = true
	}
	for _, grantID := range in.GrantIDs {
		g, e := readGrantFact(ctx, tx, in.ProfileID, id.PrincipalID(), grantID, facts)
		if e != nil {
			return time.Time{}, e
		}
		if inherited[grantID] {
			g.TaskID = in.TaskID
		}
		g, e = s.materializeGrantInTx(ctx, tx, id, in, g, true)
		if e != nil {
			return time.Time{}, e
		}
		gs = append(gs, g)
	}
	cover := func(workspace string, scopes []policy.ResourceScope) error {
		var longest time.Time
		found, unlimited := false, false
		for _, g := range gs {
			if authorize([]api.Grant{g}, id, in, workspace, scopes, "read", s.now(), facts) != nil {
				continue
			}
			found = true
			if g.ExpiresAt == "" {
				unlimited = true
				break
			}
			expiry, e := time.Parse(time.RFC3339Nano, g.ExpiresAt)
			if e != nil {
				return fault("CONFLICT", "GRANT_STATE_INVALID")
			}
			if expiry.After(longest) {
				longest = expiry
			}
		}
		if !found {
			return api.Denied("SOURCE_NOT_GRANTED")
		}
		if !unlimited && longest.Before(deadline) {
			deadline = longest
		}
		return nil
	}
	for _, source := range in.Sources {
		scopes := []policy.ResourceScope{{Kind: "source", ResourceID: source.ResourceID}}
		for _, scope := range in.Scopes {
			if access.ScopeIncludes(scope, source) {
				scopes = append(scopes, policy.ResourceScope{Kind: scope.Kind, ResourceID: scope.ResourceID})
			}
		}
		if e := cover(source.WorkspaceID, scopes); e != nil {
			return time.Time{}, e
		}
	}
	for _, scope := range in.Scopes {
		if e := cover(scope.WorkspaceID, []policy.ResourceScope{{Kind: scope.Kind, ResourceID: scope.ResourceID}}); e != nil {
			return time.Time{}, e
		}
	}
	if in.ParentScope != nil {
		for _, grantID := range in.ParentScope.GrantIDs {
			g, e := readGrantFact(ctx, tx, in.ProfileID, id.PrincipalID(), grantID, facts)
			if e != nil {
				return time.Time{}, e
			}
			if g.ExpiresAt != "" {
				expiry, e := time.Parse(time.RFC3339Nano, g.ExpiresAt)
				if e != nil {
					return time.Time{}, fault("CONFLICT", "GRANT_STATE_INVALID")
				}
				if expiry.Before(deadline) {
					deadline = expiry
				}
			}
		}
	}
	if !time.Now().Before(deadline) {
		return time.Time{}, api.Denied("GRANT_EXPIRED")
	}
	return deadline, nil
}
