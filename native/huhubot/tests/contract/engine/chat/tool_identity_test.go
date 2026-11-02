package chat_test

import (
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestStreamToolIdentityChangesCannotReachBroker(t *testing.T) {
	for _, mode := range []string{"changed_id", "changed_name", "negative_index", "gap_index", "unknown_type"} {
		t.Run(mode, func(t *testing.T) {
			var requests atomic.Int32
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				requests.Add(1)
				w.Header().Set("Content-Type", "text/event-stream")
				first := noteCall(0, "original-call", "resource:one", "body")
				switch mode {
				case "negative_index":
					first["index"] = -1
				case "gap_index":
					first["index"] = 7
				case "unknown_type":
					first["type"] = "not-function"
				}
				callDelta(w, first)
				switch mode {
				case "changed_id":
					callDelta(w, map[string]any{"index": 0, "id": "SECRET_CHANGED_ID", "function": map[string]any{"arguments": ""}})
				case "changed_name":
					callDelta(w, map[string]any{"index": 0, "function": map[string]any{"name": "SECRET_CHANGED_NAME", "arguments": ""}})
				}
				finishTools(w)
			}))
			t.Cleanup(server.Close)
			writer := &noteWriter{}
			f := newFixtureWith(t, server.URL+"/v1", bootstrap.Options{NoteWriter: writer}, []string{"note.write"})
			run := f.terminal(t, f.start(t).RunID)
			var effects int
			if err := fixtureDB(t, f).QueryRow("SELECT count(*) FROM execution_effects WHERE run_id=?", run.ID).Scan(&effects); err != nil {
				t.Fatal(err)
			}
			if run.Status != "failed" || effects != 0 || writer.calls.Load() != 0 || requests.Load() != 1 {
				t.Fatal(run, effects, writer.calls.Load(), requests.Load())
			}
			if run.Reason != "MODEL_STREAM_INVALID" && run.Reason != "TOOL_CALL_ID_INVALID" {
				t.Fatal("raw SDK identity error leaked", run.Reason)
			}
		})
	}
}
