//! Length-prefixed frames on the helper's standard streams.
//!
//! A frame is a 4-byte big-endian length of the rest, a 1-byte kind, then the body. Control bodies are
//! UTF-8 JSON objects; session input and output bodies start with a 4-byte big-endian session number.

use std::io::{self, Read};

pub const CONTROL: u8 = 1;
pub const INPUT: u8 = 2;
pub const OUTPUT: u8 = 3;
pub const INPUT_PART: u8 = 4;
pub const REPLY: u8 = 5;
pub const OPERATION_BYTES: usize = 256 * 1024;
pub const FRAGMENT_BYTES: usize = 16 * 1024;
pub const SESSION_QUEUED_BYTES: usize = 512 * 1024;
pub const SESSION_QUEUED_OPERATIONS: usize = 32;
pub const HELPER_QUEUED_BYTES: usize = 2 * 1024 * 1024;
pub const HELPER_QUEUED_OPERATIONS: usize = 128;
pub const REPLY_FRAME_BYTES: usize = 4 * 1024;
pub const SESSION_REPLY_BYTES: usize = 16 * 1024;
pub const HELPER_REPLY_BYTES: usize = 128 * 1024;

pub fn input_limits() -> serde_json::Value {
    serde_json::json!({"operationBytes":OPERATION_BYTES,"fragmentBytes":FRAGMENT_BYTES,
        "sessionQueuedBytes":SESSION_QUEUED_BYTES,"sessionQueuedOperations":SESSION_QUEUED_OPERATIONS,
        "helperQueuedBytes":HELPER_QUEUED_BYTES,"helperQueuedOperations":HELPER_QUEUED_OPERATIONS,
        "replyFrameBytes":REPLY_FRAME_BYTES,"sessionReplyBytes":SESSION_REPLY_BYTES,"helperReplyBytes":HELPER_REPLY_BYTES})
}
pub fn u32_value(value: &serde_json::Value) -> Option<u64> {
    // JSON 1, 1.0 and 1e0 are the same number in JS. Normalize before serde dispatch too.
    value
        .as_f64()
        .filter(|n| n.is_finite() && *n > 0.0 && *n <= u32::MAX as f64 && n.fract() == 0.0)
        .map(|n| n as u64)
}
pub fn normalize_input_control(value: &mut serde_json::Value) {
    if let Some(obj) = value.as_object_mut() {
        for key in ["sid", "op", "totalBytes", "cols", "rows"] {
            if let Some(n) = obj.get(key).and_then(u32_value) {
                obj.insert(key.into(), serde_json::Value::from(n));
            }
        }
    }
}
fn exact(value: &serde_json::Map<String, serde_json::Value>, keys: &[&str]) -> bool {
    value.len() == keys.len() && keys.iter().all(|key| value.contains_key(*key))
}
#[cfg(test)]
pub fn valid_input_limits(value: &serde_json::Value) -> bool {
    let Some(obj) = value.as_object() else {
        return false;
    };
    let profile = input_limits();
    if obj.len() != profile.as_object().unwrap().len()
        || !profile
            .as_object()
            .unwrap()
            .keys()
            .all(|key| obj.get(key).and_then(u32_value).is_some())
    {
        return false;
    }
    let n = |key: &str| u32_value(&obj[key]).unwrap();
    n("fragmentBytes") <= n("operationBytes")
        && n("operationBytes") <= n("sessionQueuedBytes")
        && n("sessionQueuedBytes") <= n("helperQueuedBytes")
        && n("sessionQueuedOperations") <= n("helperQueuedOperations")
        && n("replyFrameBytes") <= n("sessionReplyBytes")
        && n("sessionReplyBytes") <= n("helperReplyBytes")
        && n("fragmentBytes") <= (MAX_FRAME - 13) as u64
        && n("replyFrameBytes") <= (MAX_FRAME - 5) as u64
}
/// Strict JSON shapes, also exercised by the exact same fixture as TypeScript.
pub fn valid_input_control(value: &serde_json::Value) -> bool {
    let Some(obj) = value.as_object() else {
        return false;
    };
    if obj.get("sid").and_then(u32_value).is_none() {
        return false;
    }
    if obj
        .get("type")
        .and_then(|v| v.as_str())
        .is_some_and(|kind| matches!(kind, "output-abandon" | "reply-close" | "reply-settled"))
    {
        return exact(obj, &["type", "sid"]);
    }
    if obj.get("type").and_then(|v| v.as_str()) == Some("reply-failure") {
        return exact(obj, &["type", "sid", "state", "reason"])
            && match obj.get("state").and_then(|v| v.as_str()) {
                Some("none") => matches!(
                    obj.get("reason").and_then(|v| v.as_str()),
                    Some("capacity" | "closed" | "invalid")
                ),
                Some("unknown") => matches!(
                    obj.get("reason").and_then(|v| v.as_str()),
                    Some("transport-lost" | "write-failed")
                ),
                _ => false,
            };
    }
    if obj.get("op").and_then(u32_value).is_none() {
        return false;
    }
    match obj.get("type").and_then(|v| v.as_str()) {
        Some("input-begin") => {
            exact(obj, &["type", "sid", "op", "totalBytes"])
                && obj
                    .get("totalBytes")
                    .and_then(u32_value)
                    .is_some_and(|n| n <= OPERATION_BYTES as u64)
        }
        Some("input-commit" | "input-cancel") => exact(obj, &["type", "sid", "op"]),
        Some("resize") => {
            exact(obj, &["type", "sid", "op", "cols", "rows"])
                && ["cols", "rows"].iter().all(|key| {
                    obj.get(*key)
                        .and_then(u32_value)
                        .is_some_and(|n| n <= u16::MAX as u64)
                })
        }
        Some(kind @ ("input-state" | "resize-state")) => {
            let state = obj.get("state").and_then(|v| v.as_str());
            let success = if kind == "input-state" {
                matches!(state, Some("reserved" | "queued" | "started" | "written"))
            } else {
                matches!(state, Some("queued" | "applied" | "superseded"))
            };
            if success {
                return exact(obj, &["type", "sid", "op", "state"]);
            }
            if !exact(obj, &["type", "sid", "op", "state", "reason"]) {
                return false;
            }
            let reason = obj.get("reason").and_then(|v| v.as_str());
            match state {
                Some("none") => matches!(
                    reason,
                    Some("capacity" | "closed" | "unsupported" | "cancelled" | "invalid")
                ),
                Some("unknown") => matches!(
                    reason,
                    Some("transport-lost" | "timeout" | "write-failed" | "expired")
                ),
                _ => false,
            }
        }
        _ => false,
    }
}
pub fn input_part_body(body: &[u8]) -> Option<(u32, u32, u32, &[u8])> {
    if body.len() <= 12 || body.len() - 12 > FRAGMENT_BYTES {
        return None;
    }
    let sid = u32::from_be_bytes(body[0..4].try_into().ok()?);
    let op = u32::from_be_bytes(body[4..8].try_into().ok()?);
    let offset = u32::from_be_bytes(body[8..12].try_into().ok()?);
    if sid == 0 || op == 0 {
        return None;
    }
    Some((sid, op, offset, &body[12..]))
}
/// Largest accepted body (kind byte included).
pub const MAX_FRAME: usize = 16 * 1024 * 1024;

#[derive(Debug, PartialEq, Eq)]
pub struct Frame {
    pub kind: u8,
    pub body: Vec<u8>,
}

/// Read one frame. `Ok(None)` is a clean end of stream between frames.
#[cfg(test)]
pub fn read_frame<R: Read>(input: &mut R) -> io::Result<Option<Frame>> {
    read_limited(input, false)
}
pub fn read_client_frame<R: Read>(input: &mut R) -> io::Result<Option<Frame>> {
    read_limited(input, true)
}
fn read_limited<R: Read>(input: &mut R, client: bool) -> io::Result<Option<Frame>> {
    let mut header = [0u8; 4];
    let mut filled = 0;
    while filled < header.len() {
        let n = input.read(&mut header[filled..])?;
        if n == 0 {
            return if filled == 0 {
                Ok(None)
            } else {
                Err(io::Error::new(
                    io::ErrorKind::UnexpectedEof,
                    "truncated frame header",
                ))
            };
        }
        filled += n;
    }
    let length = u32::from_be_bytes(header) as usize;
    if length == 0 || length > MAX_FRAME {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "frame length out of range",
        ));
    }
    let mut kind = [0u8; 1];
    input.read_exact(&mut kind)?;
    if client {
        let limit = match kind[0] {
            CONTROL => 64 * 1024,
            INPUT => OPERATION_BYTES + 4,
            INPUT_PART => FRAGMENT_BYTES + 12,
            REPLY => REPLY_FRAME_BYTES + 4,
            _ => {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    "unknown frame kind",
                ))
            }
        };
        if length - 1 > limit {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "client frame capacity exceeded",
            ));
        }
    }
    let mut body = vec![0u8; length - 1];
    input.read_exact(&mut body)?;
    Ok(Some(Frame {
        kind: kind[0],
        body,
    }))
}

#[cfg(test)]
pub fn encode(kind: u8, body: &[u8]) -> Vec<u8> {
    let mut out = Vec::with_capacity(body.len() + 5);
    out.extend_from_slice(&((body.len() + 1) as u32).to_be_bytes());
    out.push(kind);
    out.extend_from_slice(body);
    out
}

pub fn encode_session(kind: u8, session: u32, bytes: &[u8]) -> Vec<u8> {
    let mut out = Vec::with_capacity(bytes.len() + 9);
    out.extend_from_slice(&((bytes.len() + 5) as u32).to_be_bytes());
    out.push(kind);
    out.extend_from_slice(&session.to_be_bytes());
    out.extend_from_slice(bytes);
    out
}

/// Split a session body into its session number and bytes.
pub fn session_body(body: &[u8]) -> Option<(u32, &[u8])> {
    if body.len() < 4 {
        return None;
    }
    let session = u32::from_be_bytes([body[0], body[1], body[2], body[3]]);
    Some((session, &body[4..]))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shared_input_admission_fixture() {
        let fixture: serde_json::Value = serde_json::from_str(include_str!(
            "../../../test/fixtures/native/terminal-input-admission-v1.json"
        ))
        .unwrap();
        assert_eq!(fixture["limits"], input_limits());
        for row in fixture["cases"].as_array().unwrap() {
            let valid = if row["codec"] == "limits" {
                valid_input_limits(&row["wire"])
            } else {
                valid_input_control(&row["wire"])
            };
            assert_eq!(valid, row["valid"].as_bool().unwrap(), "{}", row["name"]);
        }
        for row in fixture["rawCases"].as_array().unwrap() {
            let mut wire: serde_json::Value =
                serde_json::from_str(row["json"].as_str().unwrap()).unwrap();
            assert_eq!(
                valid_input_control(&wire),
                row["valid"].as_bool().unwrap(),
                "{}",
                row["name"]
            );
            if row["valid"] == true {
                normalize_input_control(&mut wire);
                for key in ["sid", "op", "totalBytes"] {
                    if let Some(value) = wire.get(key) {
                        assert!(value.as_u64().is_some(), "dispatch normalization {key}");
                    }
                }
            }
        }
        for row in fixture["frames"].as_array().unwrap() {
            let bytes: Vec<u8> = row["bytes"]
                .as_array()
                .unwrap()
                .iter()
                .map(|v| v.as_u64().unwrap() as u8)
                .collect();
            let parsed = read_client_frame(&mut io::Cursor::new(bytes))
                .unwrap()
                .unwrap();
            if row["kind"] == "part" {
                assert_eq!(parsed.kind, INPUT_PART);
                let (sid, op, offset, data) = input_part_body(&parsed.body).unwrap();
                assert_eq!((sid, op, offset), (7, 1, 2));
                assert_eq!(data, &[65, 0, 255]);
            } else {
                assert_eq!(parsed.kind, REPLY);
                assert_eq!(session_body(&parsed.body), Some((7, &[27, 91, 49, 82][..])));
            }
        }
    }

    /// Hands out its bytes in small, uneven pieces.
    struct Chunked {
        data: Vec<u8>,
        at: usize,
        step: usize,
    }
    impl Read for Chunked {
        fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
            let end = (self.at + self.step)
                .min(self.data.len())
                .min(self.at + buf.len());
            let n = end - self.at;
            buf[..n].copy_from_slice(&self.data[self.at..end]);
            self.at = end;
            self.step = self.step % 3 + 1;
            Ok(n)
        }
    }

    #[test]
    fn empty_control_object_has_the_documented_bytes() {
        assert_eq!(encode(CONTROL, b"{}"), vec![0, 0, 0, 3, 1, b'{', b'}']);
    }

    #[test]
    fn frames_survive_arbitrary_chunking() {
        let mut data = encode(CONTROL, br#"{"type":"hello"}"#);
        data.extend(encode_session(OUTPUT, 7, b"abc"));
        let mut input = Chunked {
            data,
            at: 0,
            step: 1,
        };
        let first = read_frame(&mut input).unwrap().unwrap();
        assert_eq!(first.kind, CONTROL);
        assert_eq!(first.body, br#"{"type":"hello"}"#);
        let second = read_frame(&mut input).unwrap().unwrap();
        assert_eq!(second.kind, OUTPUT);
        assert_eq!(session_body(&second.body), Some((7, &b"abc"[..])));
        assert!(read_frame(&mut input).unwrap().is_none());
    }

    #[test]
    fn client_frame_budget_is_checked_from_header_before_reading_body() {
        for (kind, limit) in [
            (CONTROL, 64 * 1024),
            (INPUT, OPERATION_BYTES + 4),
            (INPUT_PART, FRAGMENT_BYTES + 12),
            (REPLY, REPLY_FRAME_BYTES + 4),
        ] {
            let mut header = ((limit + 2) as u32).to_be_bytes().to_vec();
            header.push(kind);
            assert_eq!(
                read_client_frame(&mut io::Cursor::new(header))
                    .unwrap_err()
                    .kind(),
                io::ErrorKind::InvalidData
            );
        }
        assert_eq!(
            read_client_frame(&mut io::Cursor::new([0, 0, 0, 1, OUTPUT]))
                .unwrap_err()
                .kind(),
            io::ErrorKind::InvalidData
        );
    }

    #[test]
    fn oversized_and_truncated_frames_are_errors() {
        let mut huge = io::Cursor::new(((MAX_FRAME + 1) as u32).to_be_bytes().to_vec());
        assert!(read_frame(&mut huge).is_err());
        let mut truncated = io::Cursor::new(vec![0, 0]);
        assert!(read_frame(&mut truncated).is_err());
        let mut short_body = io::Cursor::new(vec![0, 0, 0, 5, 1, b'{']);
        assert!(read_frame(&mut short_body).is_err());
    }
}
