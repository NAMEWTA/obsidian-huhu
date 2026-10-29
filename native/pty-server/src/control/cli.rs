//! Offline command grammar and routing defaults. Business target resolution remains in TypeScript.
use super::{
    codec::{self, ProtocolError},
    wire_generated as w,
};
use serde_json::{json, Map, Value};
use std::collections::{HashMap, HashSet};
use std::io::Read;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};
#[derive(Debug)]
pub struct Parsed {
    pub request: Value,
    pub json: bool,
}
fn invalid() -> ProtocolError {
    ProtocolError {
        code: "INVALID_ARGUMENT",
        message: "Invalid CLI command or parameter",
    }
}
fn accepts_body(operation: &str) -> bool {
    codec::descriptor()["operations"][operation]["cli"]["textInput"].is_object()
}

fn read_body(
    file: Option<String>,
    limit: usize,
    deadline: Instant,
    cancel: &AtomicBool,
) -> Result<Vec<u8>, ProtocolError> {
    let (sender, receiver) = std::sync::mpsc::sync_channel(1);
    std::thread::Builder::new()
        .name("huhu-cli-input".into())
        .spawn(move || {
            let mut bytes = Vec::new();
            let result = if let Some(path) = file {
                std::fs::File::open(path)
                    .and_then(|input| input.take(limit as u64 + 1).read_to_end(&mut bytes))
                    .map_err(|_| ProtocolError {
                        code: "SOURCE_UNAVAILABLE",
                        message: "Body file is unavailable",
                    })
            } else {
                std::io::stdin()
                    .lock()
                    .take(limit as u64 + 1)
                    .read_to_end(&mut bytes)
                    .map_err(|_| ProtocolError {
                        code: "INPUT_NOT_READY",
                        message: "Unable to read body stdin",
                    })
            };
            let _ = sender.send(result.map(|_| bytes));
        })
        .map_err(|_| ProtocolError {
            code: "SOURCE_UNAVAILABLE",
            message: "Input reader unavailable",
        })?;
    // OS reads can block on an open pipe (including a --file FIFO). Only this
    // independent CLI process owns the bounded worker; main exits the process
    // on cancellation/deadline, without waiting for upstream EOF or opening IPC.
    loop {
        if cancel.load(Ordering::Acquire) {
            return Err(ProtocolError {
                code: "WAIT_CANCELLED",
                message: "Local input cancelled",
            });
        }
        if Instant::now() >= deadline {
            return Err(ProtocolError {
                code: "WAIT_TIMEOUT",
                message: "Local input deadline exceeded",
            });
        }
        match receiver.recv_timeout(Duration::from_millis(2)) {
            Ok(result) => return result,
            Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {}
            Err(_) => {
                return Err(ProtocolError {
                    code: "INPUT_NOT_READY",
                    message: "Input reader ended",
                })
            }
        }
    }
}
fn flag_name(key: &str) -> String {
    let mut out = String::new();
    for c in key.chars() {
        if c.is_ascii_uppercase() {
            out.push('-');
            out.push(c.to_ascii_lowercase());
        } else {
            out.push(c);
        }
    }
    out
}
fn cli_message_id(args: &[String]) -> Option<String> {
    args.iter().enumerate().find_map(|(at, arg)| {
        if let Some(value) = arg.strip_prefix("--message=") {
            return (!value.is_empty()).then(|| value.to_owned());
        }
        (arg == "--message")
            .then(|| args.get(at + 1))
            .flatten()
            .filter(|value| !value.starts_with("--"))
            .cloned()
    })
}
fn cli_operation(args: &[String]) -> &'static str {
    if args.windows(2).any(|words| words == ["message", "send"]) {
        "message.send"
    } else if args.windows(2).any(|words| words == ["inbox", "list"]) {
        "inbox.list"
    } else if args.windows(2).any(|words| words == ["inbox", "read"]) {
        "inbox.read"
    } else if args.windows(2).any(|words| words == ["inbox", "ack"]) {
        "inbox.ack"
    } else if args.windows(2).any(|words| words == ["agent", "prompt"]) {
        "agent.prompt"
    } else if args
        .windows(2)
        .any(|words| words == ["terminal", "send-text"])
    {
        "terminal.send-text"
    } else {
        "help"
    }
}
pub fn parse(args: &[String], env: &HashMap<String, String>) -> Result<Parsed, ProtocolError> {
    if args.len() > 64
        || args.iter().any(|s| s.len() > w::REQUEST_BYTES)
        || args.iter().map(String::len).sum::<usize>() > w::REQUEST_BYTES
    {
        return Err(ProtocolError {
            code: "CAPACITY_EXCEEDED",
            message: "CLI arguments exceed control capacity",
        });
    }
    let mut args = args.to_vec();
    let requested_json = args.iter().any(|s| s == "--json");
    if args.is_empty() || args.iter().any(|s| s == "--help") {
        args = vec!["help".into()];
        if requested_json {
            args.push("--json".into());
        }
    }
    if args.iter().any(|s| s == "--version") {
        args = vec!["version".into()];
        if requested_json {
            args.push("--json".into());
        }
    }
    let descriptor = codec::descriptor();
    let boolean_flags = descriptor["operations"]
        .as_object()
        .unwrap()
        .values()
        .flat_map(|op| op["params"]["properties"].as_object().unwrap().iter())
        .filter(|(_, schema)| schema["type"] == "boolean")
        .map(|(name, _)| flag_name(name))
        .collect::<HashSet<_>>();
    let mut words = Vec::new();
    let mut flags = Vec::new();
    let mut at = 0;
    while at < args.len() {
        let token = &args[at];
        if let Some(flag) = token.strip_prefix("--") {
            flags.push(token.clone());
            let name = flag.split('=').next().unwrap();
            let cli_stdin = name == "stdin";
            if !flag.contains('=') && name != "json" && !boolean_flags.contains(name) && !cli_stdin
            {
                at += 1;
                let value = args
                    .get(at)
                    .filter(|value| !value.starts_with("--"))
                    .ok_or_else(invalid)?;
                flags.push(value.clone());
            }
        } else {
            words.push(token.clone());
        }
        at += 1;
    }
    let op = match words.len() {
        1 => words[0].clone(),
        2 => format!("{}.{}", words[0], words[1]),
        _ => return Err(invalid()),
    };
    let args = flags;
    let op_at = 0;
    let operation = descriptor["operations"].get(&op).ok_or_else(invalid)?;
    let parameters = operation["params"]["properties"]
        .as_object()
        .ok_or_else(invalid)?;
    let mut target = Map::new();
    let mut params = Map::new();
    let mut seen = HashSet::new();
    let mut json_output = false;
    let mut timeout = None;
    let mut request_id = "huhu".to_string();
    let mut at = op_at;
    while at < args.len() {
        let raw = args[at].strip_prefix("--").ok_or_else(invalid)?;
        let (key, inline) = raw
            .split_once('=')
            .map_or((raw, None), |(k, v)| (k, Some(v)));
        if !seen.insert(key.to_owned()) {
            return Err(invalid());
        }
        if key == "json" {
            if inline.is_some() {
                return Err(invalid());
            }
            json_output = true;
            at += 1;
            continue;
        }
        let target_key = descriptor["schemas"]["target"]["properties"]
            .as_object()
            .unwrap()
            .keys()
            .find(|k| k.strip_suffix("Id").is_some_and(|name| name == key));
        // `message send` deliberately calls the recipient `--to-session` so it
        // cannot be mistaken for the caller's active runtime Session.  Keep the
        // wire target as the canonical sessionId field.
        let target_key = if op == "message.send" && key == "to-session" {
            Some("sessionId")
        } else {
            target_key.map(|key| key.as_str())
        };
        let param = parameters.iter().find(|(name, _)| flag_name(name) == key);
        let param = if op == "message.send" && key == "attachments" {
            parameters.get_key_value("references")
        } else {
            param
        };
        let boolean = param.is_some_and(|(_, schema)| schema["type"] == "boolean")
            || (accepts_body(&op) && key == "stdin");
        let text = if let Some(v) = inline {
            Some(v)
        } else if boolean {
            None
        } else {
            at += 1;
            Some(args.get(at).ok_or_else(invalid)?.as_str())
        };
        if let Some(name) = target_key {
            if target.contains_key(name) {
                return Err(invalid());
            }
            target.insert(
                name.to_owned(),
                Value::String(text.ok_or_else(invalid)?.to_owned()),
            );
        } else if key == "request-id" {
            request_id = text.ok_or_else(invalid)?.to_owned();
        } else if key == "timeout-ms" {
            timeout = Some(Value::from(
                text.ok_or_else(invalid)?
                    .parse::<u64>()
                    .map_err(|_| invalid())?,
            ));
        } else if accepts_body(&op) && key == "stdin" {
            let value = match text {
                None | Some("true") => true,
                Some("false") => false,
                _ => return Err(invalid()),
            };
            params.insert("stdin".into(), Value::Bool(value));
        } else if accepts_body(&op) && key == "file" {
            params.insert(
                "file".into(),
                Value::String(text.ok_or_else(invalid)?.to_owned()),
            );
        } else if let Some((name, schema)) = param {
            let value = match schema["type"].as_str() {
                Some("boolean") => Value::Bool(match text {
                    None | Some("true") => true,
                    Some("false") => false,
                    _ => return Err(invalid()),
                }),
                Some("integer") => Value::from(
                    text.ok_or_else(invalid)?
                        .parse::<u64>()
                        .map_err(|_| invalid())?,
                ),
                Some("number") => {
                    let n = text
                        .ok_or_else(invalid)?
                        .parse::<f64>()
                        .map_err(|_| invalid())?;
                    Value::Number(serde_json::Number::from_f64(n).ok_or_else(invalid)?)
                }
                _ => Value::String(text.ok_or_else(invalid)?.to_owned()),
            };
            params.insert(name.clone(), value);
        } else {
            return Err(invalid());
        }
        at += 1;
    }
    let defaults = [("instanceId", "instance"), ("vaultId", "vault")];
    for (key, env_key) in defaults {
        if !target.contains_key(key) {
            if let Some(value) = env
                .get(descriptor["env"][env_key].as_str().unwrap())
                .filter(|s| !s.is_empty())
            {
                target.insert(key.into(), Value::String(value.clone()));
            }
        }
    }
    let explicit_session = target
        .get("sessionId")
        .and_then(Value::as_str)
        .map(str::to_owned);
    let explicit_pane = target.contains_key("paneId");
    let needed = operation["target"].as_array().unwrap();
    // `history list --unassigned` names no Space: the caller's ambient Space must not be attached to it.
    // An explicit `--space` together with `--unassigned` is kept in the target and rejected by the service.
    let unassigned_listing =
        op == "history.list" && params.get("unassigned") == Some(&Value::Bool(true));
    if !target.contains_key("spaceId")
        && explicit_session.is_none()
        && !explicit_pane
        && !unassigned_listing
        && (needed.iter().any(|s| s == "spaceId")
            || matches!(op.as_str(), "session.list" | "agent.list"))
    {
        if let Some(value) = env
            .get(descriptor["env"]["space"].as_str().unwrap())
            .filter(|s| !s.is_empty())
        {
            target.insert("spaceId".into(), Value::String(value.clone()));
        }
    }
    let pane_operation = op.starts_with("pane.");
    let explicit_message_target = op == "message.send";
    let explicit_inbox_target = op == "inbox.list";
    if !pane_operation
        && !explicit_message_target
        && !explicit_inbox_target
        && needed.iter().any(|s| s == "sessionId")
        && !target.contains_key("sessionId")
    {
        if let Some(value) = env
            .get(descriptor["env"]["session"].as_str().unwrap())
            .filter(|s| !s.is_empty())
        {
            target.insert("sessionId".into(), Value::String(value.clone()));
        }
    }
    let own_session = explicit_session
        .as_ref()
        .is_none_or(|id| env.get(descriptor["env"]["session"].as_str().unwrap()) == Some(id));
    if !pane_operation
        && own_session
        && needed.iter().any(|s| s == "runtimeId")
        && !target.contains_key("runtimeId")
    {
        if let Some(value) = env
            .get(descriptor["env"]["runtime"].as_str().unwrap())
            .filter(|s| !s.is_empty())
        {
            target.insert("runtimeId".into(), Value::String(value.clone()));
        }
    }
    if pane_operation
        && needed
            .iter()
            .any(|key| !target.contains_key(key.as_str().unwrap()))
    {
        return Err(ProtocolError {
            code: "TARGET_REQUIRED",
            message: "Pane operation target is required",
        });
    }
    if (explicit_message_target || explicit_inbox_target) && !target.contains_key("sessionId") {
        return Err(ProtocolError {
            code: "TARGET_REQUIRED",
            message: "Choose an explicit recipient Session",
        });
    }
    if accepts_body(&op) {
        let has_text = params.contains_key("text");
        let has_stdin = params.get("stdin").is_some_and(|v| v == &Value::Bool(true));
        let has_file = params.contains_key("file");
        if (has_stdin && has_file) || (has_text && (has_stdin || has_file)) {
            return Err(invalid());
        }
    }
    if pane_operation
        && (target.values().any(|value| {
            value
                .as_str()
                .unwrap()
                .chars()
                .any(|c| c.is_ascii_control())
        }) || target.keys().any(|key| match key.as_str() {
            "paneId" => matches!(op.as_str(), "pane.list" | "pane.attach"),
            "sessionId" => !matches!(op.as_str(), "pane.attach" | "pane.split"),
            "runtimeId" => op == "pane.list",
            _ => false,
        }))
    {
        return Err(invalid());
    }
    let mut request =
        json!({"protocolVersion":1,"requestId":request_id,"operation":op,"params":params});
    if !target.is_empty() {
        request["target"] = Value::Object(target);
    }
    if let Some(timeout) = timeout {
        request["timeoutMs"] = timeout;
    }
    codec::measure(&request, w::REQUEST_BYTES, false)?;
    // The CLI-local stdin/file forms are completed by run() after it has
    // generated the message identity.  All other operations, and fully
    // populated wire requests, use the canonical strict validator here.
    let local_body =
        accepts_body(&op) && (params.contains_key("stdin") || params.contains_key("file"));
    let incomplete_message =
        op == "message.send" && (!params.contains_key("message") || !params.contains_key("text"));
    if local_body {
        let mut wire_request = request.clone();
        let wire_params = wire_request["params"].as_object_mut().unwrap();
        wire_params.remove("stdin");
        wire_params.remove("file");
        wire_params.insert("text".into(), Value::String("body".into()));
        if op == "message.send" {
            wire_params
                .entry("message")
                .or_insert(Value::String("pending".into()));
            wire_params.remove("references"); // Decoded from CLI JSON after allocating the message identity.
        }
        codec::check_request(&wire_request)?;
    } else if !incomplete_message {
        codec::check_request(&request)?;
    }
    Ok(Parsed {
        request,
        json: json_output,
    })
}

/// OS argument decoding and pre-clone bounds fail before any endpoint is opened.
pub fn reject_arguments(code: &'static str, json_output: bool) -> i32 {
    let request = json!({"requestId":"huhu","operation":"help"});
    let response = super::client::failure(
        &request,
        code,
        "CLI arguments are invalid or exceed control capacity",
        "none",
    );
    print_result(&response, json_output, None);
    w::error_exit(code)
}

/// The independent CLI only reads its six canonical route hints; it never collects or prints the full environment.
pub fn run(args: &[String]) -> i32 {
    use std::sync::{atomic::AtomicBool, Arc};
    let descriptor = codec::descriptor();
    let env: HashMap<String, String> = descriptor["env"]
        .as_object()
        .unwrap()
        .values()
        .filter_map(|key| {
            let key = key.as_str().unwrap();
            std::env::var(key).ok().map(|value| (key.to_owned(), value))
        })
        .collect();
    let json_output = args.iter().any(|a| a == "--json");
    let parsed = match parse(args, &env) {
        Ok(v) => v,
        Err(e) => {
            let request = json!({"requestId":"huhu","operation":cli_operation(args)});
            let response = super::client::failure(&request, e.code, e.message, "none");
            print_result(&response, json_output, cli_message_id(args).as_deref());
            return w::error_exit(e.code);
        }
    };
    let operation = parsed.request["operation"].as_str().unwrap().to_owned();
    if operation == "schema" {
        let text = w::DESCRIPTOR_JSON;
        if text.len() > w::SCHEMA_BYTES {
            return 2;
        }
        println!("{text}");
        return 0;
    }
    if operation == "help" {
        if parsed.json {
            println!(
                "{}",
                json!({"protocolVersion":1,"operations":descriptor["operations"],"limits":descriptor["limits"],"env":descriptor["env"]})
            );
        } else {
            println!("huhu <group> <command> [--instance ID] [--vault ID] [--space ID] [--session ID] [--runtime ID] [--pane ID] [--timeout-ms N] [--json]\nExplicit Pane and Session targets resolve their own Space; cwd and UI focus are never routing defaults.");
            for (name, op) in descriptor["operations"].as_object().unwrap() {
                let targets = op["target"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .filter(|_| {
                        name.starts_with("pane.")
                            || *name == "message.send"
                            || *name == "inbox.list"
                    })
                    .map(|key| {
                        let key = key.as_str().unwrap();
                        let flag = if *name == "message.send" && key == "sessionId" {
                            "to-session"
                        } else {
                            key.trim_end_matches("Id")
                        };
                        format!("--{flag} ID")
                    });
                let params = targets
                    .chain(
                        op["params"]["properties"]
                            .as_object()
                            .unwrap()
                            .keys()
                            .map(|key| {
                                if key == "text" && accepts_body(name) {
                                    "(--text TEXT | --stdin | --file PATH)".to_owned()
                                } else {
                                    format!("--{}", flag_name(key))
                                }
                            }),
                    )
                    .collect::<Vec<_>>()
                    .join(" ");
                println!(
                    "{name:24} {params}{}",
                    if op["available"] == false {
                        " (unavailable)"
                    } else {
                        ""
                    }
                );
            }
            let ratio = &descriptor["operations"]["pane.resize"]["params"]["properties"]["ratio"];
            println!("Pane IDs are opaque UTF-8 (1..4096 bytes); pane targets and inserted Sessions are explicit. Only pane.list inherits a Space hint.");
            println!("pane.resize ratio {}..{} is the target leaf's nearest-parent subtree share; invalid ratios are rejected, never clamped.", ratio["minimum"], ratio["maximum"]);
            println!("pane.split --runtime constrains the inserted Session, not the source Pane. pane.close only detaches a view.");
        }
        return 0;
    }
    if operation == "version" {
        let response = json!({"protocolVersion":1,"requestId":parsed.request["requestId"],"operation":"version","ok":true,"phase":"completed","effect":"none","data":{"version":env!("CARGO_PKG_VERSION"),"helperProtocol":3}});
        print_result(&response, parsed.json, None);
        return 0;
    }
    let cancel = Arc::new(AtomicBool::new(false));
    let signal = cancel.clone();
    if ctrlc::set_handler(move || {
        signal.store(true, std::sync::atomic::Ordering::Release);
    })
    .is_err()
    {
        let response = super::client::failure(
            &parsed.request,
            "SOURCE_UNAVAILABLE",
            "Cannot install CLI cancellation handler",
            "none",
        );
        print_result(&response, parsed.json, None);
        return 5;
    }
    let mut request = parsed.request;
    let input_timeout_ms = request["timeoutMs"]
        .as_u64()
        .unwrap_or(w::DEFAULT_TIMEOUT_MS as u64);
    let mut message_id = None;
    if operation == "message.send" {
        // Generate the durable business identity before reading stdin/files or
        // touching the local IPC endpoint. requestId remains correlation only.
        let id = match request["params"].get("message").and_then(Value::as_str) {
            Some(value) => value.to_owned(),
            None => match super::ipc::platform::nonce() {
                Ok(value) => value,
                Err(_) => {
                    let response = super::client::failure(
                        &request,
                        "SOURCE_UNAVAILABLE",
                        "Message identity unavailable",
                        "none",
                    );
                    print_result(&response, parsed.json, None);
                    return 5;
                }
            },
        };
        message_id = Some(id.clone());
        request["params"]
            .as_object_mut()
            .expect("CLI params object")
            .insert("message".into(), Value::String(id));
    }
    if accepts_body(&operation) {
        let body_limit = descriptor["operations"][&operation]["cli"]["textInput"]["maxUtf8Bytes"]
            .as_u64()
            .expect("generated CLI body byte limit") as usize;
        let params = request["params"]
            .as_object_mut()
            .expect("CLI params object");
        let stdin = params
            .remove("stdin")
            .is_some_and(|v| v == Value::Bool(true));
        let file = params
            .remove("file")
            .and_then(|v| v.as_str().map(str::to_owned));
        if stdin && file.is_some() {
            let response = super::client::failure(
                &request,
                "INVALID_ARGUMENT",
                "Choose only one of --stdin or --file",
                "none",
            );
            print_result(&response, parsed.json, message_id.as_deref());
            return w::error_exit("INVALID_ARGUMENT");
        }
        if stdin || file.is_some() {
            if file
                .as_ref()
                .is_some_and(|path| path.len() > w::REQUEST_BYTES)
            {
                let response = super::client::failure(
                    &request,
                    "CAPACITY_EXCEEDED",
                    "Body file path exceeds control capacity",
                    "none",
                );
                print_result(&response, parsed.json, message_id.as_deref());
                return w::error_exit("CAPACITY_EXCEEDED");
            }
            let deadline = Instant::now() + Duration::from_millis(input_timeout_ms);
            let bytes = match read_body(file, body_limit, deadline, &cancel) {
                Ok(bytes) => bytes,
                Err(error) => {
                    let response =
                        super::client::failure(&request, error.code, error.message, "none");
                    print_result(&response, parsed.json, message_id.as_deref());
                    return w::error_exit(error.code);
                }
            };
            if bytes.len() > body_limit {
                let response = super::client::failure(
                    &request,
                    "CAPACITY_EXCEEDED",
                    "Body exceeds the UTF-8 input limit",
                    "none",
                );
                print_result(&response, parsed.json, message_id.as_deref());
                return w::error_exit("CAPACITY_EXCEEDED");
            }
            let text = match String::from_utf8(bytes) {
                Ok(text) if !text.is_empty() => text,
                _ => {
                    let response = super::client::failure(
                        &request,
                        "INVALID_ARGUMENT",
                        "Body must be non-empty UTF-8",
                        "none",
                    );
                    print_result(&response, parsed.json, message_id.as_deref());
                    return w::error_exit("INVALID_ARGUMENT");
                }
            };
            params.insert("text".into(), Value::String(text));
        }
        if !params.contains_key("text") {
            let response = super::client::failure(
                &request,
                "INPUT_NOT_READY",
                "Choose one body source: --text, --stdin, or --file",
                "none",
            );
            print_result(&response, parsed.json, message_id.as_deref());
            return w::error_exit("INPUT_NOT_READY");
        }
        if params
            .get("text")
            .and_then(Value::as_str)
            .is_some_and(|text| text.is_empty() || text.len() > body_limit)
        {
            let response = super::client::failure(
                &request,
                "CAPACITY_EXCEEDED",
                "Body exceeds the UTF-8 input limit",
                "none",
            );
            print_result(&response, parsed.json, message_id.as_deref());
            return w::error_exit("CAPACITY_EXCEEDED");
        }
    }
    if operation == "message.send" {
        let params = request["params"]
            .as_object_mut()
            .expect("CLI params object");
        if !params.contains_key("source") {
            params.insert("source".into(), Value::String("cli".into()));
        }
        if let Some(raw) = params.get("references").and_then(Value::as_str) {
            let raw = raw.to_owned();
            let parsed_refs: Value = match serde_json::from_str(&raw) {
                Ok(value) => value,
                Err(_) => {
                    let response = super::client::failure(
                        &request,
                        "INVALID_ARGUMENT",
                        "Message references must be valid JSON",
                        "none",
                    );
                    print_result(&response, parsed.json, message_id.as_deref());
                    return w::error_exit("INVALID_ARGUMENT");
                }
            };
            let valid = parsed_refs.as_array().is_some_and(|refs| {
                refs.len() <= w::MESSAGE_REFERENCE_COUNT
                    && refs.iter().all(|reference| {
                        serde_json::to_vec(reference)
                            .is_ok_and(|bytes| bytes.len() <= w::MESSAGE_REFERENCE_BYTES)
                    })
            });
            if !valid {
                let response = super::client::failure(
                    &request,
                    "CAPACITY_EXCEEDED",
                    "Message references exceed the bounded reference budget",
                    "none",
                );
                print_result(&response, parsed.json, message_id.as_deref());
                return w::error_exit("CAPACITY_EXCEEDED");
            }
            params.insert("references".into(), parsed_refs);
        }
        if let Err(error) = codec::check_request(&request) {
            let response = super::client::failure(&request, error.code, error.message, "none");
            print_result(&response, parsed.json, message_id.as_deref());
            return w::error_exit(error.code);
        }
    }
    if accepts_body(&operation) {
        if let Err(error) = codec::check_request(&request) {
            let response = super::client::failure(&request, error.code, error.message, "none");
            print_result(&response, parsed.json, message_id.as_deref());
            return w::error_exit(error.code);
        }
    }
    if cancel.load(Ordering::Acquire) {
        let response =
            super::client::failure(&request, "WAIT_CANCELLED", "Local input cancelled", "none");
        print_result(&response, parsed.json, message_id.as_deref());
        return w::error_exit("WAIT_CANCELLED");
    }
    if request["requestId"] == "huhu" {
        match super::ipc::platform::nonce() {
            Ok(id) => request["requestId"] = Value::String(id),
            Err(_) => {
                let response = super::client::failure(
                    &request,
                    "SOURCE_UNAVAILABLE",
                    "Request identity unavailable",
                    "none",
                );
                print_result(&response, parsed.json, message_id.as_deref());
                return 5;
            }
        }
    }
    let response = super::client::invoke(&request, &env, &cancel);
    print_result(&response, parsed.json, message_id.as_deref());
    if response["ok"] == true {
        0
    } else {
        w::error_exit(
            response["error"]["code"]
                .as_str()
                .unwrap_or("EFFECT_UNKNOWN"),
        )
    }
}
fn print_result(value: &Value, json_output: bool, message_id: Option<&str>) {
    let mut value = value.clone();
    if let Some(message_id) = message_id {
        if value["ok"] == true {
            if value.get("data").and_then(Value::as_object).is_some() {
                value["data"]["messageId"] = Value::String(message_id.to_owned());
            } else if value.get("data").is_none() {
                value["data"] = json!({"messageId":message_id});
            }
        } else if let Some(error) = value.get_mut("error").and_then(Value::as_object_mut) {
            if let Some(details) = error.get_mut("details").and_then(Value::as_object_mut) {
                details.insert("messageId".into(), Value::String(message_id.to_owned()));
            } else {
                error.insert("details".into(), json!({"messageId":message_id}));
            }
        }
    }
    // A host response may already be close to the 49152-byte envelope limit.
    // Preserve the business identity by shrinking only the diagnostic/data
    // extension if attaching it would otherwise exceed the wire budget.
    if codec::measure(&value, w::RESPONSE_BYTES, false).is_err() {
        if value["ok"] == true {
            if let Some(message_id) = message_id {
                value["data"] = json!({"messageId": message_id});
            }
        } else if let Some(message_id) = message_id {
            value["error"]["details"] = json!({"messageId": message_id});
        }
    }
    if json_output {
        println!("{value}");
    } else if value["ok"] == true {
        if let Some(data) = value.get("data") {
            println!("{data}");
        } else {
            println!("{}", value["phase"].as_str().unwrap_or("completed"));
        }
    } else {
        let suffix = value["error"]["details"]["messageId"]
            .as_str()
            .map(|id| format!("; messageId={id}"))
            .unwrap_or_default();
        eprintln!(
            "{}: {} (effect: {}){}",
            value["error"]["code"].as_str().unwrap_or("EFFECT_UNKNOWN"),
            value["error"]["message"]
                .as_str()
                .unwrap_or("Control failed"),
            value["effect"].as_str().unwrap_or("unknown"),
            suffix,
        );
    }
}
