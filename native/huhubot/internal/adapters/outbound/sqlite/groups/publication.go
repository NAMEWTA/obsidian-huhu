package groups

import (
	"context"
	"database/sql"
	"errors"
	"time"

	conv "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/conversation"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

func (s *Store) resultInput(ctx context.Context, tx *sql.Tx, run string) (api.RequestIdentity, api.RunAccessInput, error) {
	var profile, principal string
	if e := tx.QueryRowContext(ctx, "SELECT s.profile_id,r.principal_id FROM execution_runs r JOIN conversation_sessions s ON s.session_id=r.session_id WHERE run_id=?", run).Scan(&profile, &principal); e != nil {
		return api.RequestIdentity{}, api.RunAccessInput{}, e
	}
	id := api.NewConnectionIdentity("group-publisher:"+run, principal, false)
	_, in, e := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: profile, ID: run})
	return id, in, e
}
func (s *Store) CheckResultInTx(ctx context.Context, tx *sql.Tx, run string, result *api.EngineResult) error {
	id, in, e := s.resultInput(ctx, tx, run)
	if e != nil {
		return e
	}
	if in.Group == nil {
		return nil
	}
	e = CheckInTx(ctx, tx, id, in, false, nil)
	if e == nil && result.Text != "" {
		var admission string
		if e = tx.QueryRowContext(ctx, "SELECT admission_kind FROM execution_runs WHERE run_id=?", run).Scan(&admission); e != nil {
			return e
		}
		if admission == "user_batch" {
			e = s.access.CheckInTx(ctx, tx, id, in, []string{"read", "send", "deliver"})
		}
	}
	if e == nil {
		return nil
	}
	var f *api.Fault
	if !errors.As(e, &f) || f.Kind != "CAPABILITY_DENIED" {
		return e
	}
	result.Status = "failed"
	result.Reason = f.Reason
	result.Text = ""
	result.Children = nil
	result.Partial = false
	return nil
}

func (s *Store) PublishInTx(ctx context.Context, tx *sql.Tx, run string, result *api.EngineResult) error {
	var admission, parent, session string
	if e := tx.QueryRowContext(ctx, "SELECT admission_kind,parent_run_id,session_id FROM execution_runs WHERE run_id=?", run).Scan(&admission, &parent, &session); e != nil {
		return e
	}
	if admission != "user_batch" || result.Status == "waiting_children" || result.Status == "waiting_approval" || result.Status == "suspended" {
		return nil
	}
	var old int
	if e := tx.QueryRowContext(ctx, "SELECT count(*) FROM group_publications WHERE child_run_id=?", run).Scan(&old); e != nil {
		return e
	}
	if old != 0 {
		return nil
	}
	status := result.Status
	if status == "finished" {
		status = "succeeded"
	}
	if status != "succeeded" && status != "failed" && status != "canceled" {
		return nil
	}
	id, in, e := s.resultInput(ctx, tx, run)
	if e != nil {
		return e
	}
	var message any
	var seq any
	if result.Text != "" && (status == "succeeded" || result.Partial) {
		if e = CheckInTx(ctx, tx, id, in, false, nil); e != nil {
			return e
		}
		if e = s.access.CheckInTx(ctx, tx, id, in, []string{"read", "send", "deliver"}); e != nil {
			return e
		}
		m, e := conv.MessageInTx(ctx, tx, session, run, "assistant", result.Text, in.Recipient.AgentID, in.Sources, result.Partial, "")
		if e != nil {
			return e
		}
		var n int64
		if e = tx.QueryRowContext(ctx, "SELECT seq FROM conversation_messages WHERE message_id=?", m).Scan(&n); e != nil {
			return e
		}
		message, seq = m, n
	}
	if _, e = tx.ExecContext(ctx, "INSERT INTO group_publications(child_run_id,session_id,message_id,public_seq,status,created_at) VALUES(?,?,?,?,?,?)", run, session, message, seq, status, time.Now().UTC().Format(time.RFC3339Nano)); e != nil {
		return e
	}
	if message != nil {
		return execution.AddEventInTx(ctx, tx, parent, "group.message.published", map[string]any{"messageId": message, "publicSeq": seq, "childRunId": run})
	}
	return nil
}
