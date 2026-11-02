package memory

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"reflect"
	"strconv"
	"strings"

	conv "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/conversation"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/commands"
)

func validate(id api.RequestIdentity, method string, value any) error {
	if !id.Valid() {
		return api.Denied("IDENTITY_REQUIRED")
	}
	return api.ValidateMemoryRequest(method, value)
}
func (s *Store) Get(ctx context.Context, id api.RequestIdentity, q api.MemoryGet) (api.MemoryObject, error) {
	var out api.MemoryObject
	if q.Kind == "" {
		q.Kind = "item"
	}
	if err := validate(id, "memory.get", q); err != nil {
		return out, err
	}
	err := s.transaction(ctx, false, func(ctx context.Context, tx *sql.Tx) error {
		n, err := s.readNamespace(ctx, tx, id, q.ProfileID, q.Namespace)
		if err != nil {
			return err
		}
		out, err = s.object(ctx, tx, id, n, q)
		if err == nil {
			err = api.ValidateMemoryResult("memory.get", out)
		}
		return err
	})
	return out, err
}
func (s *Store) object(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, n namespace, q api.MemoryGet) (api.MemoryObject, error) {
	out := api.MemoryObject{Kind: q.Kind}
	switch q.Kind {
	case "settings":
		settings, err := s.settings(ctx, tx, n)
		out.Settings = &settings
		return out, err
	case "item":
		item, err := s.readItem(ctx, tx, id, n, q.ID)
		out.Item = &item
		return out, err
	case "candidate":
		candidate, err := s.readCandidate(ctx, tx, id, n, q.ID)
		out.Candidate = &candidate
		return out, err
	case "job":
		job, err := readJob(ctx, tx, n, q.ID)
		out.Job = &job
		return out, err
	case "context":
		view, err := s.contextView(ctx, tx, id, n, q)
		out.Context = &view
		return out, err
	case "proposal":
		reader := s.globalProposalReader()
		if reader == nil {
			return out, api.Denied("GLOBAL_MEMORY_NOT_ASSEMBLED")
		}
		proposal, err := reader.GetProposalInTx(ctx, tx, id, q.ProfileID, q.ID)
		if err != nil {
			return out, err
		}
		out.Proposal = &proposal
		return out, api.ValidateMemoryResult("memory.get", out)
	default:
		return out, api.Denied("METHOD_NOT_AVAILABLE")
	}
}

type pageCursor struct {
	Profile, Principal, Namespace, Kind, Query, Catalog, Suppression, After string
	Scope                                                                   *api.MemoryScope
}

func cursorEncode(v any) string { return base64.RawURLEncoding.EncodeToString([]byte(encode(v))) }
func cursorDecode(raw string, out any) error {
	b, err := base64.RawURLEncoding.DecodeString(raw)
	if err != nil || len(b) > 2048 {
		return api.Invalid("INVALID_CURSOR")
	}
	decoder := json.NewDecoder(strings.NewReader(string(b)))
	decoder.DisallowUnknownFields()
	if decoder.Decode(out) != nil {
		return api.Invalid("INVALID_CURSOR")
	}
	return nil
}
func pageLimit(n int) int {
	if n == 0 {
		return 20
	}
	return n
}
func safeUnavailable(err error) bool {
	var f *api.Fault
	if !errors.As(err, &f) {
		return false
	}
	if f.Kind != "CAPABILITY_DENIED" && !(f.Kind == "NOT_FOUND" && f.Reason == "GRANT_NOT_FOUND") {
		return false
	}
	switch f.Reason {
	case "MEMORY_NAMESPACE_DENIED", "MEMORY_SCOPE_MISMATCH", "MEMORY_REVISION_INACTIVE", "MEMORY_FORGOTTEN", "MEMORY_AUTO_DISABLED", "MEMORY_JOB_CHANGED", "GRANT_NOT_FOUND", "GRANT_EXPIRED", "GRANT_REVOKED", "SOURCE_NOT_GRANTED", "OPERATION_NOT_GRANTED", "RECIPIENT_NOT_GRANTED", "GROUP_MEMBER_REMOVED", "GROUP_MEMBER_GENERATION_CHANGED", "GROUP_HISTORY_CHANGED", "CONTEXT_MESSAGE_NOT_VISIBLE", "PARENT_SCOPE_EXCEEDED":
		return true
	}
	return false
}

func (s *Store) List(ctx context.Context, id api.RequestIdentity, q api.MemoryQuery) (api.MemoryPage, error) {
	out := api.MemoryPage{Items: []api.MemoryObject{}}
	if q.Kind == "" {
		q.Kind = "item"
	}
	if err := validate(id, "memory.list", q); err != nil {
		return out, err
	}
	err := s.transaction(ctx, false, func(ctx context.Context, tx *sql.Tx) error {
		n, err := s.readNamespace(ctx, tx, id, q.ProfileID, q.Namespace)
		if err != nil {
			return err
		}
		out.NamespaceRevision = strconv.FormatInt(n.Catalog, 10)
		if n.Public.Kind == "agent" {
			settings, err := s.settings(ctx, tx, n)
			if err != nil {
				return err
			}
			out.Settings = &settings
		}
		if q.Kind == "context" {
			return s.listContexts(ctx, tx, id, n, q, &out)
		}
		if q.Kind == "proposal" {
			reader := s.globalProposalReader()
			if reader == nil {
				return api.Denied("GLOBAL_MEMORY_NOT_ASSEMBLED")
			}
			page, e := reader.ListProposalsInTx(ctx, tx, id, q)
			if e != nil {
				return e
			}
			if api.ValidateMemoryResult("memory.list", page) != nil {
				return invalidState()
			}
			out = page
			return nil
		}
		if q.Scope != nil {
			if err := s.scope(ctx, tx, n, *q.Scope); err != nil {
				return err
			}
		}
		want := pageCursor{Profile: q.ProfileID, Principal: id.PrincipalID(), Namespace: n.Public.Kind + ":" + n.Public.ID, Kind: q.Kind, Query: digest(q.Query), Catalog: out.NamespaceRevision, Suppression: strconv.FormatInt(n.Suppression, 10), Scope: q.Scope}
		current := want
		if q.Cursor != "" {
			if err := cursorDecode(q.Cursor, &current); err != nil {
				return err
			}
			after := current.After
			current.After = ""
			if !reflect.DeepEqual(current, want) || len(after) > 512 {
				return fault("CURSOR_EXPIRED", "MEMORY_CHANGED")
			}
			current.After = after
		}
		table, column := "memory_items", "item_id"
		if q.Kind == "candidate" {
			table, column = "memory_candidates", "candidate_id"
		} else if q.Kind == "job" {
			table, column = "memory_jobs", "job_id"
		}
		query := "SELECT " + column + " FROM " + table + " WHERE namespace_id=? AND " + column + ">?"
		args := []any{n.ID, current.After}
		if q.Scope != nil && q.Kind != "job" {
			query += " AND scope_kind=? AND scope_id=?"
			args = append(args, q.Scope.Kind, q.Scope.ID)
		}
		if q.Scope != nil && q.Kind == "job" {
			query += " AND EXISTS(SELECT 1 FROM memory_completion_outbox o WHERE o.completion_id=memory_jobs.completion_id AND o.scope_kind=? AND o.scope_id=?)"
			args = append(args, q.Scope.Kind, q.Scope.ID)
		}
		query += " ORDER BY " + column + " LIMIT ?"
		args = append(args, pageLimit(q.Limit)+1)
		rows, err := tx.QueryContext(ctx, query, args...)
		if err != nil {
			return err
		}
		ids := []string{}
		for rows.Next() {
			var item string
			if err = rows.Scan(&item); err != nil {
				rows.Close()
				return err
			}
			ids = append(ids, item)
		}
		err = rows.Err()
		rows.Close()
		if err != nil {
			return err
		}
		more := len(ids) > pageLimit(q.Limit)
		if more {
			ids = ids[:pageLimit(q.Limit)]
		}
		for _, objectID := range ids {
			object, err := s.object(ctx, tx, id, n, api.MemoryGet{ProfileID: q.ProfileID, Namespace: q.Namespace, Kind: q.Kind, ID: objectID})
			if err != nil {
				if !safeUnavailable(err) {
					return err
				}
				current.After = objectID
				continue
			}
			if q.Query != "" {
				text := ""
				if object.Item != nil && object.Item.Body != nil {
					text = object.Item.Body.Text
				} else if object.Candidate != nil && object.Candidate.Body != nil {
					text = object.Candidate.Body.Text
				}
				if !strings.Contains(strings.ToLower(text), strings.ToLower(q.Query)) {
					current.After = objectID
					continue
				}
			}
			candidate := out
			candidate.Items = append(append([]api.MemoryObject{}, out.Items...), object)
			candidate.NextCursor = cursorEncode(current)
			if api.ValidateMemoryResult("memory.list", candidate) != nil {
				if len(out.Items) == 0 {
					return fault("RESOURCE_LIMIT", "MEMORY_PAGE_LIMIT")
				}
				more = true
				break
			}
			out.Items = append(out.Items, object)
			current.After = objectID
		}
		if more {
			out.NextCursor = cursorEncode(current)
		}
		return api.ValidateMemoryResult("memory.list", out)
	})
	return out, err
}

func (s *Store) Pin(ctx context.Context, id api.RequestIdentity, c api.MemoryPin) (api.MemoryItem, error) {
	var out api.MemoryItem
	if err := validate(id, "memory.pin", c); err != nil {
		return out, err
	}
	err := s.transaction(ctx, true, func(ctx context.Context, tx *sql.Tx) error {
		if _, err := conv.Epoch(ctx, tx, c.CommandMeta); err != nil {
			return err
		}
		found, err := conv.Receipt(ctx, tx, id, c.CommandMeta, "memory.pin", commands.Hash(c), &out)
		if err != nil {
			return err
		}
		if found {
			return s.receiptItem(ctx, tx, id, c.ProfileID, out)
		}
		if err := mutableID(ctx, tx, c.ID); err != nil {
			return err
		}
		n, err := s.readNamespace(ctx, tx, id, c.ProfileID, c.Namespace)
		if err != nil {
			return err
		}
		out, err = s.readItem(ctx, tx, id, n, c.ID)
		if err != nil {
			return err
		}
		if out.Revision != c.ExpectedRevision {
			return fault("CONFLICT", "REVISION_CONFLICT")
		}
		if out.State != "active" {
			return api.Denied("MEMORY_FORGOTTEN")
		}
		if err = changed(tx.ExecContext(ctx, "UPDATE memory_items SET pinned=?,revision=revision+1 WHERE item_id=? AND revision=? AND revision<9223372036854775807", c.Pinned, c.ID, c.ExpectedRevision)); err != nil {
			return err
		}
		if err = bump(ctx, tx, n.ID, false); err != nil {
			return err
		}
		out, err = s.readItem(ctx, tx, id, n, c.ID)
		if err != nil {
			return err
		}
		return conv.SaveReceipt(ctx, tx, id, c.CommandMeta, "memory.pin", commands.Hash(c), n.Public.ID, out)
	})
	return out, err
}

func (s *Store) Correct(ctx context.Context, id api.RequestIdentity, c api.MemoryCorrect) (api.MemoryItem, error) {
	var out api.MemoryItem
	if err := validate(id, "memory.correct", c); err != nil {
		return out, err
	}
	err := s.transaction(ctx, true, func(ctx context.Context, tx *sql.Tx) error {
		if _, err := conv.Epoch(ctx, tx, c.CommandMeta); err != nil {
			return err
		}
		found, err := conv.Receipt(ctx, tx, id, c.CommandMeta, "memory.correct", commands.Hash(c), &out)
		if err != nil {
			return err
		}
		if found {
			return s.receiptItem(ctx, tx, id, c.ProfileID, out)
		}
		if c.ID != "" {
			if err := mutableID(ctx, tx, c.ID); err != nil {
				return err
			}
		}
		n, err := s.readNamespace(ctx, tx, id, c.ProfileID, c.Namespace)
		if err != nil {
			return err
		}
		if c.Action == "add" {
			if strconv.FormatInt(n.Catalog, 10) != c.ExpectedRevision {
				return fault("CONFLICT", "REVISION_CONFLICT")
			}
			if err = s.scope(ctx, tx, n, *c.Scope); err != nil {
				return err
			}
			if err = materialize(ctx, tx, &n); err != nil {
				return err
			}
			body := api.MemoryBody{Text: c.Text, Hash: digest(c.Text), Provenance: "user", CreatorKind: "user", SourceRefs: []api.SourceSnapshot{}, SourceScopes: []api.SourceScope{}, Derived: []api.DerivedInput{}}
			out, err = newItem(ctx, tx, n, *c.Scope, body)
		} else {
			var old api.MemoryItem
			old, err = s.readItem(ctx, tx, id, n, c.ID)
			if err != nil {
				return err
			}
			if old.Revision != c.ExpectedRevision {
				return fault("CONFLICT", "REVISION_CONFLICT")
			}
			if old.State != "active" {
				return api.Denied("MEMORY_FORGOTTEN")
			}
			body := *old.Body
			body.Text, body.Hash, body.CreatorKind, body.CreatorAgentID, body.JobID, body.Provenance = c.Text, digest(c.Text), "user", "", "", "user"
			if c.Action == "apply_candidate" {
				candidate, err := s.readCandidate(ctx, tx, id, n, c.CandidateID)
				if err != nil {
					return err
				}
				if candidate.Revision != c.CandidateRevision {
					return fault("CONFLICT", "REVISION_CONFLICT")
				}
				if candidate.State != "pending" || candidate.Operation != "correct" || candidate.TargetItemID != old.ID || candidate.Scope != old.Scope || candidate.Body == nil {
					return fault("CONFLICT", "MEMORY_CANDIDATE_CHANGED")
				}
				body, err = mergeBodies(*candidate.Body, *old.Body)
				if err != nil {
					return err
				}
				if err = changed(tx.ExecContext(ctx, "UPDATE memory_candidates SET state='applied',revision=revision+1 WHERE candidate_id=? AND revision=? AND revision<9223372036854775807 AND state='pending'", candidate.ID, candidate.Revision)); err != nil {
					return err
				}
			}
			out, err = replaceItem(ctx, tx, n, old, body)
			if err == nil {
				err = protect(ctx, tx, n, old, "protect_item", c.IdempotencyKey)
			}
		}
		if err != nil {
			return err
		}
		if err = bump(ctx, tx, n.ID, c.Action != "add"); err != nil {
			return err
		}
		return conv.SaveReceipt(ctx, tx, id, c.CommandMeta, "memory.correct", commands.Hash(c), n.Public.ID, out)
	})
	return out, err
}

func (s *Store) Forget(ctx context.Context, id api.RequestIdentity, c api.MemoryForget) (api.MemoryItem, error) {
	var out api.MemoryItem
	if err := validate(id, "memory.forget", c); err != nil {
		return out, err
	}
	err := s.transaction(ctx, true, func(ctx context.Context, tx *sql.Tx) error {
		if _, err := conv.Epoch(ctx, tx, c.CommandMeta); err != nil {
			return err
		}
		found, err := conv.Receipt(ctx, tx, id, c.CommandMeta, "memory.forget", commands.Hash(c), &out)
		if err != nil || found {
			return err
		}
		if err := mutableID(ctx, tx, c.ID); err != nil {
			return err
		}
		n, err := s.readNamespace(ctx, tx, id, c.ProfileID, c.Namespace)
		if err != nil {
			return err
		}
		out, err = itemMetadata(ctx, tx, n, c.ID)
		if err != nil {
			return err
		}
		if out.Revision != c.ExpectedRevision {
			return fault("CONFLICT", "REVISION_CONFLICT")
		}
		if out.State == "active" {
			// Forget may revoke an already unreadable source. It needs ownership,
			// not permission to display or send that source's old body.
			out.Body, err = revisionBody(ctx, tx, out.RevisionID)
			if err != nil {
				return err
			}
			if err = protect(ctx, tx, n, out, "deny_automatic", c.IdempotencyKey); err != nil {
				return err
			}
		}
		if err = changed(tx.ExecContext(ctx, "UPDATE memory_items SET state='forgotten',revision=revision+1 WHERE item_id=? AND revision=? AND revision<9223372036854775807", c.ID, c.ExpectedRevision)); err != nil {
			return err
		}
		if _, err = tx.ExecContext(ctx, "DELETE FROM memory_index WHERE item_id=?", c.ID); err != nil {
			return err
		}
		if err = bump(ctx, tx, n.ID, true); err != nil {
			return err
		}
		out, err = itemMetadata(ctx, tx, n, c.ID)
		if err != nil {
			return err
		}
		return conv.SaveReceipt(ctx, tx, id, c.CommandMeta, "memory.forget", commands.Hash(c), n.Public.ID, out)
	})
	return out, err
}

func (s *Store) SetAutoMaintenance(ctx context.Context, id api.RequestIdentity, c api.MemorySetAuto) (api.MemorySettings, error) {
	var out api.MemorySettings
	if err := validate(id, "memory.setAutoMaintenance", c); err != nil {
		return out, err
	}
	err := s.transaction(ctx, true, func(ctx context.Context, tx *sql.Tx) error {
		if _, err := conv.Epoch(ctx, tx, c.CommandMeta); err != nil {
			return err
		}
		found, err := conv.Receipt(ctx, tx, id, c.CommandMeta, "memory.setAutoMaintenance", commands.Hash(c), &out)
		if err != nil || found {
			return err
		}
		n, err := s.readNamespace(ctx, tx, id, c.ProfileID, c.Namespace)
		if err != nil {
			return err
		}
		if strconv.FormatInt(n.Settings, 10) != c.ExpectedRevision {
			return fault("CONFLICT", "REVISION_CONFLICT")
		}
		if err = materialize(ctx, tx, &n); err != nil {
			return err
		}
		if err = changed(tx.ExecContext(ctx, "UPDATE memory_namespaces SET enabled=?,settings_revision=settings_revision+1 WHERE namespace_id=? AND settings_revision=? AND settings_revision<9223372036854775807", c.Enabled, n.ID, c.ExpectedRevision)); err != nil {
			return err
		}
		if err = bump(ctx, tx, n.ID, false); err != nil {
			return err
		}
		n.Settings++
		n.Enabled = c.Enabled
		out, err = s.settings(ctx, tx, n)
		if err != nil {
			return err
		}
		return conv.SaveReceipt(ctx, tx, id, c.CommandMeta, "memory.setAutoMaintenance", commands.Hash(c), n.Public.ID, out)
	})
	return out, err
}
