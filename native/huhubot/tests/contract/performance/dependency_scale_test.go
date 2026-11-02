package performance_test

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	runtimeprofile "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

type scaleInput struct{ Direct, Effective, Recalled, Omitted int }
type scaleStage struct {
	Size                 int            `json:"size"`
	Stage                string         `json:"stage"`
	Runs                 int            `json:"runs"`
	DependencyRows       int            `json:"dependencyRows"`
	Relations            map[string]int `json:"relations"`
	DirectSelectedInputs int            `json:"directSelectedInputs"`
	EffectiveInputRefs   int            `json:"effectiveInputRefs"`
	OmittedAuthorized    int            `json:"omittedAuthorized"`
	WALBefore            int64          `json:"walBeforeBytes"`
	WALAfter             int64          `json:"walAfterBytes"`
	WALDelta             int64          `json:"walDeltaBytes"`
	WALPeak              int64          `json:"walPeakBytes"`
	HeapPeak             uint64         `json:"sampledHeapPeakBytes"`
	RSSPeak              int64          `json:"sampledRSSPeakBytes"`
	ElapsedMS            float64        `json:"elapsedMs"`
}

// The injected engine replaces only provider/model output. All admission,
// context sealing, delegation, completion, dependency writes and revocation
// below use production bootstrap and application APIs. SQL is read-only.
func TestDependencyScale(t *testing.T) {
	var results []scaleStage
	for _, size := range []int{50, 100, 200} {
		t.Run(fmt.Sprintf("runs-%d", size), func(t *testing.T) {
			ctx := context.Background()
			var mu sync.Mutex
			inputs := map[string]scaleInput{}
			workerID := ""
			engine := scaleEngine(func(ctx context.Context, in api.EngineInput) (api.EngineResult, error) {
				direct := map[string]bool{}
				add := func(r api.DerivedInput) { direct[r.Kind+"\x00"+r.ID+"\x00"+r.Revision] = true }
				metric := scaleInput{Effective: len(in.Lineage.Derived)}
				if in.ShortTerm != nil {
					for _, e := range in.ShortTerm.Entries {
						add(e.Ref)
					}
					metric.Omitted = in.ShortTerm.Usage.OmittedAuthorized
				}
				if in.Memory != nil {
					for _, e := range in.Memory.Entries {
						add(e.Ref)
						metric.Recalled++
					}
				}
				metric.Direct = len(direct)
				mu.Lock()
				inputs[in.RunID] = metric
				mu.Unlock()
				if strings.HasPrefix(in.Intent, "branch:") {
					for i := 0; i < 2; i++ {
						_, err := in.Tools.Invoke(ctx, api.ToolCall{ID: fmt.Sprintf("leaf-%d", i), Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: workerID}, Task: fmt.Sprintf("leaf-%d", i), Constraints: []string{}}})
						if err != nil {
							return api.EngineResult{}, err
						}
					}
				}
				return api.EngineResult{Status: "finished", Text: "Fictitious scale result."}, nil
			})
			f := newScaleFixture(t, engine, false)
			f.budget(api.BudgetPolicy{RootTokenLimit: "100000", ProfileTokenLimit: "10000000", MaintenanceTokenLimit: "0"})
			chain := f.agent("Scale chain", true)
			worker := f.agent("Scale worker", true)
			workerID = worker.ID
			parent, err := f.core.API.Assistant.Create(ctx, scaleOwner, api.AgentCreate{CommandMeta: f.next(""), Draft: api.AgentDraft{Name: "Scale parent", Persona: "Fictitious delegation", Model: &api.ModelBindingDraft{ModelID: chain.Model.ModelID, ProviderID: chain.Model.ProviderID, Protocol: chain.Model.Protocol, Endpoint: chain.Model.Endpoint, CredentialRef: chain.Model.CredentialRef}, AllowedTools: []string{"agents.delegate"}, AllowedCollaborationTargets: []string{worker.ID}}})
			if err != nil {
				t.Fatal(err)
			}
			shared := f.agent("Scale shared", true)
			multiple := f.agent("Scale multiple", true)
			sharedItem := f.add(scaleNamespace(shared), api.MemoryScope{Kind: "profile"}, "Fictitious shared source.")
			for i := 0; i < 3; i++ {
				f.add(scaleNamespace(multiple), api.MemoryScope{Kind: "profile"}, fmt.Sprintf("Fictitious distinct source %d.", i))
			}
			db := f.database()
			wal := filepath.Join(f.directory, runtimeprofile.DatabaseName) + "-wal"
			run := func(a api.Agent, s *api.Session, intent string) string {
				session := api.Session{}
				if s == nil {
					session = f.session(a)
				} else {
					session = *s
				}
				r := f.start(session, intent)
				f.wait(r.RunID, "succeeded")
				return r.RunID
			}
			stage := func(name string, expectedRuns int, action func()) {
				m := scaleStage{Size: size, Stage: name, Relations: map[string]int{}, WALBefore: scaleFileSize(wal)}
				start := time.Now()
				done := make(chan struct{})
				stopped := make(chan struct{})
				go func() {
					defer close(stopped)
					ticker := time.NewTicker(5 * time.Millisecond)
					defer ticker.Stop()
					for {
						var mem runtime.MemStats
						runtime.ReadMemStats(&mem)
						if mem.HeapAlloc > m.HeapPeak {
							m.HeapPeak = mem.HeapAlloc
						}
						if rss := scaleRSS(); rss > m.RSSPeak {
							m.RSSPeak = rss
						}
						if w := scaleFileSize(wal); w > m.WALPeak {
							m.WALPeak = w
						}
						select {
						case <-done:
							return
						case <-ticker.C:
						}
					}
				}()
				// Stop the observer on Fatal too; never leak a sampler into the next case.
				func() { defer func() { close(done); <-stopped }(); action() }()
				m.ElapsedMS = float64(time.Since(start).Microseconds()) / 1000
				m.WALAfter = scaleFileSize(wal)
				m.WALDelta = m.WALAfter - m.WALBefore
				m.Runs = scaleCount(t, db, "SELECT count(*) FROM execution_runs")
				if m.Runs != expectedRuns {
					t.Fatalf("%s runs=%d want=%d", name, m.Runs, expectedRuns)
				}
				m.DependencyRows = scaleCount(t, db, "SELECT count(*) FROM memory_dependencies")
				rows, e := db.Query("SELECT owner_kind || ':' || relation,count(*) FROM memory_dependencies GROUP BY owner_kind,relation")
				if e != nil {
					t.Fatal(e)
				}
				for rows.Next() {
					var key string
					var n int
					if e = rows.Scan(&key, &n); e != nil {
						t.Fatal(e)
					}
					m.Relations[key] = n
				}
				if e = rows.Err(); e != nil {
					t.Fatal(e)
				}
				rows.Close()
				mu.Lock()
				for _, v := range inputs {
					m.DirectSelectedInputs += v.Direct
					m.EffectiveInputRefs += v.Effective
					m.OmittedAuthorized += v.Omitted
				}
				seen := len(inputs)
				mu.Unlock()
				if seen != expectedRuns {
					t.Fatalf("engine identities=%d runs=%d", seen, expectedRuns)
				}
				if m.DependencyRows == 0 || m.DirectSelectedInputs == 0 || m.EffectiveInputRefs == 0 {
					t.Fatalf("empty production dependency observation: %+v", m)
				}
				results = append(results, m)
				b, _ := json.Marshal(m)
				t.Logf("DEPENDENCY_SCALE %s", b)
			}
			session := f.session(chain)
			stage("chain", size/2, func() {
				for i := 0; i < size/2; i++ {
					run(chain, &session, fmt.Sprintf("chain-%d", i))
				}
			})
			stage("branch", size*4/5, func() {
				for i := 0; i < size/10; i++ {
					run(parent, nil, fmt.Sprintf("branch:%d", i))
				}
			})
			if got := scaleCount(t, db, "SELECT count(*) FROM execution_runs WHERE parent_run_id<>''"); got != size/5 {
				t.Fatalf("child runs=%d", got)
			}
			var sharedRuns []string
			stage("shared", size*9/10, func() {
				for i := 0; i < size/10; i++ {
					id := run(shared, nil, fmt.Sprintf("shared-%d", i))
					sharedRuns = append(sharedRuns, id)
					mu.Lock()
					v := inputs[id]
					mu.Unlock()
					if v.Recalled != 1 {
						t.Fatalf("shared recall=%d", v.Recalled)
					}
				}
			})
			var independent string
			stage("multiple", size, func() {
				for i := 0; i < size/10; i++ {
					id := run(multiple, nil, fmt.Sprintf("multiple-%d", i))
					independent = id
					mu.Lock()
					v := inputs[id]
					mu.Unlock()
					if v.Recalled != 3 {
						t.Fatalf("multiple recall=%d", v.Recalled)
					}
				}
			})
			delivery := func(id string) error {
				return f.core.API.Events.WithDelivery(ctx, scaleOwner, []api.DeliverySubject{{Kind: "run", ID: id}}, func(context.Context) error { return nil })
			}
			for _, id := range sharedRuns {
				if err := delivery(id); err != nil {
					t.Fatal("before revoke", err)
				}
			}
			stage("revocation", size, func() {
				if _, err := f.core.API.Memory.Forget(ctx, scaleOwner, api.MemoryForget{CommandMeta: f.next(sharedItem.Revision), Namespace: scaleNamespace(shared), ID: sharedItem.ID}); err != nil {
					t.Fatal(err)
				}
				for _, id := range sharedRuns {
					if err := delivery(id); !scaleReason(err, "MEMORY_FORGOTTEN") {
						t.Fatalf("revoked run delivery=%v", err)
					}
				}
				if err := delivery(independent); err != nil {
					t.Fatal("independent source revoked", err)
				}
			})
		})
	}
	if output := os.Getenv("HUHU_DEPENDENCY_SCALE_OUTPUT"); output != "" {
		b, err := json.MarshalIndent(struct {
			Go, OS, Arch string
			CPUs         int
			Stages       []scaleStage
		}{runtime.Version(), runtime.GOOS, runtime.GOARCH, runtime.NumCPU(), results}, "", "  ")
		if err != nil {
			t.Fatal(err)
		}
		if err = os.WriteFile(output, append(b, '\n'), 0600); err != nil {
			t.Fatal(err)
		}
	}
}
func scaleFileSize(path string) int64 {
	s, e := os.Stat(path)
	if e != nil {
		return 0
	}
	return s.Size()
}
func scaleRSS() int64 {
	b, e := os.ReadFile("/proc/self/status")
	if e != nil {
		return 0
	}
	for _, line := range strings.Split(string(b), "\n") {
		var kb int64
		if _, e = fmt.Sscanf(line, "VmRSS: %d kB", &kb); e == nil {
			return kb * 1024
		}
	}
	return 0
}
