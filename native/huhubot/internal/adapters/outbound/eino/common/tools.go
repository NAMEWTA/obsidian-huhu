package common

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"reflect"
	"regexp"
	"sort"
	"strings"
	"unicode/utf8"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/cloudwego/eino/schema"
	reflectschema "github.com/eino-contrib/jsonschema"
	validator "github.com/santhosh-tekuri/jsonschema/v6"
)

type noteArgs struct {
	Target  api.EffectTarget `json:"target"`
	Content string           `json:"content"`
}
type pageArgs struct {
	Cursor string `json:"cursor,omitempty"`
	Limit  int    `json:"limit,omitempty"`
}
type idArgs struct {
	ID string `json:"id"`
}
type delegateArgs struct {
	Target         api.DelegationTarget `json:"target"`
	Task           string               `json:"task"`
	Constraints    []string             `json:"constraints"`
	ExpectedOutput string               `json:"expectedOutput"`
	Context        api.ContextEnvelope  `json:"context"`
}
type messageArgs struct {
	TargetAgentID string               `json:"targetAgentId"`
	Kind          string               `json:"kind"`
	Text          string               `json:"text"`
	SourceRefs    []api.SourceSnapshot `json:"sourceRefs"`
	DelegationID  string               `json:"delegationId,omitempty"`
	QuestionID    string               `json:"questionId,omitempty"`
	MessageIDs    []string             `json:"messageIds,omitempty"`
}
type replyArgs struct {
	DelegationID     string               `json:"delegationId"`
	QuestionID       string               `json:"questionId,omitempty"`
	Text             string               `json:"text"`
	SourceRefs       []api.SourceSnapshot `json:"sourceRefs"`
	ExpectedRevision string               `json:"expectedRevision"`
}
type cancelArgs struct {
	ID               string `json:"id"`
	Scope            string `json:"scope,omitempty"`
	ExpectedRevision string `json:"expectedRevision"`
}
type proposalArgs struct {
	Draft api.AgentDraft `json:"draft"`
}
type globalMemoryArgs struct {
	Operation        string          `json:"operation"`
	TargetItemID     string          `json:"targetItemId,omitempty"`
	Scope            api.MemoryScope `json:"scope"`
	Text             string          `json:"text,omitempty"`
	ExpectedRevision string          `json:"expectedRevision"`
}

type toolDefinition struct {
	canonical, wire, description string
	args                         any
}

var definitions = []toolDefinition{
	{"note.write", "note_write", "Propose one exact note create/update. Stops for user approval; never writes before approval.", noteArgs{}},
	{"agents.discover", "agents_discover", "Discover permitted existing identities, safe summaries and revisions. Paginated; no personas or private history.", pageArgs{}},
	{"agents.delegate", "agents_delegate", "Start an isolated existing or temporary task. Temporary is not a persistent Bot; pass only explicitly authorized context.", delegateArgs{}},
	{"agents.message", "agents_message", "Send explicit notify/question/reply. Notify does not start a task; question waits within the same root budget.", messageArgs{}},
	{"tasks.get", "tasks_get", "Read one authorized durable task and its outcome, not another Bot's private conversation.", idArgs{}},
	{"tasks.list", "tasks_list", "List this execution's authorized durable tasks, with pagination.", pageArgs{}},
	{"tasks.reply", "tasks_reply", "Reply to the same authorized task/question with its expected revision; does not reopen a terminal task.", replyArgs{}},
	{"tasks.cancel", "tasks_cancel", "Cancel the specified authorized task subtree, preserving unrelated sessions.", cancelArgs{}},
	{"agents.proposeCreate", "agents_proposeCreate", "Return a persistent Bot proposal for user confirmation. Does not create or grant access.", proposalArgs{}},
	{"memory.proposeGlobal", "memory_proposeGlobal", "Propose one global-memory create, update or delete for user confirmation. The proposal is not shared until the user accepts it.", globalMemoryArgs{}},
}

type registry struct {
	infos   []*schema.ToolInfo
	byWire  map[string]toolDefinition
	schemas map[string]*validator.Schema
	digest  string
}

func newRegistry(allowed []string, compatibilitySeed string) (registry, error) {
	r := registry{byWire: map[string]toolDefinition{}, schemas: map[string]*validator.Schema{}}
	selected := map[string]bool{}
	for _, name := range allowed {
		selected[name] = true
	}
	defs := append([]toolDefinition(nil), definitions...)
	sort.Slice(defs, func(i, j int) bool { return defs[i].wire < defs[j].wire })
	aliases := [][2]string{}
	seenCanonical := map[string]bool{}
	validWire := regexp.MustCompile(`^[A-Za-z0-9_-]{1,64}$`)
	for _, d := range defs {
		if !selected[d.canonical] {
			continue
		}
		if !validWire.MatchString(d.wire) || r.byWire[d.wire].wire != "" || seenCanonical[d.canonical] {
			return r, Fault("MODEL_TOOL_SCHEMA_INVALID")
		}
		seenCanonical[d.canonical] = true
		aliases = append(aliases, [2]string{d.wire, d.canonical})
		reflector := reflectschema.Reflector{Anonymous: true, DoNotReference: true}
		s := reflector.Reflect(d.args)
		normalizeSchema(s)
		info := &schema.ToolInfo{Name: d.wire, Desc: d.description, ParamsOneOf: schema.NewParamsOneOfByJSONSchema(s)}
		encoded, err := json.Marshal(s)
		if err != nil {
			return r, err
		}
		document, err := validator.UnmarshalJSON(bytes.NewReader(encoded))
		if err != nil {
			return r, err
		}
		compiler := validator.NewCompiler()
		compiler.DefaultDraft(validator.Draft2020)
		compiler.UseLoader(validator.SchemeURLLoader{})
		url := "https://huhu.local/private-tools/" + d.wire
		if err = compiler.AddResource(url, document); err != nil {
			return r, err
		}
		compiled, err := compiler.Compile(url)
		if err != nil {
			return r, err
		}
		r.byWire[d.wire] = d
		r.schemas[d.wire] = compiled
		r.infos = append(r.infos, info)
	}
	encoded, err := json.Marshal(struct {
		Version string
		Tools   []*schema.ToolInfo
		Aliases [][2]string
	}{compatibilitySeed, r.infos, aliases})
	if err != nil {
		return r, err
	}
	hash := sha256.Sum256(encoded)
	r.digest = "sha256:" + hex.EncodeToString(hash[:])
	return r, nil
}

func normalizeSchema(s *reflectschema.Schema) {
	if s == nil {
		return
	}
	sort.Strings(s.Required)
	if s.Properties != nil {
		for p := s.Properties.Oldest(); p != nil; p = p.Next() {
			normalizeSchema(p.Value)
		}
	}
	normalizeSchema(s.Items)
	for _, set := range [][]*reflectschema.Schema{s.AllOf, s.AnyOf, s.OneOf, s.PrefixItems} {
		for _, item := range set {
			normalizeSchema(item)
		}
	}
}

// StrictJSON rejects ambiguity before encoding/json can silently replace UTF-8
// or retain only the last of two duplicate object keys. No external resolver.
func StrictJSON(data []byte, limit int) error {
	if len(data) == 0 || len(data) > limit || !utf8.Valid(data) {
		return Fault("TOOL_ARGUMENT_INVALID")
	}
	d := json.NewDecoder(bytes.NewReader(data))
	d.UseNumber()
	var value func(int) error
	value = func(depth int) error {
		if depth > 64 {
			return Fault("TOOL_ARGUMENT_DEPTH")
		}
		t, err := d.Token()
		if err != nil {
			return err
		}
		delim, ok := t.(json.Delim)
		if !ok {
			return nil
		}
		switch delim {
		case '{':
			seen := map[string]bool{}
			for d.More() {
				key, err := d.Token()
				if err != nil {
					return err
				}
				name, ok := key.(string)
				if !ok || seen[name] {
					return Fault("TOOL_ARGUMENT_DUPLICATE")
				}
				seen[name] = true
				if err = value(depth + 1); err != nil {
					return err
				}
			}
		case '[':
			for d.More() {
				if err = value(depth + 1); err != nil {
					return err
				}
			}
		default:
			return Fault("TOOL_ARGUMENT_INVALID")
		}
		_, err = d.Token()
		return err
	}
	if err := value(0); err != nil {
		return err
	}
	if _, err := d.Token(); err != io.EOF {
		return Fault("TOOL_ARGUMENT_TRAILING")
	}
	return nil
}

func (r registry) decode(wire, id, args string) (api.ToolCall, error) {
	var call api.ToolCall
	d, ok := r.byWire[wire]
	if !ok || id == "" || len(id) > 256 {
		return call, Fault("TOOL_NOT_SUPPORTED")
	}
	if err := StrictJSON([]byte(args), MaxArgumentBytes); err != nil {
		return call, Fault("TOOL_ARGUMENT_INVALID")
	}
	if !strings.HasPrefix(strings.TrimSpace(args), "{") {
		return call, Fault("TOOL_ARGUMENT_INVALID")
	}
	value, err := validator.UnmarshalJSON(strings.NewReader(args))
	if err != nil || r.schemas[wire].Validate(value) != nil {
		return call, Fault("TOOL_ARGUMENT_INVALID")
	}
	x := reflect.New(reflect.TypeOf(d.args)).Interface()
	decoder := json.NewDecoder(strings.NewReader(args))
	decoder.DisallowUnknownFields()
	if decoder.Decode(x) != nil {
		return call, Fault("TOOL_ARGUMENT_INVALID")
	}
	call.ID = id
	call.Name = d.canonical
	switch v := x.(type) {
	case *noteArgs:
		call.Target = v.Target
		call.Content = v.Content
	case *pageArgs:
		if v.Limit < 0 || v.Limit > 100 {
			return call, Fault("TOOL_ARGUMENT_INVALID")
		}
		if wire == "agents_discover" {
			call.Discover = &api.DiscoverQuery{PageQuery: api.PageQuery{Cursor: v.Cursor, Limit: v.Limit}}
		} else {
			call.TaskList = &api.DelegationQuery{PageQuery: api.PageQuery{Cursor: v.Cursor, Limit: v.Limit}}
		}
	case *idArgs:
		call.TaskQuery = &api.IDQuery{ID: v.ID}
	case *delegateArgs:
		call.Delegate = &api.DelegateCommand{Target: v.Target, Task: v.Task, Constraints: v.Constraints, ExpectedOutput: v.ExpectedOutput, Context: v.Context}
	case *messageArgs:
		call.Message = &api.MessageCommand{TargetAgentID: v.TargetAgentID, Kind: v.Kind, Text: v.Text, SourceRefs: v.SourceRefs, DelegationID: v.DelegationID, QuestionID: v.QuestionID, MessageIDs: v.MessageIDs}
	case *replyArgs:
		call.Reply = &api.ReplyCommand{CommandMeta: api.CommandMeta{ExpectedRevision: v.ExpectedRevision}, DelegationID: v.DelegationID, QuestionID: v.QuestionID, Text: v.Text, SourceRefs: v.SourceRefs}
	case *cancelArgs:
		call.Cancel = &api.TaskCancel{CommandMeta: api.CommandMeta{ExpectedRevision: v.ExpectedRevision}, ID: v.ID, Scope: v.Scope}
	case *proposalArgs:
		call.Proposal = &api.CreateProposal{Draft: v.Draft}
	case *globalMemoryArgs:
		call.GlobalMemory = &api.GlobalMemoryToolDraft{Operation: v.Operation, TargetItemID: v.TargetItemID, Scope: v.Scope, Text: v.Text, ExpectedRevision: v.ExpectedRevision}
	}
	return call, nil
}

func toolMessage(id, wire string, result api.ToolResult) (*schema.Message, error) {
	// Control tokens and configuration/persona-bearing proposal drafts never
	// become provider tool output. The full original result stays in private CP.
	value := map[string]any{"status": result.Status}
	if result.ResumeInbox != nil {
		if api.ValidateResumeInbox(result.ResumeInbox) != nil {
			return nil, Fault("TOOL_RESULT_INVALID")
		}
		value["resumeInbox"] = result.ResumeInbox
	}
	if result.EffectID != "" {
		value["effectId"] = result.EffectID
	}
	if result.Reason != "" {
		value["reason"] = result.Reason
	}
	if result.Receipt != nil {
		value["receipt"] = result.Receipt
	}
	if result.Directory != nil {
		value["directory"] = result.Directory
	}
	if result.Delegation != nil {
		value["delegation"] = result.Delegation
	}
	if result.Tasks != nil {
		value["tasks"] = result.Tasks
	}
	if result.Message != nil {
		value["message"] = result.Message
	}
	if len(result.Children) > 0 {
		value["children"] = result.Children
	}
	if p := result.Proposal; p != nil {
		value["proposal"] = map[string]string{"proposalId": p.ProposalID, "revision": p.Revision, "previewHash": p.PreviewHash}
	}
	if p := result.GlobalMemoryProposal; p != nil {
		if err := api.ValidateGlobalMemoryToolResult(result); err != nil {
			return nil, Fault("TOOL_RESULT_INVALID")
		}
		// The model receives only the opaque pending handle. The fixed preview
		// body remains available through the owner memory API and is never
		// copied into provider transcript or checkpoint state.
		value["globalMemoryProposal"] = p
	}
	encoded, err := json.Marshal(value)
	if err != nil || len(encoded) > MaxResultBytes {
		return nil, Fault("TOOL_RESULT_LIMIT")
	}
	return schema.ToolMessage(string(encoded), id, schema.WithToolName(wire)), nil
}
