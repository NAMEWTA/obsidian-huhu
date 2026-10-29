package base

import "testing"

func TestSQLiteDSNKeepsUnixPathAndWindowsDrive(t *testing.T) {
	unix := sqliteDSN("/tmp/profile.sqlite3")
	if unix != "file:///tmp/profile.sqlite3?_pragma=busy_timeout%28150%29&_pragma=foreign_keys%281%29" {
		t.Fatal(unix)
	}
	windows := sqliteDSN(`C:\Users\runner\AppData\Local\Temp\profile.sqlite3`)
	if windows != "file:///C:/Users/runner/AppData/Local/Temp/profile.sqlite3?_pragma=busy_timeout%28150%29&_pragma=foreign_keys%281%29" {
		t.Fatal(windows)
	}
	forward := sqliteDSN("C:/Users/runner/profile.sqlite3")
	if forward != "file:///C:/Users/runner/profile.sqlite3?_pragma=busy_timeout%28150%29&_pragma=foreign_keys%281%29" {
		t.Fatal(forward)
	}
}
