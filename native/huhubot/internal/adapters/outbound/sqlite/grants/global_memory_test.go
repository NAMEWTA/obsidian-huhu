package grants

import (
	"errors"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

func TestConfirmedGlobalSubjectUsesItsOwnUniqueNamespaceGroup(t *testing.T) {
	subject := MemorySubject{Kind: "memory_revision", ID: "revision:root"}
	global := MemoryRequirement{Subject: subject, Namespace: api.MemoryNamespace{Kind: "global", ID: "profile:one"}, Scope: api.MemoryScope{Kind: "session", ID: "session:one"}, RevisionIDs: []string{subject.ID}}
	private := MemoryRequirement{Subject: subject, Namespace: api.MemoryNamespace{Kind: "agent", ID: "agent:other"}, Scope: api.MemoryScope{Kind: "profile"}, RevisionIDs: []string{"revision:private"}}
	for _, tc := range []struct {
		name    string
		facts   []MemoryRequirement
		profile string
		want    bool
		invalid bool
	}{
		{name: "session-scoped-global-head", facts: []MemoryRequirement{global, private}, profile: "profile:one", want: true},
		{name: "wrong-profile", facts: []MemoryRequirement{global, private}, profile: "profile:other"},
		{name: "missing-root", facts: []MemoryRequirement{private}, profile: "profile:one", invalid: true},
		{name: "contradictory-root", facts: []MemoryRequirement{global, {Subject: subject, Namespace: private.Namespace, RevisionIDs: []string{subject.ID}}}, profile: "profile:one", invalid: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			got, err := confirmedGlobalSubject(MemoryFacts{Requirements: tc.facts}, subject, tc.profile)
			if tc.invalid {
				var fault *api.Fault
				if !errors.As(err, &fault) || fault.Reason != "MEMORY_STATE_INVALID" {
					t.Fatal("contradictory root accepted", got, err)
				}
			} else if err != nil || got != tc.want {
				t.Fatal(got, err)
			}
		})
	}
	global.RevisionIDs = []string{"revision:global-ancestor"}
	private.RevisionIDs = []string{subject.ID}
	if got, err := confirmedGlobalSubject(MemoryFacts{Requirements: []MemoryRequirement{global, private}}, subject, "profile:one"); err != nil || got {
		t.Fatal("private root borrowed a global ancestor's namespace", got, err)
	}
}
