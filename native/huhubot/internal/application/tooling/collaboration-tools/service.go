package collaborationtools

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	delegate "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/collaboration/delegate"
)

type Service struct {
	collaboration api.CollaborationAPI
	messages      api.MessagesAPI
	metadata      api.ProfileReader
}

func New(c api.CollaborationAPI, m api.MessagesAPI, p api.ProfileReader) *Service {
	return &Service{c, m, p}
}
func (s *Service) InvokeTool(ctx context.Context, e api.ToolExecution, c api.ToolCall) (api.ToolResult, error) {
	if c.ID == "" || len(c.ID) > 256 || e.ClaimToken == "" || !e.Identity.Valid() {
		return api.ToolResult{}, api.Denied("TOOL_EXECUTION_REQUIRED")
	}
	ctx = delegate.BindExecution(ctx, e)
	if s.metadata == nil || s.collaboration == nil || s.messages == nil {
		return api.ToolResult{}, api.Denied("COLLABORATION_NOT_ASSEMBLED")
	}
	p, err := s.metadata.ReadMetadata(ctx)
	if err != nil {
		return api.ToolResult{}, err
	}
	h := sha256.Sum256([]byte(e.Run.ID + "\x00" + c.ID))
	key := "tool:" + hex.EncodeToString(h[:])
	meta := api.CommandMeta{CommandID: key, IdempotencyKey: key, ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch}
	count := 0
	for _, present := range []bool{c.Discover != nil, c.Delegate != nil, c.Message != nil, c.Reply != nil, c.Cancel != nil, c.Proposal != nil, c.TaskQuery != nil, c.TaskList != nil} {
		if present {
			count++
		}
	}
	if count != 1 {
		return api.ToolResult{}, api.Invalid("INVALID_COLLABORATION_TOOL")
	}
	var out api.ToolResult
	switch c.Name {
	case "tasks.get":
		if c.TaskQuery == nil {
			break
		}
		q := *c.TaskQuery
		q.ProfileID = p.ProfileID
		v, x := s.collaboration.GetTask(ctx, e.Identity, q)
		out.Delegation = &v
		out.Status = v.Status
		return out, x
	case "tasks.list":
		if c.TaskList == nil {
			break
		}
		q := *c.TaskList
		q.ProfileID = p.ProfileID
		q.RunID = e.Run.ID
		v, x := s.collaboration.ListTasks(ctx, e.Identity, q)
		out.Tasks = &v
		out.Status = "completed"
		return out, x
	case "agents.discover":
		if c.Discover == nil {
			break
		}
		q := *c.Discover
		q.ProfileID = p.ProfileID
		q.RunID = e.Run.ID
		v, x := s.collaboration.Discover(ctx, e.Identity, q)
		out.Directory = &v
		out.Status = "completed"
		return out, x
	case "agents.delegate":
		if c.Delegate == nil {
			break
		}
		v := *c.Delegate
		v.CommandMeta = meta
		v.RunID = e.Run.ID
		v.Context.ParentRunID = e.Run.ID
		r, x := s.collaboration.Delegate(ctx, e.Identity, v)
		out.Delegation = &r
		out.Status = "accepted"
		return out, x
	case "agents.message":
		if c.Message == nil {
			break
		}
		v := *c.Message
		v.CommandMeta = meta
		v.RunID = e.Run.ID
		r, x := s.messages.Send(ctx, e.Identity, v)
		out.Message = &r
		out.Status = "delivered"
		return out, x
	case "tasks.reply":
		if c.Reply == nil {
			break
		}
		v := *c.Reply
		meta.ExpectedRevision = v.ExpectedRevision
		v.CommandMeta = meta
		r, x := s.messages.Reply(ctx, e.Identity, v)
		out.Message = &r
		out.Status = r.Status
		return out, x
	case "tasks.cancel":
		if c.Cancel == nil {
			break
		}
		v := *c.Cancel
		meta.ExpectedRevision = v.ExpectedRevision
		v.CommandMeta = meta
		r, x := s.collaboration.CancelTask(ctx, e.Identity, v)
		out.Delegation = &r
		out.Status = r.Status
		return out, x
	case "agents.proposeCreate":
		if c.Proposal == nil {
			break
		}
		v := *c.Proposal
		v.CommandMeta = meta
		v.RunID = e.Run.ID
		r, x := s.collaboration.ProposeCreate(ctx, e.Identity, v)
		out.Proposal = &r
		out.Status = "proposed"
		return out, x
	}
	return api.ToolResult{}, api.Invalid("INVALID_COLLABORATION_TOOL")
}

var _ api.CollaborationTools = (*Service)(nil)
