package foundation_test

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"io"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

func frame(payload []byte, kind byte) []byte {
	b := make([]byte, 5+len(payload))
	binary.BigEndian.PutUint32(b, uint32(len(payload)+1))
	b[4] = kind
	copy(b[5:], payload)
	return b
}

func TestFramesRejectCorruptionBeforeDispatch(t *testing.T) {
	valid := []byte(`{"jsonrpc":"2.0","id":"c:1","method":"service.health"}`)
	cases := map[string][]byte{
		"zero":        {0, 0, 0, 0},
		"half-prefix": {0, 0},
		"half-body":   {0, 0, 0, 5, 1, 123},
		"kind":        frame(valid, 2),
		"utf8":        frame([]byte{0xff}, 1),
		"json":        frame([]byte(`{"private":"secret"`), 1),
		"shape":       frame([]byte(`{"jsonrpc":"2.0","id":4,"method":"service.health"}`), 1),
		"batch-empty": frame([]byte(`[]`), 1),
		"batch-nine":  frame([]byte(`[`+string(bytes.Repeat(append(valid, ','), 8))+string(valid)+`]`), 1),
		"oversize":    {0, 16, 0, 1},
	}
	for name, b := range cases {
		t.Run(name, func(t *testing.T) {
			if _, _, err := hap.ReadFrame(bytes.NewReader(b)); err == nil {
				t.Fatal("accepted corrupt input")
			}
		})
	}
}

type byteReader struct{ *bytes.Reader }

func (r byteReader) Read(p []byte) (int, error) {
	if len(p) > 1 {
		p = p[:1]
	}
	return r.Reader.Read(p)
}

func TestFramesFragmentationCoalescingAndExactBoundary(t *testing.T) {
	p := []byte(`{"jsonrpc":"2.0","id":"c:1","method":"service.health"}`)
	b := append(frame(p, 1), frame(p, 1)...)
	r := byteReader{bytes.NewReader(b)}
	for range 2 {
		env, batch, err := hap.ReadFrame(r)
		if err != nil || batch || len(env) != 1 || env[0].Method != "service.health" {
			t.Fatalf("decode: %#v %v %v", env, batch, err)
		}
	}
	if _, _, err := hap.ReadFrame(r); err != io.EOF {
		t.Fatalf("EOF: %v", err)
	}
	var payload map[string]any
	if err := json.Unmarshal(p, &payload); err != nil {
		t.Fatal(err)
	}
	var out bytes.Buffer
	if err := hap.WriteFrame(&out, payload); err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(out.Bytes(), frame(p, 1)) { // JSON member order may vary; decode proves envelope instead.
		if _, _, err := hap.ReadFrame(&out); err != nil {
			t.Fatal(err)
		}
	}
}

func TestExactFrameAndBatchLimits(t *testing.T) {
	prefix := `{"jsonrpc":"2.0","id":"c:boundary","result":"`
	suffix := `"}`
	p := []byte(prefix + string(bytes.Repeat([]byte{'x'}, hap.MaxFrameBytes-1-len(prefix)-len(suffix))) + suffix)
	b := frame(p, 1)
	if len(b) != hap.MaxFrameBytes+4 {
		t.Fatal("bad boundary fixture")
	}
	if _, _, err := hap.ReadFrame(bytes.NewReader(b)); err != nil {
		t.Fatal("rejected exact limit", err)
	}
	var out bytes.Buffer
	if err := hap.WriteFrame(&out, json.RawMessage(p)); err != nil {
		t.Fatal(err)
	}
	if out.Len() != len(b) {
		t.Fatal("wrong length includes-kind convention")
	}
	p = append(p[:len(p)-2], []byte(`x"}`)...)
	if err := hap.WriteFrame(&out, json.RawMessage(p)); err == nil {
		t.Fatal("accepted over-limit encode")
	}
	item := []byte(`{"jsonrpc":"2.0","id":"c:1","method":"service.health"}`)
	entries := make([]json.RawMessage, 8)
	for i := range entries {
		entries[i] = item
	}
	out.Reset()
	if err := hap.WriteFrame(&out, entries); err != nil {
		t.Fatal(err)
	}
	if es, batch, err := hap.ReadFrame(&out); err != nil || !batch || len(es) != 8 {
		t.Fatalf("batch 8: %v %v %d", err, batch, len(es))
	}
}
