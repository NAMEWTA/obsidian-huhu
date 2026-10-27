package foundation_test

import (
	"encoding/json"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
	"testing"
)

// The old reserved DTO accepted ownerId/private and had no actual context projection.
// This checks a concrete schema behavior using only pre-existing public validators.
func TestMemoryTypedNamespaceAndActualContextContract(t *testing.T) {
	for method, raw := range map[string]string{
		"memory.list": `{"profileId":"profile:1","namespace":{"kind":"agent","id":"agent:a"},"kind":"item","limit":20}`,
		"memory.get":  `{"profileId":"profile:1","namespace":{"kind":"agent","id":"agent:a"},"kind":"context","id":"run:1","limit":20}`,
	} {
		if err := wire.ValidateMethod(method, "params", json.RawMessage(raw)); err != nil {
			t.Errorf("typed %s rejected: %v", method, err)
		}
	}
}
