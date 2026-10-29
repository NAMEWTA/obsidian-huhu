package executor

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// The scanner must not take the single SQLite connection while a worker is
// still preparing. The gate is released before the engine, so this does not
// widen the 3s stop budget or the caller's liveness wait.
func TestScannerDoesNotClaimWhileWorkerIsPreparing(t *testing.T) {
	entered := make(chan struct{})
	repo := &prepareRepo{}
	repo.work = Work{Run: api.Run{ID: "run-1", ParentRunID: "parent"}}
	running, err := New(context.Background(), repo, prepareEngine{entered: entered}, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	running.Start()
	select {
	case <-entered:
	case <-time.After(2 * time.Second):
		t.Fatal("engine not entered")
	}
	if err = running.Close(); err != nil {
		t.Fatal(err)
	}
	repo.mu.Lock()
	overlap := repo.overlap
	repo.mu.Unlock()
	if overlap {
		t.Fatal("scanner claimed while the worker still held prepare")
	}
}

type prepareEngine struct{ entered chan struct{} }

func (e prepareEngine) Run(context.Context, api.EngineInput, func(api.EngineEvent) error) (api.EngineResult, error) {
	close(e.entered)
	return api.EngineResult{Status: "finished"}, nil
}
func (e prepareEngine) Resume(context.Context, api.EngineResumeInput, func(api.EngineEvent) error) (api.EngineResult, error) {
	return api.EngineResult{}, nil
}

type prepareRepo struct {
	mu      sync.Mutex
	work    Work
	n       int
	inMark  bool
	overlap bool
}

func (r *prepareRepo) Recover(context.Context) error { return nil }
func (r *prepareRepo) Claim(context.Context) (*Work, error) {
	r.mu.Lock()
	if r.inMark {
		r.overlap = true
	}
	n := r.n
	r.n++
	work := r.work
	r.mu.Unlock()
	if n == 0 {
		return &work, nil
	}
	return nil, nil
}
func (r *prepareRepo) MarkRunning(context.Context, Work) error {
	r.mu.Lock()
	r.inMark = true
	r.mu.Unlock()
	time.Sleep(200 * time.Millisecond)
	r.mu.Lock()
	r.inMark = false
	r.mu.Unlock()
	return nil
}
func (r *prepareRepo) Block(context.Context, Work, string) error { return nil }
func (r *prepareRepo) AppendEvent(context.Context, Work, api.EngineEvent) error {
	return nil
}
func (r *prepareRepo) Finalize(context.Context, Work, api.EngineResult) error { return nil }
func (r *prepareRepo) ProducerEnded(context.Context, Work) error              { return nil }
