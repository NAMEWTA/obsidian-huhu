package foundation_test

import (
	"encoding/json"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"os"
	"testing"
)

func TestTaskConfigurationCanonicalGolden(t *testing.T) {
	b, e := os.ReadFile("../../../../../contracts/hap/v0.1/fixtures/task-config-hash.json")
	if e != nil {
		t.Fatal(e)
	}
	var fixture struct {
		Cases []struct {
			Name              string
			Config            api.TaskConfigDraft
			ConfigurationHash string
		}
	}
	if e = json.Unmarshal(b, &fixture); e != nil {
		t.Fatal(e)
	}
	if len(fixture.Cases) != 8 {
		t.Fatal("golden case count")
	}
	for _, c := range fixture.Cases {
		if got := api.CanonicalTaskConfigHash(c.Config); got != c.ConfigurationHash {
			t.Errorf("%s: %s != %s", c.Name, got, c.ConfigurationHash)
		}
	}
	if fixture.Cases[6].ConfigurationHash != fixture.Cases[7].ConfigurationHash {
		t.Fatal("omitted lists differ from empty")
	}
}

func TestEffectFingerprintGolden(t *testing.T) {
	b, e := os.ReadFile("../../../../../contracts/hap/v0.1/fixtures/effect-fingerprint.json")
	if e != nil {
		t.Fatal(e)
	}
	var fixture struct {
		Cases []struct {
			Name        string
			Command     api.HostInvokeCommand
			Fingerprint string
		}
	}
	if e = json.Unmarshal(b, &fixture); e != nil {
		t.Fatal(e)
	}
	if len(fixture.Cases) != 4 {
		t.Fatal("fingerprint golden count")
	}
	for _, c := range fixture.Cases {
		if got := api.EffectFingerprint(c.Command); got != c.Fingerprint {
			t.Errorf("%s %s != %s", c.Name, got, c.Fingerprint)
		}
	}
	if fixture.Cases[0].Fingerprint != fixture.Cases[1].Fingerprint {
		t.Fatal("read-only lookup lease changed original effect fingerprint")
	}
}
