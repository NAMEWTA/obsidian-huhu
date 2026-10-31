//! Native history stays read-only. Expensive parsing runs on worker threads, outside the PTY readers.
//! Formats checked against stablyai/orca 27b823f (MIT, Lovecast Inc.).
use rusqlite::{params, Connection, OpenFlags, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::{HashMap, HashSet},
    fs::{self, File},
    io::{BufRead, BufReader, Read},
    path::{Path, PathBuf},
    sync::atomic::{AtomicBool, AtomicU64, Ordering},
    time::{Duration, SystemTime, UNIX_EPOCH},
};

#[derive(Clone, Serialize, Deserialize, Default, Debug)]
#[serde(rename_all = "camelCase")]
struct Usage {
    input: u64,
    output: u64,
    cache_read: u64,
    cache_write: u64,
    cost: Option<f64>,
    known: bool,
    #[serde(default)]
    partial: bool,
}
#[derive(Clone, Serialize, Deserialize, Default, Debug)]
#[serde(rename_all = "camelCase")]
struct Session {
    key: String,
    agent_id: String,
    account_key: String,
    session_id: String,
    cwd: String,
    title: String,
    transcript_path: String,
    modified_at_ms: u64,
    #[serde(default)]
    text: String,
    usage: Usage,
    // Every file consulted by the parser, including optional companions. Old
    // index entries without provenance must be rescanned before account reads.
    #[serde(default)]
    sources: Vec<HistorySource>,
    // Set for a system account: the provider directory of the user's real home that holds
    // every source. Such a row is only trusted while the caller still names that directory.
    #[serde(default)]
    system_base: Option<String>,
    // The history directory (or database file) the session was read from.
    #[serde(default)]
    system_root: Option<String>,
    // Original configured root, retained so an explicit preview can re-open the source with
    // the same admission contract without scanning its body during list/scan.
    #[serde(default)]
    source_root: Option<String>,
    // Admission is explicit so an unavailable source is never represented as an empty body.
    #[serde(default)]
    source_status: String,
    #[serde(default)]
    source_ref: String,
    // Diagnostic detail for a non-available status (for example the snapshot size cap).
    #[serde(default, skip_serializing_if = "String::is_empty")]
    source_reason: String,
    // Metadata computed at scan time (the body itself is never stored in the row).
    #[serde(default)]
    model: String,
    #[serde(default)]
    message_count: u64,
    #[serde(default)]
    created_at_ms: u64,
}
/// A HUHU Space binding that admits an out-of-vault session into the vault projection.
#[derive(Clone, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub(crate) struct OwnedSession {
    agent_id: String,
    session_id: String,
    #[serde(default)]
    account_key: String,
    #[serde(default)]
    device_id: String,
    #[serde(default)]
    transcript_path: String,
    #[serde(default)]
    source_ref: String,
}
/// Which sessions a scan may index: everything of an account, or (vault) sessions whose
/// cwd is inside the vault plus sessions a Space owns.
struct Scope<'a> {
    account: bool,
    owned: &'a [OwnedSession],
    device_id: &'a str,
}
impl Scope<'_> {
    fn admits(&self, vault: &Path, session: &Session) -> bool {
        self.account
            || inside(vault, &session.cwd)
            || owned_by_space(self.owned, self.device_id, session)
    }
}
fn owned_by_space(owned: &[OwnedSession], device_id: &str, session: &Session) -> bool {
    !device_id.is_empty()
        && owned.iter().any(|row| {
            row.agent_id == session.agent_id
                && row.session_id == session.session_id
                && !row.account_key.is_empty()
                && row.account_key == session.account_key
                && row.device_id == device_id
                && !row.transcript_path.is_empty()
                && row.transcript_path == session.transcript_path
                && !row.source_ref.is_empty()
                && row.source_ref == session.source_ref
        })
}
#[derive(Clone, Serialize, Deserialize, Debug)]
struct HistorySource {
    path: PathBuf,
    required: bool,
}
#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Root {
    agent_id: String,
    path: String,
    account_key: String,
    #[serde(default)]
    system_base: Option<String>,
}
#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Request {
    vault: String,
    #[serde(default)]
    device_id: String,
    index: String,
    #[serde(default)]
    roots: Vec<Root>,
    #[serde(default)]
    query: String,
    #[serde(default)]
    metadata: HashMap<String, Value>,
    #[serde(default)]
    filter: String,
    #[serde(default)]
    offset: usize,
    #[serde(default)]
    expected_revision: Option<u64>,
    #[serde(default)]
    scope: String,
    #[serde(default)]
    key: String,
    // Provider directories of system accounts the caller currently reads, and their history sources.
    #[serde(default)]
    system_bases: Vec<String>,
    #[serde(default)]
    system_roots: Vec<String>,
    #[serde(default)]
    owned_sessions: Vec<OwnedSession>,
    #[serde(default)]
    expected_source: Option<OwnedSession>,
}
#[cfg(test)]
thread_local! {static READ_BUDGET_HOOK:std::cell::RefCell<Option<Box<dyn FnOnce()>>>=std::cell::RefCell::new(None);}
struct Warnings {
    rows: Vec<String>,
    bytes: usize,
    overflow: bool,
}
impl Warnings {
    fn new() -> Self {
        Self {
            rows: Vec::new(),
            bytes: 0,
            overflow: false,
        }
    }
    fn push(&mut self, value: String) {
        if self.rows.len() >= 128 || self.bytes.saturating_add(value.len()) > 64 * 1024 {
            self.overflow = true;
        } else {
            self.bytes += value.len();
            self.rows.push(value);
        }
    }
}
fn result_capacity(bytes: usize) -> Result<(), String> {
    if bytes > crate::outbox::RESULT_DATA_BYTES {
        Err("native history result capacity exceeded".into())
    } else {
        Ok(())
    }
}
pub(crate) fn execute(
    operation: &str,
    request: &Request,
    cancel: &AtomicBool,
) -> Result<Value, String> {
    check_cancel(cancel)?;
    let vault = fs::canonicalize(&request.vault).map_err(|e| e.to_string())?;
    // Resolve the vault once, then anchor its relative index path to that same
    // representation. Node and Rust differ on Windows verbatim prefixes, and
    // macOS may spell the same directory through /var or /private/var.
    let supplied_index = Path::new(&request.index);
    let relative_index = supplied_index
        .strip_prefix(Path::new(&request.vault))
        .or_else(|_| supplied_index.strip_prefix(&vault))
        .map_err(|_| "index outside vault")?;
    let index = vault.join(relative_index);
    // Index writes are confined to this vault's HUHU data area.
    let parent = index.parent().ok_or("index path")?;
    if !parent.starts_with(vault.join(".huhu"))
        || parent
            .components()
            .any(|c| c == std::path::Component::ParentDir)
    {
        return Err("index outside vault".into());
    }
    secure_private_path(&vault, parent, &index)?;
    let mut db = open_index(&index, operation == "scan", cancel)?;
    // WAL sidecars appear only after open. A chmod miss does not delete the index.
    tighten_private_modes(parent, &index);
    if operation == "scan" {
        let mut warnings = Warnings::new();
        let mut pending = Vec::new();
        let mut conflicts = HashSet::new();
        let mut statuses: Vec<StatusUpdate> = Vec::new();
        let account = request.scope == "account";
        let scope = Scope {
            account,
            owned: &request.owned_sessions,
            device_id: &request.device_id,
        };
        sweep_stale_snapshots();
        for root in &request.roots {
            if cancel.load(Ordering::Relaxed) {
                return Err("cancelled".into());
            }
            let path = Path::new(&root.path);
            // Source paths seen healthy in this pass, and sources that failed with a status.
            let mut seen: HashSet<String> = HashSet::new();
            let mut failed: HashMap<String, (&'static str, String)> = HashMap::new();
            // Key of the session each source path holds now (to spot a replaced transcript).
            let mut fresh: HashMap<String, String> = HashMap::new();
            if !path.exists() {
                // A previously indexed root that vanished keeps its rows as `missing`.
                reconcile_root(
                    &db,
                    root,
                    &request.scope,
                    &seen,
                    &failed,
                    &fresh,
                    &mut statuses,
                )?;
                continue;
            }
            if let Some(base) = &root.system_base {
                if !system_root(Path::new(base), path) {
                    warnings.push(format!(
                        "{}: history source outside the system provider directory",
                        root.agent_id
                    ));
                    continue;
                }
            } else if !account_path(&vault, path) {
                warnings.push(format!(
                    "{}: history source outside vault accounts",
                    root.agent_id
                ));
                continue;
            }
            if root.agent_id == "opencode" && path.extension().is_some_and(|e| e == "db") {
                scan_opencode(
                    &db,
                    path,
                    root,
                    &vault,
                    &request.scope,
                    &scope,
                    cancel,
                    &mut pending,
                    &mut seen,
                    &mut failed,
                    &mut statuses,
                    &mut warnings,
                )?;
                flush_if_ready(&mut db, &mut pending, cancel, &mut conflicts)?;
                reconcile_root(
                    &db,
                    root,
                    &request.scope,
                    &seen,
                    &failed,
                    &fresh,
                    &mut statuses,
                )?;
                continue;
            }
            let mut files = Vec::new();
            walk(path, &mut files, cancel, 0);
            for path in files {
                if cancel.load(Ordering::Relaxed) {
                    return Err("cancelled".into());
                }
                let name = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
                let relevant = match root.agent_id.as_str() {
                    "grok" => name == "session.json",
                    "gemini" => {
                        path.parent().is_some_and(|p| p.ends_with("chats"))
                            && (name.ends_with(".json") || name.ends_with(".jsonl"))
                    }
                    _ => name.ends_with(".jsonl"),
                };
                if !relevant {
                    continue;
                }
                let source = path.to_string_lossy().to_string();
                let sources = match history_sources(&vault, &path, root, account) {
                    Ok(sources) => sources,
                    Err(error) => {
                        warnings.push(format!("{}: {}", path.display(), error));
                        continue;
                    }
                };
                let (stamp, modified) =
                    match stamp_for(&request.scope, &root.agent_id, &path, &sources) {
                        Ok(value) => value,
                        Err(error) => {
                            failed.insert(source, io_status(&error));
                            continue;
                        }
                    };
                seen.insert(source.clone());
                if cached_row(&db, &source, &stamp, root) {
                    continue;
                }
                if let Err(error) = File::open(&path) {
                    failed.insert(source.clone(), io_status(&error));
                    warnings.push(format!("{}: {}", source, error));
                    continue;
                }
                match index_text_source(&path, root, &vault, modified, cancel, &scope) {
                    Ok(Some(session)) => {
                        fresh.insert(source.clone(), session.key.clone());
                        pending.push((session, stamp));
                        flush_if_ready(&mut db, &mut pending, cancel, &mut conflicts)?;
                    }
                    Ok(None) => {}
                    Err(error) => {
                        if error != "cancelled" {
                            failed.insert(source.clone(), error_status(&error));
                        }
                        warnings.push(format!("{}: {}", source, error));
                    }
                }
            }
            reconcile_root(
                &db,
                root,
                &request.scope,
                &seen,
                &failed,
                &fresh,
                &mut statuses,
            )?;
        }
        flush(&mut db, &mut pending, cancel, &mut conflicts)?;
        statuses.extend(
            conflicts
                .into_iter()
                .map(|key| (key, "changed", "identity-collision".into())),
        );
        apply_statuses(&mut db, &statuses, cancel)?;
        if !account {
            purge_inadmissible(&mut db, request, &vault, cancel)?;
        }
        if warnings.overflow {
            return Err("native history warning capacity exceeded".into());
        }
        return Ok(json!({"warnings": warnings.rows, "revision": revision(&db)?}));
    }
    if operation == "read" {
        // Admission comes before any key-specific error or capacity check, so an unknown,
        // out-of-scope or oversized key is indistinguishable from "not admitted".
        let (raw, stamp): (String, String) = db
            .query_row(
                "SELECT summary,stamp FROM history WHERE key=?1",
                params![request.key],
                |r| {
                    let summary = r
                        .get_ref(0)?
                        .as_str()
                        .map_err(|_| rusqlite::Error::InvalidQuery)?;
                    if summary.len() > crate::outbox::RESULT_DATA_BYTES {
                        return Err(rusqlite::Error::InvalidQuery);
                    }
                    Ok((summary.to_owned(), r.get::<_, String>(1)?))
                },
            )
            .map_err(|_| "session outside vault".to_owned())?;
        let mut session: Session =
            serde_json::from_str(&raw).map_err(|_| "session outside vault".to_owned())?;
        // Validate the cached row before reparsing a body. A changed scope or a
        // moved source must never be turned into a successful preview merely
        // because the on-demand parser can still open the path. A row whose
        // provenance cannot be verified (legacy index, empty sources) is refused.
        if !session_allowed(
            &vault,
            &session,
            &request.scope,
            &request.system_bases,
            &request.system_roots,
            &request.owned_sessions,
            &request.device_id,
        ) {
            // An available row whose source vanished (or became unreadable) since the last
            // scan is reported precisely, but only when the row itself still passes
            // provenance, confinement and scope admission without the liveness requirement.
            if session.source_status == "available"
                && session_admitted(
                    &vault,
                    &session,
                    &request.scope,
                    &request.system_bases,
                    &request.system_roots,
                    &request.owned_sessions,
                    &request.device_id,
                    false,
                )
            {
                let (status, reason) = source_state(&session, &stamp, &request.scope);
                if status != "available" {
                    return Ok(unavailable(session, Some((status, reason))));
                }
            }
            return Err("session outside vault".into());
        }
        if request.expected_source.as_ref().is_some_and(|expected| {
            !owned_by_space(std::slice::from_ref(expected), &request.device_id, &session)
        }) {
            return Err("history source changed; refresh required".into());
        }
        // A persisted non-available row keeps its metadata and reports its status; it
        // never carries a body.
        if session.source_status != "available" {
            return Ok(unavailable(session, None));
        }
        // The indexed fingerprint must still describe the source; otherwise the
        // preview reports `changed` (or the precise failure) instead of stale text.
        let (status, reason) = source_state(&session, &stamp, &request.scope);
        // Drift alone is normal for a live session (appends, a touched mtime). The preview
        // only reports `changed` when the source can no longer be verified as the same one.
        let mut drifted = false;
        if status != "available" {
            if status == "changed" && reason == DRIFT_REASON && drift_verifies(&session, &stamp) {
                drifted = true;
            } else {
                return Ok(unavailable(session, Some((status, reason))));
            }
        }
        let text = {
            let bytes: u64 = db
                .query_row(
                    "SELECT COALESCE(length(CAST(text AS BLOB)),0) FROM history_text WHERE key=?1",
                    params![request.key],
                    |r| r.get(0),
                )
                .unwrap_or(0);
            result_capacity(
                usize::try_from(bytes)
                    .unwrap_or(usize::MAX)
                    .saturating_add(raw.len()),
            )?;
            #[cfg(test)]
            READ_BUDGET_HOOK.with(|hook| {
                if let Some(action) = hook.borrow_mut().take() {
                    action();
                }
            });
            match db.query_row(
                "SELECT text FROM history_text WHERE key=?1",
                params![request.key],
                |r| {
                    let text = r
                        .get_ref(0)?
                        .as_str()
                        .map_err(|_| rusqlite::Error::InvalidQuery)?;
                    if text.len().saturating_add(raw.len()) > crate::outbox::RESULT_DATA_BYTES {
                        return Err(rusqlite::Error::ToSqlConversionFailure(Box::new(
                            std::io::Error::other("native history result capacity exceeded"),
                        )));
                    }
                    Ok(text.to_owned())
                },
            ) {
                Ok(text) => text,
                Err(rusqlite::Error::QueryReturnedNoRows) => String::new(),
                Err(error) => return Err(error.to_string()),
            }
        };
        if text.is_empty() || drifted {
            let source_root = session
                .source_root
                .clone()
                .unwrap_or_else(|| session.transcript_path.clone());
            let root = Root {
                agent_id: session.agent_id.clone(),
                path: source_root,
                account_key: session.account_key.clone(),
                system_base: session.system_base.clone(),
            };
            // The row already passed admission (including Space ownership), so the parser
            // must not re-apply the vault cwd filter.
            let scope = Scope {
                account: true,
                owned: &request.owned_sessions,
                device_id: &request.device_id,
            };
            if session.agent_id == "opencode" {
                let wanted = session.session_id.clone();
                match opencode_with(
                    Path::new(&session.transcript_path),
                    &root,
                    &vault,
                    cancel,
                    &scope,
                    true,
                    Some(&wanted),
                ) {
                    Ok(mut rows) => match rows.pop() {
                        Some(full) => session = full,
                        None => {
                            let state = if drifted {
                                ("changed", DRIFT_LOST)
                            } else {
                                ("missing", "session no longer in the database")
                            };
                            return Ok(unavailable(session, Some((state.0, state.1.into()))));
                        }
                    },
                    Err(Fail::Other(error)) => return Err(error),
                    Err(Fail::Missing) if drifted => {
                        return Ok(unavailable(session, Some(("changed", DRIFT_LOST.into()))))
                    }
                    Err(fail) => {
                        let status = fail.status();
                        return Ok(unavailable(session, status));
                    }
                }
            } else {
                let full = parse_with_body(
                    Path::new(&session.transcript_path),
                    &root,
                    &vault,
                    session.modified_at_ms,
                    cancel,
                    true,
                    true,
                );
                let full = if drifted {
                    match full {
                        Err(error) if error == "cancelled" => return Err(error),
                        Ok(Some(full)) if full.key == session.key => full,
                        _ => return Ok(unavailable(session, Some(("changed", DRIFT_LOST.into())))),
                    }
                } else {
                    full?.ok_or_else(|| "history source unavailable".to_owned())?
                };
                session = full;
            }
        } else {
            session.text = text;
        }
        if !session_allowed(
            &vault,
            &session,
            &request.scope,
            &request.system_bases,
            &request.system_roots,
            &request.owned_sessions,
            &request.device_id,
        ) {
            return Err("session outside vault".into());
        }
        // Measure what is actually returned (a reparsed body, not the stored text).
        let value = json!(session);
        result_capacity(value.to_string().len())?;
        return Ok(value);
    }
    if operation != "query" {
        return Err("unknown history operation".into());
    }
    query(&mut db, request, &vault, cancel)
}

/// History is private vault metadata. Tighten only HUHU-owned paths and never
/// follow a symlink while doing so.
fn secure_private_path(vault: &Path, parent: &Path, index: &Path) -> Result<(), String> {
    let relative = parent
        .strip_prefix(vault)
        .map_err(|_| "index outside vault")?;
    let mut current = vault.to_path_buf();
    let mut directories = Vec::new();
    // Validate before creating anything, even when a link targets a normal folder in this vault.
    for component in relative.components() {
        current.push(component);
        reject_private_link(&current, true)?;
        directories.push(current.clone());
    }
    for suffix in ["", "-wal", "-shm", "-journal"] {
        reject_private_link(
            &PathBuf::from(format!("{}{}", index.display(), suffix)),
            false,
        )?;
    }
    for directory in directories {
        let builder = fs::DirBuilder::new();
        #[cfg(unix)]
        let mut builder = builder;
        #[cfg(unix)]
        {
            use std::os::unix::fs::DirBuilderExt;
            builder.mode(0o700);
        }
        match builder.create(&directory) {
            Ok(()) => {}
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {}
            Err(error) => return Err(error.to_string()),
        }
        reject_private_link(&directory, true)?;
        tighten_private_mode(&directory, 0o700);
    }
    // SQLite derives new sidecar modes from the DB. Create the DB privately first.
    let mut options = fs::OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600).custom_flags(libc::O_NOFOLLOW);
    }
    match options.open(index) {
        Ok(_) => {}
        Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {}
        Err(error) => return Err(error.to_string()),
    }
    reject_private_link(index, false)?;
    tighten_private_modes(parent, index);
    Ok(())
}

fn reject_private_link(path: &Path, directory: bool) -> Result<(), String> {
    match fs::symlink_metadata(path) {
        Ok(metadata) => {
            if metadata.file_type().is_symlink() {
                return Err(if directory {
                    "symlinked history directory"
                } else {
                    "symlinked index"
                }
                .into());
            }
            if (directory && !metadata.is_dir()) || (!directory && !metadata.is_file()) {
                return Err("invalid private history path".into());
            }
            Ok(())
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

fn tighten_private_mode(path: &Path, bits: u32) {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if fs::symlink_metadata(path)
            .ok()
            .is_some_and(|meta| meta.file_type().is_symlink())
        {
            return;
        }
        if let Err(error) = fs::set_permissions(path, fs::Permissions::from_mode(bits)) {
            // Category and OS code only; history paths may contain identifying data.
            eprintln!("HUHU history permissions: {:?}", error.kind());
        }
    }
    #[cfg(not(unix))]
    {
        let _ = (path, bits);
    }
}

/// Tighten modes after SQLite has created the index and its sidecars.
/// Symlinks are skipped. A permission error is ignored and nothing is deleted.
fn tighten_private_modes(parent: &Path, index: &Path) {
    tighten_private_mode(parent, 0o700);
    tighten_private_mode(index, 0o600);
    for suffix in ["-wal", "-shm", "-journal"] {
        let sidecar = PathBuf::from(format!("{}{}", index.display(), suffix));
        if sidecar.exists() {
            tighten_private_mode(&sidecar, 0o600);
        }
    }
}
#[cfg(test)]
fn save(db: &Connection, row: &Session, stamp: &str) -> rusqlite::Result<usize> {
    write_row(db, row, stamp)
}
/// A shared opaque key must never transfer an existing source's annotations to another locator.
fn save_in_scan(
    db: &Connection,
    row: &Session,
    stamp: &str,
    conflicts: &mut HashSet<String>,
) -> rusqlite::Result<usize> {
    let stored: Option<(String, String)> = db
        .query_row(
            "SELECT summary,stamp FROM history WHERE key=?1",
            params![row.key],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()?;
    if let Some((summary, original_stamp)) = stored {
        let mut original: Session =
            serde_json::from_str(&summary).map_err(|_| rusqlite::Error::InvalidQuery)?;
        let same = original.agent_id == row.agent_id
            && original.account_key == row.account_key
            && original.session_id == row.session_id
            && original.transcript_path == row.transcript_path
            && (original.source_ref.is_empty() || original.source_ref == row.source_ref);
        if !same {
            conflicts.insert(row.key.clone());
            original.source_status = "changed".into();
            original.source_reason = "identity-collision".into();
            original.text.clear();
            return write_row(db, &original, &original_stamp);
        }
    }
    write_row(db, row, stamp)
}
fn write_row(db: &Connection, row: &Session, stamp: &str) -> rusqlite::Result<usize> {
    let mut summary = serde_json::to_value(row).unwrap();
    summary.as_object_mut().unwrap().remove("text");
    db.execute(
        "INSERT OR REPLACE INTO history_text(key,text) VALUES (?1,?2)",
        params![row.key, row.text],
    )?;
    db.execute(
        "INSERT OR REPLACE INTO history VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)",
        params![
            row.key,
            row.transcript_path,
            stamp,
            summary.to_string(),
            format!("{}\n{}\n{}", row.title, row.cwd, row.session_id).to_lowercase(),
            row.modified_at_ms,
            row.cwd,
            row.usage.input,
            row.usage.output,
            row.usage.cache_read,
            row.usage.cache_write,
            row.usage.cost,
            row.usage.known,
            row.usage.partial
        ],
    )
}
fn check_cancel(cancel: &AtomicBool) -> Result<(), String> {
    if cancel.load(Ordering::Relaxed) {
        Err("cancelled".into())
    } else {
        Ok(())
    }
}
const SCHEMA: i64 = 1;
fn open_index(index: &Path, writer: bool, cancel: &AtomicBool) -> Result<Connection, String> {
    check_cancel(cancel)?;
    if index.exists() {
        let db = Connection::open_with_flags(
            index,
            OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
        )
        .map_err(|e| e.to_string())?;
        db.busy_timeout(Duration::from_secs(2))
            .map_err(|e| e.to_string())?;
        let version: i64 = db
            .query_row("PRAGMA user_version", [], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        if version > SCHEMA {
            return Err("history index version is newer than this server".into());
        }
        if version == SCHEMA && !writer {
            return Ok(db);
        }
    }
    let mut db = Connection::open(index).map_err(|e| e.to_string())?;
    db.busy_timeout(Duration::from_secs(2))
        .map_err(|e| e.to_string())?;
    db.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;")
        .map_err(|e| e.to_string())?;
    init_schema(&mut db, cancel)?;
    if writer {
        Ok(db)
    } else {
        drop(db);
        open_index(index, false, cancel)
    }
}
/// Create the history schema in an empty index; an index of another version is refused.
fn init_schema(db: &mut Connection, cancel: &AtomicBool) -> Result<(), String> {
    check_cancel(cancel)?;
    let tx = db
        .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
        .map_err(|e| e.to_string())?;
    let version: i64 = tx
        .query_row("PRAGMA user_version", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if version == SCHEMA {
        return Ok(());
    }
    if version > SCHEMA {
        return Err("history index version is newer than this server".into());
    }
    tx.execute_batch("CREATE TABLE history(key TEXT PRIMARY KEY,source TEXT NOT NULL,stamp TEXT NOT NULL,summary TEXT NOT NULL,body TEXT NOT NULL,modified INTEGER NOT NULL,cwd TEXT NOT NULL,input INTEGER NOT NULL,output INTEGER NOT NULL,cache_read INTEGER NOT NULL,cache_write INTEGER NOT NULL,cost REAL,known INTEGER NOT NULL,partial INTEGER NOT NULL);
        CREATE TABLE history_text(key TEXT PRIMARY KEY,text TEXT NOT NULL);
        CREATE TABLE history_revision(revision INTEGER NOT NULL); INSERT INTO history_revision VALUES (0);
        CREATE INDEX history_source_stamp ON history(source,stamp); CREATE INDEX history_modified ON history(modified DESC,key ASC); CREATE INDEX history_cwd ON history(cwd);").map_err(|e| e.to_string())?;
    tx.execute_batch(&format!("PRAGMA user_version={SCHEMA};"))
        .map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())
}
fn revision(db: &Connection) -> Result<u64, String> {
    db.query_row("SELECT revision FROM history_revision", [], |r| r.get(0))
        .map_err(|e| e.to_string())
}
fn flush_if_ready(
    db: &mut Connection,
    pending: &mut Vec<(Session, String)>,
    cancel: &AtomicBool,
    conflicts: &mut HashSet<String>,
) -> Result<(), String> {
    if pending.len() >= 32 {
        flush(db, pending, cancel, conflicts)?;
    }
    Ok(())
}
fn flush(
    db: &mut Connection,
    pending: &mut Vec<(Session, String)>,
    cancel: &AtomicBool,
    conflicts: &mut HashSet<String>,
) -> Result<(), String> {
    check_cancel(cancel)?;
    if pending.is_empty() {
        return Ok(());
    }
    let tx = db.transaction().map_err(|e| e.to_string())?;
    for (row, stamp) in pending.iter() {
        check_cancel(cancel)?;
        save_in_scan(&tx, row, stamp, conflicts).map_err(|e| e.to_string())?;
    }
    tx.execute("UPDATE history_revision SET revision=revision+1", [])
        .map_err(|e| e.to_string())?;
    check_cancel(cancel)?;
    tx.commit().map_err(|e| e.to_string())?;
    pending.clear();
    Ok(())
}
fn query(
    db: &mut Connection,
    request: &Request,
    vault: &Path,
    cancel: &AtomicBool,
) -> Result<Value, String> {
    check_cancel(cancel)?;
    let tx = db.transaction().map_err(|e| e.to_string())?;
    let current_revision = revision(&tx)?;
    if request
        .expected_revision
        .is_some_and(|expected| expected != current_revision)
    {
        return Err("history revision changed; refresh required".into());
    }
    // Vault queries retain the real-directory check. Account queries validate
    // each source path instead, and never trust an old index row outside .huhu/agents.
    let mut allowed = Vec::new();
    let mut allowed_bytes = 0usize;
    {
        let mut stmt = tx
            .prepare("SELECT key,summary FROM history")
            .map_err(|e| e.to_string())?;
        for cwd in stmt
            .query_map([], |r| {
                let key = r
                    .get_ref(0)?
                    .as_str()
                    .map_err(|_| rusqlite::Error::InvalidQuery)?;
                let summary = r
                    .get_ref(1)?
                    .as_str()
                    .map_err(|_| rusqlite::Error::InvalidQuery)?;
                if key.len().saturating_add(summary.len()) > crate::outbox::RESULT_DATA_BYTES {
                    return Err(rusqlite::Error::ToSqlConversionFailure(Box::new(
                        std::io::Error::other("native history row capacity exceeded"),
                    )));
                }
                Ok((key.to_string(), summary.to_string()))
            })
            .map_err(|e| e.to_string())?
        {
            check_cancel(cancel)?;
            let (key, summary) = cwd.map_err(|e| e.to_string())?;
            if serde_json::from_str::<Session>(&summary).is_ok_and(|session| {
                session_allowed(
                    vault,
                    &session,
                    &request.scope,
                    &request.system_bases,
                    &request.system_roots,
                    &request.owned_sessions,
                    &request.device_id,
                )
            }) {
                allowed_bytes = allowed_bytes.saturating_add(key.len() + 8);
                result_capacity(allowed_bytes)?;
                allowed.push(key);
            }
        }
    }
    let pattern = request.query.to_lowercase();
    let mut matching = Vec::new();
    let mut archived = Vec::new();
    let mut favorites = Vec::new();
    for (key, meta) in &request.metadata {
        if meta.to_string().to_lowercase().contains(&pattern) {
            matching.push(key);
        }
        if meta["archived"].as_bool() == Some(true) {
            archived.push(key);
        }
        if meta["favorite"].as_bool() == Some(true) {
            favorites.push(key);
        }
    }
    let matching = serde_json::to_string(&matching).unwrap();
    let allowed = serde_json::to_string(&allowed).unwrap();
    let archived = serde_json::to_string(&archived).unwrap();
    let favorites = serde_json::to_string(&favorites).unwrap();
    // Listing/search only consults indexed metadata. Transcript bodies remain source-owned and
    // are loaded by the explicit read/preview path.
    let predicate = "FROM history WHERE key IN (SELECT value FROM json_each(?3)) AND (?1='' OR instr(body,?1)>0 OR key IN (SELECT value FROM json_each(?2))) AND (CASE ?4 WHEN 'active' THEN key NOT IN (SELECT value FROM json_each(?5)) WHEN 'archived' THEN key IN (SELECT value FROM json_each(?5)) WHEN 'favorite' THEN key IN (SELECT value FROM json_each(?6)) ELSE 1 END)";
    let bind = params![
        pattern,
        matching,
        allowed,
        request.filter,
        archived,
        favorites
    ];
    let (total, usage): (u64, Usage) = tx.query_row(&format!("SELECT COUNT(*),COALESCE(SUM(input),0),COALESCE(SUM(output),0),COALESCE(SUM(cache_read),0),COALESCE(SUM(cache_write),0),CASE WHEN COUNT(cost)=COUNT(*) THEN SUM(cost) ELSE NULL END,COALESCE(MAX(known),0),COALESCE(MAX(partial OR NOT known),0) {predicate}"), bind, |r| Ok((r.get(0)?, Usage { input:r.get(1)?, output:r.get(2)?, cache_read:r.get(3)?, cache_write:r.get(4)?, cost:r.get(5)?, known:r.get(6)?, partial:r.get(7)? }))).map_err(|e| e.to_string())?;
    check_cancel(cancel)?;
    let mut stmt = tx
        .prepare(&format!(
            "SELECT summary {predicate} ORDER BY modified DESC,key ASC LIMIT 100 OFFSET ?7"
        ))
        .map_err(|e| e.to_string())?;
    let mut page = Vec::new();
    let mut page_bytes = 0usize;
    for raw in stmt
        .query_map(
            params![
                pattern,
                matching,
                allowed,
                request.filter,
                archived,
                favorites,
                request.offset
            ],
            |r| {
                let raw = r
                    .get_ref(0)?
                    .as_str()
                    .map_err(|_| rusqlite::Error::InvalidQuery)?;
                if raw.len() > crate::outbox::RESULT_DATA_BYTES {
                    return Err(rusqlite::Error::ToSqlConversionFailure(Box::new(
                        std::io::Error::other("native history row capacity exceeded"),
                    )));
                }
                Ok(raw.to_string())
            },
        )
        .map_err(|e| e.to_string())?
    {
        check_cancel(cancel)?;
        let raw = raw.map_err(|e| e.to_string())?;
        page_bytes = page_bytes.saturating_add(raw.len());
        result_capacity(page_bytes)?;
        page.push(serde_json::from_str::<Value>(&raw).map_err(|e| e.to_string())?);
    }
    Ok(json!({"rows":page,"total":total,"usage":usage,"revision":current_revision}))
}
// Account history never traverses host-global homes or symlinks. The working directory
// can be outside the vault only when the source itself belongs to its managed accounts.
fn account_path(vault: &Path, source: &Path) -> bool {
    account_source_path(vault, source, true)
}
fn account_source_path(vault: &Path, source: &Path, required: bool) -> bool {
    // Node supplies ordinary Windows paths; Rust canonicalize returns verbatim
    // paths. Strip only that representation difference before checking each
    // account component, without canonicalizing away a forbidden symlink.
    #[cfg(windows)]
    let ordinary_vault = PathBuf::from(ordinary_windows_path(&vault.to_string_lossy()));
    let relative = source.strip_prefix(vault);
    #[cfg(windows)]
    let relative = relative.or_else(|_| source.strip_prefix(&ordinary_vault));
    let Ok(relative) = relative else {
        return false;
    };
    if !relative.starts_with(".huhu/agents")
        || relative
            .components()
            .any(|component| !matches!(component, std::path::Component::Normal(_)))
    {
        return false;
    }
    let mut current = vault.to_path_buf();
    for component in relative.components() {
        current.push(component);
        let meta = match fs::symlink_metadata(&current) {
            Ok(meta) => meta,
            Err(error) => return !required && tolerated_absence(&error),
        };
        if meta.file_type().is_symlink() {
            return false;
        }
    }
    true
}
// An optional component may be absent, or hidden behind a permission boundary, without
// making the lexical confinement check fail. Symlinks still do.
fn tolerated_absence(error: &std::io::Error) -> bool {
    matches!(
        error.kind(),
        std::io::ErrorKind::NotFound | std::io::ErrorKind::PermissionDenied
    )
}
// Provenance is mandatory: the first persisted source is the transcript itself. `live`
// additionally requires every source to exist now; a persisted non-available row is only
// checked for confinement so its metadata can still be listed.
fn account_session(vault: &Path, session: &Session, live: bool) -> bool {
    session
        .sources
        .first()
        .is_some_and(|source| source.required && source.path == Path::new(&session.transcript_path))
        && session.sources.iter().all(|source| {
            if live {
                account_source_file(vault, source)
            } else {
                account_source_path(vault, &source.path, false) && lexical_file(&source.path)
            }
        })
}
fn lexical_file(path: &Path) -> bool {
    fs::symlink_metadata(path).map_or(true, |meta| meta.is_file())
}
fn account_source_file(vault: &Path, source: &HistorySource) -> bool {
    account_source_path(vault, &source.path, source.required)
        && match fs::symlink_metadata(&source.path) {
            Ok(meta) => meta.is_file(),
            Err(error) => !source.required && error.kind() == std::io::ErrorKind::NotFound,
        }
}
fn session_allowed(
    vault: &Path,
    session: &Session,
    scope: &str,
    bases: &[String],
    roots: &[String],
    owned: &[OwnedSession],
    device_id: &str,
) -> bool {
    // Only rows written with an explicit source status carry verifiable provenance; legacy
    // rows (empty status) are refused until a scan rewrites them.
    let live = match session.source_status.as_str() {
        "available" => true,
        "missing" | "changed" | "unsupported" | "permission-denied" => false,
        _ => return false,
    };
    session_admitted(vault, session, scope, bases, roots, owned, device_id, live)
}
/// Admission with an explicit liveness requirement. `live=false` checks provenance, link
/// confinement and scope only, never that the sources currently exist.
#[allow(clippy::too_many_arguments)]
fn session_admitted(
    vault: &Path,
    session: &Session,
    scope: &str,
    bases: &[String],
    roots: &[String],
    owned: &[OwnedSession],
    device_id: &str,
    live: bool,
) -> bool {
    let scoped = scope == "account"
        || inside(vault, &session.cwd)
        || owned_by_space(owned, device_id, session);
    if let Some(base) = &session.system_base {
        // A system session is the user's own provider history. It is trusted only inside the
        // directory the caller names now, and a working directory still scopes the vault view.
        return bases.iter().any(|allowed| allowed == base)
            && session
                .system_root
                .as_ref()
                .is_some_and(|root| roots.iter().any(|allowed| allowed == root))
            && system_session(Path::new(base), session, live)
            && scoped;
    }
    account_session(vault, session, live) && scoped
}
// A system source stays inside the provider directory and is reached without following a
// link below it. The directory itself may be a link: dotfile managers commonly make it one.
fn system_root(base: &Path, source: &Path) -> bool {
    let Ok(relative) = source.strip_prefix(base) else {
        return false;
    };
    relative
        .components()
        .all(|component| matches!(component, std::path::Component::Normal(_)))
}
fn system_source_path(base: &Path, source: &Path, required: bool) -> bool {
    if !system_root(base, source) {
        return false;
    }
    let mut current = base.to_path_buf();
    for component in source.strip_prefix(base).unwrap().components() {
        current.push(component);
        match fs::symlink_metadata(&current) {
            Ok(meta) if meta.file_type().is_symlink() => return false,
            Ok(_) => {}
            Err(error) => return !required && tolerated_absence(&error),
        }
    }
    true
}
fn system_source_file(base: &Path, source: &HistorySource) -> bool {
    system_source_path(base, &source.path, source.required)
        && match fs::symlink_metadata(&source.path) {
            Ok(meta) => meta.is_file(),
            Err(error) => !source.required && error.kind() == std::io::ErrorKind::NotFound,
        }
}
// A transcript is a session log of its provider, not any file under the provider directory: a
// login or settings file next to the history is never one.
fn system_transcript(session: &Session) -> bool {
    let (Some(root), path) = (&session.system_root, Path::new(&session.transcript_path)) else {
        return false;
    };
    let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
    let root = Path::new(root);
    match session.agent_id.as_str() {
        "opencode" => path == root,
        agent => {
            path.starts_with(root)
                && path != root
                && match agent {
                    "grok" => name == "session.json",
                    "gemini" => {
                        (name.ends_with(".json") || name.ends_with(".jsonl"))
                            && path.parent().is_some_and(|p| p.ends_with("chats"))
                    }
                    _ => name.ends_with(".jsonl"),
                }
        }
    }
}
fn system_session(base: &Path, session: &Session, live: bool) -> bool {
    system_transcript(session)
        && session.sources.first().is_some_and(|source| {
            source.required && source.path == Path::new(&session.transcript_path)
        })
        && session.sources.iter().all(|source| {
            if live {
                system_source_file(base, source)
            } else {
                system_source_path(base, &source.path, false) && lexical_file(&source.path)
            }
        })
}
fn history_sources(
    vault: &Path,
    path: &Path,
    root: &Root,
    _account: bool,
) -> Result<Vec<HistorySource>, String> {
    // Every source must carry verifiable provenance (a vault account or the named system
    // provider directory); there is no unverified "plain vault" source.
    let mut paths = vec![path.to_path_buf()];
    match root.agent_id.as_str() {
        "grok" => paths.push(path.with_file_name("chat_history.jsonl")),
        "gemini" => {
            if let Some(project) = path.parent().and_then(Path::parent) {
                paths.push(project.join(".project_root"));
            }
            if let Some(home) = Path::new(&root.path).parent() {
                paths.push(home.join("projects.json"));
            }
        }
        "opencode" => {
            for suffix in ["-wal", "-shm", "-journal"] {
                let mut sidecar = path.as_os_str().to_os_string();
                sidecar.push(suffix);
                paths.push(PathBuf::from(sidecar));
            }
        }
        _ => {}
    }
    paths
        .into_iter()
        .enumerate()
        .map(|(index, path)| {
            let required = index == 0 || fs::symlink_metadata(&path).is_ok();
            let source = HistorySource { path, required };
            let allowed = match &root.system_base {
                Some(base) => system_source_file(Path::new(base), &source),
                None => account_source_file(vault, &source),
            };
            if !allowed {
                return Err(format!(
                    "history source outside vault accounts: {}",
                    source.path.display()
                ));
            }
            Ok(source)
        })
        .collect()
}
#[cfg(any(windows, test))]
fn ordinary_windows_path(path: &str) -> String {
    if let Some(rest) = path.strip_prefix(r"\\?\UNC\") {
        format!(r"\\{}", rest)
    } else {
        path.strip_prefix(r"\\?\").unwrap_or(path).to_owned()
    }
}
fn inside(vault: &Path, cwd: &str) -> bool {
    !cwd.is_empty() && fs::canonicalize(cwd).is_ok_and(|p| p.starts_with(vault))
}
fn walk(path: &Path, files: &mut Vec<PathBuf>, cancel: &AtomicBool, depth: usize) {
    if depth > 12 || cancel.load(Ordering::Relaxed) {
        return;
    }
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let kind = match entry.file_type() {
                Ok(k) => k,
                Err(_) => continue,
            };
            if kind.is_symlink() {
                continue;
            }
            if kind.is_dir() {
                if !matches!(
                    entry.file_name().to_str(),
                    Some("subagents" | "node_modules" | ".git")
                ) {
                    walk(&entry.path(), files, cancel, depth + 1);
                }
            } else if kind.is_file() {
                files.push(entry.path());
            }
        }
    }
}
fn string(v: &Value, key: &str) -> String {
    v.get(key).and_then(Value::as_str).unwrap_or("").to_owned()
}
fn number(v: &Value, key: &str) -> u64 {
    v.get(key).and_then(Value::as_u64).unwrap_or(0)
}
fn content(value: &Value) -> String {
    if let Some(s) = value.as_str() {
        return s.to_owned();
    }
    if let Some(rows) = value.as_array() {
        return rows
            .iter()
            .filter_map(|v| v.get("text").and_then(Value::as_str))
            .collect::<Vec<_>>()
            .join("\n");
    }
    String::new()
}
/// Body text leaves room for the row metadata inside one result frame.
const BODY_CAP: usize = crate::outbox::RESULT_DATA_BYTES - 64 * 1024;
fn add_message(session: &mut Session, role: &str, text: String) {
    if text.is_empty() {
        return;
    }
    session.message_count += 1;
    if session.text.len() >= BODY_CAP {
        session.usage.partial = true;
        return;
    }
    if session.title.is_empty() && role == "user" {
        session.title = text.chars().take(100).collect();
    }
    let prefix = format!("\n## {}\n\n", role);
    let remaining = BODY_CAP
        .saturating_sub(session.text.len())
        .saturating_sub(prefix.len())
        .saturating_sub(1);
    session.text.push_str(&prefix);
    if text.len() > remaining {
        let mut end = remaining.min(text.len());
        while end > 0 && !text.is_char_boundary(end) {
            end -= 1;
        }
        session.text.push_str(&text[..end]);
        session.usage.partial = true;
    } else {
        session.text.push_str(&text);
    }
    session.text.push('\n');
}
fn consume(session: &mut Session, row: &Value, seen: &mut HashMap<String, Usage>) {
    let kind = string(row, "type");
    if kind == "session_meta" {
        let p = &row["payload"];
        session.session_id = string(p, "id");
        session.cwd = string(p, "cwd");
    }
    if kind == "session" {
        session.session_id = string(row, "id");
        session.cwd = string(row, "cwd");
    }
    if session.cwd.is_empty() {
        session.cwd = string(row, "cwd");
    }
    if session.session_id.is_empty() {
        session.session_id = string(row, "sessionId");
    }
    let title = string(row, "customTitle");
    if !title.is_empty() {
        session.title = title;
    }
    if session.model.is_empty() {
        for candidate in [
            &row["message"]["model"],
            &row["payload"]["model"],
            &row["model"],
        ] {
            if let Some(model) = candidate.as_str().filter(|m| !m.is_empty()) {
                session.model = model.to_owned();
                break;
            }
        }
    }
    if kind == "response_item" {
        let p = &row["payload"];
        if string(p, "type") == "message" {
            add_message(session, &string(p, "role"), content(&p["content"]));
        }
    }
    let msg = if row.get("message").is_some() {
        &row["message"]
    } else {
        row
    };
    let role = string(msg, "role");
    if !role.is_empty() {
        let id = string(msg, "id");
        let text = content(&msg["content"]);
        if id.is_empty() || !seen.contains_key(&id) || !session.text.contains(&text) {
            add_message(session, &role, text);
        }
        if role == "assistant" && msg["usage"].is_object() {
            let u = &msg["usage"];
            let current = Usage {
                known: true,
                input: number(u, "input_tokens")
                    + number(u, "input")
                    + number(u, "cache_read_input_tokens")
                    + number(u, "cacheRead")
                    + number(u, "cache_creation_input_tokens")
                    + number(u, "cacheWrite"),
                output: number(u, "output_tokens") + number(u, "output"),
                cache_read: number(u, "cache_read_input_tokens") + number(u, "cacheRead"),
                cache_write: number(u, "cache_creation_input_tokens") + number(u, "cacheWrite"),
                cost: u["cost"]["total"].as_f64(),
                ..Default::default()
            };
            // Claude may append multiple content blocks/usage snapshots for one message.
            // Count that message once, accepting its later, more complete usage.
            let mut unkeyed = Usage::default();
            let previous = if id.is_empty() {
                &mut unkeyed
            } else {
                seen.entry(id).or_default()
            };
            session.usage.known = true;
            session.usage.input += current.input.saturating_sub(previous.input);
            session.usage.output += current.output.saturating_sub(previous.output);
            session.usage.cache_read += current.cache_read.saturating_sub(previous.cache_read);
            session.usage.cache_write += current.cache_write.saturating_sub(previous.cache_write);
            if let Some(cost) = current.cost {
                *session.usage.cost.get_or_insert(0.0) +=
                    (cost - previous.cost.unwrap_or(0.0)).max(0.0);
                previous.cost = Some(cost.max(previous.cost.unwrap_or(0.0)));
            }
            previous.input = previous.input.max(current.input);
            previous.output = previous.output.max(current.output);
            previous.cache_read = previous.cache_read.max(current.cache_read);
            previous.cache_write = previous.cache_write.max(current.cache_write);
        }
    }

    if kind == "event_msg" && string(&row["payload"], "type") == "token_count" {
        let u = &row["payload"]["info"]["total_token_usage"];
        if u.is_object() {
            session.usage.known = true;
            session.usage.input = number(u, "input_tokens");
            session.usage.output = number(u, "output_tokens");
            session.usage.cache_read = number(u, "cached_input_tokens");
        }
    }
}
fn gemini_cwd(path: &Path, root: &Root) -> String {
    let Some(project) = path.parent().and_then(Path::parent) else {
        return String::new();
    };
    if let Ok(cwd) = fs::read_to_string(project.join(".project_root")) {
        if !cwd.trim().is_empty() {
            return cwd.trim().into();
        }
    }
    let Some(home) = Path::new(&root.path).parent() else {
        return String::new();
    };
    let registry: Value = File::open(home.join("projects.json"))
        .ok()
        .and_then(|f| serde_json::from_reader(f).ok())
        .unwrap_or(Value::Null);
    registry["projects"]
        .as_object()
        .and_then(|rows| {
            rows.iter()
                .find(|(_, id)| id.as_str() == project.file_name().and_then(|p| p.to_str()))
                .map(|(cwd, _)| cwd.clone())
        })
        .unwrap_or_default()
}
fn consume_gemini(session: &mut Session, msg: &Value) {
    let role = string(msg, "type");
    if role != "user" && role != "gemini" {
        return;
    }
    add_message(
        session,
        if role == "gemini" {
            "assistant"
        } else {
            "user"
        },
        content(&msg["content"]),
    );
    let u = &msg["tokens"];
    if role == "gemini" && u.is_object() {
        session.usage.known = true;
        session.usage.input += number(u, "input");
        session.usage.output += number(u, "output") + number(u, "thoughts");
        session.usage.cache_read += number(u, "cached");
    }
}
fn source_ref(root: &Root, path: &Path) -> String {
    // Keep the provider/account/locator tuple stable; Space assignment is a separate owner.
    format!(
        "{}:{}:{}",
        root.agent_id,
        root.account_key,
        path.to_string_lossy()
    )
}
const METADATA_BUDGET: usize = 64 * 1024;
fn metadata_row(row: &Value) -> (String, String) {
    let kind = string(row, "type");
    let payload = &row["payload"];
    let id = if kind == "session_meta" {
        string(payload, "id")
    } else if kind == "session" {
        string(row, "id")
    } else {
        string(row, "sessionId")
    };
    let cwd = if kind == "session_meta" {
        string(payload, "cwd")
    } else {
        string(row, "cwd")
    };
    (id, cwd)
}
/// Admit a text source using bounded identity metadata before any message body is consumed.
fn admit_text_metadata(
    path: &Path,
    vault: &Path,
    cancel: &AtomicBool,
    include_outside: bool,
    fallback_cwd: &str,
) -> Result<(bool, String, String), String> {
    let file = File::open(path).map_err(|e| e.to_string())?;
    let mut seen = 0usize;
    let mut id = String::new();
    let mut cwd = String::new();
    for line in BufReader::new(file).lines() {
        if cancel.load(Ordering::Relaxed) {
            return Err("cancelled".into());
        }
        let line = line.map_err(|e| e.to_string())?;
        seen = seen.saturating_add(line.len().saturating_add(1));
        if seen > METADATA_BUDGET {
            return Err("history source metadata budget exceeded".into());
        }
        let Ok(row) = serde_json::from_str::<Value>(&line) else {
            continue;
        };
        let (row_id, row_cwd) = metadata_row(&row);
        if !row_id.is_empty() {
            id = row_id;
        }
        if !row_cwd.is_empty() {
            cwd = row_cwd;
        }
        if !id.is_empty() && !cwd.is_empty() {
            break;
        }
    }
    if cwd.is_empty() && !fallback_cwd.is_empty() {
        cwd = fallback_cwd.to_owned();
    }
    if id.is_empty() || cwd.is_empty() {
        return Err("history source metadata unavailable".into());
    }
    Ok((include_outside || inside(vault, &cwd), id, cwd))
}
fn admit_json_metadata(
    path: &Path,
    fallback_cwd: &str,
    vault: &Path,
    include_outside: bool,
) -> Result<bool, String> {
    let meta = fs::metadata(path).map_err(|e| e.to_string())?;
    if meta.len() as usize > METADATA_BUDGET {
        return Err("history source metadata budget exceeded".into());
    }
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    let data: Value = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
    let metadata_cwd = string(&data, "cwd");
    let cwd = if metadata_cwd.is_empty() {
        fallback_cwd
    } else {
        metadata_cwd.as_str()
    };
    if cwd.is_empty() {
        return Err("history source metadata unavailable".into());
    }
    Ok(include_outside || inside(vault, cwd))
}
fn admit_grok_metadata(path: &Path, vault: &Path, include_outside: bool) -> Result<bool, String> {
    let meta = fs::metadata(path).map_err(|e| e.to_string())?;
    if meta.len() as usize > METADATA_BUDGET {
        return Err("history source metadata budget exceeded".into());
    }
    let mut bytes = Vec::with_capacity(meta.len() as usize);
    File::open(path)
        .map_err(|e| e.to_string())?
        .take((METADATA_BUDGET + 1) as u64)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    if bytes.len() > METADATA_BUDGET {
        return Err("history source metadata budget exceeded".into());
    }
    let data: Value = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
    let cwd = string(&data["info"], "cwd");
    if cwd.is_empty() {
        return Err("history source metadata unavailable".into());
    }
    Ok(include_outside || inside(vault, &cwd))
}
#[cfg(test)]
fn parse(
    path: &Path,
    root: &Root,
    vault: &Path,
    modified: u64,
    cancel: &AtomicBool,
    include_outside: bool,
) -> Result<Option<Session>, String> {
    parse_with_body(path, root, vault, modified, cancel, include_outside, true)
}
fn parse_metadata(
    path: &Path,
    root: &Root,
    vault: &Path,
    modified: u64,
    cancel: &AtomicBool,
    include_outside: bool,
) -> Result<Option<Session>, String> {
    parse_with_body(path, root, vault, modified, cancel, include_outside, false)
}
fn parse_with_body(
    path: &Path,
    root: &Root,
    vault: &Path,
    modified: u64,
    cancel: &AtomicBool,
    include_outside: bool,
    load_body: bool,
) -> Result<Option<Session>, String> {
    let mut session = Session {
        agent_id: root.agent_id.clone(),
        account_key: root.account_key.clone(),
        transcript_path: path.to_string_lossy().into(),
        modified_at_ms: modified,
        sources: history_sources(vault, path, root, include_outside)?,
        system_base: root.system_base.clone(),
        system_root: root.system_base.as_ref().map(|_| root.path.clone()),
        source_root: Some(root.path.clone()),
        source_status: "available".into(),
        source_ref: source_ref(root, path),
        ..Default::default()
    };
    let mut seen = HashMap::new();
    if root.agent_id == "gemini" {
        session.cwd = gemini_cwd(path, root);
    }
    if root.agent_id == "grok" {
        if !admit_grok_metadata(path, vault, include_outside)? {
            return Ok(None);
        }
    } else if root.agent_id == "gemini" && path.extension().is_some_and(|s| s == "json") {
        if !admit_json_metadata(path, &session.cwd, vault, include_outside)? {
            return Ok(None);
        }
    } else {
        let (admitted, metadata_id, metadata_cwd) =
            admit_text_metadata(path, vault, cancel, include_outside, &session.cwd)?;
        session.session_id = metadata_id;
        session.cwd = metadata_cwd;
        if !admitted {
            return Ok(None);
        }
    }
    if root.agent_id == "grok" {
        let data: Value = serde_json::from_reader(File::open(path).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        session.cwd = string(&data["info"], "cwd");
        if !include_outside && !inside(vault, &session.cwd) {
            return Ok(None);
        }
        session.session_id = string(&data["info"], "id");
        session.title = string(&data, "generated_title");
        if load_body {
            if let Ok(file) = File::open(path.with_file_name("chat_history.jsonl")) {
                for line in BufReader::new(file).lines().map_while(Result::ok) {
                    if cancel.load(Ordering::Relaxed) {
                        return Err("cancelled".into());
                    }
                    if let Ok(row) = serde_json::from_str::<Value>(&line) {
                        let role = string(&row, "type");
                        if role == "user" || role == "assistant" {
                            add_message(&mut session, &role, content(&row["content"]));
                        }
                    }
                }
            }
        }
    } else if root.agent_id == "gemini" && path.extension().is_some_and(|s| s == "json") {
        let data: Value = serde_json::from_reader(File::open(path).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        session.session_id = string(&data, "sessionId");
        if data["cwd"].is_string() {
            session.cwd = string(&data, "cwd");
        }
        if load_body {
            if let Some(messages) = data["messages"].as_array() {
                for msg in messages {
                    consume_gemini(&mut session, msg);
                }
            }
        }
    } else {
        if load_body {
            let file = File::open(path).map_err(|e| e.to_string())?;
            for line in BufReader::new(file).lines() {
                if cancel.load(Ordering::Relaxed) {
                    return Err("cancelled".into());
                }
                let line = line.map_err(|e| e.to_string())?;
                if let Ok(row) = serde_json::from_str::<Value>(&line) {
                    if root.agent_id == "gemini" {
                        let id = string(&row, "sessionId");
                        if !id.is_empty() {
                            session.session_id = id;
                        }
                        consume_gemini(&mut session, &row);
                    } else {
                        consume(&mut session, &row, &mut seen);
                    }
                    if !include_outside && !session.cwd.is_empty() && !inside(vault, &session.cwd) {
                        return Ok(None);
                    }
                }
            }
        }
    }
    if session.session_id.is_empty() || (!include_outside && !inside(vault, &session.cwd)) {
        return Ok(None);
    }
    if session.title.is_empty() {
        session.title = session.session_id.clone();
    }
    session.key =
        serde_json::to_string(&(&session.agent_id, &session.account_key, &session.session_id))
            .unwrap();
    Ok(Some(session))
}
/// A persisted status change for one indexed row: key, status, diagnostic reason.
type StatusUpdate = (String, &'static str, String);

/// Why a source could not be read. Everything except `Other` becomes a persistent
/// non-available row status; `Other` (cancellation, scope violations) stays a warning/error.
#[derive(Debug)]
enum Fail {
    Missing,
    Permission,
    Changed,
    Unsupported(String),
    Other(String),
}
impl Fail {
    fn status(&self) -> Option<(&'static str, String)> {
        match self {
            Fail::Missing => Some(("missing", "source not found".into())),
            Fail::Permission => Some(("permission-denied", "source is not readable".into())),
            Fail::Changed => Some(("changed", "source changed while it was read".into())),
            Fail::Unsupported(reason) => Some(("unsupported", reason.clone())),
            Fail::Other(_) => None,
        }
    }
}
impl std::fmt::Display for Fail {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Fail::Other(error) | Fail::Unsupported(error) => f.write_str(error),
            Fail::Missing => f.write_str("history source not found"),
            Fail::Permission => f.write_str("history source permission denied"),
            Fail::Changed => f.write_str("history source changed while it was read"),
        }
    }
}
impl From<std::io::Error> for Fail {
    fn from(error: std::io::Error) -> Self {
        match error.kind() {
            std::io::ErrorKind::NotFound => Fail::Missing,
            std::io::ErrorKind::PermissionDenied => Fail::Permission,
            _ => Fail::Other(error.to_string()),
        }
    }
}
fn io_status(error: &std::io::Error) -> (&'static str, String) {
    match error.kind() {
        std::io::ErrorKind::NotFound => ("missing", "source not found".into()),
        std::io::ErrorKind::PermissionDenied => {
            ("permission-denied", "source is not readable".into())
        }
        _ => ("unsupported", error.to_string()),
    }
}
/// Classify a parser error string (the parsers flatten io errors to text).
fn error_status(error: &str) -> (&'static str, String) {
    let lower = error.to_lowercase();
    if lower.contains("permission denied")
        || lower.contains("access is denied")
        || lower.contains("os error 13")
    {
        ("permission-denied", "source is not readable".into())
    } else if lower.contains("no such file") || lower.contains("cannot find the") {
        ("missing", "source not found".into())
    } else {
        ("unsupported", error.to_owned())
    }
}
fn file_id(meta: &fs::Metadata) -> u64 {
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt;
        meta.ino()
    }
    #[cfg(not(unix))]
    {
        let _ = meta;
        0
    }
}
fn mtime_ms(meta: &fs::Metadata) -> u64 {
    meta.modified()
        .ok()
        .and_then(|v| v.duration_since(UNIX_EPOCH).ok())
        .map(|v| v.as_millis() as u64)
        .unwrap_or(0)
}
/// Fingerprint (size/mtime/inode drift) of a row's sources, and the newest mtime among
/// them. Companion files contribute size and mtime only. An OpenCode database also
/// fingerprints its `-wal` and records whether `-shm`/`-journal` exist, without ever
/// reading them.
fn stamp_for(
    scope: &str,
    agent_id: &str,
    path: &Path,
    sources: &[HistorySource],
) -> std::io::Result<(String, u64)> {
    let meta = fs::metadata(path)?;
    let mut modified = mtime_ms(&meta);
    let mut stamp = format!(
        "sources-v2:{}:{}:{}:{}",
        scope,
        modified,
        meta.len(),
        file_id(&meta)
    );
    if agent_id == "opencode" {
        for suffix in ["-wal", "-shm", "-journal"] {
            let mut sidecar = path.as_os_str().to_os_string();
            sidecar.push(suffix);
            match fs::symlink_metadata(PathBuf::from(sidecar)) {
                Ok(m) if suffix == "-wal" => {
                    let at = mtime_ms(&m);
                    stamp.push_str(&format!(":wal:{}:{}:{}", at, m.len(), file_id(&m)));
                    modified = modified.max(at);
                }
                Ok(_) => stamp.push_str(&format!(":{suffix}")),
                Err(_) => {}
            }
        }
    } else {
        for source in sources.iter().skip(1) {
            if let Ok(chat) = fs::metadata(&source.path) {
                let at = mtime_ms(&chat);
                stamp.push_str(&format!(":{}:{}", at, chat.len()));
                modified = modified.max(at);
            }
        }
    }
    Ok((stamp, modified))
}
/// An up-to-date row needs no reparse. A previously `unsupported` row at the same
/// fingerprint is deterministic and is not retried; every other non-available status is.
fn cached_row(db: &Connection, source: &str, stamp: &str, root: &Root) -> bool {
    db.query_row(
        "SELECT EXISTS(SELECT 1 FROM history WHERE source=?1 AND stamp=?2 AND json_extract(summary,'$.accountKey')=?3 AND json_extract(summary,'$.agentId')=?4 AND json_extract(summary,'$.sourceStatus') IN ('available','unsupported'))",
        params![source, stamp, root.account_key, root.agent_id],
        |r| r.get(0),
    )
    .unwrap_or(false)
}
const DRIFT_REASON: &str = "source changed since it was indexed";
const DRIFT_LOST: &str = "source identity can no longer be verified";
/// The file fingerprint part of a stamp. An OpenCode scan appends `|o:<digest of the Space
/// owned OpenCode identities>` so a changed owned set re-reads an otherwise unchanged database;
/// drift detection ignores that suffix.
fn base_stamp(stamp: &str) -> &str {
    stamp.split('|').next().unwrap_or(stamp)
}
fn owned_digest(owned: &[OwnedSession], agent_id: &str) -> String {
    let mut ids: Vec<String> = owned
        .iter()
        .filter(|row| row.agent_id == agent_id)
        .map(|row| {
            serde_json::to_string(&(
                &row.session_id,
                &row.account_key,
                &row.device_id,
                &row.transcript_path,
                &row.source_ref,
            ))
            .unwrap()
        })
        .collect();
    ids.sort_unstable();
    ids.dedup();
    // FNV-1a: stable across builds, unlike std's default hasher.
    let mut hash: u64 = 0xcbf29ce484222325;
    for id in ids
        .iter()
        .flat_map(|id| id.bytes().chain(std::iter::once(0)))
    {
        hash = (hash ^ u64::from(id)).wrapping_mul(0x100000001b3);
    }
    format!("{hash:016x}")
}
/// `(len, inode)` recorded in a `sources-v2` stamp.
fn stamp_identity(stamp: &str) -> Option<(u64, u64)> {
    let parts: Vec<&str> = base_stamp(stamp).split(':').collect();
    if parts.first() != Some(&"sources-v2") || parts.len() < 5 {
        return None;
    }
    Some((parts[3].parse().ok()?, parts[4].parse().ok()?))
}
/// Cheap identity gate for a drifted source: same file (inode, where the platform has one)
/// and not shrunk (a database may legitimately shrink, so OpenCode relies on the session id
/// still being present in the fresh snapshot). The parser then re-checks provider, native
/// session id and cwd admission before any body is returned.
fn drift_verifies(session: &Session, stored: &str) -> bool {
    let Some((len, inode)) = stamp_identity(stored) else {
        return false;
    };
    let Ok(meta) = fs::metadata(&session.transcript_path) else {
        return false;
    };
    let current = file_id(&meta);
    (inode == 0 || current == 0 || inode == current)
        && (session.agent_id == "opencode" || meta.len() >= len)
}
/// Live state of an indexed row's sources against the fingerprint stored with the row.
fn source_state(session: &Session, stored: &str, scope: &str) -> (&'static str, String) {
    let opencode = session.agent_id == "opencode";
    for (index, source) in session.sources.iter().enumerate() {
        // OpenCode sidecars are covered by the fingerprint, never required individually.
        if opencode && index > 0 {
            break;
        }
        match fs::symlink_metadata(&source.path) {
            Ok(meta) if !meta.is_file() => {
                return ("changed", "source is no longer a regular file".into())
            }
            Ok(_) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound && !source.required => {}
            Err(error) => return io_status(&error),
        }
    }
    let primary = Path::new(&session.transcript_path);
    if let Err(error) = File::open(primary) {
        return io_status(&error);
    }
    match stamp_for(scope, &session.agent_id, primary, &session.sources) {
        Ok((now, _)) if now == base_stamp(stored) => ("available", String::new()),
        Ok(_) => ("changed", DRIFT_REASON.into()),
        Err(error) => io_status(&error),
    }
}
fn unavailable(mut session: Session, state: Option<(&'static str, String)>) -> Value {
    if let Some((status, reason)) = state {
        session.source_status = status.into();
        session.source_reason = reason;
    }
    session.text.clear();
    json!(session)
}
/// Persist a status for indexed rows of this root that were not refreshed in this pass.
/// Rows are never deleted: their metadata (and any HUHU annotation keyed by them) stays.
fn reconcile_root(
    db: &Connection,
    root: &Root,
    scope: &str,
    seen: &HashSet<String>,
    failed: &HashMap<String, (&'static str, String)>,
    fresh: &HashMap<String, String>,
    out: &mut Vec<StatusUpdate>,
) -> Result<(), String> {
    let mut stmt = db
        .prepare("SELECT key,stamp,summary FROM history WHERE json_extract(summary,'$.agentId')=?1 AND json_extract(summary,'$.accountKey')=?2")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![root.agent_id, root.account_key], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
            ))
        })
        .map_err(|e| e.to_string())?;
    for row in rows {
        let (key, stamp, summary) = row.map_err(|e| e.to_string())?;
        let Ok(session) = serde_json::from_str::<Session>(&summary) else {
            continue;
        };
        if session.source_root.as_deref() != Some(root.path.as_str()) {
            continue;
        }
        let (status, reason) = if let Some(state) = failed.get(&session.transcript_path) {
            state.clone()
        } else if seen.contains(&session.transcript_path) {
            // The path is healthy; the row is stale only when it now holds another session.
            match fresh.get(&session.transcript_path) {
                Some(key) if *key != session.key => {
                    ("changed", "source now holds a different session".to_owned())
                }
                _ => continue,
            }
        } else {
            source_state(&session, &stamp, scope)
        };
        if status == "available"
            || (session.source_status == status && session.source_reason == reason)
        {
            continue;
        }
        out.push((key, status, reason));
    }
    Ok(())
}
/// Identity admission first (bounded head read), then title/model/usage/messageCount from
/// the admitted body; the body itself is dropped and never stored in the row.
fn index_text_source(
    path: &Path,
    root: &Root,
    vault: &Path,
    modified: u64,
    cancel: &AtomicBool,
    scope: &Scope,
) -> Result<Option<Session>, String> {
    let Some(head) = parse_metadata(path, root, vault, modified, cancel, true)? else {
        return Ok(None);
    };
    if !scope.admits(vault, &head) {
        return Ok(None);
    }
    let Some(mut full) = parse_with_body(path, root, vault, modified, cancel, true, true)? else {
        return Ok(None);
    };
    // The full parse is authoritative for the stored row: admit with that cwd/id too.
    if !scope.admits(vault, &full) {
        return Ok(None);
    }
    full.text.clear();
    full.created_at_ms = fs::metadata(path)
        .ok()
        .and_then(|meta| meta.created().or_else(|_| meta.modified()).ok())
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map_or(modified, |time| time.as_millis() as u64);
    Ok(Some(full))
}
/// A vault scan owns its index: rows that are no longer admissible (outside the vault and
/// not Space-owned, no provenance, stale account rows) are removed. The index is a
/// rebuildable cache; HUHU annotations travel in the request, never in the index.
fn purge_inadmissible(
    db: &mut Connection,
    request: &Request,
    vault: &Path,
    cancel: &AtomicBool,
) -> Result<(), String> {
    check_cancel(cancel)?;
    let mut bases = request.system_bases.clone();
    let mut roots = request.system_roots.clone();
    for root in &request.roots {
        if let Some(base) = &root.system_base {
            bases.push(base.clone());
            roots.push(root.path.clone());
        }
    }
    let mut stale = Vec::new();
    {
        let mut stmt = db
            .prepare("SELECT key,summary FROM history")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))
            .map_err(|e| e.to_string())?;
        for row in rows {
            check_cancel(cancel)?;
            let (key, summary) = row.map_err(|e| e.to_string())?;
            let keep = serde_json::from_str::<Session>(&summary).is_ok_and(|session| {
                session_admitted(
                    vault,
                    &session,
                    "vault",
                    &bases,
                    &roots,
                    &request.owned_sessions,
                    &request.device_id,
                    false,
                )
            });
            if !keep {
                stale.push(key);
            }
        }
    }
    if stale.is_empty() {
        return Ok(());
    }
    let tx = db.transaction().map_err(|e| e.to_string())?;
    for key in &stale {
        tx.execute("DELETE FROM history WHERE key=?1", params![key])
            .map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM history_text WHERE key=?1", params![key])
            .map_err(|e| e.to_string())?;
    }
    tx.execute("UPDATE history_revision SET revision=revision+1", [])
        .map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())
}
fn apply_statuses(
    db: &mut Connection,
    updates: &[StatusUpdate],
    cancel: &AtomicBool,
) -> Result<(), String> {
    check_cancel(cancel)?;
    if updates.is_empty() {
        return Ok(());
    }
    let tx = db.transaction().map_err(|e| e.to_string())?;
    for (key, status, reason) in updates {
        tx.execute(
            "UPDATE history SET summary=json_set(json_set(summary,'$.sourceStatus',?2),'$.sourceReason',?3) WHERE key=?1",
            params![key, status, reason],
        )
        .map_err(|e| e.to_string())?;
    }
    tx.execute("UPDATE history_revision SET revision=revision+1", [])
        .map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())
}

// ---- OpenCode: snapshot-copy reads --------------------------------------------------
// OpenCode keeps a live SQLite database. Opening it in place would create a `-shm`,
// take locks on the source inode and close the source fd through SQLite. Instead the
// database (and `-wal` when present) is copied byte-for-byte with plain read-only file
// access into a private temp directory and SQLite only ever sees the copy.
/// Upper bound for db + wal bytes copied per read. Larger sources are `unsupported`.
const SNAPSHOT_CAP: u64 = 512 * 1024 * 1024;
static SNAPSHOT_SEQ: AtomicU64 = AtomicU64::new(0);
#[cfg(test)]
type SnapshotHook = Box<dyn FnMut(u32)>;
#[cfg(test)]
thread_local! {static SNAPSHOT_HOOK:std::cell::RefCell<Option<SnapshotHook>>=std::cell::RefCell::new(None);}
#[cfg(test)]
thread_local! {static SNAPSHOT_CAP_OVERRIDE:std::cell::Cell<Option<u64>>=const{std::cell::Cell::new(None)};}
fn snapshot_cap() -> u64 {
    #[cfg(test)]
    if let Some(cap) = SNAPSHOT_CAP_OVERRIDE.with(|cap| cap.get()) {
        return cap;
    }
    SNAPSHOT_CAP
}
#[cfg(test)]
thread_local! {static SNAPSHOT_DIRS:std::cell::RefCell<Vec<PathBuf>>=const{std::cell::RefCell::new(Vec::new())};}

/// Owns the private snapshot directory; removed on every path, including errors/panics.
struct SnapshotDir(PathBuf);
impl Drop for SnapshotDir {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}
fn snapshot_dir() -> std::io::Result<SnapshotDir> {
    let base = std::env::temp_dir();
    let mut last = None;
    for _ in 0..8 {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let path = base.join(format!(
            "{}{}-{}-{}",
            SNAPSHOT_PREFIX,
            std::process::id(),
            nanos,
            SNAPSHOT_SEQ.fetch_add(1, Ordering::Relaxed)
        ));
        let mut builder = fs::DirBuilder::new();
        #[cfg(unix)]
        {
            use std::os::unix::fs::DirBuilderExt;
            builder.mode(0o700);
        }
        match builder.create(&path) {
            Ok(()) => {
                #[cfg(test)]
                SNAPSHOT_DIRS.with(|dirs| dirs.borrow_mut().push(path.clone()));
                return Ok(SnapshotDir(path));
            }
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => last = Some(error),
            Err(error) => return Err(error),
        }
    }
    Err(last.unwrap_or_else(|| std::io::Error::other("snapshot directory")))
}
const SNAPSHOT_PREFIX: &str = "huhu-opencode-";
/// Snapshots live for seconds; anything older than this is abandoned whatever its pid says
/// (the pid may have been recycled, or the platform cannot tell).
const SNAPSHOT_MAX_AGE: Duration = Duration::from_secs(60 * 60);
fn process_alive(pid: u32) -> bool {
    #[cfg(unix)]
    {
        // SAFETY: signal 0 only probes for existence/permission.
        let rc = unsafe { libc::kill(pid as libc::pid_t, 0) };
        rc == 0 || std::io::Error::last_os_error().raw_os_error() == Some(libc::EPERM)
    }
    #[cfg(not(unix))]
    {
        // No portable probe without extra bindings: rely on the age limit alone.
        let _ = pid;
        true
    }
}
/// Remove snapshot directories left behind by a crashed or killed helper (the `Drop` guard
/// cannot run then). Directories of this process are never touched: they may be in use.
fn sweep_stale_snapshots() {
    sweep_snapshots_in(&std::env::temp_dir(), SNAPSHOT_MAX_AGE);
}
fn sweep_snapshots_in(base: &Path, max_age: Duration) {
    let Ok(entries) = fs::read_dir(base) else {
        return;
    };
    let own = std::process::id();
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().into_owned();
        let Some(rest) = name.strip_prefix(SNAPSHOT_PREFIX) else {
            continue;
        };
        let Some(pid) = rest.split('-').next().and_then(|p| p.parse::<u32>().ok()) else {
            continue;
        };
        if pid == own || !entry.file_type().is_ok_and(|kind| kind.is_dir()) {
            continue;
        }
        let old = entry
            .metadata()
            .and_then(|meta| meta.modified())
            .ok()
            .and_then(|time| time.elapsed().ok())
            .is_some_and(|age| age >= max_age);
        if old || !process_alive(pid) {
            let _ = fs::remove_dir_all(entry.path());
        }
    }
}
fn sidecar(path: &Path, suffix: &str) -> PathBuf {
    let mut name = path.as_os_str().to_os_string();
    name.push(suffix);
    PathBuf::from(name)
}
/// Regular-file metadata without following links; `None` when absent.
fn source_meta(path: &Path) -> Result<Option<fs::Metadata>, Fail> {
    match fs::symlink_metadata(path) {
        Ok(meta) if meta.is_file() => Ok(Some(meta)),
        Ok(_) => Err(Fail::Unsupported("source is not a regular file".into())),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.into()),
    }
}
fn same_file(a: &fs::Metadata, b: &fs::Metadata) -> bool {
    a.len() == b.len() && a.modified().ok() == b.modified().ok() && file_id(a) == file_id(b)
}
fn same_opt(a: &Option<fs::Metadata>, b: &Option<fs::Metadata>) -> bool {
    match (a, b) {
        (None, None) => true,
        (Some(a), Some(b)) => same_file(a, b),
        _ => false,
    }
}
fn cap_exceeded() -> Fail {
    Fail::Unsupported(format!(
        "OpenCode database exceeds the {} MiB snapshot cap",
        SNAPSHOT_CAP / (1024 * 1024)
    ))
}
/// Plain read-only copy of `source` (never a link) into `target`, capped at `limit` bytes.
fn copy_source(source: &Path, target: &Path, limit: u64) -> Result<u64, Fail> {
    let mut options = fs::OpenOptions::new();
    options.read(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.custom_flags(libc::O_NOFOLLOW);
    }
    let input = options.open(source)?;
    let mut out = fs::OpenOptions::new();
    out.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        out.mode(0o600);
    }
    let mut output = out.open(target)?;
    let copied = std::io::copy(&mut input.take(limit.saturating_add(1)), &mut output)?;
    if copied > limit {
        return Err(cap_exceeded());
    }
    Ok(copied)
}
struct Snapshot {
    db: PathBuf,
    // Dropped last: removes the directory after the copy is no longer in use.
    _dir: SnapshotDir,
}
/// Copy db (+wal) and prove the pair was stable while copying; retry once, then `changed`.
fn take_snapshot(path: &Path, cancel: &AtomicBool) -> Result<Snapshot, Fail> {
    let wal = sidecar(path, "-wal");
    for attempt in 0..2u32 {
        check_cancel(cancel).map_err(Fail::Other)?;
        let Some(db_before) = source_meta(path)? else {
            return Err(Fail::Missing);
        };
        let wal_before = source_meta(&wal)?;
        let total = db_before.len() + wal_before.as_ref().map_or(0, |m| m.len());
        if total > snapshot_cap() {
            return Err(cap_exceeded());
        }
        let dir = snapshot_dir()?;
        let copy = dir.0.join("opencode.db");
        let used = copy_source(path, &copy, snapshot_cap())?;
        if wal_before.is_some() {
            match copy_source(
                &wal,
                &sidecar(&copy, "-wal"),
                snapshot_cap().saturating_sub(used),
            ) {
                Ok(_) => {}
                // The WAL vanished mid-copy (checkpoint): the pair is not consistent.
                Err(Fail::Missing) => {
                    continue;
                }
                Err(error) => return Err(error),
            }
        }
        #[cfg(test)]
        SNAPSHOT_HOOK.with(|hook| {
            if let Some(action) = hook.borrow_mut().as_mut() {
                action(attempt);
            }
        });
        let _ = attempt;
        check_cancel(cancel).map_err(Fail::Other)?;
        let Some(db_after) = source_meta(path)? else {
            return Err(Fail::Missing);
        };
        let wal_after = source_meta(&wal)?;
        if same_file(&db_before, &db_after) && same_opt(&wal_before, &wal_after) {
            return Ok(Snapshot {
                db: copy,
                _dir: dir,
            });
        }
    }
    Err(Fail::Changed)
}
fn sqlite_fail(error: rusqlite::Error) -> Fail {
    Fail::Unsupported(format!("unsupported OpenCode database: {error}"))
}
/// Read sessions from a private copy of the database. `only` limits the work to one
/// session id; `load_body` adds message text (lists keep metadata and usage only).
fn opencode_with(
    path: &Path,
    root: &Root,
    vault: &Path,
    cancel: &AtomicBool,
    scope: &Scope,
    load_body: bool,
    only: Option<&str>,
) -> Result<Vec<Session>, Fail> {
    // Missing / unreadable sources report their status before any provenance walk.
    match fs::symlink_metadata(path) {
        Ok(_) => {}
        Err(error) => return Err(error.into()),
    }
    let mut sources = history_sources(vault, path, root, scope.account).map_err(Fail::Other)?;
    // The snapshot never reads `-shm`/`-journal`; they are not part of the row's provenance.
    sources.retain(|source| {
        let name = source.path.to_string_lossy();
        !(name.ends_with("-shm") || name.ends_with("-journal"))
    });
    let snapshot = take_snapshot(path, cancel)?;
    let db = Connection::open_with_flags(
        &snapshot.db,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
    .map_err(sqlite_fail)?;
    let rows = read_snapshot(
        &db, path, root, vault, cancel, scope, load_body, only, &sources,
    );
    // Close explicitly so a close failure is reported instead of silently dropped.
    let closed = db.close().map_err(|(_, error)| sqlite_fail(error));
    drop(snapshot);
    let rows = rows?;
    closed?;
    Ok(rows)
}
/// Append one text part, bounded like `add_message`: the body never exceeds the result cap.
fn push_capped(session: &mut Session, text: &str) {
    let cap = BODY_CAP;
    if session.text.len() >= cap {
        session.usage.partial = true;
        return;
    }
    let remaining = cap - session.text.len() - 1;
    let mut end = text.len().min(remaining);
    while end > 0 && !text.is_char_boundary(end) {
        end -= 1;
    }
    if end < text.len() {
        session.usage.partial = true;
    }
    session.text.push_str(&text[..end]);
    session.text.push('\n');
}
#[allow(clippy::too_many_arguments)]
fn read_snapshot(
    db: &Connection,
    path: &Path,
    root: &Root,
    vault: &Path,
    cancel: &AtomicBool,
    scope: &Scope,
    load_body: bool,
    only: Option<&str>,
    sources: &[HistorySource],
) -> Result<Vec<Session>, Fail> {
    let mut stmt = db
        .prepare("SELECT id,directory,title,time_updated FROM session WHERE parent_id IS NULL")
        .map_err(sqlite_fail)?;
    let rows = stmt
        .query_map([], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
                r.get::<_, u64>(3)?,
            ))
        })
        .map_err(sqlite_fail)?;
    let mut result = Vec::new();
    for row in rows {
        check_cancel(cancel).map_err(Fail::Other)?;
        let (id, cwd, title, modified) = row.map_err(sqlite_fail)?;
        if only.is_some_and(|wanted| wanted != id) {
            continue;
        }
        let mut s = Session {
            key: serde_json::to_string(&("opencode", &root.account_key, &id)).unwrap(),
            agent_id: "opencode".into(),
            account_key: root.account_key.clone(),
            session_id: id.clone(),
            cwd,
            title,
            modified_at_ms: modified,
            transcript_path: path.to_string_lossy().into(),
            sources: sources.to_vec(),
            system_base: root.system_base.clone(),
            system_root: root.system_base.as_ref().map(|_| root.path.clone()),
            source_root: Some(root.path.clone()),
            source_status: "available".into(),
            // One database holds many sessions: the reference names the session too.
            source_ref: format!("{}#{}", source_ref(root, path), id),
            ..Default::default()
        };
        if !scope.admits(vault, &s) {
            continue;
        }
        let mut messages = db
            .prepare(
                "SELECT data,time_created FROM message WHERE session_id=?1 ORDER BY time_created",
            )
            .map_err(sqlite_fail)?;
        let raw = messages
            .query_map(params![id], |r| {
                Ok((r.get::<_, String>(0)?, r.get::<_, Option<u64>>(1)?))
            })
            .map_err(sqlite_fail)?;
        for row in raw {
            check_cancel(cancel).map_err(Fail::Other)?;
            let (data, created) = row.map_err(sqlite_fail)?;
            s.message_count += 1;
            if s.created_at_ms == 0 {
                s.created_at_ms = created.unwrap_or(0);
            }
            let v: Value = serde_json::from_str(&data)
                .map_err(|e| Fail::Unsupported(format!("unsupported OpenCode message: {e}")))?;
            if s.model.is_empty() {
                s.model = string(&v, "modelID");
            }
            let u = &v["tokens"];
            if u.is_object() {
                s.usage.known = true;
                s.usage.input +=
                    number(u, "input") + number(&u["cache"], "read") + number(&u["cache"], "write");
                s.usage.output += number(u, "output") + number(u, "reasoning");
                s.usage.cache_read += number(&u["cache"], "read");
                s.usage.cache_write += number(&u["cache"], "write");
            }
            if let Some(cost) = v["cost"].as_f64() {
                *s.usage.cost.get_or_insert(0.0) += cost;
            }
        }
        if load_body {
            let mut parts=db.prepare("SELECT part.data FROM part JOIN message ON part.message_id=message.id WHERE message.session_id=?1 ORDER BY part.time_created").map_err(sqlite_fail)?;
            for row in parts
                .query_map(params![id], |r| r.get::<_, String>(0))
                .map_err(sqlite_fail)?
            {
                if let Ok(v) = serde_json::from_str::<Value>(&row.map_err(sqlite_fail)?) {
                    if string(&v, "type") == "text" {
                        push_capped(&mut s, &string(&v, "text"));
                    }
                }
            }
        }
        result.push(s);
    }
    Ok(result)
}
#[cfg(test)]
fn opencode(
    path: &Path,
    root: &Root,
    vault: &Path,
    cancel: &AtomicBool,
    include_outside: bool,
) -> Result<Vec<Session>, String> {
    let scope = Scope {
        account: include_outside,
        owned: &[],
        device_id: "",
    };
    opencode_with(path, root, vault, cancel, &scope, true, None).map_err(|e| e.to_string())
}
#[allow(clippy::too_many_arguments)]
fn scan_opencode(
    db: &Connection,
    path: &Path,
    root: &Root,
    vault: &Path,
    scope_name: &str,
    scope: &Scope,
    cancel: &AtomicBool,
    pending: &mut Vec<(Session, String)>,
    seen: &mut HashSet<String>,
    failed: &mut HashMap<String, (&'static str, String)>,
    statuses: &mut Vec<StatusUpdate>,
    warnings: &mut Warnings,
) -> Result<(), String> {
    let source = path.to_string_lossy().to_string();
    let account = scope.account;
    let sources = match history_sources(vault, path, root, account) {
        Ok(sources) => sources,
        Err(error) => {
            warnings.push(format!("{}: {}", path.display(), error));
            return Ok(());
        }
    };
    let stamp = match stamp_for(scope_name, &root.agent_id, path, &sources) {
        Ok((stamp, _)) => format!("{stamp}|o:{}", owned_digest(scope.owned, "opencode")),
        Err(error) => {
            failed.insert(source, io_status(&error));
            return Ok(());
        }
    };
    seen.insert(source.clone());
    if cached_row(db, &source, &stamp, root) {
        return Ok(());
    }
    match opencode_with(path, root, vault, cancel, scope, false, None) {
        Ok(rows) => {
            // Sessions deleted from (or no longer admissible in) the database are `missing`.
            let present: HashSet<&str> = rows.iter().map(|row| row.session_id.as_str()).collect();
            let mut stmt = db
                .prepare("SELECT key,summary FROM history WHERE source=?1 AND json_extract(summary,'$.agentId')=?2 AND json_extract(summary,'$.accountKey')=?3")
                .map_err(|e| e.to_string())?;
            let known = stmt
                .query_map(params![source, root.agent_id, root.account_key], |r| {
                    Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
                })
                .map_err(|e| e.to_string())?;
            for row in known {
                let (key, summary) = row.map_err(|e| e.to_string())?;
                if let Ok(old) = serde_json::from_str::<Session>(&summary) {
                    if !present.contains(old.session_id.as_str()) {
                        statuses.push((key, "missing", "session no longer in the database".into()));
                    }
                }
            }
            drop(stmt);
            for row in rows {
                pending.push((row, stamp.clone()));
            }
        }
        Err(Fail::Other(error)) => {
            if error == "cancelled" {
                return Err(error);
            }
            warnings.push(format!("{}: {}", root.agent_id, error));
        }
        Err(fail) => {
            if let Some(state) = fail.status() {
                failed.insert(source, state);
            }
            warnings.push(format!("{}: {}", root.agent_id, fail));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    struct Temp(PathBuf);
    impl Temp {
        fn new() -> Self {
            let p = std::env::temp_dir().join(format!("huhu-history-{}", uuid::Uuid::new_v4()));
            fs::create_dir_all(&p).unwrap();
            Self(fs::canonicalize(p).unwrap())
        }
    }
    impl Drop for Temp {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }
    fn request(root: &Path, sources: Vec<Root>) -> Request {
        Request {
            vault: root.to_string_lossy().into(),
            device_id: "test-device".into(),
            index: root
                .join(".huhu/terminal-agent/test/index.sqlite")
                .to_string_lossy()
                .into(),
            roots: sources,
            query: String::new(),
            metadata: HashMap::new(),
            filter: String::new(),
            offset: 0,
            expected_revision: None,
            scope: String::new(),
            key: String::new(),
            system_bases: Vec::new(),
            system_roots: Vec::new(),
            owned_sessions: Vec::new(),
            expected_source: None,
        }
    }
    /// A base row with verifiable provenance (a managed account transcript that exists), for
    /// tests that inject index rows directly instead of scanning.
    fn synthetic(vault: &Path) -> Session {
        let dir = vault.join(".huhu/agents/test/synthetic");
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("session.jsonl");
        fs::write(&path, "{}\n").unwrap();
        Session {
            transcript_path: path.to_string_lossy().into(),
            sources: vec![HistorySource {
                path,
                required: true,
            }],
            source_status: "available".into(),
            ..Default::default()
        }
    }
    #[test]
    fn index_paths_accept_vault_aliases_but_reject_escaping_writes() {
        let temp = Temp::new();
        let outside = Temp::new();
        let cancel = AtomicBool::new(false);
        #[cfg(windows)]
        let mut req = request(&temp.0, vec![]);
        #[cfg(windows)]
        {
            // Node realpath uses drive paths; Rust canonicalize uses verbatim paths.
            req.vault = req.vault.trim_start_matches(r"\\?\").to_string();
            req.index = req.index.trim_start_matches(r"\\?\").to_string();
        }
        #[cfg(unix)]
        let mut req = {
            let alias = outside.0.join("vault-alias");
            std::os::unix::fs::symlink(&temp.0, &alias).unwrap();
            request(&alias, vec![])
        };
        assert_eq!(execute("query", &req, &cancel).unwrap()["total"], 0);
        req.index = outside.0.join("outside.sqlite").to_string_lossy().into();
        assert_eq!(
            execute("query", &req, &cancel).unwrap_err(),
            "index outside vault"
        );
        assert!(!Path::new(&req.index).exists());
        req.index = Path::new(&req.vault)
            .join(".huhu/../../escape.sqlite")
            .to_string_lossy()
            .into();
        assert_eq!(
            execute("query", &req, &cancel).unwrap_err(),
            "index outside vault"
        );
        #[cfg(unix)]
        {
            let linked = temp.0.join(".huhu/escape");
            std::os::unix::fs::symlink(&outside.0, &linked).unwrap();
            req.index = linked.join("linked.sqlite").to_string_lossy().into();
            req.vault = temp.0.to_string_lossy().into();
            assert_eq!(
                execute("query", &req, &cancel).unwrap_err(),
                "symlinked history directory"
            );
            assert!(!outside.0.join("linked.sqlite").exists());
            let source = outside.0.join("source.sqlite");
            fs::write(&source, b"preserve native file").unwrap();
            let linked = temp.0.join(".huhu/linked.sqlite");
            std::os::unix::fs::symlink(&source, &linked).unwrap();
            req.index = linked.to_string_lossy().into();
            assert_eq!(
                execute("query", &req, &cancel).unwrap_err(),
                "symlinked index"
            );
            assert_eq!(fs::read(&source).unwrap(), b"preserve native file");
        }
    }
    #[test]
    fn oversized_history_read_fails_without_resolving_a_partial_body() {
        let temp = Temp::new();
        let mut req = request(&temp.0, vec![]);
        let cancel = AtomicBool::new(false);
        execute("query", &req, &cancel).unwrap();
        let db = Connection::open(&req.index).unwrap();
        let row = Session {
            key: "large".into(),
            cwd: temp.0.to_string_lossy().into(),
            ..synthetic(&temp.0)
        };
        let stamp = stamp_for("", "", Path::new(&row.transcript_path), &row.sources)
            .unwrap()
            .0;
        save(&db, &row, &stamp).unwrap();
        db.execute(
            "UPDATE history_text SET text=replace(hex(zeroblob(400000)),'0','x') WHERE key='large'",
            [],
        )
        .unwrap();
        drop(db);
        req.key = "large".into();
        assert!(execute("read", &req, &cancel)
            .unwrap_err()
            .contains("result capacity exceeded"));
    }
    #[test]
    fn a_scan_commit_between_length_and_actual_read_cannot_bypass_result_capacity() {
        let temp = Temp::new();
        let mut req = request(&temp.0, vec![]);
        let cancel = AtomicBool::new(false);
        execute("query", &req, &cancel).unwrap();
        let db = Connection::open(&req.index).unwrap();
        let row = Session {
            key: "racing".into(),
            cwd: temp.0.to_string_lossy().into(),
            ..synthetic(&temp.0)
        };
        let stamp = stamp_for("", "", Path::new(&row.transcript_path), &row.sources)
            .unwrap()
            .0;
        save(&db, &row, &stamp).unwrap();
        drop(db);
        let path = req.index.clone();
        READ_BUDGET_HOOK.with(|hook|*hook.borrow_mut()=Some(Box::new(move||{
            let writer=Connection::open(path).unwrap();writer.execute("UPDATE history_text SET text=replace(hex(zeroblob(400000)),'0','x') WHERE key='racing'",[]).unwrap();
        })));
        req.key = "racing".into();
        let result = execute("read", &req, &cancel);
        assert!(
            matches!(result,Err(ref error) if error.contains("result capacity exceeded")),
            "changed actual row must fail before copying text"
        );
    }
    #[test]
    fn streams_full_transcript_and_refreshes_appends_without_rewriting_source() {
        let temp = Temp::new();
        let source = temp.0.join(".huhu/agents/test/native");
        fs::create_dir_all(&source).unwrap();
        let file = source.join("session.jsonl");
        let mut text = format!(
            "{}\n",
            json!({"type":"session_meta","payload":{"id":"one","cwd":temp.0}})
        );
        text.push_str(&format!("{}\n",json!({"type":"response_item","payload":{"type":"message","role":"user","content":[{"text":"x".repeat(200_000)}]}})));
        text.push_str(&format!("{}\n",json!({"type":"response_item","payload":{"type":"message","role":"assistant","content":[{"text":"needle after old prefix cap"}]}})));
        text.push_str(&format!("{}\n",json!({"type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":17,"output_tokens":8,"cached_input_tokens":3}}}})));
        fs::write(&file, &text).unwrap();
        let mut req = request(
            &temp.0,
            vec![Root {
                agent_id: "codex".into(),
                path: source.to_string_lossy().into(),
                account_key: "{}".into(),
                system_base: None,
            }],
        );
        let cancel = AtomicBool::new(false);
        execute("scan", &req, &cancel).unwrap();
        req.query = "needle".into();
        let page = execute("query", &req, &cancel).unwrap();
        assert_eq!(page["total"], 0, "list search is metadata-only");
        assert_eq!(fs::read_to_string(&file).unwrap(), text);
        req.query.clear();
        // Scan-time metadata: usage is known without storing the body.
        let page = execute("query", &req, &cancel).unwrap();
        assert_eq!(page["usage"]["input"], 17);
        assert_eq!(page["usage"]["known"], true);
        req.key = serde_json::to_string(&("codex", "{}", "one")).unwrap();
        let preview = execute("read", &req, &cancel).unwrap();
        assert!(preview["text"]
            .as_str()
            .unwrap()
            .contains("needle after old prefix cap"));
        text.push_str(&format!("{}\n",json!({"type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":23,"output_tokens":10}}}})));
        fs::write(&file, &text).unwrap();
        req.key.clear();
        execute("scan", &req, &cancel).unwrap();
        let page = execute("query", &req, &cancel).unwrap();
        assert_eq!(page["total"], 1);
        assert_eq!(page["usage"]["input"], 23);
    }
    #[test]
    fn scope_uses_real_directories_and_cancel_refuses_partial_scan() {
        let temp = Temp::new();
        let outside = Temp::new();
        assert!(!inside(&temp.0, &outside.0.to_string_lossy()));
        assert!(inside(&temp.0, &temp.0.to_string_lossy()));
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(&outside.0, temp.0.join("escape")).unwrap();
            assert!(!inside(&temp.0, &temp.0.join("escape").to_string_lossy()));
        }
        let req = request(
            &temp.0,
            vec![Root {
                agent_id: "pi".into(),
                path: temp.0.to_string_lossy().into(),
                account_key: "{}".into(),
                system_base: None,
            }],
        );
        assert_eq!(
            execute("scan", &req, &AtomicBool::new(true)).unwrap_err(),
            "cancelled"
        );
    }
    #[test]
    fn native_formats_keep_account_identity_and_unknown_usage() {
        let temp = Temp::new();
        let dir = temp.0.join(".huhu/agents/test/pi");
        fs::create_dir_all(&dir).unwrap();
        let root = Root {
            agent_id: "pi".into(),
            path: dir.to_string_lossy().into(),
            account_key: "account-A".into(),
            system_base: None,
        };
        let file = dir.join("pi.jsonl");
        fs::write(&file,format!("{}\n{}\n",json!({"type":"session","id":"same","cwd":temp.0}),json!({"type":"message","message":{"role":"user","content":[{"type":"text","text":"hello"}]}}))).unwrap();
        let row = parse(&file, &root, &temp.0, 0, &AtomicBool::new(false), false)
            .unwrap()
            .unwrap();
        assert_eq!(row.title, "hello");
        assert!(!row.usage.known);
        let other = parse(
            &file,
            &Root {
                account_key: "account-B".into(),
                ..root
            },
            &temp.0,
            0,
            &AtomicBool::new(false),
            false,
        )
        .unwrap()
        .unwrap();
        assert_ne!(row.key, other.key);
    }
    #[test]
    fn opencode_reads_database_read_only_and_excludes_children() {
        let temp = Temp::new();
        let managed = temp.0.join(".huhu/agents/test/opencode");
        fs::create_dir_all(&managed).unwrap();
        let file = managed.join("opencode.db");
        {
            let db = Connection::open(&file).unwrap();
            db.execute_batch("CREATE TABLE session(id TEXT,directory TEXT,title TEXT,time_updated INTEGER,parent_id TEXT); CREATE TABLE message(id TEXT,session_id TEXT,time_created INTEGER,data TEXT); CREATE TABLE part(message_id TEXT,time_created INTEGER,data TEXT);").unwrap();
            db.execute(
                "INSERT INTO session VALUES ('main',?1,'title',12,NULL)",
                params![temp.0.to_string_lossy()],
            )
            .unwrap();
            db.execute(
                "INSERT INTO session VALUES ('child',?1,'child',13,'main')",
                params![temp.0.to_string_lossy()],
            )
            .unwrap();
            db.execute(
                "INSERT INTO message VALUES ('m','main',1,?1)",
                params![
                    json!({"tokens":{"input":10,"output":5,"cache":{"read":2}},"cost":0.01})
                        .to_string()
                ],
            )
            .unwrap();
            db.execute(
                "INSERT INTO part VALUES ('m',1,?1)",
                params![json!({"type":"text","text":"answer"}).to_string()],
            )
            .unwrap();
        }
        let before = fs::read(&file).unwrap();
        let rows = opencode(
            &file,
            &Root {
                agent_id: "opencode".into(),
                path: file.to_string_lossy().into(),
                account_key: "{}".into(),
                system_base: None,
            },
            &temp.0,
            &AtomicBool::new(false),
            false,
        )
        .unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].usage.cache_read, 2);
        assert!(rows[0].text.contains("answer"));
        assert_eq!(before, fs::read(&file).unwrap());
    }
    #[test]
    fn metadata_admission_rejects_a_body_before_identity_budget() {
        let temp = Temp::new();
        let dir = temp.0.join(".huhu/agents/test/codex");
        fs::create_dir_all(&dir).unwrap();
        let source = dir.join("session.jsonl");
        fs::write(
            &source,
            format!(
                "{}\n{}\n",
                json!({"type":"message","message":{"role":"user","content":"x".repeat(METADATA_BUDGET)}}),
                json!({"type":"session_meta","payload":{"id":"late","cwd":temp.0}}),
            ),
        )
        .unwrap();
        let error = parse(
            &source,
            &Root {
                agent_id: "codex".into(),
                path: dir.to_string_lossy().into(),
                account_key: "a".into(),
                system_base: None,
            },
            &temp.0,
            0,
            &AtomicBool::new(false),
            false,
        )
        .unwrap_err();
        assert!(error.contains("metadata budget"));
    }
    // ---- T-11 provenance, source status and OpenCode snapshot reads ----
    fn opencode_schema(db: &Connection) {
        db.execute_batch("CREATE TABLE session(id TEXT,directory TEXT,title TEXT,time_updated INTEGER,parent_id TEXT); CREATE TABLE message(id TEXT,session_id TEXT,time_created INTEGER,data TEXT); CREATE TABLE part(message_id TEXT,time_created INTEGER,data TEXT);").unwrap();
    }
    fn opencode_rows(db: &Connection, dir: &Path, other: &Path) {
        for (id, cwd, parent) in [
            ("main", dir, None),
            ("child", dir, Some("main")),
            ("foreign", other, None),
        ] {
            db.execute(
                "INSERT INTO session VALUES (?1,?2,?3,12,?4)",
                params![id, cwd.to_string_lossy(), format!("title {id}"), parent],
            )
            .unwrap();
            db.execute(
                "INSERT INTO message VALUES (?1,?2,1,?3)",
                params![
                    format!("m-{id}"),
                    id,
                    json!({"tokens":{"input":10,"output":5}}).to_string()
                ],
            )
            .unwrap();
            db.execute(
                "INSERT INTO part VALUES (?1,1,?2)",
                params![
                    format!("m-{id}"),
                    json!({"type":"text","text":format!("answer {id}")}).to_string()
                ],
            )
            .unwrap();
        }
    }
    fn opencode_root(file: &Path) -> Root {
        Root {
            agent_id: "opencode".into(),
            path: file.to_string_lossy().into(),
            account_key: "acct".into(),
            system_base: None,
        }
    }
    /// A managed account directory holding an OpenCode database in WAL state: the main file
    /// is old, the rows live only in `-wal`, and no `-shm` exists (as after a crash).
    fn wal_only_database(vault: &Path, other: &Path) -> PathBuf {
        let dir = vault.join(".huhu/agents/test/opencode");
        fs::create_dir_all(&dir).unwrap();
        let scratch = Temp::new();
        let live = scratch.0.join("opencode.db");
        let writer = Connection::open(&live).unwrap();
        writer
            .execute_batch("PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0;")
            .unwrap();
        opencode_schema(&writer);
        opencode_rows(&writer, vault, other);
        let file = dir.join("opencode.db");
        fs::copy(&live, &file).unwrap();
        fs::copy(
            scratch.0.join("opencode.db-wal"),
            dir.join("opencode.db-wal"),
        )
        .unwrap();
        drop(writer);
        assert!(fs::metadata(dir.join("opencode.db-wal")).unwrap().len() > 0);
        assert!(!dir.join("opencode.db-shm").exists());
        file
    }
    fn listing(dir: &Path) -> Vec<(String, u64, Option<std::time::SystemTime>)> {
        let mut rows: Vec<_> = fs::read_dir(dir)
            .unwrap()
            .map(|entry| {
                let entry = entry.unwrap();
                let meta = entry.metadata().unwrap();
                (
                    entry.file_name().to_string_lossy().into_owned(),
                    meta.len(),
                    meta.modified().ok(),
                )
            })
            .collect();
        rows.sort();
        rows
    }
    fn snapshot_dirs_gone() {
        SNAPSHOT_DIRS.with(|dirs| {
            let dirs = dirs.borrow();
            assert!(!dirs.is_empty(), "a snapshot directory was created");
            for dir in dirs.iter() {
                assert!(!dir.exists(), "snapshot dir leaked: {}", dir.display());
            }
        });
    }
    #[test]
    fn opencode_snapshot_sees_wal_leaves_source_untouched_and_cleans_up() {
        let vault = Temp::new();
        let other = Temp::new();
        let file = wal_only_database(&vault.0, &other.0);
        let dir = file.parent().unwrap().to_path_buf();
        let before = listing(&dir);
        let rows = opencode(
            &file,
            &opencode_root(&file),
            &vault.0,
            &AtomicBool::new(false),
            false,
        )
        .unwrap();
        // WAL-only content is visible; the child and the other-vault session are not.
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].session_id, "main");
        assert!(rows[0].text.contains("answer main"));
        assert_eq!(rows[0].usage.input, 10);
        // No -shm/-journal, same files, sizes and mtimes.
        assert_eq!(before, listing(&dir));
        assert!(!dir.join("opencode.db-shm").exists());
        assert!(!dir.join("opencode.db-journal").exists());
        snapshot_dirs_gone();
        // Account scope keeps the foreign-cwd session, still never the child.
        let account = opencode(
            &file,
            &opencode_root(&file),
            &vault.0,
            &AtomicBool::new(false),
            true,
        )
        .unwrap();
        let mut ids: Vec<_> = account.iter().map(|r| r.session_id.as_str()).collect();
        ids.sort();
        assert_eq!(ids, ["foreign", "main"]);
        assert_eq!(before, listing(&dir));
    }
    #[test]
    #[cfg(unix)]
    fn opencode_snapshot_directory_and_files_are_private() {
        use std::os::unix::fs::PermissionsExt;
        let vault = Temp::new();
        let other = Temp::new();
        let file = wal_only_database(&vault.0, &other.0);
        let observed = std::cell::RefCell::new(Vec::new());
        let observed = std::rc::Rc::new(observed);
        let sink = observed.clone();
        SNAPSHOT_HOOK.with(|hook| {
            *hook.borrow_mut() = Some(Box::new(move |_| {
                SNAPSHOT_DIRS.with(|dirs| {
                    for dir in dirs.borrow().iter() {
                        let mut modes =
                            vec![fs::metadata(dir).unwrap().permissions().mode() & 0o777];
                        for entry in fs::read_dir(dir).unwrap() {
                            modes.push(
                                entry.unwrap().metadata().unwrap().permissions().mode() & 0o777,
                            );
                        }
                        sink.borrow_mut().extend(modes);
                    }
                });
            }))
        });
        opencode(
            &file,
            &opencode_root(&file),
            &vault.0,
            &AtomicBool::new(false),
            false,
        )
        .unwrap();
        SNAPSHOT_HOOK.with(|hook| *hook.borrow_mut() = None);
        let modes = observed.borrow();
        assert_eq!(modes[0], 0o700);
        assert!(modes[1..].iter().all(|mode| mode & 0o077 == 0), "{modes:?}");
    }
    #[test]
    fn opencode_snapshot_cleans_up_on_error_and_reports_unsupported() {
        let vault = Temp::new();
        let dir = vault.0.join(".huhu/agents/test/opencode");
        fs::create_dir_all(&dir).unwrap();
        let file = dir.join("opencode.db");
        fs::write(&file, vec![7u8; 4096]).unwrap();
        let error = opencode_with(
            &file,
            &opencode_root(&file),
            &vault.0,
            &AtomicBool::new(false),
            &Scope {
                account: false,
                owned: &[],
                device_id: "",
            },
            false,
            None,
        )
        .unwrap_err();
        assert_eq!(error.status().unwrap().0, "unsupported");
        snapshot_dirs_gone();
        assert!(!dir.join("opencode.db-shm").exists());
    }
    #[test]
    fn opencode_over_the_snapshot_cap_is_unsupported_with_a_reason() {
        let vault = Temp::new();
        let other = Temp::new();
        let file = wal_only_database(&vault.0, &other.0);
        SNAPSHOT_CAP_OVERRIDE.with(|cap| cap.set(Some(64)));
        let error = opencode_with(
            &file,
            &opencode_root(&file),
            &vault.0,
            &AtomicBool::new(false),
            &Scope {
                account: false,
                owned: &[],
                device_id: "",
            },
            false,
            None,
        )
        .unwrap_err();
        SNAPSHOT_CAP_OVERRIDE.with(|cap| cap.set(None));
        let (status, reason) = error.status().unwrap();
        assert_eq!(status, "unsupported");
        assert!(reason.contains("snapshot cap"), "{reason}");
    }
    fn touch(path: &Path) {
        // Same bytes, new mtime: the signature of a concurrent writer.
        let file = fs::OpenOptions::new().write(true).open(path).unwrap();
        file.set_modified(std::time::SystemTime::now() + Duration::from_secs(5))
            .unwrap();
    }
    #[test]
    fn opencode_concurrent_change_retries_once_then_reports_changed() {
        let vault = Temp::new();
        let other = Temp::new();
        let file = wal_only_database(&vault.0, &other.0);
        let args = || {
            opencode_with(
                &file,
                &opencode_root(&file),
                &vault.0,
                &AtomicBool::new(false),
                &Scope {
                    account: false,
                    owned: &[],
                    device_id: "",
                },
                false,
                None,
            )
        };
        // Changes during the first copy only: the retry succeeds.
        let once = file.clone();
        SNAPSHOT_HOOK.with(|hook| {
            *hook.borrow_mut() = Some(Box::new(move |attempt| {
                if attempt == 0 {
                    touch(&once);
                }
            }))
        });
        assert_eq!(args().unwrap().len(), 1);
        // Changes during every copy: `changed`, never a half-consistent read.
        let always = file.clone();
        let wal = sidecar(&file, "-wal");
        SNAPSHOT_HOOK.with(|hook| {
            *hook.borrow_mut() = Some(Box::new(move |attempt| {
                touch(if attempt == 0 { &always } else { &wal });
            }))
        });
        let error = args().unwrap_err();
        SNAPSHOT_HOOK.with(|hook| *hook.borrow_mut() = None);
        assert_eq!(error.status().unwrap().0, "changed");
        snapshot_dirs_gone();
    }
    #[test]
    fn opencode_scan_query_and_read_use_the_snapshot_and_survive_non_available_states() {
        let vault = Temp::new();
        let other = Temp::new();
        let file = wal_only_database(&vault.0, &other.0);
        let dir = file.parent().unwrap().to_path_buf();
        let mut req = request(&vault.0, vec![opencode_root(&file)]);
        req.scope = "vault".into();
        let cancel = AtomicBool::new(false);
        let before = listing(&dir);
        let scan = execute("scan", &req, &cancel).unwrap();
        assert_eq!(scan["warnings"].as_array().unwrap().len(), 0, "{scan}");
        assert_eq!(
            before,
            listing(&dir),
            "scan leaves the source directory alone"
        );
        let page = execute("query", &req, &cancel).unwrap();
        assert_eq!(page["total"], 1);
        assert_eq!(page["rows"][0]["sessionId"], "main");
        assert_eq!(page["rows"][0]["sourceStatus"], "available");
        assert_eq!(
            page["rows"][0]["text"],
            serde_json::Value::Null,
            "list is metadata-only"
        );
        assert!(page["rows"][0]["sourceRef"]
            .as_str()
            .unwrap()
            .ends_with("#main"));
        req.key = page["rows"][0]["key"].as_str().unwrap().into();
        let read = execute("read", &req, &cancel).unwrap();
        assert!(read["text"].as_str().unwrap().contains("answer main"));
        assert_eq!(
            before,
            listing(&dir),
            "read leaves the source directory alone"
        );
        snapshot_dirs_gone();
        // A scan during a continuously changing source keeps the row and says `changed`.
        let wal = sidecar(&file, "-wal");
        fs::OpenOptions::new()
            .append(true)
            .open(&wal)
            .map(|mut f| std::io::Write::write_all(&mut f, &[]))
            .unwrap()
            .unwrap();
        touch(&file);
        let always = file.clone();
        SNAPSHOT_HOOK.with(|hook| {
            *hook.borrow_mut() = Some(Box::new(move |attempt| {
                let file = fs::OpenOptions::new().write(true).open(&always).unwrap();
                file.set_modified(
                    std::time::SystemTime::now() + Duration::from_secs(60 + u64::from(attempt)),
                )
                .unwrap();
            }))
        });
        execute("scan", &req, &cancel).unwrap();
        SNAPSHOT_HOOK.with(|hook| *hook.borrow_mut() = None);
        let page = execute("query", &req, &cancel).unwrap();
        assert_eq!(page["total"], 1, "metadata survives");
        assert_eq!(page["rows"][0]["sourceStatus"], "changed");
        let read = execute("read", &req, &cancel).unwrap();
        assert_eq!(read["sourceStatus"], "changed");
        assert_eq!(read["text"], "");
        // The database disappears: still listed, now `missing`, no body.
        fs::remove_file(&file).unwrap();
        fs::remove_file(&wal).unwrap();
        execute("scan", &req, &cancel).unwrap();
        let page = execute("query", &req, &cancel).unwrap();
        assert_eq!(page["total"], 1);
        assert_eq!(page["rows"][0]["sourceStatus"], "missing");
        let read = execute("read", &req, &cancel).unwrap();
        assert_eq!(read["sourceStatus"], "missing");
        assert_eq!(read["text"], "");
    }
    fn codex_row(id: &str, cwd: &Path) -> String {
        format!(
            "{}\n",
            json!({"type":"session_meta","payload":{"id":id,"cwd":cwd}})
        )
    }
    fn status_of(page: &Value, id: &str) -> String {
        page["rows"]
            .as_array()
            .unwrap()
            .iter()
            .find(|row| row["sessionId"] == id)
            .unwrap_or_else(|| panic!("row {id} missing from {page}"))["sourceStatus"]
            .as_str()
            .unwrap()
            .to_owned()
    }
    #[test]
    fn indexed_sources_keep_metadata_and_report_a_persistent_status() {
        let vault = Temp::new();
        let dir = vault.0.join(".huhu/agents/test/codex");
        fs::create_dir_all(&dir).unwrap();
        let write =
            |name: &str, id: &str| fs::write(dir.join(name), codex_row(id, &vault.0)).unwrap();
        for name in ["a", "b", "c"] {
            write(&format!("{name}.jsonl"), name);
        }
        let mut req = request(
            &vault.0,
            vec![Root {
                agent_id: "codex".into(),
                path: dir.to_string_lossy().into(),
                account_key: "acct".into(),
                system_base: None,
            }],
        );
        req.scope = "vault".into();
        let cancel = AtomicBool::new(false);
        execute("scan", &req, &cancel).unwrap();
        let page = execute("query", &req, &cancel).unwrap();
        assert_eq!(page["total"], 3);
        let revision = page["revision"].as_u64().unwrap();
        // Missing: the row stays listed without a body, the others are untouched.
        fs::remove_file(dir.join("a.jsonl")).unwrap();
        // Unsupported: the file no longer carries a recognizable identity.
        fs::write(dir.join("b.jsonl"), "not a transcript\n").unwrap();
        execute("scan", &req, &cancel).unwrap();
        let page = execute("query", &req, &cancel).unwrap();
        assert_eq!(page["total"], 3, "no row is deleted");
        assert!(page["revision"].as_u64().unwrap() > revision);
        assert_eq!(status_of(&page, "a"), "missing");
        assert_eq!(status_of(&page, "b"), "unsupported");
        assert_eq!(status_of(&page, "c"), "available");
        let reason = page["rows"]
            .as_array()
            .unwrap()
            .iter()
            .find(|row| row["sessionId"] == "b")
            .unwrap()["sourceReason"]
            .as_str()
            .unwrap()
            .to_owned();
        assert!(!reason.is_empty());
        for (id, status) in [("a", "missing"), ("b", "unsupported")] {
            req.key = serde_json::to_string(&("codex", "acct", id)).unwrap();
            let read = execute("read", &req, &cancel).unwrap();
            assert_eq!(read["sourceStatus"], status);
            assert_eq!(read["text"], "");
            assert_eq!(read["title"], id, "metadata retained");
        }
        req.key = serde_json::to_string(&("codex", "acct", "c")).unwrap();
        assert_eq!(
            execute("read", &req, &cancel).unwrap()["sourceStatus"],
            "available"
        );
        // Annotations are keyed outside the index and filters still find the retained row.
        req.key.clear();
        req.metadata.insert(
            serde_json::to_string(&("codex", "acct", "a")).unwrap(),
            json!({"favorite":true}),
        );
        req.filter = "favorite".into();
        let favorites = execute("query", &req, &cancel).unwrap();
        assert_eq!(favorites["total"], 1);
        req.filter.clear();
        // Recovery: the same fingerprint is not trusted blindly; the next scan restores it.
        write("a.jsonl", "a");
        write("b.jsonl", "b");
        execute("scan", &req, &cancel).unwrap();
        let page = execute("query", &req, &cancel).unwrap();
        for id in ["a", "b", "c"] {
            assert_eq!(status_of(&page, id), "available");
        }
        // A vanished root marks every row of that root missing instead of dropping them.
        fs::remove_dir_all(&dir).unwrap();
        execute("scan", &req, &cancel).unwrap();
        let page = execute("query", &req, &cancel).unwrap();
        assert_eq!(page["total"], 3);
        for id in ["a", "b", "c"] {
            assert_eq!(status_of(&page, id), "missing");
        }
    }
    #[test]
    fn appended_or_touched_sources_stay_readable_and_replaced_ones_are_changed() {
        let vault = Temp::new();
        let dir = vault.0.join(".huhu/agents/test/codex");
        fs::create_dir_all(&dir).unwrap();
        let file = dir.join("a.jsonl");
        fs::write(&file, codex_row("a", &vault.0)).unwrap();
        let mut req = request(
            &vault.0,
            vec![Root {
                agent_id: "codex".into(),
                path: dir.to_string_lossy().into(),
                account_key: "acct".into(),
                system_base: None,
            }],
        );
        req.scope = "vault".into();
        let cancel = AtomicBool::new(false);
        execute("scan", &req, &cancel).unwrap();
        req.key = serde_json::to_string(&("codex", "acct", "a")).unwrap();
        assert_eq!(
            execute("read", &req, &cancel).unwrap()["sourceStatus"],
            "available"
        );
        // Append (a running session): fresh text including the new content, no scan needed.
        let mut text = fs::read_to_string(&file).unwrap();
        text.push_str(&format!("{}\n",json!({"type":"response_item","payload":{"type":"message","role":"user","content":[{"text":"appended after indexing"}]}})));
        fs::write(&file, &text).unwrap();
        let read = execute("read", &req, &cancel).unwrap();
        assert_eq!(read["sourceStatus"], "available");
        assert!(read["text"]
            .as_str()
            .unwrap()
            .contains("appended after indexing"));
        // mtime drift alone still verifies.
        execute("scan", &req, &cancel).unwrap();
        touch(&file);
        let read = execute("read", &req, &cancel).unwrap();
        assert_eq!(read["sourceStatus"], "available");
        assert!(read["text"]
            .as_str()
            .unwrap()
            .contains("appended after indexing"));
        execute("scan", &req, &cancel).unwrap();
        // Shrunk (truncated / rewritten smaller): identity not verifiable.
        let big = fs::read_to_string(&file).unwrap();
        fs::write(&file, codex_row("a", &vault.0)).unwrap();
        let read = execute("read", &req, &cancel).unwrap();
        assert_eq!(read["sourceStatus"], "changed");
        assert_eq!(read["text"], "");
        // Replaced by another session's transcript that is larger: same path, other id.
        fs::write(
            &file,
            format!(
                "{}{}\n",
                codex_row("other", &vault.0),
                "x".repeat(big.len())
            ),
        )
        .unwrap();
        let read = execute("read", &req, &cancel).unwrap();
        assert_eq!(read["sourceStatus"], "changed");
        assert_eq!(read["text"], "");
        // Atomic replace with the same size: a different inode.
        #[cfg(unix)]
        {
            fs::write(&file, &big).unwrap();
            execute("scan", &req, &cancel).unwrap();
            let meta = fs::metadata(&file).unwrap();
            let replacement = dir.join("replacement.tmp");
            fs::copy(&file, &replacement).unwrap();
            fs::OpenOptions::new()
                .write(true)
                .open(&replacement)
                .unwrap()
                .set_modified(meta.modified().unwrap())
                .unwrap();
            fs::rename(&replacement, &file).unwrap();
            assert_eq!(
                execute("read", &req, &cancel).unwrap()["sourceStatus"],
                "changed"
            );
        }
        // Identity gate on platforms without inodes (stored inode 0): shrink still fails it.
        let row = Session {
            agent_id: "codex".into(),
            transcript_path: file.to_string_lossy().into(),
            ..Default::default()
        };
        let len = fs::metadata(&file).unwrap().len();
        assert!(drift_verifies(&row, &format!("sources-v2:vault:1:{len}:0")));
        assert!(!drift_verifies(
            &row,
            &format!("sources-v2:vault:1:{}:0", len + 1)
        ));
    }
    #[test]
    fn opencode_drift_returns_fresh_body_while_the_session_exists() {
        let vault = Temp::new();
        let other = Temp::new();
        let dir = vault.0.join(".huhu/agents/test/opencode");
        fs::create_dir_all(&dir).unwrap();
        let file = dir.join("opencode.db");
        {
            let db = Connection::open(&file).unwrap();
            opencode_schema(&db);
            opencode_rows(&db, &vault.0, &other.0);
        }
        let mut req = request(&vault.0, vec![opencode_root(&file)]);
        req.scope = "vault".into();
        let cancel = AtomicBool::new(false);
        execute("scan", &req, &cancel).unwrap();
        req.key = serde_json::to_string(&("opencode", "acct", "main")).unwrap();
        // OpenCode keeps writing: the fingerprint drifts, the session is still there.
        {
            let db = Connection::open(&file).unwrap();
            db.execute(
                "INSERT INTO part VALUES ('m-main',2,?1)",
                params![json!({"type":"text","text":"fresh after indexing"}).to_string()],
            )
            .unwrap();
        }
        let read = execute("read", &req, &cancel).unwrap();
        assert_eq!(read["sourceStatus"], "available");
        assert!(read["text"]
            .as_str()
            .unwrap()
            .contains("fresh after indexing"));
        // The session disappears from the database: changed, no body.
        execute("scan", &req, &cancel).unwrap();
        {
            let db = Connection::open(&file).unwrap();
            db.execute("DELETE FROM session WHERE id='main'", [])
                .unwrap();
        }
        let read = execute("read", &req, &cancel).unwrap();
        assert_eq!(read["sourceStatus"], "changed");
        assert_eq!(read["text"], "");
    }
    #[test]
    fn an_available_row_whose_source_vanished_or_locked_reads_precisely_without_leaking() {
        let vault = Temp::new();
        let outside = Temp::new();
        let dir = vault.0.join(".huhu/agents/test/codex");
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("gone.jsonl"), codex_row("gone", &vault.0)).unwrap();
        fs::write(dir.join("far.jsonl"), codex_row("far", &outside.0)).unwrap();
        #[cfg(unix)]
        fs::write(dir.join("locked.jsonl"), codex_row("locked", &vault.0)).unwrap();
        let root = Root {
            agent_id: "codex".into(),
            path: dir.to_string_lossy().into(),
            account_key: "acct".into(),
            system_base: None,
        };
        let mut req = request(&vault.0, vec![root]);
        req.scope = "account".into();
        let cancel = AtomicBool::new(false);
        execute("scan", &req, &cancel).unwrap();
        // Deleted before any rescan: still `available` in the index, reads as `missing`.
        fs::remove_file(dir.join("gone.jsonl")).unwrap();
        fs::remove_file(dir.join("far.jsonl")).unwrap();
        req.key = serde_json::to_string(&("codex", "acct", "gone")).unwrap();
        let read = execute("read", &req, &cancel).unwrap();
        assert_eq!(read["sourceStatus"], "missing");
        assert_eq!(read["text"], "");
        assert_eq!(read["sessionId"], "gone");
        // Vault scope: the in-vault cwd row is reported, the outside-cwd row is not admitted
        // at all, so its (deleted) source never reveals that the row exists.
        req.scope = "vault".into();
        assert_eq!(
            execute("read", &req, &cancel).unwrap()["sourceStatus"],
            "missing"
        );
        req.key = serde_json::to_string(&("codex", "acct", "far")).unwrap();
        assert_eq!(
            execute("read", &req, &cancel).unwrap_err(),
            "session outside vault"
        );
        // A different account directory (system roots/bases not named) is likewise opaque.
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let locked = dir.join("locked.jsonl");
            fs::set_permissions(&locked, fs::Permissions::from_mode(0o000)).unwrap();
            if File::open(&locked).is_ok() {
                eprintln!("skipped: permission checks are bypassed for this user");
            } else {
                req.key = serde_json::to_string(&("codex", "acct", "locked")).unwrap();
                let read = execute("read", &req, &cancel).unwrap();
                assert_eq!(read["sourceStatus"], "permission-denied");
                assert_eq!(read["text"], "");
            }
            fs::set_permissions(&locked, fs::Permissions::from_mode(0o600)).unwrap();
        }
    }
    #[test]
    #[cfg(unix)]
    fn an_unreadable_source_is_permission_denied_and_other_sources_continue() {
        use std::os::unix::fs::PermissionsExt;
        let vault = Temp::new();
        let dir = vault.0.join(".huhu/agents/test/codex");
        fs::create_dir_all(&dir).unwrap();
        for id in ["a", "b"] {
            fs::write(dir.join(format!("{id}.jsonl")), codex_row(id, &vault.0)).unwrap();
        }
        let mut req = request(
            &vault.0,
            vec![Root {
                agent_id: "codex".into(),
                path: dir.to_string_lossy().into(),
                account_key: "acct".into(),
                system_base: None,
            }],
        );
        req.scope = "vault".into();
        let cancel = AtomicBool::new(false);
        execute("scan", &req, &cancel).unwrap();
        let locked = dir.join("a.jsonl");
        fs::set_permissions(&locked, fs::Permissions::from_mode(0o000)).unwrap();
        if File::open(&locked).is_ok() {
            // Running as a privileged user: the platform cannot deny this read.
            eprintln!("skipped: permission checks are bypassed for this user");
            return;
        }
        // Touch the mtime so the fingerprint no longer matches and the file is re-read.
        let _ = std::process::Command::new("touch").arg(&locked).status();
        execute("scan", &req, &cancel).unwrap();
        let page = execute("query", &req, &cancel).unwrap();
        assert_eq!(status_of(&page, "a"), "permission-denied");
        assert_eq!(status_of(&page, "b"), "available");
        req.key = serde_json::to_string(&("codex", "acct", "a")).unwrap();
        let read = execute("read", &req, &cancel).unwrap();
        assert_eq!(read["sourceStatus"], "permission-denied");
        assert_eq!(read["text"], "");
        fs::set_permissions(&locked, fs::Permissions::from_mode(0o600)).unwrap();
    }
    // ---- Round 2: scan-time metadata, search, sweep, read admission, reconcile, ownership ----
    fn row_of<'a>(page: &'a Value, id: &str) -> &'a Value {
        page["rows"]
            .as_array()
            .unwrap()
            .iter()
            .find(|row| row["sessionId"] == id)
            .unwrap_or_else(|| panic!("row {id} missing from {page}"))
    }
    #[test]
    fn scan_stores_title_usage_model_and_message_count_without_the_body() {
        let vault = Temp::new();
        let base = vault.0.join(".huhu/agents/test");
        let cwd = &vault.0;
        let write = |rel: &str, text: String| {
            let path = base.join(rel);
            fs::create_dir_all(path.parent().unwrap()).unwrap();
            fs::write(path, text).unwrap();
        };
        let lines = |rows: Vec<Value>| rows.iter().map(|r| format!("{r}\n")).collect::<String>();
        write(
            "claude/c.jsonl",
            lines(vec![
                json!({"type":"user","sessionId":"c1","cwd":cwd,"message":{"role":"user","content":"claude title"}}),
                json!({"type":"assistant","sessionId":"c1","cwd":cwd,"message":{"id":"m1","model":"claude-x","role":"assistant","content":"hi","usage":{"input_tokens":7,"output_tokens":3}}}),
            ]),
        );
        write(
            "codex/c.jsonl",
            lines(vec![
                json!({"type":"session_meta","payload":{"id":"x1","cwd":cwd}}),
                json!({"type":"response_item","payload":{"type":"message","role":"user","content":[{"text":"codex title"}]}}),
                json!({"type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":11,"output_tokens":4}}}}),
            ]),
        );
        write(
            "pi/p.jsonl",
            lines(vec![
                json!({"type":"session","id":"p1","cwd":cwd}),
                json!({"type":"message","message":{"role":"user","content":[{"type":"text","text":"pi title"}]}}),
                json!({"type":"message","message":{"id":"a","role":"assistant","content":[{"type":"text","text":"ok"}],"usage":{"input":5,"output":2}}}),
            ]),
        );
        write(
            "grok/s/session.json",
            json!({"info":{"id":"g1","cwd":cwd},"generated_title":"grok title"}).to_string(),
        );
        write(
            "grok/s/chat_history.jsonl",
            lines(vec![json!({"type":"user","content":"hello grok"})]),
        );
        write(
            "gemini/projects.json",
            json!({"projects":{cwd.to_string_lossy().to_string():"proj"}}).to_string(),
        );
        write(
            "gemini/tmp/proj/chats/session.jsonl",
            lines(vec![
                json!({"sessionId":"gm1"}),
                json!({"type":"user","content":"gemini title"}),
                json!({"type":"gemini","content":"answer","tokens":{"input":9,"output":2}}),
            ]),
        );
        let db_dir = base.join("opencode");
        fs::create_dir_all(&db_dir).unwrap();
        let db_file = db_dir.join("opencode.db");
        {
            let db = Connection::open(&db_file).unwrap();
            opencode_schema(&db);
            opencode_rows(&db, cwd, cwd);
        }
        let root = |agent: &str, path: PathBuf| Root {
            agent_id: agent.into(),
            path: path.to_string_lossy().into(),
            account_key: "acct".into(),
            system_base: None,
        };
        let mut req = request(
            &vault.0,
            vec![
                root("claude-code", base.join("claude")),
                root("codex", base.join("codex")),
                root("pi", base.join("pi")),
                root("grok", base.join("grok")),
                root("gemini", base.join("gemini/tmp")),
                root("opencode", db_file.clone()),
            ],
        );
        req.scope = "vault".into();
        let cancel = AtomicBool::new(false);
        let scan = execute("scan", &req, &cancel).unwrap();
        assert_eq!(scan["warnings"].as_array().unwrap().len(), 0, "{scan}");
        let page = execute("query", &req, &cancel).unwrap();
        for (id, title, input, count) in [
            ("c1", "claude title", 7, 2),
            ("x1", "codex title", 11, 1),
            ("p1", "pi title", 5, 2),
            ("g1", "grok title", 0, 1),
            ("gm1", "gemini title", 9, 2),
            ("main", "title main", 10, 1),
        ] {
            let row = row_of(&page, id);
            assert_eq!(row["title"], title, "{id}");
            assert_eq!(row["usage"]["input"], input, "{id}");
            assert_eq!(row["usage"]["known"], input > 0, "{id}");
            assert_eq!(row["messageCount"], count, "{id}");
            assert!(row.get("text").is_none(), "no body in the list row: {id}");
        }
        assert_eq!(row_of(&page, "c1")["model"], "claude-x");
        let body: i64 = Connection::open(&req.index)
            .unwrap()
            .query_row("SELECT sum(length(text)) FROM history_text", [], |r| {
                r.get(0)
            })
            .unwrap();
        assert_eq!(body, 0, "no body is stored by a scan");
    }
    #[test]
    fn search_uses_lowercased_metadata_columns_only() {
        let vault = Temp::new();
        let dir = vault.0.join(".huhu/agents/test/claude");
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("a.jsonl"), format!("{}\n", json!({"type":"user","sessionId":"SessABC-9","cwd":vault.0,"customTitle":"Fix Login BUG","message":{"role":"user","content":"secret body text"}}))).unwrap();
        let mut req = request(
            &vault.0,
            vec![Root {
                agent_id: "claude-code".into(),
                path: dir.to_string_lossy().into(),
                account_key: "acct".into(),
                system_base: None,
            }],
        );
        req.scope = "vault".into();
        let cancel = AtomicBool::new(false);
        execute("scan", &req, &cancel).unwrap();
        for (query, total) in [
            ("login bug", 1),
            ("LOGIN", 1),
            ("Fix Login BUG", 1),
            ("sessabc", 1),
            ("SESSABC-9", 1),
            ("huhu", 1),
            ("available", 0),
            ("sourcestatus", 0),
            ("secret body", 0),
            ("claude-code", 0),
        ] {
            req.query = query.into();
            assert_eq!(
                execute("query", &req, &cancel).unwrap()["total"],
                total,
                "{query}"
            );
        }
    }
    #[cfg(unix)]
    #[test]
    fn stale_snapshot_directories_are_swept_but_live_ones_are_kept() {
        let base = Temp::new();
        let make = |name: String| {
            let dir = base.0.join(name);
            fs::create_dir_all(&dir).unwrap();
            fs::write(dir.join("opencode.db"), b"copy").unwrap();
            dir
        };
        let mut child = std::process::Command::new("true").spawn().unwrap();
        let dead = child.id();
        child.wait().unwrap();
        let stale = make(format!("{SNAPSHOT_PREFIX}{dead}-1-1"));
        let own = make(format!("{SNAPSHOT_PREFIX}{}-1-1", std::process::id()));
        let parent = make(format!(
            "{SNAPSHOT_PREFIX}{}-1-2",
            std::os::unix::process::parent_id()
        ));
        let unrelated = make("other-dir".into());
        let aged = make(format!(
            "{SNAPSHOT_PREFIX}{}-1-3",
            std::os::unix::process::parent_id()
        ));
        sweep_snapshots_in(&base.0, SNAPSHOT_MAX_AGE);
        assert!(!stale.exists(), "dead pid directory is removed");
        assert!(own.exists() && parent.exists() && unrelated.exists() && aged.exists());
        // Anything past the age limit goes, whatever the pid says (not our own).
        sweep_snapshots_in(&base.0, Duration::ZERO);
        assert!(!parent.exists() && !aged.exists());
        assert!(own.exists() && unrelated.exists());
    }
    #[test]
    fn read_admission_precedes_key_specific_errors_and_the_final_response_is_capped() {
        let vault = Temp::new();
        let outside = Temp::new();
        let mut req = request(&vault.0, vec![]);
        req.scope = "vault".into();
        let cancel = AtomicBool::new(false);
        execute("query", &req, &cancel).unwrap();
        let db = Connection::open(&req.index).unwrap();
        // Oversized body on a row that is NOT admitted (cwd outside the vault).
        let hidden = Session {
            key: "hidden".into(),
            cwd: outside.0.to_string_lossy().into(),
            ..synthetic(&vault.0)
        };
        let stamp = stamp_for(
            "vault",
            "",
            Path::new(&hidden.transcript_path),
            &hidden.sources,
        )
        .unwrap()
        .0;
        save(&db, &hidden, &stamp).unwrap();
        db.execute("UPDATE history_text SET text=replace(hex(zeroblob(400000)),'0','x') WHERE key='hidden'", []).unwrap();
        drop(db);
        let mut answers = Vec::new();
        for key in ["hidden", "no-such-key"] {
            req.key = key.into();
            answers.push(execute("read", &req, &cancel).unwrap_err());
        }
        assert_eq!(answers[0], "session outside vault");
        assert_eq!(
            answers[0], answers[1],
            "existence of an out-of-scope key is not revealed"
        );
        // OpenCode body is capped like add_message and flagged partial.
        let dir = vault.0.join(".huhu/agents/test/opencode");
        fs::create_dir_all(&dir).unwrap();
        let file = dir.join("opencode.db");
        {
            let db = Connection::open(&file).unwrap();
            opencode_schema(&db);
            opencode_rows(&db, &vault.0, &outside.0);
            for n in 0..7 {
                db.execute(
                    "INSERT INTO part VALUES ('m-main',?1,?2)",
                    params![
                        n + 2,
                        json!({"type":"text","text":"y".repeat(100_000)}).to_string()
                    ],
                )
                .unwrap();
            }
        }
        let mut req = request(&vault.0, vec![opencode_root(&file)]);
        req.scope = "vault".into();
        execute("scan", &req, &cancel).unwrap();
        req.key = serde_json::to_string(&("opencode", "acct", "main")).unwrap();
        let read = execute("read", &req, &cancel).unwrap();
        assert!(read["text"].as_str().unwrap().len() < crate::outbox::RESULT_DATA_BYTES);
        assert_eq!(read["usage"]["partial"], true);
    }
    #[test]
    fn deleted_opencode_sessions_and_replaced_transcripts_are_reconciled() {
        let vault = Temp::new();
        let outside = Temp::new();
        let dir = vault.0.join(".huhu/agents/test/opencode");
        fs::create_dir_all(&dir).unwrap();
        let file = dir.join("opencode.db");
        {
            let db = Connection::open(&file).unwrap();
            opencode_schema(&db);
            opencode_rows(&db, &vault.0, &outside.0);
            db.execute(
                "INSERT INTO session VALUES ('second',?1,'second',14,NULL)",
                params![vault.0.to_string_lossy()],
            )
            .unwrap();
        }
        let codex = vault.0.join(".huhu/agents/test/codex");
        fs::create_dir_all(&codex).unwrap();
        fs::write(codex.join("a.jsonl"), codex_row("old", &vault.0)).unwrap();
        let mut req = request(
            &vault.0,
            vec![
                opencode_root(&file),
                Root {
                    agent_id: "codex".into(),
                    path: codex.to_string_lossy().into(),
                    account_key: "acct".into(),
                    system_base: None,
                },
            ],
        );
        req.scope = "vault".into();
        let cancel = AtomicBool::new(false);
        execute("scan", &req, &cancel).unwrap();
        let page = execute("query", &req, &cancel).unwrap();
        assert_eq!(page["total"], 3);
        {
            let db = Connection::open(&file).unwrap();
            db.execute("DELETE FROM session WHERE id='second'", [])
                .unwrap();
        }
        // The transcript path is now another session (key changes).
        fs::write(codex.join("a.jsonl"), codex_row("new", &vault.0)).unwrap();
        execute("scan", &req, &cancel).unwrap();
        let page = execute("query", &req, &cancel).unwrap();
        assert_eq!(status_of(&page, "second"), "missing");
        assert_eq!(status_of(&page, "main"), "available");
        assert_eq!(status_of(&page, "old"), "changed");
        assert_eq!(status_of(&page, "new"), "available");
    }
    #[test]
    fn a_selected_source_mismatch_is_rejected_before_reading_the_body() {
        let vault = Temp::new();
        let dir = vault.0.join(".huhu/agents/test/codex");
        fs::create_dir_all(&dir).unwrap();
        let file = dir.join("a.jsonl");
        fs::write(&file, codex_row("same", &vault.0)).unwrap();
        let root = Root {
            agent_id: "codex".into(),
            account_key: "acct".into(),
            path: dir.to_string_lossy().into(),
            system_base: None,
        };
        let mut scan = request(&vault.0, vec![root]);
        scan.scope = "vault".into();
        let cancel = AtomicBool::new(false);
        execute("scan", &scan, &cancel).unwrap();
        let row = execute("query", &scan, &cancel).unwrap()["rows"][0].clone();
        let read: Request = serde_json::from_value(json!({"vault":scan.vault,"index":scan.index,"scope":"vault","deviceId":"test-device","key":row["key"],"expectedSource":{"agentId":"codex","accountKey":"acct","sessionId":"same","deviceId":"test-device","transcriptPath":file,"sourceRef":"different-source"}})).unwrap();
        let reached = std::rc::Rc::new(std::cell::Cell::new(false));
        let observed = reached.clone();
        READ_BUDGET_HOOK
            .with(|hook| *hook.borrow_mut() = Some(Box::new(move || observed.set(true))));
        let result = execute("read", &read, &cancel);
        READ_BUDGET_HOOK.with(|hook| {
            hook.borrow_mut().take();
        });
        assert!(
            result.is_err(),
            "a stale source selection cannot read another row"
        );
        assert!(
            !reached.get(),
            "expected source must be checked before body access"
        );
    }
    #[test]
    fn duplicate_locators_keep_the_original_source_and_annotations_but_refuse_bodies() {
        let vault = Temp::new();
        let dir = vault.0.join(".huhu/agents/test/codex");
        fs::create_dir_all(&dir).unwrap();
        let a = dir.join("a.jsonl");
        let b = dir.join("b.jsonl");
        let body = |text: &str| {
            format!(
                "{}{}\n",
                codex_row("same", &vault.0),
                json!({"type":"response_item","payload":{"type":"message","role":"user","content":[{"type":"input_text","text":text}]}})
            )
        };
        fs::write(&a, body("A body")).unwrap();
        let root = Root {
            agent_id: "codex".into(),
            account_key: "acct".into(),
            path: dir.to_string_lossy().into(),
            system_base: None,
        };
        let source_a = source_ref(&root, &a);
        let mut req = request(&vault.0, vec![root]);
        req.scope = "vault".into();
        let cancel = AtomicBool::new(false);
        execute("scan", &req, &cancel).unwrap();
        let initial = execute("query", &req, &cancel).unwrap();
        req.key = initial["rows"][0]["key"].as_str().unwrap().into();
        req.metadata.insert(
            req.key.clone(),
            json!({"title":"My A annotation","favorite":true}),
        );
        fs::write(&b, body("B body")).unwrap();
        File::options()
            .write(true)
            .open(&b)
            .unwrap()
            .set_modified(fs::metadata(&a).unwrap().modified().unwrap())
            .unwrap();
        execute("scan", &req, &cancel).unwrap();
        let page = execute("query", &req, &cancel).unwrap();
        assert_eq!(page["total"], 1);
        assert_eq!(
            page["rows"][0]["sourceRef"], source_a,
            "an opaque key must not transfer annotations to another locator"
        );
        assert_eq!(page["rows"][0]["sourceStatus"], "changed");
        assert_eq!(page["rows"][0]["sourceReason"], "identity-collision");
        let read = execute("read", &req, &cancel).unwrap();
        assert_eq!(read["sourceStatus"], "changed");
        assert_eq!(read["text"], "");
        // Repeated scans with both sources keep the conflict visible, regardless of traversal order.
        execute("scan", &req, &cancel).unwrap();
        assert_eq!(
            execute("query", &req, &cancel).unwrap()["rows"][0]["sourceStatus"],
            "changed"
        );
        fs::remove_file(&b).unwrap();
        execute("scan", &req, &cancel).unwrap();
        let restored = execute("query", &req, &cancel).unwrap();
        assert_eq!(restored["rows"][0]["sourceRef"], source_a);
        assert_eq!(restored["rows"][0]["sourceStatus"], "available");
        let read = execute("read", &req, &cancel).unwrap();
        assert!(read["text"].as_str().unwrap().contains("A body"));
        assert!(!read["text"].as_str().unwrap().contains("B body"));
    }
    #[test]
    fn owned_history_requires_exact_account_source_and_device() {
        let vault = Temp::new();
        let outside = Temp::new();
        let mut roots = Vec::new();
        for account in ["a", "b"] {
            let dir = vault.0.join(format!(".huhu/agents/test/{account}"));
            fs::create_dir_all(&dir).unwrap();
            fs::write(dir.join("same.jsonl"), codex_row("same", &outside.0)).unwrap();
            roots.push(Root {
                agent_id: "codex".into(),
                account_key: account.into(),
                path: dir.to_string_lossy().into(),
                system_base: None,
            });
        }
        let path = Path::new(&roots[0].path).join("same.jsonl");
        let owned = json!({"agentId":"codex","sessionId":"same","accountKey":"a","deviceId":"test-device","transcriptPath":path,"sourceRef":source_ref(&roots[0], &path)});
        let mut req = request(&vault.0, roots);
        req.scope = "vault".into();
        req.owned_sessions = serde_json::from_value(json!([owned])).unwrap();
        let cancel = AtomicBool::new(false);
        execute("scan", &req, &cancel).unwrap();
        let page = execute("query", &req, &cancel).unwrap();
        assert_eq!(
            page["total"], 1,
            "another account must not inherit admission"
        );
        assert_eq!(page["rows"][0]["accountKey"], "a");
        req.key = serde_json::to_string(&("codex", "b", "same")).unwrap();
        assert!(execute("read", &req, &cancel).is_err());
        // A complete identity with the wrong locator cannot authorize this source either.
        req.owned_sessions = serde_json::from_value(json!([{"agentId":"codex","sessionId":"same","accountKey":"a","deviceId":"test-device","transcriptPath":path,"sourceRef":"wrong-source"}])).unwrap();
        assert_eq!(execute("query", &req, &cancel).unwrap()["total"], 0);
        req.owned_sessions = serde_json::from_value(json!([{"agentId":"codex","sessionId":"same","accountKey":"a","deviceId":"another-device","transcriptPath":path,"sourceRef":format!("codex:a:{}",path.to_string_lossy())}])).unwrap();
        assert_eq!(execute("query", &req, &cancel).unwrap()["total"], 0);
        req.owned_sessions =
            serde_json::from_value(json!([{"agentId":"codex","sessionId":"same"}])).unwrap();
        assert_eq!(
            execute("query", &req, &cancel).unwrap()["total"],
            0,
            "legacy partial identities cannot expand access"
        );
    }
    #[test]
    fn vault_projection_admits_space_owned_out_of_vault_sessions_and_purges_the_rest() {
        let vault = Temp::new();
        let outside = Temp::new();
        let dir = vault.0.join(".huhu/agents/test/codex");
        fs::create_dir_all(&dir).unwrap();
        for (name, id, cwd) in [
            ("in", "inside", &vault.0),
            ("bound", "bound", &outside.0),
            ("free", "free", &outside.0),
        ] {
            fs::write(dir.join(format!("{name}.jsonl")), codex_row(id, cwd)).unwrap();
        }
        let root = Root {
            agent_id: "codex".into(),
            path: dir.to_string_lossy().into(),
            account_key: "acct".into(),
            system_base: None,
        };
        let mut req = request(&vault.0, vec![root]);
        let cancel = AtomicBool::new(false);
        // An earlier account-scope scan indexed everything (the stale rows to purge).
        req.scope = "account".into();
        execute("scan", &req, &cancel).unwrap();
        assert_eq!(execute("query", &req, &cancel).unwrap()["total"], 3);
        let count = |req: &Request| -> i64 {
            Connection::open(&req.index)
                .unwrap()
                .query_row("SELECT count(*) FROM history", [], |r| r.get(0))
                .unwrap()
        };
        assert_eq!(count(&req), 3);
        // Vault scan, nothing bound: only the in-vault session survives; no outside row
        // is readable or indexed.
        req.scope = "vault".into();
        execute("scan", &req, &cancel).unwrap();
        assert_eq!(count(&req), 1);
        let page = execute("query", &req, &cancel).unwrap();
        assert_eq!(page["total"], 1);
        assert_eq!(page["rows"][0]["sessionId"], "inside");
        for id in ["bound", "free"] {
            req.key = serde_json::to_string(&("codex", "acct", id)).unwrap();
            assert_eq!(
                execute("read", &req, &cancel).unwrap_err(),
                "session outside vault"
            );
        }
        // Binding a session to a Space (request field) lists and reads it; the unbound stays out.
        let payload = json!({
            "vault": req.vault, "index": req.index, "scope": "vault",
            "roots": [{"agentId":"codex","path":dir,"accountKey":"acct"}],
            "deviceId":"test-device",
            "ownedSessions": [{"agentId":"codex","sessionId":"bound","accountKey":"acct","deviceId":"test-device","transcriptPath":dir.join("bound.jsonl"),"sourceRef":format!("codex:acct:{}",dir.join("bound.jsonl").to_string_lossy())}],
        });
        let mut owned: Request = serde_json::from_value(payload).unwrap();
        assert_eq!(owned.owned_sessions.len(), 1);
        execute("scan", &owned, &cancel).unwrap();
        let page = execute("query", &owned, &cancel).unwrap();
        assert_eq!(page["total"], 2);
        assert_eq!(row_of(&page, "bound")["sourceStatus"], "available");
        owned.key = serde_json::to_string(&("codex", "acct", "bound")).unwrap();
        assert_eq!(
            execute("read", &owned, &cancel).unwrap()["sessionId"],
            "bound"
        );
        owned.key = serde_json::to_string(&("codex", "acct", "free")).unwrap();
        assert_eq!(
            execute("read", &owned, &cancel).unwrap_err(),
            "session outside vault"
        );
        assert_eq!(count(&owned), 2);
        // Without the binding the next scan purges the row again; the query omits it too.
        owned.owned_sessions.clear();
        assert_eq!(execute("query", &owned, &cancel).unwrap()["total"], 1);
        execute("scan", &owned, &cancel).unwrap();
        assert_eq!(count(&owned), 1);
    }
    #[test]
    fn binding_an_opencode_session_reindexes_an_unchanged_database_and_unbinding_purges() {
        let vault = Temp::new();
        let outside = Temp::new();
        let dir = vault.0.join(".huhu/agents/test/opencode");
        fs::create_dir_all(&dir).unwrap();
        let file = dir.join("opencode.db");
        {
            let db = Connection::open(&file).unwrap();
            opencode_schema(&db);
            opencode_rows(&db, &vault.0, &outside.0);
        }
        let mut req = request(&vault.0, vec![opencode_root(&file)]);
        req.scope = "vault".into();
        let cancel = AtomicBool::new(false);
        execute("scan", &req, &cancel).unwrap();
        execute("scan", &req, &cancel).unwrap();
        assert_eq!(execute("query", &req, &cancel).unwrap()["total"], 1);
        // Bind the foreign-cwd session; the database file itself is untouched.
        let before = listing(&dir);
        req.owned_sessions = vec![OwnedSession {
            agent_id: "opencode".into(),
            session_id: "foreign".into(),
            account_key: "acct".into(),
            device_id: "test-device".into(),
            transcript_path: file.to_string_lossy().into(),
            source_ref: format!("opencode:acct:{}#foreign", file.to_string_lossy()),
        }];
        execute("scan", &req, &cancel).unwrap();
        assert_eq!(before, listing(&dir));
        let page = execute("query", &req, &cancel).unwrap();
        assert_eq!(page["total"], 2);
        assert_eq!(status_of(&page, "foreign"), "available");
        req.key = serde_json::to_string(&("opencode", "acct", "foreign")).unwrap();
        assert!(execute("read", &req, &cancel).unwrap()["text"]
            .as_str()
            .unwrap()
            .contains("answer foreign"));
        // The digest suffix is not drift.
        req.key = serde_json::to_string(&("opencode", "acct", "main")).unwrap();
        assert_eq!(
            execute("read", &req, &cancel).unwrap()["sourceStatus"],
            "available"
        );
        // Unbind: the next scan purges it again.
        req.owned_sessions.clear();
        execute("scan", &req, &cancel).unwrap();
        assert_eq!(execute("query", &req, &cancel).unwrap()["total"], 1);
        req.key = serde_json::to_string(&("opencode", "acct", "foreign")).unwrap();
        assert_eq!(
            execute("read", &req, &cancel).unwrap_err(),
            "session outside vault"
        );
        let rows: i64 = Connection::open(&req.index)
            .unwrap()
            .query_row("SELECT count(*) FROM history", [], |r| r.get(0))
            .unwrap();
        assert_eq!(rows, 1);
    }
    #[test]
    fn legacy_rows_without_verifiable_provenance_are_not_admitted_in_vault_scope() {
        let vault = Temp::new();
        let outside = Temp::new();
        let transcript = outside.0.join("legacy.jsonl");
        fs::write(&transcript, codex_row("legacy", &vault.0)).unwrap();
        let mut req = request(&vault.0, vec![]);
        req.scope = "vault".into();
        let cancel = AtomicBool::new(false);
        execute("scan", &req, &cancel).unwrap();
        let db = Connection::open(&req.index).unwrap();
        // Old index shapes: no sources, no status, cwd inside the vault, transcript outside it.
        let legacy = |key: &str, status: &str, sources: Vec<HistorySource>| Session {
            key: key.into(),
            agent_id: "codex".into(),
            account_key: "acct".into(),
            session_id: key.into(),
            cwd: vault.0.to_string_lossy().into(),
            transcript_path: transcript.to_string_lossy().into(),
            sources,
            source_status: status.into(),
            ..Default::default()
        };
        save(&db, &legacy("none", "", vec![]), "sources-v1:vault:1:1").unwrap();
        save(&db, &legacy("empty", "available", vec![]), "x").unwrap();
        save(
            &db,
            &legacy(
                "outside",
                "available",
                vec![HistorySource {
                    path: transcript.clone(),
                    required: true,
                }],
            ),
            "x",
        )
        .unwrap();
        drop(db);
        assert_eq!(execute("query", &req, &cancel).unwrap()["total"], 0);
        for key in ["none", "empty", "outside"] {
            req.key = key.into();
            assert_eq!(
                execute("read", &req, &cancel).unwrap_err(),
                "session outside vault",
                "{key}"
            );
        }
        // A non-available status does not bypass the provenance requirement either.
        let db = Connection::open(&req.index).unwrap();
        save(&db, &legacy("gone", "missing", vec![]), "x").unwrap();
        drop(db);
        assert_eq!(execute("query", &req, &cancel).unwrap()["total"], 0);
        // A scan of a non-managed vault root refuses it instead of indexing without provenance.
        let mut scan = request(
            &vault.0,
            vec![Root {
                agent_id: "codex".into(),
                path: outside.0.to_string_lossy().into(),
                account_key: "acct".into(),
                system_base: None,
            }],
        );
        scan.scope = "vault".into();
        let result = execute("scan", &scan, &cancel).unwrap();
        assert_eq!(result["warnings"].as_array().unwrap().len(), 1);
        assert_eq!(execute("query", &scan, &cancel).unwrap()["total"], 0);
    }
    #[test]
    fn gemini_registry_jsonl_and_grok_companion_refresh() {
        let temp = Temp::new();
        let home = temp.0.join(".huhu/agents/test/gemini");
        let chats = home.join("tmp/project-one/chats");
        fs::create_dir_all(&chats).unwrap();
        fs::write(
            home.join("projects.json"),
            json!({"projects":{temp.0.to_string_lossy().to_string():"project-one"}}).to_string(),
        )
        .unwrap();
        fs::write(chats.join("session.jsonl"), format!("{}\n{}\n{}\n", json!({"sessionId":"gemini-one"}), json!({"type":"user","content":"hello"}), json!({"type":"gemini","content":"answer","tokens":{"input":10,"output":5,"cached":3}}))).unwrap();
        let grok = temp.0.join(".huhu/agents/test/grok/session-one");
        fs::create_dir_all(&grok).unwrap();
        fs::write(
            grok.join("session.json"),
            json!({"info":{"id":"grok-one","cwd":temp.0},"generated_title":"title"}).to_string(),
        )
        .unwrap();
        fs::write(grok.join("chat_history.jsonl"), "").unwrap();
        let mut req = request(
            &temp.0,
            vec![
                Root {
                    agent_id: "gemini".into(),
                    path: home.join("tmp").to_string_lossy().into(),
                    account_key: "{}".into(),
                    system_base: None,
                },
                Root {
                    agent_id: "grok".into(),
                    path: temp
                        .0
                        .join(".huhu/agents/test/grok")
                        .to_string_lossy()
                        .into(),
                    account_key: "{}".into(),
                    system_base: None,
                },
            ],
        );
        let cancel = AtomicBool::new(false);
        execute("scan", &req, &cancel).unwrap();
        let page = execute("query", &req, &cancel).unwrap();
        assert_eq!(page["total"], 2);
        assert_eq!(page["usage"]["input"], 10);
        assert_eq!(page["usage"]["known"], true);
        fs::write(
            grok.join("chat_history.jsonl"),
            format!(
                "{}\n",
                json!({"type":"assistant","content":"new companion text"})
            ),
        )
        .unwrap();
        execute("scan", &req, &cancel).unwrap();
        req.query = "new companion".into();
        assert_eq!(execute("query", &req, &cancel).unwrap()["total"], 0);
        req.query.clear();
        req.key = serde_json::to_string(&("grok", "{}", "grok-one")).unwrap();
        let preview = execute("read", &req, &cancel).unwrap();
        assert!(preview["text"].as_str().unwrap().contains("new companion"));
    }
    #[test]
    fn metadata_filters_precede_pagination_and_cost_stays_unknown() {
        let temp = Temp::new();
        let mut req = request(&temp.0, vec![]);
        let cancel = AtomicBool::new(false);
        execute("scan", &req, &cancel).unwrap();
        let db = Connection::open(&req.index).unwrap();
        for n in 0..105 {
            let row = Session {
                key: n.to_string(),
                cwd: temp.0.to_string_lossy().into(),
                title: format!("session {n}"),
                modified_at_ms: n,
                usage: Usage {
                    input: 2,
                    known: true,
                    cost: if n == 0 { None } else { Some(0.01) },
                    ..Default::default()
                },
                ..synthetic(&temp.0)
            };
            save(&db, &row, "test").unwrap();
        }
        let page = execute("query", &req, &cancel).unwrap();
        assert_eq!(page["rows"].as_array().unwrap().len(), 100);
        assert!(page["usage"]["cost"].is_null());
        req.metadata.insert(
            "0".into(),
            json!({"title":"renamed","tags":["needle"],"favorite":true}),
        );
        req.filter = "favorite".into();
        req.query = "needle".into();
        let page = execute("query", &req, &cancel).unwrap();
        assert_eq!(page["total"], 1);
        assert_eq!(page["rows"][0]["key"], "0");
    }
    #[test]
    fn claude_streamed_usage_counts_latest_message_once_including_cache() {
        let mut session = Session::default();
        let mut seen = HashMap::new();
        for output in [2, 7, 7] {
            consume(
                &mut session,
                &json!({"message":{"id":"one","role":"assistant","content":"answer","usage":{"input_tokens":10,"cache_read_input_tokens":3,"output_tokens":output}}}),
                &mut seen,
            );
        }
        assert_eq!(session.usage.input, 13);
        assert_eq!(session.usage.output, 7);
        assert_eq!(session.usage.cache_read, 3);
        assert_eq!(session.text.matches("answer").count(), 1);
    }
    #[cfg(unix)]
    #[test]
    fn history_rejects_links_before_creating_directories_or_touching_sidecars() {
        use std::os::unix::fs::{symlink, PermissionsExt};
        let cancel = AtomicBool::new(false);
        for linked in [".huhu", ".huhu/terminal-agent"] {
            let temp = Temp::new();
            let notes = temp.0.join("notes");
            fs::create_dir(&notes).unwrap();
            fs::set_permissions(&notes, fs::Permissions::from_mode(0o755)).unwrap();
            let link = temp.0.join(linked);
            fs::create_dir_all(link.parent().unwrap()).unwrap();
            symlink(&notes, &link).unwrap();
            let mut req = request(&temp.0, vec![]);
            req.index = link
                .join("new/device/index.sqlite")
                .to_string_lossy()
                .into();
            assert_eq!(
                execute("scan", &req, &cancel).unwrap_err(),
                "symlinked history directory"
            );
            assert!(!notes.join("new").exists());
            assert_eq!(
                fs::metadata(&notes).unwrap().permissions().mode() & 0o777,
                0o755
            );
        }
        for suffix in ["-wal", "-shm", "-journal"] {
            for dangling in [false, true] {
                let temp = Temp::new();
                let req = request(&temp.0, vec![]);
                execute("scan", &req, &cancel).unwrap();
                let secret = temp.0.join("note.md");
                if !dangling {
                    fs::write(&secret, b"keep").unwrap();
                    fs::set_permissions(&secret, fs::Permissions::from_mode(0o644)).unwrap();
                }
                let sidecar = PathBuf::from(format!("{}{}", req.index, suffix));
                if sidecar.exists() {
                    fs::remove_file(&sidecar).unwrap();
                }
                symlink(&secret, &sidecar).unwrap();
                assert_eq!(
                    execute("scan", &req, &cancel).unwrap_err(),
                    "symlinked index"
                );
                if dangling {
                    assert!(!secret.exists());
                } else {
                    assert_eq!(fs::read(&secret).unwrap(), b"keep");
                    assert_eq!(
                        fs::metadata(&secret).unwrap().permissions().mode() & 0o777,
                        0o644
                    );
                }
            }
        }
    }
    #[cfg(unix)]
    #[test]
    fn history_index_is_0700_and_0600_and_a_sidecar_symlink_is_not_followed() {
        use std::os::unix::fs::PermissionsExt;
        let temp = Temp::new();
        let cancel = AtomicBool::new(false);
        let req = request(&temp.0, vec![]);
        execute("scan", &req, &cancel).expect("scan");
        let index = PathBuf::from(&req.index);
        let parent = index.parent().unwrap().to_path_buf();
        let huhu = temp.0.join(".huhu");
        let mode = |path: &Path| fs::symlink_metadata(path).unwrap().permissions().mode() & 0o777;
        assert_eq!(mode(&huhu), 0o700);
        assert_eq!(mode(&parent), 0o700);
        assert_eq!(mode(&index), 0o600);
        let wal = PathBuf::from(format!("{}-wal", index.display()));
        let shm = PathBuf::from(format!("{}-shm", index.display()));
        fs::write(&wal, b"wal").unwrap();
        fs::write(&shm, b"shm").unwrap();
        fs::set_permissions(&wal, fs::Permissions::from_mode(0o644)).unwrap();
        fs::set_permissions(&shm, fs::Permissions::from_mode(0o644)).unwrap();
        tighten_private_modes(&parent, &index);
        assert_eq!(mode(&wal), 0o600);
        assert_eq!(mode(&shm), 0o600);
        let outside = Temp::new();
        let secret = outside.0.join("secret");
        fs::write(&secret, b"keep").unwrap();
        let before = mode(&secret);
        fs::remove_file(&shm).unwrap();
        std::os::unix::fs::symlink(&secret, &shm).unwrap();
        tighten_private_modes(&parent, &index);
        assert!(fs::symlink_metadata(&shm).unwrap().file_type().is_symlink());
        assert_eq!(fs::read(&secret).unwrap(), b"keep");
        assert_eq!(mode(&secret), before);
        println!(
            "posix dir={:03o} file={:03o} wal={:03o}",
            mode(&huhu),
            mode(&index),
            mode(&wal)
        );
    }
    #[test]
    fn new_index_gets_the_current_schema_and_a_newer_index_is_refused() {
        let temp = Temp::new();
        let path = temp.0.join("index.sqlite");
        let cancel = AtomicBool::new(false);
        let db = open_index(&path, true, &cancel).unwrap();
        assert_eq!(
            db.query_row("PRAGMA user_version", [], |r| r.get::<_, i64>(0))
                .unwrap(),
            SCHEMA
        );
        assert!(db.prepare("SELECT key,text FROM history_text").is_ok());
        assert_eq!(revision(&db).unwrap(), 0);
        drop(db);
        open_index(&path, true, &cancel).unwrap(); // Idempotent reopen.
        let db = Connection::open(&path).unwrap();
        db.execute_batch(&format!("PRAGMA user_version={};", SCHEMA + 1))
            .unwrap();
        drop(db);
        assert!(open_index(&path, false, &cancel)
            .unwrap_err()
            .contains("newer"));
    }
    #[test]
    fn sql_paging_aggregates_and_literal_substrings_do_not_load_transcript_rows() {
        let temp = Temp::new();
        let mut req = request(&temp.0, vec![]);
        let cancel = AtomicBool::new(false);
        execute("scan", &req, &cancel).unwrap();
        let db = Connection::open(&req.index).unwrap();
        for n in 0..205 {
            let row = Session {
                key: format!("key-{n}"),
                cwd: temp.0.to_string_lossy().into(),
                title: format!("mixed %_ fragment 中文{n}"),
                modified_at_ms: n,
                text: format!("MiXeD %_ fragment 中文{}", "x".repeat(10240)),
                usage: Usage {
                    input: 2,
                    output: 3,
                    known: n != 0,
                    partial: n == 1,
                    cost: if n == 0 { None } else { Some(0.5) },
                    ..Default::default()
                },
                ..synthetic(&temp.0)
            };
            save(&db, &row, "test").unwrap();
        }
        // Query correctness must not depend on a full transcript being readable.
        db.execute("DELETE FROM history_text", []).unwrap();
        req.query = "mixed %_ fragment 中文".into();
        req.offset = 100;
        let page = execute("query", &req, &cancel).unwrap();
        assert_eq!(page["total"], 205);
        assert_eq!(page["rows"].as_array().unwrap().len(), 100);
        assert_eq!(page["rows"][0]["key"], "key-104");
        assert!(page["rows"][0].get("text").is_none());
        assert_eq!(page["usage"]["input"], 410);
        assert_eq!(page["usage"]["output"], 615);
        assert_eq!(page["usage"]["partial"], true);
        assert!(page["usage"]["cost"].is_null());
        req.metadata.insert(
            "key-0".into(),
            json!({"title":"renamedneedle","favorite":true}),
        );
        req.query = "namedneed".into();
        req.offset = 0;
        req.filter = "favorite".into();
        let page = execute("query", &req, &cancel).unwrap();
        assert_eq!(page["total"], 1);
        assert_eq!(page["rows"][0]["key"], "key-0");
    }
    #[test]
    fn independent_wal_reader_sees_only_committed_batches_without_waiting_for_writer() {
        let temp = Temp::new();
        let req = request(&temp.0, vec![]);
        let cancel = AtomicBool::new(false);
        execute("scan", &req, &cancel).unwrap();
        let mut writer = open_index(Path::new(&req.index), true, &cancel).unwrap();
        let row = Session {
            key: "committed".into(),
            cwd: temp.0.to_string_lossy().into(),
            ..synthetic(&temp.0)
        };
        flush(
            &mut writer,
            &mut vec![(row.clone(), "one".into())],
            &cancel,
            &mut HashSet::new(),
        )
        .unwrap();
        let tx = writer
            .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
            .unwrap();
        save(
            &tx,
            &Session {
                key: "pending".into(),
                ..row
            },
            "two",
        )
        .unwrap();
        assert_eq!(execute("query", &req, &cancel).unwrap()["total"], 1);
        tx.commit().unwrap();
        assert_eq!(execute("query", &req, &cancel).unwrap()["total"], 2);
        assert_eq!(
            execute("query", &req, &AtomicBool::new(true)).unwrap_err(),
            "cancelled"
        );
    }
    #[test]
    fn account_scope_includes_external_cwd_but_never_global_or_symlinked_sources() {
        let vault = Temp::new();
        let outside = Temp::new();
        let source = vault
            .0
            .join(".huhu/agents/test/accounts/claude-code/default/home/.claude/projects/test");
        fs::create_dir_all(&source).unwrap();
        let transcript = |id: &str, cwd: &Path| {
            format!(
                "{}\n",
                json!({"type":"user","sessionId":id,"cwd":cwd,"message":{"role":"user","content":"Full prompt"}})
            )
        };
        fs::write(source.join("inside.jsonl"), transcript("inside", &vault.0)).unwrap();
        fs::write(
            source.join("outside.jsonl"),
            transcript("outside", &outside.0),
        )
        .unwrap();
        fs::write(
            outside.0.join("global.jsonl"),
            transcript("global", &outside.0),
        )
        .unwrap();
        #[cfg(unix)]
        std::os::unix::fs::symlink(outside.0.join("global.jsonl"), source.join("linked.jsonl"))
            .unwrap();
        let mut req = request(
            &vault.0,
            vec![
                Root {
                    agent_id: "claude-code".into(),
                    path: source.to_string_lossy().into(),
                    account_key: "account".into(),
                    system_base: None,
                },
                Root {
                    agent_id: "claude-code".into(),
                    path: outside.0.to_string_lossy().into(),
                    account_key: "global".into(),
                    system_base: None,
                },
            ],
        );
        req.scope = "account".into();
        let cancel = AtomicBool::new(false);
        let scan = execute("scan", &req, &cancel).unwrap();
        assert_eq!(scan["warnings"].as_array().unwrap().len(), 1);
        let all = execute("query", &req, &cancel).unwrap();
        assert_eq!(all["total"], 2);
        req.key = all["rows"]
            .as_array()
            .unwrap()
            .iter()
            .find(|r| r["sessionId"] == "outside")
            .unwrap()["key"]
            .as_str()
            .unwrap()
            .into();
        assert!(execute("read", &req, &cancel).unwrap()["text"]
            .as_str()
            .unwrap()
            .contains("Full prompt"));
        req.scope.clear();
        assert_eq!(execute("query", &req, &cancel).unwrap()["total"], 1);
        assert_eq!(
            execute("read", &req, &cancel).unwrap_err(),
            "session outside vault"
        );
        req.scope = "account".into();
        fs::remove_file(source.join("outside.jsonl")).unwrap();
        assert_eq!(execute("query", &req, &cancel).unwrap()["total"], 1);
        // The admitted row reports the vanished source precisely (it is no longer an error).
        let gone = execute("read", &req, &cancel).unwrap();
        assert_eq!(gone["sourceStatus"], "missing");
        assert_eq!(gone["text"], "");
        // An out-of-scope view must still not learn anything about the row.
        req.scope.clear();
        assert_eq!(
            execute("read", &req, &cancel).unwrap_err(),
            "session outside vault"
        );
    }
    #[test]
    fn account_scope_accepts_node_windows_path_spellings() {
        assert_eq!(ordinary_windows_path(r"\\?\C:\vault"), r"C:\vault");
        assert_eq!(
            ordinary_windows_path(r"\\?\UNC\host\share\vault"),
            r"\\host\share\vault"
        );
        assert_eq!(ordinary_windows_path(r"C:\vault"), r"C:\vault");
    }

    #[test]
    #[cfg(unix)]
    fn grok_companion_cannot_escape_or_survive_in_cached_account_reads() {
        use std::os::unix::fs::symlink;
        let vault = Temp::new();
        let outside = Temp::new();
        let source = vault
            .0
            .join(".huhu/agents/test/accounts/grok/default/home/.grok/sessions/test");
        fs::create_dir_all(&source).unwrap();
        fs::write(
            source.join("session.json"),
            json!({"info":{"id":"grok-one","cwd":outside.0}}).to_string(),
        )
        .unwrap();
        let global = outside.0.join("global-chat.jsonl");
        fs::write(
            &global,
            json!({"type":"user","content":"GLOBAL_SECRET"}).to_string(),
        )
        .unwrap();
        let chat = source.join("chat_history.jsonl");
        symlink(&global, &chat).unwrap();
        let mut req = request(
            &vault.0,
            vec![Root {
                agent_id: "grok".into(),
                path: source.to_string_lossy().into(),
                account_key: "local".into(),
                system_base: None,
            }],
        );
        req.scope = "account".into();
        let cancel = AtomicBool::new(false);
        assert!(!execute("scan", &req, &cancel).unwrap()["warnings"]
            .as_array()
            .unwrap()
            .is_empty());
        assert_eq!(execute("query", &req, &cancel).unwrap()["total"], 0);
        let db = Connection::open(&req.index).unwrap();
        assert_eq!(
            db.query_row("SELECT count(*) FROM history", [], |r| r.get::<_, u64>(0))
                .unwrap(),
            0
        );

        fs::remove_file(&chat).unwrap();
        fs::write(
            &chat,
            json!({"type":"user","content":"Local account conversation"}).to_string(),
        )
        .unwrap();
        assert!(execute("scan", &req, &cancel).unwrap()["warnings"]
            .as_array()
            .unwrap()
            .is_empty());
        let page = execute("query", &req, &cancel).unwrap();
        assert_eq!(page["total"], 1);
        req.key = page["rows"][0]["key"].as_str().unwrap().into();
        let session = execute("read", &req, &cancel).unwrap();
        assert!(session["text"]
            .as_str()
            .unwrap()
            .contains("Local account conversation"));
        assert!(!session["text"].as_str().unwrap().contains("GLOBAL_SECRET"));
        req.scope = "vault".into();
        assert_eq!(execute("query", &req, &cancel).unwrap()["total"], 0);
        assert!(execute("read", &req, &cancel).is_err());
        req.scope = "account".into();

        // Without rescanning, replacement/removal of a file that contributed to
        // the cache invalidates both listing and transcript reads.
        fs::remove_file(&chat).unwrap();
        assert_eq!(execute("query", &req, &cancel).unwrap()["total"], 0);
        // A removed contributing file reads as `missing` with no body; replacing it with a
        // directory or link below remains a hard refusal.
        let gone = execute("read", &req, &cancel).unwrap();
        assert_eq!(gone["sourceStatus"], "missing");
        assert_eq!(gone["text"], "");
        fs::create_dir(&chat).unwrap();
        assert_eq!(execute("query", &req, &cancel).unwrap()["total"], 0);
        assert!(execute("read", &req, &cancel).is_err());
        fs::remove_dir(&chat).unwrap();
        symlink(&global, &chat).unwrap();
        assert_eq!(execute("query", &req, &cancel).unwrap()["total"], 0);
        assert!(execute("read", &req, &cancel).is_err());
        assert!(!execute("scan", &req, &cancel).unwrap()["warnings"]
            .as_array()
            .unwrap()
            .is_empty());
        fs::remove_file(&chat).unwrap();
        fs::write(
            &chat,
            json!({"type":"user","content":"Local account conversation"}).to_string(),
        )
        .unwrap();

        // Legacy cache rows do not acquire trust just because their primary
        // file is valid; a scan must populate all source provenance first.
        db.execute(
            "UPDATE history SET summary=json_remove(summary,'$.sources'),stamp='old'",
            [],
        )
        .unwrap();
        assert_eq!(execute("query", &req, &cancel).unwrap()["total"], 0);
        assert!(execute("read", &req, &cancel).is_err());
        execute("scan", &req, &cancel).unwrap();
        assert_eq!(execute("query", &req, &cancel).unwrap()["total"], 1);

        let moved = outside.0.join("moved-session");
        fs::rename(&source, &moved).unwrap();
        symlink(&moved, &source).unwrap();
        assert_eq!(execute("query", &req, &cancel).unwrap()["total"], 0);
        assert!(execute("read", &req, &cancel).is_err());
        assert!(
            history_sources(&vault.0, &source.join("session.json"), &req.roots[0], true).is_err()
        );
    }

    #[test]
    #[cfg(unix)]
    fn every_provider_checks_primary_child_and_auxiliary_account_paths() {
        use std::os::unix::fs::symlink;
        let vault = Temp::new();
        let outside = Temp::new();
        let global = outside.0.join("global");
        fs::write(&global, "GLOBAL_SECRET").unwrap();
        let cancel = AtomicBool::new(false);
        for agent in ["claude-code", "codex", "pi", "grok", "gemini", "opencode"] {
            let home = vault
                .0
                .join(format!(".huhu/agents/test/accounts/{agent}/default/home"));
            let root_path = if agent == "gemini" {
                home.join("tmp")
            } else {
                home.clone()
            };
            let source = match agent {
                "grok" => home.join("sessions/child/session.json"),
                "gemini" => root_path.join("project/chats/session.jsonl"),
                "opencode" => home.join("opencode.db"),
                _ => home.join("sessions/child/session.jsonl"),
            };
            fs::create_dir_all(source.parent().unwrap()).unwrap();
            fs::write(&source, "{}").unwrap();
            let root = Root {
                agent_id: agent.into(),
                path: if agent == "opencode" {
                    source.to_string_lossy().into()
                } else {
                    root_path.to_string_lossy().into()
                },
                account_key: "local".into(),
                system_base: None,
            };
            let sources = history_sources(&vault.0, &source, &root, true).unwrap();
            for dependency in &sources {
                if dependency.path.exists() {
                    fs::remove_file(&dependency.path).unwrap();
                }
                symlink(&global, &dependency.path).unwrap();
                assert!(
                    history_sources(&vault.0, &source, &root, true).is_err(),
                    "{agent}: {}",
                    dependency.path.display()
                );
                // The parser/SQLite reader rejects the dependency before opening it.
                if agent == "opencode" {
                    assert!(opencode(&source, &root, &vault.0, &cancel, true)
                        .unwrap_err()
                        .contains("outside vault accounts"));
                } else {
                    assert!(parse(&source, &root, &vault.0, 0, &cancel, true)
                        .unwrap_err()
                        .contains("outside vault accounts"));
                }
                fs::remove_file(&dependency.path).unwrap();
                if dependency.required {
                    fs::write(&dependency.path, "{}").unwrap();
                }
            }
            assert_eq!(fs::read_to_string(&global).unwrap(), "GLOBAL_SECRET");
        }
    }
    #[test]
    fn system_account_history_stays_inside_the_named_provider_directory() {
        let vault = Temp::new();
        let home = Temp::new();
        let base = home.0.join(".codex");
        let sessions = base.join("sessions");
        fs::create_dir_all(&sessions).unwrap();
        fs::write(
            sessions.join("one.jsonl"),
            format!(
                "{}\n",
                json!({"type":"session_meta","payload":{"id":"sys","cwd":home.0}})
            ),
        )
        .unwrap();
        let root = Root {
            agent_id: "codex".into(),
            path: sessions.to_string_lossy().into(),
            account_key: "system".into(),
            system_base: Some(base.to_string_lossy().into()),
        };
        let mut req = request(&vault.0, vec![root.clone()]);
        req.scope = "account".into();
        let cancel = AtomicBool::new(false);
        let scan = execute("scan", &req, &cancel).unwrap();
        assert_eq!(scan["warnings"].as_array().unwrap().len(), 0);
        // Without the caller naming the directory, an indexed system row is not trusted.
        assert_eq!(execute("query", &req, &cancel).unwrap()["total"], 0);
        req.system_bases = vec![base.to_string_lossy().into()];
        // The history directory must be named as well: a row indexed from another one is not trusted.
        assert_eq!(execute("query", &req, &cancel).unwrap()["total"], 0);
        req.system_roots = vec![sessions.to_string_lossy().into()];
        assert_eq!(execute("query", &req, &cancel).unwrap()["total"], 1);
        // The vault view still filters by working directory.
        req.scope = "vault".into();
        assert_eq!(execute("query", &req, &cancel).unwrap()["total"], 0);
        // A different directory is not the one the row was indexed under.
        req.scope = "account".into();
        req.system_bases = vec![home.0.join(".other").to_string_lossy().into()];
        assert_eq!(execute("query", &req, &cancel).unwrap()["total"], 0);
        // A root that escapes its base is refused instead of walked.
        let mut escaping = request(
            &vault.0,
            vec![Root {
                path: home.0.to_string_lossy().into(),
                ..root
            }],
        );
        escaping.scope = "account".into();
        let warned = execute("scan", &escaping, &cancel).unwrap();
        assert_eq!(warned["warnings"].as_array().unwrap().len(), 1);
    }
    #[test]
    fn only_session_logs_count_as_system_transcripts() {
        let root = "/home/u/.codex/sessions";
        let session = |agent: &str, root: &str, path: &str| Session {
            agent_id: agent.into(),
            system_root: Some(root.into()),
            transcript_path: path.into(),
            ..Default::default()
        };
        assert!(system_transcript(&session(
            "codex",
            root,
            "/home/u/.codex/sessions/2026/a.jsonl"
        )));
        assert!(!system_transcript(&session(
            "codex",
            root,
            "/home/u/.codex/auth.json"
        )));
        assert!(!system_transcript(&session(
            "codex",
            root,
            "/home/u/.codex/history.jsonl"
        )));
        assert!(!system_transcript(&session(
            "claude-code",
            "/home/u/.claude/projects",
            "/home/u/.claude/.credentials.json"
        )));
        assert!(!system_transcript(&session(
            "claude-code",
            "/home/u/.claude/projects",
            "/home/u/.claude/settings.json"
        )));
        assert!(system_transcript(&session(
            "grok",
            "/home/u/.grok/sessions",
            "/home/u/.grok/sessions/x/session.json"
        )));
        assert!(!system_transcript(&session(
            "grok",
            "/home/u/.grok/sessions",
            "/home/u/.grok/auth.json"
        )));
        assert!(system_transcript(&session(
            "gemini",
            "/home/u/.gemini/tmp",
            "/home/u/.gemini/tmp/p/chats/s.json"
        )));
        assert!(!system_transcript(&session(
            "gemini",
            "/home/u/.gemini/tmp",
            "/home/u/.gemini/oauth_creds.json"
        )));
        assert!(system_transcript(&session(
            "opencode",
            "/d/opencode/opencode.db",
            "/d/opencode/opencode.db"
        )));
        assert!(!system_transcript(&session(
            "opencode",
            "/d/opencode/opencode.db",
            "/d/opencode/auth.json"
        )));
    }
}
