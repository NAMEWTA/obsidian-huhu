//! HUHU pseudo-terminal helper.
//!
//! Speaks length-prefixed frames on stdin/stdout (see `frame.rs`); local control uses a private socket/pipe. Exits, ending
//! every session, when its standard input closes.

mod agent_data;
#[cfg(any(windows, test))]
mod bootstrap;
mod cookies;
mod data;
mod inherited_fds;
mod job;
mod session;

mod editor;
mod foreground;
mod frame;
mod outbox;
// Both executables compile the same canonical control sources; each links only its used half.
#[allow(dead_code)]
#[path = "control/mod.rs"]
mod local_control;
use local_control::broker::Broker;
use serde::Deserialize;
use serde_json::{json, Value};
use session::{control, Outbox, Sessions, SpawnRequest};
use std::{
    collections::HashMap,
    io::{self},
    sync::mpsc,
    thread,
};

pub const PROTOCOL: u32 = 3;

#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
enum Message {
    Hello {
        protocol: u32,
        #[serde(default)]
        capabilities: Value,
    },
    Spawn {
        sid: u32,
        file: String,
        #[serde(default)]
        args: Vec<String>,
        #[serde(default)]
        cwd: Option<String>,
        #[serde(default)]
        env: HashMap<String, String>,
        cols: u16,
        rows: u16,
        #[serde(default)]
        editor: Option<Value>,
    },
    Resize {
        sid: u32,
        cols: u16,
        rows: u16,
    },
    Ack {
        sid: u32,
        bytes: u64,
    },
    End {
        sid: u32,
        #[serde(default)]
        force: bool,
        #[serde(default, rename = "requestId")]
        request_id: Option<String>,
    },
    History {
        op: String,
        rid: String,
        #[serde(default)]
        payload: Value,
    },
    Cookies {
        op: String,
        rid: String,
        #[serde(default)]
        payload: Value,
    },
    Shutdown,
}

fn platform() -> &'static str {
    if cfg!(windows) {
        "win32"
    } else if cfg!(target_os = "macos") {
        "darwin"
    } else {
        "linux"
    }
}

/// Handle one control message. Returns false when the helper should stop.
fn dispatch(
    out: &Outbox,
    sessions: &Sessions,
    history: &data::History,
    admission: &mut bool,
    abandon: &mut bool,
    local_control: &mut bool,
    broker: &Broker,
    body: &[u8],
) -> bool {
    match local_control::codec::parse_helper(body) {
        Ok(Some(value)) => {
            let kind = value["type"].as_str().unwrap_or("");
            if matches!(
                kind,
                "editor-begin" | "editor-commit" | "editor-cancel" | "editor-close"
            ) && sessions.editor_enabled()
            {
                sessions.editor_control(&value);
                return true;
            }
            if *local_control
                && matches!(
                    kind,
                    "control-register"
                        | "control-unregister"
                        | "control-admitted"
                        | "control-progress"
                        | "control-result"
                )
            {
                broker.handle(value);
            } else {
                control(
                    out,
                    json!({"type":"error","message":"unsupported local control direction or capability"}),
                );
            }
            return true;
        }
        Ok(None) => (),
        Err(_) => {
            control(
                out,
                json!({"type":"error","message":"invalid local control JSON"}),
            );
            return true;
        }
    }
    let parsed: Result<Value, _> = serde_json::from_slice(body);
    if let Ok(mut value) = parsed {
        let kind = value["type"].as_str().unwrap_or("");
        if matches!(
            kind,
            "input-begin" | "input-commit" | "input-cancel" | "output-abandon" | "reply-close"
        ) || kind == "resize" && value.get("op").is_some()
        {
            if frame::valid_input_control(&value) {
                frame::normalize_input_control(&mut value);
                if value["type"] == "reply-close" {
                    sessions.close_replies(frame::u32_value(&value["sid"]).unwrap() as u32);
                } else if if value["type"] == "output-abandon" {
                    *abandon
                } else {
                    *admission
                } {
                    sessions.input_control(&value);
                } else if value["type"] == "output-abandon" {
                    control(
                        out,
                        json!({"type":"error","sid":value["sid"],"message":"output abandon unsupported"}),
                    );
                } else {
                    control(
                        out,
                        json!({"type":if value["type"]=="resize"{"resize-state"}else{"input-state"},"sid":value["sid"],"op":value["op"],"state":"none","reason":"unsupported"}),
                    );
                }
            } else {
                control(
                    out,
                    json!({"type":"error","message":"invalid input admission control"}),
                );
            }
            return true;
        }
    }
    let message: Message = match serde_json::from_slice(body) {
        Ok(message) => message,
        Err(error) => {
            control(
                out,
                json!({ "type": "error", "message": format!("invalid message: {error}") }),
            );
            return true;
        }
    };
    match message {
        Message::Hello {
            protocol,
            capabilities,
        } => {
            *admission = protocol == PROTOCOL
                && frame::u32_value(&capabilities["inputAdmission"]) == Some(1);
            *abandon =
                protocol == PROTOCOL && frame::u32_value(&capabilities["outputAbandon"]) == Some(1);
            if protocol == PROTOCOL && frame::u32_value(&capabilities["replySettlement"]) == Some(1)
            {
                sessions.enable_reply_settlement();
            }
            *local_control =
                protocol == PROTOCOL && frame::u32_value(&capabilities["localControl"]) == Some(1);
            if *admission && frame::u32_value(&capabilities["editorTransactions"]) == Some(1) {
                sessions.enable_editor();
            }
            let mut capabilities = json!({"terminalTermination":1});
            if sessions.editor_enabled() {
                capabilities["editorTransactions"] = json!(1);
            }
            if *local_control {
                capabilities["localControl"] = json!(1);
            }
            if sessions.reply_settlement() {
                capabilities["replySettlement"] = json!(1);
            }
            if *abandon {
                capabilities["outputAbandon"] = json!(1);
            }
            if *admission {
                capabilities["inputAdmission"] = json!(1);
            }
            control(
                out,
                json!({"type":"hello","protocol":PROTOCOL,"accepted":protocol==PROTOCOL,"version":env!("CARGO_PKG_VERSION"),"pid":std::process::id(),"platform":platform(),"capabilities":capabilities,"inputLimits":frame::input_limits()}),
            );
        }
        Message::Spawn {
            sid,
            file,
            args,
            cwd,
            env,
            cols,
            rows,
            editor,
        } => {
            let ticket = match sessions.reserve_for_wire(sid) {
                Ok(ticket) => ticket,
                Err((error, unowned)) => {
                    let mut failure = json!({"type":"spawn-failed","sid":sid,"message":error.message,"failure":{"code":error.code,"effect":error.effect}});
                    if unowned && error.effect == "none" && sessions.reply_settlement() {
                        failure["replySettled"] = json!(true);
                    }
                    control(out, failure);
                    return true;
                }
            };
            let sessions = sessions.clone();
            let out = out.clone();
            thread::spawn(move || {
                match sessions.spawn_reserved(
                    sid,
                    SpawnRequest {
                        file,
                        args,
                        cwd,
                        env,
                        cols,
                        rows,
                        editor,
                    },
                    ticket,
                ) {
                    Ok(pid) => control(&out, json!({ "type": "spawned", "sid": sid, "pid": pid })),
                    Err(error) => control(
                        &out,
                        json!({ "type": "spawn-failed", "sid": sid, "message": error.message,
                    "failure": { "code": error.code, "effect": error.effect } }),
                    ),
                }
            });
        }
        Message::Resize { sid, cols, rows } => {
            if let Err(error) = sessions.resize(sid, cols, rows) {
                control(out, json!({"type":"error","sid":sid,"message":error}));
            }
        }
        Message::Ack { sid, bytes } => sessions.acknowledge(sid, bytes),
        Message::End {
            sid,
            force,
            request_id,
        } => {
            if request_id.as_ref().is_some_and(|id| {
                id.is_empty() || id.len() > 128 || id.chars().any(|c| c < ' ' || c == '\x7f')
            }) {
                control(
                    out,
                    json!({"type":"error","sid":sid,"message":"invalid stop request id"}),
                );
            } else {
                sessions.request_stop(sid, force, request_id);
            }
        }
        Message::History { op, rid, payload } => history.handle(&op, rid, payload),
        Message::Cookies { op, rid, payload } => cookies::handle(out.clone(), op, rid, payload),
        Message::Shutdown => return false,
    }
    true
}

/// Explicit fixture-only, best effort, create-new metrics. No default I/O or protocol surface.
fn metrics_file(path: String, value: Value) {
    if path.len() > 4096 {
        return;
    }
    let bytes = match serde_json::to_vec(&value) {
        Ok(bytes) if bytes.len() <= 4096 => bytes,
        _ => return,
    };
    let (done, finished) = mpsc::channel();
    thread::spawn(move || {
        let write = || -> io::Result<()> {
            let path = std::path::Path::new(&path);
            if !path.is_absolute() || !path.starts_with(std::env::temp_dir()) {
                return Ok(());
            }
            let mut parent = path.parent();
            while let Some(dir) = parent {
                if std::fs::symlink_metadata(dir)?.file_type().is_symlink() {
                    return Ok(());
                }
                parent = dir.parent();
            }
            let mut options = std::fs::OpenOptions::new();
            options.write(true).create_new(true);
            #[cfg(unix)]
            {
                use std::os::unix::fs::OpenOptionsExt;
                options.mode(0o600);
            }
            use std::io::Write;
            let mut file = options.open(path)?;
            file.write_all(&bytes)
        };
        let _ = write();
        let _ = done.send(());
    });
    // A failed/slow measurement cannot stall shutdown; this is inside the existing final flush stage.
    let _ = finished.recv_timeout(std::time::Duration::from_millis(50));
}

fn main() {
    #[cfg(windows)]
    if bootstrap::run_if_requested() {
        return;
    }
    // Do this before channels, threads, PTYs or history databases are created.
    if let Err(error) = inherited_fds::close_inherited_fds() {
        eprintln!("huhu-pty: inherited descriptor cleanup failed: {error}");
        std::process::exit(1);
    }
    let _helper_job = job::kill_children_with_helper();
    if let Err(error) = &_helper_job {
        eprintln!("huhu-pty containment unavailable: {error}");
    }
    let out = outbox::Outbox::new();
    let writer_out = out.clone();
    let writer = thread::spawn(move || {
        let stdout = io::stdout();
        let mut stdout = stdout.lock();
        writer_out.run(&mut stdout);
    });
    let sessions = Sessions::new(out.clone());
    let history = data::History::new(out.clone());
    let stdin = io::stdin();
    let mut input = stdin.lock();
    let mut admission = false;
    let mut abandon = false;
    let mut local_control = false;
    let broker = Broker::new(out.clone());
    loop {
        match frame::read_client_frame(&mut input) {
            Ok(Some(frame)) => match frame.kind {
                frame::CONTROL => {
                    if !dispatch(
                        &out,
                        &sessions,
                        &history,
                        &mut admission,
                        &mut abandon,
                        &mut local_control,
                        &broker,
                        &frame.body,
                    ) {
                        break;
                    }
                }
                frame::INPUT => {
                    if let Some((sid, bytes)) = frame::session_body(&frame.body) {
                        if let Err(error) = sessions.write(sid, bytes) {
                            control(&out, json!({"type":"error","sid":sid,"message":error}));
                        }
                    }
                }
                frame::INPUT_PART if admission => {
                    if let Some((sid, op, offset, bytes)) = frame::input_part_body(&frame.body) {
                        sessions.input_part(sid, op, offset, bytes);
                    }
                }
                frame::REPLY if admission => {
                    if let Some((sid, bytes)) = frame::session_body(&frame.body) {
                        if let Err(error) = sessions.reply(sid, bytes) {
                            // No allocation for unknown SIDs and no repeated diagnostic flood.
                            let _ = out.reply_failure(sid, error);
                        }
                    }
                }
                _ => control(
                    &out,
                    json!({ "type": "error", "message": "unknown frame kind" }),
                ),
            },
            Ok(None) => break,
            Err(error) => {
                eprintln!("huhu-pty: {error}");
                break;
            }
        }
    }
    if let Ok(path) = std::env::var("HUHU_PTY_STREAM_METRICS") {
        if let (Some(sessions), Some(outbox)) = (sessions.metrics(), out.metrics()) {
            metrics_file(
                path,
                json!({"version":1,"phase":"stdin-eof","sessions":sessions,"outbox":outbox,"control":broker.metrics()}),
            );
        }
    }
    broker.shutdown();
    let shutdown = sessions.end_all();
    if let Err(error) = &shutdown {
        eprintln!("huhu-pty: editor service shutdown incomplete: {error}");
    }
    out.finish();
    drop(out);
    drop(sessions);
    drop(history);
    // Exit reports may still be queued; give the writer a bounded moment to flush them.
    let (done, finished) = mpsc::channel();
    thread::spawn(move || {
        let _ = writer.join();
        let _ = done.send(());
    });
    let _ = finished.recv_timeout(std::time::Duration::from_secs(5));
    std::process::exit(if shutdown.is_ok() { 0 } else { 1 });
}

#[cfg(test)]
mod settlement_tests {
    use super::*;
    #[test]
    fn real_capacity_rejection_emits_unowned_evidence_but_duplicate_does_not() {
        let out = Outbox::new();
        let sessions = Sessions::new(out.clone());
        sessions.enable_reply_settlement();
        let history = data::History::new(out.clone());
        let _tickets: Vec<_> = (1..=32).map(|sid| sessions.reserve(sid).unwrap()).collect();
        for sid in [33, 1] {
            let message = json!({"type":"spawn","sid":sid,"file":"unused","args":[],"env":{},"cols":20,"rows":4});
            assert!(dispatch(
                &out,
                &sessions,
                &history,
                &mut false,
                &mut false,
                &mut false,
                &Broker::new(out.clone()),
                &serde_json::to_vec(&message).unwrap()
            ));
        }
        out.finish();
        let mut bytes = Vec::new();
        out.run(&mut bytes);
        let mut input = std::io::Cursor::new(bytes);
        let mut values = Vec::new();
        while let Some(frame) = frame::read_frame(&mut input).unwrap() {
            values.push(serde_json::from_slice::<Value>(&frame.body).unwrap());
        }
        let capacity = values.iter().find(|v| v["sid"] == 33).unwrap();
        assert_eq!(capacity["failure"]["effect"], "none");
        assert_eq!(capacity["replySettled"], true);
        let duplicate = values.iter().find(|v| v["sid"] == 1).unwrap();
        assert_eq!(duplicate["failure"]["effect"], "unknown");
        assert!(duplicate.get("replySettled").is_none());
    }
}
