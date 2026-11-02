package foundation_test

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

func TestSharedGoldenFrames(t *testing.T) {
	path := filepath.Join("..", "..", "..", "..", "..", "contracts", "hap", "v0.1", "fixtures", "golden.json")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var fixtures struct {
		Limits struct{ MaxFrameBytes, MaxBatchItems, JSONKind int }
		Valid  []struct {
			Name, FrameHex string
			Payload        json.RawMessage
		}
		Invalid []struct{ Name, FrameHex, Reason string }
	}
	if err = json.Unmarshal(data, &fixtures); err != nil {
		t.Fatal(err)
	}
	if fixtures.Limits.MaxFrameBytes != hap.MaxFrameBytes || fixtures.Limits.MaxBatchItems != hap.MaxBatchItems || fixtures.Limits.JSONKind != int(hap.JSONKind) {
		t.Fatal("limits drift")
	}
	for _, v := range fixtures.Valid {
		t.Run(v.Name, func(t *testing.T) {
			b, e := hex.DecodeString(v.FrameHex)
			if e != nil {
				t.Fatal(e)
			}
			if _, _, e = hap.ReadFrame(bytes.NewReader(b)); e != nil {
				t.Fatal(e)
			}
			var out bytes.Buffer
			if e = hap.WriteFrame(&out, v.Payload); e != nil {
				t.Fatal(e)
			}
			if !bytes.Equal(b, out.Bytes()) {
				t.Fatal("golden bytes drift")
			}
		})
	}
	for _, v := range fixtures.Invalid {
		t.Run(v.Name, func(t *testing.T) {
			b, e := hex.DecodeString(v.FrameHex)
			if e != nil {
				t.Fatal(e)
			}
			_, _, e = hap.ReadFrame(bytes.NewReader(b))
			var pe *hap.ProtocolError
			if !errors.As(e, &pe) || pe.Reason != v.Reason {
				t.Fatalf("want %s got %v", v.Reason, e)
			}
		})
	}
}
func TestFrozenFrameBudgetMeasurement(t *testing.T) {
	prefix := `{"jsonrpc":"2.0","id":"c:measure","result":"`
	suffix := `"}`
	p := []byte(prefix + string(bytes.Repeat([]byte{'x'}, hap.MaxFrameBytes-1-len(prefix)-len(suffix))) + suffix)
	b := frame(p, 1)
	durations := make([]time.Duration, 100)
	for i := range durations {
		start := time.Now()
		if _, _, err := hap.ReadFrame(bytes.NewReader(b)); err != nil {
			t.Fatal(err)
		}
		durations[i] = time.Since(start)
	}
	sort.Slice(durations, func(i, j int) bool { return durations[i] < durations[j] })
	t.Logf("frozen frame=%d bytes including kind, batch=%d; %s/%s %s n=100 decode p50=%s p95=%s", hap.MaxFrameBytes, hap.MaxBatchItems, runtime.GOOS, runtime.GOARCH, runtime.Version(), durations[49], durations[94])
}
func TestApplicationDependencyBoundary(t *testing.T) {
	root := filepath.Join("..", "..", "..", "internal", "application")
	err := filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() || filepath.Ext(path) != ".go" {
			return nil
		}
		source, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		for _, forbidden := range []string{`"database/sql"`, `/protocol/hap"`, `/adapters/`, `github.com/cloudwego`, `github.com/ncruces`, `"net/http"`, `"obsidian"`} {
			if bytes.Contains(source, []byte(forbidden)) {
				t.Errorf("application dependency violation %s: %s", path, forbidden)
			}
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestSharedMethodSchemas(t *testing.T) {
	path := filepath.Join("..", "..", "..", "..", "..", "contracts", "hap", "v0.1", "fixtures", "methods.json")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var fixture struct {
		Cases []struct {
			Name, Method, Part string
			Value              json.RawMessage
			Valid              bool
		}
	}
	if err = json.Unmarshal(data, &fixture); err != nil {
		t.Fatal(err)
	}
	for _, c := range fixture.Cases {
		t.Run(c.Name, func(t *testing.T) {
			err := hap.ValidateMethod(c.Method, c.Part, c.Value)
			if (err == nil) != c.Valid {
				t.Fatalf("valid=%v got %v", c.Valid, err)
			}
		})
	}
}

func TestSharedRejectedInstalledParamsUseActualRouter(t *testing.T) {
	path := filepath.Join("..", "..", "..", "..", "..", "contracts", "hap", "v0.1", "fixtures", "methods.json")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var fixture struct {
		Cases []struct {
			Name, Method, Part string
			Value              json.RawMessage
			Valid              bool
		}
	}
	if err = json.Unmarshal(data, &fixture); err != nil {
		t.Fatal(err)
	}
	installed := map[string]bool{"protocol.hello": true, "service.health": true, "service.status": true, "service.diagnostics": true, "service.shutdown": true, "profile.status": true, "host.attach": true, "host.detach": true}
	for _, v := range fixture.Cases {
		if v.Valid || v.Part != "params" || !installed[v.Method] {
			continue
		}
		t.Run(v.Name, func(t *testing.T) {
			client, core, _ := running(t, true)
			if v.Method != "protocol.hello" {
				hello(t, client)
			}
			send(t, client, request("c:invalid", v.Method, v.Value))
			got := receive(t, client)[0]
			if got.Error == nil {
				t.Fatal("invalid schema input reached success")
			}
			if core.API.Service.Stopping() || core.API.Host.Attached() {
				t.Fatal("invalid input caused side effect")
			}
			if v.Method == "protocol.hello" {
				send(t, client, request("c:gate", "service.health", nil))
				if response := receive(t, client)[0]; response.Error == nil || response.Error.Data.Reason != "HELLO_REQUIRED" {
					t.Fatal("bad hello entered ready")
				}
			}
		})
	}
}

func TestEmbeddedSchemaCopyMatchesPublicContract(t *testing.T) {
	public, err := os.ReadFile(filepath.Join("..", "..", "..", "..", "..", "contracts", "hap", "v0.1", "schema.json"))
	if err != nil {
		t.Fatal(err)
	}
	embedded, err := os.ReadFile(filepath.Join("..", "..", "..", "internal", "protocol", "hap", "schema_generated.json"))
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(public, embedded) {
		t.Fatal("Go embedded schema drifted from public contract; run generate.mjs")
	}
}
