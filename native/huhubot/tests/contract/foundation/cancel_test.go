package foundation_test

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
	"testing"
	"time"
)

func TestReverseCancellationSettlesOneRequestAndPreservesSibling(t *testing.T) {
	for _, order := range []string{"cancel-first", "response-first"} {
		t.Run(order, func(t *testing.T) {
			c, core, _ := running(t, true)
			h := hello(t, c)
			send(t, c, request("c:attach", "host.attach", wire.HostAttachParams{WorkspaceID: "vault", Capabilities: []string{"note.write"}}))
			reply := receive(t, c)[0]
			if reply.Error != nil {
				t.Fatal(reply.Error)
			}
			var lease wire.HostLease
			if e := json.Unmarshal(reply.Result, &lease); e != nil {
				t.Fatal(e)
			}
			command := fullHostCommand(t, h.Profile, lease)
			call, cancel := context.WithCancel(context.Background())
			defer cancel()
			done := make(chan error, 1)
			go func() { _, e := core.API.Host.Invoke(call, command); done <- e }()
			original := receive(t, c)[0]
			if original.Method != "host.invoke" || original.ID == nil {
				t.Fatal("no reverse request")
			}
			result := api.HostReceipt{EffectID: command.EffectID, Status: "committed", Fingerprint: command.Fingerprint, ReceiptID: "trusted:one"}
			if order == "response-first" {
				send(t, c, map[string]any{"jsonrpc": "2.0", "id": *original.ID, "result": result})
				if e := <-done; e != nil {
					t.Fatal(e)
				}
				cancel()
			} else {
				cancel()
				control := receive(t, c)[0]
				var params struct {
					RequestID string `json:"requestId"`
				}
				if e := json.Unmarshal(control.Params, &params); e != nil {
					t.Fatal(e)
				}
				if control.Method != "$/cancelRequest" || control.ID != nil || params.RequestID != *original.ID {
					t.Fatalf("wrong cancel %#v", control)
				}
				select {
				case e := <-done:
					if !errors.Is(e, context.Canceled) {
						t.Fatalf("cancel result %v", e)
					}
				case <-time.After(time.Second):
					t.Fatal("cancel did not settle")
				}
				// A real noncancelable mutation may finish after the caller stopped waiting.
				// It has one known late correlation; it cannot become an unrelated response.
				send(t, c, map[string]any{"jsonrpc": "2.0", "id": *original.ID, "result": result})
			}
			sibling := command
			sibling.EffectID = "effect:sibling"
			sibling.Fingerprint = api.EffectFingerprint(sibling)
			go func() { _, e := core.API.Host.Invoke(context.Background(), sibling); done <- e }()
			next := receive(t, c)[0]
			if next.Method != "host.invoke" {
				t.Fatalf("sibling connection closed %#v", next)
			}
			send(t, c, request("c:health", "service.health", nil))
			if r := receive(t, c)[0]; r.Error != nil || r.ID == nil || *r.ID != "c:health" {
				t.Fatal("healthy sibling lost")
			}
			send(t, c, map[string]any{"jsonrpc": "2.0", "id": *next.ID, "result": api.HostReceipt{EffectID: sibling.EffectID, Status: "committed", Fingerprint: sibling.Fingerprint}})
			if e := <-done; e != nil {
				t.Fatal(e)
			}
		})
	}
}
func TestFreshBudgetHasExplicitZeroAndRuntimePolicyMetadata(t *testing.T) {
	c, _, _ := running(t, true)
	h := hello(t, c)
	if h.Policy == nil || h.Policy.BudgetConfigured || h.Policy.BudgetPaused || h.Policy.Limits.MaxDepth != 3 || h.Policy.Limits.MaxChildren != 32 || h.Policy.Limits.RootChildren != 4 || h.Policy.Limits.ProfileChildren != 8 || h.Policy.Limits.MaxWakes != 8 {
		t.Fatalf("runtime policy %#v", h.Policy)
	}
	send(t, c, request("c:budget", "collaboration.budget", map[string]any{"profileId": h.Profile.ProfileID}))
	r := receive(t, c)[0]
	if r.Error != nil {
		t.Fatalf("fresh budget wire result %#v", r.Error)
	}
	var budget api.BudgetSettings
	if e := json.Unmarshal(r.Result, &budget); e != nil {
		t.Fatal(e)
	}
	if budget.Policy.RootTokenLimit != "0" || budget.Policy.ProfileTokenLimit != "0" || budget.Policy.MaintenanceTokenLimit != "0" {
		t.Fatalf("unknown budget fabricated/invalid %#v", budget)
	}
}
