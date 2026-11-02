package api

import "context"

type RunEvent struct {
	RunID      string           `json:"runId"`
	Seq        string           `json:"seq"`
	Type       string           `json:"type"`
	CreatedAt  string           `json:"createdAt"`
	Text       string           `json:"text,omitempty"`
	SourceRefs []SourceSnapshot `json:"sourceRefs,omitempty"`
	Status     string           `json:"status,omitempty"`
	Reason     string           `json:"reason,omitempty"`
	MessageID  string           `json:"messageId,omitempty"`
	ApprovalID string           `json:"approvalId,omitempty"`
	EffectID   string           `json:"effectId,omitempty"`
	Usage      *RunUsage        `json:"usage,omitempty"`
}
type EventTailQuery struct {
	ProfileID  string `json:"profileId"`
	RunID      string `json:"runId"`
	AfterSeq   string `json:"afterSeq,omitempty"`
	Limit      int    `json:"limit,omitempty"`
	MaxBytes   int    `json:"maxBytes,omitempty"`
	WaitMillis int    `json:"waitMillis,omitempty"`
}
type EventPage struct {
	RunID          string     `json:"runId"`
	SubscriptionID string     `json:"subscriptionId"`
	Events         []RunEvent `json:"events"`
	NextSeq        string     `json:"nextSeq"`
	HeadSeq        string     `json:"headSeq"`
	HasMore        bool       `json:"hasMore"`
}
type RunSnapshot struct {
	Run         Run              `json:"run"`
	Messages    []VisibleMessage `json:"messages"`
	PendingText string           `json:"pendingText"`
	Events      []RunEvent       `json:"events"`
}
type EventCursorRecovery struct {
	Type        string      `json:"type"`
	RunID       string      `json:"runId"`
	SnapshotSeq string      `json:"snapshotSeq"`
	Snapshot    RunSnapshot `json:"snapshot"`
}
type DeliverySubject struct {
	Kind, ID string
	// Expected attachment labels were filtered by the server for this response.
	Attachments *MessageAttachments `json:"-"`
}

type EventsAPI interface {
	Tail(context.Context, RequestIdentity, EventTailQuery) (EventPage, error)
	Snapshot(context.Context, RequestIdentity, IDQuery) (EventCursorRecovery, error)
	// WithDelivery closes its SQL read before fn; fn must physically stop writing
	// before returning. Revocation commits and expiry share this bounded fence.
	WithDelivery(context.Context, RequestIdentity, []DeliverySubject, func(context.Context) error) error
}
