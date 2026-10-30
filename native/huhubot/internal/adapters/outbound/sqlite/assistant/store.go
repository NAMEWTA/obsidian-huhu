package assistant

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strconv"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	app "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/assistant"
)

type UsageReader interface {
	SnapshotUsageInTx(context.Context, *sql.Tx, string) (api.AgentUsage, error)
}
type Store struct {
	base  *base.Store
	usage UsageReader
}

func (s *Store) SetUsageReader(r UsageReader) { s.usage = r }

func New(b *base.Store) *Store       { return &Store{base: b} }
func fail(kind, reason string) error { return &api.Fault{Kind: kind, Reason: reason} }

type queryer interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

func metadata(ctx context.Context, q queryer) (api.ProfileMetadata, error) {
	var p api.ProfileMetadata
	e := q.QueryRowContext(ctx, "SELECT profile_id,CAST(command_epoch AS TEXT),CAST(revision AS TEXT),created_at FROM profile_metadata WHERE singleton=1").Scan(&p.ProfileID, &p.CommandEpoch, &p.Revision, &p.CreatedAt)
	return p, e
}
func profileCheck(p api.ProfileMetadata, id string) error {
	if p.ProfileID != id {
		return api.Denied("PROFILE_MISMATCH")
	}
	return nil
}
func newAgentID(ctx context.Context, tx *sql.Tx) (string, error) {
	for range 8 {
		id := api.NewID("agent:")
		var n int
		if e := tx.QueryRowContext(ctx, "SELECT (SELECT count(*) FROM agents WHERE agent_id=?)+(SELECT count(*) FROM assistant_identity_tombstones WHERE agent_id=?)", id, id).Scan(&n); e != nil {
			return "", e
		}
		if n == 0 {
			return id, nil
		}
	}
	return "", fail("RESOURCE_LIMIT", "IDENTITY_EXHAUSTED")
}
func (s *Store) EnsureDefault(ctx context.Context) error {
	return s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if err := base.CheckDataAdmission(ctx, tx); err != nil {
			var fault *api.Fault
			if errors.As(err, &fault) && fault.Reason == "PROFILE_CLEANUP_PENDING" {
				// Restricted startup serves the pending cleanup, without
				// reintroducing business rows into the committed SQL erasure.
				return nil
			}
			return err
		}
		var n int
		if e := tx.QueryRowContext(ctx, "SELECT (SELECT count(*) FROM agents)+(SELECT count(*) FROM assistant_identity_tombstones)").Scan(&n); e != nil {
			return e
		}
		if n != 0 {
			return nil
		}
		id, e := newAgentID(ctx, tx)
		if e != nil {
			return e
		}
		if _, e := tx.ExecContext(ctx, "INSERT INTO agents VALUES(?,1,1,0,1,1)", id); e != nil {
			return e
		}
		body, _ := json.Marshal(api.AgentDraft{Name: "HUHU", Description: "", Persona: ""})
		_, e = tx.ExecContext(ctx, "INSERT INTO persona_revisions VALUES(?,1,?)", id, string(body))
		return e
	})
}
func readAgent(ctx context.Context, q queryer, id string) (api.Agent, error) {
	var a api.Agent
	var body string
	e := q.QueryRowContext(ctx, "SELECT a.agent_id,CAST(a.revision AS TEXT),CAST(a.persona_revision AS TEXT),CAST(a.model_revision AS TEXT),a.enabled,a.is_default,p.body FROM agents a JOIN persona_revisions p ON p.agent_id=a.agent_id AND p.revision=a.persona_revision WHERE a.agent_id=?", id).Scan(&a.ID, &a.Revision, &a.PersonaRevision, &a.ModelBindingRevision, &a.Enabled, &a.IsDefault, &body)
	if errors.Is(e, sql.ErrNoRows) {
		return a, fail("NOT_FOUND", "AGENT_NOT_FOUND")
	}
	if e != nil {
		return a, e
	}
	return hydrateAgent(ctx, q, a, body)
}
func hydrateAgent(ctx context.Context, q queryer, a api.Agent, body string) (api.Agent, error) {
	var e error
	var d api.AgentDraft
	if e = json.Unmarshal([]byte(body), &d); e != nil {
		return a, e
	}
	a.Name = d.Name
	a.Description = d.Description
	a.Persona = d.Persona
	a.AllowedTools = d.AllowedTools
	a.AllowedCollaborationTargets = d.AllowedCollaborationTargets
	if a.ModelBindingRevision != "0" {
		var modelBody string
		var ref sql.NullString
		if e = q.QueryRowContext(ctx, "SELECT body,credential_ref FROM model_binding_revisions WHERE agent_id=? AND revision=?", a.ID, a.ModelBindingRevision).Scan(&modelBody, &ref); e != nil {
			return a, e
		}
		m := &api.ModelBinding{Revision: a.ModelBindingRevision, CredentialStatus: api.CredentialStatus{Mode: "none", State: "missing", Reason: "CREDENTIAL_MISSING"}}
		if e = json.Unmarshal([]byte(modelBody), &m.ModelBindingDraft); e != nil {
			return a, e
		}
		if ref.Valid {
			if e = q.QueryRowContext(ctx, "SELECT mode,state,reason FROM credential_metadata WHERE credential_ref=?", ref.String).Scan(&m.CredentialStatus.Mode, &m.CredentialStatus.State, &m.CredentialStatus.Reason); e != nil {
				return a, e
			}
		}
		a.Model = m
	}
	return a, nil
}
func (s *Store) Get(ctx context.Context, q api.IDQuery) (api.Agent, error) {
	var a api.Agent
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		p, e := metadata(ctx, tx)
		if e != nil {
			return e
		}
		if e = profileCheck(p, q.ProfileID); e != nil {
			return e
		}
		a, e = readAgent(ctx, tx, q.ID)
		return e
	})
	return a, e
}

type cursor struct{ After, Revision string }

func (s *Store) List(ctx context.Context, q api.PageQuery) (api.AgentPage, error) {
	page := api.AgentPage{Items: []api.Agent{}}
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		p, e := metadata(ctx, tx)
		if e != nil {
			return e
		}
		if e = profileCheck(p, q.ProfileID); e != nil {
			return e
		}
		cur := cursor{}
		if q.Cursor != "" {
			b, e := base64.RawURLEncoding.DecodeString(q.Cursor)
			if e != nil || json.Unmarshal(b, &cur) != nil {
				return api.Invalid("INVALID_CURSOR")
			}
			if cur.Revision != p.Revision {
				return fail("CURSOR_EXPIRED", "DIRECTORY_CHANGED")
			}
		}
		limit := q.Limit
		if limit == 0 {
			limit = 50
		}
		if limit < 1 || limit > 100 {
			return api.Invalid("INVALID_PAGE_LIMIT")
		}
		rows, e := tx.QueryContext(ctx, "SELECT agent_id FROM agents WHERE agent_id>? ORDER BY agent_id LIMIT ?", cur.After, limit+1)
		if e != nil {
			return e
		}
		ids := []string{}
		for rows.Next() {
			var id string
			if e = rows.Scan(&id); e != nil {
				_ = rows.Close()
				return e
			}
			ids = append(ids, id)
		}
		e = rows.Err()
		_ = rows.Close()
		if e != nil {
			return e
		}
		more := len(ids) > limit
		if more {
			ids = ids[:limit]
		}
		budget := 0
		for _, id := range ids {
			a, e := readAgent(ctx, tx, id)
			if e != nil {
				return e
			}
			encoded, e := json.Marshal(a)
			if e != nil {
				return e
			}
			if len(encoded) > 512*1024 {
				return fail("RESOURCE_LIMIT", "AGENT_CONFIG_TOO_LARGE")
			}
			if len(page.Items) > 0 && budget+len(encoded) > 512*1024 {
				more = true
				break
			}
			page.Items = append(page.Items, a)
			budget += len(encoded)
		}
		if more && len(page.Items) > 0 {
			b, _ := json.Marshal(cursor{After: page.Items[len(page.Items)-1].ID, Revision: p.Revision})
			page.NextCursor = base64.RawURLEncoding.EncodeToString(b)
		}

		return nil
	})
	return page, e
}
func gc(ctx context.Context, tx *sql.Tx, id string) error {
	_, e := tx.ExecContext(ctx, "DELETE FROM persona_revisions WHERE agent_id=? AND revision<>(SELECT persona_revision FROM agents WHERE agent_id=?) AND revision NOT IN(SELECT persona_revision FROM config_snapshot_pins WHERE agent_id=?)", id, id, id)
	if e != nil {
		return e
	}
	_, e = tx.ExecContext(ctx, "DELETE FROM model_binding_revisions WHERE agent_id=? AND revision<>(SELECT model_revision FROM agents WHERE agent_id=?) AND revision NOT IN(SELECT model_revision FROM config_snapshot_pins WHERE agent_id=?)", id, id, id)
	return e
}
func saveConfig(ctx context.Context, tx *sql.Tx, id string, d api.AgentDraft, personaRevision, modelRevision string) error {
	m := d.Model
	if m != nil && m.Capabilities == nil {
		copyModel := *m
		copyModel.Capabilities = []string{}
		m = &copyModel
	}
	d.Model = nil
	b, e := json.Marshal(d)
	if e != nil {
		return e
	}
	if _, e = tx.ExecContext(ctx, "INSERT INTO persona_revisions VALUES(?,?,?)", id, personaRevision, string(b)); e != nil {
		return e
	}
	if m != nil {
		var ref any
		if m.CredentialRef != "" {
			var deleting int
			if e = tx.QueryRowContext(ctx, "SELECT deleting FROM credential_metadata WHERE credential_ref=? AND profile_id=(SELECT profile_id FROM profile_metadata WHERE singleton=1)", m.CredentialRef).Scan(&deleting); errors.Is(e, sql.ErrNoRows) {
				return fail("MODEL_UNAVAILABLE", "CREDENTIAL_MISSING")
			}
			if e != nil {
				return e
			}
			if deleting != 0 {
				return fail("CONFLICT", "CREDENTIAL_IN_USE")
			}
			ref = m.CredentialRef
		}
		b, e = json.Marshal(m)
		if e != nil {
			return e
		}
		if _, e = tx.ExecContext(ctx, "INSERT INTO model_binding_revisions VALUES(?,?,?,?)", id, modelRevision, string(b), ref); e != nil {
			return e
		}
	}
	return nil
}
func next(v string) (string, error) {
	n, e := strconv.ParseInt(v, 10, 64)
	if e != nil || n == 1<<63-1 {
		return "", fail("RESOURCE_LIMIT", "REVISION_EXHAUSTED")
	}
	return strconv.FormatInt(n+1, 10), nil
}
func (s *Store) Mutate(ctx context.Context, m app.Mutation) (app.MutationResult, error) {
	var out app.MutationResult
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error { var e error; out, e = s.MutateInTx(ctx, tx, m); return e })
	// The single Profile connection is owned by WithinTx until commit. A WAL
	// checkpoint must run after that ownership ends, never from MutateInTx.
	if e == nil && m.Kind == "agents.delete" {
		_, _ = s.base.Database().ExecContext(ctx, "PRAGMA wal_checkpoint(TRUNCATE)")
	}
	return out, e
}
func (s *Store) MutateInTx(ctx context.Context, tx *sql.Tx, m app.Mutation) (app.MutationResult, error) {
	var out app.MutationResult
	if err := base.CheckDataAdmission(ctx, tx); err != nil {
		return out, err
	}
	e := func() error {
		p, e := metadata(ctx, tx)
		if e != nil {
			return e
		}
		if e = profileCheck(p, m.Meta.ProfileID); e != nil {
			return e
		}
		// Epoch precedes receipt lookup so erased persona receipts cannot be replayed.
		if p.CommandEpoch != m.Meta.CommandEpoch {
			return fail("CONFLICT", "COMMAND_EPOCH_CONFLICT")
		}
		var hash, body string
		e = tx.QueryRowContext(ctx, "SELECT input_hash,result_json FROM command_receipts WHERE profile_id=? AND principal_id=? AND method=? AND idempotency_key=?", p.ProfileID, m.Identity.PrincipalID(), m.Kind, m.Meta.IdempotencyKey).Scan(&hash, &body)
		if e == nil {
			if hash != m.InputHash {
				return fail("IDEMPOTENCY_CONFLICT", "IDEMPOTENCY_INPUT_MISMATCH")
			}
			return json.Unmarshal([]byte(body), &out)
		}
		if !errors.Is(e, sql.ErrNoRows) {
			return e
		}
		id := m.ID
		if m.Kind == "agents.create" {
			id, e = newAgentID(ctx, tx)
			if e != nil {
				return e
			}
			modelRev := "0"
			if m.Draft.Model != nil {
				modelRev = "1"
			}
			if _, e = tx.ExecContext(ctx, "INSERT INTO agents VALUES(?,1,1,?,1,0)", id, modelRev); e != nil {
				return e
			}
			if e = saveConfig(ctx, tx, id, m.Draft, "1", modelRev); e != nil {
				return e
			}
		} else {
			a, e := readAgent(ctx, tx, id)
			if e != nil {
				return e
			}
			if a.Revision != m.Meta.ExpectedRevision {
				return fail("CONFLICT", "REVISION_CONFLICT")
			}
			rev, e := next(a.Revision)
			if e != nil {
				return e
			}
			switch m.Kind {
			case "agents.disable":
				_, e = tx.ExecContext(ctx, "UPDATE agents SET revision=?,enabled=0 WHERE agent_id=?", rev, id)
			case "agents.update", "models.bind":
				d := m.Draft
				if m.Kind == "models.bind" {
					d = api.AgentDraft{Name: a.Name, Description: a.Description, Persona: a.Persona, Model: m.Model, AllowedTools: a.AllowedTools, AllowedCollaborationTargets: a.AllowedCollaborationTargets}
				}
				pr, e2 := next(a.PersonaRevision)
				if e2 != nil {
					return e2
				}
				mr := a.ModelBindingRevision
				if d.Model != nil {
					mr = rev
				} else {
					mr = "0"
				}
				if e = saveConfig(ctx, tx, id, d, pr, mr); e != nil {
					return e
				}
				_, e = tx.ExecContext(ctx, "UPDATE agents SET revision=?,persona_revision=?,model_revision=? WHERE agent_id=?", rev, pr, mr, id)
				if e == nil {
					e = gc(ctx, tx, id)
				}
			case "agents.delete":
				if s.usage != nil {
					u, e2 := s.usage.SnapshotUsageInTx(ctx, tx, id)
					if e2 != nil {
						return e2
					}
					if len(u.ActiveRunIDs)+len(u.GroupIDs)+len(u.MemoryIDs) > 0 {
						return fail("CONFLICT", "AGENT_IN_USE")
					}
					if app.UsageDigest(u) != m.UsageHash {
						return fail("CONFLICT", "DELETION_PREVIEW_STALE")
					}
				}
				if a.Enabled {
					return fail("CONFLICT", "AGENT_MUST_BE_DISABLED")
				}
				var epoch, revision, usage, expiry, principal string
				e = tx.QueryRowContext(ctx, "SELECT CAST(command_epoch AS TEXT),CAST(revision AS TEXT),usage_hash,expires_at,principal_id FROM agent_deletion_previews WHERE token=? AND agent_id=? AND profile_id=?", m.PreviewToken, id, p.ProfileID).Scan(&epoch, &revision, &usage, &expiry, &principal)
				var clock string
				if clockErr := tx.QueryRowContext(ctx, "SELECT CAST(revision AS TEXT) FROM assistant_usage_clock WHERE singleton=1").Scan(&clock); clockErr != nil {
					return clockErr
				}
				if e != nil || epoch != p.CommandEpoch || revision != a.Revision || usage != m.UsageHash+":"+clock || principal != m.Identity.PrincipalID() {
					return fail("CONFLICT", "DELETION_PREVIEW_STALE")
				}
				expires, e2 := time.Parse(time.RFC3339Nano, expiry)
				if e2 != nil || !m.Now.Before(expires) {
					return fail("CONFLICT", "DELETION_PREVIEW_EXPIRED")
				}
				var pins int
				if e = tx.QueryRowContext(ctx, "SELECT count(*) FROM config_snapshot_pins WHERE agent_id=?", id).Scan(&pins); e != nil {
					return e
				}
				if pins != 0 {
					return fail("CONFLICT", "AGENT_IN_USE")
				}
				if _, e = tx.ExecContext(ctx, "DELETE FROM command_receipts WHERE agent_id=?", id); e != nil {
					return e
				}
				if _, e = tx.ExecContext(ctx, "INSERT INTO assistant_identity_tombstones VALUES(?)", id); e != nil {
					return e
				}
				if _, e = tx.ExecContext(ctx, "DELETE FROM agents WHERE agent_id=?", id); e != nil {
					return e
				}
				// Purging body-containing receipts invalidates every command's old epoch.
				newEpoch, e2 := next(p.CommandEpoch)
				if e2 != nil {
					return e2
				}
				if _, e = tx.ExecContext(ctx, "UPDATE profile_metadata SET command_epoch=? WHERE singleton=1", newEpoch); e != nil {
					return e
				}
				out.Receipt = api.Receipt{CommandID: m.Meta.CommandID, ReceiptID: api.NewID("receipt:"), Revision: rev}
			default:
				return api.Invalid("UNKNOWN_AGENT_MUTATION")
			}
			if e != nil {
				return e
			}
		}
		if m.Kind != "agents.delete" {
			out.Agent, e = readAgent(ctx, tx, id)
			if e != nil {
				return e
			}
		}
		newRevision, e2 := next(p.Revision)
		if e2 != nil {
			return e2
		}
		if _, e = tx.ExecContext(ctx, "UPDATE profile_metadata SET revision=? WHERE singleton=1", newRevision); e != nil {
			return e
		}
		bodyBytes, e := json.Marshal(out)
		if e != nil {
			return e
		}
		_, e = tx.ExecContext(ctx, "INSERT INTO command_receipts VALUES(?,?,?,?,?,?,?)", p.ProfileID, m.Identity.PrincipalID(), m.Kind, m.Meta.IdempotencyKey, m.InputHash, id, string(bodyBytes))
		return e
	}()
	return out, e
}
func (s *Store) Preview(ctx context.Context, id api.RequestIdentity, q api.IDQuery, usage string, categories []api.DeletionCategory, now time.Time) (api.DeletionPreview, error) {
	var preview api.DeletionPreview
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		p, e := metadata(ctx, tx)
		if e != nil {
			return e
		}
		if e = profileCheck(p, q.ProfileID); e != nil {
			return e
		}
		a, e := readAgent(ctx, tx, q.ID)
		if e != nil {
			return e
		}
		var pins int
		if e = tx.QueryRowContext(ctx, "SELECT count(*) FROM config_snapshot_pins WHERE agent_id=?", q.ID).Scan(&pins); e != nil {
			return e
		}
		var clock string
		if e = tx.QueryRowContext(ctx, "SELECT CAST(revision AS TEXT) FROM assistant_usage_clock WHERE singleton=1").Scan(&clock); e != nil {
			return e
		}
		usage += ":" + clock
		if a.Enabled {
			categories = append(categories, api.DeletionCategory{Kind: "agent-admission", Count: 1, Retained: true, Reason: "AGENT_MUST_BE_DISABLED"})
		}
		if s.usage != nil {
			u, e2 := s.usage.SnapshotUsageInTx(ctx, tx, q.ID)
			if e2 != nil {
				return e2
			}
			usage = app.UsageDigest(u) + ":" + clock
		}
		preview = api.DeletionPreview{Token: api.NewID("preview:"), Revision: a.Revision, ExpiresAt: now.Add(5 * time.Minute).UTC().Format(api.TimestampLayout), Categories: append(categories, api.DeletionCategory{Kind: "configuration-snapshots", Count: pins, Retained: pins > 0})}
		if _, e = tx.ExecContext(ctx, "DELETE FROM agent_deletion_previews WHERE expires_at<=?", now.UTC().Format(api.TimestampLayout)); e != nil {
			return e
		}
		if _, e = tx.ExecContext(ctx, "DELETE FROM agent_deletion_previews WHERE agent_id=? AND principal_id=?", q.ID, id.PrincipalID()); e != nil {
			return e
		}
		_, e = tx.ExecContext(ctx, "INSERT INTO agent_deletion_previews VALUES(?,?,?,?,?,?,?,?)", preview.Token, p.ProfileID, id.PrincipalID(), q.ID, p.CommandEpoch, a.Revision, usage, preview.ExpiresAt)
		return e
	})
	return preview, e
}
func (s *Store) PinInTx(ctx context.Context, tx *sql.Tx, profileID, id string) (api.ConfigSnapshot, error) {
	p, e := metadata(ctx, tx)
	if e != nil {
		return api.ConfigSnapshot{}, e
	}
	if e = profileCheck(p, profileID); e != nil {
		return api.ConfigSnapshot{}, e
	}
	a, e := readAgent(ctx, tx, id)
	if e != nil {
		return api.ConfigSnapshot{}, e
	}
	if !a.Enabled {
		return api.ConfigSnapshot{}, fail("CONFLICT", "AGENT_DISABLED")
	}
	if a.Model != nil && a.Model.CredentialRef != "" {
		var deleting int
		if e = tx.QueryRowContext(ctx, "SELECT deleting FROM credential_metadata WHERE credential_ref=?", a.Model.CredentialRef).Scan(&deleting); e != nil {
			return api.ConfigSnapshot{}, e
		}
		if deleting != 0 {
			return api.ConfigSnapshot{}, fail("CONFLICT", "CREDENTIAL_IN_USE")
		}
	}
	snap := api.ConfigSnapshot{Token: api.NewID("config:"), Agent: a}
	if _, e = tx.ExecContext(ctx, "INSERT INTO config_snapshot_pins VALUES(?,?,?,?,?,?,?)", snap.Token, id, a.Revision, a.PersonaRevision, a.ModelBindingRevision, a.Enabled, a.IsDefault); e != nil {
		return snap, e
	}
	_, e = tx.ExecContext(ctx, "UPDATE assistant_usage_clock SET revision=revision+1 WHERE singleton=1")
	return snap, e
}
func (s *Store) ReadPinInTx(ctx context.Context, tx *sql.Tx, token string) (api.ConfigSnapshot, error) {
	var a api.Agent
	var body string
	e := tx.QueryRowContext(ctx, "SELECT p.agent_id,CAST(p.agent_revision AS TEXT),CAST(p.persona_revision AS TEXT),CAST(p.model_revision AS TEXT),p.enabled,p.is_default,r.body FROM config_snapshot_pins p JOIN persona_revisions r ON r.agent_id=p.agent_id AND r.revision=p.persona_revision WHERE p.token=?", token).Scan(&a.ID, &a.Revision, &a.PersonaRevision, &a.ModelBindingRevision, &a.Enabled, &a.IsDefault, &body)
	if e != nil {
		return api.ConfigSnapshot{}, fail("RECOVERY_BLOCKED", "CONFIG_SNAPSHOT_UNAVAILABLE")
	}
	a, e = hydrateAgent(ctx, tx, a, body)
	return api.ConfigSnapshot{Token: token, Agent: a}, e
}
func (s *Store) ReleaseInTx(ctx context.Context, tx *sql.Tx, token string) error {
	var id string
	e := tx.QueryRowContext(ctx, "SELECT agent_id FROM config_snapshot_pins WHERE token=?", token).Scan(&id)
	if errors.Is(e, sql.ErrNoRows) {
		return nil
	}
	if e != nil {
		return e
	}
	if _, e = tx.ExecContext(ctx, "DELETE FROM config_snapshot_pins WHERE token=?", token); e != nil {
		return e
	}
	if _, e = tx.ExecContext(ctx, "UPDATE assistant_usage_clock SET revision=revision+1 WHERE singleton=1"); e != nil {
		return e
	}
	return gc(ctx, tx, id)
}
func (s *Store) Acquire(ctx context.Context, profileID, id string) (api.ConfigSnapshot, error) {
	var snap api.ConfigSnapshot
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error { var e error; snap, e = s.PinInTx(ctx, tx, profileID, id); return e })
	return snap, e
}
func (s *Store) Release(ctx context.Context, token string) error {
	return s.base.WithinTx(ctx, func(tx *sql.Tx) error { return s.ReleaseInTx(ctx, tx, token) })
}

// ReadAgentInTx shares the canonical scanner and Profile check, without opening
// a second transaction. Execution callers still apply their current policy.
func (s *Store) ReadAgentInTx(ctx context.Context, tx *sql.Tx, profileID, agentID string) (api.Agent, error) {
	p, e := metadata(ctx, tx)
	if e != nil {
		return api.Agent{}, e
	}
	if e = profileCheck(p, profileID); e != nil {
		return api.Agent{}, e
	}
	return readAgent(ctx, tx, agentID)
}
func (s *Store) CreateInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, c api.AgentCreate, hash string) (api.Agent, error) {
	if e := app.ValidateCreate(id, c); e != nil {
		return api.Agent{}, e
	}
	out, e := s.MutateInTx(ctx, tx, app.Mutation{Identity: id, Meta: c.CommandMeta, Kind: "agents.create", Draft: c.Draft, InputHash: hash, Now: time.Now()})
	return out.Agent, e
}

// PinTaskInTx records an independent immutable configuration in the same UoW
// as its Run. Temporary subjects never acquire an agents row or Sponsor history.
func (s *Store) PinTaskInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profileID, subjectID, runID, targetID string, temporary *api.TaskConfigDraft) (api.TaskConfigSnapshot, string, error) {
	var out api.TaskConfigSnapshot
	var legacy string
	if !id.Valid() || subjectID == "" || runID == "" {
		return out, "", api.Denied("TASK_CONFIG_INVALID")
	}
	p, e := metadata(ctx, tx)
	if e != nil {
		return out, "", e
	}
	if e = profileCheck(p, profileID); e != nil {
		return out, "", e
	}
	out = api.TaskConfigSnapshot{ID: api.NewID("snapshot:"), SubjectID: subjectID, Kind: "agent"}
	if temporary == nil {
		snap, e := s.PinInTx(ctx, tx, profileID, targetID)
		if e != nil {
			return out, "", e
		}
		out.Agent = snap.Agent
		out.SubjectID = snap.Agent.ID
		legacy = snap.Token
	} else {
		if e = app.ValidateDraft(temporary.Draft); e != nil {
			return out, "", e
		}
		sponsor, e := readAgent(ctx, tx, temporary.SponsorAgentID)
		if e != nil {
			return out, "", e
		}
		if !sponsor.Enabled {
			return out, "", fail("CONFLICT", "AGENT_DISABLED")
		}
		d := temporary.Draft
		out.Kind = "temporary"
		out.SponsorAgentID = sponsor.ID
		out.Agent = api.Agent{ID: subjectID, Name: d.Name, Description: d.Description, Persona: d.Persona, AllowedTools: d.AllowedTools, AllowedCollaborationTargets: d.AllowedCollaborationTargets, Revision: "1", PersonaRevision: "1", ModelBindingRevision: "0", Enabled: true}
		if d.Model != nil {
			model := *d.Model
			model.Capabilities = append([]string{}, model.Capabilities...)
			out.Agent.ModelBindingRevision = "1"
			out.Agent.Model = &api.ModelBinding{ModelBindingDraft: model, Revision: "1"}
		}
	}
	ref := ""
	if out.Agent.Model != nil {
		ref = out.Agent.Model.CredentialRef
	}
	if ref != "" {
		var deleting int
		e = tx.QueryRowContext(ctx, "SELECT deleting FROM credential_metadata WHERE credential_ref=? AND profile_id=?", ref, profileID).Scan(&deleting)
		if errors.Is(e, sql.ErrNoRows) {
			return out, "", fail("MODEL_UNAVAILABLE", "CREDENTIAL_MISSING")
		}
		if e != nil {
			return out, "", e
		}
		if deleting != 0 {
			return out, "", fail("CONFLICT", "CREDENTIAL_IN_USE")
		}
	}
	body, e := json.Marshal(out)
	if e != nil {
		return out, "", e
	}
	agentID := targetID
	if temporary != nil {
		agentID = ""
	}
	_, e = tx.ExecContext(ctx, "INSERT INTO task_config_snapshots VALUES(?,?,?,?,?,?,?,?,?,?,'active',?)", out.ID, profileID, id.PrincipalID(), out.SubjectID, out.SponsorAgentID, agentID, out.Agent.PersonaRevision, out.Agent.ModelBindingRevision, ref, string(body), time.Now().UTC().Format(api.TimestampLayout))
	return out, legacy, e
}
func (s *Store) ReadTaskInTx(ctx context.Context, tx *sql.Tx, runID, snapshotID string) (api.TaskConfigSnapshot, error) {
	var out api.TaskConfigSnapshot
	var body string
	e := tx.QueryRowContext(ctx, "SELECT c.config_json FROM task_config_snapshots c JOIN task_config_pins p ON p.snapshot_id=c.snapshot_id WHERE c.snapshot_id=? AND p.run_id=? AND c.state IN('active','retained')", snapshotID, runID).Scan(&body)
	if e != nil {
		return out, fail("RECOVERY_BLOCKED", "CONFIG_SNAPSHOT_UNAVAILABLE")
	}
	if json.Unmarshal([]byte(body), &out) != nil || out.ID != snapshotID {
		return out, fail("RECOVERY_BLOCKED", "CONFIG_SNAPSHOT_UNAVAILABLE")
	}
	return out, nil
}
func (s *Store) ReleaseTaskInTx(ctx context.Context, tx *sql.Tx, runID string, retain bool) error {
	state := "released"
	if retain {
		state = "retained"
	}
	if _, e := tx.ExecContext(ctx, "UPDATE task_config_snapshots SET state=? WHERE snapshot_id IN(SELECT snapshot_id FROM task_config_pins WHERE run_id=?)", state, runID); e != nil {
		return e
	}
	if !retain {
		_, e := tx.ExecContext(ctx, "DELETE FROM task_config_pins WHERE run_id=?", runID)
		return e
	}
	return nil
}

// CloneTaskInTx admits new work from an owned immutable task configuration.
// It neither revives the old pin nor silently substitutes today's configuration.
func (s *Store) CloneTaskInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profileID, snapshotID string) (api.TaskConfigSnapshot, error) {
	var out api.TaskConfigSnapshot
	var body, principal, profile string
	e := tx.QueryRowContext(ctx, "SELECT config_json,principal_id,profile_id FROM task_config_snapshots WHERE snapshot_id=?", snapshotID).Scan(&body, &principal, &profile)
	if e != nil {
		return out, fail("RECOVERY_BLOCKED", "CONFIG_SNAPSHOT_UNAVAILABLE")
	}
	if principal != id.PrincipalID() || profile != profileID {
		return out, api.Denied("TASK_CONFIG_OWNER_MISMATCH")
	}
	if json.Unmarshal([]byte(body), &out) != nil || out.ID != snapshotID {
		return out, fail("RECOVERY_BLOCKED", "CONFIG_SNAPSHOT_UNAVAILABLE")
	}
	owner := out.Agent.ID
	if out.Kind == "temporary" {
		owner = out.SponsorAgentID
	}
	current, e := readAgent(ctx, tx, owner)
	if e != nil {
		return out, e
	}
	if !current.Enabled {
		return out, fail("CONFLICT", "AGENT_DISABLED")
	}
	contains := func(list []string, key string) bool {
		for _, v := range list {
			if v == key {
				return true
			}
		}
		return false
	}
	for _, tool := range out.Agent.AllowedTools {
		if !contains(current.AllowedTools, tool) {
			return out, api.Denied("TASK_CAPABILITY_CHANGED")
		}
	}
	for _, target := range out.Agent.AllowedCollaborationTargets {
		if !contains(current.AllowedCollaborationTargets, target) {
			return out, api.Denied("TASK_CAPABILITY_CHANGED")
		}
	}
	ref := ""
	if out.Agent.Model != nil {
		ref = out.Agent.Model.CredentialRef
	}
	if ref != "" {
		var deleting int
		if e = tx.QueryRowContext(ctx, "SELECT deleting FROM credential_metadata WHERE credential_ref=? AND profile_id=?", ref, profileID).Scan(&deleting); errors.Is(e, sql.ErrNoRows) {
			return out, fail("MODEL_UNAVAILABLE", "CREDENTIAL_MISSING")
		}
		if e != nil {
			return out, e
		}
		if deleting != 0 {
			return out, fail("CONFLICT", "CREDENTIAL_IN_USE")
		}
	}
	out.ID = api.NewID("snapshot:")
	agentID := out.Agent.ID
	if out.Kind == "temporary" {
		out.SubjectID = api.NewID("temporary:")
		out.Agent.ID = out.SubjectID
		agentID = ""
	}
	encoded, e := json.Marshal(out)
	if e != nil {
		return out, e
	}
	_, e = tx.ExecContext(ctx, "INSERT INTO task_config_snapshots VALUES(?,?,?,?,?,?,?,?,?,?,'active',?)", out.ID, profileID, id.PrincipalID(), out.SubjectID, out.SponsorAgentID, agentID, out.Agent.PersonaRevision, out.Agent.ModelBindingRevision, ref, string(encoded), time.Now().UTC().Format(api.TimestampLayout))
	return out, e
}
