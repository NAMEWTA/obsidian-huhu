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
    composition: Option<String>,
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
            composition: None,
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
        if lease.is_some() && self.composition.is_some() {
            return Err("browser_input_unsettled");
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
    pub fn admit(&mut self, request: &Value) -> Result<Vec<u8>, &'static str> {
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
                || request
                    .get("deadlineAtMs")
                    .is_some_and(|value| value.as_u64().is_none_or(|deadline| now >= deadline))
            {
                return Err("browser_stale_control");
            }
        }
        let mut mouse: Option<(Value, Value, Value)> = None;
        let mut key: Option<(Value, Value, Value)> = None;
        let mut bytes = Vec::new();
        let mut composition = self.composition.clone();
        for frame in frames {
            let method = frame["method"].as_str().ok_or("browser_invalid_dispatch")?;
            if frame["id"].as_u64().is_none() {
                return Err("browser_invalid_dispatch");
            }
            let p = &frame["params"];
            // A revoked writer has no general maintenance input privilege. Only
            // its recorded session may clear that existing composition.
            let cancel_composition = maintenance
                && self.lease.is_empty()
                && frames.len() == 1
                && method == "Input.imeSetComposition"
                && p["text"] == ""
                && p["selectionStart"] == 0
                && p["selectionEnd"] == 0
                && composition.as_deref() == frame["sessionId"].as_str();
            if maintenance && !maintenance_allowed(method, p) && !cancel_composition {
                return Err("browser_maintenance_denied");
            }
            if method == "Input.imeSetComposition" {
                let text = p["text"].as_str().ok_or("browser_invalid_composition")?;
                let session = frame["sessionId"]
                    .as_str()
                    .filter(|v| !v.is_empty())
                    .ok_or("browser_invalid_composition")?;
                let length = text.encode_utf16().count() as u64;
                let start = p["selectionStart"]
                    .as_u64()
                    .ok_or("browser_invalid_composition")?;
                let end = p["selectionEnd"]
                    .as_u64()
                    .ok_or("browser_invalid_composition")?;
                if (!cancel_composition && (maintenance || self.mode != "human"))
                    || frames.len() != 1
                    || text.len() > 48 * 1024
                    || start > end
                    || end > length
                    || p.get("replacementStart").is_some()
                    || p.get("replacementEnd").is_some()
                    || composition
                        .as_deref()
                        .is_some_and(|previous| previous != session)
                {
                    return Err("browser_invalid_composition");
                }
                composition = if text.is_empty() {
                    None
                } else {
                    Some(session.into())
                };
            }
            if method == "Input.insertText" && composition.is_some() {
                if maintenance
                    || self.mode != "human"
                    || frames.len() != 1
                    || composition.as_deref() != frame["sessionId"].as_str()
                {
                    return Err("browser_input_unsettled");
                }
                composition = None;
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
            if matches!(method, "Input.dispatchTouchEvent") {
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
        self.composition = composition;
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
    #[test]
    fn composition_is_human_scoped_and_revoke_only_allows_its_recorded_cancel() {
        let mut g = Gate::new("p");
        let mut human = authority();
        human["mode"] = json!("human");
        g.control(1, Some(&human)).unwrap();
        let update = json!({"id":1,"method":"Input.imeSetComposition","sessionId":"page-session","params":{"text":"中😀","selectionStart":1,"selectionEnd":3}});
        g.admit(&request(json!([update.clone()]))).unwrap();
        let mut invalid = update.clone();
        invalid["params"]["selectionEnd"] = json!(4);
        assert!(g.admit(&request(json!([invalid]))).is_err());
        g.control(2, None).unwrap();
        assert_eq!(
            g.admit(&request(json!([update.clone()]))).unwrap_err(),
            "browser_stale_control"
        );
        let mut next = human.clone();
        next["epoch"] = json!(3);
        assert_eq!(
            g.control(3, Some(&next)).unwrap_err(),
            "browser_input_unsettled"
        );
        let mut cancel = update;
        cancel["params"] = json!({"text":"","selectionStart":0,"selectionEnd":0});
        let mut wrong = cancel.clone();
        wrong["sessionId"] = json!("another-session");
        assert!(g
            .admit(&json!({"lane":"maintenance","frames":[wrong]}))
            .is_err());
        let mut forged = cancel.clone();
        forged["params"]["text"] = json!("forged");
        assert!(g
            .admit(&json!({"lane":"maintenance","frames":[forged]}))
            .is_err());
        g.admit(&json!({"lane":"maintenance","frames":[cancel.clone()]}))
            .unwrap();
        assert!(g
            .admit(&json!({"lane":"maintenance","frames":[cancel]}))
            .is_err());
        g.control(3, Some(&next)).unwrap();
    }
    #[test]
    fn agent_cannot_start_composition_or_use_the_cancellation_exception() {
        let mut g = Gate::new("p");
        g.control(1, Some(&authority())).unwrap();
        let frame = json!({"id":1,"method":"Input.imeSetComposition","sessionId":"s","params":{"text":"x","selectionStart":1,"selectionEnd":1}});
        assert_eq!(
            g.admit(&request(json!([frame]))).unwrap_err(),
            "browser_invalid_composition"
        );
        assert!(g.admit(&json!({"lane":"maintenance","frames":[{"id":2,"method":"Input.imeSetComposition","sessionId":"s","params":{"text":"","selectionStart":0,"selectionEnd":0}}]})).is_err());
    }
    #[test]
    fn per_dispatch_deadline_cannot_extend_a_lease_and_expiry_is_checked_at_the_native_gate() {
        let mut g = Gate::new("p");
        g.control(1, Some(&authority())).unwrap();
        let mut v = request(
            json!([{"id":1,"method":"DOM.setFileInputFiles","sessionId":"s","params":{"files":["/synthetic/private-copy"],"backendNodeId":1}}]),
        );
        v["deadlineAtMs"] = json!(1);
        assert_eq!(g.admit(&v).unwrap_err(), "browser_stale_control");
        v["deadlineAtMs"] = json!("invalid");
        assert!(g.admit(&v).is_err());
        v["deadlineAtMs"] = json!(9999999999999u64);
        assert!(g.admit(&v).is_ok());
        g.control(2, None).unwrap();
        assert!(g.admit(&v).is_err());
    }
}
