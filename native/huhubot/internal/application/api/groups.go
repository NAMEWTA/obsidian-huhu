package api

import "context"

// GroupHistoryScope explicitly grants a bounded pre-join public history range.
// New public messages after joining remain eligible for the current member.
type GroupHistoryScope struct {
	Kind       string `json:"kind"`
	AfterSeq   string `json:"afterSeq,omitempty"`
	ThroughSeq string `json:"throughSeq,omitempty"`
}
type GroupMemberIdentity struct {
	AgentID         string `json:"agentId"`
	Incarnation     string `json:"incarnation"`
	HistoryRevision string `json:"historyRevision"`
}
type GroupMember struct {
	GroupMemberIdentity
	HistoryScope GroupHistoryScope `json:"historyScope"`
}

// GroupBinding is server-derived provenance. Public command parameters cannot
// supply a binding or convert a user batch edge into a model delegation edge.
type GroupBinding struct {
	SessionID string                `json:"sessionId"`
	Members   []GroupMemberIdentity `json:"members"`
}
type SessionMembersUpdate struct {
	CommandMeta
	ID           string            `json:"id"`
	MemberIDs    []string          `json:"memberIds"`
	HistoryScope GroupHistoryScope `json:"historyScope"`
}
type SessionCoordinatorUpdate struct {
	CommandMeta
	ID            string `json:"id"`
	CoordinatorID string `json:"coordinatorId"`
}

// GroupsAPI is composed into the existing sessions/runs namespace. SQL and
// lifecycle callbacks remain adapter-only seams of the single Profile UoW.
type GroupsAPI interface {
	CreateSession(context.Context, RequestIdentity, SessionCreate) (Session, error)
	UpdateMembers(context.Context, RequestIdentity, SessionMembersUpdate) (Session, error)
	SetCoordinator(context.Context, RequestIdentity, SessionCoordinatorUpdate) (Session, error)
	StartRun(context.Context, RequestIdentity, RunStart) (RunReceipt, error)
}
