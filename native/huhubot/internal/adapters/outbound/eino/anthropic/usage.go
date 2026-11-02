package anthropic

import (
	"encoding/json"
	"strconv"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/common"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// Usage fields are cumulative snapshots, not independent delta charges. The
// cache TTL and thinking breakdowns are already included in these four totals.
type usageState struct {
	values               [4]int64
	present              [4]bool
	tainted, finalOutput bool
}

const maxSafeTokens int64 = 1<<53 - 1

func (u *usageState) update(raw []byte, delta bool) {
	object, err := readObject(raw, common.MaxEventBytes)
	if err != nil {
		u.tainted = true
		return
	}
	for i, key := range []string{"input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens", "output_tokens"} {
		value, exists := object[key]
		if !exists {
			continue
		}
		var count int64
		if string(value) == "null" || json.Unmarshal(value, &count) != nil || count < 0 || count > maxSafeTokens {
			u.tainted = true
			continue
		}
		if u.present[i] && count < u.values[i] {
			u.tainted = true
		}
		u.values[i], u.present[i] = count, true
		if delta && i == 3 {
			u.finalOutput = true
		}
	}
}

func (u *usageState) observation() api.AttemptObservation {
	unknown := api.AttemptObservation{Knowledge: "unknown"}
	if u.tainted || !u.finalOutput {
		return unknown
	}
	for _, present := range u.present {
		if !present {
			return unknown
		}
	}
	input := u.values[0]
	for _, count := range u.values[1:3] {
		if count > maxSafeTokens-input {
			return unknown
		}
		input += count
	}
	return api.AttemptObservation{Knowledge: "known", InputTokens: strconv.FormatInt(input, 10), OutputTokens: strconv.FormatInt(u.values[3], 10)}
}
