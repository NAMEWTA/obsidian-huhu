package grants

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type Mutation struct {
	Identity            api.RequestIdentity
	Meta                api.CommandMeta
	Kind, ID, InputHash string
	Create              api.GrantCreate
	Now                 time.Time
}
type MutationResult struct {
	Grant   api.Grant
	Receipt api.Receipt
}
type Repository interface {
	Mutate(context.Context, Mutation) (MutationResult, error)
	List(context.Context, api.RequestIdentity, api.PageQuery) (api.GrantPage, error)
}
type Service struct {
	repo Repository
	now  func() time.Time
}

func New(repo Repository, now func() time.Time) *Service {
	if now == nil {
		now = time.Now
	}
	return &Service{repo, now}
}
func Positive(s string) bool {
	n, e := strconv.ParseInt(s, 10, 64)
	return e == nil && n > 0 && strconv.FormatInt(n, 10) == s
}
func Opaque(s string) bool {
	return s != "" && len(s) <= 512 && !strings.ContainsAny(s, "/\\\x00\r\n") && s != "." && s != ".."
}
func command(id api.RequestIdentity, m api.CommandMeta, cas bool) error {
	if !id.Valid() {
		return api.Denied("IDENTITY_REQUIRED")
	}
	if m.CommandID == "" || len(m.CommandID) > 128 || m.IdempotencyKey == "" || len(m.IdempotencyKey) > 128 || m.ProfileID == "" || !Positive(m.CommandEpoch) || (cas && !Positive(m.ExpectedRevision)) {
		return api.Invalid("INVALID_COMMAND_META")
	}
	return nil
}
func digest(v any) string {
	b, _ := json.Marshal(v)
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:])
}
func ValidRecipient(r api.GrantRecipient) bool {
	u, e := url.Parse(r.Endpoint)
	base := Opaque(r.AgentID) && Positive(r.ModelBindingRevision) && r.ProviderID != "" && len(r.ProviderID) <= 128 && r.ModelID != "" && len(r.ModelID) <= 256 && (r.Protocol == "openai-chat-completions" || r.Protocol == "openai-responses" || r.Protocol == "anthropic-messages") && e == nil && (u.Scheme == "http" || u.Scheme == "https") && u.Host != "" && u.User == nil && u.Fragment == "" && len(r.Endpoint) <= 2048
	if !base {
		return false
	}
	if r.SubjectKind == "" {
		return r.SponsorAgentID == "" && r.ConfigurationHash == ""
	}
	if r.SubjectKind != "temporary" || !Opaque(r.SponsorAgentID) || r.ModelBindingRevision != "1" || len(r.ConfigurationHash) != 71 || !strings.HasPrefix(r.ConfigurationHash, "sha256:") {
		return false
	}
	raw, e := hex.DecodeString(r.ConfigurationHash[7:])
	return e == nil && len(raw) == 32 && r.ConfigurationHash == strings.ToLower(r.ConfigurationHash)
}
func ValidOperation(s string) bool {
	switch s {
	case "read", "search", "send", "summarize", "memory", "delegate", "deliver":
		return true
	}
	return false
}
func (s *Service) Create(ctx context.Context, id api.RequestIdentity, c api.GrantCreate) (api.Grant, error) {
	if e := command(id, c.CommandMeta, false); e != nil {
		return api.Grant{}, e
	}
	if !Opaque(c.WorkspaceID) || !Opaque(c.ResourceID) || (c.Scope != "source" && c.Scope != "folder" && c.Scope != "vault") || len(c.Recipients) == 0 || len(c.Recipients) > 32 || len(c.Operations) == 0 || len(c.Operations) > 7 || (c.SessionID != "" && !Opaque(c.SessionID)) || (c.TaskID != "" && !Opaque(c.TaskID)) {
		return api.Grant{}, api.Invalid("INVALID_GRANT")
	}
	seen := map[string]bool{}
	for _, op := range c.Operations {
		if !ValidOperation(op) || seen[op] {
			return api.Grant{}, api.Invalid("INVALID_GRANT_OPERATIONS")
		}
		seen[op] = true
	}
	for _, r := range c.Recipients {
		if !ValidRecipient(r) || r.SubjectKind == "temporary" && r.AgentID != r.SponsorAgentID {
			return api.Grant{}, api.Invalid("INVALID_GRANT_RECIPIENT")
		}
	}
	if c.ExpiresAt != "" {
		_, e := time.Parse(time.RFC3339Nano, c.ExpiresAt)
		if e != nil {
			return api.Grant{}, api.Invalid("INVALID_GRANT_EXPIRY")
		}
	}
	intent := c
	intent.CommandID = "" // Retries share an intent even when transport attempt IDs change.
	out, e := s.repo.Mutate(ctx, Mutation{Identity: id, Meta: c.CommandMeta, Kind: "grants.create", Create: c, InputHash: digest(intent), Now: s.now()})
	return out.Grant, e
}
func (s *Service) Revoke(ctx context.Context, id api.RequestIdentity, c api.GrantRevoke) (api.Receipt, error) {
	if e := command(id, c.CommandMeta, true); e != nil {
		return api.Receipt{}, e
	}
	if !Opaque(c.ID) {
		return api.Receipt{}, api.Invalid("INVALID_GRANT")
	}
	intent := c
	intent.CommandID = ""
	out, e := s.repo.Mutate(ctx, Mutation{Identity: id, Meta: c.CommandMeta, Kind: "grants.revoke", ID: c.ID, InputHash: digest(intent), Now: s.now()})
	return out.Receipt, e
}
func (s *Service) List(ctx context.Context, id api.RequestIdentity, q api.PageQuery) (api.GrantPage, error) {
	if !id.Valid() {
		return api.GrantPage{}, api.Denied("IDENTITY_REQUIRED")
	}
	if q.ProfileID == "" || q.Limit < 0 || q.Limit > 100 {
		return api.GrantPage{}, api.Invalid("INVALID_PAGE")
	}
	if q.Limit == 0 {
		q.Limit = 50
	}
	return s.repo.List(ctx, id, q)
}
