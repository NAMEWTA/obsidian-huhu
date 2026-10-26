use serde_json::Value;
use std::time::{SystemTime, UNIX_EPOCH};
pub struct Gate {
    pub epoch: u64,
    pub sequence: u64,
    lease: String,
    controller: String,
    mode: String,
    expires: u64,
    pub closed: bool,
}
impl Gate {
    pub fn new(provisioning: &str) -> Self {
        Self {
            epoch: 0,
            sequence: 0,
            lease: provisioning.into(),
            controller: "provisioning".into(),
            mode: "workspace".into(),
            expires: u64::MAX,
            closed: false,
        }
    }
    pub fn control(&mut self, epoch: u64, lease: Option<&Value>) -> Result<(), &'static str> {
        if self.closed || epoch < self.epoch {
            return Err("browser_stale_control");
        }
        if let Some(v) = lease {
            if v["epoch"].as_u64() != Some(epoch)
                || !matches!(v["mode"].as_str(), Some("agent" | "human" | "workspace"))
                || v["leaseId"].as_str().unwrap_or("").is_empty()
                || v["controllerId"].as_str().unwrap_or("").is_empty()
            {
                return Err("browser_invalid_control");
            }
        }
        if epoch == self.epoch {
            let Some(v) = lease else {
                return Err("browser_stale_control");
            };
            if v["leaseId"].as_str() != Some(&self.lease)
                || v["controllerId"].as_str() != Some(&self.controller)
                || v["mode"].as_str() != Some(&self.mode)
                || v["expiresAt"].as_u64().unwrap_or(0) <= self.expires
            {
                return Err("browser_stale_control");
            }
            self.expires = v["expiresAt"].as_u64().unwrap();
            return Ok(());
        }
        self.epoch = epoch;
        self.lease = lease
            .and_then(|v| v["leaseId"].as_str())
            .unwrap_or("")
            .into();
        self.controller = lease
            .and_then(|v| v["controllerId"].as_str())
            .unwrap_or("")
            .into();
        self.mode = lease.and_then(|v| v["mode"].as_str()).unwrap_or("").into();
        self.expires = lease.and_then(|v| v["expiresAt"].as_u64()).unwrap_or(0);
        Ok(())
    }
    pub fn admit(&self, request: &Value) -> Result<Vec<u8>, &'static str> {
        if self.closed {
            return Err("browser_transport_closed");
        }
        let frames = request["frames"]
            .as_array()
            .ok_or("browser_invalid_dispatch")?;
        if frames.is_empty() || frames.len() > 4 {
            return Err("browser_gesture_limit");
        }
        let maintenance = request["lane"] == "maintenance";
        if !maintenance {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64;
            if self.lease.is_empty()
                || request["epoch"].as_u64() != Some(self.epoch)
                || request["leaseId"].as_str() != Some(&self.lease)
                || request["controllerId"].as_str() != Some(&self.controller)
                || now >= self.expires
            {
                return Err("browser_stale_control");
            }
        }
        let mut mouse: Option<(Value, Value, Value)> = None;
        let mut key: Option<(Value, Value, Value)> = None;
        let mut bytes = Vec::new();
        for frame in frames {
            let method = frame["method"].as_str().ok_or("browser_invalid_dispatch")?;
            if frame["id"].as_u64().is_none() {
                return Err("browser_invalid_dispatch");
            }
            let p = &frame["params"];
            if maintenance && !maintenance_allowed(method, p) {
                return Err("browser_maintenance_denied");
            }
            if method == "Input.dispatchMouseEvent" {
                let value = (
                    frame["sessionId"].clone(),
                    p["button"].clone(),
                    p["modifiers"].clone(),
                );
                match p["type"].as_str() {
                    Some("mousePressed") if mouse.is_none() => mouse = Some(value),
                    Some("mouseReleased") if mouse.as_ref() == Some(&value) => mouse = None,
                    Some("mouseWheel" | "mouseMoved") => (),
                    _ => return Err("browser_incomplete_gesture"),
                }
            }
            if method == "Input.dispatchKeyEvent" {
                let modifiers = p["modifiers"].as_u64().unwrap_or(0);
                if modifiers & 6 != 0
                    && matches!(
                        p["key"].as_str().unwrap_or("").to_lowercase().as_str(),
                        "c" | "x" | "v"
                    )
                {
                    return Err("browser_clipboard_shortcut_denied");
                }
                let value = (
                    frame["sessionId"].clone(),
                    p["key"].clone(),
                    p["modifiers"].clone(),
                );
                match p["type"].as_str() {
                    Some("keyDown" | "rawKeyDown") if key.is_none() => key = Some(value),
                    Some("keyUp") if key.as_ref() == Some(&value) => key = None,
                    _ => return Err("browser_incomplete_gesture"),
                }
            }
            if matches!(
                method,
                "Input.imeSetComposition" | "Input.dispatchTouchEvent"
            ) {
                return Err("browser_gesture_unsupported");
            }
            serde_json::to_writer(&mut bytes, frame).map_err(|_| "browser_invalid_dispatch")?;
            bytes.push(0);
        }
        if mouse.is_some() || key.is_some() {
            return Err("browser_incomplete_gesture");
        }
        if bytes.len() > 64 * 1024 {
            return Err("browser_gesture_limit");
        }
        Ok(bytes)
    }
}
fn maintenance_allowed(method: &str, p: &Value) -> bool {
    match method {
        "Browser.grantPermissions" => {
            p["permissions"].as_array().is_some_and(|v| v.is_empty())
                && p.as_object().is_some_and(|v| v.len() == 1)
        }
        "Browser.setDownloadBehavior" => {
            p["behavior"] == "deny"
                && p.as_object()
                    .is_some_and(|v| v.keys().all(|k| k == "behavior" || k == "eventsEnabled"))
        }
        "Fetch.continueWithAuth" => {
            p["authChallengeResponse"]["response"] == "CancelAuth"
                && p["authChallengeResponse"]
                    .as_object()
                    .is_some_and(|v| v.len() == 1)
        }
        "Fetch.continueRequest" => p
            .as_object()
            .is_some_and(|v| v.len() == 1 && v.contains_key("requestId")),
        "Page.handleJavaScriptDialog" => {
            p["accept"] == false && p.as_object().is_some_and(|v| v.len() == 1)
        }
        "DOM.setFileInputFiles" => {
            p["files"].as_array().is_some_and(|v| v.is_empty())
                && p["backendNodeId"].as_u64().is_some()
        }
        "Page.addScriptToEvaluateOnNewDocument" => {
            let policy: Value = serde_json::from_str(include_str!(
                "../../../src/modules/browser/platform/desktop/runtime/page-policy.json"
            ))
            .unwrap();
            p["source"] == policy["source"] && p["runImmediately"] == true
        }
        _ => matches!(
            method,
            "Browser.getVersion"
                | "Browser.setDownloadBehavior"
                | "Browser.cancelDownload"
                | "Target.getTargets"
                | "Target.setDiscoverTargets"
                | "Target.setAutoAttach"
                | "Target.attachToTarget"
                | "Target.closeTarget"
                | "Page.enable"
                | "Page.getFrameTree"
                | "Page.getLayoutMetrics"
                | "Page.setInterceptFileChooserDialog"
                | "Page.captureScreenshot"
                | "Page.startScreencast"
                | "Page.stopScreencast"
                | "Page.screencastFrameAck"
                | "Runtime.enable"
                | "Runtime.runIfWaitingForDebugger"
                | "Runtime.releaseObjectGroup"
                | "DOM.enable"
                | "DOM.getDocument"
                | "DOM.describeNode"
                | "Network.enable"
                | "Network.setBlockedURLs"
                | "Fetch.enable"
                | "Emulation.setDeviceMetricsOverride"
        ),
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    fn authority() -> Value {
        json!({"epoch":1,"leaseId":"l","controllerId":"c","mode":"agent","expiresAt":9999999999999u64})
    }
    fn request(frames: Value) -> Value {
        json!({"lane":"lease","epoch":1,"leaseId":"l","controllerId":"c","frames":frames})
    }
    #[test]
    fn revocation_fences_old_commands() {
        let mut g = Gate::new("p");
        g.control(1, Some(&authority())).unwrap();
        let v = request(json!([{"id":1,"method":"Input.insertText","params":{"text":"x"}}]));
        assert!(g.admit(&v).is_ok());
        g.control(2, None).unwrap();
        assert_eq!(g.admit(&v).unwrap_err(), "browser_stale_control");
        assert!(g.control(1, Some(&authority())).is_err());
    }
    #[test]
    fn gesture_is_complete_and_same_session() {
        let mut g = Gate::new("p");
        g.control(1, Some(&authority())).unwrap();
        let down = json!({"id":1,"method":"Input.dispatchMouseEvent","sessionId":"a","params":{"type":"mousePressed","button":"left","modifiers":0}});
        assert!(g.admit(&request(json!([down.clone()]))).is_err());
        let up = json!({"id":2,"method":"Input.dispatchMouseEvent","sessionId":"a","params":{"type":"mouseReleased","button":"left","modifiers":0}});
        assert!(g.admit(&request(json!([down.clone(), up.clone()]))).is_ok());
        let mut bad = up;
        bad["sessionId"] = json!("b");
        assert!(g.admit(&request(json!([down, bad]))).is_err());
    }
    #[test]
    fn maintenance_cannot_evaluate_or_grant() {
        assert!(!maintenance_allowed(
            "Runtime.evaluate",
            &json!({"expression":"1"})
        ));
        assert!(!maintenance_allowed(
            "Browser.grantPermissions",
            &json!({"permissions":["clipboardReadWrite"]})
        ));
        assert!(maintenance_allowed(
            "Browser.grantPermissions",
            &json!({"permissions":[]})
        ));
        assert!(!maintenance_allowed(
            "Fetch.continueWithAuth",
            &json!({"authChallengeResponse":{"response":"ProvideCredentials"}})
        ));
    }
}
