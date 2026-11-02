package bootstrap

import (
	"context"
	"os"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type portableAssemblyEngine struct{}

func (portableAssemblyEngine) Run(context.Context, api.EngineInput, func(api.EngineEvent) error) (api.EngineResult, error) {
	return api.EngineResult{Status: "finished"}, nil
}

func (portableAssemblyEngine) Resume(context.Context, api.EngineResumeInput, func(api.EngineEvent) error) (api.EngineResult, error) {
	return api.EngineResult{Status: "finished"}, nil
}

func TestOpenAssemblesPortableService(t *testing.T) {
	root := t.TempDir()
	if err := os.Chmod(root, 0700); err != nil {
		t.Fatal(err)
	}
	core, err := OpenWithOptions(context.Background(), root, root+"/profile", Options{Engine: portableAssemblyEngine{}, ExecutorPaused: true})
	if err != nil {
		t.Fatal(err)
	}
	if core.Portable == nil {
		t.Fatal("portable service was not assembled")
	}
	if err := core.Close(); err != nil {
		t.Fatal(err)
	}
}
