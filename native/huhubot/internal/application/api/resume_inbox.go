package api

import (
	"encoding/json"
	"unicode/utf8"
)

// ResumeInbox carries currently qualified, post-seal collaboration messages
// through the durable resume decision. It is not an EngineInput.Messages replay
// or a new source of authority; the Store must verify every body and grant.
type ResumeInbox struct {
	Messages       []ResumeInboxItem `json:"messages,omitempty"`
	AnswerReceipts []AnswerReceipt   `json:"answerReceipts,omitempty"`
}

type ResumeInboxItem struct {
	Message AgentMessage `json:"message"`
	Ref     DerivedInput `json:"ref"`
}

// An answer's body is already in Decision.Children. Its own DB-verified
// identity is recorded without repeating the body or trusting ancestry refs.
type AnswerReceipt struct {
	QuestionID string       `json:"questionId"`
	Ref        DerivedInput `json:"ref"`
}

const (
	ResumeInboxMaxMessages = 100
	ResumeInboxMaxAnswers  = 32
	ResumeInboxMaxBody     = 256 << 10
	ResumeInboxMaxEncoded  = 2 << 20
)

// ValidateResumeInbox checks a pure internal value. In particular, a thread
// message's immutable body revision is "1" even when the SQL row revision
// advances for a status change. It does not perform current authorization.
func ValidateResumeInbox(v *ResumeInbox) error {
	if v == nil {
		return nil
	}
	bad := Invalid("RESUME_INBOX_INVALID")
	limit := &Fault{Kind: "RESOURCE_LIMIT", Reason: "RESUME_INBOX_LIMIT"}
	if len(v.Messages)+len(v.AnswerReceipts) == 0 {
		return bad
	}
	if len(v.Messages)+len(v.AnswerReceipts) > ResumeInboxMaxMessages || len(v.AnswerReceipts) > ResumeInboxMaxAnswers {
		return limit
	}
	seen := make(map[string]bool, len(v.Messages)+len(v.AnswerReceipts))
	bodyBytes := 0
	for _, item := range v.Messages {
		m, r := item.Message, item.Ref
		if !validResumeBodyRef(r) || m.ID != r.ID || m.WorkThreadID != r.WorkThreadID || !memoryOpaque(m.ToAgentID) || m.FromAgentID != "" && !memoryOpaque(m.FromAgentID) || m.DelegationID != "" && !memoryOpaque(m.DelegationID) || m.QuestionID != "" && !memoryOpaque(m.QuestionID) || !utf8.ValidString(m.Text) || len(m.Text) == 0 || len(m.Text) > MemoryTextBytes || contextHash(m.Text) != r.Hash || !utf8.ValidString(m.CreatedAt) || len(m.CreatedAt) == 0 || len(m.CreatedAt) > 128 || !validResumeMessageState(m) || seen[r.ID] {
			return bad
		}
		seen[r.ID] = true
		bodyBytes += len(m.Text)
		if bodyBytes > ResumeInboxMaxBody {
			return limit
		}
	}
	questions := make(map[string]bool, len(v.AnswerReceipts))
	for _, answer := range v.AnswerReceipts {
		if !memoryOpaque(answer.QuestionID) || !validResumeBodyRef(answer.Ref) || seen[answer.Ref.ID] || questions[answer.QuestionID] {
			return bad
		}
		seen[answer.Ref.ID] = true
		questions[answer.QuestionID] = true
	}
	encoded, err := json.Marshal(v)
	if err != nil {
		return bad
	}
	if len(encoded) > ResumeInboxMaxEncoded {
		return limit
	}
	return nil
}

func validResumeBodyRef(r DerivedInput) bool {
	return validMemoryRef(r) && r.Kind == "message" && r.Revision == "1" && r.Namespace == r.WorkThreadID
}

func validResumeMessageState(m AgentMessage) bool {
	if m.Kind != "notify" && m.Kind != "question" && m.Kind != "reply" {
		return false
	}
	return m.Status == "delivered" || m.Status == "answered"
}
