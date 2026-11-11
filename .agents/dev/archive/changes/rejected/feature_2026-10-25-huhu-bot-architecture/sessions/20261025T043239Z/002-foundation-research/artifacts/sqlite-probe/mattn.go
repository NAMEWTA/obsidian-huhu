//go:build mattn

package main

import (
	"context"
	"database/sql"
	"fmt"
	s "github.com/mattn/go-sqlite3"
	"net/url"
)

const driverName = "mattn/go-sqlite3@v1.14.52"

func openDriver(path string) (*sql.DB, error) {
	return sql.Open("sqlite3", "file:"+url.PathEscape(path)+"?_busy_timeout=150&_foreign_keys=on")
}
func backup(src *sql.DB, path string) error {
	dst, e := openDriver(path)
	if e != nil {
		return e
	}
	defer dst.Close()
	sc, e := src.Conn(context.Background())
	if e != nil {
		return e
	}
	defer sc.Close()
	dc, e := dst.Conn(context.Background())
	if e != nil {
		return e
	}
	defer dc.Close()
	return sc.Raw(func(sconn any) error {
		return dc.Raw(func(dconn any) error {
			b, e := dconn.(*s.SQLiteConn).Backup("main", sconn.(*s.SQLiteConn), "main")
			if e != nil {
				return e
			}
			done, e := b.Step(-1)
			if e != nil {
				b.Finish()
				return e
			}
			if !done {
				b.Finish()
				return fmt.Errorf("backup incomplete")
			}
			return b.Finish()
		})
	})
}
