package performance_test

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"runtime"
	"sort"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/stdio"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

type profile struct{}

func (profile) ReadMetadata(context.Context) (api.ProfileMetadata, error) {
	return api.ProfileMetadata{ProfileID: "profile:perf", CommandEpoch: "epoch:1", Revision: "1"}, nil
}

func TestFixedFrameLoadKeepsTransportBudgetBounded(t *testing.T) {
	if stdio.MaxQueuedFrames != 32 || stdio.MaxQueuedBytes < wire.MaxFrameBytes {
		t.Fatalf("queue budget drifted: frames=%d bytes=%d", stdio.MaxQueuedFrames, stdio.MaxQueuedBytes)
	}
	payload := bytes.Repeat([]byte("x"), 1024)
	frame := bytes.NewBuffer(nil)
	id := "c:performance"
	result, _ := json.Marshal(string(payload))
	if err := wire.WriteFrame(frame, wire.Envelope{JSONRPC: "2.0", ID: &id, Result: result}); err != nil {
		t.Fatal(err)
	}
	durations := make([]time.Duration, 100)
	for i := range durations {
		start := time.Now()
		if _, _, err := wire.ReadFrame(bytes.NewReader(frame.Bytes())); err != nil {
			t.Fatal(err)
		}
		durations[i] = time.Since(start)
	}
	sort.Slice(durations, func(i, j int) bool { return durations[i] < durations[j] })
	t.Logf("fixed-frame-load os=%s arch=%s go=%s samples=%d frameBytes=%d p50=%s p95=%s queueFrames=%d queueBytes=%d", runtime.GOOS, runtime.GOARCH, runtime.Version(), len(durations), frame.Len(), durations[49], durations[94], stdio.MaxQueuedFrames, stdio.MaxQueuedBytes)
}

func TestDiagnosticsIsMetadataOnly(t *testing.T) {
	service := api.NewService(profile{}, api.NewHostService())
	identity := api.NewConnectionIdentity("connection:perf", "principal:perf", true)
	diagnostics, err := service.Diagnostics(context.Background(), identity)
	if err != nil {
		t.Fatal(err)
	}
	b, err := json.Marshal(diagnostics)
	if err != nil {
		t.Fatal(err)
	}
	for _, forbidden := range []string{"body", "secret", "credential", "prompt", "message"} {
		if bytes.Contains(bytes.ToLower(b), []byte(forbidden)) {
			t.Fatalf("diagnostics leaked private field %q: %s", forbidden, b)
		}
	}
}

func TestFixedLoadDoesNotClaimProviderPerformance(t *testing.T) {
	if os.Getenv("HUHUBOT_PROVIDER_ENDPOINT") != "" {
		t.Skip("provider measurements are user-owned and must be run by the acceptance harness")
	}
	t.Log("provider=not-run reason=HUHUBOT_PROVIDER_ENDPOINT is unset; this suite only measures the deterministic local transport")
}
