package base

import "testing"

func TestSQLiteDSNKeepsUnixPathAndWindowsDrive(t *testing.T) {
	unix := sqliteDSN("/tmp/profile.sqlite3")
	if unix != "file:///tmp/profile.sqlite3?_pragma=busy_timeout%28150%29&_pragma=foreign_keys%281%29" {
		t.Fatal(unix)
	}
	windows := sqliteDSN(`C:\Users\runner\AppData\Local\Temp\profile.sqlite3`)
	if windows != "file:C:/Users/runner/AppData/Local/Temp/profile.sqlite3?_pragma=busy_timeout%28150%29&_pragma=foreign_keys%281%29" {
		t.Fatal(windows)
	}
	forward := sqliteDSN("C:/Users/runner/profile.sqlite3")
	if forward != "file:C:/Users/runner/profile.sqlite3?_pragma=busy_timeout%28150%29&_pragma=foreign_keys%281%29" {
		t.Fatal(forward)
	}
	spaced := sqliteDSN(`C:\Users\John Doe\profile.sqlite3`)
	if spaced != "file:C:/Users/John%20Doe/profile.sqlite3?_pragma=busy_timeout%28150%29&_pragma=foreign_keys%281%29" {
		t.Fatal(spaced)
	}
	snapshot := sqliteFileURL(`C:\Users\runner\AppData\Local\Temp\.migration-v1-x\profile.sqlite3`)
	query := snapshot.Query()
	query.Set("mode", "ro")
	query.Set("immutable", "1")
	snapshot.RawQuery = query.Encode()
	if snapshot.String() != "file:C:/Users/runner/AppData/Local/Temp/.migration-v1-x/profile.sqlite3?immutable=1&mode=ro" {
		t.Fatal(snapshot.String())
	}
	unixSnapshot := sqliteFileURL("/tmp/profile.sqlite3")
	if unixSnapshot.String() != "file:///tmp/profile.sqlite3" {
		t.Fatal(unixSnapshot.String())
	}
}
