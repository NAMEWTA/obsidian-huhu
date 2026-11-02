package grants

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"reflect"
	"time"

	groupaccess "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/groups"
	access "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/access/context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	policy "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/access/grants"
)

func (s *Store) Check(ctx context.Context, id api.RequestIdentity, in api.RunAccessInput, ops []string) error {
	return s.base.WithinTx(ctx, func(tx *sql.Tx) error { return s.CheckInTx(ctx, tx, id, in, ops) })
}

// AuthorizeInTx shares the Run admission transaction. It performs only local
// metadata reads; no Host, model, provider or nested transaction is entered.
func (s *Store) AuthorizeInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, in api.RunAccessInput) error {
	return s.CheckInTx(ctx, tx, id, in, []string{"read", "send"})
}
func (s *Store) CheckInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, in api.RunAccessInput, ops []string) error {
	return s.checkInTx(ctx, tx, id, in, ops, false, nil)
}

// profileChecked is used only after a batch reader has verified the real
// Profile in this same transaction and matched every input to that Profile.
func (s *Store) checkInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, in api.RunAccessInput, ops []string, profileChecked bool, facts *readFacts) error {
	if e := s.checkSourcesInTx(ctx, tx, id, in, ops, profileChecked, facts); e != nil {
		return e
	}
	_, e := s.checkInputMemoryInTx(ctx, tx, id, in, ops, nil)
	return e
}

// checkSourcesInTx is the original Grant/Group gate. Memory witnesses call it
// directly so their local fact reader can never recurse through Memory again.
func (s *Store) checkSourcesInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, in api.RunAccessInput, ops []string, profileChecked bool, facts *readFacts) error {
	if !id.Valid() {
		return api.Denied("IDENTITY_REQUIRED")
	}
	// A non-nil facts value can only come from completed loadReadFacts, which
	// fully validated each exact batch input before loading rows. Inputs are not
	// narrowed or rewritten after that point. Avoid repeating this pure check;
	// all current recipient/Grant/parent/time checks below still run per input.
	if facts == nil {
		if e := access.Validate(in); e != nil {
			return e
		}
	}
	if !profileChecked {
		if _, e := metadata(ctx, tx, in.ProfileID); e != nil {
			return e
		}
	}
	readOnly := true
	for _, op := range ops {
		if op != "read" {
			readOnly = false
		}
	}
	var groupFacts *groupaccess.MemberFacts
	if facts != nil {
		groupFacts = facts.groups
	}
	if e := groupaccess.CheckInTx(ctx, tx, id, in, readOnly, groupFacts); e != nil {
		return e
	}
	var inherited map[string]bool
	if in.ParentScope != nil {
		var e error
		inherited, e = s.delegatedInTx(ctx, tx, id, in, ops)
		if e != nil {
			return e
		}
	}
	maintenance, e := s.maintenanceGrantsInTx(ctx, tx, id, in, ops, facts)
	if e != nil {
		return e
	}
	for key := range maintenance {
		if inherited == nil {
			inherited = map[string]bool{}
		}
		inherited[key] = true
	}
	if len(in.Sources)+len(in.Scopes) == 0 {
		return nil
	}
	if e := runRecipient(ctx, tx, id, in, ops, facts); e != nil {
		return e
	}
	if len(in.GrantIDs) == 0 {
		return api.Denied("SOURCE_NOT_GRANTED")
	}

	if in.ParentScope != nil {
		if len(in.ParentScope.Sources)+len(in.ParentScope.Scopes) > 0 && len(in.ParentScope.GrantIDs) == 0 {
			return api.Denied("SOURCE_NOT_GRANTED")
		}
		for _, grantID := range in.ParentScope.GrantIDs {
			g, e := readGrantFact(ctx, tx, in.ProfileID, id.PrincipalID(), grantID, facts)
			if e != nil {
				return e
			}
			if g.State != "active" {
				return api.Denied("GRANT_REVOKED")
			}
			if g.ExpiresAt != "" {
				expiry, e := time.Parse(time.RFC3339Nano, g.ExpiresAt)
				if e != nil {
					return fault("CONFLICT", "GRANT_STATE_INVALID")
				}
				if !s.now().Before(expiry) {
					return api.Denied("GRANT_EXPIRED")
				}
			}
		}
	}
	grants := []api.Grant{}
	for _, grantID := range in.GrantIDs {
		g, e := readGrantFact(ctx, tx, in.ProfileID, id.PrincipalID(), grantID, facts)
		if e != nil {
			return e
		}
		if inherited[grantID] {
			g.TaskID = in.TaskID
		}
		g, e = s.materializeGrantInTx(ctx, tx, id, in, g, true)
		if e != nil {
			return e
		}
		grants = append(grants, g)
	}
	for _, source := range in.Sources {
		scopes := []policy.ResourceScope{{Kind: "source", ResourceID: source.ResourceID}}
		for _, scope := range in.Scopes {
			if access.ScopeIncludes(scope, source) {
				scopes = append(scopes, policy.ResourceScope{Kind: scope.Kind, ResourceID: scope.ResourceID})
			}
		}
		for _, op := range ops {
			if e := authorize(grants, id, in, source.WorkspaceID, scopes, op, s.now(), facts); e != nil {
				return e
			}
		}
	}
	for _, scope := range in.Scopes {
		for _, op := range ops {
			if e := authorize(grants, id, in, scope.WorkspaceID, []policy.ResourceScope{{Kind: scope.Kind, ResourceID: scope.ResourceID}}, op, s.now(), facts); e != nil {
				return e
			}
		}
	}
	return nil
}
func grantPolicy(g api.Grant, principal string) (policy.Grant, error) {
	var expiry time.Time
	if g.ExpiresAt != "" {
		var e error
		expiry, e = time.Parse(time.RFC3339Nano, g.ExpiresAt)
		if e != nil {
			return policy.Grant{}, fault("CONFLICT", "GRANT_STATE_INVALID")
		}
	}
	recipients := make([]policy.Recipient, 0, len(g.Recipients))
	for _, r := range g.Recipients {
		recipients = append(recipients, policyRecipient(r))
	}
	return policy.Grant{PrincipalID: principal, WorkspaceID: g.WorkspaceID, SessionID: g.SessionID, TaskID: g.TaskID, State: g.State, Scope: policy.ResourceScope{Kind: g.Scope, ResourceID: g.ResourceID}, Operations: g.Operations, Recipients: recipients, ExpiresAt: expiry}, nil
}

func authorize(gs []api.Grant, id api.RequestIdentity, in api.RunAccessInput, workspace string, scopes []policy.ResourceScope, op string, now time.Time, facts *readFacts) error {
	reason := "SOURCE_NOT_GRANTED"
	request := policy.Request{PrincipalID: id.PrincipalID(), WorkspaceID: workspace, SessionID: in.SessionID, TaskID: in.TaskID, Operation: op, Recipient: policyRecipient(in.Recipient), Scopes: scopes}
	for _, g := range gs {
		var converted policy.Grant
		var e error
		if facts == nil {
			converted, e = grantPolicy(g, id.PrincipalID())
		} else {
			stored := facts.grants[g.ID]
			if stored == nil {
				return fault("NOT_FOUND", "GRANT_NOT_FOUND")
			}
			if g.TaskID != stored.value.TaskID || !reflect.DeepEqual(g.Recipients, stored.value.Recipients) {
				converted, e = grantPolicy(g, id.PrincipalID())
			} else {
				converted, e = stored.asPolicy(id.PrincipalID())
			}
		}
		if e != nil {
			return e
		}
		// Only the immutable representation is reused. Every request still runs
		// policy.Authorize with this message's recipient/scopes and current time.
		denied := policy.Authorize(converted, request, now)
		if denied == "" {
			return nil
		}
		if denied != "SOURCE_NOT_GRANTED" {
			reason = denied
		}
	}
	return api.Denied(reason)
}

const recipientRunColumns = "r.principal_id,s.profile_id,r.session_id,r.agent_id,CAST(r.model_revision AS TEXT),r.recipient_json,r.status,r.pin_token"

type storedRunRecipient struct {
	principal, profile, session, agent, model, body, status string
	pin                                                     sql.NullString
	fixed                                                   api.GrantRecipient
	decoded                                                 bool
	decodeErr                                               error
}

func scanRunRecipient(row factScanner, prefix ...any) (*storedRunRecipient, error) {
	r := &storedRunRecipient{}
	values := append(prefix, &r.principal, &r.profile, &r.session, &r.agent, &r.model, &r.body, &r.status, &r.pin)
	e := row.Scan(values...)
	return r, e
}

func (r *storedRunRecipient) decode() (api.GrantRecipient, error) {
	if !r.decoded {
		r.decoded = true
		if json.Unmarshal([]byte(r.body), &r.fixed) != nil {
			r.decodeErr = fault("CONFLICT", "RUN_RECIPIENT_INVALID")
		}
	}
	return r.fixed, r.decodeErr
}

func runRecipient(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, in api.RunAccessInput, ops []string, facts *readFacts) error {
	var stored *storedRunRecipient
	if facts != nil {
		stored = facts.runs[in.TaskID]
	} else {
		var e error
		stored, e = scanRunRecipient(tx.QueryRowContext(ctx, "SELECT "+recipientRunColumns+" FROM execution_runs r JOIN conversation_sessions s ON s.session_id=r.session_id WHERE r.run_id=?", in.TaskID))
		if errors.Is(e, sql.ErrNoRows) {
			stored = nil
		} else if e != nil {
			return e
		}
	}
	if stored == nil {
		return recipient(ctx, tx, in.Recipient)
	}
	if stored.principal != id.PrincipalID() || stored.profile != in.ProfileID || stored.session != in.SessionID {
		return api.Denied("RUN_SCOPE_MISMATCH")
	}
	decoder := stored
	if facts != nil {
		if previous := facts.recipients[stored.body]; previous != nil {
			decoder = previous
		} else {
			facts.recipients[stored.body] = stored
		}
	}
	fixed, e := decoder.decode()
	if e != nil {
		return e
	}
	if !reflect.DeepEqual(fixed, in.Recipient) || stored.agent != fixed.AgentID || stored.model != fixed.ModelBindingRevision {
		return api.Denied("RECIPIENT_CHANGED")
	}

	readOnly := true
	for _, op := range ops {
		if op != "read" {
			readOnly = false
		}
	}
	historical, _ := ctx.Value(historicalTaskLineage{}).(bool)
	if readOnly || historical {
		return nil
	}
	if stored.status == "succeeded" || stored.status == "failed" || stored.status == "canceled" {
		return api.Denied("RUN_NOT_ACTIVE")
	}
	var count int
	e = tx.QueryRowContext(ctx, "SELECT (SELECT count(*) FROM execution_runs r JOIN config_snapshot_pins p ON p.token=r.pin_token AND p.agent_id=r.agent_id AND p.model_revision=r.model_revision AND p.persona_revision=r.persona_revision WHERE r.run_id=? AND r.pin_token=?) + (SELECT count(*) FROM execution_runs r JOIN task_config_pins p ON p.run_id=r.run_id AND p.snapshot_id=r.task_config_id JOIN task_config_snapshots c ON c.snapshot_id=p.snapshot_id AND c.subject_id=r.agent_id AND c.model_binding_revision=CAST(r.model_revision AS TEXT) AND c.persona_revision=CAST(r.persona_revision AS TEXT) WHERE r.run_id=? AND c.profile_id=? AND c.principal_id=? AND c.state IN('active','retained'))", in.TaskID, stored.pin.String, in.TaskID, in.ProfileID, id.PrincipalID()).Scan(&count)
	if e != nil {
		return e
	}
	if count < 1 {
		return api.Denied("RUN_CONFIG_NOT_PINNED")
	}
	return nil
}
