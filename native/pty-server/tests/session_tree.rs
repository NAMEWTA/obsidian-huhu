#![cfg(target_os = "linux")]
#[path = "../src/frame.rs"]
mod frame;
use serde_json::{json, Value};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::mpsc::{self, Receiver},
    thread,
    time::{Duration, Instant},
};
struct Harness {
    child: Child,
    messages: Receiver<frame::Frame>,
    root: PathBuf,
}
impl Harness {
    fn new(root: PathBuf) -> Self {
        let mut child = Command::new(env!("CARGO_BIN_EXE_huhu-pty"))
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .unwrap();
        let mut stdout = child.stdout.take().unwrap();
        let (tx, rx) = mpsc::channel();
        thread::spawn(move || {
            while let Ok(Some(f)) = frame::read_frame(&mut stdout) {
                if tx.send(f).is_err() {
                    break;
                }
            }
        });
        Self {
            child,
            messages: rx,
            root,
        }
    }
    fn send(&mut self, v: Value) {
        self.child
            .stdin
            .as_mut()
            .unwrap()
            .write_all(&frame::encode(frame::CONTROL, v.to_string().as_bytes()))
            .unwrap();
    }
    fn until(&self, limit: Duration, mut predicate: impl FnMut(&frame::Frame) -> bool) -> bool {
        let deadline = Instant::now() + limit;
        while let Some(left) = deadline.checked_duration_since(Instant::now()) {
            match self.messages.recv_timeout(left) {
                Ok(f) => {
                    if predicate(&f) {
                        return true;
                    }
                }
                Err(_) => return false,
            }
        }
        false
    }
    fn control(&self, limit: Duration, mut predicate: impl FnMut(&Value) -> bool) -> Option<Value> {
        let mut result = None;
        self.until(limit, |f| {
            if f.kind == frame::CONTROL {
                let v: Value = serde_json::from_slice(&f.body).unwrap();
                if predicate(&v) {
                    result = Some(v);
                    return true;
                }
            }
            false
        });
        result
    }
    fn spawn(&mut self, id: u32, file: &str, args: Vec<String>) {
        self.send(json!({"type":"spawn","sid":id,"file":file,"args":args,"cwd":self.root,"env":{},"cols":80,"rows":24}));
    }
}
impl Drop for Harness {
    fn drop(&mut self) {
        // This process is an isolated subreaper. Never enumerate or signal another agent's tree.
        let _ = self.child.kill();
        let _ = self.child.wait();
        let deadline = Instant::now() + Duration::from_secs(4);
        while Instant::now() < deadline {
            for name in ["root.pid", "child.pid", "escaped.pid"] {
                if let Ok(text) = fs::read_to_string(self.root.join(name)) {
                    if let Ok(pid) = text.trim().parse::<i32>() {
                        let mut status = 0;
                        if unsafe { libc::waitpid(pid, &mut status, libc::WNOHANG) } == 0 {
                            unsafe {
                                libc::kill(pid, libc::SIGKILL);
                            }
                        }
                    }
                }
            }
            let mut status = 0;
            let wait = unsafe { libc::waitpid(-1, &mut status, libc::WNOHANG) };
            if wait < 0 && std::io::Error::last_os_error().raw_os_error() == Some(libc::ECHILD) {
                return;
            }
            thread::sleep(Duration::from_millis(20));
        }
        panic!("owned fixture processes did not finish cleanup");
    }
}
fn wait_file(path: &Path) -> String {
    let deadline = Instant::now() + Duration::from_secs(3);
    loop {
        if let Ok(v) = fs::read_to_string(path) {
            if !v.is_empty() {
                return v;
            }
        }
        assert!(
            Instant::now() < deadline,
            "fixture marker missing: {}",
            path.display()
        );
        thread::sleep(Duration::from_millis(10));
    }
}
fn confirmed(v: &Value, id: u32) -> bool {
    v["type"] == "terminal-termination"
        && v["sid"] == id
        && v["evidence"]["root"]["state"] == "exited"
        && v["evidence"]["cleanup"]["state"] == "confirmed"
        && v["evidence"]["cleanup"]["remainingKnown"] == 0
}
fn fixture(root: PathBuf) {
    assert_eq!(unsafe { libc::prctl(libc::PR_SET_CHILD_SUBREAPER, 1) }, 0);
    let mut h = Harness::new(root.clone());
    h.send(json!({"type":"hello","protocol":3}));
    assert_eq!(
        h.control(Duration::from_secs(2), |v| v["type"] == "hello")
            .unwrap()["capabilities"]["terminalTermination"],
        1
    );
    let rootfile = root.join("root.pid");
    h.spawn(
        1,
        "/bin/sh",
        vec![
            "-c".into(),
            format!(
                "trap '' HUP TERM; echo $$ > '{}'; while :; do sleep 0.2; done",
                rootfile.display()
            ),
        ],
    );
    assert!(h
        .control(Duration::from_secs(2), |v| v["type"] == "spawned"
            && v["sid"] == 1)
        .is_some());
    wait_file(&rootfile);
    h.spawn(
        2,
        "/bin/sh",
        vec![
            "-c".into(),
            "while IFS= read -r line; do printf 'peer:%s\\n' \"$line\"; done".into(),
        ],
    );
    assert!(h
        .control(Duration::from_secs(2), |v| v["type"] == "spawned"
            && v["sid"] == 2)
        .is_some());
    let started = Instant::now();
    h.send(json!({"type":"end","sid":1,"force":false,"requestId":"root-hup-ignore"}));
    assert!(
        h.control(Duration::from_secs(9), |v| confirmed(v, 1))
            .is_some(),
        "HUP-ignoring scope was not really force-killed"
    );
    assert!(started.elapsed() < Duration::from_secs(9));
    h.child
        .stdin
        .as_mut()
        .unwrap()
        .write_all(&frame::encode_session(frame::INPUT, 2, b"still-alive\n"))
        .unwrap();
    let mut output = Vec::new();
    assert!(
        h.until(Duration::from_secs(2), |f| {
            if f.kind == frame::OUTPUT {
                let (id, b) = frame::session_body(&f.body).unwrap();
                if id == 2 {
                    output.extend_from_slice(b);
                }
            }
            String::from_utf8_lossy(&output).contains("peer:still-alive")
        }),
        "peer PTY did not survive target stop"
    );
    let childfile = root.join("child.pid");
    h.spawn(3,"/bin/bash",vec!["--noprofile".into(),"--norc".into(),"-c".into(),format!("set -m; (trap '' HUP TERM; echo $BASHPID > '{}'; while :; do sleep 0.2; done) & while [ ! -s '{}' ]; do sleep 0.01; done; exit 7",childfile.display(),childfile.display())]);
    let mut spawned = false;
    let mut root_first = false;
    assert!(
        h.until(Duration::from_secs(3), |f| {
            if f.kind == frame::CONTROL {
                let v: Value = serde_json::from_slice(&f.body).unwrap();
                spawned |= v["type"] == "spawned" && v["sid"] == 3;
                root_first |= v["type"] == "terminal-termination"
                    && v["sid"] == 3
                    && v["evidence"]["root"]["code"] == 7
                    && v["evidence"]["cleanup"]["state"] != "confirmed";
            }
            spawned && root_first
        }),
        "root wait must not confirm a live job-control group"
    );
    let child: i32 = wait_file(&childfile).trim().parse().unwrap();
    let mut declared = false;
    assert!(
        h.control(Duration::from_secs(4), |v| {
            if v["sid"] != 3 {
                return false;
            }
            declared |=
                v["type"] == "terminal-termination" && v["evidence"]["output"] == "truncated";
            if v["type"] == "exit" {
                assert!(
                    declared,
                    "root-first numeric exit preceded its explicit truncation notice"
                );
                return true;
            }
            false
        })
        .is_some(),
        "root-first output must settle within drain budget"
    );
    h.send(json!({"type":"end","sid":3,"force":false,"requestId":"root-first"}));
    assert!(
        h.control(Duration::from_secs(9), |v| confirmed(v, 3))
            .is_some(),
        "root-first job-control scope was not collected"
    );
    let mut status = 0;
    let deadline = Instant::now() + Duration::from_secs(2);
    loop {
        let got = unsafe { libc::waitpid(child, &mut status, libc::WNOHANG) };
        if got == child {
            break;
        }
        assert!(
            got >= 0 && Instant::now() < deadline,
            "owned job-control child exit not wait-confirmed"
        );
        thread::sleep(Duration::from_millis(10));
    }
    assert!(libc::WIFSIGNALED(status));
    assert_eq!(libc::WTERMSIG(status), libc::SIGKILL);
    // Capture a real child in this session before it deliberately detaches with setsid.
    // The managed scope must retain the observed escape as partial, never claim full cleanup.
    let ready = root.join("escape-ready");
    let go = root.join("escape-go");
    let exit_go = root.join("root-exit-go");
    h.spawn(4, "/bin/sh", vec!["-c".into(), format!("HUHU_TREE_ESCAPE_ROLE=1 '{}' --exact owned_tree_stop_keeps_peer_and_collects_hup_ignoring_job_control_groups --nocapture & while [ ! -f '{}' ]; do sleep 0.01; done; while [ ! -f '{}' ]; do sleep 0.01; done; exit 0",std::env::current_exe().unwrap().display(),ready.display(),exit_go.display())]);
    assert!(h
        .control(Duration::from_secs(3), |v| v["type"] == "spawned"
            && v["sid"] == 4)
        .is_some());
    wait_file(&ready);
    thread::sleep(Duration::from_millis(250));
    fs::write(&go, "go").unwrap();
    wait_file(&root.join("escaped.pid"));
    fs::write(&exit_go, "exit").unwrap();
    h.send(json!({"type":"end","sid":4,"force":true,"requestId":"known-escape"}));
    let mut false_confirmation = false;
    assert!(
        h.control(Duration::from_secs(9), |v| {
            if v["sid"] != 4 {
                return false;
            }
            false_confirmation |= confirmed(v, 4);
            v["type"] == "terminal-termination"
                && v["evidence"]["cleanup"]["state"] == "partial"
                && v["evidence"]["cleanup"]["reason"] == "escaped-member"
        })
        .is_some(),
        "known detached member must remain partial"
    );
    assert!(!false_confirmation);
    h.send(json!({"type":"end","sid":2,"force":true,"requestId":"peer-cleanup"}));
    assert!(h
        .control(Duration::from_secs(9), |v| confirmed(v, 2))
        .is_some());
}
fn controlled_escape_member() {
    let Some(root) = std::env::var_os("HUHU_TREE_FIXTURE_ROOT") else {
        return;
    };
    let root = PathBuf::from(root);
    fs::write(root.join("escape-ready"), std::process::id().to_string()).unwrap();
    wait_file(&root.join("escape-go"));
    assert!(unsafe { libc::setsid() } > 0);
    fs::write(root.join("escaped.pid"), std::process::id().to_string()).unwrap();
    loop {
        thread::sleep(Duration::from_secs(1));
    }
}
#[test]
fn owned_tree_stop_keeps_peer_and_collects_hup_ignoring_job_control_groups() {
    if std::env::var_os("HUHU_TREE_ESCAPE_ROLE").is_some() {
        controlled_escape_member();
        return;
    }
    if let Some(root) = std::env::var_os("HUHU_TREE_FIXTURE_ROOT") {
        fixture(PathBuf::from(root));
        return;
    }
    let root = std::env::temp_dir().join(format!("huhu-owned-tree-{}", uuid::Uuid::new_v4()));
    fs::create_dir(&root).unwrap();
    let mut child = Command::new(std::env::current_exe().unwrap())
        .args([
            "--exact",
            "owned_tree_stop_keeps_peer_and_collects_hup_ignoring_job_control_groups",
            "--nocapture",
        ])
        .env("HUHU_TREE_FIXTURE_ROOT", &root)
        .spawn()
        .unwrap();
    let deadline = Instant::now() + Duration::from_secs(35);
    let status = loop {
        if let Some(status) = child.try_wait().unwrap() {
            break status;
        }
        if Instant::now() >= deadline {
            let _ = child.kill();
            let _ = child.wait();
            panic!(
                "isolated fixture deadline; retained root {}",
                root.display()
            );
        }
        thread::sleep(Duration::from_millis(20));
    };
    assert!(
        status.success(),
        "isolated fixture failed; retained root {}",
        root.display()
    );
    fs::remove_dir_all(root).unwrap();
}
