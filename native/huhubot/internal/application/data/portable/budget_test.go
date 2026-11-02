package portable

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type budgetProfile struct{}

func (budgetProfile) ReadMetadata(context.Context) (api.ProfileMetadata, error) {
	return api.ProfileMetadata{ProfileID: "profile:budget", CommandEpoch: "1", Revision: "1"}, nil
}

type budgetStore struct{ pkg Package }

func (s budgetStore) Get(context.Context, ArtifactRef) (Package, error) { return s.pkg, nil }
func (s budgetStore) Put(context.Context, Package) (ArtifactRef, error) { panic("unused") }

type budgetRepo struct{ target Target }

func (s budgetRepo) Snapshot(context.Context, api.RequestIdentity, string, ExportRequest) (Selection, error) {
	panic("unused")
}
func (s budgetRepo) Target(context.Context, string) (Target, error)     { return s.target, nil }
func (s budgetRepo) Begin(context.Context, string) (Transaction, error) { panic("unused") }

func TestOversizedPreviewDoesNotOccupyTokenSlot(t *testing.T) {
	selection := Selection{SourceProfile: "source:budget"}
	target := Target{ProfileID: "profile:budget", CommandEpoch: "1", Revision: "1"}
	for i := 0; i < MaxItems; i++ {
		name := fmt.Sprintf("agent-%d", i)
		selection.Agents = append(selection.Agents, Agent{ID: fmt.Sprintf("agent:%032x", i), Name: name, Revision: "1", PersonaRevision: "1", ModelRevision: "0"})
		target.Agents = append(target.Agents, TargetAgent{ID: fmt.Sprintf("agent:%032x", i+MaxItems), Name: name, Revision: "1"})
	}
	pkg, err := Build(selection)
	if err != nil {
		t.Fatal(err)
	}
	s := NewService(budgetProfile{}, budgetStore{pkg}, budgetRepo{target})
	result, err := s.ImportPreview(context.Background(), api.NewConnectionIdentity("connection", "owner", false), ImportPreviewRequest{ProfileID: target.ProfileID, Artifact: ArtifactRef{ArtifactID: "artifact:budget"}})
	var fault *api.Fault
	if !errors.As(err, &fault) || fault.Kind != "RESOURCE_LIMIT" || fault.Reason != "PORTABLE_PREVIEW_TOO_LARGE" || result.Token != "" {
		t.Fatalf("oversized public preview was accepted: token=%q err=%v", result.Token, err)
	}
	if len(s.previews) != 0 {
		t.Fatal("an undeliverable token occupied a preview slot", len(s.previews))
	}
}

func TestConflictConstructionRejectsCartesianGrowth(t *testing.T) {
	selection := Selection{SourceProfile: "source:budget", Agents: []Agent{{ID: "source:a", Name: "same"}, {ID: "source:b", Name: "same"}}}
	pkg, err := Build(selection)
	if err != nil {
		t.Fatal(err)
	}
	target := Target{ProfileID: "profile:budget"}
	for i := 0; i < MaxItems; i++ {
		target.Agents = append(target.Agents, TargetAgent{ID: fmt.Sprint("existing:", i), Name: "same"})
	}
	preview, err := PreviewImport(pkg, target)
	var fault *api.Fault
	if !errors.As(err, &fault) || fault.Kind != "RESOURCE_LIMIT" || fault.Reason != "PORTABLE_PREVIEW_TOO_LARGE" || len(preview.Conflicts) != 0 {
		t.Fatal("conflict expansion was not rejected before publication", len(preview.Conflicts), err)
	}
}
