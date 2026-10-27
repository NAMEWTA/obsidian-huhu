package grants

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	groupaccess "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/groups"
	contextaccess "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/access/context"
	app "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/access/grants"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	policy "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/access/grants"
)

type Store struct {
	base         *base.Store
	now          func() time.Time
	deliveryGate chan struct{}
	attachments  attachmentChecker
	memory       MemoryFactsReader
}

func New(b *base.Store) *Store {
	return &Store{base: b, now: time.Now, deliveryGate: make(chan struct{}, 1)}
}
func fault(kind, reason string) error { return &api.Fault{Kind: kind, Reason: reason} }
func metadata(ctx context.Context, tx *sql.Tx, profile string) (api.ProfileMetadata, error) {
	var p api.ProfileMetadata
	if e := tx.QueryRowContext(ctx, "SELECT profile_id,CAST(command_epoch AS TEXT),CAST(revision AS TEXT),created_at FROM profile_metadata WHERE singleton=1").Scan(&p.ProfileID, &p.CommandEpoch, &p.Revision, &p.CreatedAt); e != nil {
		return p, e
	}
	if p.ProfileID != profile {
		return p, api.Denied("PROFILE_MISMATCH")
	}
	return p, nil
}

type factScanner interface{ Scan(...any) error }

const grantColumns = "grant_id,CAST(revision AS TEXT),workspace_id,scope,resource_id,operations_json,recipients_json,session_id,task_id,state,expires_at"

type storedGrant struct {
	value                  api.Grant
	operations, recipients string
	decoded                bool
	decodeErr              error
	policyForm             policy.Grant
	policyPrincipal        string
	policyReady            bool
	policyErr              error
}

func scanGrant(row factScanner) (*storedGrant, error) {
	g := &storedGrant{}
	v := &g.value
	e := row.Scan(&v.ID, &v.Revision, &v.WorkspaceID, &v.Scope, &v.ResourceID, &g.operations, &g.recipients, &v.SessionID, &v.TaskID, &v.State, &v.ExpiresAt)
	return g, e
}

func (g *storedGrant) decode() (api.Grant, error) {
	if !g.decoded {
		g.decoded = true
		if json.Unmarshal([]byte(g.operations), &g.value.Operations) != nil || json.Unmarshal([]byte(g.recipients), &g.value.Recipients) != nil {
			g.decodeErr = fault("CONFLICT", "GRANT_STATE_INVALID")
		} else {
			g.value.RecipientIDs = []string{}
			for _, r := range g.value.Recipients {
				g.value.RecipientIDs = append(g.value.RecipientIDs, r.AgentID)
			}
		}
	}
	return g.value, g.decodeErr
}

func (g *storedGrant) asPolicy(principal string) (policy.Grant, error) {
	if !g.policyReady || g.policyPrincipal != principal {
		value, e := g.decode()
		if e != nil {
			return policy.Grant{}, e
		}
		g.policyForm, g.policyErr = grantPolicy(value, principal)
		g.policyPrincipal, g.policyReady = principal, true
	}
	return g.policyForm, g.policyErr
}

func read(ctx context.Context, tx *sql.Tx, profile, principal, id string) (api.Grant, error) {
	g, e := scanGrant(tx.QueryRowContext(ctx, "SELECT "+grantColumns+" FROM access_grants WHERE profile_id=? AND principal_id=? AND grant_id=?", profile, principal, id))
	if errors.Is(e, sql.ErrNoRows) {
		return api.Grant{}, fault("NOT_FOUND", "GRANT_NOT_FOUND")
	}
	if e != nil {
		return api.Grant{}, e
	}
	return g.decode()
}

// readFacts contains immutable rows from one read transaction, never permission
// decisions or wall-clock outcomes. It is not stored on Store or reused by a
// later request. JSON is decoded once when the original check first needs it.
type readFacts struct {
	grants map[string]*storedGrant
	runs   map[string]*storedRunRecipient
	// Only decode() is reused through these values, never the first Run's ACL.
	recipients   map[string]*storedRunRecipient
	groups       *groupaccess.MemberFacts
	memoryRuns   map[string]bool // exact current job existence, never permission
	memoryRunSet map[string]bool
}

const factChunkSize = 256

func readGrantFact(ctx context.Context, tx *sql.Tx, profile, principal, id string, facts *readFacts) (api.Grant, error) {
	if facts == nil {
		return read(ctx, tx, profile, principal, id)
	}
	if e := ctx.Err(); e != nil {
		return api.Grant{}, e
	}
	g := facts.grants[id]
	if g == nil {
		return api.Grant{}, fault("NOT_FOUND", "GRANT_NOT_FOUND")
	}
	return g.decode()
}

func loadReadFacts(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile string, inputs []api.RunAccessInput) (*readFacts, error) {
	facts := &readFacts{grants: map[string]*storedGrant{}, runs: map[string]*storedRunRecipient{}, recipients: map[string]*storedRunRecipient{}, memoryRuns: map[string]bool{}, memoryRunSet: map[string]bool{}}
	var groupErr error
	facts.groups, groupErr = groupaccess.LoadMemberFactsInTx(ctx, tx, inputs)
	if groupErr != nil {
		return nil, groupErr
	}
	grantIDs, runIDs := []string{}, []string{}
	grantsSeen, runsSeen := map[string]bool{}, map[string]bool{}
	for _, in := range inputs {
		if e := ctx.Err(); e != nil {
			return nil, e
		}
		if in.ProfileID != profile {
			return nil, api.Denied("PROFILE_MISMATCH")
		}
		// Validate the existing per-input bounds before collecting references.
		// There is no extra limit on the number of unique Grants across inputs.
		if e := contextaccess.Validate(in); e != nil {
			return nil, e
		}
		facts.memoryRunSet[in.TaskID] = true
		if len(in.Sources)+len(in.Scopes) == 0 {
			continue
		}
		if !runsSeen[in.TaskID] {
			runsSeen[in.TaskID] = true
			runIDs = append(runIDs, in.TaskID)
		}
		collect := func(ids []string) {
			for _, key := range ids {
				if !grantsSeen[key] {
					grantsSeen[key] = true
					grantIDs = append(grantIDs, key)
				}
			}
		}
		collect(in.GrantIDs)
		if in.ParentScope != nil {
			collect(in.ParentScope.GrantIDs)
		}
	}
	jobRunIDs := []string{}
	for key := range facts.memoryRunSet {
		jobRunIDs = append(jobRunIDs, key)
	}
	for start := 0; start < len(jobRunIDs); start += factChunkSize {
		end := min(start+factChunkSize, len(jobRunIDs))
		args := []any{}
		for _, key := range jobRunIDs[start:end] {
			args = append(args, key)
		}
		rows, e := tx.QueryContext(ctx, "SELECT run_id FROM memory_jobs WHERE run_id IN("+strings.TrimSuffix(strings.Repeat("?,", len(args)), ",")+")", args...)
		if e != nil {
			return nil, e
		}
		for rows.Next() {
			var key string
			if e = rows.Scan(&key); e != nil {
				rows.Close()
				return nil, e
			}
			facts.memoryRuns[key] = true
		}
		e = rows.Err()
		rows.Close()
		if e != nil {
			return nil, e
		}
	}
	for offset := 0; offset < len(grantIDs); offset += factChunkSize {
		if e := ctx.Err(); e != nil {
			return nil, e
		}
		end := min(offset+factChunkSize, len(grantIDs))
		args := []any{profile, id.PrincipalID()}
		for _, key := range grantIDs[offset:end] {
			args = append(args, key)
		}
		e := func() error {
			query := "SELECT " + grantColumns + " FROM access_grants WHERE profile_id=? AND principal_id=? AND grant_id IN (" + strings.TrimSuffix(strings.Repeat("?,", end-offset), ",") + ")"
			rows, e := tx.QueryContext(ctx, query, args...)
			if e != nil {
				return e
			}
			defer rows.Close()
			for rows.Next() {
				stored, e := scanGrant(rows)
				if e != nil {
					return e
				}
				facts.grants[stored.value.ID] = stored
			}
			return rows.Err()
		}()
		if e != nil {
			return nil, e
		}
	}
	for offset := 0; offset < len(runIDs); offset += factChunkSize {
		if e := ctx.Err(); e != nil {
			return nil, e
		}
		end := min(offset+factChunkSize, len(runIDs))
		args := []any{}
		for _, key := range runIDs[offset:end] {
			args = append(args, key)
		}
		e := func() error {
			query := "SELECT r.run_id," + recipientRunColumns + " FROM execution_runs r JOIN conversation_sessions s ON s.session_id=r.session_id WHERE r.run_id IN (" + strings.TrimSuffix(strings.Repeat("?,", end-offset), ",") + ")"
			rows, e := tx.QueryContext(ctx, query, args...)
			if e != nil {
				return e
			}
			defer rows.Close()
			for rows.Next() {
				var key string
				stored, e := scanRunRecipient(rows, &key)
				if e != nil {
					return e
				}
				facts.runs[key] = stored
			}
			return rows.Err()
		}()
		if e != nil {
			return nil, e
		}
	}
	return facts, nil
}

func recipient(ctx context.Context, tx *sql.Tx, r api.GrantRecipient) error {
	if !app.ValidRecipient(r) {
		return api.Denied("RECIPIENT_NOT_CONFIGURED")
	}
	if r.SubjectKind == "temporary" {
		if r.AgentID != r.SponsorAgentID {
			return api.Denied("TEMPORARY_TEMPLATE_INVALID")
		}
		var enabled bool
		if e := tx.QueryRowContext(ctx, "SELECT enabled FROM agents WHERE agent_id=?", r.SponsorAgentID).Scan(&enabled); errors.Is(e, sql.ErrNoRows) {
			return api.Denied("RECIPIENT_NOT_CONFIGURED")
		} else if e != nil {
			return e
		}
		if !enabled {
			return api.Denied("AGENT_DISABLED")
		}
		return nil
	}
	var enabled bool
	var body string
	var retained int
	e := tx.QueryRowContext(ctx, "SELECT a.enabled,m.body,CASE WHEN a.model_revision=m.revision THEN 1 ELSE 0 END FROM agents a JOIN model_binding_revisions m ON m.agent_id=a.agent_id WHERE a.agent_id=? AND m.revision=?", r.AgentID, r.ModelBindingRevision).Scan(&enabled, &body, &retained)
	if errors.Is(e, sql.ErrNoRows) {
		return api.Denied("RECIPIENT_NOT_CONFIGURED")
	}
	if e != nil {
		return e
	}
	if !enabled {
		return api.Denied("AGENT_DISABLED")
	}
	if retained != 1 {
		return api.Denied("RECIPIENT_CHANGED")
	}
	var m api.ModelBindingDraft
	if json.Unmarshal([]byte(body), &m) != nil {
		return fault("CONFLICT", "MODEL_STATE_INVALID")
	}
	if m.ProviderID != r.ProviderID || m.ModelID != r.ModelID || m.Protocol != r.Protocol || m.Endpoint != r.Endpoint {
		return api.Denied("RECIPIENT_CHANGED")
	}
	return nil
}
func (s *Store) Mutate(ctx context.Context, m app.Mutation) (app.MutationResult, error) {
	var out app.MutationResult
	select {
	case <-ctx.Done():
		return out, ctx.Err()
	case s.deliveryGate <- struct{}{}:
	}
	defer func() { <-s.deliveryGate }()
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		p, e := metadata(ctx, tx, m.Meta.ProfileID)
		if e != nil {
			return e
		}
		if p.CommandEpoch != m.Meta.CommandEpoch {
			return fault("CONFLICT", "COMMAND_EPOCH_CONFLICT")
		}
		var oldHash, oldBody string
		e = tx.QueryRowContext(ctx, "SELECT input_hash,result_json FROM command_receipts WHERE profile_id=? AND principal_id=? AND method=? AND idempotency_key=?", p.ProfileID, m.Identity.PrincipalID(), m.Kind, m.Meta.IdempotencyKey).Scan(&oldHash, &oldBody)
		if e == nil {
			if oldHash != m.InputHash {
				return fault("IDEMPOTENCY_CONFLICT", "IDEMPOTENCY_INPUT_MISMATCH")
			}
			if e = json.Unmarshal([]byte(oldBody), &out); e != nil {
				return e
			}
			if m.Kind == "grants.create" {
				out.Grant, e = read(ctx, tx, p.ProfileID, m.Identity.PrincipalID(), out.Grant.ID)
			}
			return e
		}
		if !errors.Is(e, sql.ErrNoRows) {
			return e
		}
		switch m.Kind {
		case "grants.create":
			c := m.Create
			if c.ExpiresAt != "" {
				expires, e := time.Parse(time.RFC3339Nano, c.ExpiresAt)
				if e != nil || !m.Now.Before(expires) {
					return api.Invalid("INVALID_GRANT_EXPIRY")
				}
			}
			for _, r := range c.Recipients {
				if e = recipient(ctx, tx, r); e != nil {
					return e
				}
			}
			ops, _ := json.Marshal(c.Operations)
			recipients, _ := json.Marshal(c.Recipients)
			id := api.NewID("grant:")
			_, e = tx.ExecContext(ctx, "INSERT INTO access_grants VALUES(?,?,?,?,?,?,?,?,?,?,?,1,?)", id, p.ProfileID, m.Identity.PrincipalID(), c.WorkspaceID, c.Scope, c.ResourceID, string(ops), string(recipients), c.SessionID, c.TaskID, "active", c.ExpiresAt)
			if e != nil {
				return e
			}
			out.Grant, e = read(ctx, tx, p.ProfileID, m.Identity.PrincipalID(), id)
			if e != nil {
				return e
			}
		case "grants.revoke":
			g, e := read(ctx, tx, p.ProfileID, m.Identity.PrincipalID(), m.ID)
			if e != nil {
				return e
			}
			if g.Revision != m.Meta.ExpectedRevision {
				return fault("CONFLICT", "REVISION_CONFLICT")
			}
			rev, _ := strconv.ParseInt(g.Revision, 10, 64)
			if rev == 1<<63-1 {
				return fault("RESOURCE_LIMIT", "REVISION_EXHAUSTED")
			}
			_, e = tx.ExecContext(ctx, "UPDATE access_grants SET state='revoked',revision=revision+1 WHERE grant_id=?", m.ID)
			if e != nil {
				return e
			}
			out.Receipt = api.Receipt{CommandID: m.Meta.CommandID, ReceiptID: api.NewID("receipt:"), Revision: strconv.FormatInt(rev+1, 10)}
		default:
			return api.Invalid("UNKNOWN_GRANT_MUTATION")
		}
		if _, e = tx.ExecContext(ctx, "UPDATE access_grants_clock SET revision=revision+1 WHERE singleton=1 AND revision<9223372036854775807"); e != nil {
			return e
		}
		if _, e = tx.ExecContext(ctx, "UPDATE profile_metadata SET revision=revision+1 WHERE singleton=1 AND revision<9223372036854775807"); e != nil {
			return e
		}
		b, e := json.Marshal(out)
		if e != nil {
			return e
		}
		_, e = tx.ExecContext(ctx, "INSERT INTO command_receipts VALUES(?,?,?,?,?,?,?)", p.ProfileID, m.Identity.PrincipalID(), m.Kind, m.Meta.IdempotencyKey, m.InputHash, "", string(b))
		return e
	})
	return out, e
}

type cursor struct{ After, Revision, Principal, Profile string }

func (s *Store) List(ctx context.Context, id api.RequestIdentity, q api.PageQuery) (api.GrantPage, error) {
	out := api.GrantPage{Items: []api.Grant{}}
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := metadata(ctx, tx, q.ProfileID); e != nil {
			return e
		}
		var rev string
		if e := tx.QueryRowContext(ctx, "SELECT CAST(revision AS TEXT) FROM access_grants_clock WHERE singleton=1").Scan(&rev); e != nil {
			return e
		}
		after := ""
		if q.Cursor != "" {
			var c cursor
			b, e := base64.RawURLEncoding.DecodeString(q.Cursor)
			if e != nil || len(b) > 2048 || json.Unmarshal(b, &c) != nil {
				return api.Invalid("INVALID_CURSOR")
			}
			if c.Revision != rev || c.Profile != q.ProfileID || c.Principal != id.PrincipalID() {
				return fault("CURSOR_EXPIRED", "GRANT_CURSOR_STALE")
			}
			after = c.After
		}
		rows, e := tx.QueryContext(ctx, "SELECT grant_id FROM access_grants WHERE profile_id=? AND principal_id=? AND grant_id>? ORDER BY grant_id LIMIT ?", q.ProfileID, id.PrincipalID(), after, q.Limit+1)
		if e != nil {
			return e
		}
		ids := []string{}
		for rows.Next() {
			var x string
			if e = rows.Scan(&x); e != nil {
				_ = rows.Close()
				return e
			}
			ids = append(ids, x)
		}
		e = rows.Err()
		_ = rows.Close()
		if e != nil {
			return e
		}
		more := len(ids) > q.Limit
		if more {
			ids = ids[:q.Limit]
		}
		for _, x := range ids {
			g, e := read(ctx, tx, q.ProfileID, id.PrincipalID(), x)
			if e != nil {
				return e
			}
			out.Items = append(out.Items, g)
		}
		if more {
			b, _ := json.Marshal(cursor{ids[len(ids)-1], rev, id.PrincipalID(), q.ProfileID})
			out.NextCursor = base64.RawURLEncoding.EncodeToString(b)
		}
		return nil
	})
	return out, e
}
func policyRecipient(r api.GrantRecipient) policy.Recipient {
	return policy.Recipient{AgentID: r.AgentID, ModelBindingRevision: r.ModelBindingRevision, ProviderID: r.ProviderID, ModelID: r.ModelID, Protocol: r.Protocol, Endpoint: r.Endpoint, SubjectKind: r.SubjectKind, SponsorAgentID: r.SponsorAgentID, ConfigurationHash: r.ConfigurationHash}
}
