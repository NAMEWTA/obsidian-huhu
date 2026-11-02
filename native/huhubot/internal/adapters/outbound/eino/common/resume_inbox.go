package common

import (
	"encoding/json"
	"reflect"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/cloudwego/eino/schema"
)

// ValidateResumeInboxJSON is the pure checkpoint seam used by native protocol
// projections. A marker proves presentation, never current database access.
func ValidateResumeInboxJSON(raw []byte) error {
	_, err := decodeResumeInbox(raw)
	return err
}

func decodeResumeInbox(raw []byte) (*api.ResumeInbox, error) {
	bad := Fault("CHECKPOINT_INVALID")
	if StrictJSON(raw, MaxResultBytes) != nil || api.ValidateMemoryJSON(raw) != nil {
		return nil, bad
	}
	var packet *api.ResumeInbox
	if json.Unmarshal(raw, &packet) != nil || packet == nil || api.ValidateResumeInbox(packet) != nil {
		return nil, bad
	}
	// encoding/json accepts case aliases and silently drops unknown fields.
	// Compare the decoded object with the exact DTO projection to reject those,
	// nulls and omitted required scalars, independently of key ordering/escapes.
	canonical, err := json.Marshal(packet)
	var actual, expected any
	if err != nil || json.Unmarshal(raw, &actual) != nil || json.Unmarshal(canonical, &expected) != nil || !reflect.DeepEqual(actual, expected) {
		return nil, bad
	}
	return packet, nil
}

type presentedInbox map[string]api.DerivedInput

func (seen presentedInbox) add(ref api.DerivedInput) (bool, error) {
	if prior, ok := seen[ref.ID]; ok {
		if prior != ref {
			return false, Fault("CHECKPOINT_INVALID")
		}
		return false, nil
	}
	seen[ref.ID] = ref
	return true, nil
}

func (s *executionState) readPresentedInbox(shortTerm *api.ShortTermInput, intent string) error {
	seen := presentedInbox{}
	if shortTerm != nil {
		for _, entry := range shortTerm.Entries {
			if entry.Use != "inbox" {
				continue
			}
			text := entry.Text
			if entry.Representation == "intent_alias" {
				text = intent
			}
			if inputTextHash(text) != entry.Ref.Hash {
				return Fault("CHECKPOINT_INVALID")
			}
			if _, err := seen.add(entry.Ref); err != nil {
				return err
			}
		}
	}
	// Completed batches no longer have savedCall.Result. Their original tool
	// messages retain explicit presentation receipts across later suspensions.
	for _, message := range s.Messages {
		if message.Role != schema.Tool {
			continue
		}
		var result map[string]json.RawMessage
		if json.Unmarshal([]byte(message.Content), &result) != nil {
			return Fault("CHECKPOINT_INVALID")
		}
		raw, ok := result["resumeInbox"]
		if !ok {
			continue // legacy artifacts have no retrospective delivery proof
		}
		packet, err := decodeResumeInbox(raw)
		if err != nil {
			return err
		}
		for _, item := range packet.Messages {
			if _, err = seen.add(item.Ref); err != nil {
				return err
			}
		}
		for _, answer := range packet.AnswerReceipts {
			if _, err = seen.add(answer.Ref); err != nil {
				return err
			}
		}
	}
	s.presentedInbox = seen
	return nil
}

func (s *executionState) filterResumeInbox(decision api.ToolResult) (*api.ResumeInbox, error) {
	packet := decision.ResumeInbox
	if api.ValidateResumeInbox(packet) != nil {
		return nil, Fault("TOOL_RESULT_INVALID")
	}
	if packet == nil {
		return nil, nil
	}
	seen := presentedInbox{}
	for id, ref := range s.presentedInbox {
		seen[id] = ref
	}
	out := &api.ResumeInbox{}
	for _, answer := range packet.AnswerReceipts {
		p := s.Pending
		if p.Kind != "question" || len(decision.Children) != len(p.WaitForIDs) {
			return nil, Fault("TOOL_RESULT_INVALID")
		}
		index := -1
		for j, id := range p.WaitForIDs {
			if id == answer.QuestionID {
				index = j
			}
		}
		if index < 0 || inputTextHash(decision.Children[index].Text) != answer.Ref.Hash {
			return nil, Fault("TOOL_RESULT_INVALID")
		}
		found := false
		for _, ref := range decision.Children[index].Derived {
			// SQL verified the answer self row and its mutable metadata revision.
			// This marker deliberately uses immutable body revision "1".
			if ref.Kind == answer.Ref.Kind && ref.ID == answer.Ref.ID && ref.Hash == answer.Ref.Hash && ref.Namespace == answer.Ref.Namespace && ref.WorkThreadID == answer.Ref.WorkThreadID {
				found = true
			}
		}
		if !found {
			return nil, Fault("TOOL_RESULT_INVALID")
		}
		fresh, err := seen.add(answer.Ref)
		if err != nil {
			return nil, err
		}
		if fresh {
			out.AnswerReceipts = append(out.AnswerReceipts, answer)
		}
	}
	for _, item := range packet.Messages {
		fresh, err := seen.add(item.Ref)
		if err != nil {
			return nil, err
		}
		if fresh {
			out.Messages = append(out.Messages, item)
		}
	}
	if len(out.Messages)+len(out.AnswerReceipts) == 0 {
		return nil, nil
	}
	return out, nil
}
