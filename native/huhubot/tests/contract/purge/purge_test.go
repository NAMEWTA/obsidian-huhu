package purge_test

import (
	"testing"
	"time"

	domain "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/execution/purge"
)

func TestPurgePlanCannotBeReusedAfterExpiry(t *testing.T) {
	now := time.Date(2027, time.January, 2, 3, 4, 5, 0, time.UTC)
	plan := domain.Plan{Token: domain.NewToken(), ProfileID: "profile:old", CommandEpoch: 1, Revision: 1, NextEpoch: 2, ExpiresAt: now.Add(time.Minute)}
	if !plan.Valid(now) {
		t.Fatal("fresh purge plan should be valid")
	}
	if plan.Valid(now.Add(2 * time.Minute)) {
		t.Fatal("expired purge plan must not be executable")
	}
	if plan.NextEpoch <= plan.CommandEpoch {
		t.Fatal("purge plan must rotate command epoch")
	}
}
