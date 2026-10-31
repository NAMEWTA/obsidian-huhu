package hap

type ClientInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}
type HelloParams struct {
	ProtocolVersion string     `json:"protocolVersion"`
	Client          ClientInfo `json:"client"`
}
type ProfileMetadata struct {
	ProfileID    string `json:"profileId"`
	CommandEpoch string `json:"commandEpoch"`
	Revision     string `json:"revision"`
	CreatedAt    string `json:"createdAt"`
}
type Limits struct {
	MaxFrameBytes int `json:"maxFrameBytes"`
	MaxBatchItems int `json:"maxBatchItems"`
}
type ExecutionLimits struct {
	MaxDepth        int `json:"maxDepth"`
	MaxChildren     int `json:"maxChildren"`
	RootChildren    int `json:"rootChildren"`
	ProfileChildren int `json:"profileChildren"`
	MaxWakes        int `json:"maxWakes"`
}
type RuntimePolicyStatus struct {
	Limits           ExecutionLimits `json:"limits"`
	BudgetConfigured bool            `json:"budgetConfigured"`
	BudgetPaused     bool            `json:"budgetPaused"`
}
type HelloResult struct {
	Policy          *RuntimePolicyStatus `json:"policy,omitempty"`
	ProtocolVersion string               `json:"protocolVersion"`
	BuildVersion    string               `json:"buildVersion"`
	SchemaVersion   int                  `json:"schemaVersion"`
	Profile         ProfileMetadata      `json:"profile"`
	Capabilities    []string             `json:"capabilities"`
	Limits          Limits               `json:"limits"`
}
type HealthResult struct {
	Status string `json:"status"`
}
type CleanupStatus struct {
	Profile    bool     `json:"profile"`
	SessionIDs []string `json:"sessionIds"`
}
type StatusResult struct {
	Cleanup       *CleanupStatus       `json:"cleanup,omitempty"`
	Policy        *RuntimePolicyStatus `json:"policy,omitempty"`
	SchemaVersion int                  `json:"schemaVersion"`
	State         string               `json:"state"`
	Profile       ProfileMetadata      `json:"profile"`
	HostAttached  bool                 `json:"hostAttached"`
}
type DiagnosticsResult struct {
	ProtocolVersion   string `json:"protocolVersion"`
	SchemaVersion     int    `json:"schemaVersion"`
	ActiveConnections int    `json:"activeConnections"`
	HostAttached      bool   `json:"hostAttached"`
}
type ShutdownResult struct {
	Accepted bool `json:"accepted"`
}
type EmptyParams struct{}
type HostAttachParams struct {
	WorkspaceID  string   `json:"workspaceId"`
	Capabilities []string `json:"capabilities"`
	RenewLeaseID string   `json:"renewLeaseId,omitempty"`
}
type HostLease struct {
	HostConnectionID string   `json:"hostConnectionId"`
	LeaseEpoch       string   `json:"leaseEpoch"`
	LeaseID          string   `json:"leaseId"`
	WorkspaceID      string   `json:"workspaceId"`
	Capabilities     []string `json:"capabilities"`
	ExpiresAt        string   `json:"expiresAt"`
}
type HostDetachParams struct {
	LeaseID string `json:"leaseId"`
}
type HostDetachResult struct {
	Detached bool `json:"detached"`
}
type ResourceRef struct {
	ResourceID string `json:"resourceId"`
	Revision   string `json:"revision,omitempty"`
}
type HostInvokeParams struct {
	LeaseID          string      `json:"leaseId"`
	WorkspaceID      string      `json:"workspaceId"`
	Capability       string      `json:"capability"`
	EffectID         string      `json:"effectId"`
	Resource         ResourceRef `json:"resource"`
	ExpectedRevision string      `json:"expectedRevision,omitempty"`
	Content          string      `json:"content,omitempty"`
}
type HostReceiptQuery struct {
	LeaseID     string `json:"leaseId"`
	WorkspaceID string `json:"workspaceId"`
	EffectID    string `json:"effectId"`
}
type HostReceipt struct {
	EffectID  string `json:"effectId"`
	Status    string `json:"status"`
	Revision  string `json:"revision,omitempty"`
	ReceiptID string `json:"receiptId,omitempty"`
}
