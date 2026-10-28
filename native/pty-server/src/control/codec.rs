//! Strict local-control JSON. The generated descriptor owns all fields and result variants.
use super::wire_generated as wire;
use serde::de::{self, DeserializeSeed, MapAccess, SeqAccess, Visitor};
use serde_json::{Map, Number, Value};
use std::{
    fmt,
    io::{self, Write},
    sync::OnceLock,
};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProtocolError {
    pub code: &'static str,
    pub message: &'static str,
}
impl fmt::Display for ProtocolError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.message)
    }
}
impl std::error::Error for ProtocolError {}
fn invalid() -> ProtocolError {
    ProtocolError {
        code: "INVALID_ARGUMENT",
        message: "Invalid local control value",
    }
}
fn capacity() -> ProtocolError {
    ProtocolError {
        code: "CAPACITY_EXCEEDED",
        message: "Local control capacity exceeded",
    }
}
pub fn descriptor() -> &'static Value {
    static VALUE: OnceLock<Value> = OnceLock::new();
    VALUE.get_or_init(|| serde_json::from_str(wire::DESCRIPTOR_JSON).expect("generated descriptor"))
}
struct Budget {
    nodes: usize,
    max_nodes: usize,
    max_depth: usize,
}
struct Seed<'a> {
    budget: &'a mut Budget,
    depth: usize,
}
impl<'de> DeserializeSeed<'de> for Seed<'_> {
    type Value = Value;
    fn deserialize<D: de::Deserializer<'de>>(self, d: D) -> Result<Value, D::Error> {
        self.budget.nodes += 1;
        if self.depth > self.budget.max_depth || self.budget.nodes > self.budget.max_nodes {
            return Err(de::Error::custom("control budget"));
        }
        d.deserialize_any(JsonVisitor {
            budget: self.budget,
            depth: self.depth,
        })
    }
}
struct JsonVisitor<'a> {
    budget: &'a mut Budget,
    depth: usize,
}
fn number<E: de::Error>(n: f64) -> Result<Value, E> {
    if !n.is_finite() || n.abs() > 9_007_199_254_740_991.0 {
        return Err(E::custom("unsafe control number"));
    }
    Ok(if n.fract() == 0.0 {
        if n >= 0.0 {
            Value::from(n as u64)
        } else {
            Value::from(n as i64)
        }
    } else {
        Value::Number(Number::from_f64(n).unwrap())
    })
}
impl<'de> Visitor<'de> for JsonVisitor<'_> {
    type Value = Value;
    fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("bounded JSON")
    }
    fn visit_bool<E: de::Error>(self, v: bool) -> Result<Value, E> {
        Ok(Value::Bool(v))
    }
    fn visit_unit<E: de::Error>(self) -> Result<Value, E> {
        Ok(Value::Null)
    }
    fn visit_i64<E: de::Error>(self, v: i64) -> Result<Value, E> {
        number(v as f64)
    }
    fn visit_u64<E: de::Error>(self, v: u64) -> Result<Value, E> {
        number(v as f64)
    }
    fn visit_f64<E: de::Error>(self, v: f64) -> Result<Value, E> {
        number(v)
    }
    fn visit_str<E: de::Error>(self, v: &str) -> Result<Value, E> {
        Ok(Value::String(v.to_owned()))
    }
    fn visit_string<E: de::Error>(self, v: String) -> Result<Value, E> {
        Ok(Value::String(v))
    }
    fn visit_seq<A: SeqAccess<'de>>(self, mut seq: A) -> Result<Value, A::Error> {
        let mut out = Vec::new();
        while let Some(v) = seq.next_element_seed(Seed {
            budget: self.budget,
            depth: self.depth + 1,
        })? {
            out.push(v);
        }
        Ok(Value::Array(out))
    }
    fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> Result<Value, A::Error> {
        let mut out = Map::new();
        while let Some(key) = map.next_key::<String>()? {
            self.budget.nodes += 1;
            if self.budget.nodes > self.budget.max_nodes || out.contains_key(&key) {
                return Err(de::Error::custom("duplicate key/control budget"));
            }
            let value = map.next_value_seed(Seed {
                budget: self.budget,
                depth: self.depth + 1,
            })?;
            out.insert(key, value);
        }
        Ok(Value::Object(out))
    }
}
fn parse(body: &[u8], limit: usize, internal: bool) -> Result<Value, ProtocolError> {
    if body.len() > limit {
        return Err(capacity());
    }
    let mut budget = Budget {
        nodes: 0,
        max_nodes: wire::NODES + if internal { wire::WRAPPER_NODES } else { 0 },
        max_depth: wire::DEPTH + if internal { wire::WRAPPER_DEPTH } else { 0 },
    };
    let mut decoder = serde_json::Deserializer::from_slice(body);
    let value = Seed {
        budget: &mut budget,
        depth: 0,
    }
    .deserialize(&mut decoder)
    .map_err(|_| invalid())?;
    decoder.end().map_err(|_| invalid())?;
    Ok(value)
}
fn valid(schema: &Value, value: &Value) -> bool {
    if let Some(variants) = schema["oneOf"].as_array() {
        return variants.iter().filter(|s| valid(s, value)).count() == 1;
    }
    if let Some(name) = schema["ref"].as_str() {
        return valid(&descriptor()["schemas"][name], value);
    }
    if let Some(expected) = schema.get("const") {
        return expected == value
            || expected
                .as_f64()
                .zip(value.as_f64())
                .is_some_and(|(a, b)| a == b);
    }
    if let Some(choices) = schema["enum"].as_array() {
        return choices.contains(value);
    }
    match schema["type"].as_str().unwrap_or("") {
        "json" => true,
        "json-object" => value.is_object(),
        "operation" => value
            .as_str()
            .is_some_and(|op| descriptor()["operations"].get(op).is_some()),
        "boolean" => value.is_boolean(),
        "string" => value.as_str().is_some_and(|s| {
            let n = s.encode_utf16().count();
            s.len() <= schema["maxUtf8Bytes"].as_u64().unwrap_or(u64::MAX) as usize
                && n >= schema["minLength"].as_u64().unwrap_or(0) as usize
                && n <= schema["maxLength"].as_u64().unwrap_or(u64::MAX) as usize
                && match schema["pattern"].as_str() {
                    Some("ascii-id") => {
                        !s.is_empty()
                            && s.bytes()
                                .all(|c| c.is_ascii_alphanumeric() || c == b'_' || c == b'-')
                    }
                    Some("decimal") => !s.is_empty() && s.bytes().all(|c| c.is_ascii_digit()),
                    Some("hex256") => {
                        s.len() == 64
                            && s.bytes()
                                .all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c))
                    }
                    _ => true,
                }
        }),
        "integer" | "number" => value.as_f64().is_some_and(|n| {
            n.is_finite()
                && (schema["type"] != "integer" || n.fract() == 0.0)
                && n >= schema["minimum"]
                    .as_f64()
                    .unwrap_or(-9_007_199_254_740_991.0)
                && n <= schema["maximum"]
                    .as_f64()
                    .unwrap_or(9_007_199_254_740_991.0)
        }),
        "object" => value.as_object().is_some_and(|obj| {
            let Some(props) = schema["properties"].as_object() else {
                return false;
            };
            obj.keys().all(|k| props.contains_key(k))
                && schema["required"].as_array().is_some_and(|keys| {
                    keys.iter()
                        .all(|k| obj.contains_key(k.as_str().unwrap_or("")))
                })
                && props
                    .iter()
                    .all(|(key, s)| obj.get(key).is_none_or(|v| valid(s, v)))
        }),
        _ => false,
    }
}
fn check(name: &str, value: &Value) -> Result<(), ProtocolError> {
    if valid(&descriptor()["schemas"][name], value) {
        Ok(())
    } else {
        Err(invalid())
    }
}
pub fn check_request(value: &Value) -> Result<(), ProtocolError> {
    check("request", value)?;
    if !valid(
        &descriptor()["operations"][value["operation"].as_str().unwrap()]["params"],
        value.get("params").unwrap_or(&serde_json::json!({})),
    ) {
        return Err(invalid());
    }
    Ok(())
}
pub fn check_input_receipt(value: &Value) -> Result<(), ProtocolError> {
    check("inputReceipt", value)
}
pub fn parse_observation_cancel(body: &[u8]) -> Result<Value, ProtocolError> {
    let value = parse(body, wire::OBSERVATION_CANCEL_BYTES, false)?;
    check("observationCancel", &value)?;
    Ok(value)
}
pub fn encode_observation_cancel() -> Result<Vec<u8>, ProtocolError> {
    let value = serde_json::json!({"type":"observe-cancel","protocolVersion":1});
    check("observationCancel", &value)?;
    measure(&value, wire::OBSERVATION_CANCEL_BYTES, false)?;
    serde_json::to_vec(&value).map_err(|_| invalid())
}
pub fn parse_request(body: &[u8]) -> Result<Value, ProtocolError> {
    let v = parse(body, wire::REQUEST_BYTES, false)?;
    check_request(&v)?;
    Ok(v)
}
pub fn parse_response(body: &[u8]) -> Result<Value, ProtocolError> {
    let v = parse(body, wire::RESPONSE_BYTES, false)?;
    check("response", &v)?;
    Ok(v)
}
pub fn parse_auth(body: &[u8]) -> Result<Value, ProtocolError> {
    let v = parse(body, wire::AUTH_BYTES, false)?;
    check("auth", &v)?;
    Ok(v)
}
pub fn parse_locator(body: &[u8]) -> Result<Value, ProtocolError> {
    let v = parse(body, wire::LOCATOR_BYTES, false)?;
    check("locator", &v)?;
    measure(&v["scope"], wire::SCOPE_BYTES, false)?;
    if raw_field_bytes(body, "scope")? > wire::SCOPE_BYTES {
        return Err(capacity());
    }
    Ok(v)
}
fn profile(kind: &str) -> Result<(usize, Option<(&'static str, usize)>), ProtocolError> {
    Ok(
        match descriptor()["messages"][kind]["budget"]
            .as_str()
            .ok_or_else(invalid)?
        {
            "request" => (
                wire::REQUEST_BYTES + wire::WRAPPER_BYTES,
                Some(("request", wire::REQUEST_BYTES)),
            ),
            "response" => (
                wire::RESPONSE_BYTES + wire::WRAPPER_BYTES,
                Some(("response", wire::RESPONSE_BYTES)),
            ),
            "scope" => (
                wire::SCOPE_BYTES + wire::WRAPPER_BYTES,
                Some(("scope", wire::SCOPE_BYTES)),
            ),
            "stage" => (
                wire::STAGE_BYTES + wire::WRAPPER_BYTES,
                Some(("progress", wire::STAGE_BYTES)),
            ),
            "small" => (wire::WRAPPER_BYTES, None),
            _ => (wire::REGISTRATION_BYTES, None),
        },
    )
}
fn tree(
    value: &Value,
    depth: usize,
    nodes: &mut usize,
    max_depth: usize,
    max_nodes: usize,
    limit: usize,
) -> Result<(), ProtocolError> {
    *nodes += 1;
    if depth > max_depth || *nodes > max_nodes {
        return Err(capacity());
    }
    match value {
        Value::String(s) if s.len() > limit => return Err(capacity()),
        Value::Number(n)
            if n.as_f64()
                .is_none_or(|n| !n.is_finite() || n.abs() > 9_007_199_254_740_991.0) =>
        {
            return Err(invalid())
        }
        Value::Array(a) => {
            for v in a {
                tree(v, depth + 1, nodes, max_depth, max_nodes, limit)?;
            }
        }
        Value::Object(o) => {
            for (key, v) in o {
                *nodes += 1;
                if key.len() > limit || *nodes > max_nodes {
                    return Err(capacity());
                }
                tree(v, depth + 1, nodes, max_depth, max_nodes, limit)?;
            }
        }
        _ => {}
    }
    Ok(())
}
struct Counter {
    len: usize,
    limit: usize,
}
impl Write for Counter {
    fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
        if buf.len() > self.limit - self.len {
            return Err(io::Error::other("control capacity"));
        }
        self.len += buf.len();
        Ok(buf.len())
    }
    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}
pub fn measure(value: &Value, limit: usize, internal: bool) -> Result<usize, ProtocolError> {
    tree(
        value,
        0,
        &mut 0,
        wire::DEPTH + if internal { wire::WRAPPER_DEPTH } else { 0 },
        wire::NODES + if internal { wire::WRAPPER_NODES } else { 0 },
        limit,
    )?;
    let mut counter = Counter { len: 0, limit };
    serde_json::to_writer(&mut counter, value).map_err(|_| capacity())?;
    Ok(counter.len)
}
fn message_check(value: &Value, kind: &str) -> Result<(), ProtocolError> {
    if !valid(&descriptor()["messages"][kind]["schema"], value) {
        return Err(invalid());
    }
    let (limit, inner) = profile(kind)?;
    let whole = measure(value, limit, inner.is_some())?;
    if let Some((field, bound)) = inner {
        let n = measure(&value[field], bound, false)?;
        if whole - n > wire::WRAPPER_BYTES {
            return Err(capacity());
        }
    }
    if kind == "control-request" {
        check_request(&value["request"])?;
    }
    Ok(())
}
pub fn encode_message(value: &Value) -> Result<Vec<u8>, ProtocolError> {
    let kind = value["type"].as_str().ok_or_else(invalid)?;
    message_check(value, kind)?;
    let (limit, inner) = profile(kind)?;
    let length = measure(value, limit, inner.is_some())?;
    let mut bytes = Vec::with_capacity(length + 5);
    serde_json::to_writer(&mut bytes, value).map_err(|_| invalid())?;
    Ok(bytes)
}
fn ws(body: &[u8], at: &mut usize) {
    while body.get(*at).is_some_and(|c| b" \n\r\t".contains(c)) {
        *at += 1;
    }
}
fn skip_string(body: &[u8], at: &mut usize) -> Result<(), ProtocolError> {
    if body.get(*at) != Some(&b'"') {
        return Err(invalid());
    }
    *at += 1;
    while let Some(c) = body.get(*at) {
        *at += 1;
        if *c == b'"' {
            return Ok(());
        }
        if *c == b'\\' {
            if *at >= body.len() {
                break;
            }
            *at += 1;
        }
    }
    Err(invalid())
}
fn skip_value(body: &[u8], at: &mut usize) -> Result<(), ProtocolError> {
    if body.get(*at) == Some(&b'"') {
        return skip_string(body, at);
    }
    if body.get(*at).is_some_and(|c| *c == b'{' || *c == b'[') {
        let mut depth = 0i32;
        while let Some(c) = body.get(*at) {
            if *c == b'"' {
                skip_string(body, at)?;
                continue;
            }
            if *c == b'{' || *c == b'[' {
                depth += 1;
            } else if *c == b'}' || *c == b']' {
                depth -= 1;
            }
            *at += 1;
            if depth == 0 {
                return Ok(());
            }
        }
        return Err(invalid());
    }
    let start = *at;
    while body.get(*at).is_some_and(|c| !b",}] \n\r\t".contains(c)) {
        *at += 1;
    }
    if start == *at {
        return Err(invalid());
    }
    Ok(())
}
fn root_fields(
    body: &[u8],
    mut visit: impl FnMut(&[u8], usize, usize),
) -> Result<(), ProtocolError> {
    std::str::from_utf8(body).map_err(|_| invalid())?;
    let mut at = 0;
    ws(body, &mut at);
    if body.get(at) != Some(&b'{') {
        return Ok(());
    }
    at += 1;
    ws(body, &mut at);
    if body.get(at) == Some(&b'}') {
        return Ok(());
    }
    loop {
        ws(body, &mut at);
        let key_start = at;
        skip_string(body, &mut at)?;
        let key_end = at;
        ws(body, &mut at);
        if body.get(at) != Some(&b':') {
            return Err(invalid());
        }
        at += 1;
        ws(body, &mut at);
        let start = at;
        skip_value(body, &mut at)?;
        visit(&body[key_start..key_end], start, at);
        ws(body, &mut at);
        if body.get(at) == Some(&b'}') {
            break;
        }
        if body.get(at) != Some(&b',') {
            return Err(invalid());
        }
        at += 1;
    }
    Ok(())
}
fn raw_field_bytes(body: &[u8], field: &str) -> Result<usize, ProtocolError> {
    let mut length = None;
    root_fields(body, |key, start, end| {
        if key.len() <= 6 * field.len() + 2
            && serde_json::from_slice::<String>(key).is_ok_and(|s| s == field)
        {
            length = Some(end - start);
        }
    })?;
    length.ok_or_else(invalid)
}
/// The raw top-level type scan precedes serde maps; mixed/escaped duplicate discriminators cannot hide.
fn discriminator(body: &[u8]) -> Result<Option<String>, ProtocolError> {
    let mut count = 0;
    let mut found = None;
    let mut long_type = false;
    root_fields(body, |key, start, end| {
        if key.len() <= 26 && serde_json::from_slice::<String>(key).is_ok_and(|s| s == "type") {
            count += 1;
            if body.get(start) == Some(&b'"') && end - start > 512 {
                long_type = true;
            }
            if body.get(start) == Some(&b'"') && end - start <= 512 {
                if let Ok(value) = serde_json::from_slice::<String>(&body[start..end]) {
                    if value.starts_with("control-") || value.starts_with("editor-") {
                        found = Some(value);
                    }
                }
            }
        }
    })?;
    if long_type {
        return Err(invalid());
    }
    if let Some(kind) = found.as_deref() {
        if count != 1
            || (!wire::MESSAGE_TYPES.contains(&kind) && !wire::EDITOR_MESSAGE_TYPES.contains(&kind))
        {
            return Err(invalid());
        }
    }
    Ok(found)
}
/// None selects the unchanged legacy control dispatcher. New messages are fully checked here.
pub fn parse_helper(body: &[u8]) -> Result<Option<Value>, ProtocolError> {
    if body.len() > 4 * 1024 * 1024 - 5 {
        return Err(capacity());
    }
    let Some(kind) = discriminator(body)? else {
        return Ok(None);
    };
    if kind.starts_with("editor-") {
        return parse_editor_directions(body, &["node-to-native", "native-to-node"], None)
            .map(Some);
    }
    let (limit, inner) = profile(&kind)?;
    let value = parse(body, limit, inner.is_some())?;
    message_check(&value, &kind)?;
    if let Some((field, bound)) = inner {
        let bytes = raw_field_bytes(body, field)?;
        if bytes > bound || body.len() - bytes > wire::WRAPPER_BYTES {
            return Err(capacity());
        }
    }
    Ok(Some(value))
}

fn editor_limit(kind: &str) -> Result<usize, ProtocolError> {
    match descriptor()["editor"]["messages"][kind]["budget"].as_str() {
        Some("metadata") => Ok(wire::EDITOR_METADATA_BYTES),
        Some("receipt") => Ok(wire::EDITOR_RECEIPT_BYTES),
        Some("lifecycle") => Ok(wire::EDITOR_LIFECYCLE_BYTES),
        _ => Err(invalid()),
    }
}
fn editor_check(
    value: &Value,
    directions: &[&str],
    expected: Option<&Value>,
) -> Result<(), ProtocolError> {
    let kind = value["type"].as_str().ok_or_else(invalid)?;
    let message = &descriptor()["editor"]["messages"][kind];
    if !wire::EDITOR_MESSAGE_TYPES.contains(&kind)
        || !valid(&message["schema"], value)
        || !message["directions"].as_array().is_some_and(|ds| {
            directions
                .iter()
                .any(|d| ds.iter().any(|v| v.as_str() == Some(*d)))
        })
    {
        return Err(invalid());
    }
    if let Some(expected) = expected {
        if value["sid"] != expected["sid"]
            || value["editorId"] != expected["editorId"]
            || expected.get("op").is_some_and(|op| op != &value["op"])
            || expected
                .get("sourceInstance")
                .is_some_and(|source| value.get("sourceInstance").is_some_and(|v| v != source))
            || expected
                .get("identity")
                .is_some_and(|identity| value.get("identity").is_some_and(|v| v != identity))
        {
            return Err(invalid());
        }
    }
    measure(value, editor_limit(kind)?, false)?;
    Ok(())
}
fn parse_editor_directions(
    body: &[u8],
    directions: &[&str],
    expected: Option<&Value>,
) -> Result<Value, ProtocolError> {
    let value = parse(body, wire::EDITOR_LIFECYCLE_BYTES, false)?;
    editor_check(&value, directions, expected)?;
    if body.len() > editor_limit(value["type"].as_str().unwrap())? {
        return Err(capacity());
    }
    Ok(value)
}
/// Original-owner correlation is supplied by the caller. Grammar validation never proves temporal settlement.
pub fn parse_editor(
    body: &[u8],
    direction: &str,
    expected: Option<&Value>,
) -> Result<Value, ProtocolError> {
    parse_editor_directions(body, &[direction], expected)
}
/// The caller must reserve the independent editor lane before encoding.
pub fn encode_editor(
    value: &Value,
    direction: &str,
    expected: Option<&Value>,
) -> Result<Vec<u8>, ProtocolError> {
    editor_check(value, &[direction], expected)?;
    let n = measure(value, editor_limit(value["type"].as_str().unwrap())?, false)?;
    let mut bytes = Vec::with_capacity(n);
    serde_json::to_writer(&mut bytes, value).map_err(|_| invalid())?;
    Ok(bytes)
}
pub fn parse_editor_capability(body: &[u8]) -> Result<Value, ProtocolError> {
    let value = parse(body, wire::EDITOR_CAPABILITY_BYTES, false)?;
    check("editorCapability", &value)?;
    Ok(value)
}
pub fn check_editor_launch(value: &Value) -> Result<(), ProtocolError> {
    check("editorLaunch", value)?;
    measure(value, wire::EDITOR_LIFECYCLE_BYTES, false)?;
    Ok(())
}
pub fn parse_editor_launch(body: &[u8]) -> Result<Value, ProtocolError> {
    let value = parse(body, wire::EDITOR_LIFECYCLE_BYTES, false)?;
    check_editor_launch(&value)?;
    Ok(value)
}
/// Binary app payload stays separate from JSON. The returned slice borrows the caller's charged frame.
pub fn parse_editor_part(bytes: &[u8]) -> Result<(u32, &[u8]), ProtocolError> {
    if bytes.len() <= wire::EDITOR_APP_PART_HEADER_BYTES
        || bytes.len() > wire::EDITOR_APP_PART_HEADER_BYTES + wire::EDITOR_FRAGMENT_BYTES
    {
        return Err(capacity());
    }
    let length = u32::from_be_bytes(bytes[..4].try_into().unwrap()) as usize;
    let op = u32::from_be_bytes(bytes[5..9].try_into().unwrap());
    if length != bytes.len() - 4 || bytes[4] != wire::EDITOR_APP_BODY_KIND as u8 || op == 0 {
        return Err(invalid());
    }
    Ok((op, &bytes[wire::EDITOR_APP_PART_HEADER_BYTES..]))
}
pub fn encode_editor_part(op: u32, data: &[u8]) -> Result<Vec<u8>, ProtocolError> {
    if op == 0 {
        return Err(invalid());
    }
    if data.is_empty() || data.len() > wire::EDITOR_FRAGMENT_BYTES {
        return Err(capacity());
    }
    let length = wire::EDITOR_APP_PART_HEADER_BYTES + data.len();
    let mut bytes = Vec::with_capacity(length);
    bytes.extend_from_slice(&((length - 4) as u32).to_be_bytes());
    bytes.push(wire::EDITOR_APP_BODY_KIND as u8);
    bytes.extend_from_slice(&op.to_be_bytes());
    bytes.extend_from_slice(data);
    Ok(bytes)
}
/// Check the complete body only after all parts arrive; a valid fragment can split UTF-8 sequences.
pub fn check_editor_body(body: &[u8]) -> Result<(), ProtocolError> {
    if body.len() > wire::EDITOR_BODY_BYTES {
        return Err(capacity());
    }
    if body.is_empty() || std::str::from_utf8(body).is_err() {
        return Err(invalid());
    }
    Ok(())
}
