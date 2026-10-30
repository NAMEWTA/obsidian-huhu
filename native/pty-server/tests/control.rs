use huhu_pty::control::cli;
use std::collections::HashMap;
#[test]
fn cli_explicit_session_does_not_acquire_a_different_env_space_or_runtime() {
    let env = HashMap::from([
        ("HUHU_INSTANCE_ID".into(), "instance".into()),
        ("HUHU_SPACE_ID".into(), "space-A".into()),
        ("HUHU_STABLE_SESSION_ID".into(), "session-A".into()),
        ("HUHU_SESSION_ID".into(), "runtime-A".into()),
    ]);
    let args = |v: &[&str]| v.iter().map(|s| s.to_string()).collect::<Vec<_>>();
    let global = cli::parse(
        &args(&[
            "--json",
            "--instance",
            "instance",
            "session",
            "get",
            "--session",
            "session-B",
        ]),
        &env,
    )
    .unwrap();
    assert!(global.json);
    assert_eq!(global.request["operation"], "session.get");
    let b = cli::parse(
        &args(&["session", "get", "--session", "session-B", "--json"]),
        &env,
    )
    .unwrap();
    assert_eq!(b.request["target"]["sessionId"], "session-B");
    assert!(b.request["target"].get("spaceId").is_none());
    assert!(b.request["target"].get("runtimeId").is_none());
    assert!(b.json);
    let explicit = cli::parse(
        &args(&[
            "session",
            "get",
            "--session",
            "session-B",
            "--space",
            "space-A",
        ]),
        &env,
    )
    .unwrap();
    assert_eq!(explicit.request["target"]["spaceId"], "space-A");
    let start = cli::parse(&args(&["terminal", "start"]), &env).unwrap();
    assert_eq!(start.request["target"]["spaceId"], "space-A");
    let own = cli::parse(&args(&["terminal", "read"]), &env).unwrap();
    assert_eq!(own.request["target"]["sessionId"], "session-A");
    assert_eq!(own.request["target"]["runtimeId"], "runtime-A");
}

#[test]
fn message_send_generates_no_target_from_caller_session_or_cwd() {
    let env = HashMap::from([
        ("HUHU_INSTANCE_ID".into(), "instance".into()),
        ("HUHU_VAULT_ID".into(), "vault".into()),
        ("HUHU_STABLE_SESSION_ID".into(), "caller-session".into()),
        ("PWD".into(), "/same/cwd".into()),
    ]);
    let args = ["message", "send", "--text", "hello"]
        .iter()
        .map(|v| (*v).to_owned())
        .collect::<Vec<_>>();
    let error = cli::parse(&args, &env).expect_err("message send needs explicit recipient");
    assert_eq!(error.code, "TARGET_REQUIRED");
}

#[test]
fn message_send_to_session_and_session_alias_cannot_conflict() {
    let args = [
        "message",
        "send",
        "--to-session",
        "target",
        "--session",
        "other",
        "--text",
        "hello",
    ]
    .iter()
    .map(|v| (*v).to_owned())
    .collect::<Vec<_>>();
    let error = cli::parse(&args, &HashMap::new()).expect_err("conflicting recipient aliases");
    assert_eq!(error.code, "INVALID_ARGUMENT");
}

#[test]
fn pane_cli_requires_its_explicit_pane_and_inserted_session_instead_of_caller_hints() {
    let env = HashMap::from([
        ("HUHU_INSTANCE_ID".into(), "instance".into()),
        ("HUHU_SPACE_ID".into(), "space-A".into()),
        ("HUHU_STABLE_SESSION_ID".into(), "session-A".into()),
        ("HUHU_SESSION_ID".into(), "runtime-A".into()),
        ("PWD".into(), "/same/directory".into()),
    ]);
    for words in [
        vec!["pane", "attach"],
        vec!["pane", "focus"],
        vec!["pane", "split", "--pane", "pane-B", "--direction", "row"],
        vec![
            "pane",
            "split",
            "--session",
            "session-C",
            "--direction",
            "column",
        ],
        vec!["pane", "resize", "--ratio", "0.5"],
        vec!["pane", "close"],
    ] {
        let args = words.iter().map(|v| v.to_string()).collect::<Vec<_>>();
        let error =
            cli::parse(&args, &env).expect_err("Pane targets must not inherit the caller Session");
        assert_eq!(error.code, "TARGET_REQUIRED", "{words:?}");
    }
    let args = |words: &[&str]| words.iter().map(|v| v.to_string()).collect::<Vec<_>>();
    let list = cli::parse(
        &args(&["pane", "list", "--limit", "7", "--cursor", "literal/中文"]),
        &env,
    )
    .unwrap();
    assert_eq!(list.request["target"]["spaceId"], "space-A");
    assert!(list.request["target"].get("sessionId").is_none());
    assert!(list.request["target"].get("runtimeId").is_none());
    let explicit = cli::parse(&args(&["pane", "list", "--space", "space-B"]), &env).unwrap();
    assert_eq!(explicit.request["target"]["spaceId"], "space-B");
    assert_eq!(
        list.request["params"],
        serde_json::json!({"limit":7,"cursor":"literal/中文"})
    );
    let split = cli::parse(
        &args(&[
            "pane",
            "split",
            "--pane",
            "source-B",
            "--session",
            "session-C",
            "--runtime",
            "runtime-C",
            "--direction",
            "column",
        ]),
        &env,
    )
    .unwrap();
    assert_eq!(split.request["target"]["paneId"], "source-B");
    assert_eq!(split.request["target"]["sessionId"], "session-C");
    assert_eq!(split.request["target"]["runtimeId"], "runtime-C");
    assert!(split.request["target"].get("spaceId").is_none());
    for words in [
        vec!["pane", "focus", "--pane", "pane-B"],
        vec!["pane", "attach", "--session", "session-B"],
    ] {
        let result = cli::parse(&args(&words), &env).unwrap();
        assert!(result.request["target"].get("spaceId").is_none());
        assert!(result.request["target"].get("runtimeId").is_none());
    }
}

#[test]
fn pane_cli_rejects_unrelated_targets_and_control_characters_but_preserves_literal_ids() {
    let parse = |args: &[&str]| {
        cli::parse(
            &args.iter().map(|v| v.to_string()).collect::<Vec<_>>(),
            &HashMap::new(),
        )
    };
    for args in [
        vec!["pane", "focus", "--pane", "p", "--session", "unrelated"],
        vec!["pane", "attach", "--session", "s", "--pane", "unrelated"],
        vec!["pane", "list", "--space", "B", "--runtime", "unrelated"],
        vec!["pane", "focus", "--pane", "p\nforged"],
        vec!["pane", "focus", "--pane", "p\u{7f}"],
        vec!["pane", "attach", "--session", "s\tforged"],
    ] {
        assert_eq!(
            parse(&args).unwrap_err().code,
            "INVALID_ARGUMENT",
            "{args:?}"
        );
    }
    for id in ["lp1.literal/opaque", " Pane/中文 e\u{301}🙂-ONE ", "--help"] {
        let arg = format!("--pane={id}");
        assert_eq!(
            parse(&["pane", "focus", &arg]).unwrap().request["target"]["paneId"],
            id
        );
    }
    for id in ["x".repeat(4096), format!("{}x", "中".repeat(1365))] {
        assert_eq!(
            parse(&["pane", "close", "--pane", &id]).unwrap().request["target"]["paneId"],
            id
        );
        assert!(parse(&["pane", "close", "--pane", &(id + "x")]).is_err());
    }
}

#[test]
fn pane_help_and_schema_describe_the_installed_handlers() {
    use std::process::Command;
    let schema = Command::new(env!("CARGO_BIN_EXE_huhu"))
        .args(["schema", "--json"])
        .output()
        .unwrap();
    assert!(schema.status.success());
    let descriptor: serde_json::Value = serde_json::from_slice(&schema.stdout).unwrap();
    for name in [
        "pane.list",
        "pane.attach",
        "pane.focus",
        "pane.split",
        "pane.resize",
        "pane.close",
    ] {
        assert_eq!(descriptor["operations"][name]["available"], true);
    }
    assert_eq!(
        descriptor["operations"]["pane.resize"]["params"]["properties"]["ratio"]["minimum"],
        0.15
    );
    let help = Command::new(env!("CARGO_BIN_EXE_huhu"))
        .arg("help")
        .output()
        .unwrap();
    assert!(help.status.success());
    let help = String::from_utf8(help.stdout).unwrap();
    assert!(help.contains("--pane ID"));
    assert!(help.contains("0.15..0.85"));
    for name in [
        "pane.list",
        "pane.attach",
        "pane.focus",
        "pane.split",
        "pane.resize",
        "pane.close",
    ] {
        assert!(!help
            .lines()
            .find(|line| line.starts_with(name))
            .unwrap()
            .contains("(unavailable)"));
    }
}

#[cfg(unix)]
mod process {
    use huhu_pty::{
        control::{codec, ipc},
        frame,
    };
    use serde_json::{json, Value};
    use std::{
        fs,
        io::{Read, Write},
        os::unix::fs::{MetadataExt, PermissionsExt},
        path::PathBuf,
        process::{Child, ChildStdin, Command, Stdio},
        sync::mpsc,
        thread,
        time::{Duration, Instant},
    };
    struct Helper {
        child: Child,
        input: Option<ChildStdin>,
        frames: mpsc::Receiver<Value>,
        reader: Option<thread::JoinHandle<()>>,
        root: PathBuf,
        scope: Value,
        id: String,
        registered: Value,
    }
    impl Helper {
        fn new() -> Self {
            let root = std::env::temp_dir().join(format!(
                "h7-{}",
                &uuid::Uuid::new_v4().simple().to_string()[..16]
            ));
            // A long temp directory canonicalizes past the 100-byte socket cap
            // (`/var` to `/private/var`). The helper then cannot listen there.
            #[cfg(unix)]
            let root = if root.as_os_str().len() < 40 {
                root
            } else {
                PathBuf::from(format!(
                    "/tmp/h7-{}",
                    &uuid::Uuid::new_v4().simple().to_string()[..16]
                ))
            };
            fs::create_dir(&root).unwrap();
            fs::set_permissions(&root, fs::Permissions::from_mode(0o700)).unwrap();
            let vault = root.join("vault");
            fs::create_dir(&vault).unwrap();
            let m = fs::metadata(&vault).unwrap();
            let scope = json!({"vaultId":"test-vault","deviceId":"test-device","instanceId":format!("test-{}",uuid::Uuid::new_v4()),"rootPath":vault,"root":{"canonicalPath":fs::canonicalize(&vault).unwrap(),"dev":m.dev().to_string(),"ino":m.ino().to_string()}});
            let mut child = Command::new(env!("CARGO_BIN_EXE_huhu-pty"))
                .env("XDG_RUNTIME_DIR", &root)
                .env("HUHU_PTY_STREAM_METRICS", root.join("metrics.json"))
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::inherit())
                .spawn()
                .unwrap();
            let input = child.stdin.take();
            let mut output = child.stdout.take().unwrap();
            let (tx, frames) = mpsc::channel();
            let reader = thread::spawn(move || {
                while let Ok(Some(f)) = frame::read_client_frame(&mut output) {
                    if f.kind == frame::CONTROL {
                        let value = serde_json::from_slice(&f.body).unwrap();
                        if tx.send(value).is_err() {
                            break;
                        }
                    }
                }
            });
            let mut helper = Self {
                child,
                input,
                frames,
                reader: Some(reader),
                root,
                scope,
                id: "fixture-control".into(),
                registered: Value::Null,
            };
            helper.send(json!({"type":"hello","protocol":3,"capabilities":{"localControl":1}}));
            let hello = helper.next("hello");
            assert_eq!(hello["capabilities"]["localControl"], 1);
            helper.send(
                json!({"type":"control-register","controlId":helper.id,"scope":helper.scope}),
            );
            helper.registered = helper.next("control-registered");
            helper
        }
        fn send(&mut self, value: Value) {
            let bytes = huhu_pty::outbox::encode_json(&value, 65541).unwrap();
            self.input.as_mut().unwrap().write_all(&bytes).unwrap();
        }
        fn next(&self, kind: &str) -> Value {
            let deadline = Instant::now() + Duration::from_secs(5);
            loop {
                let v = self
                    .frames
                    .recv_timeout(deadline.saturating_duration_since(Instant::now()))
                    .unwrap_or_else(|e| panic!("expected {kind}: {e}"));
                if v["type"] == kind {
                    return v;
                }
                assert_ne!(v["type"], "control-error", "unexpected {v}");
            }
        }
        fn cli(&self, args: &[&str]) -> Child {
            Command::new(env!("CARGO_BIN_EXE_huhu"))
                .args(args)
                .env("XDG_RUNTIME_DIR", &self.root)
                .env_remove("HUHU_INSTANCE_ID")
                .env_remove("HUHU_SPACE_ID")
                .env_remove("HUHU_CONTROL_LOCATOR")
                .stdout(Stdio::piped())
                .stderr(Stdio::inherit())
                .spawn()
                .unwrap()
        }
        fn finish(&mut self) {
            self.input.take();
            let deadline = Instant::now() + Duration::from_secs(6);
            while self.child.try_wait().unwrap().is_none() && Instant::now() < deadline {
                thread::sleep(Duration::from_millis(5));
            }
            if self.child.try_wait().unwrap().is_none() {
                self.child.kill().unwrap();
                self.child.wait().unwrap();
                panic!("fixture helper did not exit");
            }
            if let Some(reader) = self.reader.take() {
                reader.join().unwrap();
            }
            // The inherited test-only sampler uses try_lock and may intentionally omit a busy sample.
            // Missing telemetry is not a measured peak; the physical protocol/exit assertions remain mandatory.
            match fs::read(self.root.join("metrics.json")){Ok(bytes)=>{let metrics:Value=serde_json::from_slice(&bytes).unwrap();assert!(metrics["control"]["connectionsPeak"].as_u64().unwrap()<=8);assert!(metrics["control"]["pendingPeak"].as_u64().unwrap()<=16);println!("ipc-actual-metrics {metrics}");},Err(e)if e.kind()==std::io::ErrorKind::NotFound=>println!("ipc-actual-metrics-unavailable: nonblocking EOF sample was busy; no peak assertion claimed"),Err(e)=>panic!("fixture metrics read failed: {e}")};
            fs::remove_dir_all(&self.root).unwrap();
        }
    }
    impl Drop for Helper {
        fn drop(&mut self) {
            self.input.take();
            if self.child.try_wait().ok().flatten().is_none() {
                let _ = self.child.kill();
                let _ = self.child.wait();
            }
            if let Some(reader) = self.reader.take() {
                let _ = reader.join();
            }
            let _ = fs::remove_dir_all(&self.root);
        }
    }
    fn collect(child: &mut Child) -> (i32, Value) {
        let deadline = Instant::now() + Duration::from_secs(5);
        while child.try_wait().unwrap().is_none() && Instant::now() < deadline {
            thread::sleep(Duration::from_millis(2));
        }
        if child.try_wait().unwrap().is_none() {
            child.kill().unwrap();
            child.wait().unwrap();
            panic!("fixture CLI deadline");
        }
        let mut text = String::new();
        child
            .stdout
            .take()
            .unwrap()
            .read_to_string(&mut text)
            .unwrap();
        (
            child.try_wait().unwrap().unwrap().code().unwrap(),
            serde_json::from_str(&text).unwrap(),
        )
    }
    #[test]
    fn invalid_os_arguments_have_a_structured_none_result_without_starting_an_endpoint() {
        use std::os::unix::ffi::OsStringExt;
        let result = Command::new(env!("CARGO_BIN_EXE_huhu"))
            .arg(std::ffi::OsString::from_vec(vec![0xff]))
            .arg("--json")
            .output()
            .unwrap();
        assert_eq!(result.status.code(), Some(2));
        let response: Value = serde_json::from_slice(&result.stdout)
            .expect("--json must preserve the error envelope even for invalid OS arguments");
        assert_eq!(response["error"]["code"], "INVALID_ARGUMENT");
        assert_eq!(response["effect"], "none");
        let result = Command::new(env!("CARGO_BIN_EXE_huhu"))
            .arg("--json")
            .args((0..65).map(|_| "x"))
            .output()
            .unwrap();
        assert_eq!(result.status.code(), Some(2));
        let response: Value = serde_json::from_slice(&result.stdout).unwrap();
        assert_eq!(response["error"]["code"], "CAPACITY_EXCEEDED");
        assert_eq!(response["effect"], "none");
    }
    #[test]
    fn review_r1_argument_overflow_still_finds_late_json_without_opening_an_endpoint() {
        use std::ffi::OsString;
        use std::os::unix::ffi::OsStringExt;
        let root = std::env::temp_dir().join(format!("h7-r1-args-{}", uuid::Uuid::new_v4()));
        fs::create_dir(&root).unwrap();
        fs::set_permissions(&root, fs::Permissions::from_mode(0o700)).unwrap();
        struct RemoveRoot(PathBuf);
        impl Drop for RemoveRoot {
            fn drop(&mut self) {
                let _ = fs::remove_dir_all(&self.0);
            }
        }
        let _cleanup = RemoveRoot(root.clone());
        let mut failures = Vec::new();
        for position in [0, 64, 65, 70] {
            for invalid_utf8 in [false, true] {
                let mut args = vec![OsString::from("version")];
                args.extend((0..70).map(|_| OsString::from("x")));
                if invalid_utf8 {
                    args[1] = OsString::from_vec(vec![0xff]);
                }
                args.insert(position, OsString::from("--json"));
                let result = Command::new(env!("CARGO_BIN_EXE_huhu"))
                    .args(&args)
                    .env("XDG_RUNTIME_DIR", &root)
                    .output()
                    .unwrap();
                assert_eq!(result.status.code(), Some(2));
                let response = codec::parse_response(
                    result.stdout.strip_suffix(b"\n").unwrap_or(&result.stdout),
                );
                match response {
                    Ok(response)
                        if response["error"]["code"] == "CAPACITY_EXCEEDED"
                            && response["effect"] == "none" =>
                    {
                        ()
                    }
                    other => failures.push(format!(
                        "position {position}, invalid {invalid_utf8}, stdout {}B: {other:?}",
                        result.stdout.len()
                    )),
                }
            }
        }
        for size in [32768, 32769] {
            let result = Command::new(env!("CARGO_BIN_EXE_huhu"))
                .arg("version")
                .arg("x".repeat(size))
                .arg(std::ffi::OsString::from_vec(vec![0xff]))
                .arg("--json")
                .env("XDG_RUNTIME_DIR", &root)
                .output()
                .unwrap();
            assert_eq!(result.status.code(), Some(2));
            let response =
                codec::parse_response(result.stdout.strip_suffix(b"\n").unwrap()).unwrap();
            assert_eq!(response["error"]["code"], "CAPACITY_EXCEEDED");
            assert_eq!(response["effect"], "none");
        }
        for (count, size, expected) in [
            (64, 1, "INVALID_ARGUMENT"),
            (65, 1, "CAPACITY_EXCEEDED"),
            (3, 32755, "INVALID_ARGUMENT"),
            (3, 32756, "CAPACITY_EXCEEDED"),
        ] {
            let mut args = vec!["version".to_string()];
            args.extend((0..count - 2).map(|_| "x".repeat(size)));
            args.push("--json".into());
            let result = Command::new(env!("CARGO_BIN_EXE_huhu"))
                .args(args)
                .env("XDG_RUNTIME_DIR", &root)
                .output()
                .unwrap();
            assert_eq!(result.status.code(), Some(2));
            let response =
                codec::parse_response(result.stdout.strip_suffix(b"\n").unwrap()).unwrap();
            assert_eq!(
                response["error"]["code"], expected,
                "count {count}, size {size}"
            );
            assert_eq!(response["effect"], "none");
        }
        assert_eq!(
            fs::read_dir(&root).unwrap().count(),
            0,
            "argument rejection must not open or discover an endpoint"
        );
        assert!(failures.is_empty(), "{}", failures.join("\n"));
    }
    #[test]
    fn review_r1_long_discovery_diagnostics_fit_the_whole_response() {
        use std::os::unix::fs::OpenOptionsExt;
        let mut h = Helper::new();
        let original = fs::read(h.registered["locator"].as_str().unwrap()).unwrap();
        let directory = PathBuf::from(h.registered["locator"].as_str().unwrap())
            .parent()
            .unwrap()
            .to_owned();
        for i in 0..3 {
            let mut value: Value = serde_json::from_slice(&original).unwrap();
            value["scope"]["vaultId"] = Value::String("v".repeat(3800));
            value["scope"]["instanceId"] = Value::String(format!("{i}{}", "i".repeat(3799)));
            let mut file = fs::OpenOptions::new()
                .create_new(true)
                .write(true)
                .mode(0o600)
                .open(directory.join(format!("ilong{i}.json")))
                .unwrap();
            file.write_all(&serde_json::to_vec(&value).unwrap())
                .unwrap();
        }
        let long = "中".repeat(2000);
        let pane = format!("{}x", "中".repeat(1365));
        let mut client = h.cli(&[
            "capabilities",
            "--json",
            "--vault",
            &long,
            "--space",
            &long,
            "--session",
            &long,
            "--runtime",
            &long,
            "--pane",
            &pane,
        ]);
        // Drain while the CLI runs: the old oversized response itself can exceed an OS pipe buffer.
        let mut stdout = client.stdout.take().unwrap();
        let output = thread::spawn(move || {
            let mut bytes = Vec::new();
            Read::by_ref(&mut stdout)
                .take(65537)
                .read_to_end(&mut bytes)
                .unwrap();
            bytes
        });
        let deadline = Instant::now() + Duration::from_secs(5);
        while client.try_wait().unwrap().is_none() && Instant::now() < deadline {
            thread::sleep(Duration::from_millis(2));
        }
        if client.try_wait().unwrap().is_none() {
            client.kill().unwrap();
            client.wait().unwrap();
            panic!("discovery CLI deadline");
        }
        let exit = client.try_wait().unwrap().unwrap().code().unwrap();
        let bytes = output.join().unwrap();
        let bytes = bytes.strip_suffix(b"\n").unwrap();
        assert!(
            bytes.len() <= huhu_pty::control::wire_generated::RESPONSE_BYTES,
            "whole response is {} bytes",
            bytes.len()
        );
        let response = codec::parse_response(bytes).unwrap();
        println!(
            "r1-discovery whole response {} bytes; code {}",
            bytes.len(),
            response["error"]["code"]
        );
        assert_eq!(exit, 2);
        assert_eq!(response["error"]["code"], "CAPACITY_EXCEEDED");
        assert_eq!(response["effect"], "none");
        assert_eq!(
            response["target"]["sessionId"], long,
            "identity must not be truncated"
        );
        assert!(
            h.frames.try_recv().is_err(),
            "discovery must not forward business"
        );
        h.send(json!({"type":"control-unregister","controlId":h.id}));
        h.next("control-unregistered");
        for i in 0..3 {
            fs::remove_file(directory.join(format!("ilong{i}.json"))).unwrap();
        }
        let mut empty = h.cli(&["capabilities", "--json"]);
        let (exit, response) = collect(&mut empty);
        assert_eq!(exit, 3);
        assert_eq!(response["error"]["code"], "TARGET_REQUIRED");
        assert_eq!(response["error"]["details"]["candidates"], json!([]));
        codec::parse_response(&serde_json::to_vec(&response).unwrap()).unwrap();
        h.finish();
    }
    #[test]
    fn review_r1_normal_timeout_keeps_the_latest_committed_target_and_phase() {
        let mut h = Helper::new();
        let instance = h.scope["instanceId"].as_str().unwrap().to_owned();
        let mut client = h.cli(&[
            "terminal",
            "start",
            "--instance",
            &instance,
            "--space",
            "s",
            "--timeout-ms",
            "200",
            "--json",
        ]);
        let request = h.next("control-request");
        let bridge = request["bridgeId"].clone();
        h.send(
            json!({"type":"control-admitted","controlId":h.id,"bridgeId":bridge,
            "progress":{"phase":"admitted","effect":"none"}}),
        );
        let progress = json!({"phase":"launch-pending","effect":"partial","target":{
            "instanceId":instance,"spaceId":"s","sessionId":"committed-session","runtimeId":"reserved-runtime"}});
        h.send(json!({"type":"control-progress","controlId":h.id,"bridgeId":bridge,"progress":progress}));
        let (exit, response) = collect(&mut client);
        println!("r1-timeout actual response {response}");
        let cancelled = h.next("control-cancel");
        h.send(json!({"type":"control-result","controlId":h.id,"bridgeId":bridge,"response":{
            "protocolVersion":1,"requestId":request["request"]["requestId"],"operation":"terminal.start",
            "ok":false,"phase":"launch-pending","effect":"partial","target":progress["target"],
            "error":{"code":"PERSISTENCE_FAILED","message":"fixture late result"}}}));
        assert_eq!(h.next("control-settled")["bridgeId"], bridge);
        assert_eq!(cancelled["bridgeId"], bridge);
        assert_eq!(exit, 6);
        assert_eq!(response["error"]["code"], "WAIT_TIMEOUT");
        assert_eq!(response["target"]["sessionId"], "committed-session");
        assert_eq!(response["target"]["runtimeId"], "reserved-runtime");
        assert_eq!(response["phase"], "launch-pending");
        assert_eq!(response["effect"], "unknown");
        assert!(
            h.frames.try_recv().is_err(),
            "late settlement must not replay the call"
        );
        h.send(json!({"type":"control-unregister","controlId":h.id}));
        h.next("control-unregistered");
        h.send(json!({"type":"cookies","rid":"browser-r1-timeout","op":"fixture-unsupported","payload":{}}));
        assert_eq!(h.next("cookies-result")["rid"], "browser-r1-timeout");
        h.finish();
    }
    #[test]
    fn review_r1_query_timeout_and_closing_preserve_the_no_effect_contract() {
        let mut observed = Vec::new();
        for closing in [false, true] {
            let mut h = Helper::new();
            let instance = h.scope["instanceId"].as_str().unwrap().to_owned();
            let mut client = h.cli(&[
                "session",
                "get",
                "--instance",
                &instance,
                "--session",
                "queried-session",
                "--timeout-ms",
                "100",
                "--json",
            ]);
            let request = h.next("control-request");
            let bridge = request["bridgeId"].clone();
            h.send(json!({"type":"control-admitted","controlId":h.id,"bridgeId":bridge,
                "progress":{"phase":"admitted","effect":"none","target":request["request"]["target"]}}));
            if closing {
                h.send(json!({"type":"control-unregister","controlId":h.id}));
            }
            let (exit, response) = collect(&mut client);
            println!("r1-query closing={closing} exit={exit} response={response}");
            assert_eq!(h.next("control-cancel")["bridgeId"], bridge);
            h.send(json!({"type":"control-result","controlId":h.id,"bridgeId":bridge,"response":{
                "protocolVersion":1,"requestId":request["request"]["requestId"],"operation":"session.get",
                "ok":true,"phase":"completed","effect":"none","target":request["request"]["target"],"data":{}}}));
            assert_eq!(h.next("control-settled")["bridgeId"], bridge);
            if !closing {
                h.send(json!({"type":"control-unregister","controlId":h.id}));
            }
            h.next("control-unregistered");
            assert!(
                h.frames.try_recv().is_err(),
                "query observation must not replay business"
            );
            h.send(json!({"type":"cookies","rid":"browser-r1-query","op":"fixture-unsupported","payload":{}}));
            assert_eq!(h.next("cookies-result")["rid"], "browser-r1-query");
            h.finish();
            observed.push((closing, exit, response));
        }
        for (closing, exit, response) in observed {
            assert_eq!(response["effect"], "none", "closing={closing}");
            assert_eq!(exit, if closing { 130 } else { 6 });
            assert_eq!(
                response["error"]["code"],
                if closing {
                    "WAIT_CANCELLED"
                } else {
                    "WAIT_TIMEOUT"
                }
            );
            assert_eq!(response["target"]["sessionId"], "queried-session");
        }
    }
    #[test]
    fn stage1_readonly_and_completed_input_survive_timeout_closing_and_late_settlement() {
        for closing in [false, true] {
            for (operation, receipt_kind) in [
                ("agent.wait", None),
                ("agent.prompt", Some("adapter-applied")),
                ("terminal.send-text", Some("pty-written")),
                ("terminal.send-keys", Some("pty-written")),
            ] {
                let mut h = Helper::new();
                let instance = h.scope["instanceId"].as_str().unwrap().to_owned();
                let (group, command) = operation.split_once('.').unwrap();
                let mut args = vec![
                    group,
                    command,
                    "--instance",
                    &instance,
                    "--session",
                    "captured-session",
                    "--runtime",
                    "captured-runtime",
                    "--timeout-ms",
                    "100",
                    "--json",
                ];
                match operation {
                    "agent.wait" => args.extend(["--state", "done"]),
                    "terminal.send-keys" => args.extend(["--keys", "Enter"]),
                    _ => args.extend(["--text", "hello"]),
                }
                let mut client = h.cli(&args);
                let request = h.next("control-request");
                let bridge = request["bridgeId"].clone();
                h.send(json!({"type":"control-admitted","controlId":h.id,"bridgeId":bridge,"progress":{"phase":"admitted","effect":"none"}}));
                let (phase, effect) = if receipt_kind.is_some() {
                    ("input-submitted", "completed")
                } else {
                    ("admitted", "none")
                };
                let receipt = json!({"kind":receipt_kind.unwrap_or("read-only"),"op":19});
                h.send(json!({"type":"control-progress","controlId":h.id,"bridgeId":bridge,"progress":{"phase":phase,"effect":effect,"target":request["request"]["target"],"data":{"receipt":receipt}}}));
                if receipt_kind.is_some() {
                    h.send(json!({"type":"control-progress","controlId":h.id,"bridgeId":bridge,"progress":{"phase":"admitted","effect":"unknown","target":{"sessionId":"wrong-target"},"data":{}}}));
                }
                if closing {
                    h.send(json!({"type":"control-unregister","controlId":h.id}));
                }
                let (exit, response) = collect(&mut client);
                println!("stage1 operation={operation} closing={closing} exit={exit} response={response}");
                let cancel = h.next("control-cancel");
                assert_eq!(cancel["bridgeId"], bridge);
                // Complete original business only after its observation ended; no replay or early permit return.
                h.send(json!({"type":"control-result","controlId":h.id,"bridgeId":bridge,"response":{"protocolVersion":1,"requestId":request["request"]["requestId"],"operation":operation,"ok":true,"phase":phase,"effect":effect,"target":request["request"]["target"],"data":{"receipt":receipt}}}));
                assert_eq!(h.next("control-settled")["bridgeId"], bridge);
                if !closing {
                    h.send(json!({"type":"control-unregister","controlId":h.id}));
                }
                h.next("control-unregistered");
                h.send(json!({"type":"cookies","rid":"stage1-browser","op":"fixture-unsupported","payload":{}}));
                assert_eq!(h.next("cookies-result")["rid"], "stage1-browser");
                h.finish();
                assert_eq!(exit, if closing { 130 } else { 6 });
                assert_eq!(
                    response["error"]["code"],
                    if closing {
                        "WAIT_CANCELLED"
                    } else {
                        "WAIT_TIMEOUT"
                    }
                );
                assert_eq!(response["target"], request["request"]["target"]);
                assert_eq!(response["phase"], phase);
                assert_eq!(response["effect"], effect);
                assert_eq!(response["data"]["receipt"], receipt);
            }
        }
    }
    #[test]
    fn stage1_unproven_or_zero_operation_receipts_never_confirm_input() {
        for (kind, op, wrong_target) in [
            ("adapter-applied", 0, false),
            ("pty-written", 1, false),
            ("adapter-applied", 1, true),
        ] {
            let mut h = Helper::new();
            let instance = h.scope["instanceId"].as_str().unwrap().to_owned();
            let mut client = h.cli(&[
                "agent",
                "prompt",
                "--instance",
                &instance,
                "--session",
                "original-session",
                "--runtime",
                "original-runtime",
                "--text",
                "hello",
                "--timeout-ms",
                "100",
                "--json",
            ]);
            let request = h.next("control-request");
            let bridge = request["bridgeId"].clone();
            h.send(json!({"type":"control-admitted","controlId":h.id,"bridgeId":bridge,"progress":{"phase":"admitted","effect":"none"}}));
            let target = if wrong_target {
                json!({"sessionId":"wrong-session"})
            } else {
                request["request"]["target"].clone()
            };
            h.send(json!({"type":"control-progress","controlId":h.id,"bridgeId":bridge,"progress":{"phase":"input-submitted","effect":"completed","target":target,"data":{"receipt":{"kind":kind,"op":op}}}}));
            let (exit, response) = collect(&mut client);
            assert_eq!(h.next("control-cancel")["bridgeId"], bridge);
            h.send(json!({"type":"control-result","controlId":h.id,"bridgeId":bridge,"response":{"protocolVersion":1,"requestId":request["request"]["requestId"],"operation":"agent.prompt","ok":false,"phase":"failed","effect":"unknown","error":{"code":"EFFECT_UNKNOWN","message":"fixture late result"}}}));
            assert_eq!(h.next("control-settled")["bridgeId"], bridge);
            h.send(json!({"type":"control-unregister","controlId":h.id}));
            h.next("control-unregistered");
            h.finish();
            assert_eq!(exit, 6);
            assert_eq!(
                response["effect"], "unknown",
                "kind={kind} op={op} wrong_target={wrong_target}"
            );
            assert_eq!(response["target"], request["request"]["target"]);
        }
    }
    #[test]
    fn stage1_actual_sigint_preserves_confirmed_input_and_only_cancels_observation() {
        for (operation, receipt_kind) in [
            ("agent.prompt", Some("adapter-applied")),
            ("agent.wait", None),
            ("terminal.send-text", Some("pty-written")),
        ] {
            let mut h = Helper::new();
            let instance = h.scope["instanceId"].as_str().unwrap().to_owned();
            let (group, command) = operation.split_once('.').unwrap();
            let mut args = vec![
                group,
                command,
                "--instance",
                &instance,
                "--session",
                "sigint-session",
                "--runtime",
                "sigint-runtime",
                "--timeout-ms",
                "30000",
                "--json",
            ];
            if operation == "agent.wait" {
                args.extend(["--state", "done"]);
            } else {
                args.extend(["--text", "hello"]);
            }
            let mut client = h.cli(&args);
            let request = h.next("control-request");
            let bridge = request["bridgeId"].clone();
            h.send(json!({"type":"control-admitted","controlId":h.id,"bridgeId":bridge,"progress":{"phase":"admitted","effect":"none"}}));
            let (phase, effect) = if receipt_kind.is_some() {
                ("input-submitted", "completed")
            } else {
                ("admitted", "none")
            };
            let receipt = json!({"kind":receipt_kind.unwrap_or("read-only"),"op":21});
            h.send(json!({"type":"control-progress","controlId":h.id,"bridgeId":bridge,"progress":{"phase":phase,"effect":effect,"target":request["request"]["target"],"data":{"receipt":receipt}}}));
            // Same stdin FIFO: this completed response proves main already adopted the preceding progress.
            h.send(json!({"type":"cookies","rid":"sigint-stage-barrier","op":"fixture-unsupported","payload":{}}));
            assert_eq!(h.next("cookies-result")["rid"], "sigint-stage-barrier");
            assert_eq!(unsafe { libc::kill(client.id() as i32, libc::SIGINT) }, 0);
            let (exit, response) = collect(&mut client);
            let cancelled = h.next("control-cancel");
            h.send(json!({"type":"control-result","controlId":h.id,"bridgeId":bridge,"response":{"protocolVersion":1,"requestId":request["request"]["requestId"],"operation":operation,"ok":true,"phase":phase,"effect":effect,"target":request["request"]["target"],"data":{"receipt":receipt}}}));
            assert_eq!(h.next("control-settled")["bridgeId"], bridge);
            h.send(json!({"type":"control-unregister","controlId":h.id}));
            h.next("control-unregistered");
            h.send(json!({"type":"cookies","rid":"sigint-browser-after","op":"fixture-unsupported","payload":{}}));
            assert_eq!(h.next("cookies-result")["rid"], "sigint-browser-after");
            h.finish();
            println!("stage1 sigint operation={operation} exit={exit} response={response} cancel={cancelled}");
            assert_eq!(exit, 130);
            assert_eq!(response["error"]["code"], "WAIT_CANCELLED");
            assert_eq!(response["effect"], effect);
            assert_eq!(response["target"], request["request"]["target"]);
            assert_eq!(response["data"]["receipt"], receipt);
            assert_eq!(cancelled["reason"], "cancelled");
        }
    }
    #[test]
    fn stage1_completed_receipt_cannot_be_erased_by_a_conflicting_business_final() {
        let mut h = Helper::new();
        let instance = h.scope["instanceId"].as_str().unwrap().to_owned();
        let mut client = h.cli(&[
            "agent",
            "prompt",
            "--instance",
            &instance,
            "--session",
            "original-session",
            "--runtime",
            "original-runtime",
            "--text",
            "hello",
            "--timeout-ms",
            "100",
            "--json",
        ]);
        let request = h.next("control-request");
        let bridge = request["bridgeId"].clone();
        let receipt = json!({"kind":"adapter-applied","op":27});
        h.send(json!({"type":"control-admitted","controlId":h.id,"bridgeId":bridge,"progress":{"phase":"admitted","effect":"none"}}));
        h.send(json!({"type":"control-progress","controlId":h.id,"bridgeId":bridge,"progress":{"phase":"input-submitted","effect":"completed","target":request["request"]["target"],"data":{"receipt":receipt}}}));
        let valid = json!({"protocolVersion":1,"requestId":request["request"]["requestId"],"operation":"agent.prompt","ok":false,"phase":"input-submitted","effect":"completed","target":request["request"]["target"],"data":{"receipt":receipt},"error":{"code":"WAIT_CANCELLED","message":"fixture legitimate wait end"}});
        for variant in 0..5 {
            let mut invalid = valid.clone();
            match variant {
                0 => {
                    invalid["effect"] = json!("unknown");
                    invalid["error"]["code"] = json!("EFFECT_UNKNOWN");
                }
                1 => invalid["effect"] = json!("partial"),
                2 => {
                    invalid["data"] = json!({});
                }
                3 => invalid["data"]["receipt"]["op"] = json!(28),
                _ => invalid["target"]["runtimeId"] = json!("wrong-runtime"),
            }
            h.send(json!({"type":"control-result","controlId":h.id,"bridgeId":bridge,"response":invalid}));
        }
        let (exit, response) = collect(&mut client);
        if exit == 6 {
            let next = h.frames.recv_timeout(Duration::from_secs(5)).unwrap();
            assert_eq!(
                next["type"], "control-cancel",
                "rejected finals must not prematurely settle the original call"
            );
            h.send(json!({"type":"control-result","controlId":h.id,"bridgeId":bridge,"response":valid}));
        }
        // On the old failure path the bad final already settled; cleanup still completes before asserting the primary result.
        assert_eq!(h.next("control-settled")["bridgeId"], bridge);
        h.send(json!({"type":"control-unregister","controlId":h.id}));
        h.next("control-unregistered");
        h.send(json!({"type":"cookies","rid":"conflicting-final-browser","op":"fixture-unsupported","payload":{}}));
        assert_eq!(h.next("cookies-result")["rid"], "conflicting-final-browser");
        h.finish();
        println!("stage1 conflicting final exit={exit} response={response}");
        assert_eq!(exit, 6);
        assert_eq!(response["error"]["code"], "WAIT_TIMEOUT");
        assert_eq!(response["effect"], "completed");
        assert_eq!(response["target"], request["request"]["target"]);
        assert_eq!(response["data"]["receipt"], receipt);
    }
    #[test]
    fn actual_two_bins_authenticate_round_trip_and_settle_without_closing_browser_lane() {
        let mut h = Helper::new();
        let offline = Command::new(env!("CARGO_BIN_EXE_huhu"))
            .args(["version", "--json"])
            .output()
            .unwrap();
        assert!(offline.status.success());
        assert_eq!(
            serde_json::from_slice::<Value>(&offline.stdout).unwrap()["protocolVersion"],
            1
        );
        let instance = h.scope["instanceId"].as_str().unwrap().to_owned();
        let mut client = h.cli(&[
            "session",
            "get",
            "--instance",
            &instance,
            "--session",
            "session-B",
            "--json",
        ]);
        let request = h.next("control-request");
        assert_eq!(request["request"]["target"]["sessionId"], "session-B");
        let bridge = request["bridgeId"].clone();
        h.send(json!({"type":"control-admitted","controlId":h.id,"bridgeId":bridge,"progress":{"phase":"admitted","effect":"none"}}));
        h.send(json!({"type":"control-result","controlId":h.id,"bridgeId":bridge,"response":{"protocolVersion":1,"requestId":request["request"]["requestId"],"operation":"session.get","ok":true,"phase":"completed","effect":"none","target":{"instanceId":instance,"spaceId":"space-B","sessionId":"session-B"},"data":{"name":"真实回执"}}}));
        let (exit, result) = collect(&mut client);
        assert_eq!(exit, 0);
        assert_eq!(result["data"]["name"], "真实回执");
        assert_eq!(h.next("control-settled")["bridgeId"], bridge);
        let locator = PathBuf::from(h.registered["locator"].as_str().unwrap());
        h.send(json!({"type":"control-unregister","controlId":h.id}));
        h.next("control-unregistered");
        assert!(!locator.exists());
        h.send(json!({"type":"cookies","rid":"browser-after-control","op":"fixture-unsupported","payload":{}}));
        assert_eq!(h.next("cookies-result")["rid"], "browser-after-control");
        h.finish();
    }
    #[test]
    fn unique_protected_candidate_is_not_inferred_and_wrong_token_never_forwards() {
        let mut h = Helper::new();
        let mut no_hint = h.cli(&["space", "list", "--json"]);
        let (exit, result) = collect(&mut no_hint);
        assert_eq!(exit, 3);
        assert_eq!(result["error"]["code"], "TARGET_REQUIRED");
        assert_eq!(
            result["error"]["details"]["candidates"]
                .as_array()
                .unwrap()
                .len(),
            1
        );
        let raw = fs::read(h.registered["locator"].as_str().unwrap()).unwrap();
        let locator = codec::parse_locator(&raw).unwrap();
        let mut socket = ipc::platform::connect(locator["endpoint"].as_str().unwrap()).unwrap();
        let body = serde_json::to_vec(
            &json!({"protocolVersion":1,"controlId":h.id,"token":"f".repeat(64)}),
        )
        .unwrap();
        let bytes = ipc::frame(body, 2048).unwrap();
        let cancel = std::sync::atomic::AtomicBool::new(false);
        ipc::write_until(
            &mut socket,
            &bytes,
            Instant::now() + Duration::from_secs(2),
            &cancel,
        )
        .unwrap();
        assert!(ipc::read_until(
            &mut socket,
            33792,
            Instant::now() + Duration::from_secs(2),
            &cancel
        )
        .is_err());
        drop(socket);
        assert!(h.frames.recv_timeout(Duration::from_millis(50)).is_err());
        h.send(json!({"type":"control-unregister","controlId":h.id}));
        h.next("control-unregistered");
        h.finish();
    }
    #[test]
    fn disconnected_admitted_calls_keep_their_slots_and_query_stop_keep_two_reserved_places() {
        let mut h = Helper::new();
        let instance = h.scope["instanceId"].as_str().unwrap().to_owned();
        let mut calls = Vec::new();
        for _ in 0..14 {
            let mut client = h.cli(&[
                "terminal",
                "start",
                "--instance",
                &instance,
                "--space",
                "s",
                "--json",
            ]);
            let request = h.next("control-request");
            h.send(json!({"type":"control-admitted","controlId":h.id,"bridgeId":request["bridgeId"],"progress":{"phase":"record-saved","effect":"partial"}}));
            client.kill().unwrap();
            client.wait().unwrap();
            assert_eq!(h.next("control-cancel")["bridgeId"], request["bridgeId"]);
            calls.push(request);
        }
        let mut rejected = h.cli(&[
            "terminal",
            "start",
            "--instance",
            &instance,
            "--space",
            "s",
            "--json",
        ]);
        let (exit, response) = collect(&mut rejected);
        assert_eq!(exit, 5);
        assert_eq!(response["error"]["code"], "BUSY");
        assert_eq!(response["effect"], "none");
        let mut query = h.cli(&["capabilities", "--instance", &instance, "--json"]);
        let query_call = h.next("control-request");
        assert_eq!(query_call["request"]["operation"], "capabilities");
        calls.push(query_call);
        let mut stop = h.cli(&[
            "terminal",
            "stop",
            "--instance",
            &instance,
            "--session",
            "s",
            "--runtime",
            "r",
            "--json",
        ]);
        let stop_call = h.next("control-request");
        assert_eq!(stop_call["request"]["operation"], "terminal.stop");
        calls.push(stop_call);
        let mut full = h.cli(&["capabilities", "--instance", &instance, "--json"]);
        assert_eq!(collect(&mut full).1["error"]["code"], "BUSY");
        for call in &calls {
            let effect = if call["request"]["operation"] == "capabilities" {
                "none"
            } else {
                "completed"
            };
            h.send(json!({"type":"control-result","controlId":h.id,"bridgeId":call["bridgeId"],"response":{"protocolVersion":1,"requestId":call["request"]["requestId"],"operation":call["request"]["operation"],"ok":true,"phase":"completed","effect":effect}}));
        }
        assert_eq!(collect(&mut query).0, 0);
        assert_eq!(collect(&mut stop).0, 0);
        let mut pending = calls
            .iter()
            .map(|v| v["bridgeId"].as_str().unwrap().to_owned())
            .collect::<std::collections::BTreeSet<_>>();
        while !pending.is_empty() {
            let settled = h.next("control-settled");
            assert!(pending.remove(settled["bridgeId"].as_str().unwrap()));
        }
        h.send(json!({"type":"control-unregister","controlId":h.id}));
        h.next("control-unregistered");
        h.finish();
    }
    #[test]
    fn unregister_revokes_discovery_but_does_not_forge_settlement_for_a_late_business_result() {
        let mut h = Helper::new();
        let instance = h.scope["instanceId"].as_str().unwrap().to_owned();
        let mut client = h.cli(&[
            "terminal",
            "start",
            "--instance",
            &instance,
            "--space",
            "s",
            "--json",
        ]);
        let request = h.next("control-request");
        h.send(json!({"type":"control-admitted","controlId":h.id,"bridgeId":request["bridgeId"],"progress":{"phase":"launch-pending","effect":"partial"}}));
        h.send(json!({"type":"control-unregister","controlId":h.id}));
        assert_eq!(h.next("control-cancel")["reason"], "closed");
        let (exit, response) = collect(&mut client);
        assert_eq!(exit, 8);
        assert_eq!(response["effect"], "unknown");
        assert!(!PathBuf::from(h.registered["locator"].as_str().unwrap()).exists());
        h.send(json!({"type":"control-register","controlId":"next-control","scope":h.scope}));
        assert_eq!(h.next("control-error")["error"]["code"], "BUSY");
        h.send(json!({"type":"control-result","controlId":h.id,"bridgeId":request["bridgeId"],"response":{"protocolVersion":1,"requestId":request["request"]["requestId"],"operation":"terminal.start","ok":true,"phase":"running","effect":"completed"}}));
        assert_eq!(h.next("control-settled")["bridgeId"], request["bridgeId"]);
        h.next("control-unregistered");
        h.id = "next-control".into();
        h.send(json!({"type":"control-register","controlId":h.id,"scope":h.scope}));
        h.registered = h.next("control-registered");
        h.send(json!({"type":"control-unregister","controlId":h.id}));
        h.next("control-unregistered");
        h.finish();
    }

    #[test]
    fn locator_and_socket_identity_permissions_and_physical_binding_are_checked_without_following_replacements(
    ) {
        use std::os::unix::fs::symlink;
        let mut h = Helper::new();
        let instance = h.scope["instanceId"].as_str().unwrap().to_owned();
        let path = PathBuf::from(h.registered["locator"].as_str().unwrap());
        let endpoint = PathBuf::from(h.registered["endpoint"].as_str().unwrap());
        let metadata = fs::symlink_metadata(&endpoint).unwrap();
        assert_eq!(metadata.mode() & 0o777, 0o600);
        assert_eq!(fs::metadata(&path).unwrap().mode() & 0o777, 0o600);
        assert_eq!(
            fs::metadata(path.parent().unwrap()).unwrap().mode() & 0o777,
            0o700
        );
        assert!(ipc::platform::listen(endpoint.to_str().unwrap()).is_err());
        assert_eq!(
            fs::symlink_metadata(&endpoint).unwrap().ino(),
            metadata.ino()
        );
        let vault = PathBuf::from(h.scope["rootPath"].as_str().unwrap());
        let original_vault = h.root.join("vault-original");
        fs::rename(&vault, &original_vault).unwrap();
        fs::create_dir(&vault).unwrap();
        let mut wrong = h.cli(&["space", "list", "--instance", &instance, "--json"]);
        let (exit, response) = collect(&mut wrong);
        assert_eq!(exit, 3);
        assert_eq!(response["error"]["code"], "SCOPE_MISMATCH");
        fs::remove_dir(&vault).unwrap();
        fs::rename(&original_vault, &vault).unwrap();
        let original = path.with_extension("original");
        fs::rename(&path, &original).unwrap();
        let sentinel = h.root.join("sentinel");
        fs::write(&sentinel, b"unchanged").unwrap();
        symlink(&sentinel, &path).unwrap();
        let mut bad = h.cli(&["space", "list", "--instance", &instance, "--json"]);
        assert_eq!(
            collect(&mut bad).1["error"]["code"],
            "CONNECTION_UNAVAILABLE"
        );
        assert_eq!(fs::read(&sentinel).unwrap(), b"unchanged");
        h.send(json!({"type":"control-unregister","controlId":h.id}));
        h.send(json!({"type":"control-register","controlId":"replacement-test","scope":h.scope}));
        assert_eq!(h.next("control-error")["error"]["code"], "BUSY");
        assert!(fs::symlink_metadata(&path)
            .unwrap()
            .file_type()
            .is_symlink());
        // Restore in one rename: removing the symlink first left a moment with no
        // locator at all, which the closing helper correctly treats as already gone.
        fs::rename(&original, &path).unwrap();
        h.next("control-unregistered");
        assert!(!path.exists());
        h.finish();
    }
    #[test]
    fn cli_timeout_and_interrupt_only_cancel_observation_and_late_results_still_settle() {
        let mut h = Helper::new();
        let instance = h.scope["instanceId"].as_str().unwrap().to_owned();
        for interrupted in [false, true] {
            let mut args = vec![
                "terminal",
                "start",
                "--instance",
                &instance,
                "--space",
                "s",
                "--json",
            ];
            if !interrupted {
                args.extend(["--timeout-ms", "100"]);
            }
            let mut client = h.cli(&args);
            let request = h.next("control-request");
            h.send(json!({"type":"control-admitted","controlId":h.id,"bridgeId":request["bridgeId"],"progress":{"phase":"launch-pending","effect":"partial"}}));
            if interrupted {
                assert_eq!(unsafe { libc::kill(client.id() as i32, libc::SIGINT) }, 0);
            }
            let (exit, response) = collect(&mut client);
            assert_eq!(exit, if interrupted { 130 } else { 6 });
            assert_eq!(
                response["error"]["code"],
                if interrupted {
                    "WAIT_CANCELLED"
                } else {
                    "WAIT_TIMEOUT"
                }
            );
            assert_eq!(response["effect"], "unknown");
            assert_eq!(h.next("control-cancel")["bridgeId"], request["bridgeId"]);
            h.send(json!({"type":"control-result","controlId":h.id,"bridgeId":request["bridgeId"],"response":{"protocolVersion":1,"requestId":request["request"]["requestId"],"operation":"terminal.start","ok":false,"phase":"launch-pending","effect":"partial","error":{"code":"PERSISTENCE_FAILED","message":"fixture late error"}}}));
            assert_eq!(h.next("control-settled")["bridgeId"], request["bridgeId"]);
        }
        h.send(json!({"type":"control-unregister","controlId":h.id}));
        h.next("control-unregistered");
        h.finish();
    }
    #[test]
    fn crashed_helper_can_register_the_same_instance_without_reclaiming_another_live_identity() {
        let mut h = Helper::new();
        let old_endpoint = PathBuf::from(h.registered["endpoint"].as_str().unwrap());
        let old_locator = PathBuf::from(h.registered["locator"].as_str().unwrap());
        let old_control = h.id.clone();
        h.child.kill().unwrap();
        h.child.wait().unwrap();
        h.input.take();
        h.reader.take().unwrap().join().unwrap();
        assert!(old_locator.exists());
        assert!(old_endpoint.exists());
        let mut child = Command::new(env!("CARGO_BIN_EXE_huhu-pty"))
            .env("XDG_RUNTIME_DIR", &h.root)
            .env("HUHU_PTY_STREAM_METRICS", h.root.join("metrics.json"))
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .unwrap();
        let mut output = child.stdout.take().unwrap();
        let (tx, rx) = mpsc::channel();
        h.input = child.stdin.take();
        h.child = child;
        h.frames = rx;
        h.reader = Some(thread::spawn(move || {
            while let Ok(Some(f)) = frame::read_client_frame(&mut output) {
                if f.kind == frame::CONTROL {
                    if tx.send(serde_json::from_slice(&f.body).unwrap()).is_err() {
                        break;
                    }
                }
            }
        }));
        h.send(json!({"type":"hello","protocol":3,"capabilities":{"localControl":1}}));
        h.next("hello");
        h.id = "fresh-after-crash".into();
        fs::set_permissions(&old_locator, fs::Permissions::from_mode(0o644)).unwrap();
        h.send(json!({"type":"control-register","controlId":h.id,"scope":h.scope}));
        assert_eq!(h.next("control-error")["error"]["code"], "BUSY");
        assert!(old_locator.exists());
        fs::set_permissions(&old_locator, fs::Permissions::from_mode(0o600)).unwrap();
        let saved_endpoint = old_endpoint.with_extension("saved");
        fs::rename(&old_endpoint, &saved_endpoint).unwrap();
        let sentinel = h.root.join("sentinel");
        fs::write(&sentinel, b"unchanged").unwrap();
        std::os::unix::fs::symlink(&sentinel, &old_endpoint).unwrap();
        h.send(json!({"type":"control-register","controlId":h.id,"scope":h.scope}));
        assert_eq!(h.next("control-error")["error"]["code"], "BUSY");
        assert_eq!(fs::read(&sentinel).unwrap(), b"unchanged");
        assert!(fs::symlink_metadata(&old_endpoint)
            .unwrap()
            .file_type()
            .is_symlink());
        fs::remove_file(&old_endpoint).unwrap();
        fs::rename(&saved_endpoint, &old_endpoint).unwrap();
        h.send(json!({"type":"control-register","controlId":h.id,"scope":h.scope}));
        h.registered = h.next("control-registered");
        assert_eq!(
            PathBuf::from(h.registered["locator"].as_str().unwrap()),
            old_locator
        );
        assert_ne!(
            h.registered["endpoint"],
            old_endpoint.to_string_lossy().as_ref()
        );
        assert!(!old_endpoint.exists());
        let new: Value = serde_json::from_slice(&fs::read(&old_locator).unwrap()).unwrap();
        assert_eq!(new["controlId"], h.id);
        assert_ne!(new["controlId"], old_control);
        let instance = h.scope["instanceId"].as_str().unwrap().to_owned();
        let mut client = h.cli(&["capabilities", "--instance", &instance, "--json"]);
        let request = h.next("control-request");
        h.send(json!({"type":"control-result","controlId":h.id,"bridgeId":request["bridgeId"],"response":{"protocolVersion":1,"requestId":request["request"]["requestId"],"operation":"capabilities","ok":true,"phase":"completed","effect":"none"}}));
        assert_eq!(collect(&mut client).0, 0);
        h.next("control-settled");
        h.send(json!({"type":"control-unregister","controlId":h.id}));
        h.next("control-unregistered");
        h.finish();
    }
    #[test]
    fn locator_candidate_count_and_single_file_e_plus_one_are_bounded_without_endpoint_probes() {
        use std::os::unix::fs::OpenOptionsExt;
        let mut h = Helper::new();
        let original = fs::read(h.registered["locator"].as_str().unwrap()).unwrap();
        let dir = PathBuf::from(h.registered["locator"].as_str().unwrap())
            .parent()
            .unwrap()
            .to_owned();
        for i in 0..31 {
            let mut value: Value = serde_json::from_slice(&original).unwrap();
            value["scope"]["instanceId"] = Value::String(format!("candidate-{i}"));
            let mut file = fs::OpenOptions::new()
                .create_new(true)
                .write(true)
                .mode(0o600)
                .open(dir.join(format!("ifiller{i}.json")))
                .unwrap();
            file.write_all(&serde_json::to_vec(&value).unwrap())
                .unwrap();
        }
        let mut no_hint = h.cli(&["space", "list", "--json"]);
        let (exit, response) = collect(&mut no_hint);
        assert_eq!(exit, 3);
        let list = response["error"]["details"]["candidates"]
            .as_array()
            .unwrap();
        assert_eq!(list.len(), 32);
        assert!(list.iter().all(|row| row
            .as_object()
            .unwrap()
            .keys()
            .all(|key| key == "instanceId" || key == "vaultId")));
        let excess = dir.join("iexcess.json");
        let mut file = fs::OpenOptions::new()
            .create_new(true)
            .write(true)
            .mode(0o600)
            .open(&excess)
            .unwrap();
        file.write_all(&original).unwrap();
        drop(file);
        let mut no_hint = h.cli(&["space", "list", "--json"]);
        let (exit, response) = collect(&mut no_hint);
        assert_eq!(exit, 2);
        assert_eq!(response["error"]["code"], "CAPACITY_EXCEEDED");
        fs::write(&excess, vec![b' '; 49153]).unwrap();
        let instance = h.scope["instanceId"].as_str().unwrap();
        let mut client = Command::new(env!("CARGO_BIN_EXE_huhu"))
            .args(["space", "list", "--instance", instance, "--json"])
            .env("XDG_RUNTIME_DIR", &h.root)
            .env("HUHU_INSTANCE_ID", instance)
            .env("HUHU_CONTROL_LOCATOR", &excess)
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .unwrap();
        let (exit, response) = collect(&mut client);
        assert_eq!(exit, 2);
        assert_eq!(response["error"]["code"], "CAPACITY_EXCEEDED");
        assert!(
            h.frames.try_recv().is_err(),
            "discovery/read capacity failures must not forward business"
        );
        h.send(json!({"type":"control-unregister","controlId":h.id}));
        h.next("control-unregistered");
        h.finish();
    }
    #[test]
    fn another_helper_cannot_retire_the_same_instances_live_listener_or_locator() {
        struct Rival {
            child: Child,
            input: Option<ChildStdin>,
            reader: Option<thread::JoinHandle<()>>,
        }
        impl Drop for Rival {
            fn drop(&mut self) {
                self.input.take();
                if self.child.try_wait().ok().flatten().is_none() {
                    let _ = self.child.kill();
                    let _ = self.child.wait();
                }
                if let Some(reader) = self.reader.take() {
                    let _ = reader.join();
                }
            }
        }
        let mut h = Helper::new();
        let path = PathBuf::from(h.registered["locator"].as_str().unwrap());
        let old = fs::read(&path).unwrap();
        let endpoint = PathBuf::from(h.registered["endpoint"].as_str().unwrap());
        let id = fs::symlink_metadata(&endpoint).unwrap().ino();
        let mut child = Command::new(env!("CARGO_BIN_EXE_huhu-pty"))
            .env("XDG_RUNTIME_DIR", &h.root)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .unwrap();
        let input = child.stdin.take();
        let mut output = child.stdout.take().unwrap();
        let (tx, rx) = mpsc::channel();
        let reader = thread::spawn(move || {
            while let Ok(Some(f)) = frame::read_client_frame(&mut output) {
                if f.kind == frame::CONTROL {
                    if tx
                        .send(serde_json::from_slice::<Value>(&f.body).unwrap())
                        .is_err()
                    {
                        break;
                    }
                }
            }
        });
        let mut rival = Rival {
            child,
            input,
            reader: Some(reader),
        };
        for value in [
            json!({"type":"hello","protocol":3,"capabilities":{"localControl":1}}),
            json!({"type":"control-register","controlId":"rival","scope":h.scope}),
        ] {
            rival
                .input
                .as_mut()
                .unwrap()
                .write_all(&huhu_pty::outbox::encode_json(&value, 65541).unwrap())
                .unwrap();
        }
        let deadline = Instant::now() + Duration::from_secs(5);
        loop {
            let value = rx
                .recv_timeout(deadline.saturating_duration_since(Instant::now()))
                .unwrap();
            if value["type"] == "control-error" {
                assert_eq!(value["error"]["code"], "BUSY");
                break;
            }
        }
        assert_eq!(fs::read(&path).unwrap(), old);
        assert_eq!(fs::symlink_metadata(&endpoint).unwrap().ino(), id);
        rival.input.take();
        let deadline = Instant::now() + Duration::from_secs(5);
        while rival.child.try_wait().unwrap().is_none() && Instant::now() < deadline {
            thread::sleep(Duration::from_millis(2));
        }
        assert!(rival.child.try_wait().unwrap().is_some());
        drop(rival);
        h.send(json!({"type":"control-unregister","controlId":h.id}));
        h.next("control-unregistered");
        h.finish();
    }
    #[test]
    fn helper_eof_does_not_wait_forever_for_an_unsettled_business_call() {
        let mut h = Helper::new();
        let instance = h.scope["instanceId"].as_str().unwrap().to_owned();
        let mut client = h.cli(&[
            "terminal",
            "start",
            "--instance",
            &instance,
            "--space",
            "s",
            "--json",
        ]);
        let request = h.next("control-request");
        h.send(json!({"type":"control-admitted","controlId":h.id,"bridgeId":request["bridgeId"],"progress":{"phase":"launch-pending","effect":"partial"}}));
        h.finish();
        let (exit, response) = collect(&mut client);
        assert_eq!(exit, 8);
        assert_eq!(response["effect"], "unknown");
    }
}

#[test]
fn unassigned_history_listing_never_inherits_the_ambient_space() {
    let env = HashMap::from([
        ("HUHU_INSTANCE_ID".into(), "instance".into()),
        ("HUHU_SPACE_ID".into(), "space-A".into()),
    ]);
    let args = |v: &[&str]| v.iter().map(|s| s.to_string()).collect::<Vec<_>>();
    // Inside a HUHU terminal (HUHU_SPACE_ID set) the discovery listing still names no Space.
    let unassigned = cli::parse(&args(&["history", "list", "--unassigned"]), &env).unwrap();
    assert_eq!(unassigned.request["operation"], "history.list");
    assert_eq!(unassigned.request["params"]["unassigned"], true);
    assert!(unassigned.request["target"].get("spaceId").is_none());
    // The ordinary listing keeps using the caller's Space.
    let ordinary = cli::parse(&args(&["history", "list"]), &env).unwrap();
    assert_eq!(ordinary.request["target"]["spaceId"], "space-A");
    // An explicit Space beside --unassigned is preserved so the service rejects the contradiction.
    let explicit = cli::parse(
        &args(&["history", "list", "--unassigned", "--space", "space-B"]),
        &env,
    )
    .unwrap();
    assert_eq!(explicit.request["target"]["spaceId"], "space-B");
    assert_eq!(explicit.request["params"]["unassigned"], true);
    // Import and resume still default to the caller's Space like every other Space-scoped operation.
    let import = cli::parse(&args(&["history", "import", "--source", "ref"]), &env).unwrap();
    assert_eq!(import.request["target"]["spaceId"], "space-A");
}
