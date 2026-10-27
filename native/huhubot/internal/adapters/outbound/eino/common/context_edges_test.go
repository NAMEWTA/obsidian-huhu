package common_test

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	chatdriver "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/chat"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

func TestBoundContextKeepsFullDelegationAndDecodedMemoryLimit(t *testing.T) {
	var resolutions atomic.Int32
	captured := make(chan map[string]any, 1)
	const answer = `{"items":[{"operation":"create","text":"ordinary answer","provenance":"observation"}]}`
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Error(err)
		}
		captured <- body
		writeContextText(w, answer, true)
	}))
	t.Cleanup(server.Close)
	in := directContextInput(server.URL+"/v1", &contextAttempts{})
	in.Intent = strings.Repeat("I", 128<<10)
	in = sealedContextInput(t, in)
	in.Lineage.DelegationID = "delegation:context"
	in.Delegation = &api.DelegationInput{DelegationID: in.Lineage.DelegationID, Task: in.Intent, Constraints: make([]string, 32), ExpectedOutput: strings.Repeat("E", 8192)}
	for i := range in.Delegation.Constraints {
		in.Delegation.Constraints[i] = strings.Repeat("C", 2048)
	}
	if !api.ValidDelegationInput(*in.Delegation) {
		t.Fatal("full materialized delegation fixture invalid")
	}
	// The memory input limit counts decoded UTF-8, independently of rendering
	// and the selected original reference hash. This is exactly 128 KiB.
	in.Memory.Entries[0].Text = strings.Repeat("汉", 43690) + "xx"
	in.Memory.Entries[0].Ref.Hash = inputHash(in.Memory.Entries[0].Text)
	if len(in.Memory.Entries[0].Text) != 131072 {
		t.Fatal("incorrect input boundary")
	}
	rebindContext(t, &in)
	result, err := contextEngine(t, &resolutions).Run(context.Background(), in, nil)
	if err != nil || result.Status != "finished" || result.Text != answer || result.MemoryCandidates != nil {
		t.Fatal("ordinary text was reinterpreted as maintenance or full input truncated", result.Status, result.Reason, err)
	}
	msgs := (<-captured)["messages"].([]any)
	if len(msgs) != 6 || !strings.HasPrefix(msgs[2].(map[string]any)["content"].(string), "Accepted task requirements (data):\n") || !strings.HasPrefix(msgs[3].(map[string]any)["content"].(string), api.ShortTermMarker) || msgs[5].(map[string]any)["content"] != in.Intent {
		t.Fatal("full delegation or new context ordering changed", len(msgs))
	}
	var requirements struct {
		Constraints    []string `json:"constraints"`
		ExpectedOutput string   `json:"expectedOutput"`
	}
	data := strings.TrimPrefix(msgs[2].(map[string]any)["content"].(string), "Accepted task requirements (data):\n")
	if json.Unmarshal([]byte(data), &requirements) != nil || len(requirements.Constraints) != 32 || len(requirements.Constraints[31]) != 2048 || requirements.ExpectedOutput != in.Delegation.ExpectedOutput {
		t.Fatal("accepted requirements were truncated")
	}
}

type heldContextBody struct {
	io.ReadCloser
	read, closing chan struct{}
	release       chan struct{}
	readOnce      sync.Once
	closeOnce     sync.Once
}

func (b *heldContextBody) Read(p []byte) (int, error) {
	n, err := b.ReadCloser.Read(p)
	if n > 0 {
		b.readOnce.Do(func() { close(b.read) })
	}
	return n, err
}
func (b *heldContextBody) Close() error {
	b.closeOnce.Do(func() { close(b.closing) })
	<-b.release
	return b.ReadCloser.Close()
}

func TestMaintenanceCancelKeepsPrivateTextAndActualProducerJoin(t *testing.T) {
	var resolutions, deltas atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		writeContextText(w, `{"items":[{"text":"PRIVATE_BEFORE_CANCEL`, false)
		w.(http.Flusher).Flush()
		<-r.Context().Done()
	}))
	t.Cleanup(server.Close)
	body := &heldContextBody{read: make(chan struct{}), closing: make(chan struct{}), release: make(chan struct{})}
	var releaseOnce sync.Once
	release := func() { releaseOnce.Do(func() { close(body.release) }) }
	t.Cleanup(release)
	driver := chatdriver.NewDriverWithTransport(contextTransport(func(r *http.Request) (*http.Response, error) {
		response, err := http.DefaultTransport.RoundTrip(r)
		if err == nil {
			body.ReadCloser = response.Body
			response.Body = body
		}
		return response, err
	}))
	e := contextEngineWithDriver(t, driver, &resolutions)
	t.Cleanup(release) // release before the Engine's actual cleanup wait
	attempts := &contextAttempts{}
	in := maintenanceInput(t, directContextInput(server.URL+"/v1", attempts))
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	type outcome struct {
		result api.EngineResult
		err    error
	}
	ended := make(chan outcome, 1)
	go func() {
		result, err := e.Run(ctx, in, func(api.EngineEvent) error { deltas.Add(1); return nil })
		ended <- outcome{result, err}
	}()
	select {
	case <-body.read:
	case <-time.After(5 * time.Second):
		t.Fatal("SDK did not read the actual private provider bytes")
	}
	cancel()
	select {
	case <-body.closing:
	case <-time.After(5 * time.Second):
		t.Fatal("actual provider body Close was not reached")
	}
	e.Stop()
	select {
	case <-e.Done():
		t.Fatal("maintenance treated consumer cancellation as real producer join")
	case <-time.After(20 * time.Millisecond):
	}
	attempts.mu.Lock()
	settled := len(attempts.observations)
	attempts.mu.Unlock()
	if settled != 0 || deltas.Load() != 0 {
		t.Fatal("private output or accounting crossed held body Close", settled, deltas.Load())
	}
	release()
	select {
	case out := <-ended:
		if out.result.Text != "" || out.result.Partial || out.result.MemoryCandidates != nil || out.result.Status != "failed" || deltas.Load() != 0 {
			t.Fatal("canceled private buffer leaked", out.result, out.err, deltas.Load())
		}
	case <-time.After(5 * time.Second):
		t.Fatal("Engine did not actually finish after producer release")
	}
	select {
	case <-e.Done():
	case <-time.After(5 * time.Second):
		t.Fatal("Engine did not join real producer/settlement")
	}
	attempts.mu.Lock()
	defer attempts.mu.Unlock()
	if len(attempts.observations) != 1 || !attempts.observations[0].ProducerEnded || attempts.observations[0].Knowledge != "unknown" {
		t.Fatal("cancel changed actual unknown usage responsibility", attempts.observations)
	}
}

func TestMaintenanceTargetsAreFrozenWithAdvertisedBinding(t *testing.T) {
	var resolutions atomic.Int32
	requested, respond := make(chan struct{}), make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.Copy(io.Discard, r.Body)
		close(requested)
		<-respond
		writeContextText(w, `{"items":[{"operation":"correct","targetItemId":"item:unadvertised","text":"unsafe late target","provenance":"inference"}]}`, true)
	}))
	t.Cleanup(server.Close)
	var releaseOnce sync.Once
	release := func() { releaseOnce.Do(func() { close(respond) }) }
	t.Cleanup(release)
	in := maintenanceInput(t, directContextInput(server.URL+"/v1", &contextAttempts{}))
	e := contextEngine(t, &resolutions)
	t.Cleanup(release)
	ended := make(chan api.EngineResult, 1)
	go func() { result, _ := e.Run(context.Background(), in, nil); ended <- result }()
	select {
	case <-requested:
	case <-time.After(5 * time.Second):
		t.Fatal("SDK did not advertise the original targets")
	}
	// Input DTO ownership stays with the caller. A later slice mutation must
	// never change which targets the validated, advertised turn can correct.
	in.Memory.Targets[0].ItemID = "item:unadvertised"
	release()
	select {
	case result := <-ended:
		if result.Status != "failed" || result.Reason != "MEMORY_CANDIDATE_INVALID" || result.MemoryCandidates != nil || result.Text != "" {
			t.Fatal("late caller slice changed the turn's target authority", result)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("target snapshot test did not complete")
	}
}
