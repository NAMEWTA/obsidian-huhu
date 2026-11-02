package chat_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

func TestSettlementFailureRetainsDriverUntilActualSQLiteRetry(t *testing.T) {
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		textTurn(w, "unpublished answer", "stop", map[string]any{"prompt_tokens": 7, "completion_tokens": 2, "total_tokens": 9}, true)
	}))
	t.Cleanup(server.Close)
	f, engine, _ := capturedFixture(t, server.URL+"/v1", nil, nil)
	db := fixtureDB(t, f)
	if _, err := db.Exec("CREATE TRIGGER reject_settlement BEFORE UPDATE ON model_attempts WHEN NEW.state='settled' BEGIN SELECT RAISE(ABORT,'fixture settlement failure'); END"); err != nil {
		t.Fatal(err)
	}
	// Even a failed assertion must release the real database fault before the
	// fixture's Core/driver cleanup waits for its outstanding settlement.
	var input api.EngineInput
	var attempt string
	t.Cleanup(func() {
		if _, err := db.Exec("DROP TRIGGER IF EXISTS reject_settlement"); err != nil {
			t.Error(err)
		}
		if attempt != "" && input.Attempts != nil {
			ctx, cancel := context.WithTimeout(context.Background(), time.Second)
			defer cancel()
			if _, err := input.Attempts.Settle(ctx, api.AttemptReservation{ID: attempt}, api.AttemptObservation{Knowledge: "known", InputTokens: "7", OutputTokens: "2", ProducerEnded: true}); err != nil {
				t.Error("red-test emergency cleanup", err)
			}
		}
	})
	run := f.terminal(t, f.start(t).RunID)
	input = <-engine.inputs
	if err := db.QueryRow("SELECT attempt_id FROM model_attempts WHERE run_id=?", run.ID).Scan(&attempt); err != nil {
		t.Fatal(err)
	}
	if run.Status != "failed" || run.Reason != "MODEL_PRODUCER_UNSETTLED" || requests.Load() != 1 {
		t.Fatal(run, requests.Load())
	}
	var state string
	var producer, reserved, charged int
	if err := db.QueryRow("SELECT state,producer_ended,reserved_tokens,charged_tokens FROM model_attempts WHERE run_id=?", run.ID).Scan(&state, &producer, &reserved, &charged); err != nil {
		t.Fatal(err)
	}
	if state != "dispatched" || producer != 0 || reserved == 0 || charged != 0 {
		t.Fatal("failed SQL was reported settled", state, producer, reserved, charged)
	}
	engine.Stop()
	select {
	case <-engine.Done():
		t.Fatal("Driver.Done lost required local settlement retry")
	default:
	}
	if _, err := db.Exec("DROP TRIGGER reject_settlement"); err != nil {
		t.Fatal(err)
	}
	select {
	case <-engine.Done():
	case <-time.After(5 * time.Second):
		t.Fatal("recovered SQLite did not finish retained settlement")
	}
	if err := db.QueryRow("SELECT state,producer_ended,charged_tokens FROM model_attempts WHERE run_id=?", run.ID).Scan(&state, &producer, &charged); err != nil {
		t.Fatal(err)
	}
	if state != "settled" || producer != 1 || charged != 9 || requests.Load() != 1 {
		t.Fatal("retry was not same local observation", state, producer, charged, requests.Load())
	}
}
