package main

import (
	"database/sql"
	"fmt"
	_ "github.com/cloudwego/eino-ext/components/model/agenticclaude"
	_ "github.com/cloudwego/eino-ext/components/model/agenticopenai"
	_ "github.com/cloudwego/eino-ext/components/model/claude"
	_ "github.com/cloudwego/eino-ext/components/model/openai"
	"github.com/cloudwego/eino/schema"
	_ "github.com/ncruces/go-sqlite3/driver"
	"runtime"
)

func main() {
	m := schema.UserMessage("probe")
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		panic(err)
	}
	defer db.Close()
	var sqliteVersion string
	if err := db.QueryRow("SELECT sqlite_version()").Scan(&sqliteVersion); err != nil {
		panic(err)
	}
	fmt.Printf("eino adapter imports compiled: %s %s; sqlite=%s\n", runtime.Version(), m.Role, sqliteVersion)
}
