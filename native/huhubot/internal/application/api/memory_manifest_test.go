package api

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

type memoryManifestFixture struct {
	Name          string
	Memory        ExecutionMemoryInput
	MemoryBinding string
}

func memoryManifestFixtures(t *testing.T) []memoryManifestFixture {
	t.Helper()
	raw, e := os.ReadFile(filepath.Join("..", "..", "..", "..", "..", "contracts", "hap", "v0.1", "fixtures", "memory-bindings.json"))
	if e != nil {
		t.Fatal(e)
	}
	var data struct{ Cases []memoryManifestFixture }
	if e = json.Unmarshal(raw, &data); e != nil {
		t.Fatal(e)
	}
	if len(data.Cases) == 0 {
		t.Fatal("independent fixture has no cases")
	}
	return data.Cases
}
func memoryManifestClone(v ExecutionMemoryInput) ExecutionMemoryInput {
	v.Entries = append([]MemoryInputEntry{}, v.Entries...)
	v.Targets = append([]MemoryTarget{}, v.Targets...)
	return v
}
func memoryManifestStrip(v ExecutionMemoryInput) ExecutionMemoryInput {
	v = memoryManifestClone(v)
	for i := range v.Entries {
		v.Entries[i].Text = ""
	}
	return v
}

func TestMemoryInputManifestBindingPreservesIndependentFixture(t *testing.T) {
	for _, f := range memoryManifestFixtures(t) {
		t.Run(f.Name, func(t *testing.T) {
			full, e := CanonicalMemoryInputBinding(f.Memory)
			if e != nil || full != f.MemoryBinding {
				t.Fatal("independent full-input golden", full, e)
			}
			got, e := CanonicalMemoryInputManifestBinding(memoryManifestStrip(f.Memory))
			if e != nil || got != f.MemoryBinding {
				t.Fatal("legal body-free manifest needs the same fixed binding", got, f.MemoryBinding, e)
			}
		})
	}
}

func memoryManifestMaintenance(t *testing.T) ExecutionMemoryInput {
	t.Helper()
	v := memoryManifestClone(memoryManifestFixtures(t)[0].Memory)
	v.Mode = "maintenance"
	v.JobID = "job:fixed"
	v.JobGeneration = "2"
	v.SettingsRevision = "3"
	v.Targets = []MemoryTarget{{ItemID: "item:z", Revision: "9223372036854775807", RevisionID: "revision:z", Pinned: true}, {ItemID: "item:a", Revision: "1", RevisionID: "revision:a"}}
	return v
}

func TestMemoryInputManifestBindingPinsAllMetadataAndTargetHeads(t *testing.T) {
	const expected = "sha256:d67fa6621d7ea799d2856fbb85f77b4414342b181c7dd7fd77575ba2f1a26ea6"
	full := memoryManifestMaintenance(t)
	if got, e := CanonicalMemoryInputBinding(full); e != nil || got != expected {
		t.Fatal("independent maintenance golden", got, e)
	}
	v := memoryManifestStrip(full)
	before := memoryManifestClone(v)
	if got, e := CanonicalMemoryInputManifestBinding(v); e != nil || got != expected {
		t.Fatal("body-free fixed Targets golden", got, e)
	}
	if !reflect.DeepEqual(v, before) {
		t.Fatal("pure binding mutated caller Targets or Entries")
	}
	reordered := memoryManifestClone(v)
	reordered.Targets[0], reordered.Targets[1] = reordered.Targets[1], reordered.Targets[0]
	if got, e := CanonicalMemoryInputManifestBinding(reordered); e != nil || got != expected {
		t.Fatal("target order was not canonical", got, e)
	}
	cases := []struct {
		name   string
		mutate func(*ExecutionMemoryInput)
	}{
		{"version", func(v *ExecutionMemoryInput) { v.Version = "2" }},
		{"mode", func(v *ExecutionMemoryInput) { v.Mode = "recall" }},
		{"namespace-kind", func(v *ExecutionMemoryInput) { v.Namespace.Kind = "temporary" }},
		{"namespace-id", func(v *ExecutionMemoryInput) { v.Namespace.ID = "agent:other" }},
		{"job-id", func(v *ExecutionMemoryInput) { v.JobID = "job:other" }},
		{"job-generation", func(v *ExecutionMemoryInput) { v.JobGeneration = "3" }},
		{"settings-revision", func(v *ExecutionMemoryInput) { v.SettingsRevision = "4" }},
		{"ref-kind", func(v *ExecutionMemoryInput) { v.Entries[0].Ref.Kind = "task_result" }},
		{"ref-id", func(v *ExecutionMemoryInput) { v.Entries[0].Ref.ID = "revision:other" }},
		{"ref-revision", func(v *ExecutionMemoryInput) { v.Entries[0].Ref.Revision = "2" }},
		{"ref-hash", func(v *ExecutionMemoryInput) { v.Entries[0].Ref.Hash = "sha256:" + strings.Repeat("a", 64) }},
		{"ref-namespace", func(v *ExecutionMemoryInput) { v.Entries[0].Ref.Namespace = "agent:other" }},
		{"ref-thread", func(v *ExecutionMemoryInput) { v.Entries[0].Ref.WorkThreadID = "thread:other" }},
		{"role", func(v *ExecutionMemoryInput) { v.Entries[0].Role = "assistant" }},
		{"entry-count", func(v *ExecutionMemoryInput) { v.Entries = []MemoryInputEntry{} }},
		{"target-id", func(v *ExecutionMemoryInput) { v.Targets[0].ItemID = "item:other" }},
		{"target-cas", func(v *ExecutionMemoryInput) { v.Targets[0].Revision = "2" }},
		{"target-revision-id", func(v *ExecutionMemoryInput) { v.Targets[0].RevisionID = "revision:other" }},
		{"target-pinned", func(v *ExecutionMemoryInput) { v.Targets[0].Pinned = false }},
		{"target-count", func(v *ExecutionMemoryInput) { v.Targets = v.Targets[:1] }},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			v := memoryManifestClone(before)
			c.mutate(&v)
			got, e := CanonicalMemoryInputManifestBinding(v)
			if e == nil && got == expected {
				t.Fatal("metadata change retained original binding", c.name)
			}
		})
	}
	claimed := memoryManifestClone(v)
	claimed.BindingDigest = "untrusted claimed digest"
	if got, e := CanonicalMemoryInputManifestBinding(claimed); e != nil || got != expected {
		t.Fatal("claimed digest must be compared by the caller, never hashed as evidence", got, e)
	}
}

func TestMemoryInputManifestRejectsMalformedOrNonemptyBodies(t *testing.T) {
	base := memoryManifestStrip(memoryManifestMaintenance(t))
	cases := []struct {
		name   string
		mutate func(*ExecutionMemoryInput)
	}{
		{"body", func(v *ExecutionMemoryInput) { v.Entries[0].Text = "unverified body" }},
		{"bad-utf8-body", func(v *ExecutionMemoryInput) { v.Entries[0].Text = string([]byte{0xff}) }},
		{"invalid-version", func(v *ExecutionMemoryInput) { v.Version = "" }},
		{"invalid-mode", func(v *ExecutionMemoryInput) { v.Mode = "summary" }},
		{"invalid-namespace", func(v *ExecutionMemoryInput) { v.Namespace.Kind = "sponsor" }},
		{"empty-namespace-id", func(v *ExecutionMemoryInput) { v.Namespace.ID = "" }},
		{"global-maintenance", func(v *ExecutionMemoryInput) { v.Namespace.Kind = "global" }},
		{"job-empty", func(v *ExecutionMemoryInput) { v.JobID = "" }},
		{"job-too-long", func(v *ExecutionMemoryInput) { v.JobID = strings.Repeat("j", 513) }},
		{"generation-zero", func(v *ExecutionMemoryInput) { v.JobGeneration = "0" }},
		{"generation-leading-zero", func(v *ExecutionMemoryInput) { v.JobGeneration = "02" }},
		{"generation-overflow", func(v *ExecutionMemoryInput) { v.JobGeneration = "9223372036854775808" }},
		{"settings-empty", func(v *ExecutionMemoryInput) { v.SettingsRevision = "" }},
		{"settings-overflow", func(v *ExecutionMemoryInput) { v.SettingsRevision = "9223372036854775808" }},
		{"ref-kind", func(v *ExecutionMemoryInput) { v.Entries[0].Ref.Kind = "run" }},
		{"ref-id-empty", func(v *ExecutionMemoryInput) { v.Entries[0].Ref.ID = "" }},
		{"ref-id-utf8", func(v *ExecutionMemoryInput) { v.Entries[0].Ref.ID = string([]byte{0xff}) }},
		{"ref-id-too-long", func(v *ExecutionMemoryInput) { v.Entries[0].Ref.ID = strings.Repeat("x", 513) }},
		{"ref-revision", func(v *ExecutionMemoryInput) { v.Entries[0].Ref.Revision = "0" }},
		{"ref-hash", func(v *ExecutionMemoryInput) { v.Entries[0].Ref.Hash = "sha256:bad" }},
		{"ref-namespace", func(v *ExecutionMemoryInput) { v.Entries[0].Ref.Namespace = "" }},
		{"ref-thread", func(v *ExecutionMemoryInput) { v.Entries[0].Ref.WorkThreadID = "" }},
		{"role", func(v *ExecutionMemoryInput) { v.Entries[0].Role = "system" }},
		{"duplicate-ref", func(v *ExecutionMemoryInput) { v.Entries = append(v.Entries, v.Entries[0]) }},
		{"duplicate-ref-different-revision", func(v *ExecutionMemoryInput) {
			e := v.Entries[0]
			e.Ref.Revision = "2"
			v.Entries = append(v.Entries, e)
		}},
		{"target-id", func(v *ExecutionMemoryInput) { v.Targets[0].ItemID = "" }},
		{"target-cas-zero", func(v *ExecutionMemoryInput) { v.Targets[0].Revision = "0" }},
		{"target-cas-overflow", func(v *ExecutionMemoryInput) { v.Targets[0].Revision = "9223372036854775808" }},
		{"target-revision-id", func(v *ExecutionMemoryInput) { v.Targets[0].RevisionID = "" }},
		{"target-duplicate", func(v *ExecutionMemoryInput) { v.Targets = append(v.Targets, v.Targets[0]) }},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			v := memoryManifestClone(base)
			c.mutate(&v)
			if _, e := CanonicalMemoryInputManifestBinding(v); e == nil {
				t.Fatal("invalid metadata accepted")
			}
		})
	}
	for _, field := range []string{"job", "generation", "settings", "targets"} {
		t.Run("recall-rejects-"+field, func(t *testing.T) {
			v := memoryManifestStrip(memoryManifestFixtures(t)[0].Memory)
			switch field {
			case "job":
				v.JobID = "job:forged"
			case "generation":
				v.JobGeneration = "1"
			case "settings":
				v.SettingsRevision = "1"
			case "targets":
				v.Targets = base.Targets
			}
			if _, e := CanonicalMemoryInputManifestBinding(v); e == nil {
				t.Fatal("recall accepted maintenance metadata")
			}
		})
	}
}

func memoryManifestTextHash(v string) string {
	h := sha256.Sum256([]byte(v))
	return "sha256:" + hex.EncodeToString(h[:])
}
func memoryManifestEntries(v MemoryInputEntry, n int) []MemoryInputEntry {
	out := make([]MemoryInputEntry, n)
	for i := range out {
		out[i] = v
		out[i].Ref.ID = fmt.Sprintf("entry:%03d", i)
	}
	return out
}

func TestMemoryInputManifestBoundariesAndStrictCompleteInput(t *testing.T) {
	full := memoryManifestMaintenance(t)
	for _, mode := range []string{"recall", "maintenance"} {
		v := memoryManifestClone(full)
		max := 128
		if mode == "recall" {
			v = memoryManifestFixtures(t)[0].Memory
			max = 20
		}
		v.Entries = memoryManifestEntries(v.Entries[0], max)
		if _, e := CanonicalMemoryInputManifestBinding(memoryManifestStrip(v)); e != nil {
			t.Fatal(mode, "exact count", e)
		}
		v.Entries = memoryManifestEntries(v.Entries[0], max+1)
		if _, e := CanonicalMemoryInputManifestBinding(memoryManifestStrip(v)); e == nil {
			t.Fatal(mode, "over count")
		}
	}
	v := memoryManifestStrip(full)
	v.Targets = make([]MemoryTarget, 32)
	for i := range v.Targets {
		v.Targets[i] = MemoryTarget{ItemID: fmt.Sprintf("item:%03d", i), Revision: "1", RevisionID: fmt.Sprintf("revision:%03d", i)}
	}
	if _, e := CanonicalMemoryInputManifestBinding(v); e != nil {
		t.Fatal("32 Targets", e)
	}
	v.Targets = append(v.Targets, MemoryTarget{ItemID: "item:last", Revision: "1", RevisionID: "revision:last"})
	if _, e := CanonicalMemoryInputManifestBinding(v); e == nil {
		t.Fatal("33 Targets accepted")
	}
	v = memoryManifestClone(full)
	text := strings.Repeat("a", 1024)
	e := v.Entries[0]
	e.Text = text
	e.Ref.Hash = memoryManifestTextHash(text)
	v.Entries = memoryManifestEntries(e, 128)
	got, err := CanonicalMemoryInputBinding(v)
	if err != nil {
		t.Fatal("128KiB exact body", err)
	}
	if metadata, err := CanonicalMemoryInputManifestBinding(memoryManifestStrip(v)); err != nil || metadata != got {
		t.Fatal("exact body metadata differs", metadata, err)
	}
	v.Entries[0].Text += "x"
	v.Entries[0].Ref.Hash = memoryManifestTextHash(v.Entries[0].Text)
	if _, err = CanonicalMemoryInputBinding(v); err == nil {
		t.Fatal("full input bypassed aggregate body budget")
	}
	if _, err = CanonicalMemoryInputManifestBinding(memoryManifestStrip(v)); err != nil {
		t.Fatal("body-free metadata cannot claim to measure unavailable original bytes", err)
	}
	for _, name := range []string{"changed-text", "wrong-hash", "invalid-utf8", "redacted-as-full"} {
		t.Run(name, func(t *testing.T) {
			v := memoryManifestClone(full)
			switch name {
			case "changed-text":
				v.Entries[0].Text += "changed"
			case "wrong-hash":
				v.Entries[0].Ref.Hash = "sha256:" + strings.Repeat("a", 64)
			case "invalid-utf8":
				v.Entries[0].Text = string([]byte{0xff})
				v.Entries[0].Ref.Hash = memoryManifestTextHash(v.Entries[0].Text)
			case "redacted-as-full":
				v = memoryManifestStrip(v)
			}
			if _, e := CanonicalMemoryInputBinding(v); e == nil {
				t.Fatal("full input accepted unchecked body")
			}
		})
	}
	ordered := memoryManifestStrip(full)
	entry := ordered.Entries[0]
	entry.Ref.ID = "entry:second"
	ordered.Entries = append(ordered.Entries, entry)
	one, err := CanonicalMemoryInputManifestBinding(ordered)
	if err != nil {
		t.Fatal(err)
	}
	ordered.Entries[0], ordered.Entries[1] = ordered.Entries[1], ordered.Entries[0]
	two, err := CanonicalMemoryInputManifestBinding(ordered)
	if err != nil || one == two {
		t.Fatal("entry order is meaningful", one, two, err)
	}
}
