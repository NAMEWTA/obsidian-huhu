package api

import "context"

type EffectTarget struct {
	WorkspaceID  string `json:"workspaceId"`
	ResourceID   string `json:"resourceId"`
	Operation    string `json:"operation"`
	BaseRevision string `json:"baseRevision"`
}
type ToolDescriptor struct {
	Name                  string `json:"name"`
	Capability            string `json:"capability"`
	CapabilityVersion     string `json:"capabilityVersion"`
	ImplementationVersion string `json:"implementationVersion"`
	PolicyVersion         string `json:"policyVersion"`
}
type ApprovalPreview struct {
	Target         EffectTarget      `json:"target"`
	Tool           ToolDescriptor    `json:"tool"`
	ParametersHash string            `json:"parametersHash"`
	PreviewHash    string            `json:"previewHash"`
	Diff           string            `json:"diff"`
	Content        string            `json:"content"`
	SourceRefs     []SourceSnapshot  `json:"sourceRefs"`
	Binding        *NoteWriteBinding `json:"binding,omitempty"`
}
type Approval struct {
	ID        string          `json:"id"`
	Revision  string          `json:"revision"`
	RunID     string          `json:"runId"`
	EffectID  string          `json:"effectId"`
	Preview   ApprovalPreview `json:"preview"`
	ExpiresAt string          `json:"expiresAt"`
	Status    string          `json:"status"`
}
type ApprovalResolve struct {
	CommandMeta
	ID          string `json:"id"`
	EffectID    string `json:"effectId"`
	Decision    string `json:"decision"`
	PreviewHash string `json:"previewHash"`
}
type ApprovalPage struct {
	Items      []Approval `json:"items"`
	NextCursor string     `json:"nextCursor,omitempty"`
}
type RunCancel struct {
	CommandMeta
	ID string `json:"id"`
}
type ApprovalsAPI interface {
	List(context.Context, RequestIdentity, PageQuery) (ApprovalPage, error)
	Get(context.Context, RequestIdentity, IDQuery) (Approval, error)
	Resolve(context.Context, RequestIdentity, ApprovalResolve) (Approval, error)
	Cancel(context.Context, RequestIdentity, RunCancel) (RunReceipt, error)
}
