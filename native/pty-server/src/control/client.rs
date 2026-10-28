//! One bounded, authenticated call. Never starts a helper and never reconnects or replays an operation.
use super::{
    codec,
    ipc::{self, platform as os},
    locator, wire_generated as w,
};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    sync::atomic::{AtomicBool, Ordering},
    time::{Duration, Instant},
};
pub fn failure(request: &Value, code: &str, message: &str, effect: &str) -> Value {
    let mut result = json!({"protocolVersion":1,"requestId":request["requestId"],"operation":request["operation"],"ok":false,"phase":"failed","effect":effect,"error":{"code":code,"message":message}});
    if let Some(target) = request.get("target") {
        result["target"] = target.clone();
    }
    result
}
fn body(value: &Value, limit: usize) -> Result<Vec<u8>, codec::ProtocolError> {
    let len = codec::measure(value, limit, false)?;
    let mut bytes = Vec::with_capacity(len + 4);
    serde_json::to_writer(&mut bytes, value).map_err(|_| codec::ProtocolError {
        code: "INVALID_ARGUMENT",
        message: "Invalid control value",
    })?;
    Ok(bytes)
}
/// One parser survives cancellation and partial final reads. The marker is handed once; no reconnect or replay.
fn read_observation(
    stream: &mut (impl std::io::Read + std::io::Write),
    deadline: Instant,
    cancel: &AtomicBool,
) -> std::io::Result<Vec<u8>> {
    let mut reader = ipc::Reader::new(w::RESPONSE_BYTES);
    let mut deadline = deadline;
    let mut sent = false;
    loop {
        if cancel.load(Ordering::Acquire) && !sent {
            sent = true;
            deadline = deadline
                .min(Instant::now() + Duration::from_millis(w::OBSERVATION_CANCEL_TAIL_MS as u64));
            let marker = codec::encode_observation_cancel()
                .map_err(|_| std::io::Error::from(std::io::ErrorKind::InvalidData))?;
            let bytes = ipc::frame(marker, w::OBSERVATION_CANCEL_BYTES)?;
            ipc::write_until(stream, &bytes, deadline, &AtomicBool::new(false))?;
        }
        if Instant::now() >= deadline {
            return Err(std::io::ErrorKind::TimedOut.into());
        }
        if let Some(body) = reader.poll(stream)? {
            return Ok(body);
        }
        std::thread::sleep(Duration::from_millis(2));
    }
}
pub fn invoke(request: &Value, env: &HashMap<String, String>, cancel: &AtomicBool) -> Value {
    bounded_response(request, invoke_inner(request, env, cancel))
}
fn bounded_response(request: &Value, response: Value) -> Value {
    if codec::measure(&response, w::RESPONSE_BYTES, false).is_ok() {
        response
    } else {
        failure(
            request,
            "CAPACITY_EXCEEDED",
            "Complete control response exceeds capacity",
            response["effect"].as_str().unwrap_or("unknown"),
        )
    }
}
fn invoke_inner(request: &Value, env: &HashMap<String, String>, cancel: &AtomicBool) -> Value {
    let fail = |code, message, effect| failure(request, code, message, effect);
    let instance = request["target"]["instanceId"].as_str();
    if instance.is_none() {
        let mut result = fail(
            "TARGET_REQUIRED",
            "Choose an explicit local instance",
            "none",
        );
        result["error"]["details"] = json!({"candidates":[]});
        let base = match codec::measure(&result, w::RESPONSE_BYTES, false) {
            Ok(size) => size,
            Err(e) => return fail(e.code, e.message, "none"),
        };
        // Replace the measured empty array; all target/error/envelope bytes already occupy their share.
        match locator::candidates(w::RESPONSE_BYTES - base + 2) {
            Ok(candidates) => result["error"]["details"] = json!({"candidates":candidates}),
            Err(e) => {
                result = fail(e.code, e.message, "none");
            }
        }
        return result;
    }
    let descriptor = codec::descriptor();
    let hint = if env
        .get(descriptor["env"]["instance"].as_str().unwrap())
        .map(String::as_str)
        == instance
    {
        env.get(descriptor["env"]["locator"].as_str().unwrap())
            .map(String::as_str)
    } else {
        None
    };
    let locator = match locator::select(instance, hint) {
        Ok(v) => v,
        Err(e) => return fail(e.code, e.message, "none"),
    };
    if request["target"]
        .get("vaultId")
        .is_some_and(|v| v != &locator["scope"]["vaultId"])
    {
        return fail(
            "SCOPE_MISMATCH",
            "Requested Vault differs from local binding",
            "none",
        );
    }
    if cancel.load(Ordering::Acquire) {
        return fail("WAIT_CANCELLED", "Control observation cancelled", "none");
    }
    let mut stream = match os::connect(locator["endpoint"].as_str().unwrap()) {
        Ok(v) => v,
        Err(_) => {
            return fail(
                "CONNECTION_UNAVAILABLE",
                "Local endpoint unavailable",
                "none",
            )
        }
    };
    let auth =
        json!({"protocolVersion":1,"controlId":locator["controlId"],"token":locator["token"]});
    let auth = match body(&auth, w::AUTH_BYTES).and_then(|v| {
        ipc::frame(v, w::AUTH_BYTES).map_err(|_| codec::ProtocolError {
            code: "CAPACITY_EXCEEDED",
            message: "Authentication capacity",
        })
    }) {
        Ok(v) => v,
        Err(e) => return fail(e.code, e.message, "none"),
    };
    let auth_deadline = Instant::now() + Duration::from_millis(w::HANDSHAKE_MS as u64);
    if ipc::write_until(&mut stream, &auth, auth_deadline, cancel).is_err() {
        return fail(
            if cancel.load(Ordering::Acquire) {
                "WAIT_CANCELLED"
            } else {
                "CONNECTION_UNAVAILABLE"
            },
            "Authentication transport ended",
            "none",
        );
    }
    let hello = match ipc::read_until(
        &mut stream,
        w::SCOPE_BYTES + w::WRAPPER_BYTES,
        auth_deadline,
        cancel,
    ) {
        Ok(v) => v,
        Err(_) => {
            return fail(
                if cancel.load(Ordering::Acquire) {
                    "WAIT_CANCELLED"
                } else {
                    "CONNECTION_UNAVAILABLE"
                },
                "Authentication handshake unavailable",
                "none",
            )
        }
    };
    let hello = match codec::parse_helper(&hello) {
        Ok(Some(v)) if v["type"] == "control-register" => v,
        _ => return fail("PROTOCOL_MISMATCH", "Unsupported control handshake", "none"),
    };
    if hello["controlId"] != locator["controlId"]
        || hello["scope"] != locator["scope"]
        || locator::validate_scope(&hello["scope"]).is_err()
    {
        return fail("SCOPE_MISMATCH", "Endpoint binding changed", "none");
    }
    let bytes = match body(request, w::REQUEST_BYTES).and_then(|v| {
        ipc::frame(v, w::REQUEST_BYTES).map_err(|_| codec::ProtocolError {
            code: "CAPACITY_EXCEEDED",
            message: "Request capacity",
        })
    }) {
        Ok(v) => v,
        Err(e) => return fail(e.code, e.message, "none"),
    };
    if cancel.load(Ordering::Acquire) {
        return fail("WAIT_CANCELLED", "Control observation cancelled", "none");
    }
    let read_only = w::read_only(request["operation"].as_str().unwrap());
    let uncertain = if read_only { "none" } else { "unknown" };
    let write_deadline = Instant::now() + Duration::from_millis(w::HANDSHAKE_MS as u64);
    if ipc::write_until(&mut stream, &bytes, write_deadline, cancel).is_err() {
        return fail(
            if cancel.load(Ordering::Acquire) {
                "WAIT_CANCELLED"
            } else if read_only {
                "CONNECTION_UNAVAILABLE"
            } else {
                "EFFECT_UNKNOWN"
            },
            "Request transport ended; no replay was attempted",
            uncertain,
        );
    }
    // The broker starts observation after decoding the request and has a bounded response-write tail.
    // Leave that tail available instead of closing first and discarding its latest captured target.
    let deadline = Instant::now()
        + Duration::from_millis(
            request["timeoutMs"]
                .as_u64()
                .unwrap_or(w::DEFAULT_TIMEOUT_MS as u64)
                + w::HANDSHAKE_MS as u64,
        );
    let response = match read_observation(&mut stream, deadline, cancel) {
        Ok(v) => v,
        Err(e) => {
            return fail(
                if cancel.load(Ordering::Acquire) {
                    "WAIT_CANCELLED"
                } else if e.kind() == std::io::ErrorKind::TimedOut {
                    "WAIT_TIMEOUT"
                } else if read_only {
                    "CONNECTION_UNAVAILABLE"
                } else {
                    "EFFECT_UNKNOWN"
                },
                "Control observation ended; query the captured target before retrying",
                uncertain,
            )
        }
    };
    match codec::parse_response(&response) {
        Ok(v)
            if v["requestId"] == request["requestId"] && v["operation"] == request["operation"] =>
        {
            v
        }
        _ => fail(
            if read_only {
                "PROTOCOL_MISMATCH"
            } else {
                "EFFECT_UNKNOWN"
            },
            "Invalid or unrelated control result",
            uncertain,
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn complete_runtime_response_accepts_the_exact_boundary_and_rejects_the_next_byte() {
        let request = json!({"protocolVersion":1,"requestId":"boundary","operation":"capabilities","target":{"sessionId":"中\"\\"}});
        let mut response = json!({"protocolVersion":1,"requestId":"boundary","operation":"capabilities","ok":true,"phase":"completed","effect":"none","data":{"padding":""}});
        let base = codec::measure(&response, w::RESPONSE_BYTES, false).unwrap();
        response["data"]["padding"] = Value::String("x".repeat(w::RESPONSE_BYTES - base));
        let bounded = bounded_response(&request, response.clone());
        let bytes = serde_json::to_vec(&bounded).unwrap();
        assert_eq!(bytes.len(), w::RESPONSE_BYTES);
        codec::parse_response(&bytes).unwrap();
        let mut padding = response["data"]["padding"].as_str().unwrap().to_owned();
        padding.push('x');
        response["data"]["padding"] = Value::String(padding);
        let bounded = bounded_response(&request, response);
        let bytes = serde_json::to_vec(&bounded).unwrap();
        assert!(bytes.len() <= w::RESPONSE_BYTES);
        codec::parse_response(&bytes).unwrap();
        assert_eq!(bounded["error"]["code"], "CAPACITY_EXCEEDED");
        assert_eq!(bounded["effect"], "none");
        assert_eq!(bounded["target"], request["target"]);
    }
}

#[cfg(test)]
mod observation_tests {
    use super::*;
    use std::{
        collections::VecDeque,
        io::{self, Read, Write},
    };
    struct Socket<'a> {
        incoming: VecDeque<u8>,
        written: Vec<u8>,
        cancel: &'a AtomicBool,
        reads: usize,
    }
    impl Read for Socket<'_> {
        fn read(&mut self, bytes: &mut [u8]) -> io::Result<usize> {
            self.reads += 1;
            let n = bytes.len().min(self.incoming.len()).min(2);
            for byte in &mut bytes[..n] {
                *byte = self.incoming.pop_front().unwrap();
            }
            self.cancel.store(true, Ordering::Release);
            Ok(n)
        }
    }
    impl Write for Socket<'_> {
        fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
            let n = bytes.len().min(3);
            self.written.extend_from_slice(&bytes[..n]);
            Ok(n)
        }
        fn flush(&mut self) -> io::Result<()> {
            Ok(())
        }
    }
    #[test]
    fn observation_cancel_keeps_the_same_partial_final_reader_and_sends_one_marker() {
        let final_body = br#"{"receipt":{"kind":"adapter-applied","op":1}}"#;
        let frame = ipc::frame(final_body.to_vec(), w::RESPONSE_BYTES).unwrap();
        let cancel = AtomicBool::new(false);
        let mut stream = Socket {
            incoming: frame.into(),
            written: Vec::new(),
            cancel: &cancel,
            reads: 0,
        };
        let result = read_observation(
            &mut stream,
            Instant::now() + Duration::from_secs(1),
            &cancel,
        )
        .unwrap();
        assert_eq!(result, final_body);
        assert!(stream.reads > 2);
        assert_eq!(
            stream.written,
            ipc::frame(
                codec::encode_observation_cancel().unwrap(),
                w::OBSERVATION_CANCEL_BYTES
            )
            .unwrap()
        );
    }
}
