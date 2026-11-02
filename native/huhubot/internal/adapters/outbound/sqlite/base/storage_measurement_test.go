package base

import (
	"bufio"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
	"github.com/ncruces/go-sqlite3"
)

// This opt-in fixture measures SQLite primitives with the production opener,
// pragmas and driver. It deliberately owns SQL transactions itself to compare
// checkpoint candidates; it is NOT a benchmark of the production scheduler.
// Busy/partial PASSIVE completion cannot reopen admission while a reader pins
// frames: https://www.sqlite.org/c3ref/wal_checkpoint_v2.html .
type storageSample struct {
	AdmissionWaitNS  int64 `json:"admission_wait_ns"`
	ConnectionWaitNS int64 `json:"connection_wait_ns"`
	BeginNS          int64 `json:"begin_ns"`
	WorkNS           int64 `json:"work_ns"`
	CommitNS         int64 `json:"commit_ns"`
	FullSetNS        int64 `json:"full_set_ns"`
	FullRestoreNS    int64 `json:"full_restore_ns"`
	Durable          bool  `json:"durable"`
}
type checkpointSample struct {
	DurationNS                 int64 `json:"duration_ns"`
	Busy, Frames, Checkpointed int
	Error                      string `json:"error,omitempty"`
}
type storageCase struct {
	Mode, Reader    string
	Threshold       int64
	Samples         []storageSample
	Checkpoints     []checkpointSample
	BlockedRequests int
	WALPeakBytes    int64
	WALAfterBytes   int64
	// OS-reported allocation, never inferred from logical file length.
	AllocatedBytes                       *int64
	AllocationError                      string `json:"allocation_error,omitempty"`
	ElapsedNS, CloseSyncNS, CloseTotalNS int64
	CommitP50NS, CommitP95NS             int64
	TransactionsPerSecond                float64
	Rows                                 int
}
type storageMeasurement struct {
	Schema                  int
	GOOS, GOARCH, GoVersion string
	Driver                  string
	Boundary                string
	Cases                   []storageCase
	RecoveryNS              int64
	RecoveryRows            int
}

func percentile(values []int64, p int) int64 {
	sort.Slice(values, func(i, j int) bool { return values[i] < values[j] })
	return values[(len(values)-1)*p/100]
}
func walBytes(t *testing.T, path string) int64 {
	t.Helper()
	info, err := os.Stat(path + "-wal")
	if os.IsNotExist(err) {
		return 0
	}
	if err != nil {
		t.Fatal(err)
	}
	return info.Size()
}
func measureStorageCase(t *testing.T, mode string, threshold int64, readerMode string) storageCase {
	t.Helper()
	ctx := context.Background()
	path := filepath.Join(t.TempDir(), "profile.sqlite3")
	if err := os.WriteFile(path, nil, 0600); err != nil {
		t.Fatal(err)
	}
	s, err := Open(ctx, &profile.Handle{DatabasePath: path, New: true})
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()
	if _, err = s.Database().Exec("CREATE TABLE measurement(n INTEGER PRIMARY KEY,payload BLOB)"); err != nil {
		t.Fatal(err)
	}
	var reader *sql.DB
	var pinned *sql.Tx
	if readerMode != "none" {
		reader, err = sql.Open("sqlite3", sqliteDSN(path))
		if err != nil {
			t.Fatal(err)
		}
		defer reader.Close()
		pinned, err = reader.BeginTx(ctx, &sql.TxOptions{ReadOnly: true})
		if err != nil {
			t.Fatal(err)
		}
		defer pinned.Rollback()
		var n int
		if err = pinned.QueryRow("SELECT count(*) FROM profile_metadata").Scan(&n); err != nil {
			t.Fatal(err)
		}
	}
	var pageSize int64
	if err = s.Database().QueryRow("PRAGMA page_size").Scan(&pageSize); err != nil {
		t.Fatal(err)
	}
	result := storageCase{Mode: mode, Reader: readerMode, Threshold: threshold}
	checkpoint := func() bool {
		conn, e := s.Database().Conn(ctx)
		if e != nil {
			t.Fatal(e)
		}
		started := time.Now()
		sample := checkpointSample{}
		e = conn.QueryRowContext(ctx, "PRAGMA wal_checkpoint("+mode+")").Scan(&sample.Busy, &sample.Frames, &sample.Checkpointed)
		sample.DurationNS = time.Since(started).Nanoseconds()
		_ = conn.Close()
		if e != nil {
			sample.Error = e.Error()
		}
		result.Checkpoints = append(result.Checkpoints, sample)
		return e == nil && sample.Busy == 0 && sample.Frames == sample.Checkpointed
	}
	started := time.Now()
	// 32 bounded transactions, each 24 x 8 KiB blobs; every fourth is FULL.
	// Candidate gate uses checkpoint completion, not filesystem allocation size,
	// because PASSIVE/RESTART can reuse an allocated WAL without truncating it.
	dirty := int64(0)
	for batch := 0; batch < 32; batch++ {
		sample := storageSample{Durable: batch%4 == 0}
		if dirty >= threshold {
			gate := time.Now()
			complete := checkpoint()
			if !complete {
				result.BlockedRequests++
				// Fixed reader case refuses the next transaction; release case observes
				// three owned retries before releasing its fixture reader. No WAL append.
				if readerMode == "pinned" {
					sample.AdmissionWaitNS = time.Since(gate).Nanoseconds()
					result.Samples = append(result.Samples, sample)
					break
				}
				for retry := 0; retry < 2 && !complete; retry++ {
					time.Sleep(100 * time.Millisecond)
					complete = checkpoint()
					result.BlockedRequests++
				}
				if pinned != nil {
					if err = pinned.Rollback(); err != nil {
						t.Fatal(err)
					}
					pinned = nil
				}
				complete = checkpoint()
			}
			sample.AdmissionWaitNS = time.Since(gate).Nanoseconds()
			if !complete {
				t.Fatal("candidate checkpoint did not complete", mode, readerMode)
			}
			dirty = 0
		}
		begin := time.Now()
		conn, e := s.Database().Conn(ctx)
		sample.ConnectionWaitNS = time.Since(begin).Nanoseconds()
		if e != nil {
			t.Fatal(e)
		}
		// Observe actual WAL frames after commit; unlike file length this also
		// reports frame reuse after PASSIVE/RESTART. Hook only records numbers.
		if e = conn.Raw(func(raw any) error {
			raw.(interface{ Raw() *sqlite3.Conn }).Raw().WALHook(func(_ *sqlite3.Conn, _ string, pages int) error { dirty = 32 + int64(pages)*(pageSize+24); return nil })
			return nil
		}); e != nil {
			t.Fatal(e)
		}
		if sample.Durable {
			begin = time.Now()
			_, e = conn.ExecContext(ctx, "PRAGMA synchronous=FULL")
			sample.FullSetNS = time.Since(begin).Nanoseconds()
			if e != nil {
				t.Fatal(e)
			}
		}
		begin = time.Now()
		tx, e := conn.BeginTx(ctx, nil)
		sample.BeginNS = time.Since(begin).Nanoseconds()
		if e != nil {
			t.Fatal(e)
		}
		begin = time.Now()
		for row := 0; row < 24; row++ {
			if _, e = tx.Exec("INSERT INTO measurement(payload) VALUES(zeroblob(8192))"); e != nil {
				_ = tx.Rollback()
				t.Fatal(e)
			}
		}
		sample.WorkNS = time.Since(begin).Nanoseconds()
		begin = time.Now()
		e = tx.Commit()
		sample.CommitNS = time.Since(begin).Nanoseconds()
		if e != nil {
			t.Fatal(e)
		}
		if sample.Durable {
			begin = time.Now()
			_, e = conn.ExecContext(ctx, "PRAGMA synchronous=NORMAL")
			sample.FullRestoreNS = time.Since(begin).Nanoseconds()
			if e != nil {
				t.Fatal(e)
			}
		}
		_ = conn.Close()
		result.Rows += 24
		result.WALPeakBytes = max(result.WALPeakBytes, walBytes(t, path))
		result.Samples = append(result.Samples, sample)
	}
	result.ElapsedNS = time.Since(started).Nanoseconds()
	if pinned != nil {
		_ = pinned.Rollback()
	}
	checkpoint()
	result.WALAfterBytes = walBytes(t, path)
	if allocated, e := storageAllocatedBytes(path + "-wal"); e != nil {
		result.AllocationError = e.Error()
	} else {
		result.AllocatedBytes = &allocated
	}
	var rows int
	if err = s.Database().QueryRow("SELECT count(*) FROM measurement").Scan(&rows); err != nil || rows != result.Rows {
		t.Fatal(rows, err)
	}
	commits := []int64{}
	for _, sample := range result.Samples {
		if sample.CommitNS > 0 {
			commits = append(commits, sample.CommitNS)
		}
	}
	result.CommitP50NS = percentile(commits, 50)
	result.CommitP95NS = percentile(commits, 95)
	result.TransactionsPerSecond = float64(len(commits)) / time.Duration(result.ElapsedNS).Seconds()
	started = time.Now()
	if err = s.CloseWithSync(func(f *os.File) error {
		begin := time.Now()
		e := f.Sync()
		result.CloseSyncNS = time.Since(begin).Nanoseconds()
		return e
	}); err != nil {
		t.Fatal(err)
	}
	result.CloseTotalNS = time.Since(started).Nanoseconds()
	return result
}
func TestStorageCandidateMatrix(t *testing.T) {
	output := os.Getenv("HUHUBOT_STORAGE_MEASURE")
	if output == "" {
		t.Skip("opt-in storage candidate measurement")
	}
	result := storageMeasurement{Schema: 1, GOOS: runtime.GOOS, GOARCH: runtime.GOARCH, GoVersion: runtime.Version(), Driver: "github.com/ncruces/go-sqlite3 v0.35.6", Boundary: "SQLite primitive candidates; not production scheduler throughput; nanoseconds; allocation uses OS file metadata"}
	for _, mode := range []string{"PASSIVE", "RESTART", "TRUNCATE"} {
		for _, threshold := range []int64{256 * 1024, walRestartBytes} {
			for _, reader := range []string{"none", "pinned", "release"} {
				t.Run(fmt.Sprintf("%s-%d-%s", mode, threshold, reader), func(t *testing.T) {
					result.Cases = append(result.Cases, measureStorageCase(t, mode, threshold, reader))
				})
			}
		}
	}
	result.RecoveryNS, result.RecoveryRows = measureStorageRecovery(t)
	encoded, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		t.Fatal(err)
	}
	if err = os.MkdirAll(filepath.Dir(output), 0700); err != nil {
		t.Fatal(err)
	}
	if err = os.WriteFile(output, append(encoded, '\n'), 0600); err != nil {
		t.Fatal(err)
	}
}

// The parent owns exactly this child, kills only its Process, waits before
// deleting TempDir, then opens the same committed NORMAL WAL. This is process
// crash recovery, never a simulated power-loss durability claim.
func measureStorageRecovery(t *testing.T) (int64, int) {
	t.Helper()
	path := filepath.Join(t.TempDir(), "profile.sqlite3")
	cmd := exec.Command(os.Args[0], "-test.run=^TestStorageRecoveryChild$", "-test.timeout=60s")
	cmd.Env = append(os.Environ(), "HUHUBOT_STORAGE_CHILD="+path)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		t.Fatal(err)
	}
	cmd.Stderr = os.Stderr
	if err = cmd.Start(); err != nil {
		t.Fatal(err)
	}
	waited := false
	defer func() {
		if !waited {
			_ = cmd.Process.Kill()
			_ = cmd.Wait()
		}
	}()
	ready := make(chan bool, 1)
	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			if scanner.Text() == "STORAGE_READY" {
				ready <- true
				return
			}
		}
		ready <- false
	}()
	select {
	case ok := <-ready:
		if !ok {
			t.Fatal("child exited before committed readiness")
		}
	case <-time.After(20 * time.Second):
		t.Fatal("child readiness deadline")
	}
	if err = cmd.Process.Kill(); err != nil {
		t.Fatal(err)
	}
	_ = cmd.Wait()
	waited = true
	started := time.Now()
	s, err := Open(context.Background(), &profile.Handle{DatabasePath: path, New: false})
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()
	var rows int
	if err = s.Database().QueryRow("SELECT count(*) FROM recovery_measurement").Scan(&rows); err != nil || rows != 64 {
		t.Fatal("committed recovery mismatch", rows, err)
	}
	return time.Since(started).Nanoseconds(), rows
}
func TestStorageRecoveryChild(t *testing.T) {
	path := os.Getenv("HUHUBOT_STORAGE_CHILD")
	if path == "" {
		t.Skip("owned recovery subprocess only")
	}
	if err := os.WriteFile(path, nil, 0600); err != nil {
		t.Fatal(err)
	}
	s, err := Open(context.Background(), &profile.Handle{DatabasePath: path, New: true})
	if err != nil {
		t.Fatal(err)
	}
	if err = s.WithinTx(context.Background(), func(tx *sql.Tx) error {
		if _, e := tx.Exec("CREATE TABLE recovery_measurement(payload BLOB)"); e != nil {
			return e
		}
		for range 64 {
			if _, e := tx.Exec("INSERT INTO recovery_measurement VALUES(zeroblob(4096))"); e != nil {
				return e
			}
		}
		return nil
	}); err != nil {
		t.Fatal(err)
	}
	fmt.Println("STORAGE_READY")
	// Keep the handle and dirty WAL alive until the owning parent terminates us.
	time.Sleep(55 * time.Second)
	_ = s.Close()
	t.Fatal("parent did not terminate owned recovery child")
}
