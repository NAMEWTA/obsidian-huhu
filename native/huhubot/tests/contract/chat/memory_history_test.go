package chat_test

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	directapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/conversation/direct"
)

type memoryHistoryRepository struct {
	directapp.Repository
	page directapp.HistoryPage
}

func (r memoryHistoryRepository) History(context.Context, api.RequestIdentity, api.HistoryQuery) (directapp.HistoryPage, error) {
	return r.page, nil
}

type memoryHistoryReader func(context.Context, api.RequestIdentity, string, string, []api.VisibleMessage) ([]api.VisibleMessage, map[string][]api.DerivedInput, error)

func (r memoryHistoryReader) ReadHistoryMemory(c context.Context, id api.RequestIdentity, p, target string, items []api.VisibleMessage) ([]api.VisibleMessage, map[string][]api.DerivedInput, error) {
	return r(c, id, p, target, items)
}

type memoryHistoryAccess struct {
	api.ContextAccess
	reject string
}

func (a memoryHistoryAccess) FilterModelHistory(_ context.Context, _ api.RequestIdentity, _ api.RunAccessInput, items []api.ContextRecord) ([]api.ContextRecord, error) {
	if len(items) > 0 && items[0].ID == a.reject {
		return nil, nil
	}
	return items, nil
}

func TestDirectHistoryMemoryFilterPrecedesSourceFreeFastPathAndFinalProofs(t *testing.T) {
	user := api.VisibleMessage{ID: "message:user", Role: "user", Text: "independent original intent", SourceRefs: []api.SourceSnapshot{}}
	assistant := api.VisibleMessage{ID: "message:derived", Role: "assistant", Text: "forgotten memory output", SourceRefs: []api.SourceSnapshot{}}
	page := directapp.HistoryPage{Page: api.MessagePage{Items: []api.VisibleMessage{assistant, user}, DeliverySubjects: []api.DeliverySubject{{Kind: "message", ID: assistant.ID}, {Kind: "message", ID: "message:lookahead"}}}}
	s := directapp.New(memoryHistoryRepository{page: page}, nil, nil)
	called := 0
	s.SetMemoryHistory(memoryHistoryReader(func(_ context.Context, id api.RequestIdentity, profile, target string, items []api.VisibleMessage) ([]api.VisibleMessage, map[string][]api.DerivedInput, error) {
		called++
		if id.PrincipalID() != owner.PrincipalID() || profile != "profile:one" || target != "" || len(items) != 2 {
			t.Fatal("wrong UI Memory qualification", profile, target, items)
		}
		return []api.VisibleMessage{user}, nil, nil
	}))
	got, e := s.History(ctx, owner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: "profile:one"}, SessionID: "session:one"})
	if e != nil || called != 1 || len(got.Items) != 1 || got.Items[0].ID != user.ID || len(got.DeliverySubjects) != 1 || got.DeliverySubjects[0].ID != user.ID {
		t.Fatal("source-free derived body or discarded proof survived", got, e)
	}
	broken := errors.New("real persistence failure")
	s.SetMemoryHistory(memoryHistoryReader(func(context.Context, api.RequestIdentity, string, string, []api.VisibleMessage) ([]api.VisibleMessage, map[string][]api.DerivedInput, error) {
		return nil, nil, broken
	}))
	if _, e = s.History(ctx, owner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: "profile:one"}, SessionID: "session:one"}); !errors.Is(e, broken) {
		t.Fatal("unknown failure was filtered", e)
	}
}

func TestLegacyModelHistoryCommitsOnlyFinallyRetainedMemoryClosure(t *testing.T) {
	ref := func(id string) api.DerivedInput {
		return api.DerivedInput{Kind: "memory_revision", ID: id, Revision: "1", Hash: sourceHash("body"), Namespace: "agent:one", WorkThreadID: "session:one"}
	}
	for _, mode := range []string{"memory-budget", "source-budget", "source-filter", "conflict"} {
		t.Run(mode, func(t *testing.T) {
			keep := api.VisibleMessage{ID: "message:keep", Text: "kept whole message", Role: "assistant", SourceRefs: []api.SourceSnapshot{}}
			drop := api.VisibleMessage{ID: "message:drop", Text: "discarded whole message", Role: "assistant", SourceRefs: []api.SourceSnapshot{}}
			current := api.RunAccessInput{ProfileID: "profile:one", SessionID: "session:one", TaskID: "run:actual"}
			closures := map[string][]api.DerivedInput{keep.ID: {ref("memory:kept")}, drop.ID: {ref("memory:discarded")}, "message:lookahead": {ref("memory:lookahead")}}
			access := memoryHistoryAccess{}
			switch mode {
			case "memory-budget":
				closures[keep.ID] = nil
				for i := 0; i < 127; i++ {
					closures[keep.ID] = append(closures[keep.ID], ref(fmt.Sprintf("memory:kept:%03d", i)))
				}
			case "source-budget":
				for i := 0; i < 32; i++ {
					current.Sources = append(current.Sources, api.SourceSnapshot{ResourceID: fmt.Sprint("current:", i)})
				}
				drop.SourceRefs = []api.SourceSnapshot{{ResourceID: "source:additional"}}
			case "source-filter":
				drop.SourceRefs = []api.SourceSnapshot{{ResourceID: "source:additional"}}
				access.reject = drop.ID
			case "conflict":
				other := ref("memory:kept")
				other.Hash = sourceHash("other body")
				closures[keep.ID] = append(closures[keep.ID], other)
			}
			s := directapp.New(memoryHistoryRepository{page: directapp.HistoryPage{Page: api.MessagePage{Items: []api.VisibleMessage{drop, keep}}, Access: map[string]api.RunAccessInput{}}}, access, nil)
			s.SetMemoryHistory(memoryHistoryReader(func(_ context.Context, _ api.RequestIdentity, p, target string, items []api.VisibleMessage) ([]api.VisibleMessage, map[string][]api.DerivedInput, error) {
				if p != current.ProfileID || target != current.TaskID {
					t.Fatal("model did not qualify the actual target", p, target)
				}
				return items, closures, nil
			}))
			got, e := s.ModelHistory(ctx, owner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: current.ProfileID}, SessionID: current.SessionID}, current)
			if mode == "conflict" {
				var f *api.Fault
				if !errors.As(e, &f) || f.Reason != "HISTORY_PROVENANCE_INVALID" {
					t.Fatal("conflicting same-key ancestry accepted", got, e)
				}
				return
			}
			if e != nil || len(got.Messages) != 1 || got.Messages[0].ID != keep.ID || len(got.Sources) != 0 {
				t.Fatal("whole-message source/ancestry budget lost", got, e)
			}
			for _, v := range got.Derived {
				if strings.Contains(v.ID, "discarded") || strings.Contains(v.ID, "lookahead") || v.ID == drop.ID {
					t.Fatal("unconsumed qualification became model provenance", v)
				}
			}
			want := 2
			if mode == "memory-budget" {
				want = 128
			}
			if len(got.Derived) != want {
				t.Fatal("complete retained ancestry or original message Ref lost", len(got.Derived), want)
			}
		})
	}
}

func TestRealMemoryForgetFiltersDerivedHistoryButKeepsIndependentIntentAndRunMetadata(t *testing.T) {
	inputs := make(chan api.EngineInput, 1)
	engine := fakeEngine{func(_ context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		inputs <- in
		return api.EngineResult{Status: "finished", Text: "assistant used private memory"}, nil
	}}
	core, _, _ := withEngine(t, engine, false)
	agents, e := core.API.Assistant.List(ctx, owner, api.PageQuery{ProfileID: meta(t, core, "q", "").ProfileID})
	if e != nil {
		t.Fatal(e)
	}
	ns := api.MemoryNamespace{Kind: "agent", ID: agents.Items[0].ID}
	page, e := core.API.Memory.List(ctx, owner, api.MemoryQuery{ProfileID: meta(t, core, "q", "").ProfileID, Namespace: ns, Kind: "item"})
	if e != nil {
		t.Fatal(e)
	}
	scope := api.MemoryScope{Kind: "profile"}
	item, e := core.API.Memory.Correct(ctx, owner, api.MemoryCorrect{CommandMeta: meta(t, core, "fact", page.NamespaceRevision), Namespace: ns, Action: "add", Scope: &scope, Text: "private fact to forget"})
	if e != nil {
		t.Fatal(e)
	}
	s := session(t, core)
	r, e := core.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, core, "ask", s.Revision), SessionID: s.ID, Intent: "independent accepted user intent", SourceRefs: []api.SourceSnapshot{}})
	if e != nil {
		t.Fatal(e)
	}
	waitRun(t, core, r.RunID, "succeeded")
	in := <-inputs
	found := false
	if in.Memory != nil {
		for _, v := range in.Memory.Entries {
			if v.Ref.ID == item.RevisionID {
				found = true
			}
		}
	}
	if !found {
		t.Fatal("real accepted output did not consume the recalled memory")
	}
	if _, e = core.API.Memory.Forget(ctx, owner, api.MemoryForget{CommandMeta: meta(t, core, "forget", item.Revision), Namespace: ns, ID: item.ID}); e != nil {
		t.Fatal(e)
	}
	history, e := core.API.Conversation.History(ctx, owner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: meta(t, core, "q", "").ProfileID}, SessionID: s.ID})
	if e != nil || len(history.Items) != 1 || history.Items[0].Role != "user" || history.Items[0].Text != "independent accepted user intent" || len(history.DeliverySubjects) != 1 || history.DeliverySubjects[0].ID != history.Items[0].ID {
		t.Fatal("real memory-only ancestry escaped the source-free fast path", history, e)
	}
	run, e := core.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: meta(t, core, "q", "").ProfileID, ID: r.RunID})
	if e != nil || run.Status != "succeeded" || run.ContextUsage == nil || run.ContextUsage.PolicyVersion != "extractive-v1" {
		t.Fatal("redacted original body hid safe terminal metadata", run, e)
	}
}
