package effectreconcile_test

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestActualTSGoProductionNoteHost(t *testing.T) {
	repo, e := filepath.Abs("../../../../..")
	if e != nil {
		t.Fatal(e)
	}
	binary, e := os.Executable()
	if e != nil {
		t.Fatal(e)
	}
	temp := t.TempDir()
	profileRoot := filepath.Join(temp, "profiles")
	if e = os.Mkdir(profileRoot, 0700); e != nil {
		t.Fatal(e)
	}
	fixture, e := os.ReadFile("host-fixture.mjs")
	if e != nil {
		t.Fatal(e)
	}
	source := filepath.Join(temp, "fixture.mjs")
	bundle := filepath.Join(temp, "fixture.cjs")
	if e = os.WriteFile(source, []byte(strings.ReplaceAll(string(fixture), "__REPO__", filepath.ToSlash(repo))), 0600); e != nil {
		t.Fatal(e)
	}
	script := `import {build} from 'esbuild';await build({entryPoints:[process.argv[1]],outfile:process.argv[2],bundle:true,platform:'node',format:'cjs',target:'node22',alias:{obsidian:process.argv[3]},logLevel:'error'});`
	cmd := exec.Command("node", "--input-type=module", "-e", script, source, bundle, filepath.Join(repo, "native/huhubot/tests/contract/effect-reconcile/obsidian-fixture.mjs"))
	cmd.Dir = repo
	if output, e := cmd.CombinedOutput(); e != nil {
		t.Fatalf("bundle: %v\n%s", e, output)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	cmd = exec.CommandContext(ctx, "node", bundle, binary, profileRoot)
	cmd.Dir = repo
	output, e := cmd.CombinedOutput()
	t.Logf("actual controlled-boundary observations: %s", output)
	if e != nil {
		t.Fatalf("actual TS/Go Host: %v", e)
	}
	if !strings.Contains(string(output), "single-request-cancel-sibling-and-late-vault") {
		t.Fatal("missing final observation")
	}
}
