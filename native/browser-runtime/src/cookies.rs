//! Independent read-only reader for a caller-owned source snapshot. No Agent/PTY runtime is involved.
use rusqlite::{types::ValueRef, Connection, OpenFlags};
use serde_json::{json, Map, Value};
use std::{collections::HashSet, path::Path, time::Duration};

pub fn read_request(input: &str) -> Result<Value, String> {
    if input.len() > 32 * 1024 { return Err("source_request_invalid".into()); }
    let request: Value = serde_json::from_str(input).map_err(|_| "source_request_invalid")?;
    read(&request).map_err(|_| "source_unavailable".to_string())
}
fn read(request: &Value) -> Result<Value, Box<dyn std::error::Error>> {
    let file = request["path"].as_str().ok_or("missing path")?;
    let kind = request["kind"].as_str().ok_or("missing kind")?;
    if !Path::new(file).is_absolute() || !["chromium", "firefox"].contains(&kind) { return Err("invalid request".into()); }
    let metadata = std::fs::symlink_metadata(file)?;
    if !metadata.is_file() || metadata.file_type().is_symlink() || metadata.len() > 256 * 1024 * 1024 { return Err("invalid snapshot".into()); }
    let db = Connection::open_with_flags(file, OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX)?;
    db.busy_timeout(Duration::from_secs(3))?;
    db.execute_batch("PRAGMA query_only=ON; PRAGMA trusted_schema=OFF;")?;
    let table = if kind == "chromium" { "cookies" } else { "moz_cookies" };
    let mut columns_stmt = db.prepare(&format!("PRAGMA table_info({table})"))?;
    let columns = columns_stmt.query_map([], |row| row.get::<_, String>(1))?.collect::<Result<Vec<_>, _>>()?;
    let known: HashSet<&str> = columns.iter().map(String::as_str).collect();
    let mapping: &[(&str, &str)] = if kind == "chromium" {
        &[("host_key","host_key"),("name","name"),("value","value"),("encrypted_value","encrypted_value_hex"),("path","path"),
          ("expires_utc","expires_utc"),("is_secure","is_secure"),("is_httponly","is_httponly"),("samesite","samesite"),
          ("has_expires","has_expires"),("top_frame_site_key","top_frame_site_key"),("has_cross_site_ancestor","has_cross_site_ancestor"),
          ("is_same_party","is_same_party"),("priority","priority"),("source_scheme","source_scheme"),("source_port","source_port")]
    } else {
        &[("host","host_key"),("name","name"),("value","value"),("path","path"),("expiry","expiry"),("isSecure","is_secure"),
          ("isHttpOnly","is_httponly"),("sameSite","samesite"),("originAttributes","origin_attributes")]
    };
    for required in [if kind == "chromium" { "host_key" } else { "host" }, "name", "value", "path"] {
        if !known.contains(required) { return Err("unsupported schema".into()); }
    }
    let fields: Vec<String> = mapping.iter().map(|(column, _)| if known.contains(column) { format!("\"{column}\"") } else { "NULL".into() }).collect();
    let mut statement = db.prepare(&format!("SELECT {} FROM {table} LIMIT 50001", fields.join(",")))?;
    let mut cursor = statement.query([])?;
    let mut rows = Vec::new(); let mut bytes = 0usize;
    while let Some(row) = cursor.next()? {
        if rows.len() >= 50000 { return Err("too many rows".into()); }
        let mut result = Map::new();
        for (index, (_, name)) in mapping.iter().enumerate() {
            let value = match row.get_ref(index)? {
                ValueRef::Null => Value::Null,
                ValueRef::Integer(value) => if ["expires_utc", "expiry"].contains(name) { Value::String(value.to_string()) } else { json!(value) },
                ValueRef::Text(value) => Value::String(std::str::from_utf8(value)?.to_owned()),
                ValueRef::Blob(value) if *name == "encrypted_value_hex" => Value::String(value.iter().map(|byte| format!("{byte:02x}")).collect()),
                _ => return Err("unsupported value".into()),
            };
            result.insert((*name).into(), value);
        }
        bytes += serde_json::to_vec(&result)?.len();
        if bytes > 64 * 1024 * 1024 { return Err("snapshot too large".into()); }
        rows.push(Value::Object(result));
    }
    let version: Option<String> = if kind == "chromium" {
        db.query_row("SELECT value FROM meta WHERE key='version'", [], |row| {
            Ok(match row.get_ref(0)? { ValueRef::Integer(value) => Some(value.to_string()), ValueRef::Text(value) => std::str::from_utf8(value).ok().map(str::to_owned), _ => None })
        }).ok().flatten()
    } else { None };
    Ok(json!({"schemaVersion":2,"kind":kind,"databaseVersion":version,"columns":columns,"rows":rows}))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn preserves_partition_container_and_large_integer_semantics() {
        let file = std::env::temp_dir().join(format!("huhu-native-cookie-reader-{}.sqlite", std::process::id()));
        let _ = std::fs::remove_file(&file);
        let db = Connection::open(&file).unwrap();
        db.execute_batch("CREATE TABLE meta(key TEXT,value TEXT);INSERT INTO meta VALUES('version','24');CREATE TABLE cookies(host_key TEXT,name TEXT,value TEXT,encrypted_value BLOB,path TEXT,expires_utc INTEGER,is_secure INTEGER,is_httponly INTEGER,samesite INTEGER,top_frame_site_key TEXT,has_cross_site_ancestor INTEGER);INSERT INTO cookies VALUES('.example.test','sid','',X'763130ff','/',13390000000000001,1,1,1,'https://top.test',1);CREATE TABLE moz_cookies(host TEXT,name TEXT,value TEXT,path TEXT,expiry INTEGER,isSecure INTEGER,isHttpOnly INTEGER,sameSite INTEGER,originAttributes TEXT);INSERT INTO moz_cookies VALUES('example.test','sid','value','/',1800000000,1,1,2,'^userContextId=2');").unwrap();
        drop(db);
        let chromium = read_request(&json!({"path":file,"kind":"chromium"}).to_string()).unwrap();
        assert_eq!(chromium["rows"][0]["expires_utc"], "13390000000000001");
        assert_eq!(chromium["rows"][0]["top_frame_site_key"], "https://top.test");
        assert_eq!(chromium["rows"][0]["has_cross_site_ancestor"], 1);
        assert_eq!(chromium["rows"][0]["encrypted_value_hex"], "763130ff");
        assert_eq!(chromium["databaseVersion"], "24");
        let firefox = read_request(&json!({"path":file,"kind":"firefox"}).to_string()).unwrap();
        assert_eq!(firefox["rows"][0]["origin_attributes"], "^userContextId=2");
        std::fs::remove_file(file).unwrap();
    }
    #[test]
    fn missing_source_never_creates_a_database() {
        let file = std::env::temp_dir().join(format!("huhu-native-cookie-missing-{}.sqlite", std::process::id()));
        let _ = std::fs::remove_file(&file);
        assert!(read_request(&json!({"path":file,"kind":"chromium"}).to_string()).is_err());
        assert!(!file.exists());
    }
}
