package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"syscall"
	"time"
)

type check struct {
	Name   string `json:"name"`
	Pass   bool   `json:"pass"`
	Detail any    `json:"detail,omitempty"`
	Millis int64  `json:"millis,omitempty"`
}

var checks []check

func must(err error) {
	if err != nil {
		panic(err)
	}
}
func add(name string, pass bool, detail any, start time.Time) {
	checks = append(checks, check{name, pass, detail, time.Since(start).Milliseconds()})
}
func count(db *sql.DB) int {
	var n int
	must(db.QueryRow("SELECT count(*) FROM item").Scan(&n))
	return n
}
func open(path string) *sql.DB {
	db, err := openDriver(path)
	must(err)
	db.SetMaxOpenConns(1)
	must(db.Ping())
	return db
}
func fileLock(path string) (*os.File, error) {
	f, err := os.OpenFile(path, os.O_RDWR|os.O_CREATE, 0600)
	if err != nil {
		return nil, err
	}
	err = syscall.Flock(int(f.Fd()), syscall.LOCK_EX|syscall.LOCK_NB)
	if err != nil {
		f.Close()
		return nil, err
	}
	return f, nil
}
func main() {
	if len(os.Args) > 2 && os.Args[1] == "lock-child" {
		f, e := fileLock(os.Args[2])
		if e != nil {
			fmt.Println("INSTANCE_CONFLICT")
			os.Exit(23)
		}
		defer f.Close()
		fmt.Println("LOCKED")
		return
	}
	if len(os.Args) > 2 && os.Args[1] == "sql-child" {
		db, e := openDriver(os.Args[2])
		if e != nil {
			fmt.Println(e)
			os.Exit(24)
		}
		defer db.Close()
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		defer cancel()
		_, e = db.ExecContext(ctx, "INSERT INTO item(id,body) VALUES(991,'contender')")
		if e != nil {
			fmt.Println(e)
			os.Exit(25)
		}
		fmt.Println("INSERTED")
		return
	}
	root := os.Args[1]
	must(os.MkdirAll(root, 0700))
	path := filepath.Join(root, "profile.sqlite")
	t := time.Now()
	db := open(path)
	defer db.Close()
	var v, j string
	must(db.QueryRow("select sqlite_version()").Scan(&v))
	must(db.QueryRow("PRAGMA journal_mode=WAL").Scan(&j))
	mustExec(db, "PRAGMA synchronous=FULL")
	mustExec(db, "PRAGMA foreign_keys=ON")
	mustExec(db, "PRAGMA wal_autocheckpoint=0")
	mustExec(db, "CREATE TABLE item(id INTEGER PRIMARY KEY,body TEXT NOT NULL)")
	add("open_wal", j == "wal", map[string]any{"sqlite": v, "journal": j, "go": runtime.Version(), "platform": runtime.GOOS + "/" + runtime.GOARCH}, t)
	t = time.Now()
	tx, e := db.Begin()
	must(e)
	_, e = tx.Exec("INSERT INTO item VALUES(1,'committed')")
	must(e)
	must(tx.Commit())
	tx, e = db.Begin()
	must(e)
	_, e = tx.Exec("INSERT INTO item VALUES(2,'rolled back')")
	must(e)
	must(tx.Rollback())
	add("atomic_commit_rollback", count(db) == 1, count(db), t)
	t = time.Now()
	mustExec(db, "CREATE TABLE dependent(item_id INTEGER REFERENCES item(id))")
	_, e = db.Exec("INSERT INTO dependent VALUES(999)")
	add("foreign_key", e != nil, fmt.Sprint(e), t)
	t = time.Now()
	backupPath := filepath.Join(root, "backup.sqlite")
	must(backup(db, backupPath))
	b := open(backupPath)
	var integrity string
	must(b.QueryRow("PRAGMA integrity_check").Scan(&integrity))
	n := count(b)
	b.Close()
	wal, err := os.Stat(path + "-wal")
	var wb int64
	if err == nil {
		wb = wal.Size()
	}
	add("native_online_backup_with_wal", n == 1 && integrity == "ok" && wb > 0, map[string]any{"rows": n, "integrity": integrity, "wal_bytes": wb}, t)
	t = time.Now()
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	var n64 int64
	e = db.QueryRowContext(ctx, "WITH RECURSIVE ctr(x) AS (VALUES(0) UNION ALL SELECT x+1 FROM ctr WHERE x<1000000000) SELECT SUM(x) FROM ctr").Scan(&n64)
	cancel()
	add("running_query_cancel", e != nil && errors.Is(ctx.Err(), context.DeadlineExceeded) && time.Since(t) < time.Second, map[string]any{"error": fmt.Sprint(e), "wraps_context_deadline": errors.Is(e, context.DeadlineExceeded), "rows_after": count(db)}, t)
	t = time.Now()
	tx, e = db.Begin()
	must(e)
	_, e = tx.Exec("INSERT INTO item VALUES(3,'writer held')")
	must(e)
	exe, e := os.Executable()
	must(e)
	out, e := exec.Command(exe, "sql-child", path).CombinedOutput()
	must(tx.Rollback())
	add("cross_process_writer_busy", e != nil && count(db) == 1, map[string]any{"error": fmt.Sprint(e), "child": string(out)}, t)
	t = time.Now()
	aliases := []string{path, filepath.Join(root, "symlink.sqlite"), filepath.Join(root, "hardlink.sqlite")}
	must(os.Symlink(path, aliases[1]))
	must(os.Link(path, aliases[2]))
	lock, e := fileLock(path)
	must(e)
	details := map[string]string{}
	ok := true
	for _, a := range aliases {
		out, e := exec.Command(exe, "lock-child", a).CombinedOutput()
		details[filepath.Base(a)] = string(out)
		if e == nil || string(out) != "INSTANCE_CONFLICT\n" {
			ok = false
		}
	}
	must(lock.Close())
	out, e = exec.Command(exe, "lock-child", aliases[2]).CombinedOutput()
	ok = ok && e == nil && string(out) == "LOCKED\n"
	add("actual_db_inode_lock_all_aliases", ok, details, t)
	t = time.Now()
	must(db.Close())
	db = open(path)
	add("durable_reopen", count(db) == 1, count(db), t)
	must(db.Close())
	t = time.Now()
	badPath := filepath.Join(root, "bad.sqlite")
	bad := []byte("this is not a database and must never be replaced")
	must(os.WriteFile(badPath, bad, 0600))
	badDB, e := openDriver(badPath)
	if e == nil {
		e = badDB.QueryRow("PRAGMA quick_check").Scan(&integrity)
		badDB.Close()
	}
	after, _ := os.ReadFile(badPath)
	add("corruption_no_empty_fallback", e != nil && string(after) == string(bad), fmt.Sprint(e), t)
	result := map[string]any{"driver": driverName, "checks": checks}
	data, e := json.MarshalIndent(result, "", "  ")
	must(e)
	fmt.Println(string(data))
	for _, c := range checks {
		if !c.Pass {
			os.Exit(1)
		}
	}
}
func mustExec(db *sql.DB, s string) { _, e := db.Exec(s); must(e) }
