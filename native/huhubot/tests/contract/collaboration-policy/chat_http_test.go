package collaborationpolicy_test

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// Each run has a fresh Session/WorkThread and therefore a distinct sealed
// context binding. Compare the actual serialized request after verifying and
// removing only those per-run identities; the byte length remains the estimate.
func budgetRequestControl(raw []byte) ([]byte, error) {
	var request map[string]any
	if err := json.Unmarshal(raw, &request); err != nil {
		return nil, err
	}
	messages, ok := request["messages"].([]any)
	if !ok {
		return nil, fmt.Errorf("missing serialized messages")
	}
	contexts := 0
	for _, value := range messages {
		message, ok := value.(map[string]any)
		if !ok {
			return nil, fmt.Errorf("invalid serialized message")
		}
		content, ok := message["content"].(string)
		if !ok || !strings.HasPrefix(content, api.ShortTermMarker) {
			continue
		}
		contexts++
		var sealed api.ShortTermInput
		if err := json.Unmarshal([]byte(strings.TrimPrefix(content, api.ShortTermMarker)), &sealed); err != nil {
			return nil, err
		}
		digest, err := api.CanonicalShortTermBinding(sealed)
		if err != nil || digest != sealed.BindingDigest || sealed.Version != "1" || sealed.Namespace.SubjectKind != "agent" || sealed.Namespace.SessionID == "" || sealed.Namespace.WorkThreadID == "" || len(sealed.Entries) != 0 {
			return nil, fmt.Errorf("invalid isolated sealed context: %#v %v", sealed, err)
		}
		sealed.Namespace.SessionID = ""
		sealed.Namespace.WorkThreadID = ""
		sealed.BindingDigest = ""
		stable, err := json.Marshal(sealed)
		if err != nil {
			return nil, err
		}
		message["content"] = api.ShortTermMarker + string(stable)
	}
	if contexts != 1 {
		return nil, fmt.Errorf("expected one real short-term context, got %d", contexts)
	}
	return json.Marshal(request)
}

func TestDefaultChatConsumesPublicBudgetAndOnlyOneLastAllowanceOverHTTP(t *testing.T) {
	var requests atomic.Int32
	requestsBody := make(chan []byte, 4)
	entered, release := make(chan struct{}), make(chan struct{})
	var releaseOnce sync.Once
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := requests.Add(1)
		body, e := io.ReadAll(r.Body)
		if e != nil {
			t.Error(e)
		}
		if r.Method != http.MethodPost || r.URL.RequestURI() != "/v1/chat/completions" || r.Header.Get("Authorization") != "Bearer POLICY_HTTP_FAKE_KEY" {
			t.Error("explicit Chat HTTP destination/credential changed")
		}
		select {
		case requestsBody <- body:
		default:
			t.Error("unexpected Chat request overflow")
		}
		if n == 2 {
			close(entered)
			select {
			case <-release:
			case <-r.Context().Done():
				return
			}
		}
		w.Header().Set("Content-Type", "text/event-stream")
		fmt.Fprint(w, "data: {\"id\":\"policy\",\"choices\":[{\"index\":0,\"delta\":{\"role\":\"assistant\",\"content\":\"budgeted answer\"},\"finish_reason\":null}]}\n\n")
		fmt.Fprint(w, "data: {\"id\":\"policy\",\"choices\":[{\"index\":0,\"delta\":{},\"finish_reason\":\"stop\"}]}\n\n")
		if n == 1 {
			fmt.Fprint(w, "data: {\"choices\":[],\"usage\":{\"prompt_tokens\":9,\"completion_tokens\":4,\"total_tokens\":13}}\n\n")
		}
		fmt.Fprint(w, "data: [DONE]\n\n")
	}))
	t.Cleanup(server.Close)
	c, _, locator := open(t, nil)
	t.Cleanup(func() { releaseOnce.Do(func() { close(release) }) })
	profile := meta(t, c, "profile", "").ProfileID
	ref := "credential:44444444444444444444444444444444"
	if _, e := c.Credentials.Register(ctx, profile, ref, "session-memory", []byte("POLICY_HTTP_FAKE_KEY")); e != nil {
		t.Fatal(e)
	}
	a, e := c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta(t, c, "http-agent", ""), Draft: api.AgentDraft{Name: "actual budget HTTP", Persona: "Keep literal 中文 and quotes: {\"a\":1}", Model: &api.ModelBindingDraft{Protocol: "openai-chat-completions", ProviderID: "loopback", ModelID: "policy-model", Endpoint: server.URL + "/v1", CredentialRef: ref}}})
	if e != nil {
		t.Fatal(e)
	}
	db, e := sql.Open("sqlite3", filepath.Join(locator, "profile.sqlite3"))
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { db.Close() })
	intent := "same explicit request 😀"
	unconfigured := wait(t, c, run(t, c, a, intent).RunID, "failed")
	if unconfigured.Reason != "BUDGET_NOT_CONFIGURED" || requests.Load() != 0 {
		t.Fatalf("unconfigured real consumer: %#v; HTTP=%d", unconfigured, requests.Load())
	}
	var attempts int
	if e = db.QueryRow("SELECT count(*) FROM model_attempts WHERE run_id=?", unconfigured.ID).Scan(&attempts); e != nil || attempts != 0 {
		t.Fatal("unconfigured request reserved an attempt", attempts, e)
	}
	configure(t, c, api.BudgetPolicy{RootTokenLimit: "100000", ProfileTokenLimit: "100000", MaintenanceTokenLimit: "0"})
	known := wait(t, c, run(t, c, a, intent).RunID, "succeeded")
	if known.Usage == nil || known.Usage.Knowledge != "known" || known.Usage.InputTokens != "9" || known.Usage.OutputTokens != "4" || requests.Load() != 1 {
		t.Fatalf("complete usage over real HTTP: %#v; HTTP=%d", known, requests.Load())
	}
	wire := <-requestsBody
	var body struct {
		MaxCompletionTokens int `json:"max_completion_tokens"`
		N                   int `json:"n"`
	}
	if e = json.Unmarshal(wire, &body); e != nil || body.MaxCompletionTokens != 4096 || body.N != 1 || !bytes.Contains(wire, []byte("中文")) {
		t.Fatalf("bounded actual wire request: %s %v", wire, e)
	}
	var amount, charged int64
	if e = db.QueryRow("SELECT reserved_tokens,charged_tokens FROM model_attempts WHERE run_id=? AND state='settled' AND producer_ended=1", known.ID).Scan(&amount, &charged); e != nil || amount != int64(len(wire)+4096) || charged != 13 {
		t.Fatalf("reserve must use complete serialized UTF8 request bytes: amount=%d bytes=%d charged=%d err=%v", amount, len(wire), charged, e)
	}
	// Keep the winning HTTP producer alive so its reservation remains charged
	// against the Profile while the second real root competes for the remainder.
	configure(t, c, api.BudgetPolicy{RootTokenLimit: "100000", ProfileTokenLimit: strconv.FormatInt(13+amount, 10), MaintenanceTokenLimit: "0"})
	one, two := run(t, c, a, intent), run(t, c, a, intent)
	select {
	case <-entered:
	case <-time.After(5 * time.Second):
		t.Fatal("last allowance never reached HTTP")
	}
	var winner, loser api.Run
	deadline := time.Now().Add(5 * time.Second)
	for loser.ID == "" {
		for _, id := range []string{one.RunID, two.RunID} {
			r, getErr := c.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: profile, ID: id})
			if getErr != nil {
				t.Fatal(getErr)
			}
			if r.Status == "failed" {
				loser = r
			}
		}
		if loser.ID != "" {
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("competing root was not rejected while the actual HTTP producer held the only reservation")
		}
		time.Sleep(5 * time.Millisecond)
	}
	if loser.Reason != "MODEL_BUDGET_EXHAUSTED" || requests.Load() != 2 {
		t.Fatalf("last allowance was double-spent: %#v; HTTP=%d", loser, requests.Load())
	}
	if e = db.QueryRow("SELECT count(*) FROM model_attempts WHERE run_id=?", loser.ID).Scan(&attempts); e != nil || attempts != 0 {
		t.Fatal("losing root left a reservation", attempts, e)
	}
	releaseOnce.Do(func() { close(release) })
	winnerID := one.RunID
	if winnerID == loser.ID {
		winnerID = two.RunID
	}
	winner = wait(t, c, winnerID, "succeeded")
	if winner.Usage == nil || winner.Usage.Knowledge != "unknown" || !winner.Usage.Estimated {
		t.Fatal("missing real HTTP usage became zero/known", winner.Usage)
	}
	if actual := <-requestsBody; len(actual) != len(wire) {
		t.Fatalf("last allowance used different serialized byte estimate: %d != %d", len(actual), len(wire))
	} else {
		first, firstErr := budgetRequestControl(wire)
		second, secondErr := budgetRequestControl(actual)
		if firstErr != nil || secondErr != nil || !bytes.Equal(first, second) {
			t.Fatalf("last allowance changed request semantics after fresh context binding: %v %v", firstErr, secondErr)
		}
	}
	var reserved int64
	if e = db.QueryRow("SELECT reserved_tokens,charged_tokens FROM model_budget_accounts WHERE account_id=?", "profile:"+profile).Scan(&reserved, &charged); e != nil || reserved != 0 || charged != 13+amount {
		t.Fatalf("unknown actual HTTP must charge its full reservation: reserved=%d charged=%d want=%d err=%v", reserved, charged, 13+amount, e)
	}
	rootBudget, e := c.API.Collaboration.Budget(ctx, owner, api.BudgetQuery{ProfileID: profile, RunID: winner.ID})
	if e != nil || rootBudget.Knowledge != "unknown" || rootBudget.ChargedTokens != strconv.FormatInt(amount, 10) || rootBudget.ReservedTokens != "0" {
		t.Fatalf("public root budget lost actual unknown observation: %#v %v", rootBudget, e)
	}
}
