use huhu_pty::control::codec;
use serde_json::Value;

#[test]
fn pane_cli_uses_the_shared_literal_grammar_fixture() {
    let fixture: Value = serde_json::from_str(include_str!(
        "../../../test/fixtures/native/control-v1.json"
    ))
    .unwrap();
    for row in fixture["paneCliCases"].as_array().unwrap() {
        let args: Vec<String> = serde_json::from_value(row["args"].clone()).unwrap();
        let env = serde_json::from_value(row["env"].clone()).unwrap();
        let parsed = huhu_pty::control::cli::parse(&args, &env);
        if row["valid"] == true {
            assert_eq!(parsed.unwrap().request, row["request"], "{}", row["name"]);
        } else {
            assert_eq!(
                parsed.unwrap_err().code,
                row["code"].as_str().unwrap(),
                "{}",
                row["name"]
            );
        }
    }
}

#[test]
fn message_cli_requires_an_explicit_recipient_and_preserves_business_identity() {
    let fixture: Value = serde_json::from_str(include_str!(
        "../../../test/fixtures/native/control-v1.json"
    ))
    .unwrap();
    for row in fixture["inboxCliCases"].as_array().unwrap() {
        let args: Vec<String> = serde_json::from_value(row["args"].clone()).unwrap();
        let env = serde_json::from_value(row["env"].clone()).unwrap();
        let parsed = huhu_pty::control::cli::parse(&args, &env);
        if row["valid"] == true {
            assert_eq!(parsed.unwrap().request, row["request"], "{}", row["name"]);
        } else {
            assert_eq!(
                parsed.unwrap_err().code,
                row["code"].as_str().unwrap(),
                "{}",
                row["name"]
            );
        }
    }
}

#[test]
fn message_wire_cases_keep_request_id_separate_from_message_id() {
    let fixture: Value = serde_json::from_str(include_str!(
        "../../../test/fixtures/native/control-v1.json"
    ))
    .unwrap();
    for row in fixture["inboxCases"].as_array().unwrap() {
        let request = &row["request"];
        let raw = serde_json::to_vec(request).unwrap();
        let parsed = codec::parse_request(&raw);
        assert_eq!(
            parsed.is_ok(),
            row["valid"].as_bool().unwrap(),
            "{}",
            row["name"]
        );
        if let Ok(parsed) = parsed {
            if request["operation"] == "message.send" {
                assert_ne!(parsed["requestId"], parsed["params"]["message"]);
            }
        }
    }
}

#[test]
fn pane_split_example_keeps_source_response_target_separate_from_inserted_session() {
    let fixture: Value = serde_json::from_str(include_str!(
        "../../../test/fixtures/native/control-v1.json"
    ))
    .unwrap();
    let example = &fixture["paneSplitExample"];
    let raw = |name: &Value| {
        fixture["cases"]
            .as_array()
            .unwrap()
            .iter()
            .find(|row| row["name"] == *name)
            .unwrap()["json"]
            .as_str()
            .unwrap()
            .as_bytes()
    };
    let request = codec::parse_request(raw(&example["requestName"])).unwrap();
    let response = codec::parse_response(raw(&example["responseName"])).unwrap();
    assert_eq!(request["target"]["paneId"], example["source"]["paneId"]);
    assert_eq!(
        request["target"]["sessionId"],
        example["inserted"]["sessionId"]
    );
    assert_eq!(
        request["target"]["runtimeId"],
        example["inserted"]["runtimeId"]
    );
    assert_eq!(response["target"], example["source"]);
    assert_eq!(response["data"]["insertedPane"], example["inserted"]);
    assert_ne!(
        response["target"]["sessionId"],
        request["target"]["sessionId"]
    );
}
#[test]
fn exact_shared_raw_contract() {
    let fixture: Value = serde_json::from_str(include_str!(
        "../../../test/fixtures/native/control-v1.json"
    ))
    .unwrap();
    for row in fixture["cases"].as_array().unwrap() {
        let raw = if let Some(bytes) = row["bytes"].as_array() {
            bytes.iter().map(|n| n.as_u64().unwrap() as u8).collect()
        } else {
            row["json"].as_str().unwrap().as_bytes().to_vec()
        };
        let valid = match row["kind"].as_str().unwrap() {
            "request" => codec::parse_request(&raw).is_ok(),
            "response" => codec::parse_response(&raw).is_ok(),
            "auth" => codec::parse_auth(&raw).is_ok(),
            "locator" => codec::parse_locator(&raw).is_ok(),
            "editor" => codec::parse_editor(
                &raw,
                row["direction"].as_str().unwrap(),
                row.get("expected"),
            )
            .is_ok(),
            "editor-capability" => codec::parse_editor_capability(&raw).is_ok(),
            "editor-launch" => codec::parse_editor_launch(&raw).is_ok(),
            "observation-cancel" => codec::parse_observation_cancel(&raw).is_ok(),
            "helper" => match codec::parse_helper(&raw) {
                Ok(Some(_)) => true,
                Ok(None) => serde_json::from_slice::<Value>(&raw).is_ok(),
                Err(_) => false,
            },
            _ => panic!("bad fixture kind"),
        };
        assert_eq!(valid, row["valid"].as_bool().unwrap(), "{}", row["name"]);
        if let Some(code) = row["code"].as_str() {
            assert_eq!(codec::parse_helper(&raw).unwrap_err().code, code);
        }
    }
    for row in fixture["editorParts"].as_array().unwrap() {
        let wire: Vec<u8> = row["bytes"]
            .as_array()
            .unwrap()
            .iter()
            .map(|v| v.as_u64().unwrap() as u8)
            .collect();
        let parsed = codec::parse_editor_part(&wire);
        assert_eq!(
            parsed.is_ok(),
            row["valid"].as_bool().unwrap(),
            "{}",
            row["name"]
        );
        if let Ok((op, body)) = parsed {
            assert_eq!(codec::encode_editor_part(op, body).unwrap(), wire);
        }
    }
}

#[test]
fn editor_encode_and_captured_identity_use_the_same_generated_grammar() {
    use huhu_pty::control::wire_generated as w;
    use serde_json::json;
    let ready = json!({"type":"editor-ready","version":1,"sid":7,"editorId":"editor-7",
        "identity":{"runtimeId":"r"},
        "sourceInstance":"source-7","provider":"pi","profileId":"pi-1_4_0"});
    let encoded = codec::encode_editor(&ready, "native-to-node", None).unwrap();
    assert_eq!(
        codec::parse_editor(&encoded, "native-to-node", Some(&ready)).unwrap(),
        ready
    );
    assert!(codec::parse_editor(&encoded, "node-to-native", None).is_err());
    assert!(codec::parse_editor(
        &encoded,
        "native-to-node",
        Some(&json!({"sid":7,"editorId":"old"}))
    )
    .is_err());
    assert!(w::read_only("agent.wait"));
    assert!(!w::read_only("agent.prompt"));
    assert_eq!(
        w::WAIT_STATES,
        &[
            "idle",
            "working",
            "waiting",
            "permission",
            "done",
            "failed",
            "interrupted",
            "unknown",
            "blocked"
        ]
    );
    assert_eq!(
        w::EDITOR_OPERATION_RECEIPT_POOL_BYTES,
        128 * w::EDITOR_OPERATION_RECEIPT_STATES * (w::EDITOR_RECEIPT_BYTES + 5)
    );
    assert!(codec::check_editor_body("中文🙂".as_bytes()).is_ok());
    assert!(codec::check_editor_body(&[0xed, 0xa0, 0x80]).is_err());
    assert!(codec::check_editor_body(&vec![b'x'; w::EDITOR_BODY_BYTES]).is_ok());
    assert!(codec::check_editor_body(&vec![b'x'; w::EDITOR_BODY_BYTES + 1]).is_err());
}
