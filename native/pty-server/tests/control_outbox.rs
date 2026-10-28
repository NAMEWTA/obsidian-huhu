use huhu_pty::{
    control::codec,
    outbox::{encode_json, BrokerClass, BrokerDelivery, Outbox},
};
use serde_json::{json, Value};
use std::{
    io::{self, Write},
    sync::{mpsc, Arc},
    thread,
    time::Duration,
};
struct Sink {
    frames: mpsc::Sender<Value>,
    entered: mpsc::SyncSender<()>,
    resume: mpsc::Receiver<()>,
    first: bool,
}
impl Write for Sink {
    fn write(&mut self, b: &[u8]) -> io::Result<usize> {
        if self.first {
            self.first = false;
            self.entered.send(()).unwrap();
            self.resume.recv_timeout(Duration::from_secs(3)).unwrap();
        }
        self.frames
            .send(serde_json::from_slice(&b[5..]).unwrap())
            .unwrap();
        Ok(b.len())
    }
    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}
#[test]
fn cancelled_unhanded_request_cannot_execute_after_stdout_capacity_returns() {
    let out = Outbox::new();
    out.send(encode_json(&json!({"type":"fixture-barrier"}), 256).unwrap())
        .unwrap();
    let (tx, rx) = mpsc::channel();
    let (entered, waiting) = mpsc::sync_channel(0);
    let (resume, gate) = mpsc::channel();
    let run = out.clone();
    let writer = thread::spawn(move || {
        run.run(Sink {
            frames: tx,
            entered,
            resume: gate,
            first: true,
        })
    });
    waiting.recv_timeout(Duration::from_secs(3)).unwrap();
    let delivery = Arc::new(BrokerDelivery::default());
    let permit = out.reserve_broker(BrokerClass::Forward).unwrap();
    let body=codec::encode_message(&json!({"type":"control-request","controlId":"c","bridgeId":"b","request":{"protocolVersion":1,"requestId":"r","operation":"terminal.start","target":{"spaceId":"s"}}})).unwrap();
    permit
        .send_cancellable("b", body, None, Some(delivery.clone()))
        .unwrap();
    let cancelled = delivery.cancel_queued();
    out.finish();
    resume.send(()).unwrap();
    writer.join().unwrap();
    let frames = rx.try_iter().collect::<Vec<_>>();
    assert!(
        cancelled,
        "the original request is still wholly local while the stdout writer is held"
    );
    assert_eq!(frames.len(), 1);
    assert_eq!(frames[0]["type"], "fixture-barrier");
    assert!(delivery.complete());
    assert_eq!(out.metrics().unwrap()["brokerSlots"][0], 0);
}

#[test]
fn the_broker_has_distinct_reserves_and_holds_taken_frames_until_physical_completion() {
    let out = Outbox::new();
    let mut permits = Vec::new();
    for _ in 0..16 {
        permits.push(out.reserve_broker(BrokerClass::Forward).unwrap());
    }
    assert!(out.reserve_broker(BrokerClass::Forward).is_none());
    let small = (0..16)
        .map(|_| out.reserve_broker(BrokerClass::Small).unwrap())
        .collect::<Vec<_>>();
    assert!(out.reserve_broker(BrokerClass::Small).is_none());
    let registration = (0..2)
        .map(|_| out.reserve_broker(BrokerClass::Registration).unwrap())
        .collect::<Vec<_>>();
    assert!(out.reserve_broker(BrokerClass::Registration).is_none());
    out.send(encode_json(&json!({"type":"legacy-control"}), 256).unwrap())
        .unwrap();
    drop(small);
    drop(registration);
    for (i, permit) in permits.into_iter().enumerate() {
        let text = "\u{0001}".repeat(5300);
        let body=codec::encode_message(&json!({"type":"control-request","controlId":"c","bridgeId":format!("b{i}"),"request":{"protocolVersion":1,"requestId":format!("r{i}"),"operation":"terminal.send-text","params":{"text":text}}})).unwrap();
        assert!(body.len() > 31000);
        permit.send(&format!("b{i}"), body, None).unwrap();
    }
    let peak = out.metrics().unwrap();
    assert_eq!(peak["brokerSlotsPeak"], json!([16, 16, 2]));
    assert_eq!(peak["brokerReservedBytesPeak"][0], 540752);
    assert_eq!(peak["brokerReservedBytesPeak"][1], 16464);
    out.finish();
    let mut bytes = Vec::new();
    out.run(&mut bytes);
    let mut input = std::io::Cursor::new(bytes);
    let mut count = 0;
    while let Some(f) = huhu_pty::frame::read_client_frame(&mut input).unwrap() {
        assert_eq!(f.kind, 1);
        count += 1;
    }
    assert_eq!(count, 17);
    assert_eq!(out.metrics().unwrap()["brokerSlots"], json!([0, 0, 0]));
    println!("broker-reserve-peak {}", peak);
}
#[test]
fn claimed_request_is_not_cancelled_or_replayed_during_a_blocked_write() {
    let out = Outbox::new();
    let delivery = Arc::new(BrokerDelivery::default());
    let body=codec::encode_message(&json!({"type":"control-request","controlId":"c","bridgeId":"b","request":{"protocolVersion":1,"requestId":"r","operation":"capabilities"}})).unwrap();
    out.reserve_broker(BrokerClass::Forward)
        .unwrap()
        .send_cancellable("b", body, None, Some(delivery.clone()))
        .unwrap();
    let (tx, rx) = mpsc::channel();
    let (entered, waiting) = mpsc::sync_channel(0);
    let (resume, gate) = mpsc::channel();
    let run = out.clone();
    let writer = thread::spawn(move || {
        run.run(Sink {
            frames: tx,
            entered,
            resume: gate,
            first: true,
        })
    });
    waiting.recv_timeout(Duration::from_secs(3)).unwrap();
    let cancelled = delivery.cancel_queued();
    let held = out.metrics().unwrap()["brokerSlots"][0].clone();
    let incomplete = !delivery.complete();
    out.finish();
    resume.send(()).unwrap();
    writer.join().unwrap();
    assert!(!cancelled);
    assert!(incomplete);
    assert_eq!(held, 1);
    assert_eq!(rx.try_iter().count(), 1);
    assert!(delivery.complete());
    assert_eq!(out.metrics().unwrap()["brokerSlots"][0], 0);
}
#[test]
fn broker_rr_preserves_its_fifo_without_starving_existing_control_stream_and_history_wheel() {
    let out = Outbox::new();
    for i in 0..24 {
        out.send(encode_json(&json!({"type":"legacy-high","n":i}), 256).unwrap())
            .unwrap();
    }
    for sid in [1, 2, 3, u32::MAX] {
        out.output(sid, b"output", || false, &std::sync::Mutex::new(()))
            .unwrap();
        out.send(encode_json(&json!({"type":"exit","sid":sid,"code":0}), 256).unwrap())
            .unwrap();
    }
    for i in 0..2 {
        out.reserve_result()
            .unwrap()
            .send(&json!({"type":"history-result","rid":i,"data":"history"}))
            .unwrap();
    }
    for id in ["a", "b", "c", "d"] {
        let messages = [
            (
                BrokerClass::Forward,
                json!({"type":"control-request","controlId":"c","bridgeId":id,"request":{"protocolVersion":1,"requestId":id,"operation":"capabilities"}}),
            ),
            (
                BrokerClass::Small,
                json!({"type":"control-cancel","controlId":"c","bridgeId":id,"reason":"disconnected"}),
            ),
            (
                BrokerClass::Small,
                json!({"type":"control-settled","controlId":"c","bridgeId":id}),
            ),
        ];
        for (class, value) in messages {
            out.reserve_broker(class)
                .unwrap()
                .send(id, codec::encode_message(&value).unwrap(), None)
                .unwrap();
        }
    }
    struct Capture(Vec<Value>);
    impl Write for Capture {
        fn write(&mut self, b: &[u8]) -> io::Result<usize> {
            self.0.push(if b[4] == 3 {
                json!({"type":"output","sid":u32::from_be_bytes(b[5..9].try_into().unwrap())})
            } else {
                serde_json::from_slice(&b[5..]).unwrap()
            });
            Ok(b.len())
        }
        fn flush(&mut self) -> io::Result<()> {
            Ok(())
        }
    }
    out.finish();
    let mut capture = Capture(Vec::new());
    out.run(&mut capture);
    let first = &capture.0[..11];
    for kind in ["legacy-high", "output", "history-result", "control-request"] {
        assert!(
            first.iter().any(|v| v["type"] == kind),
            "missing {kind} in {first:?}"
        );
    }
    let broker = capture
        .0
        .iter()
        .filter(|v| v.get("bridgeId").is_some())
        .collect::<Vec<_>>();
    assert_eq!(
        broker[..4]
            .iter()
            .map(|v| v["bridgeId"].as_str().unwrap())
            .collect::<std::collections::BTreeSet<_>>()
            .len(),
        4
    );
    for id in ["a", "b", "c", "d"] {
        assert_eq!(
            broker
                .iter()
                .filter(|v| v["bridgeId"] == id)
                .map(|v| v["type"].as_str().unwrap())
                .collect::<Vec<_>>(),
            vec!["control-request", "control-cancel", "control-settled"]
        );
    }
    for sid in [1, 2, 3, u32::MAX] {
        assert_eq!(
            capture
                .0
                .iter()
                .filter(|v| v["sid"] == sid)
                .map(|v| v["type"].as_str().unwrap())
                .collect::<Vec<_>>(),
            vec!["output", "exit"]
        );
    }
}

#[test]
fn terminal_registration_commit_precedes_visible_ack_and_ack_charge_survives_slow_writer() {
    use std::sync::atomic::{AtomicBool, Ordering};
    let out = Outbox::new();
    let committed = Arc::new(AtomicBool::new(false));
    let done = committed.clone();
    let body =
        codec::encode_message(&json!({"type":"control-unregistered","controlId":"old"})).unwrap();
    struct Witness {
        committed: Arc<AtomicBool>,
        entered: mpsc::SyncSender<()>,
        resume: mpsc::Receiver<()>,
        first: bool,
        count: usize,
    }
    impl Write for Witness {
        fn write(&mut self, b: &[u8]) -> io::Result<usize> {
            assert!(self.committed.load(Ordering::Acquire));
            if self.first {
                self.first = false;
                self.entered.send(()).unwrap();
                self.resume.recv_timeout(Duration::from_secs(3)).unwrap();
            }
            self.count += 1;
            Ok(b.len())
        }
        fn flush(&mut self) -> io::Result<()> {
            Ok(())
        }
    }
    let (entered, waiting) = mpsc::sync_channel(0);
    let (resume, gate) = mpsc::channel();
    let run = out.clone();
    let seen = committed.clone();
    let writer = thread::spawn(move || {
        let mut witness = Witness {
            committed: seen,
            entered,
            resume: gate,
            first: true,
            count: 0,
        };
        run.run(&mut witness);
        witness.count
    });
    out.reserve_broker(BrokerClass::Registration)
        .unwrap()
        .send_committed("registration", body, move || {
            done.store(true, Ordering::Release)
        })
        .unwrap();
    waiting.recv_timeout(Duration::from_secs(3)).unwrap();
    assert_eq!(out.metrics().unwrap()["brokerSlots"][2], 1);
    let second = out.reserve_broker(BrokerClass::Registration).unwrap();
    assert!(out.reserve_broker(BrokerClass::Registration).is_none());
    assert_eq!(out.metrics().unwrap()["brokerSlots"][2], 2);
    let next=codec::encode_message(&json!({"type":"control-registered","controlId":"new","endpoint":"fixture","locator":"fixture"})).unwrap();
    second.send("registration", next, None).unwrap();
    out.finish();
    resume.send(()).unwrap();
    assert_eq!(writer.join().unwrap(), 2);
    assert_eq!(out.metrics().unwrap()["brokerSlots"][2], 0);
}
#[test]
fn ack_write_failure_ends_transport_without_claiming_the_receiver_observed_it() {
    use std::sync::atomic::{AtomicBool, Ordering};
    struct Broken;
    impl Write for Broken {
        fn write(&mut self, _: &[u8]) -> io::Result<usize> {
            Err(io::ErrorKind::BrokenPipe.into())
        }
        fn flush(&mut self) -> io::Result<()> {
            Ok(())
        }
    }
    let out = Outbox::new();
    let terminal = Arc::new(AtomicBool::new(false));
    let record = terminal.clone();
    out.reserve_broker(BrokerClass::Registration)
        .unwrap()
        .send_committed(
            "registration",
            codec::encode_message(&json!({"type":"control-unregistered","controlId":"c"})).unwrap(),
            move || record.store(true, Ordering::Release),
        )
        .unwrap();
    out.run(Broken);
    assert!(terminal.load(Ordering::Acquire));
    assert!(out.is_closed());
    assert_eq!(out.metrics().unwrap()["brokerSlots"][2], 0);
    assert!(out.reserve_broker(BrokerClass::Registration).is_none());
}

#[test]
fn editor_pools_are_independent_and_return_only_after_the_real_stdout_writer() {
    use std::sync::atomic::{AtomicBool, Ordering};
    let out = Outbox::new();
    let mut life: Vec<_> = (0..64)
        .map(|_| out.reserve_broker(BrokerClass::EditorLife).unwrap())
        .collect();
    let receipts: Vec<_> = (0..768)
        .map(|_| out.reserve_broker(BrokerClass::EditorReceipt).unwrap())
        .collect();
    assert!(out.reserve_broker(BrokerClass::EditorLife).is_none());
    assert!(out.reserve_broker(BrokerClass::EditorReceipt).is_none());
    assert!(out.reserve_broker(BrokerClass::Forward).is_some());
    let done = Arc::new(AtomicBool::new(false));
    let body=codec::encode_editor(&json!({"type":"editor-closed","version":1,"sid":1,"editorId":"captured","reason":"closed"}),"native-to-node",None).unwrap();
    life.pop()
        .unwrap()
        .send_editor(1, body, done.clone())
        .unwrap();
    out.send(
        encode_json(
            &json!({"type":"cookies-result","rid":"sibling","data":{}}),
            8192,
        )
        .unwrap(),
    )
    .unwrap();
    let (entered, wait) = mpsc::sync_channel(0);
    let (resume, go) = mpsc::channel();
    let (frames, seen) = mpsc::channel();
    let writer = out.clone();
    let worker = thread::spawn(move || {
        writer.run(&mut Sink {
            frames,
            entered,
            resume: go,
            first: true,
        })
    });
    wait.recv_timeout(Duration::from_secs(2)).unwrap();
    assert!(!done.load(Ordering::Acquire));
    assert!(out.reserve_broker(BrokerClass::EditorLife).is_none());
    resume.send(()).unwrap();
    let until = std::time::Instant::now() + Duration::from_secs(2);
    while !done.load(Ordering::Acquire) && std::time::Instant::now() < until {
        thread::yield_now();
    }
    assert!(done.load(Ordering::Acquire));
    assert!(out.reserve_broker(BrokerClass::EditorLife).is_some());
    let mut values = vec![];
    for _ in 0..2 {
        values.push(seen.recv_timeout(Duration::from_secs(2)).unwrap());
    }
    assert!(values.iter().any(|v| v["rid"] == "sibling"));
    assert!(values.iter().any(|v| v["type"] == "editor-closed"));
    drop(life);
    drop(receipts);
    out.finish();
    worker.join().unwrap();
    let metrics = out.metrics().unwrap();
    assert_eq!(metrics["editorSlots"], json!([0, 0]));
    assert_eq!(metrics["editorSlotsPeak"], json!([64, 768]));
}
