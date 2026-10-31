package common_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type contextInvoke func(context.Context, api.ToolCall) (api.ToolResult, error)

func (f contextInvoke) Invoke(ctx context.Context, call api.ToolCall) (api.ToolResult, error) {
	return f(ctx, call)
}

func maintenanceInput(t *testing.T, in api.EngineInput) api.EngineInput {
	t.Helper()
	in = sealedContextInput(t, in)
	in.ShortTerm, in.Context.Sources = nil, nil
	in.Agent.AllowedTools = []string{"note.write", "agents.discover"}
	in.Config.Agent = in.Agent
	in.Memory.Mode, in.Memory.JobID, in.Memory.JobGeneration, in.Memory.SettingsRevision = "maintenance", "job:context", "2", "3"
	in.Memory.Targets = []api.MemoryTarget{{ItemID: "item:z", Revision: "2", RevisionID: "revision:z"}, {ItemID: "item:a", Revision: "4", RevisionID: "revision:a", Pinned: true}}
	var err error
	in.Memory.BindingDigest, err = api.CanonicalMemoryInputBinding(*in.Memory)
	if err != nil {
		t.Fatal(err)
	}
	return in
}

func writeContextText(w http.ResponseWriter, text string, complete bool) {
	w.Header().Set("Content-Type", "text/event-stream")
	encoded, _ := json.Marshal(text)
	fmt.Fprintf(w, "data: {\"id\":\"memory\",\"choices\":[{\"index\":0,\"delta\":{\"role\":\"assistant\",\"content\":%s},\"finish_reason\":null}]}\n\n", encoded)
	if complete {
		fmt.Fprint(w, "data: {\"id\":\"memory\",\"choices\":[{\"index\":0,\"delta\":{},\"finish_reason\":\"stop\"}]}\n\n")
		fmt.Fprint(w, "data: {\"choices\":[],\"usage\":{\"prompt_tokens\":9,\"completion_tokens\":4,\"total_tokens\":13}}\n\ndata: [DONE]\n\n")
	}
}

func TestMaintenanceCandidatesUseEmptyToolsWithoutUserText(t *testing.T) {
	var requests, resolutions, invokes, deltas atomic.Int32
	captured := make(chan map[string]any, 1)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Error(err)
		}
		captured <- body
		writeContextText(w, `{"items":[{"operation":"create","text":"喜欢中文。","provenance":"observation"},{"operation":"correct","targetItemId":"item:a","text":"推断需短答。","provenance":"inference"}]}`, true)
	}))
	t.Cleanup(server.Close)
	attempts := &contextAttempts{}
	in := maintenanceInput(t, directContextInput(server.URL+"/v1", attempts))
	in.Tools = contextInvoke(func(context.Context, api.ToolCall) (api.ToolResult, error) {
		invokes.Add(1)
		return api.ToolResult{Status: "completed"}, nil
	})
	e := contextEngine(t, &resolutions)
	result, err := e.Run(context.Background(), in, func(api.EngineEvent) error { deltas.Add(1); return nil })
	if err != nil || result.Status != "finished" || result.Text != "" || result.Partial || result.MemoryCandidates == nil || len(result.MemoryCandidates.Items) != 2 || invokes.Load() != 0 || deltas.Load() != 0 || requests.Load() != 1 {
		t.Fatal("maintenance escaped its bounded private output", result, err, invokes.Load(), deltas.Load(), requests.Load())
	}
	items := result.MemoryCandidates.Items
	if items[0].Text != "喜欢中文。" || items[0].TargetItemID != "" || items[1].TargetItemID != "item:a" || items[1].Provenance != "inference" {
		t.Fatal("strict candidates changed", items)
	}
	body := <-captured
	if tools, exists := body["tools"]; exists && tools != nil && len(tools.([]any)) != 0 {
		t.Fatal("maintenance advertised tools from the pinned Agent", tools)
	}
	msgs := body["messages"].([]any)
	if len(msgs) != 4 || msgs[0].(map[string]any)["content"] != in.Agent.Persona || !strings.HasPrefix(msgs[1].(map[string]any)["content"].(string), "HUHU memory maintenance instruction v1\n") || msgs[3].(map[string]any)["content"] != in.Intent {
		t.Fatal("maintenance prefix includes historical/Host context", msgs)
	}
	for i := 1; i < len(msgs); i++ {
		if msgs[i].(map[string]any)["role"] != "user" {
			t.Fatal("maintenance data raised authority", msgs[i])
		}
	}
	var memory struct {
		BindingDigest string `json:"bindingDigest"`
		Targets       []struct {
			ID string `json:"itemId"`
		} `json:"targets"`
	}
	if err = json.Unmarshal([]byte(strings.TrimPrefix(msgs[2].(map[string]any)["content"].(string), "HUHU authorized memory input v1\n")), &memory); err != nil || memory.BindingDigest != in.Memory.BindingDigest || len(memory.Targets) != 2 || memory.Targets[0].ID != "item:a" || memory.Targets[1].ID != "item:z" {
		t.Fatal("targets were not rendered in canonical order", memory, err)
	}
	attempts.mu.Lock()
	defer attempts.mu.Unlock()
	if len(attempts.requests) != 1 || attempts.requests[0].Purpose != "" || attempts.requests[0].AccountID != "" || attempts.dispatched != 1 || len(attempts.observations) != 1 || !attempts.observations[0].ProducerEnded {
		t.Fatal("Engine bypassed DB account binding or original producer settlement", attempts.requests, attempts.observations)
	}
}

func TestMaintenanceRejectsStrictCandidateAmbiguityWithoutLeaking(t *testing.T) {
	validItem := `{"operation":"create","text":"ok","provenance":"observation"}`
	cases := map[string]string{
		"empty": "", "null": `null`, "array": `[]`, "items_null": `{"items":null}`, "item_null": `{"items":[null]}`,
		"case_alias": `{"Items":[]}`, "field_alias": `{"items":[{"Operation":"create","text":"ok","provenance":"observation"}]}`,
		"mixed_case_alias": `{"items":[{"operation":"create","Operation":"create","text":"ok","provenance":"observation"}]}`,
		"duplicate_root":   `{"items":[],"items":[]}`, "duplicate_field": `{"items":[{"operation":"create","text":"a","text":"b","provenance":"observation"}]}`,
		"escaped_duplicate": `{"items":[{"operation":"create","text":"a","te\u0078t":"b","provenance":"observation"}]}`,
		"unknown_root":      `{"items":[],"owner":null}`, "unknown_field": `{"items":[{"operation":"create","text":"ok","provenance":"observation","scope":"global"}]}`,
		"null_scalar":    `{"items":[{"operation":"create","text":null,"provenance":"observation"}]}`,
		"missing_scalar": `{"items":[{"operation":"create","text":"ok"}]}`, "non_string": `{"items":[{"operation":1,"text":"ok","provenance":"observation"}]}`,
		"user_provenance": `{"items":[{"operation":"create","text":"ok","provenance":"user"}]}`, "operation": `{"items":[{"operation":"delete","text":"ok","provenance":"inference"}]}`,
		"create_target":          `{"items":[{"operation":"create","targetItemId":"item:a","text":"ok","provenance":"observation"}]}`,
		"empty_create_target":    `{"items":[{"operation":"create","targetItemId":"","text":"ok","provenance":"observation"}]}`,
		"correct_missing_target": `{"items":[{"operation":"correct","text":"ok","provenance":"observation"}]}`,
		"foreign_target":         `{"items":[{"operation":"correct","targetItemId":"item:foreign","text":"ok","provenance":"observation"}]}`,
		"blank":                  `{"items":[{"operation":"create","text":" \t\n","provenance":"observation"}]}`,
		"lone_surrogate":         `{"items":[{"operation":"create","text":"\ud800","provenance":"observation"}]}`,
		"reverse_surrogates":     `{"items":[{"operation":"create","text":"\udc00\ud800","provenance":"observation"}]}`,
		"trailing":               `{"items":[]} {"items":[]}`, "truncated": `{"items":[`, "markdown": "```json\n{\"items\":[]}\n```",
		"duplicate_item":       `{"items":[` + validItem + `,` + validItem + `]}`,
		"duplicate_correction": `{"items":[{"operation":"correct","targetItemId":"item:a","text":"a","provenance":"observation"},{"operation":"correct","targetItemId":"item:a","text":"b","provenance":"inference"}]}`,
		"too_many":             `{"items":[` + strings.TrimSuffix(strings.Repeat(validItem+",", 33), ",") + `]}`,
		"decoded_text_bytes":   `{"items":[{"operation":"create","text":"` + strings.Repeat("汉", 21846) + `","provenance":"observation"}]}`,
		"output_bytes":         strings.Repeat(" ", 131073),
	}
	for name, output := range cases {
		t.Run(name, func(t *testing.T) {
			var sends, resolutions, invokes, deltas atomic.Int32
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				sends.Add(1)
				writeContextText(w, output, true)
			}))
			t.Cleanup(server.Close)
			attempts := &contextAttempts{}
			in := maintenanceInput(t, directContextInput(server.URL+"/v1", attempts))
			in.Tools = contextInvoke(func(context.Context, api.ToolCall) (api.ToolResult, error) {
				invokes.Add(1)
				return api.ToolResult{}, nil
			})
			result, err := contextEngine(t, &resolutions).Run(context.Background(), in, func(api.EngineEvent) error { deltas.Add(1); return nil })
			if err != nil || result.Status != "failed" || result.Reason != "MEMORY_CANDIDATE_INVALID" || result.Text != "" || result.Partial || result.MemoryCandidates != nil || deltas.Load() != 0 || invokes.Load() != 0 || sends.Load() != 1 {
				t.Fatal("invalid candidate escaped private parser", result, err, deltas.Load(), invokes.Load(), sends.Load())
			}
			attempts.mu.Lock()
			defer attempts.mu.Unlock()
			if len(attempts.observations) != 1 || !attempts.observations[0].ProducerEnded {
				t.Fatal("candidate rejection skipped actual producer settlement", attempts.observations)
			}
		})
	}
}

func TestMaintenanceAcceptsEmptyUnicodeAndExactCandidateByteLimit(t *testing.T) {
	base := `{"items":[{"operation":"create","text":"","provenance":"observation"},{"operation":"create","text":"","provenance":"inference"}]}`
	remaining := 131072 - len(base) - 65536
	max := strings.Replace(base, `"text":""`, `"text":"`+strings.Repeat("x", 65536)+`"`, 1)
	max = strings.Replace(max, `"text":""`, `"text":"`+strings.Repeat("y", remaining)+`"`, 1)
	if len(max) != 131072 {
		t.Fatal("incorrect exact-boundary fixture", len(max))
	}
	for name, output := range map[string]string{"empty": `{"items":[]}`, "unicode": `{"items":[{"operation":"create","text":"中文\ud83d\ude00","provenance":"observation"}]}`, "exact_bytes": max} {
		t.Run(name, func(t *testing.T) {
			var resolutions, deltas atomic.Int32
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { writeContextText(w, output, true) }))
			t.Cleanup(server.Close)
			in := maintenanceInput(t, directContextInput(server.URL+"/v1", &contextAttempts{}))
			result, err := contextEngine(t, &resolutions).Run(context.Background(), in, func(api.EngineEvent) error { deltas.Add(1); return nil })
			if err != nil || result.Status != "finished" || result.MemoryCandidates == nil || result.MemoryCandidates.Items == nil || result.Text != "" || result.Partial || deltas.Load() != 0 {
				t.Fatal("legal bounded candidate rejected", name, result.Status, result.Reason, err, deltas.Load())
			}
		})
	}
}

func TestMaintenanceRejectsProviderToolsAndIncompletePrivateText(t *testing.T) {
	for _, mode := range []string{"two_tools", "truncated"} {
		t.Run(mode, func(t *testing.T) {
			var resolutions, invokes, deltas atomic.Int32
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				if mode == "truncated" {
					writeContextText(w, `{"items":[{"operation":"create","text":"PRIVATE_PARTIAL`, false)
					return
				}
				w.Header().Set("Content-Type", "text/event-stream")
				fmt.Fprint(w, "data: {\"id\":\"tools\",\"choices\":[{\"index\":0,\"delta\":{\"role\":\"assistant\",\"content\":\"PRIVATE_PREFIX\",\"tool_calls\":[{\"index\":0,\"id\":\"call:first\",\"type\":\"function\",\"function\":{\"name\":\"note_write\",\"arguments\":\"{\\\"target\\\":{\\\"resourceId\\\":\\\"resource:one\\\",\\\"operation\\\":\\\"create\\\"},\\\"content\\\":\\\"body\\\"}\"}},{\"index\":1,\"id\":\"call:second\",\"type\":\"function\",\"function\":{\"name\":\"unknown_tool\",\"arguments\":\"{}\"}}]},\"finish_reason\":null}]}\n\n")
				fmt.Fprint(w, "data: {\"id\":\"tools\",\"choices\":[{\"index\":0,\"delta\":{},\"finish_reason\":\"tool_calls\"}]}\n\ndata: [DONE]\n\n")
			}))
			t.Cleanup(server.Close)
			attempts := &contextAttempts{}
			in := maintenanceInput(t, directContextInput(server.URL+"/v1", attempts))
			in.Tools = contextInvoke(func(context.Context, api.ToolCall) (api.ToolResult, error) {
				invokes.Add(1)
				return api.ToolResult{Status: "completed"}, nil
			})
			result, err := contextEngine(t, &resolutions).Run(context.Background(), in, func(api.EngineEvent) error { deltas.Add(1); return nil })
			if err != nil || result.Status != "failed" || result.MemoryCandidates != nil || result.Text != "" || result.Partial || deltas.Load() != 0 || invokes.Load() != 0 {
				t.Fatal("failed maintenance leaked output or invoked tools", result, err, deltas.Load(), invokes.Load())
			}
			attempts.mu.Lock()
			defer attempts.mu.Unlock()
			if len(attempts.observations) != 1 || !attempts.observations[0].ProducerEnded || attempts.observations[0].Knowledge != "unknown" {
				t.Fatal("incomplete/missing usage lost original unknown accounting", attempts.observations)
			}
		})
	}
}
