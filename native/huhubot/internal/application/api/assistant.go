package api

import "context"

type CommandMeta struct {
	CommandID        string `json:"commandId"`
	IdempotencyKey   string `json:"idempotencyKey"`
	ProfileID        string `json:"profileId"`
	CommandEpoch     string `json:"commandEpoch"`
	ExpectedRevision string `json:"expectedRevision,omitempty"`
}
type ModelBindingDraft struct {
	ModelID       string   `json:"modelId"`
	ProviderID    string   `json:"providerId"`
	Endpoint      string   `json:"endpoint"`
	CredentialRef string   `json:"credentialRef,omitempty"`
	Capabilities  []string `json:"capabilities"`
	Protocol      string   `json:"protocol"`
}
type ModelBinding struct {
	ModelBindingDraft
	Revision         string           `json:"revision"`
	CredentialStatus CredentialStatus `json:"credentialStatus"`
}
type AgentDraft struct {
	Name                        string             `json:"name"`
	Description                 string             `json:"description"`
	Persona                     string             `json:"persona"`
	Model                       *ModelBindingDraft `json:"model,omitempty"`
	AllowedTools                []string           `json:"allowedTools,omitempty"`
	AllowedCollaborationTargets []string           `json:"allowedCollaborationTargets,omitempty"`
}
type Agent struct {
	ID                          string        `json:"id"`
	Name                        string        `json:"name"`
	Description                 string        `json:"description"`
	Persona                     string        `json:"persona"`
	Model                       *ModelBinding `json:"model,omitempty"`
	AllowedTools                []string      `json:"allowedTools,omitempty"`
	AllowedCollaborationTargets []string      `json:"allowedCollaborationTargets,omitempty"`
	Revision                    string        `json:"revision"`
	PersonaRevision             string        `json:"personaRevision"`
	ModelBindingRevision        string        `json:"modelBindingRevision"`
	Enabled                     bool          `json:"enabled"`
	IsDefault                   bool          `json:"isDefault"`
}
type PageQuery struct {
	ProfileID string `json:"profileId"`
	Cursor    string `json:"cursor,omitempty"`
	Limit     int    `json:"limit,omitempty"`
}
type IDQuery struct {
	ProfileID string `json:"profileId"`
	ID        string `json:"id"`
}
type AgentPage struct {
	Items      []Agent `json:"items"`
	NextCursor string  `json:"nextCursor,omitempty"`
}
type ModelInfo struct {
	ModelBinding
	Available bool `json:"available"`
}
type ModelPage struct {
	Items      []ModelInfo `json:"items"`
	NextCursor string      `json:"nextCursor,omitempty"`
}
type AgentCreate struct {
	CommandMeta
	Draft AgentDraft `json:"draft"`
}
type AgentUpdate struct {
	CommandMeta
	ID    string     `json:"id"`
	Draft AgentDraft `json:"draft"`
}
type AgentDisable struct {
	CommandMeta
	ID string `json:"id"`
}
type ModelBind struct {
	CommandMeta
	AgentID string            `json:"agentId"`
	Model   ModelBindingDraft `json:"model"`
}
type ModelTest struct {
	ProfileID string            `json:"profileId"`
	Model     ModelBindingDraft `json:"model"`
}
type ModelTestResult struct {
	Available        bool             `json:"available"`
	Capabilities     []string         `json:"capabilities"`
	CredentialStatus CredentialStatus `json:"credentialStatus"`
}
type DeletionCategory struct {
	Kind     string `json:"kind"`
	Count    int    `json:"count"`
	Retained bool   `json:"retained"`
	Reason   string `json:"reason,omitempty"`
}
type DeletionPreview struct {
	Token      string             `json:"token"`
	Revision   string             `json:"revision"`
	ExpiresAt  string             `json:"expiresAt"`
	Categories []DeletionCategory `json:"categories"`
}
type AgentDelete struct {
	CommandMeta
	ID              string   `json:"id"`
	PreviewToken    string   `json:"previewToken"`
	RetainMemoryIDs []string `json:"retainMemoryIds,omitempty"`
}
type Receipt struct {
	CommandID string `json:"commandId"`
	ReceiptID string `json:"receiptId"`
	Revision  string `json:"revision"`
}

type ProfileDeletePreviewRequest struct{ ProfileID string }
type ProfileDeleteCommand struct {
	CommandMeta
	ID              string   `json:"id,omitempty"`
	PreviewToken    string   `json:"previewToken"`
	RetainMemoryIDs []string `json:"retainMemoryIds,omitempty"`
}
type ProfileAPI interface {
	DeletePreview(context.Context, RequestIdentity, ProfileDeletePreviewRequest) (DeletionPreview, error)
	Delete(context.Context, RequestIdentity, ProfileDeleteCommand) (Receipt, error)
}

// UsageSnapshot explicitly declares contexts not assembled yet. RevisionToken
// must change whenever a consumer's deletion-relevant references change.
type AgentUsage struct {
	RevisionToken                                  string
	ActiveRunIDs, GroupIDs, MemoryIDs, Unassembled []string
	SessionIDs                                     []string
}
type AgentUsagePort interface {
	SnapshotUsage(context.Context, string) (AgentUsage, error)
}

// A probe receives only model configuration and a privately resolved credential.
// It never receives conversation, sources, memory, tools or ambient CLI keys.
type ModelProbePort interface {
	Probe(context.Context, ModelBindingDraft, []byte) ([]string, error)
}
type ConfigSnapshot struct {
	Token string
	Agent Agent
}
type AgentConfigPort interface {
	AcquireSnapshot(context.Context, RequestIdentity, string, string) (ConfigSnapshot, error)
	ReleaseSnapshot(context.Context, string) error
}
type AssistantAPI interface {
	Create(context.Context, RequestIdentity, AgentCreate) (Agent, error)
	List(context.Context, RequestIdentity, PageQuery) (AgentPage, error)
	Get(context.Context, RequestIdentity, IDQuery) (Agent, error)
	Update(context.Context, RequestIdentity, AgentUpdate) (Agent, error)
	Disable(context.Context, RequestIdentity, AgentDisable) (Agent, error)
	DeletePreview(context.Context, RequestIdentity, IDQuery) (DeletionPreview, error)
	Delete(context.Context, RequestIdentity, AgentDelete) (Receipt, error)
	ListModels(context.Context, RequestIdentity, PageQuery) (ModelPage, error)
	TestModel(context.Context, RequestIdentity, ModelTest) (ModelTestResult, error)
	BindModel(context.Context, RequestIdentity, ModelBind) (Agent, error)
	AgentConfigPort
}
