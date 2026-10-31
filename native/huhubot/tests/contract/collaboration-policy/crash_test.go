package collaborationpolicy_test

import (
	"context"
	"database/sql"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestAttemptCrashChild(t *testing.T) {
	phase := os.Getenv("HUHU_ATTEMPT_TEST_PHASE")
	if phase == "" {
		return
	}
	root := os.Getenv("HUHU_ATTEMPT_TEST_ROOT")
	locator := filepath.Join(root, "one")
	eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
		r, e := i.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "request", Purpose: "main", InputEstimate: "2", OutputBound: "8"})
		if e != nil {
			os.Exit(80)
		}
		if phase == "dispatch" {
			if e = i.Attempts.Dispatch(c, r, func(context.Context) error { return os.WriteFile(filepath.Join(root, "callback"), []byte("one"), 0600) }); e != nil {
				os.Exit(81)
			}
			os.Exit(72)
		}
		os.Exit(71)
		return api.EngineResult{}, nil
	})
	c, e := bootstrap.OpenWithOptions(ctx, root, locator, bootstrap.Options{Engine: eng})
	if e != nil {
		t.Fatal(e)
	}
	a := agent(t, c)
	configure(t, c, api.BudgetPolicy{RootTokenLimit: "10", ProfileTokenLimit: "10", MaintenanceTokenLimit: "0"})
	run(t, c, a, "crash")
	select {
	case <-time.After(5 * time.Second):
		t.Fatal("child never reached persisted attempt")
	}
}

func TestRealProcessCrashReconcilesUnsentAndDispatchedAttemptsWithoutModelReplay(t *testing.T) {
	for _, phase := range []string{"reserve", "dispatch"} {
		t.Run(phase, func(t *testing.T) {
			root := filepath.Join(t.TempDir(), "profiles")
			if e := os.Mkdir(root, 0700); e != nil {
				t.Fatal(e)
			}
			cmd := exec.Command(os.Args[0], "-test.run=^TestAttemptCrashChild$", "-test.count=1")
			cmd.Env = append(os.Environ(), "HUHU_ATTEMPT_TEST_PHASE="+phase, "HUHU_ATTEMPT_TEST_ROOT="+root)
			out, e := cmd.CombinedOutput()
			exit := 71
			if phase == "dispatch" {
				exit = 72
			}
			if x, ok := e.(*exec.ExitError); !ok || x.ExitCode() != exit {
				t.Fatalf("child exit %v: %s", e, out)
			}
			// CombinedOutput has Waited. The original runtime owns Profile lock/recovery.
			c, e := bootstrap.OpenWithOptions(ctx, root, filepath.Join(root, "one"), bootstrap.Options{ExecutorPaused: true})
			if e != nil {
				t.Fatal(e)
			}
			defer c.Close()
			d, e := sql.Open("sqlite3", filepath.Join(root, "one", "profile.sqlite3"))
			if e != nil {
				t.Fatal(e)
			}
			defer d.Close()
			var state, knowledge, runID, status string
			var charged, reserved int
			if e = d.QueryRow("SELECT a.state,a.knowledge,a.run_id,r.status FROM model_attempts a JOIN execution_runs r ON r.run_id=a.run_id").Scan(&state, &knowledge, &runID, &status); e != nil {
				t.Fatal(e)
			}
			if e = d.QueryRow("SELECT charged_tokens,reserved_tokens FROM model_budget_accounts WHERE purpose='profile'").Scan(&charged, &reserved); e != nil {
				t.Fatal(e)
			}
			expectedState, expectedCharge := "aborted", 0
			if phase == "dispatch" {
				expectedState = "settled"
				expectedCharge = 10
				if knowledge != "unknown" {
					t.Fatal("dispatched crash became known zero")
				}
			}
			if state != expectedState || charged != expectedCharge || reserved != 0 || status != "interrupted" {
				t.Fatalf("crash ledger %s/%s %d/%d Run=%s", state, knowledge, charged, reserved, status)
			}
			_, statErr := os.Stat(filepath.Join(root, "callback"))
			if phase == "dispatch" && statErr != nil || phase == "reserve" && !os.IsNotExist(statErr) {
				t.Fatal("unexpected actual callback")
			}
			b, e := c.API.Collaboration.Budget(ctx, owner, api.BudgetQuery{ProfileID: meta(t, c, "q", "").ProfileID, RunID: runID})
			if e != nil || b.ChargedTokens != map[string]string{"reserve": "0", "dispatch": "10"}[phase] {
				t.Fatalf("public accounting %#v %v", b, e)
			}
		})
	}
}
