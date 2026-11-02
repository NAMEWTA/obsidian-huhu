//! One nonblocking socket wheel inside the existing helper. TypeScript remains the sole business owner.
use super::{
    codec,
    ipc::{self, platform as os, Reader, Stream},
    locator, wire_generated as w,
};
use crate::outbox::{BrokerClass, BrokerDelivery, Outbox};
use serde_json::{json, Value};
use std::{
    collections::BTreeMap,
    io::{self, Read, Write},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex, Weak,
    },
    thread::{self, JoinHandle},
    time::{Duration, Instant},
};
struct Pending {
    forward: Arc<BrokerDelivery>,
    local: bool,
    request: Value,
    ordinary: bool,
    admitted: bool,
    progress: Option<Value>,
    result: Option<Vec<u8>>,
    observer_done: bool,
    cancel: Option<&'static str>,
    cancel_sent: bool,
    settled: Option<Arc<AtomicBool>>,
}
struct Runtime {
    id: String,
    scope: Value,
    closing: AtomicBool,
    dead: AtomicBool,
    pending: Mutex<BTreeMap<String, Pending>>,
    thread: Mutex<Option<JoinHandle<()>>>,
}
#[derive(Default)]
struct Stats {
    connections: usize,
    pending: usize,
    ordinary_pending: usize,
}
struct Core {
    stats: Mutex<Stats>,
    runtime: Mutex<Option<Arc<Runtime>>>,
    out: Outbox,
}
#[derive(Clone)]
pub struct Broker {
    core: Arc<Core>,
}
fn error(code: &str, message: &str) -> Value {
    json!({"code":code,"message":message})
}
fn failure(
    request: &Value,
    code: &str,
    message: &str,
    effect: &str,
    progress: Option<&Value>,
) -> Value {
    let mut value = json!({"protocolVersion":1,"requestId":request["requestId"],"operation":request["operation"],"ok":false,"phase":"failed","effect":effect,"error":error(code,message)});
    if let Some(target) = progress
        .and_then(|p| p.get("target"))
        .or_else(|| request.get("target"))
    {
        value["target"] = target.clone();
    }
    if let Some(phase) = progress.and_then(|p| p.get("phase")) {
        value["phase"] = phase.clone();
    }
    if let Some(data) = progress.and_then(|p| p.get("data")) {
        value["data"] = data.clone();
    }
    value
}
fn completed_input(request: &Value, progress: &Value) -> bool {
    let expected = match request["operation"].as_str() {
        Some("agent.prompt") => "adapter-applied",
        Some("terminal.send-text" | "terminal.send-keys") => "pty-written",
        _ => return false,
    };
    let receipt = &progress["data"]["receipt"];
    progress["phase"] == "input-submitted"
        && progress["effect"] == "completed"
        && receipt["kind"] == expected
        && codec::check_input_receipt(receipt).is_ok()
        && progress["target"].as_object().is_some_and(|target| {
            target.contains_key("sessionId") && target.contains_key("runtimeId")
        })
        && request["target"].as_object().is_none_or(|target| {
            target
                .iter()
                .all(|(k, v)| progress["target"].get(k) == Some(v))
        })
}
fn observation_effect(request: &Value, local: bool, progress: Option<&Value>) -> &'static str {
    if local || w::read_only(request["operation"].as_str().unwrap_or("")) {
        "none"
    } else if progress.is_some_and(|p| completed_input(request, p)) {
        "completed"
    } else {
        "unknown"
    }
}
fn response_bytes(value: &Value) -> Result<Vec<u8>, ()> {
    let size = codec::measure(value, w::RESPONSE_BYTES, false).map_err(|_| ())?;
    let mut body = Vec::with_capacity(size + 4);
    serde_json::to_writer(&mut body, value).map_err(|_| ())?;
    codec::parse_response(&body).map_err(|_| ())?;
    ipc::frame(body, w::RESPONSE_BYTES).map_err(|_| ())
}
fn send(
    out: &Outbox,
    class: BrokerClass,
    key: &str,
    value: Value,
    done: Option<Arc<AtomicBool>>,
) -> bool {
    let Some(permit) = out.reserve_broker(class) else {
        return false;
    };
    let Ok(body) = codec::encode_message(&value) else {
        return false;
    };
    permit.send(key, body, done).is_ok()
}
impl Broker {
    pub fn new(out: Outbox) -> Self {
        Self {
            core: Arc::new(Core {
                stats: Mutex::new(Stats::default()),
                runtime: Mutex::new(None),
                out,
            }),
        }
    }
    pub fn handle(&self, mut value: Value) {
        let kind = value["type"].as_str().unwrap_or("").to_owned();
        let id = value["controlId"].as_str().unwrap_or("").to_owned();
        if kind == "control-register" {
            let mut current = self.core.runtime.lock().unwrap();
            if current.is_some() {
                drop(current);
                send(
                    &self.core.out,
                    BrokerClass::Registration,
                    "registration",
                    json!({"type":"control-error","controlId":id,"error":error("BUSY","A control registration is active or closing")}),
                    None,
                );
                return;
            }
            let rt = Arc::new(Runtime {
                id,
                scope: value["scope"].take(),
                closing: AtomicBool::new(false),
                dead: AtomicBool::new(false),
                pending: Mutex::new(BTreeMap::new()),
                thread: Mutex::new(None),
            });
            *current = Some(rt.clone());
            drop(current);
            let weak = Arc::downgrade(&self.core);
            let run = rt.clone();
            let worker = thread::spawn(move || run_runtime(weak, run));
            *rt.thread.lock().unwrap() = Some(worker);
            return;
        }
        let current = self.core.runtime.lock().unwrap().clone();
        let Some(rt) = current.filter(|rt| rt.id == id) else {
            return;
        };
        if kind == "control-unregister" {
            rt.closing.store(true, Ordering::Release);
            return;
        }
        if !matches!(
            kind.as_str(),
            "control-admitted" | "control-progress" | "control-result"
        ) {
            return;
        }
        let bridge = value["bridgeId"].as_str().unwrap_or("").to_owned();
        let mut pending = rt.pending.lock().unwrap();
        let Some(call) = pending.get_mut(&bridge) else {
            return;
        };
        if call.settled.is_some() || call.result.is_some() {
            return;
        }
        if kind == "control-result" {
            let result = value["response"].take();
            if result["requestId"] != call.request["requestId"]
                || result["operation"] != call.request["operation"]
            {
                return;
            }
            if call.progress.as_ref().is_some_and(|old| {
                completed_input(&call.request, old)
                    && (result["effect"] != "completed"
                        || result["target"] != old["target"]
                        || result["data"]["receipt"] != old["data"]["receipt"])
            }) {
                return;
            }
            if call
                .progress
                .as_ref()
                .is_some_and(|p| p["effect"] != "none")
                && result["effect"] == "none"
            {
                return;
            }
            call.result = response_bytes(&result).ok();
        } else {
            if kind == "control-admitted" {
                if call.admitted {
                    return;
                }
                call.admitted = true;
            } else if !call.admitted {
                return;
            }
            let progress = value["progress"].take();
            if matches!(
                call.request["operation"].as_str(),
                Some("agent.prompt" | "terminal.send-text" | "terminal.send-keys")
            ) && progress.get("target").is_some()
                && call.request["target"].as_object().is_some_and(|target| {
                    target
                        .iter()
                        .any(|(k, v)| progress["target"].get(k) != Some(v))
                })
            {
                return;
            }
            // A later observation cannot erase or retarget an already-confirmed input receipt.
            if call.progress.as_ref().is_some_and(|old| {
                completed_input(&call.request, old)
                    && (!completed_input(&call.request, &progress)
                        || progress["target"] != old["target"]
                        || progress["data"]["receipt"] != old["data"]["receipt"])
            }) {
                return;
            }
            if call
                .progress
                .as_ref()
                .is_some_and(|p| p["effect"] != "none")
                && progress["effect"] == "none"
            {
                return;
            }
            call.progress = Some(progress);
        }
    }
    pub fn shutdown(&self) {
        let runtime = self.core.runtime.lock().unwrap().clone();
        if let Some(rt) = runtime {
            rt.dead.store(true, Ordering::Release);
            let handle = rt.thread.lock().unwrap().take();
            if let Some(handle) = handle {
                let _ = handle.join();
            }
        }
    }
    pub fn metrics(&self) -> Value {
        let s = self.core.stats.lock().unwrap();
        json!({"connectionsPeak":s.connections,"pendingPeak":s.pending,"ordinaryPendingPeak":s.ordinary_pending})
    }
    pub fn active(&self) -> bool {
        self.core.runtime.lock().unwrap().is_some()
    }
}
enum Phase {
    Auth(Reader, Instant),
    Hello(Vec<u8>, usize, Instant),
    Request(Reader, Instant),
    Waiting(String, Instant),
    Response(Option<String>, Vec<u8>, usize, Instant),
}
struct Connection {
    stream: Stream,
    phase: Phase,
    ordinary: bool,
    cancel_reader: Reader,
    cancel_seen: bool,
}
fn cancel_call(call: &mut Pending, reason: &'static str) {
    if call.result.is_some() || call.cancel.is_some() {
        return;
    }
    call.cancel = Some(reason);
    if call.forward.cancel_queued() {
        call.local = true;
        let value = failure(
            &call.request,
            if reason == "timeout" {
                "WAIT_TIMEOUT"
            } else {
                "WAIT_CANCELLED"
            },
            "Queued observation cancelled before delivery",
            "none",
            None,
        );
        call.result = response_bytes(&value).ok();
    }
}
fn lost(rt: &Runtime, id: &str, reason: &'static str) {
    if let Some(call) = rt.pending.lock().unwrap().get_mut(id) {
        call.observer_done = true;
        cancel_call(call, reason);
    }
}
fn poll_cancellation(
    stream: &mut impl Read,
    reader: &mut Reader,
    seen: &mut bool,
) -> io::Result<()> {
    if *seen {
        let mut byte = [0u8; 1];
        return match stream.read(&mut byte) {
            Ok(0) => Err(io::ErrorKind::UnexpectedEof.into()),
            Ok(_) => Err(io::ErrorKind::InvalidData.into()),
            Err(e)
                if matches!(
                    e.kind(),
                    io::ErrorKind::WouldBlock | io::ErrorKind::Interrupted
                ) =>
            {
                Ok(())
            }
            Err(e) => Err(e),
        };
    }
    if let Some(body) = reader.poll(stream)? {
        codec::parse_observation_cancel(&body)
            .map_err(|_| io::Error::from(io::ErrorKind::InvalidData))?;
        *seen = true;
    }
    Ok(())
}
fn poll_write(stream: &mut impl Write, bytes: &[u8], offset: &mut usize) -> io::Result<bool> {
    if *offset == bytes.len() {
        return Ok(true);
    }
    match stream.write(&bytes[*offset..]) {
        Ok(0) => Err(io::ErrorKind::WriteZero.into()),
        Ok(n) => {
            *offset += n;
            Ok(*offset == bytes.len())
        }
        Err(e)
            if matches!(
                e.kind(),
                io::ErrorKind::WouldBlock | io::ErrorKind::Interrupted
            ) =>
        {
            Ok(false)
        }
        Err(e) => Err(e),
    }
}
fn poll_response(
    stream: &mut (impl Read + Write),
    reader: &mut Reader,
    seen: &mut bool,
    bytes: &[u8],
    offset: &mut usize,
) -> io::Result<bool> {
    poll_cancellation(stream, reader, seen)?;
    poll_write(stream, bytes, offset)
}
fn step(
    conn: &mut Connection,
    rt: &Arc<Runtime>,
    core: &Core,
    token: &str,
    ordinary_connections: usize,
) -> bool {
    let out = &core.out;
    let now = Instant::now();
    match &mut conn.phase {
        Phase::Auth(reader, deadline) => {
            if now >= *deadline || rt.closing.load(Ordering::Acquire) {
                return false;
            }
            match reader.poll(&mut conn.stream) {
                Ok(Some(bytes)) => {
                    let Ok(auth) = codec::parse_auth(&bytes) else {
                        return false;
                    };
                    if auth["controlId"] != rt.id || auth["token"] != token {
                        return false;
                    }
                    let body = match codec::encode_message(
                        &json!({"type":"control-register","controlId":rt.id,"scope":rt.scope}),
                    ) {
                        Ok(v) => v,
                        Err(_) => return false,
                    };
                    let frame = match ipc::frame(body, w::SCOPE_BYTES + w::WRAPPER_BYTES) {
                        Ok(v) => v,
                        Err(_) => return false,
                    };
                    conn.phase = Phase::Hello(frame, 0, *deadline);
                }
                Ok(None) => (),
                Err(_) => return false,
            }
        }
        Phase::Hello(bytes, offset, deadline) => {
            if now >= *deadline || rt.closing.load(Ordering::Acquire) {
                return false;
            }
            match poll_write(&mut conn.stream, bytes, offset) {
                Ok(true) => {
                    conn.phase = Phase::Request(
                        Reader::new(w::REQUEST_BYTES),
                        now + Duration::from_millis(w::HANDSHAKE_MS as u64),
                    )
                }
                Ok(false) => (),
                Err(_) => return false,
            }
        }
        Phase::Request(reader, deadline) => {
            if now >= *deadline || rt.closing.load(Ordering::Acquire) {
                return false;
            }
            match reader.poll(&mut conn.stream) {
                Ok(Some(bytes)) => {
                    let Ok(request) = codec::parse_request(&bytes) else {
                        return false;
                    };
                    let ordinary = codec::descriptor()["operations"]
                        [request["operation"].as_str().unwrap()]["transport"]
                        == "ordinary";
                    let timeout = request["timeoutMs"]
                        .as_u64()
                        .unwrap_or(w::DEFAULT_TIMEOUT_MS as u64);
                    let mut pending = rt.pending.lock().unwrap();
                    if pending.len() >= w::PENDING
                        || ordinary
                            && (ordinary_connections >= w::ORDINARY_CONNECTIONS
                                || pending.values().filter(|p| p.ordinary).count()
                                    >= w::ORDINARY_PENDING)
                    {
                        drop(pending);
                        let result = failure(
                            &request,
                            "BUSY",
                            "Local control capacity is occupied",
                            "none",
                            None,
                        );
                        let Ok(bytes) = response_bytes(&result) else {
                            return false;
                        };
                        conn.phase = Phase::Response(
                            None,
                            bytes,
                            0,
                            now + Duration::from_millis(w::HANDSHAKE_MS as u64),
                        );
                        return true;
                    }
                    let Ok(id) = os::nonce() else {
                        return false;
                    };
                    let Some(permit) = out.reserve_broker(BrokerClass::Forward) else {
                        return false;
                    };
                    let body = match codec::encode_message(
                        &json!({"type":"control-request","controlId":rt.id,"bridgeId":id,"request":request}),
                    ) {
                        Ok(v) => v,
                        Err(_) => return false,
                    };
                    let forward = Arc::new(BrokerDelivery::default());
                    if permit
                        .send_cancellable(&id, body, None, Some(forward.clone()))
                        .is_err()
                    {
                        return false;
                    }
                    pending.insert(
                        id.clone(),
                        Pending {
                            forward,
                            local: false,
                            request,
                            ordinary,
                            admitted: false,
                            progress: None,
                            result: None,
                            observer_done: false,
                            cancel: None,
                            cancel_sent: false,
                            settled: None,
                        },
                    );
                    {
                        let mut stats = core.stats.lock().unwrap();
                        stats.pending = stats.pending.max(pending.len());
                        stats.ordinary_pending = stats
                            .ordinary_pending
                            .max(pending.values().filter(|p| p.ordinary).count());
                    }
                    conn.ordinary = ordinary;
                    conn.phase = Phase::Waiting(id, now + Duration::from_millis(timeout));
                }
                Ok(None) => (),
                Err(_) => return false,
            }
        }
        Phase::Waiting(id, deadline) => {
            if poll_cancellation(
                &mut conn.stream,
                &mut conn.cancel_reader,
                &mut conn.cancel_seen,
            )
            .is_err()
            {
                lost(rt, id, "disconnected");
                return false;
            }
            let mut pending = rt.pending.lock().unwrap();
            let Some(call) = pending.get_mut(id) else {
                return false;
            };
            if let Some(bytes) = call.result.take() {
                call.result = Some(Vec::new());
                conn.phase = Phase::Response(
                    Some(id.clone()),
                    bytes,
                    0,
                    now + Duration::from_millis(w::HANDSHAKE_MS as u64),
                );
            } else if conn.cancel_seen || now >= *deadline || rt.closing.load(Ordering::Acquire) {
                let closing = rt.closing.load(Ordering::Acquire);
                cancel_call(
                    call,
                    if conn.cancel_seen {
                        "cancelled"
                    } else if closing {
                        "closed"
                    } else {
                        "timeout"
                    },
                );
                let effect = observation_effect(&call.request, call.local, call.progress.as_ref());
                let known_effect = effect != "unknown";
                let result = failure(
                    &call.request,
                    if conn.cancel_seen {
                        "WAIT_CANCELLED"
                    } else if closing {
                        if known_effect {
                            "WAIT_CANCELLED"
                        } else {
                            "EFFECT_UNKNOWN"
                        }
                    } else {
                        "WAIT_TIMEOUT"
                    },
                    if conn.cancel_seen {
                        "Control observation cancelled"
                    } else if closing {
                        "Control observation closed"
                    } else {
                        "Control observation timed out"
                    },
                    effect,
                    call.progress.as_ref(),
                );
                let Ok(bytes) = response_bytes(&result) else {
                    return false;
                };
                conn.phase = Phase::Response(
                    Some(id.clone()),
                    bytes,
                    0,
                    now + Duration::from_millis(w::HANDSHAKE_MS as u64),
                );
            }
        }
        Phase::Response(id, bytes, offset, deadline) => {
            if now >= *deadline {
                if let Some(id) = id {
                    lost(rt, id, "disconnected");
                }
                return false;
            }
            match poll_response(
                &mut conn.stream,
                &mut conn.cancel_reader,
                &mut conn.cancel_seen,
                bytes,
                offset,
            ) {
                Ok(_) => (),
                Err(_) => {
                    if let Some(id) = id {
                        lost(rt, id, "disconnected");
                    }
                    return false;
                }
            }
        }
    }
    true
}
fn run_runtime(core: Weak<Core>, rt: Arc<Runtime>) {
    let Some(core) = core.upgrade() else {
        return;
    };
    let root = match os::runtime_root() {
        Ok(v) => v,
        Err(_) => {
            register_failed(
                &core,
                &rt,
                "SOURCE_UNAVAILABLE",
                "Private endpoint root unavailable",
            );
            return;
        }
    };
    let token = match os::nonce() {
        Ok(v) => v,
        Err(_) => {
            register_failed(
                &core,
                &rt,
                "SOURCE_UNAVAILABLE",
                "Authentication nonce unavailable",
            );
            return;
        }
    };
    let endpoint = os::endpoint(&root, &token);
    let listener = match os::listen(&endpoint) {
        Ok(v) => v,
        Err(_) => {
            register_failed(
                &core,
                &rt,
                "CONNECTION_UNAVAILABLE",
                "Private endpoint unavailable",
            );
            return;
        }
    };
    let locator_value = json!({"protocolVersion":1,"controlId":rt.id,"endpoint":endpoint,"token":token,"scope":rt.scope});
    let published = match locator::publish(&locator_value) {
        Ok(v) => v,
        Err(e) => {
            drop(listener);
            register_failed(&core, &rt, e.code, e.message);
            return;
        }
    };
    let mut listener = Some(listener);
    let mut published = Some(published);
    let mut ready = false;
    let mut connections: Vec<Connection> = Vec::new();

    loop {
        if rt.dead.load(Ordering::Acquire) || core.out.is_closed() {
            break;
        }
        if !ready && !rt.closing.load(Ordering::Acquire) {
            ready = send(
                &core.out,
                BrokerClass::Registration,
                "registration",
                json!({"type":"control-registered","controlId":rt.id,"endpoint":endpoint,"locator":published.as_ref().unwrap().path.to_string_lossy()}),
                None,
            );
        }
        if rt.closing.load(Ordering::Acquire) {
            listener.take();
            if let Some(file) = &published {
                if file.withdraw().is_ok() {
                    published.take();
                }
            }
        }
        if ready && !rt.closing.load(Ordering::Acquire) && connections.len() < w::CONNECTIONS {
            if let Some(listener) = &listener {
                match listener.accept() {
                    Ok(stream) => connections.push(Connection {
                        stream,
                        phase: Phase::Auth(
                            Reader::new(w::AUTH_BYTES),
                            Instant::now() + Duration::from_millis(w::HANDSHAKE_MS as u64),
                        ),
                        ordinary: false,
                        cancel_reader: Reader::new(w::OBSERVATION_CANCEL_BYTES),
                        cancel_seen: false,
                    }),
                    Err(e) if e.kind() == io::ErrorKind::WouldBlock => (),
                    Err(_) => {
                        rt.closing.store(true, Ordering::Release);
                    }
                }
            }
        }
        {
            let mut stats = core.stats.lock().unwrap();
            stats.connections = stats.connections.max(connections.len());
        }
        let mut i = 0;
        while i < connections.len() {
            let ordinary = connections.iter().filter(|c| c.ordinary).count();
            if step(&mut connections[i], &rt, &core, &token, ordinary) {
                i += 1;
            } else {
                connections.swap_remove(i);
            }
        }
        {
            let mut pending = rt.pending.lock().unwrap();
            let mut retired = Vec::new();
            for (id, call) in pending.iter_mut() {
                if rt.closing.load(Ordering::Acquire)
                    && call.cancel.is_none()
                    && call.result.is_none()
                {
                    cancel_call(call, "closed");
                }
                if let Some(reason) = call.cancel {
                    if !call.local && !call.cancel_sent {
                        call.cancel_sent = send(
                            &core.out,
                            BrokerClass::Small,
                            id,
                            json!({"type":"control-cancel","controlId":rt.id,"bridgeId":id,"reason":reason}),
                            None,
                        );
                    }
                }
                if call.observer_done && call.result.is_some() {
                    if call.local {
                        if call.forward.complete() {
                            retired.push(id.clone());
                        }
                        continue;
                    }
                    if let Some(done) = &call.settled {
                        if done.load(Ordering::Acquire) {
                            retired.push(id.clone());
                        }
                    } else {
                        let done = Arc::new(AtomicBool::new(false));
                        if send(
                            &core.out,
                            BrokerClass::Small,
                            id,
                            json!({"type":"control-settled","controlId":rt.id,"bridgeId":id}),
                            Some(done.clone()),
                        ) {
                            call.settled = Some(done);
                        }
                    }
                }
            }
            for id in retired {
                pending.remove(&id);
            }
        }
        if rt.closing.load(Ordering::Acquire)
            && published.is_none()
            && connections.is_empty()
            && rt.pending.lock().unwrap().is_empty()
        {
            if let Some(permit) = core.out.reserve_broker(BrokerClass::Registration) {
                if let Ok(body) =
                    codec::encode_message(&json!({"type":"control-unregistered","controlId":rt.id}))
                {
                    if permit
                        .send_committed("registration", body, || {
                            // No Core -> Outbox lock is held elsewhere. Commit is bounded and performs no IO.
                            let mut current = core.runtime.lock().unwrap();
                            if current.as_ref().is_some_and(|p| Arc::ptr_eq(p, &rt)) {
                                current.take();
                            }
                        })
                        .is_ok()
                    {
                        break;
                    }
                }
            }
        }
        thread::sleep(Duration::from_millis(2));
    }
    drop(connections);
    drop(listener);
    drop(published);
    let mut current = core.runtime.lock().unwrap();
    if current.as_ref().is_some_and(|p| Arc::ptr_eq(p, &rt)) {
        current.take();
    }
}
fn register_failed(core: &Core, rt: &Arc<Runtime>, code: &str, message: &str) {
    let _ = send(
        &core.out,
        BrokerClass::Registration,
        "registration",
        json!({"type":"control-error","controlId":rt.id,"error":error(code,message)}),
        None,
    );
    let mut current = core.runtime.lock().unwrap();
    if current.as_ref().is_some_and(|p| Arc::ptr_eq(p, rt)) {
        current.take();
    }
}

#[cfg(test)]
mod observation_tests {
    use super::*;
    use std::collections::VecDeque;
    struct Socket {
        incoming: VecDeque<u8>,
        written: Vec<u8>,
    }
    impl Read for Socket {
        fn read(&mut self, bytes: &mut [u8]) -> io::Result<usize> {
            if self.incoming.is_empty() {
                return Err(io::ErrorKind::WouldBlock.into());
            }
            let n = bytes.len().min(self.incoming.len());
            for byte in &mut bytes[..n] {
                *byte = self.incoming.pop_front().unwrap();
            }
            Ok(n)
        }
    }
    impl Write for Socket {
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
    fn observation_cancel_during_partial_final_preserves_every_final_byte() {
        let marker = ipc::frame(
            codec::encode_observation_cancel().unwrap(),
            w::OBSERVATION_CANCEL_BYTES,
        )
        .unwrap();
        let mut stream = Socket {
            incoming: VecDeque::new(),
            written: Vec::new(),
        };
        let mut reader = Reader::new(w::OBSERVATION_CANCEL_BYTES);
        let mut seen = false;
        let final_bytes = b"a complete final with an already-confirmed receipt";
        let mut offset = 0;
        assert!(!poll_response(
            &mut stream,
            &mut reader,
            &mut seen,
            final_bytes,
            &mut offset
        )
        .unwrap());
        assert_eq!(offset, 3);
        stream.incoming.extend(marker);
        for _ in 0..final_bytes.len() {
            if poll_response(
                &mut stream,
                &mut reader,
                &mut seen,
                final_bytes,
                &mut offset,
            )
            .unwrap()
            {
                break;
            }
        }
        assert!(seen);
        assert_eq!(stream.written, final_bytes);
        assert_eq!(offset, final_bytes.len());
    }
    #[test]
    fn observation_marker_is_bounded_and_consumed_at_most_once() {
        let marker = ipc::frame(
            codec::encode_observation_cancel().unwrap(),
            w::OBSERVATION_CANCEL_BYTES,
        )
        .unwrap();
        let mut stream = Socket {
            incoming: marker.clone().into(),
            written: Vec::new(),
        };
        let mut reader = Reader::new(w::OBSERVATION_CANCEL_BYTES);
        let mut seen = false;
        poll_cancellation(&mut stream, &mut reader, &mut seen).unwrap();
        assert!(seen);
        stream.incoming.extend(marker);
        assert_eq!(
            poll_cancellation(&mut stream, &mut reader, &mut seen)
                .unwrap_err()
                .kind(),
            io::ErrorKind::InvalidData
        );
        let mut stream = Socket {
            incoming: ((w::OBSERVATION_CANCEL_BYTES + 1) as u32)
                .to_be_bytes()
                .into(),
            written: Vec::new(),
        };
        assert_eq!(
            poll_cancellation(
                &mut stream,
                &mut Reader::new(w::OBSERVATION_CANCEL_BYTES),
                &mut false
            )
            .unwrap_err()
            .kind(),
            io::ErrorKind::InvalidData
        );
    }
}
