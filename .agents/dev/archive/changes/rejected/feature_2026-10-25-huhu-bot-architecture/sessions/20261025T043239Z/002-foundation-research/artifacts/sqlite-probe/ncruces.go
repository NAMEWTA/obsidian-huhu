//go:build ncruces

package main

import (
	"context"
	"database/sql"
	d "github.com/ncruces/go-sqlite3/driver"
	"net/url"
)

const driverName = "ncruces/go-sqlite3@v0.35.6"

func openDriver(path string) (*sql.DB, error) {
	return d.Open("file:" + url.PathEscape(path) + "?_pragma=busy_timeout(150)&_pragma=foreign_keys(1)")
}
func backup(src *sql.DB, path string) error {
	c, e := src.Conn(context.Background())
	if e != nil {
		return e
	}
	defer c.Close()
	return c.Raw(func(conn any) error { return conn.(d.Conn).Raw().Backup("main", path) })
}
