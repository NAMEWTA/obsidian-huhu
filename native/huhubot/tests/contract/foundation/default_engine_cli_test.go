package foundation_test

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// This exercises the actual command, bootstrap.Open, production Engine and
// private Profile-bound resolver. Only the remote HTTP service is synthetic.
func TestDefaultCLIEngineUsesPrivateCredentialAndPersistsActualAttempt(t *testing.T) {
	testDefaultProtocolCLI(t, "openai-chat-completions")
}

func testDefaultProtocolCLI(t *testing.T, protocol string) {
	t.Helper()
	if runtime.GOOS != "linux" && runtime.GOOS != "darwin" {
		t.Skip("this fixture uses the production Unix inherited private pipes; Windows CRT acceptance is separate")
	}
	const key = "synthetic-private-loopback-key"
	const persona = `literal persona {"json":{"braces":"原样"}}`
	const answer = "DEFAULT_ENGINE_LOOPBACK_OK"
	const ref = "credential:11111111111111111111111111111111"
	postPath := "/v1/chat/completions"
	if protocol == "openai-responses" {
		postPath = "/v1/responses"
	}
	var mu sync.Mutex
	requests, probes := 0, 0
	var observed []map[string]any
	var endpointErrors []string
	endpoint := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		if r.Header.Get("Authorization") != "Bearer "+key {
			endpointErrors = append(endpointErrors, "private credential was not used")
		}
		if r.Method == http.MethodGet && r.URL.Path == "/v1/models/fixture-model" {
			probes++
			w.Header().Set("Content-Type", "application/json")
			_, _ = io.WriteString(w, `{"id":"fixture-model","object":"model","owned_by":"synthetic"}`)
			return
		}
		requests++
		if r.Method != http.MethodPost || r.URL.Path != postPath {
			endpointErrors = append(endpointErrors, "unexpected provider destination")
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		body, e := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		var request map[string]any
		if e != nil || json.Unmarshal(body, &request) != nil {
			endpointErrors = append(endpointErrors, "invalid provider request")
		} else {
			observed = append(observed, request)
		}
		if bytes.Contains(body, []byte(key)) {
			endpointErrors = append(endpointErrors, "credential appeared in the model body")
		}
		w.Header().Set("Content-Type", "text/event-stream")
		if protocol == "openai-responses" {
			writeDefaultResponsesText(w, answer)
			return
		}
		for _, chunk := range []string{
			`{"id":"synthetic","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"role":"assistant","content":"` + answer + `"},"finish_reason":null}]}`,
			`{"id":"synthetic","object":"chat.completion.chunk","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}`,
			`{"id":"synthetic","object":"chat.completion.chunk","choices":[],"usage":{"prompt_tokens":10,"completion_tokens":2,"total_tokens":12}}`,
		} {
			_, _ = fmt.Fprintf(w, "data: %s\n\n", chunk)
		}
		_, _ = io.WriteString(w, "data: [DONE]\n\n")
	}))
	t.Cleanup(endpoint.Close)
	dir := t.TempDir()
	binaryPath := filepath.Join(dir, "huhubot")
	build := exec.Command("go", "build", "-mod=readonly", "-o", binaryPath, "./cmd/huhubot")
	build.Dir = "../../.."
	build.Env = append(os.Environ(), "CGO_ENABLED=0")
	if output, e := build.CombinedOutput(); e != nil {
		t.Fatalf("default CLI build: %v %s", e, output)
	}
	state, home := filepath.Join(dir, "state"), filepath.Join(dir, "home")
	locator := filepath.Join(state, "huhu", "huhubot", "profiles", "default-engine")
	if runtime.GOOS == "darwin" {
		locator = filepath.Join(home, "Library", "Application Support", "HUHU", "huhubot", "profiles", "default-engine")
	}
	privateRead, privateSend, e := os.Pipe()
	if e != nil {
		t.Fatal(e)
	}
	privateReceive, privateWrite, e := os.Pipe()
	if e != nil {
		_ = privateRead.Close()
		_ = privateSend.Close()
		t.Fatal(e)
	}
	t.Cleanup(func() {
		_ = privateRead.Close()
		_ = privateSend.Close()
		_ = privateReceive.Close()
		_ = privateWrite.Close()
	})
	bounded, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	t.Cleanup(cancel)
	cmd := exec.CommandContext(bounded, binaryPath, "--stdio", "--managed", "--profile", locator, "--credential-channel=stdio-v1")
	cmd.Env = append(os.Environ(), "XDG_STATE_HOME="+state, "HOME="+home, "OPENAI_API_KEY=ambient-key-must-not-be-used", "OPENAI_BASE_URL=http://127.0.0.1:1/forbidden", "OPENAI_MODEL=ambient-model-must-not-be-used")
	cmd.ExtraFiles = []*os.File{privateRead, privateWrite}
	stdin, e := cmd.StdinPipe()
	if e != nil {
		t.Fatal(e)
	}
	stdout, e := cmd.StdoutPipe()
	if e != nil {
		t.Fatal(e)
	}
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if e = cmd.Start(); e != nil {
		t.Fatal(e)
	}
	var once sync.Once
	var waitErr error
	wait := func() error { once.Do(func() { waitErr = cmd.Wait() }); return waitErr }
	t.Cleanup(func() {
		if t.Failed() {
			t.Logf("default CLI wait=%v stderr=%s", wait(), stderr.String())
		}
	})
	// Register before any RPC assertion. Every fatal path closes all pipes,
	// cancels the actual process and performs precisely the same real Wait.
	t.Cleanup(func() {
		_ = stdin.Close()
		_ = privateSend.Close()
		_ = privateReceive.Close()
		_ = privateRead.Close()
		_ = privateWrite.Close()
		cancel()
		_ = wait()
	})
	_ = privateRead.Close()
	_ = privateWrite.Close()
	_ = privateSend.SetWriteDeadline(time.Now().Add(10 * time.Second))
	_ = privateReceive.SetReadDeadline(time.Now().Add(10 * time.Second))
	h := hello(t, struct {
		io.Reader
		io.Writer
	}{stdout, stdin})
	privateSequence := 0
	private := func(op byte, secret []byte) {
		t.Helper()
		privateSequence++
		metadata := map[string]string{"requestId": fmt.Sprintf("request:%032x", privateSequence), "profileId": h.Profile.ProfileID}
		if op == 1 {
			metadata["credentialRef"], metadata["storagePreference"] = ref, "session-memory"
		}
		encoded, e := json.Marshal(metadata)
		if e != nil {
			t.Fatal(e)
		}
		frame := make([]byte, 8+len(encoded)+len(secret))
		binary.BigEndian.PutUint32(frame, uint32(len(frame)-4))
		frame[4], frame[5] = 1, op
		binary.BigEndian.PutUint16(frame[6:], uint16(len(encoded)))
		copy(frame[8:], encoded)
		copy(frame[8+len(encoded):], secret)
		if _, e = privateSend.Write(frame); e != nil {
			t.Fatal(e)
		}
		clear(frame)
		var header [4]byte
		if _, e = io.ReadFull(privateReceive, header[:]); e != nil {
			t.Fatal(e)
		}
		size := binary.BigEndian.Uint32(header[:])
		if size == 0 || size > 2048 {
			t.Fatal("invalid private receipt size")
		}
		data := make([]byte, size)
		if _, e = io.ReadFull(privateReceive, data); e != nil {
			t.Fatal(e)
		}
		var receipt struct{ State, ProfileID string }
		if json.Unmarshal(data, &receipt) != nil || receipt.State != "available" || receipt.ProfileID != h.Profile.ProfileID || bytes.Contains(data, []byte(key)) {
			t.Fatal("private registration did not return a safe matching receipt")
		}
	}
	private(0, nil)
	private(1, []byte(key))
	sequence := 0
	rpc := func(method string, params, out any) {
		t.Helper()
		sequence++
		id := fmt.Sprintf("c:engine-%d", sequence)
		send(t, stdin, request(id, method, params))
		es := receive(t, stdout)
		if len(es) != 1 || es[0].ID == nil || *es[0].ID != id || es[0].Error != nil {
			t.Fatalf("default CLI RPC %s rejected: %#v", method, es)
		}
		if out != nil && json.Unmarshal(es[0].Result, out) != nil {
			t.Fatal("invalid default CLI result", method)
		}
	}
	meta := func(id, revision string) api.CommandMeta {
		return api.CommandMeta{ProfileID: h.Profile.ProfileID, CommandEpoch: h.Profile.CommandEpoch, CommandID: id, IdempotencyKey: id, ExpectedRevision: revision}
	}
	var budget api.BudgetSettings
	rpc("collaboration.budget", api.BudgetQuery{ProfileID: h.Profile.ProfileID}, &budget)
	rpc("collaboration.configureBudget", api.BudgetConfigure{CommandMeta: meta("cli-budget", budget.Revision), Policy: api.BudgetPolicy{RootTokenLimit: "100000", ProfileTokenLimit: "1000000", MaintenanceTokenLimit: "0"}}, &budget)
	model := api.ModelBindingDraft{Protocol: protocol, Endpoint: endpoint.URL + "/v1", ProviderID: "synthetic-loopback", ModelID: "fixture-model", CredentialRef: ref, Capabilities: []string{}}
	var tested api.ModelTestResult
	rpc("models.test", api.ModelTest{ProfileID: h.Profile.ProfileID, Model: model}, &tested)
	if !tested.Available || len(tested.Capabilities) != 0 {
		t.Fatal("metadata probe fabricated model capabilities", tested.Available, tested.Capabilities)
	}
	var agent api.Agent
	rpc("agents.create", api.AgentCreate{CommandMeta: meta("cli-agent", ""), Draft: api.AgentDraft{Name: "default engine", Persona: persona, Model: &model}}, &agent)
	var session api.Session
	rpc("sessions.create", api.SessionCreate{CommandMeta: meta("cli-session", ""), Kind: "direct", MemberIDs: []string{agent.ID}}, &session)
	var accepted api.RunReceipt
	rpc("runs.start", api.RunStart{CommandMeta: meta("cli-run", session.Revision), SessionID: session.ID, Intent: "synthetic default engine intent", SourceRefs: []api.SourceSnapshot{}}, &accepted)
	var run api.Run
	for {
		rpc("runs.get", api.IDQuery{ProfileID: h.Profile.ProfileID, ID: accepted.RunID}, &run)
		if run.Status == "succeeded" || run.Status == "failed" || run.Status == "canceled" {
			break
		}
		select {
		case <-bounded.Done():
			t.Fatal("default production engine did not terminalize")
		case <-time.After(10 * time.Millisecond):
		}
	}
	if run.Status != "succeeded" || run.Usage == nil || run.Usage.Knowledge != "known" || run.Usage.InputTokens != "10" || run.Usage.OutputTokens != "2" {
		t.Fatal("default production engine/ledger not reached", run.Status, run.Reason, run.Usage)
	}
	var history api.MessagePage
	rpc("sessions.history", api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: h.Profile.ProfileID}, SessionID: session.ID}, &history)
	if len(history.Items) != 2 || history.Items[1].Text != answer {
		t.Fatal("default production output was not durably published")
	}
	rpc("service.shutdown", nil, nil)
	if e = wait(); e != nil {
		t.Fatal("default CLI did not stop and Wait", e)
	}
	if stderr.Len() != 0 || strings.Contains(stderr.String(), key) {
		t.Fatal("normal CLI emitted diagnostics or private data")
	}
	mu.Lock()
	defer mu.Unlock()
	if requests != 1 || probes != 1 || len(endpointErrors) != 0 || len(observed) != 1 {
		t.Fatal("wrong actual HTTP lifecycle", requests, probes, endpointErrors)
	}
	personaCount, intentCount := 0, 0
	messageField := "messages"
	if protocol == "openai-responses" {
		messageField = "input"
	}
	messages, ok := observed[0][messageField].([]any)
	if !ok {
		t.Fatal("missing actual model messages")
	}
	for _, item := range messages {
		message, ok := item.(map[string]any)
		if !ok {
			t.Fatal("invalid actual model message")
		}
		if message["role"] == "system" && message["content"] == persona {
			personaCount++
		}
		if message["content"] == "synthetic default engine intent" {
			intentCount++
		}
	}
	if personaCount != 1 || intentCount != 1 || observed[0]["model"] != "fixture-model" {
		t.Fatal("production engine lost pinned model/Persona input")
	}
	if protocol == "openai-responses" {
		if observed[0]["max_output_tokens"] != float64(4096) || observed[0]["store"] != false || observed[0]["background"] != false || observed[0]["truncation"] != "disabled" {
			t.Fatal("Responses request did not remain explicit and stateless", observed[0])
		}
		for _, field := range []string{"previous_response_id", "conversation", "n"} {
			if _, exists := observed[0][field]; exists {
				t.Fatal("Responses request used hidden history or Chat semantics", field)
			}
		}
	} else if observed[0]["n"] != float64(1) || observed[0]["max_completion_tokens"] != float64(4096) {
		t.Fatal("Chat request lost its original output bound/n1")
	}
	db, e := sql.Open("sqlite3", filepath.Join(locator, "profile.sqlite3"))
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	var attempts, settled int
	if e = db.QueryRow("SELECT count(*),COALESCE(sum(CASE WHEN state='settled' AND producer_ended=1 AND knowledge='known' THEN 1 ELSE 0 END),0) FROM model_attempts WHERE run_id=?", accepted.RunID).Scan(&attempts, &settled); e != nil || attempts != 1 || settled != 1 {
		t.Fatal("default CLI actual HTTP was not settled once", attempts, settled, e)
	}
	t.Logf("%s: real cmd/default bootstrap + private pipes + metadata GET + one model HTTP + persistent known attempt + process Wait", protocol)
}
