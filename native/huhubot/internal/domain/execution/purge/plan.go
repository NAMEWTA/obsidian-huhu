package purge

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"
)

// Selection is persisted with the preview. Profile full clear rejects retention;
// DataErased records the committed SQL phase while WAL cleanup is still pending.
type Selection struct {
	DataErased      bool     `json:"dataErased,omitempty"`
	MemoryFence     string   `json:"memoryFence,omitempty"`
	KeepPinned      bool     `json:"keepPinned"`
	KeepGlobal      bool     `json:"keepGlobal"`
	RetainMemoryIDs []string `json:"retainMemoryIds,omitempty"`
}

type Plan struct {
	Token          string
	ProfileID      string
	CommandEpoch   uint64
	Revision       uint64
	NextEpoch      uint64
	NextProfileID  string
	Selection      Selection
	UnknownEffects int
	ExpiresAt      time.Time
}

func NewToken() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		panic(fmt.Errorf("purge token entropy unavailable: %w", err))
	}
	return "purge:" + hex.EncodeToString(b[:])
}

func (p Plan) Valid(now time.Time) bool {
	return p.Token != "" && p.ProfileID != "" && p.CommandEpoch > 0 && p.NextEpoch > p.CommandEpoch && now.Before(p.ExpiresAt)
}
