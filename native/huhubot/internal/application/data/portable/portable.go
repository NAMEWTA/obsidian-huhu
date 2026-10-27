// Package portable defines the versioned, deliberately capability-free profile
// interchange contract.  It contains only selected user content; credentials,
// grants, approvals, checkpoints and executable runtime state have no fields
// in this package and therefore cannot be exported accidentally.
package portable

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// ArtifactRef is the transport-neutral handle for a portable package.  The
// bytes remain in the adapter-owned artifact store; HAP only receives this
// opaque reference and metadata.
type ArtifactRef struct {
	ArtifactID string `json:"artifactId"`
	MediaType  string `json:"mediaType"`
	Size       string `json:"size"`
}

type ExportRequest struct {
	CommandID, IdempotencyKey, ProfileID, CommandEpoch, ExpectedRevision string
	AgentIDs, MemoryIDs, SessionIDs                                      []string
}
type ExportResult struct {
	Artifact ArtifactRef `json:"artifact"`
}
type ImportPreviewRequest struct {
	ProfileID string
	Artifact  ArtifactRef
}
type ImportPreviewResult struct {
	Token     string
	Conflicts []ImportConflict
}
type ImportConflict struct {
	ID       string `json:"id"`
	Revision string `json:"revision"`
	Hash     string `json:"hash"`
}
type ImportRequest struct {
	CommandID, IdempotencyKey, ProfileID, CommandEpoch, ExpectedRevision, PreviewToken string
	Resolutions                                                                        []ImportResolution
}
type ImportResolution struct {
	ID     string
	Action string
}
type ImportResult struct {
	CommandID string
	ReceiptID string
	Revision  string
}

// API is the optional HAP integration seam.  The router advertises portable
// methods only when a concrete implementation is injected, so schema support
// never becomes a false runtime capability.  Implementations are responsible
// for reading/writing through the artifact adapter and for binding preview
// tokens to profile revision and idempotency.
type API interface {
	Export(context.Context, api.RequestIdentity, ExportRequest) (ExportResult, error)
	ImportPreview(context.Context, api.RequestIdentity, ImportPreviewRequest) (ImportPreviewResult, error)
	Import(context.Context, api.RequestIdentity, ImportRequest) (ImportResult, error)
}

const (
	Format             = "huhu-portable"
	CurrentVersion     = 1
	MaxPackageBytes    = 16 << 20
	MaxTextBytes       = 1 << 20
	MaxItems           = 4096
	MaxManifestEntries = 16384
)

// Package is an explicit allow-list.  Do not add credential, grant, approval,
// checkpoint, queue or lease fields here: their absence is part of AC-041.
type Package struct {
	Format        string          `json:"format"`
	Version       int             `json:"version"`
	PackageID     string          `json:"packageId"`
	SourceProfile string          `json:"sourceProfile"`
	CreatedAt     string          `json:"createdAt"`
	Agents        []Agent         `json:"agents,omitempty"`
	Sessions      []Session       `json:"sessions,omitempty"`
	Memories      []Memory        `json:"memories,omitempty"`
	Manifest      []ManifestEntry `json:"manifest"`
	PackageHash   string          `json:"packageHash"`
}

type Agent struct {
	ID                          string   `json:"id"`
	Name                        string   `json:"name"`
	Description                 string   `json:"description"`
	Persona                     string   `json:"persona"`
	ModelID                     string   `json:"modelId,omitempty"`
	ProviderID                  string   `json:"providerId,omitempty"`
	Endpoint                    string   `json:"endpoint,omitempty"`
	Protocol                    string   `json:"protocol,omitempty"`
	Capabilities                []string `json:"capabilities,omitempty"`
	AllowedTools                []string `json:"allowedTools,omitempty"`
	AllowedCollaborationTargets []string `json:"allowedCollaborationTargets,omitempty"`
	Revision                    string   `json:"revision"`
	PersonaRevision             string   `json:"personaRevision"`
	ModelRevision               string   `json:"modelRevision"`
	Enabled                     bool     `json:"enabled"`
	IsDefault                   bool     `json:"isDefault"`
}

type Session struct {
	ID            string    `json:"id"`
	Kind          string    `json:"kind"`
	Title         string    `json:"title"`
	MemberIDs     []string  `json:"memberIds"`
	CoordinatorID string    `json:"coordinatorId,omitempty"`
	Archived      bool      `json:"archived"`
	WorkspaceID   string    `json:"workspaceId,omitempty"`
	Messages      []Message `json:"messages,omitempty"`
}

type Message struct {
	ID        string `json:"id"`
	Role      string `json:"role"`
	Text      string `json:"text"`
	CreatedAt string `json:"createdAt"`
	AgentID   string `json:"agentId,omitempty"`
}

type Memory struct {
	ID            string   `json:"id"`
	NamespaceKind string   `json:"namespaceKind"`
	NamespaceID   string   `json:"namespaceId"`
	ScopeKind     string   `json:"scopeKind"`
	ScopeID       string   `json:"scopeId,omitempty"`
	State         string   `json:"state"`
	Pinned        bool     `json:"pinned"`
	Text          string   `json:"text"`
	Provenance    string   `json:"provenance"`
	SourceRefs    []Source `json:"sourceRefs,omitempty"`
}

type Source struct {
	Kind     string `json:"kind"`
	ID       string `json:"id"`
	Revision string `json:"revision"`
	Hash     string `json:"hash,omitempty"`
}

type ManifestEntry struct {
	Kind  string `json:"kind"`
	ID    string `json:"id"`
	Hash  string `json:"hash"`
	Bytes int    `json:"bytes"`
}

type Selection struct {
	SourceProfile string
	Agents        []Agent
	Sessions      []Session
	Memories      []Memory
}

type Target struct {
	ProfileID string
	Agents    []TargetAgent
	Sessions  []TargetSession
	Memories  []TargetMemory
}
type TargetAgent struct{ ID, Name, Revision string }
type TargetSession struct{ ID, Title, Revision string }
type TargetMemory struct{ ID, NamespaceKind, NamespaceID, Revision string }

type Conflict struct {
	Kind        string `json:"kind"`
	ImportedID  string `json:"importedId"`
	ExistingID  string `json:"existingId,omitempty"`
	Reason      string `json:"reason"`
	NeedsReview bool   `json:"needsReview"`
}
type IDMapping struct {
	Kind string `json:"kind"`
	From string `json:"from"`
	To   string `json:"to"`
}
type Regrant struct {
	SourceKind string `json:"sourceKind"`
	SourceID   string `json:"sourceId"`
	Reason     string `json:"reason"`
}
type Preview struct {
	PackageHash   string      `json:"packageHash"`
	TargetProfile string      `json:"targetProfile"`
	Mappings      []IDMapping `json:"mappings"`
	Conflicts     []Conflict  `json:"conflicts,omitempty"`
	Regrants      []Regrant   `json:"regrants,omitempty"`
	NeedsConfirm  bool        `json:"needsConfirm"`
}

type ImportPlan struct {
	Package     Package
	Preview     Preview
	Resolutions []ImportResolution
	Confirm     bool
}
type Receipt struct {
	ReceiptID   string
	ProfileID   string
	PackageHash string
	ImportedAt  string
	AgentIDs    []string
	SessionIDs  []string
	MemoryIDs   []string
}

// Sink is the durable, application-level import transaction.  Implementations
// must not start models or background jobs from these methods.
type Sink interface {
	Begin(context.Context, string) (Transaction, error)
}
type Transaction interface {
	PutAgent(context.Context, Agent) (string, error)
	PutSession(context.Context, Session) (string, error)
	PutMemory(context.Context, Memory) (string, error)
	Commit(context.Context) (string, error)
	Rollback(context.Context) error
}

func newID(prefix string) string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		panic(err)
	}
	return prefix + hex.EncodeToString(b[:])
}

func digest(v []byte) string {
	h := sha256.Sum256(v)
	return "sha256:" + hex.EncodeToString(h[:])
}

func (p Package) canonical() ([]byte, error) {
	clone := p
	clone.PackageHash = ""
	clone.Manifest = append([]ManifestEntry(nil), p.Manifest...)
	sort.Slice(clone.Manifest, func(i, j int) bool {
		return clone.Manifest[i].Kind+clone.Manifest[i].ID < clone.Manifest[j].Kind+clone.Manifest[j].ID
	})
	return json.Marshal(clone)
}

func (p *Package) Seal() error {
	if p.Format == "" {
		p.Format = Format
	}
	if p.Version == 0 {
		p.Version = CurrentVersion
	}
	if p.PackageID == "" {
		p.PackageID = newID("package:")
	}
	if p.CreatedAt == "" {
		p.CreatedAt = time.Now().UTC().Format(time.RFC3339Nano)
	}
	if err := p.validateShape(); err != nil {
		return err
	}
	p.Manifest = buildManifest(*p)
	b, err := p.canonical()
	if err != nil {
		return err
	}
	p.PackageHash = digest(b)
	return nil
}

func buildManifest(p Package) []ManifestEntry {
	entries := make([]ManifestEntry, 0, len(p.Agents)+len(p.Sessions)+len(p.Memories))
	for _, v := range p.Agents {
		b, _ := json.Marshal(v)
		entries = append(entries, ManifestEntry{"agent", v.ID, digest(b), len(b)})
	}
	for _, v := range p.Sessions {
		b, _ := json.Marshal(v)
		entries = append(entries, ManifestEntry{"session", v.ID, digest(b), len(b)})
	}
	for _, v := range p.Memories {
		b, _ := json.Marshal(v)
		entries = append(entries, ManifestEntry{"memory", v.ID, digest(b), len(b)})
	}
	return entries
}

func (p Package) validateShape() error {
	if p.Format != Format || p.Version != CurrentVersion {
		return fmt.Errorf("portable: unsupported package version")
	}
	if p.PackageID == "" || p.SourceProfile == "" {
		return fmt.Errorf("portable: missing package identity")
	}
	if len(p.Agents)+len(p.Sessions)+len(p.Memories) > MaxItems {
		return fmt.Errorf("portable: item limit exceeded")
	}
	if len(p.Manifest) > MaxManifestEntries {
		return fmt.Errorf("portable: manifest limit exceeded")
	}
	seen := map[string]bool{}
	for _, a := range p.Agents {
		if a.ID == "" || seen["agent:"+a.ID] {
			return fmt.Errorf("portable: duplicate agent")
		}
		seen["agent:"+a.ID] = true
		if err := text(a.Name, 512); err != nil {
			return err
		}
		if err := text(a.Persona, MaxTextBytes); err != nil {
			return err
		}
		if a.ModelID != "" && (a.ProviderID == "" || a.Protocol == "" || a.Endpoint == "") {
			return fmt.Errorf("portable: incomplete model binding")
		}
	}
	for _, s := range p.Sessions {
		if s.ID == "" || seen["session:"+s.ID] {
			return fmt.Errorf("portable: duplicate session")
		}
		seen["session:"+s.ID] = true
		if s.Kind != "direct" && s.Kind != "group" {
			return fmt.Errorf("portable: invalid session kind")
		}
		if err := text(s.Title, 512); err != nil {
			return err
		}
		for _, m := range s.Messages {
			if m.ID == "" || len(m.Text) > MaxTextBytes {
				return fmt.Errorf("portable: invalid message")
			}
		}
	}
	for _, m := range p.Memories {
		if m.ID == "" || seen["memory:"+m.ID] {
			return fmt.Errorf("portable: duplicate memory")
		}
		seen["memory:"+m.ID] = true
		if err := text(m.Text, MaxTextBytes); err != nil {
			return err
		}
		if m.NamespaceKind != "agent" && m.NamespaceKind != "temporary" && m.NamespaceKind != "global" {
			return fmt.Errorf("portable: invalid memory namespace")
		}
	}
	return nil
}

func text(v string, max int) error {
	if len(v) > max || strings.IndexByte(v, 0) >= 0 {
		return fmt.Errorf("portable: text limit or NUL")
	}
	return nil
}

func Validate(p Package) error {
	if err := p.validateShape(); err != nil {
		return err
	}
	if p.PackageHash == "" {
		return errors.New("portable: package is not sealed")
	}
	manifest := buildManifest(p)
	if len(manifest) != len(p.Manifest) {
		return errors.New("portable: manifest mismatch")
	}
	for _, got := range manifest {
		found := false
		for _, want := range p.Manifest {
			if got.Kind == want.Kind && got.ID == want.ID && got.Hash == want.Hash && got.Bytes == want.Bytes {
				found = true
				break
			}
		}
		if !found {
			return errors.New("portable: manifest mismatch")
		}
	}
	b, err := p.canonical()
	if err != nil {
		return err
	}
	if digest(b) != p.PackageHash {
		return errors.New("portable: package hash mismatch")
	}
	return nil
}

func Build(s Selection) (Package, error) {
	p := Package{SourceProfile: s.SourceProfile, Agents: s.Agents, Sessions: s.Sessions, Memories: s.Memories}
	if err := p.Seal(); err != nil {
		return Package{}, err
	}
	return p, nil
}

func PreviewImport(p Package, target Target) (Preview, error) {
	if err := Validate(p); err != nil {
		return Preview{}, err
	}
	pr := Preview{PackageHash: p.PackageHash, TargetProfile: target.ProfileID}
	agentMap := map[string]string{}
	for _, a := range p.Agents {
		id := newID("agent:")
		agentMap[a.ID] = id
		pr.Mappings = append(pr.Mappings, IDMapping{"agent", a.ID, id})
		for _, t := range target.Agents {
			if strings.EqualFold(a.Name, t.Name) {
				pr.Conflicts = append(pr.Conflicts, Conflict{"agent", a.ID, t.ID, "NAME_CONFLICT", true})
			}
		}
	}
	for _, s := range p.Sessions {
		id := newID("session:")
		pr.Mappings = append(pr.Mappings, IDMapping{"session", s.ID, id})
		for _, t := range target.Sessions {
			if strings.EqualFold(s.Title, t.Title) {
				pr.Conflicts = append(pr.Conflicts, Conflict{"session", s.ID, t.ID, "TITLE_CONFLICT", true})
			}
		}
	}
	for _, m := range p.Memories {
		id := newID("memory:")
		pr.Mappings = append(pr.Mappings, IDMapping{"memory", m.ID, id})
		for _, t := range target.Memories {
			if m.NamespaceKind == t.NamespaceKind && m.NamespaceID == t.NamespaceID {
				pr.Conflicts = append(pr.Conflicts, Conflict{"memory", m.ID, t.ID, "NAMESPACE_CONFLICT", true})
			}
		}
		for _, src := range m.SourceRefs {
			pr.Regrants = append(pr.Regrants, Regrant{src.Kind, src.ID, "SOURCE_GRANT_REQUIRED"})
		}
	}
	pr.NeedsConfirm = true
	return pr, nil
}

func Import(ctx context.Context, plan ImportPlan, sink Sink) (Receipt, error) {
	if !plan.Confirm {
		return Receipt{}, errors.New("portable: explicit confirmation required")
	}
	if err := Validate(plan.Package); err != nil {
		return Receipt{}, err
	}
	if plan.Preview.PackageHash != plan.Package.PackageHash || plan.Preview.TargetProfile == "" {
		return Receipt{}, errors.New("portable: stale import preview")
	}
	if sink == nil {
		return Receipt{}, errors.New("portable: import sink unavailable")
	}
	resolutions := make(map[string]string, len(plan.Resolutions))
	for _, resolution := range plan.Resolutions {
		action := resolution.Action
		if action == "keep" {
			action = "skip"
		}
		resolutions[resolution.ID] = action
	}
	conflictTargets := make(map[string]string, len(plan.Preview.Conflicts))
	for _, conflict := range plan.Preview.Conflicts {
		if resolutions[conflict.ImportedID] == "replace" {
			conflictTargets[conflict.ImportedID] = conflict.ExistingID
		}
	}
	tx, err := sink.Begin(ctx, plan.Preview.TargetProfile)
	if err != nil {
		return Receipt{}, err
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback(context.Background())
		}
	}()
	mapID := func(kind, from string) string {
		if target := conflictTargets[from]; target != "" {
			return target
		}
		for _, m := range plan.Preview.Mappings {
			if m.Kind == kind && m.From == from {
				return m.To
			}
		}
		return ""
	}
	r := Receipt{ReceiptID: newID("portable-receipt:"), ProfileID: plan.Preview.TargetProfile, PackageHash: plan.Package.PackageHash, ImportedAt: time.Now().UTC().Format(time.RFC3339Nano)}
	for _, a := range plan.Package.Agents {
		if resolutions[a.ID] == "skip" {
			continue
		}
		a.ID = mapID("agent", a.ID)
		a.IsDefault = false
		id, e := tx.PutAgent(ctx, a)
		if e != nil {
			return Receipt{}, e
		}
		if id != "" {
			a.ID = id
		}
		r.AgentIDs = append(r.AgentIDs, a.ID)
	}
	for _, s := range plan.Package.Sessions {
		if resolutions[s.ID] == "skip" {
			continue
		}
		s.MemberIDs = append([]string(nil), s.MemberIDs...)
		s.Messages = append([]Message(nil), s.Messages...)
		s.ID = mapID("session", s.ID)
		s.CoordinatorID = mapID("agent", s.CoordinatorID)
		for i := range s.MemberIDs {
			s.MemberIDs[i] = mapID("agent", s.MemberIDs[i])
		}
		for i := range s.Messages {
			s.Messages[i].ID = newID("message:")
			s.Messages[i].AgentID = mapID("agent", s.Messages[i].AgentID)
		}
		id, e := tx.PutSession(ctx, s)
		if e != nil {
			return Receipt{}, e
		}
		if id != "" {
			s.ID = id
		}
		r.SessionIDs = append(r.SessionIDs, s.ID)
	}
	for _, m := range plan.Package.Memories {
		if resolutions[m.ID] == "skip" {
			continue
		}
		m.SourceRefs = append([]Source(nil), m.SourceRefs...)
		m.ID = mapID("memory", m.ID)
		if m.NamespaceKind == "agent" {
			m.NamespaceID = mapID("agent", m.NamespaceID)
		}
		id, e := tx.PutMemory(ctx, m)
		if e != nil {
			return Receipt{}, e
		}
		if id != "" {
			m.ID = id
		}
		r.MemoryIDs = append(r.MemoryIDs, m.ID)
	}
	commitID, err := tx.Commit(ctx)
	if err != nil {
		return Receipt{}, err
	}
	if commitID != "" {
		r.ReceiptID = commitID
	}
	committed = true
	return r, nil
}
