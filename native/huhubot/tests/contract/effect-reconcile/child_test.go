package effectreconcile_test

import (
	"bytes"
	"context"
	"encoding/json"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/stdio"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	"os"
	"testing"
)

type childEngine struct{}

func (childEngine) Run(ctx context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	var command struct {
		Target  api.EffectTarget `json:"target"`
		Content string           `json:"content"`
		Mode    string           `json:"mode"`
	}
	if json.Unmarshal([]byte(in.Intent), &command) != nil {
		return api.EngineResult{}, api.Invalid("FIXTURE_INTENT_INVALID")
	}
	if command.Mode == "wait" {
		<-ctx.Done()
		return api.EngineResult{}, ctx.Err()
	}
	r, e := in.Tools.Invoke(ctx, api.ToolCall{ID: "fixture-note-write", Name: "note.write", Target: command.Target, Content: command.Content})
	if e != nil {
		return api.EngineResult{}, e
	}
	if r.Status != "approval_required" {
		return api.EngineResult{Status: "finished", Text: r.Reason}, nil
	}
	cp, e := in.Checkpoints.Publish(ctx, bytes.NewBufferString("controlled-huhu-note-continuation"))
	if e != nil {
		return api.EngineResult{}, e
	}
	return api.EngineResult{Status: "suspended", Suspension: &api.EngineSuspension{Token: r.SuspensionToken, Checkpoint: cp}}, nil
}
func (childEngine) Resume(_ context.Context, in api.EngineResumeInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	return api.EngineResult{Status: "finished", Text: in.Decision.Status}, nil
}

// TestNoteEffectChild is a test-only process entry. All business/Host/transport
// services are production assemblies; only the Engine substitutes a model.
func TestNoteEffectChild(t *testing.T) {
	if os.Getenv("HUHU_NOTE_EFFECT_CHILD") != "1" {
		return
	}
	root, locator := os.Getenv("HUHU_NOTE_EFFECT_PROFILE_ROOT"), os.Getenv("HUHU_NOTE_EFFECT_PROFILE")
	if root == "" || locator == "" {
		os.Exit(2)
	}
	core, e := bootstrap.OpenWithOptions(context.Background(), root, locator, bootstrap.Options{Engine: childEngine{}})
	if e != nil {
		os.Exit(3)
	}
	id := api.NewConnectionIdentity(api.NewID("connection:"), "local-owner", true)
	server := stdio.New(os.Stdin, os.Stdout, core.API, id)
	e = server.Run(context.Background())
	closeErr := core.Close()
	// Distinct codes say which path ended the child when the TS side sees EOF;
	// 1 stays the stdio Windows output's fail-stop.
	if e != nil {
		os.Exit(4)
	}
	if closeErr != nil {
		os.Exit(5)
	}
	// testing's PASS footer is not part of HAP.
	os.Exit(0)
}
