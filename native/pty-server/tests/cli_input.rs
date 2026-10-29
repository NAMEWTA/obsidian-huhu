use serde_json::Value;
use std::{
    fs,
    io::Write,
    path::PathBuf,
    process::{Child, Command, Output, Stdio},
    thread,
    time::{Duration, Instant},
};

struct InputFixture(PathBuf);
impl InputFixture {
    fn new() -> Self {
        let name = format!(
            "hcli-{}",
            &uuid::Uuid::new_v4().simple().to_string()[..16]
        );
        // runtime_root ignores XDG_RUNTIME_DIR at 50 bytes or more so the control
        // socket stays inside the listen budget. macOS temp directories exceed that.
        #[cfg(unix)]
        let root = {
            let under_temp = std::env::temp_dir().join(&name);
            if under_temp.as_os_str().len() < 50 {
                under_temp
            } else {
                PathBuf::from("/tmp").join(name)
            }
        };
        #[cfg(not(unix))]
        let root = std::env::temp_dir().join(name);
        fs::create_dir(&root).unwrap();
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&root, fs::Permissions::from_mode(0o700)).unwrap();
        }
        Self(root)
    }
    fn command(&self) -> Command {
        self.command_for(["message", "send"])
    }
    fn command_for(&self, words: [&str; 2]) -> Command {
        let mut command = Command::new(env!("CARGO_BIN_EXE_huhu"));
        command.env_clear().env("XDG_RUNTIME_DIR", &self.0);
        // Windows resolves the private locator root from LOCALAPPDATA. Clearing
        // the environment removes it, and a missing root is SOURCE_UNAVAILABLE
        // (exit 5). The fixture is that root, as XDG_RUNTIME_DIR is on Unix, so
        // a missing locator stays CONNECTION_UNAVAILABLE (exit 4).
        #[cfg(windows)]
        {
            command.env("LOCALAPPDATA", &self.0);
        }
        command.args(["--json", words[0], words[1], "--session", "target"]);
        if words[0] != "message" {
            command.args(["--runtime", "runtime"]);
        }
        command
    }
}

#[cfg(unix)]
#[test]
fn prompt_and_send_text_preserve_utf8_multiline_body_and_target_from_stdin_or_file() {
    use huhu_pty::control::{ipc, wire_generated as w};
    use std::{
        io::Read,
        os::unix::{
            fs::{MetadataExt, PermissionsExt},
            net::UnixListener,
        },
    };
    for group_command in [["agent", "prompt"], ["terminal", "send-text"]] {
        for source in ["--stdin", "--file"] {
            let fixture = InputFixture::new();
            let runtime_name = format!("huhu-ctl-{}", unsafe { libc::geteuid() });
            let runtime = fixture.0.join(&runtime_name);
            fs::create_dir(&runtime).unwrap();
            fs::set_permissions(&runtime, fs::Permissions::from_mode(0o700)).unwrap();
            let locators = runtime.join("locators");
            fs::create_dir(&locators).unwrap();
            fs::set_permissions(&locators, fs::Permissions::from_mode(0o700)).unwrap();
            // The caller path may cross a directory symlink (`/tmp` on macOS, or this
            // alias). The private-root check has to follow it back to the real locator.
            let alias_path = PathBuf::from(format!(
                "/tmp/hcli-link-{}",
                &uuid::Uuid::new_v4().simple().to_string()[..16]
            ));
            std::os::unix::fs::symlink(&fixture.0, &alias_path).unwrap();
            let _alias = Alias(alias_path.clone());
            let socket_path = runtime.join("fixture.sock");
            let listener = UnixListener::bind(&socket_path).unwrap();
            fs::set_permissions(&socket_path, fs::Permissions::from_mode(0o600)).unwrap();
            listener.set_nonblocking(true).unwrap();
            let meta = fs::metadata(&fixture.0).unwrap();
            let scope = serde_json::json!({"vaultId":"v","deviceId":"d","instanceId":"i","rootPath":fixture.0,
                "root":{"canonicalPath":fs::canonicalize(&fixture.0).unwrap(),"dev":meta.dev().to_string(),"ino":meta.ino().to_string()}});
            let locator = locators.join("fixture.json");
            fs::write(&locator, serde_json::to_vec(&serde_json::json!({"protocolVersion":1,"controlId":"fixture","token":"a".repeat(64),"endpoint":socket_path,"scope":scope})).unwrap()).unwrap();
            fs::set_permissions(&locator, fs::Permissions::from_mode(0o600)).unwrap();
            let locator = alias_path.join(&runtime_name).join("locators").join("fixture.json");
            let server = thread::spawn(move || -> Option<Value> {
                let deadline = Instant::now() + Duration::from_secs(2);
                let mut stream = loop {
                    match listener.accept() {
                        Ok((stream, _)) => break stream,
                        Err(error)
                            if error.kind() == std::io::ErrorKind::WouldBlock
                                && Instant::now() < deadline =>
                        {
                            thread::sleep(Duration::from_millis(2))
                        }
                        _ => return None,
                    }
                };
                // macOS keeps the accepted socket nonblocking when the listener is.
                // A blocking read waits for the CLI's frame; WouldBlock is not a
                // failed body.
                stream.set_nonblocking(false).unwrap();
                stream
                    .set_read_timeout(Some(Duration::from_secs(2)))
                    .unwrap();
                let read = |stream: &mut std::os::unix::net::UnixStream| -> Value {
                    let mut size = [0; 4];
                    stream.read_exact(&mut size).unwrap();
                    let size = u32::from_be_bytes(size) as usize;
                    assert!(size <= w::REQUEST_BYTES);
                    let mut bytes = vec![0; size];
                    stream.read_exact(&mut bytes).unwrap();
                    serde_json::from_slice(&bytes).unwrap()
                };
                let auth = read(&mut stream);
                assert_eq!(auth["controlId"], "fixture");
                let hello = serde_json::json!({"type":"control-register","controlId":"fixture","scope":scope});
                stream
                    .write_all(
                        &ipc::frame(
                            serde_json::to_vec(&hello).unwrap(),
                            w::SCOPE_BYTES + w::WRAPPER_BYTES,
                        )
                        .unwrap(),
                    )
                    .unwrap();
                let request = read(&mut stream);
                let result = serde_json::json!({"protocolVersion":1,"requestId":request["requestId"],"operation":request["operation"],"ok":true,"phase":"input-submitted","effect":"completed"});
                stream
                    .write_all(
                        &ipc::frame(serde_json::to_vec(&result).unwrap(), w::RESPONSE_BYTES)
                            .unwrap(),
                    )
                    .unwrap();
                Some(request)
            });
            let body = "请检查文件\n第二行\n";
            let mut command = Command::new(env!("CARGO_BIN_EXE_huhu"));
            command
                .env_clear()
                .env("XDG_RUNTIME_DIR", &fixture.0)
                .env("HUHU_INSTANCE_ID", "i")
                .env("HUHU_CONTROL_LOCATOR", &locator)
                .args([
                    "--json",
                    group_command[0],
                    group_command[1],
                    "--session",
                    "session-B",
                    "--runtime",
                    "runtime-B",
                    source,
                ])
                .stdin(Stdio::piped())
                .stdout(Stdio::piped());
            if source == "--file" {
                let file = fixture.0.join("正文.txt");
                fs::write(&file, body).unwrap();
                command.arg(file);
            }
            let mut child = command.spawn().unwrap();
            child
                .stdin
                .take()
                .unwrap()
                .write_all(body.as_bytes())
                .unwrap();
            let output = child.wait_with_output().unwrap();
            let request = server.join().unwrap();
            assert_eq!(
                output.status.code(),
                Some(0),
                "{}",
                String::from_utf8_lossy(&output.stdout)
            );
            let request = request.expect("valid local body must reach the actual IPC endpoint");
            assert_eq!(request["params"], serde_json::json!({"text":body}));
            assert_eq!(
                request["target"],
                serde_json::json!({"instanceId":"i","sessionId":"session-B","runtimeId":"runtime-B"})
            );
        }
    }
}
#[cfg(unix)]
struct Alias(PathBuf);
#[cfg(unix)]
impl Drop for Alias {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.0);
    }
}
impl Drop for InputFixture {
    fn drop(&mut self) {
        fs::remove_dir_all(&self.0).unwrap();
    }
}
fn response(output: Output, exit: i32, code: &str) -> Value {
    assert_eq!(
        output.status.code(),
        Some(exit),
        "stderr: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    let value: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(value["error"]["code"], code);
    assert_eq!(value["effect"], "none");
    value
}

fn exits_while_input_is_open(child: &mut Child) -> bool {
    let deadline = Instant::now() + Duration::from_secs(3);
    while Instant::now() < deadline {
        if child.try_wait().unwrap().is_some() {
            return true;
        }
        thread::sleep(Duration::from_millis(2));
    }
    child.kill().unwrap();
    child.wait().unwrap();
    false
}

#[test]
fn input_deadline_expires_before_eof_without_starting_endpoint_discovery() {
    let fixture = InputFixture::new();
    for group in [
        ["message", "send"],
        ["agent", "prompt"],
        ["terminal", "send-text"],
    ] {
        let mut child = fixture
            .command_for(group)
            .args(["--stdin", "--timeout-ms", "20"])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .spawn()
            .unwrap();
        let mut input = child.stdin.take().unwrap();
        input.write_all(b"x").unwrap();
        let exited = exits_while_input_is_open(&mut child);
        drop(input);
        assert!(
            exited,
            "local input deadline must finish while the upstream pipe is still open"
        );
        let value = response(child.wait_with_output().unwrap(), 6, "WAIT_TIMEOUT");
        assert_eq!(value["operation"], format!("{}.{}", group[0], group[1]));
        if group[0] == "message" {
            assert!(value["error"]["details"]["messageId"].as_str().is_some());
        }
        assert_eq!(fs::read_dir(&fixture.0).unwrap().count(), 0);
    }
}

#[cfg(target_os = "linux")]
#[test]
fn sigint_cancels_input_before_eof_with_the_preallocated_message_identity() {
    let fixture = InputFixture::new();
    let mut child = fixture
        .command()
        .args(["--stdin", "--message", "stable-message"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .unwrap();
    let mut input = child.stdin.take().unwrap();
    input.write_all(b"x").unwrap();
    let deadline = Instant::now() + Duration::from_secs(3);
    loop {
        let status = fs::read_to_string(format!("/proc/{}/status", child.id())).unwrap();
        let mask = status
            .lines()
            .find_map(|line| line.strip_prefix("SigCgt:\t"))
            .unwrap();
        if u64::from_str_radix(mask.trim(), 16).unwrap() & (1 << (libc::SIGINT - 1)) != 0 {
            break;
        }
        if Instant::now() >= deadline {
            child.kill().unwrap();
            child.wait().unwrap();
            panic!("CLI cancellation handler did not become ready");
        }
        thread::sleep(Duration::from_millis(2));
    }
    assert_eq!(unsafe { libc::kill(child.id() as i32, libc::SIGINT) }, 0);
    let exited = exits_while_input_is_open(&mut child);
    drop(input);
    assert!(
        exited,
        "SIGINT must finish local input while the upstream pipe is still open"
    );
    let value = response(child.wait_with_output().unwrap(), 130, "WAIT_CANCELLED");
    assert_eq!(value["error"]["details"]["messageId"], "stable-message");
    assert_eq!(fs::read_dir(&fixture.0).unwrap().count(), 0);
}

#[test]
fn body_sources_are_exclusive_and_file_limits_count_utf8_bytes() {
    let fixture = InputFixture::new();
    let body = fixture.0.join("body.txt");
    for bytes in [
        vec![0xff],
        Vec::new(),
        "中"
            .repeat(5461)
            .into_bytes()
            .into_iter()
            .chain([b'x', b'y'])
            .collect(),
    ] {
        fs::write(&body, &bytes).unwrap();
        let code = if bytes.len() > 16384 {
            "CAPACITY_EXCEEDED"
        } else {
            "INVALID_ARGUMENT"
        };
        response(
            fixture.command().arg("--file").arg(&body).output().unwrap(),
            2,
            code,
        );
    }
    assert_eq!(
        fs::read_dir(&fixture.0).unwrap().count(),
        1,
        "rejected bodies must not discover endpoints"
    );
    fs::write(&body, format!("{}x", "中".repeat(5461))).unwrap();
    response(
        fixture
            .command()
            .arg("--instance")
            .arg("unavailable")
            .arg("--file")
            .arg(&body)
            .output()
            .unwrap(),
        4,
        "CONNECTION_UNAVAILABLE",
    );
    for words in [
        vec!["--text", "x", "--stdin"],
        vec!["--text", "x", "--file", "unused"],
        vec!["--stdin", "--file", "unused"],
    ] {
        for group in [
            ["message", "send"],
            ["agent", "prompt"],
            ["terminal", "send-text"],
        ] {
            let mut command = Command::new(env!("CARGO_BIN_EXE_huhu"));
            command
                .env_clear()
                .env("XDG_RUNTIME_DIR", &fixture.0)
                .args([
                    "--json",
                    group[0],
                    group[1],
                    "--session",
                    "s",
                    "--runtime",
                    "r",
                ])
                .args(&words);
            response(command.output().unwrap(), 2, "INVALID_ARGUMENT");
        }
    }
}

#[cfg(unix)]
#[test]
fn file_fifo_open_is_cancelled_by_the_local_input_deadline() {
    use std::ffi::CString;
    use std::os::unix::ffi::OsStrExt;
    let fixture = InputFixture::new();
    let pipe = fixture.0.join("input.fifo");
    let name = CString::new(pipe.as_os_str().as_bytes()).unwrap();
    assert_eq!(unsafe { libc::mkfifo(name.as_ptr(), 0o600) }, 0);
    let mut child = fixture
        .command()
        .arg("--file")
        .arg(&pipe)
        .args(["--timeout-ms", "20"])
        .stdout(Stdio::piped())
        .spawn()
        .unwrap();
    let exited = exits_while_input_is_open(&mut child);
    assert!(
        exited,
        "a named pipe with no writer must not block the CLI forever"
    );
    response(child.wait_with_output().unwrap(), 6, "WAIT_TIMEOUT");
    assert_eq!(fs::read_dir(&fixture.0).unwrap().count(), 1);
}

#[cfg(target_os = "linux")]
#[test]
fn oversized_file_is_rejected_with_a_bounded_address_space_before_endpoint_discovery() {
    use std::os::unix::process::CommandExt;
    let fixture = InputFixture::new();
    let path = fixture.0.join("large.txt");
    fs::File::create(&path)
        .unwrap()
        .set_len(64 * 1024 * 1024)
        .unwrap();
    let mut command = fixture.command();
    command.arg("--file").arg(&path);
    // The CLI fits comfortably in 32 MiB; reading the whole 64 MiB file does not.
    unsafe {
        command.pre_exec(|| {
            let limit = libc::rlimit {
                rlim_cur: 32 * 1024 * 1024,
                rlim_max: 32 * 1024 * 1024,
            };
            if libc::setrlimit(libc::RLIMIT_AS, &limit) != 0 {
                return Err(std::io::Error::last_os_error());
            }
            Ok(())
        });
    }
    let value = response(command.output().unwrap(), 2, "CAPACITY_EXCEEDED");
    assert!(value["error"]["details"]["messageId"].as_str().is_some());
    assert_eq!(
        fs::read_dir(&fixture.0).unwrap().count(),
        1,
        "no locator discovery before body rejection"
    );
}
