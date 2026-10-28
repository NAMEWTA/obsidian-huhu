//! Local protected discovery. No Vault/port scanning and no inference from cwd or a unique candidate.
use super::{
    codec::{self, ProtocolError},
    ipc::platform as os,
    wire_generated as w,
};
use serde_json::{json, Value};
use std::{
    fs::{self},
    io::{self, Read, Write},
    path::{Path, PathBuf},
};
fn failure(code: &'static str, message: &'static str) -> ProtocolError {
    ProtocolError { code, message }
}
pub fn root() -> io::Result<PathBuf> {
    let root = os::runtime_root()?.join("locators");
    os::directory(&root)?;
    Ok(root)
}
fn key(instance: &str) -> String {
    let mut hash = 0xcbf29ce484222325u64;
    for b in instance.bytes() {
        hash ^= b as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("i{hash:016x}.json")
}
pub fn location(instance: &str) -> io::Result<PathBuf> {
    Ok(root()?.join(key(instance)))
}
pub fn validate_scope(scope: &Value) -> Result<(), ProtocolError> {
    let physical = os::physical(Path::new(
        scope["rootPath"]
            .as_str()
            .ok_or_else(|| failure("SCOPE_MISMATCH", "Invalid Vault binding"))?,
    ))
    .map_err(|_| failure("SCOPE_MISMATCH", "Vault root unavailable"))?;
    let expected = &scope["root"];
    #[cfg(windows)]
    let canonical_matches = physical
        .0
        .eq_ignore_ascii_case(expected["canonicalPath"].as_str().unwrap_or(""));
    #[cfg(unix)]
    let canonical_matches = physical.0 == expected["canonicalPath"].as_str().unwrap_or("");
    if !canonical_matches
        || physical.1 != expected["dev"].as_str().unwrap_or("")
        || physical.2 != expected["ino"].as_str().unwrap_or("")
    {
        return Err(failure("SCOPE_MISMATCH", "Vault physical binding changed"));
    }
    Ok(())
}
fn read_captured(path: &Path) -> Result<(Value, os::Identity), ProtocolError> {
    let expected =
        root().map_err(|_| failure("SOURCE_UNAVAILABLE", "Private locator root unavailable"))?;
    if path.parent() != Some(expected.as_path())
        || path
            .file_name()
            .is_none_or(|s| s.len() > w::LOCATOR_NAME_BYTES)
    {
        return Err(failure("SCOPE_MISMATCH", "Locator outside private root"));
    }
    os::private_directory(&expected)
        .map_err(|_| failure("SOURCE_UNAVAILABLE", "Locator directory changed"))?;
    let mut file = os::open_read(path).map_err(|_| {
        failure(
            "CONNECTION_UNAVAILABLE",
            "Locator unavailable or not private",
        )
    })?;
    let id = os::file_identity(&file)
        .map_err(|_| failure("SOURCE_UNAVAILABLE", "Locator identity unavailable"))?;
    let mut bytes = Vec::new();
    Read::by_ref(&mut file)
        .take(w::LOCATOR_BYTES as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| failure("SOURCE_UNAVAILABLE", "Locator read failed"))?;
    if bytes.len() > w::LOCATOR_BYTES {
        return Err(failure("CAPACITY_EXCEEDED", "Locator exceeds capacity"));
    }
    let value = codec::parse_locator(&bytes)?;
    validate_scope(&value["scope"])?;
    Ok((value, id))
}
pub fn read(path: &Path) -> Result<Value, ProtocolError> {
    read_captured(path).map(|(value, _)| value)
}
fn retire_dead_locator(path: &Path, next: &Value) -> Result<(), ProtocolError> {
    let busy = || {
        failure(
            "BUSY",
            "Existing locator is active or cannot be safely retired",
        )
    };
    let (old, id) = read_captured(path).map_err(|_| busy())?;
    if old["scope"] != next["scope"] {
        return Err(busy());
    }
    let root = os::runtime_root().map_err(|_| busy())?;
    let token = old["token"].as_str().ok_or_else(busy)?;
    if token.len() != 64 || old["endpoint"] != os::endpoint(&root, token) {
        return Err(busy());
    }
    if os::path_identity(path).map_err(|_| busy())? != id {
        return Err(busy());
    }
    // Refused/absent OS endpoint is positive death evidence; timeout, permissions and active listeners are not.
    os::retire_dead_endpoint(old["endpoint"].as_str().unwrap()).map_err(|_| busy())?;
    os::remove_identity(path, &id).map_err(|_| busy())
}
pub struct Published {
    pub path: PathBuf,
    id: os::Identity,
}
impl Published {
    pub fn withdraw(&self) -> io::Result<()> {
        os::remove_identity(&self.path, &self.id)
    }
}
impl Drop for Published {
    fn drop(&mut self) {
        let _ = self.withdraw();
    }
}
pub fn publish(value: &Value) -> Result<Published, ProtocolError> {
    validate_scope(&value["scope"])?;
    codec::measure(value, w::LOCATOR_BYTES, false)?;
    let bytes =
        serde_json::to_vec(value).map_err(|_| failure("INVALID_ARGUMENT", "Invalid locator"))?;
    codec::parse_locator(&bytes)?;
    let path = location(value["scope"]["instanceId"].as_str().unwrap())
        .map_err(|_| failure("SOURCE_UNAVAILABLE", "Private locator root unavailable"))?;
    let mut file = match os::open_new(&path) {
        Ok(file) => file,
        Err(error) if error.kind() == io::ErrorKind::AlreadyExists => {
            retire_dead_locator(&path, value)?;
            os::open_new(&path)
                .map_err(|_| failure("BUSY", "Instance locator changed during publication"))?
        }
        Err(_) => return Err(failure("SOURCE_UNAVAILABLE", "Locator publication failed")),
    };
    let id = os::file_identity(&file)
        .map_err(|_| failure("SOURCE_UNAVAILABLE", "Locator identity unavailable"))?;
    let published = Published { path, id };
    if file
        .write_all(&bytes)
        .and_then(|_| file.sync_all())
        .is_err()
    {
        return Err(failure("SOURCE_UNAVAILABLE", "Locator publication failed"));
    }
    Ok(published)
}
/// Minimal public diagnostics only: no token, endpoint, full scope, environment or arbitrary Vault contents.
pub fn candidates(budget: usize) -> Result<Value, ProtocolError> {
    let root =
        root().map_err(|_| failure("SOURCE_UNAVAILABLE", "Private locator root unavailable"))?;
    os::private_directory(&root)
        .map_err(|_| failure("SOURCE_UNAVAILABLE", "Locator root changed"))?;
    let mut rows = Value::Array(Vec::new());
    let entries = fs::read_dir(&root)
        .map_err(|_| failure("SOURCE_UNAVAILABLE", "Locator enumeration failed"))?;
    for (at, entry) in entries.enumerate() {
        if at >= w::LOCATOR_CANDIDATES {
            return Err(failure(
                "CAPACITY_EXCEEDED",
                "Too many local candidates; select an explicit instance",
            ));
        }
        let entry = entry.map_err(|_| failure("SOURCE_UNAVAILABLE", "Locator entry failed"))?;
        let name = entry.file_name();
        if name.len() > w::LOCATOR_NAME_BYTES {
            return Err(failure(
                "CAPACITY_EXCEEDED",
                "Locator name exceeds capacity",
            ));
        }
        let text = name.to_string_lossy();
        if !text.starts_with('i') || !text.ends_with(".json") {
            return Err(failure(
                "SOURCE_UNAVAILABLE",
                "Unexpected private locator entry",
            ));
        }
        let mut locator = read(&entry.path())?;
        let instance = locator["scope"]["instanceId"].take();
        let vault = locator["scope"]["vaultId"].take();
        rows.as_array_mut()
            .unwrap()
            .push(json!({"instanceId":instance,"vaultId":vault}));
        codec::measure(&rows, budget, false)?;
    }
    Ok(rows)
}
pub fn select(instance: Option<&str>, hint: Option<&str>) -> Result<Value, ProtocolError> {
    let Some(instance) = instance else {
        return Err(failure(
            "TARGET_REQUIRED",
            "Choose an explicit local instance",
        ));
    };
    let path = if let Some(hint) = hint {
        PathBuf::from(hint)
    } else {
        location(instance)
            .map_err(|_| failure("SOURCE_UNAVAILABLE", "Private locator root unavailable"))?
    };
    let value = read(&path)?;
    if value["scope"]["instanceId"] != instance {
        return Err(failure("SCOPE_MISMATCH", "Locator instance differs"));
    }
    Ok(value)
}
pub fn identity_of(path: &Path) -> io::Result<os::Identity> {
    os::path_identity(path)
}
