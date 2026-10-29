//! The helper end to end over its standard streams.

#[cfg(unix)]
use std::time::Instant;
use std::{
    io::{Read, Write},
    process::{Command, Stdio},
    sync::mpsc,
    thread,
    time::Duration,
};

struct ReapedHelper(std::process::Child);
impl std::ops::Deref for ReapedHelper {
    type Target = std::process::Child;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
impl std::ops::DerefMut for ReapedHelper {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}
impl Drop for ReapedHelper {
    fn drop(&mut self) {
        if self.0.try_wait().ok().flatten().is_none() {
            let _ = self.0.kill();
        }
        let waited = self.0.wait();
        if !std::thread::panicking() {
            assert!(
                waited.is_ok(),
                "owned helper could not be reaped: {waited:?}"
            );
        }
    }
}

fn frame(kind: u8, body: &[u8]) -> Vec<u8> {
    let mut out = ((body.len() + 1) as u32).to_be_bytes().to_vec();
    out.push(kind);
    out.extend_from_slice(body);
    out
}

fn control(json: &str) -> Vec<u8> {
    frame(1, json.as_bytes())
}

/// Reads frames off the helper's stdout on a thread.
fn frames(mut stdout: impl Read + Send + 'static) -> mpsc::Receiver<(u8, Vec<u8>)> {
    let (tx, rx) = mpsc::channel();
    thread::spawn(move || loop {
        let mut header = [0u8; 4];
        if stdout.read_exact(&mut header).is_err() {
            return;
        }
        let mut body = vec![0u8; u32::from_be_bytes(header) as usize];
        if stdout.read_exact(&mut body).is_err() {
            return;
        }
        let kind = body.remove(0);
        if tx.send((kind, body)).is_err() {
            return;
        }
    });
    rx
}

#[cfg(unix)]
#[test]
fn handshake_session_and_shutdown_on_stdin_close() {
    use std::os::unix::{io::AsRawFd, net::UnixStream, process::CommandExt};
    let sentinel = std::fs::File::open(std::env::current_exe().unwrap()).unwrap();
    let (socket, _peer) = UnixStream::pair().unwrap();
    let (file_fd, socket_fd) = (sentinel.as_raw_fd(), socket.as_raw_fd());
    let mut command = Command::new(env!("CARGO_BIN_EXE_huhu-pty"));
    // dup2 creates non-CLOEXEC file/socket sentinels in the child without changing the test runner.
    unsafe {
        command.pre_exec(move || {
            for fd in (32..96).chain([198]) {
                if libc::dup2(file_fd, fd) == -1 {
                    return Err(std::io::Error::last_os_error());
                }
            }
            if libc::dup2(socket_fd, 199) == -1 {
                return Err(std::io::Error::last_os_error());
            }
            Ok(())
        });
    }
    let mut child = ReapedHelper(
        command
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .unwrap(),
    );
    let mut stdin = child.stdin.take().unwrap();
    let rx = frames(child.stdout.take().unwrap());

    stdin
        .write_all(&control(r#"{"type":"hello","protocol":3}"#))
        .unwrap();
    let (kind, body) = rx.recv_timeout(Duration::from_secs(5)).unwrap();
    assert_eq!(kind, 1);
    let hello: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(hello["type"], "hello");
    assert_eq!(hello["protocol"], 3);
    assert_eq!(hello["accepted"], true);

    #[cfg(target_os = "linux")]
    for fd in (32..96).chain([198, 199]) {
        let error = std::fs::symlink_metadata(format!("/proc/{}/fd/{fd}", child.id()))
            .expect_err("inherited descriptor survived");
        assert_eq!(error.kind(), std::io::ErrorKind::NotFound);
    }
    #[cfg(target_os = "macos")]
    {
        let output = Command::new("/usr/sbin/lsof")
            .args([
                "-a",
                "-p",
                &child.id().to_string(),
                "-d",
                "32-95,198,199",
                "-Ff",
            ])
            .output()
            .unwrap();
        assert!(
            output.stderr.is_empty(),
            "lsof failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
        assert!(
            output.stdout.is_empty(),
            "inherited descriptors survived: {}",
            String::from_utf8_lossy(&output.stdout)
        );
    }

    stdin
        .write_all(&control(r#"{"type":"spawn","sid":9,"file":"/bin/sh","args":["-c","read x; stty size; echo got-$x"],"cols":80,"rows":24}"#))
        .unwrap();
    stdin
        .write_all(&control(r#"{"type":"resize","sid":9,"cols":99,"rows":33}"#))
        .unwrap();
    let mut input = 9u32.to_be_bytes().to_vec();
    input.extend_from_slice(b"ping\r");
    stdin.write_all(&frame(2, &input)).unwrap();

    let deadline = Instant::now() + Duration::from_secs(10);
    let (mut output, mut spawned, mut exit) = (String::new(), false, None);
    let mut output_settled = false;
    while Instant::now() < deadline && exit.is_none() {
        let Ok((kind, body)) = rx.recv_timeout(Duration::from_millis(200)) else {
            continue;
        };
        match kind {
            3 => {
                assert_eq!(&body[..4], &9u32.to_be_bytes());
                output.push_str(&String::from_utf8_lossy(&body[4..]));
            }
            1 => {
                let message: serde_json::Value = serde_json::from_slice(&body).unwrap();
                match message["type"].as_str() {
                    Some("spawned") => spawned = true,
                    Some("exit") => {
                        assert!(
                            output_settled,
                            "numeric exit preceded its output drain/truncation declaration"
                        );
                        exit = Some(message);
                    }
                    Some("terminal-termination") => {
                        assert_eq!(message["sid"], 9);
                        assert_eq!(message["version"], 1);
                        output_settled = matches!(
                            message["evidence"]["output"].as_str(),
                            Some("drained" | "truncated")
                        );
                    }
                    other => panic!("unexpected {other:?}"),
                }
            }
            _ => panic!("unexpected frame kind {kind}"),
        }
    }
    assert!(spawned);
    assert!(output.contains("got-ping"), "{output}");
    assert!(
        output.contains("33 99"),
        "resize did not reach the PTY: {output}"
    );
    assert_eq!(exit.unwrap()["code"], 0);

    // A long-running session ends when the client goes away.
    stdin
        .write_all(&control(r#"{"type":"spawn","sid":10,"file":"/bin/sh","args":["-c","sleep 60"],"cols":80,"rows":24}"#))
        .unwrap();
    thread::sleep(Duration::from_millis(300));
    drop(stdin);
    let deadline = Instant::now() + Duration::from_secs(10);
    loop {
        if let Some(status) = child.try_wait().unwrap() {
            assert!(status.success());
            break;
        }
        assert!(
            Instant::now() < deadline,
            "helper did not exit after stdin closed"
        );
        thread::sleep(Duration::from_millis(50));
    }
}

#[test]
fn version_mismatch_is_reported_and_bad_json_is_survived() {
    let mut child = ReapedHelper(
        Command::new(env!("CARGO_BIN_EXE_huhu-pty"))
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .unwrap(),
    );
    let mut stdin = child.stdin.take().unwrap();
    let rx = frames(child.stdout.take().unwrap());
    stdin.write_all(&control("not json")).unwrap();
    let (_, body) = rx.recv_timeout(Duration::from_secs(5)).unwrap();
    assert!(String::from_utf8_lossy(&body).contains("invalid message"));
    stdin
        .write_all(&control(r#"{"type":"hello","protocol":2}"#))
        .unwrap();
    let (_, body) = rx.recv_timeout(Duration::from_secs(5)).unwrap();
    let hello: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(hello["accepted"], false);
    stdin.write_all(&control(r#"{"type":"shutdown"}"#)).unwrap();
    let status = child.wait().unwrap();
    assert!(status.success());
}

#[test]
fn missing_program_has_no_child_evidence_and_does_not_consume_the_session_id() {
    struct Helper(std::process::Child);
    impl Drop for Helper {
        fn drop(&mut self) {
            if self.0.try_wait().ok().flatten().is_none() {
                let _ = self.0.kill();
            }
            let _ = self.0.wait();
        }
    }
    let mut helper = Helper(
        Command::new(env!("CARGO_BIN_EXE_huhu-pty"))
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .unwrap(),
    );
    let mut stdin = helper.0.stdin.take().unwrap();
    let rx = frames(helper.0.stdout.take().unwrap());
    let missing = std::env::temp_dir().join(format!("huhu-absent-shell-{}", uuid::Uuid::new_v4()));
    let request = serde_json::json!({ "type": "spawn", "sid": 12, "file": missing, "args": [], "cols": 80, "rows": 24 });
    stdin.write_all(&control(&request.to_string())).unwrap();
    let (_, body) = rx.recv_timeout(Duration::from_secs(5)).unwrap();
    let failure: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(failure["type"], "spawn-failed");
    assert_eq!(
        failure["failure"],
        serde_json::json!({ "code": "program-rejected", "effect": "none" }),
        "spawn-failed body: {failure}"
    );

    #[cfg(unix)]
    let (file, args) = ("/bin/sh", vec!["-c", "exit 7"]);
    #[cfg(windows)]
    let (file, args) = ("cmd.exe", vec!["/D", "/C", "exit 7"]);
    let request = serde_json::json!({ "type": "spawn", "sid": 12, "file": file, "args": args, "cols": 80, "rows": 24 });
    stdin.write_all(&control(&request.to_string())).unwrap();
    let (mut spawned, mut exited) = (false, false);
    for _ in 0..10 {
        let (kind, body) = rx.recv_timeout(Duration::from_secs(2)).unwrap();
        if kind != 1 {
            continue;
        }
        let message: serde_json::Value = serde_json::from_slice(&body).unwrap();
        match message["type"].as_str() {
            Some("spawned") => spawned = true,
            Some("terminal-termination") => {
                assert_eq!(message["sid"], 12);
                assert_eq!(message["version"], 1);
            }
            Some("exit") => {
                assert_eq!(message["code"], 7);
                exited = true;
            }
            other => panic!("unexpected {other:?}"),
        }
        if spawned && exited {
            break;
        }
    }
    assert!(spawned && exited);
    drop(stdin);
    let deadline = std::time::Instant::now() + Duration::from_secs(8);
    loop {
        if let Some(status) = helper.0.try_wait().unwrap() {
            assert!(status.success());
            break;
        }
        assert!(std::time::Instant::now() < deadline, "helper did not close");
        thread::sleep(Duration::from_millis(20));
    }
}

#[cfg(unix)]
#[test]
fn negotiated_reply_settlement_follows_numeric_exit_and_the_final_ingress_marker() {
    let mut child = ReapedHelper(
        Command::new(env!("CARGO_BIN_EXE_huhu-pty"))
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .unwrap(),
    );
    let mut input = child.stdin.take().unwrap();
    let rx = frames(child.stdout.take().unwrap());
    input
        .write_all(&control(
            r#"{"type":"hello","protocol":3,"capabilities":{"replySettlement":1}}"#,
        ))
        .unwrap();
    let (_, bytes) = rx.recv_timeout(Duration::from_secs(3)).unwrap();
    let hello: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(hello["capabilities"]["replySettlement"], 1);
    input.write_all(&control(r#"{"type":"spawn","sid":7,"file":"/bin/sh","args":["-c","exit 0"],"env":{},"cols":20,"rows":4}"#)).unwrap();
    let deadline = Instant::now() + Duration::from_secs(5);
    loop {
        let (kind, bytes) = rx
            .recv_timeout(deadline.saturating_duration_since(Instant::now()))
            .unwrap();
        if kind != 1 {
            continue;
        }
        let message: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        assert_ne!(
            message["type"], "reply-settled",
            "must not settle before Node's ingress fence"
        );
        if message["type"] == "exit" {
            break;
        }
    }
    input
        .write_all(&control(r#"{"type":"reply-close","sid":7}"#))
        .unwrap();
    loop {
        let (kind, bytes) = rx
            .recv_timeout(deadline.saturating_duration_since(Instant::now()))
            .unwrap();
        if kind != 1 {
            continue;
        }
        let message: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        if message["type"] == "reply-settled" {
            assert_eq!(message["sid"], 7);
            break;
        }
    }
    drop(input);
    // stdin EOF still waits up to 5s for the writer to flush before the process exits.
    let deadline = Instant::now() + Duration::from_secs(8);
    loop {
        if let Some(status) = child.try_wait().unwrap() {
            assert!(status.success());
            break;
        }
        assert!(Instant::now() < deadline, "owned helper did not exit");
        thread::sleep(Duration::from_millis(10));
    }
}
