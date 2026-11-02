package foundation_test

import (
	"bytes"
	"encoding/json"
	"strconv"
	"strings"
	"testing"
	"unicode/utf8"

	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

func TestMethodTextUnicodeBoundaries(t *testing.T) {
	for _, glyph := range []struct{ name, text string }{{"ASCII", "x"}, {"Chinese", "测"}, {"Supplementary", "😀"}} {
		for _, field := range []string{"client.name", "client.version", "workspaceId", "capabilities[0]"} {
			for _, count := range []int{128, 129} {
				name := glyph.name + "/" + field + "/" + strconv.Itoa(count)
				t.Run(name, func(t *testing.T) {
					value := strings.Repeat(glyph.text, count)
					method := "protocol.hello"
					params := map[string]any{"protocolVersion": "0.1", "client": map[string]any{"name": "unicode-boundary", "version": "1"}}
					switch field {
					case "client.name":
						params["client"].(map[string]any)["name"] = value
					case "client.version":
						params["client"].(map[string]any)["version"] = value
					default:
						method = "host.attach"
						params = map[string]any{"workspaceId": "vault:unicode", "capabilities": []string{"note.read"}}
						if field == "workspaceId" {
							params["workspaceId"] = value
						} else {
							params["capabilities"] = []string{value}
						}
					}
					raw, err := json.Marshal(params)
					if err != nil {
						t.Fatal(err)
					}
					schemaAccepts := wire.ValidateMethod(method, "params", raw) == nil
					if schemaAccepts != (count == 128) {
						t.Fatalf("schema boundary mismatch: runes=%d UTF8bytes=%d accepts=%v", utf8.RuneCountInString(value), len(value), schemaAccepts)
					}
					client, core, _ := running(t, true)
					if method == "host.attach" {
						hello(t, client)
					}
					send(t, client, request("c:unicode", method, params))
					got := receive(t, client)[0]
					if schemaAccepts {
						if got.Error != nil {
							t.Fatalf("schema-valid %d codepoints/%d UTF8bytes rejected by router/application: %s", count, len(value), got.Error.Data.Reason)
						}
						if method == "host.attach" && !core.API.Host.Attached() {
							t.Fatal("valid Host lease was not installed")
						}
					} else {
						if got.Error == nil || got.Error.Data.Kind != "INVALID_ARGUMENT" {
							t.Fatal("over-limit method text accepted")
						}
						if core.API.Host.Attached() {
							t.Fatal("invalid Host params installed a lease")
						}
						if method == "protocol.hello" {
							send(t, client, request("c:still-gated", "service.health", nil))
							if e := receive(t, client)[0]; e.Error == nil || e.Error.Data.Reason != "HELLO_REQUIRED" {
								t.Fatal("invalid text completed hello")
							}
						}
					}
				})
			}
		}
	}
}

func TestWireIdentifiersKeepUTF8ByteLimit(t *testing.T) {
	for _, glyph := range []struct{ name, text string }{{"ASCII", "x"}, {"Chinese", "测"}, {"Supplementary", "😀"}} {
		for _, field := range []string{"id", "method"} {
			for _, size := range []int{128, 129} {
				t.Run(glyph.name+"/"+field+"/"+strconv.Itoa(size), func(t *testing.T) {
					prefix := ""
					if field == "id" {
						prefix = "c:"
					}
					content := prefix + strings.Repeat(glyph.text, (size-len(prefix))/len(glyph.text))
					content += strings.Repeat("x", size-len(content))
					if len(content) != size {
						t.Fatal("invalid UTF8 byte-boundary fixture")
					}
					envelope := request("c:wire", "service.health", nil)
					envelope[field] = content
					var encoded bytes.Buffer
					if err := wire.WriteFrame(&encoded, envelope); err != nil {
						t.Fatal(err)
					}
					_, _, err := wire.ReadFrame(&encoded)
					if (err == nil) != (size == 128) {
						t.Fatalf("wire %s must use UTF8 bytes: bytes=%d codepoints=%d error=%v", field, size, utf8.RuneCountInString(content), err)
					}
				})
			}
		}
	}
}
