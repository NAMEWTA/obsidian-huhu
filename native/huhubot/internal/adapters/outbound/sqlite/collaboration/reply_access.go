package collaboration

import (
	"context"
	"database/sql"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	recoveryguard "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/recovery"
	access "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/access/context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	delegate "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/collaboration/delegate"
)

func checkReplySources(proposed, actual []api.SourceSnapshot) error {
	for _, source := range proposed {
		found := false
		for _, current := range actual {
			if access.EqualSource(source, current) {
				found = true
				break
			}
		}
		if !found {
			return api.Denied("PARENT_SCOPE_EXCEEDED")
		}
	}
	return nil
}

// A user may supplement an owned waiting thread without impersonating a model
// claim. Both participants still need their real pin and an open task tree in
// this transaction. The separate effect-admission flag is not a user reply gate.
func (s *Store) replyTreeOpenInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, runID string) (api.RunAccessInput, error) {
	if e := s.admissionOpen(); e != nil {
		return api.RunAccessInput{}, e
	}
	r, input, e := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: profile, ID: runID})
	if e != nil {
		return input, e
	}
	if e = recoveryguard.CheckInTx(ctx, tx, r.ID); e != nil {
		return input, e
	}
	var closed int
	if e = tx.QueryRowContext(ctx, "WITH RECURSIVE a(run_id,parent_run_id,closed) AS (SELECT run_id,parent_run_id,CASE WHEN task_admission_closed<>0 OR cancel_epoch<>0 OR status IN('succeeded','failed','canceled','interrupted','blocked') THEN 1 ELSE 0 END FROM execution_runs WHERE run_id=? UNION ALL SELECT r.run_id,r.parent_run_id,CASE WHEN r.task_admission_closed<>0 OR r.cancel_epoch<>0 OR r.status IN('succeeded','failed','canceled','interrupted','blocked') THEN 1 ELSE 0 END FROM execution_runs r JOIN a ON r.run_id=a.parent_run_id) SELECT COALESCE(max(closed),1) FROM a", r.ID).Scan(&closed); e != nil {
		return input, e
	}
	if closed != 0 {
		return input, api.Denied("TASK_ADMISSION_CLOSED")
	}
	return input, nil
}

func (s *Store) replyParticipantInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, runID string) (api.RunAccessInput, error) {
	input, e := s.replyTreeOpenInTx(ctx, tx, id, profile, runID)
	if e != nil {
		return input, e
	}
	var pinned int
	if e = tx.QueryRowContext(ctx, "SELECT (SELECT count(*) FROM config_snapshot_pins p JOIN execution_runs r ON r.pin_token=p.token WHERE r.run_id=? AND p.agent_id=r.agent_id AND p.model_revision=r.model_revision AND p.persona_revision=r.persona_revision)+(SELECT count(*) FROM task_config_pins p JOIN task_config_snapshots c ON c.snapshot_id=p.snapshot_id JOIN execution_runs r ON r.run_id=p.run_id WHERE r.run_id=? AND c.snapshot_id=r.task_config_id AND c.state IN('active','retained'))", runID, runID).Scan(&pinned); e != nil {
		return input, e
	}
	if pinned == 0 {
		return input, api.Denied("RUN_CONFIG_NOT_PINNED")
	}
	return input, nil
}

func (s *Store) replySenderInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, runID string) (actor, error) {
	_, model := delegate.Execution(ctx)
	a, e := s.actorInTx(ctx, tx, id, profile, runID, model)
	if e != nil {
		return a, e
	}
	if _, e = s.replyParticipantInTx(ctx, tx, id, profile, runID); e != nil {
		return a, e
	}
	return a, s.access.CheckInTx(ctx, tx, id, a.input, []string{"read", "send", "deliver"})
}

func (s *Store) checkReplyTargetInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, runID string, sender actor) error {
	input, e := s.replyParticipantInTx(ctx, tx, id, profile, runID)
	if e != nil {
		return e
	}
	// Deliver the complete actual provenance, not the caller's narrower labels.
	input.Sources = sender.input.Sources
	input.Scopes = sender.input.Scopes
	input.GrantIDs, e = s.access.SelectInTx(ctx, tx, id, input, "", []string{"read", "send", "deliver"})
	if e != nil {
		return e
	}
	return s.access.CheckInTx(ctx, tx, id, input, []string{"read", "send", "deliver"})
}

// The user's group edge has an orchestration parent, not a model identity or
// configuration pin. Its actual member task supplies the fixed recipient and
// complete source provenance; no coordinator permissions are borrowed.
func (s *Store) groupUserReplySenderInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile string, d api.Delegation) (actor, bool, error) {
	if _, model := delegate.Execution(ctx); model {
		return actor{}, false, nil
	}
	root, _, e := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: profile, ID: d.ParentRunID})
	if e != nil {
		return actor{}, false, e
	}
	if root.Role != "orchestration" {
		return actor{}, false, nil
	}
	if _, e = s.replyTreeOpenInTx(ctx, tx, id, profile, root.ID); e != nil {
		return actor{}, true, e
	}
	var parent, admission, session string
	if e = tx.QueryRowContext(ctx, "SELECT parent_run_id,admission_kind,session_id FROM execution_runs WHERE run_id=?", d.ChildRunID).Scan(&parent, &admission, &session); e != nil {
		return actor{}, true, e
	}
	if parent != root.ID || session != root.SessionID || admission != "user_batch" {
		return actor{}, true, api.Denied("MESSAGE_SCOPE_MISMATCH")
	}
	a, e := s.replySenderInTx(ctx, tx, id, profile, d.ChildRunID)
	return a, true, e
}
