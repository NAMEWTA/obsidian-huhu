//! Isolated real-helper/editor transport checks. Controlled Node fixtures are not official Pi support evidence.
use serde_json::{json, Value};
use std::{
    io::{Read, Write},
    process::{Child, Command, Stdio},
    sync::mpsc,
    thread,
    time::{Duration, Instant},
};
struct Helper {
    pending: std::cell::RefCell<Vec<Value>>,
    child: Child,
    input: Option<std::sync::Arc<std::sync::Mutex<std::process::ChildStdin>>>,
    frames: mpsc::Receiver<Value>,
    reader: Option<thread::JoinHandle<()>>,
    reaped: bool,
    stderr: String,
}
impl Helper {
    fn new() -> Self {
        Self::with_runtime(None)
    }
    fn with_runtime(runtime: Option<&std::path::Path>) -> Self {
        let mut command = Command::new(env!("CARGO_BIN_EXE_huhu-pty"));
        if let Some(path) = runtime {
            command.env("XDG_RUNTIME_DIR", path);
        }
        let mut child = command
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .unwrap();
        let input = Some(std::sync::Arc::new(std::sync::Mutex::new(
            child.stdin.take().unwrap(),
        )));
        let ack_writer = std::sync::Arc::downgrade(input.as_ref().unwrap());
        let mut stdout = child.stdout.take().unwrap();
        let (tx, frames) = mpsc::channel();
        let reader = thread::spawn(move || loop {
            let mut head = [0; 4];
            if stdout.read_exact(&mut head).is_err() {
                break;
            }
            let n = u32::from_be_bytes(head) as usize;
            if n == 0 || n > 4 * 1024 * 1024 {
                break;
            }
            let mut bytes = vec![0; n];
            if stdout.read_exact(&mut bytes).is_err() {
                break;
            }
            if bytes[0] == 1 {
                let value: Value = serde_json::from_slice(&bytes[1..]).unwrap();
                eprintln!("editor fixture control: {}", value);
                if tx.send(value).is_err() {
                    break;
                }
            } else {
                if bytes[0] == 3 && bytes.len() > 5 {
                    let sid = u32::from_be_bytes(bytes[1..5].try_into().unwrap());
                    if let Some(writer) = ack_writer.upgrade() {
                        let ack = huhu_pty::outbox::encode_json(
                            &json!({"type":"ack","sid":sid,"bytes":bytes.len()-5}),
                            8192,
                        )
                        .unwrap();
                        if writer.lock().unwrap().write_all(&ack).is_err() {
                            break;
                        }
                    }
                }
                eprintln!(
                    "editor fixture PTY: {}",
                    String::from_utf8_lossy(&bytes[5..])
                );
            }
        });
        Self {
            pending: Default::default(),
            child,
            input,
            frames,
            reader: Some(reader),
            reaped: false,
            stderr: String::new(),
        }
    }
    fn send(&mut self, value: Value) {
        let bytes = huhu_pty::outbox::encode_json(&value, 8192).unwrap();
        self.input
            .as_ref()
            .unwrap()
            .lock()
            .unwrap()
            .write_all(&bytes)
            .unwrap();
    }
    fn matching(&self, predicate: impl Fn(&Value) -> bool) -> Value {
        let pending = { self.pending.borrow().iter().position(&predicate) };
        if let Some(at) = pending {
            return self.pending.borrow_mut().remove(at);
        }
        let until = Instant::now() + Duration::from_secs(5);
        loop {
            let v = self
                .frames
                .recv_timeout(until.saturating_duration_since(Instant::now()))
                .expect("bounded helper response");
            if predicate(&v) {
                return v;
            }
            self.pending.borrow_mut().push(v);
        }
    }
    fn next(&self, kind: &str) -> Value {
        self.matching(|v| v["type"] == kind)
    }

    fn close_status(&mut self) -> std::process::ExitStatus {
        self.input.take();
        let until = Instant::now() + Duration::from_secs(15);
        while self.child.try_wait().unwrap().is_none() && Instant::now() < until {
            thread::sleep(Duration::from_millis(5));
        }
        let forced = self.child.try_wait().unwrap().is_none();
        if forced {
            self.child.kill().unwrap();
        }
        let status = self.child.wait().unwrap();
        if let Some(reader) = self.reader.take() {
            reader.join().unwrap();
        }
        if let Some(stderr) = self.child.stderr.take() {
            stderr.take(65536).read_to_string(&mut self.stderr).unwrap();
            if !self.stderr.is_empty() {
                eprintln!("editor fixture helper stderr: {}", self.stderr);
            }
        }
        self.reaped = true;
        assert!(!forced, "own helper did not finish its bounded shutdown");
        status
    }
    fn close(&mut self) {
        let status = self.close_status();
        assert!(
            status.success(),
            "own helper shutdown failed: {}",
            self.stderr
        );
    }
}
impl Drop for Helper {
    fn drop(&mut self) {
        if self.reaped {
            return;
        }
        if thread::panicking() {
            if std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| self.close())).is_err() {
                eprintln!("secondary own-helper cleanup failure; original test panic preserved");
            }
        } else {
            self.close();
        }
    }
}
#[test]
fn native_editor_protocol_is_explicitly_negotiated_and_not_a_legacy_fallback() {
    let mut h = Helper::new();
    h.send(json!({"type":"hello","protocol":3,"capabilities":{"editorTransactions":1,"inputAdmission":1}}));
    let hello = h.next("hello");
    h.close();
    if cfg!(target_os = "linux") {
        assert_eq!(
            hello["capabilities"]["editorTransactions"], 1,
            "the supported native editor transport must be explicitly negotiated"
        );
    } else {
        assert!(
            hello["capabilities"]["editorTransactions"].is_null(),
            "no unsupported foreground proof is advertised"
        );
    }
}

#[cfg(target_os = "linux")]
mod linux {
    use super::*;
    use std::{
        fs,
        os::unix::fs::{FileTypeExt, MetadataExt, PermissionsExt},
        path::{Path, PathBuf},
    };
    struct Fixture {
        path: PathBuf,
    }
    impl Fixture {
        fn new() -> Self {
            let path = std::env::temp_dir().join(format!("hue-{}", uuid::Uuid::new_v4()));
            fs::create_dir(&path).unwrap();
            fs::set_permissions(&path, fs::Permissions::from_mode(0o700)).unwrap();
            Self { path }
        }
    }
    impl Drop for Fixture {
        fn drop(&mut self) {
            fs::remove_dir_all(&self.path).unwrap();
        }
    }
    fn identity(path: &Path) -> Value {
        let path = fs::canonicalize(path).unwrap();
        let m = fs::metadata(&path).unwrap();
        json!({"path":path,"dev":m.dev().to_string(),"ino":m.ino().to_string()})
    }
    const APP: &str = r##"#!/usr/bin/env node
const fs=require('node:fs'),net=require('node:net');
const cap=JSON.parse(fs.readFileSync(process.env.HUHU_EDITOR_CAPABILITY_FILE,'utf8'));
fs.writeFileSync('cap-path',process.env.HUHU_EDITOR_CAPABILITY_FILE);
const source='d7a6a317-1531-451e-a53a-6f393e621baf';
process.title='pi';
process.stdin.setRawMode(true);process.stdin.on('data',b=>fs.writeFileSync('reply-observed',b));
if(fs.existsSync('switch-foreground')){const timer=setInterval(()=>{if(fs.existsSync('switch-now')){clearInterval(timer);require('node:child_process').spawn('/usr/bin/python3',['-c',"import os,signal,time;signal.signal(signal.SIGTTOU,signal.SIG_IGN);os.setpgid(0,0);os.tcsetpgrp(0,os.getpgrp());open('foreground-switched','w').close();time.sleep(10)"],{stdio:'inherit'});}},2);}

const sock=net.createConnection(cap.endpoint);let data=Buffer.alloc(0),op=null,parts=[],size=0;
function send(type,fields={}){const b=Buffer.from(JSON.stringify({type,version:1,sid:cap.sid,editorId:cap.editorId,...fields}));const h=Buffer.alloc(5);h.writeUInt32BE(b.length+1);h[4]=1;sock.write(h);sock.write(b);}
sock.on('connect',()=>send('editor-auth',{purpose:'huhu-editor',token:cap.token,identity:cap.identity,sourceInstance:source}));
sock.on('data',b=>{data=Buffer.concat([data,b]);while(data.length>=4&&data.length>=4+data.readUInt32BE()){const n=data.readUInt32BE(),body=data.subarray(4,n+4);data=data.subarray(n+4);if(body[0]===1){const v=JSON.parse(body.subarray(1));if(v.type==='editor-deliver'){op=v;parts=[];size=0;}if(v.type==='editor-close')sock.end();}else{if(!op||body.readUInt32BE(1)!==op.op)throw Error('wrong op');parts.push(Buffer.from(body.subarray(5)));size+=body.length-5;if(size===op.totalBytes){fs.writeFileSync(process.env.OBSERVED,Buffer.concat(parts));const captured=op;function finish(){send('editor-app-result',{op:captured.op,result:{state:'adapter-applied',effect:'completed'}});send('editor-app-settled',{op:captured.op});}if(fs.existsSync('hold')){const interval=setInterval(()=>{if(fs.existsSync('release')){clearInterval(interval);finish();}},2);}else finish();op=null;}}}});
sock.on('error',()=>{});setInterval(()=>{},1000);
"##;
    fn node() -> PathBuf {
        static NODE: std::sync::OnceLock<PathBuf> = std::sync::OnceLock::new();
        NODE.get_or_init(|| {
            if let Some(path) = std::env::var_os("HUHU_TEST_NODE") {
                return fs::canonicalize(path).expect("explicit HUHU_TEST_NODE must exist");
            }
            let mut child = Command::new("node")
                .args(["-p", "process.execPath"])
                .env_clear()
                .env("HOME", std::env::var_os("HOME").unwrap_or_default())
                .env("PATH", std::env::var_os("PATH").unwrap_or_default())
                .stdin(Stdio::null())
                .stdout(Stdio::piped())
                .stderr(Stdio::null())
                .spawn()
                .expect("Linux editor tests require Node");
            let mut stdout = child.stdout.take().unwrap();
            let (tx, rx) = mpsc::channel();
            let reader = thread::spawn(move || {
                let mut bytes = Vec::new();
                let result = stdout
                    .by_ref()
                    .take(4097)
                    .read_to_end(&mut bytes)
                    .map(|_| bytes);
                let _ = tx.send(result);
            });
            let output = rx.recv_timeout(Duration::from_secs(2));
            if output.is_err() {
                child.kill().unwrap();
            }
            let status = child.wait().unwrap();
            reader.join().unwrap();
            let bytes = output.expect("bounded Node discovery").unwrap();
            assert!(status.success() && bytes.len() <= 4096);
            fs::canonicalize(std::str::from_utf8(&bytes).unwrap().trim()).unwrap()
        })
        .clone()
    }

    fn spawn(h: &mut Helper, f: &Fixture, file: &str, args: Value) -> Value {
        let entry = f.path.join("entry.cjs");
        fs::write(&entry, APP).unwrap();
        fs::set_permissions(&entry, fs::Permissions::from_mode(0o700)).unwrap();
        let recipe = json!({"version":1,"profileId":"controlled-node-test","artifactDigest":"a".repeat(64),"executable":identity(&node()),"entry":identity(&entry)});
        h.send(json!({"type":"hello","protocol":3,"capabilities":{"editorTransactions":1,"inputAdmission":1}}));
        assert_eq!(h.next("hello")["capabilities"]["editorTransactions"], 1);
        h.send(json!({"type":"spawn","sid":1,"file":file,"args":args,"cwd":f.path,"env":{"PATH":if f.path.join("path").exists(){f.path.join("path")}else{node().parent().unwrap().to_owned()},"OBSERVED":f.path.join("observed")},"cols":80,"rows":24,"editor":{"identity":{"runtimeId":"original-runtime"},"provider":"pi","recipe":recipe}}));
        let spawned = h.next("spawned");
        assert!(spawned["pid"].as_u64().unwrap() > 0);
        h.next("editor-ready")
    }
    fn part(h: &mut Helper, sid: u32, op: u32, offset: u32, b: &[u8]) {
        let mut body = Vec::new();
        body.extend_from_slice(&sid.to_be_bytes());
        body.extend_from_slice(&op.to_be_bytes());
        body.extend_from_slice(&offset.to_be_bytes());
        body.extend_from_slice(b);
        let mut frame = Vec::new();
        frame.extend_from_slice(&((body.len() + 1) as u32).to_be_bytes());
        frame.push(4);
        frame.extend_from_slice(&body);
        h.input
            .as_ref()
            .unwrap()
            .lock()
            .unwrap()
            .write_all(&frame)
            .unwrap();
    }
    #[test]
    fn controlled_editor_keeps_runtime_root_and_delivers_exact_utf8_without_pty_paste() {
        for form in 0..4 {
            let f = Fixture::new();
            let mut h = Helper::with_runtime(Some(&f.path));
            if form == 3 {
                std::os::unix::fs::symlink("entry.cjs", f.path.join("pi")).unwrap();
            }
            let (file, args) = match form {
                0 => (node().to_string_lossy().into_owned(), json!(["entry.cjs"])),
                1 => ("node".into(), json!(["entry.cjs"])),
                2 => (
                    f.path.join("entry.cjs").to_string_lossy().into_owned(),
                    json!([]),
                ),
                _ => (f.path.join("pi").to_string_lossy().into_owned(), json!([])),
            };
            let ready = spawn(&mut h, &f, &file, args);
            let editor = ready["editorId"].clone();
            let text = "中文完整输入\n只提交一次".as_bytes();
            h.send(json!({"type":"editor-begin","version":1,"sid":1,"editorId":editor,"op":1,"sourceInstance":ready["sourceInstance"],"totalBytes":text.len(),"remainingMs":5000}));
            assert_eq!(h.next("editor-state")["state"], "reserved");
            part(&mut h, 1, 1, 0, text);
            h.send(json!({"type":"editor-commit","version":1,"sid":1,"editorId":editor,"op":1}));
            let result = h.next("editor-result");
            assert_eq!(
                result["result"],
                json!({"state":"adapter-applied","effect":"completed"})
            );
            assert_eq!(h.next("editor-settled")["op"], 1);
            assert_eq!(fs::read(f.path.join("observed")).unwrap(), text);
            h.send(json!({"type":"end","sid":1,"force":true}));
            h.next("editor-closed");
            h.close();
        }
    }
    fn await_file(path: &Path) {
        let until = Instant::now() + Duration::from_secs(3);
        while !path.exists() && Instant::now() < until {
            thread::sleep(Duration::from_millis(2));
        }
        assert!(path.exists(), "missing fixture barrier {}", path.display());
    }
    fn begin(h: &mut Helper, ready: &Value, op: u32, n: usize, ms: u64) {
        h.send(json!({"type":"editor-begin","version":1,"sid":1,"editorId":ready["editorId"],"op":op,"sourceInstance":ready["sourceInstance"],"totalBytes":n,"remainingMs":ms}));
    }
    fn commit(h: &mut Helper, ready: &Value, op: u32) {
        h.send(json!({"type":"editor-commit","version":1,"sid":1,"editorId":ready["editorId"],"op":op}));
    }
    fn op_event(h: &Helper, kind: &str, op: u32) -> Value {
        h.matching(|v| v["type"] == kind && v["op"] == op)
    }
    #[test]
    fn queued_cancel_is_none_and_expired_dispatch_retains_quota_until_real_app_settlement() {
        let f = Fixture::new();
        fs::write(f.path.join("hold"), b"").unwrap();
        let mut h = Helper::with_runtime(Some(&f.path));
        let ready = spawn(&mut h, &f, "node", json!(["entry.cjs"]));
        let body = vec![b'x'; 262144];
        begin(&mut h, &ready, 1, body.len(), 500);
        for (i, chunk) in body.chunks(16384).enumerate() {
            part(&mut h, 1, 1, (i * 16384) as u32, chunk);
        }
        commit(&mut h, &ready, 1);
        await_file(&f.path.join("observed"));
        begin(&mut h, &ready, 2, 10, 5000);
        h.send(
            json!({"type":"editor-cancel","version":1,"sid":1,"editorId":ready["editorId"],"op":2}),
        );
        assert_eq!(
            op_event(&h, "editor-result", 2)["result"],
            json!({"state":"none","effect":"none","reason":"cancelled"})
        );
        op_event(&h, "editor-settled", 2);
        // The original PTY writer remains available to parser replies while the editor action is claimed.
        let mut reply = vec![0, 0, 0, 8, 5, 0, 0, 0, 1];
        reply.extend_from_slice(b"ACK");
        h.input
            .as_ref()
            .unwrap()
            .lock()
            .unwrap()
            .write_all(&reply)
            .unwrap();
        await_file(&f.path.join("reply-observed"));
        assert_eq!(fs::read(f.path.join("reply-observed")).unwrap(), b"ACK");
        let timeout = op_event(&h, "editor-result", 1);
        assert_eq!(
            timeout["result"],
            json!({"state":"unknown","effect":"unknown","reason":"timeout"})
        );
        h.send(json!({"type":"input-begin","sid":1,"op":3,"totalBytes":262144}));
        assert_eq!(op_event(&h, "input-state", 3)["state"], "reserved");
        h.send(json!({"type":"input-begin","sid":1,"op":4,"totalBytes":1}));
        assert_eq!(
            op_event(&h, "input-state", 4)["reason"],
            "capacity",
            "dispatched timeout must retain the original 256KiB charge"
        );
        h.send(
            json!({"type":"cookies","op":"unknown","rid":"cookie-during-retiring","payload":{}}),
        );
        assert_eq!(h.next("cookies-result")["rid"], "cookie-during-retiring");
        h.send(json!({"type":"spawn","sid":2,"file":"/bin/sh","args":["-c","printf alive"],"cols":80,"rows":24}));
        assert_eq!(h.next("spawned")["sid"], 2);
        fs::write(f.path.join("release"), b"").unwrap();
        op_event(&h, "editor-settled", 1);
        h.send(json!({"type":"input-cancel","sid":1,"op":3}));
        op_event(&h, "input-state", 3);
        for op in [5, 6] {
            h.send(json!({"type":"input-begin","sid":1,"op":op,"totalBytes":262144}));
            assert_eq!(
                op_event(&h, "input-state", op)["state"],
                "reserved",
                "late physical settlement restores the original quota"
            );
        }
        h.send(json!({"type":"end","sid":1,"force":true}));
        h.next("editor-closed");
        h.close();
    }
    #[test]
    fn fresh_recipe_replacement_and_real_foreground_child_deny_only_editor_input() {
        for mode in ["entry", "foreground", "path"] {
            let f = Fixture::new();
            if mode == "foreground" {
                fs::write(f.path.join("switch-foreground"), b"").unwrap();
            }
            if mode == "path" {
                fs::create_dir(f.path.join("path")).unwrap();
                std::os::unix::fs::symlink(node(), f.path.join("path/node")).unwrap();
            }
            let mut h = Helper::with_runtime(Some(&f.path));
            let ready = spawn(&mut h, &f, "node", json!(["entry.cjs"]));
            if mode == "entry" {
                fs::rename(f.path.join("entry.cjs"), f.path.join("old.cjs")).unwrap();
                fs::write(f.path.join("entry.cjs"), APP).unwrap();
            } else if mode == "path" {
                fs::remove_file(f.path.join("path/node")).unwrap();
                std::os::unix::fs::symlink("/bin/true", f.path.join("path/node")).unwrap();
            } else {
                fs::write(f.path.join("switch-now"), b"").unwrap();
                await_file(&f.path.join("foreground-switched"));
            }
            begin(&mut h, &ready, 1, 4, 5000);
            part(&mut h, 1, 1, 0, b"test");
            commit(&mut h, &ready, 1);
            let result = op_event(&h, "editor-result", 1);
            assert_eq!(result["result"]["state"], "none");
            assert_eq!(
                result["result"]["reason"],
                if mode != "foreground" {
                    "recipe-changed"
                } else {
                    "foreground-changed"
                }
            );
            op_event(&h, "editor-settled", 1);
            assert!(!f.path.join("observed").exists());
            h.send(json!({"type":"end","sid":1,"force":true}));
            h.next("editor-closed");
            h.close();
        }
    }
    fn eof_fixture(h: &mut Helper, f: &Fixture, active: bool) -> (PathBuf, u32) {
        let entry = f.path.join("eof.cjs");
        let source = if active {
            APP.replace("fs.writeFileSync('cap-path',process.env.HUHU_EDITOR_CAPABILITY_FILE);", "fs.writeFileSync('cap-path',process.env.HUHU_EDITOR_CAPABILITY_FILE);fs.writeFileSync('endpoint',cap.endpoint);")
        } else {
            "const fs=require('node:fs');const cap=JSON.parse(fs.readFileSync(process.env.HUHU_EDITOR_CAPABILITY_FILE));fs.writeFileSync('endpoint',cap.endpoint);process.exit(0);".into()
        };
        fs::write(&entry, source).unwrap();
        let recipe = json!({"version":1,"profileId":"controlled-node-test","artifactDigest":"a".repeat(64),"executable":identity(&node()),"entry":identity(&entry)});
        h.send(json!({"type":"hello","protocol":3,"capabilities":{"editorTransactions":1,"inputAdmission":1,"replySettlement":1}}));
        assert_eq!(h.next("hello")["capabilities"]["editorTransactions"], 1);
        h.send(json!({"type":"spawn","sid":1,"file":node(),"args":[entry],"cwd":f.path,"env":{"OBSERVED":f.path.join("observed")},"cols":80,"rows":24,"editor":{"identity":{"runtimeId":"eof-original"},"provider":"pi","recipe":recipe}}));
        let pid = h.next("spawned")["pid"].as_u64().unwrap() as u32;
        if active {
            h.next("editor-ready");
        } else {
            h.next("exit");
            h.send(json!({"type":"reply-close","sid":1}));
            h.next("reply-settled");
            h.next("editor-closed");
        }
        let endpoint = PathBuf::from(fs::read_to_string(f.path.join("endpoint")).unwrap());
        assert!(endpoint.starts_with(&f.path));
        (endpoint, pid)
    }
    fn remaining_runtime(f: &Fixture) -> Vec<Value> {
        fs::read_dir(f.path.join(format!("huhu-ctl-{}", unsafe { libc::geteuid() })))
            .unwrap()
            .map(|entry| {
                let entry = entry.unwrap();
                let m = entry.path().symlink_metadata().unwrap();
                json!({"path":entry.path(),"dev":m.dev(),"ino":m.ino(),"socket":m.file_type().is_socket()})
            })
            .collect()
    }
    #[test]
    fn normal_eof_reaps_editor_endpoint_after_natural_and_active_generations() {
        let f = Fixture::new();
        let mut observations = Vec::new();
        for generation in 0..10 {
            let active = generation % 2 == 1;
            let mut h = Helper::with_runtime(Some(&f.path));
            let helper_pid = h.child.id();
            let (endpoint, root_pid) = eof_fixture(&mut h, &f, active);
            h.close();
            assert!(!Path::new(&format!("/proc/{root_pid}")).exists());
            let remaining = remaining_runtime(&f);
            observations.push(json!({"generation":generation,"active_at_eof":active,"helper_pid":helper_pid,"root_pid":root_pid,"endpoint":endpoint,"remaining_before_fixture_cleanup":remaining}));
        }
        if let Some(root) = std::env::var_os("HUHU_F5_EVIDENCE") {
            let file =
                PathBuf::from(root).join(format!("normal-eof-{}.json", uuid::Uuid::new_v4()));
            fs::write(file, serde_json::to_vec_pretty(&observations).unwrap()).unwrap();
        }
        eprintln!(
            "native EOF observations before fixture cleanup: {}",
            json!(observations)
        );
        assert!(
            observations
                .iter()
                .all(|row| row["remaining_before_fixture_cleanup"]
                    .as_array()
                    .unwrap()
                    .is_empty()),
            "normal EOF left editor endpoint or capability resources"
        );
    }

    #[test]
    fn eof_reports_replaced_endpoint_without_unlinking_the_replacement() {
        let f = Fixture::new();
        let mut h = Helper::with_runtime(Some(&f.path));
        let (endpoint, root_pid) = eof_fixture(&mut h, &f, false);
        let original = endpoint.with_extension("original");
        let owned = fs::symlink_metadata(&endpoint).unwrap();
        fs::rename(&endpoint, &original).unwrap();
        fs::write(&endpoint, b"replacement endpoint sentinel").unwrap();
        let replacement = fs::symlink_metadata(&endpoint).unwrap();
        let started = Instant::now();
        let status = h.close_status();
        let after = fs::symlink_metadata(&endpoint).unwrap();
        let observation = json!({"endpoint":endpoint,"helper_pid":h.child.id(),"root_pid":root_pid,"exit_code":status.code(),"elapsed_ms":started.elapsed().as_millis(),"stderr":h.stderr,"original":{"path":original,"dev":owned.dev(),"ino":owned.ino()},"replacement_before":{"dev":replacement.dev(),"ino":replacement.ino()},"replacement_after":{"dev":after.dev(),"ino":after.ino()},"remaining_before_fixture_cleanup":remaining_runtime(&f),"observed_before_fixture_cleanup":true});
        if let Some(root) = std::env::var_os("HUHU_F5_EVIDENCE") {
            fs::write(
                PathBuf::from(root)
                    .join(format!("replaced-endpoint-{}.json", uuid::Uuid::new_v4())),
                serde_json::to_vec_pretty(&observation).unwrap(),
            )
            .unwrap();
        }
        eprintln!("replaced endpoint before fixture cleanup: {}", observation);
        assert_eq!(
            (replacement.dev(), replacement.ino()),
            (after.dev(), after.ino())
        );
        assert_eq!(
            fs::read(&endpoint).unwrap(),
            b"replacement endpoint sentinel"
        );
        assert!(!Path::new(&format!("/proc/{root_pid}")).exists());
        assert!(
            !status.success(),
            "normal exit must not hide endpoint cleanup failure"
        );
        assert!(h.stderr.contains("editor service shutdown incomplete"));
    }

    #[test]
    fn eof_keeps_replaced_capability_and_reports_one_shutdown_budget() {
        let f = Fixture::new();
        let mut h = Helper::with_runtime(Some(&f.path));
        spawn(&mut h, &f, "node", json!(["entry.cjs"]));
        let cap = PathBuf::from(fs::read_to_string(f.path.join("cap-path")).unwrap());
        let original = cap.with_extension("original");
        fs::rename(&cap, &original).unwrap();
        fs::write(&cap, b"replacement capability sentinel").unwrap();
        let before = fs::symlink_metadata(&cap).unwrap();
        let started = Instant::now();
        let status = h.close_status();
        let elapsed = started.elapsed();
        let after = fs::symlink_metadata(&cap).unwrap();
        let observation = json!({"capability":cap,"helper_pid":h.child.id(),"exit_code":status.code(),"elapsed_ms":elapsed.as_millis(),"stderr":h.stderr,"replacement_before":{"dev":before.dev(),"ino":before.ino()},"replacement_after":{"dev":after.dev(),"ino":after.ino()},"remaining_before_fixture_cleanup":remaining_runtime(&f),"observed_before_fixture_cleanup":true});
        if let Some(root) = std::env::var_os("HUHU_F5_EVIDENCE") {
            fs::write(
                PathBuf::from(root)
                    .join(format!("blocked-capability-{}.json", uuid::Uuid::new_v4())),
                serde_json::to_vec_pretty(&observation).unwrap(),
            )
            .unwrap();
        }
        eprintln!("blocked capability before fixture cleanup: {}", observation);
        assert_eq!((before.dev(), before.ino()), (after.dev(), after.ino()));
        assert_eq!(fs::read(&cap).unwrap(), b"replacement capability sentinel");
        assert!(!status.success());
        assert!(h.stderr.contains("editor listener shutdown incomplete"));
        assert!(
            elapsed < Duration::from_secs(14),
            "shutdown opened a second full budget"
        );
    }

    #[test]
    fn changed_capability_entity_is_not_deleted_and_retains_original_sid_until_restored() {
        let f = Fixture::new();
        let mut h = Helper::with_runtime(Some(&f.path));
        let _ready = spawn(&mut h, &f, "node", json!(["entry.cjs"]));
        let cap = PathBuf::from(fs::read_to_string(f.path.join("cap-path")).unwrap());
        assert!(cap.starts_with(&f.path));
        let backup = cap.with_extension("original");
        fs::rename(&cap, &backup).unwrap();
        fs::write(&cap, b"owned replacement sentinel").unwrap();
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            h.send(json!({"type":"end","sid":1,"force":true}));
            h.next("exit");
            h.send(json!({"type":"cookies","op":"unknown","rid":"cookie-while-cap-closing","payload":{}}));
            assert_eq!(h.next("cookies-result")["rid"], "cookie-while-cap-closing");
            h.send(json!({"type":"spawn","sid":1,"file":"/bin/sh","args":["-c","exit"],"cols":80,"rows":24}));
            assert_eq!(
                h.next("spawn-failed")["failure"]["code"],
                "session-conflict"
            );
            assert_eq!(fs::read(&cap).unwrap(), b"owned replacement sentinel");
            assert!(!h
                .pending
                .borrow()
                .iter()
                .any(|v| v["type"] == "editor-closed"));
        }));
        // Restore only this fixture's captured original file, then allow native cleanup to finish.
        assert_eq!(fs::read(&cap).unwrap(), b"owned replacement sentinel");
        fs::remove_file(&cap).unwrap();
        fs::rename(&backup, &cap).unwrap();
        h.send(json!({"type":"end","sid":1,"force":true}));
        h.next("editor-closed");
        assert!(!cap.exists());
        h.close();
        if let Err(error) = result {
            std::panic::resume_unwind(error);
        }
    }
}

#[test]
fn editor_negotiation_requires_both_explicit_capabilities() {
    for capabilities in [
        json!({}),
        json!({"inputAdmission":1}),
        json!({"editorTransactions":1}),
    ] {
        let mut h = Helper::new();
        h.send(json!({"type":"hello","protocol":3,"capabilities":capabilities}));
        assert!(h.next("hello")["capabilities"]["editorTransactions"].is_null());
        h.close();
    }
}
