package delegation_test

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// requiredInbox observes the sealed input the Engine actually receives. An
// intent alias retains the message identity while its text is supplied by Intent.
func requiredInbox(i api.EngineInput, want string) (api.ShortTermEntry, error) {
	if i.ShortTerm == nil {
		return api.ShortTermEntry{}, fmt.Errorf("missing sealed short-term input")
	}
	var found api.ShortTermEntry
	count := 0
	for _, entry := range i.ShortTerm.Entries {
		if entry.Use != "inbox" {
			continue
		}
		count++
		if entry.Message == nil || entry.OriginKind != "thread_message" || entry.Ref.Kind != "message" || entry.Ref.ID == "" || entry.Ref.ID != entry.Message.ID || entry.Ref.Namespace != entry.Message.WorkThreadID || entry.Message.Text != "" {
			return api.ShortTermEntry{}, fmt.Errorf("invalid sealed inbox identity: %#v", entry)
		}
		body := entry.Text
		if entry.Representation == "intent_alias" {
			if entry.Text != "" || entry.Ref.Hash != i.ShortTerm.IntentHash {
				return api.ShortTermEntry{}, fmt.Errorf("invalid intent alias: %#v", entry)
			}
			body = i.Intent
		} else if entry.Representation != "full" {
			return api.ShortTermEntry{}, fmt.Errorf("inbox was abbreviated: %#v", entry)
		}
		if body == want {
			found = entry
		}
	}
	if count != 1 || found.Message == nil {
		return api.ShortTermEntry{}, fmt.Errorf("expected one required inbox %q, got %#v", want, i.ShortTerm.Entries)
	}
	return found, nil
}

// requiredResumeMessages checks the durable decision's actual message bodies
// and identities. A completed child or inherited lineage is not proof that a
// late supplement was presented to Engine.Resume.
func requiredResumeMessages(i api.EngineResumeInput, want ...api.AgentMessage) error {
	if len(i.Input.Messages) != 0 {
		return fmt.Errorf("legacy resume Messages were replayed: %#v", i.Input.Messages)
	}
	if i.Input.ShortTerm == nil || i.Input.ShortTerm.BindingDigest == "" {
		return fmt.Errorf("sealed short-term prefix missing on resume")
	}
	packet := i.Decision.ResumeInbox
	if packet == nil || len(packet.Messages) != len(want) || len(packet.AnswerReceipts) != 0 {
		return fmt.Errorf("unexpected resume inbox: %#v", packet)
	}
	if err := api.ValidateResumeInbox(packet); err != nil {
		return fmt.Errorf("invalid resume inbox: %w", err)
	}
	expected := make(map[string]api.AgentMessage, len(want))
	for _, message := range want {
		if message.ID == "" || expected[message.ID].ID != "" {
			return fmt.Errorf("duplicate or empty expected message identity: %#v", message)
		}
		expected[message.ID] = message
	}
	seen := make(map[string]bool, len(want))
	for _, item := range packet.Messages {
		message, ok := expected[item.Message.ID]
		if !ok || seen[item.Message.ID] || item.Message != message {
			return fmt.Errorf("resume message identity/body mismatch: %#v", item)
		}
		seen[item.Message.ID] = true
		digest := sha256.Sum256([]byte(message.Text))
		ref := api.DerivedInput{Kind: "message", ID: message.ID, Revision: "1", Hash: "sha256:" + hex.EncodeToString(digest[:]), Namespace: message.WorkThreadID, WorkThreadID: message.WorkThreadID}
		if item.Ref != ref {
			return fmt.Errorf("resume message ref mismatch: got %#v want %#v", item.Ref, ref)
		}
		lineage := false
		for _, derived := range i.Input.Lineage.Derived {
			if derived.Kind == ref.Kind && derived.ID == ref.ID {
				if derived != ref {
					return fmt.Errorf("resume lineage identity conflict: got %#v want %#v", derived, ref)
				}
				lineage = true
			}
		}
		if !lineage {
			return fmt.Errorf("resume message missing from qualified lineage: %#v", ref)
		}
	}
	return nil
}
