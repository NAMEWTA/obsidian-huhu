package credentials

import (
	"bytes"
	"encoding/binary"
	"strings"
	"testing"
)

func requestFrame(op byte, meta string, secret []byte) []byte {
	p := make([]byte, 8+len(meta)+len(secret))
	binary.BigEndian.PutUint32(p, uint32(len(p)-4))
	p[4] = 1
	p[5] = op
	binary.BigEndian.PutUint16(p[6:], uint16(len(meta)))
	copy(p[8:], meta)
	copy(p[8+len(meta):], secret)
	return p
}

func TestPrivateFramesRejectAmbiguityAndUnsafeBounds(t *testing.T) {
	meta := `{"requestId":"request:0123456789abcdef0123456789abcdef","profileId":"profile:test","credentialRef":"credential:0123456789abcdef0123456789abcdef","storagePreference":"protected"}`
	valid := requestFrame(1, meta, []byte(sentinel))
	for n := 1; n < len(valid); n++ {
		if _, e := readRequest(bytes.NewReader(valid[:n])); e == nil {
			t.Fatalf("half frame accepted at %d", n)
		}
	}
	cases := map[string][]byte{
		"oversized body":     {0, 1, 0, 0},
		"oversized metadata": requestFrame(1, strings.Repeat(" ", MaxMetadataBytes+1), []byte("s")),
		"oversized secret":   requestFrame(1, meta, bytes.Repeat([]byte{'s'}, MaxSecretBytes+1)),
		"duplicate":          requestFrame(1, strings.Replace(meta, `"profileId":"profile:test"`, `"profileId":"profile:test","profileId":"profile:test"`, 1), []byte("s")),
		"unknown":            requestFrame(1, strings.Replace(meta, `"storagePreference"`, `"unknown"`, 1), []byte("s")),
		"null":               requestFrame(1, strings.Replace(meta, `"profile:test"`, `null`, 1), []byte("s")),
		"bad utf8":           requestFrame(1, strings.Replace(meta, "profile:test", string([]byte{0xff}), 1), []byte("s")),
		"bad ref":            requestFrame(1, strings.Replace(meta, "credential:", "credential:X", 1), []byte("s")),
		"empty secret":       requestFrame(1, meta, nil),
		"op":                 requestFrame(4, meta, []byte("s")),
		"status tail":        requestFrame(3, strings.Replace(meta, `,"storagePreference":"protected"`, "", 1), []byte("s")),
		"hello extra":        requestFrame(0, meta, nil),
	}
	version := append([]byte(nil), valid...)
	version[4] = 2
	cases["version"] = version
	for name, p := range cases {
		t.Run(name, func(t *testing.T) {
			if _, err := readRequest(bytes.NewReader(p)); err != errProtocol {
				t.Fatalf("unsafe frame accepted: %v", err)
			}
		})
	}
}

func TestLibuvCRTTable32And64BitBounds(t *testing.T) {
	for _, width := range []int{4, 8} {
		t.Run(string(rune('0'+width)), func(t *testing.T) {
			p := make([]byte, 4+5+5*width)
			copy(p, []byte{5, 0, 0, 0, 1, 1, 1, 9, 9})
			for i, h := range []uint64{11, 12, 13, 0x1234, 0x5678} {
				if width == 4 {
					binary.LittleEndian.PutUint32(p[9+i*width:], uint32(h))
				} else {
					binary.LittleEndian.PutUint64(p[9+i*width:], h)
				}
			}
			h, e := parseCRTTable(p, width)
			if e != nil || h != [2]uint64{0x1234, 0x5678} {
				t.Fatal(h, e)
			}
			for n := 0; n < len(p); n++ {
				if _, e = parseCRTTable(p[:n], width); e == nil {
					t.Fatalf("truncated table accepted: %d", n)
				}
			}
			for _, mutation := range []func([]byte){func(q []byte) { q[0] = 4 }, func(q []byte) { q[0] = 0xff; q[1] = 0xff }, func(q []byte) { q[7] = 1 }, func(q []byte) {
				for i := 0; i < width; i++ {
					q[9+3*width+i] = 0
				}
			}, func(q []byte) {
				for i := 0; i < width; i++ {
					q[9+3*width+i] = 0xff
				}
			}, func(q []byte) { copy(q[9+4*width:], q[9+3*width:9+4*width]) }, func(q []byte) { copy(q[9+3*width:], q[9:9+width]) }} {
				q := append([]byte(nil), p...)
				mutation(q)
				if _, e = parseCRTTable(q, width); e == nil {
					t.Fatal("unsafe CRT table accepted")
				}
			}
			if _, e = parseCRTTable(p, 16); e == nil {
				t.Fatal("unknown ABI accepted")
			}
		})
	}
}
func TestPrivateRegisterPreservesRawSecret(t *testing.T) {
	secret := []byte("HUHU-CREDENTIAL-SENTINEL\x00\n")
	p := requestFrame(1, `{"requestId":"request:0123456789abcdef0123456789abcdef","profileId":"profile:test","credentialRef":"credential:0123456789abcdef0123456789abcdef","storagePreference":"session-memory"}`, secret)
	r, err := readRequest(bytes.NewReader(p))
	if err != nil {
		t.Fatal(err)
	}
	if r.op != 1 || r.meta.StoragePreference != "session-memory" || !bytes.Equal(r.secret, secret) {
		t.Fatal("raw credential changed")
	}
}
