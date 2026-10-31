// Package events projects the existing execution log in one authorized short read.
package events

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	execution "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	grants "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	contextaccess "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/access/context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	app "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/events"
	runstate "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/execution/run"
)

type Store struct {
	base      *base.Store
	access    *grants.Store
	proposals GlobalProposalDeliveryReader
}

const projectionEventTypesSQL = "'accepted','preparing','running','waiting_approval','waiting_children','interrupted','recovering','blocked','canceling','succeeded','failed','canceled','delta','token','text','text.delta','chunk'"

func New(b *base.Store, access *grants.Store) *Store { return &Store{base: b, access: access} }
func fail(kind, reason string) error                 { return &api.Fault{Kind: kind, Reason: reason} }
func (s *Store) read(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, q api.IDQuery) (api.Run, api.RunAccessInput, int64, error) {
	r, in, e := execution.ReadInTx(ctx, tx, id, q)
	if e != nil {
		return r, in, 0, e
	}
	if e = s.access.CheckInTx(ctx, tx, id, in, []string{"read"}); e != nil {
		return r, in, 0, e
	}
	var head int64
	e = tx.QueryRowContext(ctx, "SELECT event_seq FROM execution_runs WHERE run_id=?", r.ID).Scan(&head)
	if e != nil {
		return r, in, 0, e
	}
	var count int64
	var first, last sql.NullInt64
	e = tx.QueryRowContext(ctx, "SELECT count(*),MIN(seq),MAX(seq) FROM execution_events WHERE run_id=?", r.ID).Scan(&count, &first, &last)
	if e == nil && count > 0 && (last.Int64 != head || count != last.Int64-first.Int64+1) {
		e = fail("CONFLICT", "EVENT_LOG_GAP")
	}
	return r, in, head, e
}
func subscription(id api.RequestIdentity, q api.EventTailQuery) string {
	sum := sha256.Sum256([]byte(id.ConnectionID() + "\x00" + id.PrincipalID() + "\x00" + q.ProfileID + "\x00" + q.RunID))
	return "subscription:" + hex.EncodeToString(sum[:16])
}
func decode(run, seq, kind, at, body string, sources []api.SourceSnapshot) (api.RunEvent, error) {
	var out api.RunEvent
	if len(kind) == 0 || len(kind) > 128 || json.Unmarshal([]byte(body), &out) != nil {
		return out, fail("CONFLICT", "EVENT_STATE_INVALID")
	}
	out.RunID, out.Seq, out.Type, out.CreatedAt = run, seq, kind, at
	// Provenance comes from the Run's persisted effective context, never event input.
	out.SourceRefs = sources
	return out, nil
}

func (s *Store) Tail(ctx context.Context, id api.RequestIdentity, q api.EventTailQuery) (api.EventPage, error) {
	out := api.EventPage{RunID: q.RunID, SubscriptionID: subscription(id, q), Events: []api.RunEvent{}, NextSeq: q.AfterSeq}
	after, e := app.Sequence(q.AfterSeq)
	if e != nil {
		return api.EventPage{}, e
	}
	var expired error
	e = s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		r, in, head, e := s.read(ctx, tx, id, api.IDQuery{ProfileID: q.ProfileID, ID: q.RunID})
		if e != nil {
			return e
		}
		out.HeadSeq = strconv.FormatInt(head, 10)
		if after > head {
			return fail("INVALID_ARGUMENT", "EVENT_CURSOR_AHEAD")
		}
		if e = s.compact(ctx, tx, r, head); e != nil {
			return e
		}
		var first sql.NullInt64
		if e = tx.QueryRowContext(ctx, "SELECT MIN(seq) FROM execution_events WHERE run_id=?", q.RunID).Scan(&first); e != nil {
			return e
		}
		if first.Valid && after < first.Int64-1 || !first.Valid && after < head {
			recovery, e := s.snapshot(ctx, tx, r, in, head)
			if e != nil {
				return e
			}
			expired = &api.Fault{Kind: "CURSOR_EXPIRED", Reason: "EVENT_CURSOR_EXPIRED", Details: &recovery}
			return nil
		}
		rows, e := tx.QueryContext(ctx, "SELECT CAST(seq AS TEXT),event_type,created_at,body_json FROM execution_events WHERE run_id=? AND seq>? AND seq<=? ORDER BY seq LIMIT ?", q.RunID, after, head, q.Limit+1)
		if e != nil {
			return e
		}
		defer rows.Close()
		expected := after
		for rows.Next() {
			var seq, kind, at, body string
			if e = rows.Scan(&seq, &kind, &at, &body); e != nil {
				return e
			}
			n, e := app.Sequence(seq)
			if e != nil || n != expected+1 {
				return fail("CONFLICT", "EVENT_LOG_GAP")
			}
			if len(out.Events) == q.Limit {
				break
			}
			event, e := decode(q.RunID, seq, kind, at, body, in.Sources)
			if e != nil {
				return e
			}
			out.Events = append(out.Events, event)
			oldNext := out.NextSeq
			out.NextSeq = seq
			out.HasMore = n < head
			encoded, e := json.Marshal(out)
			if e != nil {
				return e
			}
			if len(encoded) > q.MaxBytes {
				out.Events = out.Events[:len(out.Events)-1]
				out.NextSeq = oldNext
				out.HasMore = true
				if len(out.Events) == 0 {
					return fail("RESOURCE_LIMIT", "EVENT_PAGE_TOO_SMALL")
				}
				break
			}
			expected = n
		}
		if e = rows.Err(); e != nil {
			return e
		}
		out.HasMore = out.NextSeq != out.HeadSeq
		if len(out.Events) == 0 && after < head {
			return fail("CONFLICT", "EVENT_LOG_GAP")
		}
		encoded, e := json.Marshal(out)
		if e != nil {
			return e
		}
		if len(encoded) > q.MaxBytes {
			return fail("RESOURCE_LIMIT", "EVENT_PAGE_TOO_SMALL")
		}
		return nil
	})
	if e != nil {
		return api.EventPage{}, e
	}
	if expired != nil {
		return api.EventPage{}, expired
	}
	return out, nil
}

// Only a terminal prefix whose current projection exists in durable Run/messages
// is disposable. Unknown ledger/tool facts stop compaction; active text is kept.
func (s *Store) compact(ctx context.Context, tx *sql.Tx, r api.Run, head int64) error {
	if !runstate.Terminal(r.Status) || head <= app.RetainedTerminalEvents {
		return nil
	}
	cut := head - app.RetainedTerminalEvents
	var ledger int
	if e := tx.QueryRowContext(ctx, "SELECT count(*) FROM execution_events WHERE run_id=? AND event_type NOT IN("+projectionEventTypesSQL+")", r.ID).Scan(&ledger); e != nil {
		return e
	}
	if ledger != 0 {
		return nil
	}
	if cut <= 0 {
		return nil
	}
	if r.Status == "succeeded" {
		var count int
		if e := tx.QueryRowContext(ctx, "SELECT count(*) FROM conversation_messages WHERE run_id=? AND role='assistant'", r.ID).Scan(&count); e != nil {
			return e
		}
		if count != 1 {
			return nil
		}
	}
	_, e := tx.ExecContext(ctx, "DELETE FROM execution_events WHERE run_id=? AND seq<=?", r.ID, cut)
	return e
}
func (s *Store) snapshot(ctx context.Context, tx *sql.Tx, r api.Run, in api.RunAccessInput, head int64) (api.EventCursorRecovery, error) {
	out := api.EventCursorRecovery{Type: "run-cursor", RunID: r.ID, SnapshotSeq: strconv.FormatInt(head, 10), Snapshot: api.RunSnapshot{Run: r, Messages: []api.VisibleMessage{}, Events: []api.RunEvent{}}}
	rows, e := tx.QueryContext(ctx, "SELECT message_id,session_id,role,text,created_at,agent_id,partial,supersedes_message_id,source_json,CAST(seq AS TEXT),run_id FROM conversation_messages WHERE run_id=? ORDER BY seq LIMIT 3", r.ID)
	if e != nil {
		return out, e
	}
	for rows.Next() {
		var message api.VisibleMessage
		var sources string
		if e = rows.Scan(&message.ID, &message.SessionID, &message.Role, &message.Text, &message.CreatedAt, &message.AgentID, &message.Partial, &message.SupersedesMessageID, &sources, &message.Seq, &message.RunID); e != nil {
			_ = rows.Close()
			return out, e
		}
		if json.Unmarshal([]byte(sources), &message.SourceRefs) != nil || message.SourceRefs == nil || !messageSourcesWithin(message.SourceRefs, in.Sources) {
			_ = rows.Close()
			return out, fail("CONFLICT", "MESSAGE_CONTEXT_INVALID")
		}
		out.Snapshot.Messages = append(out.Snapshot.Messages, message)
	}
	e = rows.Err()
	_ = rows.Close()
	if e != nil {
		return out, e
	}
	if len(out.Snapshot.Messages) > 2 {
		return out, fail("RESOURCE_LIMIT", "EVENT_SNAPSHOT_LIMIT")
	}
	if !runstate.Terminal(r.Status) {
		var first sql.NullInt64
		if e = tx.QueryRowContext(ctx, "SELECT MIN(seq) FROM execution_events WHERE run_id=?", r.ID).Scan(&first); e != nil {
			return out, e
		}
		if !first.Valid || first.Int64 != 1 {
			return out, fail("CONFLICT", "EVENT_LOG_GAP")
		}
		rows, e = tx.QueryContext(ctx, "SELECT CAST(seq AS TEXT),event_type,created_at,body_json FROM execution_events WHERE run_id=? AND seq<=? ORDER BY seq", r.ID, head)
		if e != nil {
			return out, e
		}
		var text strings.Builder
		expected := int64(1)
		for rows.Next() {
			var seq, kind, at, body string
			if e = rows.Scan(&seq, &kind, &at, &body); e != nil {
				_ = rows.Close()
				return out, e
			}
			n, e := app.Sequence(seq)
			if e != nil || n != expected {
				_ = rows.Close()
				return out, fail("CONFLICT", "EVENT_LOG_GAP")
			}
			expected++
			event, e := decode(r.ID, seq, kind, at, body, in.Sources)
			if e != nil {
				_ = rows.Close()
				return out, e
			}
			switch event.Type {
			case "text", "delta", "token", "text.delta", "chunk":
			default:
				continue
			}
			if text.Len()+len(event.Text) > app.MaxPendingTextBytes {
				_ = rows.Close()
				return out, fail("RESOURCE_LIMIT", "EVENT_SNAPSHOT_LIMIT")
			}
			text.WriteString(event.Text)
		}
		e = rows.Err()
		_ = rows.Close()
		if e != nil {
			return out, e
		}
		if expected != head+1 {
			return out, fail("CONFLICT", "EVENT_LOG_GAP")
		}
		out.Snapshot.PendingText = text.String()
	}
	// A terminal prefix may have been compacted before a later ledger fact.
	// Include those remaining facts at this same high-water mark in the reset.
	rows, e = tx.QueryContext(ctx, "SELECT CAST(seq AS TEXT),event_type,created_at,body_json FROM execution_events WHERE run_id=? AND seq<=? AND event_type NOT IN("+projectionEventTypesSQL+") ORDER BY seq LIMIT ?", r.ID, head, app.MaxLimit+1)
	if e != nil {
		return out, e
	}
	for rows.Next() {
		var seq, kind, at, body string
		if e = rows.Scan(&seq, &kind, &at, &body); e != nil {
			_ = rows.Close()
			return out, e
		}
		event, e := decode(r.ID, seq, kind, at, body, in.Sources)
		if e != nil {
			_ = rows.Close()
			return out, e
		}
		out.Snapshot.Events = append(out.Snapshot.Events, event)
		if len(out.Snapshot.Events) > app.MaxLimit {
			_ = rows.Close()
			return out, fail("RESOURCE_LIMIT", "EVENT_SNAPSHOT_LIMIT")
		}
	}
	e = rows.Err()
	_ = rows.Close()
	if e != nil {
		return out, e
	}
	encoded, e := json.Marshal(out)
	if e != nil {
		return out, e
	}
	if len(encoded) > app.MaxSnapshotBytes {
		return out, fail("RESOURCE_LIMIT", "EVENT_SNAPSHOT_LIMIT")
	}
	return out, nil
}

// A message preserves its own durable provenance, while the existing whole-Run
// authorization remains the outer read gate. Unknown/duplicate facts must not
// be silently projected or replaced by the Run's larger effective context.
func messageSourcesWithin(sources, effective []api.SourceSnapshot) bool {
	seen := map[string]bool{}
	for _, source := range sources {
		if seen[source.ResourceID] {
			return false
		}
		seen[source.ResourceID] = true
		found := false
		for _, allowed := range effective {
			if contextaccess.EqualSource(source, allowed) {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}
func (s *Store) Snapshot(ctx context.Context, id api.RequestIdentity, q api.IDQuery) (api.EventCursorRecovery, error) {
	var out api.EventCursorRecovery
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		r, in, head, e := s.read(ctx, tx, id, q)
		if e != nil {
			return e
		}
		out, e = s.snapshot(ctx, tx, r, in, head)
		return e
	})
	if e != nil {
		return api.EventCursorRecovery{}, e
	}
	return out, nil
}

type messageContext struct {
	runID   string
	sources []api.SourceSnapshot
}

// readMessagesInTx reads at most the bounded subject set. Returning closes the
// rows before Run/Grant queries enter the same single-connection transaction.
func readMessagesInTx(ctx context.Context, tx *sql.Tx, subjects []api.DeliverySubject) (map[string]messageContext, error) {
	args := []any{}
	for _, subject := range subjects {
		if subject.Kind == "message" {
			args = append(args, subject.ID)
		}
	}
	messages := make(map[string]messageContext, len(args))
	if len(args) > app.MaxDeliveryRuns {
		return nil, api.Invalid("INVALID_EVENT_DELIVERY")
	}
	if len(args) == 0 {
		return messages, nil
	}
	query := "SELECT message_id,run_id,source_json FROM conversation_messages WHERE message_id IN (" + strings.TrimSuffix(strings.Repeat("?,", len(args)), ",") + ")"
	rows, e := tx.QueryContext(ctx, query, args...)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	// Exact persisted JSON is only an immutable fact, not a read permission.
	// Repeated provenance across messages is decoded once in this transaction;
	// every message still reads its own row, and all later checks remain per
	// subject. HistoryReadInput and the access policy never mutate these slices.
	decoded := map[string][]api.SourceSnapshot{}
	for rows.Next() {
		var messageID, encoded string
		var stored messageContext
		if e = rows.Scan(&messageID, &stored.runID, &encoded); e != nil {
			return nil, e
		}
		var found bool
		stored.sources, found = decoded[encoded]
		if !found {
			if json.Unmarshal([]byte(encoded), &stored.sources) != nil || stored.sources == nil {
				return nil, fail("CONFLICT", "MESSAGE_CONTEXT_INVALID")
			}
			decoded[encoded] = stored.sources
		}
		messages[messageID] = stored
	}
	if e = rows.Err(); e != nil {
		return nil, e
	}
	return messages, nil
}

func (s *Store) WithDelivery(ctx context.Context, id api.RequestIdentity, subjects []api.DeliverySubject, fn func(context.Context) error) error {
	return s.access.WithReadFence(ctx, func(permit context.Context) error {
		var deadlineCtx context.Context
		var cancel context.CancelFunc
		e := s.base.WithinTx(permit, func(tx *sql.Tx) error {
			var profile string
			if e := tx.QueryRowContext(permit, "SELECT profile_id FROM profile_metadata WHERE singleton=1").Scan(&profile); e != nil {
				return e
			}
			messages, e := readMessagesInTx(permit, tx, subjects)
			if e != nil {
				return e
			}
			runIDs := []string{}
			memorySubjects := []grants.MemorySubject{}
			proposalIDs := []string{}
			seen := map[string]bool{}
			for _, subject := range subjects {
				if subject.Kind != "run" && subject.Kind != "message" {
					switch subject.Kind {
					case "memory_revision", "memory_candidate", "context_entry":
						memorySubjects = append(memorySubjects, grants.MemorySubject{Kind: subject.Kind, ID: subject.ID})
					case "memory_proposal":
						proposalIDs = append(proposalIDs, subject.ID)
					default:
						return api.Invalid("INVALID_EVENT_DELIVERY")
					}
					continue
				}
				runID := subject.ID
				if subject.Kind == "message" {
					stored, found := messages[subject.ID]
					if !found {
						return fail("NOT_FOUND", "MESSAGE_NOT_FOUND")
					}
					runID = stored.runID
				}
				if !seen[runID] {
					seen[runID] = true
					runIDs = append(runIDs, runID)
				}
			}
			// Ownership/context come from the execution owner's bounded batch
			// reader, scoped to this transaction. Grant/expiry checks remain per
			// subject, including messages with distinct provenance in one Run.
			runs := map[string]api.RunAccessInput{}
			if len(runIDs) > 0 {
				runs, e = execution.ReadAccessBatchInTx(permit, tx, id, profile, runIDs)
				if e != nil {
					return e
				}
			}
			// The fence context outlives DeliveryLifetime so qualification SQL can
			// finish on a busy runner. The writer permit must not.
			until := time.Now().Add(grants.DeliveryLifetime)
			if fence, ok := permit.Deadline(); ok && fence.Before(until) {
				until = fence
			}
			inputs := make([]api.RunAccessInput, 0, len(subjects))
			for _, subject := range subjects {
				if subject.Kind != "run" && subject.Kind != "message" {
					continue
				}
				runID := subject.ID
				if subject.Kind == "message" {
					runID = messages[subject.ID].runID
				}
				in, found := runs[runID]
				if !found {
					return fail("NOT_FOUND", "RUN_NOT_FOUND")
				}
				if subject.Kind == "message" {
					in = contextaccess.HistoryReadInput(in, messages[subject.ID].sources)
					in.PublishedMessageID = subject.ID
					if subject.Attachments != nil {
						if e := s.access.CheckAttachmentsInTx(permit, tx, id, profile, subject.ID, *subject.Attachments); e != nil {
							return e
						}
					}
				}
				inputs = append(inputs, in)
			}
			if len(inputs) > 0 {
				required, e := s.access.ReadDeadlineBatchInTx(permit, tx, id, profile, inputs)
				if e != nil {
					return e
				}
				if required.Before(until) {
					until = required
				}
			}
			if len(memorySubjects) > 0 {
				required, e := s.access.ReadMemoryDeadlineBatchInTx(permit, tx, id, profile, memorySubjects)
				if e != nil {
					return e
				}
				if required.Before(until) {
					until = required
				}
			}
			if len(proposalIDs) > 0 {
				required, e := s.proposalDeadlineInTx(permit, tx, id, profile, proposalIDs)
				if e != nil {
					return e
				}
				if required.Before(until) {
					until = required
				}
			}
			deadlineCtx, cancel = context.WithDeadline(permit, until)
			return nil
		})
		if cancel != nil {
			defer cancel()
		}
		if e != nil {
			return e
		}
		if e = deadlineCtx.Err(); e != nil {
			return e
		}
		return fn(deadlineCtx)
	})
}

var _ app.Repository = (*Store)(nil)
